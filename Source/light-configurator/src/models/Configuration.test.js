import { headlightList, taillightList } from '../constants';
import LightPanel from './LightPanel';
import LightSettings from './LightSettings';
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
const remoteSample = "SBL1#1,1!NIGHT:1Es1800,r0###0,73404416::#2,2!BREAK:1:7:1:0A[-30!:1:6:0:0D=1##3,3:Varia 510:0:16777215:-1!1,Steady Beam:4!1,Day Flash:7!1,Night Flash:6#0::#0:0#123!:123!#1|1:MicroRemote!1|1:3167:0!2|1:1::123!:123!!|2:1::,0=:!H]0#4321#1#B3843##2#0#0";

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
  expect(fields[remoteIndex + 2]).toBe('1');
  expect(fields[remoteIndex + 3]).toBe(device.id);
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
  expect(exported.slice(5).split('#').slice(10, 14)).toEqual(['0', '0', '1', 'B3843']);
  const restored = Configuration.parse(exported, deviceList);
  expect(restored).not.toBeNull();
  expect(restored.createBikeRadarConnection).toBe(true);
});

const obsoleteFormats = [
  "1,1!NIGHT:1Es1800,r0###0,73404416::#1,1!:1:6:0:0D=1##3,3:Varia 510:0:16777215:-1!1,Solid:4!1,Day Flash:7!1,Night Flash:6#0:0#123!:123!#0##1#B3843##2#0#0",
  "1,1!NIGHT:1Es1800,r0###0,73404416::#1,1!:1:6:0:0D=1##3,3:Varia 510:0:16777215:-1!1,Solid:4!1,Day Flash:7!1,Night Flash:6#0::#123!:123!#0##1#B3843##2#0#0",
  "1,1!NIGHT:1Es1800,r0###0,73404416::#1,1!:1:6:0:0D=1##3,3:Varia 510:0:16777215:-1!1,Solid:4!1,Day Flash:7!1,Night Flash:6#0::#0:0#0##1#B3843##2#0#0",
  "1,1!NIGHT:1Es1800,r0###0,73404416::#1,1!:1:6:0:0D=1##3,3:Varia 510:0:16777215:-1!1,Solid:4!1,Day Flash:7!1,Night Flash:6#0::#0:0#123!:123!##1#B3843##2#0#0",
  "1,1!NIGHT:1Es1800,r0###0,73404416::#1,1!:1:6:0:0D=1##3,3:Varia 510:0:16777215:-1!1,Solid:4!1,Day Flash:7!1,Night Flash:6#0::#0:0#123!:123!#0#1#B3843##2#0#0",
  "1,1!NIGHT:1Es1800,r0###0,73404416#1,1!:1:6:0:0D=1##3,3:Varia 510:0:16777215:-1!1,Solid:4!1,Day Flash:7!1,Night Flash:6#0::#0:0#123!:123!#0##1#B3843##2#0#0",
  "1,1!NIGHT:1Es1800,r0###0,73404416::1#1,1!:1:6:0:0D=1##3,3:Varia 510:0:16777215:-1!1,Solid:4!1,Day Flash:7!1,Night Flash:6#0::#0:0#123!:123!#0##1#B3843##2#0#0",
  "1,1!NIGHT:1Es1800,r0###0,73404416:::#1,1!:1:6:0:0D=1##3,3:Varia 510:0:16777215:-1!1,Solid:4!1,Day Flash:7!1,Night Flash:6#0::#0:0#123!:123!#0##1#B3843##2#0#0",
  "1,1!NIGHT:1Es1800,r0###0,73404416::#1,1!:1:6D=1##3,3:Varia 510:0:16777215:-1!1,Solid:4!1,Day Flash:7!1,Night Flash:6#0::#0:0#123!:123!#0##1#B3843##2#0#0",
  "1,1!NIGHT:1Es1800,r0###0,73404416::#1,1!:1:6:0D=1##3,3:Varia 510:0:16777215:-1!1,Solid:4!1,Day Flash:7!1,Night Flash:6#0::#0:0#123!:123!#0##1#B3843##2#0#0",
  "1,1!NIGHT:1Es1800,r0###0,73404416::#1,1|:1:6:0:0D=1##3,3:Varia 510:0:16777215:-1!1,Solid:4!1,Day Flash:7!1,Night Flash:6#0::#0:0#123!:123!#0##1#B3843##2#0#0",
  "1,1!NIGHT:1Es1800,r0###0,73404416::#1,1!:1:6:0:0D=1##3,3:Varia 510:0:16777215:-1!1,Solid:4!1,Day Flash:7!1,Night Flash:6#1:123:456#0:0#123!:123!#0##1#B3843##2#0#0",
  "1,1!NIGHT:1Es1800,r0###0,73404416::#1,1!:1:6:0:0D=1##3,3:Varia 510:0:16777215:-1!1,Solid:4!1,Day Flash:7!1,Night Flash:6#0::#0:0#123!:123!#0#0##1#B3843##2#0#0",
  "1,1!NIGHT:1Es1800,r0###0,73404416::#1,1!:1:6:0:0D=1##5,4:Varia 510:0:16777215:-1|2,:-1,Off:0|1,Solid:4|1,Day Flash:7|1,Night Flash:6#0::#0:0#123!:123!#0##1#B3843##2#0#0",
  "1,1!NIGHT:1Es1800,r0###0,73404416::#1,1!:1:6:0:0D=1##5,4:Varia 510!2,:-1,Off:0!1,Solid:4!1,Day Flash:7!1,Night Flash:6#0::#0:0#123!:123!#0##1#B3843##2#0#0",
  "1,1!NIGHT:1Es1800,r0###0,73404416::#1,1!:1:6:0:0D=1##5,4:Varia 510:0!2,:-1,Off:0!1,Solid:4!1,Day Flash:7!1,Night Flash:6#0::#0:0#123!:123!#0##1#B3843##2#0#0",
  "1,1!NIGHT:1Es1800,r0###0,73404416::#1,1!:1:6:0:0D=1##5,4:Varia 510:0:16777215!2,:-1,Off:0!1,Solid:4!1,Day Flash:7!1,Night Flash:6#0::#0:0#123!:123!#0##1#B3843##2#0#0"
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
  sections[6] = '3:Varia 510!Solid:4!Day Flash:7!Night Flash:6';
  sections[sections.length - 5] = device.id;
  const parsed = Configuration.parse('SBL1#' + sections.join('#'), deviceList);
  expect(parsed).not.toBeNull();
  expect(parsed.taillightSettings.buttons).toHaveLength(3);
  const restored = Configuration.parse(parsed.getConfigurationValue(deviceList), deviceList);
  expect(restored.taillightSettings.buttons).toHaveLength(3);
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


test.each([-3, -2, -1, 0])('rejects fixed button %s in an editable layout', (mode) => {
  const sections = sample.slice(5).split('#');
  sections[5] = `1,1:Front:0:16777215:-1!1,Fixed:${mode}`;
  expect(() => Configuration.parse('SBL1#' + sections.join('#'), deviceList)).toThrow(/positive light mode/);
  sections[5] = `1:Front!Fixed:${mode}`;
  sections[6] = '';
  sections[13] = 'B4315';
  expect(() => Configuration.parse('SBL1#' + sections.join('#'), deviceList)).toThrow(/positive light mode/);
});

test.each(['B3843', 'B4315'])('preserves a layout with only fixed buttons on %s', deviceId => {
  const sections = sample.slice(5).split('#');
  sections[5] = deviceId === 'B3843' ? '0,0:Front:0:16777215:-1' : '0:Front';
  sections[6] = '';
  sections[13] = deviceId;
  const parsed = Configuration.parse('SBL1#' + sections.join('#'), deviceList);
  expect(parsed.getConfigurationValue(deviceList).slice(5).split('#')[5]).toBe(sections[5]);
});


test('catalog layouts contain only editable buttons', () => {
  for (const light of [...headlightList, ...taillightList]) {
    if (!light.defaultLightPanel) continue;
    const panel = new LightPanel(light.defaultLightPanel);
    const settings = new LightSettings(light.defaultLightPanel);
    expect(panel.buttonGroups.flatMap(group => group.buttons).every(button => button.mode > 0)).toBe(true);
    expect(settings.buttons.every(button => button.mode > 0)).toBe(true);
  }
});


test.each([true, false])('round trips shared footer visibility: %s', visible => {
  const configuration = Configuration.parse(sample, deviceList);
  expect(configuration.showFooter).toBe(true);
  configuration.setShowFooter(visible);
  const exported = configuration.getConfigurationValue(deviceList);
  expect(exported.slice(5).split('#')[12]).toBe(visible ? '1' : '0');
  expect(Configuration.parse(exported, deviceList).showFooter).toBe(visible);
});

test.each(['', '2', '-1'])('rejects invalid footer visibility: %s', value => {
  const sections = sample.slice(5).split('#');
  sections[12] = value;
  expect(Configuration.parse('SBL1#' + sections.join('#'), deviceList)).toBeNull();
});

test('mode filter round trips without removing layout buttons or automation modes', () => {
  const configuration = Configuration.parse(sample, deviceList);
  const buttons = configuration.headlightPanel.buttonGroups.flatMap(group => group.buttons.map(button => button.mode));
  const filters = configuration.headlightFilterGroups.map(group => group.lightMode);
  configuration.headlightIconTapBehavior.setManualModeBehavior(1);
  configuration.headlightIconTapBehavior.setLightModes([51, 53]);
  let restored = Configuration.parse(configuration.getConfigurationValue(deviceList), deviceList);
  expect(restored.headlightIconTapBehavior.manualModeBehavior).toBe(1);
  expect(restored.headlightIconTapBehavior.lightModes).toEqual([51, 53]);
  expect(restored.headlightPanel.buttonGroups.flatMap(group => group.buttons.map(button => button.mode))).toEqual(buttons);
  expect(restored.headlightFilterGroups.map(group => group.lightMode)).toEqual(filters);
  restored.headlightIconTapBehavior.setManualModeBehavior(0);
  restored = Configuration.parse(restored.getConfigurationValue(deviceList), deviceList);
  expect(restored.headlightIconTapBehavior.lightModes).toBeNull();
});
