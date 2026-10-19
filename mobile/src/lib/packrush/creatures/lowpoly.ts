/**
 * Moteur « low-poly » : une forme (polygone) est découpée en triangles (Delaunay sur son contour et des points
 * intérieurs), puis chaque facette est éclairée selon son orientation sur un relief en dôme (hauteur = distance au
 * bord). Résultat : un volume à facettes, façon cristal / origami, sans aucun trait.
 */
export type Pt = [number, number];

/** Aléatoire déterministe (mulberry32). */
export function prng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------------------------------------- Géométrie ---------------------------------------- */

/** Échantillonne un tracé fait de segments cubiques : [départ, [c1, c2, fin], [c1, c2, fin], …]. */
export function curve(start: Pt, segs: [Pt, Pt, Pt][], step = 9): Pt[] {
  const out: Pt[] = [start];
  let p0 = start;
  for (const [c1, c2, p3] of segs) {
    const len = Math.hypot(p3[0] - p0[0], p3[1] - p0[1]) + Math.hypot(c1[0] - p0[0], c1[1] - p0[1]) * 0.3;
    const n = Math.max(2, Math.round(len / step));
    for (let i = 1; i <= n; i++) {
      const t = i / n, u = 1 - t;
      out.push([
        u * u * u * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p3[0],
        u * u * u * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p3[1],
      ]);
    }
    p0 = p3;
  }
  // Ferme proprement (supprime le dernier point s'il rejoint le premier).
  const l = out[out.length - 1];
  if (Math.hypot(l[0] - start[0], l[1] - start[1]) < 1) out.pop();
  return out;
}

/** Ellipse en polygone. */
export function ellipse(cx: number, cy: number, rx: number, ry: number, n = 18, rot = 0): Pt[] {
  const c = Math.cos(rot), s = Math.sin(rot);
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2, x = Math.cos(a) * rx, y = Math.sin(a) * ry;
    return [cx + x * c - y * s, cy + x * s + y * c] as Pt;
  });
}

/**
 * Membre effilé le long d'une ligne de squelette : `spine` (points) et `width` (largeur à chaque point).
 * Donne un polygone (côté gauche puis côté droit).
 */
export function limb(spine: Pt[], width: number[]): Pt[] {
  const left: Pt[] = [], right: Pt[] = [];
  for (let i = 0; i < spine.length; i++) {
    const a = spine[Math.max(0, i - 1)], b = spine[Math.min(spine.length - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    dx /= l; dy /= l;
    const w = (width[i] ?? width[width.length - 1]) / 2;
    left.push([spine[i][0] - dy * w, spine[i][1] + dx * w]);
    right.push([spine[i][0] + dy * w, spine[i][1] - dx * w]);
  }
  return [...left, ...right.reverse()];
}

function inside(p: Pt, poly: Pt[]): boolean {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > p[1]) !== (yj > p[1]) && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

function distToEdge(p: Pt, poly: Pt[]): number {
  let d = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ax, ay] = poly[j], [bx, by] = poly[i];
    const vx = bx - ax, vy = by - ay, wx = p[0] - ax, wy = p[1] - ay;
    const t = Math.max(0, Math.min(1, (wx * vx + wy * vy) / (vx * vx + vy * vy || 1)));
    d = Math.min(d, Math.hypot(wx - vx * t, wy - vy * t));
  }
  return d;
}

/** Triangulation de Delaunay (Bowyer-Watson) ; renvoie des triplets d'indices. */
function delaunay(pts: Pt[]): [number, number, number][] {
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const minX = Math.min(...xs), minY = Math.min(...ys), dx = Math.max(...xs) - minX, dy = Math.max(...ys) - minY;
  const dm = Math.max(dx, dy) * 20;
  const all: Pt[] = [...pts, [minX - dm, minY - dm], [minX + dx / 2, minY + dm], [minX + dm, minY - dm]];
  const n = pts.length;
  type Tri = { a: number; b: number; c: number; x: number; y: number; r: number };
  const circ = (a: number, b: number, c: number): Tri => {
    const [ax, ay] = all[a], [bx, by] = all[b], [cx, cy] = all[c];
    const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by)) || 1e-9;
    const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d;
    const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d;
    return { a, b, c, x: ux, y: uy, r: (ax - ux) ** 2 + (ay - uy) ** 2 };
  };
  let tris: Tri[] = [circ(n, n + 1, n + 2)];
  for (let i = 0; i < n; i++) {
    const [px, py] = all[i];
    const bad: Tri[] = [], keep: Tri[] = [];
    for (const t of tris) ((px - t.x) ** 2 + (py - t.y) ** 2 < t.r ? bad : keep).push(t);
    const edges: [number, number][] = [];
    for (const t of bad) for (const e of [[t.a, t.b], [t.b, t.c], [t.c, t.a]] as [number, number][]) {
      const k = edges.findIndex((f) => (f[0] === e[1] && f[1] === e[0]) || (f[0] === e[0] && f[1] === e[1]));
      if (k >= 0) edges.splice(k, 1); else edges.push(e);
    }
    tris = keep;
    for (const [a, b] of edges) tris.push(circ(a, b, i));
  }
  return tris.filter((t) => t.a < n && t.b < n && t.c < n).map((t) => [t.a, t.b, t.c]);
}

/* ---------------------------------------- Couleur ---------------------------------------- */

function hex(c: string): [number, number, number] {
  const h = c.replace('#', '');
  const v = h.length === 3 ? h.split('').map((x) => x + x).join('') : h;
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}
const toHex = (r: number, g: number, b: number) =>
  '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
/** Mélange de deux couleurs hex (t = 0 → a, 1 → b). */
export const mix = (a: string, b: string, t: number) => {
  const A = hex(a), B = hex(b);
  return toHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
};
/** Couleur hex depuis teinte / saturation / luminosité (0..360, 0..100, 0..100). */
export function hsl(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360; s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return toHex(f(0) * 255, f(8) * 255, f(4) * 255);
}

/* ---------------------------------------- Rendu ---------------------------------------- */

export interface Light {
  /** Direction de la lumière principale (x, y vers le bas, z vers le spectateur) — normalisée à l'usage. */
  dir: [number, number, number];
  /** Couleur de la lumière (reflets) et de l'ombre (facettes détournées). */
  color: string;
  shade: string;
  /** Lumière de contour (facettes en bord de forme, côté opposé à la lumière). */
  rim?: string;
}

export interface FacetOpts {
  /** Taille moyenne d'une facette (px). */
  size?: number;
  /** Relief : hauteur du dôme (plus grand = plus bombé). */
  relief?: number;
  /** Variation aléatoire de la teinte des facettes (0..1). */
  jitter?: number;
  seed?: number;
  /** Opacité globale. */
  opacity?: number;
  /** Couleur de fin de dégradé le long de la forme (haut → bas). */
  base2?: string;
}

/**
 * Remplit le polygone `poly` de facettes éclairées. `base` : couleur de la matière.
 */
export function facets(poly: Pt[], base: string, light: Light, o: FacetOpts = {}): string {
  const size = o.size ?? 11, relief = o.relief ?? 1, jitter = o.jitter ?? 0.12, r = prng(o.seed ?? 7);
  const xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  // Contour rééchantillonné + points intérieurs en grille perturbée.
  const pts: Pt[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]), k = Math.max(1, Math.round(l / size));
    for (let j = 0; j < k; j++) pts.push([a[0] + ((b[0] - a[0]) * j) / k, a[1] + ((b[1] - a[1]) * j) / k]);
  }
  const edgeCount = pts.length;
  for (let y = minY + size * 0.6; y < maxY; y += size * 0.95) {
    for (let x = minX + size * 0.6; x < maxX; x += size * 1.05) {
      const p: Pt = [x + (r() - 0.5) * size * 0.8, y + (r() - 0.5) * size * 0.8];
      if (inside(p, poly) && distToEdge(p, poly) > size * 0.35) pts.push(p);
    }
  }
  const height = pts.map((p, i) => (i < edgeCount ? 0 : Math.sqrt(distToEdge(p, poly)) * 4 * relief));
  const tris = delaunay(pts).filter(([a, b, c]) => {
    const cen: Pt = [(pts[a][0] + pts[b][0] + pts[c][0]) / 3, (pts[a][1] + pts[b][1] + pts[c][1]) / 3];
    return inside(cen, poly);
  });
  const [lx0, ly0, lz0] = light.dir, ll = Math.hypot(lx0, ly0, lz0) || 1;
  const L = [lx0 / ll, ly0 / ll, lz0 / ll];
  let out = '';
  for (const [a, b, c] of tris) {
    const A = [pts[a][0], pts[a][1], -height[a]], B = [pts[b][0], pts[b][1], -height[b]], C = [pts[c][0], pts[c][1], -height[c]];
    const u = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], v = [C[0] - A[0], C[1] - A[1], C[2] - A[2]];
    let nx = u[1] * v[2] - u[2] * v[1], ny = u[2] * v[0] - u[0] * v[2], nz = u[0] * v[1] - u[1] * v[0];
    if (nz > 0) { nx = -nx; ny = -ny; nz = -nz; }
    const nl = Math.hypot(nx, ny, nz) || 1;
    // Repère : z vers le spectateur = -nz.
    const dot = (nx * L[0] + ny * L[1] + -nz * L[2]) / nl;
    const cy = (pts[a][1] + pts[b][1] + pts[c][1]) / 3;
    let col = o.base2 ? mix(base, o.base2, (cy - minY) / (maxY - minY || 1)) : base;
    const lit = dot + (r() - 0.5) * jitter;
    col = lit > 0 ? mix(col, light.color, Math.min(0.5, lit * 0.55)) : mix(col, light.shade, Math.min(0.8, -lit * 0.9 + 0.12));
    // Lumière de contour : facettes du bord tournées à l'opposé de la lumière.
    const onEdge = [a, b, c].filter((i) => i < edgeCount).length >= 2;
    if (light.rim && onEdge && dot < -0.05) col = mix(col, light.rim, 0.35);
    out += `<path d="M${pts[a][0].toFixed(1)} ${pts[a][1].toFixed(1)}L${pts[b][0].toFixed(1)} ${pts[b][1].toFixed(1)}L${pts[c][0].toFixed(1)} ${pts[c][1].toFixed(1)}Z" fill="${col}" stroke="${col}" stroke-width="0.6" stroke-linejoin="round"/>`;
  }
  return o.opacity != null && o.opacity < 1 ? `<g opacity="${o.opacity}">${out}</g>` : out;
}

/** Fond en facettes (dégradé vertical de couleurs + légère variation), couvrant un rectangle. */
export function facetSky(x0: number, y0: number, x1: number, y1: number, colors: string[], seed = 3, size = 26): string {
  const r = prng(seed);
  const pts: Pt[] = [];
  for (let y = y0 - size; y <= y1 + size; y += size) for (let x = x0 - size; x <= x1 + size; x += size) {
    const edge = y <= y0 - size + 0.1 || y >= y1 || x <= x0 - size + 0.1 || x >= x1;
    pts.push(edge ? [x, y] : [x + (r() - 0.5) * size * 0.9, y + (r() - 0.5) * size * 0.9]);
  }
  let out = '';
  for (const [a, b, c] of delaunay(pts)) {
    const cy = (pts[a][1] + pts[b][1] + pts[c][1]) / 3;
    const t = Math.max(0, Math.min(1, (cy - y0) / (y1 - y0))) * (colors.length - 1);
    const i = Math.min(colors.length - 2, Math.floor(t));
    let col = mix(colors[i], colors[i + 1], t - i);
    col = mix(col, r() > 0.5 ? '#FFFFFF' : '#000000', r() * 0.07);
    out += `<path d="M${pts[a][0].toFixed(1)} ${pts[a][1].toFixed(1)}L${pts[b][0].toFixed(1)} ${pts[b][1].toFixed(1)}L${pts[c][0].toFixed(1)} ${pts[c][1].toFixed(1)}Z" fill="${col}" stroke="${col}" stroke-width="0.6"/>`;
  }
  return out;
}

/** Étoile / éclat à 4 branches facetté (deux tons). */
export function gem(x: number, y: number, s: number, light: string, dark: string): string {
  const P = (dx: number, dy: number) => `${(x + dx).toFixed(1)} ${(y + dy).toFixed(1)}`;
  const k = s * 0.22;
  return `<path d="M${P(0, -s)}L${P(k, -k)}L${P(0, 0)}Z" fill="${light}"/><path d="M${P(0, -s)}L${P(-k, -k)}L${P(0, 0)}Z" fill="${dark}"/>`
    + `<path d="M${P(s, 0)}L${P(k, k)}L${P(0, 0)}Z" fill="${dark}"/><path d="M${P(s, 0)}L${P(k, -k)}L${P(0, 0)}Z" fill="${light}"/>`
    + `<path d="M${P(0, s)}L${P(-k, k)}L${P(0, 0)}Z" fill="${light}"/><path d="M${P(0, s)}L${P(k, k)}L${P(0, 0)}Z" fill="${dark}"/>`
    + `<path d="M${P(-s, 0)}L${P(-k, -k)}L${P(0, 0)}Z" fill="${dark}"/><path d="M${P(-s, 0)}L${P(-k, k)}L${P(0, 0)}Z" fill="${light}"/>`;
}
