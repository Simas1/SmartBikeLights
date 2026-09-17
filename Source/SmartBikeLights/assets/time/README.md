# Time icon

The SVG here is the source artwork for the remaining-runtime indicator. It uses
a 48×48 viewBox, a 3-unit rounded stroke, and a transparent background.

| Glyph | Icon |
| --- | --- |
| C | Time (clock) |

Regenerate from the repository root with Node.js and `sharp` available:

```sh
node scripts/generate-control-mode-fonts.cjs
```

The script creates white glyphs with alpha coverage so Garmin can apply the
current text color. Commit both the generated `.fnt` files and PNG atlases.

The panel uses glyph C in ModeIcons12/18 before the remaining-runtime estimate.
It follows the mode's selected/day/night text color. `preview.png` shows the
artwork on a white background.
