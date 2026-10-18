import { aura, constellation, eyeA, fur, gild, ground, line, rim, shadow, sparkle, speckles, type DrawCtx, type Species } from './style.ts';

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
/** Partie détourée : aplat, détails internes découpés à la forme, puis contour d'encre. */
export function part(id: string, d: string, fill: string, inner: string, w = 1.6): string {
  return `<defs><clipPath id="${id}"><path d="${d}"/></clipPath></defs><path d="${d}" fill="${fill}"/>`
    + `<g clip-path="url(#${id})">${inner}</g><path d="${d}" fill="none" stroke="#140F24" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"/>`;
}
/** Ombre propre d'un volume cylindrique : tout est ombré sauf la forme décalée vers la lumière (en haut à gauche). */
export function turn(d: string, light: string, shade: string, dx: number, dy: number, hatch = 'fine'): string {
  return shadow('M-40 -40 H300 V320 H-40 Z', shade, 0.9, hatch) + `<path d="${d}" fill="${light}" transform="translate(${dx} ${dy})"/>`;
}

const hoof = (x: number, y: number) =>
  `<path d="M${f(x - 2.6)} ${f(y - 6)} L${f(x + 2.8)} ${f(y - 6)} L${f(x + 3.6)} ${f(y)} L${f(x - 4.6)} ${f(y)} Z" fill="#140F24" stroke="#140F24" stroke-width="1" stroke-linejoin="round"/>`;

/** Membre fin terminé par un sabot. */
function leg(id: string, c: DrawCtx, pts: Pw[], fill: string, far: boolean): string {
  const d = tube(pts);
  const e = pts[pts.length - 1];
  const inner = far ? shadow(d, c.pal.deep, 0.35, 'fine') : turn(d, fill, c.pal.shade, -pts[1][2] * 0.7, -1);
  return part(id, d, fill, inner + line(spl(pts.slice(1, 3).map(([x, y]) => [x + 0.6, y] as Pt)), 0.7, '#140F24', ' opacity="0.5"'), far ? 1.3 : 1.5)
    + hoof(e[0], 205);
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
    const fill = st >= 3 ? (far ? pal.accent2 : pal.glow) : far ? pal.shade : pal.belly;
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
  g += leg(`${id}-lf1`, c, [[96, 144, 7], [93, 164, 4.2], [92, 177, 3.2], [91, 196, 2.6], [90, 200, 2.6]], pal.shade, true);
  g += leg(`${id}-lf2`, c, [[168, 136, 10], [176, 158, 5.4], [181, 175, 3.3], [177, 195, 2.6], [176, 200, 2.6]], pal.shade, true);

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
  g += leg(`${id}-ln1`, c, [[84, 140, 9], [81, 163, 4.6], [79, 176, 3.4], [78, 195, 2.8], [77, 200, 2.8]], pal.body, false);
  g += leg(`${id}-ln2`, c, [[156, 128, 15], [163, 156, 7], [170, 174, 3.7], [166, 195, 2.9], [165, 200, 2.9]], pal.body, false);

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

/** Faon (stade 0) : jambes encore longues et grêles, robe mouchetée d'étoiles, grandes oreilles. */
function fawn(c: DrawCtx): string {
  const { pal } = c;
  const id = 'cervastre-0';
  let g = '';
  g += leg(`${id}-lf1`, c, [[92, 140, 6], [90, 160, 3.4], [91, 171, 2.6], [92, 194, 2.1], [92, 200, 2.1]], pal.shade, true);
  g += leg(`${id}-lf2`, c, [[150, 134, 8], [156, 154, 4.4], [162, 170, 2.7], [158, 194, 2.1], [157, 200, 2.1]], pal.shade, true);
  g += part(`${id}-tl`, 'M160 106 C166 102 172 104 173 110 C169 112 164 111 160 110 Z', pal.body, '', 1.2);
  const B = 'M98 104 C114 99 136 100 150 104 C162 108 168 120 165 134 C162 144 154 148 144 146 C128 149 110 149 98 145 C88 142 82 136 80 128 C76 116 70 102 62 88 L76 70 C82 84 88 96 98 104 Z';
  let bi = '';
  bi += shadow('M76 124 C92 142 124 145 146 141 C158 139 166 132 172 122 L172 160 L70 160 Z', pal.shade, 0.85, 'fine');
  bi += shadow('M166 110 C172 132 162 150 140 150 C152 142 158 128 156 112 Z', pal.deep, 0.5, 'xhatch');
  bi += `<path d="M62 88 C68 100 74 112 78 124 C80 110 74 98 68 90 Z" fill="${pal.belly}" opacity="0.85"/>`;
  bi += line('M136 104 C128 114 128 132 136 146', 0.7, '#140F24', ' opacity="0.5"');
  bi += fur(c, 66, 100, 6, 125, 3, 3) + fur(c, 112, 108, 5, 75, 4, 8);
  // Mouchetures en rangées le long de l'échine (comme un vrai faon), certaines sont des étoiles.
  const spots: Pt[] = [[100, 110], [110, 107], [120, 106], [130, 107], [140, 108], [150, 111], [106, 117], [117, 115], [128, 115], [139, 116], [150, 119], [112, 124], [124, 124], [136, 125], [147, 127], [100, 124]];
  spots.forEach(([x, y], i) => {
    bi += i % 5 === 2 ? sparkle(x, y, 2.8, '#FFF6D8', false) : `<ellipse cx="${x}" cy="${y}" rx="${f(1.5 + c.r() * 0.7)}" ry="${f(1.2 + c.r() * 0.5)}" fill="#FFF6D8" opacity="0.9"/>`;
  });
  g += part(`${id}-b`, B, pal.body, bi, 1.6);
  g += rim('M76 70 C82 84 88 96 98 104 C114 99 136 100 150 104', pal.glow, 1.2);
  g += leg(`${id}-ln1`, c, [[86, 136, 7], [84, 158, 3.8], [83, 170, 2.8], [82, 194, 2.3], [81, 200, 2.3]], pal.body, false);
  g += leg(`${id}-ln2`, c, [[142, 126, 11], [148, 152, 5], [152, 170, 2.9], [148, 194, 2.3], [147, 200, 2.3]], pal.body, false);
  // Oreille de l'arrière.
  g += part(`${id}-ef`, 'M70 58 C72 44 80 34 92 28 C92 40 86 52 76 60 Z', pal.shade, `<path d="M74 56 C76 46 82 38 89 33 C88 42 84 50 77 56 Z" fill="${pal.deep}"/>`, 1.2);
  const H = 'M82 66 C80 56 72 50 63 51 C55 52 49 58 44 66 C40 72 36 75 34 79 C33 83 36 86 40 86 C43 88 48 88 52 86 C60 83 68 80 74 78 C81 75 84 72 82 66 Z';
  let hi = '';
  hi += shadow('M40 90 C56 84 70 82 84 70 L90 92 L36 96 Z', pal.shade, 0.85, 'fine');
  hi += `<path d="M38 86 C46 86 54 84 62 82 C56 87 46 89 40 89 Z" fill="${pal.belly}"/>`;
  hi += `<path d="M34 79 C33 75 37 72 41 75 C42 79 39 83 35 83 Z" fill="#140F24"/>`;
  hi += line('M40 86 C44 85 47 85 50 86', 0.8);
  hi += line('M55 66 C51 69 48 71 45 73', 0.9, '#140F24', ' opacity="0.6"');
  hi += eyeA(59, 64, 5.4, pal.eye, { angle: -18, slit: false, open: 0.55 });
  hi += sparkle(66, 55, 2.4, pal.gold, false);
  g += part(`${id}-h`, H, pal.body, hi, 1.6);
  g += rim('M63 51 C55 52 49 58 44 66 C40 72 36 75 34 79', pal.glow, 1);
  g += part(`${id}-e`, 'M74 60 C80 48 92 40 106 40 C102 50 92 60 78 66 Z', pal.body,
    `<path d="M79 60 C86 51 95 46 102 44 C97 52 89 58 81 62 Z" fill="${pal.deep}"/>` + fur(c, 84, 58, 5, 20, 3, 3, pal.light), 1.3);
  g += sparkle(42, 40, 3, pal.glow, false) + sparkle(178, 76, 2.4, '#FFF6D8', false);
  return g;
}

/**
 * Cervastre → Cervelune → Astrocerf → Astrocerf éveillé : cerf de bestiaire céleste dont les bois se prolongent en
 * constellations. Faon moucheté d'étoiles, daguet aux bois en velours, grand cerf au port de tête noble, puis
 * forme éveillée aux bois dorés, croissant de lune et marques d'or.
 */
export const cervastre: Species = (c) => {
  const st = Math.min(c.stage, 3);
  let s = '';
  if (st >= 3) s += aura(100, 70, 80, c.pal.glow) + aura(130, 130, 70, c.pal.accent2);
  s += ground(124, 205, 78);
  if (st === 0) return s + `<g transform="translate(100 205) scale(1.12) translate(-100 -205)">${fawn(c)}</g>`;
  const k = [1, 0.92, 0.88, 0.88][st];
  let top = '';
  if (st >= 3) {
    const my = 34, mx = 186;
    top += `<circle cx="${mx}" cy="${my}" r="12" fill="${c.pal.glow}" opacity="0.4" filter="url(#glow)"/>`;
    top += `<path d="M${mx - 3} ${my - 9} a9 9 0 1 0 8 15 a7.2 7.2 0 1 1 -8 -15 Z" fill="${c.pal.gold}" stroke="#140F24" stroke-width="1"/>`;
    for (let i = 0; i < 6; i++) top += sparkle(14 + c.r() * 190, 30 + c.r() * 100, 1.6 + c.r() * 2, i % 2 ? c.pal.glow : '#FFF6D8', false);
    top += speckles(c, 60, 30, 50, 20, 8, c.pal.glow);
  }
  return s + top + `<g transform="translate(120 205) scale(${k}) translate(-120 -205)">${stag(c)}</g>`;
};
