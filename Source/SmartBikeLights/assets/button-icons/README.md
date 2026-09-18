# Button icons

Shared source artwork for mode buttons, brightness, and remaining runtime:

| File | Saved metadata / use |
| --- | --- |
| headlight.svg | @headlight |
| taillight.svg | @taillight |
| night.svg | @moon |
| flash.svg | @lightning |
| sun.svg | @sun |
| time.svg | Remaining-runtime clock |

The refined 48-unit artwork uses filled flash and crescent silhouettes, a solid
sun center with separated rays, and rounded lamp/clock strokes. Small icons use
simple shapes so their interiors remain legible.

Run `node scripts/generate-control-mode-fonts.cjs` with sharp available to copy
mode SVGs to the configurator and regenerate ModeIcons12/18. These font atlases
now preserve grayscale antialiasing, but are not used by the current mode-button
renderer.

Garmin draws these icons in LightPanelGraphics.drawIcon with antialiased
primitives where supported. This preserves the resource-free path introduced
for an Edge 1040 custom-font stack overflow. Older devices without setAntiAlias
use the same geometry without smoothing. The drawing code mirrors the SVG
geometry and must be updated alongside artwork. It restores the app's default
non-antialiased drawing state after each icon.

Brightness bars remain six filled rectangles drawn in code. Saved configuration
metadata is unchanged.
`preview.png` shows sizes 12, 19, 24, 32, and 40px from top to bottom,
enlarged 3x to match the control-icons preview. Columns are Headlight, Taillight,
Night, Flash, Sun, and Time. These are source-artwork samples, not
a list of runtime sizes; actual Garmin rasterization needs a device or simulator check. No native Garmin artwork is copied.
