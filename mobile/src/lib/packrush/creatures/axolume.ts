import type { Bounds, DrawCtx, Species } from './style.ts';
import { curve, ellipse, facetSky, facets, gem, hsl, limb, mix, prng, type Light, type Pt } from './lowpoly.ts';

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

/** Prisme de cristal (pointe vers +x) placé en (x, y) avec un angle (degrés). */
function crystal(x: number, y: number, ang: number, L: number, w: number, seed: number): string {
  const a = (ang * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  const P = (u: number, v: number): Pt => [x + u * c - v * s, y + u * s + v * c];
  const poly = [P(0, 0), P(L * 0.22, -w), P(L * 0.8, -w * 0.75), P(L, 0), P(L * 0.8, w * 0.75), P(L * 0.22, w)];
  return facets(poly, CRYSTAL, { dir: [-0.5, -0.7, 0.6], color: '#FFFFFF', shade: '#3A5BC0' }, { size: Math.max(2.5, w * 0.9), relief: 0.5, seed });
}

/** Axolume → Branchiluz → Cristaxolo : axolotl aux branchies de cristal. */
const draw = (c: DrawCtx): string => {
  const st = Math.min(c.stage, 2), h = c.hue;
  const base = hsl(h, 32, 56), deep = hsl(h + 12, 38, 26), belly = hsl(h - 10, 30, 74), finC = hsl(h + 20, 30, 64);
  const gillC = hsl(h + 150, 42, 56), gillD = hsl(h + 150, 40, 30);
  const L: Light = ([
    { dir: [0.3, -0.9, 0.5], color: '#DDE6FF', shade: '#08122A', rim: '#7CF5E0' },
    { dir: [0.6, -0.6, 0.6], color: '#FFE3B8', shade: '#1A0E1E', rim: '#FFC98A' },
    { dir: [-0.3, -0.7, 0.6], color: '#D8FBFF', shade: '#0A0820', rim: '#7CF5E0' },
  ] as Light[])[st];
  const far: Light = { ...L, color: mix(L.color, deep, 0.45), rim: undefined };
  const S = [0.95, 0.98, 1][st], bodyK = [0.82, 0.92, 1][st], headK = [1.18, 1.06, 1][st];
  const fr = frame([[24, 146], [48, 139], [76, 145], [104, 159], [134, 167], [162, 163], [186, 150], [201, 128], [205, 104], [199, 82], [186, 68]], 5);
  const W = tab([[0, 5], [0.03, 13 * headK], [0.09, 18.5 * headK], [0.15, 17 * headK], [0.21, 14], [0.3, 17 * bodyK], [0.42, 18.5 * bodyK], [0.52, 15 * bodyK], [0.62, 11], [0.75, 7.5], [0.88, 4.5], [1, 1.2]]);
  let s = '', seed = 10;

  // Nageoire : crête dorsale continue et nageoire caudale, membrane translucide.
  const finTop = tab([[0.22, 0], [0.3, st === 0 ? 7 : 3], [0.45, st === 0 ? 11 : 7], [0.62, 15], [0.8, 19], [0.94, 15], [1, 4]]);
  const finBot = tab([[0.5, 0], [0.6, 6], [0.75, 13], [0.9, 12], [1, 4]]);
  s += facets([...side(fr, (t) => -W(t) - finTop(t), 0.22, 1), ...side(fr, (t) => W(t) + finBot(t), 0.5, 1).reverse()], finC, L, { size: 8, relief: 0.35, seed: seed++, opacity: 0.8, base2: mix(finC, deep, 0.4) });
  // Rayons de la nageoire : fines bandes claires.
  for (let k = 0; k < 14; k++) {
    const t = 0.3 + k * 0.05, [x0, y0] = at(fr, t, -W(t)), [x1, y1] = at(fr, Math.min(1, t + 0.03), -W(t) - finTop(t));
    s += flat([[x0, y0], [x1, y1], [x1 + 1.2, y1 + 0.6]], '#FFFFFF', 0.18);
  }

  // Pattes du côté opposé.
  const leg = (pts: Pt[], w: number[], col: string, li: Light, toes: Pt[]) => {
    let o = facets(limb(pts, w), col, li, { size: 4, relief: 0.6, seed: seed++ });
    const wr = pts[pts.length - 1];
    for (const t of toes) o += facets(limb([wr, [(wr[0] + t[0]) / 2, (wr[1] + t[1]) / 2 - 1], t], [3, 2.2, 1.4]), col, li, { size: 2.5, relief: 0.3, seed: seed++ });
    return o;
  };
  const lk = [0.55, 0.85, 1][st];
  const K = (p: Pt, o: Pt): Pt => [o[0] + (p[0] - o[0]) * lk, o[1] + (p[1] - o[1]) * lk];
  { const o1: Pt = [88, 172], o2: Pt = [124, 180];
    s += leg([o1, K([96, 186], o1), K([98, 197], o1)], [10, 7, 6], deep, far, [K([91, 202], o1), K([97, 203], o1), K([103, 202], o1), K([107, 199], o1)]);
    if (st > 0) s += leg([o2, K([116, 192], o2), K([112, 199], o2)], [12, 8, 6], deep, far, [K([104, 203], o2), K([110, 204], o2), K([116, 204], o2), K([122, 202], o2)]); }

  // Branchies : tige facettée, franges en éclats, cristaux au bout.
  const gillLen = [26, 40, 50][st];
  const gill = (x: number, y: number, ang: number, len: number, isFar: boolean) => {
    const a = (ang * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a);
    const P = (u: number, v: number): Pt => [x + u * ca - v * sa, y + u * sa + v * ca];
    let o = '';
    for (let k = 1; k < 14; k++) {
      const u = (k / 14) * len, fl = (6 + st * 1.6) * (1 - Math.abs(k / 14 - 0.4) * 0.9);
      for (const sg of [-1, 1]) o += flat([P(u - 1.2, 0), P(u + fl * 0.7, sg * fl), P(u + 1.4, sg * 0.6)], isFar ? gillD : (k + (sg > 0 ? 1 : 0)) % 2 ? gillC : mix(gillC, '#FFFFFF', 0.25), isFar ? 0.85 : 0.95);
    }
    o += facets(limb([P(0, 0), P(len * 0.5, -len * 0.06), P(len, -len * 0.02)], [5, 4, 2.4]), isFar ? gillD : mix(gillC, deep, 0.2), isFar ? far : L, { size: 3, relief: 0.4, seed: seed++ });
    if (st >= 1) {
      const [tx, ty] = P(len - 1, -len * 0.02);
      o += crystal(tx, ty, ang - 4, st === 1 ? 8 : 17, st === 1 ? 2.6 : 5.4, seed++);
      if (st >= 2) { const [mx, my] = P(len * 0.62, -len * 0.06); o += crystal(mx, my, ang - 36, 10, 3.4, seed++); }
    }
    return o;
  };
  for (const [t, ov, a, k] of [[0.15, -0.75, -104, 0.86], [0.165, -0.45, -66, 0.9], [0.175, -0.12, -34, 0.8]] as const) {
    const [px, py] = at(fr, t, W(t) * ov);
    s += gill(px - 4, py - 2, a, gillLen * k, true);
  }

  // Corps et tête (une seule pièce), ventre plus clair.
  s += facets(outline(fr, W), base, L, { size: 7, relief: 1.4, seed: seed++, base2: mix(base, deep, 0.35) });
  s += facets(strip(fr, (t) => W(t) * 0.35, (t) => W(t) * 0.96, 0.02, 0.6), belly, L, { size: 6, relief: 0.4, seed: seed++, opacity: 0.55 });
  // Mouchetures.
  const r = prng(c.hue * 7 + st);
  for (let k = 0; k < 18; k++) { const t = 0.24 + r() * 0.6, [x, y] = at(fr, t, (r() - 0.6) * W(t) * 1.3); s += disc(x, y, 0.8 + r() * 1.1, deep, 0.6); }
  // Bouche : fine fente sombre, narine, œil.
  s += flat([...side(fr, (t) => W(t) * 0.3 + t * 6, 0.015, 0.13), ...side(fr, (t) => W(t) * 0.3 + t * 6 + 1.3, 0.015, 0.13).reverse()], '#140A1E', 0.7);
  { const [nx, ny] = at(fr, 0.012, -W(0.012) * 0.45); s += disc(nx + 2, ny, 0.9, '#140A1E'); }
  { const [ex, ey] = at(fr, 0.075, -W(0.075) * 0.38); s += eyeLP(ex, ey, 2.6 * headK, '#FFD27A'); }

  for (const [t, ov, a, k] of [[0.17, -0.7, -80, 1], [0.185, -0.35, -46, 0.94], [0.195, 0.05, -14, 0.8]] as const) {
    const [px, py] = at(fr, t, W(t) * ov);
    s += gill(px, py, a, gillLen * k, false);
  }

  // Pattes du côté proche.
  { const o1: Pt = [72, 166], o2: Pt = [142, 176];
    s += leg([o1, K([60, 182], o1), K([56, 196], o1)], [15, 9, 7], base, L, [K([44, 202], o1), K([50, 205], o1), K([57, 205], o1), K([63, 202], o1)]);
    if (st > 0) s += leg([o2, K([162, 186], o2), K([158, 198], o2)], [19, 10, 7], base, L, [K([144, 203], o2), K([151, 205], o2), K([158, 205], o2), K([165, 204], o2)]);
    else s += facets(limb([o2, [150, 184], [154, 188]], [8, 5, 3]), base, L, { size: 3, seed: seed++ }); }

  if (st >= 1) s += constel([at(fr, 0.32, -4), at(fr, 0.38, 3), at(fr, 0.45, -2), at(fr, 0.52, 4)], st >= 2 ? 3.2 : 2.4);
  if (st >= 2) { const [gx, gy] = at(fr, 0.1, -W(0.1) * 0.75); s += gem(gx, gy, 4, '#FFFFFF', GOLD); }

  const shadowEl = st > 0 ? flat(ellipse(112, 205, 92, 8, 20), '#05030C', 0.35) : '';
  // 0 : la larve nage vers la surface ; 1 : le jeune, tête basse, guette sa proie ; 2 : l'adulte se dresse sur la corniche.
  const pose = ['translate(-8 -30) rotate(12 111 150)', 'rotate(3 60 200)', ''][st];
  return `${shadowEl}<g transform="${pose}"><g transform="translate(105 204) scale(${S}) translate(-111 -204)">${s}</g></g>`;
};

/* ---------- Décor : étang de nébuleuse (0 herbier la nuit, 1 lit du lac à l'aube, 2 grotte de cristal) ---------- */
const scene = (c: DrawCtx, b: Bounds): string => {
  const st = Math.min(c.stage, 2), h = c.hue, r = prng(31 + st * 17 + h);
  const W2 = b.x1 - b.x0;
  let s = '';
  const weed = (x: number, hh: number, col: string, li: Light, sw = 10, w = 7) =>
    facets(limb([[x, b.y1 + 4], [x + sw * 0.6, b.y1 - hh * 0.35], [x - sw * 0.4, b.y1 - hh * 0.7], [x + sw * 0.3, b.y1 - hh]], [w, w * 0.85, w * 0.6, 1.5]), col, li, { size: 7, relief: 0.4, seed: Math.round(x * 3 + hh) });
  const ray = (x: number, w: number, op: number, dx = 30) => flat([[x - 6, b.y0], [x + 6, b.y0], [x + dx + w, b.y1 - 60], [x + dx - w, b.y1 - 60]], '#DFFBFF', op);
  if (st === 0) {
    s += facetSky(b.x0, b.y0, b.x1, b.y1, [hsl(h + 10, 40, 34), hsl(h + 20, 44, 20), hsl(h + 30, 46, 12), hsl(h + 30, 50, 6)], 7, 24);
    const li: Light = { dir: [0.3, -0.9, 0.5], color: '#BFE8FF', shade: '#030812' };
    s += disc(160, b.y0 + 8, 34, '#DFFBFF', 0.15) + gem(160, b.y0 + 10, 10, '#FFFFFF', '#BFE8FF');
    s += ray(150, 40, 0.08) + ray(180, 26, 0.06) + ray(118, 22, 0.05);
    for (let k = 0; k < 8; k++) s += weed(b.x0 + 10 + k * 28 + r() * 10, 90 + r() * 90, hsl(h + 30, 22, 22), { ...li, color: hsl(h + 30, 20, 40) }, 10, 6);
    s += facets([[b.x0, 214], [60, 208], [140, 216], [b.x1, 210], [b.x1, b.y1], [b.x0, b.y1]], hsl(h + 25, 28, 14), { ...li, color: hsl(h + 20, 25, 30) }, { size: 18, relief: 0.4, seed: 5, base2: '#04060C' });
    for (let k = 0; k < 10; k++) s += facets(ellipse(b.x0 + r() * W2, 216 + r() * 20, 5 + r() * 6, 3 + r() * 2, 8), hsl(h + 20, 20, 24), { ...li, color: hsl(h + 20, 25, 44) }, { size: 4, relief: 0.6, seed: 60 + k });
    for (const [x, hh] of [[8, 160], [26, 110], [198, 170], [214, 120], [184, 90]] as const) {
      s += weed(x, hh, hsl(h + 150, 30, 30), li, 14, 7);
      for (const u of [0.4, 0.65, 0.88]) s += disc(x + (u * 10) % 6 - 3, b.y1 - hh * u, 4, hsl(h + 195, 60, 70), 0.25) + gem(x + (u * 10) % 6 - 3, b.y1 - hh * u, 2.4, '#FFFFFF', hsl(h + 195, 60, 70));
    }
    for (let k = 0; k < 18; k++) s += disc(b.x0 + r() * W2, b.y0 + r() * 200, 0.5 + r() * 0.9, '#DFFBFF', 0.6);
  } else if (st === 1) {
    s += facetSky(b.x0, b.y0, b.x1, b.y1, ['#B88A62', '#6A5A5C', '#34343F', '#1A1A24', '#0C0C12'], 8, 24);
    const li: Light = { dir: [0.6, -0.6, 0.6], color: '#FFE3B8', shade: '#0E0A10' };
    s += disc(200, b.y0 + 4, 50, '#FFE3B8', 0.18) + ray(200, 50, 0.1, -20) + ray(164, 30, 0.07, -20) + ray(226, 36, 0.08, -20);
    for (let k = 0; k < 10; k++) { const x = b.x0 + r() * W2; s += facets(limb([[x, 200], [x + 2, 150 - r() * 40], [x + 4, 110 - r() * 60]], [3, 2, 1]), '#4A4648', { ...li, color: '#8A7A70' }, { size: 6, relief: 0.2, seed: 20 + k, opacity: 0.7 }); }
    s += facets([[-6, 200], [-4, 160], [20, 142], [44, 150], [60, 176], [60, 200]], '#3E3A40', li, { size: 10, relief: 1, seed: 7 });
    s += facets([[168, 198], [174, 170], [198, 156], [b.x1 + 2, 160], [b.x1 + 2, 200]], '#3A363C', li, { size: 10, relief: 1, seed: 8 });
    s += facets([[b.x0, 198], [80, 194], [160, 198], [b.x1, 196], [b.x1, b.y1], [b.x0, b.y1]], '#5A4C44', li, { size: 18, relief: 0.4, seed: 9, base2: '#16120F' });
    // La proie : crevette-étoile lumineuse.
    s += disc(18, 112, 12, '#FFE7A8', 0.25) + facets(curve([8, 114], [[[12, 106], [24, 106], [28, 112]], [[24, 118], [14, 120], [8, 114]]], 3), '#FFD98A', li, { size: 3, seed: 11 });
    s += flat([[28, 112], [36, 106], [34, 114], [38, 120]], '#FFE7A8') + flat([[8, 113], [-2, 100], [8, 110]], '#FFE7A8', 0.8);
  } else {
    s += facetSky(b.x0, b.y0, b.x1, b.y1, [hsl(h + 220, 40, 10), hsl(h + 210, 36, 18), hsl(h + 200, 40, 14), '#07060F'], 9, 24);
    const li: Light = { dir: [-0.3, -0.7, 0.6], color: '#BFF6FF', shade: '#05040C' };
    for (let k = 0; k < 9; k++) { const x = b.x0 + k * 27 + r() * 12, w = 8 + r() * 8, hh = 18 + r() * 34; s += facets([[x - w, b.y0 - 2], [x + w, b.y0 - 2], [x, b.y0 + hh]], hsl(h + 210, 20, 20), li, { size: 8, relief: 0.6, seed: 40 + k }); }
    const cluster = (x: number, y: number, k: number, op: number) => {
      let o = '';
      for (const [a, len, w] of [[-28, 34, 6], [-8, 46, 7.5], [14, 30, 5.5], [34, 22, 4.5], [-46, 20, 4]] as const) o += `<g opacity="${op}">` + crystal(x, y, a - 90, len * k, w * k, Math.round(x + a)) + `</g>`;
      return o;
    };
    s += cluster(34, 190, 1.4, 0.55) + cluster(150, 176, 1, 0.45) + cluster(206, 186, 1.2, 0.55);
    s += disc(111, 130, 80, CRYSTAL, 0.07);
    s += facets([[b.x0 - 4, 222], [10, 206], [60, 199], [111, 199], [170, 199], [208, 206], [b.x1 + 4, 218], [b.x1 + 4, b.y1], [b.x0 - 4, b.y1]], hsl(h + 210, 20, 20), li, { size: 16, relief: 0.6, seed: 12, base2: '#06050C' });
    s += flat([[30, 201], [196, 201], [190, 203], [36, 203]], CRYSTAL, 0.35);
    s += cluster(8, 230, 0.9, 1) + cluster(214, 234, 0.75, 1);
  }
  return s;
};

export const axolume: Species = Object.assign(draw, { scene });
