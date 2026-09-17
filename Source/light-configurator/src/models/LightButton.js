import { makeAutoObservable } from 'mobx';
import { nanoid } from 'nanoid';
import { parseButtonGraphics, buttonIcons } from './lightButtonGraphics';

export default class LightButton {
  id;
  mode = null;
  name = null;
  lumens = null;
  runtimeHours = null;
  icon = 'none';

  constructor() {
    this.id = nanoid();
    makeAutoObservable(this, {
      id: false
    });
  }

  setMode = (value) => {
    this.mode = value;
  }

  setName = (value) => {
    this.name = value;
  }

  loadPanelName = (value) => {
    Object.assign(this, parseButtonGraphics(value));
  }

  setLumens = (value) => { this.lumens = Number.isNaN(value) ? null : value; }
  setRuntimeHours = (value) => { this.runtimeHours = Number.isNaN(value) ? null : value; }
  setIcon = (value) => { this.icon = value ?? 'none'; }

  isValid(lightData) {
    const validRatings = this.mode <= 0 || ((this.lumens == null && this.runtimeHours == null) ||
      (Number.isFinite(this.lumens) && this.lumens > 0 && Number.isFinite(this.runtimeHours) && this.runtimeHours > 0));
    return validRatings && buttonIcons.some(item => item.id === this.icon) && this.mode != null && lightData != null && (this.mode < 0 || (this.name && lightData.modes.find(m => m.id === this.mode) !== undefined));
  }
}
