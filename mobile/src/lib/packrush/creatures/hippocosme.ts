import type { Bounds, DrawCtx, Species } from './style.ts';
import { curve, ellipse, facetSky, facets, gem, hsl, limb, mix, prng, type Light, type Pt } from './lowpoly.ts';

/**
 * Hippocosme (low-poly) : hippocampe cosmique de profil, cuirasse annelée et couronne d'étoiles, la queue enroulée
 * autour d'une branche de corail-étoile ; nageoire dorsale en voile translucide. Abysses violets traversés de rais
 * de lumière, fragments de corail qui dérivent.
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
const flat = (p: Pt[], fill: string, op = 1) => `<path d="M${p.map((q) => `${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join('L')}Z" fill="${fill}"${op < 1 ? ` opacity="${op}"` : ''}/>`;
/** Polype en étoile à cinq branches (deux tons). */
function star(x: number, y: number, rr: number, lightC: string, darkC: string, rot = 0): string {
  let o = '';
  for (let i = 0; i < 5; i++) {
    const a = rot - Math.PI / 2 + (i / 5) * Math.PI * 2, b1 = a - Math.PI / 5, b2 = a + Math.PI / 5;
    const tip: Pt = [x + Math.cos(a) * rr, y + Math.sin(a) * rr];
    o += flat([[x, y], tip, [x + Math.cos(b1) * rr * 0.42, y + Math.sin(b1) * rr * 0.42]], lightC) + flat([[x, y], tip, [x + Math.cos(b2) * rr * 0.42, y + Math.sin(b2) * rr * 0.42]], darkC);
  }
  return o;
}
/** Branche de corail-étoile : tige ramifiée, polypes lumineux aux extrémités. */
function coral(trunk: Pt[], wid: number[], branches: [number, Pt][], col: string, tip: string, L: Light, seed: number): string {
  let o = '';
  for (const [k, end] of branches) {
    const a = trunk[k];
    o += facets(limb([a, [(a[0] + end[0]) / 2 + 3, (a[1] + end[1]) / 2], end], [wid[k] * 0.7, wid[k] * 0.5, 2.4]), col, L, { size: 5, relief: 0.5, seed: seed + k });
  }
  o += facets(limb(trunk, wid), col, L, { size: 6, relief: 0.6, seed });
  for (const [, end] of branches) o += `<circle cx="${end[0]}" cy="${end[1]}" r="6" fill="${tip}" opacity="0.3" filter="url(#b2)"/>` + star(end[0], end[1], 5, '#FFF6E8', tip, end[0] * 0.1);
  const last = trunk[trunk.length - 1];
  return o + `<circle cx="${last[0]}" cy="${last[1]}" r="7" fill="${tip}" opacity="0.3" filter="url(#b2)"/>` + star(last[0], last[1], 6, '#FFF6E8', tip, 0.3);
}

const draw = (c: DrawCtx): string => {
  const h = c.hue;
  const base = hsl(h, 42, 50), deep = hsl(h + 15, 45, 24), belly = hsl(h - 35, 45, 74), fin = hsl(h - 120, 55, 70), gold = '#E9C25B';
  const coralC = hsl(h + 50, 50, 46), coralTip = hsl(h + 70, 85, 66);
  const light: Light = { dir: [-0.45, -0.7, 0.6], color: '#FFF0FF', shade: '#0A0420', rim: '#7CF5E0' };
  const far: Light = { ...light, color: mix('#FFF0FF', deep, 0.5), rim: undefined };
  const glass: Light = { dir: [-0.3, -0.8, 0.5], color: '#FFFFFF', shade: hsl(h + 20, 50, 20), rim: '#BFF6FF' };
  let s = '';

  // Branche de corail-étoile (derrière la queue).
  s += coral([[150, 244], [140, 222], [128, 200], [116, 186], [100, 176], [84, 170]], [11, 10, 8, 7, 6, 5], [[1, [178, 210]], [2, [160, 176]], [3, [126, 160]], [4, [88, 154]]], coralC, coralTip, far, 1);

  // Nageoire dorsale : voile translucide à rayons, sur le dos.
  const D: Pt = [140, 118];
  const fpts: Pt[] = [[136, 96]];
  for (let i = 0; i <= 8; i++) { const a = -0.9 + (i / 8) * 1.8; fpts.push([D[0] + Math.cos(a) * 28 + 4, D[1] + Math.sin(a) * 26]); }
  fpts.push([132, 140]);
  s += facets(fpts, fin, glass, { size: 6, relief: 0.3, seed: 2, opacity: 0.7, base2: hsl(h - 80, 55, 60) });
  for (let i = 0; i <= 8; i++) { const a = -0.9 + (i / 8) * 1.8; s += `<line x1="${D[0] - 4}" y1="${D[1]}" x2="${(D[0] + Math.cos(a) * 28 + 4).toFixed(1)}" y2="${(D[1] + Math.sin(a) * 26).toFixed(1)}" stroke="#E8FFFF" stroke-width="0.6" opacity="0.6"/>`; }

  // Corps en S : cou, ventre bombé, queue préhensile enroulée autour du corail.
  const spine: Pt[] = [[110, 56], [122, 72], [128, 92], [128, 114], [122, 136], [112, 154], [104, 170], [100, 186], [106, 200], [120, 204], [132, 196], [132, 184], [124, 178]];
  const wid = [26, 26, 32, 38, 36, 28, 20, 15, 12, 10, 8, 6, 4];
  s += facets(limb(spine, wid), base, light, { size: 7, relief: 1.3, seed: 3, base2: mix(base, deep, 0.4) });
  // Ventre (poitrail bombé, vers l'avant).
  s += facets(poly('M106 70 C98 84 98 104 104 124 C108 138 110 148 112 154 C118 142 120 128 118 112 C116 96 114 82 106 70 Z', 4), belly, light, { size: 6, relief: 0.9, seed: 4, base2: mix(belly, base, 0.4) });
  // Anneaux de cuirasse et tubercules du dos.
  for (let i = 1; i < spine.length - 1; i++) {
    const a = spine[i - 1], b = spine[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
    for (const f of [0.33, 0.66]) {
      const p0 = spine[i], p1 = spine[i + 1], q: Pt = [p0[0] + (p1[0] - p0[0]) * f, p0[1] + (p1[1] - p0[1]) * f], w = (wid[i] + (wid[i + 1] - wid[i]) * f) / 2;
      s += `<path d="M${(q[0] - nx * w * 0.92).toFixed(1)} ${(q[1] - ny * w * 0.92).toFixed(1)} Q${(q[0] + dx / l * 2).toFixed(1)} ${(q[1] + dy / l * 2).toFixed(1)} ${(q[0] + nx * w * 0.92).toFixed(1)} ${(q[1] + ny * w * 0.92).toFixed(1)}" fill="none" stroke="${deep}" stroke-width="0.9" opacity="0.55"/>`;
      if (i < 9) { const k: Pt = [q[0] - nx * w, q[1] - ny * w]; s += flat([[k[0] - dx / l * 2, k[1] - dy / l * 2], [k[0] - nx * 3.5, k[1] - ny * 3.5], [k[0] + dx / l * 2, k[1] + dy / l * 2]], mix(base, '#FFFFFF', 0.25)); }
    }
  }
  // Constellation d'or le long du ventre.
  const cst: Pt[] = [[112, 96], [116, 110], [114, 124], [116, 138]];
  s += `<polyline points="${cst.map((p) => p.join(',')).join(' ')}" fill="none" stroke="${gold}" stroke-width="0.7" opacity="0.85"/>` + cst.map(([x, y]) => gem(x, y, 2.4, '#FFFFFF', gold)).join('');
  // Brin de corail devant la queue (l'enroulement passe derrière).
  s += facets(limb([[128, 194], [118, 186], [110, 182]], [7, 6.5, 6]), coralC, light, { size: 4.5, relief: 0.5, seed: 5 });

  // Tête : crâne, museau en trompe, joue, couronne d'étoiles, œil.
  s += facets(poly('M96 46 C98 36 108 30 118 32 C126 36 130 46 128 56 C126 66 118 74 108 74 C100 72 94 64 94 56 Z', 4), base, light, { size: 6, relief: 1.2, seed: 6, base2: mix(base, deep, 0.25) });
  s += facets(limb([[98, 52], [84, 56], [70, 58], [62, 58]], [15, 9, 7, 8]), mix(base, belly, 0.2), light, { size: 4.5, relief: 0.6, seed: 7 });
  s += facets(poly('M100 58 C104 64 110 68 116 66 C114 62 110 58 104 56 Z', 3), belly, light, { size: 4, relief: 0.4, seed: 8 });
  // Nageoire pectorale derrière la tête.
  s += facets([[124, 62], [138, 54], [142, 62], [136, 70], [126, 70]], fin, glass, { size: 4.5, relief: 0.3, seed: 9, opacity: 0.75 });
  // Couronne : pics facettés terminés par des étoiles.
  for (const [x0, tip] of [[106, [100, 16]], [112, [112, 12]], [118, [124, 18]], [122, [134, 28]]] as [number, Pt][]) {
    s += facets([[x0 - 3, 36], tip, [x0 + 3, 36]], mix(base, '#FFFFFF', 0.15), light, { size: 4, relief: 0.4, seed: x0 });
    s += gem(tip[0], tip[1], 3, '#FFFFFF', gold);
  }
  s += `<circle cx="104" cy="47" r="4.6" fill="#0B0618"/><circle cx="104" cy="47" r="3.3" fill="${hsl(h - 110, 85, 62)}"/><circle cx="104.3" cy="47.3" r="1.6" fill="#0B0618"/><circle cx="102.7" cy="45.6" r="1" fill="#FFFFFF"/>`;
  s += `<path d="M98.5 44 Q104 40.5 109.5 44" fill="none" stroke="${deep}" stroke-width="1.2" stroke-linecap="round"/>`;
  return s;
};

/** Décor : abysses violets, rais de lumière, récif de corail-étoile, fragments de corail à la dérive, bulles d'astres. */
const scene = (c: DrawCtx, b: Bounds): string => {
  const h = c.hue;
  const r = prng(47 + c.stage);
  let s = facetSky(b.x0, b.y0, b.x1, b.y1, ['#2A1A5A', '#22164E', '#1A1244', '#140E38', '#0E0A2A', '#08061C'], 37, 28);
  // Rais de lumière tombant de la surface.
  for (const [x, w, op] of [[40, 30, 0.12], [96, 22, 0.1], [170, 36, 0.13], [210, 18, 0.08]] as const) {
    s += `<path d="M${x - w / 2} ${b.y0} L${x + w / 2} ${b.y0} L${x + w * 1.6 - 30} 260 L${x - w * 0.4 - 30} 260 Z" fill="#E8D8FF" opacity="${op}" filter="url(#b4)"/>`;
  }
  s += `<ellipse cx="120" cy="${b.y0 + 4}" rx="140" ry="22" fill="#D8C8FF" opacity="0.18" filter="url(#soft)"/>`;
  for (let i = 0; i < 34; i++) s += `<circle cx="${(b.x0 + r() * (b.x1 - b.x0)).toFixed(1)}" cy="${(b.y0 + r() * 230).toFixed(1)}" r="${(0.4 + r() * 1).toFixed(2)}" fill="#FFF6E8" opacity="${(0.35 + r() * 0.6).toFixed(2)}"/>`;
  // Bulles-astres.
  for (let i = 0; i < 14; i++) {
    const x = 50 + r() * 60, y = b.y0 + 10 + r() * 50, rr = 1.2 + r() * 2.8;
    s += `<circle cx="${(x + (i % 2 ? 8 : -6)).toFixed(1)}" cy="${(y + i * 2).toFixed(1)}" r="${rr.toFixed(1)}" fill="none" stroke="#E8F6FF" stroke-width="0.6" opacity="0.6"/><circle cx="${(x + (i % 2 ? 8 : -6) - rr * 0.35).toFixed(1)}" cy="${(y + i * 2 - rr * 0.35).toFixed(1)}" r="${(rr * 0.25).toFixed(1)}" fill="#FFFFFF" opacity="0.7"/>`;
  }
  // Récif lointain.
  const reefL: Light = { dir: [-0.5, -0.6, 0.6], color: '#C8B0FF', shade: '#06041A' };
  s += facets([[b.x0, 200], [20, 186], [44, 194], [70, 180], [100, 196], [150, 188], [190, 176], [b.x1, 186], [b.x1, 240], [b.x0, 240]], '#2E2264', reefL, { size: 20, relief: 0.6, seed: 11, base2: '#160E3A' });
  for (const [x, y, k, hh] of [[24, 182, 1, h + 70], [196, 172, 1.1, h + 140], [60, 186, 0.7, h + 100], [168, 184, 0.7, h + 70]] as const) {
    s += coral([[x, y + 30 * k], [x - 2, y + 10 * k], [x + 2, y - 8 * k]], [6 * k, 5 * k, 3 * k], [[1, [x - 14 * k, y - 4 * k]], [0, [x + 14 * k, y + 4 * k]]], hsl(hh, 40, 34), hsl(hh, 80, 62), reefL, x);
  }
  // Fragments de corail-étoile à la dérive.
  for (const [x, y, k, rot, hh] of [[30, 60, 0.9, 0.5, h + 70], [196, 40, 0.8, -0.6, h + 120], [192, 120, 0.6, 1.2, h + 60], [36, 128, 0.55, -1, h + 140]] as const) {
    const ca = Math.cos(rot), sa = Math.sin(rot), P = (dx: number, dy: number): Pt => [x + (dx * ca - dy * sa) * k, y + (dx * sa + dy * ca) * k];
    s += `<circle cx="${x}" cy="${y}" r="${22 * k}" fill="${hsl(hh, 80, 62)}" opacity="0.1" filter="url(#b4)"/>`;
    s += coral([P(0, 14), P(0, 0), P(0, -14)], [4 * k, 3.5 * k, 2.5 * k], [[1, P(-12, -8)], [1, P(11, -10)]], hsl(hh, 45, 40), hsl(hh, 85, 66), reefL, x + 3);
  }
  // Sable des abysses au premier plan.
  s += facets([[b.x0, 236], [60, 230], [130, 238], [b.x1, 232], [b.x1, b.y1], [b.x0, b.y1]], '#1E1648', reefL, { size: 24, relief: 0.4, seed: 21, base2: '#0A0820' });
  for (let i = 0; i < 30; i++) s += `<circle cx="${(b.x0 + r() * (b.x1 - b.x0)).toFixed(1)}" cy="${(236 + r() * 90).toFixed(1)}" r="${(0.4 + r() * 0.8).toFixed(2)}" fill="#D8C8FF" opacity="${(0.3 + r() * 0.5).toFixed(2)}"/>`;
  return s;
};

export const hippocosme: Species = Object.assign(draw, { scene });
