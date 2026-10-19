import type { Bounds, DrawCtx, Species } from './style.ts';
import { ellipse, facetSky, facets, gem, hsl, limb, mix, prng, type Light, type Pt } from './lowpoly.ts';

/**
 * Serpentaire → Nébulisse → Astrocoatl (low-poly) : serpent de poussière d'étoiles.
 * 0 : le jeune, lové sur les dalles d'un temple en ruine au crépuscule, guette un papillon-étoile. 1 : le jeune nage
 * dans un marais de nébuleuse et chasse le papillon. 2 : l'adulte s'enroule autour d'une étoile naissante posée
 * sur un autel, cou dressé, collerette de plumes célestes, sous une coupole étoilée.
 */

function sm(q: Pt[], per = 3, closed = true): Pt[] {
  const n = q.length, out: Pt[] = [];
  const at = (i: number) => (closed ? q[(i + n) % n] : q[Math.max(0, Math.min(n - 1, i))]);
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const a = at(i - 1), b = at(i), e = at(i + 1), g = at(i + 2);
    for (let k = 0; k < per; k++) {
      const t = k / per, t2 = t * t, t3 = t2 * t;
      const v = (j: 0 | 1) => 0.5 * (2 * b[j] + (-a[j] + e[j]) * t + (2 * a[j] - 5 * b[j] + 4 * e[j] - g[j]) * t2 + (-a[j] + 3 * b[j] - 3 * e[j] + g[j]) * t3);
      out.push([v(0), v(1)]);
    }
  }
  if (!closed) out.push(q[n - 1]);
  return out;
}
const flat = (q: Pt[], col: string, op = 1) => `<path d="M${q.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('L')}Z" fill="${col}"${op < 1 ? ` opacity="${op}"` : ''}/>`;
const GOLD = '#E9C25B';
const constel = (pts: Pt[]) => `<polyline points="${pts.map((p) => p.join(',')).join(' ')}" fill="none" stroke="${GOLD}" stroke-width="0.7" opacity="0.85"/>` + pts.map(([x, y]) => gem(x, y, 3, '#FFFFFF', GOLD)).join('');

interface Cols { base: string; deep: string; belly: string; dark: string; a1: string; a2: string; glow: string }
const colors = (h: number): Cols => ({
  base: hsl(h, 42, 44), deep: hsl(h + 15, 45, 20), belly: hsl(h - 20, 35, 72), dark: hsl(h + 30, 50, 10),
  a1: hsl(h + 140, 60, 60), a2: hsl(h + 200, 60, 64), glow: hsl(h + 40, 90, 78),
});

interface Body { p: Pt[]; w: number[] }

/** Tronçon de corps facetté (i0..i1) : cylindre, plaque ventrale claire, losanges dorsaux semés d'étoiles. */
function tube(k: Cols, L: Light, B: Body, i0: number, i1: number, seed: number): string {
  const p = B.p.slice(i0, i1 + 1), w = B.w.slice(i0, i1 + 1).map((v) => v * 2);
  if (p.length < 2) return '';
  let s = facets(limb(p, w), k.base, L, { size: 5, relief: 1.1, seed, base2: mix(k.base, k.deep, 0.3) });
  // Plaque ventrale : bande claire le long du bord le plus bas.
  let ny = 0;
  const nrm = p.map((_, i) => {
    const a = p[Math.max(0, i - 1)], b = p[Math.min(p.length - 1, i + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const n: Pt = [-(b[1] - a[1]) / l, (b[0] - a[0]) / l];
    ny += n[1];
    return n;
  });
  const sd = ny >= 0 ? 1 : -1;
  const edge = p.map((q, i) => [q[0] + nrm[i][0] * w[i] * 0.5 * sd, q[1] + nrm[i][1] * w[i] * 0.5 * sd] as Pt);
  const inner = p.map((q, i) => [q[0] + nrm[i][0] * w[i] * 0.18 * sd, q[1] + nrm[i][1] * w[i] * 0.18 * sd] as Pt);
  s += flat([...edge, ...inner.reverse()], k.belly, 0.55);
  for (let i = 3; i < p.length - 2; i += 5) {
    const hw = w[i] / 2;
    if (hw < 2.5) continue;
    const [x, y] = [p[i][0] - nrm[i][0] * hw * 0.3 * sd, p[i][1] - nrm[i][1] * hw * 0.3 * sd], [nx, nyy] = nrm[i], tx = nyy, ty = -nx;
    s += flat([[x + tx * hw * 0.8, y + ty * hw * 0.8], [x + nx * hw * 0.4, y + nyy * hw * 0.4], [x - tx * hw * 0.8, y - ty * hw * 0.8], [x - nx * hw * 0.4, y - nyy * hw * 0.4]], k.dark, 0.7);
    s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${Math.min(1.3, hw * 0.16).toFixed(1)}" fill="#FFF6D8"/>`;
  }
  return s;
}

/** Corps en hélice (θ en degrés) prolongé d'un cou lisse ; renvoie aussi les points « devant ». */
function helixBody(o: { th0: number; th1: number; cx: number; cy0: number; cy1: number; rx0: number; rx1: number; ry: number }, neck: Pt[], w: (t: number) => number): { B: Body; front: boolean[] } {
  const p: Pt[] = [], front: boolean[] = [];
  const steps = Math.ceil((o.th1 - o.th0) / 6);
  for (let k = 0; k <= steps; k++) {
    const t = k / steps, th = ((o.th0 + (o.th1 - o.th0) * t) * Math.PI) / 180, rx = o.rx0 + (o.rx1 - o.rx0) * t;
    p.push([o.cx + rx * Math.cos(th), o.cy0 + (o.cy1 - o.cy0) * t + o.ry * Math.sin(th)]);
    front.push(Math.sin(th) > -0.05);
  }
  for (const q of sm([p[p.length - 1], ...neck], 4, false).slice(1)) { p.push(q); front.push(true); }
  return { B: { p, w: p.map((_, i) => w(i / (p.length - 1))) }, front };
}

/** Tronçons arrière, puis `mid` (l'étoile…), puis tronçons avant. */
function drawBody(k: Cols, L: Light, B: Body, front: boolean[], mid = ''): string {
  let back = '', fore = '', a = 0, n = 0;
  for (let i = 1; i <= B.p.length; i++) {
    if (i === B.p.length || front[i] !== front[a]) {
      const e = front[a] ? 1 : 0;
      const t = tube(k, front[a] ? L : { ...L, color: mix(L.color, L.shade, 0.3) }, B, Math.max(0, a - e), Math.min(B.p.length - 1, i + e), 10 + n++);
      if (front[a]) fore += t; else back += t;
      a = i;
    }
  }
  return back + mid + fore;
}

function placeHead(B: Body, extra = 0): string {
  const n = B.p.length, [x, y] = B.p[n - 1], [px, py] = B.p[n - 3];
  return `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${((Math.atan2(y - py, x - px) * 180) / Math.PI + 180 + extra).toFixed(1)})`;
}

/** Tête de couleuvre de profil (museau à gauche, cou en (0, 0)). */
function head(k: Cols, L: Light, o: { crest?: boolean; seed: number }): string {
  let s = '';
  if (o.crest) {
    for (let i = 0; i < 9; i++) {
      const a = ((-160 + i * 18) * Math.PI) / 180, len = 30 + (i % 2 ? -6 : 4), ca = Math.cos(a), sa = Math.sin(a);
      const q: Pt[] = [[2 - sa * 3.6, 2 + ca * 3.6], [2 + ca * len * 0.6 - sa * 5.5, 2 + sa * len * 0.55 + ca * 5.5], [2 + ca * len, 2 + sa * len * 0.9], [2 + ca * len * 0.6 + sa * 5.5, 2 + sa * len * 0.55 - ca * 5.5], [2 + sa * 3.6, 2 - ca * 3.6]];
      s += facets(q, i % 2 ? k.a1 : k.belly, L, { size: 3.5, relief: 0.5, seed: o.seed + i, base2: k.a2 });
      s += gem(2 + ca * len * 0.78, 2 + sa * len * 0.7, 2.2, '#FFFFFF', GOLD);
    }
  }
  s += facets([[4, -6.5], [-8, -9.5], [-19, -9], [-27, -5.5], [-30, -1.5], [-29, 2.5], [-21, 5], [-10, 6.5], [4, 6.5]], k.base, L, { size: 3.5, relief: 0.9, seed: o.seed + 20, base2: k.deep });
  s += facets([[-29, 1.5], [-20, 2.6], [-8, 3], [4, 3.5], [4, 6.5], [-10, 6.5], [-21, 5], [-29, 2.5]], k.belly, L, { size: 3, relief: 0.4, seed: o.seed + 21 });
  s += flat([[-23, -6], [-17, -9], [-11, -6.4], [-17, -7.6]], k.dark);
  s += flat([[-21, -2.6], [-17, -5], [-13, -2.8], [-17, -0.6]], '#FFD27A');
  s += flat([[-17.6, -4.6], [-16.4, -4.6], [-16.4, -0.9], [-17.6, -0.9]], '#0B0618') + `<circle cx="-18.6" cy="-3.6" r="0.6" fill="#FFFFFF"/>`;
  s += `<circle cx="-26.5" cy="-2.6" r="0.8" fill="#0B0618"/>`;
  s += flat([[-30, 0.6], [-38, 1], [-42.5, -1.4], [-38.6, 1.6], [-42.5, 3.8], [-38, 2.2], [-30, 1.8]], hsl(350, 70, 60));
  return s;
}

/** Petit papillon-étoile. */
function moth(k: Cols, L: Light, x: number, y: number, rot: number, seed: number): string {
  let s = `<circle cx="0" cy="0" r="9" fill="${k.glow}" opacity="0.18"/>`;
  for (const sg of [-1, 1]) {
    s += facets([[0, 0], [sg * 4, -10], [sg * 13, -11], [sg * 12, -3]], k.belly, L, { size: 3.5, relief: 0.4, seed: seed + sg });
    s += facets([[0, 0], [sg * 3, 5], [sg * 8, 8], [sg * 8, 3]], k.a2, L, { size: 3, relief: 0.3, seed: seed + 2 + sg });
    s += gem(sg * 7.5, -5, 1.8, '#FFFFFF', GOLD);
  }
  s += flat([[-1, -4], [1, -4], [1, 4], [-1, 4]], '#140A20');
  return `<g transform="translate(${x} ${y}) rotate(${rot})">${s}</g>`;
}

const LIGHTS: Light[] = [
  { dir: [-0.4, -0.7, 0.6], color: '#D8C8FF', shade: '#0C0820', rim: '#9FF0D0' },
  { dir: [0.3, -0.7, 0.6], color: '#E0C8FF', shade: '#080418', rim: '#B48CFF' },
  { dir: [0, -0.2, 0.9], color: '#FFF0C4', shade: '#0A0820', rim: '#FFE9A8' },
];

const draw = (c: DrawCtx): string => {
  const st = Math.min(2, c.stage), k = colors(c.hue), L = LIGHTS[st];
  if (st === 0) {
    const { B, front } = helixBody({ th0: 300, th1: 700, cx: 120, cy0: 192, cy1: 186, rx0: 22, rx1: 46, ry: 14 }, [[154, 172], [140, 156], [116, 148], [94, 150]], (t) => 1.5 + 6.5 * Math.pow(Math.min(1, t * 1.6), 0.8) - (t > 0.88 ? (t - 0.88) * 14 : 0));
    let s = `<ellipse cx="120" cy="200" rx="56" ry="7" fill="#06040E" opacity="0.4"/>` + drawBody(k, L, B, front);
    s += `<g transform="${placeHead(B)} scale(0.95)">${head(k, L, { seed: 40 })}</g>`;
    s += moth(k, L, 66, 128, -18, 50) + gem(170, 140, 2.4, '#FFFFFF', GOLD);
    return `<g transform="translate(111 200) scale(1.4) translate(-118 -186)">${s}</g>`;
  }
  if (st === 1) {
    const p = sm([[206, 104], [190, 112], [200, 126], [180, 140], [146, 140], [124, 154], [138, 174], [116, 190], [80, 188], [62, 172], [50, 160]], 4, false);
    const B: Body = { p, w: p.map((_, i) => { const t = i / (p.length - 1); return 1 + 11.5 * Math.pow(t, 0.7) - (t > 0.9 ? (t - 0.9) * 30 : 0); }) };
    let s = '';
    // Rides de l'eau autour du corps.
    for (let i = 6; i < p.length - 4; i += 9) {
      const [x, y] = p[i], w = B.w[i];
      for (const m of [1.8, 2.8]) s += flat([[x - w * m * 1.5, y + w * 0.3], [x, y + w * m * 0.5], [x + w * m * 1.5, y + w * 0.3], [x, y + w * m * 0.5 - 1.2]], '#E8F0FF', m > 2 ? 0.25 : 0.45);
    }
    s += drawBody(k, L, B, p.map(() => true));
    s += `<g transform="${placeHead(B, -14)} scale(1.55)">${head(k, L, { seed: 40 })}</g>`;
    s += moth(k, L, 30, 110, 10, 50);
    return `<g transform="translate(120 160) scale(1.06) translate(-118 -150)">${s}</g>`;
  }
  // Adulte enroulé autour d'une étoile, sur un autel.
  const ox = 111, oy = 128;
  let star = `<circle cx="${ox}" cy="${oy}" r="52" fill="${k.glow}" opacity="0.16"/><circle cx="${ox}" cy="${oy}" r="38" fill="#FFF6D8" opacity="0.18"/>`;
  star += facets(ellipse(ox, oy, 30, 30, 20), '#FFF2C8', { dir: [0, -0.3, 0.9], color: '#FFFFFF', shade: '#E8A850' }, { size: 7, relief: 1.2, seed: 3 });
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; star += gem(ox + Math.cos(a) * 42, oy + Math.sin(a) * 42, i % 2 ? 2.4 : 3.6, '#FFFFFF', GOLD); }
  const { B, front } = helixBody({ th0: 150, th1: 720, cx: ox, cy0: 204, cy1: 156, rx0: 50, rx1: 64, ry: 20 }, [[184, 128], [186, 100], [170, 78], [146, 70], [124, 64], [104, 62]], (t) => 1.6 + 10.4 * Math.pow(Math.min(1, t * 1.5), 0.8) - (t > 0.9 ? (t - 0.9) * 24 : 0));
  const aL: Light = { dir: [0, -0.5, 0.8], color: '#FFE9B8', shade: '#08061A', rim: '#FFE9A8' };
  let s = facets([[28, 206], [60, 192], [111, 188], [162, 192], [194, 206], [194, 240], [28, 240]], '#3A3460', aL, { size: 12, relief: 0.5, seed: 4, base2: '#141028' });
  for (let i = 0; i < 20; i++) { const a = (i / 20) * Math.PI * 2; s += `<circle cx="${(111 + Math.cos(a) * 70).toFixed(1)}" cy="${(206 + Math.sin(a) * 11).toFixed(1)}" r="0.9" fill="${GOLD}"/>`; }
  s += `<ellipse cx="111" cy="206" rx="64" ry="10" fill="#06040E" opacity="0.4"/>`;
  s += drawBody(k, L, B, front, star);
  s += `<g transform="${placeHead(B, 6)} scale(1.45)">${head(k, L, { crest: true, seed: 60 })}</g>`;
  s += constel([[24, 40], [38, 30], [52, 38], [46, 54]]);
  if (c.stage >= 3) s += constel([[170, 200], [186, 186], [200, 196]]);
  return `<g transform="translate(111 216) scale(0.93) translate(-111 -214)">${s}</g>`;
};

const scene = (c: DrawCtx, b: Bounds): string => {
  const st = Math.min(2, c.stage), r = prng(700 + st), W = b.x1 - b.x0, k = colors(c.hue);
  const starsOf = (n: number, ymax: number) => { let t = ''; for (let i = 0; i < n; i++) t += `<circle cx="${(b.x0 + r() * W).toFixed(1)}" cy="${(b.y0 + r() * (ymax - b.y0)).toFixed(1)}" r="${(0.4 + r() * 0.9).toFixed(1)}" fill="#FFFFFF" opacity="${(0.35 + r() * 0.5).toFixed(2)}"/>`; return t; };
  const stoneL: Light = { dir: [-0.5, -0.6, 0.6], color: '#C8B8F0', shade: '#0A0818' };
  const column = (x: number, y: number, w: number, h: number, broken: boolean, col: string, seed: number) =>
    facets(broken ? [[x - w / 2, y], [x + w / 2, y], [x + w / 2, y - h + 6], [x + w * 0.2, y - h], [x - w * 0.1, y - h + 8], [x - w / 2, y - h + 3]] : [[x - w / 2, y], [x + w / 2, y], [x + w / 2, y - h], [x - w / 2, y - h]], col, stoneL, { size: 9, relief: 0.6, seed })
    + (broken ? '' : facets([[x - w * 0.75, y - h], [x + w * 0.75, y - h], [x + w * 0.75, y - h - 7], [x - w * 0.75, y - h - 7]], col, stoneL, { size: 6, relief: 0.4, seed: seed + 1 }));
  let s = '';
  if (st === 0) {
    // Dalles d'un temple en ruine au crépuscule, mousse, champignons luisants.
    s += facetSky(b.x0, b.y0, b.x1, b.y1, ['#0E0A2A', '#24205A', '#3C3870', '#2A3050', '#121428'], 41, 24) + starsOf(35, 110);
    s += facets([[120, 140], [120, 70], [128, 52], [150, 42], [172, 52], [180, 70], [180, 140], [168, 140], [168, 76], [160, 62], [150, 58], [140, 62], [132, 76], [132, 140]], '#3A3866', stoneL, { size: 10, relief: 0.4, seed: 42 });
    s += column(30, 160, 18, 100, true, '#4A4A78', 43) + column(196, 168, 16, 60, true, '#4A4A78', 45);
    s += facets([[b.x0, 150], [b.x1, 150], [b.x1, b.y1], [b.x0, b.y1]], '#34365E', { dir: [-0.4, -0.8, 0.5], color: '#B8B0E0', shade: '#080818' }, { size: 20, relief: 0.2, seed: 46, base2: '#0E0E22' });
    for (const [x, y, rx] of [[40, 214, 50], [190, 196, 34]]) s += facets(ellipse(x, y, rx, rx * 0.25, 14), '#2A5A50', stoneL, { size: 10, relief: 0.4, seed: x });
    for (const [x, y, m] of [[22, 206, 1], [32, 210, 0.7], [178, 192, 0.8], [200, 196, 1]]) s += `<circle cx="${x}" cy="${y - 6 * m}" r="${9 * m}" fill="${k.glow}" opacity="0.16"/>` + flat([[x - 1, y], [x + 1, y], [x + 1, y - 6 * m], [x - 1, y - 6 * m]], '#D8E8E0') + facets([[x - 5 * m, y - 6 * m], [x, y - 12 * m], [x + 5 * m, y - 6 * m]], k.glow, stoneL, { size: 3, relief: 0.3, seed: x + y });
    return s;
  }
  if (st === 1) {
    // Marais de nébuleuse, roseaux, lucioles.
    s += facetSky(b.x0, b.y0, b.x1, b.y1, ['#06041A', '#140A30', '#22184A', '#141A30', '#06080E'], 51, 24);
    s += facets(ellipse(150, 50, 80, 30, 16), k.a2, { dir: [0, -0.6, 0.7], color: '#FFFFFF', shade: '#140A30' }, { size: 16, relief: 0.4, seed: 52, opacity: 0.3 });
    s += facets(ellipse(70, 70, 56, 20, 14), k.a1, { dir: [0, -0.6, 0.7], color: '#FFFFFF', shade: '#140A30' }, { size: 16, relief: 0.4, seed: 53, opacity: 0.25 });
    s += starsOf(50, 110);
    s += facets([[b.x0, 118], [30, 104], [70, 110], [120, 100], [170, 108], [b.x1, 102], [b.x1, 120], [b.x0, 120]], '#1A1830', stoneL, { size: 12, relief: 0.4, seed: 54 });
    s += facets([[b.x0, 116], [b.x1, 116], [b.x1, b.y1], [b.x0, b.y1]], '#1C2440', { dir: [0, -0.9, 0.5], color: '#9A8CD8', shade: '#04040C' }, { size: 22, relief: 0.15, seed: 55, base2: '#06060E', jitter: 0.2 });
    s += facets(ellipse(150, 150, 70, 12, 14), k.a2, { dir: [0, -0.9, 0.5], color: '#FFFFFF', shade: '#1C2440' }, { size: 14, relief: 0.2, seed: 56, opacity: 0.25 });
    for (let i = 0; i < 16; i++) {
      const x = i < 8 ? b.x0 + r() * 34 : b.x1 - r() * 34, hh = 50 + r() * 50, lean = (r() - 0.5) * 14, y = 236;
      s += flat([[x - 1, y], [x + 1, y], [x + lean + 0.6, y - hh], [x + lean - 0.6, y - hh]], '#0A0A18') + flat([[x + lean - 1.6, y - hh * 0.95], [x + lean + 1.6, y - hh * 0.95], [x + lean + 1.6, y - hh * 0.8], [x + lean - 1.6, y - hh * 0.8]], '#140E20');
    }
    for (let i = 0; i < 12; i++) { const x = b.x0 + r() * W, y = 80 + r() * 120; s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="${k.glow}" opacity="0.2"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.1" fill="#FFF6D8"/>`; }
    return s;
  }
  // Sanctuaire sous une coupole étoilée.
  s += facetSky(b.x0, b.y0, b.x1, b.y1, ['#06041A', '#120A34', '#1E1450', '#140E30'], 61, 24) + starsOf(70, 200);
  const arch: Pt[] = [];
  for (let i = 0; i <= 12; i++) { const a = Math.PI + (i / 12) * Math.PI; arch.push([111 + Math.cos(a) * 85, 100 + Math.sin(a) * 85]); }
  s += facets([[b.x0 - 4, b.y0 - 4], [b.x1 + 4, b.y0 - 4], [b.x1 + 4, 200], [196, 200], ...arch.reverse(), [26, 200], [b.x0 - 4, 200]], '#24203E', stoneL, { size: 18, relief: 0.4, seed: 62 });
  s += constel([[60, 40], [80, 30], [100, 36], [92, 52]]) + constel([[140, 34], [158, 44], [172, 36]]);
  s += column(16, 214, 20, 150, false, '#3A3660', 63) + column(206, 214, 20, 150, false, '#3A3660', 65);
  s += facets([[b.x0, 200], [b.x1, 200], [b.x1, b.y1], [b.x0, b.y1]], '#2A2648', { dir: [0, -0.8, 0.5], color: '#FFE9B8', shade: '#06040E' }, { size: 20, relief: 0.2, seed: 67, base2: '#0A0818' });
  return s;
};

export const serpentaire: Species = Object.assign(draw, { scene });
