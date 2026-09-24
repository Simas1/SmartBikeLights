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
  const panelButtons = lightPanel.buttonGroups.flatMap(group => group.buttons);
  const filterModes = panelButtons
    .filter((button, index) => modes.some(mode => mode.id === button.mode) &&
      panelButtons.findIndex(other => other.mode === button.mode) === index)
    .map(button => ({ id: button.mode, name: button.name || 'Unnamed button' }));
  const previousModes = React.useRef({ panel: lightPanel, ids: filterModes.map(mode => mode.id) });
  const selectedModes = lightModeFilter?.lightModes;
  useEffect(() => {
    const ids = filterModes.map(mode => mode.id);
    if (lightModeFilter?.manualModeBehavior === 1) {
      const added = previousModes.current.panel === lightPanel
        ? ids.filter(id => !previousModes.current.ids.includes(id)) : [];
      const validModes = (selectedModes || []).filter(id => ids.includes(id));
      const nextModes = [...validModes, ...added.filter(id => !validModes.includes(id))];
      if (nextModes.length !== (selectedModes || []).length ||
          nextModes.some((id, index) => id !== selectedModes[index])) {
        lightModeFilter.setLightModes(nextModes);
      }
    }
    previousModes.current = { panel: lightPanel, ids };
  }, [filterModes, selectedModes, lightModeFilter, lightPanel]);
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
            panelButtons={panelButtons}
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
