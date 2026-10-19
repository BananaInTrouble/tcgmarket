import type { Bounds, DrawCtx, Species } from './style.ts';
import { ellipse, facetSky, facets, gem, hsl, mix, prng, type Light, type Pt } from './lowpoly.ts';

/**
 * Koiluna (low-poly) : deux carpes koï célestes, l'une d'ivoire, l'autre d'encre et d'or, qui tournent sans fin
 * autour d'une lune (composition en yin-yang), dans un bassin céleste la nuit.
 */
const CX = 111, CY = 112;

/** Squelette en arc autour de la lune : point, tangente et normale extérieure à u ∈ [0,1]. */
function frame(u: number): { p: Pt; t: Pt; o: Pt } {
  const at = (v: number): Pt => {
    const a = ((166 + 138 * v) * Math.PI) / 180, R = 64 + Math.sin(v * Math.PI * 1.4) * 5;
    return [CX + Math.cos(a) * R, CY + Math.sin(a) * R];
  };
  const p = at(u), q = at(u + 0.01), l = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
  const t: Pt = [(q[0] - p[0]) / l, (q[1] - p[1]) / l];
  const o: Pt = [p[0] - CX, p[1] - CY], ol = Math.hypot(o[0], o[1]);
  return { p, t, o: [o[0] / ol, o[1] / ol] };
}
/** Point du corps : u le long, k décalage vers l'extérieur (dos) si positif. */
const at = (u: number, k: number): Pt => { const { p, o } = frame(u); return [p[0] + o[0] * k, p[1] + o[1] * k]; };
const prof = (u: number) => (u < 0.1 ? 6 + Math.sqrt(u / 0.1) * 10 : u < 0.34 ? 16 + ((u - 0.1) / 0.24) * 2.5 : 18.5 - Math.pow((u - 0.34) / 0.52, 1.25) * 14.5);

function koi(c: DrawCtx, base: string, patch: string, patch2: string, fin: string, dark: boolean, seed: number): string {
  const light: Light = { dir: [0, 0, 1], color: '#FFF6E0', shade: dark ? '#02010A' : '#3A3A70', rim: dark ? '#C9B8FF' : '#BFF6FF' };
  // Lumière venant de la lune (vers l'intérieur de l'arc) : direction locale selon la position du poisson.
  const mid = frame(0.4).o;
  light.dir = [-mid[0] * 0.8, -mid[1] * 0.8, 0.6];
  const tb = 0.86;
  let s = '';
  // Nageoire caudale voilée : deux lobes.
  const { p: bp, t: bt, o: bo } = frame(tb);
  for (const sg of [1, -1]) {
    const q = (a: number, b: number): Pt => [bp[0] + bt[0] * a + bo[0] * b * sg, bp[1] + bt[1] * a + bo[1] * b * sg];
    s += facets([q(-2, 0), q(8, 9), q(20, 26), q(36, 38), q(52, 40), q(56, 34), q(46, 22), q(44, 10), q(30, 4), q(18, 0)], fin, light, { size: 7.8, relief: 0.4, seed: seed + (sg > 0 ? 1 : 2), opacity: 0.92 });
  }
  // Nageoires pectorales (côté ventre, vers la lune) et dorsale.
  for (const [u, len, wid] of [[0.17, 26, 9], [0.46, 13, 5], [0.66, 10, 4]] as const) {
    const b0 = at(u, -prof(u) * 0.75), { t, o } = frame(u);
    const tip: Pt = [b0[0] + t[0] * len * 0.85 - o[0] * len * 0.55, b0[1] + t[1] * len * 0.85 - o[1] * len * 0.55];
    s += facets([b0, [b0[0] - o[0] * wid + t[0] * 4, b0[1] - o[1] * wid + t[1] * 4], tip, [b0[0] + t[0] * wid * 1.3, b0[1] + t[1] * wid * 1.3]], fin, light, { size: 5.2, relief: 0.3, seed: seed + 10 + u * 10 });
  }
  const dors: Pt[] = [];
  for (let i = 0; i <= 8; i++) { const u = 0.28 + i * 0.042; dors.push(at(u, prof(u) - 1)); }
  for (let i = 8; i >= 0; i--) { const u = 0.3 + i * 0.042; dors.push(at(u + 0.02, prof(u) + 12 - i * 0.9)); }
  s += facets(dors, fin, light, { size: 6.5, relief: 0.3, seed: seed + 20 });
  // Corps.
  const body: Pt[] = [];
  for (let i = 0; i <= 24; i++) { const u = (i / 24) * tb; body.push(at(u, prof(u) * 1.05)); }
  for (let i = 24; i >= 0; i--) { const u = (i / 24) * tb; body.push(at(u, -prof(u) * 0.9)); }
  body.push(at(-0.012, 0));
  s += facets(body, base, light, { size: 7.8, relief: 1.4, seed: seed + 30 });
  // Taches de koï (facettes plates translucides).
  for (const [u, k, rx, ry, col] of [[0.07, 3, 9, 6, patch], [0.3, 6, 15, 10, patch], [0.5, -3, 10, 8, patch2], [0.62, 6, 8, 5, patch], [0.42, 12, 5, 4, patch2]] as [number, number, number, number, string][]) {
    const [x, y] = at(u, k), { t } = frame(u);
    s += facets(ellipse(x, y, rx, ry, 10, Math.atan2(t[1], t[0])), col, light, { size: 5.2, relief: 0.5, seed: seed + 40 + u * 100, opacity: 0.85 });
  }
  // Œil (petit cercle sombre + reflet), barbillons.
  const [ex, ey] = at(0.06, 3.5);
  s += `<circle cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" r="3" fill="${dark ? '#E9C25B' : '#FFB86B'}"/><circle cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" r="1.8" fill="#0B0618"/><circle cx="${(ex - 0.8).toFixed(1)}" cy="${(ey - 0.8).toFixed(1)}" r="0.7" fill="#FFFFFF"/>`;
  const m = at(0, -2), { t: t0, o: o0 } = frame(0);
  for (const sg of [1, -1.4]) s += `<path d="M${m[0].toFixed(1)} ${m[1].toFixed(1)} L${(m[0] - t0[0] * 7 + o0[0] * sg * 5).toFixed(1)} ${(m[1] - t0[1] * 7 + o0[1] * sg * 5).toFixed(1)} L${(m[0] - t0[0] * 2).toFixed(1)} ${(m[1] - t0[1] * 2).toFixed(1)} Z" fill="${dark ? '#E9C25B' : mix(base, '#3A2A50', 0.4)}"/>`;
  // Perles d'or le long du dos.
  for (const u of [0.14, 0.22, 0.3]) { const [x, y] = at(u, prof(u) * 0.55); s += gem(x, y, 2, '#FFFFFF', '#E9C25B'); }
  return s;
}

const draw = (c: DrawCtx): string => {
  const h = c.hue;
  let s = '';
  // Lune facettée : disque crème, mers plus sombres, cratères.
  const moonL: Light = { dir: [-0.5, -0.5, 0.7], color: '#FFFFFF', shade: hsl(h + 20, 25, 50) };
  s += `<circle cx="${CX}" cy="${CY}" r="44" fill="#FFF6D8" opacity="0.12"/><circle cx="${CX}" cy="${CY}" r="36" fill="#FFF6D8" opacity="0.18"/>`;
  s += facets(ellipse(CX, CY, 31, 31, 24), '#F1E8D0', moonL, { size: 9.1, relief: 1.4, seed: 3 });
  for (const [x, y, rx, ry] of [[-10, -8, 11, 7], [6, 8, 9, 6], [10, -14, 5, 3.5], [-13, 12, 5, 4]] as const) s += facets(ellipse(CX + x, CY + y, rx, ry, 10), hsl(h, 20, 74), moonL, { size: 5.2, relief: 0.3, seed: x + 50, opacity: 0.75 });
  for (const [x, y, rr] of [[-16, -16, 3.2], [12, 16, 2.4], [16, -4, 2], [-20, 4, 1.5]] as const) s += `<circle cx="${CX + x}" cy="${CY + y}" r="${rr}" fill="${hsl(h + 10, 18, 62)}" opacity="0.8"/><circle cx="${CX + x - rr * 0.3}" cy="${CY + y - rr * 0.3}" r="${rr * 0.55}" fill="#FFFDF0" opacity="0.7"/>`;
  // Les deux carpes.
  s += koi(c, '#F1E6CE', hsl(h + 150, 60, 52), '#E9C25B', hsl(h + 140, 40, 80), false, 100);
  s += `<g transform="rotate(180 ${CX} ${CY})">${koi(c, hsl(h + 20, 40, 16), '#E9C25B', hsl(h, 35, 62), hsl(h + 20, 35, 30), true, 200)}</g>`;
  // Constellations d'or.
  const cst = (pts: Pt[]) => `<polyline points="${pts.map((p) => p.join(',')).join(' ')}" fill="none" stroke="#E9C25B" stroke-width="0.7" opacity="0.85"/>` + pts.map(([x, y]) => gem(x, y, 2.6, '#FFFFFF', '#E9C25B')).join('');
  s += cst([[22, 30], [34, 22], [46, 28]]) + cst([[176, 200], [190, 192], [202, 200]]);
  return s;
};

/** Décor : bassin céleste la nuit vu d'en haut, reflets d'étoiles, nénuphars facettés, lotus, alevins. */
const scene = (c: DrawCtx, b: Bounds): string => {
  const r = prng(55 + c.stage);
  let s = facetSky(b.x0, b.y0, b.x1, b.y1, ['#0A1A33', '#0E2A48', '#123A55', '#0C2440', '#06101F'], 13, 24);
  // Ondes concentriques et reflet de lune.
  s += `<circle cx="${CX}" cy="${CY}" r="98" fill="#BFF6FF" opacity="0.05"/><circle cx="${CX}" cy="${CY}" r="72" fill="#FFF6D8" opacity="0.06"/>`;
  for (const rr of [92, 106, 120]) s += `<circle cx="${CX}" cy="${CY}" r="${rr}" fill="none" stroke="#BFF6FF" stroke-width="0.6" opacity="${(0.22 - (rr - 92) * 0.005).toFixed(2)}"/>`;
  for (let i = 0; i < 30; i++) { const x = b.x0 + r() * (b.x1 - b.x0), y = b.y0 + r() * (b.y1 - b.y0); s += `<path d="M${(x - 2).toFixed(1)} ${y.toFixed(1)} h4 l-2 0.8 Z" fill="#DFFBFF" opacity="${(0.3 + r() * 0.5).toFixed(2)}"/>`; }
  // Nénuphars (disque échancré) et lotus.
  const padL: Light = { dir: [-0.5, -0.5, 0.7], color: '#BFF6C8', shade: '#02100C' };
  const pad = (x: number, y: number, rr: number, rot: number, seed: number) => {
    const pts: Pt[] = [[x, y]];
    for (let i = 0; i <= 16; i++) { const a = rot + 0.35 + (i / 16) * (Math.PI * 2 - 0.7); pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.85]); }
    return facets(pts, '#1E5A46', padL, { size: Math.max(5, rr / 3), relief: 0.5, seed });
  };
  const lotus = (x: number, y: number, k: number) => {
    let o = '';
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; o += `<path d="M${x} ${y} L${(x + Math.cos(a - 0.25) * 6 * k).toFixed(1)} ${(y + Math.sin(a - 0.25) * 6 * k).toFixed(1)} L${(x + Math.cos(a) * 13 * k).toFixed(1)} ${(y + Math.sin(a) * 13 * k).toFixed(1)} Z" fill="${i % 2 ? '#F6E2EE' : '#E8B8D8'}"/><path d="M${x} ${y} L${(x + Math.cos(a + 0.25) * 6 * k).toFixed(1)} ${(y + Math.sin(a + 0.25) * 6 * k).toFixed(1)} L${(x + Math.cos(a) * 13 * k).toFixed(1)} ${(y + Math.sin(a) * 13 * k).toFixed(1)} Z" fill="${i % 2 ? '#D9A6C8' : '#C58AB6'}"/>`; }
    return o + gem(x, y, 4 * k, '#FFF6D8', '#E9C25B');
  };
  s += pad(b.x0 + 18, b.y0 + 24, 28, 0.5, 1) + pad(b.x0 + 54, b.y0 + 8, 15, 3.4, 2) + lotus(b.x0 + 24, b.y0 + 34, 1.1);
  s += pad(b.x1 - 18, 214, 30, 3.6, 3) + pad(b.x1 - 56, 236, 16, 0.3, 4) + pad(b.x1 - 8, 172, 12, 2.4, 5) + lotus(b.x1 - 28, 206, 1.2);
  s += pad(b.x1 - 8, b.y0 + 36, 16, 2.8, 6) + pad(b.x0 + 8, 196, 18, -0.3, 7) + lotus(b.x0 + 14, 190, 0.7);
  s += pad(60, 268, 26, 1, 8) + pad(170, 290, 22, 2, 9);
  // Alevins-étoiles.
  for (const [x, y, a] of [[190, 70, 120], [198, 80, 130], [184, 84, 110], [30, 150, -60], [24, 140, -50]] as const) {
    const rad = (a * Math.PI) / 180, dx = Math.cos(rad), dy = Math.sin(rad);
    s += `<path d="M${x} ${y} L${(x - dx * 6 - dy * 2).toFixed(1)} ${(y - dy * 6 + dx * 2).toFixed(1)} L${(x - dx * 6 + dy * 2).toFixed(1)} ${(y - dy * 6 - dx * 2).toFixed(1)} Z" fill="#BFF6FF" opacity="0.8"/><circle cx="${(x - dx * 7).toFixed(1)}" cy="${(y - dy * 7).toFixed(1)}" r="1.2" fill="#FFE27A"/>`;
  }
  return s;
};

export const koiluna: Species = Object.assign(draw, { scene });
