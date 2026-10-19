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

/** Mèches : polygone en dents (pointes vers la gauche du tracé), refermé le long de la base. */
function spiky(base: Pt[], len: number, inset: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < base.length - 1; i++) {
    const a = base[i], b = base[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], k = Math.hypot(dx, dy) || 1;
    const nx = dy / k, ny = -dx / k, L = len * (0.75 + ((i * 7) % 5) / 10);
    out.push(a, [b[0] + nx * L + dx * 0.4, b[1] + ny * L + dy * 0.4]);
  }
  out.push(base[base.length - 1]);
  for (let i = base.length - 1; i >= 0; i--) {
    const a = base[Math.max(0, i - 1)], b = base[Math.min(base.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], k = Math.hypot(dx, dy) || 1;
    out.push([base[i][0] - dy / k * inset, base[i][1] + dx / k * inset]);
  }
  return out;
}

// Tête : profil local (museau vers +x, longueur 100), pivotée vers la lune.
const HA = -36, HS = 0.86;
const ca = Math.cos((HA * Math.PI) / 180), sa = Math.sin((HA * Math.PI) / 180);
const HX = 180 - HS * (103 * ca - 17 * sa), HY = 30 - HS * (103 * sa + 17 * ca);
const hp = (x: number, y: number): Pt => [HX + HS * (x * ca - y * sa), HY + HS * (x * sa + y * ca)];
/** Mâchoire ouverte : rotation de 24° autour de l'articulation (44, 38), puis repère de la tête. */
const jp = (x: number, y: number): Pt => {
  const r = (24 * Math.PI) / 180, dx = x - 44, dy = y - 38;
  return hp(44 + dx * Math.cos(r) - dy * Math.sin(r), 38 + dx * Math.sin(r) + dy * Math.cos(r));
};
const mapL = (pts: Pt[], m: (x: number, y: number) => Pt) => pts.map((p) => m(p[0], p[1]));
/** Créature et sol réduits ensemble pour laisser le bas de la carte au nom. */
const FIT = 'translate(111 -36) scale(0.9) translate(-111 36)';
const GOLD = '#E9C25B', CREAM = '#FFF6D8';

/**
 * Lunaphage (low-poly) : grand loup cabré qui bondit sur la pleine lune et lui arrache une bouchée ; une patte
 * plante ses griffes dans l'astre, l'éclat brille entre ses crocs. Dos de nuit étoilée, queue de nébuleuse.
 */
const draw = (c: DrawCtx): string => {
  const h = c.hue;
  const base = hsl(h, 32, 46), deep = hsl(h + 15, 42, 20), pale = hsl(h - 10, 30, 78), night = hsl(h + 25, 45, 14);
  const light: Light = { dir: [0.6, -0.65, 0.55], color: '#DDE6FF', shade: '#07051A', rim: '#7CF5E0' };
  const far: Light = { ...light, color: mix('#DDE6FF', deep, 0.5), rim: undefined };
  let s = '';

  // ---------- Lune mordue (facettes nacrées) ----------
  const MX = 180, MY = -14, MR = 56;
  const BX = 188, BY = 38, BR = 22;
  const moon: Pt[] = [];
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2, p: Pt = [MX + Math.cos(a) * MR, MY + Math.sin(a) * MR];
    const d = Math.hypot(p[0] - BX, p[1] - BY);
    if (d < BR) {
      // Morsure : on recule le bord vers le centre de la lune jusqu'à sortir du cercle de la bouchée.
      let q: Pt = p;
      for (let t = 0; t <= 1; t += 0.02) { q = [p[0] + (MX - p[0]) * t, p[1] + (MY - p[1]) * t]; if (Math.hypot(q[0] - BX, q[1] - BY) >= BR) break; }
      moon.push(q);
    } else moon.push(p);
  }
  s += `<circle cx="${MX}" cy="${MY}" r="${MR + 22}" fill="#DDE6FF" opacity="0.12"/><circle cx="${MX}" cy="${MY}" r="${MR + 10}" fill="#DDE6FF" opacity="0.14"/>`;
  s += facets(moon, '#E9EDFF', { dir: [-0.3, -0.4, 0.9], color: '#FFFFFF', shade: '#6F78B8' }, { size: 17.2, relief: 1.6, seed: 3, base2: '#C9D0F2', jitter: 0.18 });
  for (const [x, y, r] of [[MX - 10, MY - 30, 7], [MX + 28, MY - 14, 9], [MX - 36, MY + 20, 6], [MX + 4, MY + 22, 5], [MX + 40, MY + 10, 4], [MX - 20, MY + 42, 4]] as const)
    s += facets(ellipse(x, y, r, r * 0.8, 9), '#B9C1E8', { dir: [0.5, 0.5, 0.6], color: '#FFFFFF', shade: '#6670A8' }, { size: 4.7, relief: 0.8, seed: x });
  s += `<circle cx="${MX}" cy="${MY}" r="${MR + 8}" fill="none" stroke="${GOLD}" stroke-width="0.7" opacity="0.6"/>`;
  // Éclats arrachés qui dérivent.
  for (const [x, y, k] of [[214, 46, 5], [220, 62, 3.5], [204, 60, 2.6], [126, 26, 3], [112, 40, 2]] as const)
    s += `<path d="M${x - k} ${y}L${x} ${y - k}L${x + k} ${y - k * 0.2}Z" fill="#FFFFFF"/><path d="M${x - k} ${y}L${x + k} ${y - k * 0.2}L${x + k * 0.3} ${y + k}Z" fill="#AEB8E8"/>`;

  // ---------- Queue-nébuleuse ----------
  const tail = limb([[48, 192], [26, 204], [6, 190], [-2, 162], [4, 132], [18, 108], [36, 92]], [12, 22, 30, 32, 28, 18, 4]);
  s += facets(tail, night, far, { size: 11.5, relief: 1.2, seed: 5, base2: hsl(h + 60, 45, 30), jitter: 0.25 });
  for (let i = 0; i < 14; i++) {
    const r = prng(90 + i), t = i / 13, x = 36 - t * 36 + (r() - 0.5) * 18, y = 96 + t * 96 + (r() - 0.5) * 10;
    s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(0.7 + r() * 1.1).toFixed(1)}" fill="${CREAM}"/>`;
  }
  // Volutes qui se dissolvent en constellation.
  const tc: Pt[] = [[40, 84], [50, 62], [46, 42], [60, 26], [72, 18]];
  s += `<polyline points="${tc.map((p) => p.join(',')).join(' ')}" fill="none" stroke="${GOLD}" stroke-width="0.7" opacity="0.8"/>` + tc.map(([x, y], i) => gem(x, y, i % 2 ? 2.5 : 3.5, '#FFFFFF', GOLD)).join('');

  // ---------- Membres lointains ----------
  s += facets(limb([[140, 124], [164, 146], [192, 126], [202, 112], [210, 106]], [22, 14, 9, 9, 6]), deep, far, { size: 9.5, relief: 0.7, seed: 7 });
  s += facets(limb([[104, 196], [116, 214], [96, 228], [82, 236], [86, 248], [98, 251]], [22, 15, 10, 9, 8, 5]), deep, far, { size: 9.5, relief: 0.7, seed: 8 });
  // Patte arrière proche (sous le corps).
  s += facets(limb([[64, 196], [92, 212], [72, 228], [54, 236], [58, 247], [70, 251]], [30, 17, 11, 10, 9, 6]), base, light, { size: 10.8, relief: 0.9, seed: 9, base2: deep });
  s += facets(ellipse(64, 249, 8, 3.5, 8), pale, light, { size: 4.1, seed: 10 });

  // ---------- Tronc ----------
  const nb = hp(0, 4), nt = hp(22, 50);
  const body = pathPts(`M${nb[0]} ${nb[1]} C100 100 96 108 96 118 C92 136 78 154 66 168 C56 180 46 186 40 198 C34 210 40 222 54 224 C80 210 102 194 120 184 C140 174 158 164 166 148 C174 130 170 108 160 98 C154 92 148 90 ${nt[0]} ${nt[1]} Z`, 7);
  s += facets(body, base, light, { size: 14.9, relief: 1.5, seed: 11, base2: mix(base, pale, 0.3) });
  // Selle de nuit étoilée sur le dos.
  s += facets(pathPts(`M${nb[0]} ${nb[1]} C108 90 100 100 100 112 C96 132 80 152 66 168 C56 180 46 186 40 198 L52 202 C68 184 86 164 102 150 C116 138 122 120 124 96 Z`, 7), night, far, { size: 11.5, relief: 0.8, seed: 12, base2: hsl(h + 50, 40, 24), jitter: 0.25 });
  const back: Pt[] = [[56, 186], [70, 168], [82, 150], [94, 132], [106, 112]];
  s += `<polyline points="${back.map((p) => p.join(',')).join(' ')}" fill="none" stroke="${GOLD}" stroke-width="0.7" opacity="0.85"/>` + back.map(([x, y], i) => gem(x, y, i % 2 ? 2.4 : 3.2, '#FFFFFF', GOLD)).join('');
  for (let i = 0; i < 12; i++) { const r = prng(140 + i); s += `<circle cx="${(76 + r() * 34 - i * 2).toFixed(1)}" cy="${(120 + i * 6 + r() * 6).toFixed(1)}" r="${(0.5 + r()).toFixed(1)}" fill="${CREAM}" opacity="0.9"/>`; }

  // ---------- Crinière et plastron ----------
  const maneBase: Pt[] = [[94, 136], [96, 122], [100, 108], [106, 94], [114, 82], hp(6, -4), hp(0, 6), hp(-2, 20)];
  s += facets(spiky(maneBase, 12, 6), night, light, { size: 9.5, relief: 0.7, seed: 13, jitter: 0.2 });
  const chestBase: Pt[] = [hp(34, 52), [154, 90], [162, 102], [168, 116], [168, 130], [164, 144], [156, 154]];
  s += facets(spiky(chestBase, 10, 12), pale, light, { size: 9.5, relief: 0.9, seed: 14 });

  // ---------- Patte avant proche, griffes plantées dans la lune ----------
  s += facets(limb([[128, 118], [154, 140], [186, 104], [196, 90], [204, 80]], [30, 17, 11, 11, 7]), mix(base, pale, 0.35), light, { size: 10.8, relief: 0.9, seed: 15, base2: base });
  for (const [x, y] of [[200, 76], [205, 80], [209, 86]] as Pt[]) s += `<path d="M${x} ${y}l4 -7l1 6z" fill="${CREAM}"/>`;

  // ---------- Tête ----------
  const skull = pathPts('M0 0 C10 -8 28 -10 40 -7 C48 -5 52 -2 57 2 C70 6 86 9 97 11 C101 12 104 15 103 19 C102 23 98 24 95 23 C94 26 92 28 89 28 C80 29 70 31 60 33 C54 35 50 38 46 42 C40 48 28 52 16 50 C6 48 -2 40 -4 28 C-6 18 -4 8 0 0 Z', 5);
  const jaw = pathPts('M50 36 C62 33 76 33 88 33 C92 34 92 39 88 41 C76 44 60 46 44 46 Z', 5);
  // Oreille lointaine.
  s += facets(mapL([[6, 2], [-2, -42], [24, -6]], hp), deep, far, { size: 5.4, relief: 0.5, seed: 16 });
  // Gueule (intérieur), mâchoire ouverte, dents.
  s += `<path d="M${mapL([[46, 38], [90, 27], [86, 52]], hp).map((p) => p.map((v) => v.toFixed(1)).join(' ')).join('L')}Z" fill="#14060E"/>`;
  s += facets(mapL(jaw, jp), base, light, { size: 5.4, relief: 0.6, seed: 17, base2: deep });
  const tooth = (pts: Pt[], m: (x: number, y: number) => Pt) => `<path d="M${mapL(pts, m).map((p) => p.map((v) => v.toFixed(1)).join(' ')).join('L')}Z" fill="${CREAM}"/>`;
  s += tooth([[79, 34], [80.5, 26.5], [83, 34]], jp) + tooth([[70, 34.5], [71, 30], [73, 34.5]], jp);
  s += facets(skull.map((p) => hp(p[0], p[1])), base, light, { size: 6.8, relief: 1.2, seed: 18, base2: mix(base, pale, 0.4) });
  // Masque sombre sur le crâne, babines et joues claires.
  s += facets(mapL(pathPts('M0 0 C10 -8 28 -10 40 -7 C48 -5 52 -2 57 2 C70 6 86 9 97 11 C86 12 72 12 60 12 C50 12 42 16 34 22 C22 30 10 30 -3 24 C-5 14 -4 6 0 0 Z', 5), hp), deep, light, { size: 6.1, relief: 0.9, seed: 19 });
  s += facets(mapL(pathPts('M60 33 C54 35 50 38 46 42 C40 48 28 52 16 50 C24 44 30 36 40 30 C50 24 62 20 76 19 C84 18 90 19 95 23 C94 26 92 28 89 28 C80 29 70 31 60 33 Z', 5), hp), pale, light, { size: 5.4, relief: 0.7, seed: 20 });
  s += facets(mapL([[44, 44], [36, 58], [30, 50], [24, 62], [18, 52], [8, 60], [6, 50], [-6, 52], [-4, 40], [20, 44]], hp), pale, light, { size: 5.4, relief: 0.6, seed: 21 });
  s += tooth([[84, 28.5], [85.5, 37], [88, 28]], hp) + tooth([[76, 29.5], [77, 33.5], [78.6, 29.3]], hp);
  // Truffe, oreille proche, œil d'or.
  s += facets(mapL([[97, 11], [103, 16], [102, 22], [95, 23], [94, 16]], hp), '#1A1030', light, { size: 4.1, relief: 0.6, seed: 22 });
  s += facets(mapL([[12, 0], [16, -46], [36, -6]], hp), base, light, { size: 6.1, relief: 0.8, seed: 23 });
  s += facets(mapL([[17, -4], [19, -36], [30, -7]], hp), night, light, { size: 4.1, relief: 0.4, seed: 24 });
  const [ex, ey] = hp(52, 7);
  s += `<path d="M${(ex - 5).toFixed(1)} ${(ey + 1).toFixed(1)}L${(ex + 1).toFixed(1)} ${(ey - 3).toFixed(1)}L${(ex + 5).toFixed(1)} ${(ey - 3.5).toFixed(1)}L${(ex + 1).toFixed(1)} ${(ey + 1.5).toFixed(1)}Z" fill="#FFC84A"/><circle cx="${ex.toFixed(1)}" cy="${(ey - 0.8).toFixed(1)}" r="1.3" fill="#1A0A08"/><circle cx="${ex.toFixed(1)}" cy="${(ey - 1).toFixed(1)}" r="6" fill="#FFC84A" opacity="0.2"/>`;
  // Éclat de lune entre les crocs, gouttes de lumière.
  const [fx, fy] = hp(76, 38);
  s += `<circle cx="${fx.toFixed(1)}" cy="${fy.toFixed(1)}" r="10" fill="#DDE6FF" opacity="0.25"/>` + gem(fx, fy, 7, '#FFFFFF', '#B9C1E8');
  const [dx, dy] = hp(70, 54);
  for (let i = 0; i < 4; i++) s += `<path d="M${(dx + i * 3).toFixed(1)} ${(dy + i * 5).toFixed(1)}l1.4 2.6l-1.4 1.4l-1.4 -1.4z" fill="${CREAM}" opacity="${(0.9 - i * 0.18).toFixed(2)}"/>`;
  s += gem(214, 140, 4, '#FFFFFF', '#BFD7FF') + gem(84, 30, 3.5, '#FFFFFF', '#BFD7FF');
  return `<g transform="${FIT}">${s}</g>`;
};

/** Décor : haut plateau lunaire de nuit (Voie lactée, crêtes, planète annelée, meute lointaine, roche lunaire). */
const scene = (c: DrawCtx, b: Bounds): string => {
  const h = c.hue, r = prng(31);
  let s = facetSky(b.x0, b.y0, b.x1, b.y1, [hsl(h + 15, 50, 7), hsl(h + 5, 45, 15), hsl(h - 10, 40, 24), hsl(h - 25, 35, 30), hsl(h, 40, 10)], 7, 32);
  // Voie lactée : bande de facettes claires translucides.
  s += facets(limb([[-10, 170], [60, 90], [130, 20], [200, -40]], [34, 44, 40, 30]), hsl(h - 20, 40, 60), { dir: [0, 0, 1], color: '#FFFFFF', shade: hsl(h, 40, 20) }, { size: 26, relief: 0.4, seed: 32, opacity: 0.18 });
  for (let i = 0; i < 40; i++) s += `<circle cx="${(b.x0 + r() * (b.x1 - b.x0)).toFixed(1)}" cy="${(b.y0 + r() * 230).toFixed(1)}" r="${(0.4 + r() * r() * 1.4).toFixed(1)}" fill="#F2F4FF" opacity="${(0.4 + r() * 0.6).toFixed(2)}"/>`;
  for (const [x, y, k] of [[20, -10, 3], [96, -24, 2.5], [8, 120, 2.5], [214, 120, 3]] as const) s += gem(x, y, k, '#FFFFFF', '#AFC2FF');
  s += `<g transform="${FIT}">`;
  // Planète annelée qui se lève derrière les crêtes.
  const pl: Light = { dir: [0.6, -0.5, 0.6], color: '#DDE6FF', shade: '#0A0820' };
  s += facets(ellipse(196, 206, 15, 15, 14), hsl(h + 160, 25, 45), pl, { size: 6, relief: 1.2, seed: 33 });
  s += `<ellipse cx="196" cy="206" rx="27" ry="5" fill="none" stroke="#C9D0F2" stroke-width="1.4" opacity="0.7" transform="rotate(-14 196 206)"/>`;
  // Crêtes lointaines (peu contrastées) puis plus proches.
  const ridge: Light = { dir: [0.6, -0.6, 0.5], color: '#7F88C0', shade: hsl(h + 20, 50, 6) };
  s += facets([[b.x0, 214], [10, 204], [22, 208], [40, 196], [58, 206], [76, 200], [96, 210], [120, 202], [140, 208], [158, 198], [176, 210], [200, 204], [214, 212], [b.x1, 206], [b.x1, 244], [b.x0, 244]], hsl(h - 10, 22, 22), ridge, { size: 22, relief: 0.4, seed: 34 });
  // Meute lointaine qui hurle sur la crête.
  for (const [x, y, k] of [[146, 205, 0.9], [160, 200, 0.75], [172, 206, 0.65]] as const)
    s += `<path transform="translate(${x} ${y}) scale(${k})" d="M-5 0 C-7 -4 -6 -9 -2 -11 L0 -15 L0 -19 L2 -17 L7 -21 L5 -16 C3 -13 2 -8 3 0 Z" fill="${hsl(h + 20, 45, 9)}"/>`;
  s += facets([[b.x0, 236], [20, 228], [62, 226], [100, 230], [124, 226], [170, 230], [196, 224], [b.x1, 224], [b.x1, 262], [b.x0, 262]], hsl(h - 5, 25, 15), ridge, { size: 24, relief: 0.4, seed: 35 });
  // Roche lunaire au premier plan, cratères.
  const rock = curve([b.x0 - 4, 250], [[[20, 244], [46, 250], [76, 248]], [[106, 246], [124, 250], [146, 246]], [[170, 242], [196, 238], [b.x1 + 4, 238]]], 16);
  s += facets([...rock, [b.x1 + 4, b.y1 + 40], [b.x0 - 4, b.y1 + 40]], hsl(h - 5, 22, 16), ridge, { size: 26, relief: 0.5, seed: 36, base2: hsl(h + 10, 40, 6) });
  for (const [x, y, rx] of [[196, 246, 10], [124, 256, 7], [30, 258, 8]] as const) s += facets(ellipse(x, y, rx, rx * 0.28, 10), hsl(h - 5, 20, 14), ridge, { size: 4, relief: 0.4, seed: x });
  s += `<ellipse cx="60" cy="252" rx="60" ry="6" fill="#05030C" opacity="0.45" transform="rotate(-4 60 252)"/>`;
  return s + '</g>';
};

export const lunaphage: Species = Object.assign(draw, { scene });
