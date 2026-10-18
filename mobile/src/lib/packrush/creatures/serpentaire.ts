import { hsl, type Bounds, type DrawCtx, type Species } from './style.ts';
import { constellation, eyeA, gild, ground, ink, line, rim, shadow, sparkle, setKit } from './v4kit.ts';

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
    g += `<path d="M${f(a[0])} ${f(a[1])} L${f(b[0])} ${f(b[1])}" stroke="#05030C" stroke-opacity="0.3" stroke-width="0.6" opacity="0.65"/>`;
  }
  g += `<path d="${poly(V)}L${poly(bl.slice().reverse()).slice(1)}Z" fill="url(#fine)" opacity="0.6"/>`;
  // Losanges dorsaux.
  for (let k = 3; k < idx.length - 2; k += 6) {
    const i = idx[k], w = B.w[i];
    if (w < 3) continue;
    const [x, y] = off(i, -0.35), [nx, ny2] = B.n[i], tx = ny2, ty = -nx;
    const d = `M${f(x + tx * w * 0.9)} ${f(y + ty * w * 0.9)} L${f(x + nx * w * 0.4)} ${f(y + ny2 * w * 0.4)} L${f(x - tx * w * 0.9)} ${f(y - ty * w * 0.9)} L${f(x - nx * w * 0.4)} ${f(y - ny2 * w * 0.4)}Z`;
    g += `<path d="${d}" fill="${pal.deep}" opacity="0.8" stroke="#05030C" stroke-opacity="0.3" stroke-width="0.5"/>`;
    g += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(Math.min(1.4, w * 0.16))}" fill="#FFF6D8"/>`;
  }
  // Poussière d'étoiles sur le dos.
  for (let k = 0; k < idx.length; k++) {
    if (c.r() > (o.stars ?? 0.35)) continue;
    const i = idx[k], [x, y] = off(i, -0.2 - c.r() * 0.6);
    g += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(0.4 + c.r() * 0.7)}" fill="#FFF6D8" opacity="0.9"/>`;
  }
  let s = clip(id, shape, g);
  s += `<path d="${poly(V)}" fill="none" stroke="#05030C" stroke-opacity="0.3" stroke-width="1.6" stroke-linejoin="round"/>`;
  s += `<path d="${poly(D)}" fill="none" stroke="#05030C" stroke-opacity="0.3" stroke-width="1.6" stroke-linejoin="round"/>`;
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

/** Petit papillon-étoile (proie, compagnon lumineux). */
function moth(c: DrawCtx, x: number, y: number, rot: number): string {
  const { pal } = c;
  let s = `<circle cx="0" cy="0" r="9" fill="${pal.glow}" opacity="0.5" filter="url(#soft)"/>`;
  for (const k of [-1, 1]) {
    s += ink(`M0 0 C${k * 4} -10 ${k * 13} -11 ${k * 12} -3 C${k * 11} 1 ${k * 5} 1 0 0Z`, pal.light, 0.8);
    s += ink(`M0 0 C${k * 3} 5 ${k * 8} 8 ${k * 8} 3 C${k * 7} 1 ${k * 3} 0 0 0Z`, pal.accent2, 0.7);
    s += `<circle cx="${k * 7.5}" cy="-5" r="1.6" fill="${pal.gold}"/>`;
    s += line(`M0 -2 q${k * 2} -6 ${k * 5} -8`, 0.5);
  }
  s += `<ellipse cx="0" cy="0" rx="1.2" ry="4" fill="#140F24"/>`;
  return `<g transform="translate(${x} ${y}) rotate(${rot})">${s}</g>`;
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
  setKit(id, c.pal, ([c.pal.glow, '#B48CFF', '#FFE9A8'])[Math.min(2, stage)]);
  if (stage === 0) {
    // Jeune lové au sol, tête à peine levée.
    const { B, front } = helixBody({ th0: 300, th1: 700, cx: 120, cy0: 192, cy1: 186, rx0: 22, rx1: 46, ry: 14 }, [[154, 172], [140, 156], [116, 148], [94, 150]], (t) => 1.5 + 6.5 * Math.pow(Math.min(1, t * 1.6), 0.8) - (t > 0.88 ? (t - 0.88) * 14 : 0));
    let s = ground(120, 200, 56) + drawBody(c, id, B, front);
    s += `<g transform="${placeHead(B)} scale(0.95)">${head(c, id, 1.15, { tongue: true })}</g>`;
    s += moth(c, 66, 128, -18) + sparkle(170, 140, 2, pal.gold, false);
    return `<g transform="translate(111 200) scale(1.4) translate(-118 -186)">${s}</g>`;
  }
  if (stage === 1) {
    // Sub-adulte qui nage à la surface du marais, sillage et rides autour du corps.
    const p = sample([[206, 104], [190, 112], [200, 126], [180, 140], [146, 140], [124, 154], [138, 174], [116, 190], [80, 188], [62, 172], [50, 160]], 10);
    const B: Body = { p, w: p.map((_, i) => { const t = i / (p.length - 1); return 1 + 11.5 * Math.pow(t, 0.7) - (t > 0.9 ? (t - 0.9) * 30 : 0); }), n: normals(p) };
    let s = '';
    // Sillage en V derrière la tête et rides concentriques.
    s += line('M44 168 C60 190 90 206 130 210 M44 166 C70 176 100 176 120 168', 0.8, '#FFF6D8', ' opacity="0.45"');
    s += drawBody(c, id, B, p.map(() => true));
    for (let i = 8; i < p.length - 6; i += 14) {
      const [x, y] = p[i], w = B.w[i];
      for (const k of [1.6, 2.4]) s += `<path d="M${f(x - w * k * 1.5)} ${f(y + w * 0.3)} A${f(w * k * 1.5)} ${f(w * k * 0.45)} 0 0 0 ${f(x + w * k * 1.5)} ${f(y + w * 0.3)}" fill="none" stroke="#FFF6D8" stroke-width="0.8" opacity="${k > 2 ? 0.35 : 0.65}"/>`;
    }
    s += `<g transform="${placeHead(B, -14)} scale(1.55)">${head(c, id, 1.05, { tongue: true })}</g>`;
    s += moth(c, 30, 110, 10);
    return `<g transform="translate(111 160) scale(1.06) translate(-118 -150)">${s}</g>`;
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
  // Autel de pierre gravé sous les anneaux.
  const altar = `M28 206 A83 16 0 0 1 194 206 L194 250 L28 250Z`;
  let s = ink(altar, pal.deep, 1.4) + clip(`${id}-al`, altar, `<ellipse cx="111" cy="206" rx="83" ry="16" fill="${pal.shade}" opacity="0.6"/><path d="${altar}" fill="url(#xhatch)" opacity="0.5"/>`
    + `<ellipse cx="111" cy="206" rx="70" ry="12" fill="none" stroke="${pal.gold}" stroke-width="0.8" stroke-dasharray="4 3"/>` + line('M28 222 H194 M60 222 V250 M111 222 V250 M162 222 V250', 0.7, '#140F24'));
  s += rim('M28 206 A83 16 0 0 1 194 206', pal.glow, 1);
  s += `<ellipse cx="111" cy="206" rx="64" ry="10" fill="#000" opacity="0.3"/>`;
  s += drawBody(c, id, B, front, star);
  // Anneaux d'or sur le cou.
  for (const k of [0.8, 0.86, 0.92]) {
    const i = Math.round(k * (B.p.length - 1)), [x, y] = B.p[i], [nx, ny] = B.n[i], w = B.w[i];
    s += gild(`M${f(x + nx * w)} ${f(y + ny * w)} Q${f(x + ny * 3)} ${f(y - nx * 3)} ${f(x - nx * w)} ${f(y - ny * w)}`, 1.3);
  }
  s += `<g transform="${placeHead(B, 6)} scale(1.45)">${head(c, id, 1, { tongue: true, crest: true })}</g>`;
  s += constellation([[24, 40], [38, 30], [52, 38], [46, 54]], pal.gold) + sparkle(196, 40, 3, pal.glow, false);
  if (stage >= 3) s += constellation([[170, 200], [186, 186], [200, 196]], pal.gold);
  return `<g transform="translate(111 216) scale(0.93) translate(-111 -214)">${s}</g>`;
};

/* ---------- Décors : ruines célestes et marais de nébuleuse ---------- */

const grad = (id: string, stops: [number, string][]) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">${stops.map(([o, col]) => `<stop offset="${o}" stop-color="${col}"/>`).join('')}</linearGradient>`;

function stars(c: DrawCtx, b: Bounds, n: number, ymax: number, op = 0.85): string {
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = b.x0 + c.r() * (b.x1 - b.x0), y = b.y0 + c.r() * (ymax - b.y0), r = 0.3 + c.r() * c.r() * 1.3;
    s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="#FFF6D8" opacity="${f(op * (0.4 + c.r() * 0.6))}"/>`;
  }
  return s;
}

/** Colonne cannelée (éventuellement brisée), gravée. */
function column(x: number, y: number, w: number, h: number, fill: string, broken: boolean): string {
  const top = broken ? `L${f(x + w / 2)} ${f(y - h + 6)} L${f(x + w * 0.2)} ${f(y - h)} L${f(x - w * 0.1)} ${f(y - h + 8)} L${f(x - w / 2)} ${f(y - h + 3)}` : `L${f(x + w / 2)} ${f(y - h)} L${f(x - w / 2)} ${f(y - h)}`;
  const d = `M${f(x - w / 2)} ${f(y)} L${f(x + w / 2)} ${f(y)} ${top}Z`;
  let s = `<path d="${d}" fill="${fill}" stroke="#05030C" stroke-opacity="0.3" stroke-width="0.8"/>`;
  s += `<path d="M${f(x + w * 0.1)} ${f(y)} L${f(x + w / 2)} ${f(y)} L${f(x + w / 2)} ${f(y - h + 6)} L${f(x + w * 0.1)} ${f(y - h + 6)}Z" fill="url(#fine)" opacity="0.8"/>`;
  for (let k = -1; k <= 1; k++) s += `<path d="M${f(x + k * w * 0.22)} ${f(y - 2)} V${f(y - h + 10)}" stroke="#05030C" stroke-opacity="0.3" stroke-width="0.5" opacity="0.6"/>`;
  if (!broken) s += `<rect x="${f(x - w * 0.7)}" y="${f(y - h - 6)}" width="${f(w * 1.4)}" height="6" fill="${fill}" stroke="#05030C" stroke-opacity="0.3" stroke-width="0.8"/>`;
  s += `<rect x="${f(x - w * 0.65)}" y="${f(y - 4)}" width="${f(w * 1.3)}" height="5" fill="${fill}" stroke="#05030C" stroke-opacity="0.3" stroke-width="0.8"/>`;
  return s;
}

/** Roseau : tige + feuille + épi. */
function reed(x: number, y: number, h: number, lean: number, col: string): string {
  return `<path d="M${f(x)} ${f(y)} Q${f(x + lean * 0.3)} ${f(y - h * 0.6)} ${f(x + lean)} ${f(y - h)}" fill="none" stroke="${col}" stroke-width="1.2"/>`
    + `<ellipse cx="${f(x + lean * 0.92)}" cy="${f(y - h * 0.88)}" rx="1.6" ry="5" fill="${col}" transform="rotate(${f(lean)} ${f(x + lean * 0.92)} ${f(y - h * 0.88)})"/>`
    + `<path d="M${f(x)} ${f(y - h * 0.2)} Q${f(x - lean * 0.4 - 6)} ${f(y - h * 0.5)} ${f(x - lean - 10)} ${f(y - h * 0.55)}" fill="none" stroke="${col}" stroke-width="0.9"/>`;
}

serpentaire.scene = (c: DrawCtx, b: Bounds): string => {
  const { stage, pal } = c;
  const id = `serpentaire-${stage}-bg`;
  setKit(id, c.pal, ([c.pal.glow, '#B48CFF', '#FFE9A8'])[Math.min(2, stage)]);
  const W = b.x1 - b.x0, Hh = b.y1 - b.y0;
  const G = 160 + (c.hue - 150) * 0.15;
  let s = '';
  if (stage === 0) {
    // Dalles d'un temple en ruine au crépuscule : colonnes brisées, mousse, champignons luisants.
    s += `<defs>${grad(`${id}-sky`, [[0, hsl(G + 100, 40, 10)], [0.7, hsl(G + 80, 30, 26)], [1, hsl(G + 40, 30, 36)]])}</defs>`;
    s += `<rect x="${b.x0}" y="${b.y0}" width="${W}" height="${Hh}" fill="url(#${id}-sky)"/>` + stars(c, b, 50, 110);
    s += `<path d="M120 140 V70 A30 30 0 0 1 180 70 V140 H168 V74 A18 18 0 0 0 132 74 V140Z" fill="${hsl(G + 80, 18, 32)}" stroke="#05030C" stroke-opacity="0.3" stroke-width="0.6" opacity="0.8"/>`;
    s += column(30, 160, 18, 100, hsl(G + 60, 14, 40), true) + column(196, 168, 16, 60, hsl(G + 60, 14, 38), true);
    const floor = `M${b.x0 - 10} 150 L${b.x1 + 10} 150 L${b.x1 + 10} ${b.y1 + 10} L${b.x0 - 10} ${b.y1 + 10}Z`;
    s += `<path d="${floor}" fill="${hsl(G + 50, 16, 30)}"/>`;
    let tiles = '';
    for (let k = 0; k < 6; k++) tiles += `M${b.x0 - 10} ${f(150 + k * k * 3 + k * 4)} H${b.x1 + 10} `;
    for (let k = -6; k <= 6; k++) tiles += `M${f(111 + k * 14)} 150 L${f(111 + k * 46)} ${b.y1 + 10} `;
    s += clip(`${id}-fl`, floor, `<path d="${tiles}" fill="none" stroke="#05030C" stroke-opacity="0.3" stroke-width="0.7" opacity="0.6"/>` + `<path d="${floor}" fill="url(#fine)" opacity="0.4"/>`
      + `<ellipse cx="40" cy="214" rx="50" ry="14" fill="${hsl(G, 30, 28)}" opacity="0.9"/><ellipse cx="190" cy="196" rx="34" ry="9" fill="${hsl(G, 30, 28)}" opacity="0.9"/>`);
    for (const [x, y, k] of [[22, 206, 1], [32, 210, 0.7], [178, 192, 0.8], [200, 196, 1]] as const) {
      s += `<circle cx="${x}" cy="${y - 6 * k}" r="${8 * k}" fill="${pal.glow}" opacity="0.35" filter="url(#soft)"/>`
        + `<path d="M${x - 1} ${y} V${f(y - 6 * k)}" stroke="${hsl(G, 20, 80)}" stroke-width="1.4"/>` + ink(`M${f(x - 5 * k)} ${f(y - 6 * k)} Q${x} ${f(y - 12 * k)} ${f(x + 5 * k)} ${f(y - 6 * k)}Z`, pal.glow, 0.7);
    }
    return s;
  }
  if (stage === 1) {
    // Marais de nébuleuse la nuit : eau sombre où se reflète la nébuleuse, roseaux, lucioles.
    s += `<defs>${grad(`${id}-sky`, [[0, hsl(G + 110, 45, 8)], [1, hsl(G + 60, 35, 20)]])}${grad(`${id}-wt`, [[0, hsl(G + 60, 30, 22)], [1, hsl(G + 90, 40, 8)]])}</defs>`;
    s += `<rect x="${b.x0}" y="${b.y0}" width="${W}" height="${Hh}" fill="url(#${id}-sky)"/>`;
    s += `<ellipse cx="150" cy="50" rx="90" ry="34" fill="${pal.accent2}" opacity="0.3" filter="url(#soft)"/><ellipse cx="80" cy="70" rx="60" ry="22" fill="${pal.accent}" opacity="0.25" filter="url(#soft)"/>`;
    s += stars(c, b, 70, 110);
    s += `<path d="M${b.x0 - 10} 112 Q40 100 70 108 T150 104 T${b.x1 + 10} 108 V118 H${b.x0 - 10}Z" fill="${hsl(G + 70, 20, 16)}"/>`;
    s += `<path d="M180 112 V70 M180 86 l12 -10 M180 94 l-10 -8" stroke="${hsl(G + 70, 20, 16)}" stroke-width="2.5" fill="none"/>`;
    s += `<rect x="${b.x0}" y="114" width="${W}" height="${b.y1 - 114}" fill="url(#${id}-wt)"/>`;
    s += `<ellipse cx="150" cy="150" rx="70" ry="16" fill="${pal.accent2}" opacity="0.2" filter="url(#soft)"/>`;
    for (let k = 0; k < 10; k++) s += line(`M${f(b.x0 + c.r() * W)} ${f(122 + k * k * 1.2)} h${f(14 + c.r() * 30)}`, 0.6, '#FFF6D8', ' opacity="0.3"');
    s += `<ellipse cx="111" cy="128" rx="140" ry="8" fill="#FFF6D8" opacity="0.08" filter="url(#soft)"/>`;
    for (let i = 0; i < 10; i++) s += reed(b.x0 + 4 + c.r() * 30, 236, 60 + c.r() * 40, (c.r() - 0.3) * 14, hsl(G + 70, 25, 10));
    for (let i = 0; i < 8; i++) s += reed(b.x1 - 30 + c.r() * 30, 236, 50 + c.r() * 50, (c.r() - 0.6) * 14, hsl(G + 70, 25, 10));
    for (let i = 0; i < 12; i++) s += `<circle cx="${f(b.x0 + c.r() * W)}" cy="${f(80 + c.r() * 120)}" r="1.2" fill="${pal.glow}" filter="url(#glow)"/>`;
    return s;
  }
  // Sanctuaire sous une coupole étoilée : colonnes, arc, constellations gravées.
  s += `<defs>${grad(`${id}-sky`, [[0, hsl(G + 90, 45, 7)], [1, hsl(G + 70, 35, 22)]])}</defs>`;
  s += `<rect x="${b.x0}" y="${b.y0}" width="${W}" height="${Hh}" fill="url(#${id}-sky)"/>` + stars(c, b, 80, 200);
  s += `<path d="M${b.x0 - 10} ${b.y0 - 10} H${b.x1 + 10} V200 H196 V100 A85 85 0 0 0 26 100 V200 H${b.x0 - 10}Z" fill="${hsl(G + 70, 16, 18)}" stroke="#05030C" stroke-opacity="0.3" stroke-width="0.8"/>`;
  s += `<path d="M26 100 A85 85 0 0 1 196 100" fill="none" stroke="${pal.gold}" stroke-width="0.8" opacity="0.6"/><path d="M34 100 A77 77 0 0 1 188 100" fill="none" stroke="#05030C" stroke-opacity="0.3" stroke-width="0.6" stroke-dasharray="3 3"/>`;
  s += constellation([[60, 40], [80, 30], [100, 36], [92, 52]], pal.gold) + constellation([[140, 34], [158, 44], [172, 36]], pal.gold);
  s += column(16, 214, 20, 150, hsl(G + 60, 14, 30), false) + column(206, 214, 20, 150, hsl(G + 60, 14, 30), false);
  s += `<path d="M${b.x0 - 10} 200 H${b.x1 + 10} V${b.y1 + 10} H${b.x0 - 10}Z" fill="${hsl(G + 60, 16, 22)}"/>`;
  s += `<path d="M${b.x0 - 10} 200 H${b.x1 + 10} V${b.y1 + 10} H${b.x0 - 10}Z" fill="url(#fine)" opacity="0.5"/>`;
  return s;
};
