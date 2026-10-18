import { bloom, eyeGlow, strands, vol, type DrawCtx, type VolOpts } from './style.ts';

/**
 * Outils de rendu « 3D » lumineux des trois mythiques (Lunaphage, Aeonis, Ophalia) : mêmes signatures que les
 * outils d'encre de style.ts, mais sans aucun cerne. Les aplats deviennent des volumes ou des surfaces sans
 * contour, les hachures des ombres douces, les traits clairs des filets lumineux, les traits sombres des plis à
 * peine marqués. `V` crée un volume modelé avec un id unique (préfixe `<espèce>-<stade>`).
 */
export function kit(c: DrawCtx, prefix: string) {
  let k = 0;
  const uid = () => `${prefix}-k${k++}`;
  const isDark = (col: string) => /^#(1A1230|140F24|0)/i.test(col);
  const n = (v: number) => +v.toFixed(1);
  const V = (d: string, base: string, o: VolOpts = {}) => vol(uid(), d, base, o);
  /** Surface sans contour (`none` = l'ancien cerne : rien). */
  const ink = (d: string, fill: string, _w = 0, extra = '') => (fill === 'none' ? '' : `<path d="${d}" fill="${fill}"${extra}/>`);
  /** Ombre douce interne (remplace les hachures). */
  const shadow = (d: string, color: string, op = 0.9, _h = '') => `<path d="${d}" fill="${color}" opacity="${n(op * 0.75)}" filter="url(#b2)"/>`;
  /** Trait clair → filet lumineux ; trait sombre → pli discret. */
  const line = (d: string, w = 1.8, color = '#1A1230', extra = '') => {
    if (isDark(color)) return `<path d="${d}" fill="none" stroke="#05030C" stroke-width="${n(w * 1.3)}" stroke-linecap="round" opacity="0.28" filter="url(#b2)"/>`;
    return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${n(w * 2.6)}" stroke-linecap="round" opacity="0.35" filter="url(#b2)"/>`
      + `<path d="${d}" fill="none" stroke="${color}" stroke-width="${n(w * 0.8)}" stroke-linecap="round"${extra}/>`;
  };
  /** Lumière de contour colorée. */
  const rim = (d: string, color: string, w = 1.6) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${n(w * 2.4)}" stroke-linecap="round" opacity="0.55" filter="url(#b2)"/>`
    + `<path d="${d}" fill="none" stroke="${color}" stroke-width="${n(w * 0.7)}" stroke-linecap="round" opacity="0.8"/>`;
  /** Filet d'or lumineux. */
  const gild = (d: string, w = 1.2) => `<path d="${d}" fill="none" stroke="#FFD27A" stroke-width="${n(w * 3)}" stroke-linecap="round" opacity="0.45" filter="url(#b2)"/>`
    + `<path d="${d}" fill="none" stroke="#FFF1C4" stroke-width="${n(w * 0.8)}" stroke-linecap="round" stroke-linejoin="round"/>`;
  /** Brins de lumière (pelage, plumes). Une couleur sombre devient un reflet clair. */
  const fur = (_c: DrawCtx, x: number, y: number, len: number, angle: number, count: number, spread = 6, color = '#140F24', w = 0.9) =>
    strands(c, x, y, len, angle, count, spread * 2, isDark(color) ? c.pal.light : color, w);
  const eyeA = (x: number, y: number, w: number, iris: string, o: { angle?: number; slit?: boolean; open?: number } = {}) => eyeGlow(uid(), x, y, w, iris, o);
  /** Constellation lumineuse. */
  const constellation = (pts: [number, number][], color = '#FFF6D8') =>
    `<polyline points="${pts.map((p) => `${n(p[0])},${n(p[1])}`).join(' ')}" fill="none" stroke="${color}" stroke-width="0.7" opacity="0.6"/>`
    + pts.map(([x, y], i) => bloom(x, y, 4, color, 0.6) + `<circle cx="${n(x)}" cy="${n(y)}" r="${i % 2 ? 1 : 1.5}" fill="#FFFFFF"/>`).join('');
  /** Étincelle sans cerne, avec halo. */
  const sparkle = (x: number, y: number, s: number, fill = '#FFF6D8', _st = false) => {
    const q = s * 0.2;
    return bloom(x, y, s * 1.4, fill, 0.5)
      + `<path d="M${n(x)} ${n(y - s)} Q${n(x + q)} ${n(y - q)} ${n(x + s)} ${n(y)} Q${n(x + q)} ${n(y + q)} ${n(x)} ${n(y + s)} Q${n(x - q)} ${n(y + q)} ${n(x - s)} ${n(y)} Q${n(x - q)} ${n(y - q)} ${n(x)} ${n(y - s)}Z" fill="#FFFFFF"/>`;
  };
  return { V, uid, ink, shadow, line, rim, gild, fur, eyeA, constellation, sparkle };
}
