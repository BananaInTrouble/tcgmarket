import type { Bounds, DrawCtx, Species } from './style.ts';
import { ellipse, facetSky, facets, gem, hsl, limb, mix, prng, type FacetOpts, type Light, type Pt } from './lowpoly.ts';

/** Facettes un peu plus grandes que demandé (budget : ~1500 facettes par carte). */
const F = (poly: Pt[], col: string, L: Light, o: FacetOpts = {}) => facets(poly, col, L, { ...o, size: (o.size ?? 11) * 1.45 });

/**
 * Médusel → Filastra → Coronéa (low-poly) : méduse stellaire. 0 éphyrule en étoile à huit bras dérivant dans les
 * profondeurs parmi le plancton, 1 jeune méduse qui remonte à travers un récif de nébuleuse, 2 grande méduse
 * couronnée près de la surface éclairée par la lune, au milieu d'un banc de poissons-étoiles.
 */

const CX = 111;
const GOLD = '#E9C25B';
const glow = (x: number, y: number, r: number, col: string, op = 0.22) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="${col}" opacity="${op}"/><circle cx="${x}" cy="${y}" r="${(r * 0.55).toFixed(1)}" fill="${col}" opacity="${op * 1.4}"/>`;
const flat = (pts: Pt[], col: string, op = 1) => `<path d="M${pts.map((p) => p.map((v) => v.toFixed(1)).join(' ')).join(' L')} Z" fill="${col}"${op < 1 ? ` opacity="${op}"` : ''}/>`;

/** Cloche : dôme + bord festonné, en polygone. */
function bell(top: number, rimY: number, w: number, lobes: number): Pt[] {
  const pts: Pt[] = [];
  const h = rimY - top;
  for (let i = 0; i <= 24; i++) {
    const a = Math.PI + (i / 24) * Math.PI;
    pts.push([CX + Math.cos(a) * w, rimY + Math.sin(a) * h * (1 - 0.12 * Math.pow(Math.cos(a), 4))]);
  }
  for (let i = 1; i <= lobes; i++) {
    const x0 = CX + w - ((i - 1) / lobes) * 2 * w, x1 = CX + w - (i / lobes) * 2 * w;
    pts.push([(x0 + x1) / 2, rimY + 5 + Math.sin(((i - 0.5) / lobes) * Math.PI) * 3], [x1, rimY]);
  }
  return pts;
}
/** Ligne ondulée (squelette) qui descend. */
function wave(x: number, y: number, len: number, amp: number, ph: number, drift: number, n = 14): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => { const t = i / n; return [x + Math.sin(t * 7 + ph) * amp * t + drift * t * t, y + len * t] as Pt; });
}

interface Pal { bell: string; bell2: string; arm: string; arm2: string; tent: string; deep: string }
const palOf = (h: number): Pal => ({
  bell: hsl(h, 45, 60), bell2: hsl(h + 30, 45, 34), arm: hsl(h + 150, 50, 56), arm2: hsl(h + 180, 45, 30), tent: hsl(h - 20, 60, 78), deep: hsl(h + 20, 45, 16),
});

function medusa(p: Pal, L: Light, o: { top: number; rim: number; w: number; arms: number; armLen: number; tent: number; tentLen: number; lobes: number; stars: number }, seed: number): string {
  let s = '';
  // Tentacules marginaux (derrière), fins rubans plats.
  for (let i = 0; i < o.tent; i++) {
    const t = (i + 0.5) / o.tent, x = CX - o.w * 0.94 + t * o.w * 1.88;
    const sp = wave(x, o.rim + 2, o.tentLen * (0.75 + 0.25 * Math.sin(i * 2.3)), 3 + (i % 3), i * 1.7, (x - CX) * 0.25);
    s += flat(limb(sp, sp.map((_, k) => 2 - (k / sp.length) * 1.5)), i % 2 ? p.tent : mix(p.tent, p.arm, 0.5), 0.75);
    if (i % 2) s += gem(sp[8][0], sp[8][1], 1.6, '#FFFFFF', GOLD);
  }
  // Bras oraux : rubans froncés en facettes.
  for (const [dx, sway, ph, col] of [[-16, -8, 0, p.arm2], [18, 8, 2, p.arm2], [-6, 6, 4, p.arm], [6, -6, 1, p.arm]] as const) {
    const sp = wave(CX + dx * 0.4, o.rim - 4, o.armLen, 6, ph, dx * 0.8 + sway, 16);
    s += F(limb(sp, sp.map((_, k) => o.arms * (1 - (k / sp.length) * 0.75) * (1 + 0.3 * Math.sin(k * 1.9 + ph)))), col, L, { size: 4.5, relief: 0.7, seed: seed + ph, base2: mix(col, p.deep, 0.5), opacity: 0.9 });
  }
  // Sous-ombrelle.
  s += F(ellipse(CX, o.rim, o.w * 0.98, o.w * 0.14, 18), p.deep, L, { size: 7, relief: 0.4, seed: seed + 7, opacity: 0.85 });
  // Cloche translucide à facettes, nébuleuse et gonades d'or.
  s += F(bell(o.top, o.rim, o.w, o.lobes), p.bell, L, { size: 9, relief: 1.4, seed: seed + 9, base2: p.bell2, opacity: 0.82, jitter: 0.2 });
  const gy = o.top + (o.rim - o.top) * 0.6, r = prng(seed);
  for (const [dx, dy] of [[-0.32, 0], [0.32, 0], [-0.12, -8], [0.12, -8]] as const) {
    const x = CX + dx * o.w, y = gy + dy;
    s += flat([[x - 7, y + 4], [x - 6, y - 3], [x, y - 6], [x + 6, y - 3], [x + 7, y + 4], [x + 4, y + 4], [x + 3, y - 1], [x, y - 3], [x - 3, y - 1], [x - 4, y + 4]], GOLD, 0.9);
  }
  for (let i = 0; i < o.stars; i++) {
    const a = Math.PI + r() * Math.PI, d = Math.sqrt(r()) * 0.85;
    s += gem(CX + Math.cos(a) * o.w * d, o.rim + Math.sin(a) * (o.rim - o.top) * d, 1.2 + r() * 2, '#FFFFFF', '#BFF6FF');
  }
  for (let i = 0; i <= 8; i++) s += `<circle cx="${(CX - o.w * 0.9 + (i / 8) * o.w * 1.8).toFixed(1)}" cy="${(o.rim + 3).toFixed(1)}" r="1.3" fill="${p.tent}"/>`;
  return s;
}

/** Éphyrule : disque-étoile à huit bras bifides. */
function ephyra(p: Pal): string {
  const L: Light = { dir: [-0.3, -0.6, 0.7], color: '#BFF6FF', shade: '#06081A', rim: '#7FF0FF' };
  const arm: Pt[] = [[-15, -30], [-11, -58], [-15, -80], [-9, -90], [0, -78], [9, -90], [15, -80], [11, -58], [15, -30]];
  const pts: Pt[] = [];
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2, co = Math.cos(a), si = Math.sin(a);
    for (const [x, y] of arm) pts.push([x * co - y * si, x * si + y * co]);
    const m = a + Math.PI / 8;
    pts.push([28 * Math.sin(m), -28 * Math.cos(m)]);
  }
  const T = (q: Pt): Pt => { const a = -0.2, x = q[0], y = q[1] * 0.8; return [CX + x * Math.cos(a) - y * Math.sin(a), 118 + x * Math.sin(a) + y * Math.cos(a)]; };
  let s = F(pts.map(T), p.bell, L, { size: 8, relief: 1.2, seed: 3, base2: p.bell2, opacity: 0.88, jitter: 0.22 });
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    const [rx, ry] = T([79 * Math.sin(a), -79 * Math.cos(a)]);
    s += gem(rx, ry, 3, '#FFFFFF', GOLD);
  }
  s += F([[-14, 0], [0, -14], [14, 0], [0, 14]].map((q) => T(q as Pt)), p.tent, L, { size: 4, relief: 0.8, seed: 4 });
  s += glow(CX, 118, 16, '#FFF6D8', 0.25) + gem(CX, 118, 6, '#FFFFFF', '#FFE6A8');
  const r = prng(5);
  for (let i = 0; i < 18; i++) { const a = r() * Math.PI * 2, d = 20 + r() * 50; const [x, y] = T([Math.cos(a) * d, Math.sin(a) * d]); s += gem(x, y, 1 + r() * 1.6, '#FFFFFF', '#BFF6FF'); }
  return s;
}

const draw = (c: DrawCtx): string => {
  const p = palOf(c.hue);
  if (c.stage <= 0) return ephyra(p);
  if (c.stage === 1) {
    const L: Light = { dir: [-0.4, -0.7, 0.6], color: '#C8FFF0', shade: '#061018', rim: '#8FFFE0' };
    return `<g transform="rotate(-16 111 120)">${medusa(p, L, { top: 22, rim: 100, w: 52, arms: 7, armLen: 104, tent: 10, tentLen: 110, lobes: 12, stars: 12 }, 20)}</g>`;
  }
  const L: Light = { dir: [-0.2, -0.9, 0.5], color: '#E8F4FF', shade: '#060A1A', rim: '#BFE8FF' };
  let s = glow(CX, 60, 70, '#BFE8FF', 0.08);
  s += medusa(p, L, { top: 14, rim: 92, w: 74, arms: 9, armLen: 136, tent: 18, tentLen: 138, lobes: 16, stars: 22 }, 40);
  // Couronne d'étoiles et constellation.
  const crown: Pt[] = [[CX - 50, 26], [CX - 30, 12], [CX, 4], [CX + 30, 12], [CX + 50, 26]];
  s += `<polyline points="${crown.map((q) => q.join(',')).join(' ')}" fill="none" stroke="${GOLD}" stroke-width="0.8" opacity="0.8"/>` + crown.map(([x, y], i) => gem(x, y, i === 2 ? 6 : 3.6, '#FFFFFF', GOLD)).join('');
  return s;
};

/* ---------- Décor : océan d'étoiles ---------- */
const fish = (x: number, y: number, k: number, a: number, col: string, dark: string) =>
  `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${a.toFixed(0)}) scale(${k.toFixed(2)})"><path d="M-7 0 L0 -3.4 L6 0 Z" fill="${col}"/><path d="M-7 0 L0 3.2 L6 0 Z" fill="${dark}"/><path d="M5.5 0 L10 -3.4 L9 0 L10 3.4 Z" fill="${dark}"/><circle cx="-4.4" cy="-0.6" r="0.8" fill="#FFFFFF"/></g>`;

const scene = (c: DrawCtx, b: Bounds): string => {
  const { stage, hue } = c;
  const r = prng(31 + stage * 13);
  const W = b.x1 - b.x0, oh = 195 + (((hue % 50) + 50) % 50) - 25;
  const sea: string[] = [[hsl(oh + 10, 55, 14), hsl(oh + 20, 60, 9), hsl(oh + 35, 60, 5)], [hsl(oh, 50, 24), hsl(oh + 10, 55, 14), hsl(oh + 30, 55, 7)], [hsl(oh - 10, 50, 36), hsl(oh, 55, 20), hsl(oh + 25, 55, 8)]][Math.min(2, stage)];
  let s = facetSky(b.x0, b.y0, b.x1, b.y1, sea, 11 + stage, 26);
  // Rayons de lumière venus de la surface.
  const sx = [150, 60, 120][Math.min(2, stage)];
  for (let i = 0; i < 5; i++) { const x = b.x0 + W * (i / 5) + r() * 20, wd = 10 + r() * 18; s += flat([[sx - 8 + i * 4, b.y0 - 10], [x, b.y1], [x + wd, b.y1]], hsl(oh - 20, 60, 85), stage === 0 ? 0.04 : 0.07); }
  for (let i = 0; i < 40; i++) s += `<circle cx="${(b.x0 + r() * W).toFixed(1)}" cy="${(b.y0 + r() * (b.y1 - b.y0)).toFixed(1)}" r="${(0.4 + r()).toFixed(1)}" fill="#FFFFFF" opacity="${(0.2 + r() * 0.5).toFixed(2)}"/>`;
  const L: Light = { dir: [-0.3, -0.8, 0.5], color: hsl(oh - 20, 50, 70), shade: '#03060E' };
  if (stage <= 0) {
    // Profondeurs : petites méduses lointaines, copépodes.
    for (const [x, y, k] of [[34, 50, 0.7], [190, 70, 0.55], [46, 196, 0.5], [184, 184, 0.8]] as const) {
      s += F(bell(y - 10 * k, y, 10 * k, 4).map(([px, py]) => [px - CX + x, py] as Pt), hsl(oh - 20, 40, 50), L, { size: 4, seed: 3, opacity: 0.5 });
      for (const dx of [-5, 0, 5]) s += flat(limb(wave(x + dx * k, y, 20 * k, 1.5, dx, 0, 6), [1.2, 0.4]), hsl(oh - 20, 40, 70), 0.4);
    }
    for (const [x, y, a] of [[160, 30, 20], [24, 120, -30], [204, 130, 60], [80, 226, 10], [140, 214, -20]] as const) s += `<g transform="translate(${x} ${y}) rotate(${a})" opacity="0.7"><path d="M-3 0 L0 -1.6 L3 0 L0 1.6 Z" fill="${hsl(oh + 140, 60, 70)}"/><path d="M-3 0 L-12 -3 L-3 -0.6 Z M-3 0 L-12 3 L-3 0.6 Z" fill="${hsl(oh + 140, 50, 60)}"/></g>`;
  } else if (stage === 1) {
    // Récif de nébuleuse : fond, algues, coraux, poissons.
    s += F([[b.x0, 196], [30, 182], [60, 192], [90, 200], [130, 208], [170, 188], [b.x1, 192], [b.x1, b.y1], [b.x0, b.y1]], hsl(oh + 25, 30, 16), L, { size: 18, relief: 0.6, seed: 41, base2: '#04060C' });
    for (const [x, h, ph] of [[14, 150, 0], [32, 110, 1.4], [196, 140, 2.2], [212, 96, 0.6]] as const) {
      const sp = wave(x, 206, -h, 7, ph, 0, 12);
      s += F(limb(sp, sp.map((_, k) => 9 * (1 - k / 14))), hsl(oh + 70, 35, 30), L, { size: 5, relief: 0.5, seed: 42 + x, opacity: 0.85 });
    }
    const coral = (x: number, y: number, len: number, a: number, d: number, col: string): string => {
      if (d === 0) return gem(x, y, 2, '#FFFFFF', col);
      const x1 = x + Math.cos(a) * len, y1 = y + Math.sin(a) * len;
      return flat(limb([[x, y], [x1, y1]], [d * 1.1, d * 0.8]), col) + coral(x1, y1, len * 0.74, a - 0.42, d - 1, col) + coral(x1, y1, len * 0.74, a + 0.38, d - 1, col);
    };
    s += coral(60, 206, 16, -1.7, 4, hsl(oh + 150, 45, 46)) + coral(166, 200, 18, -1.4, 4, hsl(oh + 110, 45, 50)) + coral(140, 212, 10, -1.9, 3, hsl(oh + 170, 50, 60));
    for (const [x, y, a, k] of [[40, 70, -10, 1.1], [52, 80, -14, 0.9], [186, 50, 190, 1], [176, 60, 186, 0.8]] as const) s += fish(x, y, k, a, hsl(oh + 160, 50, 64), hsl(oh + 160, 45, 36));
  } else {
    // Près de la surface : lune déformée, ondulations, banc de poissons.
    s += glow(sx, b.y0 + 10, 36, '#F0F6FF', 0.18) + gem(sx, b.y0 + 12, 12, '#FFFFFF', '#CFE6FF');
    const wv: Pt[] = [[b.x0, b.y0]];
    for (let i = 0; i <= 10; i++) wv.push([b.x0 + (i / 10) * W, b.y0 + 30 + (i % 2 ? -6 : 4)]);
    wv.push([b.x1, b.y0]);
    s += F(wv, hsl(oh - 15, 50, 46), { ...L, color: '#E8F6FF' }, { size: 14, relief: 0.4, seed: 51, opacity: 0.6 });
    for (let i = 0; i < 16; i++) { const t = i / 16; s += fish(b.x0 + 10 + t * (W - 20), 150 + Math.sin(t * Math.PI * 1.6) * 30 + (i % 3) * 7, 0.7 + (i % 3) * 0.12, -12 + Math.cos(t * 5) * 14, hsl(oh + 20, 40, 60), hsl(oh + 20, 40, 30)); }
  }
  return s;
};

export const medusel: Species = Object.assign(draw, { scene });
