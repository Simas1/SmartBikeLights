import React from 'react';
import { ReactComponent as Sun } from '../icons/light-modes/sun.svg';
import { ReactComponent as Night } from '../icons/light-modes/night.svg';
import { ReactComponent as Flash } from '../icons/light-modes/flash.svg';

import { ReactComponent as HeadlightHigh } from '../icons/light-modes/headlight-high.svg';
import { ReactComponent as HeadlightMedium } from '../icons/light-modes/headlight-medium.svg';
import { ReactComponent as HeadlightLow } from '../icons/light-modes/headlight-low.svg';
import { ReactComponent as TaillightHigh } from '../icons/light-modes/taillight-high.svg';
import { ReactComponent as TaillightMedium } from '../icons/light-modes/taillight-medium.svg';
import { ReactComponent as TaillightLow } from '../icons/light-modes/taillight-low.svg';

const icons = { 'headlight-high': HeadlightHigh, 'headlight-medium': HeadlightMedium, 'headlight-low': HeadlightLow, 'taillight-high': TaillightHigh, 'taillight-medium': TaillightMedium, 'taillight-low': TaillightLow,  sun: Sun, moon: Night, lightning: Flash };

export default function LightModeIcon({ icon, size = 24 }) {
  const Icon = icons[icon];
  return Icon ? <Icon width={size} height={size} stroke="currentColor" aria-hidden="true" focusable="false" style={{ flexShrink: 0 }} /> : null;
}
