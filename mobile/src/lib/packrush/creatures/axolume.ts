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
  if (st >= 2) g += aura(96, 112, 80, pal.accent2);
  if (st > 0) g += ground(112, 204, 92);

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
  if (st >= 2) { const [gx0, gy0] = at(fr, 0.17, -W(0.17)); g += `<ellipse cx="${f(gx0 + 10)}" cy="${f(gy0 - 26)}" rx="30" ry="24" fill="${pal.glow}" opacity="0.35" filter="url(#soft)"/>`; }
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

  // 0 : la larve nage vers la surface ; 1 : le jeune, tête basse, guette sa proie ; 2 : l'adulte se dresse sur la corniche.
  const pose = ['translate(-8 -30) rotate(12 111 150)', 'rotate(3 60 200)', ''][st];
  return `<g transform="${pose}"><g transform="translate(105 204) scale(${S}) translate(-111 -204)">${g}</g></g>`;
};

/* ---------- Décor : étang de nébuleuse (0 herbier la nuit, 1 lit du lac à l'aube, 2 grotte de cristal) ---------- */
function weed(c: DrawCtx, x: number, y0: number, h: number, sway: number, color: string, w = 2.4, bulbs = '', stroke = true): string {
  const pts: P[] = [];
  for (let k = 0; k <= 5; k++) pts.push([x + Math.sin(k * 0.9 + c.r()) * sway * (k / 5), y0 - (h * k) / 5]);
  const fr = frame(pts, 5);
  const d = outline(fr, tab([[0, w], [0.7, w * 0.8], [1, 0.4]]));
  let s = `<path d="${d}" fill="${color}"${stroke ? ' stroke="#140F24" stroke-width="0.6"' : ''}/>`;
  if (bulbs) for (const t of [0.35, 0.6, 0.85]) { const [bx, by] = at(fr, t, (t * 10) % 2 > 1 ? w * 1.6 : -w * 1.6); s += `<circle cx="${f(bx)}" cy="${f(by)}" r="1.6" fill="${bulbs}"/><circle cx="${f(bx)}" cy="${f(by)}" r="4" fill="${bulbs}" opacity="0.35" filter="url(#soft)"/>`; }
  return s;
}
function crystalCluster(x: number, y: number, k: number, fillC: string, light: string, deep: string): string {
  let s = `<ellipse cx="${x}" cy="${y - 10 * k}" rx="${22 * k}" ry="${26 * k}" fill="${light}" opacity="0.3" filter="url(#soft)"/>`;
  for (const [a, L, w] of [[-28, 34, 6], [-8, 46, 7.5], [14, 30, 5.5], [34, 22, 4.5], [-46, 20, 4]] as const) {
    const d = `M${-w} 0 L${-w} ${-L * 0.78} L0 ${-L} L${w} ${-L * 0.78} L${w} 0 Z`;
    s += `<g transform="translate(${x} ${y}) rotate(${a}) scale(${k})"><path d="${d}" fill="${fillC}" stroke="#140F24" stroke-width="${0.8 / k}"/>`
      + `<path d="M0 0 L0 ${-L} L${w} ${-L * 0.78} L${w} 0 Z" fill="${deep}" opacity="0.45"/><path d="M${-w * 0.5} ${-L * 0.2} L${-w * 0.5} ${-L * 0.7}" stroke="#fff" stroke-width="${0.8 / k}" opacity="0.7"/></g>`;
  }
  return s;
}
const axolumeScene = (c: DrawCtx, b: Bounds): string => {
  const { pal, stage, hue } = c;
  const st = Math.min(stage, 2);
  const id = `axolume-${st}-bg`;
  const W2 = b.x1 - b.x0;
  let s = '';
  if (st === 0) {
    s += `<defs>${vgrad(`${id}-w`, [[0, hsl(hue + 10, 38, 30)], [0.45, hsl(hue + 20, 42, 16)], [1, hsl(hue + 30, 45, 7)]])}</defs>${fill(b, `url(#${id}-w)`)}`;
    // Surface et reflet de lune.
    s += `<path d="M${b.x0} ${b.y0 + 16} Q${b.x0 + W2 * 0.25} ${b.y0 + 10} ${b.x0 + W2 * 0.5} ${b.y0 + 16} T${b.x1} ${b.y0 + 16} L${b.x1} ${b.y0} L${b.x0} ${b.y0} Z" fill="${hsl(hue, 30, 42)}" opacity="0.6"/>`;
    s += glowAt(160, b.y0 + 12, 30, 10, '#FFF6D8', 0.55);
    for (const [x, w2, o] of [[150, 46, 0.14], [178, 30, 0.1], [118, 24, 0.08]] as const) s += `<path d="M${x - 10} ${b.y0} L${x + 10} ${b.y0} L${x + w2} ${b.y1} L${x - w2} ${b.y1} Z" fill="${pal.glow}" opacity="${o}"/>`;
    s += stars(c, b, 50, b.y1, pal.light);
    // Herbier lointain (pâle, sans contour) puis proche (bulbes lumineux).
    for (let k = 0; k < 9; k++) s += weed(c, b.x0 + 8 + k * 26 + c.r() * 10, b.y1 + 4, 90 + c.r() * 80, 10, hsl(hue + 30, 22, 30), 2.6, '', false);
    s += ridge(c, b, 214, 4, 8, hsl(hue + 25, 30, 14), 0.8);
    for (let k = 0; k < 14; k++) s += `<ellipse cx="${f(b.x0 + c.r() * W2)}" cy="${f(212 + c.r() * 20)}" rx="${f(3 + c.r() * 5)}" ry="${f(2 + c.r() * 2)}" fill="${hsl(hue + 20, 22, 26)}" stroke="#140F24" stroke-width="0.5"/>`;
    for (const [x, h] of [[8, 150], [24, 110], [196, 170], [212, 120], [184, 90]] as const) s += weed(c, x, b.y1 + 4, h, 14, hsl(hue + 150, 28, 34), 3, pal.accent2);
  } else if (st === 1) {
    s += `<defs>${vgrad(`${id}-w`, [[0, hsl(hue + 50, 40, 40)], [0.5, hsl(hue + 30, 36, 22)], [1, hsl(hue + 20, 40, 10)]])}</defs>${fill(b, `url(#${id}-w)`)}`;
    s += glowAt(200, b.y0 + 10, 70, 40, '#FFE6A8', 0.5);
    for (const [x, w2, o] of [[200, 70, 0.16], [160, 40, 0.1], [226, 50, 0.12]] as const) s += `<path d="M${x - 8} ${b.y0} L${x + 12} ${b.y0} L${x - 30 + w2} ${b.y1} L${x - 30 - w2} ${b.y1} Z" fill="#FFE6A8" opacity="${o}"/>`;
    s += stars(c, b, 30, 180, '#FFF6D8');
    // Roseaux lointains.
    for (let k = 0; k < 14; k++) s += weed(c, b.x0 + c.r() * W2, 190, 70 + c.r() * 70, 6, hsl(hue + 40, 20, 34), 1.4, '', false);
    // Rochers et lit de sable ridé.
    s += `<path d="M-6 200 C-4 160 20 140 44 150 C58 156 62 178 60 200 Z" fill="${hsl(hue + 30, 18, 26)}" stroke="#140F24" stroke-width="0.9"/>`;
    s += shadow('M44 150 C58 156 62 178 60 200 L40 200 C46 186 46 166 44 150 Z', hsl(hue + 30, 30, 14), 0.6, 'fine');
    s += `<path d="M170 196 C172 170 196 156 222 162 L230 200 Z" fill="${hsl(hue + 30, 18, 24)}" stroke="#140F24" stroke-width="0.9"/>`;
    s += ridge(c, b, 198, 3, 6, hsl(hue + 45, 26, 34), 0.8);
    for (let k = 0; k < 6; k++) s += line(`M${f(b.x0 + c.r() * W2)} ${f(206 + k * 5)} q12 -3 24 0 t24 0`, 0.6, '#140F24', ' opacity="0.35"');
    // La proie : une crevette-étoile lumineuse devant le museau.
    const sh = `<g transform="translate(18 112) rotate(-20) scale(1.6)">`
      + glowAt(0, 0, 12, 8, pal.glow, 0.7)
      + `<path d="M-7 0 C-4 -4 4 -4 7 -1 C4 3 -3 4 -7 0 Z" fill="${pal.glow}" stroke="#140F24" stroke-width="0.6"/>`
      + `<path d="M7 -1 l5 -3 l-1 4 l4 2 l-5 1 Z" fill="${pal.glow}" stroke="#140F24" stroke-width="0.5"/>`
      + `<path d="M-7 0 q-6 -8 -2 -14 M-6 1 q-9 -2 -10 -10" fill="none" stroke="${pal.glow}" stroke-width="0.6"/>`
      + `<path d="M-3 2 l-1 3 M0 2 l0 3 M3 1 l1 3" stroke="#140F24" stroke-width="0.5"/></g>`;
    s += sh;
  } else {
    s += `<defs>${vgrad(`${id}-w`, [[0, hsl(hue + 30, 40, 9)], [0.55, hsl(hue + 20, 38, 17)], [1, hsl(hue + 10, 40, 10)]])}</defs>${fill(b, `url(#${id}-w)`)}`;
    // Reflets de l'eau sur la voûte.
    for (let k = 0; k < 10; k++) s += `<path d="M${f(b.x0 + c.r() * W2)} ${f(b.y0 + 20 + c.r() * 50)} q8 -3 16 0" fill="none" stroke="${pal.accent2}" stroke-width="0.8" opacity="0.35"/>`;
    // Stalactites.
    const tip = (x: number, w: number, h: number, col: string) => `<path d="M${x - w} ${b.y0 - 2} Q${x - w * 0.3} ${b.y0 + h * 0.6} ${x} ${b.y0 + h} Q${x + w * 0.3} ${b.y0 + h * 0.6} ${x + w} ${b.y0 - 2} Z" fill="${col}" stroke="#140F24" stroke-width="0.7"/>`;
    for (let k = 0; k < 9; k++) s += tip(b.x0 + k * 27 + c.r() * 12, 8 + c.r() * 8, 18 + c.r() * 34, hsl(hue + 25, 22, 22));
    // Cristaux lointains (atténués) puis proches.
    s += `<g opacity="0.6">${crystalCluster(34, 186, 1.5, pal.accent2, pal.light, pal.deep)}${crystalCluster(150, 170, 1.1, pal.accent2, pal.light, pal.deep)}${crystalCluster(206, 180, 1.3, pal.accent2, pal.light, pal.deep)}</g>`;
    s += glowAt(111, 120, 80, 60, pal.accent2, 0.25);
    // Corniche de roche où se tient la créature, bassin lumineux.
    s += `<path d="M${b.x0 - 4} 222 C10 204 40 198 111 199 C180 198 208 204 ${b.x1 + 4} 218 L${b.x1 + 4} ${b.y1 + 4} L${b.x0 - 4} ${b.y1 + 4} Z" fill="${hsl(hue + 20, 22, 20)}" stroke="#140F24" stroke-width="1"/>`;
    s += shadow(`M${b.x0 - 4} 226 C30 212 80 214 111 214 C160 214 200 216 ${b.x1 + 4} 228 L${b.x1 + 4} ${b.y1 + 4} L${b.x0 - 4} ${b.y1 + 4} Z`, hsl(hue + 20, 40, 8), 0.7, 'xhatch');
    s += `<path d="M30 201 C70 197 150 197 196 201" fill="none" stroke="${pal.accent2}" stroke-width="1" opacity="0.6"/>`;
    s += crystalCluster(8, 226, 0.75, pal.accent2, pal.light, pal.deep) + crystalCluster(214, 230, 0.6, pal.accent2, pal.light, pal.deep);
  }
  return s;
};
axolume.scene = axolumeScene;
