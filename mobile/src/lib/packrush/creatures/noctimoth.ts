import type { Bounds, DrawCtx, Species } from './style.ts';
import { curve, ellipse, facetSky, facets, gem, hsl, limb, mix, prng, type FacetOpts, type Light, type Pt } from './lowpoly.ts';

/** Facettes un peu plus grandes que demandé (budget : ~1500 facettes par carte). */
const F = (poly: Pt[], col: string, L: Light, o: FacetOpts = {}) => facets(poly, col, L, { ...o, size: (o.size ?? 11) * 1.6 });

/**
 * Noctimoth → Phalénuit → Séléniaile → Astrophalène (low-poly) : bombyx de nuit. 0 chenille à tubercules d'étoiles
 * cabrée sur un rameau du sous-bois, 1 jeune phalène au repos près de son cocon vide à l'aube, 2 adulte ailes
 * déployées devant la pleine lune d'un jardin de nuit, 3 éveillé constellé au-dessus des nuages sous les aurores.
 */

const CX = 111;
const GOLD = '#E9C25B';
/** Tracé SVG simple (M L C Z absolus) → polygone. */
function P(d: string, step = 7): Pt[] {
  const tok = d.match(/[MLCZ]|-?\d*\.?\d+/g) ?? [];
  const out: Pt[] = [];
  let i = 0, cmd = 'M', cur: Pt = [0, 0];
  const num = () => +tok[i++];
  while (i < tok.length) {
    if (/[MLCZ]/.test(tok[i])) cmd = tok[i++];
    if (cmd === 'Z') continue;
    if (cmd === 'M' || cmd === 'L') { cur = [num(), num()]; out.push(cur); continue; }
    const c1: Pt = [num(), num()], c2: Pt = [num(), num()], p: Pt = [num(), num()];
    out.push(...curve(cur, [[c1, c2, p]], step).slice(1));
    cur = p;
  }
  return out;
}
const flip = (pts: Pt[]): Pt[] => pts.map(([x, y]) => [CX * 2 - x, y]);
const glow = (x: number, y: number, r: number, col: string, op = 0.22) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="${col}" opacity="${op}"/><circle cx="${x}" cy="${y}" r="${(r * 0.55).toFixed(1)}" fill="${col}" opacity="${op * 1.4}"/>`;
function stars(pts: Pt[], s = 3.4): string {
  return `<polyline points="${pts.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' ')}" fill="none" stroke="${GOLD}" stroke-width="0.7" opacity="0.8"/>` + pts.map(([x, y], i) => gem(x, y, i % 2 ? s * 0.7 : s, '#FFFFFF', GOLD)).join('');
}

interface Pal { wing: string; wing2: string; deep: string; band: string; body: string; cream: string; moon: string }
const palOf = (h: number): Pal => ({
  wing: hsl(h, 38, 52), wing2: hsl(h + 30, 40, 36), deep: hsl(h + 20, 40, 18), band: hsl(h + 160, 45, 58),
  body: hsl(h + 10, 30, 40), cream: hsl(h - 10, 25, 82), moon: hsl(h + 50, 80, 80),
});

/** Ocelle-lune : anneau sombre, disque clair, ombre d'éclipse. */
function moonEye(x: number, y: number, r: number, p: Pal, L: Light, seed: number, phase = 0.45): string {
  return F(ellipse(x, y, r, r, 12), p.deep, L, { size: r / 2, relief: 0.4, seed })
    + F(ellipse(x, y, r * 0.7, r * 0.7, 10), p.moon, L, { size: r / 2.5, relief: 0.5, seed: seed + 1 })
    + `<circle cx="${(x + r * phase).toFixed(1)}" cy="${(y - r * 0.1).toFixed(1)}" r="${(r * 0.62).toFixed(1)}" fill="${p.deep}" opacity="0.85"/>`;
}

/** Antenne plumeuse : tige + barbes en petits triangles plats. */
function antenna(a: Pt, q: Pt, b: Pt, col: string): string {
  const pts = curve(a, [[q, q, b]], 4);
  let s = '';
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1, k = 5 * Math.sin(Math.PI * (i / pts.length) * 0.9 + 0.2);
    const nx = -dy / l * k, ny = dx / l * k;
    s += `<path d="M${x0.toFixed(1)} ${y0.toFixed(1)} L${(x1 + nx + dx * 0.4).toFixed(1)} ${(y1 + ny + dy * 0.4).toFixed(1)} L${x1.toFixed(1)} ${y1.toFixed(1)} L${(x1 - nx + dx * 0.4).toFixed(1)} ${(y1 - ny + dy * 0.4).toFixed(1)} Z" fill="${col}" opacity="0.85"/>`;
  }
  return F(limb(pts, [2, 1.4, 0.8]), col, { dir: [0, -1, 0.5], color: '#FFFFFF', shade: '#100820' }, { size: 3, seed: 3 }) + s;
}

function mothBody(p: Pal, L: Light, y0: number, k: number): string {
  let s = F(ellipse(CX, y0 + 44 * k, 8.5 * k, 30 * k, 16), p.body, L, { size: 4.5, relief: 1, seed: 41, base2: p.deep });
  for (let i = 0; i < 5; i++) s += `<path d="M${CX - 7 * k} ${(y0 + (28 + i * 9) * k).toFixed(1)} L${CX} ${(y0 + (31 + i * 9) * k).toFixed(1)} L${CX + 7 * k} ${(y0 + (28 + i * 9) * k).toFixed(1)} L${CX} ${(y0 + (29.5 + i * 9) * k).toFixed(1)} Z" fill="${p.cream}" opacity="0.5"/>`;
  s += F(ellipse(CX, y0 + 4 * k, 11 * k, 15 * k, 16), p.cream, L, { size: 4.5, relief: 1.2, seed: 42, base2: p.body });
  s += F(ellipse(CX, y0 - 14 * k, 6.5 * k, 5.5 * k, 10), p.body, L, { size: 3, relief: 0.8, seed: 43 });
  for (const sd of [-1, 1]) s += `<circle cx="${CX + sd * 5.2 * k}" cy="${y0 - 15 * k}" r="${2.4 * k}" fill="#0B0618"/><circle cx="${CX + sd * 5.2 * k - 0.7}" cy="${y0 - 16 * k}" r="${0.8 * k}" fill="${p.moon}"/>`;
  return s;
}

/* ---------- Stades 2–3 : ailes déployées ---------- */
function spread(p: Pal, woke: boolean): string {
  const L: Light = woke ? { dir: [0, -0.7, 0.6], color: '#D8FFF0', shade: '#0A0820', rim: '#9FFFE0' } : { dir: [0, -0.4, 0.8], color: '#E6ECFF', shade: '#0A0A24', rim: '#C8E4FF' };
  const FW = P('M114 80 C134 62 176 42 208 30 C213 30 213 35 210 39 C200 58 192 84 184 108 C168 117 136 113 116 100 Z');
  const HW = P('M114 98 C136 104 170 108 184 124 C194 138 186 154 172 160 C166 172 167 194 175 216 C170 221 162 214 157 203 C150 188 146 170 136 157 C126 147 118 136 114 124 Z');
  const COSTA = P('M113 78 C134 60 176 40 209 29 L208 37 C178 50 142 70 118 88 Z');
  const BORDER = P('M210 39 C200 58 192 84 184 108 L176 106 C184 84 192 60 202 42 Z');
  const TAIL = P('M168 176 C166 192 168 204 175 216 C170 221 162 214 157 203 C156 192 160 182 168 176 Z');
  let s = '';
  for (const side of [(q: Pt[]) => q, flip]) {
    s += F(side(HW), p.wing2, L, { size: 8, relief: 1, seed: 11, base2: p.deep });
    s += F(side(TAIL), p.band, L, { size: 5, relief: 0.6, seed: 12 });
    s += F(side(FW), p.wing, L, { size: 8, relief: 1.1, seed: 13, base2: p.wing2 });
    s += F(side(COSTA), p.deep, L, { size: 5, relief: 0.4, seed: 14 });
    s += F(side(BORDER), p.band, L, { size: 5, relief: 0.4, seed: 15, base2: p.deep });
  }
  for (const sd of [1, -1]) {
    const X = (x: number) => (sd > 0 ? x : CX * 2 - x);
    s += moonEye(X(168), 74, 7.5, p, L, 21, sd * -0.45) + moonEye(X(158), 134, 9.5, p, L, 23, sd * 0.5);
    if (woke) s += stars([[X(184), 52], [X(194), 64], [X(188), 82], [X(196), 92]]) + stars([[X(140), 128], [X(146), 146], [X(138), 160], [X(150), 180]], 3);
  }
  s += antenna([114, 70], [120, 48], [140, 30], p.cream) + antenna([108, 70], [102, 48], [82, 30], p.cream);
  s += mothBody(p, L, 90, 1);
  if (woke) {
    s += glow(CX, 38, 16, '#9FFFE0', 0.2) + `<path d="M100 38 C100 26 122 26 122 38 C118 30 104 30 100 38 Z" fill="${GOLD}"/>` + gem(CX, 22, 5, '#FFFFFF', GOLD);
    for (const [x, y, z] of [[166, 226, 3], [56, 226, 3], [20, 40, 3.4], [204, 40, 3.4], [200, 130, 2.6], [22, 130, 2.6]] as const) s += gem(x, y, z, '#FFFFFF', '#9FFFE0');
  }
  return s;
}

/* ---------- Stade 1 : au repos, cocon vide ---------- */
function rest(p: Pal): string {
  const L: Light = { dir: [-0.5, -0.6, 0.6], color: '#FFE3B8', shade: '#140C22', rim: '#FFD9A0' };
  let s = F(limb([[0, 230], [60, 206], [130, 166], [180, 142], [226, 124]], [10, 9, 8, 7, 6]), hsl(30, 25, 26), L, { size: 6, relief: 0.6, seed: 51, base2: hsl(30, 25, 14) });
  for (const [x, y, a] of [[40, 212, -0.4], [182, 140, -0.6]] as const) s += F(ellipse(x + Math.cos(a) * 18, y + Math.sin(a) * 18 - 4, 20, 7, 12, a), hsl(110, 25, 32), L, { size: 6, relief: 0.6, seed: 52 });
  // Cocon de soie, fendu à la base.
  s += F(P('M198 140 C210 136 218 146 218 160 C218 178 212 190 206 196 L202 188 L198 196 C192 186 190 168 192 156 C192 148 194 142 198 140 Z'), hsl(40, 15, 76), L, { size: 5, relief: 0.9, seed: 53, base2: hsl(40, 15, 50) });
  s += `<path d="M198 196 L202 188 L206 196 L202 201 Z" fill="#140C22"/>`;
  const FW = P('M114 66 C142 78 174 122 196 174 C199 182 195 188 188 188 C164 192 136 200 113 210 C112 160 112 110 114 66 Z');
  const HW = P('M116 124 C150 142 184 170 194 186 C182 202 150 210 116 214 Z');
  const COSTA = P('M114 62 C144 74 178 120 202 172 L194 176 C172 128 144 88 118 76 Z');
  for (const side of [(q: Pt[]) => q, flip]) {
    s += F(side(HW), p.wing2, L, { size: 7, relief: 0.6, seed: 54, base2: p.deep });
    s += F(side(FW), p.wing, L, { size: 8, relief: 1, seed: 55, base2: p.wing2 });
    s += F(side(COSTA), p.deep, L, { size: 5, relief: 0.4, seed: 56 });
  }
  s += moonEye(160, 150, 6, p, L, 58, -0.45) + moonEye(62, 150, 6, p, L, 59, 0.45);
  s += antenna([114, 50], [122, 30], [144, 16], p.cream) + antenna([108, 50], [100, 30], [78, 16], p.cream);
  s += F(ellipse(CX, 64, 11, 15, 14), p.cream, L, { size: 4.5, relief: 1.2, seed: 60, base2: p.body });
  s += F(ellipse(CX, 47, 6.5, 5.5, 10), p.body, L, { size: 3, seed: 61 });
  for (const sd of [-1, 1]) s += `<circle cx="${CX + sd * 5.2}" cy="46.5" r="2.4" fill="#0B0618"/><circle cx="${CX + sd * 5.2 - 0.7}" cy="45.6" r="0.8" fill="${p.moon}"/>`;
  return s;
}

/* ---------- Stade 0 : chenille cabrée ---------- */
function larva(p: Pal, h: number): string {
  const L: Light = { dir: [0.4, -0.7, 0.6], color: '#DDE6FF', shade: '#0A0818', rim: '#B8C8FF' };
  const skin = hsl(h + 90, 35, 46), skin2 = hsl(h + 110, 40, 26);
  let s = F(limb([[0, 226], [60, 214], [130, 204], [222, 186]], [9, 8, 7, 6]), hsl(30, 25, 24), L, { size: 6, relief: 0.6, seed: 71, base2: hsl(30, 25, 12) });
  s += F(ellipse(196, 176, 22, 8, 12, -0.6), hsl(110, 25, 30), L, { size: 6, seed: 72 });
  // Ligne médiane (Catmull-Rom) puis anneaux en facettes.
  const C: Pt[] = [[30, 198], [60, 196], [90, 192], [116, 185], [136, 171], [146, 147], [146, 119], [152, 95], [168, 79], [184, 83]];
  const spine: Pt[] = [];
  for (let k = 0; k < C.length - 1; k++) {
    const p0 = C[Math.max(0, k - 1)], p1 = C[k], p2 = C[k + 1], p3 = C[Math.min(C.length - 1, k + 2)];
    for (let i = 0; i < 4; i++) {
      const t = i / 4, t2 = t * t, t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      spine.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  spine.push(C[C.length - 1]);
  const N = 20;
  for (let k = 0; k < N; k++) {
    const i = Math.round((k / (N - 1)) * (spine.length - 2)), a = spine[i], b = spine[Math.min(spine.length - 1, i + 1)];
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), rr = k === 0 ? 10 : k > N - 5 ? 13 - (k - N + 5) * 0.9 : 14;
    s += F(ellipse(a[0], a[1], rr * 0.85, rr, 12, ang), skin, L, { size: 5, relief: 1.1, seed: 80 + k, base2: skin2 });
    // Tubercule doré (dos) et stigmate (flanc).
    const nx = Math.sin(ang), ny = -Math.cos(ang);
    if (k > 0 && k % 2 === 0) s += gem(a[0] + nx * (rr + 2), a[1] + ny * (rr + 2), k > N - 7 ? 4.2 : 3.2, '#FFFFFF', k > N - 7 ? hsl(h + 200, 70, 60) : GOLD);
    if (k % 2) s += `<ellipse cx="${(a[0] - nx * rr * 0.4).toFixed(1)}" cy="${(a[1] - ny * rr * 0.4).toFixed(1)}" rx="1.6" ry="1.1" fill="#0B0618"/>`;
  }
  // Corne caudale et tête.
  s += `<path d="M32 190 L18 170 L38 186 Z" fill="${GOLD}"/><path d="M32 190 L18 170 L28 190 Z" fill="#B8862E"/>`;
  s += F(ellipse(186, 88, 10, 9, 12, 0.5), hsl(h + 100, 30, 22), L, { size: 4, relief: 0.8, seed: 99 });
  s += `<circle cx="191" cy="86" r="1.2" fill="#DDF6FF"/><circle cx="189" cy="91" r="1" fill="#DDF6FF"/>`;
  return s;
}

const draw = (c: DrawCtx): string => {
  const p = palOf(c.hue);
  if (c.stage <= 0) return larva(p, c.hue);
  if (c.stage === 1) return rest(p);
  return spread(p, c.stage >= 3);
};

/* ---------- Décors ---------- */
const scene = (c: DrawCtx, b: Bounds): string => {
  const { stage, hue } = c;
  const r = prng(23 + stage * 17);
  const W = b.x1 - b.x0, night = 225 + ((((hue * 1.7) % 60) + 60) % 60);
  const starfield = (n: number, yMax: number) => { let t = ''; for (let i = 0; i < n; i++) t += gem(b.x0 + r() * W, b.y0 + r() * (yMax - b.y0), 1.2 + r() * 2, '#FFFFFF', '#BFD7FF'); return t; };
  let s = '';
  if (stage <= 0) {
    // Sous-bois nocturne : lune entre les feuilles, grandes feuilles en contre-jour, bokeh.
    s += facetSky(b.x0, b.y0, b.x1, b.y1, [hsl(night, 45, 10), hsl(night + 30, 35, 16), hsl(160, 30, 10)], 7, 26);
    s += starfield(10, 120) + glow(168, 54, 30, '#DDE6FF', 0.15) + F(ellipse(168, 54, 18, 18, 14), '#D8E2FF', { dir: [-0.5, -0.5, 0.7], color: '#FFFFFF', shade: '#8090C0' }, { size: 6, seed: 5 });
    const leafL: Light = { dir: [0.5, -0.6, 0.6], color: '#6A8AA0', shade: '#05060C' };
    for (const [x, y, len, a, sd] of [[-10, 40, 90, 0.35, 1], [232, 90, 80, 2.8, 2], [-6, 150, 70, -0.2, 3], [120, -10, 70, 1.2, 4], [204, 6, 60, 2.1, 5]] as const) {
      const co = Math.cos(a), si = Math.sin(a), L2 = (u: number, v: number): Pt => [x + u * co - v * si, y + u * si + v * co];
      s += F([L2(0, 0), L2(len * 0.3, -len * 0.22), L2(len * 0.7, -len * 0.2), L2(len, 0), L2(len * 0.7, len * 0.2), L2(len * 0.3, len * 0.22)], hsl(hue + 130, 25, 16), leafL, { size: 12, relief: 0.6, seed: 10 + sd });
    }
    for (let i = 0; i < 7; i++) s += `<circle cx="${(b.x0 + r() * W).toFixed(1)}" cy="${(40 + r() * 140).toFixed(1)}" r="${(4 + r() * 8).toFixed(1)}" fill="${hsl(hue + 60 + r() * 80, 60, 70)}" opacity="0.12"/>`;
  } else if (stage === 1) {
    // Forêt brumeuse à l'aube : troncs en plans successifs, brume dorée.
    s += facetSky(b.x0, b.y0, b.x1, b.y1, [hsl(night, 25, 30), hsl(night - 20, 25, 46), '#E8B888', '#C89070', hsl(night, 20, 24)], 9, 24);
    const tr: Light = { dir: [-0.6, -0.4, 0.6], color: '#FFD9A8', shade: '#1A1428' };
    for (const [x, w, l, sd] of [[30, 12, 44, 1], [70, 16, 40, 2], [160, 14, 42, 3], [120, 9, 48, 4]] as const) s += F([[x, b.y0], [x + w, b.y0], [x + w + 2, b.y1], [x - 2, b.y1]], hsl(night + 10, 15, l), tr, { size: 14, relief: 0.3, seed: 20 + sd, opacity: 0.6 });
    for (const [x, w, sd] of [[-2, 26, 5], [180, 34, 6]] as const) s += F([[x, b.y0], [x + w, b.y0], [x + w + 4, b.y1], [x - 4, b.y1]], hsl(30, 18, 22), tr, { size: 12, relief: 0.6, seed: 30 + sd });
    s += `<ellipse cx="111" cy="210" rx="170" ry="30" fill="#FFF0D8" opacity="0.18"/><ellipse cx="111" cy="226" rx="140" ry="18" fill="#FFF0D8" opacity="0.14"/>`;
  } else if (stage === 2) {
    // Jardin de nuit : grande lune, fleurs-de-lune.
    s += facetSky(b.x0, b.y0, b.x1, b.y1, [hsl(night, 50, 10), hsl(night + 15, 45, 20), hsl(night + 30, 40, 14)], 4, 26);
    s += starfield(20, 120);
    s += glow(CX, 96, 90, '#DDE6FF', 0.1) + F(ellipse(CX, 96, 64, 64, 28), '#B8C4EE', { dir: [-0.5, -0.5, 0.7], color: '#F4F6FF', shade: '#5A6698' }, { size: 16, relief: 0.4, seed: 41, opacity: 0.75 });
    const gr: Light = { dir: [0, -0.6, 0.6], color: '#9FB0E0', shade: '#05060E' };
    s += F([[b.x0, 204], [50, 194], [110, 202], [170, 192], [b.x1, 200], [b.x1, b.y1], [b.x0, b.y1]], hsl(hue + 140, 22, 16), gr, { size: 18, relief: 0.5, seed: 42, base2: '#08060E' });
    for (const [x, y, k] of [[20, 210, 1], [44, 222, 0.8], [192, 206, 1], [208, 222, 0.7], [8, 170, 0.7], [214, 160, 0.7]] as const) {
      s += `<path d="M${x} ${y} L${x - 1} ${y - 18 * k} L${x + 1} ${y - 18 * k} Z" fill="#2E5040"/>`;
      s += F([[x - 2 * k, y - 18 * k], [x - 10 * k, y - 34 * k], [x + 10 * k, y - 34 * k], [x + 2 * k, y - 18 * k]], '#E8E6F4', { dir: [-0.4, -0.6, 0.6], color: '#FFFFFF', shade: '#6A70A0' }, { size: 5 * k, seed: 43 });
      s += glow(x, y - 34 * k, 8 * k, '#FFFFFF', 0.12);
    }
  } else {
    // Au-dessus des nuages : aurores, nuée de petites phalènes.
    s += facetSky(b.x0, b.y0, b.x1, b.y1, [hsl(night + 20, 55, 8), hsl(night, 50, 18), hsl(night - 30, 40, 30)], 6, 26);
    s += starfield(24, 160);
    for (let k = 0; k < 3; k++) {
      const pts: Pt[] = [];
      for (let i = 0; i <= 6; i++) pts.push([b.x0 + (i / 6) * W, 30 + k * 22 + (i % 2 ? -12 : 10)]);
      const band = [...pts, ...pts.slice().reverse().map(([x, y]) => [x + 6, y + 18] as Pt)];
      s += `<path d="M${band.map((q) => q.map((v) => v.toFixed(1)).join(' ')).join(' L')} Z" fill="${hsl(140 + k * 45, 70, 60)}" opacity="${0.15 - k * 0.03}"/>`;
    }
    const cl: Light = { dir: [0, -0.8, 0.5], color: '#E8E0FF', shade: '#1A1438' };
    for (let k = 0; k < 3; k++) {
      const y = 190 + k * 16, pts: Pt[] = [[b.x0, b.y1]];
      for (let i = 0; i <= 8; i++) pts.push([b.x0 + (i / 8) * W, y + (i % 2 ? -10 : 2)]);
      pts.push([b.x1, b.y1]);
      s += F(pts, hsl(night - 10 + k * 10, 25, 30 + k * 8), cl, { size: 18, relief: 0.8, seed: 60 + k });
    }
    for (let i = 0; i < 12; i++) {
      const a = i * 0.9, rr = 76 + i * 4, x = CX + Math.cos(a) * rr, y = 112 + Math.sin(a) * rr * 0.6, k = 3;
      s += `<path d="M${x.toFixed(1)} ${y.toFixed(1)} l${-k * 2} ${-k} l${-k * 0.5} ${k * 1.6} Z M${x.toFixed(1)} ${y.toFixed(1)} l${k * 2} ${-k} l${k * 0.5} ${k * 1.6} Z" fill="${hsl(hue + 40, 50, 78)}" opacity="0.75"/>`;
    }
  }
  return s;
};

export const noctimoth: Species = Object.assign(draw, { scene });
