import type { Bounds, DrawCtx, Species } from './style.ts';
import { curve, ellipse, facetSky, facets, gem, hsl, limb, mix, prng, type Light, type Pt } from './lowpoly.ts';

/**
 * Scarabolide (low-poly) : scarabée cuivré, tête au sol et pattes arrière dressées, qui fait rouler à reculons une
 * météorite encore incandescente sur une dune de poussière d'étoiles ; derrière eux, un sillon lumineux.
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

/** Météorite : centre et rayon. */
const M: Pt = [70, 142];
const MR = 46;
const GROUND = 192;

const draw = (c: DrawCtx): string => {
  const h = c.hue;
  const bronze = hsl(h, 50, 38), bronzeD = hsl(h - 10, 45, 18), sheen = hsl(h + 175, 60, 30), gold = '#E9C25B', legC = hsl(h - 15, 35, 16);
  // Lumière principale : la météorite (à gauche), contre-jour turquoise du ciel.
  const light: Light = { dir: [-0.75, -0.35, 0.55], color: '#FFD9A0', shade: '#0A0614', rim: '#7CF5E0' };
  const far: Light = { ...light, color: mix('#FFD9A0', bronzeD, 0.5), rim: undefined };
  const rock: Light = { dir: [0.4, -0.6, 0.6], color: '#FFB070', shade: '#100408' };
  const r = prng(17 + c.stage);
  let s = '';

  // Ombre portée commune.
  s += `<ellipse cx="128" cy="${GROUND + 2}" rx="100" ry="7" fill="#05030C" opacity="0.45" filter="url(#b4)"/>`;

  // Pattes lointaines (derrière le corps).
  const leg = (pts: Pt[], wid: number[], col: string, L: Light, seed: number, spikes = true) => {
    let o = facets(limb(pts, wid), col, L, { size: 4.5, relief: 0.4, seed });
    if (spikes) for (let i = 1; i < pts.length; i++) {
      const [a, b] = [pts[i - 1], pts[i]], m: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
      o += flat([[m[0] - dx / l * 1.5, m[1] - dy / l * 1.5], [m[0] - dy / l * 4.5 + dx / l * 2, m[1] + dx / l * 4.5 + dy / l * 2], [m[0] + dx / l * 1.5, m[1] + dy / l * 1.5]], col);
    }
    return o;
  };
  s += leg([[150, 160], [140, 176], [128, GROUND - 1]], [6, 4.5, 3], legC, far, 1);
  s += leg([[186, 176], [198, 186], [210, GROUND - 1]], [5, 4, 3], legC, far, 2);
  s += leg([[134, 140], [112, 120], [104, 98]], [6, 5, 3.4], legC, far, 3);

  // Météorite incandescente : halo, roche facettée, veines de lave, éclats.
  s += `<circle cx="${M[0]}" cy="${M[1]}" r="${MR + 26}" fill="#FF9A4A" opacity="0.16" filter="url(#b8)"/><circle cx="${M[0]}" cy="${M[1]}" r="${MR + 10}" fill="#FFC870" opacity="0.2"/>`;
  s += facets(ellipse(M[0], M[1], MR, MR * 0.98, 26, 0.2), '#4A2420', rock, { size: 10, relief: 1.6, seed: 4, base2: '#24101A' });
  for (const [x, y, rr, seed] of [[-18, -16, 10, 5], [14, 12, 8, 6], [20, -20, 6, 7], [-14, 22, 7, 8]] as const) s += facets(ellipse(M[0] + x, M[1] + y, rr, rr * 0.8, 9), '#4A1E1C', rock, { size: 5, relief: -0.3, seed, opacity: 0.85 });
  const veins: Pt[][] = [[[-40, -10], [-22, -4], [-8, -14], [6, -6], [24, 2], [42, -4]], [[-8, -14], [-4, -30], [6, -42]], [[6, -6], [8, 14], [-6, 30], [-2, 44]], [[24, 2], [30, 20], [40, 26]], [[-22, -4], [-32, 14], [-30, 30]]];
  for (const v of veins) {
    const pts = v.map(([x, y]) => `${(M[0] + x).toFixed(1)},${(M[1] + y).toFixed(1)}`).join(' ');
    s += `<polyline points="${pts}" fill="none" stroke="#FF7A2A" stroke-width="4" stroke-linejoin="round" opacity="0.7" filter="url(#b2)"/><polyline points="${pts}" fill="none" stroke="#FFE08A" stroke-width="1.3" stroke-linejoin="round"/>`;
  }
  s += `<circle cx="${M[0] - 16}" cy="${M[1] - 22}" r="12" fill="#FFF0C8" opacity="0.18" filter="url(#b4)"/>`;
  for (let i = 0; i < 10; i++) { const a = -Math.PI * (0.2 + r() * 0.9), d = MR + 6 + r() * 22; s += gem(M[0] + Math.cos(a) * d, M[1] + Math.sin(a) * d, 1.2 + r() * 2.4, '#FFF6D8', '#FF9A4A'); }

  // Corps du scarabée : abdomen dressé contre la météorite, tête au sol.
  const abd = poly('M118 118 C128 104 150 102 168 114 C184 124 194 142 196 160 C190 170 176 174 162 170 C144 164 126 150 118 136 C114 128 114 124 118 118 Z');
  s += facets(abd, bronzeD, far, { size: 9, relief: 0.8, seed: 9 });
  // Élytres : deux coques bombées, liseré central, reflets irisés.
  const ely = poly('M116 120 C124 100 148 94 170 106 C188 116 198 134 198 152 C198 160 194 166 186 168 C168 170 146 160 132 148 C120 138 112 130 116 120 Z', 4);
  s += facets(ely, bronze, light, { size: 8, relief: 1.6, seed: 10, base2: mix(bronze, sheen, 0.6) });
  s += facets(poly('M126 112 C140 102 160 102 174 112 C164 108 148 108 134 116 Z', 3), '#FFE6B0', light, { size: 4, relief: 0.3, seed: 11, opacity: 0.6 });
  s += `<path d="M118 124 C140 128 168 142 194 162" fill="none" stroke="${bronzeD}" stroke-width="1.4" opacity="0.9"/><path d="M119 122 C141 126 169 140 195 160" fill="none" stroke="${gold}" stroke-width="0.6" opacity="0.8"/>`;
  for (let k = 0; k < 3; k++) s += `<path d="M${124 + k * 4} ${112 - k * 3} C${146 + k * 2} ${110 - k * 2} ${170 - k * 2} ${124 - k * 4} ${188 - k * 3} ${146 - k * 5}" fill="none" stroke="#FFF0C8" stroke-width="0.5" opacity="${0.35 - k * 0.08}"/>`;
  const cst: Pt[] = [[138, 116], [152, 112], [166, 120], [178, 134], [172, 146]];
  s += `<polyline points="${cst.map((p) => p.join(',')).join(' ')}" fill="none" stroke="${gold}" stroke-width="0.7" opacity="0.85"/>` + cst.map(([x, y]) => gem(x, y, 2.4, '#FFFFFF', gold)).join('');
  // Pronotum (bouclier) et tête-râteau au sol.
  s += facets(poly('M186 164 C192 156 204 156 210 164 C216 172 216 182 210 188 C202 192 192 188 186 180 C182 174 182 168 186 164 Z', 4), mix(bronze, bronzeD, 0.25), light, { size: 6, relief: 1.2, seed: 12 });
  s += facets(poly('M206 182 C212 178 220 182 222 188 L224 192 L218 190 L216 193 L212 190 L208 193 L206 188 C204 186 204 184 206 182 Z', 3), mix(bronzeD, bronze, 0.4), light, { size: 4, relief: 0.6, seed: 13 });
  s += flat([[210, 178], [214, 168], [216, 178]], bronzeD) + gem(214, 168, 2.4, '#FFFFFF', gold);
  s += `<circle cx="209" cy="181" r="1.8" fill="#FFB86B"/><circle cx="208.6" cy="180.6" r="0.6" fill="#FFFFFF"/>`;
  // Antennes en éventail.
  for (const a of [-0.3, 0, 0.3]) s += flat([[215, 182], [219 + Math.cos(-1.2 + a) * 9, 182 + Math.sin(-1.2 + a) * 9], [217, 181]], '#2A1A10');

  // Pattes proches : arrière dressées sur la roche, médianes et avant plantées dans la dune.
  s += leg([[150, 150], [130, 150], [110, 160], [100, 176]], [7, 5.5, 4, 3], mix(legC, bronze, 0.3), light, 20);
  s += leg([[144, 132], [124, 124], [108, 116], [100, 104]], [7, 5.5, 4, 3], mix(legC, bronze, 0.35), light, 21);
  s += leg([[176, 166], [168, 178], [158, GROUND - 1]], [6, 4.5, 3.4], mix(legC, bronze, 0.3), light, 22);
  s += leg([[196, 182], [196, 188], [190, GROUND - 1]], [5, 4.5, 3.4], mix(legC, bronze, 0.3), light, 23, false);
  s += leg([[204, 186], [214, 190], [220, GROUND - 1]], [5, 4, 3], mix(legC, bronze, 0.3), light, 24);
  return s;
};

/** Décor : mer de dunes de poussière d'étoiles sous une galaxie spirale levante, pluie d'étoiles filantes, sillon lumineux. */
const scene = (c: DrawCtx, b: Bounds): string => {
  const r = prng(29 + c.stage);
  let s = facetSky(b.x0, b.y0, b.x1, b.y1, ['#090A24', '#141A44', '#20306A', '#3A4A86', '#6A5A8E', '#2A2440', '#120E20'], 29, 30);
  // Galaxie spirale qui se lève au-dessus des dunes.
  const G: Pt = [150, 62];
  s += `<ellipse cx="${G[0]}" cy="${G[1]}" rx="100" ry="36" fill="#C8B8FF" opacity="0.26" filter="url(#soft)" transform="rotate(-12 ${G[0]} ${G[1]})"/>`;
  for (let arm = 0; arm < 2; arm++) for (let i = 0; i < 60; i++) {
    const t = i / 60, a = arm * Math.PI + t * Math.PI * 2.4, d = 6 + t * 82;
    const x = G[0] + Math.cos(a) * d, y = G[1] + Math.sin(a) * d * 0.32;
    const [rx, ry] = [x - G[0], y - G[1]], ca = Math.cos(-0.21), sa = Math.sin(-0.21);
    s += `<circle cx="${(G[0] + rx * ca - ry * sa + (r() - 0.5) * 6).toFixed(1)}" cy="${(G[1] + rx * sa + ry * ca + (r() - 0.5) * 4).toFixed(1)}" r="${(0.5 + r() * 1.3 * (1 - t * 0.5)).toFixed(2)}" fill="${t < 0.3 ? '#FFE9C0' : '#CFE0FF'}" opacity="${(0.45 + r() * 0.5).toFixed(2)}"/>`;
  }
  s += `<ellipse cx="${G[0]}" cy="${G[1]}" rx="16" ry="7" fill="#FFF0D0" opacity="0.7" filter="url(#b4)" transform="rotate(-12 ${G[0]} ${G[1]})"/>`;
  for (let i = 0; i < 36; i++) s += `<circle cx="${(b.x0 + r() * (b.x1 - b.x0)).toFixed(1)}" cy="${(b.y0 + r() * 150).toFixed(1)}" r="${(0.4 + r() * 1).toFixed(2)}" fill="#FFF6D8" opacity="${(0.4 + r() * 0.6).toFixed(2)}"/>`;
  // Étoiles filantes.
  for (const [x, y, l] of [[150, 10, 40], [196, 34, 28], [110, 40, 22], [40, 8, 30]] as const) s += `<path d="M${x} ${y} l${-l} ${l * 0.45}" stroke="#FFE9C0" stroke-width="1" opacity="0.6" stroke-linecap="round"/>` + gem(x, y, 2.2, '#FFFFFF', '#FFC870');
  // Dunes lointaines puis proches.
  const dune: Light = { dir: [-0.6, -0.5, 0.5], color: '#FFE3B8', shade: '#120A28' };
  const ridge = (y: number, amp: number, k: number, ph: number): Pt[] => Array.from({ length: 13 }, (_, i) => { const x = b.x0 + (i / 12) * (b.x1 - b.x0); return [x, y + Math.sin(i * k + ph) * amp] as Pt; });
  s += facets([...ridge(156, 6, 0.9, 1), [b.x1, 200], [b.x0, 200]], '#4A4270', dune, { size: 26, relief: 0.6, seed: 31 });
  s += facets([...ridge(172, 7, 0.7, 3), [b.x1, 210], [b.x0, 210]], '#6A5A82', dune, { size: 24, relief: 0.6, seed: 32 });
  s += facets([[b.x0, GROUND - 4], [40, GROUND - 2], [110, GROUND + 1], [170, GROUND], [b.x1, GROUND - 3], [b.x1, b.y1], [b.x0, b.y1]], '#A08A9A', dune, { size: 22, relief: 0.5, seed: 33, base2: '#2A2038' });
  // Poussière d'étoiles qui scintille sur la dune.
  for (let i = 0; i < 70; i++) { const x = b.x0 + r() * (b.x1 - b.x0), y = GROUND + r() * (b.y1 - GROUND); s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(0.4 + r() * 0.9).toFixed(2)}" fill="${r() > 0.5 ? '#FFF0C8' : '#CFE8FF'}" opacity="${(0.35 + r() * 0.6).toFixed(2)}"/>`; }
  // Sillon laissé par la météorite (derrière elle, vers la gauche et le bas).
  s += `<path d="M${M[0] - 10} ${GROUND + 2} C${M[0] - 40} ${GROUND + 10} ${b.x0 + 10} ${GROUND + 30} ${b.x0} ${GROUND + 60}" fill="none" stroke="#FF9A4A" stroke-width="10" opacity="0.25" filter="url(#b4)"/>`;
  s += `<path d="M${M[0] - 10} ${GROUND + 2} C${M[0] - 40} ${GROUND + 10} ${b.x0 + 10} ${GROUND + 30} ${b.x0} ${GROUND + 60}" fill="none" stroke="#FFD27A" stroke-width="1.4" opacity="0.7" stroke-dasharray="3 4"/>`;
  // Cailloux d'étoile.
  const peb: Light = { dir: [-0.5, -0.6, 0.6], color: '#FFE3B8', shade: '#0A0614' };
  for (const [x, y, rr] of [[188, 228, 9], [206, 220, 5], [30, 240, 6], [120, 248, 7]] as const) s += facets(ellipse(x, y, rr, rr * 0.6, 9), '#5A4A66', peb, { size: 4.5, relief: 0.8, seed: x });
  return s;
};

export const scarabolide: Species = Object.assign(draw, { scene });
