# Bold Blue light panel

Touchscreen light panels use a flat blue selected button with white content.
Each light keeps its configured buttons and order. Off and control mode use
icons; control icons distinguish Smart (spark), Network (connected nodes), and
Manual (hand). Control buttons are taller, with larger, heavier icons and more
rounded corners. Headlight/taillight headers are omitted, but the active
automation/filter group name is shown above each light when **Group name
visibility** is enabled in the configurator. This setting retains its saved
font size. Configuration buttons
are removed from the grid at layout time, including from older saved settings.
The footer's central cycle icon and current name switch to the next nonempty
configuration. The two outer summaries show each light's name and battery.

## Mode details

In the configurator, enter **Brightness (lumens)** and **Full-charge runtime
(hours)** together. Six brightness segments appear below the mode name,
normalized to the brightest configured button for that light. Positive values
always light at least one segment. Different lights have independent maxima.

Choose **None**, **Sun**, **Moon**, or **Lightning** explicitly for the mode
icon. Renaming a mode never changes its icon. The existing personal defaults
now specify icons; legacy labels without an icon retain None.

Existing labels such as `Low\n200lm-12h` import into the separate fields.
Export retains that wire format, with an optional final `\n@sun`, `\n@moon`, or
`\n@lightning` line. Other labels remain plain text. Older app versions display
the metadata as text; use the updated app for graphical rendering.

## Battery estimates

ANT light battery readings are categories, **not measured percentages**. The
following deliberately rough assumptions are used for both the footer and
runtime estimates:

| Reported category | Assumed remaining charge |
| --- | --- |
| New | 100% |
| Good | 75% |
| OK | 50% |
| Low | 25% |
| Critical | 5% |

Estimated minutes = full-charge hours × 60 × assumed charge fraction. Both
charge and runtime are prefixed with `~`; they can change abruptly when a
category changes. Charging shows `Chg` and no runtime; invalid or unavailable
charge shows `--`. These estimates do not account for temperature, battery
age, flash duty cycle variations, or device-specific category thresholds.

The clock and runtime turn red when the unrounded estimate is **less than
30 minutes**. Exactly 30 minutes is not red. There is no exclamation mark.
The runtime font is never larger than its button's mode-name font.
Selected low-runtime buttons use a pale backing behind the red time so it
remains readable on blue. Very small tiles retain the name when there is not
enough room for all three rows.

## Validation and installation

Garmin unit tests cover parsing, per-light brightness scales, the warning
boundary, unknown battery readings, and optional/configuration button groups.
Configurator tests cover metadata round trips and legacy labels.

Run `node scripts/check-panel-layout.mjs` for the host-side drawing regression
check. It executes the Monkey C drawing bodies with a recording display context
and representative font metrics, checking 192 mode layouts and footer bounds.
It covers both backgrounds, selected states, warning states, and both columns.
It is not a Garmin simulator and does not verify exact device font rasterization.
An optional output directory generates day/night SVG previews.

Text anchors use the SDK's named constants: Garmin's numeric values are Right
0, Center 1, Left 2. Using the opposite numeric convention causes text to spill
into the adjacent light column and over the clock/battery icons.

Build/install instructions: [Edge 1040](edge1040-build.md). Existing saved
settings take precedence over defaults, but old rating labels and old
configuration buttons are handled by the updated layout automatically.

On a device, verify all buttons and footer targets, single-light and inverted
layouts, missing Off/control buttons, long names, and bright/dark backgrounds.
