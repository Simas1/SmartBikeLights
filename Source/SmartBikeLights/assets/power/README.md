# Power icon

For the 24px panel trial, `../panel-control-24/power.svg` overrides this source
and preserves antialiased edges. Other sizes still use the pipeline below.

The SVG here is the source artwork for the app's Power / Off button. It uses a
48×48 viewBox, a 4-unit rounded stroke, and a transparent background.

| Glyph | Icon |
| --- | --- |
| P | Power / Off |

Regenerate from the repository root with Node.js and `sharp` available:

```sh
node scripts/generate-control-mode-fonts.cjs
```

The script creates white glyphs with alpha coverage so Garmin can apply the
current text color. Commit both the generated `.fnt` files and PNG atlases.

The Power / Off button uses glyph P in the ControlMode and PanelControl bitmap
fonts. It follows the button's selected/day/night text color.

`power.svg` is the active font artwork. Generated glyphs use binary alpha
coverage for crisp MIP rendering. `preview.png` shows the 24px and 40px glyphs
in white on the same blue background used by the control-mode preview.
