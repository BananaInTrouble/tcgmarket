import type { Bounds, DrawCtx, Species } from './style.ts';
import { curve, ellipse, facetSky, facets, gem, hsl, limb, mix, prng, type Light, type Pt } from './lowpoly.ts';

/**
 * Cervastre → Cervelune → Astrocerf → Astrocerf éveillé, en low-poly : faon endormi dans une clairière au clair de
 * lune, daguet qui traverse un ruisseau au crépuscule, grand cerf au galop dans la plaine à l'aube, puis forme éveillée
 * au galop sous les aurores d'une forêt-cathédrale. Les bois sont des cristaux qui se prolongent en constellations.
 */

const GOLD = '#E9C25B', CRYSTAL = '#BFF6FF';
const n1 = (v: number) => v.toFixed(1);

/** Éclairage de chaque carte (accordé au décor). */
const LIGHTS: Light[] = [
  { dir: [-0.6, -0.7, 0.5], color: '#DDE6FF', shade: '#0A0B26', rim: '#7CF5E0' },
  { dir: [0.5, -0.5, 0.6], color: '#FFC9A0', shade: '#160A26', rim: '#FF9A7A' },
  { dir: [-0.55, -0.6, 0.6], color: '#FFE3B8', shade: '#120A2E', rim: '#7CF5E0' },
  { dir: [-0.4, -0.7, 0.6], color: '#D8FFF0', shade: '#0A0826', rim: '#E9C25B' },
];
const dim = (l: Light, deep: string): Light => ({ ...l, color: mix(l.color, deep, 0.45), rim: undefined });

const constel = (pts: Pt[], s = 4) =>
  `<polyline points="${pts.map((p) => p.map(n1).join(',')).join(' ')}" fill="none" stroke="${GOLD}" stroke-width="0.8" opacity="0.85"/>`
  + pts.map(([x, y]) => gem(x, y, s, '#FFFFFF', GOLD)).join('');
const hoof = (x: number, y: number, a = 0) =>
  `<path transform="translate(${n1(x)} ${n1(y)}) rotate(${a})" d="M-3.6 -4 L3 -4.6 L4 1.4 L-4.4 1.4 Z" fill="#1A1030"/><path transform="translate(${n1(x)} ${n1(y)}) rotate(${a})" d="M-3.6 -4 L0 -4.3 L-1 1.4 L-4.4 1.4 Z" fill="#3A2A5A"/>`;
const eye = (x: number, y: number, r: number, glow: string) =>
  `<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(r * 1.9)}" fill="${glow}" opacity="0.22"/><circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(r)}" fill="#0B0618"/><path d="M${n1(x - r * 0.5)} ${n1(y - r * 0.15)} l${n1(r * 0.55)} ${n1(-r * 0.5)} l${n1(r * 0.2)} ${n1(r * 0.45)} z" fill="#FFF3C4"/>`;

/** Bois en cristal ; `big` = nombre d'andouillers. */
function antlers(L: Light, seed: number, stage: number): string {
  const cl: Light = { ...L, shade: '#3A5BC0', color: '#FFFFFF' };
  const a = (sp: Pt[], w: number[], k: number) => facets(limb(sp, w), CRYSTAL, cl, { size: 3.5, relief: 0.4, seed: seed + k });
  const far: Light = { ...cl, color: '#B9D4FF', shade: '#1A2A70' };
  const af = (sp: Pt[], w: number[], k: number) => facets(limb(sp, w), mix(CRYSTAL, '#5A6AC0', 0.45), far, { size: 3.5, relief: 0.4, seed: seed + 20 + k });
  if (stage === 1) {
    return af([[76, 44], [84, 32], [90, 20]], [4, 3, 1.4], 1) + af([[84, 33], [94, 30]], [2.6, 1.2], 2)
      + a([[68, 46], [68, 32], [64, 18]], [4.4, 3.2, 1.4], 3) + a([[68, 34], [58, 28]], [2.8, 1.2], 4);
  }
  let s = af([[74, 42], [90, 34], [106, 22], [116, 10]], [4, 3.2, 2.4, 1.4], 1) + af([[90, 34], [96, 20]], [2.6, 1.4], 2) + af([[106, 22], [122, 22]], [2.4, 1.2], 3);
  s += a([[66, 44], [70, 28], [82, 14], [98, 6]], [5, 4, 3, 2], 4) + a([[70, 30], [60, 18], [56, 6]], [3.5, 2.5, 1.5], 5) + a([[80, 16], [86, 4]], [3, 1.5], 6) + a([[67, 38], [56, 34], [48, 34]], [3, 2, 1.2], 7);
  if (stage >= 3) s += a([[90, 10], [100, -4]], [2.4, 1.2], 8) + a([[60, 20], [46, 14]], [2.2, 1], 9);
  return s;
}

/** Tête de cerf (repère de la carte test : nuque vers (70, 62)), bois et constellations selon le stade. */
function head(c: DrawCtx, L: Light, far: Light, base: string, deep: string, st: number): string {
  void c;
  const cream = mix(base, '#F3EBDD', 0.35);
  let hd = '';
  hd += facets(ellipse(80, 46, 11, 4.6, 10, -0.6), deep, far, { size: 4, seed: 6 });
  hd += antlers(L, 30, st);
  hd += facets(curve([76, 52], [[[66, 43], [48, 45], [36, 54]], [[30, 59], [26, 63], [30, 68]], [[40, 72], [58, 74], [72, 70]], [[83, 64], [85, 56], [76, 52]]]), base, L, { size: 5, relief: 0.9, seed: 7 });
  hd += facets(curve([30, 60], [[[35, 57], [41, 60], [43, 66]], [[38, 70], [32, 70], [29, 66]]]), cream, L, { size: 3.5, relief: 0.4, seed: 17 });
  hd += `<circle cx="30.5" cy="63" r="2.6" fill="#0B0618"/><circle cx="29.8" cy="62.2" r="0.8" fill="#8C86A8"/>`;
  hd += eye(55, 57, 2.2, st >= 3 ? CRYSTAL : '#FFF3C4');
  hd += facets(ellipse(87, 50, 12, 4.6, 10, -0.45), base, L, { size: 4, seed: 18 }) + facets(ellipse(89, 50, 7, 2, 8, -0.45), deep, far, { size: 3, seed: 19 });
  if (st >= 2) hd += constel([[98, 6], [114, 2], [126, 10], [140, 4]]) + constel([[56, 6], [44, -4]]) + constel([[116, 10], [132, 14], [146, 8]], 3.4) + constel([[48, 34], [36, 28]], 3.4);
  if (st >= 3) hd += constel([[100, -4], [92, -14], [78, -12]], 3.6) + constel([[46, 14], [34, 8]], 3.4);
  return hd;
}

/** Grand cerf au galop (stades 2 et 3), d'après la carte test validée : pattes affinées, tête plus grande. */
function gallop(c: DrawCtx, st: number): string {
  const h = c.hue;
  const base = hsl(h, 32, 46), deep = hsl(h + 10, 40, 24);
  const L = LIGHTS[st], far = dim(L, deep);
  let s = '';
  if (st >= 3) s += `<circle cx="110" cy="96" r="80" fill="${CRYSTAL}" opacity="0.08"/><circle cx="110" cy="96" r="54" fill="${GOLD}" opacity="0.08"/>`;
  // Pattes du côté opposé.
  s += facets(limb([[88, 132], [97, 150], [88, 164], [76, 166]], [11, 6, 4, 3]), deep, far, { size: 5, relief: 0.6, seed: 2 });
  s += facets(limb([[150, 126], [143, 147], [154, 163], [168, 167]], [17, 8, 5, 3.6]), deep, far, { size: 6, relief: 0.6, seed: 3 });
  // Corps, croupe, cou.
  s += facets(curve([60, 112], [[[60, 98], [74, 88], [92, 90]], [[112, 92], [140, 96], [160, 90]], [[178, 86], [190, 100], [184, 118]], [[178, 134], [160, 140], [140, 138]], [[118, 136], [96, 144], [78, 138]], [[66, 134], [58, 124], [60, 112]]]), base, L, { size: 10, relief: 1.4, seed: 4, base2: deep });
  s += facets(ellipse(166, 110, 22, 21, 16), base, L, { size: 9, relief: 1.2, seed: 15, base2: deep });
  s += facets(limb([[92, 102], [80, 82], [70, 62]], [32, 22, 15]), base, L, { size: 8, relief: 1, seed: 5 });
  // Poitrail clair.
  s += facets(limb([[68, 126], [70, 112], [74, 98]], [7, 9, 6]), mix(base, '#F3EBDD', 0.35), L, { size: 5, relief: 0.6, seed: 16 });
  // Constellation du flanc ; forme éveillée : arabesques d'or.
  s += constel([[112, 108], [126, 102], [140, 110], [152, 104]], 3);
  if (st >= 3) s += constel([[100, 124], [116, 128], [132, 122], [146, 130], [168, 122]], 3) + constel([[84, 98], [78, 84]], 3);
  // Tête (agrandie autour de la nuque), bois et constellations.
  const hd = head(c, L, far, base, deep, st);
  s += `<g transform="translate(70 62) scale(1.15) translate(-70 -62)">${hd}</g>`;
  // Pattes du premier plan (galop : une tendue devant, une tendue derrière), plus fines.
  s += facets(limb([[72, 128], [60, 145], [50, 157], [36, 164], [24, 166]], [13, 7, 4.6, 3.6, 3]), base, L, { size: 5, relief: 0.8, seed: 12 });
  s += facets(limb([[166, 118], [181, 136], [197, 149], [212, 156]], [24, 9, 5, 3.6]), base, L, { size: 6, relief: 0.8, seed: 13 });
  s += facets(ellipse(188, 96, 7, 5, 10, -0.5), '#F3EBDD', L, { size: 4, seed: 14 });
  s += hoof(22, 166, 70) + hoof(75, 166, 60) + hoof(169, 167, 70) + hoof(214, 156, 64);
  // Traînée d'étoiles soulevée par les sabots.
  const r = prng(90 + st);
  for (let i = 0; i < 12; i++) { const t = r(); s += gem(170 + t * 50, 166 - t * 10 + (r() - 0.5) * 16, 1.2 + r() * 2, '#FFFFFF', st >= 3 ? GOLD : CRYSTAL); }
  if (st >= 3) {
    // Croissant de lune au-dessus des bois.
    s += `<circle cx="190" cy="16" r="16" fill="${GOLD}" opacity="0.18"/><path d="M186 6 A11 11 0 1 0 198 24 A8.5 8.5 0 1 1 186 6 Z" fill="${GOLD}"/><path d="M186 6 A11 11 0 0 0 184 20 A8.5 8.5 0 0 1 186 6 Z" fill="#FFF3C4"/>`;
  }
  return `<g transform="translate(-6 30) scale(1.08)">${s}</g>`;
}

/** Daguet (stade 1) qui traverse le ruisseau, une patte avant levée, bois courts en cristal. */
function walker(c: DrawCtx): string {
  const h = c.hue;
  const base = hsl(h, 30, 46), deep = hsl(h + 10, 38, 24);
  const L = LIGHTS[1], far = dim(L, deep);
  let s = '';
  // Pattes lointaines.
  s += facets(limb([[106, 146], [107, 166], [105, 184], [105, 200]], [11, 6, 4, 3.4]), deep, far, { size: 5, relief: 0.6, seed: 2 });
  s += facets(limb([[166, 138], [171, 158], [177, 175], [172, 200]], [17, 8, 4.4, 3.4]), deep, far, { size: 6, relief: 0.6, seed: 3 });
  s += hoof(105, 202) + hoof(172, 202);
  // Corps (même anatomie que l'adulte, plus svelte), croupe, cou dressé.
  s += facets(curve([70, 124], [[[70, 110], [84, 102], [102, 104]], [[122, 106], [150, 108], [170, 104]], [[186, 100], [198, 112], [194, 130]], [[188, 146], [170, 152], [150, 150]], [[128, 148], [106, 154], [88, 148]], [[76, 144], [68, 136], [70, 124]]]), base, L, { size: 9, relief: 1.3, seed: 4, base2: deep });
  s += facets(ellipse(176, 122, 20, 19, 16), base, L, { size: 8, relief: 1.1, seed: 15, base2: deep });
  s += facets(limb([[100, 118], [88, 96], [80, 74]], [30, 20, 14]), base, L, { size: 7, relief: 1, seed: 5 });
  // Dernières mouchetures, presque effacées.
  for (const [x, y] of [[122, 116], [136, 112], [150, 118], [130, 126], [160, 124]] as Pt[]) s += `<circle cx="${x}" cy="${y}" r="1.7" fill="#F3EBDD" opacity="0.55"/>`;
  s += facets(ellipse(198, 108, 6, 4.4, 10, -0.6), '#F3EBDD', L, { size: 4, seed: 14 });
  // Tête (même tête que l'adulte, décalée sur le cou dressé).
  const hd = head(c, L, far, base, deep, 1);
  s += `<g transform="translate(80 74) scale(1.12) translate(-80 -74) translate(10 12)">${hd}</g>`;
  // Pattes du premier plan : une avant levée (pas prudent dans l'eau).
  s += facets(limb([[92, 144], [88, 164], [78, 178], [82, 192]], [12, 6.4, 4.2, 3.4]), base, L, { size: 5, relief: 0.8, seed: 12 });
  s += facets(limb([[180, 134], [190, 158], [194, 176], [190, 200]], [22, 8.5, 4.6, 3.6]), base, L, { size: 6, relief: 0.8, seed: 13 });
  s += hoof(83, 194, -20) + hoof(190, 202);
  return `<g transform="translate(112 205) scale(1.04) translate(-112 -205)">${s}</g>`;
}

/** Faon endormi (stade 0) : couché en rond, pattes repliées, tête posée sur le flanc, yeux clos. */
function sleeper(c: DrawCtx): string {
  const h = c.hue;
  const base = hsl(h, 38, 50), deep = hsl(h + 10, 40, 26), cream = mix(base, '#F6EEDD', 0.55);
  const L = LIGHTS[0], far = dim(L, deep);
  let s = '';
  s += `<ellipse cx="118" cy="205" rx="80" ry="9" fill="#05030C" opacity="0.4"/>`;
  // Queue et corps couché.
  s += facets(ellipse(186, 170, 7, 5, 10, -0.5), cream, L, { size: 4, seed: 2 });
  s += facets(curve([52, 202], [[[46, 180], [66, 156], [98, 150]], [[128, 144], [164, 148], [180, 166]], [[192, 180], [190, 200], [176, 204]], [[140, 206], [90, 206], [52, 202]]]), base, L, { size: 9, relief: 1.3, seed: 3, base2: deep });
  s += facets(ellipse(160, 182, 26, 21, 16), base, L, { size: 8, relief: 1.1, seed: 4, base2: deep });
  // Mouchetures en rangées le long de l'échine, quelques-unes en étoiles.
  const r = prng(11);
  for (const [x0, y0, k] of [[86, 160, 0], [94, 168, 1], [104, 177, 2]] as [number, number, number][]) {
    for (let i = 0; i < 7 - k; i++) {
      const t = i / (6 - k), x = x0 + t * (78 - k * 6), y = y0 - Math.sin(t * Math.PI) * (10 - k * 2) + t * 4;
      s += (i + k) % 4 === 1 ? gem(x, y, 2.6, '#FFFFFF', GOLD) : `<ellipse cx="${n1(x)}" cy="${n1(y)}" rx="${n1(1.6 + r() * 0.6)}" ry="${n1(1.2 + r() * 0.4)}" fill="#F6EEDD" opacity="0.9"/>`;
    }
  }
  // Pattes repliées : sabot arrière qui dépasse, patte avant sous le poitrail.
  s += facets(limb([[150, 198], [130, 202], [118, 202]], [9, 5, 3.6]), base, L, { size: 4, relief: 0.6, seed: 5 }) + hoof(114, 202, 90);
  s += facets(limb([[80, 196], [62, 200], [48, 201]], [10, 5.4, 3.6]), base, L, { size: 4, relief: 0.6, seed: 6 }) + hoof(44, 201, 90);
  // Cou recourbé, tête posée sur le flanc (vers la droite).
  s += facets(limb([[72, 192], [64, 174], [72, 158], [90, 150]], [24, 20, 16, 13]), base, L, { size: 6, relief: 0.9, seed: 7 });
  s += facets(limb([[66, 186], [62, 174], [66, 164]], [9, 8, 6]), cream, L, { size: 4, relief: 0.5, seed: 8 });
  s += facets(ellipse(80, 140, 15, 5.4, 10, -0.35), deep, far, { size: 4, seed: 9 });
  s += facets(curve([86, 150], [[[90, 138], [108, 134], [122, 142]], [[132, 148], [142, 152], [145, 158]], [[145, 164], [134, 167], [126, 165]], [[112, 163], [96, 163], [86, 150]]]), base, L, { size: 5, relief: 0.9, seed: 10 });
  s += facets(curve([118, 160], [[[128, 162], [138, 164], [144, 162]], [[136, 168], [124, 168], [118, 160]]]), cream, L, { size: 4, relief: 0.4, seed: 12 });
  s += `<circle cx="143" cy="157" r="2.3" fill="#0B0618"/>`;
  s += `<path d="M106 146 Q112 151 118 146 Q112 148.8 106 146 Z" fill="#160E28"/>`;
  s += facets(ellipse(96, 140, 13, 5, 10, -0.6), base, L, { size: 4, seed: 13 }) + facets(ellipse(97, 139.5, 7.5, 2, 8, -0.6), deep, far, { size: 3, seed: 14 });
  s += gem(110, 140, 2.4, '#FFFFFF', GOLD);
  // Une luciole posée sur l'oreille, une autre qui tourne près du museau.
  s += `<circle cx="92" cy="130" r="6" fill="#E8F59A" opacity="0.25"/>` + gem(92, 130, 2.6, '#FFFFFF', '#E8F59A');
  s += `<circle cx="158" cy="146" r="5" fill="#E8F59A" opacity="0.22"/>` + gem(158, 146, 2, '#FFFFFF', '#E8F59A');
  return `<g transform="translate(116 205) scale(1.18) translate(-116 -205)">${s}</g>`;
}

const draw = (c: DrawCtx): string => {
  const st = Math.min(c.stage, 3);
  if (st === 0) return sleeper(c);
  if (st === 1) return walker(c);
  return gallop(c, st);
};

// ---------------------------------------------------------------------------------------------------------------
// Décor : forêt cosmique (clairière moussue la nuit, ruisseau au crépuscule, plaine à l'aube, forêt-cathédrale
// sous les aurores).

const trunk = (x: number, top: number, bot: number, w: number, col: string, L: Light, seed: number) =>
  facets([[x - w * 0.42, top], [x + w * 0.42, top], [x + w * 0.5, bot - 12], [x + w, bot], [x - w, bot], [x - w * 0.5, bot - 12]], col, L, { size: Math.max(9, w * 1.3), relief: 0.5, seed });
const fir = (x: number, y: number, hh: number, col: string, L: Light, seed: number) =>
  facets([[x, y - hh], [x + hh * 0.32, y], [x - hh * 0.32, y]], col, L, { size: hh / 4, relief: 0.8, seed });
const stars = (b: Bounds, n: number, ymax: number, seed: number, dark = '#BFD7FF') => {
  const r = prng(seed);
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = b.x0 + r() * (b.x1 - b.x0), y = b.y0 + r() * (ymax - b.y0), z = r();
    s += z > 0.75 ? gem(x, y, 1.6 + r() * 2.2, '#FFFFFF', dark) : `<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(0.5 + z)}" fill="#FFFFFF" opacity="${n1(0.4 + r() * 0.5)}"/>`;
  }
  return s;
};
const fireflies = (b: Bounds, n: number, y0: number, y1: number, col: string, seed: number) => {
  const r = prng(seed);
  let s = '';
  for (let i = 0; i < n; i++) { const x = b.x0 + 10 + r() * (b.x1 - b.x0 - 20), y = y0 + r() * (y1 - y0); s += `<circle cx="${n1(x)}" cy="${n1(y)}" r="4" fill="${col}" opacity="0.2"/><circle cx="${n1(x)}" cy="${n1(y)}" r="1.2" fill="#FFFFFF"/>`; }
  return s;
};
/** Fougère : pinnules en petits triangles le long d'une tige. */
function fern(x: number, y: number, len: number, ang: number, curl: number, col: string, col2: string): string {
  let s = '', a = (ang * Math.PI) / 180, px = x, py = y;
  for (let i = 0; i < 10; i++) {
    a += curl / 10;
    const nx = px + Math.cos(a) * len / 10, ny = py + Math.sin(a) * len / 10, l = len * 0.22 * (1 - i / 12);
    for (const sd of [-1, 1]) {
      const la = a + sd * 1.1;
      s += `<path d="M${n1(px)} ${n1(py)}L${n1(px + Math.cos(la) * l)} ${n1(py + Math.sin(la) * l)}L${n1(nx)} ${n1(ny)}Z" fill="${sd > 0 ? col : col2}"/>`;
    }
    px = nx; py = ny;
  }
  return s;
}

const scene = (c: DrawCtx, b: Bounds): string => {
  const st = Math.min(c.stage, 3);
  const r = prng(41 + st);
  const W = b.x1 - b.x0;
  let s = '';
  if (st === 0) {
    // Clairière moussue, nuit profonde ; un rayon de lune tombe sur le faon.
    s += facetSky(b.x0, b.y0, b.x1, b.y1, ['#0A1024', '#13243A', '#163038', '#0E1E22', '#08100F'], 9, 32);
    s += stars(b, 26, 100, 5);
    s += `<circle cx="40" cy="30" r="26" fill="#DDE6FF" opacity="0.14"/>` + facets(ellipse(40, 30, 13, 13, 12), '#F2F0E0', { dir: [-0.5, -0.5, 0.7], color: '#FFFFFF', shade: '#9AA4C8' }, { size: 6, relief: 0.6, seed: 3 });
    const fL: Light = { dir: [-0.6, -0.5, 0.6], color: '#9FC8D8', shade: '#060A14' };
    for (const [x, w] of [[14, 6], [66, 4.5], [100, 6.5], [150, 5], [184, 5.5], [212, 4.5]] as Pt[]) s += trunk(x, b.y0, 160, w, '#22384A', fL, 10 + x);
    s += `<path d="M30 20 L70 20 L182 214 L80 214 Z" fill="#DDE6FF" opacity="0.08"/>`;
    for (const [x, w] of [[24, 11], [130, 9], [200, 12]] as Pt[]) s += trunk(x, b.y0, 172, w, '#18283A', fL, 30 + x);
    // Sol moussu et creux.
    const moss: Light = { dir: [-0.5, -0.8, 0.5], color: '#9FE0B8', shade: '#04100A' };
    s += facets([[b.x0, 166], [40, 156], [100, 160], [160, 158], [b.x1, 154], [b.x1, b.y1], [b.x0, b.y1]], '#1E3C30', moss, { size: 28, relief: 0.4, seed: 22, base2: '#0A1612' });
    s += facets(ellipse(116, 204, 96, 22, 20), '#2F5A44', moss, { size: 14, relief: 0.6, seed: 23 });
    s += fern(b.x0 + 2, 228, 64, -60, 0.9, '#2E6A52', '#1C4A3A') + fern(b.x0 + 8, 240, 54, -36, 0.7, '#3A7A5C', '#245040') + fern(b.x1 - 2, 226, 60, -120, -0.9, '#2E6A52', '#1C4A3A') + fern(b.x1 - 8, 240, 52, -150, -0.6, '#3A7A5C', '#245040');
    for (const [x, y, k] of [[188, 226, 1.1], [34, 232, 0.8]] as [number, number, number][]) {
      s += `<circle cx="${x}" cy="${y - 10 * k}" r="${n1(14 * k)}" fill="#7CF5E0" opacity="0.1"/>`;
      for (const [dx, hh, rr] of [[0, 9, 4.6], [7, 6, 3.2], [-6, 5, 2.6]] as Pt3[]) s += `<path d="M${n1(x + dx * k - 0.8)} ${y} L${n1(x + dx * k + 0.8)} ${y} L${n1(x + dx * k)} ${n1(y - hh * k)} Z" fill="#E8E0CC"/><path d="M${n1(x + (dx - rr) * k)} ${n1(y - hh * k)} L${n1(x + dx * k)} ${n1(y - (hh + rr) * k)} L${n1(x + (dx + rr) * k)} ${n1(y - hh * k)} Z" fill="#7CF5E0"/>`;
    }
    s += fireflies(b, 10, 50, 170, '#E8F59A', 6);
  } else if (st === 1) {
    // Ruisseau à la lisière, au crépuscule.
    s += facetSky(b.x0, b.y0, b.x1, b.y1, ['#1C1438', '#3E2A5A', '#9A5A6A', '#E0A070', '#2A2440', '#14122A'], 7, 32);
    s += stars(b, 22, 70, 8);
    const hill: Light = { dir: [0.5, -0.6, 0.5], color: '#F0B08A', shade: '#1A1030' };
    s += facets([[b.x0, 150], [30, 128], [70, 138], [110, 122], [150, 134], [190, 120], [b.x1, 132], [b.x1, 170], [b.x0, 170]], '#5A3E66', hill, { size: 18, relief: 0.5, seed: 21 });
    for (let i = 0; i < 12; i++) s += fir(b.x0 + 4 + i * 20 + r() * 8, 156, 18 + r() * 14, '#3A2848', hill, 40 + i);
    for (const [x, w] of [[16, 8], [44, 5], [178, 6], [208, 10]] as Pt[]) s += trunk(x, b.y0, 168, w, '#2A1C38', hill, 60 + x);
    // Berges, ruisseau aux reflets d'or rose.
    const bank: Light = { dir: [0.4, -0.8, 0.5], color: '#D89A8A', shade: '#0C0818' };
    s += facets([[b.x0, 162], [80, 156], [160, 156], [b.x1, 160], [b.x1, b.y1], [b.x0, b.y1]], '#2C2A3A', bank, { size: 28, relief: 0.4, seed: 24, base2: '#14122A' });
    const water: Light = { dir: [0.3, -0.9, 0.4], color: '#FFD0A0', shade: '#1A1438' };
    s += facets([[100, 158], [124, 160], [160, 172], [b.x1, 200], [b.x1, b.y1], [b.x0, b.y1], [b.x0, 212], [60, 196], [86, 168]], '#6A4C80', water, { size: 22, relief: 0.3, seed: 25, base2: '#24204A' });
    for (let i = 0; i < 12; i++) { const y = 168 + i * 6, x = 90 - i * 3 + r() * 40, l = 8 + i * 2.5; s += `<path d="M${n1(x)} ${n1(y)} h${n1(l)} l-3 1.2 h${n1(-l + 4)} z" fill="#FFE0C0" opacity="${n1(0.25 + r() * 0.3)}"/>`; }
    for (const [x, rx] of [[86, 14], [190, 12]] as Pt[]) s += `<ellipse cx="${x}" cy="204" rx="${rx}" ry="2.6" fill="none" stroke="#FFE0C0" stroke-width="0.7" opacity="0.6"/><ellipse cx="${x}" cy="205" rx="${rx * 1.6}" ry="4.4" fill="none" stroke="#FFE0C0" stroke-width="0.5" opacity="0.35"/>`;
    s += fern(b.x0 - 2, 208, 52, -50, 0.8, '#3E4A4A', '#2A3434') + fern(b.x1 + 2, 196, 48, -130, -0.8, '#3E4A4A', '#2A3434');
    s += fireflies(b, 6, 70, 150, '#FFD99A', 9);
  } else if (st === 2) {
    // Plaine à la lisière, à l'aube (décor de la carte test).
    s += facetSky(b.x0, b.y0, b.x1, b.y1, ['#0E0A2A', '#2A1E5C', '#6B3E7A', '#E08A5C', '#3A2050', '#120C26'], 9, 32);
    s += `<circle cx="150" cy="150" r="46" fill="#FFB86B" opacity="0.25"/>` + gem(150, 150, 16, '#FFF3D6', '#FFC37A');
    const mtn: Light = { dir: [-0.6, -0.5, 0.5], color: '#C79AD6', shade: '#1A1236' };
    s += facets([[b.x0, 175], [30, 128], [70, 160], [110, 120], [150, 158], [190, 126], [b.x1, 165], [b.x1, 190], [b.x0, 190]], '#4A3474', mtn, { size: 16, relief: 0.6, seed: 21 });
    const tL: Light = { dir: [-0.6, -0.5, 0.6], color: '#E7A07A', shade: '#08061A' };
    for (let i = 0; i < 9; i++) { const x = b.x0 + 8 + i * 27 + r() * 8; s += fir(x, 196, 40 + r() * 34, '#22183E', tL, 30 + i); }
    s += facets([[b.x0, 186], [b.x1, 182], [b.x1, b.y1], [b.x0, b.y1]], '#2B2350', { dir: [-0.4, -0.8, 0.5], color: '#E59A6E', shade: '#0B0820' }, { size: 26, relief: 0.4, seed: 22, base2: '#120C26' });
    s += stars(b, 14, 110, 12);
  } else {
    // Forêt-cathédrale sous les aurores : troncs géants veinés d'or.
    s += facetSky(b.x0, b.y0, b.x1, b.y1, ['#0A0C22', '#123A4A', '#2A1E5C', '#1A1640', '#0C0A1E'], 11, 32);
    for (const [y, col, op] of [[40, '#7CF5C0', 0.22], [70, '#C08AFF', 0.18], [24, '#E9F59A', 0.12]] as [number, string, number][]) {
      s += `<path d="M${b.x0 - 10} ${y + 20} L40 ${y - 10} L90 ${y + 24} L140 ${y - 6} L190 ${y + 16} L${b.x1 + 10} ${y - 12} L${b.x1 + 10} ${y + 8} L190 ${y + 40} L140 ${y + 18} L90 ${y + 50} L40 ${y + 18} L${b.x0 - 10} ${y + 46} Z" fill="${col}" opacity="${op}"/>`;
    }
    s += stars(b, 30, 150, 14, '#7CF5C0');
    const fL: Light = { dir: [-0.4, -0.6, 0.6], color: '#9FE8D8', shade: '#05061A' };
    for (const [x, w] of [[44, 6], [86, 4.5], [148, 5], [188, 6]] as Pt[]) s += trunk(x, b.y0, 178, w, '#2A2C56', fL, 70 + x);
    for (const [x, w] of [[b.x0 + 10, 16], [b.x1 - 10, 18]] as Pt[]) {
      s += trunk(x, b.y0, b.y1, w, '#1B1A36', fL, 90 + x);
      s += `<polyline points="${n1(x - 4)},${b.y0} ${n1(x + 5)},60 ${n1(x - 6)},130 ${n1(x + 3)},220" fill="none" stroke="${GOLD}" stroke-width="1" opacity="0.7"/>`;
    }
    s += facets([[b.x0, 184], [80, 176], [160, 178], [b.x1, 184], [b.x1, b.y1], [b.x0, b.y1]], '#1C1E3A', { dir: [-0.3, -0.8, 0.5], color: '#7CF5C0', shade: '#05061A' }, { size: 28, relief: 0.4, seed: 26, base2: '#0C0A1E' });
    s += `<path d="M30 ${b.y1} L120 186 L132 186 L90 ${b.y1} Z" fill="${GOLD}" opacity="0.12"/>`;
    s += fireflies(b, 12, 30, 200, GOLD, 15);
  }
  void W;
  return s;
};
type Pt3 = [number, number, number];

export const cervastre: Species = Object.assign(draw, { scene });
