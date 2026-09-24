import React, { useEffect, useCallback } from 'react';
import Grid from '@mui/material/Grid';
import { action } from 'mobx';
import { observer } from 'mobx-react-lite';
import LightButtonGroup from '../models/LightButtonGroup';
import LightButton from '../models/LightButton';
import ButtonGroup from './ButtonGroup';
import AddButton from './AddButton';
import { manualModeBehaviorList } from '../constants';
import AppTextInput from '../inputs/AppTextInput';
import AppSelect from '../inputs/AppSelect';

const getModes = (lightModes) => {
  return lightModes.filter(mode => mode.id > 0);
};

export default observer(({ lightPanel, lightModes, lightModeFilter }) => {
  const modes = getModes(lightModes);
  const panelModeIds = [...new Set(lightPanel.buttonGroups.flatMap(group =>
    group.buttons.map(button => button.mode)))];
  const filterModes = panelModeIds.map(id => modes.find(mode => mode.id === id)).filter(Boolean);
  const selectedModes = lightModeFilter?.lightModes;
  useEffect(() => {
    if (selectedModes) {
      const validModes = selectedModes.filter(id => filterModes.some(mode => mode.id === id));
      if (validModes.length !== selectedModes.length) lightModeFilter.setLightModes(validModes);
    }
  }, [filterModes, selectedModes, lightModeFilter]);
  const addButtonGroup = action(() => {
    const group = new LightButtonGroup();
    group.buttons.push(new LightButton());
    lightPanel.buttonGroups.push(group);
  });
  const moveGroup = action(useCallback((dragIndex, hoverIndex) => {
      const dragGroup = lightPanel.buttonGroups[dragIndex]
      lightPanel.buttonGroups.splice(dragIndex, 1);
      lightPanel.buttonGroups.splice(hoverIndex, 0, dragGroup);
    },
    [lightPanel.buttonGroups],
  ));
  const addButton = action((group) => {
    group.buttons.push(new LightButton());
  });
  const removeButton = action((group) => {
    group.buttons.remove(group.buttons[group.buttons.length - 1]);
    if (!group.buttons.length) {
      lightPanel.buttonGroups.remove(group);
    }
  });

  return (
    <div>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={4}>
          <AppTextInput label="Short light name" setter={lightPanel.setLightName} value={lightPanel.lightName} />
        </Grid>
        {lightModeFilter && <>
          <Grid item xs={12} />
          <Grid item xs={12} sm={4}>
            <AppSelect required items={manualModeBehaviorList} label="Filter Light Mode"
              setter={lightModeFilter.setManualModeBehavior} value={lightModeFilter.manualModeBehavior}
              help="Choose which configured light-mode buttons appear full-screen and are included when tapping the field card to cycle modes. Hidden modes remain available to Filter Groups, so automation can use them without adding them to manual cycling. Button order is preserved, and Off always follows the last mode. Control mode and Off remain visible."
            />
          </Grid>
          {lightModeFilter.manualModeBehavior === 1 && <Grid item xs={12} sm={4}>
            <AppSelect required items={filterModes} label="Light modes" multiple
              setter={lightModeFilter.setLightModes} value={lightModeFilter.lightModes} />
          </Grid>}
        </>}
      </Grid>
      <div>
        {lightPanel.buttonGroups.map((group, index) => (
          <ButtonGroup
            key={group.id}
            buttonGroup={group}
            lightModes={modes}
            index={index}
            moveGroup={moveGroup}
            addButton={addButton}
            removeButton={removeButton}
          />
        ))}
      </div>
      <AddButton onClick={() => addButtonGroup()}>
        Add Button Group
      </AddButton>
    </div>
  );
});
