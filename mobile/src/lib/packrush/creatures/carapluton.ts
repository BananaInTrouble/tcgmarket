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

/** Carapluton → Orbitortue → Mondécaille : tortue terrestre dont la dossière est une planète (lune cratérisée, puis géante gazeuse annelée). */
export const carapluton: Species = (c) => {
  const { pal, stage } = c;
  const st = Math.min(stage, 2);
  const id = `carapluton-${st}`;
  const S = [1.02, 1, 1][st];
  const headK = [1.3, 1.12, 1][st];
  // Dossière.
  const sx = 124, rimY = [176, 172, 168][st], sTop = [98, 80, 64][st], rx = [64, 72, 78][st];
  const x0 = sx - rx, x1 = sx + rx, H = rimY - sTop;
  const dome = `M${f(x0)} ${f(rimY)} C${f(x0 - 1)} ${f(rimY - H * 0.6)} ${f(sx - rx * 0.6)} ${f(sTop)} ${f(sx)} ${f(sTop)} C${f(sx + rx * 0.6)} ${f(sTop)} ${f(x1 + 1)} ${f(rimY - H * 0.6)} ${f(x1)} ${f(rimY)} Q${f(sx)} ${f(rimY + 18)} ${f(x0)} ${f(rimY)} Z`;
  const gy = 202;
  let g = '';
  if (st >= 2) g += aura(sx, 112, 96, pal.glow);
  g += ground(122, 204, 96);

  // Anneau (moitié arrière).
  const ring = (front: boolean) => {
    const R = 98, r = 19, wdt = 15;
    const half = (rxo: number, ryo: number, sweep: number) => `A${rxo} ${ryo} 0 0 ${sweep}`;
    const d = front
      ? `M${-R} 0 ${half(R, r, 0)} ${R} 0 L${R - wdt} 0 ${half(R - wdt, r - 5, 1)} ${-(R - wdt)} 0 Z`
      : `M${-R} 0 ${half(R, r, 1)} ${R} 0 L${R - wdt} 0 ${half(R - wdt, r - 5, 0)} ${-(R - wdt)} 0 Z`;
    const arc = (k: number) => front ? `M${f(-(R - k))} 0 A${f(R - k)} ${f(r - k * 0.33)} 0 0 0 ${f(R - k)} 0` : `M${f(-(R - k))} 0 A${f(R - k)} ${f(r - k * 0.33)} 0 0 1 ${f(R - k)} 0`;
    let s = `<path d="${d}" fill="${pal.light}" opacity="${front ? 0.78 : 0.5}"/>`;
    for (const k of [3, 6, 11, 13]) s += line(arc(k), 0.5, pal.deep, ' opacity="0.7"');
    s += line(arc(8.5), 1.3, pal.deep, ' opacity="0.85"');
    s += `<path d="${d}" fill="none" stroke="#140F24" stroke-width="1"/>`;
    if (front) s += rim(arc(0.5), pal.glow, 0.9);
    return `<g transform="translate(${sx} ${f(sTop + H * 0.5)}) rotate(11)">${s}</g>`;
  };
  if (st >= 2) g += ring(false);

  // ---- Membres côté éloigné ----
  const legT = rimY - 4;
  const legF = (pts: P[], wd: [number, number][], fill: string, near: boolean) => {
    const d = tube(pts, wd);
    let s = ink(d, fill, near ? 1.5 : 1.2);
    const last = pts[pts.length - 1], ww = wd[wd.length - 1][1];
    // Écailles en rangées (arcs fins).
    const fr = frame(pts, 6);
    for (let k = 1; k < 6; k++) {
      const t = 0.15 + k * 0.14;
      s += line(curve(fr, (u) => (u - t) * 120, Math.max(0, t - 0.06), Math.min(1, t + 0.06)), 0.1, 'none');
      const [ax, ay] = at(fr, t, -tab(wd)(t) * 0.8), [bx, by] = at(fr, t + 0.04, tab(wd)(t) * 0.8);
      s += line(`M${f(ax)} ${f(ay)} Q${f((ax + bx) / 2)} ${f((ay + by) / 2 + 3)} ${f(bx)} ${f(by)}`, 0.6, pal.deep, ' opacity="0.7"');
    }
    if (near) {
      for (let k = 0; k < 4; k++) {
        const t = 0.35 + k * 0.17, [ex, ey] = at(fr, t, -tab(wd)(t) * 0.45);
        s += `<ellipse cx="${f(ex)}" cy="${f(ey)}" rx="${f(3.4 - k * 0.3)}" ry="${f(2.4 - k * 0.2)}" fill="${pal.light}" stroke="#140F24" stroke-width="0.6" opacity="0.8"/>`;
      }
      s += shadow(strip(fr, (u) => tab(wd)(u) * 0.2, tab(wd), 0, 1), pal.shade, 0.6, 'fine');
    }
    // Griffes.
    for (let k = 0; k < 4; k++) {
      const cx = last[0] - ww + 2 + k * (ww * 0.62);
      s += ink(`M${f(cx - 1.8)} ${f(gy - 1)} q-1.5 2.5 -3.5 3 q2.8 0.6 5.5 -1 Z`, pal.belly, 0.8);
    }
    return s;
  };
  const lk = [0.7, 0.86, 1][st];
  g += legF([[x0 + rx * 0.4, legT], [x0 + rx * 0.44, legT + (gy - legT) * 0.55], [x0 + rx * 0.46, gy]], [[0, 9 * lk + 2], [0.6, 8 * lk + 1.5], [1, 9 * lk + 1.5]], pal.shade, false);
  g += legF([[x1 - rx * 0.3, legT], [x1 - rx * 0.3, legT + (gy - legT) * 0.55], [x1 - rx * 0.32, gy]], [[0, 10 * lk + 2], [0.6, 9 * lk + 1.5], [1, 9.5 * lk + 1.5]], pal.shade, false);
  // Queue.
  g += ink(tube([[x1 - 8, rimY - 2], [x1 + 6, rimY + 4], [x1 + 14, rimY + 10]], [[0, 5], [1, 1]]), pal.body, 1.2);
  // Ombre sous la carapace (peau, profondeur).
  g += `<path d="M${f(x0 + 4)} ${f(rimY)} Q${f(sx)} ${f(rimY + 30)} ${f(x1 - 4)} ${f(rimY)} Z" fill="${pal.deep}"/>`;

  // ---- Cou et tête ----
  const hx = x0 - 4, hy = rimY - [42, 44, 56][st];
  const neckFr = frame([[x0 + 18, rimY - 2], [x0 + 6, rimY - 12], [x0 - 2, rimY - 26], [hx + 4, hy + 4]], 6);
  const neckW = tab([[0, 13 * Math.min(1.1, headK)], [1, 8.5 * headK]]);
  g += ink(outline(neckFr, neckW), pal.body, 1.4);
  g += shadow(strip(neckFr, (t) => neckW(t) * 0.1, neckW), pal.shade, 0.7, 'fine');
  for (let k = 1; k < 6; k++) {
    const t = k / 6, [ax, ay] = at(neckFr, t, -neckW(t) * 0.9), [bx, by] = at(neckFr, t - 0.05, neckW(t) * 0.9);
    g += line(`M${f(ax)} ${f(ay)} Q${f((ax + bx) / 2 + 3)} ${f((ay + by) / 2)} ${f(bx)} ${f(by)}`, 0.6, pal.deep, ' opacity="0.65"');
  }
  let hd = '';
  const head = 'M8 -9 C3 -16 -12 -18 -23 -13 C-29 -10 -33 -4 -32 1 C-31 5 -27 8 -21 9 C-11 12 0 12 8 8 C11 3 11 -4 8 -9 Z';
  hd += ink(head, pal.body, 1.6);
  hd += shadow('M-31 3 C-27 8 -21 9 -21 9 C-11 12 0 12 8 8 C11 3 11 -2 9 -5 C4 2 -8 6 -20 4 Z', pal.shade, 0.75, 'fine');
  // Bec : mâchoire supérieure crochue, commissure.
  hd += ink('M-32 1 C-33 4 -31 7 -28 7 L-26 3 Z', pal.belly, 0.8);
  hd += line('M-30 3.5 C-24 5 -17 5 -10 4 C-6 3.6 -3 4.8 -1 6.4', 1);
  hd += `<ellipse cx="-29" cy="-5" rx="0.9" ry="0.7" fill="#140F24"/>`;
  // Écailles de la tête.
  hd += line('M-18 -15 C-16 -11 -12 -10 -8 -11 M-8 -11 C-6 -14 -3 -15 1 -14 M-8 -11 C-8 -8 -6 -6 -3 -5 M-21 -11 C-22 -8 -23 -6 -26 -5', 0.6, pal.deep, ' opacity="0.7"');
  hd += eyeA(-15, -5, 4.2, pal.eye, { angle: -4, slit: false, open: 0.5 });
  hd += line('M-21 -9 Q-15 -12.5 -9 -9', 0.9, pal.deep);
  hd += rim('M-24 -13 C-14 -18 0 -16 6 -10', pal.glow, 1);
  g += `<g transform="translate(${f(hx)} ${f(hy)}) scale(${headK})">${hd}</g>`;

  // ---- Membres côté proche ----
  g += legF([[x0 + 18, legT - 4], [x0 + 6, legT + (gy - legT) * 0.45], [x0 + 10, gy]], [[0, 11 * lk + 2], [0.55, 9 * lk + 1.5], [1, 10 * lk + 1.5]], pal.body, true);
  g += legF([[x1 - 18, legT - 6], [x1 - 8, legT + (gy - legT) * 0.5], [x1 - 12, gy]], [[0, 14 * lk + 2], [0.55, 11 * lk + 1.5], [1, 11 * lk + 1.5]], pal.body, true);

  // ---- Dossière-planète ----
  g += `<defs><clipPath id="${id}-d"><path d="${dome}"/></clipPath></defs>`;
  g += `<path d="${dome}" fill="${st === 0 ? pal.light : pal.body}"/>`;
  g += `<g clip-path="url(#${id}-d)">`;
  const band = (y: number, h: number, fill: string, op: number, wav = 0) => {
    const bow = 10 + (y - sTop) * 0.05;
    const top = `M${f(x0 - 4)} ${f(y)} Q${f(sx - rx * 0.4)} ${f(y + bow + wav)} ${f(sx)} ${f(y + bow)} T${f(x1 + 4)} ${f(y)}`;
    return `<path d="${top} L${f(x1 + 4)} ${f(y + h)} Q${f(sx + rx * 0.4)} ${f(y + h + bow - wav)} ${f(sx)} ${f(y + h + bow)} T${f(x0 - 4)} ${f(y + h)} Z" fill="${fill}" opacity="${op}"/>`;
  };
  if (st === 0) {
    // Jeune lune : régolithe clair et cratères.
    for (const [x, y, r] of [[sx - 26, sTop + 26, 9], [sx + 16, sTop + 18, 6], [sx + 6, sTop + 50, 11], [sx - 44, sTop + 56, 6], [sx + 40, sTop + 46, 7], [sx - 12, sTop + 66, 5]] as const) {
      g += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${r}" ry="${f(r * 0.72)}" fill="${pal.shade}" opacity="0.45"/>`;
      g += `<path d="M${f(x - r)} ${f(y)} A${r} ${f(r * 0.72)} 0 0 1 ${f(x + r)} ${f(y)}" fill="none" stroke="${pal.deep}" stroke-width="0.8" opacity="0.7"/>`;
      g += `<path d="M${f(x - r * 0.8)} ${f(y + r * 0.35)} A${r} ${f(r * 0.72)} 0 0 0 ${f(x + r * 0.8)} ${f(y + r * 0.35)}" fill="none" stroke="#FFF6D8" stroke-width="0.8" opacity="0.7"/>`;
    }
  } else {
    // Bandes de géante gazeuse.
    const cols = [pal.light, pal.shade, pal.belly, pal.accent, pal.light, pal.deep, pal.body, pal.accent2];
    let y = sTop - 6, k = 0;
    while (y < rimY + 6) {
      const h = 7 + ((k * 37) % 9);
      g += band(y, h, cols[k % cols.length], k % 2 ? 0.55 : 0.35, (k % 3 - 1) * 4);
      g += line(`M${f(x0 - 4)} ${f(y + h)} Q${f(sx - rx * 0.4)} ${f(y + h + 10 + (y - sTop) * 0.05 + 2)} ${f(sx)} ${f(y + h + 10 + (y - sTop) * 0.05)} T${f(x1 + 4)} ${f(y + h)}`, 0.5, pal.deep, ' opacity="0.5"');
      y += h; k++;
    }
    // Grande tempête.
    const tx = sx + rx * 0.28, ty = sTop + H * 0.58;
    g += `<ellipse cx="${f(tx)}" cy="${f(ty)}" rx="${st === 2 ? 12 : 8}" ry="${st === 2 ? 5.5 : 4}" fill="${pal.accent}" stroke="#140F24" stroke-width="0.8"/>`;
    g += `<ellipse cx="${f(tx)}" cy="${f(ty)}" rx="${st === 2 ? 7 : 4.5}" ry="${st === 2 ? 3 : 2}" fill="none" stroke="${pal.deep}" stroke-width="0.6"/>`;
  }
  // Terminateur : ombre gravée à droite, lumière en haut à gauche.
  g += shadow(`M${f(sx + rx * 0.05)} ${f(sTop - 4)} C${f(sx + rx * 0.75)} ${f(sTop + H * 0.15)} ${f(sx + rx * 0.62)} ${f(rimY - H * 0.25)} ${f(sx - rx * 0.1)} ${f(rimY + 14)} L${f(x1 + 6)} ${f(rimY + 14)} L${f(x1 + 6)} ${f(sTop - 6)} Z`, pal.shade, 0.55, 'fine');
  g += shadow(`M${f(sx + rx * 0.55)} ${f(sTop)} C${f(sx + rx * 1.02)} ${f(sTop + H * 0.3)} ${f(sx + rx * 0.9)} ${f(rimY - H * 0.15)} ${f(sx + rx * 0.4)} ${f(rimY + 14)} L${f(x1 + 6)} ${f(rimY + 14)} L${f(x1 + 6)} ${f(sTop - 6)} Z`, pal.deep, 0.45, 'xhatch');
  // Écailles de la dossière (vertébrales, costales, marginales).
  const yv = sTop + H * 0.42;
  const seam = st >= 2 ? '#E9C25B' : pal.deep;
  const sw = st >= 2 ? 0.9 : 0.8, so = st >= 2 ? ' opacity="0.85"' : ' opacity="0.7"';
  g += line(`M${f(sx - rx * 0.78)} ${f(yv + 10)} Q${f(sx)} ${f(yv - 12)} ${f(sx + rx * 0.78)} ${f(yv + 10)}`, sw, seam, so);
  for (const u of [-0.42, -0.1, 0.24, 0.56]) g += line(`M${f(sx + rx * u)} ${f(yv - 2 + Math.abs(u) * 10)} L${f(sx + rx * (u + 0.03))} ${f(sTop + 2)}`, sw, seam, so);
  for (const u of [-0.62, -0.28, 0.06, 0.4, 0.72]) g += line(`M${f(sx + rx * u * 1.04)} ${f(yv + 2 + Math.abs(u) * 10)} L${f(sx + rx * u * 1.2)} ${f(rimY - 6 + Math.abs(u) * -6 + 6)}`, sw, seam, so);
  const mY = rimY - 11;
  g += line(`M${f(x0 + 2)} ${f(mY + 4)} Q${f(sx)} ${f(mY + 22)} ${f(x1 - 2)} ${f(mY + 4)}`, sw, seam, so);
  for (let k = 1; k < 12; k++) {
    const u = k / 12, x = x0 + (x1 - x0) * u, yy = mY + 4 + 18 * 4 * u * (1 - u) * 0.5;
    g += line(`M${f(x)} ${f(yy)} l${f((u - 0.5) * 3)} 9`, 0.6, pal.deep, ' opacity="0.6"');
  }
  g += `</g>`;
  g += rim(`M${f(x0 + 2)} ${f(rimY - 10)} C${f(x0)} ${f(rimY - H * 0.6)} ${f(sx - rx * 0.6)} ${f(sTop)} ${f(sx + 6)} ${f(sTop)}`, pal.glow, 1.3);
  g += `<path d="${dome}" fill="none" stroke="#140F24" stroke-width="1.8" stroke-linejoin="round"/>`;
  if (st >= 2) g += ring(true);

  // ---- Lunes et ornements ----
  const moon = (x: number, y: number, r: number) => {
    let s = `<circle cx="${x}" cy="${y}" r="${r}" fill="${pal.belly}" stroke="#140F24" stroke-width="1"/>`;
    s += shadow(`M${x} ${y - r} A${r} ${r} 0 0 1 ${x} ${y + r} A${r * 0.55} ${r} 0 0 0 ${x} ${y - r} Z`, pal.shade, 0.7, 'fine');
    s += `<circle cx="${f(x - r * 0.3)}" cy="${f(y - r * 0.2)}" r="${f(r * 0.22)}" fill="${pal.shade}" opacity="0.6"/>`;
    return s;
  };
  if (st === 1) g += moon(196, 60, 5.5) + line('M150 54 Q176 52 190 58', 0.6, '#FFF6D8', ' opacity="0.5" stroke-dasharray="2 3"');
  if (st >= 2) {
    g += moon(30, 70, 9) + moon(198, 44, 5);
    g += constellation([[48, 40], [66, 30], [84, 36], [96, 24]], pal.gold);
    for (const [x, y, z] of [[176, 24, 3], [20, 112, 2.6], [210, 98, 2.4]] as const) g += sparkle(x, y, z, pal.glow, false);
  } else if (st === 0) {
    g += sparkle(54, 70, 2.6, pal.glow, false) + sparkle(196, 76, 2.2, pal.glow, false);
  }
  // 0 : le petit vient d'éclore, coquille brisée autour de lui.
  if (st === 0) {
    g += `<path d="M30 206 C26 190 34 178 44 176 L48 184 L54 180 L58 190 L66 186 L70 198 C70 204 60 208 30 206 Z" fill="#F2EAD8" stroke="#140F24" stroke-width="1.1"/>`;
    g += shadow('M30 206 C26 190 34 178 44 176 C40 188 44 200 70 198 C70 204 60 208 30 206 Z', pal.shade, 0.5, 'fine');
    g += `<path d="M168 206 C168 196 176 188 186 190 L190 196 L196 194 L200 204 Z" fill="#F2EAD8" stroke="#140F24" stroke-width="1"/>`;
  }
  return `<g transform="translate(111 204) scale(${S}) translate(-111 -204)">${g}</g>`;
};

/* ---------- Décor : désert lunaire (0 nid de sable la nuit, 1 traversée à l'aube, 2 astéroïde au-dessus d'une géante) ---------- */
function eggAt(x: number, y: number, r: number, col: string, dots: string): string {
  return `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${f(r * 1.15)}" fill="${col}" stroke="#140F24" stroke-width="0.9"/>`
    + `<path d="M${f(x + r * 0.2)} ${f(y - r * 1.1)} A${r} ${f(r * 1.15)} 0 0 1 ${f(x + r * 0.3)} ${f(y + r * 1.1)} A${f(r * 0.7)} ${f(r * 1.15)} 0 0 0 ${f(x + r * 0.2)} ${f(y - r * 1.1)} Z" fill="url(#fine)"/>`
    + `<circle cx="${f(x - r * 0.3)}" cy="${f(y - r * 0.2)}" r="${f(r * 0.18)}" fill="${dots}" opacity="0.6"/><circle cx="${f(x + r * 0.1)}" cy="${f(y + r * 0.4)}" r="${f(r * 0.12)}" fill="${dots}" opacity="0.6"/>`;
}
function craterAt(x: number, y: number, rx: number, col: string, lit: string): string {
  return `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${f(rx * 0.28)}" fill="${col}" stroke="#140F24" stroke-width="0.6" opacity="0.9"/>`
    + `<path d="M${f(x - rx * 0.9)} ${f(y + rx * 0.08)} A${rx} ${f(rx * 0.28)} 0 0 0 ${f(x + rx * 0.9)} ${f(y + rx * 0.08)}" fill="none" stroke="${lit}" stroke-width="0.8" opacity="0.7"/>`;
}
const caraplutonScene = (c: DrawCtx, b: Bounds): string => {
  const { pal, stage, hue } = c;
  const st = Math.min(stage, 2);
  const id = `carapluton-${st}-bg`;
  let s = '';
  if (st === 0) {
    s += `<defs>${vgrad(`${id}-s`, [[0, hsl(hue + 220, 40, 8)], [0.7, hsl(hue + 210, 36, 18)], [1, hsl(hue + 200, 30, 26)]])}</defs>${fill(b, `url(#${id}-s)`)}`;
    s += stars(c, b, 90, 150);
    // Planète bleue qui se lève.
    s += glowAt(178, 52, 40, 30, '#9CC7FF', 0.35);
    s += `<circle cx="178" cy="52" r="26" fill="${hsl(210, 40, 46)}" stroke="#140F24" stroke-width="0.8"/>`;
    s += `<path d="M160 44 q8 -5 14 2 q6 6 14 1 M156 58 q10 3 16 -2 q8 -3 14 3" fill="none" stroke="${hsl(120, 25, 50)}" stroke-width="2.4" opacity="0.6"/>`;
    s += shadow('M184 26 A26 26 0 0 1 184 78 A18 26 0 0 0 184 26 Z', hsl(220, 50, 14), 0.75, 'fine');
    s += ridge(c, b, 150, 4, 6, hsl(hue + 210, 14, 34), 0.8);
    s += ridge(c, b, 176, 6, 5, hsl(hue + 210, 14, 42), 0.9);
    s += craterAt(186, 186, 18, hsl(hue + 210, 14, 34), '#FFF6D8');
    // Nid creusé, autres œufs, fragments de coquille.
    s += `<ellipse cx="118" cy="208" rx="98" ry="16" fill="${hsl(hue + 210, 16, 30)}" stroke="#140F24" stroke-width="0.8"/>`;
    s += shadow('M20 208 A98 16 0 0 1 216 208 A98 10 0 0 0 20 208 Z', hsl(hue + 210, 30, 14), 0.7, 'fine');
    s += eggAt(196, 200, 11, hsl(hue + 30, 18, 82), pal.shade) + eggAt(212, 210, 9, hsl(hue + 30, 18, 78), pal.shade) + eggAt(16, 206, 10, hsl(hue + 30, 18, 80), pal.shade);
    s += ridge(c, b, 226, 3, 6, hsl(hue + 210, 14, 44), 0.8);
  } else if (st === 1) {
    s += `<defs>${vgrad(`${id}-s`, [[0, hsl(235, 40, 12)], [0.4, hsl(262, 28, 28)], [0.6, hsl(20, 50, 56)], [0.68, hsl(36, 75, 74)]])}</defs>${fill(b, `url(#${id}-s)`)}`;
    s += stars(c, b, 60, 110);
    s += glowAt(40, 150, 70, 26, '#FFE3A0', 0.75);
    s += `<path d="M24 155 a16 16 0 0 1 32 0 Z" fill="#FFF0C8" stroke="#140F24" stroke-width="0.6"/>`;
    // Mesas lointaines (pâles), puis dunes de régolithe.
    s += `<path d="M${b.x0 - 4} 154 L${b.x0 - 4} 132 L14 130 L20 138 L50 138 L56 146 L92 148 L96 154 Z" fill="${hsl(262, 18, 42)}" opacity="0.8"/>`;
    s += `<path d="M196 154 L198 140 L208 136 L222 138 L${b.x1 + 4} 140 L${b.x1 + 4} 154 Z" fill="${hsl(262, 18, 42)}" opacity="0.8"/>`;
    s += ridge(c, b, 154, 2, 6, hsl(250, 12, 40), 0.7);
    s += ridge(c, b, 170, 5, 5, hsl(30, 12, 46), 0.8);
    s += ridge(c, b, 196, 4, 5, hsl(30, 14, 54), 0.9);
    for (let k = 0; k < 6; k++) s += line(`M${f(130 + k * 18)} ${f(178 + k * 3)} q6 -2 10 0`, 0.7, '#140F24', ' opacity="0.35"');
    // Traces de pas qui s'éloignent derrière.
    for (let k = 0; k < 6; k++) s += `<ellipse cx="${f(212 - k * 12 + (k % 2) * 3)}" cy="${f(208 - k * 5)}" rx="${f(4 - k * 0.4)}" ry="${f(1.6 - k * 0.15)}" fill="${hsl(30, 14, 38)}"/>`;
    s += craterAt(36, 214, 22, hsl(30, 12, 44), '#FFF6D8') + craterAt(198, 182, 10, hsl(30, 12, 44), '#FFF6D8');
    // Lumière rasante : liseré chaud sur les crêtes.
    s += glowAt(50, 168, 90, 12, '#FFE3A0', 0.25);
  } else {
    s += fill(b, hsl(hue + 230, 45, 8));
    s += stars(c, b, 110, b.y1);
    s += glowAt(60, 40, 60, 40, pal.accent, 0.25) + glowAt(180, 60, 40, 30, pal.accent2, 0.2);
    // Géante gazeuse en contrebas.
    s += `<defs><clipPath id="${id}-p"><circle cx="40" cy="330" r="190"/></clipPath></defs>`;
    s += glowAt(40, 150, 140, 30, pal.glow, 0.25);
    s += `<circle cx="40" cy="330" r="190" fill="${hsl(hue + 180, 28, 40)}"/>`;
    s += `<g clip-path="url(#${id}-p)">`;
    for (let k = 0; k < 9; k++) s += `<ellipse cx="40" cy="${330 - 150 + k * 14}" rx="210" ry="12" fill="${[hsl(hue + 170, 30, 70), hsl(hue + 190, 30, 26), hsl(hue + 200, 25, 54), hsl(hue + 160, 30, 80)][k % 4]}" opacity="0.4" transform="rotate(-8 40 330)"/>`;
    s += shadow('M100 140 A190 190 0 0 1 230 330 L240 330 L240 120 Z', hsl(hue + 230, 50, 8), 0.6, 'fine');
    s += `</g><circle cx="40" cy="330" r="190" fill="none" stroke="#140F24" stroke-width="0.9"/>`;
    s += `<path d="M-60 210 A190 190 0 0 1 110 146" fill="none" stroke="${pal.glow}" stroke-width="1.4" opacity="0.7"/>`;
    // Astéroïdes flottants.
    const rock = (x: number, y: number, r: number) => `<path d="M${x - r} ${y} Q${x - r} ${y - r * 0.9} ${x} ${y - r * 0.8} Q${x + r * 1.1} ${y - r * 0.7} ${x + r} ${y + r * 0.1} Q${x + r * 0.6} ${y + r * 0.8} ${x - r * 0.2} ${y + r * 0.7} Q${x - r} ${y + r * 0.5} ${x - r} ${y} Z" fill="${hsl(hue + 20, 14, 36)}" stroke="#140F24" stroke-width="0.7"/>`
      + `<path d="M${x + r * 0.2} ${y - r * 0.7} Q${x + r * 1.1} ${y - r * 0.6} ${x + r} ${y + r * 0.1} Q${x + r * 0.6} ${y + r * 0.8} ${x - r * 0.2} ${y + r * 0.7} Q${x + r * 0.5} ${y} ${x + r * 0.2} ${y - r * 0.7} Z" fill="url(#fine)"/>`;
    s += rock(198, 30, 7) + rock(24, 30, 4) + rock(206, 120, 5) + rock(150, 18, 3);
    // L'astéroïde sous les pattes.
    s += `<path d="M${b.x0 - 4} 214 C20 198 70 194 120 196 C170 196 206 200 ${b.x1 + 4} 210 L${b.x1 + 4} 230 C180 244 60 246 ${b.x0 - 4} 232 Z" fill="${hsl(hue + 20, 14, 34)}" stroke="#140F24" stroke-width="1"/>`;
    s += shadow(`M${b.x0 - 4} 222 C40 216 120 214 ${b.x1 + 4} 220 L${b.x1 + 4} 230 C180 244 60 246 ${b.x0 - 4} 232 Z`, hsl(hue + 20, 40, 10), 0.7, 'xhatch');
    s += craterAt(30, 206, 12, hsl(hue + 20, 14, 28), pal.glow) + craterAt(200, 206, 9, hsl(hue + 20, 14, 28), pal.glow);
    s += `<path d="M10 200 C60 194 160 194 210 202" fill="none" stroke="${pal.glow}" stroke-width="0.9" opacity="0.6"/>`;
  }
  return s;
};
carapluton.scene = caraplutonScene;
