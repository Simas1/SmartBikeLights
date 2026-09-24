import { makeAutoObservable } from 'mobx';
import bigint from 'big-integer';
import FilterGroup from './FilterGroup';
import Filter from './Filter';
import Polygon from './Polygon';
import LightPanel from './LightPanel';
import LightButtonGroup from './LightButtonGroup';
import LightButton from './LightButton';
import { serializeButtonGraphics } from './lightButtonGraphics';
import LightSettings from './LightSettings';
import LightModeCycleBehavior from './LightModeCycleBehavior';
import { getLight, isDataField } from '../constants';
import RemoteController from './RemoteController';
import RemoteControllerButton from './RemoteControllerButton';
import RemoteControllerButtonAction from './RemoteControllerButtonAction';
import Tone from './Tone';
import ToneItem from './ToneItem';

const defaultFilter = new Filter();
defaultFilter.type = 'D';
defaultFilter.operator = '=';
defaultFilter.value = '1';

const getDefaultGroupConfigurationValue = (lightMode) => {
  let group = new FilterGroup(true);
  group.lightMode = lightMode;
  group.filters.push(defaultFilter);
  return group.getConfigurationValue();
};

const parseNumber = (chars, index, resultIndex) => {
  let stringValue = null;
  let i;
  let isFloat = false;
  for (i = index; i < chars.length; i++) {
    const char = chars[i];
    const charNumber = char.charCodeAt(0);
    if (charNumber === 46 /* . */) {
      isFloat = true;
    } else if (charNumber !== 45 /* - */ && (charNumber > 57 /* 9 */ || charNumber < 48 /* 0 */)) {
      break;
    }

    stringValue = stringValue === null ? char : stringValue + char;
  }

  resultIndex[0] = i;
  return stringValue === null ? null
    : isFloat ? parseFloat(stringValue)
    : parseInt(stringValue);
};

const parseSerialNumber = (chars, index, resultIndex) => {
  var array = parseNumberArray(chars, index, resultIndex);
  //console.log(bigint(array[0]).shiftLeft(31).or(bigint(array[1])));
  return !array ? null : bigint(array[0]).shiftLeft(31).or(bigint(array[1]));
};

const parseNumberArray = (chars, index, resultIndex) => {
  const left = parseNumber(chars, index, resultIndex);
  if (left === null) {
    return null;
  }

  const right = parseNumber(chars, resultIndex[0] + 1, resultIndex);
  return [left, right];
};

const parseTitle = (chars, index, resultIndex) => {
  let stringValue = null;
  let i;
  for (i = index; i < chars.length; i++) {
    const char = chars[i];
    if (char === ':' || char === '#' || char === '|' || char === '!') {
        break;
    }

    stringValue = stringValue === null ? char : stringValue + char;
  }

  resultIndex[0] = i;
  return stringValue;
};

const parseTimespanPart = (chars, index, filterResult, data, dataIndex) => {
  const char = chars[index];
  const type = char !== 's' /* Sunset */ && char !== 'r' /* Sunrise */
    ? '0'
    : char;
  if (type !== '0') {
      index++;
  }

  data[dataIndex] = type;
  data[dataIndex + 1] = parseNumber(chars, index, filterResult);
};

const parsePolygons = (chars, index, filterResult) => {
  filterResult[1] = null; /* Filter operator */
  // The first value represents the total number of polygons
  const data = new Array(parseNumber(chars, index, filterResult) * 8);
  let dataIndex = 0;
  index = filterResult[0] + 1;
  while (dataIndex < data.length) {
      data[dataIndex] = parseNumber(chars, index, filterResult);
      dataIndex++;
      index = filterResult[0] + 1;
  }

  return data;
};

const parseIndividualLightSettings = (chars, filterResult) => {
  const deviceNumbers = [];
  do {
    const number = parseNumber(chars, filterResult[0] + 1, filterResult);
    if (number == null) {
      break;
    }

    deviceNumbers.push(number);
  } while (chars[filterResult[0]] === ',');

  let manualModeTracking = false;
  if (chars[filterResult[0]] === '!') {
      manualModeTracking = parseNumber(chars, filterResult[0] + 1, filterResult) === 1;
  }

  return [deviceNumbers.join(','), manualModeTracking];
};

const parseBikeRadar = (chars, index, filterResult) => {
  filterResult[1] = chars[index]; // Filter operator
  const data = new Array(3);
  data[0] = parseNumber(chars, index + 1, filterResult);
  data[1] = chars[filterResult[0]]; // Threat operator
  data[2] = parseNumber(chars, filterResult[0] + 1, filterResult);

  return data;
};

const parseGenericFilter = (charNumber, chars, index, filterResult) => {
  filterResult[1] = chars[index]; // Filter operator

  return charNumber === 75 /* Profile name */
    ? parseTitle(chars, index + 1, filterResult)
    : parseNumber(chars, index + 1, filterResult);
};

const parseTimespan = (chars, index, filterResult) => {
  const data = new Array(4);
  filterResult[1] = null; /* Filter operator */
  parseTimespanPart(chars, index, filterResult, data, 0);
  parseTimespanPart(chars, filterResult[0] + 1 /* Skip , */, filterResult, data, 2);

  return data;
};

const parseLightsModes = (chars, index, filterResult, hasOperator) => {
  const data = new Array(6);
  if (hasOperator) {
    filterResult[1] = chars[index++]; // Filter operator
  }

  const hasHeadlightMode = chars[index] !== ',';
  // Headlight
  data[0] = hasHeadlightMode ? parseNumber(chars, index, filterResult) /* Control mode */ : null;
  data[1] = hasHeadlightMode ? chars[filterResult[0]] : null; // Operator
  data[2] = hasHeadlightMode ? parseNumber(chars, filterResult[0] + 2 /* Skip (! or =) and : */, filterResult) /* Light mode */ : null;
  // Taillight
  data[3] = parseNumber(chars, data[0] == null ? index + 1 : filterResult[0] + 1 /* Skip , */, filterResult); /* Control mode */
  data[4] = data[3] == null ? null : chars[filterResult[0]]; // Operator
  data[5] = data[3] == null ? null : parseNumber(chars, filterResult[0] + 2 /* Skip (! or =) and : */, filterResult); /* Light mode */

  return data;
};

const parseLightPanel = (chars, i, filterResult) => {
  const totalButtons = parseNumber(chars, i, filterResult);
  if (totalButtons === null) {
      return null;
  }

  if (chars[filterResult[0]] === ':') {
    return parseLightSettings(totalButtons, chars, filterResult);
  }

  const panel = new LightPanel();
  parseNumber(chars, filterResult[0] + 1, filterResult);
  panel.lightName = parseTitle(chars, filterResult[0] + 1, filterResult);
  panel.buttonColor = requiredNumber(chars, ':', filterResult);
  panel.buttonTextColor = requiredNumber(chars, ':', filterResult);
  panel.groupNameVisibility = requiredNumber(chars, ':', filterResult);
  i = filterResult[0];
  while (i < chars.length) {
    const char = chars[i];
    if (char === '#') {
        break;
    }

    if (char === '!') {
        const lightButtonGroup = new LightButtonGroup();
        const numberOfButtons = parseNumber(chars, filterResult[0] + 1, filterResult); // Number of buttons in the group
        for (let j = 0; j < numberOfButtons; j++) {
            let lightButton = new LightButton();
            lightButton.loadPanelName(parseTitle(chars, filterResult[0] + 1, filterResult));
            lightButton.mode = parseNumber(chars, filterResult[0] + 1, filterResult);
            if (lightButton.mode <= 0) throw new Error("Editable buttons require a positive light mode");
            lightButtonGroup.buttons.push(lightButton);
        }

        i = filterResult[0];
        panel.buttonGroups.push(lightButtonGroup);
    } else {
        throw new Error('Invalid LightPanel configuration');
    }
  }

  return panel;
}

const parseLightIconTapBehavior = (chars, i, filterResult) => {
  let value = parseNumber(chars, i, filterResult);
  if (value === null) {
    throw new Error('Missing configuration value');
  }

  if (chars[filterResult[0]] !== '!') throw new Error('Invalid tap behavior');
  const controlModes = [];
  const manualModes = [];
  const controlModeChars = value.toString();
  // Parse control modes
  for (let j = 0; j < controlModeChars.length; j++) {
    let controlMode = parseInt(controlModeChars[j]);
    if (!isNaN(controlMode) && controlMode > 0) {
      controlModes.push(controlMode - 1);
    }
  }

  // Parse manual light modes
  do {
    value = parseNumber(chars, filterResult[0] + 1, filterResult);
    if (value !== null) {
      manualModes.push(value);
    }

    i = filterResult[0];
  } while (value !== null && i < chars.length && chars[i] === ',');

  const tapBehavior = new LightModeCycleBehavior();
  tapBehavior.lightModes = !manualModes.length ? null : manualModes;
  tapBehavior.controlModes = controlModes;
  tapBehavior.manualModeBehavior = tapBehavior.lightModes ? 1 : 0;

  return tapBehavior;
}

const parseRemoteControllers = (chars, i, filterResult) => {
  let totalControllers = parseNumber(chars, i, filterResult);
  if (totalControllers === null) {
    throw new Error('Missing configuration value');
  }

  const remoteControllers = [];
  for (let j = 0; j < totalControllers; j++) {
    const controller = new RemoteController();
    controller.open = false;
    remoteControllers.push(controller);
    controller.setControllerId(parseNumber(chars, filterResult[0] + 1, filterResult));
    controller.setName(parseTitle(chars, filterResult[0] + 1, filterResult));

    const totalButtons = parseNumber(chars, filterResult[0] + 1, filterResult);
    for (let k = 0; k < totalButtons; k++) {
      const button = new RemoteControllerButton(controller);
      button.open = false;
      controller.buttons.push(button);
      button.setButtonId(parseNumber(chars, filterResult[0] + 1, filterResult));
      button.setDeviceNumber(parseNumber(chars, filterResult[0] + 1, filterResult));
      const doubleClickDelay = parseNumber(chars, filterResult[0] + 1, filterResult);
      if (doubleClickDelay) {
        button.setEnableDoubleClick(true);
        button.setDoubleClickDelay(doubleClickDelay);
      }

      const totalActions = parseNumber(chars, filterResult[0] + 1, filterResult);
      for (let l = 0; l < totalActions; l++) {
        const action = new RemoteControllerButtonAction();
        action.open = false;
        button.actions.push(action);
        const actionType = parseNumber(chars, filterResult[0] + 1, filterResult);
        action.setActionType(actionType)
        action.setTriggerId(parseNumber(chars, filterResult[0] + 1, filterResult));
        action.setToneId(parseNumber(chars, filterResult[0] + 1, filterResult));

        if (actionType === 1 /* Cycle light modes */) {
          action.setHeadlightTapBehavior(parseLightIconTapBehavior(chars, filterResult[0] + 1, filterResult));
          action.setTaillightTapBehavior(parseLightIconTapBehavior(chars, filterResult[0] + 1, filterResult));
        } else if (actionType === 2 /* Change light mode */) {
          const values = parseLightsModes(chars, filterResult[0] + 1, filterResult, false);
          action.headlightMode.setControlMode(values[0]);
          action.headlightMode.setOperator(values[1]);
          action.headlightMode.setLightMode(values[2]);
          action.taillightMode.setControlMode(values[3]);
          action.taillightMode.setOperator(values[4]);
          action.taillightMode.setLightMode(values[5]);
        } else if (actionType === 3 /* Change configuration */) {
          action.setConfigurationId(parseNumber(chars, filterResult[0] + 1, filterResult));
        } else if (actionType === 4 /* Play tone */) {
          const toneTypeId = parseNumber(chars, filterResult[0] + 1, filterResult);
          action.setToneTypeId(toneTypeId);
          if (toneTypeId === 2 /* Custom tone */) {
            action.setRepeatCount(parseNumber(chars, filterResult[0] + 1, filterResult));
            const totalTones = parseNumber(chars, filterResult[0] + 1, filterResult);
            let m = 0
            for (; m < totalTones; m++) {
              const tone = new Tone(m);
              action.tones.push(tone);
              tone.setName(parseTitle(chars, filterResult[0] + 1, filterResult));
              tone.setFrequency(parseNumber(chars, filterResult[0] + 1, filterResult));
              tone.setDuration(parseNumber(chars, filterResult[0] + 1, filterResult));
            }

            const totalToneItems = parseNumber(chars, filterResult[0] + 1, filterResult);
            for (m = 0; m < totalToneItems; m++) {
              const toneItem = new ToneItem();
              action.toneSequence.push(toneItem);
              toneItem.setToneId(parseNumber(chars, filterResult[0] + 1, filterResult));
            }
          }
        }

        filterResult[0]++; /* Skip ! */
        i = filterResult[0];
        while (i < chars.length) {
          const charNumber = chars[i].charCodeAt(0);
          if (charNumber === 124 /* | */ || charNumber === 35 /* # */) {
            break;
          }

          if (charNumber >= 65 /* A */ && charNumber <= 90 /* Z */) {
            const filterValue = parseFilter(charNumber, chars, i, filterResult);
            action.conditions.push(parseToFilter(
              chars[i], // Filter type
              filterResult[1], // Filter operator
              filterValue // Filter value
            ));

            i = filterResult[0];
          } else {
            i++;
            filterResult[0] = i;
          }
        }
      }
    }
  }

  return remoteControllers;
};

const parseBikeRadarNumber = (chars, i, filterResult) => {
  const deviceNumber = parseNumber(chars, i, filterResult);
  return deviceNumber;
};

const parseLightSettings = (totalButtons, chars, filterResult) => {
  const settings = new LightSettings();
  settings.lightName = parseTitle(chars, filterResult[0] + 1, filterResult);
  for (let j = 0; j < totalButtons; j++) {
    let lightButton = new LightButton();
    lightButton.name = parseTitle(chars, filterResult[0] + 1, filterResult);
    lightButton.mode = parseNumber(chars, filterResult[0] + 1, filterResult);
    if (lightButton.mode <= 0) throw new Error("Editable buttons require a positive light mode");
    settings.buttons.push(lightButton);
  }

  return settings;
};

const parseFilters = (chars, i, lightMode, filterResult) => {
  const totalFilters = parseNumber(chars, i, filterResult);
  if (totalFilters === null) {
    return null;
  }

  const groupDataLength = lightMode ? 5 : 2;
  const totalGroups = parseNumber(chars, filterResult[0] + 1, filterResult);
  const data = new Array((totalFilters * 3) + totalGroups * groupDataLength);
  i = filterResult[0];
  let dataIndex = 0;

  while (i < chars.length) {
    const charNumber = chars[i].charCodeAt(0);
    if (charNumber === 35 /* # */) {
      break;
    }

    if (charNumber === 33 /* ! */) {
      data[dataIndex] = parseTitle(chars, i + 1, filterResult); // Group title
      data[dataIndex + 1] = parseNumber(chars, filterResult[0] + 1, filterResult); // Number of filters in the group
      if (lightMode) {
        data[dataIndex + 2] = parseNumber(chars, filterResult[0] + 1 /* Skip : */, filterResult); // The light mode id
        for (var j = 0; j < 2; j++) {
          // Parse the deactivation and activation delay
          data[dataIndex + 3 + j] = requiredNumber(chars, ':', filterResult);
        }
      }

      dataIndex += groupDataLength;
      i = filterResult[0];
    } else if (charNumber >= 65 /* A */ && charNumber <= 90 /* Z */) {
      const filterValue = parseFilter(charNumber, chars, i, filterResult);
      data[dataIndex] = chars[i]; // Filter type
      data[dataIndex + 1] = filterResult[1]; // Filter operator
      data[dataIndex + 2] = filterValue; // Filter value
      dataIndex += 3;
      i = filterResult[0];
    } else {
      i++;
      filterResult[0] = i;
    }
  }

  return data;
};

const parseFilter = (charNumber, chars, i, filterResult) => {
  if (chars[i + 1] === '<' || chars[i + 1] === '>') throw new Error('Invalid filter operator');
  return charNumber === 69 /* E */ ? parseTimespan(chars, i + 1, filterResult)
      : charNumber === 70 /* F */ ? parsePolygons(chars, i + 1, filterResult)
      : charNumber === 73 /* I */ ? parseBikeRadar(chars, i + 1, filterResult)
      : charNumber === 78 /* N */ ? parseLightsModes(chars, i + 1, filterResult, true)
      : parseGenericFilter(charNumber, chars, i + 1, filterResult);
};

const parseToFilter = (type, operator, value) => {
  let filter = new Filter();
  filter.open = false;
  filter.type = type;
  filter.setOperator(operator);
  if (type === 'E' /* Timespan */) {
    filter.fromType = value[0];
    filter.fromValue = value[1];
    filter.toType = value[2];
    filter.toValue = value[3];
  } else if (type === 'F' /* Position */) {
    for (let i = 0; i < value.length; i += 8) {
      let polygon = new Polygon();
      let endIndex = i + 8;
      for (let j = i; j < endIndex;) {
        polygon.vertexes.push([value[j++], value[j++]]);
      }

      filter.polygons.push(polygon);
    }
  } else if (type === 'I' /* Bike radar */) {
    if (value[0] >= 0) {
      filter.value = value[0];
    } else {
      filter.setOperator(null);
    }

    if (value[2] >= 0) {
      filter.setThreatOperator(value[1]);
      filter.threat = value[2];
    }
  } else if (type === 'N' /* Lights modes */) {
    filter.headlightMode.setControlMode(value[0]);
    filter.headlightMode.setOperator(value[1]);
    filter.headlightMode.setLightMode(value[2]);
    filter.taillightMode.setControlMode(value[3]);
    filter.taillightMode.setOperator(value[4]);
    filter.taillightMode.setLightMode(value[5]);
  } else {
    filter.value = value;
  }

  return filter;
};

const parseToFilterGroups = (chars, i, hasLightMode, filterResult) => {
  let filterGroups = [];
  const values = parseFilters(chars, i, hasLightMode, filterResult);
  if (!values) {
    return filterGroups;
  }

  for (let i = 0; i < values.length;) {
    let filterGroup = new FilterGroup(hasLightMode);
    filterGroup.open = false;
    filterGroup.name = values[i++];
    let totalFilters = values[i++];
    if (hasLightMode) {
      filterGroup.lightMode = values[i++];
      const deactivationDelay = values[i++];
      filterGroup.deactivationDelay = deactivationDelay !== null && deactivationDelay > 0 ? deactivationDelay : null;
      const activationDelay = values[i++];
      filterGroup.activationDelay = activationDelay !== null && activationDelay > 0 ? activationDelay : null;
    }

    let endIndex = i + totalFilters * 3;
    for (let j = i; j < endIndex;) {
      filterGroup.filters.push(parseToFilter(values[j++], values[j++], values[j++]));
    }

    i = endIndex;
    filterGroups.push(filterGroup);
  }

  return filterGroups;
};

const parseDevice = (value, deviceList) => {
  if (typeof value !== 'string') return { device: null };
  const sections = value.split('#');
  const device = deviceList.find(item => item.id === sections[sections.length - 5]);
  if (!device) return { device: null };
  const dataField = isDataField();
  const total = device.highMemory ? (dataField ? 18 : 15) : 10;
  if (sections.length !== total) return { device: null };
  // Light fields have fixed positions; serial number and additional modes may be empty.
  const pair = '(?:-?\\d+,-?\\d+)?';
  const light = new RegExp(`^${pair}:${pair}:${pair}$`);
  if ([1, 3].some(i => sections[i] !== '' && !light.test(sections[i]))) return { device: null };
  if ([0, 2, 4, 5, 6].some(i => sections[i]?.includes('|'))) return { device: null };
  if (device.highMemory) {
    if (!/^(?:0::|1:(?:\d+(?:,\d+)*![01])?:(?:\d+(?:,\d+)*![01])?)$/.test(sections[7]) ||
        !/^[01]:[01]$/.test(sections[8])) return { device: null };
    if (dataField && !/^[0-3]+!(?:\d+(?:,\d+)*)?:[0-3]+!(?:\d+(?:,\d+)*)?$/.test(sections[9])) return { device: null };
    if (dataField && sections[9].split(':').some(cycle => !cycle.split('!')[0].includes('3'))) return { device: null };
    const radarIndex = total - (dataField ? 7 : 6);
    if (dataField && !/^[01]$/.test(sections[12])) return { device: null };
    if (!/^\d*$/.test(sections[radarIndex])) return { device: null };
    if (dataField && !/^\d+(?:\||$)/.test(sections[radarIndex - 1])) return { device: null };
    for (const i of [5, 6]) {
      if (!sections[i]) continue;
      const panel = sections[i].split('!')[0];
      if (device.settings ? !/^\d+:[^:]*$/.test(panel) : !/^\d+,\d+:[^:]*:-?\d+:-?\d+:-?\d+$/.test(panel)) return { device: null };
    }
  }
  return { device, deviceIndex: value.length - sections.slice(-5).join('#').length };
};

const requiredNumber = (chars, delimiter, result) => {
  if (chars[result[0]] !== delimiter) throw new Error('Invalid configuration field');
  const value = parseNumber(chars, result[0] + 1, result);
  if (value === null) throw new Error('Missing configuration value');
  return value;
};

export default class Configuration {

  device = null;
  units = 0;
  timeFormat = 0;
  showFooter = true;

  setShowFooter = value => { this.showFooter = value; };
  globalFilterGroups = [];
  headlight = null;
  headlightModes = null;
  headlightFilterGroups = [];
  headlightDefaultMode = null;
  headlightPanel = null;
  headlightSettings = null;
  headlightForceSmartMode = false;
  headlightIconTapBehavior = null;
  taillight = null;
  taillightModes = null;
  taillightFilterGroups = [];
  taillightDefaultMode = null;
  taillightPanel = null;
  taillightSettings = null;
  taillightForceSmartMode = false;
  taillightIconTapBehavior = null;
  useIndividualNetwork = false;
  headlightDeviceNumber = null;
  taillightDeviceNumber = null;
  headlightSerialNumber = null;
  taillightSerialNumber = null;
  headlightAdditionalModes = null;
  taillightAdditionalModes = null;
  remoteControllers = [];
  bikeRadarNumber = null;
  createBikeRadarConnection = false;

  constructor() {
    makeAutoObservable(this, {
    });
  }

  static parse(value, deviceList) {
    if (typeof value !== 'string' || !value.startsWith('SBL1#')) return null;
    value = value.slice(5);
    const { device, deviceIndex} = parseDevice(value, deviceList);
    if (!device) {
      return null;
    }

    const filterResult = [0 /* next index */, 0 /* operator type */];
    const configuration = new Configuration();
    configuration.globalFilterGroups = parseToFilterGroups(value, 0, false, filterResult);

    configuration.headlightModes = parseNumberArray(value, filterResult[0] + 1, filterResult);
    if (value[filterResult[0]] === ':') {
      configuration.headlightSerialNumber = parseSerialNumber(value, filterResult[0] + 1, filterResult);
      configuration.headlightAdditionalModes = parseNumberArray(value, filterResult[0] + 1, filterResult);
    }

    let filterGroups = parseToFilterGroups(value, filterResult[0] + 1, true, filterResult);
    let defaultGroup;
    if (filterGroups.length) {
      defaultGroup = filterGroups.splice(filterGroups.length - 1, 1)[0];
      configuration.headlightDefaultMode = defaultGroup.lightMode;
    }

    configuration.headlightFilterGroups = filterGroups;

    configuration.taillightModes = parseNumberArray(value, filterResult[0] + 1, filterResult);
    if (value[filterResult[0]] === ':') {
      configuration.taillightSerialNumber = parseSerialNumber(value, filterResult[0] + 1, filterResult);
      configuration.taillightAdditionalModes = parseNumberArray(value, filterResult[0] + 1, filterResult);
    }

    filterGroups = parseToFilterGroups(value, filterResult[0] + 1, true, filterResult);
    if (filterGroups.length) {
      defaultGroup = filterGroups.splice(filterGroups.length - 1, 1)[0];
      configuration.taillightDefaultMode = defaultGroup.lightMode;
    }

    configuration.taillightFilterGroups = filterGroups;

    if (!device.highMemory) {
      return this.parseMetadataConfiguration(configuration, value, deviceList, deviceIndex, filterResult);
    }

    let panel = parseLightPanel(value, filterResult[0] + 1, filterResult);
    if (panel instanceof LightSettings) {
      configuration.headlightSettings = panel;
    } else {
      configuration.headlightPanel = panel;
    }

    panel = parseLightPanel(value, filterResult[0] + 1, filterResult);
    if (panel instanceof LightSettings) {
      configuration.taillightSettings = panel;
    } else {
      configuration.taillightPanel = panel;
    }

    // Parse individual network
    const useIndividualNetwork = parseNumber(value, filterResult[0] + 1, filterResult);
    if (useIndividualNetwork === null) throw new Error('Missing configuration section');

    configuration.useIndividualNetwork = useIndividualNetwork === 1;
    configuration.headlightDeviceNumber = parseIndividualLightSettings(value, filterResult)[0];
    configuration.taillightDeviceNumber = parseIndividualLightSettings(value, filterResult)[0];

    // Parse force smart mode
    const headlightForceSmartMode = parseNumber(value, filterResult[0] + 1, filterResult);
    if (headlightForceSmartMode === null) throw new Error('Missing configuration section');

    configuration.headlightForceSmartMode = headlightForceSmartMode === 1;
    configuration.taillightForceSmartMode = parseNumber(value, filterResult[0] + 1, filterResult) === 1;

    // Parse light icon tap behavior
    if (device.highMemory && isDataField()) {
      const headlightTapBehavior = parseLightIconTapBehavior(value, filterResult[0] + 1, filterResult);
      if (headlightTapBehavior === null) throw new Error('Missing configuration section');

      configuration.headlightIconTapBehavior = headlightTapBehavior;
      configuration.taillightIconTapBehavior = parseLightIconTapBehavior(value, filterResult[0] + 1, filterResult);
    }

    // Parse remote controllers
    if (isDataField() && device.highMemory) {
      const remoteControllers = parseRemoteControllers(value, filterResult[0] + 1, filterResult);
      if (remoteControllers === null) throw new Error('Missing configuration section');

      configuration.remoteControllers = remoteControllers;
      const bikeRadarNumber = parseBikeRadarNumber(value, filterResult[0] + 1, filterResult);
      if (bikeRadarNumber === 0) {
        configuration.createBikeRadarConnection = true;
      } else if (bikeRadarNumber !== null) {
        configuration.bikeRadarNumber = bikeRadarNumber;
      }
    }

    if (device.highMemory && isDataField()) {
      configuration.showFooter = requiredNumber(value, '#', filterResult) === 1;
    }
    return this.parseMetadataConfiguration(configuration, value, deviceList, deviceIndex, filterResult);
  }

  static parseMetadataConfiguration(configuration, value, deviceList, i, filterResult) {
    configuration.device = parseTitle(value, i, filterResult);
    configuration.headlight = parseNumber(value, filterResult[0] + 1, filterResult);
    configuration.taillight = parseNumber(value, filterResult[0] + 1, filterResult);
    configuration.units = parseNumber(value, filterResult[0] + 1, filterResult);
    configuration.timeFormat = parseNumber(value, filterResult[0] + 1, filterResult);

    return configuration.isValid(deviceList) ? configuration : null;
  }

  isValid(deviceList) {
    const device = deviceList.find(l => l.id === this.device);
    const headlightData = getLight(false, this.headlight);
    const taillightData = getLight(true, this.taillight);
    return device &&
      this.globalFilterGroups.every(g => g.isValid(device, null)) && (
        (this.headlight !== null || this.taillight !== null) &&
        this.isLightValid(headlightData, this.headlightFilterGroups, this.headlightDefaultMode, device) &&
        this.isLightValid(taillightData, this.taillightFilterGroups, this.taillightDefaultMode, device)
      ) &&
      this.isItemValid(this.headlightPanel, headlightData, device.touchScreen) &&
      this.isItemValid(this.taillightPanel, taillightData, device.touchScreen) &&
      (this.headlightIconTapBehavior === null || this.headlightIconTapBehavior.containsManualMode()) &&
      (this.taillightIconTapBehavior === null || this.taillightIconTapBehavior.containsManualMode()) &&
      this.isItemValid(this.headlightSettings, headlightData, device.settings) &&
      this.isItemValid(this.taillightSettings, taillightData, device.settings) &&
      this.isIndividualNetworkValid(device) &&
      (!device.profileName || this.remoteControllers.every(c => c.isValid(this, device)));
  }

  isIndividualNetworkValid(device) {
    if (!this.useIndividualNetwork || !device.highMemory || device.nativePairing) {
      return true;
    }

    return (this.headlight === null || this.headlightDeviceNumber !== null) &&
      (this.taillight === null || this.taillightDeviceNumber !== null);
  }

  isItemValid(item, lightData, validate) {
    return !validate || item == null || item.isValid(lightData);
  }

  isLightValid(lightData, lightFilterGroups, lightDefaultMode, device) {
    if (lightData === null) {
      return true;
    }

    if (lightData.individualNetworkOnly && (!this.useIndividualNetwork || !device.highMemory)) {
      return false;
    }

    return lightData.modes != null && lightFilterGroups.every(g => g.isValid(device, lightData)) &&
          (
            (!lightFilterGroups.length && !this.globalFilterGroups.length) ||
            lightDefaultMode !== null
          );
  }

  getConfigurationValue(deviceList) {
    if (!this.isValid(deviceList)) {
      return null;
    }

    const device = deviceList.find(l => l.id === this.device);
    const headlightData = getLight(false, this.headlight);
    const taillightData = getLight(true, this.taillight);
    let config = 'SBL1#' + this.getFilterGroupsConfigurationValue(this.globalFilterGroups, null);
    config += `#${this.getLightInfo(this.headlight, this.headlightModes, this.headlightSerialNumber, this.headlightAdditionalModes)}`;
    config += `#${this.headlight === null ? '' : this.getFilterGroupsConfigurationValue(this.headlightFilterGroups, this.headlightDefaultMode)}`;
    config += `#${this.getLightInfo(this.taillight, this.taillightModes, this.taillightSerialNumber, this.taillightAdditionalModes)}`;
    config += `#${this.taillight === null ? '' : this.getFilterGroupsConfigurationValue(this.taillightFilterGroups, this.taillightDefaultMode)}`;
    config += this.getLightPanelOrSettingsConfigurationValue(this.headlightPanel, this.headlightSettings, device);
    config += this.getLightPanelOrSettingsConfigurationValue(this.taillightPanel, this.taillightSettings, device);
    config += this.getIndividualNetworkConfigurationValue(device, headlightData, taillightData);
    config += this.getForceSmartModeConfigurationValue(device);
    config += this.getLightsTapBehaviorConfigurationValue(device);
    config += this.getRemoteControllersConfigrationValue(device);
    config += this.getBikeRadarNumberValue(device, headlightData, taillightData);
    if (device.highMemory && isDataField()) config += `#${this.showFooter ? 1 : 0}`;
    config += `#${(this.device)}`;
    config += `#${(this.headlight === null ? '' : this.headlight)}`;
    config += `#${(this.taillight === null ? '' : this.taillight)}`;
    config += `#${(this.units)}`;
    config += `#${(this.timeFormat)}`;

    return config;
  }

  getLightInfo(light, lightModes, serialNumber, additionalLightModes) {
    if (!light) {
      return '';
    }

    let config = `${this.getNumberArray(lightModes)}:`;
    if (serialNumber != null && !this.useIndividualNetwork) {
      var long = bigint(serialNumber);
      config += `${long.shiftRight(31)},${long.and(0x7FFFFFFF)}`;
    }

    config += `:${this.getNumberArray(additionalLightModes)}`;

    return config;
  }

  getNumberArray(value) {
    if (value == null) {
      return '';
    }

    return `${value[0]},${value[1]}`;
  }

  getIndividualNetworkConfigurationValue(device, headlightData, taillightData) {
    if (!device || !device.highMemory) {
      return '';
    }

    let config = '#';
    config += this.useIndividualNetwork ? '1' : '0';
    config += ':';
    config += this.headlight === null || this.headlightDeviceNumber === null || !this.useIndividualNetwork ? '' : `${this.headlightDeviceNumber}!${headlightData.manualModeTracking ? 1 : 0}`;
    config += ':';
    config += this.taillight === null || this.taillightDeviceNumber === null || !this.useIndividualNetwork ? '' : `${this.taillightDeviceNumber}!${taillightData.manualModeTracking ? 1 : 0}`;

    return config;
  }

  getForceSmartModeConfigurationValue(device) {
    if (!device || !device.highMemory) {
      return '';
    }

    let config = '#';
    config += this.headlight === null || !this.headlightForceSmartMode ? '0' : '1';
    config += ':';
    config += this.taillight === null || !this.taillightForceSmartMode ? '0' : '1';

    return config;
  }

  getLightsTapBehaviorConfigurationValue(device) {
    if (!device || !device.highMemory || !isDataField()) {
      return '';
    }

    let config = '#';
    config += this.getLightTapBehaviorConfigurationValue(this.headlight, this.headlightIconTapBehavior);
    config += ':';
    config += this.getLightTapBehaviorConfigurationValue(this.taillight, this.taillightIconTapBehavior);

    return config;
  }

  getRemoteControllersConfigrationValue(device) {
    if (!device || !isDataField() || !device.highMemory) {
      return '';
    }

    let config = '#';
    const append = (value) => {
      config += value;
    }

    if (!device.profileName) {
      append('0');
      return config;
    }

    const totalControllers = this.remoteControllers.length;
    append(`${totalControllers}`);
    for (let i = 0; i < totalControllers; i++) {
      const remoteController = this.remoteControllers[i];
      append(`|${remoteController.controllerId}:${remoteController.name}!`);

      const totalButtons = remoteController.buttons.length;
      append(`${totalButtons}`);
      for (let j = 0; j < totalButtons; j++) {
        const button =  remoteController.buttons[j];
        const doubleClick = button.enableDoubleClick ? button.doubleClickDelay : 0;
        append(`|${button.buttonId}:${button.getConfigurationDeviceNumber()}:${doubleClick}!`);

        const totalActions = button.actions.length;
        append(`${totalActions}`);
        for (let k = 0; k < totalActions; k++) {
          const action = button.actions[k];
          const actionType = action.actionType;
          const toneId = action.toneId != null ? action.toneId : '';
          append(`|${actionType}:${action.triggerId}:${toneId}:`);
          if (actionType === 1 /* Cycle light modes */) {
            append(this.getLightTapBehaviorConfigurationValue(this.headlight, action.headlightTapBehavior));
            append(':');
            append(this.getLightTapBehaviorConfigurationValue(this.taillight, action.taillightTapBehavior));
          } else if (actionType === 2 /* Change light mode */) {
            append(this.headlight ? action.headlightMode.getConfigurationValue() : '');
            append(',');
            append(this.taillight ? action.taillightMode.getConfigurationValue() : '');
          } else if (actionType === 3 /* Change configuration */) {
            append(action.configurationId.toString());
          } else if (actionType === 4 /* Play tone */) {
            const toneTypeId = action.toneTypeId;
            append(`${toneTypeId}`);
            if (toneTypeId === 2 /* Custom tone */) {
              const totalTones = action.tones.length;
              append(`:${action.repeatCount}:${totalTones}`);
              action.tones.forEach(n => {
                append(`|${n.name}:${n.frequency}:${n.duration}`);
              });

              const totalToneItems = action.toneSequence.length;
              append(`!${totalToneItems}`);
              let toneIndexes = {};
              action.tones.forEach((item, idx) => toneIndexes[item.id] = idx);
              action.toneSequence.forEach(toneItem => {
                append(`|${toneIndexes[toneItem.toneId]}`);
              });
            }
          }

          append('!');

          //const totalConditions = action.conditions.length;
          //append(`${totalConditions}`);
          action.conditions.forEach(f => {
            append(`${(f.getConfigurationValue() || '')}`);
          });
        }
      }
    }

    return config;
  }

  getBikeRadarNumberValue(device, headlightData, taillightData) {
    if (!device || !device.highMemory) {
      return '';
    }

    var allowRadarSensor = (this.headlight != null && headlightData.allowRadarSensor) || (this.taillight != null && taillightData.allowRadarSensor);
    if (!allowRadarSensor || (device.nativePairing && !this.createBikeRadarConnection)) {
      return '#';
    }

    return `#${(device.nativePairing ? '0' : (this.bikeRadarNumber || ''))}`;
  }

  getLightTapBehaviorConfigurationValue(light, lightIconTapBehavior) {
    if (!light || !lightIconTapBehavior) {
      return '123!';
    }

    var controlModes = lightIconTapBehavior.controlModes || [];
    var lightModes = lightIconTapBehavior.lightModes || [];
    let config = '';
    config += controlModes.length ? controlModes.map(m => m + 1).join('') : '0';
    config += '!';
    config += controlModes.indexOf(2) >= 0 && lightModes.length ? lightModes.join(',') : '';

    return config;
  }

  getLightPanelOrSettingsConfigurationValue(lightPanel, lightSettings, device) {
    if (!device || !device.highMemory) {
      return '';
    }

    if (device.settings && lightSettings) {
      return this.getLightSettingsConfigurationValue(lightSettings);
    }

    if (device.touchScreen && lightPanel) {
      return this.getLightPanelConfigurationValue(lightPanel);
    }

    return '#';
  }

  getLightSettingsConfigurationValue(lightSettings) {
    const lightName = lightSettings.lightName ? lightSettings.lightName : '';
    const totalButtons = lightSettings.buttons.length;
    let buttons = '';
    for (let i = 0; i < lightSettings.buttons.length; i++) {
      const button = lightSettings.buttons[i];
      buttons += `!${button.name}:${button.mode}`;
    }

    return `#${totalButtons}:${lightName}${buttons}`;
  }

  getLightPanelConfigurationValue(lightPanel) {
    const lightName = lightPanel.lightName ? lightPanel.lightName : '';
    const buttonColor = lightPanel.buttonColor ? lightPanel.buttonColor : 0;
    const buttonTextColor = lightPanel.buttonTextColor != null ? lightPanel.buttonTextColor : 0xFFFFFF; /* White */
    const groupNameVisibility = lightPanel.groupNameVisibility != null ? lightPanel.groupNameVisibility : -1; /* Not visible */
    let buttonGroups = '';
    let totalButtons = 0;
    for (let i = 0; i < lightPanel.buttonGroups.length; i++) {
      const buttons = lightPanel.buttonGroups[i].buttons;
      totalButtons += buttons.length;
      buttonGroups += `!${buttons.length}`;
      for (let j = 0; j < buttons.length; j++) {
        let button = buttons[j];
        buttonGroups += `,${serializeButtonGraphics(button)}:${button.mode}`;
      }
    }

    return `#${totalButtons},${lightPanel.buttonGroups.length}:${lightName}:${buttonColor}:${buttonTextColor}:${groupNameVisibility}${buttonGroups}`;
  }

  getFilterGroupsConfigurationValue(filterGroups, defaultMode) {
    if (!filterGroups.length && defaultMode === null) {
      return '';
    }

    let config = '';
    let totalFilters = 0;
    let totalGroups = filterGroups.length;
    let defaultGroupConfig = ''
    if (defaultMode !== null) {
      totalFilters++;
      totalGroups++;
      defaultGroupConfig = `!${getDefaultGroupConfigurationValue(defaultMode)}`;
    }

    filterGroups.forEach(g => {
      totalFilters += g.filters.length;
      config += `!${g.getConfigurationValue()}`;
    });

    return `${totalFilters},${totalGroups}${config}${defaultGroupConfig}`;
  }

  getTotalLights = () => {
    var num = 0;
    if (this.headlight) {
      num++;
    }

    if (this.taillight) {
      num++;
    }

    return num;
  }

  setDevice = (value) => {
    this.device = value;
  }

  setUnits = (value) => {
    this.units = value;
  }

  setTimeFormat = (value) => {
    this.timeFormat = value;
  }

  setHeadlight = (value) => {
    this.headlight = value;
  }

  setHeadlightModes = (value) => {
    this.headlightModes = value;
  }

  setHeadlightDefaultMode = (value) => {
    this.headlightDefaultMode = value;
  }

  setHeadlightPanel = (value) => {
    this.headlightPanel = value;
  }

  setHeadlightSettings = (value) => {
    this.headlightSettings = value;
  }

  setHeadlightForceSmartMode = (value) => {
    this.headlightForceSmartMode = value;
  }

  setHeadlightIconTapBehavior = (value) => {
    this.headlightIconTapBehavior = value;
  }

  setTaillight = (value) => {
    this.taillight = value;
  }

  setTaillightModes = (value) => {
    this.taillightModes = value;
  }

  setTaillightDefaultMode = (value) => {
    this.taillightDefaultMode = value;
  }

  setTaillightPanel = (value) => {
    this.taillightPanel = value;
  }

  setTaillightSettings = (value) => {
    this.taillightSettings = value;
  }

  setUseIndividualNetwork = (value) => {
    this.useIndividualNetwork = value;
  }

  setHeadlightDeviceNumber = (value) => {
    this.headlightDeviceNumber = value;
  }

  setTaillightDeviceNumber = (value) => {
    this.taillightDeviceNumber = value;
  }

  setHeadlightSerialNumber = (value) => {
    this.headlightSerialNumber = Number.isNaN(value) ? null : value;
  }

  setHeadlightAdditionalModes = (value) => {
    this.headlightAdditionalModes = value;
  }

  setTaillightSerialNumber = (value) => {
    this.taillightSerialNumber = Number.isNaN(value) ? null : value;
  }

  setTaillightAdditionalModes = (value) => {
    this.taillightAdditionalModes = value;
  }

  setTaillightForceSmartMode = (value) => {
    this.taillightForceSmartMode = value;
  }

  setTaillightIconTapBehavior = (value) => {
    this.taillightIconTapBehavior = value;
  }

  setBikeRadarNumber = (value) => {
    this.bikeRadarNumber = value;
  }

  setCreateBikeRadarConnection = (value) => {
    this.createBikeRadarConnection = value;
  }
}
