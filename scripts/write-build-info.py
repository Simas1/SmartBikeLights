#!/usr/bin/env python3
"""Stamp the manifest version and Git metadata into a build's Garmin resources."""
import argparse
from pathlib import Path
import subprocess
import xml.etree.ElementTree as ET


def write_build_info(source, output):
    application = ET.parse(Path(source) / 'manifest.xml').find(
        '{http://www.garmin.com/xml/connectiq}application'
    )
    if application is None or not application.get('version'):
        raise ValueError('manifest.xml must define an application version')
    version = application.get('version')
    try:
        revision = subprocess.check_output(
            ['git', '-C', str(source), 'rev-parse', '--short=7', 'HEAD'], text=True, stderr=subprocess.DEVNULL
        ).strip()
        dirty = subprocess.check_output(
            ['git', '-C', str(source), 'status', '--porcelain', '--untracked-files=no'], text=True
        ).strip()
        if dirty:
            revision += '-dirty'
    except (OSError, subprocess.CalledProcessError):
        revision = 'Unknown'
    try:
        tag = subprocess.check_output(
            ['git', '-C', str(source), 'describe', '--tags', '--exact-match', 'HEAD'],
            text=True, stderr=subprocess.DEVNULL
        ).strip()
    except (OSError, subprocess.CalledProcessError):
        tag = '--'
    root = ET.Element('strings')
    ET.SubElement(root, 'string', id='AppVersion').text = version
    ET.SubElement(root, 'string', id='AppCommit').text = revision
    ET.SubElement(root, 'string', id='AppTag').text = tag
    Path(output).write_text(ET.tostring(root, encoding='unicode') + '\n')
    return revision


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    write_build_info(args.source, args.output)
