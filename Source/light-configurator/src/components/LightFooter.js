import React from 'react';
import Typography from '@mui/material/Typography';
import AppCheckbox from '../inputs/AppCheckbox';
import ElementWithHelp from './ElementWithHelp';

export default function LightFooter({ className, showFooter, setShowFooter }) {
  return <>
    <Typography className={className} variant="h5">Footer</Typography>
    <ElementWithHelp
      element={<AppCheckbox label="Show Footer" value={showFooter} setter={setShowFooter} />}
      help="Show the footer with the light name and battery status, plus controls to switch configurations and open Settings."
    />
  </>;
}
