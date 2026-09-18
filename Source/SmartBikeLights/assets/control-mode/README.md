# Control-mode icon fonts

The 24px panel trial now uses `../panel-control-24/` artwork, rendered at native
size with partial alpha preserved. See that directory's README. The binary-alpha
description below applies to the remaining ControlMode and PanelControl sizes.

The SVGs here and `../power/power.svg` are the source artwork for
the app's bitmap fonts. They use transparent backgrounds and geometry tuned
for small device displays. `preview.png` shows the current glyphs.

| Glyph | Icon |
| --- | --- |
| M | Manual (tap) |
| N | Network |
| S | Smart (sparkle) |
| P | Power / Off |

Regenerate from the repository root with Node.js and `sharp` available:

```sh
node scripts/generate-control-mode-fonts.cjs
```

The script creates white glyphs with alpha coverage so Garmin can apply the
current text color. Commit both the generated `.fnt` files and PNG atlases.
The legacy `../ControlMode.sfd` contains the old letter glyphs and is no longer
the source for these fonts.

Existing status-font filenames retain their historical names and line heights:
ControlMode12 = 12px, ControlMode18 and ControlMode32 = 19px, ControlMode54 = 32px.
The touch panel uses PanelControl24 or PanelControl40 and falls back to its
status font in smaller buttons. Runtime control values still map to S/N/M;
the Off button uses P.

Device fonts use the simplified artwork here: a solid Smart sparkle,
a symmetrical Network with rectangular nodes and right-angle connectors, and
a tap hand with a thinner outline and no decorative rays. Power uses
`../power/power.svg`. The generated glyphs use binary alpha
coverage for crisp MIP rendering.
Panel icons fit the button with a two-pixel margin before falling back to the
smaller status font.

The approved compact Network uses a 24-unit pixel grid: three identical 8×7
rectangles, 4×3 openings, and 2-unit borders and connectors throughout.
