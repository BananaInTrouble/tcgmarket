import type { Bounds, DrawCtx, Species } from './style.ts';
import { curve, ellipse, facetSky, facets, gem, hsl, limb, mix, prng, type FacetOpts, type Light, type Pt } from './lowpoly.ts';

/** Facettes un peu plus grandes que demandé (budget : ~1500 facettes par carte). */
const F = (poly: Pt[], col: string, L: Light, o: FacetOpts = {}) => facets(poly, col, L, { ...o, size: (o.size ?? 11) * 1.6 });

/**
 * Lumikit → Lunaréon → Selenvulpe (low-poly) : renard des comètes dont la queue est une nébuleuse.
 * 0 renardeau endormi dans son terrier, 1 sub-adulte à l'affût dans la prairie au crépuscule, 2 adulte assis sur
 * un promontoire sous une comète, 3 éveillé qui chante aux étoiles sur une cime sous les aurores.
 */

/** Tracé SVG simple (M L C Q Z absolus) → polygone échantillonné. */
function P(d: string, step = 7): Pt[] {
  const tok = d.match(/[MLCQZ]|-?\d*\.?\d+/g) ?? [];
  const out: Pt[] = [];
  let i = 0, cmd = 'M', cur: Pt = [0, 0];
  const num = () => +tok[i++];
  while (i < tok.length) {
    if (/[MLCQZ]/.test(tok[i])) cmd = tok[i++];
    if (cmd === 'Z') continue;
    if (cmd === 'M' || cmd === 'L') { cur = [num(), num()]; out.push(cur); continue; }
    if (cmd === 'C') {
      const c1: Pt = [num(), num()], c2: Pt = [num(), num()], p: Pt = [num(), num()];
      out.push(...curve(cur, [[c1, c2, p]], step).slice(1));
      cur = p; continue;
    }
    const q: Pt = [num(), num()], p: Pt = [num(), num()];
    out.push(...curve(cur, [[[cur[0] + (q[0] - cur[0]) * 2 / 3, cur[1] + (q[1] - cur[1]) * 2 / 3], [p[0] + (q[0] - p[0]) * 2 / 3, p[1] + (q[1] - p[1]) * 2 / 3], p]], step).slice(1));
    cur = p;
  }
  return out;
}
const tf = (pts: Pt[], f: (p: Pt) => Pt) => pts.map(f);
const rot = (pts: Pt[], cx: number, cy: number, deg: number) => {
  const a = (deg * Math.PI) / 180, co = Math.cos(a), si = Math.sin(a);
  return tf(pts, ([x, y]) => [cx + (x - cx) * co - (y - cy) * si, cy + (x - cx) * si + (y - cy) * co]);
};
const glow = (x: number, y: number, r: number, col: string, op = 0.22) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="${col}" opacity="${op}"/><circle cx="${x}" cy="${y}" r="${(r * 0.55).toFixed(1)}" fill="${col}" opacity="${op * 1.4}"/>`;
const GOLD = '#E9C25B';
function stars(pts: Pt[], s = 4): string {
  return `<polyline points="${pts.map((p) => p.join(',')).join(' ')}" fill="none" stroke="${GOLD}" stroke-width="0.8" opacity="0.8"/>` + pts.map(([x, y], i) => gem(x, y, i % 2 ? s * 0.7 : s, '#FFFFFF', GOLD)).join('');
}

interface Pal { base: string; deep: string; cream: string; neb: string; neb2: string; eye: string }
const palOf = (h: number): Pal => ({
  base: hsl(h, 42, 48), deep: hsl(h + 12, 42, 22), cream: hsl(h - 10, 30, 84),
  neb: hsl(h + 210, 45, 24), neb2: hsl(h + 170, 55, 52), eye: hsl(h + 50, 90, 62),
});

/** Queue-nébuleuse : facettes sombres + éclats d'étoiles + pointe-comète. */
function nebTail(poly: Pt[], p: Pal, L: Light, seed: number, tip: Pt, nStars: number): string {
  let s = F(poly, p.neb, { ...L, color: mix(L.color, p.neb2, 0.5) }, { size: 7, relief: 1.1, seed, base2: p.neb2, jitter: 0.25 });
  const r = prng(seed + 99);
  const xs = poly.map((q) => q[0]), ys = poly.map((q) => q[1]);
  for (let i = 0, k = 0; i < 200 && k < nStars; i++) {
    const x = Math.min(...xs) + r() * (Math.max(...xs) - Math.min(...xs)), y = Math.min(...ys) + r() * (Math.max(...ys) - Math.min(...ys));
    if (inPoly([x, y], poly)) { s += gem(x, y, 1.2 + r() * 1.8, '#FFFFFF', '#BFD7FF'); k++; }
  }
  return s + glow(tip[0], tip[1], 10, '#FFF6D8', 0.3) + gem(tip[0], tip[1], 6, '#FFFFFF', '#FFE6A8');
}
function inPoly(p: Pt, poly: Pt[]): boolean {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > p[1]) !== (yj > p[1]) && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
/** Œil en amande : facette d'iris, pupille, reflet. */
const eye = (x: number, y: number, w: number, col: string, ang = -16) =>
  `<g transform="translate(${x} ${y}) rotate(${ang})"><path d="M${-w} 0 L${-w * 0.2} ${-w * 0.6} L${w} ${-w * 0.15} L${w * 0.1} ${w * 0.45} Z" fill="${col}"/><path d="M${-w * 0.2} ${-w * 0.6} L${w} ${-w * 0.15} L0 0 Z" fill="#FFFFFF" opacity="0.35"/>`
  + `<ellipse cx="${w * 0.05}" cy="${-w * 0.08}" rx="${w * 0.16}" ry="${w * 0.42}" fill="#0B0618"/><circle cx="${-w * 0.35}" cy="${-w * 0.25}" r="${Math.max(0.8, w * 0.14)}" fill="#FFFFFF"/></g>`;

/* ---------- Tête adulte (profil trois-quarts, nez vers (44, 84)) ---------- */
function head(p: Pal, L: Light, far: Light, f: (pts: Pt[]) => Pt[], woke: boolean): string {
  let s = F(f(P('M98 62 C93 46 93 30 97 16 C106 24 112 40 113 58 Z')), p.deep, far, { size: 5, relief: 0.6, seed: 31 });
  s += F(f(P('M46 84 C56 80 66 76 76 70 C82 62 92 56 104 56 C114 56 122 64 122 76 C122 86 118 94 112 100 L114 106 L104 105 L106 110 L94 107 C84 104 72 99 62 96 C56 94 50 92 46 90 C43 88 43 86 46 84 Z')), p.base, L, { size: 6, relief: 1, seed: 32, base2: p.deep });
  s += F(f(P('M47 89 C56 90 66 88 76 86 C88 84 98 90 106 100 L110 105 L102 105 L105 109 L94 107 C84 104 72 99 62 96 C56 95 50 93 47 89 Z')), p.cream, L, { size: 5, relief: 0.6, seed: 33 });
  s += F(f(P('M106 62 C110 46 118 32 129 22 C133 38 132 54 124 72 Z')), p.base, L, { size: 5, relief: 0.8, seed: 34 });
  s += F(f(P('M110 60 C114 48 120 38 127 30 C129 42 127 54 121 66 Z')), p.deep, far, { size: 4, relief: 0.4, seed: 35 });
  const [nx, ny] = f([[43, 84]])[0], [ex, ey] = f([[78, 72]])[0];
  s += `<circle cx="${nx.toFixed(1)}" cy="${ny.toFixed(1)}" r="3.2" fill="#0B0618"/>` + eye(+ex.toFixed(1), +ey.toFixed(1), 6.5, p.eye, woke ? 10 : -16);
  const [mx, my] = f([[96, 60]])[0];
  s += gem(+mx.toFixed(1), +my.toFixed(1), woke ? 5 : 3.5, '#FFFFFF', GOLD);
  if (woke) s += glow(+ex.toFixed(1), +ey.toFixed(1), 9, p.eye, 0.25);
  return s;
}

/* ---------- Stade 0 : endormi ---------- */
function sleeper(p: Pal): string {
  const L: Light = { dir: [0.5, -0.6, 0.6], color: '#9FF2E4', shade: '#0A0716', rim: '#5FE0C8' };
  const far: Light = { ...L, color: mix('#9FF2E4', p.deep, 0.5), rim: undefined };
  let s = `<ellipse cx="112" cy="207" rx="84" ry="8" fill="#05030C" opacity="0.45"/>`;
  s += F(P('M44 194 C40 166 66 140 106 136 C146 132 184 150 188 180 C190 198 176 206 150 206 L60 206 C50 206 45 202 44 194 Z'), p.base, L, { size: 9, relief: 1.2, seed: 1, base2: p.deep });
  s += F(ellipse(160, 180, 22, 24, 14), p.base, L, { size: 8, relief: 1, seed: 2, base2: p.deep });
  s += F(P('M100 156 C110 146 122 142 134 142 C128 150 120 158 110 162 Z'), p.deep, far, { size: 5, relief: 0.4, seed: 3 });
  s += F(P('M92 154 C100 140 112 134 126 132 C122 142 114 152 104 158 Z'), p.base, L, { size: 5, relief: 0.6, seed: 4 });
  s += F(P('M44 182 C50 174 60 166 72 158 C82 150 98 148 108 154 C118 160 118 176 108 184 C98 192 76 194 58 192 C50 191 45 188 44 185 Z'), p.base, L, { size: 6, relief: 1, seed: 5, base2: p.deep });
  s += F(P('M45 186 C50 190 58 192 66 191 C60 188 53 186 47 183 Z'), p.cream, L, { size: 4, seed: 6 });
  s += `<circle cx="41" cy="182" r="3" fill="#0B0618"/><path d="M66 168 L73 171.5 L81 168 L73 173.6 Z" fill="#0B0618"/>`;
  s += nebTail(P('M184 184 C178 206 140 214 100 214 C70 214 46 210 34 200 C30 194 34 188 42 190 C60 198 90 200 120 198 C150 196 172 190 184 184 Z'), p, L, 7, [38, 196], 12);
  s += gem(92, 160, 3, '#FFFFFF', GOLD);
  return `<g transform="translate(114 205) scale(1.08) translate(-114 -205)">${s}</g>`;
}

/* ---------- Stade 1 : à l'affût ---------- */
function stalker(p: Pal): string {
  const L: Light = { dir: [0.6, -0.4, 0.6], color: '#FFD9A8', shade: '#120A24', rim: '#FF9F7A' };
  const far: Light = { ...L, color: mix('#FFD9A8', p.deep, 0.5), rim: undefined };
  let s = `<ellipse cx="122" cy="206" rx="90" ry="7" fill="#05030C" opacity="0.4"/>`;
  s += nebTail(P('M174 102 C198 102 216 120 218 148 C220 174 210 196 188 201 C192 186 190 168 186 152 C184 140 180 132 172 128 Z'), p, L, 11, [192, 196], 14);
  s += F(P('M100 142 C101 160 101 172 100 182 C100 190 99 196 98 199 C95 200 93 202 93 205 L106 205 C106 202 105 199 106 196 C107 188 108 180 108 170 L111 142 Z'), p.deep, far, { size: 5, relief: 0.5, seed: 12 });
  s += F(P('M146 136 C148 152 152 166 156 176 L151 199 C148 200 145 202 145 205 L157 205 C158 200 160 192 164 180 C163 166 161 150 159 136 Z'), p.deep, far, { size: 5, relief: 0.5, seed: 13 });
  s += F(P('M84 98 C70 108 66 124 72 140 C80 152 100 154 116 150 C132 146 148 142 162 138 C176 134 184 122 182 110 C180 98 170 92 158 94 C144 96 132 102 120 98 C114 94 110 84 110 72 L96 80 Z'), p.base, L, { size: 9, relief: 1.3, seed: 14, base2: p.deep });
  s += F(P('M84 98 C70 108 66 124 72 140 C76 145 82 147 88 146 L92 126 L94 103 Z'), p.cream, L, { size: 6, relief: 0.8, seed: 15 });
  s += F(P('M146 118 C148 132 152 146 158 154 C162 162 166 170 168 178 L166 198 C163 200 160 202 160 205 L175 205 C176 200 176 194 176 184 L178 176 C182 168 182 158 180 148 C182 136 182 120 174 110 C166 104 154 108 146 118 Z'), p.base, L, { size: 7, relief: 1, seed: 16, base2: p.deep });
  s += F(P('M84 128 C86 138 88 144 86 148 C80 150 72 150 68 152 C64 154 62 160 62 166 C62 172 64 178 67 180 C70 182 73 179 71 175 C69 170 69 164 72 160 C78 158 88 160 96 160 C102 158 106 152 104 142 L102 128 Z'), p.base, L, { size: 5, relief: 0.8, seed: 17, base2: p.deep });
  s += head(p, L, far, (pts) => tf(pts, ([x, y]) => [110 + (x - 112) * 0.86, 96 + (y - 100) * 0.86]), false);
  return `<g transform="translate(114 205) scale(0.97) translate(-114 -205)">${s}</g>`;
}

/* ---------- Stades 2–3 : assis (3 : tête levée, il chante) ---------- */
function sitter(p: Pal, woke: boolean): string {
  const L: Light = woke ? { dir: [-0.3, -0.8, 0.5], color: '#C8FFE8', shade: '#0A0820', rim: '#8FFFD0' } : { dir: [-0.6, -0.6, 0.6], color: '#DDE6FF', shade: '#0B0A22', rim: '#9FC8FF' };
  const far: Light = { ...L, color: mix(L.color, p.deep, 0.5), rim: undefined };
  let s = `<ellipse cx="122" cy="206" rx="82" ry="7" fill="#05030C" opacity="0.45"/>`;
  s += nebTail(limb([[150, 194], [190, 196], [210, 168], [210, 128], [202, 92], [188, 62], [172, 38]], [14, 26, 32, 34, 30, 22, 6]), p, L, 21, [172, 42], woke ? 26 : 16);
  s += F(P('M101 148 L102 198 C99 200 97 202 97 205 L110 205 C110 201 108 196 108 190 L111 146 Z'), p.deep, far, { size: 5, relief: 0.5, seed: 22 });
  s += F(P('M90 100 C80 110 74 124 76 138 C78 146 82 150 86 152 L88 204 L146 205 C160 205 166 194 164 178 C162 156 154 134 142 118 C132 106 124 88 118 72 L104 76 Z'), p.base, L, { size: 9, relief: 1.4, seed: 23, base2: p.deep });
  s += F(ellipse(143, 178, 21, 26, 14, -0.2), p.base, L, { size: 8, relief: 1.2, seed: 24, base2: p.deep });
  s += F(P('M112 205 C106 205 105 200 110 197.5 C118 196.5 128 196 136 197 C141 199 141 204 136 205 Z'), p.deep, far, { size: 4, relief: 0.4, seed: 25 });
  s += F(P('M90 100 C80 110 74 124 76 138 C77 146 82 152 89 158 L97 140 L102 104 Z'), p.cream, L, { size: 6, relief: 0.8, seed: 26 });
  s += F(P('M84 146 C85 164 86 184 84 198 C80 199 75 202 75 205 L92 205 C93 202 92 198 92 194 C93 180 95 162 98 146 Z'), p.base, L, { size: 5, relief: 0.8, seed: 27, base2: p.deep });
  s += F(P('M85.5 180 C86 188 85.5 194 84 198 C80 199 75 202 75 205 L92 205 C93 202 92 198 92 194 C92.5 188 93 184 93.5 180 Z'), p.deep, far, { size: 4, relief: 0.4, seed: 28 });
  s += head(p, L, far, woke ? (pts) => rot(pts, 116, 100, 26) : (pts) => pts, woke);
  s += stars([[136, 160], [146, 170], [142, 184], [154, 190]], 3.4);
  if (woke) {
    s += stars([[188, 150], [198, 120], [192, 92], [180, 64]], 3.6);
    // Souffle d'étoiles levé vers le ciel.
    for (const [x, y, z] of [[44, 40, 4], [34, 26, 3], [50, 14, 3.4], [28, 6, 2.6], [64, 30, 2.4]] as const) s += gem(x, y, z, '#FFFFFF', '#9FFFE0');
    s += glow(40, 30, 22, '#9FFFE0', 0.12);
  }
  return `<g transform="translate(114 205) scale(0.95) translate(-114 -205)">${s}</g>`;
}

const draw = (c: DrawCtx): string => {
  const p = palOf(c.hue);
  if (c.stage <= 0) return sleeper(p);
  if (c.stage === 1) return stalker(p);
  return sitter(p, c.stage >= 3);
};

/* ---------- Décors ---------- */
const scene = (c: DrawCtx, b: Bounds): string => {
  const { stage, hue } = c;
  const r = prng(17 + stage * 31);
  const W = b.x1 - b.x0;
  const night = 225 + ((((hue * 1.7) % 60) + 60) % 60);
  let s = '';
  const starfield = (n: number, yMax: number) => { let t = ''; for (let i = 0; i < n; i++) t += gem(b.x0 + r() * W, b.y0 + r() * (yMax - b.y0), 1.2 + r() * 2.2, '#FFFFFF', '#BFD7FF'); return t; };
  if (stage <= 0) {
    // Terrier sous les racines : ouverture sur la nuit, étoile filante, mousse et champignons lumineux.
    s += facetSky(b.x0, b.y0, b.x1, b.y1, [hsl(night, 50, 10), hsl(night + 10, 45, 20), hsl(night + 20, 40, 14)], 5, 26);
    s += starfield(10, 140) + `<path d="M150 40 L196 20 L151 43 Z" fill="#FFFFFF" opacity="0.7"/>` + gem(150, 42, 4, '#FFFFFF', '#BFD7FF');
    const earth: Light = { dir: [0.4, -0.6, 0.6], color: '#2E4A52', shade: '#05030C' };
    const e1 = hsl(hue + 25, 25, 16);
    s += F([[b.x0, b.y0], [b.x1, b.y0], [b.x1, 60], [180, 70], [150, 58], [111, 54], [72, 58], [42, 70], [b.x0, 60]], e1, earth, { size: 20, relief: 0.4, seed: 51 });
    s += F([[b.x0, 50], [42, 64], [26, 120], [20, 210], [b.x0, 214]], e1, earth, { size: 18, relief: 0.4, seed: 52 });
    s += F([[b.x1, 50], [180, 64], [198, 120], [204, 210], [b.x1, 214]], e1, earth, { size: 18, relief: 0.4, seed: 53 });
    for (const sp of [[[30, 66], [52, 88], [50, 120], [60, 140]], [[192, 66], [170, 90], [176, 116], [164, 132]], [[110, 54], [106, 72], [112, 86]]] as Pt[][]) s += F(limb(sp, [7, 5, 3, 1.5]), hsl(hue + 25, 22, 26), earth, { size: 4, relief: 0.4, seed: 54 });
    s += F([[b.x0, 200], [60, 196], [160, 196], [b.x1, 202], [b.x1, b.y1], [b.x0, b.y1]], hsl(hue + 130, 25, 18), { ...earth, color: '#3E7A70' }, { size: 16, relief: 0.5, seed: 55, base2: '#0A0816' });
    for (const [x, y, k] of [[20, 206, 1], [32, 210, 0.7], [204, 204, 0.9], [192, 210, 0.6]] as const) {
      s += glow(x, y - 12 * k, 12 * k, '#7FFFE0', 0.18) + `<path d="M${x - 1.5} ${y} L${x - 1} ${y - 10 * k} L${x + 1} ${y - 10 * k} L${x + 1.5} ${y} Z" fill="#D8E6F0"/>`
        + `<path d="M${x - 8 * k} ${y - 9 * k} L${x} ${y - 16 * k} L${x} ${y - 9 * k} Z" fill="#9FFFE8"/><path d="M${x + 8 * k} ${y - 9 * k} L${x} ${y - 16 * k} L${x} ${y - 9 * k} Z" fill="#4FC8B8"/>`;
    }
  } else if (stage === 1) {
    // Prairie au crépuscule : collines, hautes herbes, lucioles, souris-étoile.
    s += facetSky(b.x0, b.y0, b.x1, b.y1, ['#1C1640', '#4A2E66', '#B0607A', '#E8A070', '#3A2A40', '#141024'], 8, 24);
    s += `<circle cx="170" cy="150" r="34" fill="#FFC890" opacity="0.25"/>` + gem(170, 150, 12, '#FFF3D6', '#FFC37A') + starfield(8, 80);
    const hill: Light = { dir: [0.6, -0.5, 0.5], color: '#F0A880', shade: '#120A24' };
    s += F([[b.x0, 168], [50, 150], [110, 160], [170, 146], [b.x1, 156], [b.x1, 200], [b.x0, 200]], '#4A3060', hill, { size: 18, relief: 0.5, seed: 61 });
    s += F([[b.x0, 192], [80, 184], [160, 190], [b.x1, 182], [b.x1, b.y1], [b.x0, b.y1]], '#2A2440', hill, { size: 18, relief: 0.4, seed: 62, base2: '#100C1E' });
    for (let i = 0; i < 34; i++) {
      const x = b.x0 + (i / 34) * W + r() * 5, h = 22 + r() * 34, bd = (r() - 0.5) * 16, y = 202 + r() * 8;
      s += `<path d="M${(x - 2).toFixed(1)} ${y.toFixed(1)} L${(x + bd).toFixed(1)} ${(y - h).toFixed(1)} L${x.toFixed(1)} ${y.toFixed(1)} Z" fill="${mix('#3A3A50', '#C88A70', r() * 0.5)}"/><path d="M${x.toFixed(1)} ${y.toFixed(1)} L${(x + bd).toFixed(1)} ${(y - h).toFixed(1)} L${(x + 2).toFixed(1)} ${y.toFixed(1)} Z" fill="#1E1A30"/>`;
    }
    s += F(ellipse(32, 196, 7, 4.5, 10), '#C8B8A8', { dir: [0.6, -0.5, 0.6], color: '#FFE0C0', shade: '#2A2030' }, { size: 3.5, seed: 63 }) + F(ellipse(39, 192, 3, 2.6, 8), '#C8B8A8', { dir: [0.6, -0.5, 0.6], color: '#FFE0C0', shade: '#2A2030' }, { size: 2.5, seed: 64 }) + `<circle cx="41" cy="191.5" r="0.8" fill="#0B0618"/>`;
    for (const [x, y] of [[24, 120], [60, 150], [190, 110], [200, 186], [150, 124], [96, 70]] as const) s += glow(x, y, 7, '#FFE88A', 0.25) + gem(x, y, 2.4, '#FFFFFF', '#FFE88A');
  } else if (stage === 2) {
    // Promontoire sous une grande comète.
    s += facetSky(b.x0, b.y0, b.x1, b.y1, [hsl(night, 55, 8), hsl(night + 10, 45, 18), hsl(night + 25, 40, 28), hsl(night, 40, 12)], 4, 26);
    s += starfield(26, 160);
    s += `<path d="M10 14 L140 78 L136 84 Z" fill="#BFF6FF" opacity="0.35"/><path d="M30 20 L140 78 L138 81 Z" fill="#FFFFFF" opacity="0.5"/>` + glow(140, 80, 14, '#BFF6FF', 0.25) + gem(140, 80, 7, '#FFFFFF', '#BFF6FF');
    const mtn: Light = { dir: [-0.6, -0.5, 0.5], color: '#9FB0E0', shade: '#0A0A1E' };
    s += F([[b.x0, 172], [30, 140], [52, 156], [84, 118], [110, 150], [140, 128], [170, 160], [196, 136], [b.x1, 158], [b.x1, 214], [b.x0, 214]], hsl(night + 10, 25, 26), mtn, { size: 18, relief: 0.7, seed: 71 });
    s += F([[b.x0, 214], [30, 204], [60, 200], [90, 202], [130, 204], [180, 196], [b.x1, 202], [b.x1, b.y1], [b.x0, b.y1]], hsl(hue + 30, 14, 20), { dir: [-0.6, -0.6, 0.6], color: '#6A7498', shade: '#06050E' }, { size: 18, relief: 0.8, seed: 72, base2: '#0C0A18' });
  } else {
    // Cime enneigée sous les aurores.
    s += facetSky(b.x0, b.y0, b.x1, b.y1, [hsl(night + 20, 60, 7), hsl(night, 50, 16), hsl(night - 20, 40, 26)], 6, 26);
    s += starfield(30, 180);
    for (let k = 0; k < 3; k++) {
      const col = hsl(150 + k * 40, 70, 60), y = 30 + k * 22, pts: Pt[] = [];
      for (let i = 0; i <= 8; i++) pts.push([b.x0 + (i / 8) * W, y + (i % 2 ? -12 : 10)]);
      const band = [...pts, ...pts.slice().reverse().map(([x, yy]) => [x + 6, yy + 18] as Pt)];
      s += `<path d="M${band.map((q) => q.map((v) => v.toFixed(1)).join(' ')).join(' L')} Z" fill="${col}" opacity="${0.16 - k * 0.03}"/>`;
    }
    const mtn: Light = { dir: [-0.5, -0.6, 0.5], color: '#E0F0FF', shade: '#1A2040' };
    s += F([[b.x0, 176], [36, 120], [60, 150], [96, 96], [128, 140], [160, 110], [200, 160], [b.x1, 150], [b.x1, 214], [b.x0, 214]], hsl(night, 22, 34), { ...mtn, color: '#A8B8E0' }, { size: 18, relief: 0.9, seed: 81 });
    s += F([[b.x0, 212], [40, 200], [90, 198], [130, 200], [170, 202], [b.x1, 196], [b.x1, b.y1], [b.x0, b.y1]], '#8C9CC0', { dir: [-0.5, -0.7, 0.6], color: '#D8E4FF', shade: '#1A2040' }, { size: 18, relief: 0.6, seed: 82, base2: '#1A2040' });
  }
  return s;
};

export const lumikit: Species = Object.assign(draw, { scene });
