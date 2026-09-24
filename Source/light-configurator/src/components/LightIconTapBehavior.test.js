import React from 'react';
import { render, screen, fireEvent, within, act } from '@testing-library/react';
import LightIconTapBehavior from './LightIconTapBehavior';
import LightModeCycleBehavior from '../models/LightModeCycleBehavior';

jest.mock('nanoid', () => { let id = 0; return { nanoid: () => `cycle-${id++}` }; });

test('Manual is mandatory while Smart and Network can be removed', () => {
  const behavior = new LightModeCycleBehavior();
  render(<LightIconTapBehavior controlButton lightIconTapBehavior={behavior} lightModes={[]} />);
  expect(screen.queryByLabelText(/Manual mode behavior/)).toBeNull();
  fireEvent.mouseDown(screen.getByLabelText(/Control modes/, { selector: '[role="button"]' }));
  const list = within(screen.getByRole('listbox'));
  expect(list.getByRole('option', { name: 'Manual' })).toHaveAttribute('aria-disabled', 'true');
  fireEvent.click(list.getByRole('option', { name: 'Manual' }));
  expect(behavior.controlModes).toContain(2);
  fireEvent.click(list.getByRole('option', { name: 'Smart' }));
  fireEvent.click(list.getByRole('option', { name: 'Network' }));
  expect(behavior.controlModes).toEqual([2]);
  act(() => behavior.setControlModes(null, true));
  expect(behavior.controlModes).toEqual([2]);
});

test('remote cycle actions still allow selecting modes without Manual', () => {
  const behavior = new LightModeCycleBehavior();
  behavior.setControlModes([0]);
  expect(behavior.controlModes).toEqual([0]);
});
