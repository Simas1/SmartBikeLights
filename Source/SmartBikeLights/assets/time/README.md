# Time icon

The SVG here is the source artwork for the remaining-runtime indicator. It uses
a 48×48 viewBox, a 3-unit rounded stroke, and a transparent background.

| File | Icon |
| --- | --- |
| time.svg | Time (clock) |

The Garmin panel draws the clock directly using the SVG's circle and hand
coordinates. It does not load a bitmap font for runtime estimates. This keeps
the frequently drawn runtime indicator independent of font resource loading.

It appears before the remaining-runtime estimate and follows the mode's
selected/day/night text color. `preview.png` shows white icons on blue
at 24px and 40px, matching the control-mode preview.
