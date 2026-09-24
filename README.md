Smart Bike Lights
===============

Smart Bike Lights is a [data field](https://developer.garmin.com/connect-iq/connect-iq-basics/app-types/#datafields) IQ Connect application for Garmin devices, that displays and controls ANT+ lights. Garmin has a built-in `Auto` [Light mode](https://www8.garmin.com/manuals/webhelp/variabikelights/EN-US/GUID-73B08487-BA57-4EF0-A253-D226E229BC68.html) setting, which automatically adjusts the light intensity based on the ambient light or time of day. The issue with `Auto` mode is that is not configurable and that is why this application introduces a special `Smart` mode, which is fully configurable based on sunset, sunrise, speed, ... (check [supported filters](#filters)).


## Features
- Smart mode that control lights based on the configured filters
- Records lights modes that are displayed in Garmin Connect
- Configurable full screen light panel for fast switching modes (only for Edge devices with touch screen)
- Edge 540/550 show the active headlight and taillight mode cards in one sufficiently large data field, with neutral Off cards and physical-button control through native menus
- Support up to one headlight and one taillight in one data field; Edge 540/550 require enough space for the mode cards and show “Field too small” otherwise
- Switching light mode by tapping on the light icon (only for Edge devices with touch screen)
- Switching modes by holding the up/menu button (only for devices without touch screen that have CIQ 3.2+ and with more than 32KB memory)
- Has an alternative light network implementation that can be used for lights with partial ANT+ support (only for devices with more than 32KB memory)
- Support multiple light configurations (only for devices with more than 32KB memory)
- Support controlling multiple headlights/taillights at once (only for devices with more than 32KB memory)
- Has a built-in app settings editor (only for Edge touchscreen devices or devices that have CIQ 3.2+ and more than 32KB memory)
- Support controlling lights and play tones by using external controllers (only for devices that have CIQ 3.2+ and more than 32KB memory)

## How to use

1. [Download](https://apps.garmin.com/en-US/apps/0d9fd828-c932-4470-9c37-fd2828881888) the data field application from Garmin Connect Store and synchronize your Garmin device
2. Pair your bike lights with your Garmin device ([Garmin manual](https://www8.garmin.com/manuals/webhelp/variaut/EN-US/GUID-C4BB544A-78FA-4B3E-9061-2371B7B3C558.html))
3. On your Garmin device set `Light Beam Activated` setting to `Timer Start` in `Menu` -> `Sensors` -> `Lights` -> `Network Options` (optional step. Ignore this step if such setting does not exist on your device)
4. Configure your paired lights with the [Lights Configurator](https://simas1.github.io/SmartBikeLights/) (In case your light is not on the list, check [this thread](https://forums.garmin.com/developer/connect-iq/f/showcase/248492/data-field-smart-bike-lights))
5. By using Garmin Connect Mobile or Garmin Express, copy the final configuration value from [Lights Configurator](https://simas1.github.io/SmartBikeLights/) into the application setting: `Lights Configuration`
6. Select the data screen where you want put the data field
7. On the chosen field select `Connect IQ` -> `Smart Bike Lights`

## Light Diagnostics

Enable **Settings → Light Diagnostics** (off by default) to inspect the existing light network while SBL continues controlling the lights. Available on Edge 1050, 850, 550, 1040, 840, 540 and Forerunner 965.

The display shows one physical light per page with raw `TY`, `ID`, `LM`, `BS` and `CM` values, plus a shared network status and update count. Touchscreen Edges and the 965 have a Light Device button to cycle pages, Control to cycle S/N/M (Smart is skipped without filters), Mode to select a supported mode without sending, and Set Mode to apply it in Manual control. Controls use the existing headlight/taillight group; modes unsupported by that group are not sent. Edge 540/550 show the device label as text, cycle lights every three seconds, and use built-in settings for control changes. `MEM` shows used/total app memory in KB; `NET` counts network losses and subsequent recoveries, excluding the first connection. Each headlight/taillight control group keeps its latest `CMD`, resend count (`Retry`), and confirmation time from the initial send. A matching reported mode completes the timing; unrelated reports do not. Results can also be Waiting, Timeout, Disconnected, or Cancelled. Multiple lights controlled as one group share its command result. Counters and command records update while diagnostics is closed; memory is sampled when displaying it. Records reset when SBL restarts. Values come from the existing network, not Configurator labels. Turn the switch off to restore the normal display. Diagnostics appears only in a full-screen field; smaller fields retain their normal display. Tap the Settings button to open Settings on touchscreen Edge devices. Forerunner 965 and Edge 550/540 use Garmin’s physical-button app settings menu. The switch is also available in Garmin Connect/Express app settings.

## Control modes

| Name | Description |
| :--- | :---------- |
| Smart | Controlled by configured filters. |
| Network | Controlled by Garmin's light-network mode. |
| Manual | Controlled by your mode selection or the light's own buttons. |

## Changing control modes

Supported devices: **Edge 1050, 850, 550, 1040, 840, 540**, and **Forerunner 965** (including Solar variants where applicable).

Touchscreen Edge devices use the full-screen light-mode panel or active-mode cards in full-width fields. Edge 540/550 use active-mode cards with native settings menus. Forerunner 965 uses its full-screen watch card view. Split Edge fields display “Use full-width field”.

Card taps cycle configured light modes, then Off. The bottom control icon switches Smart/Network. Theme display options determine which details must fit.

## Icons

Current mode and control icons are documented with their source artwork in [button icons](Source/SmartBikeLights/assets/button-icons/README.md) and [control icons](Source/SmartBikeLights/assets/control-icons/README.md).

## Settings

- **Theme:** Choose Blue (default), Violet, or Mint for selected panel buttons, brightness bars, and the configuration switch
- **Record lights mode:** Whether to record connected lights modes that will be displayed in Garmin Connect
- **Lights Configuration:** The configuration value generated by the [Lights Configurator](https://simas1.github.io/SmartBikeLights/). Devices with more than 32KB memory have two additional configuration inputs, where the current active is determined by **Current configuration** setting
  Configuration strings must start with `SBL1#` and contain all fields written by this configurator. Earlier formats, omitted sections, and legacy group delimiters are rejected. Optional values such as serial numbers may be empty, but their field positions remain present. Create new configurations with the updated configurator and use them with the updated device app.
- **Invert lights:** Whether lights icons and their positions should be inverted
- **Current configuration:** Used to select which `Lights Configuration` to use (only for devices with more than 32KB memory)

## Currently registered ANT+ lights:

- Bontrager Ion Pro RT
- Bontrager Ion 200 RT
- Bontrager Ion 800 RT
- Bontrager Flare RT
- Bryton Gardia R300
- Coospo TR70
- Cycplus L7
- Garmin Varia TL300
- Garmin Varia RearVue 820
- Garmin Varia RTL500
- Garmin Varia RTL501
- Garmin Varia RTL510
- Garmin Varia RTL511
- Garmin Varia RTL515
- Garmin Varia RTL516
- Garmin Varia eRTL615
- Garmin Varia eRTL616
- Garmin Varia RCT715
- Garmin Varia RCT716
- Garmin Varia HL500
- Garmin Varia UT800
- Garmin Varia Vue
- Garmin Varia Vue Stvzo
- Giant Recon+ HL1400
- Giant Recon HL1800
- Giant Recon+ TL150
- Lezyne Radar Drive
- Lezyne Radar StVZO
- Lezyne React Drive
- Magene AT1200/1600
- Magene L508
- Trek CarBack
- Trek Commuter Pro RT
- Cycliq Fly12 CE (supported only by using Individual Light Network)
- Cycliq Fly6 CE (supported only by using Individual Light Network)
- Ravemen FR300 (supported only by using Individual Light Network)
- See.Sense ACE Front/Rear (supported only by using Individual Light Network)
- See.Sense BEAM/BEAM+ (supported only by using Individual Light Network)
- See.Sense ICON2 (supported only by using Individual Light Network)
- Wahoo TRACKR RADAR

**NOTE:** In case your ANT+ light is not on the list, please check the following garmin thread: https://forums.garmin.com/developer/connect-iq/f/showcase/248492/data-field-smart-bike-lights

## Individual Light Network

Individal Light Network is an alternative light network implementation for connecting and controlling ANT+ lights. In comparison to the Garmin built-in light network,
this network does not form a light network when two lights are connected, but instead it establish a separate connection for every light. This mode needs
to be used for lights that have issues with the built-in light network (See Sense and Cycliq lights).

**NOTE:** Lights in Garmin Sensors menu need to be disabled or removed in order to use this feature!

Known limitations:
- It requires to manually set the device numbers for the lights
- It will not turn off the lights when the device goes to sleep
- It uses one ANT channel per light

## Built-in app settings editor

In order to avoid using Garmin Express or Garmin Connect Mobile for changing app settings, a built-in editor was added that is able to edit the following settings:
- Invert lights
- Theme (Blue, Violet, Mint)
- Current configuration

### Edge touchscreen devices

The app settings editor can be opened only when the data field is set to a `1 Field layout`. Double-tap the configuration button at the bottom of the screen to open Settings. A single tap switches configurations after a brief delay; a double-tap leaves the configuration unchanged. If the light network is not formed or an error is displayed, tap once anywhere on the screen to open the editor.

<img src="/Images/TouchSettings.png?raw=true"> <img src="/Images/TouchSettingsColor.png?raw=true">

Because within a data field application it is not possible to swipe up/down, a bottom bar is added with up/down arrows to navigate through menu items in case they don't fit the screen.

### Other devices

For devices that support CIQ 3.2+ and have more than 32KB memory, the app setting editor can be reached by using the data field on-device settings view. To reach the app settings menu, hold the `Up` or `Back/Menu` button (depends on the device, `Up` for Forerunner 965) and the navigate to `ConnectIQ Fields` -> `Smart Bike Lights` -> `Settings`.

<img src="/Images/WatchSettings.png?raw=true">


## Control multiple lights of the same type

There are two ways to control more than one light of the same type (e.g. two headlights):

### Grouping them into one virtual light

In case there is more than one taillight or headlight paired, the data field will automatically group all headlights or taillights into one virtual light, which will forward commands (e.g. light mode changes) to all grouped lights. For the battery level, it will display the lowest battery level of the grouped lights. When pairing different headlights or taillights (e.g. Varia 515 and Flare RT), the virtual light will display only light modes that both lights support, based on the light mode number. For example when grouping Varia 515 and Flare RT, the following light modes will be available:
```
0 - Off
5 - Peloton for Varia 515 and Night Steady for Flare RT
7 - Day Flash
```
even if they both supports "Night Flash" mode, it will not be displayed, because Flare RT uses 63 and Varia 6 for the light mode number.

**NOTE:** This works only on high memory devices (more than 32KB of memory).

### Installing [Smart Bike Lights #2](https://apps.garmin.com/en-US/apps/2e27525f-3847-4e49-89af-673970692df6) data field

`Smart Bike Lights #2` data field is a copy of the original data field, which can be used along with the original one and configured separately. By using both data fields, it is possible to configure two lights of the same type (e.g. two headlights), one configured in the original data field and the other in the copy data field. When creating the configuration for the lights, it is required to set the `Serial number` input in [Lights Configurator](https://simas1.github.io/SmartBikeLights/), so that the data field will know which of the two lights to control.

## Remote Controllers

This data field can connect to one or more ANT+ light controllers. For connecting to an ANT+ light controller, the data field creates a virtual ANT+ light which has to be paired with the controller. After the virtual light is paired with the controller, the data field can perform various actions configured with the Lights Configurator. These are the currently supported actions:
- Cycle light modes
- Change light mode
- Change configuration
- Play tone

Due to how ANT+ light controllers work, the data field is required to open an ANT channel for every configured button on the remote controller. Before pairing the remote controller, make sure that there are enough free ANT channels left. Check the links below to determine how many simultaneous ANT channels (sensors) your Garmin device supports:
- [Outdoor watches](https://support.garmin.com/en-US/?faq=pb7Bxcm3x48cQpGy2LfR4A)
- [Edge devices](https://support.garmin.com/en-US/?faq=RpX8SeCLBd2K8sggJk4L56)

Currently supported remote controllers:
- Bontrager TransmitR MicroRemote (requires one ANT channel)
- Bontrager TransmitR Remote (requires four ANT channels to pair all five buttons. The center button does not require an ANT channel)

### How to pair

Check the following videos:
- [Bontrager TransmitR Remote](https://www.youtube.com/watch?v=dX2CbmVO_LQ)
- [Bontrager TransmitR MicroRemote](https://www.youtube.com/watch?v=D_vTVkWjrjI)

## Filters

- Sunrise
- Sunset
- Time of day
- Acceleration
- Speed
- Light battery state
- GPS accuracy
- Timer state
- Start location
- Position (only for devices with more that 32KB memory)
- Bike radar (only for devices with CIQ 3.0+. For devices with 32KB memory, the filter is available only when one light is paired)
- Profile name (only for devices with CIQ 3.2+ that support multiple profiles)
- Gradient (only for devices with more that 32KB memory that have a barometer)
- Solar intensity (only for solar devices with more than 32KB memory)

## Error codes

On high-memory devices, fields with enough space show the error code, affected
component, and a short explanation. A full-screen field also shows available
context and a suggested fix. For unsupported modes, context identifies the light,
mode, and panel button or filter group. Individual light channel failures include
the configured ANT device number; remote failures identify the controller/button.
If the text does not fit, the field falls back to a compact explanation or the
original `Error N` display. Low-memory devices retain the original display.

The following errors can be displayed:
- **Error 1:** A not supported light type is connected, only headlights and taillights are supported.
- **Error 2:** Two or more lights of the same type are connected on a low-memory device. High-memory devices can combine lights of the same type.
- **Error 3:** A light panel, light button, or filter uses a light mode that the connected light does not support.
- **Error 4:** Configuration value is invalid.
- **Error 5:** The device does not have enough free ANT channels to be used by the Individual Light Network. Try to disable some sensors from the Garmin Sensors menu.
- **Error 6:** One of the ANT channels used by the Individual Light Network could not be opened. Make sure that the lights are removed/disabled from the Garmin Sensors menu.
- **Error 7:** The light with the provided device number does not support the configured light type (headlight/taillight). Make sure that the "Device number" setting on the configured light is not of another light.
- **Error 8:** One of the ANT channels used for connection to a remote controller could not be opened. Try to disable some sensors from the Garmin Sensors menu.
- **Error 9:** The device does not have enough free ANT channels to be used for connection to the remote controllers. Try to disable some sensors from the Garmin Sensors menu.
- **Error 10:** `Connect Radar` option was enabled and the bike radar is not paired. Use the Garmin Sensors menu "Search All" option to pair the radar. The sensor name should be: `SBL RD <DEVICE_NUMBER>`
- **Error 11:** One of the ANT channels used for connection to the bike radar could not be opened. Try to disable some sensors from the Garmin Sensors menu.
- **Error 12:** The device does not have enough free ANT channels to be used for connection to the bike radar. Try to disable some sensors from the Garmin Sensors menu.

### Local Garmin simulator previews

Run `./Simulator/run-simulator.sh edge1040` or
`./Simulator/run-simulator.sh edge1050` for an isolated
fake-light preview (defaults: AT1600 and Flare RT). Device arguments also include
`edge850`, `edge550`, `edge840`, and `edge540`. Select light models using
`--lights at1600,varia-515,flare-rt` and saved JSON or Garmin `.SET` settings using
`--settings PATH`. See [simulator instructions](Simulator/README.md) for shared
files, device-specific profiles, and the complete workflow settings example.
