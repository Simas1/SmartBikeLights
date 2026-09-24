import Configuration from './Configuration';
import { deviceList } from '../dataFieldConstants';

const originalAppType = process.env.REACT_APP_TYPE;
beforeAll(() => { process.env.REACT_APP_TYPE = 'datafield'; });
afterAll(() => {
  if (originalAppType === undefined) delete process.env.REACT_APP_TYPE;
  else process.env.REACT_APP_TYPE = originalAppType;
});

const sample = "#16384,90382865:1,2147483647:1:267911168,0#5,3!Night:2:51:60:0Es0,r0H]2!Day:2:0:60:0Er0,s0H]2!:1:0:0:0D=1#6291461,1409482753:0,889104606:1:#11,5!BreakD:3:1:5:0Er0,s0H]2A[-20!BreakN:3:5:5:0Es0,r0H]2A[-20!Day:2:8:60:0Er0,s0H]2!Night:2:63:60:0Es0,r0H]2!:1:0:0:0D=1#6,5:AT 1600:0:16777215:0!2,:-1,Off:0!1,Low~n200lm-12h~n@headlight-low:51!1,Medium~n600lm-4h~n@headlight-medium:52!1,High~n1200lm-2h~n@headlight-high:53!1,:-2#6,5:Flare RT:0:16777215:0!2,:-1,Off:0!1,Night Flash~n5lm-15h~n@lightning:63!1,Day Flash~n45lm-12h~n@lightning:8!1,Night Steady~n5lm-13.5h~n@moon:5!1,Day Steady~n25lm-4.5h~n@sun:1#0::#0:0#123!:123!#0##B3843#14#1#0#0";
const remoteSample = "1,1!NIGHT:1Es1800,r0###0,73404416::1#2,2!BREAK:1:7:1:0A[-30!:1:6:0:0D=1##5,4:Varia 510:0:16777215!2,:-1,Off:0!1,Steady Beam:4!1,Day Flash:7!1,Night Flash:6#0::#0:0#123!:123!#1|1:MicroRemote!1|1:3167:0!2|1:1::123!:123!!|2:1::,0=:!H]0#4321#B3843##2#0#0";

test.each(deviceList)('round trips the separator-free format for $name', (device) => {
  const configuration = Configuration.parse(sample, deviceList);
  expect(configuration).not.toBeNull();
  configuration.setDevice(device.id);
  configuration.bikeRadarNumber = 4321;
  const exported = configuration.getConfigurationValue(deviceList);
  const fields = exported.split('#');
  // Remote count and radar directly follow tap behavior (touch) or force-smart settings.
  const remoteIndex = device.touchScreen ? 10 : 9;
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
  expect(exported.split('#')[10]).toMatch(/^1\|1:MicroRemote!/);
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
  expect(exported.split('#').slice(10, 13)).toEqual(['0', '0', 'B3843']);
  const restored = Configuration.parse(exported, deviceList);
  expect(restored).not.toBeNull();
  expect(restored.createBikeRadarConnection).toBe(true);
});
