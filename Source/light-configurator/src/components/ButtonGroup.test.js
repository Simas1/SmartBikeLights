import React from 'react';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import ButtonGroup from './ButtonGroup';
import LightButton from '../models/LightButton';
import LightButtonGroup from '../models/LightButtonGroup';

jest.mock('nanoid', () => { let id = 0; return { nanoid: () => `test-${id++}` }; });
jest.mock('react-dnd', () => ({
  useDrag: () => [{ isDragging: false }, value => value],
  useDrop: () => [{ handlerId: 'test' }, value => value]
}));

test('choosing each mode icon updates the selection without repeating the button name', async () => {
  const button = new LightButton();
  button.setMode(1);
  button.setName('My mode');
  const group = new LightButtonGroup();
  group.buttons.push(button);
  render(<ButtonGroup buttonGroup={group} lightModes={[{id: 1, name: 'Low'}]} index={0}
    moveGroup={() => {}} addButton={() => {}} removeButton={() => {}} />);
  expect(screen.queryByLabelText('Light mode preview')).toBeNull();
  for (const [label, id] of [['Sun', 'sun'], ['Headlight High', 'headlight-high'], ['Taillight High', 'taillight-high'], ['Night', 'moon'], ['Flash', 'lightning']]) {
    fireEvent.mouseDown(screen.getByLabelText(/Mode icon/, {selector: '[role="button"]'}));
    fireEvent.click(within(screen.getByRole('listbox')).getByText(label));
    await waitFor(() => expect(screen.queryByRole('listbox', {hidden: true})).toBeNull());
    expect(button.icon).toBe(id);
    const selection = screen.getByLabelText(/Mode icon/, {selector: '[role="button"]'});
    expect(selection.querySelector('svg')).not.toBeNull();
    expect(selection).toHaveTextContent(label);
    expect(screen.queryByText('My mode')).toBeNull();
  }
  fireEvent.change(screen.getByLabelText(/Button name/), {target: {value: 'Renamed'}});
  expect(button.name).toBe('Renamed');
  expect(screen.queryByText('Renamed')).toBeNull();
  fireEvent.mouseDown(screen.getByLabelText(/Mode icon/, {selector: '[role="button"]'}));
  fireEvent.click(within(screen.getByRole('listbox')).getByText('None'));
  expect(button.icon).toBe('none');
  expect(screen.getByLabelText(/Mode icon/, {selector: '[role="button"]'}).querySelector('svg')).toBeNull();
});
