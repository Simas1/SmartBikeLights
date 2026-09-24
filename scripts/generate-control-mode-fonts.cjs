// Requires Node.js and sharp. Run from any directory:
//   node scripts/generate-control-mode-fonts.cjs
// SVGs are the source of truth for the current card icons.
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const app = path.resolve(__dirname, '../Source/SmartBikeLights');
const glyphs = [['M', 'manual'], ['N', 'network'], ['S', 'smart'], ['P', 'power']];
// Existing filenames describe historical font sizes, not bitmap heights.
const fonts = {PanelControl24: 24, PanelControl40: 40, ModeIcons12: 12, ModeIcons18: 18, ModeIcons22: 22, ModeIcons28: 28, ModeIcons36: 36};
// Optional --font=ModeIcons28 regenerates just one atlas.
const selectedFont = process.argv.find(arg => arg.startsWith('--font='))?.slice(7);
const powerOfTwo = n => 2 ** Math.ceil(Math.log2(n));

async function main() {
    const webIcons = path.resolve(app, '../light-configurator/src/icons/light-modes');
    fs.mkdirSync(webIcons, {recursive: true});
    for (const icon of ((process.argv.includes('--panel-only') || selectedFont) ? [] : ['headlight-high', 'headlight-medium', 'headlight-low', 'taillight-high', 'taillight-medium', 'taillight-low', 'night', 'flash', 'sun'])) {
        fs.copyFileSync(path.join(app, 'assets/button-icons', icon + '.svg'), path.join(webIcons, icon + '.svg'));
    }
    for (const [name, size] of Object.entries(fonts)) {
        if (selectedFont && name !== selectedFont) { continue; }
        if (process.argv.includes('--panel-only') && name !== 'PanelControl24') { continue; }
        const modeFont = name.startsWith('ModeIcons');
        const fontGlyphs = modeFont ? [['H', 'headlight-high'], ['h', 'headlight-medium'], ['L', 'headlight-low'], ['T', 'taillight-high'], ['t', 'taillight-medium'], ['l', 'taillight-low'], ['N', 'night'], ['F', 'flash'], ['S', 'sun'], ['C', 'time']] : glyphs;
        const width = powerOfTwo((size + 1) * fontGlyphs.length);
        const height = powerOfTwo(size);
        const images = [];
        const chars = [];
        for (const [index, [char, icon]] of fontGlyphs.entries()) {
            const artwork = modeFont ? path.join('button-icons', icon + '.svg')
                : path.join('control-icons', icon + '.svg');
            const svg = fs.readFileSync(path.join(app, 'assets', artwork), 'utf8')
                .replace(/#000000/g, '#FFFFFF');
            // The 24px panel artwork is rasterized directly at its authored size.
            // Other fonts retain their existing supersampled generation.
            let input = name === 'PanelControl24'
                ? await sharp(Buffer.from(svg)).png().toBuffer()
                : await sharp(Buffer.from(svg), {density: 768}).resize(size, size).png().toBuffer();
            if (name === 'PanelControl24') {
                const metadata = await sharp(input).metadata();
                if (metadata.width !== size || metadata.height !== size) {
                    throw new Error(`${artwork} must be exactly ${size}x${size}`);
                }
            }
            const x = index * (size + 1);
            images.push({input, left: x, top: 0});
            chars.push(`char id=${char.charCodeAt(0)} x=${x} y=0 width=${size} height=${size} xoffset=0 yoffset=0 xadvance=${size} page=0 chnl=15`);
        }
        const atlas = await sharp({create: {width, height, channels: 4, background: {r: 255, g: 255, b: 255, alpha: 0}}})
            .composite(images).png().toBuffer();
        // Garmin bitmap fonts need coverage in RGB intensity, not just PNG alpha.
        // Black represents no glyph coverage; grey represents a smooth edge.
        const output = sharp(atlas);
        output.flatten({background: '#000000'});
        await output.png().toFile(path.join(app, 'resources/fonts', name + '.png'));
        const fnt = [
            `info face="ControlMode" size=${size} bold=0 italic=0 charset="" unicode=1 stretchH=100 smooth=1 aa=1 padding=0,0,0,0 spacing=1,1 outline=0`,
            `common lineHeight=${size} base=${size} scaleW=${width} scaleH=${height} pages=1 packed=0 alphaChnl=0 redChnl=4 greenChnl=4 blueChnl=4`,
            `page id=0 file="${name}.png"`, `chars count=${fontGlyphs.length}`, ...chars, ''
        ].join('\n');
        fs.writeFileSync(path.join(app, 'resources/fonts', name + '.fnt'), fnt);
        console.log(`${name}: ${size}px, ${fontGlyphs.map(([char]) => char).join("/")}`);
    }
    if (!process.argv.includes('--panel-only') && !selectedFont) {
        const layers = [];
        let top = 0;
        // Show actual runtime glyph pixels, in the README's display order.
        for (const size of [12, 18, 22]) {
            for (let index = 0; index < 10; index++) {
                const input = await sharp(path.join(app, 'resources/fonts', `ModeIcons${size}.png`))
                    .extract({left: index * (size + 1), top: 0, width: size, height: size})
                    .negate().resize(size * 3, size * 3, {kernel: 'nearest'}).png().toBuffer();
                layers.push({input, left: index * (size + 1) * 3, top});
            }
            top += size * 3 + 12;
        }
        await sharp({create: {width: (23 * 10 - 1) * 3, height: top, channels: 3, background: '#FFFFFF'}})
            .composite(layers).png().toFile(path.join(app, 'assets/button-icons/preview.png'));
    }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
