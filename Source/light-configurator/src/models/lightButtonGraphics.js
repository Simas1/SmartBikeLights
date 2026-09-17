// Keep the existing panel wire format. Older apps display these as label lines.
// Icons are explicit metadata, never inferred from a user-editable mode name.
export const buttonIcons = [
  { id: 'none', name: 'None' },
  { id: 'sun', name: 'Sun' },
  { id: 'headlight', name: 'Headlight' },
  { id: 'taillight', name: 'Taillight' },
  { id: 'moon', name: 'Night' },
  { id: 'lightning', name: 'Flash' }
];

export function parseButtonGraphics(value) {
  const result = { name: value, lumens: null, runtimeHours: null, icon: 'none' };
  if (!value) return result;
  const lines = value.split('\\n');
  const icon = lines[lines.length - 1];
  if (buttonIcons.some(item => `@${item.id}` === icon)) {
    result.icon = lines.pop().slice(1);
  }
  const ratings = (lines[lines.length - 1] ?? '').match(/^\s*(\d+(?:\.\d+)?)lm-(\d+(?:\.\d+)?)h\s*$/);
  if (lines.length > 1 && ratings && Number(ratings[1]) > 0 && Number(ratings[2]) > 0) {
    result.lumens = Number(ratings[1]);
    result.runtimeHours = Number(ratings[2]);
    lines.pop();
  }
  result.name = lines.join('\\n').trim();
  return result;
}

export function serializeButtonGraphics(button) {
  let value = button.name ?? '';
  if (Number.isFinite(button.lumens) && button.lumens > 0 &&
      Number.isFinite(button.runtimeHours) && button.runtimeHours > 0) {
    value += `\\n${button.lumens}lm-${button.runtimeHours}h`;
  }
  if (button.icon && button.icon !== 'none') value += `\\n@${button.icon}`;
  return value;
}
