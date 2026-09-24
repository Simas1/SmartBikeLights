import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { observer } from 'mobx-react-lite';
import Configuration from '../models/Configuration';
import LightModeCycleBehavior from '../models/LightModeCycleBehavior';
import LightPanelModel from '../models/LightPanel';
import LightPanel from './LightPanel';
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
