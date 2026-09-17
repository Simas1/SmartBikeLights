import React from 'react';
import WbSunnyOutlined from '@mui/icons-material/WbSunnyOutlined';
import { ReactComponent as Headlight } from '../icons/light-modes/headlight.svg';
import { ReactComponent as Taillight } from '../icons/light-modes/taillight.svg';
import { ReactComponent as Night } from '../icons/light-modes/night.svg';
import { ReactComponent as Flash } from '../icons/light-modes/flash.svg';

const icons = { headlight: Headlight, taillight: Taillight, moon: Night, lightning: Flash };

export default function LightModeIcon({ icon, size = 24 }) {
  if (icon === 'sun') return <WbSunnyOutlined aria-hidden="true" style={{ width: size, height: size }} />;
  const Icon = icons[icon];
  return Icon ? <Icon width={size} height={size} stroke="currentColor" aria-hidden="true" focusable="false" style={{ flexShrink: 0 }} /> : null;
}
