#!/usr/bin/env python3
"""Generate the compact diagnostics bitmap font; requires Pillow and a TTF path."""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

font = ImageFont.truetype(sys.argv[1], 20)
root = Path(__file__).resolve().parents[1] / 'Source/SmartBikeLights/resources/fonts'
image = Image.new('RGBA', (256, 256), (255, 255, 255, 0))
draw = ImageDraw.Draw(image)
lines = ['info face="Diagnostics" size=20 bold=0 italic=0 unicode=1',
         'common lineHeight=24 base=20 scaleW=256 scaleH=256 pages=1 packed=0',
         'page id=0 file="Diagnostics20.png"', 'chars count=95']
x = y = 0
for code in range(32, 127):
    char = chr(code)
    advance = round(font.getlength(char))
    left, top, right, bottom = font.getbbox(char)
    width = max(1, right - min(left, 0))
    if x + width + 1 > 256:
        x = 0
        y += 25
    draw.text((x - min(left, 0), y), char, font=font, fill='white')
    lines.append(f'char id={code} x={x} y={y} width={width} height=24 xoffset=0 yoffset=0 xadvance={advance} page=0 chnl=15')
    x += width + 1
image.save(root / 'Diagnostics20.png')
(root / 'Diagnostics20.fnt').write_text('\n'.join(lines) + '\n')
