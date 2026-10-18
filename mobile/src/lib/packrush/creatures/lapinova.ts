import { aura, constellation, eyeA, fur, gild, ground, hsl, ink, line, rim, shadow, sparkle, type Bounds, type DrawCtx, type Species } from './style.ts';

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

/* ---------- Lièvre lunaire ---------- */
const cl = (pts: P[]) => smooth(pts, true);
const op = (pts: P[]) => smooth(pts);
const mv = (pts: P[], dx: number, dy: number): P[] => pts.map(([x, y]) => [x + dx, y + dy]);

interface Pose {
  body: P[]; belly: P[]; haunch: P[]; shadeB: P[];
  head: P[]; jaw: P[]; eye: P; eyeAng: number; nose: P; earN: P[]; earF: P[];
  foreN: P[]; foreF: P[]; foot: P[]; footF?: P[]; tail: P;
}
const POSES: Pose[] = [
  // 0 : levraut tapi au gîte, oreilles couchées.
  {
    body: [[86, 148], [108, 140], [136, 142], [160, 154], [176, 174], [176, 194], [162, 203], [104, 204], [82, 198], [74, 182], [76, 162]],
    belly: [[76, 166], [74, 182], [82, 198], [96, 202], [92, 186], [88, 170]],
    haunch: [[122, 202], [126, 182], [142, 166], [164, 166], [174, 182]],
    shadeB: [[176, 174], [176, 194], [162, 203], [124, 204], [146, 194], [160, 180], [164, 160]],
    head: [[92, 150], [86, 136], [72, 128], [56, 130], [44, 140], [38, 150], [40, 158], [50, 166], [66, 170], [84, 166]],
    jaw: [[40, 158], [50, 166], [66, 170], [84, 166], [70, 162], [54, 160]],
    eye: [66, 144], eyeAng: -4, nose: [40, 149],
    earN: [[74, 134], [94, 124], [122, 120], [146, 124], [150, 129], [128, 134], [98, 138], [82, 142]],
    earF: [[80, 130], [100, 116], [126, 108], [146, 108], [148, 113], [126, 120], [100, 130]],
    foreN: [[80, 176], [76, 192], [68, 203]],
    foreF: [[90, 180], [88, 194], [84, 203]],
    foot: [[168, 196], [150, 200], [128, 202], [112, 203], [108, 206], [130, 207], [160, 207], [174, 203]],
    tail: [178, 176],
  },
  // 1 : sub-adulte assis, aux aguets.
  {
    body: [[98, 96], [118, 100], [142, 114], [164, 136], [178, 160], [182, 182], [174, 198], [156, 203], [120, 203], [100, 200], [92, 184], [88, 160], [86, 136], [88, 114]],
    belly: [[88, 114], [86, 136], [88, 160], [92, 184], [100, 199], [100, 172], [97, 142], [98, 118]],
    haunch: [[116, 200], [120, 176], [138, 152], [162, 150], [178, 168]],
    shadeB: [[164, 136], [178, 160], [182, 182], [174, 198], [156, 203], [130, 203], [154, 192], [164, 172], [162, 150]],
    head: [[102, 82], [98, 68], [86, 60], [72, 60], [60, 66], [50, 76], [46, 84], [48, 92], [56, 98], [72, 102], [88, 104], [102, 96]],
    jaw: [[48, 92], [56, 98], [72, 102], [88, 104], [74, 96], [60, 94]],
    eye: [76, 76], eyeAng: -8, nose: [47, 82],
    earN: [[84, 64], [86, 42], [92, 18], [100, 4], [106, 8], [106, 30], [100, 54], [96, 66]],
    earF: [[92, 64], [100, 40], [112, 18], [122, 8], [125, 14], [118, 38], [106, 62]],
    foreN: [[92, 140], [90, 170], [88, 196], [84, 203]],
    foreF: [[104, 146], [104, 176], [103, 203]],
    foot: [[172, 196], [150, 200], [122, 201], [104, 202], [100, 206], [122, 207], [160, 207], [178, 203]],
    tail: [184, 174],
  },
  // 2 : adulte dressé sur ses pattes arrière, tourné vers la lune.
  {
    body: [[106, 68], [124, 80], [138, 102], [148, 128], [160, 154], [168, 178], [166, 196], [150, 204], [118, 204], [104, 196], [104, 178], [98, 160], [90, 140], [86, 118], [87, 96], [93, 78]],
    belly: [[94, 80], [90, 96], [90, 118], [94, 140], [102, 160], [108, 178], [112, 160], [106, 138], [102, 112], [100, 90]],
    haunch: [[114, 202], [116, 180], [128, 158], [150, 152], [164, 174]],
    shadeB: [[134, 104], [144, 130], [156, 156], [164, 178], [162, 196], [148, 204], [136, 204], [152, 188], [154, 166], [142, 140], [132, 116]],
    head: [[110, 62], [106, 48], [94, 40], [80, 38], [66, 42], [54, 50], [48, 56], [48, 62], [54, 68], [68, 72], [84, 76], [100, 76]],
    jaw: [[48, 62], [54, 68], [68, 72], [84, 76], [70, 68], [56, 64]],
    eye: [80, 52], eyeAng: -14, nose: [48, 56],
    earN: [[94, 42], [104, 24], [118, 8], [132, -2], [136, 2], [128, 20], [114, 40], [106, 48]],
    earF: [[100, 42], [114, 26], [132, 14], [148, 8], [150, 13], [136, 26], [114, 46]],
    foreN: [[98, 106], [86, 116], [78, 124], [76, 134]],
    foreF: [[108, 112], [98, 122], [92, 130], [90, 140]],
    foot: [[166, 196], [146, 200], [118, 201], [96, 202], [92, 206], [116, 207], [154, 207], [172, 203]],
    footF: [[130, 198], [110, 200], [84, 202], [80, 205], [104, 206], [132, 204]],
    tail: [166, 172],
  },
];

/** Lapinova → Lunalièvre → Sélénalto : lièvre lunaire. Levraut tapi, jeune assis aux aguets, adulte dressé vers la lune. */
export const lapinova: Species = (c) => {
  const { pal, stage } = c;
  const st = Math.min(stage, 2);
  const id = `lapinova-${st}`;
  const p = POSES[st];
  const S = [1.16, 1, 0.94][st];
  let g = '';

  if (st >= 2) {
    g += aura(120, 70, 80, pal.glow);
  }
  g += ground(124, 205, st === 0 ? 70 : 74);

  // Oreille éloignée.
  const ear = (pts: P[], far: boolean) => {
    const d = cl(pts);
    let s = ink(d, far ? pal.shade : pal.body, far ? 1.2 : 1.5);
    s += `<defs><clipPath id="${id}-e${far ? 'f' : 'n'}"><path d="${d}"/></clipPath></defs><g clip-path="url(#${id}-e${far ? 'f' : 'n'})">`;
    // Intérieur sombre et pointe noire.
    const mid = Math.floor(pts.length / 2);
    const tip = pts[mid - 1];
    const base0 = pts[0], base1 = pts[pts.length - 1];
    s += `<path d="M${f((base0[0] + base1[0]) / 2)} ${f((base0[1] + base1[1]) / 2)} Q${f((base0[0] + tip[0]) / 2 + 3)} ${f((base0[1] + tip[1]) / 2)} ${f(tip[0])} ${f(tip[1])} L${f(pts[mid][0])} ${f(pts[mid][1])} Q${f((base1[0] + tip[0]) / 2 + 2)} ${f((base1[1] + tip[1]) / 2 + 2)} ${f(base1[0])} ${f(base1[1])} Z" fill="${pal.deep}" opacity="${far ? 0.5 : 0.35}"/>`;
    s += `<circle cx="${f(tip[0])}" cy="${f(tip[1])}" r="9" fill="#140F24" opacity="0.85"/>`;
    if (!far) s += shadow(d, pal.shade, 0, 'fine');
    s += `</g>${ink(d, 'none', far ? 1.2 : 1.5)}`;
    return s;
  };
  g += ear(p.earF, true);

  // Membres éloignés.
  const limb = (pts: P[], w0: number, w1: number, fill: string, lw = 1.3) => ink(tube(pts, [[0, w0], [0.45, w1 * 1.1], [0.8, w1 * 0.9], [1, w1 * 1.15]]), fill, lw);
  g += limb(p.foreF, 5, 3.4, pal.shade, 1.1);
  if (p.footF) g += ink(cl(p.footF), pal.shade, 1.1);

  // Corps.
  const body = cl(p.body);
  g += ink(body, pal.body, 1.7);
  g += `<defs><clipPath id="${id}-b"><path d="${body}"/></clipPath></defs><g clip-path="url(#${id}-b)">`;
  g += `<path d="${cl(p.belly)}" fill="${pal.belly}" opacity="0.85"/>`;
  g += shadow(cl(p.shadeB), pal.shade, 0.75, 'fine');
  // « Mers » lunaires sur le pelage.
  const [hx, hy] = p.haunch[2];
  g += `<ellipse cx="${f(hx + 6)}" cy="${f(hy + 12)}" rx="14" ry="9" fill="${pal.deep}" opacity="0.18"/>`;
  g += `<ellipse cx="${f(hx - 14)}" cy="${f(hy - 8)}" rx="8" ry="5" fill="${pal.deep}" opacity="0.15"/>`;
  g += `</g>`;
  g += line(op(p.haunch), 1.1, '#140F24', ' opacity="0.85"');
  // Poils : touffes sur la cuisse, le dos et le poitrail.
  const [b1, b2] = [p.body[2], p.body[4]];
  g += fur(c, b1[0] - 2, b1[1] + 6, 8, 120, 4, 6) + fur(c, b2[0] - 6, b2[1] + 4, 9, 110, 4, 7);
  g += fur(c, p.haunch[2][0] + 4, p.haunch[2][1] + 10, 9, 100, 5, 8);
  g += fur(c, p.belly[1][0] + 4, p.belly[1][1] + 4, 7, 100, 4, 4, pal.shade);
  g += rim(op(p.body.slice(0, 5)), pal.glow, 1.3);
  // Queue (scut blanc).
  g += ink(`M${p.tail[0]} ${p.tail[1]} c6 -6 14 -4 14 3 c0 7 -8 10 -14 6 Z`, pal.belly, 1.2);

  // Pied arrière.
  g += ink(cl(p.foot), pal.body, 1.4);
  g += shadow(`M${f(p.foot[0][0])} ${f(p.foot[0][1] + 4)} L${f(p.foot[3][0])} ${f(p.foot[3][1] + 3)} L${f(p.foot[4][0])} ${f(p.foot[4][1])} L${f(p.foot[6][0])} ${f(p.foot[6][1])} Z`, pal.shade, 0.6, 'fine');
  g += line(`M${f(p.foot[4][0] + 3)} ${f(p.foot[4][1] - 1)} l3 -1 M${f(p.foot[4][0] + 8)} ${f(p.foot[4][1])} l3 -1`, 0.7);

  // Patte avant proche.
  g += limb(p.foreN, 5.5, 3.6, pal.body);
  g += shadow(tube(p.foreN, [[0, 2], [1, 1.4]]), pal.shade, 0.4, 'fine');

  // Oreille proche, tête.
  g += ear(p.earN, false);
  const head = cl(p.head);
  g += ink(head, pal.body, 1.7);
  g += `<defs><clipPath id="${id}-h"><path d="${head}"/></clipPath></defs><g clip-path="url(#${id}-h)">`;
  g += `<path d="${cl(p.jaw)}" fill="${pal.belly}" opacity="0.9"/>`;
  const [ex, ey] = p.eye;
  // Joue : ombre fine sous l'œil, arcade claire.
  g += shadow(`M${f(ex - 4)} ${f(ey + 12)} Q${f(ex + 10)} ${f(ey + 8)} ${f(ex + 26)} ${f(ey + 16)} L${f(ex + 30)} ${f(ey + 30)} L${f(ex - 4)} ${f(ey + 30)} Z`, pal.shade, 0.3, 'fine');
  g += `</g>`;
  // Le levraut dort : paupière close, cils fins.
  if (st === 0) g += line(`M${f(ex - 6)} ${f(ey)} Q${f(ex)} ${f(ey + 4)} ${f(ex + 6)} ${f(ey - 1)}`, 1.4) + line(`M${f(ex - 3)} ${f(ey + 2)} l-1 3 M${f(ex)} ${f(ey + 2.6)} l0 3 M${f(ex + 3)} ${f(ey + 2)} l1 3`, 0.6);
  else g += eyeA(ex, ey, 6, pal.eye, { angle: p.eyeAng, slit: false, open: 0.6 });
  g += `<path d="M${f(ex - 9)} ${f(ey + 2)} Q${f(ex)} ${f(ey + 9)} ${f(ex + 9)} ${f(ey + 1)}" fill="none" stroke="${pal.light}" stroke-width="1" opacity="0.7"/>`;
  const [nx, ny] = p.nose;
  g += `<path d="M${f(nx)} ${f(ny - 2)} q3 -1 4 1.5 q-2 2 -4 1 Z" fill="#140F24"/>`;
  g += line(`M${f(nx + 2)} ${f(ny + 1)} q0 4 -1 6 M${f(nx + 1)} ${f(ny + 7)} q4 3 9 1`, 0.9);
  // Moustaches.
  for (const [dx, dy] of [[-22, -4], [-24, 2], [-20, 7]] as const) g += line(`M${f(nx + 8)} ${f(ny + 4)} q${f(dx * 0.5)} ${f(dy * 0.4 - 2)} ${f(dx)} ${f(dy)}`, 0.5, '#FFF6D8', ' opacity="0.75"');
  g += fur(c, p.head[0][0] - 4, p.head[0][1] + 10, 6, 100, 4, 5);
  g += rim(op(p.head.slice(1, 6)), pal.glow, 1.1);

  // Ornements.
  if (st >= 1) {
    const [fx, fy] = [ex + 6, ey - 12];
    if (st >= 2) g += gild(`M${f(fx - 3)} ${f(fy - 4)} a4.5 4.5 0 1 0 6 7 a3.5 3.5 0 1 1 -6 -7 Z`, 1);
    else g += sparkle(fx, fy, 2.4, pal.gold, false);
  }
  if (st >= 2) {
    g += constellation([[124, 120], [134, 136], [128, 152], [140, 168]], pal.gold);
    g += gild('M150 156 c6 8 8 18 4 28', 0.9);
    for (const [x, y, z] of [[30, 30, 3.2], [24, 96, 2.4], [196, 160, 2.8], [60, 150, 2]] as const) g += sparkle(x, y, z, pal.glow, false);
  } else if (st === 1) {
    g += sparkle(150, 40, 2.6, pal.glow, false) + sparkle(40, 130, 2, pal.glow, false);
  } else {
    g += sparkle(60, 100, 2.2, pal.glow, false) + sparkle(170, 120, 2.6, pal.glow, false);
  }
  return `<g transform="translate(111 205) scale(${S}) translate(-111 -205)">${g}</g>`;
};

/* ---------- Décor : prairies lunaires (0 gîte d'herbes d'argent la nuit, 1 crête au crépuscule, 2 cercle de pierres sous la pleine lune) ---------- */
function blade(x: number, y: number, h: number, bend: number, col: string, w = 1.6): string {
  return `<path d="M${f(x - w)} ${f(y)} Q${f(x + bend * 0.4)} ${f(y - h * 0.6)} ${f(x + bend)} ${f(y - h)} Q${f(x + bend * 0.4 + w)} ${f(y - h * 0.55)} ${f(x + w)} ${f(y)} Z" fill="${col}"/>`;
}
function grassBand(c: DrawCtx, b: Bounds, y: number, n: number, h: number, col: string, ink2 = false): string {
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = b.x0 - 4 + c.r() * (b.x1 - b.x0 + 8), hh = h * (0.5 + c.r() * 0.7);
    s += blade(x, y + c.r() * 6, hh, (c.r() - 0.4) * hh * 0.5, col, 1 + c.r());
    if (ink2 && i % 3 === 0) s += line(`M${f(x)} ${f(y + 4)} q${f(2)} ${f(-hh * 0.5)} ${f(hh * 0.15)} ${f(-hh * 0.9)}`, 0.5, '#140F24', ' opacity="0.5"');
  }
  return s;
}
function moonFlower(x: number, y: number, h: number, glow: string): string {
  return line(`M${x} ${y} q-2 ${-h * 0.6} ${2} ${-h}`, 0.8, '#140F24', ' opacity="0.7"')
    + `<circle cx="${x + 2}" cy="${y - h}" r="6" fill="${glow}" opacity="0.35" filter="url(#soft)"/>`
    + `<path d="M${x - 1} ${y - h} q3 -6 6 0 q-3 4 -6 0 Z" fill="${glow}" stroke="#140F24" stroke-width="0.5"/>`;
}
const lapinovaScene = (c: DrawCtx, b: Bounds): string => {
  const { pal, stage, hue } = c;
  const st = Math.min(stage, 2);
  const id = `lapinova-${st}-bg`;
  let s = '';
  if (st === 0) {
    s += `<defs>${vgrad(`${id}-s`, [[0, hsl(hue + 10, 40, 9)], [0.7, hsl(hue, 34, 20)], [1, hsl(hue - 10, 30, 24)]])}</defs>${fill(b, `url(#${id}-s)`)}`;
    s += stars(c, b, 80, 140);
    // Fin croissant bas sur l'horizon.
    s += glowAt(180, 60, 26, 26, '#FFF6D8', 0.35);
    s += `<path d="M186 44 A18 18 0 1 0 192 76 A14 14 0 1 1 186 44 Z" fill="#FFF3D0" stroke="#140F24" stroke-width="0.6"/>`;
    s += ridge(c, b, 140, 4, 6, hsl(hue + 10, 22, 22), 0.6);
    s += grassBand(c, b, 150, 70, 30, hsl(hue + 20, 18, 30));
    s += ridge(c, b, 178, 3, 5, hsl(hue + 10, 24, 18), 0.7);
    s += grassBand(c, b, 186, 60, 46, hsl(hue + 30, 16, 38), true);
    // Le gîte : creux d'herbe couchée.
    s += `<ellipse cx="116" cy="206" rx="94" ry="18" fill="${hsl(hue + 20, 22, 16)}" stroke="#140F24" stroke-width="0.8"/>`;
    for (let k = 0; k < 20; k++) { const a = Math.PI * (k / 19), x = 116 - Math.cos(a) * 92, y = 206 - Math.sin(a) * 12; s += blade(x, y + 6, 18 + c.r() * 10, -Math.cos(a) * 14, hsl(hue + 30, 18, 46)); }
    for (const [x, y, h] of [[16, 196, 30], [204, 200, 36], [190, 208, 22], [30, 214, 20]] as const) s += moonFlower(x, y, h, pal.glow);
    for (let k = 0; k < 9; k++) { const x = 20 + c.r() * 190, y = 90 + c.r() * 90; s += `<circle cx="${f(x)}" cy="${f(y)}" r="1.2" fill="${pal.glow}"/>` + glowAt(x, y, 4, 4, pal.glow, 0.5); }
  } else if (st === 1) {
    s += `<defs>${vgrad(`${id}-s`, [[0, hsl(232, 44, 14)], [0.45, hsl(262, 30, 30)], [0.62, hsl(hue + 330, 40, 52)], [0.7, hsl(hue + 340, 40, 60)]])}</defs>${fill(b, `url(#${id}-s)`)}`;
    s += stars(c, b, 60, 110);
    s += `<path d="M40 30 A14 14 0 1 0 50 56 A11 11 0 1 1 40 30 Z" fill="#FFF3D0" stroke="#140F24" stroke-width="0.6"/>`;
    // Vallée : collines successives (perspective atmosphérique).
    s += ridge(c, b, 150, 6, 5, hsl(262, 18, 50), 0, ' opacity="0.8"');
    s += glowAt(111, 150, 140, 10, '#FFF6D8', 0.3);
    s += ridge(c, b, 162, 7, 6, hsl(250, 18, 40), 0.5);
    s += ridge(c, b, 176, 6, 5, hsl(240, 20, 30), 0.6);
    // Crête au premier plan.
    s += `<path d="M${b.x0 - 4} 230 C20 210 60 200 120 199 C170 199 200 206 ${b.x1 + 4} 214 L${b.x1 + 4} ${b.y1 + 4} L${b.x0 - 4} ${b.y1 + 4} Z" fill="${hsl(hue + 100, 16, 20)}" stroke="#140F24" stroke-width="0.9"/>`;
    s += grassBand(c, { ...b, x0: b.x0 }, 206, 50, 18, hsl(hue + 100, 18, 30), true);
    s += `<path d="M184 208 C182 196 192 188 204 190 C214 192 218 202 214 210 Z" fill="${hsl(240, 10, 40)}" stroke="#140F24" stroke-width="0.8"/>` + shadow('M204 190 C214 192 218 202 214 210 L200 210 C206 204 206 196 204 190 Z', hsl(240, 30, 14), 0.6, 'fine');
    for (const [x, y, h] of [[14, 214, 22], [34, 222, 16], [200, 224, 18]] as const) s += moonFlower(x, y, h, pal.glow);
  } else {
    s += `<defs>${vgrad(`${id}-s`, [[0, hsl(hue + 10, 44, 8)], [0.6, hsl(hue, 34, 18)], [1, hsl(hue - 10, 30, 22)]])}</defs>${fill(b, `url(#${id}-s)`)}`;
    s += stars(c, b, 90, 200);
    // Pleine lune gravée (mers, cratères, terminateur hachuré), voilée de nuages.
    const mx = 128, my = 100, mr = 72;
    s += glowAt(mx, my, mr + 20, mr + 20, '#FFF6D8', 0.25);
    s += `<circle cx="${mx}" cy="${my}" r="${mr}" fill="${hsl(hue + 40, 12, 80)}"/>`;
    s += `<defs><clipPath id="${id}-m"><circle cx="${mx}" cy="${my}" r="${mr}"/></clipPath></defs><g clip-path="url(#${id}-m)">`;
    for (const [x, y, rx, ry] of [[100, 70, 22, 14], [150, 120, 26, 16], [160, 66, 12, 9], [104, 140, 14, 8]] as const) s += `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${pal.shade}" opacity="0.35"/>`;
    for (const [x, y, r] of [[176, 92, 5], [86, 104, 4], [138, 44, 3.5], [184, 132, 3]] as const) s += `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${pal.deep}" stroke-width="0.6" opacity="0.6"/>`;
    s += shadow(`M${mx + 20} ${my - mr - 4} A${mr} ${mr} 0 0 1 ${mx + 20} ${my + mr + 4} L${mx + mr + 6} ${my + mr + 6} L${mx + mr + 6} ${my - mr - 6} Z`, pal.shade, 0.3, 'fine');
    s += `</g><circle cx="${mx}" cy="${my}" r="${mr}" fill="none" stroke="#E9C25B" stroke-width="1.3"/>`;
    s += `<circle cx="${mx}" cy="${my}" r="${mr + 5}" fill="none" stroke="#E9C25B" stroke-width="0.6" stroke-dasharray="1 4" opacity="0.8"/>`;
    // Bandes de nuages.
    for (const [y, x, w] of [[62, -10, 90], [136, 140, 100], [150, -20, 70]] as const) s += `<path d="M${x} ${y} q${w * 0.2} -8 ${w * 0.4} -2 q${w * 0.2} -10 ${w * 0.4} 0 q${w * 0.15} 2 ${w * 0.2} 6 Z" fill="${hsl(hue, 22, 30)}" stroke="#140F24" stroke-width="0.6" opacity="0.9"/>`;
    // Cercle de pierres levées sur le sommet.
    const stone = (x: number, w: number, h: number, col: string) => `<path d="M${x - w} 196 L${x - w * 0.8} ${196 - h} Q${x} ${190 - h - 6} ${x + w * 0.9} ${196 - h + 2} L${x + w} 196 Z" fill="${col}" stroke="#140F24" stroke-width="0.8"/>`
      + shadow(`M${x + w * 0.2} ${190 - h} Q${x + w * 0.6} ${193 - h} ${x + w * 0.9} ${196 - h + 2} L${x + w} 196 L${x + w * 0.3} 196 Z`, hsl(hue, 40, 10), 0.7, 'fine');
    s += stone(22, 10, 54, hsl(hue + 10, 12, 30)) + stone(52, 7, 34, hsl(hue + 10, 12, 26)) + stone(196, 11, 60, hsl(hue + 10, 12, 30)) + stone(176, 7, 30, hsl(hue + 10, 12, 26));
    s += `<path d="M${b.x0 - 4} 214 C30 198 80 196 120 197 C170 197 200 200 ${b.x1 + 4} 208 L${b.x1 + 4} ${b.y1 + 4} L${b.x0 - 4} ${b.y1 + 4} Z" fill="${hsl(hue + 10, 18, 20)}" stroke="#140F24" stroke-width="0.9"/>`;
    s += `<path d="M84 207 L92 198 L160 198 L168 207 Z" fill="${hsl(hue + 10, 12, 34)}" stroke="#140F24" stroke-width="0.8"/>`;
    s += grassBand(c, b, 214, 30, 14, hsl(hue + 20, 16, 30), true);
  }
  return s;
};
lapinova.scene = lapinovaScene;
