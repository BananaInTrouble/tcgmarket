import type { Bounds, DrawCtx, Species } from './style.ts';
import { ellipse, facetSky, facets, gem, hsl, limb, mix, prng, type Light, type Pt } from './lowpoly.ts';

/**
 * Lynxaure → Boréalynx → Aurorion (low-poly) : lynx à crinière d'aurore boréale, dans la taïga.
 * 0 : le petit dort enroulé dans la neige sous la lune. 1 : le jeune traque, ventre bas, sur un lac gelé sous les
 * aurores. 2 : l'adulte se dresse sur un éperon au-dessus d'une mer de nuages, à l'aube, crinière d'aurore déployée.
 */

/** Courbe lisse (Catmull-Rom) échantillonnée en polygone (fermé) ou en ligne (ouverte). */
function sm(q: Pt[], per = 3, closed = true): Pt[] {
  const n = q.length, out: Pt[] = [];
  const at = (i: number) => (closed ? q[(i + n) % n] : q[Math.max(0, Math.min(n - 1, i))]);
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
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
const constel = (pts: Pt[]) => `<polyline points="${pts.map((p) => p.join(',')).join(' ')}" fill="none" stroke="${GOLD}" stroke-width="0.7" opacity="0.85"/>` + pts.map(([x, y]) => gem(x, y, 3, '#FFFFFF', GOLD)).join('');

interface Cols { base: string; deep: string; belly: string; dark: string; a1: string; a2: string; glow: string; eye: string }
const colors = (h: number): Cols => ({
  base: hsl(h, 30, 46), deep: hsl(h + 10, 38, 24), belly: hsl(h - 10, 22, 74), dark: hsl(h + 20, 40, 10),
  a1: hsl(h + 150, 65, 58), a2: hsl(h + 205, 60, 62), glow: hsl(h + 40, 85, 78), eye: '#FFD27A',
});
const dim = (L: Light, t = 0.45): Light => ({ ...L, color: mix(L.color, L.shade, t), rim: undefined });

/** Taches de pelage : petits losanges sombres plats dans une ellipse. */
function spots(seed: number, cx: number, cy: number, rx: number, ry: number, n: number, col: string): string {
  const r = prng(seed);
  let s = '';
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()), x = cx + Math.cos(a) * rx * d, y = cy + Math.sin(a) * ry * d, w = 1.3 + r() * 1.6;
    s += flat([[x - w, y], [x, y - w * 0.6], [x + w, y], [x, y + w * 0.6]], col, 0.55);
  }
  return s;
}

/** Rideau d'aurore facetté : bord bas le long de `spine`, rayons verticaux jusqu'à `hmax`. */
function curtain(spine: Pt[], hmax: number, k: Cols, seed: number, op = 0.85): string {
  const b = sm(spine, 4, false), n = b.length;
  const H = (i: number) => hmax * Math.pow(Math.sin(Math.PI * Math.min(1, (i / (n - 1)) * 1.1)), 0.7);
  const top = b.map(([x, y], i) => [x + H(i) * 0.12, y - H(i)] as Pt);
  const L: Light = { dir: [0, -1, 0.6], color: '#FFFFFF', shade: k.a2 };
  let s = facets([...b, ...top.reverse()], k.a2, L, { size: 9, relief: 0.35, seed, base2: k.a1, opacity: op, jitter: 0.25 });
  s += `<polyline points="${b.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' ')}" fill="none" stroke="${k.glow}" stroke-width="1.4" opacity="0.8"/>`;
  return s;
}

/** Tête de lynx de profil (museau à gauche ; truffe ≈ (25, 89), nuque ≈ (92, 78)). */
function head(k: Cols, L: Light, o: { tuft: number; ruff: number; young: number; asleep?: boolean; seed: number }): string {
  const y = o.young;
  const m = (q: Pt[]): Pt[] => q.map(([px, py]) => [px < 62 ? px + (62 - px) * 0.2 * y : px, py < 72 && px > 36 ? py - 3 * y : py]);
  const Lf = dim(L);
  let s = '';
  // Oreille lointaine + pinceau.
  s += facets([[80, 66], [85, 46], [91, 30], [95, 46], [97, 68]], k.deep, Lf, { size: 5, relief: 0.5, seed: o.seed });
  s += flat([[89.5, 33], [91 + o.tuft * 0.1, 30 - o.tuft], [92.6, 33]], k.dark);
  // Collerette de joues (pointes).
  const R = 6 + o.ruff * 12;
  s += facets(sm(m([[96, 84], [100, 100], [97, 106 + R * 0.4], [93, 110 + R * 0.7], [87, 106 + R * 0.25], [80, 110 + R * 0.95], [74, 106 + R * 0.3], [66, 110 + R * 0.7], [60, 104 + R * 0.25], [52, 104 + R * 0.45], [46, 100], [50, 92], [70, 86]]), 2), k.belly, L, { size: 5, relief: 0.8, seed: o.seed + 1, base2: mix(k.belly, k.deep, 0.5) });
  // Crâne et museau.
  s += facets(sm(m([[25, 89], [30, 80], [40, 70], [54, 61], [68, 57], [82, 61], [92, 72], [97, 86], [92, 98], [76, 100], [60, 102], [46, 100], [34, 97], [27, 94]]), 2), k.base, L, { size: 5.5, relief: 1, seed: o.seed + 2, base2: k.deep });
  s += facets(sm(m([[24, 92], [34, 87], [46, 88], [58, 93], [62, 100], [46, 103], [29, 99]]), 2), k.belly, L, { size: 4, relief: 0.5, seed: o.seed + 3 });
  // Rayures de joue (plates).
  s += flat(m([[62, 90], [84, 97], [84, 100], [62, 93]]), k.dark, 0.5) + flat(m([[63, 96], [86, 103], [86, 106], [63, 99]]), k.dark, 0.45);
  // Oreille proche : dos, intérieur, pointe noire, pinceau.
  s += facets([[63, 64], [66, 46], [72, 28], [79, 44], [85, 62]], k.base, L, { size: 4.5, relief: 0.6, seed: o.seed + 4 });
  s += flat([[68, 61], [70, 47], [72, 38], [75, 47], [79, 61]], mix(k.deep, k.belly, 0.25));
  s += flat([[69.3, 36], [72, 28], [74.6, 36]], k.dark);
  s += flat([[70.8, 31], [72 + o.tuft * 0.15, 28 - o.tuft], [73.2, 31]], k.dark);
  // Œil (ou paupière close), truffe.
  const [ex, ey] = m([[47, 77]])[0];
  if (o.asleep) s += flat([[ex - 6, ey - 1], [ex, ey + 2], [ex + 6, ey - 0.5], [ex, ey + 3.4]], k.dark);
  else {
    const w = 5.6 + y;
    s += flat([[ex - w, ey], [ex - w * 0.2, ey - w * 0.62], [ex + w, ey - 0.6], [ex, ey + w * 0.38]], k.eye);
    s += flat([[ex - 0.7, ey - w * 0.45], [ex + 0.9, ey - w * 0.45], [ex + 0.9, ey + w * 0.3], [ex - 0.7, ey + w * 0.3]], '#0B0618');
    s += `<circle cx="${(ex - w * 0.35).toFixed(1)}" cy="${(ey - w * 0.2).toFixed(1)}" r="1" fill="#FFFFFF"/>`;
    s += flat([[ex - w - 1, ey], [ex - w * 0.2, ey - w * 0.85], [ex + w + 1, ey - 1.4], [ex - w * 0.2, ey - w * 0.62]], k.dark, 0.8);
  }
  const [nx, ny] = m([[25, 88]])[0];
  s += flat([[nx - 2, ny - 2], [nx + 5, ny - 3.5], [nx + 6, ny], [nx + 1, ny + 3]], '#0B0618');
  return s;
}

/** Lynx debout de profil (sol y = 205). `crouch` : silhouette basse de traque ; `mane` : crinière de poitrail. */
function standing(k: Cols, L: Light, o: { headRot: number; tuft: number; ruff: number; young: number; crouch?: boolean; mane?: boolean; gold?: boolean; seed: number }): string {
  const Lf = dim(L);
  let s = '';
  s += facets(sm([[98, 130], [114, 132], [112, 160], [108, 188], [111, 198], [110, 205], [90, 205], [90, 199], [97, 192], [100, 162]], 2), k.deep, Lf, { size: 6, relief: 0.6, seed: o.seed });
  s += facets(sm([[140, 120], [162, 116], [168, 140], [162, 160], [160, 180], [163, 197], [162, 205], [141, 205], [142, 199], [149, 192], [150, 172], [146, 150]], 2), k.deep, Lf, { size: 6, relief: 0.6, seed: o.seed + 1 });
  // Queue courte à bout noir.
  s += facets(sm([[176, 102], [190, 94], [202, 92], [206, 100], [198, 108], [184, 112]], 2), k.base, L, { size: 5, relief: 0.6, seed: o.seed + 2 });
  s += flat([[197, 92], [203, 92], [206, 100], [199, 107], [196, 104]], k.dark);
  // Corps.
  const body: Pt[] = [[90, 92], [118, 102], [146, 100], [170, 96], [184, 104], [192, 122], [188, 142], [176, 150], [156, 146], [132, 150], [108, 160], [84, 158], [68, 140], [62, 116], [66, 96], [76, 86]];
  s += facets(sm(body, 2), k.base, L, { size: 10, relief: 1.3, seed: o.seed + 3, base2: k.deep });
  s += facets(sm([[64, 112], [76, 118], [86, 138], [84, 158], [66, 150]], 2), k.belly, L, { size: 6, relief: 0.6, seed: o.seed + 4, base2: mix(k.belly, k.deep, 0.4) });
  s += spots(o.seed + 5, 140, 122, 36, 14, 22, k.dark);
  // Pattes proches.
  s += facets(sm([[146, 112], [170, 104], [190, 118], [194, 140], [186, 158], [180, 172], [184, 184], [185, 198], [184, 205], [160, 205], [160, 199], [167, 192], [168, 176], [162, 160], [150, 148], [142, 130]], 2), k.base, L, { size: 8, relief: 1.1, seed: o.seed + 6, base2: k.deep });
  s += spots(o.seed + 7, 168, 132, 12, 12, 8, k.dark);
  s += facets(sm([[72, 118], [96, 120], [98, 140], [92, 160], [88, 180], [89, 196], [92, 205], [64, 205], [64, 199], [72, 193], [74, 176], [74, 154], [70, 136]], 2), k.base, L, { size: 7, relief: 1, seed: o.seed + 8, base2: k.deep });
  s += spots(o.seed + 9, 84, 150, 6, 16, 5, k.dark);
  if (o.gold) {
    s += constel([[118, 120], [134, 112], [150, 122], [166, 114], [180, 126]]);
    s += gem(124, 130, 3.4, '#FFFFFF', GOLD);
  }
  if (o.crouch) s = `<g transform="translate(120 205) scale(1.08 0.8) translate(-120 -205)">${s}</g>`;
  if (o.mane) {
    s += facets(sm([[66, 84], [98, 82], [112, 100], [110, 128], [100, 150], [94, 168], [86, 152], [78, 172], [70, 152], [60, 164], [58, 142], [52, 122], [56, 98]], 2), k.belly, L, { size: 6, relief: 1, seed: o.seed + 10, base2: mix(k.belly, k.a1, 0.45) });
    for (const [x, y] of [[94, 168], [78, 172], [60, 164]] as Pt[]) s += gem(x, y, 2.6, '#FFFFFF', k.a1);
  }
  const hy = o.crouch ? 25 : 2, hx = o.crouch ? -17 : -14;
  s += `<g transform="translate(${hx} ${hy}) rotate(${o.headRot} 92 80)">${head(k, L, { tuft: o.tuft, ruff: o.ruff, young: o.young, seed: o.seed + 20 })}</g>`;
  return s;
}

/** Petit endormi, enroulé, menton posé sur les pattes. */
function sleeper(k: Cols, L: Light): string {
  let s = `<ellipse cx="108" cy="207" rx="72" ry="8" fill="#050816" opacity="0.4"/>`;
  s += facets(sm([[66, 182], [80, 164], [106, 152], [136, 150], [158, 160], [168, 178], [160, 196], [136, 204], [100, 206], [74, 200]], 2), k.base, L, { size: 9, relief: 1.4, seed: 1, base2: k.deep });
  s += spots(2, 120, 172, 34, 14, 24, k.dark);
  for (const dy of [0, 5]) s += facets(sm([[82, 194 + dy], [60, 194 + dy], [46, 197 + dy], [44, 202 + dy], [50, 205 + dy], [82, 204 + dy]], 2), dy ? k.belly : k.base, L, { size: 4, relief: 0.6, seed: 3 + dy });
  s += facets(sm([[150, 190], [166, 194], [162, 204], [136, 210], [104, 212], [84, 210], [80, 204], [104, 205], [136, 200]], 2), k.base, L, { size: 5, relief: 0.7, seed: 9 });
  s += flat([[80, 204], [90, 204], [90, 211], [84, 210]], k.dark);
  s += `<g transform="translate(94 172) rotate(-14) scale(0.98) translate(-92 -78)">${head(k, L, { tuft: 4, ruff: 0.15, young: 1, asleep: true, seed: 30 })}</g>`;
  for (const [x, y] of [[112, 156], [134, 154], [146, 166], [96, 162]] as Pt[]) s += gem(x, y, 2, '#FFFFFF', '#BFD7FF');
  return s;
}

const LIGHTS: Light[] = [
  { dir: [-0.5, -0.6, 0.6], color: '#DDE6FF', shade: '#0A0C26', rim: '#9FC3FF' },
  { dir: [-0.2, -0.8, 0.6], color: '#C8FFF0', shade: '#061424', rim: '#7CF5E0' },
  { dir: [0.55, -0.45, 0.6], color: '#FFE3B8', shade: '#1A0E2E', rim: '#FF9EC0' },
];

const draw = (c: DrawCtx): string => {
  const st = Math.min(2, c.stage), k = colors(c.hue), L = LIGHTS[st];
  if (st === 0) return `<g transform="translate(114 200) scale(1.12) translate(-104 -196)">${sleeper(k, L)}</g>`;
  if (st === 1) {
    let g = curtain([[86, 120], [110, 112], [138, 110], [164, 102], [188, 88]], 40, k, 51);
    g += curtain([[96, 128], [124, 124], [150, 122], [176, 116], [196, 106]], 26, k, 52, 0.7);
    g += standing(k, L, { headRot: -6, tuft: 10, ruff: 0.4, young: 0.35, crouch: true, seed: 60 });
    const refl = `<g transform="translate(0 410) scale(1 -1)" opacity="0.18">${g}</g>`;
    return `<g transform="translate(111 192) scale(0.84) translate(-121 -206)">${refl}<ellipse cx="128" cy="206" rx="78" ry="7" fill="#03101C" opacity="0.45"/>${g}</g>`;
  }
  let g = curtain([[66, 82], [100, 84], [134, 78], [164, 64], [186, 42], [196, 18], [190, 0]], 64, k, 71);
  g += curtain([[86, 94], [118, 96], [150, 92], [180, 84], [204, 70], [220, 50]], 44, k, 72, 0.8);
  g += curtain([[104, 104], [134, 104], [164, 100], [192, 98], [218, 92]], 26, k, 73, 0.7);
  const rockL: Light = { dir: [0.55, -0.45, 0.6], color: '#FFD3A8', shade: '#0E0820', rim: '#FF9EC0' };
  g += facets(sm([[22, 236], [30, 206], [50, 190], [92, 186], [128, 196], [168, 202], [200, 204], [214, 212], [222, 236]], 2), '#3A2E52', rockL, { size: 12, relief: 0.8, seed: 74, base2: '#140E26' });
  g += `<ellipse cx="128" cy="200" rx="60" ry="6" fill="#0A0616" opacity="0.4" transform="rotate(-7 176 205)"/>`;
  g += `<g transform="rotate(-7 176 205)">${standing(k, L, { headRot: -12, tuft: 16, ruff: 1, young: 0, mane: true, gold: true, seed: 80 })}</g>`;
  g += gem(55, 6, 3.4, '#FFFFFF', GOLD);
  if (c.stage >= 3) g += constel([[18, 30], [34, 18], [48, 30], [42, 46]]);
  return `<g transform="translate(111 206) scale(0.94) translate(-112 -206)">${g}</g>`;
};

/** Sapin facetté (triangle étagé). */
function fir(x: number, y: number, hh: number, col: string, L: Light, seed: number): string {
  const w = hh * 0.34;
  return facets([[x, y - hh], [x + w * 0.5, y - hh * 0.55], [x + w * 0.3, y - hh * 0.55], [x + w, y], [x - w, y], [x - w * 0.3, y - hh * 0.55], [x - w * 0.5, y - hh * 0.55]], col, L, { size: Math.max(6, hh / 4), relief: 0.7, seed });
}

const scene = (c: DrawCtx, b: Bounds): string => {
  const st = Math.min(2, c.stage), r = prng(300 + st);
  const W = b.x1 - b.x0;
  let s = '';
  const starsOf = (n: number, ymax: number) => { let t = ''; for (let i = 0; i < n; i++) t += `<circle cx="${(b.x0 + r() * W).toFixed(1)}" cy="${(b.y0 + r() * (ymax - b.y0)).toFixed(1)}" r="${(0.4 + r() * 0.9).toFixed(1)}" fill="#FFFFFF" opacity="${(0.4 + r() * 0.5).toFixed(2)}"/>`; return t; };
  if (st === 0) {
    // Clairière enneigée sous la lune, sapins.
    s += facetSky(b.x0, b.y0, b.x1, b.y1, ['#060820', '#101A44', '#22306A', '#2A3A72', '#0C122E'], 11, 24) + starsOf(40, 120);
    s += `<circle cx="58" cy="44" r="30" fill="#DDE6FF" opacity="0.14"/>` + facets(ellipse(58, 44, 14, 14, 14), '#EEF2FF', { dir: [-0.4, -0.4, 0.8], color: '#FFFFFF', shade: '#8A96C8' }, { size: 6, relief: 0.6, seed: 2 });
    const tL: Light = { dir: [-0.5, -0.6, 0.6], color: '#9FB4E8', shade: '#050818' };
    s += facets([[b.x0, 150], [40, 126], [90, 140], [140, 120], [190, 138], [b.x1, 128], [b.x1, 170], [b.x0, 170]], '#25325E', tL, { size: 18, relief: 0.4, seed: 3 });
    for (let i = 0; i < 9; i++) s += fir(b.x0 + 10 + i * (W / 8.5) + r() * 6, 168 + r() * 6, 40 + r() * 26, '#18224A', tL, 10 + i);
    for (const [x, hh] of [[16, 130], [196, 160], [228, 110]] as Pt[]) s += fir(x, 196, hh, '#101838', tL, 30 + x);
    s += facets([[b.x0, 186], [40, 178], [90, 182], [150, 176], [200, 184], [b.x1, 180], [b.x1, b.y1], [b.x0, b.y1]], '#8C9CCC', { dir: [-0.5, -0.7, 0.6], color: '#EAF0FF', shade: '#1A2350' }, { size: 18, relief: 0.35, seed: 4, base2: '#1A2248' });
    for (let i = 0; i < 24; i++) s += `<circle cx="${(b.x0 + r() * W).toFixed(1)}" cy="${(b.y0 + r() * 230).toFixed(1)}" r="${(0.7 + r()).toFixed(1)}" fill="#FFFFFF" opacity="0.7"/>`;
    return s;
  }
  if (st === 1) {
    // Lac gelé sous les aurores.
    const k = colors(c.hue);
    s += facetSky(b.x0, b.y0, b.x1, b.y1, ['#040A1C', '#0A1C34', '#123048', '#1C4A60', '#081624'], 12, 24) + starsOf(50, 120);
    s += `<g opacity="0.5">${curtain([[b.x0 - 10, 70], [40, 56], [100, 66], [160, 48], [b.x1 + 10, 58]], 50, k, 13)}</g>`;
    const mL: Light = { dir: [-0.3, -0.8, 0.5], color: '#B8E8F0', shade: '#06101E' };
    s += facets([[b.x0, 130], [20, 104], [56, 122], [96, 92], [140, 120], [180, 98], [b.x1, 118], [b.x1, 150], [b.x0, 150]], '#2C4A66', mL, { size: 16, relief: 0.6, seed: 14 });
    for (let i = 0; i < 16; i++) s += fir(b.x0 + 4 + i * (W / 15) + r() * 4, 150, 12 + r() * 12, '#0C1A2C', mL, 40 + i);
    s += facets([[b.x0, 148], [b.x1, 148], [b.x1, b.y1], [b.x0, b.y1]], '#22485A', { dir: [0, -0.9, 0.5], color: '#8FD8D0', shade: '#061424' }, { size: 22, relief: 0.15, seed: 15, base2: '#071420', jitter: 0.2 });
    s += `<path d="M${b.x0} 148 H${b.x1}" stroke="#C8FFF0" stroke-width="0.8" opacity="0.6"/>`;
    return s;
  }
  // Sommet au-dessus d'une mer de nuages, à l'aube.
  s += facetSky(b.x0, b.y0, b.x1, b.y1, ['#120C2E', '#33285E', '#7A4A86', '#E89A78', '#FFD7A0', '#6A4A80'], 16, 24) + starsOf(30, 90);
  s += `<circle cx="160" cy="168" r="50" fill="#FFC88A" opacity="0.25"/>` + gem(160, 168, 18, '#FFF3D6', '#FFC37A');
  const pL: Light = { dir: [0.6, -0.4, 0.5], color: '#FFC8A8', shade: '#2A1C48' };
  s += facets([[b.x0, 170], [20, 140], [50, 160], [80, 128], [116, 158], [150, 150], [b.x1, 166], [b.x1, 180], [b.x0, 180]], '#6A5088', pL, { size: 16, relief: 0.6, seed: 17 });
  for (let row = 0; row < 3; row++) {
    const y = 176 + row * 22, q: Pt[] = [];
    for (let x = b.x0 - 10; x <= b.x1 + 20; x += 22 + row * 6) { q.push([x, y + 8]); q.push([x + 11 + row * 3, y - 8 - r() * 6]); }
    q.push([b.x1 + 20, b.y1], [b.x0 - 10, b.y1]);
    s += facets(q, ['#C8A8D8', '#9A7CB8', '#6A5490'][row], { dir: [0.6, -0.6, 0.5], color: '#FFE3C8', shade: '#2A1C48' }, { size: 18, relief: 0.5, seed: 18 + row });
  }
  return s;
};

export const lynxaure: Species = Object.assign(draw, { scene });
