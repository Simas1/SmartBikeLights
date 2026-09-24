import React from 'react';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { observer } from 'mobx-react-lite';
import Configuration from '../models/Configuration';
import LightModeCycleBehavior from '../models/LightModeCycleBehavior';
import LightPanelModel from '../models/LightPanel';
import LightPanel from './LightPanel';
import LightButton from '../models/LightButton';
import LightButtonGroup from '../models/LightButtonGroup';
import { runInAction } from 'mobx';
import LightFooter from './LightFooter';

jest.mock('nanoid', () => { let id = 0; return { nanoid: () => `footer-test-${id++}` }; });
jest.mock('react-dnd', () => ({ useDrag: () => [{}, value => value], useDrop: () => [{}, value => value] }));

test('footer checkbox defaults on and stays synchronized across both light panels', () => {
  const configuration = new Configuration();
  const panels = [new LightPanelModel(), new LightPanelModel()];
  const Editor = observer(() => <>{panels.map((panel, i) =>
    <LightFooter key={i} showFooter={configuration.showFooter} setShowFooter={configuration.setShowFooter} />
  )}</>);
  render(<Editor />);
  const controls = screen.getAllByRole('checkbox', {name: 'Show Footer'});
  expect(controls.every(control => control.checked)).toBe(true);
  fireEvent.click(controls[0]);
  expect(configuration.showFooter).toBe(false);
  expect(controls.every(control => !control.checked)).toBe(true);
  fireEvent.click(controls[1]);
  expect(controls.every(control => control.checked)).toBe(true);
  expect(screen.queryByText(/Bold Blue uses icons/)).toBeNull();
});

test('specific mode selector appears beside Filter Light Mode and saves the choice', () => {
  const configuration = new Configuration();
  configuration.setHeadlight(14);
  const panel = new LightPanelModel();
  const filter = new LightModeCycleBehavior();
  const Editor = observer(() => <LightPanel lightPanel={panel} lightModes={[{id: 51, name: 'Low'}, {id: 53, name: 'High'}]}
    lightModeFilter={filter} showFooter={configuration.showFooter} setShowFooter={configuration.setShowFooter} />);
  render(<Editor />);
  expect(screen.queryByLabelText(/^Light modes/)).toBeNull();
  fireEvent.mouseDown(screen.getByLabelText(/Filter Light Mode/, {selector: '[role="button"]'}));
  fireEvent.click(screen.getByText('Specific light modes'));
  expect(screen.getByLabelText(/^Light modes/, {selector: '[role="button"]'})).toBeTruthy();
});

test('filter choices follow unique panel modes and remove stale selections when buttons change', () => {
  const panel = new LightPanelModel();
  const group = new LightButtonGroup();
  const buttons = [51, 53, 51].map(mode => {
    const button = new LightButton();
    button.setMode(mode);
    button.setName(mode === 51 ? "Low button" : "High button");
    return button;
  });
  runInAction(() => {
    group.buttons.push(...buttons);
    panel.buttonGroups.push(group);
  });
  const filter = new LightModeCycleBehavior();
  filter.setManualModeBehavior(1);
  filter.setLightModes([51, 53, 54]);
  render(<LightPanel lightPanel={panel}
    lightModes={[{id: 54, name: 'Unused'}, {id: 53, name: 'High'}, {id: 51, name: 'Low'}]}
    lightModeFilter={filter} />);
  const openChoices = () => {
    fireEvent.mouseDown(screen.getByLabelText(/^Light modes/, {selector: '[role="button"]'}));
    return within(screen.getByRole('listbox')).getAllByRole('option').map(option => option.textContent);
  };
  expect(openChoices()).toEqual(['Low button', 'High button']);
  expect(filter.lightModes.slice()).toEqual([51, 53]);
  fireEvent.keyDown(screen.getByRole('listbox'), {key: 'Escape'});
  act(() => buttons[1].setMode(54));
  expect(filter.lightModes.slice()).toEqual([51, 54]);
  expect(openChoices()).toEqual(['Low button', 'High button']);
  fireEvent.keyDown(screen.getByRole('listbox'), {key: 'Escape'});
  act(() => buttons[1].setName('Renamed button'));
  expect(openChoices()).toEqual(['Low button', 'Renamed button']);
  fireEvent.keyDown(screen.getByRole('listbox'), {key: 'Escape'});
  const added = new LightButton();
  added.setMode(53);
  added.setName('Added button');
  act(() => runInAction(() => group.buttons.push(added)));
  expect(openChoices()).toEqual(['Low button', 'Renamed button', 'Added button']);
  expect(filter.lightModes.slice()).toEqual([51, 54, 53]);
  fireEvent.keyDown(screen.getByRole('listbox'), {key: 'Escape'});
  act(() => runInAction(() => panel.buttonGroups.clear()));
  expect(filter.lightModes.slice()).toEqual([]);
});

test('panel buttons cannot choose a mode already used by another button', () => {
  const panel = new LightPanelModel();
  const group = new LightButtonGroup();
  const first = new LightButton();
  first.setMode(51);
  first.setName('Low');
  const second = new LightButton();
  runInAction(() => {
    group.buttons.push(first, second);
    panel.buttonGroups.push(group);
  });
  render(<LightPanel lightPanel={panel} lightModes={[{id: 51, name: 'Preset 1'}, {id: 52, name: 'Preset 2'}]} />);
  fireEvent.mouseDown(screen.getAllByLabelText(/^Light mode\s*\*/, {selector: '[role="button"]'})[1]);
  expect(within(screen.getByRole('listbox')).queryByRole('option', {name: 'Preset 1'})).toBeNull();
  expect(within(screen.getByRole('listbox')).getByRole('option', {name: 'Preset 2'})).toBeTruthy();
});
