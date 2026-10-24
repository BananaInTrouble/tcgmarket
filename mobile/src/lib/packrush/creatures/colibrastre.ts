import type { Bounds, DrawCtx, Species } from './style.ts';
import { curve, ellipse, facetSky, facets, gem, hsl, limb, mix, prng, type Light, type Pt } from './lowpoly.ts';

/**
 * Colibrastre (low-poly) : colibri-comète en vol stationnaire, le bec plongé dans une fleur de nébuleuse ; ses ailes
 * dressées vibrent en éventails translucides et sa queue s'étire en chevelure de comète. Jardin suspendu dans une
 * nébuleuse, la nuit.
 */

/** Polygone depuis un tracé SVG absolu simple (M, L, C, Z). */
function poly(d: string, step = 5): Pt[] {
  const t = d.match(/[MLCZ]|-?\d*\.?\d+/g) ?? [];
  let i = 0, cmd = 'M', start: Pt = [0, 0], cur: Pt = [0, 0];
  const segs: [Pt, Pt, Pt][] = [];
  const num = () => +t[i++];
  while (i < t.length) {
    if (/[MLCZ]/.test(t[i])) cmd = t[i++];
    if (cmd === 'Z') continue;
    if (cmd === 'M') { start = cur = [num(), num()]; cmd = 'L'; continue; }
    if (cmd === 'L') { const p: Pt = [num(), num()]; segs.push([cur, p, p]); cur = p; }
    else { const c1: Pt = [num(), num()], c2: Pt = [num(), num()], p: Pt = [num(), num()]; segs.push([c1, c2, p]); cur = p; }
  }
  return curve(start, segs, step);
}
/** Plume / pétale en feuille effilée de `a` à `b`. */
function feather(a: Pt, b: Pt, w: number, bend = 0): Pt[] {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
  const side = (sg: number) => [0.15, 0.35, 0.55, 0.75, 0.9].map((k) => {
    const o = sg * w * Math.sin(Math.PI * Math.pow(k, 0.8)) + bend * l * 0.12 * Math.sin(Math.PI * k);
    return [a[0] + dx * k + nx * o, a[1] + dy * k + ny * o] as Pt;
  });
  return [a, ...side(1), b, ...side(-1).reverse()];
}
const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const flat = (p: Pt[], fill: string, op = 1) => `<path d="M${p.map((q) => `${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join('L')}Z" fill="${fill}"${op < 1 ? ` opacity="${op}"` : ''}/>`;

/** Centre de la fleur (là où plonge le bec). */
const FL: Pt = [58, 104];

const draw = (c: DrawCtx): string => {
  const h = c.hue;
  const back = hsl(h, 52, 40), backD = hsl(h + 20, 50, 20), belly = hsl(h - 10, 28, 82), gorget = hsl(h + 135, 72, 56), gold = '#E9C25B';
  const petal = hsl(h + 105, 48, 56), petal2 = hsl(h + 140, 55, 66), leaf = hsl(h - 30, 40, 26);
  const light: Light = { dir: [-0.5, -0.65, 0.6], color: '#E8FFF8', shade: '#06102A', rim: hsl(h + 135, 85, 78) };
  const far: Light = { ...light, color: mix('#E8FFF8', backD, 0.5), rim: undefined };
  const glass: Light = { dir: [-0.4, -0.7, 0.6], color: '#FFFFFF', shade: hsl(h + 20, 50, 18), rim: '#BFF6FF' };
  const r = prng(9 + c.stage);
  let s = '';

  // Fleur de nébuleuse : tige, feuilles, corolle en trompette ouverte vers le colibri, cœur incandescent.
  s += facets(limb([[8, 236], [16, 206], [26, 176], [38, 146], [50, 120]], [7, 7, 6.5, 6, 9]), leaf, far, { size: 7, relief: 0.6, seed: 1 });
  s += facets(feather([20, 196], [-6, 160], 9, 0.4), mix(leaf, '#2A6A5A', 0.4), light, { size: 7, relief: 0.4, seed: 2 });
  s += facets(feather([30, 170], [70, 156], 8, -0.4), mix(leaf, '#2A6A5A', 0.5), light, { size: 7, relief: 0.4, seed: 3 });
  s += `<circle cx="${FL[0]}" cy="${FL[1]}" r="34" fill="${petal2}" opacity="0.16"/><circle cx="${FL[0]}" cy="${FL[1]}" r="22" fill="#FFE8F6" opacity="0.18"/>`;
  // Pétales arrière (plus sombres), puis tube, puis pétales avant.
  for (const [tip, w, seed] of [[[30, 70], 11, 4], [[58, 62], 12, 5], [[86, 74], 11, 6]] as [Pt, number, number][]) {
    s += facets(feather([50, 116], tip, w, 0.3), mix(petal, '#1A0B30', 0.35), far, { size: 6.5, relief: 0.4, seed, base2: mix(petal2, '#1A0B30', 0.2) });
  }
  s += facets(poly('M44 128 C40 120 40 112 44 104 C50 98 62 98 70 102 C66 110 60 120 54 130 C50 132 46 132 44 128 Z', 4), mix(petal, '#1A0B30', 0.2), light, { size: 5.5, relief: 0.8, seed: 7 });
  s += `<ellipse cx="${FL[0] + 2}" cy="${FL[1] - 3}" rx="13" ry="9" fill="#FFF3FB" opacity="0.55" filter="url(#b2)"/>`;
  for (const [tip, w, seed] of [[[18, 92], 10, 8], [[24, 120], 9, 9], [[92, 96], 10, 10], [[80, 124], 9, 11]] as [Pt, number, number][]) {
    s += facets(feather([54, 112], tip, w, -0.3), petal, light, { size: 6.5, relief: 0.5, seed, base2: petal2 });
    s += gem(tip[0], tip[1], 2.2, '#FFFFFF', petal2);
  }
  // Étamines-étoiles.
  for (const [x, y] of [[72, 88], [66, 82], [76, 98]] as const) {
    s += `<path d="M${FL[0] + 2} ${FL[1] - 2} Q${(x + FL[0]) / 2 - 2} ${(y + FL[1]) / 2 - 4} ${x} ${y}" fill="none" stroke="#FFE9B0" stroke-width="0.8" opacity="0.9"/>` + gem(x, y, 2.4, '#FFFFFF', gold);
  }

  // Chevelure de comète : la queue s'étire en traîne lumineuse vers le bas.
  s += `<path d="M178 146 C196 168 214 196 232 244 L150 244 C160 206 168 176 172 150 Z" fill="${hsl(h, 80, 70)}" opacity="0.14" filter="url(#b4)"/>`;
  for (const [tip, w, op, col, seed] of [[[140, 238], 9, 0.28, hsl(h + 30, 55, 55), 12], [[226, 222], 9, 0.28, hsl(h + 120, 50, 60), 13], [[164, 244], 12, 0.36, hsl(h - 5, 60, 62), 14], [[208, 240], 12, 0.36, hsl(h + 20, 55, 64), 15], [[186, 246], 10, 0.55, '#DFFBFF', 16]] as [Pt, number, number, string, number][]) {
    s += facets(feather([178, 150], tip, w, 0.25), col, glass, { size: 8, relief: 0.3, seed, opacity: op, base2: mix(col, '#0A1430', 0.5) });
  }
  for (const [x, y] of [[150, 236], [196, 238], [218, 228], [172, 240]] as const) s += `<path d="M178 152 Q${(178 + x) / 2 + 6} ${(152 + y) / 2} ${x} ${y}" fill="none" stroke="#DFFBFF" stroke-width="0.6" opacity="0.45"/>`;
  for (let i = 0; i < 16; i++) {
    const t = r(), x = 174 + t * 30 + (r() - 0.5) * 30 * t, y = 156 + t * 78;
    s += gem(x, y, 1 + r() * 2.6 * (1 - t * 0.5), '#FFFFFF', hsl(h, 80, 80));
  }
  // Rectrices en fourche.
  for (const [tip, w, col] of [[[198, 188], 5, backD], [[186, 194], 5.5, back], [[174, 190], 4.5, back]] as [Pt, number, string][]) {
    s += facets(feather([176, 148], tip, w, 0.2), col, light, { size: 6, relief: 0.5, seed: 14 + tip[0] });
    s += gem(tip[0], tip[1], 2.4, '#FFFFFF', '#BFF6FF');
  }

  // Aile lointaine (derrière, en éventail sombre).
  const wing = (S: Pt, W: Pt, tips: Pt[], cols: string[], L: Light, op: number, seed: number) => {
    let o = '';
    tips.forEach((tip, i) => {
      const a = lerp(S, W, 0.25 + (i / (tips.length - 1)) * 0.75);
      o += facets(feather(a, tip, 5.2 + (i === tips.length - 1 ? 0 : 0.8), -0.15), cols[i % cols.length], L, { size: 7, relief: 0.35, seed: seed + i, opacity: op });
    });
    return o;
  };
  s += wing([128, 86], [140, 58], [[122, 4], [136, 0], [150, 0], [162, 4]], [mix(backD, '#000', 0.2), backD], far, 0.9, 20);
  // Arcs de vibration des ailes.
  for (const [rr, op] of [[86, 0.35], [96, 0.22]] as const) s += `<path d="M${(140 - rr * 0.1).toFixed(1)} ${(90 - rr).toFixed(1)} A${rr} ${rr} 0 0 1 ${(140 + rr * 0.86).toFixed(1)} ${(90 - rr * 0.5).toFixed(1)}" fill="none" stroke="#DFFBFF" stroke-width="0.8" opacity="${op}"/>`;

  // Corps : tête en haut à gauche, dos qui file vers la queue.
  const body = poly('M98 72 C98 60 108 54 118 56 C128 58 134 66 136 76 C150 86 166 104 176 124 C181 134 184 142 182 150 C174 152 166 148 158 144 C140 136 124 124 112 110 C104 100 98 88 98 72 Z');
  s += facets(body, back, light, { size: 8.5, relief: 1.3, seed: 30, base2: mix(back, backD, 0.5) });
  // Ventre pâle.
  s += facets(poly('M104 94 C110 106 124 120 140 130 C152 138 164 144 176 148 C164 140 156 130 148 122 C138 112 126 104 114 96 C110 94 106 92 104 94 Z', 4), belly, light, { size: 6.5, relief: 0.6, seed: 31, base2: mix(belly, back, 0.4) });
  // Gorgerin iridescent.
  s += facets(poly('M99 76 C100 88 106 100 116 106 C118 100 118 92 116 84 C112 82 106 80 99 76 Z', 3), gorget, light, { size: 4.5, relief: 0.6, seed: 32, base2: hsl(h + 165, 70, 52) });
  for (let i = 0; i < 6; i++) s += `<circle cx="${(104 + r() * 10).toFixed(1)}" cy="${(84 + r() * 16).toFixed(1)}" r="${(0.5 + r() * 0.6).toFixed(1)}" fill="#FFE8F6" opacity="0.9"/>`;
  // Constellation d'or sur le dos.
  const cst: Pt[] = [[134, 92], [146, 100], [156, 112], [164, 124]];
  s += `<polyline points="${cst.map((p) => p.join(',')).join(' ')}" fill="none" stroke="${gold}" stroke-width="0.7" opacity="0.85"/>` + cst.map(([x, y]) => gem(x, y, 2.4, '#FFFFFF', gold)).join('');

  // Aile proche : éventail de rémiges translucides dressé vers le ciel, couvertures nacrées.
  s += wing([140, 94], [160, 66], [[208, 46], [212, 30], [206, 16], [194, 6], [180, 2], [166, 4]], [hsl(h, 38, 66), hsl(h - 15, 45, 76), hsl(h + 15, 35, 58)], glass, 0.82, 40);
  s += facets(poly('M138 96 C140 84 148 72 160 64 C170 60 180 62 186 66 C180 76 170 86 158 94 C150 98 144 100 138 96 Z', 4), mix(back, belly, 0.25), light, { size: 6.5, relief: 0.7, seed: 50 });
  for (let i = 0; i < 5; i++) { const q = lerp([146, 92], [180, 66], i / 4); s += facets(feather(q, [q[0] + 10, q[1] - 6], 2.8, 0.2), i % 2 ? belly : mix(belly, back, 0.4), light, { size: 4.5, relief: 0.3, seed: 52 + i }); }

  // Tête : calotte, bec en aiguille plongé dans la fleur, œil.
  s += facets(poly('M100 64 C104 56 114 52 124 56 C130 60 132 66 130 70 C122 66 112 64 100 68 Z', 3), mix(back, '#BFF6FF', 0.25), light, { size: 4.5, relief: 0.6, seed: 60 });
  s += facets([[101, 73], [66, 97], [64, 99.5], [100, 79]], '#2A2440', light, { size: 4, relief: 0.2, seed: 61 });
  s += flat([[100, 73.5], [70, 94], [100, 75.5]], '#8A86A8', 0.8);
  s += `<circle cx="110" cy="70" r="3.4" fill="#0B0618"/><circle cx="110.4" cy="70.4" r="2.2" fill="${hsl(h + 40, 85, 60)}"/><circle cx="110.4" cy="70.4" r="1.2" fill="#0B0618"/><circle cx="109.2" cy="69" r="0.9" fill="#FFFFFF"/>`;
  s += flat([[114, 72], [124, 74], [116, 74.5]], '#FFFFFF', 0.7);
  // Diadème d'étoiles.
  s += gem(112, 54, 2.4, '#FFFFFF', gold) + gem(122, 52, 3.2, '#FFFFFF', gold);
  return s;
};

/** Décor : jardin suspendu au cœur d'une nébuleuse, nuages roses et turquoise, fleurs-lanternes, frondes, pollen d'étoiles. */
const scene = (c: DrawCtx, b: Bounds): string => {
  const h = c.hue;
  const r = prng(41 + c.stage);
  let s = facetSky(b.x0, b.y0, b.x1, b.y1, ['#07142A', '#0C2440', '#183A5C', '#2A2E62', '#1C1A44', '#0A0A20'], 23, 28);
  // Voiles de nébuleuse.
  for (const [x, y, rx, ry, hh, op] of [[170, 60, 80, 46, h + 130, 0.32], [40, 150, 70, 40, h, 0.28], [130, 130, 60, 30, h + 70, 0.2], [200, 190, 50, 30, h + 150, 0.2]] as const) {
    s += `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${hsl(hh, 70, 55)}" opacity="${op}" filter="url(#soft)"/>`;
  }
  const neb: Light = { dir: [-0.4, -0.7, 0.6], color: '#FFE8F6', shade: '#0A0A28' };
  s += facets(ellipse(186, 52, 52, 26, 16, -0.4), hsl(h + 130, 40, 40), neb, { size: 18, relief: 0.4, seed: 3, opacity: 0.35 });
  s += facets(ellipse(30, 160, 46, 22, 14, 0.3), hsl(h, 45, 36), neb, { size: 18, relief: 0.4, seed: 4, opacity: 0.3 });
  for (let i = 0; i < 40; i++) s += `<circle cx="${(b.x0 + r() * (b.x1 - b.x0)).toFixed(1)}" cy="${(b.y0 + r() * 220).toFixed(1)}" r="${(0.4 + r() * 1.1).toFixed(2)}" fill="#FFF6D8" opacity="${(0.4 + r() * 0.6).toFixed(2)}"/>`;
  for (let i = 0; i < 10; i++) s += gem(b.x0 + r() * (b.x1 - b.x0), b.y0 + r() * 200, 1.4 + r() * 2.4, '#FFFFFF', '#BFF6FF');
  // Fleurs-lanternes lointaines suspendues à des lianes.
  const vine: Light = { dir: [-0.5, -0.6, 0.6], color: '#9FE0D0', shade: '#020A14' };
  for (const [x, len, k, hh] of [[200, 120, 0.9, h + 105], [214, 70, 0.6, h + 40], [92, 40, 0.55, h + 140]] as const) {
    s += `<path d="M${x} ${b.y0} Q${x - 10} ${b.y0 + len / 2} ${x - 4} ${b.y0 + len}" fill="none" stroke="#1E4A4A" stroke-width="${2 * k}" opacity="0.8"/>`;
    const cx = x - 4, cy = b.y0 + len + 8 * k;
    s += `<circle cx="${cx}" cy="${cy}" r="${14 * k}" fill="${hsl(hh, 80, 70)}" opacity="0.25"/>`;
    s += facets([[cx - 8 * k, cy - 6 * k], [cx + 8 * k, cy - 6 * k], [cx + 5 * k, cy + 8 * k], [cx, cy + 12 * k], [cx - 5 * k, cy + 8 * k]], hsl(hh, 50, 58), vine, { size: 5, relief: 0.6, seed: x });
    s += gem(cx, cy + 12 * k, 2.4 * k + 1, '#FFFFFF', hsl(hh, 80, 80));
  }
  // Frondes et feuillage au premier plan (bas de la carte).
  const fern: Light = { dir: [-0.5, -0.7, 0.5], color: '#7FD6C0', shade: '#020810' };
  for (const [x, y, tx, ty, w, col, seed] of [[b.x0, 260, 70, 214, 22, '#123A3A', 61], [b.x1, 250, 150, 222, 24, '#10303A', 62], [60, b.y1, 110, 236, 26, '#0E2A30', 63], [180, b.y1, 210, 230, 22, '#14383C', 64], [b.x0 + 20, b.y1, -6, 226, 20, '#102A34', 65]] as const) {
    s += facets(feather([x, y], [tx, ty], w, 0.4), col, fern, { size: 12, relief: 0.5, seed });
  }
  s += facets([[b.x0, 250], [60, 244], [120, 252], [180, 246], [b.x1, 250], [b.x1, b.y1], [b.x0, b.y1]], '#0A1E26', fern, { size: 24, relief: 0.4, seed: 66, base2: '#050A12' });
  // Pollen d'étoiles autour de la fleur.
  for (let i = 0; i < 14; i++) { const a = r() * Math.PI * 2, d = 30 + r() * 50; s += `<circle cx="${(FL[0] + Math.cos(a) * d).toFixed(1)}" cy="${(FL[1] + Math.sin(a) * d * 0.8).toFixed(1)}" r="${(0.6 + r() * 1).toFixed(1)}" fill="#FFE9B0" opacity="${(0.5 + r() * 0.5).toFixed(2)}"/>`; }
  return s;
};

export const colibrastre: Species = Object.assign(draw, { scene });
