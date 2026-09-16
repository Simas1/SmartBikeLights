import { parseButtonGraphics, serializeButtonGraphics } from './lightButtonGraphics';

test('imports legacy labels with spaces and fractional runtime', () => {
  expect(parseButtonGraphics('Night Steady  \\n 5lm-13.5h')).toEqual({
    name: 'Night Steady', lumens: 5, runtimeHours: 13.5, icon: 'none'
  });
});

test('explicit icons survive a round trip and a mode rename', () => {
  const button = { name: 'My mode', lumens: 200, runtimeHours: 12, icon: 'lightning' };
  expect(parseButtonGraphics(serializeButtonGraphics(button))).toEqual(button);
  button.name = 'Night Steady';
  expect(parseButtonGraphics(serializeButtonGraphics(button)).icon).toBe('lightning');
});

test('does not infer icons from names or discard malformed ratings', () => {
  for (const name of ['Night Flash', 'Low\\n200lm-xh', 'Low\\n0lm-12h', 'Low\\n200lm-0h']) {
    expect(parseButtonGraphics(name)).toEqual({ name, lumens: null, runtimeHours: null, icon: 'none' });
  }
});

test('supports no ratings, explicit icons without ratings, and empty labels', () => {
  expect(serializeButtonGraphics({ name: 'Low', icon: 'none' })).toBe('Low');
  expect(parseButtonGraphics('Low\\n@sun')).toEqual({ name: 'Low', lumens: null, runtimeHours: null, icon: 'sun' });
  expect(parseButtonGraphics(null).name).toBeNull();
  expect(parseButtonGraphics('@sun').name).toBe('');
});
