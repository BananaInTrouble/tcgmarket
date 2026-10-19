import type { Bounds, DrawCtx, Species } from './style.ts';
import { curve, ellipse, facetSky, facets, gem, hsl, limb, mix, prng, type FacetOpts, type Light, type Pt } from './lowpoly.ts';

/**
 * Drakomet → Wyvernova → Comethéon, en low-poly : dragon des comètes. Le nouveau-né sort d'un œuf-météorite au fond
 * d'un cratère fumant, la jeune wyverne guette sur un astéroïde au-dessus d'une planète, le grand dragon se dresse
 * sur un pic au-dessus des nuages et rugit un souffle d'étoiles ; sa queue s'achève en comète.
 */

const GOLD = '#E9C25B', CRYSTAL = '#BFF6FF';
const n1 = (v: number) => v.toFixed(1);
/** Facettes un peu plus grandes que demandé (budget : ~1500 facettes par carte). */
const fx = (poly: Pt[], col: string, L: Light, o: FacetOpts = {}) => facets(poly, col, L, { ...o, size: (o.size ?? 11) * 1.25 });
const LIGHTS: Light[] = [
  { dir: [0.2, 0.6, 0.6], color: '#FFB26B', shade: '#140816', rim: '#FF8A4A' },
  { dir: [-0.6, 0.3, 0.6], color: '#BFF6FF', shade: '#06061A', rim: '#7CE8FF' },
  { dir: [-0.5, -0.6, 0.6], color: '#FFD8C0', shade: '#0E0820', rim: '#FFB0C8' },
];
const constel = (pts: Pt[], s = 3) =>
  `<polyline points="${pts.map((p) => p.map(n1).join(',')).join(' ')}" fill="none" stroke="${GOLD}" stroke-width="0.7" opacity="0.85"/>`
  + pts.map(([x, y]) => gem(x, y, s, '#FFFFFF', GOLD)).join('');

type Pw = [number, number, number];
interface Pose {
  body: Pw[]; neck: Pw[]; tail: Pw[];
  head: { x: number; y: number; s: number; r: number; roar?: boolean };
  hind: Pw[]; hindFar?: Pw[]; arm?: Pw[]; armFar?: Pw[];
  wing: { sh: Pt; el: Pt; wr: Pt; tips: Pt[]; root: Pt; w: number };
  farWing: { dx: number; dy: number; s: number };
  horn: number;
}
const sp = (p: Pw[]): Pt[] => p.map(([x, y]) => [x, y] as Pt);
const wd = (p: Pw[]): number[] => p.map(([, , w]) => w * 2);

/** Comète : tête facettée et chevelure en éventail de triangles lumineux. */
function comet(x: number, y: number, ang: number, len: number): string {
  let s = `<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(len * 0.3)}" fill="${CRYSTAL}" opacity="0.15"/>`;
  const a = (ang * Math.PI) / 180;
  for (const [da, k, w, col, op] of [[0, 1, 5, '#7CE8FF', 0.55], [0.16, 0.8, 3.5, '#FFFFFF', 0.6], [-0.18, 0.75, 3, '#E58CFF', 0.5], [0.06, 0.95, 2, '#FFFFFF', 0.85]] as [number, number, number, string, number][]) {
    const ex = x + Math.cos(a + da) * len * k, ey = y + Math.sin(a + da) * len * k;
    const nx = -Math.sin(a + da) * w, ny = Math.cos(a + da) * w;
    s += `<path d="M${n1(x + nx)} ${n1(y + ny)} L${n1(ex)} ${n1(ey)} L${n1(x - nx)} ${n1(y - ny)} Z" fill="${col}" opacity="${op}"/>`;
  }
  return s + gem(x, y, len * 0.16 + 3, '#FFFFFF', CRYSTAL);
}

/** Tête de dragon (profil vers la gauche), points en repère local, nuque à l'origine. */
function head(P: Pose['head'], base: string, deep: string, L: Light, far: Light, st: number): string {
  const T = (p: Pt): Pt => {
    const a = (P.r * Math.PI) / 180, x = p[0] * P.s, y = p[1] * P.s;
    return [P.x + x * Math.cos(a) - y * Math.sin(a), P.y + x * Math.sin(a) + y * Math.cos(a)];
  };
  const TT = (ps: Pt[]) => ps.map(T);
  const hs = st === 0 ? 0.5 : 1;
  const horn = (pts: Pt[], w: number[], col: string, l: Light, seed: number) => fx(limb(TT(pts.map(([x, y]) => [x, y * hs] as Pt)), w.map((v) => v * P.s)), col, l, { size: 3, relief: 0.5, seed });
  let s = '';
  s += horn([[-4, -10], [6, -17], [18, -24], [28, -30]], [5, 4, 2.6, 0.8], mix(CRYSTAL, deep, 0.5), far, 70);
  // Collerette d'épines de la joue.
  s += fx(TT([[2, 6], [20, 2], [10, 10], [22, 14], [8, 16], [14, 24], [0, 16]]), deep, far, { size: 4, relief: 0.4, seed: 71 });
  const upper: Pt[] = [[4, -6], [-4, -15], [-16, -17], [-25, -13], [-33, -10], [-41, -8], [-47, -4], [-50, 0], [-47, 4], [-30, 6], [-14, 6], [0, 6], [8, 2]];
  const lower: Pt[] = P.roar ? [[-6, 8], [-20, 9], [-34, 14], [-44, 18], [-40, 21], [-24, 19], [-8, 16], [4, 12]] : [[-6, 8], [-22, 8], [-40, 10], [-38, 13], [-20, 16], [-6, 15], [4, 12]];
  if (P.roar) s += `<path d="${'M' + TT([[-46, 4], [-14, 7], [-44, 17]]).map((p) => p.map(n1).join(' ')).join(' L')} Z" fill="#2A0A1A"/>` + fx(TT([[-44, 5], [-30, 6.5], [-42, 14]]), '#E86A8A', L, { size: 3, relief: 0.3, seed: 72 });
  s += fx(TT(lower), mix(base, '#F2E6D8', 0.25), L, { size: 4, relief: 0.6, seed: 73 });
  s += fx(TT(upper), base, L, { size: 4.5, relief: 0.9, seed: 74 });
  // Arcade sourcilière, naseau, œil incandescent.
  s += fx(TT([[-34, -11], [-24, -16], [-10, -15], [-12, -11], [-24, -12]]), deep, L, { size: 3, relief: 0.4, seed: 75 });
  const [nx, ny] = T([-44, -3]);
  s += `<circle cx="${n1(nx)}" cy="${n1(ny)}" r="${n1(1.3 * P.s)}" fill="#0B0618"/>`;
  const [ex, ey] = T([-19, -7]);
  const eye = st === 0 ? '#FFE27A' : st === 1 ? '#7CF5E0' : '#FFB26B';
  s += `<circle cx="${n1(ex)}" cy="${n1(ey)}" r="${n1(5 * P.s)}" fill="${eye}" opacity="0.25"/><path d="M${n1(ex - 4 * P.s)} ${n1(ey)} L${n1(ex)} ${n1(ey - 2.4 * P.s)} L${n1(ex + 4 * P.s)} ${n1(ey - 0.4 * P.s)} L${n1(ex)} ${n1(ey + 2 * P.s)} Z" fill="${eye}"/><path d="M${n1(ex - 0.5)} ${n1(ey - 2 * P.s)} L${n1(ex + 0.6)} ${n1(ey - 2 * P.s)} L${n1(ex + 0.5)} ${n1(ey + 1.8 * P.s)} L${n1(ex - 0.4)} ${n1(ey + 1.8 * P.s)} Z" fill="#0B0618"/>`;
  s += horn([[-8, -12], [2, -20], [14, -29], [24, -36]], [6, 5, 3.4, 0.8], CRYSTAL, { ...L, color: '#FFFFFF', shade: '#3A5BC0' }, 76);
  if (st >= 2) s += constel(TT([[-38, -6], [-28, -12], [-14, -12], [-4, -4]]), 2);
  return s;
}

/** Aile : membrane-ciel nocturne facettée, os en membres fins. */
function wing(w: Pose['wing'], bone: string, mem: string, L: Light, seed: number, st: number, near: boolean): string {
  const { sh, el, wr, tips, root } = w;
  const poly: Pt[] = [sh, el, wr, tips[0]];
  for (let i = 1; i < tips.length; i++) {
    const [ax, ay] = tips[i - 1], [bx, by] = tips[i];
    poly.push([(ax + bx) / 2 + (wr[0] - (ax + bx) / 2) * 0.28, (ay + by) / 2 + (wr[1] - (ay + by) / 2) * 0.28], tips[i]);
  }
  const lt = tips[tips.length - 1];
  poly.push([(lt[0] + root[0]) / 2 + (wr[0] - (lt[0] + root[0]) / 2) * 0.3, (lt[1] + root[1]) / 2 + (wr[1] - (lt[1] + root[1]) / 2) * 0.3], root);
  let s = fx(poly, mem, L, { size: 15, relief: 0.5, seed, base2: mix(mem, '#000000', 0.3) });
  const r = prng(seed);
  for (let i = 0; i < (near ? 16 : 8); i++) {
    const t = tips[Math.floor(r() * tips.length)], u = 0.2 + r() * 0.6, v = r() * 0.4;
    const x = wr[0] + (t[0] - wr[0]) * u + (root[0] - wr[0]) * v * (1 - u), y = wr[1] + (t[1] - wr[1]) * u + (root[1] - wr[1]) * v * (1 - u);
    s += `<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(0.5 + r() * 0.9)}" fill="#FFFFFF" opacity="${n1(0.5 + r() * 0.5)}"/>`;
  }
  if (near && st >= 2) s += constel(tips.slice(1).map(([x, y], i) => [x + (wr[0] - x) * (0.3 + i * 0.05), y + (wr[1] - y) * (0.3 + i * 0.05)] as Pt), 2.6);
  const bl: Light = { ...L, rim: undefined };
  s += fx(limb([sh, [(sh[0] + el[0]) / 2, (sh[1] + el[1]) / 2], el, wr], [w.w * 3.6, w.w * 3, w.w * 2.4, w.w * 2]), bone, bl, { size: 5.5, relief: 0.6, seed: seed + 1 });
  tips.forEach((t, i) => { s += fx(limb([wr, [(wr[0] + t[0]) / 2, (wr[1] + t[1]) / 2 - 3], t], [w.w * 1.6, w.w * 1, w.w * 0.4]), bone, bl, { size: 5, relief: 0.4, seed: seed + 2 + i }); });
  s += `<path d="M${n1(wr[0])} ${n1(wr[1] - 2)} l-9 -8 l3 9 z" fill="${CRYSTAL}"/>`;
  return s;
}

const claws = (e: Pt, dir: number, col: string) => [-1, 0, 1].map((k) =>
  `<path d="M${n1(e[0] + k * 2.4)} ${n1(e[1] - 1)} L${n1(e[0] + dir * 8 + k * 3)} ${n1(e[1] + 3)} L${n1(e[0] + k * 2.4 + dir * 2)} ${n1(e[1] + 2)} Z" fill="${col}"/>`).join('');

function dragon(c: DrawCtx, P: Pose, st: number, extra = ''): string {
  const h = c.hue;
  const L = LIGHTS[st];
  const base = hsl(h, 34, 46), deep = hsl(h + 14, 40, 22), mem = hsl(h + 210, 38, 15);
  const far: Light = { ...L, color: mix(L.color, deep, 0.45), rim: undefined };
  let s = '';
  // Aile de l'arrière : miroir de l'aile avant autour de l'épaule.
  const m = (p: Pt): Pt => [P.wing.sh[0] - (p[0] - P.wing.sh[0]) * P.farWing.s + P.farWing.dx, P.wing.sh[1] + (p[1] - P.wing.sh[1]) * P.farWing.s + P.farWing.dy];
  const fw = { ...P.wing, sh: m(P.wing.sh), el: m(P.wing.el), wr: m(P.wing.wr), tips: P.wing.tips.map(m), root: m(P.wing.root) };
  s += wing(fw, deep, mix(mem, '#000000', 0.25), far, 80, st, false);
  if (P.hindFar) s += fx(limb(sp(P.hindFar), wd(P.hindFar)), deep, far, { size: 5, relief: 0.6, seed: 81 }) + claws(sp(P.hindFar).slice(-1)[0], -1, mix(CRYSTAL, deep, 0.5));
  if (P.armFar) s += fx(limb(sp(P.armFar), wd(P.armFar)), deep, far, { size: 4, relief: 0.6, seed: 82 }) + claws(sp(P.armFar).slice(-1)[0], -1, mix(CRYSTAL, deep, 0.5));
  // Queue, épines dorsales.
  s += fx(limb(sp(P.tail), wd(P.tail)), base, L, { size: 6, relief: 0.8, seed: 83, base2: deep });
  for (let i = 1; i < P.tail.length - 1; i++) {
    const [x, y, w] = P.tail[i], [x2, y2] = P.tail[i + 1], a = Math.atan2(y2 - y, x2 - x), nx = Math.sin(a), ny = -Math.cos(a), hh = w * 0.9 + 1.5;
    s += `<path d="M${n1(x + nx * w - Math.cos(a) * hh * 0.6)} ${n1(y + ny * w - Math.sin(a) * hh * 0.6)} L${n1(x + nx * (w + hh) + Math.cos(a) * hh * 0.4)} ${n1(y + ny * (w + hh) + Math.sin(a) * hh * 0.4)} L${n1(x + nx * w + Math.cos(a) * hh * 0.6)} ${n1(y + ny * w + Math.sin(a) * hh * 0.6)} Z" fill="${deep}"/>`;
  }
  // Corps et cou ; plastron ventral clair.
  s += fx(limb(sp(P.body), wd(P.body)), base, L, { size: 8, relief: 1.2, seed: 84, base2: deep });
  s += fx(limb(sp(P.neck), wd(P.neck)), base, L, { size: 6, relief: 1, seed: 85 });
  const belly = [...P.body.slice().reverse(), ...P.neck.slice(1)].map(([x, y, w], i, arr) => {
    const b = arr[Math.min(i + 1, arr.length - 1)], a0 = arr[Math.max(i - 1, 0)], a = Math.atan2(b[1] - a0[1], b[0] - a0[0]);
    return [x + Math.sin(a) * w * 0.55, y - Math.cos(a) * w * 0.55, w * 0.7] as Pw;
  });
  s += fx(limb(sp(belly), wd(belly).map((v) => v * 0.55)), mix(base, '#F2E6D8', 0.35), L, { size: 5, relief: 0.5, seed: 86 });
  // Épines du dos et du cou.
  const dors = [...P.neck.slice().reverse(), ...P.body.slice(1)];
  for (let i = 1; i < dors.length; i++) {
    const [x, y, w] = dors[i], [x0, y0] = dors[i - 1], a = Math.atan2(y - y0, x - x0), nx = -Math.sin(a), ny = Math.cos(a), hh = 3 + w * 0.3;
    const px = x - nx * w, py = y - ny * w;
    s += `<path d="M${n1(px - Math.cos(a) * hh * 0.5)} ${n1(py - Math.sin(a) * hh * 0.5)} L${n1(px - nx * hh)} ${n1(py - ny * hh)} L${n1(px + Math.cos(a) * hh * 0.6)} ${n1(py + Math.sin(a) * hh * 0.6)} Z" fill="${deep}"/>`;
  }
  if (st >= 2) s += constel(P.body.slice(1).map(([x, y, w]) => [x + 3, y - w * 0.2] as Pt), 2.6);
  s += extra;
  // Membres de devant.
  s += fx(limb(sp(P.hind), wd(P.hind)), base, L, { size: 5, relief: 0.8, seed: 87 }) + claws(sp(P.hind).slice(-1)[0], -1, CRYSTAL);
  if (P.arm) s += fx(limb(sp(P.arm), wd(P.arm)), base, L, { size: 4, relief: 0.8, seed: 88 }) + claws(sp(P.arm).slice(-1)[0], -1, CRYSTAL);
  // Aile de devant et tête.
  s += wing(P.wing, mix(base, '#FFFFFF', 0.08), mem, L, 90, st, true);
  s += head(P.head, base, deep, L, far, st);
  return s;
}

const draw = (c: DrawCtx): string => {
  const st = Math.min(c.stage, 2);
  const h = c.hue;
  let s = '';
  if (st === 2) {
    // Comethéon : dressé sur son pic, ailes ouvertes, il rugit un souffle d'étoiles.
    s += `<ellipse cx="118" cy="205" rx="70" ry="7" fill="#05030C" opacity="0.45"/>`;
    const P: Pose = {
      body: [[96, 112, 17], [108, 130, 20], [122, 146, 18], [136, 156, 13]],
      neck: [[96, 112, 14], [84, 96, 10.5], [74, 78, 8.5], [72, 62, 7.5], [78, 50, 7]],
      tail: [[134, 156, 12], [158, 170, 9.5], [174, 188, 7], [162, 200, 5.2], [130, 204, 4.2], [98, 200, 3.2], [72, 190, 2.4], [56, 178, 1.2]],
      head: { x: 80, y: 50, s: 1.05, r: 4, roar: true },
      hind: [[130, 148, 13], [118, 170, 8], [128, 188, 5.5], [122, 200, 4]],
      hindFar: [[142, 152, 10], [150, 174, 6], [150, 192, 4.5], [146, 200, 3.5]],
      arm: [[94, 124, 8], [104, 142, 5.5], [88, 152, 4.5], [76, 150, 3.5]],
      armFar: [[104, 122, 6], [90, 134, 4.5], [76, 132, 3.6], [68, 126, 3]],
      wing: { sh: [110, 106], el: [148, 74], wr: [146, 30], tips: [[104, 8], [180, 6], [210, 38], [212, 80], [196, 112]], root: [150, 140], w: 3.2 },
      farWing: { dx: -8, dy: -4, s: 0.82 },
      horn: 1.2,
    };
    s += dragon(c, P, 2, comet(56, 178, 150, 46));
    // Souffle de poussière d'étoiles.
    for (const [da, l, w, col, op] of [[0, 34, 6, CRYSTAL, 0.5], [0.16, 28, 4, '#FFFFFF', 0.55], [-0.14, 26, 3.6, '#E58CFF', 0.45]] as [number, number, number, string, number][]) {
      const a = (205 * Math.PI) / 180 + da, x0 = 30, y0 = 52, ex = x0 + Math.cos(a) * l, ey = y0 + Math.sin(a) * l, nx = -Math.sin(a) * w, ny = Math.cos(a) * w;
      s += `<path d="M${x0} ${y0} L${n1(ex + nx)} ${n1(ey + ny)} L${n1(ex - nx)} ${n1(ey - ny)} Z" fill="${col}" opacity="${op}"/>`;
    }
    const r = prng(9);
    for (let i = 0; i < 7; i++) s += gem(2 + r() * 26, 34 + r() * 26, 1.2 + r() * 2, '#FFFFFF', CRYSTAL);
    s += constel([[16, 22], [28, 12], [44, 16], [52, 4]]);
    return s;
  }
  if (st === 1) {
    // Wyvernova : jeune wyverne qui guette, perchée sur son astéroïde.
    const rockL: Light = { dir: [-0.6, 0.2, 0.6], color: '#9FD8F0', shade: '#05061A', rim: '#7CE8FF' };
    let g = fx(curve([60, 204], [[[56, 192], [64, 180], [78, 176]], [[96, 170], [124, 172], [142, 176]], [[158, 180], [168, 190], [166, 204]], [[130, 210], [90, 210], [60, 204]]]), hsl(h + 200, 14, 34), rockL, { size: 10, relief: 0.9, seed: 30, base2: '#141428' });
    for (const [x, y, k] of [[86, 180, 1], [94, 177, 1.4], [134, 180, 0.9]] as [number, number, number][]) g += fx([[x - 3 * k, y], [x, y - 12 * k], [x + 3 * k, y]], CRYSTAL, { dir: [-0.6, -0.3, 0.6], color: '#FFFFFF', shade: '#3A5BC0' }, { size: 3, relief: 0.4, seed: x });
    const P: Pose = {
      body: [[104, 124, 14], [112, 140, 16], [122, 156, 13], [132, 166, 9]],
      neck: [[104, 124, 11], [96, 108, 8.5], [88, 92, 7], [86, 78, 6.4], [92, 68, 6]],
      tail: [[132, 166, 9], [152, 176, 7], [176, 172, 5], [194, 156, 3.6], [200, 136, 2.4], [194, 120, 1.2]],
      head: { x: 93, y: 68, s: 0.92, r: -4 },
      hind: [[122, 156, 11], [108, 170, 6.5], [118, 180, 4.5], [110, 178, 3.4]],
      hindFar: [[132, 160, 8], [142, 172, 5], [140, 180, 3.8], [134, 179, 3]],
      wing: { sh: [120, 122], el: [152, 104], wr: [142, 62], tips: [[116, 40], [168, 30], [194, 58], [196, 92], [178, 120]], root: [140, 150], w: 2.2 },
      farWing: { dx: -6, dy: -2, s: 0.7 },
      horn: 0.5,
    };
    g += dragon(c, P, 1);
    g += comet(194, 120, -70, 28);
    return `<g transform="translate(116 205) scale(1.12) translate(-116 -205)">${g}</g>`;
  }
  // Drakomet : nouveau-né qui sort de son œuf-météorite.
  const eggL: Light = { dir: [0.2, 0.5, 0.7], color: '#FFB26B', shade: '#0E0610', rim: '#FF8A4A' };
  let g = `<ellipse cx="112" cy="205" rx="70" ry="7" fill="#05030C" opacity="0.45"/>`;
  g += fx([[64, 130], [76, 104], [100, 92], [116, 92], [136, 92], [156, 108], [160, 132], [150, 126], [138, 136], [128, 122], [114, 136], [104, 120], [92, 136], [80, 124], [72, 138]], '#1A1020', eggL, { size: 8, relief: 0.4, seed: 40 });
  for (let i = 0; i < 6; i++) g += fx([[80 + i * 12, 128 - (i % 2) * 4], [83 + i * 12, 119 - (i % 2) * 4], [87 + i * 12, 127 - (i % 2) * 4]], i % 2 ? '#FFE27A' : CRYSTAL, eggL, { size: 3, relief: 0.3, seed: 41 + i });
  const P: Pose = {
    body: [[112, 150, 20], [116, 162, 20]],
    neck: [[110, 146, 12], [100, 128, 9], [92, 110, 8], [92, 96, 7.5], [98, 86, 7.2]],
    tail: [[150, 150, 6], [168, 140, 4.6], [178, 124, 3.2], [176, 110, 1.6]],
    head: { x: 100, y: 86, s: 0.95, r: -6 },
    hind: [[120, 160, 8], [124, 168, 5], [126, 172, 4]],
    arm: [[96, 140, 5], [86, 134, 3.6], [78, 132, 3]],
    wing: { sh: [116, 132], el: [134, 118], wr: [130, 98], tips: [[118, 90], [144, 88], [154, 104], [150, 120]], root: [134, 138], w: 1.6 },
    farWing: { dx: -4, dy: -2, s: 0.8 },
    horn: 0,
  };
  g += dragon(c, P, 0);
  // Coquille de devant (roche météoritique) et fêlures incandescentes.
  g += fx([[48, 204], [42, 176], [46, 150], [62, 128], [72, 138], [80, 124], [92, 136], [104, 120], [114, 136], [128, 122], [138, 136], [150, 126], [160, 138], [176, 154], [180, 182], [172, 204]], mix('#3A4C78', hsl(h + 180, 30, 40), 0.25), { ...eggL, rim: CRYSTAL }, { size: 10, relief: 1, seed: 50, base2: '#120A18' });
  for (const d of [[[96, 150], [90, 164], [98, 170], [94, 182]], [[140, 146], [146, 158], [140, 166]], [[64, 160], [72, 170], [68, 184]]] as Pt[][]) {
    g += fx(limb(d, [2.4, 1.8, 1.4, 1]), '#FFD27A', { dir: [0, 0, 1], color: '#FFFFFF', shade: '#FF8A4A' }, { size: 2, relief: 0.2, seed: 55 });
  }
  g += fx(limb([[88, 142], [78, 136], [72, 134]], [8, 6, 5]), hsl(h, 34, 46), LIGHTS[0], { size: 3, relief: 0.6, seed: 56 }) + claws([72, 134], -1, CRYSTAL);
  return `<g transform="translate(112 205) scale(1.08) translate(-112 -205)">${g}</g>`;
};

// ---------------------------------------------------------------------------------------------------------------
// Décor : cratère d'impact fumant (éclosion), champ d'astéroïdes au-dessus d'une planète (perchoir), pic rocheux au-
// dessus d'une mer de nuages traversée de comètes (rugissement).

const stars = (b: Bounds, n: number, ymax: number, seed: number) => {
  const r = prng(seed);
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = b.x0 + r() * (b.x1 - b.x0), y = b.y0 + r() * (ymax - b.y0), z = r();
    s += z > 0.8 ? gem(x, y, 1.6 + r() * 2, '#FFFFFF', '#BFD7FF') : `<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(0.5 + z)}" fill="#FFFFFF" opacity="${n1(0.4 + r() * 0.5)}"/>`;
  }
  return s;
};
function rock(x: number, y: number, rr: number, col: string, L: Light, seed: number): string {
  const r = prng(seed);
  const pts: Pt[] = [];
  for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2, k = rr * (0.75 + r() * 0.35); pts.push([x + Math.cos(a) * k, y + Math.sin(a) * k * 0.85]); }
  return fx(pts, col, L, { size: Math.max(3, rr / 2.4), relief: 0.9, seed });
}

const scene = (c: DrawCtx, b: Bounds): string => {
  const st = Math.min(c.stage, 2);
  const h = c.hue;
  const r = prng(90 + st);
  let s = '';
  if (st === 0) {
    s += facetSky(b.x0, b.y0, b.x1, b.y1, ['#0E0C22', '#22162E', '#3A2230', '#2A1620', '#140A12'], 3, 32);
    s += stars(b, 28, 110, 6);
    s += `<path d="M150 14 L210 -8 L212 -5 Z" fill="#FFE6B0" opacity="0.8"/>`;
    for (let i = 0; i < 5; i++) s += `<ellipse cx="${n1(80 + r() * 70)}" cy="${n1(40 + i * 16)}" rx="${n1(26 + r() * 18)}" ry="${n1(9 + r() * 5)}" fill="#6A5470" opacity="${n1(0.08 + i * 0.03)}"/>`;
    const hL: Light = { dir: [0.2, 0.6, 0.6], color: '#E08A5A', shade: '#0A0610' };
    s += fx([[b.x0, 140], [40, 126], [80, 134], [120, 122], [170, 132], [b.x1, 124], [b.x1, 166], [b.x0, 166]], '#3A2A3C', hL, { size: 18, relief: 0.5, seed: 10 });
    s += fx([[b.x0, 154], [40, 140], [111, 144], [180, 138], [b.x1, 148], [b.x1, b.y1], [b.x0, b.y1]], '#4A3436', hL, { size: 28, relief: 0.6, seed: 11, base2: '#160C12' });
    s += fx(ellipse(111, 198, 112, 34, 22), '#1C1218', { dir: [0.1, -0.7, 0.6], color: '#FF9A5A', shade: '#080408' }, { size: 16, relief: -0.6, seed: 12 });
    s += `<ellipse cx="111" cy="200" rx="70" ry="16" fill="#FF9A4A" opacity="0.2"/>`;
    for (const d of [[[18, 206], [36, 202], [46, 208], [60, 206]], [[168, 214], [182, 208], [194, 212], [206, 206]], [[60, 228], [72, 224], [84, 226]]] as Pt[][]) s += fx(limb(d, [2.2, 1.6, 1.2, 1]), '#FFB26B', { dir: [0, 0, 1], color: '#FFF0C0', shade: '#C8501A' }, { size: 2, relief: 0.2, seed: 13 });
    for (let i = 0; i < 12; i++) { const x = 20 + r() * 180, y = 60 + r() * 130; s += `<path d="M${n1(x)} ${n1(y - 1.4)} L${n1(x + 1.2)} ${n1(y)} L${n1(x)} ${n1(y + 1.4)} L${n1(x - 1.2)} ${n1(y)} Z" fill="#FFB26B" opacity="${n1(0.5 + r() * 0.5)}"/>`; }
    s += rock(22, 222, 9, '#4A3A40', hL, 14) + rock(198, 228, 12, '#4A3A40', hL, 15) + rock(186, 150, 4, '#4A3A40', hL, 16);
  } else if (st === 1) {
    s += facetSky(b.x0, b.y0, b.x1, b.y1, ['#08081C', '#0E1030', '#141634', '#0C0E24'], 4, 32);
    s += `<ellipse cx="160" cy="60" rx="90" ry="40" fill="${hsl(h + 200, 60, 50)}" opacity="0.14"/><ellipse cx="60" cy="40" rx="60" ry="24" fill="${hsl(h + 140, 60, 56)}" opacity="0.1"/>`;
    s += stars(b, 50, b.y1, 7);
    const pL: Light = { dir: [0.6, -0.6, 0.5], color: '#BFF6FF', shade: '#04081A', rim: '#7CE8FF' };
    s += `<circle cx="-20" cy="300" r="132" fill="${hsl(h + 180, 70, 70)}" opacity="0.12"/>` + fx(ellipse(-20, 300, 120, 120, 40), hsl(h + 180, 34, 34), pL, { size: 28, relief: 1, seed: 20 });
    const aL: Light = { dir: [-0.6, 0.3, 0.6], color: '#9FD8F0', shade: '#04040E' };
    for (let i = 0; i < 8; i++) s += rock(b.x0 + r() * (b.x1 - b.x0), 10 + r() * 150, 2.5 + r() * 4, '#5A5A7A', aL, 21 + i);
    s += rock(30, 70, 12, '#4A4A66', aL, 30) + rock(198, 190, 16, '#3E3E58', aL, 31) + rock(186, 26, 8, '#4A4A66', aL, 32);
  } else {
    s += facetSky(b.x0, b.y0, b.x1, b.y1, ['#0E0E2C', hsl(h + 220, 36, 28), hsl(h + 330, 44, 50), '#F2C79A', '#8A6A90', '#3A2A48'], 5, 32);
    s += stars(b, 30, 120, 8);
    for (const [x, y, l] of [[190, 20, 60], [60, 66, 40], [150, 92, 30]] as Pt3[]) {
      s += `<path d="M${x} ${y - 1.4} L${x + l} ${y - l * 0.6} L${x} ${y + 1.4} Z" fill="#FFFFFF" opacity="0.6"/>` + gem(x, y, 3, '#FFFFFF', CRYSTAL);
    }
    const mL: Light = { dir: [-0.5, -0.6, 0.6], color: '#F2C0C8', shade: '#120A24' };
    s += fx([[b.x0, 172], [20, 140], [36, 158], [58, 120], [80, 160], [160, 166], [b.x1 - 30, 130], [b.x1, 150], [b.x1, 182], [b.x0, 182]], hsl(h + 260, 22, 40), mL, { size: 22, relief: 0.6, seed: 40 });
    // Mer de nuages (bourrelets facettés).
    const cloud = (y: number, col: string, seed: number) => {
      const pts: Pt[] = [[b.x0 - 10, b.y1]];
      let x = b.x0 - 10;
      const cr = prng(seed);
      while (x < b.x1 + 20) { const w = 14 + cr() * 20; pts.push([x, y + (cr() - 0.5) * 6], [x + w * 0.5, y - 8 - cr() * 8]); x += w; }
      pts.push([b.x1 + 20, y], [b.x1 + 20, b.y1]);
      return fx(pts, col, { dir: [-0.4, -0.8, 0.5], color: '#FFE6E0', shade: '#3A2440' }, { size: 20, relief: 0.6, seed });
    };
    s += cloud(176, '#B890B0', 41) + cloud(194, '#9A7298', 42);
    // Le pic sous le dragon.
    s += fx([[b.x0 - 6, b.y1], [18, 222], [40, 206], [70, 202], [120, 200], [170, 203], [196, 210], [214, 224], [b.x1 + 6, b.y1]], '#3A3048', { dir: [-0.5, -0.6, 0.6], color: '#FFC4B0', shade: '#0A0612', rim: '#FFB0C8' }, { size: 20, relief: 0.8, seed: 43, base2: '#120C1C' });
  }
  return s;
};
type Pt3 = [number, number, number];

export const drakomet: Species = Object.assign(draw, { scene });
