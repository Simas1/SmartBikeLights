# Build and install on Edge 1040

The manual GitHub Actions workflow builds a `.prg` on a standard Linux runner.
You do not need Java, Garmin's SDK, VS Code, Docker, or Garmin credentials on
your Mac. No repository secrets are required.

## Run on GitHub

1. Commit and push the workflow, build script, and configuration changes to
   `Simas1/SmartBikeLights`. The workflow must be on the default branch before
   GitHub displays its manual run button.
2. Open the repository's **Actions** tab. If prompted, enable workflows on your fork.
3. Select **Build Edge 1040**, then **Run workflow** and select your branch.
4. Open the completed run. Under **Artifacts**, download
   **SmartBikeLights-edge1040** and unzip it. Artifacts expire after seven days.
5. Connect the Edge 1040 with a USB data cable. Copy `SmartBikeLights.prg` into
   `GARMIN/APPS` on the device, then eject and unplug it.
6. Add **Connect IQ → Smart Bike Lights** to a one-field activity data screen.
   Turn on your paired lights and test mode changes, including quick successive taps.

## Configuration

The workflow compiles the property defaults committed on the selected branch:

- `Source/SmartBikeLights/resources/properties.xml`: Flash configuration,
  record light modes, and invert lights.
- `Source/SmartBikeLights/resources-highmemory/properties.xml`: Steady and Break
  configurations, configuration names, activity color, and active configuration.

The personal defaults currently select **Steady Config**, with blue activity
color, recording enabled, and invert disabled. Saved settings already on the
device take precedence over build defaults. Sideloaded applications cannot be
configured through the iPhone Connect IQ settings page. To replace existing
settings, use the simulator-generated `.SET` transfer method described in
[Garmin's forum](https://forums.garmin.com/developer/connect-iq/f/discussion/5382/user-settings-on-development-app-on-actual-device).

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

GitHub Free supports this workflow: standard runners are free for public
repositories; private repositories consume your included Actions allowance.
