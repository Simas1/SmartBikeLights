import React, { useEffect } from 'react';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import PanToolIcon from '@mui/icons-material/PanTool';
import WifiIcon from '@mui/icons-material/Wifi';
import { observer } from 'mobx-react-lite';
import { controlModeList, manualModeBehaviorList } from '../constants';
import AppSelect from '../inputs/AppSelect';

const controlModeIcons = { 0: AutoAwesomeIcon, 1: WifiIcon, 2: PanToolIcon };
const renderControlMode = (item) => {
  const Icon = controlModeIcons[item.id];
  return <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
    <Icon fontSize="small" />{item.name}
  </Box>;
};

export default observer(({ lightIconTapBehavior, lightModes, controlButton = false }) => {
  useEffect(() => {
    if (controlButton && !lightIconTapBehavior.containsManualMode()) {
      lightIconTapBehavior.setControlModes(lightIconTapBehavior.controlModes, true);
    }
    if (lightIconTapBehavior.lightModes) {
      lightIconTapBehavior.setLightModes(lightIconTapBehavior.lightModes.filter(m => lightModes.find(lm => lm.id === m) !== undefined));
    }
  }, [lightIconTapBehavior, lightModes, controlButton]);

  return (
    <div>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={controlButton ? 12 : 4}>
          <AppSelect required={controlButton} items={controlButton ? controlModeList.map(item => ({ ...item, disabled: item.id === 2 })) : controlModeList} label="Control modes" itemTemplateFunc={renderControlMode} selectedItemTemplateFunc={renderControlMode} setter={value => lightIconTapBehavior.setControlModes(value, controlButton)} value={lightIconTapBehavior.controlModes} multiple={true} />
        </Grid>
        {
          !controlButton && lightIconTapBehavior.containsManualMode()
          ?
          <Grid item xs={12} sm={4}>
            <AppSelect required items={manualModeBehaviorList} label="Manual mode behavior" setter={lightIconTapBehavior.setManualModeBehavior} value={lightIconTapBehavior.manualModeBehavior} />
          </Grid>
          : null
        }
        {
          !controlButton && lightIconTapBehavior.containsManualMode() && lightIconTapBehavior.manualModeBehavior === 1
          ?
          <Grid item xs={12} sm={4}>
            <AppSelect required items={lightModes} label="Light modes" setter={lightIconTapBehavior.setLightModes} value={lightIconTapBehavior.lightModes} multiple={true} />
          </Grid>
          : null
        }
      </Grid>
    </div>
  );
});
