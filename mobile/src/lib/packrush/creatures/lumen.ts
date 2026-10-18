/**
 * Outils de rendu « 3D » lumineux (V4) partagés par lumikit, noctimoth, medusel et hibouclipse. Ils gardent les
 * signatures des anciens outils au trait (`ink`, `line`, `shadow`, `fur`, `eyeA`, `gild`, `rim`…) mais dessinent
 * en volumes modelés par la lumière (`vol`), ombres douces, brins lumineux et yeux incandescents, sans cerne noir.
 * Appeler `begin()` au début de chaque dessin (préfixe d'ids unique par carte, couleur de contour, lumière).
 */
import { bloom, eyeGlow, strands, vol, type DrawCtx } from './style.ts';

const n = (v: number) => +v.toFixed(1);
const INKS = new Set(['#140F24', '#1A1230', '#140f24', '#1a1230', '#0A0508']);
let ctr = 0, PFX = 'lumen', RIM = '#7FE8E0', FUR = '#FFFFFF', LIGHT: [number, number] = [0.3, 0.22];

/** Démarre un dessin : préfixe des ids, lumière de contour, couleur des brins, position de la lumière. */
export function begin(prefix: string, rimColor: string, furColor: string, light: [number, number] = [0.3, 0.22]): void {
  ctr = 0; PFX = prefix; RIM = rimColor; FUR = furColor; LIGHT = light;
}
export const uid = (k = 'v') => `${PFX}-${k}${ctr++}`;

/** Couleur → [h, s, l, a]. Accepte hsla()/hsl() et #rrggbb. */
function parse(col: string): [number, number, number, number] | null {
  const m = col.match(/hsla?\(\s*([-\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%(?:\s*,\s*([\d.]+))?\)/);
  if (m) return [+m[1], +m[2], +m[3], m[4] ? +m[4] : 1];
  const h = col.match(/^#([0-9a-f]{6})$/i);
  if (!h) return null;
  const r = parseInt(h[1].slice(0, 2), 16) / 255, g = parseInt(h[1].slice(2, 4), 16) / 255, b = parseInt(h[1].slice(4, 6), 16) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  let hh = 0, s = 0;
  if (d) {
    s = d / (1 - Math.abs(2 * l - 1));
    hh = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    hh *= 60;
  }
  return [hh, s * 100, l * 100, 1];
}
/** Variante d'une couleur : décalage de luminosité, de saturation et de teinte. */
export function tone(col: string, dl: number, ds = 0, dh = 0): string {
  const p = parse(col);
  if (!p) return col;
  const [h, s, l, a] = p;
  const cl = (v: number) => Math.max(0, Math.min(100, v));
  return `hsla(${Math.round(((h + dh) % 360 + 360) % 360)},${cl(s + ds).toFixed(0)}%,${cl(l + dl).toFixed(0)}%,${a})`;
}

/** Volume modelé (remplace l'aplat cerné). `fill` 'none' : rien (les contours n'existent plus). */
export function ink(d: string, fill: string, w = 1, extra = ''): string {
  if (fill === 'none') return '';
  if (INKS.has(fill)) return `<path d="${d}" fill="#0B0614"${extra}/>`;
  const base = tone(fill, -6, 10);
  const v = vol(uid(), d, base, { light: LIGHT, hi: tone(fill, 26, 20, -6), lo: tone(fill, -40, 28, 22), rim: w > 0 ? RIM : undefined, ao: 0.6 });
  return extra ? `<g${extra}>${v}</g>` : v;
}

/** Trait : les traits d'encre deviennent des plis d'ombre doux ; les traits colorés deviennent des filets lumineux. */
export function line(d: string, w = 1, color = '#140F24', extra = ''): string {
  if (INKS.has(color)) return `<path d="${d}" fill="none" stroke="#05030C" stroke-width="${n(w * 1.4)}" stroke-linecap="round" opacity="0.28" filter="url(#b2)"${extra.replace(/opacity="[\d.]+"/, '')}/>`;
  return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${n(w)}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`;
}

/** Ombre propre : tache sombre floutée (plus de hachures). */
export const shadow = (d: string, color: string, op = 0.8, _h = '') =>
  `<path d="${d}" fill="${tone(color, -12, 12)}" opacity="${n(op * 0.7)}" filter="url(#b2)"/>`;

/** Brins de pelage lumineux. */
export function fur(c: DrawCtx, x: number, y: number, len: number, angle: number, count: number, spread = 6, color = '#140F24', w = 0.9): string {
  return strands(c, x, y, len * 1.1, angle, count + 2, spread * 1.4, INKS.has(color) ? FUR : color, Math.max(0.6, w * 0.8));
}

/** Œil incandescent. */
export const eyeA = (x: number, y: number, w: number, iris: string, o: { angle?: number; slit?: boolean; open?: number } = {}) =>
  eyeGlow(uid('e'), x, y, w, iris, o);

/** Filigrane d'or lumineux. */
export const gild = (d: string, w = 1.2) =>
  `<path d="${d}" fill="none" stroke="#FFC861" stroke-width="${n(w * 2.6)}" stroke-linecap="round" opacity="0.55" filter="url(#b2)"/>`
  + `<path d="${d}" fill="none" stroke="#FFF1C2" stroke-width="${n(w * 0.7)}" stroke-linecap="round" stroke-linejoin="round"/>`;

/** Lumière de contour (filet + halo). */
export const rim = (d: string, color: string, w = 1.6) =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${n(w * 3)}" stroke-linecap="round" opacity="0.45" filter="url(#b2)"/>`
  + `<path d="${d}" fill="none" stroke="${color}" stroke-width="${n(w * 0.7)}" stroke-linecap="round" opacity="0.8"/>`;

/** Constellation lumineuse. */
export function constellation(pts: [number, number][], color = '#FFF6D8'): string {
  return `<polyline points="${pts.map((p) => `${n(p[0])},${n(p[1])}`).join(' ')}" fill="none" stroke="${color}" stroke-width="0.7" opacity="0.6"/>`
    + pts.map(([x, y], i) => `<circle cx="${n(x)}" cy="${n(y)}" r="${i % 2 ? 2.6 : 3.4}" fill="${color}" opacity="0.5" filter="url(#b2)"/><circle cx="${n(x)}" cy="${n(y)}" r="${i % 2 ? 1 : 1.4}" fill="#FFFFFF"/>`).join('');
}

/** Étincelle lumineuse (sans cerne). */
export function sparkle(x: number, y: number, s: number, fill = '#FFF6D8', _stroke = false): string {
  const k = s * 0.2;
  const d = `M${n(x)} ${n(y - s)} Q${n(x + k)} ${n(y - k)} ${n(x + s)} ${n(y)} Q${n(x + k)} ${n(y + k)} ${n(x)} ${n(y + s)} Q${n(x - k)} ${n(y + k)} ${n(x - s)} ${n(y)} Q${n(x - k)} ${n(y - k)} ${n(x)} ${n(y - s)}Z`;
  return `<circle cx="${n(x)}" cy="${n(y)}" r="${n(s * 0.9)}" fill="${fill}" opacity="0.6" filter="url(#b2)"/><path d="${d}" fill="#FFFFFF" opacity="0.95"/>`;
}

/** Ombre portée douce au sol. */
export const ground = (x: number, y: number, rx: number) =>
  `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(rx)}" ry="${n(rx * 0.14)}" fill="#05030C" opacity="0.6" filter="url(#b4)"/>`;

/** Halo derrière la créature. */
export const aura = (x: number, y: number, r: number, color: string) => bloom(x, y, r * 0.8, color, 0.35);

/** Retire les cernes d'encre restés en attributs dans du SVG écrit à la main. */
export const unink = (s: string) => s
  .replace(/ stroke="#(?:140F24|1A1230|140f24)" stroke-width="[\d.]+"(?: stroke-linejoin="round")?(?: stroke-opacity="[\d.]+")?/g, '')
  .replace(/ stroke="#(?:140F24|1A1230)"/g, ' stroke="none"');
