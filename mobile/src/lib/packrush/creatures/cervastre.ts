import { aura, bloom, eyeGlow, gloss, hsl, softShadow, sparkle, speckles, strands, vol, type Bounds, type DrawCtx, type Palette, type Species } from './style.ts';

const f = (v: number) => +v.toFixed(1);
type Pt = [number, number];
/** Point d'une forme tubulaire : x, y, demi-épaisseur. */
export type Pw = [number, number, number];

/** Segments de Catmull-Rom (courbe lisse passant par tous les points). */
function cr(ps: Pt[]): string {
  let s = '';
  for (let i = 0; i < ps.length - 1; i++) {
    const p0 = ps[Math.max(0, i - 1)], p1 = ps[i], p2 = ps[i + 1], p3 = ps[Math.min(ps.length - 1, i + 2)];
    s += ` C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return s;
}
/** Courbe lisse ouverte passant par les points. */
export const spl = (ps: Pt[]) => `M${f(ps[0][0])} ${f(ps[0][1])}` + cr(ps);
/** Forme effilée (membre, cou, queue, bois) le long d'une courbe, à épaisseur variable. */
export function tube(ps: Pw[]): string {
  const L: Pt[] = [], R: Pt[] = [], T: Pt[] = [];
  ps.forEach((p, i) => {
    const a = ps[Math.max(0, i - 1)], b = ps[Math.min(ps.length - 1, i + 1)];
    let tx = b[0] - a[0], ty = b[1] - a[1];
    const l = Math.hypot(tx, ty) || 1;
    tx /= l; ty /= l;
    T.push([tx, ty]);
    L.push([p[0] - ty * p[2], p[1] + tx * p[2]]);
    R.push([p[0] + ty * p[2], p[1] - tx * p[2]]);
  });
  const e = ps[ps.length - 1], s0 = ps[0], te = T[T.length - 1], ts = T[0];
  const Rr = R.slice().reverse();
  return spl(L) + ` Q${f(e[0] + te[0] * e[2] * 1.4)} ${f(e[1] + te[1] * e[2] * 1.4)} ${f(Rr[0][0])} ${f(Rr[0][1])}` + cr(Rr)
    + ` Q${f(s0[0] - ts[0] * s0[2] * 1.4)} ${f(s0[1] - ts[1] * s0[2] * 1.4)} ${f(L[0][0])} ${f(L[0][1])} Z`;
}
// ---------------------------------------------------------------------------------------------------------------
// Rendu V4 (« 3D » lumineux, sans traits d'encre) : outils partagés par cervastre, spirago et drakomet. Chaque espèce
// fixe d'abord son éclairage avec `setLook` (préfixe d'ids, palette, couleur de la lumière de contour).

export const LOOK = { pre: 'x', hi: '#FFFFFF', lo: '#05030C', base: '', shade: '', deep: '', rim: '#9FE8FF', light: [0.32, 0.22] as [number, number], n: 0 };
export function setLook(pre: string, pal: Palette, rimCol: string, light: [number, number] = [0.32, 0.22]): void {
  Object.assign(LOOK, { pre, hi: pal.light, lo: pal.deep, base: pal.body, shade: pal.shade, deep: pal.deep, rim: rimCol, light, n: 0 });
}
/** Partie du corps modelée en volume ; `inner` est découpé dans la forme (taches, marques, brins). */
export function part(id: string, d: string, fill: string, inner: string, _w = 1.6): string {
  const far = fill === LOOK.shade || fill === LOOK.deep;
  return vol(id, d, fill, { hi: far ? LOOK.base : LOOK.hi, lo: LOOK.lo, rim: LOOK.rim, light: LOOK.light, ao: far ? 0.75 : 0.5 })
    + (inner ? `<g clip-path="url(#${id}-c)">${inner}</g>` : '');
}
/** (V3) Ombre propre d'un cylindre : en V4, le volume s'en charge. */
export function turn(_d: string, _light: string, _shade: string, _dx: number, _dy: number, _hatch = 'fine'): string {
  return '';
}
/** Ombre interne douce (sans hachures). */
export const shadow = (d: string, color: string, opacity = 0.9, _hatch = 'fine') =>
  `<path d="${d}" fill="${color}" opacity="${f(opacity * 0.7)}" filter="url(#b4)"/>`;
const INK = ['#140F24', '#1A1230'];
/** Trait : les traits d'encre deviennent de légers plis sombres, les traits colorés deviennent lumineux. */
export const line = (d: string, w = 1.8, color = '#140F24', extra = '') => INK.includes(color)
  ? `<path d="${d}" fill="none" stroke="${LOOK.lo}" stroke-width="${f(w * 1.2)}" stroke-linecap="round" opacity="0.3"/>`
  : `<path d="${d}" fill="none" stroke="${color}" stroke-width="${f(w * 2.4)}" stroke-linecap="round" opacity="0.35" filter="url(#b2)"/><path d="${d}" fill="none" stroke="${color}" stroke-width="${f(w * 0.8)}" stroke-linecap="round"${extra}/>`;
/** Pelage : brins clairs en lumière. */
export const fur = (c: DrawCtx, x: number, y: number, len: number, angle: number, count: number, spread = 6, color = '', w = 0.9) =>
  strands(c, x, y, len, angle, count, spread * 2, color && !INK.includes(color) ? color : LOOK.hi, w * 0.7);
/** Lumière de contour lumineuse. */
export const rim = (d: string, color: string, w = 1.6) =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${f(w * 3)}" stroke-linecap="round" opacity="0.45" filter="url(#b2)"/><path d="${d}" fill="none" stroke="${color}" stroke-width="${f(w * 0.7)}" stroke-linecap="round" opacity="0.9"/>`;
/** Filet d'or lumineux. */
export const gild = (d: string, w = 1.2) =>
  `<path d="${d}" fill="none" stroke="#FFD27A" stroke-width="${f(w * 3)}" stroke-linecap="round" opacity="0.45" filter="url(#b2)"/><path d="${d}" fill="none" stroke="#FFF0C0" stroke-width="${f(w * 0.8)}" stroke-linecap="round" stroke-linejoin="round"/>`;
/** Constellation lumineuse : fil clair, étoiles avec halo. */
export function constellation(pts: [number, number][], color = '#FFF6D8'): string {
  return `<polyline points="${pts.map((p) => `${f(p[0])},${f(p[1])}`).join(' ')}" fill="none" stroke="${color}" stroke-width="0.7" opacity="0.65"/>`
    + pts.map(([x, y], i) => `<circle cx="${f(x)}" cy="${f(y)}" r="${i % 2 ? 3 : 4.2}" fill="${color}" opacity="0.35" filter="url(#b2)"/><circle cx="${f(x)}" cy="${f(y)}" r="${i % 2 ? 1 : 1.5}" fill="#FFFFFF"/>`).join('');
}
/** Œil incandescent. */
export const eyeA = (x: number, y: number, w: number, iris: string, opts: { angle?: number; slit?: boolean; open?: number } = {}) =>
  eyeGlow(`${LOOK.pre}-eye${LOOK.n++}`, x, y, w * 1.05, iris, opts);
/** Ombre portée au sol, douce. */
export const ground = (x: number, y: number, rx: number) => softShadow(`M${f(x - rx)} ${f(y)} a${f(rx)} ${f(rx * 0.16)} 0 1 0 ${f(rx * 2)} 0 a${f(rx)} ${f(rx * 0.16)} 0 1 0 ${f(-rx * 2)} 0 Z`, 0.55, 'b4');
/** Supprime les derniers traits d'encre (contours, hachures) d'un dessin. */
export function noInk(s: string, lo = LOOK.lo): string {
  return s
    .replace(/<path[^>]*fill="url\(#(fine|xhatch|hatch)\)"[^>]*\/>/g, '')
    .replace(/<rect[^>]*fill="url\(#(fine|xhatch|hatch)\)"[^>]*\/>/g, '')
    .replace(/ fill="none" stroke="#(140F24|1A1230)"/g, ` fill="none" stroke="${lo}" stroke-opacity="0.3"`)
    .replace(/ stroke="#(140F24|1A1230)"( stroke-width="[^"]*")?/g, '');
}
export { bloom, gloss, softShadow };

/** Sabot orienté selon le dernier segment de la patte (angle en degrés, 0 = vers le bas). */
const hoof = (x: number, y: number, ang = 0) =>
  `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(ang)})"><path d="M-2.6 -6 L2.8 -6 L3.6 0 L-4.6 0 Z" fill="#0E0A16"/><ellipse cx="-0.6" cy="-4.4" rx="1.6" ry="0.8" fill="${LOOK.hi}" opacity="0.5"/></g>`;

function hoofAt(pts: Pw[]): string {
  const e = pts[pts.length - 1], p = pts[pts.length - 2];
  const dx = e[0] - p[0], dy = e[1] - p[1], l = Math.hypot(dx, dy) || 1;
  if (e[1] >= 199 && dy / l > 0.85) return hoof(e[0], 205);
  return hoof(e[0] + (dx / l) * 5.5, e[1] + (dy / l) * 5.5, (Math.atan2(dy, dx) * 180) / Math.PI - 90);
}

/** Membre fin terminé par un sabot. */
function leg(id: string, c: DrawCtx, pts: Pw[], fill: string, far: boolean): string {
  const d = tube(pts);
  const e = pts[pts.length - 1];
  const inner = far ? shadow(d, c.pal.deep, 0.35, 'fine') : turn(d, fill, c.pal.shade, -pts[1][2] * 0.7, -1);
  return part(id, d, fill, inner + line(spl(pts.slice(1, 3).map(([x, y]) => [x + 0.6, y] as Pt)), 0.7, '#140F24', ' opacity="0.5"'), far ? 1.3 : 1.5)
    + hoofAt(pts);
}

/** Cerf adulte (stades 1 à 3), de profil vers la gauche, tête haute. */
function stag(c: DrawCtx): string {
  const { pal, stage } = c;
  const id = `cervastre-${stage}`;
  const st = Math.min(stage, 3);
  let g = '';

  // ---- Bois (derrière la tête) ----
  const antler = (dx: number, dy: number, far: boolean) => {
    const T = (ps: Pw[]) => ps.map(([x, y, w]) => [x + dx, y + dy, w] as Pw);
    let beams: Pw[][];
    if (st === 1) {
      beams = [
        T([[58, 44, 2.8], [60, 34, 2.6], [64, 24, 2.2], [70, 14, 1.4], [74, 9, 0.6]]),
        T([[60, 34, 2.1], [52, 27, 1.4], [47, 22, 0.5]]),
      ];
    } else {
      beams = [
        T([[58, 44, 3.6], [62, 30, 3.3], [70, 16, 3], [82, 4, 2.6], [94, -6, 2.2], [104, -12, 1.4], [112, -16, 0.5]]),
        T([[60, 38, 2.8], [52, 32, 2.1], [44, 29, 1.3], [37, 28, 0.4]]),
        T([[65, 26, 2.6], [57, 17, 1.9], [51, 8, 1.1], [48, 1, 0.4]]),
        T([[76, 10, 2.4], [77, 0, 1.7], [74, -10, 0.5]]),
        T([[88, -1, 2.1], [91, -11, 1.4], [88, -20, 0.4]]),
      ];
    }
    let o = '';
    const fill = st >= 3 ? (far ? pal.light : pal.glow) : far ? pal.shade : pal.belly;
    beams.forEach((b, i) => {
      const d = tube(b);
      o += part(`${id}-a${far ? 'f' : 'n'}${i}`, d, fill, turn(d, fill, far ? pal.deep : pal.shade, -1.6, -0.6), far ? 1.1 : 1.3);
    });
    // Perlures et filets d'or.
    if (!far) {
      o += line(spl(beams[0].slice(0, 3).map(([x, y]) => [x - 0.8, y] as Pt)), 0.6, '#140F24', ' opacity="0.6" stroke-dasharray="1 2"');
      if (st >= 3) for (const b of beams) o += gild(spl(b.slice(0, -1).map(([x, y, w]) => [x - w * 0.3, y - w * 0.3] as Pt)), 0.9);
    }
    // Les pointes se prolongent en constellations.
    if (st >= 2) {
      const tips = beams.map((b) => b[b.length - 1]);
      for (const [x, y] of tips) o += sparkle(x, y, far ? 2.4 : 3.2, st >= 3 ? pal.glow : '#FFF6D8', false);
    }
    return o;
  };
  if (st >= 2) {
    const col = st >= 3 ? pal.gold : '#FFF6D8';
    g += constellation([[138, -8], [152, -2], [164, -12], [180, -4], [194, -12]], col);
    g += constellation([[37, 28], [24, 20], [16, 4]], col);
    if (st >= 3) g += constellation([[74, -10], [62, -20], [46, -16], [34, -10]], col) + constellation([[194, -12], [202, 4], [208, -6]], col) + `<ellipse cx="80" cy="6" rx="52" ry="30" fill="${pal.glow}" opacity="0.45" filter="url(#soft)"/>`;
  }
  g += antler(st === 1 ? 14 : 26, st === 1 ? 3 : 6, true);

  // ---- Pattes du fond ----
  // Stade 1 : pas d'exploration ; stades 2-3 : galop (pattes avant lancées, arrière en poussée).
  const LEGS: Record<string, Pw[]> = st === 1 ? {
    f1: [[96, 144, 7], [93, 164, 4.2], [92, 177, 3.2], [91, 196, 2.6], [90, 200, 2.6]],
    f2: [[168, 136, 10], [170, 158, 5.4], [172, 175, 3.3], [164, 195, 2.6], [162, 200, 2.6]],
    n1: [[84, 140, 9], [80, 160, 4.6], [72, 172, 3.4], [74, 186, 2.8], [76, 191, 2.8]],
    n2: [[156, 128, 15], [166, 156, 7], [178, 172, 3.7], [180, 194, 2.9], [182, 200, 2.9]],
  } : {
    f1: [[96, 144, 7], [96, 162, 4.2], [106, 172, 3.2], [113, 168, 2.6], [116, 166, 2.6]],
    f2: [[168, 136, 10], [162, 158, 5.4], [148, 168, 3.3], [138, 176, 2.6], [135, 178, 2.6]],
    n1: [[84, 140, 9], [70, 154, 4.8], [56, 162, 3.5], [44, 170, 2.9], [40, 173, 2.9]],
    n2: [[156, 128, 15], [172, 150, 7], [188, 162, 3.7], [204, 168, 2.9], [209, 169, 2.9]],
  };
  g += leg(`${id}-lf1`, c, LEGS.f1, pal.shade, true);
  g += leg(`${id}-lf2`, c, LEGS.f2, pal.shade, true);

  // ---- Queue ----
  g += part(`${id}-tl`, 'M178 104 C186 101 193 106 193 115 C188 116 182 113 178 110 Z', pal.body, shadow('M186 112 L196 118 L196 104 Z', pal.deep, 0.8, 'fine'), 1.3);

  // ---- Corps et cou ----
  const B = 'M108 100 C128 96 150 97 168 102 C184 106 191 121 187 139 C184 151 174 157 162 155 C140 159 116 159 96 153 C84 150 76 145 72 135 C66 119 55 99 45 83 L66 54 C76 68 89 88 108 100 Z';
  let bi = '';
  bi += shadow('M64 128 C86 147 120 151 150 147 C168 145 182 139 194 126 L194 172 L60 172 Z', pal.shade, 0.85, 'fine');
  bi += shadow('M70 140 C92 152 132 156 194 140 L194 172 L60 172 Z', pal.deep, 0.5, 'xhatch');
  bi += shadow('M187 112 C194 138 182 158 158 158 C172 148 178 132 174 112 Z', pal.deep, 0.55, 'xhatch');
  bi += shadow('M72 136 C74 120 70 104 60 92 C70 110 80 126 94 142 Z', pal.shade, 0.7, 'fine');
  // Plastron clair, miroir de croupe.
  bi += `<path d="M45 83 C53 96 60 110 66 124 C68 112 64 98 56 86 Z" fill="${pal.belly}" opacity="0.85"/>`;
  bi += `<path d="M175 105 C185 110 189 121 187 134 C181 126 177 117 169 108 Z" fill="${pal.belly}" opacity="0.9"/>`;
  // Musculature au trait.
  bi += line('M100 106 C110 118 110 136 100 150', 0.8, '#140F24', ' opacity="0.55"');
  bi += line('M152 106 C141 118 141 138 150 154', 0.8, '#140F24', ' opacity="0.55"');
  bi += line('M118 150 C128 146 140 146 148 149', 0.7, '#140F24', ' opacity="0.45"');
  // Crinière du cou (le cerf adulte a une collerette de poils longs).
  const mane: [number, number][] = st === 1 ? [[54, 94], [61, 108]] : [[50, 88], [56, 100], [62, 112], [68, 124]];
  for (const [x, y] of mane) bi += fur(c, x, y, st === 1 ? 7 : 10, 125, 4, 4);
  bi += fur(c, 120, 104, 6, 70, 5, 10) + fur(c, 150, 104, 6, 80, 4, 8) + fur(c, 92, 120, 6, 95, 3, 6);
  if (st === 1) {
    // Dernières mouchetures du faon, presque effacées.
    for (const [x, y] of [[118, 112], [130, 108], [142, 113], [126, 122], [154, 118]] as Pt[]) bi += `<circle cx="${x}" cy="${y}" r="1.6" fill="#FFF6D8" opacity="0.55"/>`;
  } else {
    // Constellation discrète sur le flanc.
    bi += constellation([[114, 116], [126, 110], [140, 118], [152, 112], [146, 128]], st >= 3 ? pal.gold : pal.light);
  }
  if (st >= 3) {
    bi += gild('M98 112 c10 -8 24 -6 26 4 c2 9 -8 13 -14 7 c-4 -5 2 -10 6 -6', 1);
    bi += gild('M160 112 c-8 6 -10 18 -2 26 c6 6 16 2 14 -6', 1);
    bi += gild('M58 96 c6 4 10 10 12 18', 0.9);
  }
  g += part(`${id}-b`, B, pal.body, bi, 1.8);
  g += rim('M66 55 C76 68 89 88 108 100 C128 96 150 97 168 102', pal.glow, 1.3);

  // ---- Pattes avant ----
  g += leg(`${id}-ln1`, c, LEGS.n1, pal.body, false);
  g += leg(`${id}-ln2`, c, LEGS.n2, pal.body, false);

  // ---- Bois de l'avant, oreilles, tête ----
  g += part(`${id}-ef`, 'M57 41 C59 31 65 23 73 19 C73 29 69 37 63 43 Z', pal.shade, '', 1.2);
  g += antler(0, 0, false);
  const H = 'M73 52 C69 42 59 38 51 40 C43 42 37 50 31 58 C27 63 22 66 20 70 C19 74 22 77 26 77 C29 80 34 81 39 79 C47 76 55 74 61 72 C69 68 75 60 73 52 Z';
  let hi = '';
  hi += shadow('M28 82 C44 77 58 74 72 62 L80 84 L26 90 Z', pal.shade, 0.85, 'fine');
  hi += `<path d="M24 78 C32 78 42 76 50 75 C44 80 34 82 26 81 Z" fill="${pal.belly}"/>`;
  hi += `<path d="M20 70 C19 66 23 63 27 66 C28 70 25 74 21 74 Z" fill="#140F24"/>`;
  hi += line('M26 77 C30 76 34 76 38 77', 0.9);
  hi += line('M41 56 C37 59 34 62 31 64', 1, '#140F24', ' opacity="0.7"');
  hi += line('M36 52 C40 50 44 49 48 50', 0.7, '#140F24', ' opacity="0.5"');
  hi += fur(c, 64, 62, 5, 100, 3, 4);
  hi += eyeA(46, 53, 5.2, pal.eye, { angle: -24, slit: false, open: 0.5 });
  if (st >= 3) hi += gild('M52 44 l3 -4 l3 4 l-3 4 Z', 0.9);
  g += part(`${id}-h`, H, pal.body, hi, 1.7);
  g += rim('M51 40 C43 42 37 50 31 58 C27 63 22 66 20 70', pal.glow, 1.1);
  // Oreille avant.
  g += part(`${id}-e`, 'M62 47 C70 37 84 31 97 33 C93 41 83 51 68 55 Z', pal.body,
    `<path d="M68 49 C76 41 86 37 92 36 C86 43 78 49 70 52 Z" fill="${pal.deep}"/>` + fur(c, 72, 48, 5, 20, 3, 3, pal.light), 1.4);
  if (st >= 3) g += `<circle cx="46" cy="53" r="9" fill="${pal.eye}" opacity="0.35" filter="url(#soft)"/>`;
  return g;
}

/** Faon (stade 0) endormi, enroulé dans la mousse : pattes repliées, tête posée sur le flanc, robe mouchetée. */
function fawnAsleep(c: DrawCtx): string {
  const { pal } = c;
  const id = 'cervastre-0';
  let g = '';
  // Queue.
  g += part(`${id}-tl`, 'M170 166 C177 160 185 162 187 170 C182 173 176 172 171 171 Z', pal.body, `<path d="M176 170 C180 167 184 168 185 170" fill="none" stroke="#FFF6D8" stroke-width="2"/>`, 1.2);
  // Corps couché.
  const B = 'M60 199 C52 182 62 162 90 153 C118 145 154 147 171 162 C183 173 184 191 173 201 L68 203 Z';
  let bi = '';
  bi += shadow('M50 186 C80 196 140 198 190 182 L190 210 L50 210 Z', pal.shade, 0.85, 'fine');
  bi += shadow('M54 196 C90 203 150 204 190 194 L190 210 L50 210 Z', pal.deep, 0.6, 'xhatch');
  // Cuisse repliée (volume de la hanche).
  bi += shadow('M178 170 C186 186 180 200 166 204 C172 192 172 178 164 166 Z', pal.deep, 0.45, 'xhatch');
  bi += line('M146 156 C164 162 174 178 168 198', 0.9, '#140F24', ' opacity="0.6"');
  bi += line('M96 156 C90 168 90 182 96 194', 0.7, '#140F24', ' opacity="0.45"');
  bi += fur(c, 120, 154, 5, 80, 5, 12) + fur(c, 158, 166, 6, 70, 4, 6) + fur(c, 70, 176, 5, 120, 3, 5);
  // Mouchetures en rangées le long de l'échine, quelques-unes sont des étoiles.
  const rows: [number, number, number][] = [[84, 160, 0], [92, 167, 1], [102, 176, 2]];
  for (const [x0, y0, k] of rows) {
    for (let i = 0; i < 7 - k; i++) {
      const t = i / (6 - k), x = x0 + t * (80 - k * 6), y = y0 - Math.sin(t * Math.PI) * (10 - k * 2) + t * 4;
      bi += (i + k) % 4 === 1 ? sparkle(x, y, 2.6, '#FFF6D8', false) : `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(1.5 + c.r() * 0.6)}" ry="${f(1.1 + c.r() * 0.4)}" fill="#FFF6D8" opacity="0.9"/>`;
    }
  }
  g += part(`${id}-b`, B, pal.body, bi, 1.6);
  g += rim('M90 153 C118 145 154 147 171 162', pal.glow, 1.3);
  // Patte arrière repliée : le sabot dépasse devant la cuisse.
  g += leg(`${id}-lh`, c, [[156, 194, 5], [138, 199, 3.2], [124, 200, 2.4]], pal.body, false).replace(/<path transform[^>]*\/>$/, '')
    + hoof(119, 201, 90);
  // Patte avant repliée sous le poitrail.
  g += leg(`${id}-lf`, c, [[80, 192, 5.2], [64, 197, 3.2], [52, 199, 2.4]], pal.body, false).replace(/<path transform[^>]*\/>$/, '')
    + hoof(47, 200, 90);
  // Cou recourbé vers l'arrière.
  const N = tube([[74, 186, 14], [66, 170, 12], [72, 155, 10], [88, 148, 9]]);
  g += part(`${id}-n`, N, pal.body, turn(N, pal.body, pal.shade, 3, -4) + `<path d="M58 172 C60 184 66 190 74 194" fill="none" stroke="${pal.belly}" stroke-width="6" opacity="0.8"/>` + fur(c, 62, 172, 5, 160, 3, 5), 1.5);
  // Tête posée sur le flanc (profil vers la droite), yeux clos.
  let hd = '';
  const H = 'M82 66 C80 56 72 50 63 51 C55 52 49 58 44 66 C40 72 36 75 34 79 C33 83 36 86 40 86 C43 88 48 88 52 86 C60 83 68 80 74 78 C81 75 84 72 82 66 Z';
  let hi = '';
  hi += shadow('M40 90 C56 84 70 82 84 70 L90 92 L36 96 Z', pal.shade, 0.85, 'fine');
  hi += `<path d="M38 86 C46 86 54 84 62 82 C56 87 46 89 40 89 Z" fill="${pal.belly}"/>`;
  hi += `<path d="M34 79 C33 75 37 72 41 75 C42 79 39 83 35 83 Z" fill="#140F24"/>`;
  hi += line('M40 86 C44 85 47 85 50 86', 0.8);
  // Paupière close et cils.
  hi += line('M53 64 C56 67 61 67 65 63', 1.3) + line('M55 66 l-1.5 2.4 M58 67 l-0.6 2.6 M61 66.6 l0.4 2.6', 0.7);
  hi += line('M50 60 C54 57 60 57 66 59', 0.7, '#140F24', ' opacity="0.5"');
  hi += sparkle(68, 55, 2.2, pal.gold, false);
  hd += part(`${id}-h`, H, pal.body, hi, 1.5);
  hd += rim('M63 51 C55 52 49 58 44 66', pal.glow, 1);
  // Oreille rabattue vers l'arrière, contre le cou.
  hd += part(`${id}-e`, 'M76 60 C84 52 96 50 108 54 C100 60 90 64 78 66 Z', pal.body,
    `<path d="M81 60 C88 56 96 55 103 56 C97 59 90 62 82 63 Z" fill="${pal.deep}"/>` + fur(c, 86, 60, 4, 10, 3, 2, pal.light), 1.3);
  g += `<g transform="rotate(10 98 150) translate(180 84) scale(-1 1)">${hd}</g>`;
  // Une luciole posée sur l'oreille, une autre qui tourne autour du museau.
  g += `<circle cx="104" cy="133" r="5" fill="${pal.glow}" opacity="0.6" filter="url(#glow)"/><ellipse cx="104" cy="133" rx="1.6" ry="1.2" fill="#FFF6D8" stroke="#140F24" stroke-width="0.6"/>`;
  g += `<circle cx="158" cy="146" r="4" fill="${pal.glow}" opacity="0.5" filter="url(#glow)"/><circle cx="158" cy="146" r="1.2" fill="#FFF6D8"/>`;
  g += line('M158 146 C150 140 146 150 138 146 C132 142 136 136 142 138', 0.6, pal.glow, ' stroke-dasharray="1.5 2.5" opacity="0.8"');
  return g;
}

/**
 * Cervastre → Cervelune → Astrocerf → Astrocerf éveillé : cerf de bestiaire céleste dont les bois se prolongent en
 * constellations. Faon endormi enroulé dans la mousse, daguet aux bois en velours qui traverse un ruisseau,
 * grand cerf au galop, puis forme éveillée au galop, bois dorés, croissant de lune et marques d'or.
 */
function drawCerv(c: DrawCtx): string {
  const st = Math.min(c.stage, 3);
  let s = '';
  if (st === 0) return `<g transform="translate(116 205) scale(1.18) translate(-116 -205)">${ground(118, 204, 70)}${fawnAsleep(c)}</g>`;
  if (st >= 3) s += aura(100, 70, 80, c.pal.glow) + aura(130, 130, 70, c.pal.accent2);
  s += st === 1 ? ground(130, 205, 76) : ground(128, 206, 66);
  const k = [1, 0.92, 0.86, 0.86][st];
  let top = '';
  if (st >= 3) {
    const my = 34, mx = 190;
    top += `<circle cx="${mx}" cy="${my}" r="12" fill="${c.pal.glow}" opacity="0.4" filter="url(#glow)"/>`;
    top += `<path d="M${mx - 3} ${my - 9} a9 9 0 1 0 8 15 a7.2 7.2 0 1 1 -8 -15 Z" fill="${c.pal.gold}" stroke="#140F24" stroke-width="1"/>`;
    for (let i = 0; i < 6; i++) top += sparkle(14 + c.r() * 190, 30 + c.r() * 100, 1.6 + c.r() * 2, i % 2 ? c.pal.glow : '#FFF6D8', false);
    top += speckles(c, 60, 30, 50, 20, 8, c.pal.glow);
  }
  // Galop : le corps se cabre légèrement et quitte le sol ; traînée d'étoiles soulevée par les sabots.
  if (st >= 2) {
    let trail = '';
    for (let i = 0; i < 18; i++) {
      const t = c.r();
      trail += `<circle cx="${f(150 + t * 70)}" cy="${f(196 - t * 18 + (c.r() - 0.5) * 14)}" r="${f(0.6 + c.r() * 1.4)}" fill="${i % 3 ? '#FFF6D8' : c.pal.glow}" opacity="${f(0.9 - t * 0.6)}"/>`;
    }
    return s + top + trail + `<g transform="translate(0 -2) rotate(-3 120 150) translate(120 205) scale(${k}) translate(-120 -205)">${stag(c)}</g>`;
  }
  return s + top + `<g transform="translate(120 205) scale(${k}) translate(-120 -205)">${stag(c)}</g>`;
}

export const cervastre: Species = (c) => {
  const st = Math.min(c.stage, 3);
  setLook(`cervastre-${st}`, c.pal, ['#CFE4FF', '#FFB48A', '#FFD49A', '#7CF5D0'][st], st === 2 ? [0.62, 0.2] : [0.32, 0.2]);
  return noInk(drawCerv(c));
};

// ---------------------------------------------------------------------------------------------------------------
// Décor : forêt cosmique (clairière moussue la nuit, ruisseau au crépuscule, lisière à l'aube, forêt-cathédrale
// sous les aurores).

/** Fond plein en dégradé vertical. */
export function skyGrad(id: string, b: Bounds, stops: [number, string][]): string {
  return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">${stops.map(([o, col]) => `<stop offset="${o}" stop-color="${col}"/>`).join('')}</linearGradient></defs>`
    + `<rect x="${b.x0}" y="${b.y0}" width="${b.x1 - b.x0}" height="${b.y1 - b.y0}" fill="url(#${id})"/>`;
}
export function stars(c: DrawCtx, b: Bounds, n: number, ymax: number, col = '#FFF6D8'): string {
  let o = '';
  for (let i = 0; i < n; i++) {
    const x = b.x0 + c.r() * (b.x1 - b.x0), y = b.y0 + c.r() * (ymax - b.y0), r = 0.3 + c.r() * c.r() * 1.3;
    o += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${col}" opacity="${f(0.35 + c.r() * 0.6)}"/>`;
  }
  return o;
}
/** Tronc droit et légèrement effilé, écorce au trait. `light` = côté éclairé (-1 gauche, 1 droite). */
export function trunk(c: DrawCtx, x: number, top: number, bot: number, w: number, fill: string, shade: string, detail: number, light = -1, glowCol = ''): string {
  const tw = w * 0.82, d = `M${f(x - w)} ${f(bot)} C${f(x - w * 0.8)} ${f(bot - 10)} ${f(x - tw)} ${f(bot - 30)} ${f(x - tw)} ${f(top)} L${f(x + tw)} ${f(top)} C${f(x + tw)} ${f(bot - 30)} ${f(x + w * 0.8)} ${f(bot - 10)} ${f(x + w)} ${f(bot)} Z`;
  let o = `<path d="${d}" fill="${fill}"/>`;
  if (detail > 0) {
    o += `<path d="M${f(x - light * tw * 0.2)} ${f(top)} L${f(x - light * tw)} ${f(top)} L${f(x - light * w)} ${f(bot)} L${f(x - light * w * 0.2)} ${f(bot)} Z" fill="${shade}" opacity="0.8"/>`;
    o += `<path d="M${f(x - light * tw * 0.2)} ${f(top)} L${f(x - light * tw)} ${f(top)} L${f(x - light * w)} ${f(bot)} L${f(x - light * w * 0.2)} ${f(bot)} Z" fill="url(#fine)" opacity="${f(detail)}"/>`;
    for (let i = 0; i < w * 0.9; i++) {
      const xx = x - tw + c.r() * tw * 2, y0 = top + c.r() * (bot - top), len = 8 + c.r() * 22;
      o += `<path d="M${f(xx)} ${f(y0)} q${f((c.r() - 0.5) * 2)} ${f(len / 2)} 0 ${f(len)}" fill="none" stroke="#140F24" stroke-width="0.5" opacity="${f(0.35 * detail)}"/>`;
    }
    if (glowCol) o += `<path d="M${f(x + light * tw * 0.98)} ${f(top)} L${f(x + light * w * 0.96)} ${f(bot - 4)}" stroke="${glowCol}" stroke-width="1" opacity="0.7"/>`;
    o += `<path d="M${f(x - tw)} ${f(top)} L${f(x - tw)} ${f(bot - 30)} C${f(x - tw)} ${f(bot - 30)} ${f(x - w * 0.8)} ${f(bot - 10)} ${f(x - w)} ${f(bot)} M${f(x + tw)} ${f(top)} L${f(x + tw)} ${f(bot - 30)} C${f(x + tw)} ${f(bot - 30)} ${f(x + w * 0.8)} ${f(bot - 10)} ${f(x + w)} ${f(bot)}" fill="none" stroke="#140F24" stroke-width="${f(0.5 + detail * 0.7)}" opacity="${f(0.4 + detail * 0.4)}"/>`;
  }
  return o;
}
/** Fougère : rachis courbe et pinnules alternées. */
export function fern(x: number, y: number, len: number, ang: number, curl: number, col: string, ink = 0.6): string {
  let d = '', leaf = '';
  const a0 = (ang * Math.PI) / 180;
  let px = x, py = y, a = a0;
  const n = 14;
  const pts: Pt[] = [[px, py]];
  for (let i = 1; i <= n; i++) {
    a += curl / n;
    px += Math.cos(a) * len / n; py += Math.sin(a) * len / n;
    pts.push([px, py]);
    const l = (len * 0.24) * (1 - i / (n + 2));
    for (const s of [-1, 1]) {
      const la = a + s * 1.1;
      leaf += `M${f(px)} ${f(py)} q${f(Math.cos(la - s * 0.4) * l * 0.6)} ${f(Math.sin(la - s * 0.4) * l * 0.6)} ${f(Math.cos(la) * l)} ${f(Math.sin(la) * l)} `;
    }
  }
  d = spl(pts);
  return `<path d="${leaf}" fill="none" stroke="${col}" stroke-width="2.2" stroke-linecap="round"/>`
    + (ink ? `<path d="${leaf}" fill="none" stroke="#140F24" stroke-width="0.4" opacity="${ink}"/>` : '')
    + `<path d="${d}" fill="none" stroke="${col}" stroke-width="1.3"/>` + (ink ? `<path d="${d}" fill="none" stroke="#140F24" stroke-width="0.5" opacity="${ink}"/>` : '');
}
export function grass(c: DrawCtx, x0: number, x1: number, y: number, h: number, col: string, n: number, op = 0.8): string {
  let d = '';
  for (let i = 0; i < n; i++) {
    const x = x0 + c.r() * (x1 - x0), hh = h * (0.5 + c.r() * 0.7), lean = (c.r() - 0.5) * hh * 0.8;
    d += `M${f(x)} ${f(y + c.r() * 4)} q${f(lean * 0.3)} ${f(-hh * 0.6)} ${f(lean)} ${f(-hh)} `;
  }
  return `<path d="${d}" fill="none" stroke="${col}" stroke-width="0.9" stroke-linecap="round" opacity="${op}"/>`;
}
export function fireflies(c: DrawCtx, x0: number, y0: number, x1: number, y1: number, n: number, col: string): string {
  let o = '';
  for (let i = 0; i < n; i++) {
    const x = x0 + c.r() * (x1 - x0), y = y0 + c.r() * (y1 - y0);
    o += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(2.5 + c.r() * 2)}" fill="${col}" opacity="0.35" filter="url(#glow)"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(0.7 + c.r() * 0.6)}" fill="#FFF6D8"/>`;
  }
  return o;
}
function mushrooms(x: number, y: number, s: number, col: string): string {
  let o = `<ellipse cx="${f(x)}" cy="${f(y - 6 * s)}" rx="${f(14 * s)}" ry="${f(9 * s)}" fill="${col}" opacity="0.3" filter="url(#soft)"/>`;
  for (const [dx, h, r] of [[0, 9, 4.2], [6, 6, 3], [-5, 5, 2.4]] as const) {
    const X = x + dx * s, Y = y, H = h * s, R = r * s;
    o += `<path d="M${f(X - R * 0.25)} ${f(Y)} L${f(X - R * 0.18)} ${f(Y - H)} L${f(X + R * 0.18)} ${f(Y - H)} L${f(X + R * 0.25)} ${f(Y)} Z" fill="#E8E0CC" stroke="#140F24" stroke-width="0.5"/>`;
    o += `<path d="M${f(X - R)} ${f(Y - H)} Q${f(X)} ${f(Y - H - R * 1.4)} ${f(X + R)} ${f(Y - H)} Q${f(X)} ${f(Y - H + R * 0.35)} ${f(X - R)} ${f(Y - H)} Z" fill="${col}" stroke="#140F24" stroke-width="0.6"/>`;
    o += `<path d="M${f(X - R * 0.5)} ${f(Y - H - R * 0.55)} q${f(R * 0.3)} ${f(-R * 0.3)} ${f(R * 0.6)} ${f(-R * 0.3)}" fill="none" stroke="#FFF6D8" stroke-width="0.6" opacity="0.8"/>`;
  }
  return o;
}

cervastre.scene = (c: DrawCtx, b: Bounds) => noInk(cervScene(c, b), '#05030C');
function cervScene(c: DrawCtx, b: Bounds): string {
  const st = Math.min(c.stage, 3);
  const id = `cervastre-${st}-bg`;
  const h = c.hue;
  const W = b.x1 - b.x0;
  let o = '';
  const rect = (fill: string, y0: number, op = 1, extra = '') => `<rect x="${b.x0}" y="${f(y0)}" width="${W}" height="${f(b.y1 - y0)}" fill="${fill}" opacity="${op}"${extra}/>`;
  if (st === 0) {
    // Clairière moussue, nuit profonde ; un rayon de lune tombe entre les troncs sur le faon endormi.
    o += skyGrad(`${id}-s`, b, [[0, '#0B1426'], [0.55, '#16293A'], [1, '#0E1A1E']]);
    o += stars(c, b, 40, 90);
    o += `<circle cx="40" cy="28" r="13" fill="#F4ECD0" opacity="0.9"/><circle cx="40" cy="28" r="26" fill="#F4ECD0" opacity="0.25" filter="url(#soft)"/>`;
    for (const [x, w] of [[14, 5], [62, 4], [96, 6], [150, 4.5], [182, 5], [208, 4]] as const) o += trunk(c, x, b.y0, 150, w, '#2A4250', '#22384A', 0, -1);
    o += `<rect x="${b.x0}" y="110" width="${W}" height="50" fill="#5C8A90" opacity="0.18" filter="url(#soft)"/>`;
    for (const [x, w] of [[30, 11], [128, 9], [196, 13]] as const) o += trunk(c, x, b.y0, 168, w, '#1C2E36', '#132028', 0.5, -1, '#9FC8C0');
    // Rayon de lune.
    o += `<path d="M30 20 L70 20 L178 210 L82 210 Z" fill="#F4ECD0" opacity="0.12" filter="url(#soft)"/>`;
    // Sol de mousse, creux où dort le faon.
    o += `<path d="M${b.x0} 162 C40 150 90 156 120 158 C160 160 200 150 ${b.x1} 156 L${b.x1} ${b.y1} L${b.x0} ${b.y1} Z" fill="#1F3B30"/>`;
    o += `<path d="M${b.x0} 162 C40 150 90 156 120 158 C160 160 200 150 ${b.x1} 156 L${b.x1} 170 L${b.x0} 172 Z" fill="url(#fine)" opacity="0.5"/>`;
    o += `<ellipse cx="116" cy="200" rx="90" ry="22" fill="#2F5A44"/><ellipse cx="116" cy="200" rx="90" ry="22" fill="url(#fine)" opacity="0.4"/>`;
    o += `<ellipse cx="110" cy="194" rx="70" ry="10" fill="#7FB59A" opacity="0.25" filter="url(#soft)"/>`;
    for (let i = 0; i < 40; i++) o += `<circle cx="${f(30 + c.r() * 170)}" cy="${f(186 + c.r() * 30)}" r="${f(0.8 + c.r() * 1.2)}" fill="#4F8A66" opacity="0.7"/>`;
    o += fern(4, 214, 60, -60, 0.9, '#2E6A52') + fern(10, 222, 54, -40, 0.7, '#3A7A5C') + fern(218, 214, 58, -120, -0.9, '#2E6A52') + fern(212, 226, 50, -150, -0.6, '#3A7A5C');
    o += mushrooms(186, 214, 1.1, hsl(h + 160, 70, 70)) + mushrooms(36, 222, 0.8, hsl(h + 160, 70, 70));
    o += fireflies(c, 20, 60, 200, 150, 9, '#E8F59A');
    o += rect('#000', 226, 0.25);
  } else if (st === 1) {
    // Ruisseau à la lisière, au crépuscule : ciel violet et braise, reflets d'étoiles dans l'eau.
    o += skyGrad(`${id}-s`, b, [[0, '#1E1638'], [0.42, '#4A2E5A'], [0.6, '#C2716A'], [0.68, '#E6A777']]);
    o += stars(c, b, 34, 80);
    // Collines boisées lointaines.
    o += `<path d="M${b.x0} 140 C30 126 50 132 70 124 C96 114 120 128 146 120 C170 112 196 126 ${b.x1} 118 L${b.x1} 160 L${b.x0} 160 Z" fill="#6A4A6E" opacity="0.85"/>`;
    let pines = '';
    for (let x = b.x0; x < b.x1; x += 5 + c.r() * 5) { const y = 128 + Math.sin(x / 19) * 5 + c.r() * 4, hh = 8 + c.r() * 10; pines += `M${f(x - 3)} ${f(y + 6)} L${f(x)} ${f(y - hh)} L${f(x + 3)} ${f(y + 6)} Z `; }
    o += `<path d="${pines}" fill="#4E3558"/>`;
    o += `<rect x="${b.x0}" y="128" width="${W}" height="24" fill="#E6A777" opacity="0.25" filter="url(#soft)"/>`;
    for (const [x, w] of [[18, 8], [46, 5], [176, 6], [204, 10]] as const) o += trunk(c, x, b.y0, 160, w, '#3A2846', '#2A1C36', 0.5, 1, '#F0B48A');
    // Berges et ruisseau.
    o += `<path d="M${b.x0} 156 C60 150 160 150 ${b.x1} 154 L${b.x1} ${b.y1} L${b.x0} ${b.y1} Z" fill="#2C2A3A"/>`;
    const water = `M100 152 C120 156 150 160 160 170 C176 186 200 196 ${b.x1} 200 L${b.x1} ${b.y1} L${b.x0} ${b.y1} L${b.x0} 206 C40 204 70 192 80 176 C88 164 92 156 100 152 Z`;
    o += `<defs><linearGradient id="${id}-w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E6A777"/><stop offset="0.5" stop-color="#5A4070"/><stop offset="1" stop-color="#1E1838"/></linearGradient></defs>`;
    o += `<path d="${water}" fill="url(#${id}-w)" stroke="#140F24" stroke-width="0.8"/>`;
    for (let i = 0; i < 14; i++) { const y = 160 + i * 5.5, x = 100 - i * 2 + c.r() * 30, l = 6 + i * 2.5; o += `<path d="M${f(x)} ${f(y)} h${f(l)}" stroke="#FFF6D8" stroke-width="0.6" opacity="${f(0.25 + c.r() * 0.3)}"/>`; }
    o += stars(c, { x0: 60, y0: 180, x1: 200, y1: 236 }, 14, 236);
    o += `<ellipse cx="80" cy="204" rx="14" ry="3" fill="none" stroke="#FFF6D8" stroke-width="0.6" opacity="0.6"/><ellipse cx="80" cy="204" rx="22" ry="5" fill="none" stroke="#FFF6D8" stroke-width="0.4" opacity="0.4"/>`;
    o += `<ellipse cx="172" cy="205" rx="12" ry="2.6" fill="none" stroke="#FFF6D8" stroke-width="0.6" opacity="0.6"/>`;
    o += grass(c, b.x0, 90, 158, 10, '#4A3C56', 30) + grass(c, 150, b.x1, 160, 10, '#4A3C56', 26);
    o += fern(b.x0 - 2, 196, 50, -50, 0.8, '#3E4A4A') + fern(b.x1 + 2, 186, 46, -130, -0.8, '#3E4A4A');
    o += fireflies(c, 30, 70, 200, 140, 5, '#FFD99A');
  } else if (st === 2) {
    // Lisière à l'aube : soleil levant derrière la forêt lointaine, prairie couverte de rosée.
    o += skyGrad(`${id}-s`, b, [[0, '#26345A'], [0.35, '#6C6E96'], [0.58, '#E7B48C'], [0.66, '#F6DDB0']]);
    o += stars(c, b, 18, 50);
    o += `<circle cx="168" cy="148" r="30" fill="#FFF0C8" opacity="0.7" filter="url(#soft)"/><circle cx="168" cy="150" r="11" fill="#FFF4D8"/>`;
    for (let i = 0; i < 9; i++) { const a = (-160 + i * 18) * Math.PI / 180; o += `<path d="M168 150 L${f(168 + Math.cos(a) * 160)} ${f(150 + Math.sin(a) * 160)}" stroke="#FFF0C8" stroke-width="5" opacity="0.08"/>`; }
    let far = '', mid = '';
    for (let x = b.x0; x < b.x1 + 6; x += 4 + c.r() * 4) { const y = 146 + Math.sin(x / 23) * 4, hh = 10 + c.r() * 14; far += `M${f(x - 3.5)} ${f(y + 8)} L${f(x)} ${f(y - hh)} L${f(x + 3.5)} ${f(y + 8)} Z `; }
    for (let x = b.x0; x < b.x1 + 6; x += 6 + c.r() * 6) { const y = 158 + Math.sin(x / 31) * 3, hh = 14 + c.r() * 16; mid += `M${f(x - 5)} ${f(y + 8)} L${f(x)} ${f(y - hh)} L${f(x + 5)} ${f(y + 8)} Z `; }
    o += `<path d="${far}" fill="#8C7C9A" opacity="0.9"/>` + `<rect x="${b.x0}" y="146" width="${W}" height="16" fill="#F6DDB0" opacity="0.35" filter="url(#soft)"/>`;
    o += `<path d="${mid}" fill="#5A5274"/>`;
    o += `<path d="M${b.x0} 166 C60 160 150 162 ${b.x1} 164 L${b.x1} ${b.y1} L${b.x0} ${b.y1} Z" fill="#4C5A5C"/>`;
    o += `<path d="M${b.x0} 166 C60 160 150 162 ${b.x1} 164 L${b.x1} 180 L${b.x0} 180 Z" fill="#E7B48C" opacity="0.25"/>`;
    o += `<path d="M${b.x0} 196 C60 192 150 192 ${b.x1} 196 L${b.x1} ${b.y1} L${b.x0} ${b.y1} Z" fill="#33403F"/><path d="M${b.x0} 196 C60 192 150 192 ${b.x1} 196 L${b.x1} ${b.y1} L${b.x0} ${b.y1} Z" fill="url(#fine)" opacity="0.4"/>`;
    o += grass(c, b.x0, b.x1, 170, 7, '#6E7A70', 50, 0.7) + grass(c, b.x0, b.x1, 200, 12, '#26302E', 60, 0.9);
    // Grands pins de premier plan qui encadrent la scène.
    o += trunk(c, b.x0 + 4, b.y0, 236, 9, '#232436', '#171828', 0.7, 1, '#F6C690') + trunk(c, b.x1 - 6, b.y0, 236, 11, '#232436', '#171828', 0.7, -1, '#F6C690');
    for (let i = 0; i < 16; i++) o += `<circle cx="${f(20 + c.r() * 190)}" cy="${f(196 + c.r() * 30)}" r="${f(0.6 + c.r())}" fill="#FFF6D8" opacity="0.7"/>`;
  } else {
    // Forêt-cathédrale sous les aurores : troncs géants veinés d'or, graines de lumière en suspension.
    o += skyGrad(`${id}-s`, b, [[0, '#0A0C22'], [0.6, '#1A1C40'], [1, '#141530']]);
    o += stars(c, b, 60, 150);
    const au = (y: number, col: string, op: number) => `<path d="M${b.x0 - 20} ${y} C40 ${y - 40} 90 ${y + 30} 140 ${y - 10} C180 ${y - 40} 210 ${y + 10} ${b.x1 + 20} ${y - 20}" fill="none" stroke="${col}" stroke-width="22" opacity="${op}" filter="url(#soft)"/>`;
    o += au(60, hsl(h + 120, 80, 60), 0.5) + au(84, hsl(h + 200, 80, 66), 0.4) + au(40, hsl(h + 60, 80, 70), 0.3);
    for (const [x, w] of [[40, 6], [84, 4], [146, 5], [186, 6]] as const) o += trunk(c, x, b.y0, 160, w, '#2A2C56', '#22244A', 0, 1);
    o += `<rect x="${b.x0}" y="120" width="${W}" height="50" fill="${hsl(h + 200, 60, 60)}" opacity="0.18" filter="url(#soft)"/>`;
    for (const [x, w, lt] of [[b.x0 + 8, 16, 1], [b.x1 - 10, 18, -1]] as const) {
      o += trunk(c, x, b.y0, 236, w, '#1B1A36', '#121128', 0.8, lt, '#E9C25B');
      o += `<path d="M${f(x - w * 0.3)} ${b.y0} C${f(x + w * 0.4)} 60 ${f(x - w * 0.5)} 120 ${f(x + w * 0.2)} 230" fill="none" stroke="#E9C25B" stroke-width="0.9" opacity="0.8"/>`;
    }
    o += `<path d="M${b.x0} 180 C60 172 160 172 ${b.x1} 180 L${b.x1} ${b.y1} L${b.x0} ${b.y1} Z" fill="#1C1E3A"/>`;
    o += `<path d="M30 236 C70 210 120 196 ${b.x1} 186" fill="none" stroke="#E9C25B" stroke-width="8" opacity="0.2" filter="url(#soft)"/>`;
    o += grass(c, b.x0, b.x1, 186, 10, '#3A3C6A', 50);
    o += fern(b.x0 + 4, 230, 50, -60, 0.9, '#2C3C66') + fern(b.x1 - 4, 232, 50, -120, -0.9, '#2C3C66');
    for (let i = 0; i < 4; i++) { const x = 30 + c.r() * 160, y = 10 + c.r() * 60; o += `<path d="M${f(x)} ${f(y)} l-22 10" stroke="#FFF6D8" stroke-width="0.9" opacity="0.7"/>`; }
    o += fireflies(c, 20, 40, 200, 200, 14, '#E9C25B');
  }
  if (b.y1 > 240) o += rect('#0B0A18', 236, 0.5);
  return o;
}

