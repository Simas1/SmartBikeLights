import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { observer } from 'mobx-react-lite';
import Configuration from '../models/Configuration';
import LightPanelModel from '../models/LightPanel';
import LightPanel from './LightPanel';

jest.mock('nanoid', () => { let id = 0; return { nanoid: () => `footer-test-${id++}` }; });
jest.mock('react-dnd', () => ({ useDrag: () => [{}, value => value], useDrop: () => [{}, value => value] }));

test('footer checkbox defaults on and stays synchronized across both light panels', () => {
  const configuration = new Configuration();
  const panels = [new LightPanelModel(), new LightPanelModel()];
  const Editor = observer(() => <>{panels.map((panel, i) =>
    <LightPanel key={i} lightPanel={panel} lightModes={[]} showFooter={configuration.showFooter} setShowFooter={configuration.setShowFooter} />
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
