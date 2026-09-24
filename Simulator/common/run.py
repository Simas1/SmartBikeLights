#!/usr/bin/env python3
"""Build an isolated Garmin preview with simulated lights."""
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import shutil
import shlex
import subprocess
import sys
import tempfile
import time
import uuid
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
APP = ROOT / 'Source/SmartBikeLights'
SIMULATOR = ROOT / 'Simulator'
UPSTREAM_URL = 'https://github.com/maca88/SmartBikeLights.git'

CATALOG = json.loads((SIMULATOR / 'lights.json').read_text())


def replace_once(text, old, new):
    if text.count(old) != 1:
        raise ValueError(f'Source changed: expected exactly one {old!r}')
    return text.replace(old, new, 1)


def settings_schema(app=APP):
    defaults, definitions = {}, {}
    strings = {}
    for folder in ('resources', 'resources-highmemory'):
        for item in ET.parse(app / folder / 'strings.xml').getroot().iter('string'):
            strings[item.attrib['id']] = item.text
        for item in ET.parse(app / folder / 'properties.xml').getroot().iter('property'):
            value = item.text or ''
            kind = item.attrib['type']
            defaults[item.attrib['id']] = int(value) if kind == 'number' else value == 'true' if kind == 'boolean' else value
        for item in ET.parse(app / folder / 'settings.xml').getroot().iter('setting'):
            definitions[item.attrib['propertyKey'].split('.')[-1]] = item.find('settingConfig')
    return defaults, definitions, strings


def validate_settings(values, app=APP):
    defaults, definitions, strings = settings_schema(app)
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
            raise ValueError(f'{key}: use a single-line configurator string with ~n markers')
        defaults[key] = value
    return defaults


def read_settings(path):
    if path.suffix.lower() == '.set':
        spec = importlib.util.spec_from_file_location('settings_codec', ROOT / '.github/actions/build-sbl-settings/create-settings.py')
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


def apply_batteries(lights, overrides):
    """Percentages are display approximations of ANT light battery categories."""
    statuses = {'100': 1, '75': 2, '50': 3, '25': 4, '5': 5,
                'new': 1, 'good': 2, 'ok': 3, 'low': 4, 'critical': 5,
                'chg': 6, 'charging': 6}
    selected = {light['catalogId']: light for light in lights}
    for light in lights:
        light['batteryStatus'] = 1
    seen = set()
    for group in overrides:
        for entry in group.split(','):
            key, separator, value = entry.strip().partition('=')
            key, value = key.strip(), value.strip().lower()
            if value.endswith('%') and value[:-1] in ('100', '75', '50', '25', '5'):
                value = value[:-1]
            if not separator or key not in selected or value not in statuses:
                raise ValueError('--battery requires selected-light=100,75,50,25,5 or chg (optional %); e.g. at1600=25,flare-rt=chg')
            if key in seen:
                raise ValueError(f'Duplicate battery override for {key}')
            seen.add(key)
            selected[key]['batteryStatus'] = statuses[value]


def upstream_source():
    """Download into an independent checkout; never change the user's Git refs."""
    output = ROOT / 'Build/simulator'
    output.mkdir(parents=True, exist_ok=True)
    checkout = Path(tempfile.mkdtemp(prefix='upstream-source-', dir=output))
    subprocess.run(['git', 'clone', '--depth', '1', '--branch', 'master',
                    UPSTREAM_URL, str(checkout)], check=True)
    revision = subprocess.check_output(['git', '-C', str(checkout), 'rev-parse', 'HEAD'], text=True).strip()
    app = checkout / 'Source/SmartBikeLights'
    if not (app / 'manifest.xml').is_file():
        raise ValueError('Upstream source layout has changed; missing SmartBikeLights manifest')
    return app, revision


def arguments():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('device', nargs='?', default='edge1040', choices=sorted(p.parent.name for p in SIMULATOR.glob('*/profile.json')))
    parser.add_argument('--source', choices=['local', 'upstream'], default='local',
                        help='Current checkout or freshly downloaded maca88 upstream master')
    parser.add_argument('--lights', '-lights', default='at1600,flare-rt',
                        help='Comma-separated IDs from lights.json (default: at1600,flare-rt)')
    parser.add_argument('--battery', action='append', default=[], metavar='LIGHT=VALUE,...',
                        help='Per-light battery: 100,75,50,25,5 (optional %%), or chg; default 100%%')
    parser.add_argument('--settings', type=Path, help='Partial settings JSON or Garmin .SET file')
    parser.add_argument('--list-lights', action='store_true')
    parser.add_argument('--list-settings', action='store_true')
    parser.add_argument('--build-only', action='store_true')
    parser.add_argument('--prepare-only', action='store_true', help='Generate inputs without SDK compilation (upstream still downloads source)')
    parser.add_argument('--sdk', type=Path, help='SDK directory (otherwise CIQ_SDK or Garmin active SDK)')
    args = parser.parse_args()
    if args.list_lights:
        for key, light in CATALOG.items():
            print(f'{key:16} {light["name"]} ({"headlight" if light["type"] == 0 else "taillight"})')
        parser.exit()
    args.app, args.revision = upstream_source() if args.source == 'upstream' else (APP, None)
    if args.list_settings:
        defaults, definitions, strings = settings_schema(args.app)
        for key, value in defaults.items():
            choices = {strings[e.text.split('.')[-1]]: int(e.attrib['value']) for e in definitions[key].findall('listEntry')}
            print(f'{key}: default={json.dumps(value)}' + (f'; choices={choices}' if choices else ''))
        parser.exit()
    args.lights = read_lights(args.lights)
    apply_batteries(args.lights, args.battery)
    args.profile = json.loads((SIMULATOR / args.device / 'profile.json').read_text())
    return args


def menu_configuration(value, device_id=None, upstream=False):
    """Convert touchscreen panel sections to the non-touch settings-menu grammar."""
    if not value:
        return value
    if not upstream and not value.startswith('SBL1#'):
        raise ValueError('Expected an SBL1 configuration')
    parts = (value if upstream else value[5:]).split('#')
    if not upstream and len(parts) != 17:
        raise ValueError('Incomplete SBL1 configuration')
    for index in (5, 6):
        if len(parts) <= index:
            continue
        panel = parts[index]
        header, *groups = panel.split('!')
        fields = header.split(':')
        if ',' not in fields[0]:
            continue  # Already a menu configuration (or no panel).
        counts = fields[0].split(',')
        if len(counts) != 2 or not all(item.isdigit() for item in counts) or len(fields) < 2:
            raise ValueError('Malformed touchscreen light panel')
        total, group_count = map(int, counts)
        if len(groups) != group_count:
            raise ValueError('Touchscreen panel group count does not match its contents')
        buttons = []
        parsed = 0
        for group in groups:
            count, *entries = group.split(',')
            if not count.isdigit() or int(count) != len(entries):
                raise ValueError('Touchscreen panel button count does not match its contents')
            for entry in entries:
                title, separator, raw_mode = entry.rpartition(':')
                if not separator or not re.fullmatch(r'-?\d+', raw_mode):
                    raise ValueError('Malformed touchscreen light button')
                mode = int(raw_mode)
                parsed += 1
                if mode < 0:
                    continue  # Touch-only control/configuration buttons are not light modes.
                if upstream:
                    lines = re.split(r'~br|~n', title)
                    title = ' '.join(line.strip() for line in lines if line.strip() and not line.strip().startswith('@'))
                buttons.append(f'{title}:{mode}')
        if parsed != total or len(buttons) > 20:
            raise ValueError('Unsupported touchscreen light panel button count')
        parts[index] = f'{len(buttons)}:{fields[1]}' + ''.join(('|' if upstream else '!') + button for button in buttons)
    if not upstream:
        if device_id:
            parts[-5] = device_id
    return ('' if upstream else 'SBL1#') + '#'.join(parts)


def settings_preview_id(app, namespace, source):
    # Include resource paths and content: order, labels and defaults all affect
    # the external editor. Exclude generated build-info to keep reruns stable.
    digest = hashlib.sha256()
    for path in sorted(app.glob('resources*/**/*.xml')):
        if path.name not in ('settings.xml', 'properties.xml', 'strings.xml'):
            continue
        digest.update(path.relative_to(app).as_posix().encode() + b'\0')
        digest.update(path.read_bytes() + b'\0')
    return uuid.uuid5(uuid.UUID(namespace),
                      f'settings-preview-v1:{source}:{digest.hexdigest()}').hex


def preview_binary(work):
    app = ET.parse(work / 'manifest.xml').getroot().find(
        '{http://www.garmin.com/xml/connectiq}application')
    return work / f"SBL-{app.attrib['id']}.prg"


def prepare(args):
    values = read_settings(args.settings) if args.settings else {}
    app = getattr(args, 'app', APP)
    settings = validate_settings(values, app)
    menu_devices = {'edge540': 'B4061', 'edge550': 'B4633', 'fr965': 'B4315'}
    if args.profile.get('settingsFormat') == 'menu' or args.device in menu_devices:
        for key in ('LC', 'LC2', 'LC3'):
            settings[key] = menu_configuration(settings[key], menu_devices.get(args.device), args.source == 'upstream')
    output = ROOT / 'Build/simulator'
    output.mkdir(parents=True, exist_ok=True)
    work = Path(tempfile.mkdtemp(prefix=f'{args.device}-', dir=output))
    shutil.copytree(app, work, dirs_exist_ok=True, ignore=shutil.ignore_patterns('bin', '.git', 'node_modules', 'networkKeys'))
    subprocess.run([sys.executable, str(ROOT / 'scripts/write-build-info.py'),
                    '--source', str(app), '--output', str(work / 'resources-highmemory/build-info.xml')], check=True)
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
    preview_id = settings_preview_id(work, args.profile['previewAppId'], args.source)
    # Separate application identity keeps preview properties/storage away from normal builds.
    text = re.sub(r'(<iq:application\s+[^>]*?id=")[^"]+', lambda match: match[1] + preview_id, text)
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
    text = replace_once(text, '            mode = 0;', f'            mode = {json.dumps(on_modes)}[id];')
    batteries = [light['batteryStatus'] for light in args.lights]
    text = replace_once(text, 'batteryStatus.batteryStatus = 1;',
                        f'batteryStatus.batteryStatus = {json.dumps(batteries)}[id];')
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
    assignments = '\n'.join(f'            Application.Properties.setValue({json.dumps(key)}, {json.dumps(value, ensure_ascii=False)});' for key, value in settings.items())
    # A settings save can restart the app. Seed this build only once, so such a
    # restart preserves changes made through either settings interface.
    seed_id = uuid.uuid4().hex
    initialization = ('        AppBase.initialize();\n'
        '        var previewSeed = Application.Storage.getValue("SBLPreviewSeed");\n'
        f'        if (previewSeed == null || !previewSeed.equals("{seed_id}")) {{\n'
        '            Application.Storage.clearValues();\n' + assignments + '\n'
        f'            Application.Storage.setValue("SBLPreviewSeed", "{seed_id}");\n'
        '        }')
    path.write_text(replace_once(path.read_text(), '        AppBase.initialize();', initialization))
    (work / 'preview.json').write_text(json.dumps({'device': args.device, 'source': args.source, 'upstreamRepository': UPSTREAM_URL if args.source == 'upstream' else None, 'upstreamCommit': args.revision, 'lights': args.lights, 'settings': settings}, indent=2))
    print(f'Preview: {work}', flush=True)
    if args.source == 'upstream':
        print(f'Upstream: {UPSTREAM_URL} @ {args.revision}', flush=True)
    print('Lights: ' + ', '.join(light['name'] for light in args.lights), flush=True)
    return work


def simulator_shell(sdk, work):
    # SDK 9.2 waits for push to exit without draining its progress output.
    # Keep transfers off that pipe; preserve interactive shell output for run.
    wrapper = work / 'simulator-shell'
    shell = shlex.quote(str(sdk / 'bin/shell'))
    log = shlex.quote(str(work / 'simulator-transfer.log'))
    wrapper.write_text('#!/bin/sh\n'
        'for arg in "$@"; do\n'
        '  if [ "$arg" = push ]; then\n'
        f'    exec {shell} "$@" >> {log} 2>&1\n'
        '  fi\n'
        'done\n'
        f'exec {shell} "$@"\n')
    wrapper.chmod(0o755)
    return wrapper


def simulator_command(sdk, binary, device):
    settings = binary.with_name(binary.stem + '-settings.json')
    if not settings.is_file():
        raise ValueError(f'Compiler did not generate app settings: {settings}')
    # The SDK editor renders groups but drops their changed values on Save.
    # Flatten only the generated simulator metadata; retain the source XML.
    metadata = json.loads(settings.read_text())
    entries = metadata.get('settings', [])
    if any('group' in entry for entry in entries):
        metadata['settings'] = [child for entry in entries
                                for child in (entry['group']['entries']
                                              if 'group' in entry else [entry])]
        settings.write_text(json.dumps(metadata, ensure_ascii=False))
    # The settings editor looks up the uppercase executable name on the device.
    destination = f'GARMIN/Settings/{binary.stem.upper()}-settings.json'
    return ['java', '-classpath', str(sdk / 'bin/monkeybrains.jar'),
            'com.garmin.monkeybrains.monkeydodeux.MonkeyDoDeux',
            '-f', str(binary), '-d', device, '-s', str(simulator_shell(sdk, binary.parent)),
            '-a', f'{settings}:{destination}']


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
    binary = preview_binary(work)
    subprocess.run([str(sdk / 'bin/monkeyc'), '-f', 'monkey.jungle', '-d', args.device, '-y', 'unit_test_key', '-o', str(binary), '-w'], cwd=work, check=True)
    if not args.build_only:
        subprocess.run([str(sdk / 'bin/connectiq')], check=True)
        time.sleep(3)
        subprocess.run(simulator_command(sdk, binary, args.device), cwd=work, check=True)
    print(f'Build retained at {work}. You may delete this folder when finished.')


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError, subprocess.CalledProcessError) as error:
        sys.exit(f'Error: {error}')
