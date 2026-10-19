import type { Bounds, DrawCtx, Species } from './style.ts';
import { curve, ellipse, facetSky, facets, gem, hsl, limb, mix, prng, type Light, type Pt } from './lowpoly.ts';

/**
 * Griffastre (low-poly) : griffon céleste de profil sur un pic à l'aube, avant d'aigle et arrière de lion, une serre
 * levée, ailes dressées « adossées » ; les rémiges secondaires sont des fenêtres sur le ciel étoilé.
 */

/** Polygone depuis un tracé SVG absolu simple (M, L, C, Q, Z). */
function poly(d: string, step = 5): Pt[] {
  const t = d.match(/[MLCQZ]|-?\d*\.?\d+/g) ?? [];
  let i = 0, cmd = 'M';
  const num = () => +t[i++];
  let start: Pt = [0, 0];
  const segs: [Pt, Pt, Pt][] = [];
  let cur: Pt = [0, 0];
  while (i < t.length) {
    if (/[MLCQZ]/.test(t[i])) cmd = t[i++];
    if (cmd === 'Z') continue;
    if (cmd === 'M') { start = cur = [num(), num()]; cmd = 'L'; continue; }
    if (cmd === 'L') { const p: Pt = [num(), num()]; segs.push([cur, p, p]); cur = p; }
    else if (cmd === 'C') { const c1: Pt = [num(), num()], c2: Pt = [num(), num()], p: Pt = [num(), num()]; segs.push([c1, c2, p]); cur = p; }
    else if (cmd === 'Q') {
      const q: Pt = [num(), num()], p: Pt = [num(), num()];
      segs.push([[cur[0] + (q[0] - cur[0]) * 2 / 3, cur[1] + (q[1] - cur[1]) * 2 / 3], [p[0] + (q[0] - p[0]) * 2 / 3, p[1] + (q[1] - p[1]) * 2 / 3], p]);
      cur = p;
    }
  }
  return curve(start, segs, step);
}
/** Plume en feuille effilée de `a` à `b`. */
function feather(a: Pt, b: Pt, w: number, bend = 0): Pt[] {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
  const side = (sg: number) => [0.15, 0.35, 0.55, 0.75, 0.9].map((k) => {
    const o = sg * w * Math.sin(Math.PI * Math.pow(k, 0.8)) * (sg > 0 ? 1 : 0.8) + bend * l * 0.12 * Math.sin(Math.PI * k);
    return [a[0] + dx * k + nx * o, a[1] + dy * k + ny * o] as Pt;
  });
  return [a, ...side(1), b, ...side(-1).reverse()];
}
const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const flat = (p: Pt[], fill: string, op = 1) => `<path d="M${p.map((q) => `${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join('L')}Z" fill="${fill}"${op < 1 ? ` opacity="${op}"` : ''}/>`;

const draw = (c: DrawCtx): string => {
  const h = c.hue;
  const base = hsl(h, 34, 46), deep = hsl(h + 10, 40, 24), pale = hsl(h - 10, 30, 70), beak = '#EADBC0', gold = '#E9C25B';
  const light: Light = { dir: [-0.55, -0.6, 0.6], color: '#FFE3B8', shade: '#120A2E', rim: '#F7B2D0' };
  const far: Light = { ...light, color: mix('#FFE3B8', deep, 0.45), rim: undefined };
  const r = prng(5 + c.stage);
  let s = '';

  // Aile : rémiges (le long poignet→main), secondaires (coude→poignet), couvertures.
  const wing = (S: Pt, E: Pt, W: Pt, H: Pt, prim: Pt[], sec: Pt[], cov: string, near: boolean, seed: number) => {
    let o = '';
    sec.forEach((tip, i) => {
      const fe = feather(lerp(W, E, (i / (sec.length - 1)) * 0.85 + 0.05), tip, near ? 7.5 : 5, 0.2);
      o += facets(fe, near ? hsl(h + 30, 45, 20) : mix(deep, '#000', 0.3), far, { size: 8, relief: 0.4, seed: seed + i });
      if (near) for (let k = 0; k < 2; k++) { const q = lerp(lerp(W, E, (i / (sec.length - 1)) * 0.85 + 0.05), tip, 0.5 + k * 0.25); o += `<circle cx="${(q[0] + (r() - 0.5) * 3).toFixed(1)}" cy="${(q[1] + (r() - 0.5) * 3).toFixed(1)}" r="${(0.6 + r() * 0.6).toFixed(1)}" fill="#FFF6D8"/>`; }
    });
    prim.forEach((tip, i) => {
      const fe = feather(lerp(W, H, i / (prim.length - 1)), tip, 4.2, -0.15);
      o += facets(fe, near ? (i % 2 ? base : pale) : deep, near ? light : far, { size: 8, relief: 0.5, seed: seed + 20 + i });
      if (near) o += gem(tip[0], tip[1], 2.2, '#FFFFFF', gold);
    });
    o += facets(poly(cov), near ? base : deep, near ? light : far, { size: 11.2, relief: 0.9, seed: seed + 40, base2: near ? mix(base, deep, 0.3) : undefined });
    return o;
  };

  // Aile lointaine.
  s += wing([100, 100], [102, 68], [112, 42], [124, 30], [[104, 8], [114, 4], [126, 4], [138, 8], [148, 14]], [[146, 50], [146, 64], [142, 78]],
    'M100 100 C98 88 98 76 102 68 C106 58 108 50 112 42 C116 36 120 32 124 30 C132 34 134 42 130 52 C124 66 116 84 110 100 Z', false, 10);
  // Queue de lion, pompon.
  s += facets(limb([[194, 134], [208, 144], [214, 162], [210, 180], [198, 192]], [7, 6, 5, 4, 3]), base, light, { size: 6.4, relief: 0.6, seed: 60 });
  s += facets(ellipse(193, 196, 7, 6, 9), deep, far, { size: 5.6, seed: 61 }) + gem(190, 198, 3, '#FFFFFF', gold);
  // Pattes lointaines.
  s += facets(poly('M142 140 C142 154 148 164 158 170 C162 176 164 186 162 196 C160 200 156 202 154 204 C156 208 166 208 172 207 C174 202 170 198 170 194 C172 184 172 174 170 166 C166 156 162 146 160 136 Z'), deep, far, { size: 8, relief: 0.6, seed: 62 });
  s += facets(poly('M88 146 C86 160 90 172 94 180 L106 180 C108 170 108 158 106 146 Z'), deep, far, { size: 8, relief: 0.6, seed: 63 });
  s += facets(limb([[100, 178], [99, 199]], [9, 7]), mix(deep, beak, 0.25), far, { size: 5.6, relief: 0.4, seed: 64 });
  for (const [a, bb] of [[[97, 198], [82, 205]], [[99, 199], [90, 207]], [[102, 198], [110, 205]]] as [Pt, Pt][]) {
    s += facets(limb([a, bb], [4.5, 2.5]), mix(deep, beak, 0.25), far, { size: 4.8, seed: 65 });
    s += flat([bb, [bb[0] + (bb[0] < a[0] ? -3.5 : 3.5), bb[1] + 3.5], [bb[0], bb[1] + 2]], '#0B0618');
  }
  // Corps de lion.
  s += facets(poly('M60 122 C56 138 64 150 80 153 C100 156 122 156 140 150 C150 147 156 144 162 142 C176 146 190 144 194 134 C198 122 190 110 176 106 C158 102 136 106 116 102 C104 98 94 88 88 74 L56 74 C54 90 56 106 60 122 Z'), base, light, { size: 14.4, relief: 1.3, seed: 66, base2: mix(base, deep, 0.5) });
  // Patte arrière proche.
  s += facets(poly('M158 118 C176 108 196 120 194 140 C193 152 190 160 192 168 C194 178 190 190 188 198 C192 200 195 204 192 208 L174 208 C170 206 172 202 177 200 C179 192 179 184 177 178 C170 172 162 166 158 158 C150 146 148 128 158 118 Z'), base, light, { size: 11.2, relief: 1.1, seed: 67, base2: mix(base, deep, 0.35) });
  // Constellation dorée sur la cuisse.
  const cst: Pt[] = [[160, 124], [172, 120], [182, 130], [176, 142], [164, 140]];
  s += `<polyline points="${cst.map((p) => p.join(',')).join(' ')}" fill="none" stroke="${gold}" stroke-width="0.7" opacity="0.85"/>` + cst.map(([x, y]) => gem(x, y, 2.6, '#FFFFFF', gold)).join('');
  // Cou et poitrail emplumés.
  s += facets(poly('M50 66 C48 86 52 108 60 122 C66 136 80 142 92 138 C100 130 104 116 100 100 C96 90 90 80 86 66 C78 56 60 56 50 66 Z'), pale, light, { size: 9.6, relief: 1.1, seed: 68, base2: mix(pale, base, 0.4) });
  for (let i = 0; i < 6; i++) { const t = i / 5, x = 92 + t * 9, y = 86 + t * 50; s += facets(feather([x - 7, y - 3], [x + 6, y + 3], 2.4, 0.3), pale, light, { size: 4.8, relief: 0.3, seed: 70 + i }); }
  // Aile proche.
  s += wing([112, 102], [126, 70], [148, 46], [168, 32], [[170, 2], [184, 3], [197, 9], [207, 19], [214, 31], [216, 44], [214, 57]], [[208, 70], [202, 82], [192, 92], [180, 100], [166, 106], [152, 110]],
    'M112 102 C114 88 118 78 126 70 C134 60 140 52 148 46 C154 40 160 35 168 32 C172 34 174 38 170 44 C162 52 152 60 144 70 C136 80 128 94 122 106 Z', true, 80);
  for (let i = 0; i < 8; i++) { const t = i / 7, a: Pt = [170 - t * 48, 44 + t * 60]; s += facets(feather(a, [a[0] + 11 + (1 - t) * 4, a[1] + 8 - t * 2], 3.4, 0.2), i % 2 ? pale : base, light, { size: 5.6, relief: 0.3, seed: 130 + i }); }
  const wc: Pt[] = [[160, 96], [174, 90], [186, 80], [196, 70]];
  s += `<polyline points="${wc.map((p) => p.join(',')).join(' ')}" fill="none" stroke="${gold}" stroke-width="0.7" opacity="0.85"/>` + wc.map(([x, y]) => gem(x, y, 2.6, '#FFFFFF', gold)).join('');
  // Tête d'aigle : plumes de nuque, crâne, bec crochu, cire, œil.
  for (const [a, bb] of [[[78, 44], [102, 40]], [[82, 52], [106, 52]], [[84, 60], [104, 64]]] as [Pt, Pt][]) s += facets(feather(a, bb, 3, 0.3), pale, light, { size: 4.8, relief: 0.4, seed: 140 + a[1] });
  s += facets(poly('M86 66 C88 52 80 40 66 38 C56 37 48 42 44 50 C40 52 36 54 33 57 C38 60 44 64 48 70 C52 74 62 76 72 74 C80 72 84 70 86 66 Z'), pale, light, { size: 8, relief: 1, seed: 150 });
  s += facets(poly('M48 50 C41 50 35 53 31 58 C28 63 28 69 30 74 C31 70 34 67 37 66 C41 65 45 65 49 63 Z'), beak, light, { size: 5.6, relief: 0.8, seed: 151 });
  s += facets(poly('M37 67 C41 69 45 69 49 66 C46 71 42 72 38 71 Z'), mix(beak, deep, 0.25), far, { size: 4.8, seed: 152 });
  s += facets(poly('M48 50 C46 54 46 60 49 64 C52 60 52 54 48 50 Z'), gold, light, { size: 4.8, seed: 153 });
  s += flat([[50, 49], [70, 50], [64, 53], [52, 52]], deep, 0.75);
  s += `<circle cx="58" cy="55" r="3.2" fill="#FFB86B"/><circle cx="58.5" cy="55.3" r="1.8" fill="#0B0618"/><circle cx="57.2" cy="54" r="0.8" fill="#FFFFFF"/>`;
  // Diadème céleste.
  s += gem(56, 38, 2.6, '#FFFFFF', gold) + gem(68, 32, 3.6, '#FFFFFF', gold) + gem(80, 33, 2.6, '#FFFFFF', gold);
  // Patte avant proche, levée, serres repliées.
  s += facets(poly('M62 116 C56 126 56 140 62 148 C68 152 78 150 84 144 C88 134 86 122 80 116 Z'), pale, light, { size: 8, relief: 0.8, seed: 160 });
  s += facets(limb([[66, 146], [56, 156], [48, 164]], [8.8, 8, 7]), mix(beak, base, 0.3), light, { size: 5.6, relief: 0.5, seed: 161 });
  for (const pts of [[[48, 164], [38, 166], [33, 174]], [[48, 166], [44, 174], [45, 181]], [[50, 164], [56, 170], [55, 177]]] as Pt[][]) {
    s += facets(limb(pts, [4.6, 3.6, 2.6]), mix(beak, base, 0.3), light, { size: 4.8, seed: 162 + pts[2][0] });
    const e = pts[2], d0 = pts[1], dx = e[0] - d0[0], dy = e[1] - d0[1], l = Math.hypot(dx, dy), ux = dx / l, uy = dy / l;
    s += flat([[e[0] - uy * 1.8, e[1] + ux * 1.8], [e[0] + ux * 5, e[1] + uy * 5], [e[0] + ux * 3 - uy * 4, e[1] + uy * 3 + ux * 4], [e[0] + uy * 1.8, e[1] - ux * 1.8]], '#0B0618');
  }
  return `<g transform="translate(116 206) scale(1.02) translate(-116 -206)">${s}</g>`;
};

/** Décor : pic au-dessus d'une mer de nuages à l'aube, planète annelée derrière la tête, sommets lointains, hirondelles. */
const scene = (c: DrawCtx, b: Bounds): string => {
  const r = prng(31 + c.stage);
  let s = facetSky(b.x0, b.y0, b.x1, b.y1, ['#140E36', '#2E2462', '#6A4A8E', '#D88A86', '#F2B98A', '#4A3060', '#1A1030'], 11, 32);
  for (let i = 0; i < 12; i++) s += gem(b.x0 + r() * (b.x1 - b.x0), b.y0 + r() * 70, 1.2 + r() * 2, '#FFFFFF', '#BFD7FF');
  // Planète annelée qui se lève derrière la tête.
  const pl: Light = { dir: [0.4, -0.5, 0.7], color: '#FFF0D8', shade: '#6A4A7A' };
  s += `<circle cx="70" cy="58" r="52" fill="#FFE3B8" opacity="0.12"/>`;
  const ring = (back: boolean) => {
    const pts: Pt[] = [];
    for (let i = 0; i <= 16; i++) { const a = (back ? Math.PI : 0) + (i / 16) * Math.PI; pts.push([70 + Math.cos(a) * 76, 58 + Math.sin(a) * 15]); }
    for (let i = 16; i >= 0; i--) { const a = (back ? Math.PI : 0) + (i / 16) * Math.PI; pts.push([70 + Math.cos(a) * 64, 58 + Math.sin(a) * 11]); }
    return `<g transform="rotate(-14 70 58)">${facets(pts, '#F2DDBA', pl, { size: 9.6, relief: 0.2, seed: back ? 3 : 4, opacity: 0.7 })}</g>`;
  };
  s += ring(true) + facets(ellipse(70, 58, 40, 40, 22), '#E8C9A8', pl, { size: 16, relief: 1.2, seed: 5, base2: '#C89A90' }) + ring(false);
  // Sommets lointains, pâles.
  const mtn: Light = { dir: [-0.6, -0.5, 0.5], color: '#E7C2D8', shade: '#3A2A60' };
  s += facets([[b.x0, 176], [14, 156], [26, 164], [44, 138], [58, 154], [70, 146], [86, 170], [120, 172], [134, 150], [146, 160], [160, 144], [176, 168], [b.x1, 166], [b.x1, 200], [b.x0, 200]], '#7A6AA6', mtn, { size: 25.6, relief: 0.6, seed: 21 });
  // Mer de nuages : bancs bombés, plus clairs devant.
  const cloud = (y: number, col: string, seed: number) => {
    const pts: Pt[] = [[b.x0, b.y1]];
    let x = b.x0, k = 0;
    while (x < b.x1 + 12) {
      const w = 18 + (k % 3) * 6, hh = 5 + (k % 2) * 3;
      for (let j = 0; j <= 4; j++) { const a = Math.PI * (1 - j / 4); pts.push([x + w / 2 + Math.cos(a) * w / 2, y + 2 - Math.sin(a) * hh]); }
      x += w; k++;
    }
    pts.push([b.x1, b.y1]);
    return facets(pts, col, { dir: [-0.5, -0.7, 0.5], color: '#FFE8D6', shade: '#5A4A80' }, { size: 22.4, relief: 0.4, seed });
  };
  s += cloud(174, '#B9A6CC', 31) + cloud(188, '#D8BCCB', 32) + cloud(202, '#EFD2CC', 33);
  // Hirondelles.
  for (const [x, y, k] of [[20, 100, 1], [34, 108, 0.8], [14, 114, 0.7], [150, 130, 0.7]] as const)
    s += `<path d="M${x - 5 * k} ${y - 2 * k} L${x} ${y + k} L${x + 5 * k} ${y - 3 * k} L${x} ${y - 0.5 * k} Z" fill="#2A1E44"/>`;
  // Corniche de roche.
  const rock: Light = { dir: [-0.6, -0.6, 0.5], color: '#FFD9B0', shade: '#0E0820' };
  s += facets([[62, 205], [90, 201], [140, 201], [b.x1, 202], [b.x1, b.y1], [80, b.y1], [70, 236], [64, 220]], '#3E3060', rock, { size: 22.4, relief: 0.8, seed: 41, base2: '#1A1030' });
  s += facets([[62, 205], [90, 201], [140, 201], [b.x1, 202], [b.x1, 208], [140, 207], [90, 208], [64, 211]], '#A27E86', rock, { size: 12.8, relief: 0.3, seed: 42 });
  return s;
};

export const griffastre: Species = Object.assign(draw, { scene });
