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

/* ---------- Pièces ---------- */

/** Prisme de cristal pointant vers +x. */
function crystal(L: number, w: number, fill: string, light: string, deep: string, glow: string): string {
  const d = `M0 0 L${f(L * 0.22)} ${f(-w)} L${f(L * 0.8)} ${f(-w * 0.75)} L${f(L)} 0 L${f(L * 0.8)} ${f(w * 0.75)} L${f(L * 0.22)} ${f(w)} Z`;
  return `<path d="${d}" fill="${glow}" opacity="0.45" filter="url(#glow)"/>`
    + `<path d="${d}" fill="${fill}"/>`
    + `<path d="M0 0 L${f(L * 0.22)} ${f(-w)} L${f(L * 0.8)} ${f(-w * 0.75)} L${f(L)} 0 Z" fill="${light}" opacity="0.75"/>`
    + `<path d="M${f(L * 0.22)} ${f(w)} L${f(L * 0.8)} ${f(w * 0.75)} L${f(L)} 0 L${f(L * 0.3)} ${f(w * 0.2)} Z" fill="${deep}" opacity="0.55"/>`
    + `<path d="M0 0 L${f(L)} 0 M${f(L * 0.22)} ${f(-w)} L${f(L * 0.3)} ${f(w * 0.2)} L${f(L * 0.22)} ${f(w)} M${f(L * 0.8)} ${f(-w * 0.75)} L${f(L * 0.8)} ${f(w * 0.75)}" fill="none" stroke="#140F24" stroke-width="0.6" opacity="0.6"/>`
    + `<path d="${d}" fill="none" stroke="#140F24" stroke-width="1" stroke-linejoin="round"/>`
    + `<path d="M${f(L * 0.3)} ${f(-w * 0.55)} L${f(L * 0.72)} ${f(-w * 0.5)}" stroke="#fff" stroke-width="0.8" opacity="0.8"/>`;
}

export const axolume: Species = (c) => {
  const { pal, stage } = c;
  const st = Math.min(stage, 2);
  const id = `axolume-${st}`;
  // Larve (0) : corps fin, crête continue, membres naissants ; 1 : sub-adulte ; 2 : adulte aux branchies de cristal.
  const S = [0.95, 0.98, 1][st];
  const bodyK = [0.82, 0.92, 1][st];
  const headK = [1.18, 1.06, 1][st];

  const spine: P[] = [[24, 146], [48, 139], [76, 145], [104, 159], [134, 167], [162, 163], [186, 150], [201, 128], [205, 104], [199, 82], [186, 68]];
  const fr = frame(spine, 8);
  const W = tab([[0, 5], [0.03, 13 * headK], [0.09, 18.5 * headK], [0.15, 17 * headK], [0.21, 14], [0.3, 17 * bodyK], [0.42, 18.5 * bodyK], [0.52, 15 * bodyK], [0.62, 11], [0.75, 7.5], [0.88, 4.5], [1, 1.2]]);
  const w = (t: number) => W(t);
  const nw = (t: number) => -W(t);

  let g = '';
  if (st >= 2) g += aura(96, 112, 92, pal.glow);
  g += ground(112, 204, 92);

  // ---- Nageoire (crête dorsale + ventrale de la queue), membrane translucide derrière le corps ----
  const finTop = tab([[0.22, 0], [0.3, st === 0 ? 7 : 3], [0.45, st === 0 ? 11 : 7], [0.62, 15], [0.8, 19], [0.94, 15], [1, 4]]);
  const finBot = tab([[0.5, 0], [0.6, 6], [0.75, 13], [0.9, 12], [1, 4]]);
  const finD = smooth([...side(fr, (t) => -W(t) - finTop(t), 0.22, 1), ...side(fr, (t) => W(t) + finBot(t), 0.5, 1).reverse()], true);
  g += `<defs><clipPath id="${id}-fin"><path d="${finD}"/></clipPath></defs>`;
  g += `<path d="${finD}" fill="${pal.light}" opacity="0.55"/>`;
  g += `<g clip-path="url(#${id}-fin)">`;
  for (let k = 0; k <= 26; k++) {
    const t = 0.24 + (k / 26) * 0.76;
    const [x0, y0] = at(fr, t, -W(t)), [x1, y1] = at(fr, Math.min(1, t + 0.03), -W(t) - finTop(t) - 2);
    g += line(`M${f(x0)} ${f(y0)} L${f(x1)} ${f(y1)}`, 0.55, pal.deep, ' opacity="0.55"');
    if (t > 0.52) {
      const [a0, b0] = at(fr, t, W(t)), [a1, b1] = at(fr, Math.min(1, t + 0.03), W(t) + finBot(t) + 2);
      g += line(`M${f(a0)} ${f(b0)} L${f(a1)} ${f(b1)}`, 0.55, pal.deep, ' opacity="0.55"');
    }
  }
  g += `<path d="${strip(fr, (t) => -W(t) - finTop(t) * 0.55, (t) => -W(t) - finTop(t) - 2, 0.5, 1)}" fill="${pal.accent}" opacity="0.35"/>`;
  g += `</g>`;
  g += `<path d="${finD}" fill="none" stroke="#140F24" stroke-width="1.1" stroke-linejoin="round"/>`;
  g += rim(curve(fr, (t) => -W(t) - finTop(t), 0.6, 0.97), pal.glow, 1);

  // ---- Membres du côté éloigné (derrière) ----
  const leg = (pts: P[], wd: [number, number][], fill: string, toes: P[], toeBase: P, lw = 1.3) => {
    let s = ink(tube(pts, wd), fill, lw);
    for (const t of toes) s += ink(tube([toeBase, [(toeBase[0] + t[0]) / 2, (toeBase[1] + t[1]) / 2 - 1], t], [[0, 1.9], [1, 1.1]]), fill, 1);
    return s;
  };
  const limbK = [0.55, 0.85, 1][st];
  const L = (p: P, o: P, k = limbK): P => [o[0] + (p[0] - o[0]) * k, o[1] + (p[1] - o[1]) * k];
  // Hanche / épaule (attaches fixes), extrémités raccourcies chez la larve.
  {
    const o1: P = [88, 172], o2: P = [124, 180];
    g += leg([o1, L([96, 186], o1), L([98, 197], o1)], [[0, 5], [0.5, 3.6], [1, 3]], pal.shade, [L([91, 202], o1), L([97, 203], o1), L([103, 202], o1), L([107, 199], o1)], L([98, 197], o1), 1.1);
    if (st > 0) g += leg([o2, L([116, 192], o2), L([112, 199], o2)], [[0, 6], [0.5, 4], [1, 3.2]], pal.shade, [L([104, 203], o2), L([110, 204], o2), L([116, 204], o2), L([121, 202], o2), L([124, 199], o2)], L([112, 199], o2), 1.1);
  }

  // ---- Branchies côté éloigné ----
  const gillL = [26, 40, 50][st];
  const gill = (x: number, y: number, ang: number, len: number, far: boolean) => {
    const env = tube([[0, 0], [len * 0.5, -len * 0.07], [len, -len * 0.02]], [[0, 2], [0.25, 3.6], [0.75, 3.4], [1, 1.6]]);
    const fc = far ? pal.shade : pal.accent;
    let s = '';
    // Fimbriae : franges fines et serrées des deux côtés de la tige (plume).
    for (let k = 1; k < 16; k++) {
      const u = k / 16, x0 = len * u, y0 = -len * 0.07 * Math.sin(u * Math.PI) * 1.2;
      const fl = (6 + st * 1.5) * (1 - Math.abs(u - 0.4) * 0.9);
      for (const sg of [-1, 1]) s += `<path d="M${f(x0)} ${f(y0)} q${f(fl * 0.2)} ${f(sg * fl * 0.6)} ${f(fl * 0.75)} ${f(sg * fl)}" stroke="${fc}" stroke-width="1.5" fill="none" stroke-linecap="round"/>`
        + `<path d="M${f(x0)} ${f(y0)} q${f(fl * 0.2)} ${f(sg * fl * 0.6)} ${f(fl * 0.75)} ${f(sg * fl)}" stroke="#140F24" stroke-width="0.45" fill="none" opacity="0.55"/>`;
    }
    s += `<path d="${env}" fill="${far ? pal.deep : pal.accent}"/>`;
    s += `<path d="${env}" fill="none" stroke="#140F24" stroke-width="0.9"/>`;
    s += line(`M0 0 Q${f(len * 0.5)} ${f(-len * 0.08)} ${f(len)} ${f(-len * 0.02)}`, 1.3, far ? pal.ink : pal.deep);
    if (st >= 1) {
      const cl = st === 1 ? 8 : 17;
      s += G(len - 1, -len * 0.02, -4, crystal(cl, cl * 0.32, pal.accent2, pal.light, pal.deep, pal.glow));
      if (st >= 2) {
        s += G(len * 0.66, -len * 0.06, -34, crystal(10, 3.4, pal.accent2, pal.light, pal.deep, pal.glow));
        if (!far) s += G(len * 0.5, -len * 0.05, 30, crystal(8, 2.8, pal.accent2, pal.light, pal.deep, pal.glow));
      }
    }
    return G(x, y, ang, s);
  };
  for (const [t, o, a, k] of [[0.15, -0.75, -104, 0.86], [0.165, -0.45, -66, 0.9], [0.175, -0.12, -34, 0.8]] as const) {
    const [px, py] = at(fr, t, W(t) * o);
    g += gill(px - 4, py - 2, a, gillL * k, true);
  }

  // ---- Corps ----
  const body = outline(fr, w);
  g += ink(body, pal.body, 1.7);
  // Dos plus clair, ventre dans l'ombre (lumière venant d'en haut à gauche).
  g += `<path d="${strip(fr, (t) => -W(t) * 0.95, (t) => -W(t) * 0.45, 0.02, 0.8)}" fill="${pal.light}" opacity="0.35"/>`;
  g += shadow(strip(fr, (t) => W(t) * 0.25, w, 0.02, 1), pal.shade, 0.7, 'fine');
  g += shadow(strip(fr, (t) => W(t) * 0.68, w, 0.25, 0.7), pal.deep, 0.5, 'xhatch');
  // Pli de la gorge et sillon latéral.
  g += line(curve(fr, (t) => W(t) * 0.1, 0.26, 0.6), 0.7, pal.deep, ' opacity="0.6"');
  for (let k = 0; k < 7; k++) {
    const t = 0.27 + k * 0.035, [x0, y0] = at(fr, t, -W(t) * 0.2), [x1, y1] = at(fr, t + 0.01, W(t) * 0.55);
    g += line(`M${f(x0)} ${f(y0)} Q${f((x0 + x1) / 2 + 2)} ${f((y0 + y1) / 2)} ${f(x1)} ${f(y1)}`, 0.6, pal.deep, ' opacity="0.45"');
  }
  // Mouchetures naturalistes.
  for (let k = 0; k < 22; k++) {
    const t = 0.24 + c.r() * 0.6, o = (c.r() - 0.6) * W(t) * 1.4;
    const [x, y] = at(fr, t, o);
    g += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(0.8 + c.r() * 1.3)}" ry="${f(0.6 + c.r() * 0.8)}" fill="${pal.deep}" opacity="0.55"/>`;
  }
  g += rim(curve(fr, nw, 0.05, 0.55), pal.glow, 1.3);
  g += `<path d="${body}" fill="none" stroke="#140F24" stroke-width="1.7"/>`;

  // ---- Tête (détails) ----
  const [ex, ey] = at(fr, 0.075, -W(0.075) * 0.38);
  // Bouche : longue ligne droite, à peine relevée (pas de sourire).
  const mouth = curve(fr, (t) => W(t) * 0.32 + t * 6, 0.015, 0.13);
  g += line(mouth, 1.1);
  const [nx, ny] = at(fr, 0.012, -W(0.012) * 0.45);
  g += `<ellipse cx="${f(nx + 2)}" cy="${f(ny)}" rx="1" ry="0.7" fill="#140F24"/>`;
  g += shadow(strip(fr, (t) => W(t) * 0.36 + t * 6, w, 0.02, 0.15), pal.shade, 0.4, 'fine');
  g += eyeA(ex, ey, 4.2 * headK, pal.eye, { angle: -6, slit: false, open: 0.62 });
  g += line(`M${f(ex - 6)} ${f(ey - 4.5)} Q${f(ex)} ${f(ey - 8)} ${f(ex + 7)} ${f(ey - 4)}`, 0.7, pal.deep, ' opacity="0.7"');

  // ---- Branchies côté proche ----
  for (const [t, o, a, k] of [[0.17, -0.7, -80, 1], [0.185, -0.35, -46, 0.94], [0.195, 0.05, -14, 0.8]] as const) {
    const [px, py] = at(fr, t, W(t) * o);
    g += gill(px, py, a, gillL * k, false);
  }

  // ---- Membres côté proche ----
  {
    const o1: P = [72, 166], o2: P = [142, 176];
    g += leg([o1, L([60, 182], o1), L([56, 196], o1)], [[0, 8], [0.45, 5], [1, 3.6]], pal.body, [L([44, 202], o1), L([50, 205], o1), L([57, 205], o1), L([63, 202], o1)], L([56, 196], o1));
    g += shadow(tube([o1, L([60, 182], o1), L([56, 196], o1)], [[0, 2], [0.45, 2], [1, 1.5]]), pal.shade, 0.5, 'fine');
    if (st > 0) {
      g += leg([o2, L([162, 186], o2), L([158, 198], o2)], [[0, 10], [0.45, 5.6], [1, 3.8]], pal.body, [L([144, 203], o2), L([151, 205], o2), L([158, 205], o2), L([165, 204], o2), L([170, 201], o2)], L([158, 198], o2));
      g += shadow(tube([o2, L([162, 186], o2), L([158, 198], o2)], [[0, 3], [0.45, 2.2], [1, 1.5]]), pal.shade, 0.5, 'fine');
    } else {
      // Bourgeon de patte arrière.
      g += ink(tube([o2, [150, 184], [154, 188]], [[0, 4], [1, 2]]), pal.body, 1.1);
    }
  }

  // ---- Ornements célestes ----
  if (st >= 1) g += constellation([at(fr, 0.32, -4), at(fr, 0.38, 3), at(fr, 0.45, -2), at(fr, 0.52, 4)], st >= 2 ? pal.gold : '#FFF6D8');
  if (st >= 2) {
    g += gild(curve(fr, (t) => -W(t) * 0.62 + Math.sin(t * 60) * 1.4, 0.24, 0.62), 0.9);
    g += gild(curve(fr, (t) => -W(t) * 0.5, 0.62, 0.9), 0.8);
    const [gx, gy] = at(fr, 0.1, -W(0.1) * 0.75);
    g += gild(`M${f(gx - 4)} ${f(gy)} a4 4 0 1 0 8 0 a3.2 3.2 0 1 1 -8 0 Z`, 0.9);
    for (const [x, y, z] of [[24, 70, 3.5], [44, 46, 2.6], [150, 40, 3], [208, 150, 2.6]] as const) g += sparkle(x, y, z, pal.glow, false);
  } else if (st === 1) {
    g += sparkle(36, 62, 2.6, pal.glow, false) + sparkle(160, 46, 2.2, pal.glow, false);
  }
  // Bulles.
  for (const [x, y, r] of [[30, 104, 2.6], [22, 90, 1.7], [28, 78, 1.1]] as const) g += `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${pal.light}" stroke-width="0.7" opacity="0.8"/>`;

  return `<g transform="translate(111 204) scale(${S}) translate(-111 -204)">${g}</g>`;
};
