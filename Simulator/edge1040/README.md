# Edge 1040 preview

Install Edge 1040 / 1040 Solar in Garmin SDK Manager, then from the repository root:

```bash
./Simulator/run-simulator.sh edge1040
./Simulator/run-simulator.sh edge1040 --lights at1600,flare-rt --battery at1600=25,flare-rt=25
./Simulator/run-simulator.sh edge1040 --lights at1600,varia-515,flare-rt
./Simulator/run-simulator.sh edge1040 --settings Simulator/settings.example.json
```

The shared launcher selects this profile using the `edge1040` argument.
`profile.json` owns its resource qualifiers and preview app ID. The shared
[`settings.example.json`](../settings.example.json)
contains all ten parameters and exact defaults from the settings workflow, including
the AT1600/Flare RT configurations. Pass it explicitly to use those configurations;
omitting `--settings` uses app defaults.

Shared flags, light catalog, battery options, dependencies and limitations are documented
in [the simulator guide](../README.md).
