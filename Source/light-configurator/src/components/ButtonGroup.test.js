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

test('choosing each mode icon updates its label preview and None removes it', async () => {
  const button = new LightButton();
  button.setMode(1);
  button.setName('My mode');
  const group = new LightButtonGroup();
  group.buttons.push(button);
  render(<ButtonGroup buttonGroup={group} lightModes={[{id: 1, name: 'Low'}]} index={0}
    moveGroup={() => {}} addButton={() => {}} removeButton={() => {}} />);
  const preview = screen.getByLabelText('Light mode preview');
  for (const [label, id] of [['Headlight', 'headlight'], ['Taillight', 'taillight'], ['Night', 'moon'], ['Flash', 'lightning']]) {
    fireEvent.mouseDown(screen.getByLabelText(/Mode icon/, {selector: '[role="button"]'}));
    fireEvent.click(within(screen.getByRole('listbox')).getByText(label));
    await waitFor(() => expect(screen.queryByRole('listbox', {hidden: true})).toBeNull());
    expect(button.icon).toBe(id);
    expect(preview.querySelector('svg')).not.toBeNull();
    expect(preview).toHaveTextContent('My mode');
  }
  fireEvent.change(screen.getByLabelText(/Button name/), {target: {value: 'Renamed'}});
  expect(preview).toHaveTextContent('Renamed');
  fireEvent.mouseDown(screen.getByLabelText(/Mode icon/, {selector: '[role="button"]'}));
  fireEvent.click(within(screen.getByRole('listbox')).getByText('None'));
  expect(button.icon).toBe('none');
  expect(preview.querySelector('svg')).toBeNull();
});
