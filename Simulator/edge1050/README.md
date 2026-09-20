# Edge 1050 preview

Install the **Edge 1050** device profile in Garmin SDK Manager, then run from the
repository root:

```bash
./Simulator/run-simulator.sh edge1050
./Simulator/run-simulator.sh edge1050 --lights at1600,flare-rt --battery at1600=25%,flare-rt=75%
./Simulator/run-simulator.sh edge1050 --settings Simulator/settings.example.json
```

This profile uses the app's Edge 1050 high-resolution touchscreen resources and
annotation rules. Its preview app ID is separate from the Edge 1040 profile.
Lights, battery options and saved settings are shared between both profiles.

See [the shared simulator guide](../README.md) for prerequisites and all flags.
