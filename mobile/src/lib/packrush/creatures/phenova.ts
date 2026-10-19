import type { Bounds, DrawCtx, Species } from './style.ts';
import { ellipse, facetSky, facets, gem, hsl, limb, mix, prng, type Light, type Pt } from './lowpoly.ts';

/**
 * Phenova → Pyrastrel → Supernovis (low-poly) : rapace de supernova, crête de plumes-étoiles, plumes de braise.
 * 0 : le poussin sort de son œuf dans un nid de braises, sur une corniche volcanique au crépuscule. 1 : le jeune
 * crie sur une branche calcinée au-dessus d'une caldeira, une aile levée, prêt à s'envoler. 2 : l'adulte déploie
 * ses ailes devant l'éclat d'une supernova, très haut au-dessus d'une planète.
 */

function sm(q: Pt[], per = 3, closed = true): Pt[] {
  const n = q.length, out: Pt[] = [];
  const at = (i: number) => (closed ? q[(i + n) % n] : q[Math.max(0, Math.min(n - 1, i))]);
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const a = at(i - 1), b = at(i), e = at(i + 1), g = at(i + 2);
    for (let k = 0; k < per; k++) {
      const t = k / per, t2 = t * t, t3 = t2 * t;
      const v = (j: 0 | 1) => 0.5 * (2 * b[j] + (-a[j] + e[j]) * t + (2 * a[j] - 5 * b[j] + 4 * e[j] - g[j]) * t2 + (-a[j] + 3 * b[j] - 3 * e[j] + g[j]) * t3);
      out.push([v(0), v(1)]);
    }
  }
  if (!closed) out.push(q[n - 1]);
  return out;
}
const flat = (q: Pt[], col: string, op = 1) => `<path d="M${q.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('L')}Z" fill="${col}"${op < 1 ? ` opacity="${op}"` : ''}/>`;
const GOLD = '#E9C25B';
const dim = (L: Light, t = 0.45): Light => ({ ...L, color: mix(L.color, L.shade, t), rim: undefined });

interface Cols { base: string; deep: string; belly: string; light: string; ember: string; glow: string; cool: string; dark: string }
const colors = (h: number): Cols => ({
  base: hsl(h, 40, 46), deep: hsl(h + 10, 45, 22), belly: hsl(h + 20, 35, 76), light: hsl(h - 10, 42, 66),
  ember: hsl(h + 30, 85, 60), glow: hsl(h + 50, 92, 78), cool: hsl(h + 185, 55, 60), dark: hsl(h + 20, 45, 9),
});

/** Plume (rémige) : polygone effilé partant de (x, y) vers `ang` degrés, pointe colorée. */
function feather(x: number, y: number, ang: number, len: number, w: number, col: string, tip: string, L: Light, seed: number, bend = 0): string {
  const a = (ang * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a), b = bend * len;
  const T = ([u, v]: Pt): Pt => [x + u * ca - v * sa, y + u * sa + v * ca];
  const q: Pt[] = [[0, 0], [len * 0.25, -w * 0.9], [len * 0.7, -w * 0.85 + b * 0.5], [len, b], [len * 0.72, w * 0.7 + b * 0.5], [len * 0.3, w * 0.75]];
  let s = facets(q.map(T), col, L, { size: Math.max(3.5, w * 0.9), relief: 0.5, seed, base2: col });
  s += flat(([[len * 0.68, -w * 0.6 + b * 0.4], [len, b], [len * 0.7, w * 0.5 + b * 0.4], [len * 0.78, b * 0.6]] as Pt[]).map(T), tip, 0.9);
  return s;
}

/** Aile déployée (pointant à gauche) : épaule S, poignet W, main H. */
function spreadWing(k: Cols, L: Light, S: Pt, W: Pt, H: Pt, seed: number): string {
  let s = '';
  for (let i = 0; i < 8; i++) {
    const t = i / 7;
    s += feather(H[0] + (W[0] - H[0]) * t, H[1] + (W[1] - H[1]) * t, -112 - t * 52, 66 - t * 18, 6.4, i % 2 ? k.light : k.belly, i % 2 ? k.glow : k.cool, L, seed + i, -0.06);
  }
  for (let i = 0; i < 7; i++) {
    const t = i / 6;
    s += feather(W[0] + (S[0] - W[0]) * t, W[1] + (S[1] - W[1]) * t, 172 - t * 64, 46 - t * 10, 7, i % 2 ? k.base : k.light, k.ember, L, seed + 20 + i, 0.05);
  }
  const M: Pt = [(S[0] + W[0]) / 2, (S[1] + W[1]) / 2];
  s += facets(sm([[S[0] + 4, S[1] + 6], [S[0] - 6, S[1] - 10], [M[0], M[1] - 12], [W[0], W[1] - 8], [H[0] + 2, H[1] - 2], [H[0] + 6, H[1] + 8], [W[0] + 6, W[1] + 10], [M[0] + 4, M[1] + 12], [S[0] + 6, S[1] + 18]], 2), k.base, L, { size: 6, relief: 0.9, seed: seed + 40, base2: k.deep });
  // Rangée de couvertures.
  for (let i = 0; i < 6; i++) {
    const t = i / 5;
    s += feather(W[0] + 4 + (S[0] - W[0]) * t, W[1] + 6 + (S[1] - W[1]) * t, 160, 13, 5, k.light, k.ember, L, seed + 50 + i);
  }
  return s;
}

/** Tête de rapace de profil (bec à gauche ≈ (76, 68), nuque ≈ (118, 66)). */
function head(k: Cols, L: Light, o: { crest: number; young?: number; open?: boolean; seed: number }): string {
  const y = o.young ?? 0;
  let s = '';
  for (let i = 0; i < 3 + Math.round(o.crest * 2); i++) {
    const a = ((-150 + i * 14 + o.crest * 6) * Math.PI) / 180, L0 = (14 + o.crest * 30) * (1 - i * 0.12);
    const x0 = 108 + i * 3, y0 = 50 + i * 2, x1 = x0 - Math.cos(a) * L0, y1 = y0 + Math.sin(a) * L0;
    s += facets(limb([[x0, y0], [(x0 + x1) / 2 + 3, (y0 + y1) / 2 + 3], [x1, y1]], [3, 2, 1]), k.light, L, { size: 2.5, relief: 0.3, seed: o.seed + i });
    if (o.crest > 0.3) s += gem(x1, y1, 2.6 + o.crest * 1.8, '#FFFFFF', i % 2 ? k.glow : GOLD);
  }
  s += facets(sm([[90, 56], [98, 48], [110, 46], [120, 52], [124, 64], [120, 76], [108, 82], [96, 78], [88, 70]], 2), y ? k.light : k.base, L, { size: 5, relief: 1, seed: o.seed + 10, base2: k.deep });
  s += facets([[86, 66], [94, 64], [104, 70], [108, 82], [92, 80]], k.belly, L, { size: 4, relief: 0.5, seed: o.seed + 11 });
  s += flat([[96, 60], [104, 58], [114, 60], [118, 64], [110, 64], [104, 66], [100, 72], [98, 66]], k.dark, y ? 0.3 : 0.8);
  // Bec crochu.
  const bk = y ? 0.75 : 1, B = (u: number) => 90 - u * bk;
  if (o.open) {
    s += flat([[91, 65], [B(12), 67], [B(11), 76], [92, 70]], '#1A0610');
    s += facets([[91, 68], [B(11), 75], [B(8), 77], [93, 71]], mix(GOLD, '#FFFFFF', 0.3), L, { size: 3, relief: 0.3, seed: o.seed + 12 });
  } else s += flat([[B(6), 66], [B(4), 69], [B(1), 70], [92, 69], [91, 66]], mix(GOLD, '#FFFFFF', 0.3));
  s += facets([[91, 56], [B(8), 56], [B(13), 60], [B(15), 68], [B(10), 65], [B(6), 66], [91, 66]], GOLD, L, { size: 3.5, relief: 0.6, seed: o.seed + 13 });
  // Œil.
  s += flat([[97, 61], [101, 57.5], [107, 60], [102, 63.5]], '#FFC24A');
  s += `<circle cx="102" cy="60.6" r="${(1.7 + y * 0.4).toFixed(1)}" fill="#0B0618"/><circle cx="101.2" cy="59.6" r="0.7" fill="#FFFFFF"/>`;
  return s;
}

/** Éclat de supernova (rayons en triangles plats, cœur facetté). */
function supernova(k: Cols, x: number, y: number, R: number, seed: number): string {
  const r = prng(seed);
  let s = `<circle cx="${x}" cy="${y}" r="${R * 0.9}" fill="${k.glow}" opacity="0.18"/><circle cx="${x}" cy="${y}" r="${R * 0.5}" fill="#FFF6D8" opacity="0.2"/>`;
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2 + 0.1, L0 = R * (i % 2 ? 0.95 : 1.45) * (0.85 + r() * 0.3), w = i % 2 ? 2.4 : 3.8;
    const nx = -Math.sin(a) * w, ny = Math.cos(a) * w;
    s += flat([[x + nx, y + ny], [x + Math.cos(a) * L0, y + Math.sin(a) * L0], [x - nx, y - ny]], i % 2 ? k.glow : '#FFF6D8', i % 2 ? 0.35 : 0.5);
  }
  for (let i = 0; i < 28; i++) { const a = (i / 28) * Math.PI * 2; s += `<circle cx="${(x + Math.cos(a) * R * 0.64).toFixed(1)}" cy="${(y + Math.sin(a) * R * 0.64).toFixed(1)}" r="0.9" fill="${GOLD}"/>`; }
  s += gem(x, y, R * 0.3, '#FFFFFF', '#FFE9A8');
  return s;
}

/** Adulte : ailes déployées devant la supernova, longues rectrices à ocelles. */
function adult(k: Cols, L: Light): string {
  let s = supernova(k, 111, 92, 70, 5);
  for (const [a, len, col] of [[64, 54, k.base], [116, 54, k.base], [76, 62, k.light], [104, 62, k.light], [90, 70, k.belly]] as [number, number, string][]) s += feather(111, 150, a, len, 8, col, k.cool, L, a, (90 - a) * 0.002);
  for (const sg of [-1, 1]) {
    const q: Pt[] = sm([[111, 150], [111 + sg * 10, 182], [111 + sg * 34, 206], [111 + sg * 62, 214], [111 + sg * 78, 200], [111 + sg * 70, 188]], 3, false);
    s += facets(limb(q, q.map((_, i) => 3 - (i / q.length) * 1.5)), k.light, L, { size: 3, relief: 0.3, seed: 60 + sg });
    s += facets(ellipse(111 + sg * 70, 188, 7, 5.5, 10), k.deep, L, { size: 3, relief: 0.5, seed: 62 + sg }) + gem(111 + sg * 70, 188, 4.5, '#FFFFFF', GOLD);
  }
  s += spreadWing(k, L, [100, 104], [56, 74], [34, 64], 100);
  s += `<g transform="translate(111 0) scale(-0.9 1) translate(-111 0)">${spreadWing(k, dim(L, 0.2), [100, 104], [56, 74], [34, 64], 200)}</g>`;
  for (const [x, sg] of [[104, -1], [118, 1]] as Pt[]) {
    s += facets([[x - 3, 158], [x + 3, 158], [x + 2 + sg, 172], [x - 2 + sg, 172]], GOLD, L, { size: 3, relief: 0.3, seed: x });
    for (const dx of [-3, 0, 3]) s += flat([[x + sg + dx - 1, 171], [x + sg + dx + 1, 171], [x + sg + dx * 1.6, 178]], '#140A10');
    s += facets([[x - 8, 138], [x + 8, 138], [x + 6, 156], [x + 2, 162], [x, 157], [x - 3, 162], [x - 7, 152]], k.base, L, { size: 4, relief: 0.6, seed: x + 1, base2: k.deep });
  }
  s += facets(sm([[100, 80], [92, 98], [92, 122], [98, 142], [111, 154], [124, 144], [130, 122], [128, 100], [120, 84]], 2), k.base, L, { size: 6, relief: 1.2, seed: 70, base2: k.deep });
  s += facets(sm([[96, 90], [104, 96], [110, 120], [104, 148], [94, 130]], 2), k.belly, L, { size: 5, relief: 0.6, seed: 71 });
  s += gem(111, 112, 6, '#FFFFFF', GOLD);
  s += facets(sm([[96, 86], [92, 72], [98, 62], [112, 60], [122, 70], [124, 90]], 2), k.base, L, { size: 5, relief: 0.8, seed: 72 });
  s += `<g transform="translate(6 18) rotate(-6 110 66)">${head(k, L, { crest: 1, seed: 80 })}</g>`;
  return s;
}

/** Jeune sur sa branche, une aile levée, bec ouvert : il crie avant de s'envoler. */
function perched(k: Cols, L: Light): string {
  let s = '';
  for (const [a, len, col] of [[64, 74, k.deep], [58, 80, k.base], [52, 70, k.light]] as [number, number, string][]) s += feather(140, 150, a, len, 8, col, k.cool, L, a, 0.03);
  const bL: Light = { dir: [0.2, 0.7, 0.6], color: '#FF9A55', shade: '#0A0408', rim: '#FF7A3A' };
  s += facets(sm([[6, 188], [40, 180], [90, 178], [140, 182], [190, 176], [220, 170], [222, 182], [190, 188], [140, 194], [90, 190], [40, 192], [6, 200]], 2), '#3A2422', bL, { size: 7, relief: 0.6, seed: 2 });
  s += facets([[40, 184], [30, 168], [20, 160], [36, 170], [48, 182]], '#3A2422', bL, { size: 4, relief: 0.4, seed: 3 });
  s += `<g transform="translate(132 98) scale(0.62) rotate(14 112 104) translate(-112 -104)">${spreadWing(k, dim(L), [112, 104], [80, 64], [64, 46], 300)}</g>`;
  s += facets(sm([[96, 88], [86, 106], [88, 134], [104, 160], [128, 170], [150, 160], [154, 136], [140, 108], [118, 90]], 2), k.base, L, { size: 7, relief: 1.2, seed: 10, base2: k.deep });
  s += facets(sm([[88, 104], [98, 110], [106, 140], [118, 166], [94, 150]], 2), k.belly, L, { size: 5, relief: 0.6, seed: 11 });
  for (const x of [112, 126]) {
    s += facets([[x - 3, 164], [x + 3, 164], [x + 2, 176], [x - 2, 176]], GOLD, L, { size: 3, relief: 0.3, seed: x });
    for (const dx of [-5, 0, 5]) s += flat([[x + dx * 0.4 - 1, 175], [x + dx * 0.4 + 1, 175], [x + dx * 1.4, 183]], '#140A10');
    s += facets([[x - 9, 148], [x + 7, 148], [x + 6, 162], [x + 2, 168], [x, 163], [x - 3, 168], [x - 8, 160]], k.base, L, { size: 4, relief: 0.6, seed: x + 3, base2: k.deep });
  }
  s += `<g transform="translate(130 104) scale(-0.74 0.74) translate(-112 -104)">${spreadWing(k, L, [112, 104], [80, 64], [64, 46], 400)}</g>`;
  s += facets(sm([[96, 92], [94, 76], [104, 64], [118, 66], [124, 84], [118, 96]], 2), k.base, L, { size: 5, relief: 0.8, seed: 20 });
  s += `<g transform="translate(2 14) rotate(-10 112 68)">${head(k, L, { crest: 0.55, open: true, seed: 30 })}</g>`;
  return s;
}

/** Poussin qui sort de l'œuf, dans un nid de brindilles et de braises. */
function chick(k: Cols, L: Light): string {
  const nL: Light = { ...L, color: '#FFB26B' };
  let s = facets(sm([[40, 178], [70, 168], [112, 166], [156, 168], [186, 178], [150, 182], [112, 184], [74, 182]], 2), '#2A1A20', nL, { size: 8, relief: 0.4, seed: 1 });
  s += facets([[90, 128], [76, 140], [70, 160], [82, 156], [94, 146]], k.deep, dim(L), { size: 5, relief: 0.6, seed: 2 });
  s += facets(sm([[96, 108], [122, 106], [138, 122], [146, 148], [146, 172], [134, 190], [110, 194], [88, 190], [78, 170], [80, 142], [86, 122]], 2), k.light, L, { size: 6, relief: 1.4, seed: 3, base2: k.base });
  s += facets(ellipse(100, 150, 13, 24, 12), k.belly, L, { size: 5, relief: 0.6, seed: 4 });
  for (let i = 0; i < 3; i++) s += feather(132 + i * 2, 150 + i * 3, 74 - i * 14, 20 - i * 2, 3.2, k.ember, k.glow, L, 5 + i);
  s += facets([[122, 124], [138, 130], [146, 150], [144, 166], [130, 156], [120, 140]], k.base, L, { size: 4.5, relief: 0.7, seed: 9 });
  // Coquille brisée (coupe + calotte), fêlures dorées.
  const egg = '#EFE4CC', eL: Light = { ...L, shade: '#5A3A40' };
  s += facets([[74, 160], [82, 152], [88, 162], [98, 154], [106, 164], [116, 156], [126, 165], [136, 155], [144, 163], [152, 156], [154, 176], [142, 196], [112, 204], [84, 198], [72, 180]], egg, eL, { size: 7, relief: 1.2, seed: 10 });
  s += flat([[104, 164], [111, 176], [107, 186], [115, 198], [113, 199], [105, 186], [109, 176], [102, 165]], GOLD, 0.9);
  s += facets([[156, 178], [160, 166], [172, 160], [184, 166], [188, 178], [182, 174], [176, 180], [170, 174], [164, 181]], egg, eL, { size: 5, relief: 0.8, seed: 11 });
  // Tête au crâne duveteux.
  s += `<g transform="translate(110 92) scale(1.26) translate(-108 -66)">${facets(ellipse(109, 65, 17, 16.5, 14), k.light, L, { size: 5, relief: 1, seed: 12 })}${head(k, L, { crest: 0.15, young: 1, seed: 13 })}</g>`;
  // Bord avant du nid, braises.
  s += facets(sm([[36, 178], [74, 186], [112, 188], [150, 186], [190, 176], [182, 196], [150, 210], [112, 214], [72, 210], [44, 196]], 2), '#4A2E2A', nL, { size: 7, relief: 0.6, seed: 14, base2: '#1A0E14' });
  const r = prng(15);
  for (let i = 0; i < 9; i++) s += gem(50 + i * 15 + r() * 6, 183 + Math.sin(i * 1.3) * 3, 2.2 + r() * 1.5, '#FFF3C4', i % 2 ? k.glow : '#FF9A55');
  return s;
}

const LIGHTS: Light[] = [
  { dir: [0.5, -0.5, 0.6], color: '#FFB26B', shade: '#1A0A1E', rim: '#FF8A5C' },
  { dir: [0.15, 0.6, 0.7], color: '#FFA860', shade: '#0E0618', rim: '#A8B8FF' },
  { dir: [0, -0.6, 0.75], color: '#FFF3C4', shade: '#140A2A', rim: '#FFE9A8' },
];

const draw = (c: DrawCtx): string => {
  const st = Math.min(2, c.stage), k = colors(c.hue), L = LIGHTS[st];
  if (st === 0) return `<g transform="translate(111 206) scale(1.1) translate(-112 -206)">${chick(k, L)}</g>`;
  if (st === 1) return `<g transform="translate(111 196) scale(1.12) translate(-116 -186)">${perched(k, L)}</g>`;
  let s = adult(k, L);
  if (c.stage >= 3) s += `<polyline points="60,160 74,176 70,194" fill="none" stroke="${GOLD}" stroke-width="0.7"/>` + gem(60, 160, 3, '#FFFFFF', GOLD) + gem(74, 176, 3, '#FFFFFF', GOLD) + gem(70, 194, 3, '#FFFFFF', GOLD);
  return `<g transform="translate(111 112) scale(0.97) translate(-111 -110)">${s}</g>`;
};

const scene = (c: DrawCtx, b: Bounds): string => {
  const st = Math.min(2, c.stage), r = prng(500 + st), W = b.x1 - b.x0;
  const starsOf = (n: number, ymax: number) => { let t = ''; for (let i = 0; i < n; i++) t += `<circle cx="${(b.x0 + r() * W).toFixed(1)}" cy="${(b.y0 + r() * (ymax - b.y0)).toFixed(1)}" r="${(0.4 + r() * 0.9).toFixed(1)}" fill="#FFFFFF" opacity="${(0.35 + r() * 0.5).toFixed(2)}"/>`; return t; };
  const embers = (n: number, y0: number, y1: number) => { let t = ''; for (let i = 0; i < n; i++) t += `<circle cx="${(b.x0 + r() * W).toFixed(1)}" cy="${(y0 + r() * (y1 - y0)).toFixed(1)}" r="${(0.6 + r() * 1.1).toFixed(1)}" fill="${r() > 0.5 ? '#FFC27A' : '#FF8A4A'}" opacity="${(0.5 + r() * 0.5).toFixed(2)}"/>`; return t; };
  let s = '';
  if (st === 0) {
    // Corniche au crépuscule, volcan fumant et coulées de lave.
    s += facetSky(b.x0, b.y0, b.x1, b.y1, ['#140A2A', '#3A1E50', '#7A3A60', '#D8684A', '#FFB070', '#2A1420'], 21, 24) + starsOf(25, 80);
    const vL: Light = { dir: [0.5, -0.5, 0.6], color: '#FF9A6A', shade: '#120818' };
    for (let i = 0; i < 5; i++) s += facets(ellipse(150 + i * 6 + r() * 6, 86 - i * 16, 10 + i * 4, 8 + i * 3, 10), '#5A4060', vL, { size: 10, relief: 0.6, seed: 30 + i, opacity: 0.45 - i * 0.06 });
    s += facets([[92, 166], [136, 104], [146, 98], [158, 100], [168, 106], [214, 166]], '#3A2440', vL, { size: 14, relief: 0.8, seed: 22 });
    s += flat([[146, 100], [149, 100], [145, 126], [142, 160], [138, 160], [143, 126]], '#FF9A4A', 0.9) + flat([[157, 102], [160, 102], [164, 130], [162, 160], [158, 160], [160, 130]], '#FFB86A', 0.85);
    s += gem(152, 99, 8, '#FFF0C0', '#FF9A4A');
    s += facets([[b.x0, 166], [30, 152], [80, 160], [120, 150], [170, 162], [b.x1, 154], [b.x1, 180], [b.x0, 180]], '#2C1A34', vL, { size: 16, relief: 0.5, seed: 23 });
    s += facets([[b.x0, 176], [20, 172], [60, 180], [110, 190], [170, 182], [b.x1, 170], [b.x1, b.y1], [b.x0, b.y1]], '#24142A', { dir: [0.5, -0.6, 0.6], color: '#FF9A6A', shade: '#08040C' }, { size: 20, relief: 0.6, seed: 24, base2: '#0C0610' });
    s += embers(26, b.y0, 170);
    return s;
  }
  if (st === 1) {
    // Nuit au bord d'une caldeira : deux lunes, lueur de lave en contrebas.
    s += facetSky(b.x0, b.y0, b.x1, b.y1, ['#070414', '#160A28', '#2A1030', '#6A2428', '#C2502A', '#3A1418'], 25, 24) + starsOf(50, 150);
    s += facets(ellipse(44, 44, 13, 13, 14), '#E9DFC6', { dir: [-0.6, -0.4, 0.6], color: '#FFFFFF', shade: '#3A3460' }, { size: 6, relief: 0.6, seed: 26 });
    s += `<circle cx="51" cy="40" r="12" fill="#0C0618"/>` + facets(ellipse(72, 30, 5, 5, 10), '#D8CFC0', { dir: [-0.6, -0.4, 0.6], color: '#FFFFFF', shade: '#3A3460' }, { size: 3, seed: 27 });
    const kL: Light = { dir: [0.1, 0.8, 0.5], color: '#FF8A4A', shade: '#08040C' };
    s += facets([[b.x0, 176], [30, 150], [70, 168], [120, 146], [170, 166], [b.x1, 148], [b.x1, 200], [b.x0, 200]], '#24121E', kL, { size: 16, relief: 0.6, seed: 28 });
    s += facets([[b.x0, 206], [60, 200], [140, 208], [b.x1, 202], [b.x1, b.y1], [b.x0, b.y1]], '#1C0E14', kL, { size: 20, relief: 0.5, seed: 29, base2: '#0A0408' });
    for (const [x, y, w] of [[20, 216, 40], [80, 224, 50], [150, 214, 46], [190, 226, 40]]) s += flat([[x, y], [x + w * 0.4, y - 3], [x + w, y + 1], [x + w * 0.6, y + 4]], '#FF8A3A', 0.85);
    s += embers(36, 60, 230);
    return s;
  }
  // Très haut au-dessus d'une planète, nébuleuse.
  s += facetSky(b.x0, b.y0, b.x1, b.y1, ['#04031A', '#100A36', '#24145A', '#1A1040', '#0A0820'], 31, 24);
  const nb: Light = { dir: [0, -0.6, 0.7], color: '#FFFFFF', shade: '#100A30' };
  s += facets(ellipse(40, 50, 70, 34, 16, 0.3), colors(c.hue).cool, nb, { size: 16, relief: 0.4, seed: 32, opacity: 0.25 });
  s += facets(ellipse(190, 140, 50, 40, 14), colors(c.hue).ember, nb, { size: 16, relief: 0.4, seed: 33, opacity: 0.2 });
  s += starsOf(70, b.y1 - 60);
  const R = 300, cx = 111, cy = 200 + R;
  const arc: Pt[] = [];
  for (let i = 0; i <= 20; i++) { const x = b.x0 - 10 + ((W + 20) * i) / 20; arc.push([x, cy - Math.sqrt(R * R - (x - cx) ** 2)]); }
  s += facets([...arc, [b.x1 + 10, b.y1], [b.x0 - 10, b.y1]], '#2A5A6A', { dir: [0, -0.9, 0.4], color: '#BFF6FF', shade: '#06101A', rim: '#BFF6FF' }, { size: 22, relief: 0.6, seed: 34, base2: '#08141E' });
  s += `<polyline points="${arc.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' ')}" fill="none" stroke="#BFF6FF" stroke-width="1.2" opacity="0.7"/>`;
  return s;
};

export const phenova: Species = Object.assign(draw, { scene });
