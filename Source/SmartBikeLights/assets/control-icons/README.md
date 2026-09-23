# Control and Power icons

One set of SVGs supplies every Control Mode and Power bitmap-font size:
`manual.svg` (M), `network.svg` (N), `smart.svg` (S), and `power.svg` (P).

Artwork uses a 24-unit grid with curved sparkle sides, a rounded palm,
rounded network nodes, and an inset power ring.

| Font resource | Pixel height |
| --- | --- |
| PanelControl24 | 24 |
| PanelControl40 | 40 |

The generator renders PanelControl24 directly at its native size. Other sizes
use supersampling and resizing. All control fonts preserve antialiased coverage
as grayscale on black, rather than only PNG alpha. Black represents no glyph
coverage; Garmin applies the current text color at runtime.

Generated PNG atlases and `.fnt` files remain in `resources/fonts`.

With Node.js and sharp available, run from the repository root:

```sh
node scripts/generate-control-mode-fonts.cjs --panel-only
```

Omit `--panel-only` to regenerate all fonts handled by the script. The option
regenerates only PanelControl24. Commit artwork and generated resources together.
