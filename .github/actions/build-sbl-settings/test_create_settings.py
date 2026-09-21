import importlib.util
from pathlib import Path
import struct
import unittest

spec = importlib.util.spec_from_file_location('settings', Path(__file__).with_name('create-settings.py'))
settings = importlib.util.module_from_spec(spec)
spec.loader.exec_module(settings)


class SettingsTests(unittest.TestCase):
    def inputs(self):
        return dict(RL=True, IL=False, TO=False, TH='Blue', CC='Secondary', LC=r'Low\n@headlight',
                    LC2='', LC3='', CN1='Flash Config', CN2='Steady Config', CN3='Break Config')

    def test_known_wire_records(self):
        # Device format: string offsets point to the two-byte length, including NUL.
        expected = bytes.fromhex(
            'abcdabcd0000000a0003524c000003434300'
            'da7ada7a000000160b00000002'
            '0300000000090103000000050100000002')
        self.assertEqual(settings.encode({'RL': True, 'CC': 2}), expected)
        self.assertEqual(settings.decode(expected), {'RL': True, 'CC': 2})

    def test_all_options_match_application_schema(self):
        inputs = self.inputs()
        self.assertEqual(set(inputs), set(settings.schema()))
        for key in ('TH', 'CC'):
            for label, value in settings.schema()[key][1].items():
                inputs[key] = label
                self.assertEqual(settings.validate(inputs)[key], value)

    def test_unicode_literals_and_empty_configs(self):
        inputs = self.inputs()
        inputs['CN1'] = 'Žibintas 🚲'
        inputs['LC'] = r"#Low\n@headlight:51!$(echo unsafe)`literal`'"
        value = settings.validate(inputs)
        self.assertEqual(settings.decode(settings.encode(value)), value)
        self.assertIs(value['IL'], False)
        self.assertEqual(value['LC2'], '')

    def test_invalid_inputs(self):
        for key, value in [('RL', 'false'), ('TH', 'Cyan'), ('CC', 'Fourth'),
                           ('CN1', 'x' * 21), ('LC', 'x' * 65535),
                           ('LC', 'actual\nnewline'), ('CN2', 'bad\0name')]:
            with self.subTest(key=key, value=str(value)[:30]):
                inputs = self.inputs()
                inputs[key] = value
                with self.assertRaises(ValueError):
                    settings.validate(inputs)
        inputs = self.inputs()
        del inputs['LC3']
        with self.assertRaises(ValueError):
            settings.validate(inputs)

    def test_reject_truncated_file(self):
        data = settings.encode(settings.validate(self.inputs()))
        with self.assertRaises((ValueError, IndexError, struct.error)):
            settings.decode(data[:-1])


if __name__ == '__main__':
    unittest.main()
