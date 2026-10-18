/**
 * Outils géométriques des légendaires (style adulte) : courbes lissées par points de passage, corps « tubulaires »
 * d'épaisseur variable (bras, queues, poissons), plumes et rémiges. Tout reste en chaînes SVG, comme style.ts.
 */
import { bloom as bloomFx, eyeGlow, strands, vol, type DrawCtx } from './style.ts';

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

/** Dégradé linéaire (vertical par défaut) pour les décors : `stops` = [décalage 0..1, couleur]. */
export function grad(id: string, stops: [number, string][], x2 = 0, y2 = 1): string {
  return `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops.map(([o, col]) => `<stop offset="${o}" stop-color="${col}"/>`).join('')}</linearGradient>`;
}

/** Petit poisson-étoile de profil (créature secondaire des décors aquatiques). */
export function starfish(x: number, y: number, s: number, ang: number, body: string, glow: string, ink = '#140F24'): string {
  return `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(ang)}) scale(${f(s)})">`
    + `<path d="M-6 0 C-3 -3.4 3 -3.6 6 0 C3 3.2 -3 3.2 -6 0 Z M5 0 L10 -3.6 L9 0 L10 3.6 Z" fill="${body}" stroke="${ink}" stroke-width="${f(0.6 / s)}" stroke-linejoin="round"/>`
    + `<circle cx="-3.6" cy="-0.6" r="0.8" fill="${ink}"/><circle cx="9.6" cy="0" r="1.5" fill="${glow}"/>`
    + `</g>`;
}

/* ---------------------------------------------------------------------------------------------------------------
 * Rendu V4 (« 3D » lumineux) : mêmes appels que le style encré (ink, line, shadow, rim, gild, fur, eyeA,
 * constellation), mais traduits en volumes modelés, ombres douces, lumières de contour et marques incandescentes.
 * Chaque espèce récupère ces fonctions via `lum(préfixe, c)` et garde ainsi son dessin anatomique.
 * ------------------------------------------------------------------------------------------------------------- */

export interface Lum {
  /** Volume modelé (le 3e argument, ancien trait, est ignoré). `extra` peut porter une opacité. */
  ink: (d: string, fill: string, w?: number, extra?: string) => string;
  /** Volume avec réglages explicites (lumière, contour, tons). */
  body: (d: string, base: string, o?: { light?: [number, number]; rim?: string; hi?: string; lo?: string; ao?: number }) => string;
  /** Détail fin : pli, nervure… en ton profond translucide (ou clair si une couleur claire est donnée). */
  line: (d: string, w?: number, color?: string, extra?: string) => string;
  /** Ombre douce (sans hachures). */
  shadow: (d: string, color: string, op?: number, hatch?: string) => string;
  /** Lumière de contour floutée. */
  rim: (d: string, color: string, w?: number) => string;
  /** Filet d'or incandescent. */
  gild: (d: string, w?: number) => string;
  /** Brins de lumière (pelage, plumes). */
  fur: (c: DrawCtx, x: number, y: number, len: number, angle: number, count: number, spread?: number, color?: string, w?: number) => string;
  /** Œil incandescent. */
  eyeA: (x: number, y: number, w: number, iris: string, o?: { angle?: number; slit?: boolean; open?: number }) => string;
  /** Constellation lumineuse. */
  constellation: (pts: Pt[], color?: string) => string;
}

const INK = new Set(['#140F24', '#1A1230']);

export function lum(prefix: string, c: DrawCtx, light: [number, number] = [0.3, 0.22], rimCol?: string): Lum {
  const { pal } = c;
  let k = 0;
  const id = () => `${prefix}-v${k++}`;
  const hiOf = (base: string) => (base === pal.deep || base === pal.shade ? pal.body : base === pal.body ? pal.light : '#FFF6D8');
  const body: Lum['body'] = (d, base, o = {}) =>
    vol(id(), d, base, { light: o.light ?? light, hi: o.hi ?? hiOf(base), lo: o.lo ?? pal.deep, rim: o.rim ?? rimCol ?? pal.accent2, ao: o.ao ?? 0.6 });
  return {
    body,
    ink: (d, fill, _w, extra = '') => {
      if (fill === 'none') return '';
      const op = /opacity="([\d.]+)"/.exec(extra)?.[1];
      const v = body(d, fill);
      return op ? `<g opacity="${op}">${v}</g>` : v;
    },
    line: (d, w = 1, color = pal.ink, extra = '') => {
      const dark = INK.has(color);
      const op = +(/opacity="([\d.]+)"/.exec(extra)?.[1] ?? 1);
      return `<path d="${d}" fill="none" stroke="${dark ? pal.deep : color}" stroke-width="${f(Math.max(0.4, w * 0.7))}" stroke-linecap="round" stroke-linejoin="round" opacity="${f(op * (dark ? 0.45 : 0.6))}"/>`;
    },
    shadow: (d, color, op = 0.8) => `<path d="${d}" fill="${color === '#000' ? '#05030C' : pal.deep}" opacity="${f(op * 0.55)}" filter="url(#b2)"/>`,
    rim: (d, color, w = 1.4) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${f(w * 2.2)}" stroke-linecap="round" opacity="0.55" filter="url(#b2)"/>`
      + `<path d="${d}" fill="none" stroke="${color}" stroke-width="${f(w * 0.6)}" stroke-linecap="round" opacity="0.85"/>`,
    gild: (d, w = 1.2) => `<path d="${d}" fill="none" stroke="${pal.gold}" stroke-width="${f(w * 3)}" stroke-linecap="round" opacity="0.5" filter="url(#b2)"/>`
      + `<path d="${d}" fill="none" stroke="#FFF1C2" stroke-width="${f(w * 0.7)}" stroke-linecap="round" stroke-linejoin="round"/>`,
    fur: (cc, x, y, len, angle, count, spread = 6, color, w = 0.9) =>
      strands(cc, x, y, len, angle, count, spread, color && !INK.has(color) ? color : pal.light, w * 0.8),
    eyeA: (x, y, w, iris, o = {}) => eyeGlow(id(), x, y, w, iris, o),
    constellation: (pts, color = '#FFF6D8') =>
      `<polyline points="${pts.map(P).join(' ')}" fill="none" stroke="${color}" stroke-width="0.6" opacity="0.7"/>`
      + pts.map(([x, y], i) => bloomFx(x, y, i % 2 ? 2.5 : 3.5, color, 0.6).replace('url(#b8)', 'url(#b2)') + `<circle cx="${f(x)}" cy="${f(y)}" r="${i % 2 ? 0.9 : 1.4}" fill="#FFFFFF"/>`).join(''),
  };
}

/**
 * Adoucit un SVG du style encré pour le rendu V4 : supprime les cernes d'encre des formes pleines, transforme les
 * traits d'encre de détail en traits profonds translucides et retire les trames hachurées.
 */
export function soften(svg: string, deep: string): string {
  return svg
    .replace(/<path d="[^"]*" fill="url\(#(?:fine|xhatch|hatch)\)"[^>]*\/>/g, '')
    .replace(/<(path|circle|ellipse|rect|polyline)\b([^>]*?)\/>/g, (m, tag: string, attrs: string) => {
      if (!/stroke="(#140F24|#1A1230)"/.test(attrs)) return m;
      if (/fill="none"/.test(attrs)) return `<${tag}${attrs.replace(/stroke="(#140F24|#1A1230)"/, `stroke="${deep}" stroke-opacity="0.45"`)}/>`;
      return `<${tag}${attrs.replace(/ stroke="(#140F24|#1A1230)"/, ' stroke="none"')}/>`;
    });
}
