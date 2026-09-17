// Requires Node.js and sharp. Run from any directory:
//   node scripts/generate-control-mode-fonts.cjs
// SVGs are the source of truth; ControlMode.sfd is a legacy letter-based font.
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const app = path.resolve(__dirname, '../Source/SmartBikeLights');
const glyphs = [['M', 'manual'], ['N', 'network'], ['S', 'smart'], ['P', 'power']];
// Existing filenames describe historical font sizes, not bitmap heights.
const fonts = {ControlMode12: 12, ControlMode18: 19, ControlMode32: 19,
    ControlMode54: 32, PanelControl24: 24, PanelControl40: 40, ModeIcons12: 12, ModeIcons18: 18};
const powerOfTwo = n => 2 ** Math.ceil(Math.log2(n));

async function main() {
    const webIcons = path.resolve(app, '../light-configurator/src/icons/light-modes');
    fs.mkdirSync(webIcons, {recursive: true});
    for (const icon of ['headlight', 'taillight', 'night', 'flash', 'sun']) {
        fs.copyFileSync(path.join(app, 'assets/light-modes', icon + '.svg'), path.join(webIcons, icon + '.svg'));
    }
    for (const [name, size] of Object.entries(fonts)) {
        const modeFont = name.startsWith('ModeIcons');
        const fontGlyphs = modeFont ? [['H', 'headlight'], ['T', 'taillight'], ['N', 'night'], ['F', 'flash']] : glyphs;
        const width = powerOfTwo((size + 1) * fontGlyphs.length);
        const height = powerOfTwo(size);
        const images = [];
        const chars = [];
        for (const [index, [char, icon]] of fontGlyphs.entries()) {
            const artwork = modeFont ? path.join('light-modes', icon + '.svg')
                : icon === 'power' ? 'power/power.svg' : path.join('control-mode', icon + '.svg');
            const svg = fs.readFileSync(path.join(app, 'assets', artwork), 'utf8')
                .replace(/#000000/g, '#FFFFFF');
            // Supersample before downscaling so tiny strokes retain coverage.
            let input = await sharp(Buffer.from(svg), {density: 768})
                .resize(size, size).png().toBuffer();
            if (!modeFont) {
                // Binary coverage avoids faint grey fringes on MIP displays.
                const alpha = await sharp(input).extractChannel('alpha').threshold(112).toBuffer();
                input = await sharp({create: {width: size, height: size, channels: 3, background: '#FFFFFF'}})
                    .joinChannel(alpha).png().toBuffer();
            }
            const x = index * (size + 1);
            images.push({input, left: x, top: 0});
            chars.push(`char id=${char.charCodeAt(0)} x=${x} y=0 width=${size} height=${size} xoffset=0 yoffset=0 xadvance=${size} page=0 chnl=15`);
        }
        await sharp({create: {width, height, channels: 4, background: {r: 255, g: 255, b: 255, alpha: 0}}})
            .composite(images).png().toFile(path.join(app, 'resources/fonts', name + '.png'));
        const fnt = [
            `info face="ControlMode" size=${size} bold=0 italic=0 charset="" unicode=1 stretchH=100 smooth=1 aa=1 padding=0,0,0,0 spacing=1,1 outline=0`,
            `common lineHeight=${size} base=${size} scaleW=${width} scaleH=${height} pages=1 packed=0 alphaChnl=0 redChnl=4 greenChnl=4 blueChnl=4`,
            `page id=0 file="${name}.png"`, `chars count=${fontGlyphs.length}`, ...chars, ''
        ].join('\n');
        fs.writeFileSync(path.join(app, 'resources/fonts', name + '.fnt'), fnt);
        console.log(`${name}: ${size}px, ${fontGlyphs.map(([char]) => char).join("/")}`);
    }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
