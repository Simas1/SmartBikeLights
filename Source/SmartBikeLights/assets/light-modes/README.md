# Light-mode icons

The SVGs here are shared source artwork for the configurator and Garmin panel.
Run `node scripts/generate-control-mode-fonts.cjs` from the repository root
(requires `sharp`) after editing them. It copies SVGs into the configurator's
`src/icons/light-modes` directory and generates the ModeIcons12/18 bitmap fonts.

| Display name | Saved metadata | Font glyph |
| --- | --- | --- |
| Headlight | @headlight | H |
| Taillight | @taillight | T |
| Night | @moon | N |
| Flash | @lightning | F |

Night and Flash retain the older metadata names so saved configurations remain
compatible. Icons appear before the mode name and follow its selected/day/night
text color. None removes the icon; Sun remains available for existing setups.
