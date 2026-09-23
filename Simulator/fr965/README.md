# Forerunner 965 preview

Install **Forerunner 965** device support in Garmin SDK Manager, then run:

```bash
./Simulator/run-simulator.sh fr965
./Simulator/run-simulator.sh fr965 --settings Simulator/settings.example.json
./Simulator/run-simulator.sh fr965 --battery at1600=25,flare-rt=75
```

Uses a full-screen round layout and touchscreen controls. Full-screen fields
show two Edge-style buttons using the shared mode artwork, brightness bars,
runtime fill and control icons, with light names above and battery icons/percentages below. The watch uses larger
control-mode icons and reserves footer space for the status text. Medium and small
slots are blank and have no touch controls. Shared
panel configurations retain their brightness/runtime metadata. Legacy menu
configurations also work, with unavailable brightness/runtime shown as `--`.
The upstream preview continues to use its original layout and menu conversion.

Tap a full-screen card to cycle its configured light modes (Off comes last).
Tap its bottom-right control icon to switch Smart/Network control, matching Edge;
a card-body tap enters Manual mode. Tap the configuration name to switch saved
profiles immediately. The watch uses native settings only; open them with
**Settings → Trigger App Settings** in the simulator.
Touch must be enabled for the activity (or in the simulator's Settings menu).

Choose a full-screen data-field layout in the simulator to inspect the entire
watch display.

See [the shared simulator guide](../README.md) for prerequisites and flags.
