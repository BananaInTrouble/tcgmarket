import type { Bounds, DrawCtx, Species } from './style.ts';
import { curve, ellipse, facetSky, facets, gem, hsl, limb, mix, prng, type Light, type Pt } from './lowpoly.ts';

/**
 * Abyssquid (low-poly) : calmar géant des abysses du ciel, manteau dressé en diagonale, qui enlace un trou noir ;
 * certains bras passent derrière l'horizon, d'autres devant ; lumière chaude du disque d'accrétion par-dessous.
 */

/** Courbe lissée (Catmull-Rom) passant par les points. */
function smooth(pts: Pt[], per = 5): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < per; k++) {
      const t = k / per, t2 = t * t, t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}
const rot = (p: Pt, o: Pt, deg: number, k = 1): Pt => {
  const a = (deg * Math.PI) / 180, x = p[0] * k, y = p[1] * k;
  return [o[0] + x * Math.cos(a) - y * Math.sin(a), o[1] + x * Math.sin(a) + y * Math.cos(a)];
};
const flat = (poly: Pt[], fill: string, op = 1) => `<path d="M${poly.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('L')}Z" fill="${fill}"${op < 1 ? ` opacity="${op}"` : ''}/>`;

const BH: Pt = [113, 166];

const draw = (c: DrawCtx): string => {
  const h = c.hue;
  const base = hsl(h, 38, 46), deep = hsl(h + 15, 42, 24), pale = hsl(h - 10, 40, 64);
  const light: Light = { dir: [0.15, 0.75, 0.6], color: '#FFD9A8', shade: '#07041A', rim: '#B98CFF' };
  const far: Light = { ...light, color: mix('#FFD9A8', deep, 0.45), rim: undefined };
  const disk = ['#7A5CFF', '#C59BFF', '#FFD9A8', '#FFF4D6'];

  // Disque d'accrétion : anneau elliptique (moitié arrière / avant), bandes de couleur.
  const ring = (rx: number, ry: number, w: number, back: boolean): Pt[] => {
    const n = 18, outer: Pt[] = [], inner: Pt[] = [];
    for (let i = 0; i <= n; i++) {
      const a = (back ? Math.PI : 0) + (i / n) * Math.PI;
      outer.push(rot([Math.cos(a) * rx, Math.sin(a) * ry], BH, -9));
      inner.push(rot([Math.cos(a) * (rx - w), Math.sin(a) * (ry - w * 0.22)], BH, -9));
    }
    return [...outer, ...inner.reverse()];
  };
  const diskHalf = (back: boolean) =>
    [[84, 18, 14], [68, 15, 12], [54, 12, 10], [42, 9.5, 8]].map(([rx, ry, w], i) =>
      facets(ring(rx, ry, w, back), disk[i], { ...light, dir: [0, -0.6, 0.8], color: '#FFFFFF' }, { size: 5, relief: 0.3, seed: 70 + i + (back ? 10 : 0), opacity: back ? 0.75 : 0.92 })).join('');

  // Bras : [points, largeur à la base, devant ?, massue ?]
  const arms: [Pt[], number, boolean, boolean][] = [
    [[[94, 120], [64, 118], [42, 128], [30, 146], [32, 162], [40, 166]], 10, false, false],
    [[[108, 118], [142, 114], [168, 124], [184, 140], [186, 158], [180, 164]], 10, false, false],
    [[[98, 121], [76, 126], [60, 142], [58, 160], [66, 174]], 11, false, false],
    [[[106, 121], [132, 126], [150, 142], [156, 160], [150, 174]], 11, false, false],
    [[[106, 119], [146, 104], [180, 92], [202, 70], [200, 48], [190, 40]], 6, false, true],
    [[[96, 124], [80, 136], [74, 154], [78, 172], [88, 184], [98, 186]], 12, true, false],
    [[[107, 124], [124, 134], [136, 150], [140, 168], [134, 184], [124, 190]], 12, true, false],
    [[[99, 125], [62, 150], [42, 184], [58, 214], [106, 226], [156, 216], [184, 198], [196, 176]], 6, true, true],
  ];
  const arm = ([pts, w0, front, club]: [Pt[], number, boolean, boolean], i: number) => {
    const sp = smooth(pts, 3);
    const n = sp.length;
    const w = sp.map((_, k) => {
      const u = k / (n - 1);
      return club ? (u < 0.8 ? w0 - u * 2.5 : w0 - 2 + Math.sin(((u - 0.8) / 0.2) * Math.PI) * 6) : Math.max(1.2, w0 * Math.pow(1 - u, 0.85));
    });
    let o = facets(limb(sp, w), front ? base : deep, front ? light : far, { size: 5, relief: 0.7, seed: 20 + i });
    // Ventouses / photophores : petites perles claires le long du bras.
    for (let k = 3; k < n - 2; k += front ? 2 : 3) {
      const [x, y] = sp[k];
      o += `<circle cx="${x.toFixed(1)}" cy="${(y + w[k] * 0.15).toFixed(1)}" r="${Math.max(0.6, w[k] * 0.13).toFixed(1)}" fill="${front ? '#FFE9C8' : pale}" opacity="${front ? 0.85 : 0.5}"/>`;
    }
    return o;
  };

  let s = '';
  s += `<ellipse cx="${BH[0]}" cy="${BH[1]}" rx="70" ry="26" fill="#C59BFF" opacity="0.18"/>`;
  s += diskHalf(true);
  arms.forEach((a, i) => { if (!a[2]) s += arm(a, i); });
  // Trou noir : anneau de photons (deux disques) puis horizon.
  s += `<circle cx="${BH[0]}" cy="${BH[1]}" r="26" fill="#FFE9C8" opacity="0.18"/><circle cx="${BH[0]}" cy="${BH[1]}" r="20.5" fill="#FFF4D6"/><circle cx="${BH[0]}" cy="${BH[1]}" r="18" fill="#030208"/>`;
  s += diskHalf(false);
  arms.forEach((a, i) => { if (a[2]) s += arm(a, i); });

  // Calmar : manteau, nageoires et tête dans un repère incliné (origine à la jonction manteau/tête).
  const O: Pt = [102, 98], A = 20, K = 0.9;
  const R = (pts: Pt[]) => pts.map((p) => rot(p, O, A, K));
  for (const sg of [-1, 1]) {
    const fin = R(curve([sg * 9, -50], [[[sg * 24, -56], [sg * 36, -68], [sg * 40, -80]], [[sg * 30, -88], [sg * 14, -94], [sg * 2, -97]], [[sg * 4, -80], [sg * 7, -64], [sg * 9, -50]]], 5));
    s += facets(fin, sg < 0 ? pale : deep, sg < 0 ? light : far, { size: 5, relief: 0.5, seed: 40 + sg });
  }
  const mantle = R(curve([-15, 2], [[[-19, -24], [-16, -52], [-10, -72]], [[-7, -82], [-3, -90], [0, -98]], [[3, -90], [7, -82], [10, -72]], [[16, -52], [19, -24], [15, 2]], [[6, 5], [-6, 5], [-15, 2]]], 5));
  s += facets(mantle, mix(base, deep, 0.45), light, { size: 6, relief: 1.3, seed: 44, base2: base });
  // Chromatophores et filet d'or.
  for (const [x, y, rr] of [[-8, -20, 1.6], [-4, -34, 1.2], [-10, -44, 1], [-2, -58, 1.3], [-6, -66, 0.9], [3, -12, 1]] as const) {
    const [px, py] = rot([x, y], O, A, K);
    s += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${rr}" fill="${deep}" opacity="0.8"/>`;
  }
  const spine = R([[0, -92], [-2, -64], [-3, -36], [-2, -8]]);
  s += `<polyline points="${spine.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' ')}" fill="none" stroke="#E9C25B" stroke-width="0.8" opacity="0.85"/>` + spine.map(([x, y]) => gem(x, y, 2.6, '#FFFFFF', '#E9C25B')).join('');
  const head = R(curve([-14, 2], [[[-19, 10], [-18, 22], [-12, 28]], [[-4, 30], [4, 30], [12, 28]], [[18, 22], [19, 10], [14, 2]], [[6, 4], [-6, 4], [-14, 2]]], 4));
  s += facets(head, base, light, { size: 4.5, relief: 1, seed: 46 });
  for (const sg of [-1, 1]) {
    const [ex, ey] = rot([sg * 11, 14], O, A, K);
    s += facets(ellipse(ex, ey, 6.6, 6.2, 10), deep, far, { size: 3.5, relief: 0.6, seed: 48 + sg });
    s += `<circle cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" r="5" fill="#FFB86B" opacity="0.3"/><circle cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" r="3.4" fill="#FFB86B"/><circle cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" r="2" fill="#0B0618"/><circle cx="${(ex - 1.2).toFixed(1)}" cy="${(ey - 1.3).toFixed(1)}" r="0.9" fill="#FFFFFF"/>`;
  }
  s += flat(R([[-4, 27], [4, 27], [0, 32]]), deep);
  const tip = smooth(arms[4][0], 3).pop()!;
  s += gem(tip[0], tip[1], 4, '#FFFFFF', '#E9C25B');
  return s;
};

/** Décor : la fosse abyssale, blocs de basalte aspirés éclairés par le disque, neige d'étoiles, créatures des profondeurs. */
const scene = (c: DrawCtx, b: Bounds): string => {
  const r = prng(91 + c.stage);
  let s = facetSky(b.x0, b.y0, b.x1, b.y1, ['#1E1450', '#120C36', '#0B0828', '#130A30', '#05030F'], 7, 24);
  // Lueur du disque qui remonte la fosse.
  s += `<ellipse cx="113" cy="170" rx="110" ry="54" fill="#7A5CFF" opacity="0.12"/><ellipse cx="113" cy="168" rx="64" ry="28" fill="#FFD9A8" opacity="0.08"/>`;
  const rockL: Light = { dir: [0.1, 0.7, 0.6], color: '#C59BFF', shade: '#03020A' };
  const rock = (x: number, y: number, rr: number, seed: number, col: string) => {
    const rr2 = prng(seed);
    const pts: Pt[] = Array.from({ length: 7 }, (_, i) => {
      const a = (i / 7) * Math.PI * 2 + rr2() * 0.4, k = rr * (0.7 + rr2() * 0.45);
      return [x + Math.cos(a) * k, y + Math.sin(a) * k * 0.8] as Pt;
    });
    return facets(pts, col, { ...rockL, dir: [113 - x, 166 - y, 80] }, { size: Math.max(4, rr / 2), relief: 0.9, seed });
  };
  // Crête lointaine de la fosse.
  s += facets([[b.x0, b.y1], [b.x0, 196], [18, 186], [30, 192], [44, 178], [58, 190], [70, 184], [80, 196], [150, 198], [160, 184], [174, 190], [188, 176], [200, 186], [212, 180], [b.x1, 188], [b.x1, b.y1]], '#1A1238', rockL, { size: 18, relief: 0.4, seed: 5 });
  for (const [x, y, rr] of [[26, 44, 11], [192, 128, 9], [16, 122, 7], [206, 22, 8], [62, 18, 5], [150, 30, 4]] as const) s += rock(x, y, rr, Math.round(x + y), '#2C2350');
  // Traînée de débris qui spirale vers le disque.
  for (let i = 0; i < 14; i++) {
    const t = i / 13, x = 34 + t * 78 - Math.sin(t * Math.PI) * 20, y = 48 + t * 118, z = 2.4 - t * 1.6;
    s += `<path d="M${x.toFixed(1)} ${(y - z).toFixed(1)} l${z} ${z} l${-z} ${z} l${-z * 0.8} ${-z} Z" fill="#8C7BB8" opacity="0.8"/>`;
  }
  // Neige d'étoiles qui tombe.
  for (let i = 0; i < 34; i++) s += `<circle cx="${(b.x0 + r() * (b.x1 - b.x0)).toFixed(1)}" cy="${(b.y0 + r() * (b.y1 - b.y0)).toFixed(1)}" r="${(0.5 + r() * 0.9).toFixed(1)}" fill="#E8DEFF" opacity="${(0.35 + r() * 0.5).toFixed(2)}"/>`;
  // Siphonophore lointain : chapelet de perles lumineuses.
  for (let i = 0; i < 8; i++) s += `<circle cx="${(180 + (i % 2 ? 3 : -3)).toFixed(1)}" cy="${20 + i * 12}" r="${(1.9 - i * 0.15).toFixed(1)}" fill="#7CF5E0" opacity="0.55"/>`;
  // Poissons-lanternes et baudroie au leurre lumineux.
  for (const [x, y, k] of [[40, 70, 1], [52, 82, 0.8], [30, 92, 0.85], [186, 206, 1], [198, 218, 0.8]] as const) {
    s += `<path d="M${x} ${y} l${7 * k} ${-3 * k} l${3 * k} ${3 * k} l${-3 * k} ${3 * k} z" fill="#5A4C8A"/><circle cx="${x + 10 * k}" cy="${y}" r="${1.4 * k}" fill="#7CF5E0"/>`;
  }
  s += facets(curve([60, 222], [[[62, 212], [78, 210], [86, 218]], [[90, 214], [94, 214], [94, 222]], [[94, 230], [90, 230], [86, 226]], [[78, 234], [62, 232], [60, 222]]], 4), '#2A1E44', rockL, { size: 4, relief: 0.6, seed: 9 });
  s += `<circle cx="52" cy="206" r="5" fill="#FFE27A" opacity="0.3"/><circle cx="52" cy="206" r="1.8" fill="#FFF4D6"/><polyline points="66,214 60,204 52,206" fill="none" stroke="#2A1E44" stroke-width="0.9"/>`;
  // Avant-plan : gros blocs sombres.
  s += rock(b.x0 + 8, 228, 22, 11, '#1A1430') + rock(b.x1 - 6, 70, 14, 12, '#1A1430') + rock(b.x1 - 14, 226, 16, 13, '#1A1430');
  return s;
};

export const abyssquid: Species = Object.assign(draw, { scene });
