import { render, screen } from '@testing-library/react';

// Use the local widget variant so this smoke test needs no Firebase credentials.
const originalAppType = process.env.REACT_APP_TYPE;
const originalAppTitle = process.env.REACT_APP_TITLE;
let App;

beforeAll(() => {
  process.env.REACT_APP_TYPE = 'widget';
  process.env.REACT_APP_TITLE = 'Bike Lights Control';
  App = require('./App').default;
});

afterAll(() => {
  if (originalAppType === undefined) delete process.env.REACT_APP_TYPE;
  else process.env.REACT_APP_TYPE = originalAppType;
  if (originalAppTitle === undefined) delete process.env.REACT_APP_TITLE;
  else process.env.REACT_APP_TITLE = originalAppTitle;
});

test('renders the configurator and loads the device selector', async () => {
  render(<App />);
  expect(screen.getByText(/Lights Configurator/)).toHaveTextContent('Bike Lights Control');
  expect(await screen.findByLabelText(/Garmin device/, {}, { timeout: 10000 })).toBeInTheDocument();
}, 15000);
