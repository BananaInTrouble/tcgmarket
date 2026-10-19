import type { Bounds, DrawCtx, Species } from '../style.ts';
import { curve, ellipse, facetSky, facets, gem, hsl, limb, mix, prng, type Light, type Pt } from '../lowpoly.ts';

/** Cervastre en low-poly (essai) : grand cerf au galop, bois-constellations, forêt à l'aube. */
const draw = (c: DrawCtx): string => {
  const h = c.hue;
  const base = hsl(h, 32, 46), deep = hsl(h + 10, 40, 24);
  const light: Light = { dir: [-0.55, -0.6, 0.6], color: '#FFE3B8', shade: '#120A2E', rim: '#7CF5E0' };
  const far: Light = { ...light, color: mix('#FFE3B8', deep, 0.4), rim: undefined };
  let s = '';
  // Pattes du côté opposé (plus sombres), derrière le corps.
  s += facets(limb([[88, 132], [97, 150], [88, 165], [75, 167]], [13, 8, 6, 4]), deep, far, { size: 6, relief: 0.6, seed: 2 });
  s += facets(limb([[150, 126], [143, 147], [154, 164], [169, 168]], [20, 10, 7, 5]), deep, far, { size: 7, relief: 0.6, seed: 3 });
  // Corps, croupe, cou, tête.
  s += facets(curve([60, 112], [[[60, 98], [74, 88], [92, 90]], [[112, 92], [140, 96], [160, 90]], [[178, 86], [190, 100], [184, 118]], [[178, 134], [160, 140], [140, 138]], [[118, 136], [96, 144], [78, 138]], [[66, 134], [58, 124], [60, 112]]]), base, light, { size: 10, relief: 1.4, seed: 4, base2: deep });
  s += facets(ellipse(166, 110, 22, 21, 16), base, light, { size: 9, relief: 1.2, seed: 15, base2: deep });
  s += facets(limb([[92, 102], [80, 82], [70, 62]], [34, 23, 15]), base, light, { size: 8, relief: 1, seed: 5 });
  s += facets(ellipse(76, 46, 10, 4.5, 10, -0.6), base, light, { size: 4, seed: 6 });
  s += facets(curve([74, 52], [[[64, 44], [48, 46], [38, 55]], [[31, 61], [31, 68], [37, 70]], [[47, 73], [60, 74], [72, 70]], [[83, 64], [84, 56], [74, 52]]]), base, light, { size: 5.5, relief: 0.9, seed: 7 });
  s += `<circle cx="35" cy="64" r="2.4" fill="#0B0618"/><path d="M54 58 l7 -2 l-1 3 z" fill="#FFF3C4"/><circle cx="58" cy="57.5" r="4" fill="#FFF3C4" opacity="0.25"/>`;
  // Bois-cristaux et constellations.
  const gold = '#E9C25B', crystal = '#BFF6FF';
  const antler = (sp: Pt[], w: number[], seed: number) => facets(limb(sp, w), crystal, { ...light, shade: '#3A5BC0', color: '#FFFFFF' }, { size: 3.5, relief: 0.4, seed });
  s += antler([[66, 44], [70, 28], [82, 14], [98, 6]], [5, 4, 3, 2], 8) + antler([[70, 30], [60, 18], [56, 6]], [3.5, 2.5, 1.5], 9) + antler([[80, 16], [86, 4]], [3, 1.5], 10) + antler([[74, 42], [90, 34], [104, 30]], [4, 3, 2], 11);
  const stars: Pt[] = [[98, 6], [114, 2], [126, 10], [140, 4], [56, 6], [44, -4], [104, 30], [120, 26]];
  s += `<polyline points="98,6 114,2 126,10 140,4" fill="none" stroke="${gold}" stroke-width="0.8" opacity="0.8"/><polyline points="56,6 44,-4" fill="none" stroke="${gold}" stroke-width="0.8" opacity="0.8"/><polyline points="104,30 120,26" fill="none" stroke="${gold}" stroke-width="0.8" opacity="0.8"/>`;
  for (const [x, y] of stars) s += gem(x, y, 4, '#FFFFFF', gold);
  // Pattes au premier plan (galop : une tendue devant, une tendue derrière).
  s += facets(limb([[72, 128], [60, 145], [50, 158], [34, 166], [22, 168]], [16, 9, 6, 5, 4]), base, light, { size: 6, relief: 0.8, seed: 12 });
  s += facets(limb([[166, 118], [181, 136], [197, 150], [213, 158]], [26, 12, 7, 5]), base, light, { size: 7, relief: 0.8, seed: 13 });
  s += facets(ellipse(188, 96, 7, 5, 10, -0.5), '#F3EBDD', light, { size: 4, seed: 14 });
  // Sabots.
  for (const [x, y] of [[22, 168], [75, 167], [169, 168], [213, 158]] as Pt[]) s += `<path d="M${x - 4} ${y - 2} l7 -1 l1 5 l-8 0 z" fill="#1A1030"/>`;
  return `<g transform="translate(-8 34) scale(1.1)">${s}</g>`;
};

const scene = (c: DrawCtx, b: Bounds): string => {
  const r = prng(41);
  let s = facetSky(b.x0, b.y0, b.x1, b.y1, ['#0E0A2A', '#2A1E5C', '#6B3E7A', '#E08A5C', '#3A2050', '#120C26'], 9, 24);
  // Soleil levant.
  s += `<circle cx="150" cy="150" r="46" fill="#FFB86B" opacity="0.25"/>` + gem(150, 150, 16, '#FFF3D6', '#FFC37A');
  // Montagnes lointaines facettées.
  const mtn: Light = { dir: [-0.6, -0.5, 0.5], color: '#C79AD6', shade: '#1A1236' };
  s += facets([[b.x0, 175], [30, 128], [70, 160], [110, 120], [150, 158], [190, 126], [b.x1, 165], [b.x1, 190], [b.x0, 190]], '#4A3474', mtn, { size: 16, relief: 0.6, seed: 21 });
  // Sapins facettés.
  const tree = (x: number, y: number, hh: number, seed: number, col: string) =>
    facets([[x, y - hh], [x + hh * 0.32, y], [x - hh * 0.32, y]], col, { dir: [-0.6, -0.5, 0.6], color: '#E7A07A', shade: '#08061A' }, { size: hh / 4, relief: 0.8, seed });
  for (let i = 0; i < 9; i++) { const x = b.x0 + 8 + i * 27 + r() * 8; s += tree(x, 196, 40 + r() * 34, 30 + i, '#22183E'); }
  // Prairie facettée.
  s += facets([[b.x0, 186], [b.x1, 182], [b.x1, b.y1], [b.x0, b.y1]], '#2B2350', { dir: [-0.4, -0.8, 0.5], color: '#E59A6E', shade: '#0B0820' }, { size: 18, relief: 0.4, seed: 22, base2: '#120C26' });
  for (let i = 0; i < 14; i++) s += gem(b.x0 + r() * (b.x1 - b.x0), b.y0 + r() * 110, 1.5 + r() * 2.5, '#FFFFFF', '#BFD7FF');
  return s;
};

export const cervastreLP: Species = Object.assign(draw, { scene });
