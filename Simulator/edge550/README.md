# Edge 550 preview

Install **Edge 550** device support in Garmin SDK Manager, then run:

```bash
./Simulator/run-simulator.sh edge550
./Simulator/run-simulator.sh edge550 --lights at1600,flare-rt --battery at1600=25%,flare-rt=75%
./Simulator/run-simulator.sh edge550 --settings Simulator/settings.example.json
```

This profile uses the app's high-resolution button-controlled
resources and annotation rules. This device has no touchscreen; preview its button-controlled interface, not the touch light panel.
Lights, battery options and saved settings are shared across profiles. The simulator
converts touchscreen button panels in saved settings into this device’s mode menus
before loading them, preserving the light modes and automation rules.

See [the shared simulator guide](../README.md) for prerequisites and flags.
