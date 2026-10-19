import type { Bounds, DrawCtx, Species } from './style.ts';
import { ellipse, facetSky, facets, gem, hsl, limb, mix, prng, type Light, type Pt } from './lowpoly.ts';

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

/* ---------- Lièvre lunaire : poses par stade ---------- */
type P = Pt;
interface Pose {
  body: P[]; belly: P[]; haunch: P[]; shadeB: P[];
  head: P[]; jaw: P[]; eye: P; eyeAng: number; nose: P; earN: P[]; earF: P[];
  foreN: P[]; foreF: P[]; foot: P[]; footF?: P[]; tail: P;
}
const POSES: Pose[] = [
  // 0 : levraut tapi au gîte, oreilles couchées.
  {
    body: [[86, 148], [108, 140], [136, 142], [160, 154], [176, 174], [176, 194], [162, 203], [104, 204], [82, 198], [74, 182], [76, 162]],
    belly: [[76, 166], [74, 182], [82, 198], [96, 202], [92, 186], [88, 170]],
    haunch: [[122, 202], [126, 182], [142, 166], [164, 166], [174, 182]],
    shadeB: [[176, 174], [176, 194], [162, 203], [124, 204], [146, 194], [160, 180], [164, 160]],
    head: [[92, 150], [86, 136], [72, 128], [56, 130], [44, 140], [38, 150], [40, 158], [50, 166], [66, 170], [84, 166]],
    jaw: [[40, 158], [50, 166], [66, 170], [84, 166], [70, 162], [54, 160]],
    eye: [66, 144], eyeAng: -4, nose: [40, 149],
    earN: [[74, 134], [94, 124], [122, 120], [146, 124], [150, 129], [128, 134], [98, 138], [82, 142]],
    earF: [[80, 130], [100, 116], [126, 108], [146, 108], [148, 113], [126, 120], [100, 130]],
    foreN: [[80, 176], [76, 192], [68, 203]],
    foreF: [[90, 180], [88, 194], [84, 203]],
    foot: [[168, 196], [150, 200], [128, 202], [112, 203], [108, 206], [130, 207], [160, 207], [174, 203]],
    tail: [178, 176],
  },
  // 1 : sub-adulte assis, aux aguets.
  {
    body: [[98, 96], [118, 100], [142, 114], [164, 136], [178, 160], [182, 182], [174, 198], [156, 203], [120, 203], [100, 200], [92, 184], [88, 160], [86, 136], [88, 114]],
    belly: [[88, 114], [86, 136], [88, 160], [92, 184], [100, 199], [100, 172], [97, 142], [98, 118]],
    haunch: [[116, 200], [120, 176], [138, 152], [162, 150], [178, 168]],
    shadeB: [[164, 136], [178, 160], [182, 182], [174, 198], [156, 203], [130, 203], [154, 192], [164, 172], [162, 150]],
    head: [[102, 82], [98, 68], [86, 60], [72, 60], [60, 66], [50, 76], [46, 84], [48, 92], [56, 98], [72, 102], [88, 104], [102, 96]],
    jaw: [[48, 92], [56, 98], [72, 102], [88, 104], [74, 96], [60, 94]],
    eye: [76, 76], eyeAng: -8, nose: [47, 82],
    earN: [[84, 64], [86, 42], [92, 18], [100, 4], [106, 8], [106, 30], [100, 54], [96, 66]],
    earF: [[92, 64], [100, 40], [112, 18], [122, 8], [125, 14], [118, 38], [106, 62]],
    foreN: [[92, 140], [90, 170], [88, 196], [84, 203]],
    foreF: [[104, 146], [104, 176], [103, 203]],
    foot: [[172, 196], [150, 200], [122, 201], [104, 202], [100, 206], [122, 207], [160, 207], [178, 203]],
    tail: [184, 174],
  },
  // 2 : adulte dressé sur ses pattes arrière, tourné vers la lune.
  {
    body: [[106, 68], [124, 80], [138, 102], [148, 128], [160, 154], [168, 178], [166, 196], [150, 204], [118, 204], [104, 196], [104, 178], [98, 160], [90, 140], [86, 118], [87, 96], [93, 78]],
    belly: [[94, 80], [90, 96], [90, 118], [94, 140], [102, 160], [108, 178], [112, 160], [106, 138], [102, 112], [100, 90]],
    haunch: [[114, 202], [116, 180], [128, 158], [150, 152], [164, 174]],
    shadeB: [[134, 104], [144, 130], [156, 156], [164, 178], [162, 196], [148, 204], [136, 204], [152, 188], [154, 166], [142, 140], [132, 116]],
    head: [[110, 62], [106, 48], [94, 40], [80, 38], [66, 42], [54, 50], [48, 56], [48, 62], [54, 68], [68, 72], [84, 76], [100, 76]],
    jaw: [[48, 62], [54, 68], [68, 72], [84, 76], [70, 68], [56, 64]],
    eye: [80, 52], eyeAng: -14, nose: [48, 56],
    earN: [[94, 42], [104, 24], [118, 8], [132, -2], [136, 2], [128, 20], [114, 40], [106, 48]],
    earF: [[100, 42], [114, 26], [132, 14], [148, 8], [150, 13], [136, 26], [114, 46]],
    foreN: [[98, 106], [86, 116], [78, 124], [76, 134]],
    foreF: [[108, 112], [98, 122], [92, 130], [90, 140]],
    foot: [[166, 196], [146, 200], [118, 201], [96, 202], [92, 206], [116, 207], [154, 207], [172, 203]],
    footF: [[130, 198], [110, 200], [84, 202], [80, 205], [104, 206], [132, 204]],
    tail: [166, 172],
  },
];


/** Lapinova → Lunalièvre → Sélénalto : lièvre lunaire. Levraut endormi au gîte, jeune assis aux aguets, adulte dressé vers la lune. */
const draw = (c: DrawCtx): string => {
  const st = Math.min(c.stage, 2), h = c.hue, p = POSES[st];
  const base = hsl(h, 30, 50), deep = hsl(h + 10, 36, 24), belly = hsl(h - 10, 22, 80), inner = mix(hsl(h, 30, 50), '#E8A0A8', 0.45);
  const L: Light = ([
    { dir: [0.5, -0.7, 0.6], color: '#DDE6FF', shade: '#080A20', rim: '#9FB8FF' },
    { dir: [-0.5, -0.6, 0.6], color: '#FFE3D0', shade: '#120A20', rim: '#FF9EB8' },
    { dir: [0.3, -0.5, 0.4], color: '#FFF1D8', shade: '#0A0818', rim: '#FFF1C8' },
  ] as Light[])[st];
  const far: Light = { ...L, color: mix(L.color, deep, 0.45), rim: undefined };
  const S = [1.16, 1, 0.94][st];
  const sm = (pts: Pt[]) => crs(pts, 3, true);
  let s = '', seed = 10;

  const ear = (pts: Pt[], isFar: boolean) => {
    const poly = sm(pts);
    let o = facets(poly, isFar ? deep : base, isFar ? far : L, { size: 4.5, relief: 0.6, seed: seed++ });
    const cx = poly.reduce((a, q) => a + q[0], 0) / poly.length, cy = poly.reduce((a, q) => a + q[1], 0) / poly.length;
    o += facets(poly.map(([x, y]) => [x + (cx - x) * 0.5, y + (cy - y) * 0.42 + 3] as Pt), isFar ? mix(inner, deep, 0.5) : inner, isFar ? far : L, { size: 4, relief: 0.3, seed: seed++, opacity: 0.8 });
    const tip = pts[Math.floor(pts.length / 2) - 1];
    o += flat(poly.filter((q) => Math.hypot(q[0] - tip[0], q[1] - tip[1]) < 11), '#0E0818', 0.9);
    return o;
  };
  const limbP = (pts: Pt[], w0: number, w1: number, col: string, li: Light) => facets(limb(crs(pts, 3), crs(pts, 3).map((_, i, a) => w0 + (w1 - w0) * (i / (a.length - 1)))), col, li, { size: 4, relief: 0.6, seed: seed++ });

  s += ear(p.earF, true);
  s += limbP(p.foreF, 10, 7, deep, far);
  if (p.footF) s += facets(sm(p.footF), deep, far, { size: 5, relief: 0.5, seed: seed++ });
  // Corps : facettes plus fines, poitrail et ventre clairs, cuisse marquée.
  s += facets(sm(p.body), base, L, { size: 7, relief: 1.4, seed: seed++, base2: mix(base, deep, 0.35) });
  s += facets(sm(p.belly), belly, L, { size: 5, relief: 0.5, seed: seed++, opacity: 0.85 });
  const hp = crs(p.haunch, 3);
  s += facets([...hp, [hp[hp.length - 1][0] - 4, hp[hp.length - 1][1] + 14], [hp[0][0] + 20, hp[0][1]]], mix(base, deep, 0.15), L, { size: 6, relief: 1, seed: seed++ });
  s += facets(ellipse(p.tail[0] + 7, p.tail[1] + 1, 7, 6, 10), '#F4EEE4', L, { size: 3, relief: 0.8, seed: seed++ });
  s += facets(sm(p.foot), base, L, { size: 5, relief: 0.6, seed: seed++, base2: deep });
  s += limbP(p.foreN, 11, 7.5, base, L);
  // Tête.
  s += ear(p.earN, false);
  s += facets(sm(p.head), base, L, { size: 4.5, relief: 1.1, seed: seed++, base2: mix(base, deep, 0.2) });
  s += facets(sm(p.jaw), belly, L, { size: 3.5, relief: 0.4, seed: seed++, opacity: 0.9 });
  const [ex, ey] = p.eye;
  if (st === 0) s += flat([[ex - 6, ey], [ex, ey + 3.2], [ex + 6, ey - 1], [ex, ey + 1.8]], '#0E0818', 0.9);
  else s += eyeLP(ex, ey, 3.4, '#E8A84A');
  const [nx, ny] = p.nose;
  s += flat([[nx, ny - 2], [nx + 4, ny - 1], [nx + 1, ny + 1.5]], '#2A1420') + flat([[nx + 2, ny + 1], [nx + 2.6, ny + 6], [nx + 1.4, ny + 6]], '#2A1420', 0.6);
  for (const [dx, dy] of [[-22, -4], [-24, 2], [-20, 7]] as const) s += flat([[nx + 8, ny + 4], [nx + 8 + dx, ny + dy], [nx + 8, ny + 4.6]], '#FFFFFF', 0.45);
  // Marques lunaires.
  if (st === 1) s += gem(ex + 6, ey - 12, 2.6, '#FFFFFF', GOLD);
  if (st >= 2) {
    s += flat(crs([[ex + 3, ey - 16], [ex + 9, ey - 13], [ex + 9, ey - 6], [ex + 6, ey - 10]], 3, true), GOLD, 0.95);
    s += constel([[124, 120], [134, 136], [128, 152], [140, 168]]);
  }
  const sh = flat(ellipse(124, 205, st === 0 ? 70 : 74, 7, 20), '#05030C', 0.4);
  return `${sh}<g transform="translate(111 205) scale(${S}) translate(-111 -205)">${s}</g>`;
};

/* ---------- Décor : prairies lunaires (0 gîte d'herbes d'argent la nuit, 1 crête au crépuscule, 2 cercle de pierres sous la pleine lune) ---------- */
const scene = (c: DrawCtx, b: Bounds): string => {
  const st = Math.min(c.stage, 2), h = c.hue, r = prng(71 + st * 13 + h);
  const W2 = b.x1 - b.x0;
  const starsAt = (n: number, yMax: number) => { let o = ''; for (let i = 0; i < n; i++) { const x = b.x0 + r() * W2, y = b.y0 + r() * (yMax - b.y0); o += i % 6 ? disc(x, y, 0.5 + r() * 0.8, '#FFF6E0', 0.7) : gem(x, y, 1.5 + r() * 2, '#FFFFFF', '#BFD7FF'); } return o; };
  const grass = (y: number, n: number, hh: number, col: string, col2: string) => { let o = ''; for (let i = 0; i < n; i++) { const x = b.x0 - 4 + r() * (W2 + 8), g = hh * (0.5 + r() * 0.7), bend = (r() - 0.4) * g * 0.5; o += flat([[x - 1.6, y + r() * 6], [x + bend, y - g], [x + 1.6, y + r() * 6]], i % 2 ? col : col2); } return o; };
  const flower = (x: number, y: number, hh: number, col: string) => flat([[x - 0.5, y], [x + 1.5, y - hh], [x + 0.5, y]], '#2A3A3A') + disc(x + 2, y - hh, 5, col, 0.25) + gem(x + 2, y - hh, 3, '#FFFFFF', col);
  const crescent = (x: number, y: number, rr: number) => {
    const pts: Pt[] = [];
    for (let i = 0; i <= 16; i++) { const t = Math.PI / 3 + (i / 16) * (Math.PI * 4 / 3); pts.push([x + Math.cos(t) * rr, y + Math.sin(t) * rr]); }
    for (let i = 0; i <= 12; i++) { const t = (Math.PI * 3) / 2 - (i / 12) * Math.PI; pts.push([x + rr * 0.5 + Math.cos(t) * rr * 0.866, y + Math.sin(t) * rr * 0.866]); }
    return disc(x, y, rr * 1.8, '#FFF6D8', 0.1) + facets(pts, '#FFF3D0', { dir: [-0.5, -0.5, 0.7], color: '#FFFFFF', shade: '#B8A890' }, { size: 4, relief: 0.6, seed: 5 });
  };
  let s = '';
  if (st === 0) {
    s += facetSky(b.x0, b.y0, b.x1, b.y1, [hsl(h + 10, 40, 8), hsl(h, 36, 16), hsl(h - 10, 32, 22), hsl(h, 30, 12), '#06060C'], 21, 24);
    s += starsAt(50, 140) + crescent(184, 58, 16);
    const li: Light = { dir: [0.5, -0.7, 0.5], color: hsl(h, 25, 50), shade: '#04040A' };
    s += facets([[b.x0, 146], [60, 136], [130, 144], [b.x1, 134], [b.x1, 190], [b.x0, 190]], hsl(h + 10, 24, 20), li, { size: 18, relief: 0.4, seed: 5 });
    s += grass(150, 50, 30, hsl(h + 20, 16, 30), hsl(h + 20, 18, 24));
    s += facets([[b.x0, 180], [80, 174], [160, 180], [b.x1, 176], [b.x1, b.y1], [b.x0, b.y1]], hsl(h + 10, 24, 16), li, { size: 18, relief: 0.4, seed: 6, base2: '#05050A' });
    s += facets(ellipse(116, 206, 94, 16, 20), hsl(h + 20, 22, 14), { ...li, dir: [-0.5, 0.7, 0.5] }, { size: 12, relief: 0.6, seed: 7 });
    for (let k = 0; k < 22; k++) { const a = Math.PI * (k / 21), x = 116 - Math.cos(a) * 92, y = 206 - Math.sin(a) * 12, g = 18 + r() * 10; s += flat([[x - 1.6, y + 6], [x - Math.cos(a) * 14, y + 6 - g], [x + 1.6, y + 6]], k % 2 ? hsl(h + 30, 18, 46) : hsl(h + 30, 16, 38)); }
    for (const [x, y, hh] of [[16, 196, 30], [204, 200, 36], [190, 208, 22], [30, 214, 20]] as const) s += flower(x, y, hh, hsl(h + 50, 80, 75));
    for (let k = 0; k < 9; k++) { const x = 20 + r() * 190, y = 90 + r() * 90; s += disc(x, y, 3.5, '#FFE9A0', 0.25) + disc(x, y, 1.1, '#FFF6D0'); }
  } else if (st === 1) {
    s += facetSky(b.x0, b.y0, b.x1, b.y1, ['#121636', '#2E2A5A', '#6A4A7A', '#E08A8A', '#3A2A48', '#100C1A'], 22, 24);
    s += starsAt(30, 100) + crescent(42, 42, 13);
    const li: Light = { dir: [-0.5, -0.6, 0.6], color: '#F0A8B8', shade: '#08060E' };
    s += facets([[b.x0, 152], [50, 142], [110, 150], [170, 140], [b.x1, 148], [b.x1, 200], [b.x0, 200]], '#6A5A8A', li, { size: 20, relief: 0.3, seed: 5 });
    s += facets([[b.x0, 166], [70, 158], [150, 168], [b.x1, 160], [b.x1, 210], [b.x0, 210]], '#4A3E6A', li, { size: 20, relief: 0.3, seed: 6 });
    s += facets([[b.x0, 180], [60, 176], [140, 182], [b.x1, 178], [b.x1, 220], [b.x0, 220]], '#34294E', li, { size: 20, relief: 0.4, seed: 7 });
    s += facets([[b.x0 - 4, 230], [20, 210], [60, 200], [120, 199], [170, 199], [200, 206], [b.x1 + 4, 214], [b.x1 + 4, b.y1], [b.x0 - 4, b.y1]], hsl(h + 100, 18, 22), li, { size: 16, relief: 0.6, seed: 8, base2: '#06080A' });
    s += grass(206, 40, 18, hsl(h + 100, 18, 32), hsl(h + 100, 16, 26));
    s += facets([[184, 208], [184, 196], [194, 188], [206, 190], [214, 200], [214, 210]], '#5A566A', li, { size: 6, relief: 1, seed: 9 });
    for (const [x, y, hh] of [[14, 214, 22], [34, 222, 16], [200, 224, 18]] as const) s += flower(x, y, hh, hsl(h + 50, 80, 75));
  } else {
    s += facetSky(b.x0, b.y0, b.x1, b.y1, [hsl(h + 10, 44, 8), hsl(h, 34, 16), hsl(h - 10, 30, 20), hsl(h, 30, 10), '#05050A'], 23, 24);
    s += starsAt(40, 200);
    // Pleine lune facettée (mers, cratères), voilée de nuages.
    const ml: Light = { dir: [-0.4, -0.5, 0.7], color: '#FFFFFF', shade: '#3A3A5A' };
    s += disc(128, 100, 92, '#FFF6D8', 0.1) + facets(ellipse(128, 100, 72, 72, 32), '#E8E2D2', ml, { size: 14, relief: 1, seed: 31 });
    for (const [x, y, rx, ry] of [[100, 70, 22, 14], [150, 120, 26, 16], [160, 66, 12, 9], [104, 140, 14, 8]] as const) s += flat(ellipse(x, y, rx, ry, 12), '#A8A2B4', 0.5);
    for (const [y, x, w] of [[62, -10, 90], [136, 140, 100], [150, -20, 70]] as const) s += facets([[x, y], [x + w * 0.2, y - 8], [x + w * 0.4, y - 3], [x + w * 0.6, y - 10], [x + w, y], [x + w * 0.9, y + 5], [x + w * 0.1, y + 5]], hsl(h, 22, 26), { dir: [0.2, -0.8, 0.5], color: '#B8B0C8', shade: '#08060E' }, { size: 10, relief: 0.4, seed: Math.round(x + y) });
    const stoneL: Light = { dir: [0.5, -0.5, 0.4], color: '#D8D0C0', shade: '#05040A', rim: '#FFF1C8' };
    const stone = (x: number, w: number, hh: number) => facets([[x - w, 198], [x - w * 0.8, 198 - hh], [x, 192 - hh], [x + w * 0.9, 200 - hh], [x + w, 198]], hsl(h + 10, 10, 26), stoneL, { size: 7, relief: 0.8, seed: Math.round(x) });
    s += stone(22, 10, 54) + stone(52, 7, 34) + stone(196, 11, 60) + stone(176, 7, 30);
    s += facets([[b.x0 - 4, 214], [30, 199], [80, 196], [120, 197], [170, 197], [200, 200], [b.x1 + 4, 208], [b.x1 + 4, b.y1], [b.x0 - 4, b.y1]], hsl(h + 10, 18, 18), stoneL, { size: 16, relief: 0.5, seed: 33, base2: '#05050A' });
    s += facets([[84, 207], [92, 198], [160, 198], [168, 207]], hsl(h + 10, 10, 34), stoneL, { size: 8, relief: 0.4, seed: 34 });
    s += grass(214, 26, 14, hsl(h + 20, 16, 28), hsl(h + 20, 14, 22));
  }
  return s;
};

export const lapinova: Species = Object.assign(draw, { scene });
