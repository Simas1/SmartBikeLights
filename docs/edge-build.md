# Build and install on Garmin Edge devices

The manual GitHub Actions workflow (`.github/workflows/build-sbl.yml`) builds a `.prg`
on a standard Linux runner. Supported devices: **Edge 1040, 1050, 850, 550, 840, 540 and Forerunner 965**.
Runs are titled `Build SBL (<device>)` according to the selected device.
You do not need Java, Garmin's SDK, VS Code, Docker, or Garmin credentials on
your Mac. No repository secrets are required.

## Run on GitHub

1. Commit and push the workflow, build script, and configuration changes to
   `Simas1/SmartBikeLights`. The workflow must be on the default branch before
   GitHub displays its manual run button.
2. Open the repository's **Actions** tab. If prompted, enable workflows on your fork.
3. Select **Build SBL**, then **Run workflow** and select your branch.
   Choose `edge1040` (the default), `edge1050`, `edge850`, `edge550`, `edge840`, `edge540` or `fr965` from the **Device to build for** dropdown.
4. Open the completed run. Under **Artifacts**, download
   **SmartBikeLights-<device>**, matching your selection,
   and unzip it. Artifacts expire after seven days.
5. Connect the selected Edge device with a USB data cable. Copy `SmartBikeLights.prg` into
   `GARMIN/APPS` on the device, then eject and unplug it.
6. Add **Connect IQ → Smart Bike Lights** to a one-field activity data screen.
   Turn on your paired lights and test mode changes, including quick successive taps.

## Reusable local actions

The workflows call composite actions after checking out the repository:

- `.github/actions/build-sbl/action.yml` accepts `device` (`edge1040` by default,
  or `edge1050`, `edge850`, `edge550`, `edge840`, `edge540`) and builds `Build/<device>/SmartBikeLights.prg`. It requires Docker
  on Linux.
- `.github/actions/build-sbl-settings/action.yml` accepts a `settings` JSON object
  containing all eleven settings, runs the serializer tests, and creates
  `Build/settings/SmartBikeLights.SET`. It requires Python 3.

Helper scripts are stored beside each action's `action.yml`. With Docker
installed, you can also run `bash .github/actions/build-sbl/build-edge.sh edge1050`
locally; omitting the device defaults to `edge1040`.

## Configuration

The workflow compiles the property defaults committed on the selected branch:

- `Source/SmartBikeLights/resources/properties.xml`: Flash configuration,
  record light modes, and invert lights.
- `Source/SmartBikeLights/resources-highmemory/properties.xml`: Steady and Break
  configurations, configuration names, theme, and active configuration.

The two `properties.xml` files match the original upstream defaults: empty
configuration strings, Primary selected, blue theme, recording enabled,
and invert disabled. Custom configurations belong in the `.SET` file below.
Existing saved settings override the defaults compiled into the application.

## Create custom settings

1. Open **Actions → Build SBL Settings → Run workflow**.
2. Select the branch and edit any of the ten inputs. Every input has a default:
   recording on, invert off, Blue, Secondary, and the Flash/Steady/Break
   configuration strings and names. Only Flash includes mode icons.
3. Paste configuration strings directly from the configurator. Keep literal
   `\n` markers; do not add Markdown escapes before `#` or `@`.
4. Download the **SmartBikeLights-settings** artifact and unzip it.
5. Back up the Garmin's existing settings, then copy `SmartBikeLights.SET` into
   `GARMIN/APPS/SETTINGS`. Its basename must match `SmartBikeLights.prg`.
6. Safely disconnect and restart the Garmin.

This workflow replaces all eleven saved settings; it does not compile or install
an application. Use **Build SBL** separately for application changes.
The script uses Python's standard library and checks the generated binary by
reading it back. It preserves literal configuration text, including icon markers.
Names have the same 20-character limit as the settings UI. Individual SET strings
are limited to 65,534 UTF-8 bytes; GitHub also limits the total dispatch payload.
Blank configuration inputs are allowed to disable optional configurations.

Workflow defaults live in `.github/workflows/build-sbl-settings.yml`; they are
independent of the upstream application defaults. GitHub requires the workflow
on the repository's default branch before offering its manual Run workflow button.
See [GitHub's workflow input documentation](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#onworkflow_dispatchinputs).

## Build details and limitations

The script uses the third-party
[ConnectIQ Tester image](https://github.com/matco/connectiq-tester), pinned by
digest, containing SDK 9.2.0 and device files from 2026-08-31. Docker downloads
the image on the runner; compilation runs with networking disabled and source
mounted read-only. Only the `.prg` is uploaded.

The existing public `unit_test_key` signs this personal test build. It is not a
private publishing identity and should not be used for a store release.

The repository omits the generated `BikeLightSensor.LightSensor.mc` file and
the private ANT network key used for TransmitR remote controllers. The build
copies the sensor source into its temporary generated-source directory without
that key. External TransmitR controllers are therefore unsupported in this
workflow. The supplied configurations use no external controllers.

Other generated sources are already committed. If you edit files under
`source-preprocess`, regenerate and commit their outputs before running this
workflow; this workflow does not rerun the general preprocessor.

## Verify recovery after sleep

Sleep recovery now runs from the data field's calculation callback, including
when another data page is visible. It restores the saved control modes and
refreshes the light network before evaluating the automatic rules. It retains
the existing heuristic of a pause longer than two seconds; this is not an
explicit sleep notification from Garmin, so other calculation interruptions
can also trigger recovery.

After installing the updated build, select Smart mode for both lights and use
conditions where your configuration requests Off. Switch to another data page,
put the Edge to sleep, then wake it without visiting Smart Bike Lights. Both
lights should return to Off after calculations resume and the network reconnects.
Repeat while the Smart Bike Lights page is visible, and check that ordinary
page changes do not reset a deliberately selected Manual or Network mode.

This change addresses waking an already running data field. It cannot control
lights before Garmin starts the data field after a full power-on.

GitHub Free supports this workflow: standard runners are free for public
repositories; private repositories consume your included Actions allowance.

## Workflow warnings

The workflows use Node 24-compatible GitHub Actions releases. The Node version
selected by `setup-node` for the configurator build is separate from the runtime
used by the actions themselves.

The configurator's `npm ci` still reports deprecated transitive dependencies from
`react-scripts@5.0.1`: `w3c-hr-time`, `stable`, `rollup-plugin-terser`,
`sourcemap-codec`, and `svgo@1`. Removing these requires a build-tooling migration;
forcing incompatible dependency versions or hiding npm warnings is avoided.

Git's initial-branch-name hint during checkout is informational and does not
change the checked-out branch or affect the build.
