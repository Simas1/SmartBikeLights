# Garmin simulator previews

Run from the repository root on macOS. Requires Python 3.9+, Java 17, Node.js/npm,
Connect IQ SDK (tested with 9.2.0), and the installed target-device profile.
The pinned `directive-preprocessor@1.1.1` is downloaded through npx on first use.

Use the simulator launcher with a device ID and optional settings:

Supported: `edge1040`, `edge1050`, `edge850`, `edge550`, `edge840`, `edge540`.
Edge 540 and 550 use button controls, not the touchscreen light panel.

```bash
./Simulator/run-simulator.sh edge1050 --settings Simulator/settings.example.json

./Simulator/run-simulator.sh edge1040 --lights at1600,flare-rt --battery at1600=25,flare-rt=25

./Simulator/run-simulator.sh edge1040 --lights at1600,varia-515,flare-rt

./Simulator/run-simulator.sh edge1040 --battery at1600=25,flare-rt=25 \
  --settings Simulator/settings.example.json
```

Default lights are **AT1600 and Flare RT**. `--lights` accepts comma-separated IDs
from [lights.json](lights.json); `-lights` is an alias. Use `--list-lights` to list
available models. Each ID can appear once. More than two lights are supported,
subject to app/device memory. Multiple network devices do not create extra UI
panels: the app has headlight and taillight slots. Use configuration serial-number
filters to choose between lights of the same type. Fixture serials are in the catalog.

The launcher also transfers the generated settings definition to the simulator.
The SDK settings editor displays groups but ignores edits to grouped controls
when saving. The launcher flattens groups in the generated simulator metadata,
preserving control order and labels but omitting group headings/separators.
The application's source settings XML retains its groups.
Initial preview values are applied once per build. Restarting that same build
preserves settings saved through Connect IQ or the SBL menu; a newly built preview
starts with the requested defaults or `--settings` values.
Open **File → Edit Persistent Storage → Edit Application.Properties data** to
edit the Connect IQ app settings while the preview is running.
Settings resource changes produce a new preview app ID and matching executable
filename, preventing the editor from reusing an older build's settings definition.
Unchanged settings resources retain the same identity. Close the settings editor
before launching, then reopen it for the current preview. No simulator-wide reset
is needed; a new settings revision starts a separate preview with its defaults
and any supplied `--settings` values.

## Preview original upstream

```bash
./Simulator/run-simulator.sh edge1040 --source upstream
./Simulator/run-simulator.sh edge1040 --source upstream --settings Simulator/settings.upstream.json
./Simulator/run-simulator.sh edge1050 --source upstream --battery at1600=25,flare-rt=75
```

`--source local` (the default) uses your current checkout, including uncommitted edits.
`--source upstream` clones the latest `master` from
[maca88/SmartBikeLights](https://github.com/maca88/SmartBikeLights) into a fresh ignored
`Build/simulator/upstream-source-*` directory. It requires Git and network access.
It never switches branches or adds remotes to your repository. Each build records
the upstream commit and repository in `preview.json` and prints them in the Terminal.
The original upstream UI/resources are used; only simulator plumbing (fake lights,
settings initialization, isolated app identity and device selection) is adapted.
Upstream and local previews have separate app IDs and storage.

Upstream uses its own property defaults and schema. Do not pass this fork's
`settings.example.json`: it contains fork-specific properties and visual markers.
Use `Simulator/settings.upstream.json` for AT1600/Flare RT panels and the three
Flash/Steady/Break configurations adapted from the fork example. It uses upstream
`AC` and removes custom icon markers while preserving mode labels and automation.
For other customized original panels, use a saved JSON/.SET file produced for upstream;
`--source upstream --list-settings` lists its supported properties (e.g. AC instead
of this fork's TH). No settings file means upstream defaults and its default panels.
`--prepare-only --source upstream` still downloads source but skips preprocessing
and compilation. Both the source checkout and build output are retained for inspection
and may be deleted afterwards. If upstream changes its source structure, preparation
fails rather than silently falling back to your fork.

## File organization

```text
Simulator/
  run-simulator.sh          Shared dispatcher (takes a device argument)
  lights.json               Shared fake-light catalog
  settings.example.json     Shared defaults from create-settings.yml
  common/
    run.py                  Shared preparation, settings, build and launch logic
    test_run.py             Shared validation and isolation tests
  edge1040/
    profile.json            Device-specific qualifiers and preview app identity
    README.md              Edge 1040 usage
  edge1050/
    profile.json            High-resolution touchscreen profile and preview app identity
    README.md              Edge 1050 usage
  edge850/                 Edge 850 profile and usage (high-resolution touch)
  edge550/                 Edge 550 profile and usage (high-resolution buttons)
  edge840/                 Edge 840 profile and usage (medium-resolution touch)
  edge540/                 Edge 540 profile and usage (medium-resolution buttons)
```

The shared runner discovers supported devices from `*/profile.json`. To add Edge
xxxx later, create `edgexxxx/` with its own profile and app ID, and validate its resource/annotation rules.
Generated source and binaries remain under ignored `Build/simulator/`.

## Saved settings

Settings are shared across device profiles that support the same app properties;
Device profiles select build qualifiers, simulator identity and settings format.
For Edge 540/550, touchscreen panel definitions in all three configuration slots
are converted to mode menus automatically. Touch-only controls and icon markers
are omitted; light modes, serial filters and automation rules are preserved.
Already menu-formatted configurations are unchanged. This conversion only affects
the simulator build; physical-device settings still need the correct configurator
device selection.

`--settings PATH` accepts a partial JSON object or Garmin `.SET` file. Omit it to
use application defaults. To use the complete workflow defaults, pass
`Simulator/settings.example.json` explicitly. It contains all eleven parameters
from `.github/workflows/build-sbl-settings.yml`, including the three full configurations.

Use `--list-settings` to display defaults and accepted choices. Keys are `LC`, `LC2`,
`LC3` (configurator strings), `CN1`–`CN3` (names), `CC` (active slot), `TH` (theme), `IL` (invert lights), and `RL` (record modes). Choice values accept displayed
labels or numbers; booleans require true/false. JSON strings must escape backslashes:
a literal `\n` configurator marker is written as `\\n` in the file.

The runner validates property types. The app validates configuration grammar and
supported modes. Match settings to the selected lights; switching to Varia with
Flare-specific settings may produce a normal app configuration error.

### Preview an error

```bash
./Simulator/run-simulator.sh edge1040 --settings Simulator/settings.error.json
```

With the default AT1600 and Flare RT fixtures, this configuration intentionally
requests unsupported headlight mode `99` in filter group 1. It triggers **Error 3**
during light initialization, without needing to start an activity. A full-screen
field shows the affected headlight, filter/mode details, and a suggested fix.
Smaller fields show the compact explanation or the original error code when space
is insufficient. Run with `Simulator/settings.example.json` to return to normal.
A plain string such as `"invalid"` does not reliably trigger Error 4: the parser
can treat missing configuration sections as defaults.

Every launch clears preview storage and applies selected settings before creating
the view. Changes made inside the simulator last for that run. Each device profile
has a separate preview app ID to isolate properties/storage from ordinary builds.
Individual-network routing is disabled in the copied code so selected lights use
the fake network. Pairing, radar targets, TransmitR remotes and ANT radio behavior
are not simulated. Avoid these features in visual preview settings.

## Initial light state

Each light starts in its catalog `onMode`, with battery status New (100%) unless
changed with `--battery`. AT1600 starts at preset 1 (51, Low). App filters and taps
can subsequently change modes. The fake network remains connected; battery states
stay fixed for the run. AT1600 mode IDs come from the configurator. Its manufacturer/
model numbers are synthetic placeholders, not physical ANT identification.

## Individual battery values

```bash
./Simulator/run-simulator.sh edge1040 --battery at1600=25%,flare-rt=75%
./Simulator/run-simulator.sh edge1040 --battery at1600=25,flare-rt=Chg
```

`--battery` sets the named lights independently; omitted lights default to New (100%). It accepts comma-separated assignments or repeated `--battery` flags.
The light IDs must be selected by `--lights` (default: `at1600,flare-rt`).

| Value (percent sign optional) | Battery category |
| --- | --- |
| 100% | New (1) |
| 75% | Good (2) |
| 50% | OK (3) |
| 25% | Low (4) |
| 5% | Critical (5) |
| Chg | Charging (6) |

Names (`new`, `good`, `ok`, `low`, `critical`, `charging`) are also accepted,
case-insensitively. These percentages are the app's approximate category labels,
not precise readings; other percentages are rejected. Resolved battery statuses
are saved with each light in `preview.json`.

ANT+ Bike Lights defines status 6 as Charging. A physical light can send it, but
whether a particular model reports it while charging depends on its firmware.
Charging is not a percentage and does not produce a remaining-runtime estimate.

## Build output and troubleshooting

Each invocation creates `Build/simulator/DEVICE-UNIQUE/` containing copied
source, `preview.json` with resolved choices, and `SmartBikeLights-sim.prg`. Normal
application source and settings are unchanged. Delete old preview folders when
finished; these folders are retained, not auto-cleaned. Keep personal settings under
ignored `Build/` if you do not want to commit them.

- `--build-only`: compile without opening/loading the simulator.
- `--prepare-only`: generate inputs without the SDK or dependency downloads.
- `--sdk PATH`: select an SDK; otherwise uses `CIQ_SDK` or Garmin's active SDK.
- If simulator startup takes longer than three seconds, wait for its window and run
  `"$CIQ_SDK/bin/monkeydo" "/absolute/path/to/SmartBikeLights-sim.prg" edge1040` again.
- The launcher icon scaling warning is harmless for panel previews.
- The launcher works around the SDK 9.2 app-transfer deadlock by writing shell
  transfer progress to `simulator-transfer.log` in the preview folder. The SDK
  waits for transfers without reading their output; large transfers can otherwise
  leave a blank simulator window. Interactive app output is still shown normally.
- Private `networkKeys` is excluded; the copied sensor source retains the commented
  key directive, following the existing repository build script.

Tests:

```bash
python3 -m unittest discover -s Simulator/common -p 'test_*.py'
```

The app's **Settings → About → Commit** shows the source checkout's short Git
revision. `-dirty` means tracked files had local changes when the build was prepared.
Simulator and `build-edge.sh` builds stamp this automatically. Direct IDE builds
show `Unknown` unless you first run:

```bash
python3 scripts/write-build-info.py --source Source/SmartBikeLights --output Source/SmartBikeLights/resources-highmemory/build-info.xml
```

Keep the checked-in `build-info.xml` fallback unchanged; stamp a copied build
folder when possible.

**About → Tag** shows a Git tag pointing exactly at the source commit, or `--`
when there is no exact tag (or Git metadata is unavailable). Both lightweight
and annotated tags are supported. A tagged checkout with local modifications
still shows its tag; the Commit row retains the `-dirty` suffix.

**About → Version** is read from the application version in `manifest.xml`
at build time by the same script. Bump only that manifest attribute for future
versions. Direct IDE builds must run the command above first to populate Version
and Commit; otherwise both show `Unknown`.

Light-button names use `~br` for a forced line break. Graphics metadata uses
`~n`, for example `Night~brFlash~n5lm-15h~n@lightning`. Both markers survive
Connect IQ settings saves. The configurator converts pasted literal `\n` and
actual newlines in names to `~br` when exporting. Legacy metadata separators
must still be changed to `~n`.
