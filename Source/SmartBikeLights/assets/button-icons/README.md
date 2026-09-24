# Button icons

These SVGs supply the configurator and the Garmin bitmap fonts.

| File | Saved metadata / use | Glyph |
| --- | --- | --- |
| headlight-high.svg | @headlight-high | H |
| headlight-medium.svg | @headlight-medium | h |
| headlight-low.svg | @headlight-low | L |
| taillight-high.svg | @taillight-high | T |
| taillight-medium.svg | @taillight-medium | t |
| taillight-low.svg | @taillight-low | l |
| night.svg | @moon | N |
| flash.svg | @lightning | F |
| sun.svg | @sun | S |
| time.svg | Remaining runtime | C |

Run `node scripts/generate-control-mode-fonts.cjs` with sharp available. It copies
mode SVGs to the configurator and generates ModeIcons12/18/22 with grayscale
antialiasing. `preview.png` is generated from those exact atlases: 12, 18, and
22px rows, enlarged 3x. Columns follow the table above.

Mode buttons draw these font glyphs directly using drawText, without an extra
icon wrapper. Fonts are cached once during panel setup, outside the nested
redraw path, to reduce stack depth compared with the previous font attempt.
Normal buttons use 18px mode icons and 12px clocks; wide buttons use 22px mode
icons and 18px clocks. The Edge 1040 simulator has rendered the bitmap path;
physical-device behavior still needs checking, especially older firmware.

Garmin may quantize grayscale coverage, and simulator window enlargement may
change the apparent edges. Both preview and app now use the same artwork and
pixel dimensions rather than independent SVG/primitive implementations.
Brightness bars and configuration-switch arrows remain procedural. Saved
configuration metadata is unchanged.

High uses three beams, medium two, and low one.
