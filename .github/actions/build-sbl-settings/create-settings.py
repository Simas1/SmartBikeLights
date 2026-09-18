#!/usr/bin/env python3
"""Write Garmin's typed string-table settings format without the SDK.

Inputs arrive as JSON through SETTINGS_INPUTS, never as executable shell text.
The wire format matches the device-generated SmartBikeLights.SET.
"""
import argparse
import json
import os
from pathlib import Path
import struct
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[3]
APP = ROOT / 'Source/SmartBikeLights'


def schema():
    strings = {}
    for folder in ('resources', 'resources-highmemory'):
        for item in ET.parse(APP / folder / 'strings.xml').getroot().iter('string'):
            strings[item.attrib['id']] = item.text
    result = {}
    for folder in ('resources', 'resources-highmemory'):
        for item in ET.parse(APP / folder / 'settings.xml').getroot().iter('setting'):
            key = item.attrib['propertyKey'].split('.')[-1]
            config = item.find('settingConfig')
            choices = {strings[e.text.split('.')[-1]]: int(e.attrib['value'])
                       for e in config.findall('listEntry')}
            result[key] = (config.attrib, choices)
    return result


def validate(inputs):
    definitions = schema()
    if set(inputs) != set(definitions):
        raise ValueError('Provide exactly these settings: ' + ', '.join(definitions))
    result = {}
    for key, (config, choices) in definitions.items():
        value = inputs[key]
        if config['type'] == 'boolean':
            if type(value) is not bool:
                raise ValueError(f'{key}: expected a JSON boolean')
        elif choices:
            if not isinstance(value, str) or value not in choices:
                raise ValueError(f'{key}: choose one of {list(choices)}')
            value = choices[value]
        else:
            if not isinstance(value, str):
                raise ValueError(f'{key}: expected text')
            if '\0' in value or len(value) > int(config['maxLength']):
                raise ValueError(f'{key}: invalid text or exceeds {config["maxLength"]} characters')
            if len(value.encode('utf-8')) + 1 > 65535:
                raise ValueError(f'{key}: exceeds the SET string limit of 65534 UTF-8 bytes')
            if key.startswith('LC') and ('\n' in value or '\r' in value):
                raise ValueError(f'{key}: paste a single-line configurator value with literal \\n markers')
        result[key] = value
    return result


def encode(settings):
    table = bytearray()
    offsets = {}

    def string(value):
        if value not in offsets:
            raw = value.encode('utf-8') + b'\0'
            if len(raw) > 65535 or '\0' in value:
                raise ValueError('Invalid SET string')
            offsets[value] = len(table)
            table.extend(struct.pack('>H', len(raw)) + raw)
        return b'\x03' + struct.pack('>I', offsets[value])

    payload = bytearray(b'\x0b' + struct.pack('>I', len(settings)))
    for key, value in settings.items():
        payload.extend(string(key))
        if type(value) is bool:
            payload.extend(b'\x09' + bytes([value]))
        elif type(value) is int:
            payload.extend(b'\x01' + struct.pack('>i', value))
        else:
            payload.extend(string(value))
    return (bytes.fromhex('abcdabcd') + struct.pack('>I', len(table)) + table
            + bytes.fromhex('da7ada7a') + struct.pack('>I', len(payload)) + payload)


def decode(data):
    """Read back generated files and existing device files for verification."""
    if data[:4] != bytes.fromhex('abcdabcd'):
        raise ValueError('Invalid string table header')
    end = 8 + struct.unpack_from('>I', data, 4)[0]
    strings = {}
    pos = 8
    while pos < end:
        offset = pos - 8
        size = struct.unpack_from('>H', data, pos)[0]
        raw = data[pos + 2:pos + 2 + size]
        if not size or len(raw) != size or raw[-1:] != b'\0':
            raise ValueError('Invalid string record')
        strings[offset] = raw[:-1].decode('utf-8')
        pos += 2 + size
    if pos != end or data[end:end + 4] != bytes.fromhex('da7ada7a'):
        raise ValueError('Invalid values header')
    size = struct.unpack_from('>I', data, end + 4)[0]
    if end + 8 + size != len(data):
        raise ValueError('Invalid values length')
    pos = end + 8
    if data[pos] != 11:
        raise ValueError('Expected dictionary')
    count = struct.unpack_from('>I', data, pos + 1)[0]
    pos += 5

    def read():
        nonlocal pos
        tag = data[pos]
        pos += 1
        if tag == 9:
            value = data[pos]
            pos += 1
            if value not in (0, 1):
                raise ValueError('Invalid boolean')
            return bool(value)
        if tag not in (1, 3):
            raise ValueError('Unsupported value type')
        value = struct.unpack_from('>i' if tag == 1 else '>I', data, pos)[0]
        pos += 4
        return strings[value] if tag == 3 else value

    result = {}
    for _ in range(count):
        key = read()
        result[key] = read()
    if pos != len(data) or len(result) != count:
        raise ValueError('Invalid dictionary length')
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=ROOT / 'Build/settings/SmartBikeLights.SET')
    args = parser.parse_args()
    settings = validate(json.loads(os.environ['SETTINGS_INPUTS']))
    encoded = encode(settings)
    if decode(encoded) != settings:
        raise ValueError('SET verification failed')
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_bytes(encoded)
    print(f'Created {args.output} with all {len(settings)} settings; read-back verified.')


if __name__ == '__main__':
    main()
