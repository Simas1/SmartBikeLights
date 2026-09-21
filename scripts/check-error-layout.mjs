// Exercise the actual Monkey C layout code with a recording drawing context.
// These checks cover wrapping/fallback; device font rasterization needs the SDK.
// Run: node scripts/check-error-layout.mjs
import fs from 'node:fs';
import assert from 'node:assert/strict';
const source = fs.readFileSync(new URL('../Source/SmartBikeLights/source-common/ErrorDisplay.mc', import.meta.url), 'utf8');
function extract(name) {
  const start = source.indexOf(`function ${name}(`);
  assert(start >= 0);
  let end = source.indexOf('{', start), depth = 0;
  do {
    if (source[end] === '{') depth++;
    if (source[end] === '}') depth--;
    end++;
  } while (depth);
  return source.slice(start, end).replace(/\.length\(\)/g, '.length').replace(/\.size\(\)/g, '.length');
}
Object.defineProperty(String.prototype, 'equals', {value(other) { return String(this) === other; }});
Object.defineProperty(Array.prototype, 'add', {value(item) { this.push(item); }});
Object.defineProperty(Array.prototype, 'addAll', {value(items) { this.push(...items); }});
const display = new Function('Graphics', ['describe','wrap','draw'].map(extract).join('\n') + '\nreturn {describe,wrap,draw};')({TEXT_JUSTIFY_CENTER:1});
function dc(fontHeight=22, charWidth=10) {
  return {
    calls:[], getFontHeight:()=>fontHeight,
    getTextWidthInPixels:text=>text.length*charWidth,
    drawText(x,y,font,text) { this.calls.push({x,y,text,width:text.length*charWidth}); }
  };
}
for (const [width,height,font,char] of [[282,470,22,10],[246,322,18,8],[480,800,34,15]]) {
  for (let code=1;code<=12;code++) {
    const ctx=dc(font,char);
    assert(display.draw(ctx,code,null,true,width,height,width/2,height/2),`Full-screen E${code} at ${width}x${height}`);
    assert(ctx.calls.some(c=>c.text.startsWith('Fix:')));
    for (const c of ctx.calls) {
      assert(c.x-c.width/2>=8 && c.x+c.width/2<=width-8);
      assert(c.y>=8 && c.y+font<=height-8);
    }
  }
}
for (let code=1;code<=12;code++) {
  const ctx=dc();
  assert.equal(display.draw(ctx,code,null,false,100,50,50,25),false);
  assert.equal(ctx.calls.length,0,'Fallback must not leave partially drawn messages');
}
const compact=dc();
assert(display.draw(compact,3,[3,'Taillight','Panel group 1, button 2 uses unsupported mode 7.'],false,282,110,141,55));
assert.deepEqual(compact.calls.map(c=>c.text),['Error 3 - Taillight','Unsupported mode']);
const wrappedCompact=dc();
assert(display.draw(wrappedCompact,8,null,false,246,160,123,80));
assert(wrappedCompact.calls.map(c=>c.text).join(' ').includes('Remote controller'));
assert(!wrappedCompact.calls.some(c=>c.text.startsWith('Fix:')));
const detail=dc();
assert(display.draw(detail,3,[3,'Taillight','Panel group 1, button 2 uses unsupported mode 7.'],true,282,470,141,235));
assert(detail.calls.map(c=>c.text).join(' ').includes('unsupported mode 7.'));
const stale=dc();
assert(display.draw(stale,10,[3,'Taillight','Old panel error'],true,282,470,141,235));
assert(stale.calls[0].text.includes('Radar'));
assert(!stale.calls.some(c=>c.text.includes('Old panel')));
const unknown=dc();
assert.equal(display.draw(unknown,99,null,true,282,470,141,235),false);
assert.equal(unknown.calls.length,0);
assert.equal(display.wrap(dc(), 'Unbreakable', 10),null);
console.log('Error layout checks passed: all 12 codes, three full-screen sizes, compact context, code-only fallback and stale-context protection.');
