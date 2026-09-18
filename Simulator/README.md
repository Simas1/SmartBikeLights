# Garmin simulator previews

Run from the repository root on macOS. Requires Python 3.9+, Java 17, Node.js/npm,
Connect IQ SDK (tested with 9.2.0), and the installed target-device profile.
The pinned `directive-preprocessor@1.1.1` is downloaded through npx on first use.

```bash
./Simulator/run-simulator.sh edge1040 --lights at1600,flare-rt --scenario low-battery
./Simulator/run-simulator.sh edge1040 --lights at1600,varia-515,flare-rt
```

The device-specific entry point is equivalent and needs no device argument:

```bash
./Simulator/edge1040/run-simulator.sh --scenario low-battery \
  --settings Simulator/settings.example.json
```

Default lights are **AT1600 and Flare RT**. `--lights` accepts comma-separated IDs
from [lights.json](lights.json); `-lights` is an alias. Use `--list-lights` to list
available models. Each ID can appear once. More than two lights are supported,
subject to app/device memory. Multiple network devices do not create extra UI
panels: the app has headlight and taillight slots. Use configuration serial-number
filters to choose between lights of the same type. Fixture serials are in the catalog.

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
    run-simulator.sh        Edge 1040 entry point
    profile.json            Device-specific qualifiers and preview app identity
    README.md              Edge 1040 usage
```

The shared runner discovers supported devices from `*/profile.json`. To add Edge
1050 later, create `edge1050/` with its own profile, app ID and launcher, and validate its resource/annotation rules. Edge 1050 is not implemented yet.
Generated source and binaries remain under ignored `Build/simulator/`.

## Saved settings

Settings are shared across device profiles that support the same app properties;
only build qualifiers and simulator identity belong to a device profile.

`--settings PATH` accepts a partial JSON object or Garmin `.SET` file. Omit it to
use application defaults. To use the complete workflow defaults, pass
`Simulator/settings.example.json` explicitly. It contains all ten parameters
from `.github/workflows/create-settings.yml`, including the three full configurations.

Use `--list-settings` to display defaults and accepted choices. Keys are `LC`, `LC2`,
`LC3` (configurator strings), `CN1`–`CN3` (names), `CC` (active slot), `AC` (activity
color), `IL` (invert lights), and `RL` (record modes). Choice values accept displayed
labels or numbers; booleans require true/false. JSON strings must escape backslashes:
a literal `\n` configurator marker is written as `\\n` in the file.

The runner validates property types. The app validates configuration grammar and
supported modes. Match settings to the selected lights; switching to Varia with
Flare-specific settings may produce a normal app configuration error.

Every launch clears preview storage and applies selected settings before creating
the view. Changes made inside the simulator last for that run. Each device profile
has a separate preview app ID to isolate properties/storage from ordinary builds.
Individual-network routing is disabled in the copied code so selected lights use
the fake network. Pairing, radar targets, TransmitR remotes and ANT radio behavior
are not simulated. Avoid these features in visual preview settings.

## Scenarios

- `lights-on`: each light starts in its catalog `onMode`, battery status 1 (new).
- `low-battery`: same initial modes, battery status 4 (low, not a percentage).
- `lights-off`: mode 0 for every light, battery status 1.

AT1600 starts at preset 1 (51, Low). App filters and taps can subsequently change
modes. The fake network remains connected; battery states stay fixed for the run.
AT1600 mode IDs come from the configurator. Its manufacturer/model numbers are
synthetic zero-valued placeholders, not claims about physical ANT identification.

## Build output and troubleshooting

Each invocation creates `Build/simulator/DEVICE-SCENARIO-UNIQUE/` containing copied
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
- Private `networkKeys` is excluded; the copied sensor source retains the commented
  key directive, following the existing repository build script.

Tests:

```bash
python3 -m unittest discover -s Simulator/common -p 'test_*.py'
```
