import { constellation, eyeA, gild, ground, ink, line, rim, shadow, sparkle, type DrawCtx, type Species } from './style.ts';

/**
 * Serpentaire → Nébulisse → Astrocoatl : serpent de poussière d'étoiles. Planche d'herpétologie céleste : corps
 * cylindrique gravé (écailles ventrales, losanges dorsaux semés d'étoiles), tête de couleuvre à pupille fendue.
 * Le jeune se love au sol, le sub-adulte se dresse en S, l'adulte s'enroule autour d'une étoile naissante et
 * déploie une collerette de plumes célestes.
 */

const f = (v: number) => +v.toFixed(1);
type P2 = [number, number];
type Pt = [number, number] | [number, number, number];

function cr(q: Pt[], closed = false): string {
  const p = closed ? [q[q.length - 1], ...q, q[0], q[1]] : [q[0], ...q, q[q.length - 1]];
  let d = `M${f(q[0][0])} ${f(q[0][1])}`;
  for (let i = 1; i < p.length - 2; i++) {
    const a = p[i - 1], b = p[i], e = p[i + 1], g = p[i + 2];
    const k1 = b[2] ? 0 : 1 / 6, k2 = e[2] ? 0 : 1 / 6;
    d += ` C${f(b[0] + (e[0] - a[0]) * k1)} ${f(b[1] + (e[1] - a[1]) * k1)} ${f(e[0] - (g[0] - b[0]) * k2)} ${f(e[1] - (g[1] - b[1]) * k2)} ${f(e[0])} ${f(e[1])}`;
  }
  return closed ? d + 'Z' : d;
}

/** Points denses le long d'une courbe Catmull-Rom. */
function sample(q: P2[], per = 8): P2[] {
  const p = [q[0], ...q, q[q.length - 1]], out: P2[] = [];
  for (let i = 1; i < p.length - 2; i++) {
    const a = p[i - 1], b = p[i], e = p[i + 1], g = p[i + 2];
    for (let k = 0; k < per; k++) {
      const t = k / per, t2 = t * t, t3 = t2 * t;
      const v = (j: 0 | 1) => 0.5 * (2 * b[j] + (-a[j] + e[j]) * t + (2 * a[j] - 5 * b[j] + 4 * e[j] - g[j]) * t2 + (-a[j] + 3 * b[j] - 3 * e[j] + g[j]) * t3);
      out.push([v(0), v(1)]);
    }
  }
  out.push(q[q.length - 1]);
  return out;
}

const poly = (q: P2[]) => q.map(([x, y], i) => `${i ? 'L' : 'M'}${f(x)} ${f(y)}`).join('');
const clip = (id: string, d: string, inner: string) => `<clipPath id="${id}"><path d="${d}"/></clipPath><g clip-path="url(#${id})">${inner}</g>`;

interface Body { p: P2[]; w: number[]; n: P2[] }

function normals(p: P2[]): P2[] {
  return p.map((_, i) => {
    const a = p[Math.max(0, i - 1)], b = p[Math.min(p.length - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    return [-dy / l, dx / l] as P2;
  });
}

/**
 * Tronçon de corps (indices i0..i1) : cylindre gravé. Le ventre (écailles ventrales claires) est du côté du bord
 * le plus bas ; le dos porte des losanges sombres et une poussière d'étoiles.
 */
function tube(c: DrawCtx, id: string, B: Body, i0: number, i1: number, o: { stars?: number } = {}): string {
  const { pal } = c;
  const idx = Array.from({ length: i1 - i0 + 1 }, (_, k) => i0 + k);
  let ny = 0;
  for (const i of idx) ny += B.n[i][1];
  const sd = ny >= 0 ? 1 : -1; // côté ventral (bord bas)
  const off = (i: number, k: number): P2 => [B.p[i][0] + B.n[i][0] * B.w[i] * k * sd, B.p[i][1] + B.n[i][1] * B.w[i] * k * sd];
  const V = idx.map((i) => off(i, 1)), D = idx.map((i) => off(i, -1));
  const shape = poly(V) + 'L' + poly(D.slice().reverse()).slice(1) + 'Z';
  let g = `<path d="${shape}" fill="${pal.body}"/>`;
  // Écailles (croisillons fins) sur tout le corps.
  g += `<path d="${shape}" fill="url(#xhatch)" opacity="0.35"/>`;
  // Ombre propre côté ventre, plaque ventrale claire.
  const sh = idx.map((i) => off(i, 0.15));
  g += shadow(poly(V) + 'L' + poly(sh.slice().reverse()).slice(1) + 'Z', pal.shade, 0.75, 'fine');
  const bl = idx.map((i) => off(i, 0.55));
  g += `<path d="${poly(V)}L${poly(bl.slice().reverse()).slice(1)}Z" fill="${pal.belly}" opacity="0.85"/>`;
  for (let k = 0; k < idx.length; k += 2) {
    const i = idx[k], a = off(i, 0.55), b = off(i, 1);
    g += `<path d="M${f(a[0])} ${f(a[1])} L${f(b[0])} ${f(b[1])}" stroke="${pal.ink}" stroke-width="0.6" opacity="0.65"/>`;
  }
  g += `<path d="${poly(V)}L${poly(bl.slice().reverse()).slice(1)}Z" fill="url(#fine)" opacity="0.6"/>`;
  // Losanges dorsaux.
  for (let k = 3; k < idx.length - 2; k += 6) {
    const i = idx[k], w = B.w[i];
    if (w < 3) continue;
    const [x, y] = off(i, -0.35), [nx, ny2] = B.n[i], tx = ny2, ty = -nx;
    const d = `M${f(x + tx * w * 0.9)} ${f(y + ty * w * 0.9)} L${f(x + nx * w * 0.4)} ${f(y + ny2 * w * 0.4)} L${f(x - tx * w * 0.9)} ${f(y - ty * w * 0.9)} L${f(x - nx * w * 0.4)} ${f(y - ny2 * w * 0.4)}Z`;
    g += `<path d="${d}" fill="${pal.deep}" opacity="0.8" stroke="${pal.ink}" stroke-width="0.5"/>`;
    g += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(Math.min(1.4, w * 0.16))}" fill="#FFF6D8"/>`;
  }
  // Poussière d'étoiles sur le dos.
  for (let k = 0; k < idx.length; k++) {
    if (c.r() > (o.stars ?? 0.35)) continue;
    const i = idx[k], [x, y] = off(i, -0.2 - c.r() * 0.6);
    g += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(0.4 + c.r() * 0.7)}" fill="#FFF6D8" opacity="0.9"/>`;
  }
  let s = clip(id, shape, g);
  s += `<path d="${poly(V)}" fill="none" stroke="${pal.ink}" stroke-width="1.6" stroke-linejoin="round"/>`;
  s += `<path d="${poly(D)}" fill="none" stroke="${pal.ink}" stroke-width="1.6" stroke-linejoin="round"/>`;
  s += rim(poly(idx.map((i) => off(i, -0.78))), pal.glow, 1);
  return s;
}

/** Tête de serpent de profil (museau à gauche), jonction du cou en (0, 0). */
function head(c: DrawCtx, id: string, k: number, o: { tongue?: boolean; crest?: boolean } = {}): string {
  const { pal } = c;
  let s = '';
  if (o.crest) {
    // Collerette de plumes célestes (derrière la tête).
    for (let i = 0; i < 9; i++) {
      const a = (-160 + i * 18) * Math.PI / 180, L = 30 + (i % 2 ? -6 : 4);
      const x1 = 2 + Math.cos(a) * L, y1 = Math.sin(a) * L * 0.9 + 2, nx = -Math.sin(a) * 3.6, ny = Math.cos(a) * 3.6;
      const d = `M${f(2 + nx)} ${f(2 + ny)} Q${f(2 + Math.cos(a) * L * 0.6 + nx * 1.6)} ${f(2 + Math.sin(a) * L * 0.55 + ny * 1.6)} ${f(x1)} ${f(y1)} Q${f(2 + Math.cos(a) * L * 0.6 - nx * 1.6)} ${f(2 + Math.sin(a) * L * 0.55 - ny * 1.6)} ${f(2 - nx)} ${f(2 - ny)}Z`;
      s += ink(d, i % 2 ? pal.accent : pal.light, 1);
      s += line(`M2 2 L${f(2 + Math.cos(a) * L * 0.9)} ${f(2 + Math.sin(a) * L * 0.81)}`, 0.6, pal.ink, ' opacity="0.7"');
      s += `<circle cx="${f(2 + Math.cos(a) * L * 0.78)}" cy="${f(2 + Math.sin(a) * L * 0.7)}" r="1.5" fill="${pal.gold}"/>`;
    }
  }
  const hdq: Pt[] = [[4, -6.5], [-8, -9.5], [-19, -9], [-27, -5.5], [-30, -1.5], [-29, 2.5], [-21, 5], [-10, 6.5], [4, 6.5]];
  const hd = cr(hdq, true);
  s += `<path d="${hd}" fill="${pal.body}"/>`;
  s += clip(`${id}-h`, hd,
    `<path d="${cr([[-30, 1], [-20, 2.5], [-8, 3], [4, 4], [4, 9], [-30, 9]], true)}" fill="${pal.belly}"/>`
    + shadow(cr([[-24, 3.5], [-8, 4.5], [4, 4], [4, 9], [-24, 9]], true), pal.shade, 0.6, 'fine')
    + `<path d="M-4 -10 L4 -10 L4 2 Q-2 -2 -6 -6Z" fill="${pal.deep}" opacity="0.6"/>`
    // Plaques céphaliques.
    + line('M-24 -6 Q-20 -8.5 -14 -8.8 M-14 -8.8 Q-10 -6 -6 -8.6 M-6 -8.6 Q-2 -6 2 -7', 0.6, pal.ink, ' opacity="0.7"')
    + line('M-28 1 L-26 3 M-24 2 L-22 4.3 M-20 2.6 L-18 5 M-16 3 L-14 5.4 M-12 3.2 L-10 5.8', 0.5, pal.ink, ' opacity="0.6"'));
  // Arcade sourcilière, œil, narine, commissure.
  s += eyeA(-17, -2.6, 3.4 * k, pal.eye, { angle: -4, slit: true, open: 0.5 });
  s += line('M-23 -5.8 Q-17 -9 -11 -6.2', 1.3);
  s += `<ellipse cx="-26.5" cy="-2.6" rx="1" ry="0.7" fill="${pal.ink}"/>`;
  s += line('M-29 1.5 Q-20 3 -9 3.2', 0.9);
  if (o.tongue) s += line('M-30 1 L-38 1.5 L-42 -1 M-38 1.5 L-42 3.6', 0.9, pal.accent);
  s += line(cr(hdq.slice(0, 9)), 1.6);
  s += rim('M-27 -5.5 Q-19 -9.5 -8 -9.5 L2 -7', pal.glow, 0.9);
  return s;
}

/** Corps en hélice (θ en degrés) suivi d'un cou lisse jusqu'à la tête. */
function helixBody(loops: { th0: number; th1: number; cx: number; cy0: number; cy1: number; rx0: number; rx1: number; ry: number }, neck: P2[], w: (t: number) => number): { B: Body; front: boolean[] } {
  const { th0, th1, cx, cy0, cy1, rx0, rx1, ry } = loops;
  const p: P2[] = [], front: boolean[] = [];
  const steps = Math.ceil((th1 - th0) / 5);
  for (let k = 0; k <= steps; k++) {
    const t = k / steps, th = ((th0 + (th1 - th0) * t) * Math.PI) / 180, rx = rx0 + (rx1 - rx0) * t;
    p.push([cx + rx * Math.cos(th), cy0 + (cy1 - cy0) * t + ry * Math.sin(th)]);
    front.push(Math.sin(th) > -0.05);
  }
  const nk = sample([p[p.length - 1], ...neck], 8).slice(1);
  for (const q of nk) { p.push(q); front.push(true); }
  const ws = p.map((_, i) => w(i / (p.length - 1)));
  return { B: { p, w: ws, n: normals(p) }, front };
}

/** Dessine le corps : tronçons arrière, puis `mid` (ex. l'étoile), puis tronçons avant. */
function drawBody(c: DrawCtx, id: string, B: Body, front: boolean[], mid = ''): string {
  const runs: { a: number; b: number; fr: boolean }[] = [];
  let a = 0;
  for (let i = 1; i <= B.p.length; i++) {
    if (i === B.p.length || front[i] !== front[a]) {
      const e = front[a] ? 2 : 0;
      runs.push({ a: Math.max(0, a - e), b: Math.min(B.p.length - 1, i + e), fr: front[a] });
      a = i;
    }
  }
  let back = '', fore = '';
  runs.forEach((r, k) => {
    const t = tube(c, `${id}-t${k}`, B, r.a, r.b);
    if (r.fr) fore += t; else back += t;
  });
  return back + mid + fore;
}

function placeHead(B: Body, extra = 0): string {
  const n = B.p.length, [x, y] = B.p[n - 1], [px, py] = B.p[n - 3];
  const ang = (Math.atan2(y - py, x - px) * 180) / Math.PI + 180 + extra;
  return `translate(${f(x)} ${f(y)}) rotate(${f(ang)})`;
}

export const serpentaire: Species = (c) => {
  const { pal, stage } = c;
  const id = `serpentaire-${stage}`;
  if (stage === 0) {
    // Jeune lové au sol, tête à peine levée.
    const { B, front } = helixBody({ th0: 300, th1: 700, cx: 120, cy0: 192, cy1: 186, rx0: 22, rx1: 46, ry: 14 }, [[154, 172], [140, 156], [116, 148], [94, 150]], (t) => 1.5 + 6.5 * Math.pow(Math.min(1, t * 1.6), 0.8) - (t > 0.88 ? (t - 0.88) * 14 : 0));
    let s = ground(120, 200, 56) + drawBody(c, id, B, front);
    s += `<g transform="${placeHead(B)} scale(0.95)">${head(c, id, 1.15, { tongue: true })}</g>`;
    s += sparkle(66, 124, 2.4, pal.glow, false) + sparkle(170, 140, 2, pal.gold, false);
    return `<g transform="translate(111 200) scale(1.4) translate(-118 -186)">${s}</g>`;
  }
  if (stage === 1) {
    // Sub-adulte dressé en S au-dessus d'une boucle.
    const { B, front } = helixBody({ th0: 160, th1: 560, cx: 116, cy0: 194, cy1: 186, rx0: 40, rx1: 60, ry: 14 }, [[166, 166], [160, 134], [132, 116], [118, 92], [126, 66], [104, 50], [82, 52]], (t) => 1.4 + 8.6 * Math.pow(Math.min(1, t * 1.8), 0.8) - (t > 0.9 ? (t - 0.9) * 22 : 0));
    let s = ground(118, 204, 70) + drawBody(c, id, B, front);
    s += `<g transform="${placeHead(B)} scale(1.15)">${head(c, id, 1.05, { tongue: true })}</g>`;
    s += constellation([[40, 80], [52, 70], [48, 56]], pal.light);
    return `<g transform="translate(111 204) scale(1.02) translate(-114 -204)">${s}</g>`;
  }
  // Adulte : enroulé autour d'une étoile naissante, cou dressé, collerette de plumes.
  const ox = 111, oy = 128;
  const star = `<circle cx="${ox}" cy="${oy}" r="52" fill="${pal.glow}" opacity="0.4" filter="url(#soft)"/>`
    + `<circle cx="${ox}" cy="${oy}" r="30" fill="#FFF6D8" opacity="0.9" filter="url(#glow)"/>`
    + `<circle cx="${ox}" cy="${oy}" r="30" fill="none" stroke="${pal.gold}" stroke-width="1.2"/>`
    + `<circle cx="${ox}" cy="${oy}" r="35" fill="none" stroke="${pal.gold}" stroke-width="0.6" stroke-dasharray="1.5 2.5"/>`
    + Array.from({ length: 12 }, (_, i) => {
      const a = (i / 12) * Math.PI * 2, r1 = 38, r2 = i % 2 ? 46 : 56;
      return `<line x1="${f(ox + Math.cos(a) * r1)}" y1="${f(oy + Math.sin(a) * r1)}" x2="${f(ox + Math.cos(a) * r2)}" y2="${f(oy + Math.sin(a) * r2)}" stroke="${pal.gold}" stroke-width="0.9"/>`;
    }).join('');
  const { B, front } = helixBody({ th0: 150, th1: 720, cx: ox, cy0: 204, cy1: 156, rx0: 50, rx1: 64, ry: 20 }, [[184, 128], [186, 100], [170, 78], [146, 70], [124, 64], [104, 62]], (t) => 1.6 + 10.4 * Math.pow(Math.min(1, t * 1.5), 0.8) - (t > 0.9 ? (t - 0.9) * 24 : 0));
  let s = ground(111, 214, 76);
  s += drawBody(c, id, B, front, star);
  // Anneaux d'or sur le cou.
  for (const k of [0.8, 0.86, 0.92]) {
    const i = Math.round(k * (B.p.length - 1)), [x, y] = B.p[i], [nx, ny] = B.n[i], w = B.w[i];
    s += gild(`M${f(x + nx * w)} ${f(y + ny * w)} Q${f(x + ny * 3)} ${f(y - nx * 3)} ${f(x - nx * w)} ${f(y - ny * w)}`, 1.3);
  }
  s += `<g transform="${placeHead(B, 6)} scale(1.45)">${head(c, id, 1, { tongue: true, crest: true })}</g>`;
  s += constellation([[24, 40], [38, 30], [52, 38], [46, 54]], pal.gold) + sparkle(196, 40, 3, pal.glow, false);
  if (stage >= 3) s += constellation([[170, 200], [186, 186], [200, 196]], pal.gold);
  return `<g transform="translate(111 214) scale(0.98) translate(-111 -214)">${s}</g>`;
};
