import type { Bounds, DrawCtx, Species } from './style.ts';
import { ellipse, facetSky, facets, gem, hsl, limb, mix, prng, type Light, type Pt } from './lowpoly.ts';

/**
 * Météorin → Cristallos → Astrolithe (low-poly) : golem de météorite et de cristal, cœur d'étoile.
 * 0 : tout juste tombé, il se recroqueville au fond d'un cratère encore fumant, sur un désert lunaire, et ouvre un
 * œil. 1 : le jeune traverse une caverne de cristal, une géode lumineuse brandie comme une lanterne. 2 : l'adulte
 * se dresse sur un astéroïde, bras ouverts, cœur embrasé, devant une planète à anneaux.
 */

const flat = (q: Pt[], col: string, op = 1) => `<path d="M${q.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('L')}Z" fill="${col}"${op < 1 ? ` opacity="${op}"` : ''}/>`;
const GOLD = '#E9C25B', CRYSTAL = '#BFF6FF';
/** Petit décalage déterministe (-0.5..0.5) pour l'irrégularité des blocs. */
const jit = (i: number, k: number) => (((Math.sin(i * 12.9898 + k * 78.233) * 43758.5453) % 1) * 0.5);

interface Cols { base: string; deep: string; light: string; dark: string; c1: string; c2: string; glow: string; eye: string }
const colors = (h: number): Cols => ({
  base: hsl(h, 22, 42), deep: hsl(h + 10, 30, 20), light: hsl(h - 10, 25, 64), dark: hsl(h + 20, 35, 8),
  c1: mix(CRYSTAL, hsl(h + 160, 70, 60), 0.35), c2: mix(CRYSTAL, hsl(h + 220, 70, 66), 0.3), glow: hsl(h + 40, 95, 70), eye: '#FFC86A',
});
const dim = (L: Light, t = 0.45): Light => ({ ...L, color: mix(L.color, L.shade, t), rim: undefined });

/** Bloc allongé entre deux articulations. */
function seg(A: Pt, B: Pt, wa: number, wb: number, i: number): Pt[] {
  const dx = B[0] - A[0], dy = B[1] - A[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l, ux = dx / l, uy = dy / l;
  const P = (t: number, sd: number, w: number, j: number): Pt => { const ww = w * (1 + jit(i, j) * 0.25); return [A[0] + dx * t + nx * ww * sd, A[1] + dy * t + ny * ww * sd]; };
  return [[A[0] - ux * wa * 0.5 + nx * wa * 0.4, A[1] - uy * wa * 0.5 + ny * wa * 0.4], P(0.05, 1, wa, 1), P(0.5, 1, ((wa + wb) / 2) * 1.08, 2), P(0.95, 1, wb, 3),
    [B[0] + ux * wb * 0.45 + nx * wb * 0.3, B[1] + uy * wb * 0.45 + ny * wb * 0.3], [B[0] + ux * wb * 0.4 - nx * wb * 0.4, B[1] + uy * wb * 0.4 - ny * wb * 0.4],
    P(0.95, -1, wb, 4), P(0.5, -1, (wa + wb) / 2, 5), P(0.05, -1, wa, 6), [A[0] - ux * wa * 0.5 - nx * wa * 0.3, A[1] - uy * wa * 0.5 - ny * wa * 0.3]];
}
function blob(x: number, y: number, rx: number, ry: number, n: number, i: number, rot = 0): Pt[] {
  return Array.from({ length: n }, (_, k) => { const a = (k / n) * Math.PI * 2 + rot, r = 1 + jit(i, k) * 0.28; return [x + Math.cos(a) * rx * r, y + Math.sin(a) * ry * r] as Pt; });
}

/** Bloc de roche facetté, avec quelques cratères plats. */
function rock(q: Pt[], col: string, L: Light, seed: number, pits = 1, size = 7): string {
  let s = facets(q, col, L, { size, relief: 1, seed, jitter: 0.18 });
  let cx = 0, cy = 0, R = 0;
  for (const [x, y] of q) { cx += x / q.length; cy += y / q.length; }
  for (const [x, y] of q) R = Math.max(R, Math.hypot(x - cx, y - cy));
  for (let i = 0; i < pits; i++) {
    const px = cx + jit(i, seed) * R, py = cy + jit(i + 7, seed) * R, r = R * (0.08 + Math.abs(jit(i, 3)) * 0.1);
    s += flat(ellipse(px, py, r, r * 0.7, 8), mix(col, '#000000', 0.45), 0.8) + flat(ellipse(px, py + r * 0.25, r * 0.8, r * 0.4, 8), mix(col, '#FFFFFF', 0.15), 0.5);
  }
  return s;
}

/** Cristal prismatique facetté (pointe vers `ang` degrés). */
function crystal(x: number, y: number, ang: number, len: number, w: number, col: string, L: Light, seed: number): string {
  const a = (ang * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a), h = w / 2;
  const T = ([u, v]: Pt): Pt => [x + u * ca - v * sa, y + u * sa + v * ca];
  const cL: Light = { ...L, color: '#FFFFFF', shade: mix(col, '#203A80', 0.6) };
  return facets(([[0, -h], [len * 0.78, -h], [len, 0], [len * 0.78, h], [0, h]] as Pt[]).map(T), col, cL, { size: Math.max(3, w * 0.7), relief: 0.35, seed })
    + flat(([[0, -h], [len * 0.78, -h], [len, 0], [0, -h * 0.1]] as Pt[]).map(T), '#FFFFFF', 0.3);
}
function cluster(x: number, y: number, base: number, sizes: number[], col: string, col2: string, L: Light, seed: number): string {
  let s = `<circle cx="${(x + Math.cos((base * Math.PI) / 180) * sizes[0] * 0.5).toFixed(1)}" cy="${(y + Math.sin((base * Math.PI) / 180) * sizes[0] * 0.5).toFixed(1)}" r="${(sizes[0] * 0.7).toFixed(1)}" fill="${col}" opacity="0.15"/>`;
  sizes.forEach((len, i) => { s += crystal(x, y, base + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 17, len, len * 0.3, i % 2 ? col2 : col, L, seed + i); });
  return s;
}

/** Cœur d'étoile : fissures lumineuses rayonnantes, cavité, gemme. */
function core(k: Cols, x: number, y: number, r: number, cracks: Pt[][]): string {
  let s = '';
  for (const c of cracks) s += flat(limb(c, c.map((_, i) => 2.2 - i * 0.6)), k.glow, 0.95) + flat(limb(c, c.map(() => 0.7)), '#FFF6D8');
  s += `<circle cx="${x}" cy="${y}" r="${(r * 2.2).toFixed(1)}" fill="${k.glow}" opacity="0.2"/>`;
  s += flat(blob(x, y, r, r * 0.95, 9, 5), k.dark);
  s += gem(x, y, r * 0.95, '#FFFFFF', k.glow);
  return s;
}

interface Pose { chest: Pt; ts: number; head: Pt; hs: number; sh: [Pt, Pt]; el: [Pt, Pt]; ha: [Pt, Pt]; hip: [Pt, Pt]; kn: [Pt, Pt]; ft: [Pt, Pt]; arm: number; leg: number; crystals: number }

/** Golem articulé : membres en blocs, torse massif, cœur, cristaux. Le côté « 1 » est derrière. */
function golem(k: Cols, L: Light, P: Pose, hand0 = ''): string {
  const Lf = dim(L);
  const limbs = (i: 0 | 1, col: string, l: Light) => {
    let t = rock(seg(P.hip[i], P.kn[i], P.leg, P.leg * 0.9, 10 + i), col, l, 10 + i);
    t += rock(seg(P.kn[i], P.ft[i], P.leg * 0.85, P.leg * 0.95, 20 + i), col, l, 20 + i);
    const [fx, fy] = P.ft[i];
    t += rock([[fx - P.leg * 1.2, fy + 2], [fx - P.leg * 1.1, fy - P.leg * 0.5], [fx - P.leg * 0.2, fy - P.leg * 0.9], [fx + P.leg * 0.9, fy - P.leg * 0.6], [fx + P.leg * 1.2, fy + 2]], col, l, 30 + i, 0, 6);
    return t;
  };
  const arm = (i: 0 | 1, col: string, l: Light) =>
    rock(seg(P.sh[i], P.el[i], P.arm, P.arm * 0.85, 40 + i), col, l, 40 + i) + rock(seg(P.el[i], P.ha[i], P.arm * 0.85, P.arm * 1.1, 50 + i), col, l, 50 + i)
    + rock(blob(P.ha[i][0], P.ha[i][1], P.arm * 1.15, P.arm * 1.05, 7, 60 + i), col, l, 60 + i, 1, 6);
  let s = limbs(1, k.deep, Lf) + arm(1, k.deep, Lf);
  const [cx, cy] = P.chest, T = P.ts;
  s += rock([[cx - 26 * T, cy + 36 * T], [cx + 26 * T, cy + 36 * T], [cx + 30 * T, cy + 54 * T], [cx, cy + 62 * T], [cx - 30 * T, cy + 54 * T]], k.base, L, 70);
  s += limbs(0, k.base, L);
  s += rock(([[-41, -38], [-19, -48], [19, -48], [45, -36], [51, -4], [39, 32], [13, 44], [-15, 44], [-39, 32], [-49, -4]] as Pt[]).map(([x, y]) => [cx + x * T, cy + y * T] as Pt), k.base, L, 71, 3, 9);
  s += core(k, cx, cy - 2 * T, 11 * T, [
    [[cx, cy - 2 * T], [cx - 18 * T, cy - 10 * T], [cx - 34 * T, cy - 4 * T]],
    [[cx, cy - 2 * T], [cx + 16 * T, cy - 18 * T], [cx + 30 * T, cy - 30 * T]],
    [[cx, cy], [cx + 6 * T, cy + 20 * T], [cx - 4 * T, cy + 38 * T]],
    [[cx, cy], [cx + 24 * T, cy + 6 * T], [cx + 42 * T, cy + 2 * T]],
  ]);
  for (const i of [1, 0] as const) {
    const [sx, sy] = P.sh[i];
    s += rock(blob(sx, sy - 4, P.arm * 1.7, P.arm * 1.35, 7, 80 + i, 0.3), i ? k.deep : k.base, i ? Lf : L, 80 + i);
    if (P.crystals > 0) s += cluster(sx + (i ? 4 : -4), sy - P.arm * 0.9, i ? -70 : -110, [34, 24, 22, 14].map((v) => v * P.crystals), i ? k.c2 : k.c1, i ? k.c1 : k.c2, L, 90 + i * 10);
  }
  s += arm(0, k.base, L) + hand0;
  const [hx, hy] = P.head, H = P.hs;
  s += rock(([[-16, -12], [-4, -20], [12, -16], [18, -2], [12, 12], [-6, 14], [-18, 4]] as Pt[]).map(([x, y]) => [hx + x * H, hy + y * H] as Pt), k.base, L, 110, 1, 5);
  s += flat([[hx - 16 * H, hy - 3 * H], [hx + 16 * H, hy - 5 * H], [hx + 14 * H, hy + 2 * H], [hx - 15 * H, hy + 4 * H]], k.dark);
  for (const ex of [-8, 7]) s += `<circle cx="${(hx + ex * H).toFixed(1)}" cy="${hy.toFixed(1)}" r="${(4.5 * H).toFixed(1)}" fill="${k.eye}" opacity="0.25"/>` + gem(hx + ex * H, hy, 3.2 * H, '#FFFFFF', k.eye);
  if (P.crystals > 0.6) s += cluster(hx + 4 * H, hy - 16 * H, -95, [16, 11, 10].map((v) => v * P.crystals), k.c2, k.c1, L, 120);
  return s;
}

const LIGHTS: Light[] = [
  { dir: [0.5, -0.6, 0.6], color: '#CFE0FF', shade: '#0A0A1E', rim: '#9FD0FF' },
  { dir: [-0.7, -0.3, 0.6], color: '#D8FFFF', shade: '#080818', rim: '#BFF6FF' },
  { dir: [0, -0.3, 0.9], color: '#FFE0B0', shade: '#120A20', rim: '#FFD9A0' },
];

const draw = (c: DrawCtx): string => {
  const st = Math.min(2, c.stage), k = colors(c.hue), L = LIGHTS[st];
  if (st === 0) {
    let s = `<ellipse cx="112" cy="194" rx="60" ry="10" fill="#04040C" opacity="0.45"/>`;
    for (const [x, sg] of [[78, 1], [126, -1], [150, 1]]) s += flat(limb([[x, 140], [x + sg * 6, 124], [x - sg * 3, 108], [x + sg * 4, 90]], [3, 4, 5, 2]), '#E8EEFF', 0.18);
    s += rock([[64, 186], [62, 160], [76, 136], [100, 122], [132, 120], [156, 132], [168, 156], [164, 184], [140, 194], [90, 196]], k.base, L, 1, 4, 9);
    s += core(k, 136, 150, 5, [[[136, 150], [150, 140], [160, 146]], [[136, 150], [128, 168], [134, 184]], [[136, 150], [112, 140], [96, 130]]]);
    s += cluster(110, 124, -80, [22, 15, 13], k.c1, k.c2, L, 5) + cluster(150, 130, -50, [14, 10], k.c2, k.c1, L, 9);
    s += rock([[56, 160], [66, 146], [86, 142], [100, 152], [100, 172], [86, 182], [64, 180]], k.base, L, 12, 1, 5);
    s += flat([[58, 158], [68, 152], [98, 154], [96, 160], [66, 161]], k.dark);
    s += `<circle cx="72" cy="166" r="6" fill="${k.eye}" opacity="0.25"/>` + gem(72, 166, 4, '#FFFFFF', k.eye) + flat([[84, 165], [94, 165], [94, 167], [84, 167]], k.dark);
    s += rock(blob(58, 186, 10, 8, 6, 9), k.base, L, 13, 0, 5);
    // Lèvre avant du cratère.
    s += facets([[10, 236], [14, 196], [40, 186], [70, 192], [112, 196], [150, 196], [180, 188], [212, 194], [214, 236]], '#3A3C58', { ...L, color: '#AFC0E8' }, { size: 12, relief: 0.6, seed: 14, base2: '#16182A' });
    const r = prng(15);
    for (let i = 0; i < 7; i++) s += gem(40 + i * 24 + r() * 8, 194 + r() * 4, 2 + r() * 1.5, '#FFF3C4', k.glow);
    return `<g transform="translate(111 200) scale(1.15) translate(-112 -196)">${s}</g>`;
  }
  if (st === 1) {
    const lantern = `<circle cx="44" cy="112" r="26" fill="${k.c1}" opacity="0.18"/>` + cluster(44, 122, -90, [26, 18, 18, 12], k.c1, k.c2, L, 200) + gem(44, 104, 5, '#FFFFFF', k.c1);
    const P: Pose = { chest: [118, 104], ts: 0.78, head: [96, 66], hs: 0.95, sh: [[90, 80], [146, 82]], el: [[66, 110], [160, 124]], ha: [[48, 128], [166, 160]], hip: [[108, 150], [132, 150]], kn: [[96, 176], [140, 176]], ft: [[84, 202], [154, 202]], arm: 11, leg: 11.5, crystals: 0.75 };
    return `<g transform="translate(111 204) scale(1.06) translate(-114 -204)"><ellipse cx="118" cy="204" rx="62" ry="7" fill="#04040C" opacity="0.45"/>${golem(k, L, P, lantern)}</g>`;
  }
  const P: Pose = { chest: [111, 106], ts: 1, head: [111, 50], hs: 1.05, sh: [[62, 78], [160, 78]], el: [[38, 112], [184, 112]], ha: [[28, 150], [194, 150]], hip: [[92, 160], [130, 160]], kn: [[82, 184], [140, 184]], ft: [[76, 206], [146, 206]], arm: 14, leg: 15, crystals: 1.45 };
  let s = `<ellipse cx="111" cy="208" rx="70" ry="8" fill="#04040C" opacity="0.45"/><circle cx="111" cy="104" r="64" fill="${k.glow}" opacity="0.1"/>`;
  s += golem(k, L, P);
  for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2; s += `<circle cx="${(111 + Math.cos(a) * 24).toFixed(1)}" cy="${(104 + Math.sin(a) * 24).toFixed(1)}" r="0.9" fill="${GOLD}"/>`; }
  s += gem(111, 79, 3, '#FFFFFF', GOLD) + gem(111, 129, 3, '#FFFFFF', GOLD);
  if (c.stage >= 3) s += `<polyline points="20,30 40,18 58,28" fill="none" stroke="${GOLD}" stroke-width="0.7"/>` + gem(20, 30, 3, '#FFFFFF', GOLD) + gem(40, 18, 3, '#FFFFFF', GOLD) + gem(58, 28, 3, '#FFFFFF', GOLD);
  return `<g transform="translate(111 210) scale(0.98) translate(-111 -210)">${s}</g>`;
};

const scene = (c: DrawCtx, b: Bounds): string => {
  const st = Math.min(2, c.stage), r = prng(900 + st), W = b.x1 - b.x0, k = colors(c.hue);
  const starsOf = (n: number, ymax: number) => { let t = ''; for (let i = 0; i < n; i++) t += `<circle cx="${(b.x0 + r() * W).toFixed(1)}" cy="${(b.y0 + r() * (ymax - b.y0)).toFixed(1)}" r="${(0.4 + r() * 0.9).toFixed(1)}" fill="#FFFFFF" opacity="${(0.35 + r() * 0.55).toFixed(2)}"/>`; return t; };
  const gL: Light = { dir: [0.5, -0.6, 0.6], color: '#AFC0E8', shade: '#06060E' };
  let s = '';
  if (st === 0) {
    // Désert lunaire : planète bleue, traînée du météore, cratère.
    s += facetSky(b.x0, b.y0, b.x1, b.y1, ['#03040E', '#0A1028', '#141C3A', '#1A2240', '#0A0C18'], 71, 24) + starsOf(70, 140);
    s += `<circle cx="168" cy="52" r="30" fill="#6AA8FF" opacity="0.12"/>` + facets(ellipse(168, 52, 22, 22, 16), '#3A6AA8', { dir: [-0.6, -0.4, 0.6], color: '#CFE6FF', shade: '#06102A' }, { size: 7, relief: 0.8, seed: 72 });
    s += flat([[6, 18], [10, 14], [98, 118], [94, 122]], k.glow, 0.35) + flat([[8, 16], [9, 15], [96, 120], [95, 121]], '#FFFFFF', 0.7);
    s += facets([[b.x0, 150], [10, 134], [40, 130], [60, 146], [100, 148], [120, 136], [150, 134], [170, 148], [b.x1, 144], [b.x1, 172], [b.x0, 172]], '#3A3E5A', gL, { size: 14, relief: 0.4, seed: 73 });
    s += facets([[b.x0, 160], [60, 152], [160, 154], [b.x1, 160], [b.x1, b.y1], [b.x0, b.y1]], '#4A4E66', gL, { size: 20, relief: 0.3, seed: 74, base2: '#14162A' });
    s += facets(ellipse(112, 190, 100, 30, 20), '#22243A', { dir: [-0.5, 0.6, 0.6], color: '#8A9AC8', shade: '#05050C' }, { size: 14, relief: 0.6, seed: 75 });
    s += `<ellipse cx="112" cy="196" rx="56" ry="13" fill="${k.glow}" opacity="0.12"/>`;
    for (const [x, y, rr] of [[30, 172, 8], [190, 166, 6], [170, 232, 9]]) s += flat(ellipse(x, y, rr, rr * 0.35, 10), '#1C1E30');
    return s;
  }
  if (st === 1) {
    // Caverne de cristal.
    s += facetSky(b.x0, b.y0, b.x1, b.y1, ['#08061A', '#140E30', '#1C1640', '#100C24', '#06040E'], 81, 22);
    const wL: Light = { dir: [-0.7, -0.3, 0.6], color: k.c1, shade: '#04040C' };
    s += flat([[150, b.y0], [190, b.y0], [140, 220], [100, 220]], '#FFFFFF', 0.05);
    s += facets([[b.x0, b.y0], [b.x1, b.y0], [b.x1, 30], [190, 40], [176, 60], [164, 36], [140, 46], [124, 30], [100, 50], [86, 30], [60, 44], [44, 70], [30, 40], [b.x0, 50]], '#1E1A38', wL, { size: 16, relief: 0.5, seed: 82 });
    s += facets([[b.x0, 40], [24, 60], [30, 120], [20, 200], [b.x0, 214]], '#1A1632', wL, { size: 16, relief: 0.5, seed: 83 });
    s += facets([[b.x1, 30], [196, 70], [204, 140], [196, 200], [b.x1, 214]], '#1A1632', wL, { size: 16, relief: 0.5, seed: 84 });
    for (const [x, y, a, m] of [[30, 120, -40, 0.8], [200, 140, -140, 1], [180, 56, 110, 0.6], [62, 44, 80, 0.5], [120, 34, 95, 0.5]]) s += `<g opacity="0.8">${cluster(x, y, a, [26, 18, 16, 12].map((v) => v * m), k.c2, k.c1, wL, 85 + x)}</g>`;
    s += facets([[b.x0, 196], [50, 190], [170, 192], [b.x1, 198], [b.x1, b.y1], [b.x0, b.y1]], '#2A2446', wL, { size: 18, relief: 0.3, seed: 86, base2: '#0A0816' });
    for (const [x, m] of [[192, 0.7], [16, 0.5]]) s += cluster(x, 212, -90, [20, 14, 12].map((v) => v * m), k.c1, k.c2, wL, 87 + x);
    return s;
  }
  // Champ d'astéroïdes, planète à anneaux, gros astéroïde-piédestal.
  s += facetSky(b.x0, b.y0, b.x1, b.y1, ['#04031A', '#0E0A30', '#1A1248', '#120C30', '#06041A'], 91, 24);
  const nb: Light = { dir: [0, -0.6, 0.7], color: '#FFFFFF', shade: '#0E0A30' };
  s += facets(ellipse(60, 70, 80, 34, 16), hsl(c.hue + 160, 60, 50), nb, { size: 16, relief: 0.4, seed: 92, opacity: 0.22 });
  s += facets(ellipse(180, 150, 60, 44, 16), hsl(c.hue + 220, 60, 55), nb, { size: 16, relief: 0.4, seed: 93, opacity: 0.18 });
  s += starsOf(80, b.y1 - 60);
  s += facets(ellipse(178, 40, 20, 20, 16), hsl(c.hue + 140, 35, 46), { dir: [-0.6, -0.4, 0.6], color: '#FFE8C8', shade: '#08061A' }, { size: 7, relief: 0.8, seed: 94 });
  s += flat([...ellipse(178, 40, 38, 7, 24, -0.32)], hsl(c.hue + 140, 30, 78), 0.45) + flat(ellipse(178, 40, 30, 4.5, 20, -0.32), '#0E0A30', 0.9);
  s += facets(ellipse(178, 40, 20, 20, 16).filter((p) => p[1] > 36), hsl(c.hue + 140, 35, 40), { dir: [-0.6, -0.4, 0.6], color: '#FFE8C8', shade: '#08061A' }, { size: 7, relief: 0.6, seed: 95 });
  const aL: Light = { dir: [0, -0.4, 0.8], color: '#C8B8E8', shade: '#05040C' };
  for (let i = 0; i < 12; i++) {
    const x = b.x0 + r() * W, y = b.y0 + 30 + r() * 160, rr = 3 + r() * 9;
    if (Math.abs(x - 111) < 50 && y > 40) continue;
    s += rock(blob(x, y, rr, rr * 0.8, 7, i), '#3A3656', aL, 96 + i, 0, Math.max(4, rr * 0.6));
  }
  s += facets([[b.x0, 216], [20, 204], [60, 200], [100, 206], [150, 202], [190, 206], [b.x1, 212], [b.x1, b.y1], [b.x0, b.y1]], '#3A3656', { ...aL, rim: '#FFD9A0' }, { size: 18, relief: 0.6, seed: 110, base2: '#0E0C1C' });
  return s;
};

export const meteorgolem: Species = Object.assign(draw, { scene });
