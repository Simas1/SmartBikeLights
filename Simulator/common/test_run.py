import importlib.util
import json
import re
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

SPEC = importlib.util.spec_from_file_location('preview', Path(__file__).with_name('run.py'))
preview = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(preview)


class PreviewTests(unittest.TestCase):
    def test_simulator_flattens_grouped_settings_for_save(self):
        with tempfile.TemporaryDirectory() as directory:
            binary = Path(directory) / 'preview.prg'
            settings = binary.with_name('preview-settings.json')
            entries = [{'key': 'CC'}, {'key': 'ShowBrightness', 'defaultValue': True},
                       {'key': 'TH'}]
            metadata = {'settings': [entries[0], {'group': {'id': 'Theme',
                'entries': entries[1:]}}], 'languages': {'valyrian': {'TH': 'Theme'}}}
            settings.write_text(json.dumps(metadata))
            preview.simulator_command(Path('/sdk'), binary, 'edge1040')
            result = json.loads(settings.read_text())
            self.assertEqual(result['settings'], entries)
            self.assertEqual(result['languages'], metadata['languages'])
            preview.simulator_command(Path('/sdk'), binary, 'edge1040')
            self.assertEqual(json.loads(settings.read_text()), result)

    def test_settings_revision_identity(self):
        namespace = '12345678123456781234567812345678'
        with tempfile.TemporaryDirectory() as directory:
            app = Path(directory)
            resources = app / 'resources'
            resources.mkdir()
            settings = resources / 'settings.xml'
            settings.write_text('<settings/>')
            identity = preview.settings_preview_id(app, namespace, 'local')
            self.assertEqual(identity, preview.settings_preview_id(app, namespace, 'local'))
            (resources / 'build-info.xml').write_text('new build')
            self.assertEqual(identity, preview.settings_preview_id(app, namespace, 'local'))
            self.assertNotEqual(identity, preview.settings_preview_id(app, namespace, 'upstream'))
            for name in ('settings.xml', 'strings.xml', 'properties.xml'):
                with self.subTest(resource=name):
                    previous = preview.settings_preview_id(app, namespace, 'local')
                    (resources / name).write_text('<changed/>')
                    self.assertNotEqual(previous, preview.settings_preview_id(app, namespace, 'local'))

    def test_simulator_transfers_settings_metadata(self):
        with tempfile.TemporaryDirectory(prefix='preview-settings-') as directory:
            binary = Path(directory) / 'SmartBikeLights-sim.prg'
            with self.assertRaisesRegex(ValueError, 'did not generate app settings'):
                preview.simulator_command(Path('/sdk'), binary, 'edge1040')
            settings = binary.with_name('SmartBikeLights-sim-settings.json')
            settings.write_text('{}')
            self.assertEqual(preview.simulator_command(Path('/sdk'), binary, 'edge1040'),
                ['java', '-classpath', '/sdk/bin/monkeybrains.jar',
                 'com.garmin.monkeybrains.monkeydodeux.MonkeyDoDeux',
                 '-f', str(binary), '-d', 'edge1040', '-s', str(binary.parent / 'simulator-shell'), '-a',
                 f'{settings}:GARMIN/Settings/SMARTBIKELIGHTS-SIM-settings.json'])

    def test_transfer_progress_does_not_block_unread_pipe(self):
        with tempfile.TemporaryDirectory(prefix='preview shell ') as directory:
            work = Path(directory)
            (work / 'bin').mkdir()
            shell = work / 'bin/shell'
            shell.write_text('#!/bin/sh\nif [ "$1" = push ]; then\n'
                             '  dd if=/dev/zero bs=1024 count=256 2>/dev/null\n'
                             '  exit 7\nfi\necho "Shell Version test"\n')
            shell.chmod(0o755)
            wrapper = preview.simulator_shell(work, work)
            with subprocess.Popen([str(wrapper), 'push', 'file with spaces'],
                                  stdout=subprocess.PIPE, stderr=subprocess.PIPE) as process:
                self.assertEqual(process.wait(timeout=5), 7)
                self.assertEqual(process.stdout.read(), b'')
            self.assertEqual((work / 'simulator-transfer.log').stat().st_size, 262144)
            self.assertEqual(subprocess.check_output([str(wrapper)]), b'Shell Version test\n')

    def test_settings_types_and_choices(self):
        self.assertEqual(preview.validate_settings({'TH': 'Violet', 'IL': True})['TH'], 1)
        for values in ({'IL': 'false'}, {'CC': True}, {'TH': 123}, {'unknown': 1}, {'LC': 'a\nb'}):
            with self.subTest(values=values), self.assertRaises(ValueError):
                preview.validate_settings(values)

    def test_preparation_isolated_and_reproducible(self):
        source_files = ['preprocess.config.json', 'monkey.jungle', 'manifest.xml',
                        'source/SmartBikeLightsApp.mc', 'source-preprocess/TestLightNetwork.mc']
        before = {f: (preview.APP / f).read_bytes() for f in source_files}
        with tempfile.TemporaryDirectory() as fixture:
            settings = Path(fixture) / 'settings.json'
            settings.write_text(json.dumps({'CN1': 'Quote " slash \\', 'IL': True}))
            result = subprocess.run([sys.executable, str(Path(__file__).with_name('run.py')),
                '--prepare-only', '--battery', 'at1600=25,varia-515=25,flare-rt=25', '--lights', 'at1600,varia-515,flare-rt',
                '--settings', str(settings)], capture_output=True, text=True, check=True)
        work = Path(result.stdout.splitlines()[0].removeprefix('Preview: '))
        try:
            resolved = json.loads((work / 'preview.json').read_text())
            self.assertEqual(len(resolved['lights']), 3)
            self.assertTrue(resolved['settings']['IL'])
            network = (work / 'source-preprocess/TestLightNetwork.mc').read_text()
            self.assertIn('batteryStatus.batteryStatus = [4, 4, 4][id];', network)
            self.assertIn('mode = [51, 4, 1][id];', network)
            self.assertIn('productInfo.serial = serial.toNumber();', network)
            self.assertNotIn('counter = (counter + 1)', network)
            self.assertNotIn('(:glance)', network)
            app = (work / 'source/SmartBikeLightsApp.mc').read_text()
            self.assertIn('Application.Storage.clearValues();', app)
            guard = app.index('if (previewSeed == null || !previewSeed.equals(')
            reset = app.index('Application.Storage.clearValues();')
            save = app.index('Application.Storage.setValue("SBLPreviewSeed",')
            self.assertLess(guard, reset)
            self.assertLess(reset, save)
            for assignment in re.finditer(r'Application\.Properties\.setValue\(', app):
                self.assertLess(guard, assignment.start())
                self.assertLess(assignment.start(), save)
            self.assertIn(r'Quote \" slash \\', app)
            config = json.loads((work / 'preprocess.config.json').read_text())
            self.assertNotIn('LightSensor', [t['name'] for t in config['targets']])
            self.assertTrue((work / 'source-generated/BikeLightSensor.LightSensor.mc').exists())
            for file, content in before.items():
                self.assertEqual((preview.APP / file).read_bytes(), content)
        finally:
            shutil.rmtree(work)

    def test_light_flags_and_defaults(self):
        for value in ('', 'unknown', 'at1600,', 'varia-515,varia-515'):
            with self.subTest(value=value), self.assertRaises(ValueError):
                preview.read_lights(value)
        self.assertEqual(len(preview.read_lights('at1600,varia-515,flare-rt,ion-pro-rt')), 4)
        for flags in ([], ['-lights', 'at1600,flare-rt']):
            result = subprocess.run([sys.executable, str(Path(__file__).with_name('run.py')),
                '--prepare-only', *flags], capture_output=True, text=True, check=True)
            work = Path(result.stdout.splitlines()[0].removeprefix('Preview: '))
            try:
                resolved = json.loads((work / 'preview.json').read_text())
                self.assertEqual([item['catalogId'] for item in resolved['lights']], ['at1600', 'flare-rt'])
                self.assertEqual([item['batteryStatus'] for item in resolved['lights']], [1, 1])
                self.assertNotIn('scenario', resolved)
            finally:
                shutil.rmtree(work)
        result = subprocess.run([sys.executable, str(Path(__file__).with_name('run.py')),
            '--scenario', 'low-battery'], capture_output=True, text=True)
        self.assertNotEqual(result.returncode, 0)

    def test_example_matches_workflow_defaults(self):
        import re
        workflow = (preview.ROOT / '.github/workflows/build-sbl-settings.yml').read_text().split('\npermissions:')[0]
        expected = {}
        for key, block in re.findall(r'^      (\w+):\n(.*?)(?=^      \w+:|\Z)', workflow, re.M | re.S):
            raw = re.search(r'^        default: (.*)$', block, re.M)[1]
            expected[key] = raw[1:-1].replace("''", "'") if raw.startswith("'") else json.loads(raw)
        actual = json.loads((preview.SIMULATOR / 'settings.example.json').read_text())
        self.assertEqual(actual, expected)
        self.assertEqual(set(actual), set(preview.settings_schema()[0]))
        preview.validate_settings(actual)
        for key in ('LC', 'LC2', 'LC3'):
            blocks = actual[key].split('#')
            for model, index in (('at1600', 1), ('flare-rt', 3)):
                high, low = map(int, blocks[index].split(':')[1].split(','))
                self.assertEqual(preview.CATALOG[model]['serial'], (high << 31) | low)

    def test_individual_batteries(self):
        for value, expected in [('100%', 1), ('75', 2), ('50%', 3), ('25', 4),
                                ('5%', 5), ('Chg', 6), ('charging', 6), ('good', 2)]:
            lights = preview.read_lights('at1600,flare-rt')
            preview.apply_batteries(lights, [f'at1600={value}'])
            self.assertEqual([light['batteryStatus'] for light in lights], [expected, 1])
        for value in ('at1600=24', 'at1600=0', 'varia-515=50', 'at1600=chg%',
                      'at1600=25,at1600=5', 'at1600', ''):
            with self.subTest(value=value), self.assertRaises(ValueError):
                preview.apply_batteries(preview.read_lights('at1600,flare-rt'), [value])
        result = subprocess.run([sys.executable, str(Path(__file__).with_name('run.py')),
            '--prepare-only', '--lights', 'flare-rt,at1600',
            '--battery', 'at1600=75%,flare-rt=Chg'], capture_output=True, text=True, check=True)
        work = Path(result.stdout.splitlines()[0].removeprefix('Preview: '))
        try:
            resolved = json.loads((work / 'preview.json').read_text())
            self.assertEqual([light['batteryStatus'] for light in resolved['lights']], [6, 2])
            network = (work / 'source-preprocess/TestLightNetwork.mc').read_text()
            self.assertIn('batteryStatus.batteryStatus = [6, 2][id];', network)
        finally:
            shutil.rmtree(work)

    def test_edge1050_profile(self):
        result = subprocess.run([sys.executable, str(Path(__file__).with_name('run.py')),
            'edge1050', '--prepare-only', '--battery', 'at1600=25,flare-rt=75'],
            capture_output=True, text=True, check=True)
        work = Path(result.stdout.splitlines()[0].removeprefix('Preview: '))
        try:
            jungle = (work / 'monkey.jungle').read_text()
            self.assertIn('edge1050.excludeAnnotations = $(rectangleHighResolution)', jungle)
            self.assertIn('edge1050.resourcePath = resources-highmemory;$(edge1050.resourcePath)', jungle)
            self.assertNotIn('edge1040.resourcePath', jungle)
            import xml.etree.ElementTree as ET
            manifest = ET.parse(work / 'manifest.xml')
            ns = {'iq': 'http://www.garmin.com/xml/connectiq'}
            self.assertEqual([node.attrib['id'] for node in manifest.findall('.//iq:product', ns)], ['edge1050'])
            profile = json.loads((preview.SIMULATOR / 'edge1050/profile.json').read_text())
            other = json.loads((preview.SIMULATOR / 'edge1040/profile.json').read_text())
            self.assertNotEqual(profile['previewAppId'], other['previewAppId'])
            self.assertEqual(manifest.find('iq:application', ns).attrib['id'],
                preview.settings_preview_id(work, profile['previewAppId'], 'local'))
            self.assertEqual(preview.preview_binary(work).stem,
                'SBL-' + manifest.find('iq:application', ns).attrib['id'])
            self.assertTrue((work / 'resources-edge1050/resources.xml').is_file())
            resolved = json.loads((work / 'preview.json').read_text())
            self.assertEqual(resolved['device'], 'edge1050')
            self.assertEqual([light['batteryStatus'] for light in resolved['lights']], [4, 2])
        finally:
            shutil.rmtree(work)

    def test_additional_edge_profiles_and_pipeline(self):
        import re
        expected = {'edge850': 'rectangleHighResolution',
                    'edge550': 'rectangleNonTouchScreenHighResolution',
                    'edge840': None, 'edge540': 'rectangleNonTouchScreen'}
        workflow = (preview.ROOT / '.github/workflows/build-sbl.yml').read_text()
        script = (preview.ROOT / '.github/actions/build-sbl/build-edge.sh').read_text()
        identities = [json.loads(path.read_text())['previewAppId'] for path in preview.SIMULATOR.glob('*/profile.json')]
        self.assertEqual(len(identities), len(set(identities)))
        for device, annotation in expected.items():
            with self.subTest(device=device):
                self.assertIn('          - ' + device, workflow)
                self.assertIn(device, script.split('case "$device" in')[1].split(')')[0])
                result = subprocess.run([sys.executable, str(Path(__file__).with_name('run.py')),
                    device, '--prepare-only'], capture_output=True, text=True, check=True)
                work = Path(result.stdout.splitlines()[0].removeprefix('Preview: '))
                try:
                    jungle = (work / 'monkey.jungle').read_text()
                    self.assertIn(device + '.resourcePath', jungle)
                    if annotation:
                        self.assertIn(f'{device}.excludeAnnotations = $({annotation})', jungle)
                    else:
                        self.assertIn('resources-highmemory;resources-touchscreen', jungle)
                    self.assertNotIn('edge1040.resourcePath', jungle)
                    products = re.findall(r'<iq:product id="([^"]+)"', (work / 'manifest.xml').read_text())
                    self.assertEqual(products, [device])
                finally:
                    shutil.rmtree(work)

    def test_touchscreen_configuration_converts_to_menu(self):
        settings = json.loads((preview.SIMULATOR / 'settings.example.json').read_text())
        for key in ('LC', 'LC2', 'LC3'):
            original = settings[key]
            converted = preview.menu_configuration(original)
            before, after = original.split('#'), converted.split('#')
            self.assertEqual(before[:5], after[:5])
            self.assertEqual(before[7:], after[7:])
            self.assertTrue(after[5].startswith('4:AT 1600|Off:0|Low'))
            self.assertTrue(after[6].startswith('5:Flare RT|Off:0|Night Flash'))
            self.assertNotIn('@', after[5] + after[6])
            self.assertNotIn(':-1', after[5] + after[6])
            self.assertNotIn(':-2', after[5] + after[6])
            self.assertEqual(preview.menu_configuration(converted), converted)
        self.assertEqual(preview.menu_configuration(''), '')
        for device in ('edge540', 'edge550'):
            result = subprocess.run([sys.executable, str(Path(__file__).with_name('run.py')),
                device, '--prepare-only', '--settings', str(preview.SIMULATOR / 'settings.example.json')],
                capture_output=True, text=True, check=True)
            work = Path(result.stdout.splitlines()[0].removeprefix('Preview: '))
            try:
                resolved = json.loads((work / 'preview.json').read_text())['settings']
                for key in ('LC', 'LC2', 'LC3'):
                    self.assertEqual(resolved[key], preview.menu_configuration(settings[key]))
            finally:
                shutil.rmtree(work)

    def test_upstream_uses_own_sources_schema_and_identity(self):
        from unittest.mock import patch
        import contextlib
        import io
        with tempfile.TemporaryDirectory() as fixture:
            app = Path(fixture) / 'app'
            shutil.copytree(preview.APP, app)
            for folder in ('resources', 'resources-highmemory'):
                for name in ('properties.xml', 'settings.xml', 'strings.xml'):
                    path = app / folder / name
                    path.write_text(path.read_text().replace('TH', 'AC'))
            marker = app / 'source/upstream-marker.mc'
            marker.write_text('// Only in the upstream fixture')
            with patch.object(preview, 'upstream_source', return_value=(app, 'a' * 40)), \
                 patch.object(sys, 'argv', ['run.py', 'edge1040', '--source', 'upstream', '--prepare-only']):
                args = preview.arguments()
                with contextlib.redirect_stdout(io.StringIO()):
                    work = preview.prepare(args)
            try:
                resolved = json.loads((work / 'preview.json').read_text())
                self.assertEqual(resolved['source'], 'upstream')
                self.assertEqual(resolved['upstreamCommit'], 'a' * 40)
                self.assertIn('AC', resolved['settings'])
                self.assertNotIn('TH', resolved['settings'])
                self.assertTrue((work / 'source/upstream-marker.mc').exists())
                self.assertNotIn(args.profile['previewAppId'], (work / 'manifest.xml').read_text())
                self.assertNotIn('TestNetwork.TestLightNetwork', (app / 'source/SmartBikeLightsApp.mc').read_text())
                with self.assertRaises(ValueError):
                    preview.validate_settings({'TH': 0}, app)
            finally:
                shutil.rmtree(work)

    def test_saved_set_file(self):
        spec = importlib.util.spec_from_file_location('codec', preview.ROOT / '.github/actions/build-sbl-settings/create-settings.py')
        codec = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(codec)
        with tempfile.TemporaryDirectory() as fixture:
            path = Path(fixture) / 'preview.SET'
            path.write_bytes(codec.encode({'IL': True, 'CC': 2, 'LC2': 'literal\\ntext'}))
            settings = preview.validate_settings(preview.read_settings(path))
            self.assertEqual(settings['LC2'], 'literal\\ntext')
            self.assertEqual(settings['CC'], 2)


if __name__ == '__main__':
    unittest.main()
