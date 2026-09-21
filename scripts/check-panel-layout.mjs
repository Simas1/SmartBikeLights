// Host-side drawing regression check. Executes the actual Monkey C drawing
// bodies against a recording Dc with representative font metrics. This checks
// anchoring/overlap, not Garmin font rasterization or simulator execution.
// Usage: node scripts/check-panel-layout.mjs [preview-output-directory]
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const graphicsSource = read('Source/SmartBikeLights/source-common/LightPanelGraphics.mc');
const viewSource = read('Source/SmartBikeLights/source-preprocess/BikeLightsView.mc');
const stringSource = read('Source/SmartBikeLights/source-common/StringHelper.mc');

function functionBody(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert(start >= 0, `Missing ${name}`);
  let depth = 0;
  const opening = source.indexOf('{', start);
  let end = opening;
  do {
    if (source[end] === '{') depth++;
    if (source[end] === '}') depth--;
    end++;
  } while (depth > 0 && end < source.length);
  // Only the small, untyped drawing subset is executed here.
  return source.slice(start, end)
    .replace(/Rez\.Fonts\[:(\w+)\]/g, 'Rez.Fonts.$1')
    .replace(/dc has :setAntiAlias/g, 'typeof dc.setAntiAlias === \"function\"')
    .replace(/\.length\(\)/g, '.length')
    .replace(/\.size\(\)/g, '.length')
    .replace(/\.toCharArray\(\)/g, ".split('')")
    .replace('(total / 60)', 'Math.trunc(total / 60)');
}
Object.defineProperty(String.prototype, 'equals', { value(other) { return String(this) === other; } });
Object.defineProperty(Number.prototype, 'toNumber', { value() { return Math.trunc(this); } });
Object.defineProperty(Number.prototype, 'format', { value(format) {
  return format === '%02d' ? String(this).padStart(2, '0') : String(this);
} });
Object.defineProperty(Array.prototype, 'add', { value(item) { this.push(item); return this; } });
Object.defineProperty(Array.prototype, 'addAll', { value(items) { this.push(...items); return this; } });

// SDK api.mir: RIGHT=0, CENTER=1, LEFT=2 (not the usual web ordering).
const Graphics = { TEXT_JUSTIFY_RIGHT: 0, TEXT_JUSTIFY_CENTER: 1, TEXT_JUSTIFY_LEFT: 2, getFontAscent: font => [12,16,20,24,34][font] * metricScale };
let metricScale = 1;
// Default Blue theme supplied by AppTheme on the device.
const AppTheme = { accent: 0x056ABD, onDark: 0x55BBFF, muted: 0x428CCA };
const StringHelper = new Function(
  functionBody(stringSource, 'getLastSpaceIndex') +
  functionBody(stringSource, 'trimTextByWidth') +
  '\nreturn {trimTextByWidth};'
)();
const functions = ['initializeFonts', 'includeMode', 'batteryPercent', 'remainingMinutes', 'runtimeText', 'brightnessSteps', 'fitFont', 'drawIcon', 'drawMode', 'panelSettings'];
let resourceLoads = 0;
const LightPanelGraphics = new Function('Graphics', 'StringHelper', 'WatchUi', 'Rez', 'AppTheme',
  'let _modeIconsSmall, _modeIconsLarge, _modeIconsWide, _modeIconsExtra, _modeTitleFont=2, _modeTitleIconSize=18, _modeTitleIconY=0; const BLUE=0x056ABD, WHITE=0xFFFFFF, RED=0xCC2222;\n' +
  functions.map(name => functionBody(graphicsSource, name)).join('\n') +
  '\nreturn {BLUE,WHITE,RED,' + functions.join(',') + '};'
)(Graphics, StringHelper, {loadResource: id => { resourceLoads++; return id; }}, {Fonts: {modeIconsSmall: 'icons12', modeIconsLarge: 'icons18', modeIconsWide: 'icons22', modeIconsExtra: 'icons28'}}, AppTheme);
LightPanelGraphics.initializeFonts();
LightPanelGraphics.initializeFonts();
assert.equal(resourceLoads,4,'Fonts load once during setup');
resourceLoads=0;
assert(!functionBody(graphicsSource, 'drawMode').includes('loadResource'));
assert(!functionBody(graphicsSource, 'drawMode').includes('drawIcon('),'Bitmap glyphs must draw without an extra wrapper');
assert(!functionBody(graphicsSource, 'drawIcon').includes('loadResource'));
assert(!functionBody(graphicsSource, 'drawIcon').includes('drawText'),
  'Mode icons must avoid the custom-font drawing wrapper that overflows on Edge 1040');
const footer = new Function('Graphics', 'StringHelper', 'LightPanelGraphics', 'AppTheme', 'System',
  // Idle footer: no pending configuration switch or tap feedback.
  'let _panelFooter, _pendingConfig = null, _configFeedbackTime = null; function setTextColor(dc,c){dc.setColor(c,-1);}\n' +
  functionBody(viewSource, 'drawPanelBattery') + functionBody(viewSource, 'drawPanelConfiguration') +
  '\nreturn {drawPanelBattery, drawPanelConfiguration, setFooter(value){_panelFooter=value;}};'
)(Graphics, StringHelper, LightPanelGraphics, AppTheme, {getTimer: () => 0});

const escape = s => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const color = n => '#' + n.toString(16).padStart(6, '0');
class Dc {
  constructor(width, height, bg, scale = 1) {
    this.width = width; this.height = height; this.scale = scale; metricScale = scale;
    this.color = '#ffffff'; this.pen = 1; this.texts = []; this.boxes = []; this.icons = [];
    this.elements = [`<rect width="100%" height="100%" fill="${color(bg)}"/>`];
  }
  getWidth() { return this.width; }
  getFontHeight(font) { if (typeof font === 'string') return Number(font.slice(5)); return [16, 20, 24, 28, 40][font] * this.scale; }
  getTextWidthInPixels(text, font) { return text.length * this.getFontHeight(font) * 0.52; }
  setColor(value) { this.color = color(value); }
  setPenWidth(value) { this.pen = value; }
  setAntiAlias(value) { this.antialias = value; if (value) this.antialiasUsed = true; }
  fillCircle(x,y,r) { this.elements.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="${this.color}"/>`); }
  drawText(x, y, font, text, justification) {
    if (typeof font === 'string') {
      const size = this.getFontHeight(font);
      const name = {H: 'headlight-high', h: 'headlight-medium', L: 'headlight-low', T: 'taillight-high', t: 'taillight-medium', l: 'taillight-low', N: 'night', F: 'flash', C: 'time', S: 'sun'}[text];
      assert(name, 'Unknown mode icon glyph');
      const svg = read('Source/SmartBikeLights/assets/' + 'button-icons/' + name + '.svg')
        .replace(/<svg[^>]*>/, '<g fill="none" stroke="' + this.color + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">').replace('</svg>', '</g>');
      this.icons.push({x: x-size/2, y, width: size, height: size, text});
      this.elements.push(`<g transform="translate(${x-size/2} ${y}) scale(${size/48})">${svg}</g>`);
      return;
    }
    const width = this.getTextWidthInPixels(text, font), height = this.getFontHeight(font);
    const left = x - (justification === 0 ? width : justification === 1 ? width / 2 : 0);
    this.texts.push({x: left, y, width, height, text, color: this.color});
    this.elements.push(`<text x="${left}" y="${y+height*0.8}" fill="${this.color}" font-family="Arial,sans-serif" font-size="${height*0.85}" textLength="${width}" lengthAdjust="spacingAndGlyphs">${escape(text)}</text>`);
  }
  fillRectangle(x,y,w,h) { this.fillRoundedRectangle(x,y,w,h,0); }
  drawRectangle(x,y,w,h) { this.boxes.push({x,y,width:w,height:h}); this.drawRoundedRectangle(x,y,w,h,0); }
  fillRoundedRectangle(x,y,w,h,r) { this.elements.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${this.color}"/>`); }
  drawRoundedRectangle(x,y,w,h,r) { this.elements.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="none" stroke="${this.color}" stroke-width="${this.pen}"/>`); }
  drawLine(x1,y1,x2,y2) { this.elements.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${this.color}" stroke-width="${this.pen}"/>`); }
  drawCircle(x,y,r) { this.elements.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${this.color}" stroke-width="${this.pen}"/>`); }
  fillPolygon(points) { this.elements.push(`<polygon points="${points.map(p=>p.join(',')).join(' ')}" fill="${this.color}"/>`); }
  svg() { return `<svg xmlns="http://www.w3.org/2000/svg" width="${this.width*2}" height="${this.height*2}" viewBox="0 0 ${this.width} ${this.height}">${this.elements.join('')}</svg>`; }
}
function within(text, x, y, width, height) {
  assert(text.x >= x - 0.01 && text.x + text.width <= x + width + 0.01 &&
    text.y >= y - 0.01 && text.y + text.height <= y + height + 0.01,
  `Text escaped its bounds: ${JSON.stringify(text)} in ${[x,y,width,height]}`);
}
// Execute the actual panel font-selection code: a normal 32px button must
// retain the 24px panel glyph instead of falling back to the 12px status glyph.
const controlStart = viewSource.indexOf('var iconSize = (buttonHeight');
const controlEnd = viewSource.indexOf('} else if (titleFont == -1)', controlStart);
assert(controlStart >= 0 && controlEnd > controlStart);
const drawControl = new Function('dc', 'buttonHeight', 'buttonWidth', '_panelIconFont', '_controlModeFont', 'mode',
  'const titleX=50, buttonY=0, controlMode=0, $={controlModes:["S","N","M"]};' + viewSource.slice(controlStart, controlEnd));
for (const [height,width,panel,status,expected] of [[32,66,24,12,24],[50,110,40,19,40],[20,66,24,12,12]]) {
  for (const mode of [-1,0]) {
    let drawn;
    drawControl({getFontHeight: font => font, drawText: (x,y,font,text) => {drawn={x,y,font,text};}},height,width,panel,status,mode);
    assert.equal(drawn.font, expected, 'Control icon should use the largest fitting loaded font');
    assert.equal(drawn.text, mode === 0 ? 'P' : 'S');
    assert(drawn.y >= 2 && drawn.y + drawn.font <= height - 2, 'Control icon exceeds button margin');
  }
}
// Measure both columns first, including the smaller four-row rear panel.
// Verify shared typography, bounds, and a fresh larger size after reconfiguration.
for (const [width,height,scale] of [[246,322,1],[420,600,1.6],[282,470,1],[480,800,1.6]]) {
  const dc = new Dc(width,height,0xFFFFFF,scale);
  const front = [['Low',200,12,'headlight-low'],['Medium',600,4,'headlight-medium'],['High',1200,2,'headlight-high']];
  const rear = [['Night Flash',5,15,'lightning'],['Day Flash',45,12,'lightning'],['Night Steady',5,13.5,'moon'],['Day Steady',25,4.5,'sun']];
  const w = width/2-4, available = height-dc.getFontHeight(0)*5-10;
  LightPanelGraphics.initializeFonts();
  for (const modes of [front,rear]) for (const data of modes) LightPanelGraphics.includeMode(dc,data,w,available/modes.length-4);
  const labelHeights=[], iconSizes=[];
  for (const modes of [front,rear]) for (const data of modes) {
    dc.texts=[]; dc.icons=[];
    const h=available/modes.length-4;
    LightPanelGraphics.drawMode(dc,data,1200,1,0,0,w,h,false,0,0xFFFFFF);
    labelHeights.push(dc.texts[0].height); iconSizes.push(dc.icons[0].width);
    assert(dc.icons[0].width >= 18,'Mode icons must never use the tiny status glyph');
    const font = [0,1,2].find(f => dc.getFontHeight(f) === dc.texts[0].height);
    assert(Math.abs(dc.icons[0].y + dc.icons[0].height/2 - (dc.texts[0].y + Graphics.getFontAscent(font)/2)) < 0.01, 'Mode icons must center above the baseline, excluding descenders');
    within(dc.texts[0],0,0,w,h); within(dc.icons[0],0,0,w,h);
    assert(dc.icons[0].x+dc.icons[0].width<=dc.texts[0].x);
  }
  assert.equal(new Set(labelHeights).size,1,'All seven labels must use the same font');
  assert.equal(new Set(iconSizes).size,1,'All seven mode icons must use the same size');
  LightPanelGraphics.initializeFonts();
  LightPanelGraphics.includeMode(dc,front[0],width-4,height-4);
  dc.texts=[];
  LightPanelGraphics.drawMode(dc,front[0],1200,1,0,0,width-4,height-4,false,0,0xFFFFFF);
  assert.equal(dc.texts[0].height,dc.getFontHeight(2),'Panel setup must reset the shared font');
}
let cases = 0;
for (const visibility of [-1, 0, 1, 2, 3, 4]) {
  const settings = [2,2,'Front',0,0xFFFFFF,visibility,1,51,'Low',1,-2,null];
  const normalized = LightPanelGraphics.panelSettings(settings);
  assert.equal(normalized[5],visibility,'Automation-name visibility and font must survive normalization');
  assert.equal(normalized[1],1,'Configuration button still moves to footer');
  assert.equal(settings[1],2,'Saved configuration must not be mutated');
}
for (const bg of [0x000000, 0xFFFFFF]) {
  const fg = bg === 0 ? 0xFFFFFF : 0;
  for (const selected of [false, true]) for (const scale of [1, 1.25]) {
    for (const x of [2, 143]) for (const data of [['Low',200,12,'sun'],['Night Steady',5,13.5,'none'],['Long custom mode name',1200,2,'lightning'],['Front',200,12,'headlight'],['Rear',200,12,'taillight'],['Night',200,12,'moon']]) {
      for (const status of [1,4,5,7]) {
        const dc = new Dc(282,470,bg,scale);
        LightPanelGraphics.initializeFonts();
        LightPanelGraphics.includeMode(dc,data,137,96);
        LightPanelGraphics.drawMode(dc,data,1200,status,x,44,137,96,selected,fg,selected?LightPanelGraphics.BLUE:bg);
        assert.equal(dc.texts.length,3,'Name, brightness, and runtime must all remain visible');
        dc.texts.forEach(t=>within(t,x,44,137,96));
        dc.icons.forEach(icon => { within(icon,x,44,137,96); const label = icon.text === 'C' ? dc.texts[2] : dc.texts[0]; assert(icon.x+icon.width <= label.x, 'Icon overlaps label'); });
        const runtime=dc.texts[2];
        assert(runtime.height<=dc.texts[0].height,'Runtime must not be larger than the mode name');
        assert(runtime.x>=x+6+12+7,'Runtime must start after the clock');
        assert(dc.texts[1].x+dc.texts[1].width<=x+137-6+0.01,'Lumens must end inside the right padding');
        cases++;
      }
    }
  }
  for (const center of [282*.15,282*.85]) {
    const dc = new Dc(282,470,bg);
    footer.drawPanelBattery(dc,center,442,1,fg);
    dc.texts.forEach(t=>within(t,center-282*.15,426,282*.3,44));
    const text=dc.texts[0];
    assert(text.x>=dc.boxes[0].x+dc.boxes[0].width+4,'Battery label must be to the right of its icon');
  }
  const dc = new Dc(282,470,bg);
  footer.setFooter([84.6,426,112.8,44,'Flash Config']);
  footer.drawPanelConfiguration(dc,fg,bg);
  dc.texts.forEach(t=>within(t,84.6,426,112.8,44));
}
console.log(`PASS: ${cases} mode layouts; both columns, day/night, selection, low/unknown battery, long names and two font scales. Footer bounds pass.`);

if (process.argv[2]) {
  fs.mkdirSync(process.argv[2],{recursive:true});
  for(const bg of [0,0xFFFFFF]) {
    const fg=bg===0?0xFFFFFF:0,dc=new Dc(282,470,bg);
    const modes=[[['Low',200,12,'none'],['Medium',600,4,'none'],['High',1200,2,'none']],
      [['Night Flash',5,15,'none'],['Day Flash',45,12,'none'],['Night Steady',5,13.5,'none'],['Day Steady',25,4.5,'none']]];
    for(let l=0;l<2;l++) {
      for(let b=0;b<2;b++) {
        dc.setColor(b?LightPanelGraphics.BLUE:bg);dc.fillRoundedRectangle(l*141+b*70+2,2,66,30,6);
        dc.setColor(fg);dc.drawRoundedRectangle(l*141+b*70+2,2,66,30,6);
        LightPanelGraphics.drawIcon(dc,b?'power':'smart',l*141+b*70+35,17,14,b?LightPanelGraphics.BLUE:bg);
      }
      const h=390/modes[l].length;
      modes[l].forEach((data,i)=>{
        const x=l*141+2,y=36+i*h;dc.setColor(fg);dc.drawRoundedRectangle(x,y,137,h-4,6);
        LightPanelGraphics.drawMode(dc,data,l?45:1200,1,x,y,137,h-4,false,fg,bg);
      });
      dc.setColor(fg);dc.drawText(l?239.7:42.3,430,0,l?'Flare RT':'AT 1600',Graphics.TEXT_JUSTIFY_CENTER);
      footer.drawPanelBattery(dc,l?239.7:42.3,448,1,fg);
    }
    footer.setFooter([84.6,426,112.8,44,'Flash Config']);footer.drawPanelConfiguration(dc,fg,bg);
    fs.writeFileSync(path.join(process.argv[2],bg?'day.svg':'night.svg'),dc.svg());
  }
}

assert.equal(resourceLoads, 0, "Mode drawing must not load fonts");

// Every icon releases its drawing state, including on older devices without AA.
for (const icon of ['cycle']) {
  for (const supported of [true,false]) {
    const dc = new Dc(100,100,0xFFFFFF);
    if (!supported) dc.setAntiAlias = undefined;
    LightPanelGraphics.drawIcon(dc,icon,50,50,18,0xFFFFFF);
    assert.equal(dc.pen,1);
    if (supported) {
      assert.equal(dc.antialiasUsed,true);
      assert.equal(dc.antialias,false);
    }
    assert.equal(resourceLoads,0);
  }
}

for (const icon of ['sun','headlight','taillight','moon','lightning']) {
  const dc = new Dc(480,800,0xFFFFFF);
  LightPanelGraphics.initializeFonts();
  LightPanelGraphics.includeMode(dc,['Mode',200,12,icon],230,160);
  LightPanelGraphics.drawMode(dc,['Mode',200,12,icon],1200,1,0,0,230,160,false,0,0xFFFFFF);
  assert.deepEqual(dc.icons.map(i=>i.width),[28,18]);
  assert.equal(resourceLoads,0,'Wide buttons must reuse loaded fonts');
}

for (const [icon,glyph] of Object.entries({'headlight-high':'H','headlight-medium':'h','headlight-low':'L','taillight-high':'T','taillight-medium':'t','taillight-low':'l'})) {
 const dc=new Dc(282,470,0xFFFFFF);
 LightPanelGraphics.drawMode(dc,['Mode',200,12,icon],1200,1,0,0,137,96,false,0,0xFFFFFF);
 assert.equal(dc.icons[0].text,glyph);
}
