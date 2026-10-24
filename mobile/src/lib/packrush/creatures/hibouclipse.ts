import type { Bounds, DrawCtx, Species } from './style.ts';
import { curve, ellipse, facetSky, facets, gem, hsl, limb, mix, prng, type FacetOpts, type Light, type Pt } from './lowpoly.ts';

/** Facettes un peu plus grandes que demandé (budget : ~1500 facettes par carte). */
const F = (poly: Pt[], col: string, L: Light, o: FacetOpts = {}) => facets(poly, col, L, { ...o, size: (o.size ?? 11) * 1.75 });

/**
 * Hibouclipse → Éclipsule → Grand-Umbrel (low-poly) : grand-duc des éclipses. 0 poussin en duvet tapi
 * au creux d'un vieil arbre parmi les lucioles, 1 jeune « branchu » curieux qui guette une phalène au crépuscule,
 * 2 adulte dressé sur une colonne en ruine sous la pleine lune, 3 éveillé ailes levées devant une éclipse totale.
 */

const CX = 111;
const GOLD = '#E9C25B';
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
const flat = (pts: Pt[], col: string, op = 1) => `<path d="M${pts.map((p) => p.map((v) => v.toFixed(1)).join(' ')).join(' L')} Z" fill="${col}"${op < 1 ? ` opacity="${op}"` : ''}/>`;
const glow = (x: number, y: number, r: number, col: string, op = 0.22) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="${col}" opacity="${op}"/><circle cx="${x}" cy="${y}" r="${(r * 0.55).toFixed(1)}" fill="${col}" opacity="${op * 1.4}"/>`;
/** Ellipse au bord duveteux (rayon alterné). */
const fluff = (cx: number, cy: number, rx: number, ry: number, n: number, amp: number): Pt[] =>
  Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2, k = i % 2 ? 1 + amp : 1; return [cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k] as Pt; });

interface Pal { body: string; deep: string; light: string; cream: string; eye: string; beak: string }
const palOf = (h: number): Pal => ({
  body: hsl(h, 38, 46), deep: hsl(h + 15, 40, 20), light: hsl(h - 5, 35, 66), cream: hsl(h - 10, 30, 84), eye: hsl(h + 40, 95, 58), beak: hsl(h + 200, 12, 26),
});

/** Œil d'éclipse : iris incandescent, pupille ronde, couronne claire, paupière sévère. */
function owlEye(x: number, y: number, r: number, p: Pal, open: number, mirrored: boolean): string {
  const ry = r * open * 1.6;
  let s = `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${ry.toFixed(1)}" fill="${p.eye}"/>`
    + `<path d="M${x - r} ${y} L${x} ${(y - ry).toFixed(1)} L${x + r} ${y} Z" fill="#FFFFFF" opacity="0.25"/>`
    + `<circle cx="${x}" cy="${y}" r="${(Math.min(r, ry) * 0.62).toFixed(1)}" fill="#0B0618"/>`
    + `<circle cx="${x}" cy="${y}" r="${(Math.min(r, ry) * 0.72).toFixed(1)}" fill="none" stroke="#FFF3C4" stroke-width="0.6" opacity="0.8"/>`
    + `<circle cx="${(x - r * 0.35).toFixed(1)}" cy="${(y - ry * 0.35).toFixed(1)}" r="1.2" fill="#FFFFFF"/>`;
  const d = mirrored ? -1 : 1;
  s += flat([[x - r * 1.3 * d, y - ry * 1.6], [x + r * 1.2 * d, y - ry * 1.15], [x + r * 1.1 * d, y - ry * 0.3], [x - r * 1.0 * d, y - ry * 0.95]], p.deep);
  return s;
}

function owlHead(p: Pal, L: Light, o: { tuft: number; open: number; down: boolean }, seed: number): string {
  let s = '';
  if (o.tuft > 0) {
    const t = o.tuft, tip: Pt = [62 - t * 0.3, 40 - t];
    const tuft = P(`M80 48 C78 ${40 - t * 0.5} ${70 - t * 0.3} ${36 - t * 0.9} ${tip[0]} ${tip[1]} C76 ${36 - t * 0.7} 92 ${36 - t * 0.4} 100 44 Z`);
    s += F(tuft, p.body, L, { size: 4, relief: 0.6, seed, base2: p.deep }) + F(flip(tuft), p.body, L, { size: 4, relief: 0.6, seed: seed + 1, base2: p.deep });
  }
  const outer = o.down ? fluff(CX, 68, 43, 36, 30, 0.07) : ellipse(CX, 68, 45, 36, 22);
  s += F(outer, p.body, L, { size: 7, relief: 1.2, seed: seed + 2, base2: p.deep });
  const disc = P('M111 50 C100 46 84 48 78 58 C72 70 76 86 90 92 C98 95 106 92 111 88 Z');
  s += F(disc, p.light, L, { size: 5, relief: 0.8, seed: seed + 3 }) + F(flip(disc), p.light, L, { size: 5, relief: 0.8, seed: seed + 4 });
  const brow = P('M111 60 C104 52 94 50 84 50 C94 46 106 48 112 54 Z');
  s += F(brow, p.cream, L, { size: 3, seed: seed + 5 }) + F(flip(brow), p.cream, L, { size: 3, seed: seed + 6 });
  s += owlEye(95, 68, 8, p, o.open, false) + owlEye(127, 68, 8, p, o.open, true);
  s += F(P('M111 70 C106 74 106 84 111 92 C116 84 116 74 111 70 Z'), p.beak, L, { size: 3, relief: 0.6, seed: seed + 7 });
  return s;
}

function perched(p: Pal, L: Light, head: string, o: { down: boolean; wings: boolean }, seed: number): string {
  const far: Light = { ...L, color: mix(L.color, p.deep, 0.5), rim: undefined };
  let s = F(P('M100 196 C99 206 100 216 104 224 L111 226 L118 224 C122 216 123 206 122 196 Z'), p.deep, far, { size: 4, relief: 0.4, seed });
  const body = o.down ? fluff(CX, 150, 50, 58, 34, 0.05) : P('M74 92 C56 112 56 150 64 176 C72 196 90 206 111 208 C132 206 150 196 158 176 C166 150 166 112 148 92 Z');
  s += F(body, p.body, L, { size: 9, relief: 1.4, seed: seed + 1, base2: p.deep });
  const breast = P('M90 100 C80 128 84 170 98 198 L124 198 C138 170 142 128 132 100 Z');
  s += F(breast, p.cream, L, { size: 7, relief: 1, seed: seed + 2, base2: p.light });
  // Barres en chevrons et stries.
  const r = prng(seed);
  for (let y = 112; y < 192; y += 8) for (let x = 92 + ((y / 8) % 2) * 5; x < 132; x += 10) {
    const w = 3 + r() * 1.5;
    s += flat([[x - w, y], [x, y + 2], [x + w, y], [x, y + 3.2]], p.deep, 0.55);
  }
  if (o.down) s += F(fluff(CX, 150, 24, 38, 22, 0.1), p.cream, L, { size: 6, relief: 0.8, seed: seed + 3, opacity: 0.7 });
  if (o.wings) {
    const wing = P('M76 96 C58 114 54 156 62 186 C66 202 76 214 86 222 C84 200 84 168 90 140 C93 120 90 104 76 96 Z');
    for (const side of [(q: Pt[]) => q, flip]) {
      s += F(side(wing), p.body, L, { size: 7, relief: 1, seed: seed + 4, base2: p.deep });
      for (let k = 0; k < 4; k++) s += F(side(P(`M${64 + k * 6} 150 C${62 + k * 6} 178 ${70 + k * 5} 204 ${84 + k * 2} 222 C${78 + k * 5} 200 ${72 + k * 6} 174 ${72 + k * 6} 150 Z`)), k % 2 ? p.deep : p.body, L, { size: 4, relief: 0.4, seed: seed + 5 + k });
      for (let i = 0; i < 8; i++) { const [x, y] = side([[62 + (i * 7) % 24, 112 + i * 4.4]])[0]; s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.5" fill="${p.cream}" opacity="0.85"/>`; }
    }
  }
  for (const x of [100, 122]) {
    s += F(ellipse(x, 194, 8, 6, 10), p.cream, L, { size: 3, seed: seed + 9 });
    for (const dx of [-5, 0, 5]) s += flat([[x + dx - 1.6, 198], [x + dx + 1.6, 198], [x + dx + 2.6, 205.5], [x + dx, 203]], '#0B0618');
  }
  return s + head;
}

/** Aile déployée (moitié gauche) : primaires en éventail, secondaires, bras. */
function spreadWing(p: Pal, L: Light): string {
  let s = '';
  for (let k = 0; k < 7; k++) {
    const bx = 98 - k * 9, by = 108 - k * 6, len = 64 - k * 3, a = ((100 + k * 6) * Math.PI) / 180;
    s += F(limb([[bx, by], [bx + Math.cos(a) * len * 0.5, by + Math.sin(a) * len * 0.5], [bx + Math.cos(a) * len, by + Math.sin(a) * len]], [12, 11, 2]), k % 2 ? p.deep : p.body, L, { size: 5, relief: 0.6, seed: 100 + k });
  }
  for (let k = 0; k < 10; k++) {
    const bx = 40 - k, by = 64 - k * 1.5, len = 66 - Math.abs(k - 4) * 4, a = ((186 + k * 11) * Math.PI) / 180;
    s += F(limb([[bx, by], [bx + Math.cos(a) * len * 0.5, by + Math.sin(a) * len * 0.5], [bx + Math.cos(a) * len, by + Math.sin(a) * len]], [13, 12, 2]), k % 2 ? p.body : mix(p.body, p.light, 0.4), L, { size: 5, relief: 0.6, seed: 120 + k, base2: p.deep });
  }
  s += F(P('M100 96 C84 76 62 62 40 56 C30 56 24 64 30 72 C44 80 56 96 62 114 C72 116 86 116 100 112 Z'), p.body, L, { size: 6, relief: 1, seed: 140, base2: p.deep });
  const st: Pt[] = [[36, 110], [52, 124], [46, 146], [62, 158]];
  s += `<polyline points="${st.map((q) => q.join(',')).join(' ')}" fill="none" stroke="${GOLD}" stroke-width="0.8" opacity="0.8"/>` + st.map(([x, y]) => gem(x, y, 3.4, '#FFFFFF', GOLD)).join('');
  return s;
}

const draw = (c: DrawCtx): string => {
  const p = palOf(c.hue);
  const { stage } = c;
  if (stage <= 0) {
    const L: Light = { dir: [0.4, -0.7, 0.6], color: '#E8FFC0', shade: '#0A0812', rim: '#C8FF9A' };
    const pp = { ...p, body: p.light, light: p.cream };
    let s = `<g transform="translate(0 12)">` + F(fluff(CX, 160, 44, 46, 34, 0.08), pp.body, L, { size: 7, relief: 1.2, seed: 1, base2: p.body });
    s += F(fluff(CX, 166, 26, 30, 22, 0.1), p.cream, L, { size: 6, relief: 0.8, seed: 2 });
    s += `<g transform="translate(111 96) rotate(-8) scale(0.92) translate(-111 -70)">${owlHead(pp, L, { tuft: 0, open: 0.32, down: true }, 3)}</g></g>`;
    // Lèvre du creux, devant.
    s += F(P('M30 236 L32 214 C46 200 78 194 111 196 C144 194 176 200 192 214 L194 236 Z'), hsl(c.hue + 20, 22, 24), L, { size: 9, relief: 0.8, seed: 9, base2: '#140C10' });
    for (let i = 0; i < 14; i++) s += gem(44 + i * 10, 204 - Math.sin((i / 13) * Math.PI) * 8, 2.4, '#D8FF9A', hsl(c.hue + 110, 40, 36));
    return s;
  }
  if (stage === 1) {
    const L: Light = { dir: [0.5, -0.6, 0.6], color: '#FFD0E4', shade: '#120A20', rim: '#FFB0D8' };
    return perched(p, L, `<g transform="rotate(-16 111 100)">${owlHead(p, L, { tuft: 8, open: 0.62, down: true }, 20)}</g>`, { down: true, wings: true }, 10);
  }
  if (stage === 2) {
    const L: Light = { dir: [-0.6, -0.6, 0.6], color: '#E2E8FF', shade: '#0A0A22', rim: '#B8DCFF' };
    return perched(p, L, owlHead(p, L, { tuft: 22, open: 0.55, down: false }, 40), { down: false, wings: true }, 30) + gem(CX, 38, 4, '#FFFFFF', GOLD);
  }
  const L: Light = { dir: [0, -0.6, 0.7], color: '#FFE6A8', shade: '#0C0818', rim: '#FFD27A' };
  let s = `<g transform="translate(111 104) scale(0.86) translate(-111 -104)">${spreadWing(p, L)}<g transform="matrix(-1 0 0 1 ${CX * 2} 0)">${spreadWing(p, L)}</g></g>`;
  s += `<g transform="translate(0 6)">${perched(p, L, owlHead(p, L, { tuft: 24, open: 0.6, down: false }, 60), { down: false, wings: false }, 50)}</g>`;
  s += glow(95, 74, 9, p.eye, 0.25) + glow(127, 74, 9, p.eye, 0.25);
  s += `<path d="M98 40 C98 26 124 26 124 40 C120 32 102 32 98 40 Z" fill="${GOLD}"/>` + gem(CX, 22, 5, '#FFFFFF', GOLD);
  for (const [x, y, z] of [[30, 214, 3], [196, 214, 3], [20, 30, 3], [204, 30, 3]] as const) s += gem(x, y, z, '#FFFFFF', GOLD);
  return s;
};

/* ---------- Décors : forêt des éclipses et ruines célestes ---------- */
const scene = (c: DrawCtx, b: Bounds): string => {
  const { stage, hue } = c;
  const r = prng(61 + stage * 7);
  const W = b.x1 - b.x0, sh = 225 + ((((hue * 1.7) % 60) + 60) % 60);
  const starfield = (n: number, yMax: number) => { let t = ''; for (let i = 0; i < n; i++) t += gem(b.x0 + r() * W, b.y0 + r() * (yMax - b.y0), 1.2 + r() * 2, '#FFFFFF', '#BFD7FF'); return t; };
  let s = '';
  if (stage <= 0) {
    // Tronc d'un vieil arbre en gros plan, creux sombre, lucioles.
    s += facetSky(b.x0, b.y0, b.x1, b.y1, [hsl(hue + 20, 22, 18), hsl(hue + 25, 22, 14), hsl(hue + 25, 25, 9)], 13, 22);
    const bark: Light = { dir: [0.5, -0.5, 0.6], color: '#6A6050', shade: '#05030A' };
    for (let i = 0; i < 7; i++) { const x = b.x0 + (i / 7) * W; s += F([[x, b.y0], [x + W / 7, b.y0], [x + W / 7 + 4, b.y1], [x + 2, b.y1]], hsl(hue + 20, 20, 18 + (i % 2) * 4), bark, { size: 20, relief: 0.5, seed: 70 + i, opacity: 0.8 }); }
    s += F(ellipse(CX, 150, 66, 80, 20), '#0A0612', { ...bark, color: '#1E1A28' }, { size: 18, relief: 0.4, seed: 80 });
    for (let i = 0; i < 18; i++) { const a = Math.PI * (1.05 + i * 0.05); s += gem(CX + Math.cos(a) * 68, 150 + Math.sin(a) * 82, 2.4 + r() * 1.6, '#C8FF9A', hsl(hue + 110, 35, 34)); }
    for (const [x, y] of [[24, 40], [196, 70], [180, 30], [30, 228], [204, 210], [40, 120]] as const) s += glow(x, y, 8, '#E8FF8A', 0.2) + gem(x, y, 2.2, '#FFFFFF', '#E8FF8A');
  } else if (stage === 1) {
    // Crépuscule dans la canopée : croissant de lune, cimes, branche, phalène.
    s += facetSky(b.x0, b.y0, b.x1, b.y1, [hsl(sh - 10, 40, 22), hsl(sh + 40, 45, 40), hsl(340, 45, 56), hsl(sh + 20, 35, 22), hsl(sh, 35, 10)], 15, 24);
    s += starfield(10, 90) + `<circle cx="176" cy="44" r="16" fill="#F4F0FF"/><circle cx="184" cy="39" r="14" fill="${hsl(sh + 10, 40, 26)}"/>`;
    const tree: Light = { dir: [0.5, -0.6, 0.5], color: '#FFB0D0', shade: '#100818' };
    const ridge = (y: number, amp: number, col: string, seed: number) => {
      const pts: Pt[] = [[b.x0, b.y1]];
      for (let i = 0; i <= 12; i++) pts.push([b.x0 + (i / 12) * W, y + (i % 2 ? amp * 0.4 : -amp)]);
      pts.push([b.x1, b.y1]);
      return F(pts, col, tree, { size: 18, relief: 0.6, seed });
    };
    s += ridge(150, 16, hsl(sh + 20, 25, 30), 90) + ridge(184, 18, hsl(sh + 20, 25, 16), 91);
    s += F(limb([[b.x0, 214], [40, 206], [100, 204], [160, 206], [b.x1, 194]], [12, 11, 10, 9, 7]), hsl(hue + 20, 22, 22), tree, { size: 7, relief: 0.6, seed: 92 });
    s += F(ellipse(206, 182, 12, 5, 10, -0.6), hsl(hue + 110, 30, 32), tree, { size: 5, seed: 93 });
    s += glow(46, 70, 10, '#FFE6C8', 0.2) + flat([[46, 70], [32, 60], [34, 72]], hsl(hue + 40, 45, 76)) + flat([[46, 70], [60, 60], [58, 72]], hsl(hue + 40, 40, 64)) + flat([[45, 66], [47, 66], [47, 78], [45, 78]], '#2A2030');
  } else if (stage === 2) {
    // Ruines célestes sous la pleine lune.
    s += facetSky(b.x0, b.y0, b.x1, b.y1, [hsl(sh, 50, 9), hsl(sh + 10, 45, 18), hsl(sh + 20, 40, 26), hsl(sh, 40, 12)], 17, 26);
    s += starfield(22, 150) + glow(60, 50, 40, '#DDE6FF', 0.12) + F(ellipse(60, 50, 24, 24, 16), '#C8D2F0', { dir: [-0.5, -0.5, 0.7], color: '#FFFFFF', shade: '#6070A0' }, { size: 7, seed: 18 });
    const stone: Light = { dir: [-0.6, -0.6, 0.6], color: '#B8C4F0', shade: '#08081A' };
    for (const [x, w, h, sd] of [[12, 16, 92, 1], [176, 18, 120, 2], [204, 14, 70, 3]] as const) s += F([[x, 236 - h], [x + w, 236 - h + 4], [x + w, b.y1], [x, b.y1]], hsl(sh + 10, 18, 24), stone, { size: 10, relief: 0.5, seed: 100 + sd, opacity: 0.85 });
    s += F([[64, 208], [158, 208], [154, b.y1], [68, b.y1]], hsl(sh - 10, 14, 34), stone, { size: 12, relief: 0.7, seed: 104, base2: hsl(sh, 20, 14) });
    s += F([[50, 198], [172, 198], [168, 210], [54, 210]], hsl(sh - 10, 14, 44), stone, { size: 8, relief: 0.5, seed: 105 });
    s += F([[56, 194], [166, 194], [172, 198], [50, 198]], hsl(sh - 10, 14, 56), stone, { size: 6, seed: 106 });
    s += `<ellipse cx="111" cy="236" rx="150" ry="18" fill="#DDE6FF" opacity="0.08"/>`;
  } else {
    // Éclipse totale au-dessus d'une mer de nuages.
    s += facetSky(b.x0, b.y0, b.x1, b.y1, [hsl(sh + 20, 55, 7), hsl(sh, 50, 16), hsl(sh - 20, 40, 26)], 19, 26);
    s += starfield(24, 170) + glow(CX, 84, 90, '#FFD27A', 0.1);
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2, r1 = 50, r2 = 64 + (i % 3) * 12, da = 0.05;
      s += flat([[CX + Math.cos(a - da) * r1, 84 + Math.sin(a - da) * r1], [CX + Math.cos(a) * r2, 84 + Math.sin(a) * r2], [CX + Math.cos(a + da) * r1, 84 + Math.sin(a + da) * r1]], '#FFE6A8', 0.5);
    }
    s += `<circle cx="${CX}" cy="84" r="51" fill="#FFF0C8"/><circle cx="${CX}" cy="84" r="47" fill="#07040E"/>`;
    const cl: Light = { dir: [0, -0.8, 0.5], color: '#FFE0B0', shade: '#140C28' };
    for (let k = 0; k < 3; k++) {
      const y = 196 + k * 16, pts: Pt[] = [[b.x0, b.y1]];
      for (let i = 0; i <= 8; i++) pts.push([b.x0 + (i / 8) * W, y + (i % 2 ? -10 : 2)]);
      pts.push([b.x1, b.y1]);
      s += F(pts, hsl(sh - 20 + k * 10, 25, 26 + k * 7), cl, { size: 18, relief: 0.8, seed: 110 + k });
    }
  }
  return s;
};

export const hibouclipse: Species = Object.assign(draw, { scene });
