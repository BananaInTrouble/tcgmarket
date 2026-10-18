import { aura, constellation, eyeA, gild, ground, ink, line, rim, shadow, sparkle, type Species } from './style.ts';

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
  g += ground(100, 210, 66);

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
  return `<g transform="translate(104 124) scale(${S}) translate(-104 -124)">${g}</g>`;
};
