#!/usr/bin/env python3
"""Build an isolated Garmin preview with simulated lights."""
import argparse
import importlib.util
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
import time
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
APP = ROOT / 'Source/SmartBikeLights'
SIMULATOR = ROOT / 'Simulator'
CATALOG = json.loads((SIMULATOR / 'lights.json').read_text())
SCENARIOS = ('lights-on', 'low-battery', 'lights-off')


def replace_once(text, old, new):
    if text.count(old) != 1:
        raise ValueError(f'Source changed: expected exactly one {old!r}')
    return text.replace(old, new, 1)


def settings_schema():
    defaults, definitions = {}, {}
    strings = {}
    for folder in ('resources', 'resources-highmemory'):
        for item in ET.parse(APP / folder / 'strings.xml').getroot().iter('string'):
            strings[item.attrib['id']] = item.text
        for item in ET.parse(APP / folder / 'properties.xml').getroot().iter('property'):
            value = item.text or ''
            kind = item.attrib['type']
            defaults[item.attrib['id']] = int(value) if kind == 'number' else value == 'true' if kind == 'boolean' else value
        for item in ET.parse(APP / folder / 'settings.xml').getroot().iter('setting'):
            definitions[item.attrib['propertyKey'].split('.')[-1]] = item.find('settingConfig')
    return defaults, definitions, strings


def validate_settings(values):
    defaults, definitions, strings = settings_schema()
    for key, value in values.items():
        if key not in defaults:
            raise ValueError(f'Unknown setting {key}; choose from {", ".join(defaults)}')
        definition = definitions[key]
        choices = {strings[e.text.split('.')[-1]]: int(e.attrib['value']) for e in definition.findall('listEntry')}
        if choices:
            if isinstance(value, str):
                value = choices.get(value, value)
            if type(value) is not int or value not in choices.values():
                raise ValueError(f'{key}: choose from {choices}')
        elif type(defaults[key]) is bool:
            if type(value) is not bool:
                raise ValueError(f'{key}: expected true or false')
        elif not isinstance(value, str) or '\0' in value or len(value) > int(definition.attrib['maxLength']):
            raise ValueError(f'{key}: invalid text or exceeds maximum length')
        if key in ('LC', 'LC2', 'LC3') and ('\n' in value or '\r' in value):
            raise ValueError(f'{key}: use a single-line configurator string with literal \\n markers')
        defaults[key] = value
    return defaults


def read_settings(path):
    if path.suffix.lower() == '.set':
        spec = importlib.util.spec_from_file_location('settings_codec', ROOT / 'scripts/create-settings.py')
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module.decode(path.read_bytes())
    result = json.loads(path.read_text())
    if not isinstance(result, dict):
        raise ValueError('Settings JSON must be an object of property keys and values')
    return result


def read_lights(value):
    ids = [item.strip() for item in value.split(',')]
    if not ids or any(key not in CATALOG for key in ids):
        raise ValueError('Use comma-separated light IDs from --list-lights (no empty entries)')
    if len(ids) != len(set(ids)):
        raise ValueError('Choose each light ID only once')
    return [dict(CATALOG[key], catalogId=key) for key in ids]


def arguments():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('device', nargs='?', default='edge1040', choices=sorted(p.parent.name for p in SIMULATOR.glob('*/profile.json')))
    parser.add_argument('--scenario', choices=SCENARIOS, default='lights-on')
    parser.add_argument('--lights', '-lights', default='at1600,flare-rt',
                        help='Comma-separated IDs from lights.json (default: at1600,flare-rt)')
    parser.add_argument('--settings', type=Path, help='Partial settings JSON or Garmin .SET file')
    parser.add_argument('--list-lights', action='store_true')
    parser.add_argument('--list-settings', action='store_true')
    parser.add_argument('--build-only', action='store_true')
    parser.add_argument('--prepare-only', action='store_true', help='Generate inputs without the SDK or downloads')
    parser.add_argument('--sdk', type=Path, help='SDK directory (otherwise CIQ_SDK or Garmin active SDK)')
    args = parser.parse_args()
    if args.list_lights:
        for key, light in CATALOG.items():
            print(f'{key:16} {light["name"]} ({"headlight" if light["type"] == 0 else "taillight"})')
        parser.exit()
    if args.list_settings:
        defaults, definitions, strings = settings_schema()
        for key, value in defaults.items():
            choices = {strings[e.text.split('.')[-1]]: int(e.attrib['value']) for e in definitions[key].findall('listEntry')}
            print(f'{key}: default={json.dumps(value)}' + (f'; choices={choices}' if choices else ''))
        parser.exit()
    args.lights = read_lights(args.lights)
    args.profile = json.loads((SIMULATOR / args.device / 'profile.json').read_text())
    return args


def prepare(args):
    values = read_settings(args.settings) if args.settings else {}
    settings = validate_settings(values)
    output = ROOT / 'Build/simulator'
    output.mkdir(parents=True, exist_ok=True)
    work = Path(tempfile.mkdtemp(prefix=f'{args.device}-{args.scenario}-', dir=output))
    shutil.copytree(APP, work, dirs_exist_ok=True, ignore=shutil.ignore_patterns('bin', '.git', 'node_modules', 'networkKeys'))
    cfg_path = work / 'preprocess.config.json'
    cfg = json.loads(cfg_path.read_text())
    cfg['includeSymbols']['ANT_NETWORK'] = 'TestNetwork.TestLightNetwork'
    cfg['targets'] = [t for t in cfg['targets'] if t['name'] != 'LightSensor']
    cfg_path.write_text(json.dumps(cfg, indent=2))
    (work / 'source-generated').mkdir(exist_ok=True)
    shutil.copyfile(work / 'source-preprocess/BikeLightSensor.mc', work / 'source-generated/BikeLightSensor.LightSensor.mc')
    path = work / 'monkey.jungle'
    path.write_text('\n'.join(line for line in path.read_text().splitlines() if not (match := re.match(r'(\w+)\.(?:resourcePath|excludeAnnotations)\s*=', line)) or match[1] in args.profile['qualifiers']) + '\n')
    path = work / 'manifest.xml'
    text = re.sub(r'<iq:product id="([^"]+)"\s*/>',
                  lambda match: match[0] if match[1] == args.device else '', path.read_text())
    # Separate application identity keeps preview properties/storage away from normal builds.
    text = re.sub(r'(<iq:application\s+[^>]*?id=")[^"]+', lambda match: match[1] + args.profile['previewAppId'], text)
    path.write_text(text)
    path = work / 'source-preprocess/TestLightNetwork.mc'
    text = path.read_text()
    start, end = text.index('            _lights = ['), text.index('            lastUpdate = System.getTimer();')
    lights = []
    for index, light in enumerate(args.lights):
        lights.append(f'                new TestBikeLight({index}, {light["type"]}, {json.dumps(light["modes"])}, {light["manufacturer"]}, {light["model"]}, {light["serial"]}l)')
    text = text[:start] + '            _lights = [\n' + ',\n'.join(lights) + '\n            ];\n' + text[end:]
    # Garmin exposes serials as signed 32-bit Numbers, matching configuration parsing.
    text = replace_once(text, 'productInfo.serial = serial;', 'productInfo.serial = serial.toNumber();')
    on_modes = [light['onMode'] for light in args.lights]
    text = replace_once(text, '            mode = 0;', '            mode = ' + ('0' if args.scenario == 'lights-off' else f'{json.dumps(on_modes)}[id]') + ';')
    text = replace_once(text, 'batteryStatus.batteryStatus = 1;', f'batteryStatus.batteryStatus = {4 if args.scenario == "low-battery" else 1};')
    # Keep network stable and process tap changes even when updates occur faster than 1 Hz.
    start, end = text.index('            var delta ='), text.index('            for (var i =')
    text = text[:start] + text[end:]
    start, end = text.index('            counter = (counter + 1)'), text.index('            return null;', text.index('            counter = (counter + 1)'))
    text = text[:start] + '''            if (!_initialized) {
                _initialized = true;
                _state = 2;
                _listener.onLightNetworkStateUpdate(_state);
            }

''' + text[end:]
    path.write_text(text.replace('(:glance :highMemory)', '(:highMemory)').replace('(:glance)', ''))
    # Always use the fake network in this preview, including individual-network configurations.
    path = work / 'source-preprocess/BikeLightsView.mc'
    text = replace_once(path.read_text(), '_individualNetwork = configuration[13];', '_individualNetwork = null; // Simulator uses only fake lights')
    path.write_text(text)
    path = work / 'source/SmartBikeLightsApp.mc'
    assignments = '\n'.join(f'        Application.Properties.setValue({json.dumps(key)}, {json.dumps(value, ensure_ascii=False)});' for key, value in settings.items())
    path.write_text(replace_once(path.read_text(), '        AppBase.initialize();', '        AppBase.initialize();\n        Application.Storage.clearValues();\n' + assignments))
    (work / 'preview.json').write_text(json.dumps({'device': args.device, 'scenario': args.scenario, 'lights': args.lights, 'settings': settings}, indent=2))
    print(f'Preview: {work}', flush=True)
    print(f'{args.scenario}: ' + ', '.join(light['name'] for light in args.lights), flush=True)
    return work


def main():
    args = arguments()
    sdk = None
    if not args.prepare_only:
        sdk = args.sdk or (Path(os.environ['CIQ_SDK']) if os.environ.get('CIQ_SDK') else None)
        if sdk is None:
            cfg = Path.home() / 'Library/Application Support/Garmin/ConnectIQ/current-sdk.cfg'
            if not cfg.exists():
                raise ValueError('Install/activate the macOS SDK or pass --sdk PATH')
            sdk = Path(cfg.read_text().strip())
        if not (sdk / 'bin/monkeyc').is_file():
            raise ValueError(f'No compiler found in {sdk}')
        for command in ('java', 'node', 'npx'):
            if not shutil.which(command):
                raise ValueError(f'{command} is missing from PATH')
    work = prepare(args)
    if args.prepare_only:
        return
    subprocess.run(['npx', '--yes', 'directive-preprocessor@1.1.1', 'preprocess', '-c', 'preprocess.config.json'], cwd=work, check=True)
    binary = work / 'SmartBikeLights-sim.prg'
    subprocess.run([str(sdk / 'bin/monkeyc'), '-f', 'monkey.jungle', '-d', args.device, '-y', 'unit_test_key', '-o', str(binary), '-w'], cwd=work, check=True)
    if not args.build_only:
        subprocess.run([str(sdk / 'bin/connectiq')], check=True)
        time.sleep(3)
        subprocess.run([str(sdk / 'bin/monkeydo'), str(binary), args.device], cwd=work, check=True)
    print(f'Build retained at {work}. You may delete this folder when finished.')


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError, subprocess.CalledProcessError) as error:
        sys.exit(f'Error: {error}')
