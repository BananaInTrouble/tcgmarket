import type { Bounds, DrawCtx, Species } from './style.ts';
import { curve, ellipse, facetSky, facets, gem, hsl, limb, mix, prng, type Light, type Pt } from './lowpoly.ts';

/**
 * Pangolune (low-poly) : pangolin à demi enroulé sur la lèvre d'un cratère, cuirassé d'écailles de pierre de lune
 * qui s'entrouvrent sur une lueur intérieure ; seule sa tête curieuse dépasse de la boule. Paysage lunaire sous
 * une planète bleue qui se lève.
 */

/** Polygone depuis un tracé SVG absolu simple (M, L, C, Z). */
function poly(d: string, step = 5): Pt[] {
  const t = d.match(/[MLCZ]|-?\d*\.?\d+/g) ?? [];
  let i = 0, cmd = 'M', start: Pt = [0, 0], cur: Pt = [0, 0];
  const segs: [Pt, Pt, Pt][] = [];
  const num = () => +t[i++];
  while (i < t.length) {
    if (/[MLCZ]/.test(t[i])) cmd = t[i++];
    if (cmd === 'Z') continue;
    if (cmd === 'M') { start = cur = [num(), num()]; cmd = 'L'; continue; }
    if (cmd === 'L') { const p: Pt = [num(), num()]; segs.push([cur, p, p]); cur = p; }
    else { const c1: Pt = [num(), num()], c2: Pt = [num(), num()], p: Pt = [num(), num()]; segs.push([c1, c2, p]); cur = p; }
  }
  return curve(start, segs, step);
}
const flat = (p: Pt[], fill: string, op = 1) => `<path d="M${p.map((q) => `${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join('L')}Z" fill="${fill}"${op < 1 ? ` opacity="${op}"` : ''}/>`;

/** Centre de la boule et sol (lèvre du cratère). */
const C: Pt = [124, 136];
const GROUND = 196;

/** Écaille (bouclier arrondi pointé vers l'arrière) centrée en p, orientée selon la tangente t (vers la queue). */
function scale(p: Pt, t: Pt, len: number, wid: number): Pt[] {
  const n: Pt = [-t[1], t[0]], P = (a: number, b: number): Pt => [p[0] + t[0] * a + n[0] * b, p[1] + t[1] * a + n[1] * b];
  return [P(-len * 0.45, 0), P(-len * 0.38, wid * 0.36), P(-len * 0.1, wid * 0.5), P(len * 0.25, wid * 0.4), P(len * 0.55, 0), P(len * 0.25, -wid * 0.4), P(-len * 0.1, -wid * 0.5), P(-len * 0.38, -wid * 0.36)];
}

const draw = (c: DrawCtx): string => {
  const h = c.hue;
  const moon = hsl(h - 30, 28, 80), moon2 = hsl(h + 5, 38, 56), skin = hsl(h + 30, 22, 46), skinD = hsl(h + 30, 30, 24), gold = '#E9C25B';
  const light: Light = { dir: [0.45, -0.7, 0.6], color: '#F2F8FF', shade: '#0A0A26', rim: '#9FD8FF' };
  const far: Light = { ...light, color: mix('#F2F8FF', skinD, 0.5), rim: undefined };
  const r = prng(23 + c.stage);
  let s = '';

  // Ombre portée et lueur intérieure (les écailles s'entrouvrent sur une lumière de lune).
  s += `<ellipse cx="${C[0] - 6}" cy="${GROUND + 2}" rx="74" ry="7" fill="#05030C" opacity="0.5" filter="url(#b4)"/>`;
  s += `<circle cx="${C[0]}" cy="${C[1]}" r="66" fill="#CFE6FF" opacity="0.12" filter="url(#b8)"/>`;
  // Masse du corps (dessous de peau), queue qui revient vers l'avant au sol.
  s += facets(ellipse(C[0], C[1] + 2, 54, 52, 26), skinD, far, { size: 11, relief: 1.1, seed: 1 });
  const tail = (u: number): Pt => { const a = (Math.PI / 180) * (50 + u * 95), R = 50 - u * 8; return [C[0] + Math.cos(a) * R * 1.05, Math.min(GROUND - 6 + u * 2, C[1] + Math.sin(a) * R)]; };
  const tsp: Pt[] = Array.from({ length: 8 }, (_, i) => tail(i / 7));
  s += facets(limb(tsp, [26, 25, 24, 22, 19, 16, 12, 8]), skin, light, { size: 7, relief: 0.8, seed: 2 });

  // Écailles du dos : rangées concentriques le long de la courbe, de la queue vers la tête (la tête recouvre).
  const rows: [number, number, number][] = [[6, 10, 9], [15, 10, 9], [24, 11, 9], [34, 13, 11], [44, 15, 13], [54, 16, 14]];
  for (const [R, len, wid] of rows) {
    const n = Math.round((R * Math.PI * 1.45) / (len * 0.62));
    for (let i = n; i >= 0; i--) {
      const u = i / n, a = (Math.PI / 180) * (168 + u * 250), p: Pt = [C[0] + Math.cos(a) * R, C[1] + Math.sin(a) * R * 0.97];
      if (p[1] > GROUND - 4) continue;
      const t: Pt = [-Math.sin(a), Math.cos(a)];
      const col = mix(moon, moon2, 0.15 + r() * 0.35 + (R < 20 ? 0.25 : 0));
      s += facets(scale(p, t, len, wid), col, light, { size: 5.5, relief: 0.9, seed: R * 100 + i, base2: mix(col, moon2, 0.35) });
      if (r() < 0.22) s += gem(p[0] + t[0] * len * 0.2, p[1] + t[1] * len * 0.2, 1.4 + r() * 1.2, '#FFFFFF', '#BFE4FF');
    }
  }
  // Écailles de la queue.
  for (let i = 7; i >= 1; i--) {
    const u = i / 7.5, p = tail(u), q = tail(u + 0.05), l = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1, t: Pt = [(q[0] - p[0]) / l, (q[1] - p[1]) / l];
    for (const k of [-0.3, 0.3]) {
      const w = 24 * (1 - u * 0.6), pp: Pt = [p[0] - t[1] * w * k, p[1] + t[0] * w * k];
      s += facets(scale(pp, t, 12 - u * 4, 10 - u * 3), mix(moon, moon2, 0.3 + r() * 0.3), light, { size: 5, relief: 0.8, seed: 500 + i * 3 + k * 10 });
    }
  }
  // Fente lumineuse entre les rangées (écailles entrouvertes).
  s += `<path d="M${C[0] - 36} ${C[1] - 8} A38 37 0 0 1 ${C[0] + 30} ${C[1] - 26}" fill="none" stroke="#E8F6FF" stroke-width="1.4" opacity="0.5" filter="url(#b2)"/>`;
  // Constellation d'or sur la cuirasse.
  const cst: Pt[] = [[108, 92], [124, 86], [140, 92], [152, 104]];
  s += `<polyline points="${cst.map((p) => p.join(',')).join(' ')}" fill="none" stroke="${gold}" stroke-width="0.7" opacity="0.85"/>` + cst.map(([x, y]) => gem(x, y, 2.4, '#FFFFFF', gold)).join('');

  // Tête qui sort de la boule, museau effilé vers le sol, oreille, œil.
  s += facets(poly('M96 138 C88 132 76 134 68 142 C58 152 48 166 42 178 C40 182 42 184 46 182 C56 176 70 170 82 168 C94 166 102 158 102 150 C102 144 100 140 96 138 Z', 4), skin, light, { size: 6, relief: 1.1, seed: 3, base2: mix(skin, skinD, 0.3) });
  s += facets(poly('M80 140 C76 136 72 136 70 140 C72 144 76 146 80 144 Z', 3), skinD, far, { size: 3, seed: 4 });
  // Petites écailles du front.
  for (const [x, y, a] of [[88, 140, 2.6], [80, 146, 2.5], [92, 148, 2.4]] as const) s += facets(scale([x, y], [Math.cos(a), Math.sin(a)], 9, 8), mix(moon, moon2, 0.2), light, { size: 4, relief: 0.6, seed: x + y });
  s += `<circle cx="72" cy="153" r="2.6" fill="#0B0618"/><circle cx="72.3" cy="153.3" r="1.6" fill="${hsl(h + 60, 85, 66)}"/><circle cx="72.3" cy="153.3" r="0.8" fill="#0B0618"/><circle cx="71.4" cy="152.4" r="0.7" fill="#FFFFFF"/>`;
  s += `<circle cx="43.5" cy="180" r="1.3" fill="#1A1028"/>`;
  // Patte avant griffue posée au sol.
  s += facets(limb([[94, 166], [90, 182], [86, GROUND - 3]], [11, 9, 8]), skin, light, { size: 4.5, relief: 0.6, seed: 5 });
  for (const dx of [-7, -3, 1]) s += flat([[86 + dx, GROUND - 4], [80 + dx * 1.2, GROUND], [83 + dx, GROUND - 1.5]], '#E8E2F2');
  return s;
};

/** Décor : mer lunaire, lèvre d'un cratère au premier plan, cratères lointains, planète bleue levante, poussière de lune. */
const scene = (c: DrawCtx, b: Bounds): string => {
  const h = c.hue;
  const r = prng(61 + c.stage);
  let s = facetSky(b.x0, b.y0, b.x1, b.y1, ['#05061A', '#0A0E2A', '#121838', '#1A2248', '#10142E', '#080A1C'], 41, 30);
  for (let i = 0; i < 60; i++) s += `<circle cx="${(b.x0 + r() * (b.x1 - b.x0)).toFixed(1)}" cy="${(b.y0 + r() * 170).toFixed(1)}" r="${(0.3 + r() * 1.1).toFixed(2)}" fill="#FFF6E8" opacity="${(0.35 + r() * 0.65).toFixed(2)}"/>`;
  for (let i = 0; i < 8; i++) s += gem(b.x0 + r() * (b.x1 - b.x0), b.y0 + r() * 140, 1.3 + r() * 2.2, '#FFFFFF', '#BFD7FF');
  // Planète bleue qui se lève (en croissant éclairé).
  const P: Pt = [184, 52];
  const pl: Light = { dir: [-0.6, -0.3, 0.6], color: '#E8F8FF', shade: '#06102A' };
  s += `<circle cx="${P[0]}" cy="${P[1]}" r="50" fill="#7FB8FF" opacity="0.14" filter="url(#b8)"/>`;
  s += facets(ellipse(P[0], P[1], 36, 36, 24), hsl(h - 40, 55, 46), pl, { size: 9, relief: 1.6, seed: 5, base2: hsl(h - 20, 50, 30) });
  for (const [x, y, rx, ry] of [[-10, -12, 12, 6], [8, 6, 14, 5], [-16, 12, 8, 4]] as const) s += facets(ellipse(P[0] + x, P[1] + y, rx, ry, 10, 0.3), '#E8F4FF', pl, { size: 5, relief: 0.3, seed: x + 40, opacity: 0.45 });
  s += `<path d="M${P[0] + 6} ${P[1] - 36} A36 36 0 0 1 ${P[0] + 6} ${P[1] + 36} A30 36 0 0 0 ${P[0] + 6} ${P[1] - 36} Z" fill="#05061A" opacity="0.45"/>`;
  // Petite lune sœur en croissant, et traînée de comète lointaine.
  s += `<circle cx="44" cy="84" r="20" fill="#FFF6D8" opacity="0.1" filter="url(#b4)"/><path d="M44 70 A14 14 0 1 0 54 94 A11 13 0 1 1 44 70 Z" fill="#F4EED8" opacity="0.9"/>`;
  s += `<path d="M110 30 L60 54" stroke="#CFE6FF" stroke-width="1" opacity="0.4" stroke-linecap="round"/>` + gem(110, 30, 2.6, '#FFFFFF', '#BFD7FF');
  // Plaine lunaire lointaine avec cratères.
  const rego: Light = { dir: [0.5, -0.7, 0.5], color: '#E8ECFF', shade: '#0A0A22' };
  s += facets([[b.x0, 170], [30, 164], [70, 168], [110, 160], [160, 166], [200, 158], [b.x1, 162], [b.x1, 210], [b.x0, 210]], '#4A4E72', rego, { size: 22, relief: 0.6, seed: 11, base2: '#2E3254' });
  for (const [x, y, rx] of [[26, 176, 18], [178, 172, 22], [92, 168, 10]] as const) {
    s += `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${rx * 0.22}" fill="#1A1C38" opacity="0.7"/><path d="M${x - rx} ${y} A${rx} ${rx * 0.22} 0 0 1 ${x + rx} ${y}" fill="none" stroke="#C8D0F0" stroke-width="0.9" opacity="0.6"/>`;
  }
  // Lèvre du cratère au premier plan et pente vers le fond du cratère (en bas à droite).
  s += facets([[b.x0, GROUND - 2], [40, GROUND - 6], [100, GROUND - 4], [160, GROUND - 6], [210, GROUND - 2], [b.x1, GROUND], [b.x1, b.y1], [b.x0, b.y1]], '#7A7EA6', rego, { size: 20, relief: 0.5, seed: 21, base2: '#2A2C4C' });
  s += facets([[b.x0, GROUND - 2], [40, GROUND - 6], [100, GROUND - 4], [160, GROUND - 6], [210, GROUND - 2], [b.x1, GROUND], [b.x1, GROUND + 8], [100, GROUND + 6], [b.x0, GROUND + 6]], '#A8ACD0', rego, { size: 10, relief: 0.3, seed: 22 });
  s += facets(ellipse(150, 268, 110, 34, 20), '#2A2C4C', rego, { size: 18, relief: -0.6, seed: 23, base2: '#16182E' });
  s += `<path d="M40 268 A110 34 0 0 1 260 268" fill="none" stroke="#C8D0F0" stroke-width="1" opacity="0.5"/>`;
  // Cailloux et poussière de lune.
  for (const [x, y, rr] of [[18, 208, 6], [196, 210, 8], [210, 202, 4], [60, 214, 4]] as const) s += facets(ellipse(x, y, rr, rr * 0.6, 9), '#8A8EB4', rego, { size: 4, relief: 0.9, seed: x });
  for (let i = 0; i < 30; i++) s += `<circle cx="${(b.x0 + r() * (b.x1 - b.x0)).toFixed(1)}" cy="${(GROUND + r() * 60).toFixed(1)}" r="${(0.4 + r() * 0.8).toFixed(2)}" fill="#E8F0FF" opacity="${(0.3 + r() * 0.5).toFixed(2)}"/>`;
  return s;
};

export const pangolune: Species = Object.assign(draw, { scene });
