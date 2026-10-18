import { aura, constellation, eyeA, gild, ground, hsl, ink, line, rim, shadow, sparkle, type Bounds, type DrawCtx, type Species } from './style.ts';

/* ---------- Géométrie : squelette lissé + largeurs (anatomie par « tubes ») ---------- */
type P = [number, number];
const f = (v: number) => +v.toFixed(1);
function cr(pts: P[], seg: number): P[] {
  const out: P[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < seg; k++) {
      const t = k / seg, t2 = t * t, t3 = t2 * t;
      const q = (j: 0 | 1) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3);
      out.push([q(0), q(1)]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}
function smooth(pts: P[], closed = false): string {
  const N = pts.length;
  const g = (i: number) => (closed ? pts[(i + N) % N] : pts[Math.max(0, Math.min(N - 1, i))]);
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < (closed ? N : N - 1); i++) {
    const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
    d += ` C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + (closed ? ' Z' : '');
}
interface Fr { m: P[]; nr: P[] }
function frame(spine: P[], seg = 8): Fr {
  const m = cr(spine, seg);
  const nr = m.map((_, i) => {
    const a = m[Math.max(0, i - 1)], b = m[Math.min(m.length - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
    return [-dy / L, dx / L] as P;
  });
  return { m, nr };
}
const tab = (t: [number, number][]) => (x: number) => {
  if (x <= t[0][0]) return t[0][1];
  for (let i = 1; i < t.length; i++) if (x <= t[i][0]) { const [a, va] = t[i - 1], [b, vb] = t[i]; return va + ((x - a) / (b - a)) * (vb - va); }
  return t[t.length - 1][1];
};
type Fn = (t: number) => number;
function side(fr: Fr, fn: Fn, t0 = 0, t1 = 1): P[] {
  const N = fr.m.length - 1, out: P[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    if (t < t0 - 1e-6 || t > t1 + 1e-6) continue;
    const o = fn(t);
    out.push([fr.m[i][0] + fr.nr[i][0] * o, fr.m[i][1] + fr.nr[i][1] * o]);
  }
  return out;
}
const strip = (fr: Fr, a: Fn, b: Fn, t0 = 0, t1 = 1) => smooth([...side(fr, a, t0, t1), ...side(fr, b, t0, t1).reverse()], true);
const outline = (fr: Fr, w: Fn, t0 = 0, t1 = 1) => strip(fr, w, (t) => -w(t), t0, t1);
const curve = (fr: Fr, fn: Fn, t0 = 0, t1 = 1) => smooth(side(fr, fn, t0, t1));
function at(fr: Fr, t: number, o = 0): P {
  const i = Math.round(t * (fr.m.length - 1));
  return [fr.m[i][0] + fr.nr[i][0] * o, fr.m[i][1] + fr.nr[i][1] * o];
}
const tube = (pts: P[], w: [number, number][]) => outline(frame(pts, 6), tab(w));
const G = (x: number, y: number, a: number, s: string) => `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(a)})">${s}</g>`;

/* ---------- Décor : petits outils ---------- */
const fill = (b: Bounds, color: string, extra = '') => `<rect x="${b.x0}" y="${b.y0}" width="${b.x1 - b.x0}" height="${b.y1 - b.y0}" fill="${color}"${extra}/>`;
/** Dégradé vertical (id unique), arrêts [position 0..1, couleur]. */
const vgrad = (id: string, stops: [number, string][]) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">${stops.map(([o, col]) => `<stop offset="${o}" stop-color="${col}"/>`).join('')}</linearGradient>`;
/** Ciel / eau étoilé : points fins, quelques étoiles à branches. */
function stars(c: DrawCtx, b: Bounds, n: number, yMax: number, color = '#FFF6D8'): string {
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = b.x0 + c.r() * (b.x1 - b.x0), y = b.y0 + c.r() * (yMax - b.y0), r = 0.3 + c.r() ** 3 * 1.3;
    s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${color}" opacity="${f(0.35 + c.r() * 0.6)}"/>`;
  }
  return s;
}
/** Ligne d'horizon irrégulière (collines, dunes, rochers) fermée vers le bas de la fenêtre. */
function ridge(c: DrawCtx, b: Bounds, y: number, amp: number, n: number, color: string, stroke = 0.9, extra = ''): string {
  const pts: P[] = [];
  for (let i = 0; i <= n; i++) pts.push([b.x0 - 10 + (i / n) * (b.x1 - b.x0 + 20), y + (c.r() - 0.5) * 2 * amp]);
  const top = smooth(pts);
  return `<path d="${top} L${b.x1 + 10} ${b.y1 + 10} L${b.x0 - 10} ${b.y1 + 10} Z" fill="${color}"${extra}/>`
    + (stroke ? `<path d="${top}" fill="none" stroke="#140F24" stroke-width="${stroke}" opacity="0.7"/>` : '');
}
/** Halo flou (lumière d'ambiance). */
const glowAt = (x: number, y: number, rx: number, ry: number, color: string, op = 0.5) =>
  `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(ry)}" fill="${color}" opacity="${op}" filter="url(#soft)"/>`;

/** Cétoile → Baleinelle → Nébulène → Abyssiale : baleine à bosse du vide (sillons ventraux, nageoires pectorales immenses), dont le flanc s'ouvre sur une nébuleuse au stade éveillé. */
export const cetoile: Species = (c) => {
  const { pal, stage } = c;
  const st = Math.min(stage, 3);
  const id = `cetoile-${st}`;
  const S = [0.88, 0.95, 1, 1][st];
  const fat = [1.12, 1.04, 1, 1][st];
  const pecK = [0.7, 0.85, 1, 1.05][st];

  const spine: P[] = [[14, 146], [40, 130], [74, 120], [110, 118], [142, 120], [166, 112], [182, 94], [188, 72], [186, 52]];
  const fr = frame(spine, 8);
  const W = tab([[0, 5], [0.04, 13 * fat], [0.12, 21 * fat], [0.26, 27 * fat], [0.42, 26 * fat], [0.58, 18 * fat], [0.72, 10.5], [0.86, 6], [1, 4]]);
  const nW = (t: number) => -W(t);
  const body = outline(fr, W);
  let g = '';
  if (st >= 3) g += aura(110, 108, 100, pal.glow);
  if (st === 2) g += ground(100, 214, 60);

  // Traînée de poussière d'étoiles (sillage).
  if (st >= 2) {
    for (let k = 0; k < (st >= 3 ? 26 : 12); k++) {
      const u = c.r();
      g += `<circle cx="${f(196 - u * 40 + (c.r() - 0.5) * 16)}" cy="${f(34 - u * 26 + c.r() * 16)}" r="${f(0.5 + c.r() * 1.2)}" fill="#FFF6D8" opacity="${f(0.4 + c.r() * 0.5)}"/>`;
    }
  }

  // Nageoire pectorale éloignée (dépasse sous le ventre).
  const [px0, py0] = at(fr, 0.3, W(0.3) * 0.6);
  const pec = (x: number, y: number, k: number, fill: string, far: boolean) => {
    const pts: P[] = [[x, y], [x + 16 * k, y + 22 * k], [x + 38 * k, y + 40 * k], [x + 62 * k, y + 48 * k]];
    const pfr = frame(pts, 6);
    const pw = tab([[0, 8], [0.25, 9.5], [0.75, 5.5], [1, 1.4]]);
    // Bord d'attaque festonné (tubercules).
    const lead = side(pfr, (t) => -pw(t) - (t > 0.1 && t < 0.92 ? Math.abs(Math.sin(t * 34)) * 1.6 : 0));
    const trail = side(pfr, pw);
    const d = smooth([...trail, ...lead.reverse()], true);
    let s = ink(d, fill, far ? 1.1 : 1.4);
    if (!far) {
      s += shadow(strip(pfr, (t) => pw(t) * 0.1, pw), pal.shade, 0.55, 'fine');
      s += line(curve(pfr, (t) => -pw(t) * 0.35, 0.05, 0.9), 0.6, pal.deep, ' opacity="0.6"');
    }
    return s;
  };
  g += pec(px0 + 22, py0 - 8, pecK * 0.62, pal.shade, true);

  // Flukes (caudale vue de dessus, la queue se relève).
  const [fx, fy] = fr.m[fr.m.length - 1];
  const fk = [0.85, 0.92, 1, 1.05][st];
  const fl = (x: number, y: number) => `${f(fx + x * fk)} ${f(fy + y * fk)}`;
  const fluke = `M${fl(-3, 6)} C${fl(-10, 0)} ${fl(-22, -2)} ${fl(-32, -12)} C${fl(-26, -16)} ${fl(-18, -14)} ${fl(-14, -12)} Q${fl(-10, -14)} ${fl(-8, -11)} Q${fl(-4, -12)} ${fl(0, -8)} Q${fl(4, -13)} ${fl(8, -12)} Q${fl(12, -15)} ${fl(16, -13)} C${fl(22, -16)} ${fl(28, -18)} ${fl(34, -16)} C${fl(26, -6)} ${fl(12, 0)} ${fl(3, 6)} Z`;
  g += ink(fluke, pal.body, 1.6);
  g += shadow(`M${fl(-3, 6)} C${fl(-10, 0)} ${fl(-22, -2)} ${fl(-32, -12)} C${fl(-20, -8)} ${fl(-8, -4)} ${fl(0, 0)} C${fl(10, -6)} ${fl(24, -12)} ${fl(34, -16)} C${fl(26, -6)} ${fl(12, 0)} ${fl(3, 6)} Z`, pal.shade, 0.7, 'fine');
  g += `<path d="M${fl(-26, -13)} Q${fl(-12, -10)} ${fl(0, -6)} Q${fl(14, -12)} ${fl(30, -15)}" fill="none" stroke="${pal.belly}" stroke-width="1.1" opacity="0.7"/>`;

  // Corps.
  g += ink(body, pal.body, 1.8);
  g += `<defs><clipPath id="${id}-b"><path d="${body}"/></clipPath></defs><g clip-path="url(#${id}-b)">`;
  // Dos sombre, ventre clair à sillons.
  g += `<path d="${strip(fr, nW, (t) => -W(t) * 0.2 + Math.sin(t * 40) * 1.5, 0, 1)}" fill="${pal.shade}" opacity="0.55"/>`;
  const belly = strip(fr, (t) => W(t) * (0.22 + t * 0.4), (t) => W(t) * 1.1, 0.01, 0.62);
  g += `<path d="${belly}" fill="${pal.belly}" opacity="0.9"/>`;
  const pleats = st === 0 ? 5 : 8;
  for (let k = 0; k < pleats; k++) {
    const o = 0.42 + (k / pleats) * 0.58;
    g += line(curve(fr, (t) => W(t) * (o + (1 - o) * t * 0.5), 0.03 + k * 0.006, 0.5 - k * 0.012), 0.55, pal.deep, ' opacity="0.65"');
  }
  g += shadow(strip(fr, (t) => W(t) * 0.55, (t) => W(t) * 1.1, 0.03, 1), pal.shade, 0.55, 'fine');
  g += shadow(strip(fr, (t) => W(t) * 0.85, (t) => W(t) * 1.1, 0.1, 0.8), pal.deep, 0.35, 'xhatch');
  // Nébuleuse intérieure (éveil) : le flanc s'ouvre sur le cosmos.
  if (st >= 3) {
    const lo = (t: number) => W(t) * (0.1 + Math.sin(t * 12) * 0.12);
    const win = strip(fr, (t) => lo(t) + (-W(t) * 1.1 - lo(t)) * Math.min(1, Math.max(0, (t - 0.3) / 0.16)) ** 0.6, lo, 0.3, 1);
    g += `<defs><clipPath id="${id}-n"><path d="${win}"/></clipPath></defs><g clip-path="url(#${id}-n)">`;
    g += `<path d="${win}" fill="${pal.deep}"/>`;
    for (const [t, o, rx, ry, col, a] of [[0.44, -0.5, 26, 16, pal.accent, 0.9], [0.6, -0.1, 20, 14, pal.accent2, 0.85], [0.4, 0.0, 12, 9, '#FFF6D8', 0.55], [0.72, -0.3, 14, 12, pal.glow, 0.7], [0.52, -0.9, 18, 8, pal.eye, 0.45], [0.86, 0, 10, 10, pal.accent, 0.7]] as const) {
      const [x, y] = at(fr, t, W(t) * o);
      g += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${rx}" ry="${ry}" fill="${col}" opacity="${a}" filter="url(#soft)"/>`;
    }
    for (let k = 0; k < 40; k++) {
      const t = 0.35 + c.r() * 0.62, [x, y] = at(fr, t, W(t) * (c.r() * 1.8 - 1));
      g += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(0.4 + c.r() * 1.1)}" fill="#FFF6D8" opacity="${f(0.5 + c.r() * 0.5)}"/>`;
    }
    g += `</g>`;
    g += gild(curve(fr, lo, 0.3, 0.98), 1);
    g += gild(curve(fr, (t) => -W(t) * 0.62, 0.05, 0.3), 0.9);
    g += constellation([at(fr, 0.4, -10), at(fr, 0.48, -2), at(fr, 0.56, -12), at(fr, 0.66, -4), at(fr, 0.74, -8)], pal.gold);
  }
  g += `</g>`;
  // Nageoire dorsale (petite bosse).
  const [dx, dy] = at(fr, 0.62, -W(0.62) + 1);
  g += ink(`M${f(dx - 10)} ${f(dy + 2)} C${f(dx - 4)} ${f(dy - 2)} ${f(dx + 2)} ${f(dy - 8)} ${f(dx + 6)} ${f(dy - 9)} C${f(dx + 5)} ${f(dy - 4)} ${f(dx + 6)} ${f(dy)} ${f(dx + 10)} ${f(dy + 2)}`, pal.shade, 1.3);
  // Bouche, œil, tubercules, évent.
  const mouth = curve(fr, (t) => W(t) * (0.15 + t * 2.2), 0.005, 0.17);
  g += line(mouth, 1.2);
  const [ex, ey] = at(fr, 0.19, W(0.19) * 0.32);
  g += eyeA(ex, ey, 3.6, pal.eye, { angle: -6, slit: false, open: 0.55 });
  g += line(`M${f(ex - 5)} ${f(ey + 4)} Q${f(ex)} ${f(ey + 6)} ${f(ex + 5)} ${f(ey + 3)}`, 0.6, pal.deep, ' opacity="0.7"');
  if (st >= 1) {
    for (let k = 0; k < 7; k++) {
      const t = 0.03 + k * 0.022, [x, y] = at(fr, t, -W(t) * 0.55 + (k % 2) * 3);
      g += `<circle cx="${f(x)}" cy="${f(y)}" r="1.3" fill="${pal.light}" stroke="#140F24" stroke-width="0.5"/>`;
    }
    // Bernacles-étoiles.
    for (const [t, o] of [[0.07, 0.5], [0.1, 0.65], [0.28, -0.3], [0.5, 0.4]] as const) {
      const [x, y] = at(fr, t, W(t) * o);
      g += sparkle(x, y, st >= 2 ? 2.8 : 2.2, st >= 2 ? pal.gold : '#FFF6D8', false);
    }
  }
  const [bx, by] = at(fr, 0.2, -W(0.2) + 1.5);
  g += line(`M${f(bx - 3)} ${f(by)} q3 1.5 6 0`, 0.9);
  g += rim(curve(fr, nW, 0.02, 0.7), pal.glow, 1.3);
  g += `<path d="${body}" fill="none" stroke="#140F24" stroke-width="1.8"/>`;
  // Souffle d'étoiles (éveil) ou petit souffle de brume.
  if (st >= 2) {
    const n = st >= 3 ? 9 : 5;
    for (let k = 0; k < n; k++) {
      const a = -Math.PI / 2 + (k / (n - 1) - 0.5) * 1.1, L2 = 22 + (k % 2) * 8;
      g += line(`M${f(bx)} ${f(by - 3)} Q${f(bx + Math.cos(a) * L2 * 0.5)} ${f(by - 3 + Math.sin(a) * L2 * 0.6)} ${f(bx + Math.cos(a) * L2)} ${f(by - 3 + Math.sin(a) * L2 + 6)}`, 0.7, pal.glow, ' opacity="0.7"');
      if (st >= 3) g += sparkle(bx + Math.cos(a) * L2, by - 3 + Math.sin(a) * L2 + 6, 1.8, pal.gold, false);
    }
  }

  // Nageoire pectorale proche.
  g += pec(px0, py0, pecK, pal.belly, false);
  if (st >= 2) g += gild(`M${f(px0 + 12)} ${f(py0 + 16)} q14 16 32 24`, 0.9);

  // Ornements.
  if (st >= 3) {
    g += constellation([[22, 40], [40, 30], [58, 38], [72, 24]], pal.gold);
    for (const [x, y] of [[30, 180], [96, 30], [150, 190], [124, 54]] as const) g += sparkle(x, y, 3.2, pal.glow, false);
  } else if (st === 2) {
    g += sparkle(40, 50, 2.8, pal.glow, false) + sparkle(150, 186, 2.4, pal.glow, false);
  } else {
    g += sparkle(48, 60, 2.4, pal.glow, false);
  }
  let out = `<g transform="translate(104 124) scale(${S}) translate(-104 -124)">${g}</g>`;
  // 1 : le jeune sonde depuis la surface : corps qui plonge, caudale encore dressée hors de l'eau.
  if (st === 1) {
    out = `<g transform="translate(0 10) rotate(-22 110 130)">${out}</g>`;
    let sp = `<path d="M128 62 C134 52 142 58 148 50 C152 58 160 50 166 58 C172 52 180 60 186 62 C170 70 140 70 128 62 Z" fill="${pal.light}" opacity="0.9" stroke="#140F24" stroke-width="0.9"/>`;
    for (let k = 0; k < 12; k++) { const a = Math.PI * (0.15 + 0.7 * (k / 11)), r = 26 + (k % 3) * 6; sp += `<circle cx="${f(157 - Math.cos(a) * r)}" cy="${f(60 - Math.sin(a) * r * 0.6)}" r="${f(0.8 + (k % 3) * 0.5)}" fill="${pal.light}" stroke="#140F24" stroke-width="0.4"/>`; }
    out += sp;
  }
  return out;
};

/* ---------- Décor : océan d'étoiles (0 près de sa mère sous la surface, 1 saut au crépuscule, 2 chant dans l'abysse, 3 vol au-dessus d'une planète-océan) ---------- */
function starFish(x: number, y: number, s: number, col: string): string {
  return `<g transform="translate(${f(x)} ${f(y)}) scale(${s})"><path d="M-4 0 C-2 -2.4 2 -2.4 4 0 L7 -2.4 L6.4 2.4 L4 0 C2 2.4 -2 2.4 -4 0 Z" fill="${col}" stroke="#140F24" stroke-width="${f(0.5 / s)}"/></g>`;
}
function jelly(x: number, y: number, r: number, col: string): string {
  let s = glowAt(x, y, r * 1.6, r * 1.4, col, 0.35);
  s += `<path d="M${x - r} ${y} A${r} ${r * 0.8} 0 0 1 ${x + r} ${y} Q${x} ${y + r * 0.35} ${x - r} ${y} Z" fill="${col}" opacity="0.75" stroke="#140F24" stroke-width="0.5"/>`;
  for (let k = 0; k < 4; k++) { const tx = x - r * 0.6 + k * r * 0.4; s += `<path d="M${f(tx)} ${f(y + 1)} q${f(r * 0.3)} ${f(r)} 0 ${f(r * 2)} t0 ${f(r * 1.4)}" fill="none" stroke="${col}" stroke-width="0.6" opacity="0.7"/>`; }
  return s;
}
function whaleShape(x: number, y: number, k: number, col: string): string {
  return `<path transform="translate(${x} ${y}) scale(${k})" d="M0 0 C10 -16 50 -22 90 -18 C120 -15 140 -8 160 -12 L176 -26 L172 -8 L190 -2 L168 0 C140 4 120 10 90 14 C50 18 14 14 0 0 Z" fill="${col}"/>`;
}
const cetoileScene = (c: DrawCtx, b: Bounds): string => {
  const { pal, stage, hue } = c;
  const st = Math.min(stage, 3);
  const id = `cetoile-${st}-bg`;
  const W2 = b.x1 - b.x0;
  let s = '';
  if (st === 0) {
    s += `<defs>${vgrad(`${id}-w`, [[0, hsl(185 + hue * 0.12, 40, 42)], [0.4, hsl(200 + hue * 0.12, 44, 22)], [1, hsl(220 + hue * 0.1, 50, 9)]])}</defs>${fill(b, `url(#${id}-w)`)}`;
    s += `<path d="M${b.x0} ${b.y0 + 12} Q${b.x0 + W2 * 0.25} ${b.y0 + 6} ${b.x0 + W2 * 0.5} ${b.y0 + 12} T${b.x1} ${b.y0 + 12} L${b.x1} ${b.y0} L${b.x0} ${b.y0} Z" fill="${hsl(185 + hue * 0.12, 40, 62)}" opacity="0.5"/>`;
    for (const [x, w2, o] of [[60, 50, 0.14], [120, 36, 0.1], [180, 44, 0.12]] as const) s += `<path d="M${x - 8} ${b.y0} L${x + 8} ${b.y0} L${x + 20 + w2} ${b.y1} L${x + 20 - w2} ${b.y1} Z" fill="#FFF6D8" opacity="${o}"/>`;
    s += stars(c, b, 50, b.y1, hsl(hue + 180, 60, 85));
    // La mère, immense, dans le bleu (plan lointain).
    s += whaleShape(-40, 196, 1.45, hsl(210 + hue * 0.1, 30, 30)) + `<path d="M40 206 q20 20 54 26 q-30 -2 -60 -18 Z" fill="${hsl(210 + hue * 0.1, 26, 38)}"/>`;
    s += `<path d="M30 206 q30 18 70 22" fill="none" stroke="${hsl(hue + 200, 30, 34)}" stroke-width="1" opacity="0.7"/>`;
    s += `<circle cx="36" cy="190" r="2" fill="${hsl(hue + 200, 30, 40)}"/>`;
    // Banc de poissons-étoiles.
    for (let k = 0; k < 16; k++) s += starFish(150 + c.r() * 66, 26 + c.r() * 50, 0.8 + c.r() * 0.5, hsl(hue + 170, 50, 70));
  } else if (st === 1) {
    const sy = 64;
    s += `<defs>${vgrad(`${id}-s`, [[0, hsl(262, 30, 30)], [0.2, hsl(hue + 20, 55, 62)], [0.27, hsl(hue + 30, 60, 72)], [0.28, hsl(195 + hue * 0.15, 40, 36)], [1, hsl(215 + hue * 0.1, 46, 10)]])}</defs>${fill(b, `url(#${id}-s)`)}`;
    s += stars(c, { ...b, y1: sy }, 20, sy - 14);
    s += glowAt(50, sy - 4, 50, 12, '#FFE3A0', 0.7) + `<path d="M38 ${sy} a12 12 0 0 1 24 0 Z" fill="#FFF0C8"/>`;
    // Surface vue d'en dessous : houle, reflet du soleil, rayons.
    let d = `M${b.x0 - 4} ${sy}`;
    for (let x = b.x0 - 4; x < b.x1 + 8; x += 14) d += ` q3.5 -3 7 0 t7 0`;
    s += line(d, 1, '#140F24', ' opacity="0.6"');
    for (let k = 0; k < 5; k++) s += line(`M${f(30 + k * 5)} ${f(sy + 4 + k * 4)} h${f(26 - k * 4)}`, 1, '#FFE3A0', ' opacity="0.5"');
    for (const [x, w2, o] of [[50, 60, 0.14], [100, 40, 0.08], [10, 40, 0.1]] as const) s += `<path d="M${x - 8} ${sy} L${x + 8} ${sy} L${x + 30 + w2} ${b.y1} L${x + 30 - w2} ${b.y1} Z" fill="#FFE3A0" opacity="${o}"/>`;
    s += stars(c, { ...b, y0: sy + 4 }, 50, b.y1, hsl(hue + 180, 60, 85));
    for (let k = 0; k < 10; k++) s += starFish(10 + c.r() * 60, 180 + c.r() * 50, 0.8 + c.r() * 0.4, hsl(hue + 170, 50, 70));
  } else if (st === 2) {
    s += `<defs>${vgrad(`${id}-w`, [[0, hsl(215, 40, 22)], [0.5, hsl(228, 46, 11)], [1, hsl(240, 50, 5)]])}</defs>${fill(b, `url(#${id}-w)`)}`;
    for (const [x, w2, o] of [[90, 60, 0.08], [150, 40, 0.06]] as const) s += `<path d="M${x - 10} ${b.y0} L${x + 10} ${b.y0} L${x + w2} ${b.y1} L${x - w2} ${b.y1} Z" fill="${pal.glow}" opacity="${o}"/>`;
    s += stars(c, b, 70, b.y1, hsl(hue + 180, 50, 80));
    s += whaleShape(150, 40, 0.4, hsl(222, 30, 24)) + whaleShape(176, 58, 0.26, hsl(222, 30, 22));
    // Le chant : ondes gravées qui partent de la tête.
    for (let k = 1; k <= 4; k++) s += `<path d="M${f(30 - k * 10)} ${f(110 - k * 16)} A${k * 22} ${k * 22} 0 0 0 ${f(30 - k * 10)} ${f(170 + k * 12)}" fill="none" stroke="#E9C25B" stroke-width="${f(1.1 - k * 0.15)}" opacity="${f(0.7 - k * 0.12)}" stroke-dasharray="${k > 2 ? '2 4' : 'none'}"/>`;
    s += jelly(196, 170, 8, pal.accent2) + jelly(30, 40, 6, pal.accent) + jelly(206, 104, 5, pal.accent);
    s += ridge(c, b, 226, 6, 6, hsl(hue + 220, 30, 12), 0.7);
  } else {
    s += fill(b, hsl(hue + 230, 46, 7));
    s += glowAt(40, 50, 80, 50, pal.accent, 0.35) + glowAt(190, 40, 60, 40, pal.accent2, 0.3) + glowAt(120, 20, 70, 20, pal.glow, 0.2);
    s += stars(c, b, 120, b.y1);
    // Aurore en rideaux.
    for (let k = 0; k < 12; k++) { const x = 10 + k * 18; s += `<path d="M${x} 20 q6 30 0 70" fill="none" stroke="${pal.accent2}" stroke-width="5" opacity="0.12" filter="url(#soft)"/>`; }
    // Planète-océan en contrebas, limbe lumineux.
    s += `<defs><clipPath id="${id}-p"><circle cx="111" cy="520" r="330"/></clipPath></defs>`;
    s += glowAt(111, 196, 150, 18, pal.glow, 0.45);
    s += `<circle cx="111" cy="520" r="330" fill="${hsl(hue + 190, 46, 26)}"/>`;
    s += `<g clip-path="url(#${id}-p)">`;
    for (const [x, y, rx] of [[40, 214, 30], [150, 206, 40], [200, 224, 20], [90, 230, 26]] as const) s += `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${f(rx * 0.22)}" fill="${hsl(hue + 120, 20, 40)}" opacity="0.7"/>`;
    for (let k = 0; k < 5; k++) s += `<path d="M${-20 + k * 40} ${200 + k * 4} q30 -6 60 0" fill="none" stroke="#FFF6D8" stroke-width="0.8" opacity="0.5"/>`;
    s += shadow('M-20 210 C60 196 160 196 260 214 L260 300 L-20 300 Z', hsl(hue + 220, 50, 8), 0.4, 'fine');
    s += `</g><circle cx="111" cy="520" r="330" fill="none" stroke="${pal.glow}" stroke-width="1.6" opacity="0.8"/>`;
    // Comète.
    s += `<path d="M210 12 L150 40" stroke="#FFF6D8" stroke-width="1.5" opacity="0.5" filter="url(#soft)"/>` + sparkle(206, 14, 3, '#FFF6D8', false);
  }
  return s;
};
cetoile.scene = cetoileScene;
