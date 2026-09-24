# Edge 550 preview

Install **Edge 550** device support in Garmin SDK Manager, then run:

```bash
./Simulator/run-simulator.sh edge550
./Simulator/run-simulator.sh edge550 --lights at1600,flare-rt --battery at1600=25%,flare-rt=75%
./Simulator/run-simulator.sh edge550 --settings Simulator/settings.example.json
```

This profile shows one active-mode card per connected light inside a single data
field: headlight on the left and taillight on the right. Mode graphics, brightness,
estimated runtime and a control-mode icon inside each card use the shared panel
design. The bottom-left status shows the active smart rule or Garmin network
mode, matching the fullscreen header. Cards have no name/battery footer. Off keeps a
neutral background. All details enabled in Theme settings must fit alongside the mode name/icon and bottom status/control icon. Details are never hidden automatically. If they do not fit, the field suggests hiding details in Settings or enlarging the field; no legacy icon layout is used.

Use Garmin's Connect IQ data-field settings menu for physical-button control.
Saved panel configurations preserve their graphics metadata; legacy menu-format
configurations also work, with the information available in their mode titles.

See [the shared simulator guide](../README.md) for prerequisites and flags.
