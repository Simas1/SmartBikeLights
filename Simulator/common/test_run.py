import importlib.util
import json
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
    def test_settings_types_and_choices(self):
        self.assertEqual(preview.validate_settings({'AC': 'Orange', 'IL': True})['AC'], 16733440)
        for values in ({'IL': 'false'}, {'CC': True}, {'AC': 123}, {'unknown': 1}, {'LC': 'a\nb'}):
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
                '--prepare-only', '--scenario', 'low-battery', '--lights', 'at1600,varia-515,flare-rt',
                '--settings', str(settings)], capture_output=True, text=True, check=True)
        work = Path(result.stdout.splitlines()[0].removeprefix('Preview: '))
        try:
            resolved = json.loads((work / 'preview.json').read_text())
            self.assertEqual(len(resolved['lights']), 3)
            self.assertTrue(resolved['settings']['IL'])
            network = (work / 'source-preprocess/TestLightNetwork.mc').read_text()
            self.assertIn('batteryStatus.batteryStatus = 4;', network)
            self.assertIn('mode = [51, 4, 1][id];', network)
            self.assertIn('productInfo.serial = serial.toNumber();', network)
            self.assertNotIn('counter = (counter + 1)', network)
            self.assertNotIn('(:glance)', network)
            app = (work / 'source/SmartBikeLightsApp.mc').read_text()
            self.assertIn('Application.Storage.clearValues();', app)
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
            finally:
                shutil.rmtree(work)
        result = subprocess.run([sys.executable, str(Path(__file__).with_name('run.py')),
            '--devices', 'removed.json'], capture_output=True, text=True)
        self.assertNotEqual(result.returncode, 0)

    def test_example_matches_workflow_defaults(self):
        import re
        workflow = (preview.ROOT / '.github/workflows/create-settings.yml').read_text().split('\npermissions:')[0]
        expected = {}
        for key, block in re.findall(r'^      (\w+):\n(.*?)(?=^      \w+:|\Z)', workflow, re.M | re.S):
            raw = re.search(r'^        default: (.*)$', block, re.M)[1]
            expected[key] = raw[1:-1].replace("''", "'") if raw.startswith("'") else json.loads(raw)
        actual = json.loads((preview.SIMULATOR / 'edge1040/settings.example.json').read_text())
        self.assertEqual(actual, expected)
        self.assertEqual(set(actual), set(preview.settings_schema()[0]))
        preview.validate_settings(actual)
        for key in ('LC', 'LC2', 'LC3'):
            blocks = actual[key].split('#')
            for model, index in (('at1600', 1), ('flare-rt', 3)):
                high, low = map(int, blocks[index].split(':')[1].split(','))
                self.assertEqual(preview.CATALOG[model]['serial'], (high << 31) | low)

    def test_saved_set_file(self):
        spec = importlib.util.spec_from_file_location('codec', preview.ROOT / 'scripts/create-settings.py')
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
