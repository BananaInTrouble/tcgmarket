import type { Bounds, DrawCtx, Species } from './style.ts';
import { curve, ellipse, facetSky, facets, gem, hsl, limb, mix, prng, type Light, type Pt } from './lowpoly.ts';

/** Tracé SVG simple (M, L, C absolus, Z) → polygone échantillonné. */
function pathPts(d: string, step = 6): Pt[] {
  const t = d.match(/[MLCZ]|-?\d*\.?\d+/g) ?? [];
  let i = 0, cmd = '', start: Pt = [0, 0], cur: Pt = [0, 0];
  const segs: [Pt, Pt, Pt][] = [];
  const num = () => +t[i++];
  while (i < t.length) {
    if (/[MLCZ]/.test(t[i])) cmd = t[i++];
    if (cmd === 'M') { start = cur = [num(), num()]; cmd = 'L'; continue; }
    if (cmd === 'Z') break;
    if (cmd === 'L') { const p: Pt = [num(), num()]; segs.push([cur, p, p]); cur = p; }
    else if (cmd === 'C') { const a: Pt = [num(), num()], b: Pt = [num(), num()], p: Pt = [num(), num()]; segs.push([a, b, p]); cur = p; }
  }
  return curve(start, segs, step);
}

/** Bras spiral d'une galaxie inclinée. */
function arm(cx: number, cy: number, r0: number, r1: number, t0: number, turns: number, k: number, rot: number, n = 12): Pt[] {
  const pts: Pt[] = [], cr = Math.cos((rot * Math.PI) / 180), sr = Math.sin((rot * Math.PI) / 180);
  for (let i = 0; i <= n; i++) {
    const u = i / n, t = t0 + u * turns * Math.PI * 2, r = r0 + (r1 - r0) * u;
    const x = Math.cos(t) * r, y = Math.sin(t) * r * k;
    pts.push([cx + x * cr - y * sr, cy + x * sr + y * cr]);
  }
  return pts;
}

const GOLD = '#E9C25B', CRYSTAL = '#BFF6FF', CREAM = '#FFF6D8';
/** Créature réduite pour laisser le bas de la carte au nom, et légèrement recentrée. */
const FIT = 'translate(111 -36) scale(0.9) translate(-111 36) translate(-12 4)';

/**
 * Aeonis (low-poly) : tortue-monde ancestrale qui nage dans le vide en portant un monde — montagnes enneigées,
 * forêts, cascades d'étoiles — et au sommet un arbre de lumière dont la couronne est une galaxie spirale.
 */
const draw = (c: DrawCtx): string => {
  const h = c.hue;
  const shellC = hsl(h, 38, 40), deep = hsl(h + 15, 42, 20), skin = hsl(h + 25, 28, 58), skinD = hsl(h + 30, 32, 34);
  // Lumière principale : l'arbre-galaxie au-dessus ; contour sarcelle du vide.
  const light: Light = { dir: [-0.1, -0.85, 0.55], color: '#FFF1C8', shade: '#06071C', rim: '#7CF5E0' };
  const far: Light = { ...light, color: mix('#FFF1C8', deep, 0.5), rim: undefined };
  const stoneL: Light = { dir: [-0.35, -0.8, 0.5], color: '#FFF4DA', shade: '#141433', rim: '#9FD8FF' };
  let s = '';

  // ---------- Couronne-galaxie (derrière tout) ----------
  const GX = 112, GY = -4;
  s += `<ellipse cx="${GX}" cy="${GY}" rx="96" ry="38" fill="#FFF1C8" opacity="0.08"/><ellipse cx="${GX}" cy="${GY}" rx="62" ry="24" fill="${CRYSTAL}" opacity="0.1" transform="rotate(-8 ${GX} ${GY})"/>`;
  for (let a = 0; a < 3; a++) {
    const pts = arm(GX, GY, 8, 86, (a * 2 * Math.PI) / 3, 0.85, 0.36, -8);
    s += facets(limb(pts, pts.map((_, i) => 10 - i * 0.65)), a === 1 ? '#F2D27A' : '#8FD8F0', { dir: [0, -0.5, 0.9], color: '#FFFFFF', shade: '#2A3570' }, { size: 10.8, relief: 0.4, seed: 3 + a, opacity: 0.75 });
    pts.forEach(([x, y], i) => { if (i % 4 === 3) s += gem(x, y, 2.5 + (i % 2), '#FFFFFF', GOLD); });
  }
  s += `<circle cx="${GX}" cy="${GY}" r="16" fill="#FFF1C8" opacity="0.3"/>` + gem(GX, GY, 12, '#FFFFFF', '#FFE2A0');

  // ---------- Nageoire antérieure lointaine (relevée) ----------
  s += facets(pathPts('M178 150 C186 132 198 112 214 94 C220 88 226 90 224 98 C214 118 200 140 190 160 Z'), skinD, far, { size: 10.8, relief: 0.7, seed: 6 });
  // Nageoire postérieure et queue.
  s += facets(pathPts('M46 170 C34 180 18 190 2 194 C-4 196 -4 190 2 187 C16 180 28 172 36 162 Z'), skin, light, { size: 9.6, relief: 0.6, seed: 7, base2: skinD });
  s += facets([[30, 168], [12, 172], [28, 176]], skin, light, { size: 4.8, seed: 8 });

  // ---------- Cou et tête (vieille tortue de mer, bec crochu) ----------
  s += facets(pathPts('M168 146 C180 140 188 138 194 140 C198 150 198 162 194 168 C186 172 178 174 170 174 Z'), skin, light, { size: 9.6, relief: 0.9, seed: 9, base2: skinD });
  const H = (x: number, y: number): Pt => [190 + x * 1.1 * Math.cos(-0.07) - y * 1.1 * Math.sin(-0.07), 152 + x * 1.1 * Math.sin(-0.07) + y * 1.1 * Math.cos(-0.07)];
  const head = pathPts('M0 -8 C6 -14 16 -17 26 -16 C34 -15 40 -10 41 -3 C42 2 40 6 37 8 C36 11 33 12 30 11 C24 14 14 15 4 14 C0 10 -1 0 0 -8 Z', 4).map((p) => H(p[0], p[1]));
  s += facets(head, skin, light, { size: 7.2, relief: 1.1, seed: 10, base2: skinD });
  // Écailles céphaliques : petites plaques facettées.
  for (const [pl, sd] of [[[[28, -15], [36, -11], [33, -6], [26, -8]], 11], [[[18, -16], [28, -15], [26, -8], [18, -9]], 12], [[[8, -14], [18, -16], [18, -9], [10, -6]], 13], [[[10, -6], [18, -9], [19, -3], [12, 1]], 14]] as [Pt[], number][])
    s += facets(pl.map((p) => H(p[0], p[1])), hsl(h, 30, 42), light, { size: 3.6, relief: 0.5, seed: sd });
  s += facets([[41, -3], [40, 6], [37, 8], [30, 11], [29, 7], [36, 3]].map((p) => H(p[0], p[1])) as Pt[], '#2A2238', light, { size: 3.6, relief: 0.4, seed: 15 });
  const [ex, ey] = H(26, -4);
  s += `<path d="M${(ex - 4).toFixed(1)} ${ey.toFixed(1)}L${(ex + 1).toFixed(1)} ${(ey - 3).toFixed(1)}L${(ex + 5).toFixed(1)} ${(ey - 1).toFixed(1)}L${(ex + 1).toFixed(1)} ${(ey + 2).toFixed(1)}Z" fill="#FFC84A"/><circle cx="${(ex + 0.5).toFixed(1)}" cy="${(ey - 0.5).toFixed(1)}" r="1.3" fill="#140A08"/><circle cx="${(ex - 0.6).toFixed(1)}" cy="${(ey - 1.6).toFixed(1)}" r="0.6" fill="#FFFFFF"/>`;

  // ---------- Plastron et carapace ----------
  s += facets(pathPts('M38 172 C80 186 140 186 184 170 C182 178 170 184 150 186 C110 190 70 188 44 180 Z'), mix(skin, CREAM, 0.3), light, { size: 12, relief: 0.6, seed: 16 });
  const shell = pathPts('M22 168 C22 146 54 120 106 116 C152 114 184 134 192 158 C194 166 190 172 182 174 C140 178 80 178 40 178 C30 178 22 174 22 168 Z', 8);
  s += facets(shell, deep, light, { size: 18, relief: 1.2, seed: 17 });
  // Écailles costales : plaques facettées séparées, comme des gemmes serties.
  [[30, 60], [62, 96], [98, 132], [134, 166], [168, 190]].forEach(([x0, x1], i) => {
    const sc = pathPts(`M${x0 + 2} 172 C${x0} 160 ${x0 + 5} 148 ${x0 + 9} 142 L${x1 - 7} 140 C${x1 - 2} 148 ${x1} 160 ${x1 - 2} 172 Z`, 6);
    s += facets(sc, i % 2 ? mix(shellC, deep, 0.25) : shellC, light, { size: 12, relief: 1.3, seed: 20 + i, base2: mix(shellC, deep, 0.4) });
    s += gem((x0 + x1) / 2, 158, 3, '#FFFFFF', GOLD);
  });
  s += facets(pathPts('M22 168 C60 176 140 176 192 162 L190 172 C150 180 70 182 26 176 Z', 8), mix(deep, '#000000', 0.2), light, { size: 12, relief: 0.4, seed: 26 });

  // ---------- Le monde porté : sol, montagnes, forêts ----------
  s += facets(pathPts('M26 150 C40 134 70 124 106 122 C146 120 176 132 188 150 C170 142 150 140 130 142 C110 140 80 142 60 146 C46 148 34 150 26 150 Z', 8), hsl(h + 80, 30, 30), light, { size: 14.4, relief: 0.5, seed: 27 });
  const stone = hsl(222, 20, 62), snow = '#F4F7FF';
  const mountain = (d: Pt[], cap: Pt[], seed: number, col = stone) =>
    facets(d, col, stoneL, { size: 14.4, relief: 1.6, seed, base2: hsl(232, 26, 34) }) + facets(cap, snow, stoneL, { size: 7.2, relief: 0.8, seed: seed + 50 });
  s += facets([[44, 132], [70, 92], [80, 100], [94, 70], [104, 84], [120, 60], [134, 82], [146, 76], [170, 120]], hsl(228, 20, 46), far, { size: 19.2, relief: 0.8, seed: 28, opacity: 0.85 });
  s += mountain([[34, 146], [50, 112], [58, 118], [68, 98], [80, 120], [88, 116], [100, 138]], [[60, 108], [68, 98], [74, 110], [69, 108], [65, 113]], 29);
  s += mountain([[124, 136], [140, 100], [148, 108], [160, 84], [174, 116], [180, 112], [190, 146]], [[152, 98], [160, 84], [167, 99], [161, 96], [157, 102]], 30);
  s += mountain([[64, 132], [86, 84], [96, 92], [112, 46], [126, 78], [134, 72], [160, 134]], [[100, 74], [106, 62], [112, 46], [119, 64], [114, 61], [110, 68], [106, 64]], 31, hsl(222, 22, 68));
  // Forêts de conifères (triangles à deux tons).
  const r = prng(44);
  for (const [x0, x1, y0] of [[30, 64, 146], [92, 130, 138], [150, 186, 146]] as const) {
    for (let x = x0; x < x1; x += 5.5) {
      const y = y0 - Math.sin(((x - x0) / (x1 - x0)) * Math.PI) * 4 + r() * 2, hh = 5 + r() * 3;
      s += `<path d="M${(x - 2).toFixed(1)} ${y.toFixed(1)}L${x.toFixed(1)} ${(y - hh).toFixed(1)}L${x.toFixed(1)} ${y.toFixed(1)}Z" fill="${hsl(h + 100, 35, 34)}"/><path d="M${x.toFixed(1)} ${y.toFixed(1)}L${x.toFixed(1)} ${(y - hh).toFixed(1)}L${(x + 2).toFixed(1)} ${y.toFixed(1)}Z" fill="${hsl(h + 110, 40, 16)}"/>`;
    }
  }
  // Cascades qui tombent de la carapace et se dissolvent en étoiles.
  for (const [x, y, l] of [[30, 152, 60], [62, 148, 36], [46, 150, 48]] as const) {
    s += facets(limb([[x, y], [x - 5, y + 14], [x - 6, y + 28], [x - 7, y + l]], [4, 3.5, 2.5, 0.8]), CRYSTAL, { dir: [-0.4, -0.5, 0.8], color: '#FFFFFF', shade: '#3A5BC0' }, { size: 4.2, relief: 0.3, seed: x });
    for (let i = 0; i < 2; i++) s += gem(x - 7 + (r() - 0.5) * 8, y + l + 4 + r() * 18, 1.5 + r() * 1.5, '#FFFFFF', CRYSTAL);
  }

  // ---------- Arbre de lumière (racines sur le sommet, ramure qui rejoint la galaxie) ----------
  const treeL: Light = { dir: [-0.5, -0.4, 0.8], color: '#FFFFFF', shade: '#5A7BD0' };
  s += `<circle cx="112" cy="26" r="18" fill="#FFF1C8" opacity="0.18"/>`;
  s += facets(limb([[112, 52], [111, 34], [112, 16], [112, 4]], [9, 6, 5, 3]), CRYSTAL, treeL, { size: 4.2, relief: 0.6, seed: 40 });
  for (const [sp, w, sd] of [[[[110, 14], [96, 8], [80, 8], [68, 16]], [4, 3, 2, 1], 41], [[[113, 10], [126, 2], [146, 4], [158, 14]], [4, 3, 2, 1], 42], [[[111, 6], [104, -4], [92, -12], [76, -8]], [3.5, 2.5, 2, 1], 43], [[[114, 4], [122, -6], [140, -10]], [3.5, 2.5, 1], 44], [[[108, 50], [100, 56], [96, 62]], [3, 2, 1], 45], [[[116, 50], [124, 56], [127, 62]], [3, 2, 1], 46]] as [Pt[], number[], number][])
    s += facets(limb(sp, w), CRYSTAL, treeL, { size: 3.6, relief: 0.4, seed: sd });
  for (const [x, y] of [[68, 16], [158, 14], [76, -8], [140, -10], [80, 8], [146, 4], [92, -12], [124, 0], [100, 2]] as Pt[]) s += gem(x, y, 3.2, '#FFFFFF', '#FFE2A0');

  // ---------- Nageoire antérieure proche (en pleine brasse) ----------
  s += facets(pathPts('M158 168 C174 172 180 184 172 198 C158 220 132 236 102 246 C94 248 92 242 98 238 C122 222 140 204 146 186 C148 178 152 172 158 168 Z', 7), skin, light, { size: 12, relief: 1, seed: 47, base2: skinD });
  for (let i = 0; i < 8; i++) { const t = i / 8, x = 166 - t * 62, y = 186 + t * 52; s += facets([[x, y], [x - 4, y + 3], [x - 2, y + 7], [x + 3, y + 6]], hsl(h, 30, 44), light, { size: 3.6, relief: 0.4, seed: 60 + i }); }

  // Constellation dorée sur le flanc.
  const cst: Pt[] = [[44, 160], [62, 154], [80, 158], [96, 152]];
  s += `<polyline points="${cst.map((p) => p.join(',')).join(' ')}" fill="none" stroke="${GOLD}" stroke-width="0.7" opacity="0.8"/>`;
  s += gem(196, 40, 3.5, '#FFFFFF', CRYSTAL) + gem(30, 70, 3, '#FFFFFF', CRYSTAL);
  return `<g transform="${FIT}">${s}</g>`;
};

/** Décor : océan d'étoiles profond, voiles de nébuleuse, galaxies lointaines et bébés tortues qui escortent le monde. */
const scene = (c: DrawCtx, b: Bounds): string => {
  const h = c.hue, r = prng(57);
  let s = facetSky(b.x0, b.y0, b.x1, b.y1, ['#060A1E', '#0B1F3A', '#0F3A4C', '#0A1A34', '#04060F'], 11, 32);
  const neb: Light = { dir: [0, -0.6, 0.8], color: '#FFFFFF', shade: hsl(h + 220, 50, 10) };
  // Voiles de nébuleuse (courants de l'océan d'étoiles).
  s += facets(ellipse(30, 236, 110, 34, 14, -0.15), hsl(h + 160, 45, 40), neb, { size: 26, relief: 0.3, seed: 58, opacity: 0.2 });
  s += facets(ellipse(196, 70, 70, 44, 12, 0.3), hsl(h + 260, 45, 45), neb, { size: 24, relief: 0.3, seed: 59, opacity: 0.15 });
  for (let i = 0; i < 45; i++) s += `<circle cx="${(b.x0 + r() * (b.x1 - b.x0)).toFixed(1)}" cy="${(b.y0 + r() * (b.y1 - b.y0)).toFixed(1)}" r="${(0.4 + r() * r() * 1.4).toFixed(1)}" fill="#F2F7FF" opacity="${(0.35 + r() * 0.6).toFixed(2)}"/>`;
  // Galaxies lointaines.
  for (const [x, y, rr, a] of [[22, 12, 12, 20], [208, 250, 10, -30]] as const)
    s += `<ellipse cx="${x}" cy="${y}" rx="${rr}" ry="${rr * 0.3}" fill="${hsl(h + 190, 40, 70)}" opacity="0.35" transform="rotate(${a} ${x} ${y})"/>` + gem(x, y, 3, '#FFFFFF', '#BFD7FF');
  // Petite planète océane.
  s += facets(ellipse(198, 228, 11, 11, 12), hsl(h + 170, 35, 40), { dir: [-0.2, -0.8, 0.5], color: '#DFF6FF', shade: '#05081A' }, { size: 5, relief: 1.2, seed: 61 });
  // Bébés tortues qui escortent (silhouettes facettées).
  const babyL: Light = { dir: [-0.1, -0.85, 0.5], color: '#CFEFFF', shade: '#05081A' };
  const baby = (x: number, y: number, k: number, rot: number, seed: number) => {
    const T = (p: Pt): Pt => { const a = (rot * Math.PI) / 180; return [x + (p[0] * Math.cos(a) - p[1] * Math.sin(a)) * k, y + (p[0] * Math.sin(a) + p[1] * Math.cos(a)) * k]; };
    return facets(([[-8, -2], [-14, -8], [-10, -1]] as Pt[]).map(T), hsl(h + 25, 25, 45), babyL, { size: 4, seed })
      + facets(([[6, -2], [12, -9], [8, -1]] as Pt[]).map(T), hsl(h + 25, 25, 45), babyL, { size: 4, seed: seed + 1 })
      + facets(ellipse(13, 0, 3.2, 2.4, 8).map(T), hsl(h + 25, 25, 50), babyL, { size: 3, seed: seed + 2 })
      + facets(ellipse(0, 0, 10, 6.5, 10).map(T), hsl(h, 35, 38), babyL, { size: 4, relief: 1, seed: seed + 3 });
  };
  s += baby(196, 44, 0.85, -14, 70) + baby(14, 198, 0.7, -10, 80) + baby(212, 72, 0.6, -20, 90);
  return s;
};

export const aeonis: Species = Object.assign(draw, { scene });
