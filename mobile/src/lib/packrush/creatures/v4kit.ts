import { bloom, eyeGlow, hsl, softShadow, strands, vol, type DrawCtx, type Palette } from './style.ts';

/**
 * Outils de rendu « 3D » (V4) pour lynxaure, phenova, serpentaire et meteorgolem : mêmes signatures que les outils
 * au trait (ink, line, shadow, fur, eyeA, rim, gild, constellation…), mais chaque forme devient un volume modelé
 * par la lumière (`vol`), les traits sombres deviennent des plis d'ombre douce, les traits clairs des filets de
 * lumière, les marques dorées et constellations brillent. Appeler `setKit` au début de chaque dessin (ids uniques).
 */

let P = 'kit', N = 0, rimC = '#7FE3FF', hiC = '#FFF4E0';
let pal: Palette = { ink: '#140F24', body: '#888', shade: '#555', light: '#ccc', belly: '#ddd', accent: '#f0f', accent2: '#0ff', glow: '#ffe', eye: '#fd6', deep: '#112', gold: '#E9C25B' };

/** Prépare un dessin : préfixe des ids (`<espèce>-<stade>`), palette et couleur de la lumière de contour. */
export function setKit(prefix: string, p: Palette, rimColor: string, hi = '#FFF4E0'): void {
  P = prefix; N = 0; pal = p; rimC = rimColor; hiC = hi;
}

export const uid = () => `${P}-v${N++}`;
export const rimColor = () => rimC;

const DARK = new Set(['#140F24', '#1A1230', '#05030C', '#0A0508']);
const isDark = (col: string) => DARK.has(col) || col === pal.ink || col === pal.deep;
const f = (v: number) => +v.toFixed(1);

/** Volume modelé (remplace l'aplat cerné). Les formes sombres restent des aplats (cavités, pupilles…). */
export function ink(d: string, fill: string, w = 2.4, extra = '', o: { light?: [number, number]; ao?: number; rim?: string } = {}): string {
  if (fill === 'none') return `<path d="${d}" fill="none" stroke="${rimC}" stroke-width="0.8" opacity="0.45"${extra}/>`;
  if (isDark(fill)) return `<path d="${d}" fill="${fill}"${extra}/>`;
  if (w === 0) return `<path d="${d}" fill="${fill}" opacity="0.9"${extra}/>`;
  const v = vol(uid(), d, fill, { hi: hiC, lo: pal.deep, rim: o.rim ?? rimC, ao: o.ao ?? 0.6, light: o.light });
  return extra ? `<g${extra}>${v}</g>` : v;
}

/** Trait sombre → pli d'ombre doux ; trait clair → filet de lumière. */
export function line(d: string, w = 1.8, color = '#1A1230', extra = ''): string {
  if (isDark(color)) return `<path d="${d}" fill="none" stroke="#05030C" stroke-width="${f(w * 1.3)}" stroke-linecap="round" stroke-linejoin="round" opacity="0.3"/>`;
  return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${f(w * 2.4)}" stroke-linecap="round" opacity="0.35" filter="url(#b2)"/>`
    + `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`;
}

/** Ombre propre : zone sombre fondue (plus de hachures). */
export const shadow = (d: string, color: string, opacity = 0.9, _hatch = 'fine') =>
  `<path d="${d}" fill="${isDark(color) ? '#05030C' : color}" opacity="${f(opacity * 0.75)}" filter="url(#b4)"/>`;

/** Pelage / plumes : brins de lumière. */
export function fur(c: DrawCtx, x: number, y: number, len: number, angle: number, count: number, spread = 6, color = '#140F24', w = 0.9): string {
  return strands(c, x, y, len, angle, count, spread * 2, isDark(color) ? pal.light : color, f(w * 0.75));
}

export function eyeA(x: number, y: number, w: number, iris: string, opts: { angle?: number; slit?: boolean; open?: number } = {}): string {
  return eyeGlow(uid(), x, y, w * 1.05, iris, opts);
}

/** Lumière de contour (filet lumineux + halo). */
export const rim = (d: string, color: string, w = 1.6) =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${f(w * 2.6)}" stroke-linecap="round" opacity="0.4" filter="url(#b2)"/>`
  + `<path d="${d}" fill="none" stroke="${color}" stroke-width="${f(w * 0.6)}" stroke-linecap="round" opacity="0.9"/>`;

/** Filigrane d'or qui brille. */
export const gild = (d: string, w = 1.2) =>
  `<path d="${d}" fill="none" stroke="#FFD27A" stroke-width="${f(w * 3)}" stroke-linecap="round" opacity="0.45" filter="url(#b2)"/>`
  + `<path d="${d}" fill="none" stroke="#FFF1C4" stroke-width="${f(w * 0.8)}" stroke-linecap="round" stroke-linejoin="round"/>`;

/** Constellation lumineuse. */
export function constellation(pts: [number, number][], color = '#FFF6D8'): string {
  return `<polyline points="${pts.map((p) => `${f(p[0])},${f(p[1])}`).join(' ')}" fill="none" stroke="${color}" stroke-width="0.7" opacity="0.55"/>`
    + pts.map(([x, y], i) => `<circle cx="${f(x)}" cy="${f(y)}" r="${i % 2 ? 2.6 : 3.6}" fill="${color}" opacity="0.4" filter="url(#b2)"/><circle cx="${f(x)}" cy="${f(y)}" r="${i % 2 ? 0.9 : 1.3}" fill="#FFFFFF"/>`).join('');
}

/** Étincelle lumineuse (sans contour). */
export function sparkle(x: number, y: number, s: number, fill = '#FFF6D8', _stroke = true): string {
  const k = s * 0.2;
  const d = `M${f(x)} ${f(y - s)} Q${f(x + k)} ${f(y - k)} ${f(x + s)} ${f(y)} Q${f(x + k)} ${f(y + k)} ${f(x)} ${f(y + s)} Q${f(x - k)} ${f(y + k)} ${f(x - s)} ${f(y)} Q${f(x - k)} ${f(y - k)} ${f(x)} ${f(y - s)}Z`;
  return `<circle cx="${f(x)}" cy="${f(y)}" r="${f(s * 1.2)}" fill="${fill}" opacity="0.45" filter="url(#b2)"/><path d="${d}" fill="${fill}"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(s * 0.22)}" fill="#FFFFFF"/>`;
}

/** Ombre portée au sol. */
export const ground = (x: number, y: number, rx: number) => softShadow(`M${f(x - rx)} ${f(y)} a${f(rx)} ${f(rx * 0.16)} 0 1 0 ${f(2 * rx)} 0 a${f(rx)} ${f(rx * 0.16)} 0 1 0 ${f(-2 * rx)} 0`, 0.6, 'b4');

export { bloom, hsl };
