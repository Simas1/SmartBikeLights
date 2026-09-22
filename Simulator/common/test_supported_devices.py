"""Keep distribution targets and retained graphics in sync."""
import json
from pathlib import Path
import re
import unittest
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
APP = ROOT / 'Source/SmartBikeLights'
DEVICES = {'edge1050', 'edge850', 'edge550', 'edge1040', 'edge840', 'edge540', 'fr965'}

class SupportedDeviceTests(unittest.TestCase):
    def test_manifest_and_simulator_targets(self):
        products = ET.parse(APP / 'manifest.xml').findall('.//{*}product')
        self.assertEqual({p.attrib['id'] for p in products}, DEVICES)
        profiles = {json.loads(p.read_text())['device'] for p in (ROOT / 'Simulator').glob('*/profile.json')}
        self.assertEqual(profiles, DEVICES)

    def test_configurator_targets(self):
        for name in ['dataFieldConstants.js', 'widgetConstants.js']:
            text = (ROOT / 'Source/light-configurator/src' / name).read_text().split('];', 1)[0]
            names = re.findall(r"name: '([^']+)'", text)
            self.assertEqual(len(names), 7)
            self.assertEqual({n.split(' /')[0] for n in names},
                {'Edge 1050', 'Edge 850', 'Edge 550', 'Edge 1040', 'Edge 840', 'Edge 540', 'Forerunner 965'})

    def test_retained_font_resources_exist(self):
        for xml in APP.glob('resources*/**/*.xml'):
            for font in ET.parse(xml).findall('.//font'):
                atlas = xml.parent / font.attrib['filename']
                self.assertTrue(atlas.is_file(), str(atlas))
                self.assertNotRegex(font.attrib['id'], r'^(lights|battery|controlMode)(Large)?Font$')
                for page in re.findall(r'file="([^"]+)"', atlas.read_text()):
                    self.assertTrue((atlas.parent / page).is_file())

    def test_generated_views_use_only_current_designs(self):
        config = json.loads((APP / 'preprocess.config.json').read_text())
        names = {t['name'] for t in config['targets'] if 'BikeLightsView.mc' in str(t['files'])}
        self.assertEqual(names, {'TouchRectangleHighMemory', 'TouchRectangleHighResolution',
            'PanelRectangleHighMemory', 'PanelRectangleHighResolution', 'WatchPanelHighResolution'})
        for p in (APP / 'source-generated').glob('BikeLightsView.*.mc'):
            self.assertIn(p.name.split('.')[1], names)
            self.assertNotIn('function drawLight(', p.read_text())
            self.assertNotIn('function drawBattery(', p.read_text())
