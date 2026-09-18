# Edge 1040 preview

Install Edge 1040 / 1040 Solar in Garmin SDK Manager, then from the repository root:

```bash
./Simulator/edge1040/run-simulator.sh --scenario lights-on
./Simulator/edge1040/run-simulator.sh --lights at1600,flare-rt --scenario low-battery
./Simulator/edge1040/run-simulator.sh --lights at1600,varia-515,flare-rt
./Simulator/edge1040/run-simulator.sh --settings Simulator/edge1040/settings.example.json
```

This launcher fixes the device to `edge1040`; do not repeat the device argument.
`profile.json` owns its resource qualifiers and preview app ID. `settings.example.json`
contains all ten parameters and exact defaults from the settings workflow, including
the AT1600/Flare RT configurations. Pass it explicitly to use those configurations;
omitting `--settings` uses app defaults.

Shared flags, light catalog, scenarios, dependencies and limitations are documented
in [the simulator guide](../README.md).
