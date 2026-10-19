import type { Bounds, DrawCtx, Species } from './style.ts';
import { curve, ellipse, facetSky, facets, gem, hsl, mix, prng, type Light, type Pt } from './lowpoly.ts';

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

/** Cétoile → Baleinelle → Nébulène → Abyssiale : baleine à bosse du vide (sillons ventraux, très longues pectorales) ; le flanc de l'éveillée s'ouvre sur une nébuleuse. */
const draw = (c: DrawCtx): string => {
  const st = Math.min(c.stage, 3), h = c.hue;
  const base = hsl(h, 34, 44), deep = hsl(h + 10, 40, 20), belly = hsl(h - 10, 24, 78);
  const L: Light = ([
    { dir: [0.1, -0.9, 0.5], color: '#CFF8FF', shade: '#040A18', rim: '#7CF5E0' },
    { dir: [-0.6, -0.6, 0.5], color: '#FFE3B8', shade: '#08081A', rim: '#FFC98A' },
    { dir: [-0.2, -0.8, 0.5], color: '#BFD8FF', shade: '#03040E', rim: '#7CB8FF' },
    { dir: [-0.3, -0.7, 0.6], color: '#FFE0F4', shade: '#06041A', rim: '#FF9EE0' },
  ] as Light[])[st];
  const far: Light = { ...L, color: mix(L.color, deep, 0.45), rim: undefined };
  const S = [0.88, 0.95, 1, 1][st], fat = [1.12, 1.04, 1, 1][st], pecK = [0.7, 0.85, 1, 1.05][st];
  const fr = frame([[14, 146], [40, 130], [74, 120], [110, 118], [142, 120], [166, 112], [182, 94], [188, 72], [186, 52]], 5);
  const W = tab([[0, 5], [0.04, 13 * fat], [0.12, 21 * fat], [0.26, 27 * fat], [0.42, 26 * fat], [0.58, 18 * fat], [0.72, 10.5], [0.86, 6], [1, 4]]);
  let s = '', seed = 10;

  // Pectorales : longues, bord d'attaque festonné.
  const [px0, py0] = at(fr, 0.3, W(0.3) * 0.6);
  const pec = (x: number, y: number, k: number, col: string, li: Light) => {
    const pf = frame([[x, y], [x + 16 * k, y + 22 * k], [x + 38 * k, y + 40 * k], [x + 62 * k, y + 48 * k]], 6);
    const pw = tab([[0, 8], [0.25, 9.5], [0.75, 5.5], [1, 1.4]]);
    return facets(strip(pf, pw, (t) => -pw(t) - (t > 0.1 && t < 0.92 ? Math.abs(Math.sin(t * 34)) * 1.8 : 0)), col, li, { size: 4.5, relief: 0.6, seed: seed++ });
  };
  s += pec(px0 + 22, py0 - 8, pecK * 0.62, deep, far);
  // Caudale (vue de dessus, la queue se relève).
  const [fx, fy] = fr.m[fr.m.length - 1];
  const fk = [0.85, 0.92, 1, 1.05][st];
  const F = (x: number, y: number): Pt => [fx + x * fk, fy + y * fk];
  s += facets(curve(F(-3, 6), [[F(-10, 0), F(-22, -2), F(-32, -12)], [F(-24, -16), F(-12, -14), F(0, -8)], [F(12, -15), F(26, -18), F(34, -16)], [F(26, -6), F(12, 0), F(3, 6)]], 3), base, L, { size: 4.5, relief: 0.7, seed: seed++, base2: deep });
  // Corps : dos sombre, ventre clair.
  s += facets(outline(fr, W), base, L, { size: 7, relief: 1.6, seed: seed++, base2: mix(base, deep, 0.3) });
  s += facets(strip(fr, (t) => -W(t) * 0.98, (t) => -W(t) * 0.25, 0.02, 0.98), deep, L, { size: 7, relief: 0.4, seed: seed++, opacity: 0.45 });
  s += facets(strip(fr, (t) => W(t) * (0.22 + t * 0.4), (t) => W(t) * 0.98, 0.01, 0.62), belly, L, { size: 5, relief: 0.4, seed: seed++, opacity: 0.85 });
  // Sillons ventraux : fines bandes sombres.
  for (let k = 0; k < (st === 0 ? 4 : 7); k++) {
    const o = 0.45 + (k / 7) * 0.5, t1 = 0.48 - k * 0.012;
    s += flat(strip(fr, (t) => W(t) * (o + (1 - o) * t * 0.5), (t) => W(t) * (o + (1 - o) * t * 0.5) + 0.8, 0.04 + k * 0.006, t1), deep, 0.45);
  }
  // Éveil : le flanc s'ouvre sur une nébuleuse.
  if (st >= 3) {
    const lo: Fn = (t) => W(t) * (0.1 + Math.sin(t * 12) * 0.12);
    const win = strip(fr, (t) => lo(t) + (-W(t) * 0.95 - lo(t)) * Math.min(1, Math.max(0, (t - 0.3) / 0.16)) ** 0.6, lo, 0.3, 0.97);
    s += facets(win, hsl(h + 40, 40, 18), { dir: [0, 0, 1], color: hsl(h + 60, 70, 60), shade: '#05030F' }, { size: 6, relief: 0.6, seed: seed++, jitter: 0.6, base2: hsl(h + 140, 50, 30) });
    const rr = prng(h + 3);
    for (let k = 0; k < 26; k++) { const t = 0.36 + rr() * 0.58, [x, y] = at(fr, t, W(t) * (rr() * 1.4 - 0.9)); s += k % 5 ? disc(x, y, 0.5 + rr() * 0.8, '#FFF6E0', 0.85) : gem(x, y, 2.4, '#FFFFFF', hsl(h + 60, 70, 70)); }
    s += constel([at(fr, 0.4, -10), at(fr, 0.48, -2), at(fr, 0.56, -12), at(fr, 0.66, -4), at(fr, 0.74, -8)]);
  }
  // Nageoire dorsale, bouche, œil, tubercules, évent.
  { const [dx, dy] = at(fr, 0.62, -W(0.62) + 1); s += facets([[dx - 10, dy + 2], [dx + 4, dy - 9], [dx + 10, dy + 2]], base, L, { size: 3, relief: 0.4, seed: seed++ }); }
  s += flat(strip(fr, (t) => W(t) * (0.15 + t * 2.2), (t) => W(t) * (0.15 + t * 2.2) + 1.2, 0.005, 0.17), '#0A0618', 0.7);
  { const [ex, ey] = at(fr, 0.19, W(0.19) * 0.32); s += eyeLP(ex, ey, 2.2, '#FFD27A'); }
  if (st >= 1) for (let k = 0; k < 7; k++) { const t = 0.03 + k * 0.022, [x, y] = at(fr, t, -W(t) * 0.55 + (k % 2) * 3); s += facets(ellipse(x, y, 1.8, 1.6, 6), belly, L, { size: 2, seed: seed++ }); }
  if (st >= 1) for (const [t, o] of [[0.07, 0.5], [0.1, 0.65], [0.28, -0.3], [0.5, 0.4]] as const) { const [x, y] = at(fr, t, W(t) * o); s += gem(x, y, st >= 2 ? 3 : 2.3, '#FFFFFF', st >= 2 ? GOLD : CRYSTAL); }
  const [bx, by] = at(fr, 0.2, -W(0.2) + 1.5);
  // Souffle : éclats de brume (2), gerbe d'étoiles (3).
  if (st >= 2) for (let k = 0; k < (st >= 3 ? 9 : 6); k++) { const a = -Math.PI / 2 + (k / 5 - 0.5) * 1.1, l = 18 + (k % 3) * 7; s += gem(bx + Math.cos(a) * l, by - 3 + Math.sin(a) * l, st >= 3 ? 2.6 : 1.8, '#FFFFFF', st >= 3 ? GOLD : CRYSTAL); }
  s += pec(px0, py0, pecK, belly, L);
  if (st >= 2) s += constel([[px0 + 12, py0 + 16], [px0 + 26, py0 + 30], [px0 + 44, py0 + 40]], 2.4);
  if (st >= 3) s += constel([[22, 40], [40, 30], [58, 38], [72, 24]]);

  let out = `<g transform="translate(104 124) scale(${S}) translate(-104 -124)">${s}</g>`;
  // 1 : le jeune sonde : corps qui plonge, caudale encore dressée hors de l'eau dans une gerbe d'écume.
  if (st === 1) {
    out = `<g transform="translate(0 10) rotate(-22 110 130)">${out}</g>`;
    out += facets([[128, 62], [134, 52], [142, 58], [148, 50], [152, 58], [160, 50], [166, 58], [172, 52], [180, 60], [186, 62], [170, 70], [140, 70]], '#E6F6FF', { ...L, rim: undefined }, { size: 4, relief: 0.6, seed: 77 });
    for (let k = 0; k < 12; k++) { const a = Math.PI * (0.15 + 0.7 * (k / 11)), rr = 26 + (k % 3) * 6; out += disc(157 - Math.cos(a) * rr, 60 - Math.sin(a) * rr * 0.6, 0.8 + (k % 3) * 0.5, '#E6F6FF', 0.9); }
  }
  return out;
};

/* ---------- Décor : océan d'étoiles (0 près de sa mère sous la surface, 1 plongée au crépuscule, 2 chant dans l'abysse, 3 vol au-dessus d'une planète-océan) ---------- */
const scene = (c: DrawCtx, b: Bounds): string => {
  const st = Math.min(c.stage, 3), h = c.hue, r = prng(91 + st * 7 + h);
  const W2 = b.x1 - b.x0;
  const ray = (x: number, w: number, op: number, y0 = b.y0, dx = 20) => flat([[x - 6, y0], [x + 6, y0], [x + dx + w, b.y1 - 60], [x + dx - w, b.y1 - 60]], '#DFFBFF', op);
  const fish = (x: number, y: number, k: number, col: string) => flat([[x, y], [x + 7 * k, y - 3 * k], [x + 10 * k, y], [x + 7 * k, y + 3 * k]], col, 0.85) + flat([[x + 10 * k, y], [x + 14 * k, y - 3 * k], [x + 14 * k, y + 3 * k]], col, 0.6);
  const motes = (n: number) => { let o = ''; for (let i = 0; i < n; i++) o += disc(b.x0 + r() * W2, b.y0 + r() * (b.y1 - b.y0), 0.5 + r() * 0.9, '#DFFBFF', 0.6); return o; };
  const whaleSil = (x: number, y: number, k: number, col: string, li: Light, sd: number) => facets(curve([x, y], [[[x + 10 * k, y - 16 * k], [x + 50 * k, y - 22 * k], [x + 90 * k, y - 18 * k]], [[x + 120 * k, y - 15 * k], [x + 140 * k, y - 8 * k], [x + 160 * k, y - 12 * k]], [[x + 170 * k, y - 20 * k], [x + 176 * k, y - 26 * k], [x + 190 * k, y - 2 * k]], [[x + 140 * k, y + 4 * k], [x + 90 * k, y + 14 * k], [x + 40 * k, y + 16 * k]], [[x + 20 * k, y + 12 * k], [x + 4 * k, y + 6 * k], [x, y]]], 8), col, li, { size: 14 * k + 4, relief: 0.8, seed: sd });
  let s = '';
  if (st === 0) {
    s += facetSky(b.x0, b.y0, b.x1, b.y1, [hsl(185 + h * 0.12, 44, 44), hsl(200 + h * 0.12, 46, 26), hsl(215 + h * 0.1, 50, 14), '#040814'], 41, 24);
    const li: Light = { dir: [0.1, -0.9, 0.5], color: '#7FB8D8', shade: '#020610' };
    s += ray(60, 46, 0.08) + ray(120, 34, 0.06) + ray(180, 40, 0.07);
    s += whaleSil(-40, 200, 1.45, hsl(210 + h * 0.1, 30, 24), li, 3) + facets([[40, 208], [70, 226], [100, 236], [64, 222]], hsl(210 + h * 0.1, 26, 34), li, { size: 6, seed: 4 });
    for (let k = 0; k < 16; k++) s += fish(150 + r() * 66, 26 + r() * 50, 0.8 + r() * 0.4, hsl(h + 170, 50, 72));
    s += motes(18);
  } else if (st === 1) {
    const sy = 64;
    s += facetSky(b.x0, b.y0, b.x1, sy, ['#3A2A58', '#B0607A', '#FFC48A'], 42, 20);
    s += facetSky(b.x0, sy, b.x1, b.y1, [hsl(195 + h * 0.15, 40, 34), hsl(210 + h * 0.1, 44, 18), '#050A16'], 43, 24);
    s += disc(50, sy - 4, 24, '#FFE3A0', 0.3) + gem(50, sy - 6, 12, '#FFF4DA', '#FFC48A');
    const wv: Light = { dir: [-0.6, -0.6, 0.5], color: '#FFD8A8', shade: '#0A1020' };
    const crest: Pt[] = [[b.x0 - 4, sy + 4]];
    for (let x = b.x0; x <= b.x1 + 8; x += 14) crest.push([x, sy - 2], [x + 7, sy + 2]);
    s += facets([...crest, [b.x1 + 8, sy + 8], [b.x0 - 4, sy + 8]], hsl(200 + h * 0.15, 40, 40), wv, { size: 6, relief: 0.6, seed: 44 });
    s += ray(50, 50, 0.12, sy, 30) + ray(100, 30, 0.07, sy, 30) + ray(10, 30, 0.08, sy, 30);
    for (let k = 0; k < 10; k++) s += fish(10 + r() * 60, 180 + r() * 50, 0.8 + r() * 0.4, hsl(h + 170, 50, 72));
    s += motes(14);
  } else if (st === 2) {
    s += facetSky(b.x0, b.y0, b.x1, b.y1, ['#16244A', '#0C1430', '#070A1C', '#03040C'], 45, 24);
    const li: Light = { dir: [-0.2, -0.8, 0.5], color: '#4A6AA8', shade: '#020308' };
    s += ray(90, 50, 0.05) + ray(150, 34, 0.04);
    s += whaleSil(150, 40, 0.4, '#1E2A50', li, 46) + whaleSil(176, 58, 0.26, '#1A2446', li, 47);
    // Le chant : arcs de petites gemmes dorées qui s'éloignent de la tête.
    for (let k = 1; k <= 4; k++) for (let i = 0; i <= 6; i++) { const a = Math.PI * (0.62 + (i / 6) * 0.76), R = k * 22; s += gem(34 + Math.cos(a) * R, 130 + Math.sin(a) * R * 1.2, 2.2 - k * 0.3, '#FFFFFF', GOLD); }
    const jelly = (x: number, y: number, rr: number, col: string) => {
      let o = disc(x, y, rr * 1.8, col, 0.15) + facets([...ellipse(x, y, rr, rr * 0.8, 12).filter((p) => p[1] <= y + 0.1)], col, { dir: [0, -1, 0.6], color: '#FFFFFF', shade: '#1A0A2A' }, { size: 3, relief: 0.8, seed: Math.round(x) });
      for (let k = 0; k < 4; k++) { const tx = x - rr * 0.6 + k * rr * 0.4; o += flat([[tx - 0.6, y], [tx + 0.6, y], [tx + 1.5, y + rr * 3], [tx + 0.6, y + rr * 3]], col, 0.5); }
      return o;
    };
    s += jelly(196, 170, 8, hsl(h + 195, 60, 66)) + jelly(30, 40, 6, hsl(h + 150, 50, 60)) + jelly(206, 104, 5, hsl(h + 150, 50, 60));
    s += facets([[b.x0, 226], [60, 220], [140, 228], [b.x1, 222], [b.x1, b.y1], [b.x0, b.y1]], '#0A1028', li, { size: 18, relief: 0.4, seed: 48 });
    s += motes(24);
  } else {
    s += facetSky(b.x0, b.y0, b.x1, b.y1, ['#05030F', hsl(h + 40, 45, 22), hsl(h + 110, 40, 18), hsl(h, 40, 12), '#06040E'], 49, 22);
    for (let k = 0; k < 10; k++) { const x = 10 + k * 20; s += flat([[x, 20], [x + 8, 20], [x + 4, 90], [x - 4, 90]], hsl(h + 195, 70, 70), 0.06); }
    const pl: Light = { dir: [-0.3, -0.8, 0.5], color: '#BFF6FF', shade: '#02060E', rim: '#FF9EE0' };
    s += disc(111, 520, 336, '#BFF6FF', 0.15) + facets(ellipse(111, 520, 330, 330, 60).filter((p) => p[1] < b.y1 + 40), hsl(190 + h * 0.2, 46, 28), pl, { size: 20, relief: 1.2, seed: 50 });
    for (const [x, y, rx] of [[40, 214, 30], [150, 206, 40], [200, 226, 20], [90, 232, 26]] as const) s += facets(ellipse(x, y, rx, rx * 0.22, 12), hsl(h + 120, 22, 36), pl, { size: 8, relief: 0.4, seed: x });
    s += disc(206, 14, 6, '#FFF6D8', 0.25) + gem(206, 14, 4, '#FFFFFF', '#FFF6D8') + flat([[204, 12], [150, 40], [152, 42], [206, 16]], '#FFF6D8', 0.35);
    for (let i = 0; i < 30; i++) s += disc(b.x0 + r() * W2, b.y0 + r() * 190, 0.4 + r() * 0.9, '#FFF6E0', 0.75);
  }
  return s;
};

export const cetoile: Species = Object.assign(draw, { scene });
