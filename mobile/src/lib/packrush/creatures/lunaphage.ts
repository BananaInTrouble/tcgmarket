import { constellation, hsl, type Bounds, type DrawCtx, eyeA, fur, gild, ink, line, rim, shadow, sparkle, speckles, type Species } from './style.ts';

type Pt = [number, number];
const f = (v: number) => v.toFixed(1);
const P = (p: Pt) => `${f(p[0])} ${f(p[1])}`;

/** Courbe lisse (Catmull-Rom → Bézier) passant par les points. */
function smooth(pts: Pt[], start = true): string {
  let d = start ? `M${P(pts[0])}` : `L${P(pts[0])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    d += ` C${P([p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6])} ${P([p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6])} ${P(p2)}`;
  }
  return d;
}

/** Membre / queue : contour lisse autour d'une ligne d'articulations, avec une épaisseur par articulation. */
function limb(pts: Pt[], w: number[]): string {
  const L: Pt[] = [], R: Pt[] = [];
  pts.forEach((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const tx = b[0] - a[0], ty = b[1] - a[1], k = Math.hypot(tx, ty) || 1;
    const nx = -ty / k, ny = tx / k;
    L.push([p[0] + nx * w[i] / 2, p[1] + ny * w[i] / 2]);
    R.push([p[0] - nx * w[i] / 2, p[1] - ny * w[i] / 2]);
  });
  const e = pts[pts.length - 1], q = pts[pts.length - 2], k = Math.hypot(e[0] - q[0], e[1] - q[1]) || 1;
  const tip: Pt = [e[0] + (e[0] - q[0]) / k * w[w.length - 1] * 0.6, e[1] + (e[1] - q[1]) / k * w[w.length - 1] * 0.6];
  return `${smooth(L)} Q${P(tip)} ${P(R[R.length - 1])}${smooth(R.slice().reverse(), false).replace(/^L[^C]*/, '')} Z`;
}

/** Mèches : contour en pointes de pinceau le long d'une ligne de base, vers l'extérieur (côté gauche du tracé). */
function locks(base: Pt[], len: number, lean = 0.4): string {
  let d = `M${P(base[0])}`;
  for (let i = 0; i < base.length - 1; i++) {
    const a = base[i], b = base[i + 1];
    const tx = b[0] - a[0], ty = b[1] - a[1], k = Math.hypot(tx, ty) || 1;
    const nx = ty / k, ny = -tx / k;
    const L = len * (0.75 + ((i * 37) % 10) / 20);
    const tip: Pt = [b[0] + nx * L + tx * lean, b[1] + ny * L + ty * lean];
    d += ` Q${P([a[0] + nx * L * 0.7, a[1] + ny * L * 0.7])} ${P(tip)} Q${P([b[0] + nx * L * 0.2, b[1] + ny * L * 0.2])} ${P(b)}`;
  }
  return d;
}

/** Rééchantillonne une ligne brisée en points espacés d'environ `step`. */
function densify(pts: Pt[], step: number): Pt[] {
  const out: Pt[] = [pts[0]];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1], n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
    for (let k = 1; k <= n; k++) out.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]);
  }
  return out;
}

// Tête : dessinée de profil (vers +x) dans un repère local, pivotée vers la lune (partagé avec le décor).
const HA = -36, HS = 0.86;
const ca = Math.cos((HA * Math.PI) / 180), sa = Math.sin((HA * Math.PI) / 180);
const HX = 180 - HS * (103 * ca - 17 * sa), HY = 30 - HS * (103 * sa + 17 * ca);
const hp = (x: number, y: number): Pt => [HX + HS * (x * ca - y * sa), HY + HS * (x * sa + y * ca)];

/**
 * Lunaphage : grand loup cosmique (mythique, carte plein cadre). Cabré sur un éperon de roche lunaire, il a bondi
 * sur la pleine lune : une patte y plante ses griffes, ses crocs en arrachent une bouchée dont l'éclat brille entre
 * ses mâchoires. Son dos est une nuit étoilée, sa queue se dissout en nébuleuse. Style gravure : hachures fines, or.
 */
export const lunaphage: Species = (c: DrawCtx) => {
  const { pal } = c;
  const CREAM = '#FFF6D8', INK = '#140F24';
  const id = 'lunaphage-4';
  let s = '';

  // Bordure de poils : mèches pointues le long d'un bord (sens du tracé : poils à gauche).
  const tufts = (base: Pt[], len: number, fill: string, w = 1.1) =>
    ink(`${locks(base, len, 0.35)} ${smooth(base.slice().reverse(), false)} Z`, fill, w);

  // ---------- Queue-nébuleuse (panache en S qui se dissout en étoiles) ----------
  const tailPts: Pt[] = [[48, 192], [26, 204], [6, 190], [-2, 162], [4, 132], [18, 108], [36, 92]];
  const tail = limb(tailPts, [12, 22, 30, 32, 28, 18, 6]);
  s += `<ellipse cx="44" cy="74" rx="24" ry="18" fill="${pal.accent}" opacity="0.35" filter="url(#soft)"/>`;
  s += line('M36 92 C46 80 52 64 50 46 M26 100 C24 84 28 70 36 58 M40 98 C56 92 64 78 66 62', 0.9, pal.light, ' opacity="0.55"');
  s += speckles(c, 46, 66, 22, 24, 16);
  s += constellation([[50, 46], [60, 30], [54, 12], [70, 2]], pal.gold);
  s += tufts([[-2, 170], [-4, 150], [0, 130], [8, 114], [20, 100], [32, 92]], 9, pal.deep, 1);
  s += tufts([[40, 196], [26, 206], [12, 204], [2, 192], [-2, 176]], 7, pal.deep, 1);
  s += `<defs><clipPath id="${id}-t"><path d="${tail}"/></clipPath></defs><path d="${tail}" fill="${pal.deep}"/><g clip-path="url(#${id}-t)">`
    + `<ellipse cx="6" cy="160" rx="12" ry="34" fill="${pal.accent2}" opacity="0.45" filter="url(#soft)"/>`
    + `<ellipse cx="22" cy="110" rx="12" ry="14" fill="${CREAM}" opacity="0.5" filter="url(#soft)"/>`
    + `<ellipse cx="28" cy="198" rx="14" ry="10" fill="${pal.glow}" opacity="0.35" filter="url(#soft)"/>`
    + speckles(c, 10, 156, 16, 46, 26)
    + line('M14 116 C2 138 0 166 14 190 M24 112 C12 136 10 164 26 192 M6 128 C-4 150 -2 172 6 188', 0.7, CREAM, ' opacity="0.35"')
    + `</g>` + ink(tail, 'none', 1.3);
  s += rim(smooth([[36, 92], [18, 108], [4, 132], [-2, 162]]), pal.glow, 1);

  // ---------- Membres lointains ----------
  const farHind = 'M114 206 C118 214 114 222 104 226 C92 230 82 234 78 238 C76 242 78 246 82 248 C88 249 90 253 84 254 L68 254 C64 254 64 250 66 248 C64 244 62 240 60 236 C58 230 60 222 66 216 C70 212 74 208 76 204';
  const farFore = limb([[140, 124], [164, 146], [192, 126], [202, 112], [210, 106]], [22, 14, 9, 9, 6]);
  s += `<path d="${farHind} Z" fill="${pal.shade}"/>` + shadow(farHind + ' Z', INK, 0.4, 'xhatch') + ink(farHind, 'none', 1.2);
  s += ink(farFore, pal.shade, 1.2) + shadow(farFore, INK, 0.5, 'xhatch');
  s += line('M206 108 l7 -1 M207 112 l7 1', 0.8, CREAM) + line('M78 254 l1 -4 M83 254 l1 -3', 0.8);

  // ---------- Patte arrière proche ----------
  const hind = 'M92 206 C96 214 92 222 82 226 C70 230 60 234 56 238 C54 242 56 246 60 248 C66 249 68 253 62 254 L46 254 C42 254 42 250 44 248 C42 244 40 240 38 236 C36 230 38 222 44 216 C48 212 52 208 54 204';
    s += `<defs><clipPath id="${id}-h"><path d="${hind} Z"/></clipPath></defs><path d="${hind} Z" fill="${pal.body}"/>`;
  s += `<g clip-path="url(#${id}-h)">`
    + `<path d="M30 230 C42 236 52 236 60 240 L70 256 L30 256 Z" fill="${pal.belly}"/>`
    + shadow('M94 212 C92 222 84 226 76 228 C66 232 60 234 56 238 L50 236 C58 230 70 224 80 220 C86 218 90 216 94 212 Z', pal.shade, 0.8, 'fine')
    + shadow('M38 236 C36 230 38 222 44 216 C46 222 46 230 48 240 Z', pal.shade, 0.9, 'xhatch')
    + `</g>` + ink(hind, 'none', 1.5);
  s += line('M56 254 l1 -4 M61 254 l1 -3', 0.8);
  s += fur(c, 72, 226, 7, 150, 4, 5) + rim('M94 210 C96 216 92 222 84 225', pal.light, 1);

  // ---------- Tronc ----------
  const nb = hp(0, 4), nt = hp(22, 50);
  const body = `M${P(nb)} C100 100 96 108 96 118 C92 136 78 154 66 168 C56 180 46 186 40 198 C34 210 40 222 54 224 `
    + `C80 210 102 194 120 184 C140 174 158 164 166 148 C174 130 170 108 160 98 C154 92 148 90 ${P(nt)} Z`;
  s += tufts(densify([[160, 150], [146, 166], [128, 178], [108, 190], [86, 204], [66, 216]], 11), 4, pal.body, 1);
  s += `<defs><clipPath id="${id}-b"><path d="${body}"/></clipPath></defs><path d="${body}" fill="${pal.body}"/>`;
  s += `<g clip-path="url(#${id}-b)">`
    + `<path d="M${P(nb)} C108 90 100 100 100 112 C96 132 80 152 66 168 C56 180 46 186 40 198 L56 204 C74 184 94 164 112 150 C126 138 132 120 130 96 Z" fill="${pal.deep}" filter="url(#soft)"/>`
    + `<path d="M${P(nb)} C108 90 100 100 100 112 C96 132 80 152 66 168 C56 180 46 186 40 198 L50 200 C66 182 84 162 100 148 C114 136 120 118 120 94 Z" fill="${pal.deep}"/>`
    + `<ellipse cx="86" cy="140" rx="7" ry="28" fill="${pal.accent}" opacity="0.45" filter="url(#soft)" transform="rotate(32 86 140)"/>`
    + speckles(c, 84, 146, 10, 40, 22)
    + constellation([[56, 186], [70, 168], [82, 150], [94, 132], [106, 112]], pal.gold)
    + shadow('M54 224 C80 208 100 190 118 178 C136 168 152 158 160 146 C150 168 130 180 112 192 C92 204 72 216 54 224 Z', pal.shade, 0.8, 'fine')
    + shadow('M120 160 C110 170 100 178 90 186 C104 182 118 176 128 170 Z', pal.shade, 0.5, 'fine')
    + line('M104 166 C112 170 120 170 128 166 M96 176 C104 180 112 180 120 176 M112 156 C118 160 126 160 132 156', 0.7, INK, ' opacity="0.45"')
    + `</g>`;
  s += fur(c, 92, 132, 9, 200, 5, 10, pal.light, 0.6) + fur(c, 72, 160, 9, 215, 5, 10, pal.light, 0.6) + fur(c, 108, 108, 8, 195, 4, 8, pal.light, 0.6);
  s += gild('M116 150 a10 10 0 1 0 12 -14 a8 8 0 1 1 -12 14 Z', 1.1) + gild('M110 130 l3 -3 M134 156 l3 3', 0.9);
  s += ink(body, 'none', 1.6);
  s += rim('M100 112 C96 132 80 152 66 168 C56 180 46 186 40 198', pal.glow, 1.1);
  s += line('M52 168 C70 170 84 180 88 196', 1.1, INK, ' opacity="0.8"') + line('M58 176 C70 180 78 188 80 198', 0.7, INK, ' opacity="0.5"');
  s += fur(c, 112, 188, 7, 120, 4, 8) + fur(c, 140, 170, 7, 110, 4, 8);

  // ---------- Crinière (dos : nuit ; poitrail : clair) ----------
  const maneBase: Pt[] = [hp(-2, 20), hp(0, 6), hp(6, -4), [114, 82], [106, 94], [100, 108], [96, 122], [94, 136]];
  const mane = `${locks(densify(maneBase.slice().reverse(), 9), 13, 0.5)} C106 120 112 104 ${P(hp(14, 18))} Z`;
  s += ink(mane, pal.deep, 1.2);
  s += line('M100 112 l-10 -2 M104 98 l-10 -4 M110 86 l-8 -7 M96 126 l-9 0', 0.8, pal.light, ' opacity="0.6"');
  s += speckles(c, 104, 104, 6, 16, 6, pal.glow);
  s += rim('M94 136 C92 124 96 108 104 96 C108 90 112 84 118 80', pal.glow, 1);
  const chestBase: Pt[] = [hp(34, 52), [154, 90], [162, 102], [168, 116], [168, 130], [164, 144], [156, 154]];
  const chest = `${locks(densify(chestBase, 8), 10, 0.55)} C140 140 144 110 ${P(hp(24, 40))} Z`;
  s += ink(chest, pal.belly, 1.1);
  s += shadow('M156 154 C142 140 146 110 140 92 C150 104 154 126 156 154 Z', pal.light, 0.6, 'fine');
  s += fur(c, 156, 106, 10, 70, 4, 6, INK, 0.7) + fur(c, 158, 128, 10, 80, 4, 6, INK, 0.7);

  // ---------- Patte avant proche (griffes plantées dans la lune) ----------
  const fore = limb([[128, 118], [154, 140], [186, 104], [196, 90], [204, 80]], [32, 18, 11, 11, 8]);
  s += `<defs><clipPath id="${id}-f"><path d="${fore}"/></clipPath></defs>${ink(fore, pal.body, 1.5)}`;
  s += `<g clip-path="url(#${id}-f)">`
    + `<path d="M160 136 C170 124 180 112 190 100 L210 100 L210 70 L190 70 Z" fill="${pal.belly}"/>`
    + shadow('M134 136 C144 150 160 150 174 132 C182 120 190 108 200 96 L206 100 C194 116 184 132 172 144 C160 156 142 156 134 136 Z', pal.shade, 0.75, 'fine')
    + `</g>` + ink(fore, 'none', 1.5);
  s += tufts([[154, 146], [146, 148], [138, 144]], 5, pal.body, 0.9);
  s += line('M198 80 l4 -8 M203 84 l6 -6 M206 88 l7 -4', 1.1);
  s += line('M200 77 l3 -5 M205 81 l5 -4 M208 86 l6 -2', 0.9, CREAM);
  s += fur(c, 146, 132, 8, 150, 4, 6) + rim('M128 104 C146 108 152 120 158 128 C170 118 180 104 192 88', pal.light, 1);

  // ---------- Tête (repère local : longueur 100, museau vers +x) ----------
  let hd = '';
  // Oreille lointaine.
  hd += ink('M6 2 C0 -14 -2 -28 0 -42 C10 -34 20 -20 24 -6 Z', pal.deep, 1.2);
  const skull = 'M0 0 C10 -8 28 -10 40 -7 C48 -5 52 -2 57 2 C70 6 86 9 97 11 C101 12 104 15 103 19 C102 23 98 24 95 23 C94 26 92 28 89 28 C80 29 70 31 60 33 C54 35 50 38 46 42 C40 48 28 52 16 50 C6 48 -2 40 -4 28 C-6 18 -4 8 0 0 Z';
  // Mâchoire inférieure, ouverte (pivot à l'articulation).
  let jw = '';
  jw += ink('M50 36 C62 33 76 33 88 33 C92 34 92 39 88 41 C76 44 60 46 44 46 Z', pal.body, 1.3);
  jw += `<path d="M50 36 C62 34 76 34 86 34 C76 38 62 40 50 40 Z" fill="${pal.belly}"/>`;
  jw += shadow('M44 46 C60 46 76 44 88 41 C76 41 60 42 46 42 Z', pal.shade, 0.8, 'fine');
  jw += ink('M79 34 L80.5 26.5 L83 34 Z', CREAM, 0.6) + ink('M70 34.5 L71 30 L73 34.5 Z', CREAM, 0.5) + ink('M62 35 L63 31.5 L64.6 35.3 Z', CREAM, 0.5);
  jw += ink('M50 36 C62 33 76 33 88 33 C92 34 92 39 88 41 C76 44 60 46 44 46 Z', 'none', 1.3);
  hd += ink('M46 38 L90 27 C91 36 89 46 86 52 C70 50 56 44 46 38 Z', INK, 1);
  hd += `<path d="M52 41 C62 44 74 47 84 49 C78 45 66 42 56 39 Z" fill="${pal.accent}" opacity="0.65"/>`;
  hd += `<g transform="rotate(24 44 38)">${jw}</g>`;
  hd += ink(skull, pal.body, 1.7);
  // Masque : calotte sombre, museau et joues clairs.
  hd += `<path d="M0 0 C10 -8 28 -10 40 -7 C48 -5 52 -2 57 2 C70 6 86 9 97 11 C86 12 72 12 60 12 C50 12 42 16 34 22 C22 30 10 30 -3 24 C-5 14 -4 6 0 0 Z" fill="${pal.deep}" opacity="0.88"/>`;
  hd += `<path d="M60 33 C54 35 50 38 46 42 C40 48 28 52 16 50 C24 44 30 36 40 30 C50 24 62 20 76 19 C84 18 90 19 95 23 C94 26 92 28 89 28 C80 29 70 31 60 33 Z" fill="${pal.belly}"/>`;
  hd += shadow('M16 50 C28 52 40 48 46 42 C38 44 28 46 18 44 C10 42 2 36 -3 28 C-2 40 6 48 16 50 Z', pal.shade, 0.8, 'fine');
  hd += shadow('M60 12 C72 12 86 12 97 11 C100 13 102 16 102 19 C90 17 74 17 62 18 Z', pal.shade, 0.5, 'fine');
  hd += speckles(c, 20, 4, 14, 6, 7);
  hd += ink(skull, 'none', 1.7);
  // Truffe, babines, moustaches.
  hd += ink('M97 11 C101 12 104 15 103 19 C102 23 98 24 95 23 C94 19 94 14 97 11 Z', INK, 0.8);
  hd += `<ellipse cx="100.5" cy="15" rx="1.3" ry="0.8" fill="${pal.light}" opacity="0.7"/>`;
  hd += line('M70 22 l1 0 M74 21 l1 0 M78 21 l1 0 M72 25 l1 0 M76 24 l1 0', 1.2);
  hd += ink('M84 28.5 L85.5 37 L88 28 Z', CREAM, 0.6) + ink('M76 29.5 L77 33 L78.6 29.3 Z', CREAM, 0.5) + ink('M68 31 L69 34 L70.4 30.6 Z', CREAM, 0.5);
  hd += line('M57 2 C70 6 86 9 97 11', 0.9, pal.light, ' opacity="0.7"');
  // Oreille proche.
  hd += ink('M12 0 C10 -16 12 -30 16 -44 C26 -34 34 -20 36 -6 Z', pal.body, 1.4);
  hd += `<path d="M16 -2 C15 -16 16 -28 18 -37 C24 -29 29 -18 31 -6 Z" fill="${pal.deep}"/>`;
  hd += fur(c, 22, -8, 9, -95, 4, 5, CREAM, 0.6);
  // Œil d'or en amande, arcade, ride frontale.
  hd += eyeA(52, 7, 6.2, pal.gold, { angle: -6, slit: false, open: 0.42 });
  hd += line('M42 1 C47 -3 55 -3 60 0', 1.3);
  hd += line('M58 10 C62 13 64 15 66 18', 0.8, INK, ' opacity="0.7"') + line('M44 -4 C48 -6 52 -6 54 -5', 0.8, INK, ' opacity="0.6"');
  // Collerette des joues.
  hd += `<path d="M44 44 L36 56 L36 49 L26 60 L26 52 L14 60 L16 52 L2 56 L8 46 L-4 46" fill="${pal.belly}" stroke="${INK}" stroke-width="1.1" stroke-linejoin="round"/>`;
  hd += fur(c, 30, 40, 9, 150, 5, 6) + fur(c, 8, 10, 8, 175, 3, 5, CREAM, 0.6);
  hd += rim('M0 0 C10 -8 28 -10 40 -7 C48 -5 52 -2 57 2 C70 6 86 9 97 11', pal.glow, 1.1);
  hd += gild('M30 -2 c4 -5 12 -5 15 0 M34 4 l2 -3', 1);
  s += `<g transform="translate(${f(HX)} ${f(HY)}) rotate(${HA}) scale(${HS})">${hd}</g>`;

  // Éclat de lune entre les crocs, lumière qui coule.
  const fr = hp(76, 38);
  s += `<circle cx="${f(fr[0])}" cy="${f(fr[1])}" r="12" fill="${pal.glow}" opacity="0.55" filter="url(#soft)"/>`;
  s += ink(`M${f(fr[0] - 6)} ${f(fr[1] + 2)} C${f(fr[0] - 4)} ${f(fr[1] - 6)} ${f(fr[0] + 4)} ${f(fr[1] - 8)} ${f(fr[0] + 8)} ${f(fr[1] - 4)} C${f(fr[0] + 4)} ${f(fr[1] - 3)} ${f(fr[0] + 2)} ${f(fr[1] + 2)} ${f(fr[0] + 4)} ${f(fr[1] + 6)} C${f(fr[0])} ${f(fr[1] + 6)} ${f(fr[0] - 4)} ${f(fr[1] + 5)} ${f(fr[0] - 6)} ${f(fr[1] + 2)} Z`, CREAM, 1);
  const dr = hp(70, 52);
  s += line(`M${P(dr)} c1 6 -1 12 1 18 M${f(dr[0] + 6)} ${f(dr[1] - 1)} c1 5 0 9 2 13`, 1.1, CREAM, ' opacity="0.85"');
  s += `<circle cx="${f(dr[0] + 1)}" cy="${f(dr[1] + 22)}" r="1.4" fill="${CREAM}"/>`;
  for (const [x, y, k] of [[214, 46, 4.5], [220, 62, 3], [204, 60, 2.4], [126, 26, 2.6], [112, 40, 1.8]] as const) {
    s += ink(`M${x - k} ${y} L${x - k * 0.2} ${y - k} L${x + k} ${y - k * 0.3} L${x + k * 0.4} ${y + k * 0.9} Z`, CREAM, 0.8);
  }
  s += sparkle(214, 140, 4, pal.glow, false) + sparkle(84, 30, 3.5, CREAM, false) + sparkle(200, 196, 3, pal.glow, false);
  return s;
};

/** Décor : haut plateau lunaire sous la pleine lune (crêtes lointaines, planète annelée, cratères, ombre portée). */
lunaphage.scene = (c: DrawCtx, b: Bounds) => {
  const { pal } = c;
  const CREAM = '#FFF6D8', INK = '#140F24';
  const id = 'lunaphage-4-bg';
  let s = '';
  const W = b.x1 - b.x0, H = b.y1 - b.y0;
  s += `<defs><linearGradient id="${id}-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${hsl(c.hue + 10, 45, 7)}"/><stop offset="0.55" stop-color="${hsl(c.hue, 40, 16)}"/><stop offset="0.8" stop-color="${hsl(c.hue - 15, 35, 30)}"/></linearGradient></defs>`;
  s += `<rect x="${b.x0}" y="${b.y0}" width="${W}" height="${H}" fill="url(#${id}-sky)"/>`;
  // Voie lactée en écharpe et étoiles.
  s += `<ellipse cx="80" cy="70" rx="150" ry="22" fill="${pal.light}" opacity="0.13" filter="url(#soft)" transform="rotate(-38 80 70)"/>`;
  s += `<ellipse cx="60" cy="96" rx="90" ry="10" fill="${pal.accent2}" opacity="0.12" filter="url(#soft)" transform="rotate(-38 60 96)"/>`;
  for (let i = 0; i < 70; i++) {
    const x = b.x0 + c.r() * W, y = b.y0 + c.r() * 240, r = 0.3 + c.r() * c.r() * 1.4;
    s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${CREAM}" opacity="${f(0.35 + c.r() * 0.6)}"/>`;
  }
  for (const [x, y, k] of [[20, -10, 3], [96, -24, 2.4], [8, 120, 2.2], [214, 120, 2.6]] as const) s += sparkle(x, y, k, CREAM, false);
  // Lueur lunaire sur l'horizon.
  s += `<ellipse cx="170" cy="210" rx="120" ry="30" fill="${pal.glow}" opacity="0.18" filter="url(#soft)"/>`;
  // Planète annelée qui se lève derrière les crêtes.
  s += `<g opacity="0.85"><circle cx="196" cy="206" r="15" fill="${hsl(c.hue + 160, 25, 55)}" stroke="${INK}" stroke-width="0.9"/>`
    + shadow('M196 191 A15 15 0 0 1 196 221 C206 214 206 198 196 191 Z', hsl(c.hue + 160, 30, 30), 0.6, 'fine')
    + line('M184 200 c8 -2 16 -2 24 1 M183 208 c8 -2 18 -1 26 1', 0.6, INK, ' opacity="0.4"')
    + `<ellipse cx="196" cy="206" rx="27" ry="5" fill="none" stroke="${pal.light}" stroke-width="1.6" transform="rotate(-14 196 206)"/></g>`;
  // Crêtes lointaines (pâles, peu contrastées) puis plus proches.
  s += `<path d="M${b.x0} 214 L10 204 L22 208 L40 196 L58 206 L76 200 L96 210 L120 202 L140 208 L158 198 L176 210 L200 204 L214 212 L${b.x1} 206 L${b.x1} 240 L${b.x0} 240 Z" fill="${hsl(c.hue - 10, 22, 34)}" stroke="${INK}" stroke-width="0.7" stroke-opacity="0.4"/>`;
  s += `<path d="M${b.x0} 214 L10 204 L22 208 L40 196 L58 206 L76 200 L96 210 L120 202 L140 208 L158 198 L176 210 L200 204 L214 212 L${b.x1} 206" fill="none" stroke="${pal.glow}" stroke-width="0.8" opacity="0.6"/>`;
  // Meute lointaine qui hurle sur la crête.
  for (const [x, y, k] of [[146, 205, 0.9], [160, 200, 0.75], [172, 206, 0.65]] as const) {
    s += `<path transform="translate(${x} ${y}) scale(${k})" d="M-5 0 C-7 -4 -6 -9 -2 -11 L0 -15 L0 -19 L2 -17 L7 -21 L5 -16 C3 -13 2 -8 3 0 Z M-5 0 C-9 0 -11 -1 -12 -3" fill="${INK}" stroke="${INK}" stroke-width="0.6" stroke-linejoin="round" opacity="0.85"/>`;
  }
  s += `<path d="M${b.x0} 236 C20 228 40 232 62 226 C84 222 100 230 124 226 C150 222 170 230 196 224 C210 222 220 226 ${b.x1} 224 L${b.x1} 260 L${b.x0} 260 Z" fill="${hsl(c.hue - 5, 25, 22)}" stroke="${INK}" stroke-width="0.8" stroke-opacity="0.5"/>`;
  s += `<path d="M${b.x0} 236 C20 228 40 232 62 226 C84 222 100 230 124 226 C150 222 170 230 196 224 C210 222 220 226 ${b.x1} 224 L${b.x1} 260 L${b.x0} 260 Z" fill="url(#fine)" opacity="0.6"/>`;
  s += rim(`M62 226 C84 222 100 230 124 226 C150 222 170 230 196 224`, pal.glow, 0.7);
  // ---------- Lune mordue ----------
  const MX = 180, MY = -14, MR = 56;
  const bt = hp(110, 26);
  const BX = bt[0], BY = bt[1], BR = 24;
  const dd = Math.hypot(BX - MX, BY - MY);
  const a0 = (MR * MR - BR * BR + dd * dd) / (2 * dd), hh = Math.sqrt(Math.max(0, MR * MR - a0 * a0));
  const ux = (BX - MX) / dd, uy = (BY - MY) / dd;
  const p1: Pt = [MX + a0 * ux - hh * uy, MY + a0 * uy + hh * ux], p2: Pt = [MX + a0 * ux + hh * uy, MY + a0 * uy - hh * ux];
  const t1 = Math.atan2(p1[1] - BY, p1[0] - BX), t2 = Math.atan2(p2[1] - BY, p2[0] - BX);
  let span = t2 - t1; while (span > 0) span -= Math.PI * 2;
  let scallop = '';
  for (let i = 1; i <= 6; i++) {
    const ta = t1 + (span * (i - 0.5)) / 6, tb = t1 + (span * i) / 6;
    scallop += ` Q${P([BX + Math.cos(ta) * (BR - 4), BY + Math.sin(ta) * (BR - 4)])} ${P([BX + Math.cos(tb) * BR, BY + Math.sin(tb) * BR])}`;
  }
  const moon = `M${P(p1)}${scallop} A${MR} ${MR} 0 1 0 ${P(p1)} Z`;
  s += `<circle cx="${MX}" cy="${MY}" r="${MR + 34}" fill="${pal.glow}" opacity="0.28" filter="url(#soft)"/>`;
  s += `<circle cx="${MX}" cy="${MY}" r="${MR + 8}" fill="none" stroke="${pal.gold}" stroke-width="0.8" opacity="0.75"/>`;
  s += `<circle cx="${MX}" cy="${MY}" r="${MR + 12}" fill="none" stroke="${pal.gold}" stroke-width="0.5" stroke-dasharray="1 3" opacity="0.7"/>`;
  s += `<defs><clipPath id="${id}-m"><path d="${moon}"/></clipPath></defs><path d="${moon}" fill="${CREAM}"/>`;
  s += `<g clip-path="url(#${id}-m)">`
    + shadow(`M${MX - 34} ${MY - 4} C${MX - 24} ${MY - 22} ${MX - 2} ${MY - 22} ${MX + 6} ${MY - 8} C${MX + 12} ${MY + 6} ${MX - 6} ${MY + 14} ${MX - 20} ${MY + 10} C${MX - 30} ${MY + 8} ${MX - 40} ${MY + 6} ${MX - 34} ${MY - 4} Z`, pal.light, 0.55, 'fine')
    + shadow(`M${MX + 14} ${MY + 12} C${MX + 26} ${MY + 4} ${MX + 40} ${MY + 12} ${MX + 36} ${MY + 28} C${MX + 32} ${MY + 40} ${MX + 16} ${MY + 38} ${MX + 12} ${MY + 28} C${MX + 8} ${MY + 20} ${MX + 8} ${MY + 16} ${MX + 14} ${MY + 12} Z`, pal.light, 0.5, 'fine')
    + shadow(`M${MX - 16} ${MY + 30} c10 -6 22 0 20 10 c-2 8 -16 10 -22 4 c-4 -4 -2 -10 2 -14 Z`, pal.light, 0.45, 'fine')
    + shadow(`M${MX + 32} ${MY - MR} A${MR} ${MR} 0 0 1 ${MX + 32} ${MY + MR} C${MX + 58} ${MY + 24} ${MX + 58} ${MY - 24} ${MX + 32} ${MY - MR} Z`, pal.light, 0.35, 'xhatch')
    + shadow(`M${MX - MR} ${MY} A${MR} ${MR} 0 0 0 ${MX + 10} ${MY + MR} C${MX - 30} ${MY + 50} ${MX - 50} ${MY + 30} ${MX - MR} ${MY} Z`, pal.light, 0.22, 'fine')
    + ([[MX - 10, MY - 30, 6], [MX + 28, MY - 16, 8], [MX - 38, MY + 22, 5], [MX + 2, MY + 20, 4], [MX + 42, MY + 4, 3.5], [MX - 20, MY + 42, 3], [MX + 22, MY + 46, 4], [MX - 30, MY - 10, 2.5]] as const)
      .map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${f(r * 0.82)}" fill="none" stroke="${INK}" stroke-width="0.8" opacity="0.55"/>`
        + `<path d="M${f(x - r * 0.8)} ${f(y + r * 0.1)} A${r} ${f(r * 0.82)} 0 0 0 ${f(x + r * 0.8)} ${f(y + r * 0.2)}" fill="none" stroke="${pal.shade}" stroke-width="${f(r * 0.35)}" opacity="0.4"/>`).join('')
    + `</g>`;
  s += `<path d="${moon}" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>`;
  s += `<circle cx="${f(BX)}" cy="${f(BY)}" r="${BR}" fill="${pal.glow}" opacity="0.4" filter="url(#soft)"/>`;
  s += `<path d="M${P(p1)}${scallop}" fill="none" stroke="${pal.gold}" stroke-width="1.1" transform="translate(${f(-ux * 2)} ${f(-uy * 2)})" opacity="0.9"/>`;

  // ---------- Roche lunaire ----------
  const rock = 'M-10 250 C20 244 46 250 76 248 C106 246 124 250 146 246 C170 242 196 238 236 238 L236 300 L-10 300 Z';
  s += ink(rock, pal.deep, 1.4);
  s += shadow('M-10 258 C40 256 100 258 150 254 C176 250 200 248 236 250 L236 300 L-10 300 Z', INK, 0.55, 'xhatch');
  s += rim('M-10 250 C20 244 46 250 76 248 C106 246 124 250 146 246 C170 242 196 238 236 238', pal.light, 0.9);
  s += line('M168 244 c6 4 14 4 20 0 M100 252 c8 3 16 2 22 -2 M14 254 c6 2 12 2 18 0', 0.8, INK, ' opacity="0.7"');
  s += `<ellipse cx="196" cy="246" rx="10" ry="2.6" fill="none" stroke="${pal.light}" stroke-width="0.8" opacity="0.6"/><ellipse cx="124" cy="256" rx="7" ry="2" fill="none" stroke="${pal.light}" stroke-width="0.7" opacity="0.5"/>`;
  s += `<ellipse cx="58" cy="254" rx="62" ry="7" fill="#000" opacity="0.4" transform="rotate(-4 58 254)"/>`;


  return s;
};
