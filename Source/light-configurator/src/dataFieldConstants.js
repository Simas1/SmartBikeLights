export const deviceList = [
  { id: 'B3843', name: 'Edge 1040 / 1040 Solar', highMemory: true, bikeRadar: true, touchScreen: true, settings: false, nativePairing: true, profileName: true, barometer: true, solar: true, bitsPerPixel: 16 },
  { id: 'B4440', name: 'Edge 1050', highMemory: true, bikeRadar: true, touchScreen: true, settings: false, nativePairing: true, profileName: true, barometer: true, solar: false, bitsPerPixel: 16 },
  { id: 'B4061', name: 'Edge 540 / 540 Solar', highMemory: true, bikeRadar: true, touchScreen: false, settings: true, nativePairing: true, profileName: true, barometer: true, solar: true, bitsPerPixel: 16 },
  { id: 'B4633', name: 'Edge 550', highMemory: true, bikeRadar: true, touchScreen: false, settings: true, nativePairing: true, profileName: true, barometer: true, solar: false, bitsPerPixel: 16 },
  { id: 'B4062', name: 'Edge 840 / 840 Solar', highMemory: true, bikeRadar: true, touchScreen: true, settings: false, nativePairing: true, profileName: true, barometer: true, solar: true, bitsPerPixel: 16 },
  { id: 'B4634', name: 'Edge 850', highMemory: true, bikeRadar: true, touchScreen: true, settings: false, nativePairing: true, profileName: true, barometer: true, solar: false, bitsPerPixel: 16 },
  { id: 'B4315', name: 'Forerunner 965', highMemory: true, bikeRadar: true, touchScreen: false, settings: true, nativePairing: true, profileName: true, barometer: true, solar: false, bitsPerPixel: 16 },
];

let map = {};
deviceList.forEach(item => map[item.id] = item);

export const deviceMap = map;

export const getDevice = (device) => {
  return device && deviceMap[device];
};
