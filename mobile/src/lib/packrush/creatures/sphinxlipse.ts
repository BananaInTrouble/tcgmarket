import type { Bounds, DrawCtx, Species } from './style.ts';
import { curve, ellipse, facetSky, facets, gem, hsl, limb, mix, prng, type Light, type Pt } from './lowpoly.ts';

/**
 * Sphinxlipse (low-poly) : sphinx ailé couché de profil sur un socle, tête de lionne de face coiffée d'un némès
 * rayé d'or, ailes en faucille dressées ; une éclipse totale lui sert de diadème. Désert lunaire au crépuscule.
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
function feather(a: Pt, b: Pt, w: number): Pt[] {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
  const side = (sg: number) => [0.2, 0.45, 0.7, 0.88].map((k) => { const o = sg * w * Math.sin(Math.PI * Math.pow(k, 0.8)); return [a[0] + dx * k + nx * o, a[1] + dy * k + ny * o] as Pt; });
  return [a, ...side(1), b, ...side(-1).reverse()];
}
const flat = (p: Pt[], fill: string, op = 1) => `<path d="M${p.map((q) => `${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join('L')}Z" fill="${fill}"${op < 1 ? ` opacity="${op}"` : ''}/>`;
const shift = (p: Pt[], dx: number, dy: number) => p.map(([x, y]) => [x + dx, y + dy] as Pt);

const WING = 'M100 122 C104 100 116 82 134 72 C154 62 178 60 196 50 C204 46 210 38 212 30 C216 42 212 56 202 66 C196 84 188 104 176 122 C160 130 130 130 100 122 Z';

const draw = (c: DrawCtx): string => {
  const h = c.hue;
  const base = hsl(h, 34, 50), deep = hsl(h + 10, 40, 24), pale = hsl(h - 10, 32, 70), gold = '#E9C25B', nemesDeep = '#1E2452';
  const light: Light = { dir: [-0.2, -0.8, 0.6], color: '#FFE3B8', shade: '#120A2E', rim: '#FF9E7A' };
  const far: Light = { ...light, color: mix('#FFE3B8', deep, 0.45), rim: undefined };
  const EC: Pt = [80, 46];
  let s = '';

  // Éclipse : couronne de rayons facettés, anneau, disque noir, perle de diamant.
  s += `<circle cx="${EC[0]}" cy="${EC[1]}" r="40" fill="#FFE3B8" opacity="0.12"/><circle cx="${EC[0]}" cy="${EC[1]}" r="31" fill="#FFF6D8" opacity="0.22"/>`;
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2 + 0.05, len = 34 + (i % 4 === 0 ? 20 : i % 2 ? 4 : 11), w = i % 4 === 0 ? 0.07 : 0.045;
    const p0: Pt = [EC[0] + Math.cos(a - w) * 24, EC[1] + Math.sin(a - w) * 24], p1: Pt = [EC[0] + Math.cos(a + w) * 24, EC[1] + Math.sin(a + w) * 24], tip: Pt = [EC[0] + Math.cos(a) * len, EC[1] + Math.sin(a) * len];
    const mid: Pt = [EC[0] + Math.cos(a) * 24, EC[1] + Math.sin(a) * 24];
    s += flat([p0, tip, mid], i % 4 === 0 ? gold : '#FFF1D0', 0.85) + flat([mid, tip, p1], i % 4 === 0 ? '#B8892E' : '#E8CFA0', 0.85);
  }
  s += `<circle cx="${EC[0]}" cy="${EC[1]}" r="25.5" fill="#FFF6D8"/><circle cx="${EC[0]}" cy="${EC[1]}" r="23.5" fill="#05030A"/>`;
  s += `<circle cx="${EC[0] + 17}" cy="${EC[1] - 16}" r="5" fill="#FFFFFF" opacity="0.35"/>` + gem(EC[0] + 17, EC[1] - 16, 6, '#FFFFFF', '#FFE3B8');

  // Aile lointaine, queue, patte avant lointaine.
  s += facets(shift(poly(WING), -14, 0), deep, far, { size: 12.8, relief: 0.6, seed: 2 });
  s += facets(limb([[198, 196], [194, 210], [160, 216], [126, 212], [112, 204]], [7, 6.5, 6, 5, 4]), base, light, { size: 6.4, relief: 0.5, seed: 3 });
  s += facets(ellipse(107, 203, 7, 6, 9), deep, far, { size: 5.6, seed: 4 });
  s += facets(poly('M84 140 C76 150 74 168 76 180 C64 184 52 186 40 188 C30 189 26 194 28 199 C30 201 36 201 42 201 L94 200 C98 190 98 176 96 164 Z'), deep, far, { size: 9.6, relief: 0.6, seed: 5 });
  // Corps couché, cuisse repliée.
  s += facets(poly('M66 154 C70 140 84 132 100 130 C124 128 148 134 168 144 C188 152 204 166 206 184 C207 196 202 204 194 207 L80 207 C70 200 64 178 66 154 Z'), base, light, { size: 14.4, relief: 1.3, seed: 6, base2: mix(base, deep, 0.45) });
  s += facets(poly('M146 166 C152 150 180 148 194 164 C204 178 200 196 188 204 L136 206 C126 206 124 198 132 195 C142 192 152 193 158 190 C150 184 144 176 146 166 Z'), base, light, { size: 11.2, relief: 1.1, seed: 7, base2: mix(base, deep, 0.3) });
  const leo: Pt[] = [[158, 160], [170, 154], [182, 162], [178, 176], [166, 180]];
  s += `<polyline points="${leo.map((p) => p.join(',')).join(' ')}" fill="none" stroke="${gold}" stroke-width="0.7" opacity="0.85"/>` + leo.map(([x, y]) => gem(x, y, 2.6, '#FFFFFF', gold)).join('');

  // Aile proche : masse, trois rangs de plumes, bande de couvertures dorée.
  const wl = (pts: Pt[]) => shift(pts, 0, 6);
  s += facets(wl(poly(WING)), base, light, { size: 12.8, relief: 0.8, seed: 8 });
  const tier = (n: number, y0: number, len: number, wid: number, fills: string[], seed: number) => {
    let o = '';
    for (let i = n - 1; i >= 0; i--) {
      const t = i / (n - 1), a: Pt = [104 + t * 100, y0 + 18 - t * 62], dir: Pt = [0.35 + t * 0.5, 0.94 - t * 0.4], l = len * (1 - t * 0.25);
      const fe = wl(feather(a, [a[0] + dir[0] * l, a[1] + dir[1] * l], wid));
      o += facets(fe, fills[i % fills.length], light, { size: 6.4, relief: 0.4, seed: seed + i });
    }
    return o;
  };
  s += tier(13, 100, 40, 5.5, [pale, base, mix(pale, gold, 0.25)], 20) + tier(12, 90, 22, 4.6, [base, mix(base, deep, 0.3)], 40) + tier(11, 80, 14, 3.8, [mix(base, deep, 0.4), deep], 60);
  s += facets(wl(poly('M100 122 C104 100 116 82 134 72 C154 62 178 60 196 50 C204 46 210 38 212 30 C210 42 204 50 194 56 C176 66 152 70 134 80 C120 88 110 102 106 124 Z', 4)), nemesDeep, light, { size: 6.4, relief: 0.4, seed: 80 });
  for (let i = 0; i < 9; i++) { const t = i / 8; s += `<circle cx="${(110 + t * 90).toFixed(1)}" cy="${(112 - t * 46).toFixed(1)}" r="1.4" fill="${gold}"/>`; }

  // Patte avant proche, allongée ; bracelet d'or.
  s += facets(poly('M70 142 C62 152 62 170 66 186 C54 189 40 191 28 193 C17 194 13 199 15 204 C17 207 23 207 30 207 L90 207 C96 198 96 184 92 170 C89 156 84 146 70 142 Z'), base, light, { size: 9.6, relief: 1, seed: 9, base2: mix(base, deep, 0.2) });
  s += flat([[57, 188], [62, 188], [62, 207], [57, 207]], gold, 0.9);

  // Tête : némès rayé (bandes facettées or / nuit), visage de lionne de face.
  const nemes = poly('M80 62 C64 62 56 72 55 86 L46 128 C52 134 62 134 67 128 L69 108 L91 108 L93 128 C98 134 108 134 114 128 L105 86 C104 72 96 62 80 62 Z', 4);
  s += facets(nemes, nemesDeep, light, { size: 8, relief: 0.8, seed: 10 });
  for (let k = 0; k < 9; k++) {
    const y = 70 + k * 7.2;
    for (const sg of [-1, 1]) {
      const half = 21 + (y - 70) * 0.2, x0 = 80 + sg * (y < 106 ? 16.5 : 11.5), x1 = 80 + sg * (half - 1.5);
      if (k < 2) continue;
      s += facets([[x0, y], [x1, y + 2], [x1 + sg * 0.6, y + 4.2], [x0, y + 2.4]], gold, light, { size: 4.8, relief: 0.2, seed: 100 + k * 2 + sg });
    }
  }
  s += facets(poly('M60 76 C66 70 74 68 80 68 C86 68 94 70 100 76 L100 80 C94 75 86 73 80 73 C74 73 66 75 60 80 Z', 3), gold, light, { size: 4.8, relief: 0.3, seed: 11 });
  s += facets(poly('M80 72 C70 72 64 78 64 88 C64 98 68 105 73 110 C76 114 78 117 80 117 C82 117 84 114 87 110 C92 105 96 98 96 88 C96 78 90 72 80 72 Z', 4), pale, light, { size: 7.2, relief: 1.2, seed: 12 });
  s += facets(poly('M74 102 C74 98 78 96 80 96 C82 96 86 98 86 102 C86 107 82 109 80 109 C78 109 74 107 74 102 Z', 3), mix(pale, '#FFFFFF', 0.25), light, { size: 4.8, relief: 0.6, seed: 13 });
  s += flat([[76.5, 97.5], [83.5, 97.5], [80, 102]], deep) + flat([[80, 102], [80.6, 102], [80.6, 105], [80, 105]], deep) + flat([[74.5, 106], [80, 105], [85.5, 106], [80, 106.6]], deep, 0.8);
  // Yeux : amande dorée, pupille fendue, reflet ; trait de fard or.
  for (const sg of [-1, 1]) {
    const x = 80 + sg * 7.5;
    s += flat([[x - sg * 4.5, 89.5], [x, 86.5], [x + sg * 4.5, 89], [x, 91]], '#FFB86B') + flat([[x - 0.6, 86.8], [x + 0.6, 86.8], [x + 0.6, 90.8], [x - 0.6, 90.8]], '#0B0618');
    s += `<circle cx="${x - 1.4}" cy="87.8" r="0.7" fill="#FFFFFF"/>` + flat([[x + sg * 4.5, 89], [x + sg * 9, 92.5], [x + sg * 5, 90.5]], gold);
  }
  // Uræus : petite éclipse au front.
  s += `<circle cx="80" cy="68" r="4.6" fill="${gold}"/><circle cx="80" cy="68" r="3.4" fill="#05030A"/>`;
  // Collier ousekh : rangs de gemmes.
  for (let k = 0; k < 3; k++) {
    const rr = 18 + k * 5;
    for (let i = 1; i < 10; i++) {
      const a = Math.PI * (i / 10);
      s += k === 1 ? `<circle cx="${(80 - Math.cos(a) * rr).toFixed(1)}" cy="${(116 + k * 1.5 + Math.sin(a) * rr * 0.62).toFixed(1)}" r="1.7" fill="${hsl(h + 160, 55, 52)}"/>` : `<circle cx="${(80 - Math.cos(a) * rr).toFixed(1)}" cy="${(116 + k * 1.5 + Math.sin(a) * rr * 0.62).toFixed(1)}" r="1.5" fill="${gold}"/><circle cx="${(79.6 - Math.cos(a) * rr).toFixed(1)}" cy="${(115.6 + k * 1.5 + Math.sin(a) * rr * 0.62).toFixed(1)}" r="0.6" fill="#FFFFFF"/>`;
    }
  }
  return s;
};

/** Décor : désert lunaire sous l'éclipse, horizon embrasé, pyramides et obélisques à pointe d'or, socle gravé, scarabées. */
const scene = (c: DrawCtx, b: Bounds): string => {
  const r = prng(17 + c.stage);
  let s = facetSky(b.x0, b.y0, b.x1, b.y1, ['#0E0A2A', '#22184E', '#4A2E62', '#C2704E', '#E8A066', '#6A4434', '#2A1A24'], 19, 32);
  for (let i = 0; i < 14; i++) s += gem(b.x0 + r() * (b.x1 - b.x0), b.y0 + r() * 110, 1.2 + r() * 2, '#FFFFFF', '#BFD7FF');
  const sand: Light = { dir: [-0.2, -0.8, 0.5], color: '#FFD3A0', shade: '#2A1430' };
  const hz = 158;
  // Pyramides et obélisques lointains.
  for (const [x, w, hh] of [[150, 46, 34], [188, 30, 22], [124, 22, 14]] as const) {
    s += facets([[x, hz - hh], [x + w / 2, hz], [x - w / 2, hz]], '#8A6A70', sand, { size: w / 3, relief: 0.6, seed: x });
    s += gem(x, hz - hh, 2.4, '#FFFFFF', '#E9C25B');
  }
  for (const [x, hh] of [[24, 40], [40, 30]] as const) {
    s += facets([[x - 3, hz], [x - 2, hz - hh], [x, hz - hh - 5], [x + 2, hz - hh], [x + 3, hz]], '#8A6A70', sand, { size: 4.8, relief: 0.4, seed: x + 7 });
    s += gem(x, hz - hh - 5, 2, '#FFFFFF', '#E9C25B');
  }
  // Dunes : plans successifs.
  for (const [y, col, amp, seed] of [[hz, '#7A5258', 4, 31], [172, '#8E5E52', 7, 32], [188, '#A06A50', 8, 33]] as [number, string, number, number][]) {
    const pts: Pt[] = [];
    for (let i = 0; i <= 12; i++) { const x = b.x0 + (i / 12) * (b.x1 - b.x0); pts.push([x, y + Math.sin(i * 1.3 + seed) * amp]); }
    s += facets([...pts, [b.x1, b.y1], [b.x0, b.y1]], col, sand, { size: 28.8, relief: 0.4, seed });
  }
  // Socle gravé du sphinx.
  const stone: Light = { dir: [-0.3, -0.8, 0.5], color: '#FFD9B0', shade: '#1A0E1E' };
  s += facets([[b.x0, 204], [b.x1, 204], [b.x1, 210], [b.x0, 210]], '#C08A6A', stone, { size: 12.8, relief: 0.2, seed: 41 });
  s += facets([[b.x0, 210], [b.x1, 210], [b.x1, b.y1], [b.x0, b.y1]], '#5A3A44', stone, { size: 25.6, relief: 0.5, seed: 42, base2: '#2A1A24' });
  for (let i = 0; i < 12; i++) s += gem(b.x0 + 12 + i * 18, 222, i % 2 ? 2.2 : 3, '#FFE9B0', '#B8892E');
  // Scarabées d'étoiles.
  for (const [x, k] of [[10, 0.9], [206, 0.8]] as const) {
    s += facets(ellipse(x, 201 - 3 * k, 4 * k, 3 * k, 8), hsl(c.hue + 150, 40, 32), stone, { size: 4, seed: x });
    s += gem(x, 197 - 3 * k, 1.6, '#FFFFFF', '#E9C25B');
  }
  return s;
};

export const sphinxlipse: Species = Object.assign(draw, { scene });
