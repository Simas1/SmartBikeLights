import Configuration from './Configuration';
import { deviceList } from '../dataFieldConstants';
import exampleSettings from '../../../../Simulator/settings.example.json';

const originalAppType = process.env.REACT_APP_TYPE;
beforeAll(() => { process.env.REACT_APP_TYPE = 'datafield'; });
afterAll(() => {
  if (originalAppType === undefined) delete process.env.REACT_APP_TYPE;
  else process.env.REACT_APP_TYPE = originalAppType;
});

const sample = exampleSettings.LC;
const remoteSample = "SBL1#1,1!NIGHT:1Es1800,r0###0,73404416::#2,2!BREAK:1:7:1:0A[-30!:1:6:0:0D=1##5,4:Varia 510:0:16777215:-1!2,:-1,Off:0!1,Steady Beam:4!1,Day Flash:7!1,Night Flash:6#0::#0:0#123!:123!#1|1:MicroRemote!1|1:3167:0!2|1:1::123!:123!!|2:1::,0=:!H]0#4321#B3843##2#0#0";

test.each(deviceList)('round trips the separator-free format for $name', (device) => {
  const configuration = Configuration.parse(sample, deviceList);
  expect(configuration).not.toBeNull();
  configuration.setDevice(device.id);
  configuration.bikeRadarNumber = 4321;
  const exported = configuration.getConfigurationValue(deviceList);
  const fields = exported.slice(5).split('#');
  // Remote count and radar directly follow the control-mode cycle on every device.
  const remoteIndex = 10;
  expect(fields[remoteIndex]).toBe('0');
  expect(fields[remoteIndex + 1]).toBe('');
  expect(fields[remoteIndex + 2]).toBe(device.id);
  const restored = Configuration.parse(exported, deviceList);
  expect(restored).not.toBeNull();
  expect(restored.remoteControllers).toHaveLength(0);
  expect(restored.bikeRadarNumber).toBeNull();
  expect(restored.getConfigurationValue(deviceList)).toBe(exported);
});

test('reads remote controllers and radar without a separator slot', () => {
  const configuration = Configuration.parse(remoteSample, deviceList);
  expect(configuration).not.toBeNull();
  expect(configuration.remoteControllers).toHaveLength(1);
  expect(configuration.bikeRadarNumber).toBe(4321);
  const exported = configuration.getConfigurationValue(deviceList);
  expect(exported.slice(5).split('#')[10]).toMatch(/^1\|1:MicroRemote!/);
  const restored = Configuration.parse(exported, deviceList);
  expect(restored.remoteControllers).toHaveLength(1);
  expect(restored.bikeRadarNumber).toBeNull();
});

test('round trips automatic radar connection in the new format', () => {
  const configuration = new Configuration();
  configuration.setDevice('B3843');
  configuration.setTaillight(24);
  configuration.createBikeRadarConnection = true;
  const exported = configuration.getConfigurationValue(deviceList);
  expect(exported.slice(5).split('#').slice(10, 13)).toEqual(['0', '0', 'B3843']);
  const restored = Configuration.parse(exported, deviceList);
  expect(restored).not.toBeNull();
  expect(restored.createBikeRadarConnection).toBe(true);
});

const obsoleteFormats = [
  "1,1!NIGHT:1Es1800,r0###0,73404416::#1,1!:1:6:0:0D=1##5,4:Varia 510:0:16777215:-1!2,:-1,Off:0!1,Solid:4!1,Day Flash:7!1,Night Flash:6#0:0#123!:123!#0##B3843##2#0#0",
  "1,1!NIGHT:1Es1800,r0###0,73404416::#1,1!:1:6:0:0D=1##5,4:Varia 510:0:16777215:-1!2,:-1,Off:0!1,Solid:4!1,Day Flash:7!1,Night Flash:6#0::#123!:123!#0##B3843##2#0#0",
  "1,1!NIGHT:1Es1800,r0###0,73404416::#1,1!:1:6:0:0D=1##5,4:Varia 510:0:16777215:-1!2,:-1,Off:0!1,Solid:4!1,Day Flash:7!1,Night Flash:6#0::#0:0#0##B3843##2#0#0",
  "1,1!NIGHT:1Es1800,r0###0,73404416::#1,1!:1:6:0:0D=1##5,4:Varia 510:0:16777215:-1!2,:-1,Off:0!1,Solid:4!1,Day Flash:7!1,Night Flash:6#0::#0:0#123!:123!##B3843##2#0#0",
  "1,1!NIGHT:1Es1800,r0###0,73404416::#1,1!:1:6:0:0D=1##5,4:Varia 510:0:16777215:-1!2,:-1,Off:0!1,Solid:4!1,Day Flash:7!1,Night Flash:6#0::#0:0#123!:123!#0#B3843##2#0#0",
  "1,1!NIGHT:1Es1800,r0###0,73404416#1,1!:1:6:0:0D=1##5,4:Varia 510:0:16777215:-1!2,:-1,Off:0!1,Solid:4!1,Day Flash:7!1,Night Flash:6#0::#0:0#123!:123!#0##B3843##2#0#0",
  "1,1!NIGHT:1Es1800,r0###0,73404416::1#1,1!:1:6:0:0D=1##5,4:Varia 510:0:16777215:-1!2,:-1,Off:0!1,Solid:4!1,Day Flash:7!1,Night Flash:6#0::#0:0#123!:123!#0##B3843##2#0#0",
  "1,1!NIGHT:1Es1800,r0###0,73404416:::#1,1!:1:6:0:0D=1##5,4:Varia 510:0:16777215:-1!2,:-1,Off:0!1,Solid:4!1,Day Flash:7!1,Night Flash:6#0::#0:0#123!:123!#0##B3843##2#0#0",
  "1,1!NIGHT:1Es1800,r0###0,73404416::#1,1!:1:6D=1##5,4:Varia 510:0:16777215:-1!2,:-1,Off:0!1,Solid:4!1,Day Flash:7!1,Night Flash:6#0::#0:0#123!:123!#0##B3843##2#0#0",
  "1,1!NIGHT:1Es1800,r0###0,73404416::#1,1!:1:6:0D=1##5,4:Varia 510:0:16777215:-1!2,:-1,Off:0!1,Solid:4!1,Day Flash:7!1,Night Flash:6#0::#0:0#123!:123!#0##B3843##2#0#0",
  "1,1!NIGHT:1Es1800,r0###0,73404416::#1,1|:1:6:0:0D=1##5,4:Varia 510:0:16777215:-1!2,:-1,Off:0!1,Solid:4!1,Day Flash:7!1,Night Flash:6#0::#0:0#123!:123!#0##B3843##2#0#0",
  "1,1!NIGHT:1Es1800,r0###0,73404416::#1,1!:1:6:0:0D=1##5,4:Varia 510:0:16777215:-1!2,:-1,Off:0!1,Solid:4!1,Day Flash:7!1,Night Flash:6#1:123:456#0:0#123!:123!#0##B3843##2#0#0",
  "1,1!NIGHT:1Es1800,r0###0,73404416::#1,1!:1:6:0:0D=1##5,4:Varia 510:0:16777215:-1!2,:-1,Off:0!1,Solid:4!1,Day Flash:7!1,Night Flash:6#0::#0:0#123!:123!#0#0##B3843##2#0#0",
  "1,1!NIGHT:1Es1800,r0###0,73404416::#1,1!:1:6:0:0D=1##5,4:Varia 510:0:16777215:-1|2,:-1,Off:0|1,Solid:4|1,Day Flash:7|1,Night Flash:6#0::#0:0#123!:123!#0##B3843##2#0#0",
  "1,1!NIGHT:1Es1800,r0###0,73404416::#1,1!:1:6:0:0D=1##5,4:Varia 510!2,:-1,Off:0!1,Solid:4!1,Day Flash:7!1,Night Flash:6#0::#0:0#123!:123!#0##B3843##2#0#0",
  "1,1!NIGHT:1Es1800,r0###0,73404416::#1,1!:1:6:0:0D=1##5,4:Varia 510:0!2,:-1,Off:0!1,Solid:4!1,Day Flash:7!1,Night Flash:6#0::#0:0#123!:123!#0##B3843##2#0#0",
  "1,1!NIGHT:1Es1800,r0###0,73404416::#1,1!:1:6:0:0D=1##5,4:Varia 510:0:16777215!2,:-1,Off:0!1,Solid:4!1,Day Flash:7!1,Night Flash:6#0::#0:0#123!:123!#0##B3843##2#0#0"
];
test.each(obsoleteFormats)('rejects obsolete or incomplete configuration %#', (value) => {
  let parsed = null;
  try { parsed = Configuration.parse('SBL1#' + value, deviceList); } catch {}
  expect(parsed).toBeNull();
});

test('allows an explicitly empty serial number', () => {
  const configuration = Configuration.parse(sample, deviceList);
  configuration.headlightSerialNumber = null;
  const exported = configuration.getConfigurationValue(deviceList);
  expect(exported.slice(5).split('#')[1].split(':')[1]).toBe('');
  expect(Configuration.parse(exported, deviceList).headlightSerialNumber).toBeNull();
});

test('rejects unmarked and unknown format versions', () => {
  expect(Configuration.parse(sample.slice(5), deviceList)).toBeNull();
  expect(Configuration.parse(sample.replace('SBL1#', 'SBL0#'), deviceList)).toBeNull();
});

test.each(['LC', 'LC2', 'LC3'])('accepts the shipped %s example', (key) => {
  const parsed = Configuration.parse(exampleSettings[key], deviceList);
  expect(parsed).not.toBeNull();
  expect(Configuration.parse(parsed.getConfigurationValue(deviceList), deviceList)).not.toBeNull();
});

test.each(deviceList.filter(device => device.settings))('round trips native menus on $name', (device) => {
  const sections = remoteSample.slice(5).split('#');
  sections[6] = '4:Varia 510!Off:0!Solid:4!Day Flash:7!Night Flash:6';
  sections[sections.length - 5] = device.id;
  const parsed = Configuration.parse('SBL1#' + sections.join('#'), deviceList);
  expect(parsed).not.toBeNull();
  expect(parsed.taillightSettings.buttons).toHaveLength(4);
  const restored = Configuration.parse(parsed.getConfigurationValue(deviceList), deviceList);
  expect(restored.taillightSettings.buttons).toHaveLength(4);
  expect(restored.remoteControllers).toHaveLength(1);
});

test('rejects old literal comparison operators', () => {
  expect(() => Configuration.parse(sample.replace('A[-20', 'A<-20'), deviceList)).toThrow();
});

test.each([[14, null], [null, 1], [14, 1]])('selected lights define section presence (%s, %s)', (headlight, taillight) => {
  const configuration = new Configuration();
  configuration.setDevice('B3843');
  configuration.setHeadlight(headlight);
  configuration.setTaillight(taillight);
  const exported = configuration.getConfigurationValue(deviceList);
  const fields = exported.slice(5).split('#');
  // No serial, modes, or additional modes are needed to identify a selected light.
  expect(fields[1]).toBe(headlight === null ? '' : '::');
  expect(fields[3]).toBe(taillight === null ? '' : '::');
  const restored = Configuration.parse(exported, deviceList);
  expect(restored.headlight).toBe(headlight);
  expect(restored.taillight).toBe(taillight);
  expect(restored.headlightSerialNumber).toBeNull();
  expect(restored.taillightSerialNumber).toBeNull();
});

test('rejects the removed icon-color column', () => {
  const fields = sample.slice(5).split('#');
  const light = fields[1].split(':');
  light.splice(2, 0, '1');
  fields[1] = light.join(':');
  expect(Configuration.parse('SBL1#' + fields.join('#'), deviceList)).toBeNull();
});

test.each(deviceList)('preserves Manual-only control cycles on $name', (device) => {
  const configuration = Configuration.parse(sample, deviceList);
  configuration.setDevice(device.id);
  configuration.headlightIconTapBehavior.setControlModes([2], true);
  configuration.taillightIconTapBehavior.setControlModes([1, 2], true);
  const exported = configuration.getConfigurationValue(deviceList);
  expect(exported.slice(5).split('#')[9]).toBe('3!:23!');
  const restored = Configuration.parse(exported, deviceList);
  expect(restored.headlightIconTapBehavior.controlModes).toEqual([2]);
  expect(restored.taillightIconTapBehavior.controlModes).toEqual([1, 2]);
});

test('rejects a panel cycle without Manual', () => {
  expect(Configuration.parse(sample.replace('123!:123!', '12!:123!'), deviceList)).toBeNull();
});
