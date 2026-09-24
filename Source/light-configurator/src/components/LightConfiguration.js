import React, { useEffect } from 'react';
import { styled } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Grid from '@mui/material/Grid';
import { observer } from 'mobx-react-lite';
import FilterGroups from './FilterGroups';
import AppSelect from '../inputs/AppSelect';
import AppTextInput from '../inputs/AppTextInput';
import AppCheckbox from '../inputs/AppCheckbox';
import ElementWithHelp from './ElementWithHelp';
import LightPanel from './LightPanel';
import LightFooter from './LightFooter';
import { groupNameVisibility } from '../constants';
import LightIconTapBehavior from './LightIconTapBehavior';
import LightSettings from './LightSettings';
import LightPanelModel from '../models/LightPanel';
import LightSettingsModel from '../models/LightSettings';
import LightModeCycleBehavior from '../models/LightModeCycleBehavior';

const PREFIX = 'LightConfiguration';

const classes = {
  sectionTitle: `${PREFIX}-sectionTitle`
};

const StyledCard = styled(Card)(({ theme }) => ({
  [`& .${classes.sectionTitle}`]: {
    marginTop: theme.spacing(3),
    marginBottom: theme.spacing(1),
  }
}));

const getLightData = (value, lights) => {
  return value !== null ? lights.find(l => l.id === value) : null;
};

const getDefaultPanel = (value, lights) => {
  return value !== null ? lights.find(l => l.id === value)?.defaultLightPanel : null;
};

export default observer(({
  showFooter, setShowFooter, device, totalLights, useIndividualNetwork, globalFilterGroups, lightType, lightList, lightFilterGroups, setLight, light,
  setLightModes, setAdditionalLightModes, setDefaultMode, defaultMode, lightPanel, setLightPanel, lightSettings, setLightSettings, deviceNumber, setDeviceNumber,
  serialNumber, setSerialNumber, forceSmartMode, setForceSmartMode, lightIconTapBehavior, setLightIconTapBehavior,
  bikeRadarNumber, setBikeRadarNumber, createBikeRadarConnection, setCreateBikeRadarConnection }) => {
  const [lightData, setLightData] = React.useState(getLightData(light, lightList));
  const setValue = (value) => {
    setLight(value);
    const data = getLightData(value, lightList);
    setLightModes(data !== null ? data.lightModes : null);
    setAdditionalLightModes(data !== null ? data.additionalLightModes : null);
  };
  var hasFilters = !!setDefaultMode;

  useEffect(() => {
    setLightData(getLightData(light, lightList));
    if (light == null) {
      setLightPanel(null);
    } else if (lightPanel == null) {
      setLightPanel(new LightPanelModel(getDefaultPanel(light, lightList)));
    }
  }, [light, lightList, setLightPanel, lightPanel]);

  useEffect(() => {
    if (lightIconTapBehavior == null && setLightIconTapBehavior != null) {
      setLightIconTapBehavior(new LightModeCycleBehavior());
    }
  }, [lightIconTapBehavior, setLightIconTapBehavior]);

  useEffect(() => {
    if (light == null) {
      setLightSettings(null);
    } else if (lightSettings == null) {
      setLightSettings(new LightSettingsModel(getDefaultPanel(light, lightList)));
    }
  }, [light, lightList, lightSettings, setLightSettings]);

  return (
    <StyledCard>
      <CardHeader
        title={lightType + ' Configuration'}
        titleTypographyProps={{ align: 'center' }}
      />
      <CardContent>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={4}>
            <AppSelect items={lightList} label={lightType} setter={setValue} value={light} />
          </Grid>
          {
            lightData && hasFilters
            ?
            <Grid item xs={12} sm={4}>
              <AppSelect
                  required={globalFilterGroups.length || lightFilterGroups.length ? true : false}
                  items={lightData.modes}
                  label="Default mode"
                  setter={setDefaultMode}
                  value={defaultMode}
                  help={
                    <React.Fragment>
                      <Typography>
                        The default mode is used only by the Smart control mode as a fallback light mode, when none of the below smart rules
                        is matched.
                      </Typography>
                    </React.Fragment>
                  }
                />
            </Grid>
            : null
          }
          {
            !light
            ? null
            : useIndividualNetwork && device?.highMemory
            ?
            <Grid item xs={12} sm={4}>
              <AppTextInput label="Device number"
                setter={setDeviceNumber}
                required={(device == null || !device.nativePairing)}
                value={deviceNumber}
                type="number"
                help={
                  <React.Fragment>
                    <Typography>
                      The light device number is a unique number that is required by the Individual Light Network.
                      If your device is a System 8 device, you can pair the lights using the native Sensor menu and leave this field empty.
                      For non-System 8 devices, you can obtain the device number by following these steps:
                    </Typography>
                    <ol>
                      <li><Typography>Put the ANT+ light near the Garmin device</Typography></li>
                      <li><Typography>Open the Garmin menu and go to Sensors -&gt; Add Sensor -&gt; Light</Typography></li>
                      <li><Typography>The light with its device number (ID) should be displayed on the list</Typography></li>
                    </ol>
                    <img src="./DeviceNumber.png" alt="Example" />
                  </React.Fragment>
                }
              />
            </Grid>
            :
            <Grid item xs={12} sm={4}>
              <AppTextInput label="Serial number" type="number"
                setter={setSerialNumber}
                value={serialNumber}
                help={
                  <React.Fragment>
                    <Typography>
                      The light serial number which required only when multiple lights of the same type are paired (e.g. two headlights). To obtain the serial number:
                    </Typography>
                    <ol>
                      <li><Typography>Open the Garmin menu and go to Sensors -&gt; Lights</Typography></li>
                      <li><Typography>Select the desired light from the list and open About</Typography></li>
                      <li><Typography>The serial should be displayed with the label <b>Serial #</b></Typography></li>
                    </ol>
                  </React.Fragment>
                }
              />
            </Grid>
          }
          {
            setBikeRadarNumber && lightData && lightData.allowRadarSensor && device && device.highMemory && device.nativePairing !== true
              ?
            <Grid item xs={12} sm={4}>
              <AppTextInput label="Radar device number"
                type="number"
                setter={setBikeRadarNumber}
                required={false}
                value={bikeRadarNumber}
                help={
                  <Typography>
                    If the light is paired via Bluetooth and the radar filter is enabled, the radar device number must be configured.
                  </Typography>
                }
              />
            </Grid>
            : null
          }
          {
            setCreateBikeRadarConnection && lightData && lightData.allowRadarSensor && device && device.highMemory && device.nativePairing === true
              ?
              <Grid item xs={12} sm={4}>
                <ElementWithHelp
                  element={
                    <AppCheckbox label="Connect Radar" value={createBikeRadarConnection} setter={setCreateBikeRadarConnection} />
                  }
                  help={
                    <Typography>
                      If the light is paired via Bluetooth and the radar filter is enabled, this option must be enabled for the radar filter to work.
                      When enabled, the radar must be paired in the Garmin Sensors menu. After pairing, an ANT connection will be created for the radar 
                      to receive vehicle data.
                    </Typography>
                  }
                />
              </Grid>
              : null
          }
          {
            setForceSmartMode && light && device?.highMemory
              ?
              <Grid item xs={12} sm={4}>
                <ElementWithHelp
                  element={
                    <AppCheckbox label="Force Smart mode" value={forceSmartMode} setter={setForceSmartMode} />
                  }
                  help={
                    <Typography>
                      Force Smart mode will prevent external light mode changes (e.g. pressing the button on the light) to switch from Smart
                      to Manual control mode. This setting works only when the light is in Smart control mode.
                    </Typography>
                  }
                />
              </Grid>
              : null
          }
        </Grid>
        {
          lightData && hasFilters
          ? <React.Fragment>
              <ElementWithHelp
                sx={{marginBottom: 1, marginTop: 1}}
                element={<Typography variant="h5">Smart rules</Typography>}
                help={
                  <Typography>
                    Smart rules contain sets of conditions, which are used by the Smart control mode to determine the light mode. Each smart rule defines
                    a light mode, which will be used when every condition in the rule is matched. The order of smart rules is important
                    as in case multiple smart rules are matched, only the light mode of the topmost matching rule will be used.
                  </Typography>
                }
              />
              <FilterGroups filterGroups={lightFilterGroups} lightData={lightData} device={device} totalLights={totalLights} />
          </React.Fragment>
          : null
        }
        {
          lightData && lightIconTapBehavior && device?.highMemory
          ? <React.Fragment>
              <ElementWithHelp
                className={classes.sectionTitle}
                element={<Typography variant="h5">Header</Typography>}
                help={
                  <Typography>
                    Choose the control modes the button cycles through. Manual is always included. Smart is used only when this light has smart rules. Selecting any light-mode button enters Manual.
                  </Typography>
                }
              />
              {lightPanel && device?.touchScreen && <Grid container spacing={3} sx={{ marginBottom: 3 }}>
                <Grid item xs={12}>
                  <AppSelect required items={groupNameVisibility} label="Header visibility"
                    help="Show the active smart rule or Network mode above the light buttons."
                    setter={lightPanel.setGroupNameVisibility} value={lightPanel.groupNameVisibility} />
                </Grid>
              </Grid>}
              <LightIconTapBehavior controlButton lightIconTapBehavior={lightIconTapBehavior} lightModes={lightData.modes} />
          </React.Fragment>
          : null
        }
        {
          lightData && lightPanel && device?.touchScreen
          ? <React.Fragment>
              <ElementWithHelp
                className={classes.sectionTitle}
                element={<Typography variant="h5">Light panel</Typography>}
                help={
                  <Typography>
                    Fullscreen (1 Field Layout) shows your configured light-mode buttons. Rename, reorder, group, or remove buttons and choose their icons, brightness, and runtime details here.
                    In Field view, the card shows the active light mode; tapping it cycles through the configured modes in button order, followed by Off, and enters Manual.
                    Filter Light Mode limits the buttons shown full-screen and the modes included in field cycling, while Smart rules can still use hidden modes. The short light name appears in the footer when enabled.
                  </Typography>
                }
              />
            <LightPanel lightPanel={lightPanel} lightModes={lightData.modes} lightModeFilter={lightIconTapBehavior} />
          </React.Fragment>
          : null
        }
        {
          lightData && lightSettings && device?.settings
          ? <React.Fragment>
              <ElementWithHelp
                className={classes.sectionTitle}
                element={<Typography variant="h5">Light settings</Typography>}
                help={
                  <Typography>
                    The Light settings will be displayed when opening the data field settings on your device. Here you can modify how the menu for light
                    modes will be displayed by renaming items, order them in a different way, remove those that won't be used and change the short light name
                    that will be displayed in the menu.
                  </Typography>
                }
              />

            <LightSettings lightSettings={lightSettings} lightModes={lightData.modes} />
          </React.Fragment>
          : null
        }
        {lightData && lightPanel && device?.touchScreen &&
          <LightFooter className={classes.sectionTitle} showFooter={showFooter} setShowFooter={setShowFooter} />}
      </CardContent>
    </StyledCard>
  );
});
