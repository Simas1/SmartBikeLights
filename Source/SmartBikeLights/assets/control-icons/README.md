# Control and Power icons

One set of SVGs supplies every Control Mode and Power bitmap-font size:
`manual.svg` (M), `network.svg` (N), `smart.svg` (S), and `power.svg` (P).

Artwork uses a 24-unit grid with curved sparkle sides, a rounded palm,
rounded network nodes, and an inset power ring.

| Font resource | Pixel height |
| --- | --- |
| ControlMode12 | 12 |
| ControlMode18 / ControlMode32 | 19 |
| PanelControl24 | 24 |
| ControlMode54 | 32 |
| PanelControl40 | 40 |

The generator renders PanelControl24 directly at its native size. Other sizes
use supersampling and resizing. All control fonts preserve antialiased coverage
as grayscale on black, rather than only PNG alpha. Black represents no glyph
coverage; Garmin applies the current text color at runtime.

Generated PNG atlases and `.fnt` files remain in `resources/fonts`.
`preview.png` shows sizes 12, 19, 24, 32, and 40 from top to bottom, enlarged 3x.
Small sizes retain less detail; check day/night and selected/unselected states
on the device. The legacy `../ControlMode.sfd` is not a generation source.

With Node.js and sharp available, run from the repository root:

```sh
node scripts/generate-control-mode-fonts.cjs --panel-only
```

Omit `--panel-only` to regenerate all fonts handled by the script. The option
regenerates only PanelControl24. Commit artwork and generated resources together.
