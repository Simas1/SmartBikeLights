# Edge 840 preview

Install **Edge 840** device support in Garmin SDK Manager, then run:

```bash
./Simulator/run-simulator.sh edge840
./Simulator/run-simulator.sh edge840 --lights at1600,flare-rt --battery at1600=25%,flare-rt=75%
./Simulator/run-simulator.sh edge840 --settings Simulator/settings.example.json
```

This profile uses the app's medium-resolution touchscreen
resources and annotation rules. Use the touchscreen controls.
Lights, battery options and saved settings are shared across profiles.

See [the shared simulator guide](../README.md) for prerequisites and flags.
