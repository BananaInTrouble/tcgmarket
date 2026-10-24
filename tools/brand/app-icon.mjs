// Logo de l'appli : la marque Pack Rush (étoile de cristal filante dans un anneau) aux couleurs de TCGMarket
// (vert profond, vert vif, or). Écrit mobile/assets/logo.svg, src/components/logoSvg.ts et les icônes PNG.
// Lancer : node tools/brand/app-icon.mjs
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const require = createRequire(new URL('../catalog/package.json', import.meta.url));
const sharp = require('sharp');
const root = new URL('../../mobile/', import.meta.url).pathname;

const DEEP = '#0A1F17', DEEP2 = '#133325', GREEN = '#3CCB7F', GREEN_DARK = '#1A7D4C', GREEN_LIGHT = '#A8F2C8', GOLD = '#F5C542', GOLD_LIGHT = '#FFE8A3';

function crystal(cx, cy, s, light, mid, dark) {
  const tips = [[0, -1], [1.05, 0.05], [0.95, 1.45], [-0.9, 0.12]];
  const waists = [[0.22, -0.2], [0.26, 0.3], [-0.12, 0.3], [-0.24, -0.16]];
  const P = (p) => `${(cx + p[0] * s).toFixed(1)} ${(cy + p[1] * s).toFixed(1)}`;
  let out = '';
  for (let i = 0; i < 4; i++) {
    const t = tips[i], a = waists[(i + 3) % 4], b = waists[i];
    out += `<path d="M${P([0, 0])} L${P(a)} L${P(t)} Z" fill="${i % 2 ? mid : light}"/>`;
    out += `<path d="M${P([0, 0])} L${P(t)} L${P(b)} Z" fill="${i % 2 ? dark : mid}"/>`;
  }
  const outline = [0, 1, 2, 3].flatMap((i) => [tips[i], waists[i]]).map((p, i) => `${i ? 'L' : 'M'}${P(p)}`).join(' ') + 'Z';
  return out + `<path d="${outline}" fill="none" stroke="${GOLD_LIGHT}" stroke-opacity="0.9" stroke-width="${(s * 0.04).toFixed(2)}" stroke-linejoin="round"/>`;
}

/** Marque (anneau d'or, traînée verte, cristal vert serti d'or), centrée en (cx, cy), rayon r. */
function mark(cx, cy, r, mono) {
  const g = mono ? '#FFFFFF' : GOLD, gl = mono ? '#FFFFFF' : GOLD_LIGHT, gr = mono ? '#FFFFFF' : GREEN;
  const lines = [0, 1, 2].map((i) => `<path d="M${cx - r * 0.95} ${cy + r * (0.15 + i * 0.22)} h${r * (0.7 - i * 0.18)}" stroke="${gr}" stroke-width="${r * 0.08}" stroke-linecap="round" opacity="${1 - i * 0.25}"/>`).join('');
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${g}" stroke-width="${r * 0.09}"/>
    <circle cx="${cx}" cy="${cy}" r="${r * 0.83}" fill="none" stroke="${gl}" stroke-width="${r * 0.025}" opacity="0.6"/>${lines}
    ${mono ? crystal(cx + r * 0.12, cy - r * 0.1, r * 0.5, '#FFFFFF', '#FFFFFF', '#FFFFFF') : crystal(cx + r * 0.12, cy - r * 0.1, r * 0.5, GREEN_LIGHT, GREEN, GREEN_DARK)}`;
}

const defs = `<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${DEEP2}"/><stop offset="1" stop-color="${DEEP}"/></linearGradient>
  <radialGradient id="halo" cx="50%" cy="48%" r="50%"><stop offset="0" stop-color="${GREEN}" stop-opacity="0.28"/><stop offset="1" stop-color="${GREEN}" stop-opacity="0"/></radialGradient></defs>`;
const svg = ({ rounded = true, r = 66, bg = true, mono = false } = {}) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">${defs}${bg ? `<rect width="200" height="200" rx="${rounded ? 46 : 0}" fill="url(#bg)"/><circle cx="100" cy="100" r="${r * 1.25}" fill="url(#halo)"/>` : ''}${mark(100, 100, r, mono)}</svg>`;

const logo = svg();
writeFileSync(join(root, 'assets/logo.svg'), logo);
writeFileSync(join(root, 'src/components/logoSvg.ts'), `/** Logo TCGMarket (marque Pack Rush aux couleurs de l'appli) : icône en SVG (source : tools/brand/app-icon.mjs). */
export const LOGO_SVG = \`data:image/svg+xml;utf8,\${encodeURIComponent(${JSON.stringify(logo)})}\`;
`);
const png = (s, size, file) => sharp(Buffer.from(s), { density: 72 * size / 200 * 2 }).resize(size, size).png().toFile(join(root, 'assets', file));
// Icônes plein cadre (le système arrondit les coins) ; marque réduite pour la zone sûre des icônes « maskable ».
await png(svg({ rounded: false, r: 62 }), 1024, 'icon.png');
await png(svg({ rounded: false, r: 62 }), 180, 'apple-touch-icon.png');
await png(svg({ rounded: false, r: 56 }), 192, 'pwa-192.png');
await png(svg({ rounded: false, r: 56 }), 512, 'pwa-512.png');
await png(svg({ rounded: true, r: 70 }), 48, 'favicon.png');
await png(svg({ bg: false, r: 70 }), 1024, 'splash-icon.png');
await png(svg({ bg: false, r: 50 }), 512, 'android-icon-foreground.png');
await png(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">${defs}<rect width="200" height="200" fill="url(#bg)"/></svg>`, 512, 'android-icon-background.png');
await png(svg({ bg: false, r: 50, mono: true }), 512, 'android-icon-monochrome.png');
console.log('icônes écrites');
