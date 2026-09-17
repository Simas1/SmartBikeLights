# Control-mode icon fonts

These SVGs and `../power/power.svg` are the source artwork for the app's bitmap fonts. All use a
48×48 viewBox, a 3-unit rounded stroke, and a transparent background.

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
