# Garmin unit tests

SBL's Monkey C tests are in `Source/SmartBikeLights/tests`. Run them with the
Garmin Connect IQ SDK's `monkeyc --unit-test` and `monkeydo -t` tools. The old
Windows-only `ciq-test-runner` package is no longer needed.

On macOS, ensure Java is on your PATH and run
from the repository root:

```sh
bash scripts/test-sbl.sh edge1040
```

The script reads the selected SDK from Garmin's macOS `current-sdk.cfg`.
Alternatively, set `CIQ_SDK` to the SDK directory. It also works with the SDK's
Bash launchers on Linux when `CIQ_SDK` is set.
The script starts the simulator automatically and retries connections during startup.
Builds use the checked-in generated source; regenerate it first if you change
`source-preprocess` (using the existing preprocessing workflow).

To test all supported devices:

```sh
bash scripts/test-sbl.sh edge1050 edge850 edge550 edge1040 edge840 edge540 fr965
```

From `Source/SmartBikeLights`, the equivalent command is
`npm run tests -- edge1040`. With no device argument, it tests Edge 1040.
Compiled test programs are written to `Build/unit-tests/<device>/`.
The script prints Garmin's test results directly; inspect its PASS/FAIL summary.

These are app-logic tests, separate from the Python tests of the simulator
scripts (`python3 -m unittest discover -s Simulator/common -p 'test_*.py'`).
