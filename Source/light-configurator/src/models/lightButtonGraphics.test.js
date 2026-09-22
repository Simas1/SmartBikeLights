import { parseButtonGraphics, serializeButtonGraphics } from './lightButtonGraphics';

test('imports labels with spaces and fractional runtime', () => {
  expect(parseButtonGraphics('Night Steady  ~n 5lm-13.5h')).toEqual({
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
  for (const name of ['Night Flash', 'Low~n200lm-xh', 'Low~n0lm-12h', 'Low~n200lm-0h']) {
    expect(parseButtonGraphics(name)).toEqual({ name, lumens: null, runtimeHours: null, icon: 'none' });
  }
});

test('supports no ratings, explicit icons without ratings, and empty labels', () => {
  expect(serializeButtonGraphics({ name: 'Low', icon: 'none' })).toBe('Low');
  expect(parseButtonGraphics('Low~n@sun')).toEqual({ name: 'Low', lumens: null, runtimeHours: null, icon: 'sun' });
  expect(parseButtonGraphics(null).name).toBeNull();
  expect(parseButtonGraphics('@sun').name).toBe('');
});

test.each(['headlight', 'taillight', 'moon', 'lightning', 'headlight-high', 'headlight-medium', 'headlight-low', 'taillight-high', 'taillight-medium', 'taillight-low'])('round-trips %s with and without ratings', icon => {
  for (const ratings of [{ lumens: null, runtimeHours: null }, { lumens: 100, runtimeHours: 2.5 }]) {
    const button = { name: 'Custom mode', icon, ...ratings };
    expect(parseButtonGraphics(serializeButtonGraphics(button))).toEqual(button);
    button.name = 'Renamed';
    expect(parseButtonGraphics(serializeButtonGraphics(button))).toEqual(button);
  }
});

test('uses printable separators without interpreting legacy markers', () => {
  const safe = 'Low~n200lm-12h~n@headlight-low';
  expect(serializeButtonGraphics(parseButtonGraphics(safe))).toBe(safe);
  const old = String.raw`Low\n200lm-12h\n@headlight-low`;
  expect(parseButtonGraphics(old)).toEqual({ name: old, lumens: null, runtimeHours: null, icon: 'none' });
});


test('preserves name line breaks separately from graphics metadata', () => {
  const button = { name: 'Night~brFlash', lumens: 5, runtimeHours: 15, icon: 'lightning' };
  const encoded = 'Night~brFlash~n5lm-15h~n@lightning';
  expect(serializeButtonGraphics(button)).toBe(encoded);
  expect(parseButtonGraphics(encoded)).toEqual(button);
});


test('exports name newlines as safe break markers', () => {
  for (const name of [String.raw`Night\nFlash`, 'Night\nFlash', 'Night~brFlash']) {
    expect(serializeButtonGraphics({ name })).toBe('Night~brFlash');
  }
});
