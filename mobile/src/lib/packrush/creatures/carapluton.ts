import type { Bounds, DrawCtx, Species } from './style.ts';
import { curve, ellipse, facetSky as facetSky0, facets as facets0, gem, hsl, limb, mix, prng, type Light, type Pt, type FacetOpts } from './lowpoly.ts';

/** Facettes un peu plus grandes que la taille demandée (budget ≈ 1500 facettes par carte). */
const facets = (poly: Pt[], col: string, li: Light, o: FacetOpts = {}) => facets0(poly, col, li, { ...o, size: Math.max(2.6, (o.size ?? 11) * 1.3) });
const facetSky = (x0: number, y0: number, x1: number, y1: number, cols: string[], seed = 3, size = 26) => facetSky0(x0, y0, x1, y1, cols, seed, size * 1.4);

/* ---------- Géométrie (squelettes lissés → polygones pour les facettes) ---------- */
type Fn = (t: number) => number;
const f1 = (v: number) => v.toFixed(1);
/** Interpolation linéaire dans une table [t, valeur]. */
const tab = (t: [number, number][]): Fn => (x) => {
  if (x <= t[0][0]) return t[0][1];
  for (let i = 1; i < t.length; i++) if (x <= t[i][0]) { const [a, va] = t[i - 1], [b2, vb] = t[i]; return va + ((x - a) / (b2 - a)) * (vb - va); }
  return t[t.length - 1][1];
};
/** Spline de Catmull-Rom échantillonnée (ouverte ou fermée). */
function crs(pts: Pt[], seg: number, closed = false): Pt[] {
  const N = pts.length, out: Pt[] = [];
  const g = (i: number) => (closed ? pts[(i + N) % N] : pts[Math.max(0, Math.min(N - 1, i))]);
  for (let i = 0; i < (closed ? N : N - 1); i++) {
    const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
    for (let k = 0; k < seg; k++) {
      const t = k / seg, t2 = t * t, t3 = t2 * t;
      const q = (j: 0 | 1) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3);
      out.push([q(0), q(1)]);
    }
  }
  if (!closed) out.push(pts[N - 1]);
  return out;
}
interface Fr { m: Pt[]; nr: Pt[] }
function frame(spine: Pt[], seg = 6): Fr {
  const m = crs(spine, seg);
  const nr = m.map((_, i) => {
    const a = m[Math.max(0, i - 1)], b2 = m[Math.min(m.length - 1, i + 1)];
    const dx = b2[0] - a[0], dy = b2[1] - a[1], l = Math.hypot(dx, dy) || 1;
    return [-dy / l, dx / l] as Pt;
  });
  return { m, nr };
}
function side(fr: Fr, fn: Fn, t0 = 0, t1 = 1): Pt[] {
  const N = fr.m.length - 1, out: Pt[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    if (t < t0 - 1e-6 || t > t1 + 1e-6) continue;
    const o = fn(t);
    out.push([fr.m[i][0] + fr.nr[i][0] * o, fr.m[i][1] + fr.nr[i][1] * o]);
  }
  return out;
}
const strip = (fr: Fr, a: Fn, b2: Fn, t0 = 0, t1 = 1): Pt[] => [...side(fr, a, t0, t1), ...side(fr, b2, t0, t1).reverse()];
const outline = (fr: Fr, w: Fn, t0 = 0, t1 = 1): Pt[] => strip(fr, w, (t) => -w(t), t0, t1);
function at(fr: Fr, t: number, o = 0): Pt {
  const i = Math.round(t * (fr.m.length - 1));
  return [fr.m[i][0] + fr.nr[i][0] * o, fr.m[i][1] + fr.nr[i][1] * o];
}
/** Polygone plat (petits détails), cercle, constellation dorée. */
const flat = (pts: Pt[], col: string, op = 1) => `<path d="M${pts.map((p) => `${f1(p[0])} ${f1(p[1])}`).join('L')}Z" fill="${col}"${op < 1 ? ` opacity="${op}"` : ''}/>`;
const disc = (x: number, y: number, r: number, col: string, op = 1) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="${col}"${op < 1 ? ` opacity="${op}"` : ''}/>`;
const GOLD = '#E9C25B', CRYSTAL = '#BFF6FF';
const constel = (pts: Pt[], s = 3) => `<polyline points="${pts.map((p) => `${f1(p[0])},${f1(p[1])}`).join(' ')}" fill="none" stroke="${GOLD}" stroke-width="0.7" opacity="0.85"/>` + pts.map(([x, y]) => gem(x, y, s, '#FFFFFF', GOLD)).join('');
/** Œil : pupille sombre, iris lumineux, reflet. */
const eyeLP = (x: number, y: number, r: number, iris: string) => disc(x, y, r * 1.9, iris, 0.22) + disc(x, y, r * 1.25, iris) + disc(x + r * 0.1, y, r * 0.8, '#0B0618') + disc(x - r * 0.4, y - r * 0.45, r * 0.38, '#FFFFFF');

/* ---------- Créature ---------- */

/** Carapluton → Orbitortue → Mondécaille : tortue dont la dossière est une planète (lune cratérisée, puis géante gazeuse annelée). */
const draw = (c: DrawCtx): string => {
  const st = Math.min(c.stage, 2), h = c.hue;
  const skin = hsl(h + 20, 26, 46), skinD = hsl(h + 30, 30, 22);
  const shell = st === 0 ? hsl(h + 30, 14, 72) : hsl(h, 34, 52), shellD = hsl(h + 10, 40, 24);
  const L: Light = ([
    { dir: [0.5, -0.7, 0.6], color: '#D6E6FF', shade: '#0A0C22', rim: '#9CC7FF' },
    { dir: [-0.8, -0.4, 0.5], color: '#FFE3B8', shade: '#160C1A', rim: '#FFB27A' },
    { dir: [-0.4, -0.6, 0.6], color: '#E8F8FF', shade: '#080620', rim: '#9FE8FF' },
  ] as Light[])[st];
  const far: Light = { ...L, color: mix(L.color, skinD, 0.45), rim: undefined };
  const S = [1.02, 1, 1][st], headK = [1.3, 1.12, 1][st], lk = [0.7, 0.86, 1][st];
  const sx = 124, rimY = [176, 172, 168][st], sTop = [98, 80, 64][st], rx = [64, 72, 78][st];
  const x0 = sx - rx, x1 = sx + rx, H = rimY - sTop, gy = 202, legT = rimY - 4;
  let s = '', seed = 10;

  const dome: Pt[] = [];
  for (let i = 0; i <= 24; i++) { const a = (i / 24) * Math.PI; dome.push([sx - rx * Math.cos(a), rimY - H * Math.pow(Math.sin(a), 0.85)]); }
  for (let i = 1; i < 10; i++) { const u = 1 - (i / 10) * 2; dome.push([sx + rx * u, rimY + 9 * (1 - u * u)]); }
  const hw = (y: number) => rx * Math.sqrt(Math.max(0, 1 - Math.pow((rimY - y) / H, 2 / 0.85)));

  // Anneau : moitié arrière (stade 2).
  const ring = (front: boolean) => {
    const R = 98, r = 19, wdt = 15, cy = sTop + H * 0.5, a = (11 * Math.PI) / 180;
    const pts: Pt[] = [];
    const E = (rx2: number, ry2: number, t: number): Pt => { const x = Math.cos(t) * rx2, y = Math.sin(t) * ry2; return [sx + x * Math.cos(a) - y * Math.sin(a), cy + x * Math.sin(a) + y * Math.cos(a)]; };
    const t0 = front ? 0 : Math.PI, t1 = front ? Math.PI : 2 * Math.PI;
    for (let i = 0; i <= 20; i++) pts.push(E(R, r, t0 + ((t1 - t0) * i) / 20));
    for (let i = 20; i >= 0; i--) pts.push(E(R - wdt, r - 5, t0 + ((t1 - t0) * i) / 20));
    return facets(pts, hsl(h + 40, 30, 74), { ...L, rim: undefined }, { size: 6, relief: 0.2, seed: front ? 91 : 92, opacity: front ? 0.92 : 0.6 })
      + flat([...Array.from({ length: 21 }, (_, i) => E(R - 8, r - 2.6, t0 + ((t1 - t0) * i) / 20)), ...Array.from({ length: 21 }, (_, i) => E(R - 9.4, r - 3.1, t1 - ((t1 - t0) * i) / 20))], shellD, 0.7);
  };
  if (st >= 2) s += ring(false);

  // Pattes du côté opposé, queue, dessous de la carapace.
  const leg = (pts: Pt[], w: number[], col: string, li: Light) => {
    let o = facets(limb(pts, w), col, li, { size: 5, relief: 0.8, seed: seed++ });
    const [lx, ly] = pts[pts.length - 1], ww = w[w.length - 1] / 2;
    for (let k = 0; k < 4; k++) { const cx = lx - ww + 2 + k * (ww * 0.62); o += flat([[cx - 1.8, gy - 1], [cx - 5, gy + 2.4], [cx + 1, gy + 1]], '#EDE4D0'); }
    return o;
  };
  s += leg([[x0 + rx * 0.4, legT], [x0 + rx * 0.44, legT + (gy - legT) * 0.55], [x0 + rx * 0.46, gy]], [18 * lk + 4, 16 * lk + 3, 18 * lk + 3], skinD, far);
  s += leg([[x1 - rx * 0.3, legT], [x1 - rx * 0.3, legT + (gy - legT) * 0.55], [x1 - rx * 0.32, gy]], [20 * lk + 4, 18 * lk + 3, 19 * lk + 3], skinD, far);
  s += facets(limb([[x1 - 8, rimY - 2], [x1 + 6, rimY + 4], [x1 + 14, rimY + 10]], [10, 6, 1.5]), skin, L, { size: 4, seed: seed++ });
  s += flat([[x0 + 4, rimY], [sx, rimY + 18], [x1 - 4, rimY]], '#0A0612', 0.9);

  // Cou et tête.
  const hx = x0 - 4, hy = rimY - [42, 44, 56][st];
  s += facets(limb([[x0 + 18, rimY - 2], [x0 + 6, rimY - 12], [x0 - 2, rimY - 26], [hx + 4, hy + 4]], [26 * Math.min(1.1, headK), 22, 19 * headK, 17 * headK]), skin, L, { size: 5, relief: 0.8, seed: seed++, base2: skinD });
  const HP = (x: number, y: number): Pt => [hx + x * headK, hy + y * headK];
  const head = curve([8, -9], [[[3, -16], [-12, -18], [-23, -13]], [[-29, -10], [-33, -4], [-32, 1]], [[-31, 5], [-27, 8], [-21, 9]], [[-11, 12], [0, 12], [8, 8]], [[11, 3], [11, -4], [8, -9]]], 3).map(([x, y]) => HP(x, y));
  s += facets(head, skin, L, { size: 4, relief: 0.9, seed: seed++, base2: skinD });
  s += flat([HP(-32, 1), HP(-24, 4.5), HP(-14, 4), HP(-4, 6.6), HP(-4, 7.8), HP(-14, 5.4), HP(-24, 6), HP(-31, 3)], '#120A18', 0.75);
  s += flat([HP(-32, 1), HP(-28, 7), HP(-26, 3)], '#EDE4D0', 0.9);
  { const [ex, ey] = HP(-15, -5); s += eyeLP(ex, ey, 2.2 * headK, '#FFC861'); }
  { const [nx, ny] = HP(-29, -5); s += disc(nx, ny, 0.9, '#120A18'); }

  // Pattes du côté proche (avant la dossière, qui les recouvre en haut).
  s += leg([[x0 + 18, legT - 4], [x0 + 6, legT + (gy - legT) * 0.45], [x0 + 10, gy]], [22 * lk + 4, 18 * lk + 3, 20 * lk + 3], skin, L);
  s += leg([[x1 - 18, legT - 6], [x1 - 8, legT + (gy - legT) * 0.5], [x1 - 12, gy]], [28 * lk + 4, 22 * lk + 3, 22 * lk + 3], skin, L);

  // Dossière-planète : sphère facettée, bandes ou cratères, rangée d'écailles marginales.
  s += facets(dome, shell, L, { size: 9, relief: 2, seed: seed++, base2: mix(shell, shellD, 0.5) });
  if (st === 0) {
    for (const [x, y, r] of [[sx - 26, sTop + 26, 9], [sx + 16, sTop + 18, 6], [sx + 6, sTop + 50, 11], [sx - 44, sTop + 56, 6], [sx + 40, sTop + 46, 7], [sx - 12, sTop + 66, 5]] as const)
      s += facets(ellipse(x, y, r, r * 0.72, 10), mix(shell, shellD, 0.45), { ...L, dir: [-L.dir[0], -L.dir[1], L.dir[2]] }, { size: 3.5, relief: 0.7, seed: seed++, opacity: 0.8 });
  } else {
    const cols = [hsl(h + 30, 40, 76), hsl(h, 40, 30), hsl(h - 20, 30, 70), hsl(h + 150, 40, 56), hsl(h + 40, 50, 66), hsl(h + 10, 40, 20), hsl(h + 195, 50, 66)];
    let y = sTop - 2, k = 0;
    while (y < rimY - 4) {
      const hh = 7 + ((k * 37) % 9), bow = 6;
      const top: Pt[] = [], bot: Pt[] = [];
      for (let i = 0; i <= 10; i++) { const u = -1 + i / 5; top.push([sx + u * hw(Math.max(y, sTop + 1)) * 1.02, y + bow * (1 - u * u)]); bot.push([sx + u * hw(Math.min(rimY, y + hh)) * 1.02, y + hh + bow * (1 - u * u)]); }
      s += flat([...top, ...bot.reverse()].filter((p) => p[1] <= rimY + 6), cols[k % cols.length], k % 2 ? 0.42 : 0.3);
      y += hh; k++;
    }
    const tx = sx + rx * 0.28, ty = sTop + H * 0.58;
    s += facets(ellipse(tx, ty, st === 2 ? 12 : 8, st === 2 ? 5.5 : 4, 12), hsl(h + 150, 50, 60), L, { size: 3, relief: 0.6, seed: seed++ });
  }
  // Écailles marginales (rangée de plaques au bord de la dossière).
  for (let k = 0; k < 12; k++) {
    const u0 = -1 + k / 6, u1 = -1 + (k + 1) / 6;
    const P = (u: number, d: number): Pt => [sx + u * rx * 0.99, rimY - d + 9 * (1 - u * u) * (d < 1 ? 1 : 0.8)];
    s += facets([P(u0, 0), P(u0 + 0.01, 10), P(u1 - 0.01, 10), P(u1, 0)], k % 2 ? mix(shell, shellD, 0.35) : mix(shell, shellD, 0.5), L, { size: 5, relief: 0.4, seed: seed++ });
  }
  if (st >= 2) {
    // Joints des plaques : points d'or reliés (constellation sur la dossière).
    const yv = sTop + H * 0.42;
    s += constel([[sx - rx * 0.62, yv + 8], [sx - rx * 0.3, yv - 4], [sx, yv - 8], [sx + rx * 0.3, yv - 4], [sx + rx * 0.62, yv + 8]], 3);
    s += constel([[sx - rx * 0.3, yv - 4], [sx - rx * 0.26, sTop + 6]], 2.4) + constel([[sx + rx * 0.3, yv - 4], [sx + rx * 0.26, sTop + 6]], 2.4);
    s += ring(true);
  }

  // Lunes, éclats de coquille.
  const moon = (x: number, y: number, r: number) => facets(ellipse(x, y, r, r, 10), hsl(h + 30, 14, 76), L, { size: 3, relief: 1, seed: Math.round(x) });
  if (st === 1) s += moon(196, 60, 5.5);
  if (st >= 2) s += moon(30, 70, 9) + moon(198, 44, 5) + constel([[48, 40], [66, 30], [84, 36], [96, 24]]);
  if (st === 0) {
    const shellL: Light = { ...L, color: '#FFFFFF' };
    s += facets([[30, 206], [28, 190], [34, 180], [44, 176], [48, 184], [54, 180], [58, 190], [66, 186], [70, 198], [66, 205]], '#EDE4D0', shellL, { size: 5, relief: 0.8, seed: 81 });
    s += facets([[168, 206], [170, 196], [178, 189], [186, 190], [190, 196], [196, 194], [200, 204]], '#EDE4D0', shellL, { size: 5, relief: 0.8, seed: 82 });
  }
  const sh = flat(ellipse(122, 204, 96, 9, 20), '#05030C', 0.4);
  return `${sh}<g transform="translate(111 204) scale(${S}) translate(-111 -204)">${s}</g>`;
};

/* ---------- Décor : désert lunaire (0 nid de sable la nuit, 1 traversée à l'aube, 2 astéroïde au-dessus d'une géante) ---------- */
const scene = (c: DrawCtx, b: Bounds): string => {
  const st = Math.min(c.stage, 2), h = c.hue, r = prng(53 + st * 11 + h);
  const W2 = b.x1 - b.x0;
  const starsAt = (n: number, yMax: number) => { let o = ''; for (let i = 0; i < n; i++) { const x = b.x0 + r() * W2, y = b.y0 + r() * (yMax - b.y0); o += i % 6 ? disc(x, y, 0.5 + r() * 0.8, '#FFF6E0', 0.7) : gem(x, y, 1.5 + r() * 2, '#FFFFFF', '#BFD7FF'); } return o; };
  const crater = (x: number, y: number, rx: number, col: string, li: Light) => facets(ellipse(x, y, rx, rx * 0.3, 12), col, { ...li, dir: [-li.dir[0], -li.dir[1], li.dir[2]] }, { size: Math.max(4, rx / 3), relief: 0.6, seed: Math.round(x + y) });
  let s = '';
  if (st === 0) {
    s += facetSky(b.x0, b.y0, b.x1, b.y1, ['#070818', '#121436', '#262A52', '#3A3E62', '#16182C', '#08080F'], 11, 24);
    s += starsAt(50, 150);
    const li: Light = { dir: [0.5, -0.7, 0.5], color: '#9CB4E0', shade: '#05060E' };
    s += disc(178, 52, 34, '#9CC7FF', 0.12) + facets(ellipse(178, 52, 26, 26, 16), '#3F6FB0', { dir: [-0.6, -0.4, 0.6], color: '#BFE0FF', shade: '#050A1C' }, { size: 6, relief: 1.4, seed: 3 });
    s += facets(ellipse(170, 46, 10, 6, 8, 0.4), '#5E9A6A', { dir: [-0.6, -0.4, 0.6], color: '#BFE0FF', shade: '#050A1C' }, { size: 4, seed: 4, opacity: 0.8 });
    s += facets([[b.x0, 156], [40, 146], [100, 152], [160, 144], [b.x1, 150], [b.x1, 190], [b.x0, 190]], '#3A3E58', li, { size: 18, relief: 0.4, seed: 5 });
    s += facets([[b.x0, 180], [60, 172], [130, 178], [b.x1, 174], [b.x1, b.y1], [b.x0, b.y1]], '#4A4C66', li, { size: 18, relief: 0.4, seed: 6, base2: '#0C0C16' });
    s += crater(186, 186, 18, '#3A3C54', li);
    s += facets(ellipse(118, 208, 98, 16, 22), '#2A2C42', { ...li, dir: [-0.5, 0.7, 0.5] }, { size: 14, relief: 0.5, seed: 7 });
    for (const [x, y, rr] of [[196, 198, 11], [212, 210, 9], [16, 206, 10]] as const) s += facets(ellipse(x, y, rr, rr * 1.15, 12), '#E8DFC8', li, { size: 4, relief: 1.2, seed: x });
  } else if (st === 1) {
    s += facetSky(b.x0, b.y0, b.x1, b.y1, ['#121232', '#3A2A58', '#B0607A', '#FFC48A', '#6A5A60', '#2A2228', '#100C10'], 12, 24);
    s += starsAt(30, 90);
    const li: Light = { dir: [-0.8, -0.4, 0.5], color: '#FFC48A', shade: '#0E080C' };
    s += disc(40, 150, 40, '#FFC48A', 0.2) + gem(40, 150, 16, '#FFF4DA', '#FFC48A');
    s += facets([[b.x0, 156], [b.x0, 132], [14, 130], [20, 138], [50, 138], [56, 146], [92, 148], [96, 158]], '#6A4A6A', li, { size: 12, relief: 0.4, seed: 5 });
    s += facets([[196, 156], [198, 140], [208, 136], [b.x1, 140], [b.x1, 158]], '#6A4A6A', li, { size: 12, relief: 0.4, seed: 6 });
    s += facets([[b.x0, 160], [70, 154], [150, 160], [b.x1, 156], [b.x1, 190], [b.x0, 190]], '#7A5A5A', li, { size: 18, relief: 0.4, seed: 7 });
    s += facets([[b.x0, 192], [80, 186], [160, 194], [b.x1, 188], [b.x1, b.y1], [b.x0, b.y1]], '#8A6E62', li, { size: 18, relief: 0.4, seed: 8, base2: '#120E10' });
    for (let k = 0; k < 6; k++) s += flat(ellipse(212 - k * 12 + (k % 2) * 3, 208 - k * 5, 4 - k * 0.4, 1.6 - k * 0.15, 8), '#3A2A2A', 0.8);
    s += crater(36, 214, 22, '#6E5650', li) + crater(198, 184, 10, '#6E5650', li);
  } else {
    s += facetSky(b.x0, b.y0, b.x1, b.y1, ['#05040F', '#14123A', '#241A4C', '#0A0818'], 13, 24);
    s += starsAt(70, b.y1);
    const pl: Light = { dir: [-0.4, -0.7, 0.5], color: '#E8F8FF', shade: '#05040C' };
    const planet = ellipse(40, 330, 190, 190, 40).filter((p) => p[1] < b.y1 + 30);
    s += disc(40, 330, 200, hsl(190 + h * 0.3, 50, 60), 0.12) + facets(planet, hsl(190 + h * 0.3, 30, 38), pl, { size: 22, relief: 1.5, seed: 21 });
    for (let k = 0; k < 7; k++) { const y = 160 + k * 16; s += flat([[-30, y + 12], [120, y - 8], [130, y + 2], [-30, y + 22]].map(([x, yy]) => [x, yy]) as Pt[], [hsl(180 + h * 0.3, 30, 70), hsl(200 + h * 0.3, 30, 24), hsl(30 + h * 0.2, 35, 60)][k % 3], 0.18); }
    const rock = (x: number, y: number, rr: number) => facets(curve([x - rr, y], [[[x - rr, y - rr * 0.9], [x, y - rr * 0.8], [x + rr, y - rr * 0.4]], [[x + rr * 1.1, y + rr * 0.3], [x + rr * 0.6, y + rr * 0.8], [x - rr * 0.2, y + rr * 0.7]], [[x - rr * 0.8, y + rr * 0.6], [x - rr, y + rr * 0.3], [x - rr, y]]], 3), hsl(h + 20, 12, 34), pl, { size: Math.max(3, rr / 2), relief: 1, seed: Math.round(x) });
    s += rock(198, 30, 7) + rock(24, 30, 4) + rock(206, 120, 5) + rock(150, 18, 3);
    s += facets([[b.x0 - 4, 214], [20, 200], [70, 195], [120, 196], [170, 196], [206, 200], [b.x1 + 4, 210], [b.x1 + 4, 232], [180, 244], [60, 246], [b.x0 - 4, 232]], hsl(h + 20, 12, 30), pl, { size: 14, relief: 1, seed: 22, base2: '#0A0810' });
    s += crater(30, 206, 12, hsl(h + 20, 12, 26), pl) + crater(200, 206, 9, hsl(h + 20, 12, 26), pl);
  }
  return s;
};

export const carapluton: Species = Object.assign(draw, { scene });
