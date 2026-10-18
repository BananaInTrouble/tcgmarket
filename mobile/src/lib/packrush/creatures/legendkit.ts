/**
 * Outils géométriques des légendaires (style adulte) : courbes lissées par points de passage, corps « tubulaires »
 * d'épaisseur variable (bras, queues, poissons), plumes et rémiges. Tout reste en chaînes SVG, comme style.ts.
 */
export type Pt = [number, number];

export const f = (v: number) => +v.toFixed(1);
export const P = (p: Pt) => `${f(p[0])} ${f(p[1])}`;

/** Courbe de Catmull-Rom passant par `pts`, échantillonnée (`per` points par segment). */
export function spline(pts: Pt[], per = 10): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < per; k++) {
      const t = k / per, t2 = t * t, t3 = t2 * t;
      const c = (a: number, b: number, d: number, e: number) =>
        0.5 * (2 * b + (-a + d) * t + (2 * a - 5 * b + 4 * d - e) * t2 + (-a + 3 * b - 3 * d + e) * t3);
      out.push([c(p0[0], p1[0], p2[0], p3[0]), c(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

/** Tracé ouvert lissé (quadratiques par milieux) passant près des points. */
export function smooth(pts: Pt[], close = false): string {
  if (pts.length < 3) return `M${pts.map(P).join(' L')}${close ? 'Z' : ''}`;
  const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  if (close) {
    let d = `M${P(mid(pts[pts.length - 1], pts[0]))}`;
    for (let i = 0; i < pts.length; i++) d += ` Q${P(pts[i])} ${P(mid(pts[i], pts[(i + 1) % pts.length]))}`;
    return d + 'Z';
  }
  let d = `M${P(pts[0])}`;
  for (let i = 1; i < pts.length - 1; i++) d += ` Q${P(pts[i])} ${P(mid(pts[i], pts[i + 1]))}`;
  return d + ` L${P(pts[pts.length - 1])}`;
}

/** Repère le long d'une polyligne : point, tangente et normale (gauche) à chaque échantillon. */
export function frames(path: Pt[]) {
  const n = path.length - 1;
  return path.map((p, i) => {
    const a = path[Math.max(0, i - 1)], b = path[Math.min(n, i + 1)];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const t: Pt = [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
    return { p, t, n: [-t[1], t[0]] as Pt, u: i / n };
  });
}

/** Point décalé le long d'une courbe : u ∈ [0,1], décalage `off` selon la normale. */
export function along(path: Pt[], u: number, off = 0): { p: Pt; t: Pt; n: Pt } {
  const fr = frames(path);
  const i = Math.max(0, Math.min(fr.length - 1, Math.round(u * (fr.length - 1))));
  const { p, t, n } = fr[i];
  return { p: [p[0] + n[0] * off, p[1] + n[1] * off], t, n };
}

/** Contour fermé d'un corps de largeur variable autour d'une ligne médiane (wl côté normale, wr côté opposé). */
export function tube(path: Pt[], wl: (u: number) => number, wr: (u: number) => number = wl): string {
  const fr = frames(path);
  const L = fr.map(({ p, n, u }) => [p[0] + n[0] * wl(u), p[1] + n[1] * wl(u)] as Pt);
  const R = fr.map(({ p, n, u }) => [p[0] - n[0] * wr(u), p[1] - n[1] * wr(u)] as Pt).reverse();
  return `M${L.map(P).join(' L')} L${R.map(P).join(' L')} Z`;
}

/** Bande d'un seul côté du tube (ombre) : de la ligne médiane décalée `a` à `b` (fractions de la largeur). */
export function band(path: Pt[], w: (u: number) => number, a: number, b: number, u0 = 0, u1 = 1): string {
  const fr = frames(path).filter(({ u }) => u >= u0 && u <= u1);
  const A = fr.map(({ p, n, u }) => [p[0] + n[0] * w(u) * a, p[1] + n[1] * w(u) * a] as Pt);
  const B = fr.map(({ p, n, u }) => [p[0] + n[0] * w(u) * b, p[1] + n[1] * w(u) * b] as Pt).reverse();
  return `M${A.map(P).join(' L')} L${B.map(P).join(' L')} Z`;
}

/** Plume / rémige : feuille effilée de la base `a` à la pointe `b`, largeur `w`, cambrure `bend` (-1..1). */
export function feather(a: Pt, b: Pt, w: number, bend = 0): { d: string; rachis: string } {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
  const nx = -dy / l, ny = dx / l;
  const m = (k: number, o: number): Pt => [a[0] + dx * k + nx * (o + bend * l * 0.12), a[1] + dy * k + ny * (o + bend * l * 0.12)];
  const d = `M${P(a)} C${P(m(0.25, w))} ${P(m(0.7, w * 1.05))} ${P(b)} C${P(m(0.75, -w * 0.7))} ${P(m(0.3, -w * 0.9))} ${P(a)} Z`;
  const rachis = `M${P(a)} Q${P(m(0.5, 0))} ${P(b)}`;
  return { d, rachis };
}

/** Rotation d'un point autour d'un centre (degrés). */
export function rot(p: Pt, c: Pt, deg: number): Pt {
  const a = (deg * Math.PI) / 180, x = p[0] - c[0], y = p[1] - c[1];
  return [c[0] + x * Math.cos(a) - y * Math.sin(a), c[1] + x * Math.sin(a) + y * Math.cos(a)];
}
