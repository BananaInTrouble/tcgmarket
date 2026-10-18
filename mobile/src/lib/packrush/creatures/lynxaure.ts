import { constellation, eyeA, fur, gild, ground, hsl, ink, line, rim, shadow, sparkle, type Bounds, type DrawCtx, type Species } from './style.ts';

/**
 * Lynxaure → Boréalynx → Aurorion : lynx à crinière d'aurore boréale. Planche de bestiaire céleste : lynx dessiné de
 * profil, pinceaux d'oreilles, collerette de joues, pelage tacheté au trait ; la collerette s'étire avec l'âge en
 * rideaux d'aurore (rayons verticaux, lumière diffuse) jusqu'à la crinière flamboyante de l'adulte.
 */

const f = (v: number) => +v.toFixed(1);
/** Point de contour ; un 3e élément non nul marque un angle vif. */
type Pt = [number, number] | [number, number, number];

/** Courbe lisse (Catmull-Rom) passant par les points ; `closed` referme la forme. */
function cr(q: Pt[], closed = false): string {
  const p = closed ? [q[q.length - 1], ...q, q[0], q[1]] : [q[0], ...q, q[q.length - 1]];
  let d = `M${f(q[0][0])} ${f(q[0][1])}`;
  for (let i = 1; i < p.length - 2; i++) {
    const a = p[i - 1], b = p[i], e = p[i + 1], g = p[i + 2];
    const k1 = b[2] ? 0 : 1 / 6, k2 = e[2] ? 0 : 1 / 6;
    d += ` C${f(b[0] + (e[0] - a[0]) * k1)} ${f(b[1] + (e[1] - a[1]) * k1)} ${f(e[0] - (g[0] - b[0]) * k2)} ${f(e[1] - (g[1] - b[1]) * k2)} ${f(e[0])} ${f(e[1])}`;
  }
  return closed ? d + 'Z' : d;
}

const clip = (id: string, d: string, inner: string) => `<clipPath id="${id}"><path d="${d}"/></clipPath><g clip-path="url(#${id})">${inner}</g>`;

/** Hachures de gravure : copies décalées d'une courbe (suivent la forme), qui s'estompent. */
function contour(q: Pt[], dx: number, dy: number, n: number, w = 0.6, color = '#140F24', op = 0.6): string {
  let s = '';
  for (let i = 0; i < n; i++) s += `<path d="${cr(q.map((p) => [p[0] + dx * i, p[1] + dy * i] as Pt))}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" opacity="${f(op * (1 - i / n))}"/>`;
  return s;
}

/** Taches de pelage (petites ellipses sombres, dispersées dans une zone). */
function spots(c: DrawCtx, cx: number, cy: number, rx: number, ry: number, count: number, color: string, op = 0.55): string {
  let s = '';
  for (let i = 0; i < count; i++) {
    const a = c.r() * Math.PI * 2, d = Math.sqrt(c.r());
    const w = 1 + c.r() * 1.6;
    s += `<ellipse cx="${f(cx + Math.cos(a) * rx * d)}" cy="${f(cy + Math.sin(a) * ry * d)}" rx="${f(w * 1.3)}" ry="${f(w * 0.8)}" transform="rotate(${f(-20 + c.r() * 40)} ${f(cx + Math.cos(a) * rx * d)} ${f(cy + Math.sin(a) * ry * d)})" fill="${color}" opacity="${op}"/>`;
  }
  return s;
}

/** Échantillonne la courbe lisse passant par `q` (pour les bords des rubans). */
function sample(q: [number, number][], per = 8): [number, number][] {
  const p = [q[0], ...q, q[q.length - 1]], out: [number, number][] = [];
  for (let i = 1; i < p.length - 2; i++) {
    const a = p[i - 1], b = p[i], e = p[i + 1], g = p[i + 2];
    for (let k = 0; k < per; k++) {
      const t = k / per, t2 = t * t, t3 = t2 * t;
      const v = (j: 0 | 1) => 0.5 * (2 * b[j] + (-a[j] + e[j]) * t + (2 * a[j] - 5 * b[j] + 4 * e[j] - g[j]) * t2 + (-a[j] + 3 * b[j] - 3 * e[j] + g[j]) * t3);
      out.push([v(0), v(1)]);
    }
  }
  out.push(q[q.length - 1]);
  return out;
}

/**
 * Rideau d'aurore : le bord inférieur suit `spine`, les rayons montent verticalement sur une hauteur `h(t)`
 * (0 aux extrémités) ; lueur vive en bas, teinte froide en haut, rayons qui s'estompent.
 */
function curtain(c: DrawCtx, id: string, spine: [number, number][], hmax: number, cols: [string, string, string], ray = 1): string {
  const b = sample(spine, 10), n = b.length;
  const H = (i: number) => { const t = i / (n - 1); return hmax * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.15)), 0.7) * (0.85 + 0.15 * Math.sin(t * 19)); };
  const top = b.map(([x, y], i) => [x + H(i) * 0.12, y - H(i)] as [number, number]);
  const pts = (q: [number, number][]) => q.map(([x, y]) => `${f(x)} ${f(y)}`).join(' L');
  const d = `M${pts(b)} L${pts(top.slice().reverse())}Z`;
  const bottom = `M${pts(b)}`;
  let g = `<path d="${d}" fill="${cols[1]}" opacity="0.35"/>`;
  g += `<path d="${bottom}" fill="none" stroke="${cols[1]}" stroke-width="${f(hmax * 0.9)}" opacity="0.55" filter="url(#soft)" transform="translate(0 ${f(-hmax * 0.55)})"/>`;
  g += `<path d="${bottom}" fill="none" stroke="${cols[0]}" stroke-width="${f(hmax * 0.5)}" opacity="0.8" filter="url(#soft)"/>`;
  for (let i = 1; i < n - 1; i += 1) {
    const [x, y] = b[i], h = H(i);
    if (h < 2) continue;
    const l = h * (0.55 + c.r() * 0.45), w = f(0.4 + c.r() * 0.9);
    for (let k = 0; k < 3; k++) {
      const y0 = y - (l * k) / 3, y1 = y - (l * (k + 1)) / 3;
      g += `<line x1="${f(x + (y - y0) * 0.12)}" y1="${f(y0)}" x2="${f(x + (y - y1) * 0.12)}" y2="${f(y1)}" stroke="${k ? cols[2] : '#FFF6D8'}" stroke-width="${w}" opacity="${f((0.75 - k * 0.22) * ray)}"/>`;
    }
  }
  return clip(id, d, g) + `<path d="${bottom}" fill="none" stroke="#FFF6D8" stroke-width="1" opacity="0.85"/>`
    + `<path d="${bottom}" fill="none" stroke="${cols[0]}" stroke-width="3" opacity="0.5" filter="url(#glow)"/>`;
}


/**
 * Tête de lynx de profil (museau à gauche). Repère : truffe ≈ (26, 90), nuque ≈ (92, 78).
 * `tuft` : longueur des pinceaux ; `ruff` : 0..1 ampleur de la collerette ; `young` : 0..1 museau court et crâne
 * bombé du jeune.
 */
function head(c: DrawCtx, id: string, tuft: number, ruff: number, young = 0, asleep = false): string {
  const { pal } = c;
  const m = (q: Pt[]): Pt[] => q.map((p) => {
    const x = p[0] < 62 ? p[0] + (62 - p[0]) * 0.2 * young : p[0];
    const y = p[1] < 72 && p[0] > 36 ? p[1] - 3 * young : p[1];
    return p[2] ? [x, y, 1] : [x, y];
  });
  const C = (q: Pt[], closed = false) => cr(m(q), closed);
  let s = '';
  // Oreille lointaine.
  s += ink(cr([[80, 66], [85, 46], [91, 30, 1], [95, 46], [97, 68]], true), pal.shade, 1.3);
  s += `<path d="M89.6 33 Q88 ${f(28 - tuft * 0.5)} ${f(93 + tuft * 0.1)} ${f(30 - tuft)} Q92 ${f(28 - tuft * 0.4)} 92.4 33Z" fill="${pal.ink}"/>`;
  // Collerette (sous la tête) : pointes de joues.
  const R = 6 + ruff * 12;
  const ruffD = C([[96, 84], [100, 100], [97, f(106 + R * 0.4)], [93, f(110 + R * 0.7), 1], [87, f(106 + R * 0.25)], [80, f(110 + R * 0.95), 1], [74, f(106 + R * 0.3)], [66, f(110 + R * 0.7), 1], [60, f(104 + R * 0.25)], [52, f(104 + R * 0.45), 1], [46, 100], [50, 92], [70, 86]], true);
  s += ink(ruffD, pal.belly, 1.4);
  s += clip(`${id}-rf`, ruffD, shadow(cr([[92, 84], [104, 96], [100, 140], [86, 140], [90, 104]], true), pal.shade, 0.45, 'fine')
    + line(`M58 104 C66 108 72 114 76 ${f(110 + R * 0.8)} M68 102 C76 106 82 112 86 ${f(108 + R * 0.6)}`, 1, pal.ink, ' opacity="0.65"')
    + fur(c, 70, 108, 6 + R * 0.5, 100, 7, 14, pal.ink, 0.6));
  // Crâne et museau.
  const headD = C([[25, 89, 1], [30, 80], [40, 70], [54, 61], [68, 57], [82, 61], [92, 72], [97, 86], [92, 98], [76, 100], [60, 102], [46, 100], [34, 97], [27, 94]], true);
  s += ink(headD, pal.body, 1.7);
  s += clip(`${id}-hd`, headD,
    shadow(cr([[78, 54], [100, 70], [100, 104], [70, 104], [84, 86]], true), pal.shade, 0.8, 'fine')
    + shadow(C([[30, 96], [50, 94], [70, 98], [70, 106], [30, 106]], true), pal.shade, 0.5, 'fine')
    + `<path d="${C([[22, 92], [34, 86], [46, 87], [58, 92], [64, 100], [46, 104], [28, 100]], true)}" fill="${pal.belly}"/>`
    + line(C([[52, 92], [60, 94], [66, 98], [70, 102]]), 0.8, pal.ink, ' opacity="0.5"')
    + line(C([[60, 88], [68, 89], [76, 92], [84, 98]]) + ' ' + C([[62, 95], [70, 95], [78, 98], [86, 104]]), 1, pal.ink, ' opacity="0.7"')
    + line(C([[58, 63], [60, 67], [60, 73]]) + ' ' + C([[64, 61], [67, 65], [68, 71]]) + ' ' + C([[70, 60], [73, 63], [74, 69]]), 0.8, pal.ink, ' opacity="0.6"')
    + fur(c, 84, 68, 8, 60, 5, 8, pal.ink, 0.6));
  // Oreille proche : dos sombre, intérieur clair poilu.
  const earD = cr([[63, 64], [66, 46], [72, 28, 1], [79, 44], [85, 62]], true);
  s += ink(earD, pal.body, 1.6);
  s += clip(`${id}-er`, earD, `<rect x="60" y="20" width="30" height="${f(14 + young * 6)}" fill="${pal.ink}"/>`
    + `<path d="${cr([[67, 62], [69, 48], [72, 38, 1], [76, 48], [79, 62]], true)}" fill="${pal.deep}"/>`
    + fur(c, 72, 60, 14, -92, 5, 4, pal.belly, 0.7));
  s += `<path d="M70.6 30 Q68 ${f(24 - tuft * 0.5)} ${f(72 + tuft * 0.15)} ${f(28 - tuft)} Q72.6 ${f(26 - tuft * 0.4)} 73.4 30Z" fill="${pal.ink}"/>`;
  // Œil (cerné de clair, comme le lynx), truffe, bouche, vibrisses.
  const [ex, ey] = m([[47, 77]])[0];
  s += `<path d="${C([[38, 76], [44, 71], [52, 70], [57, 74], [50, 73], [44, 74]], true)}" fill="${pal.belly}" opacity="0.9"/>`;
  if (asleep) s += line(`M${f(ex - 6)} ${f(ey - 1)} Q${f(ex)} ${f(ey + 3)} ${f(ex + 6)} ${f(ey - 0.5)}`, 1.4) + line(`M${f(ex - 3)} ${f(ey + 1.6)} l-1 2 M${f(ex)} ${f(ey + 2.2)} l0 2 M${f(ex + 3)} ${f(ey + 1.6)} l1 2`, 0.6);
  else s += eyeA(ex, ey, 5.6 + young * 0.8, pal.eye, { angle: -8, open: 0.42 + young * 0.08 });
  s += line(C([[53, 79], [56, 82], [58, 86], [58, 90]]), 0.9, pal.ink);
  const [nx, ny] = m([[25, 88]])[0];
  s += ink(`M${f(nx - 2)} ${f(ny - 2)} C${f(nx)} ${f(ny - 4)} ${f(nx + 5)} ${f(ny - 4)} ${f(nx + 6)} ${f(ny - 1)} C${f(nx + 5)} ${f(ny + 2)} ${f(nx + 2)} ${f(ny + 4)} ${f(nx)} ${f(ny + 3)} Z`, pal.ink, 0.6);
  s += line(C([[27, 94], [31, 97], [37, 98], [44, 97]]), 1);
  const [wx, wy] = m([[34, 93]])[0];
  s += line(`M${f(wx)} ${f(wy - 1)} C${f(wx - 10)} ${f(wy - 3)} ${f(wx - 20)} ${f(wy - 2)} ${f(wx - 28)} ${f(wy + 1)} M${f(wx)} ${f(wy + 1)} C${f(wx - 10)} ${f(wy + 2)} ${f(wx - 18)} ${f(wy + 5)} ${f(wx - 24)} ${f(wy + 9)} M${f(wx + 2)} ${f(wy)} C${f(wx - 6)} ${f(wy - 1)} ${f(wx - 14)} ${f(wy - 5)} ${f(wx - 20)} ${f(wy - 7)}`, 0.5, '#FFF6D8', ' opacity="0.75"');
  s += rim(C([[30, 80], [40, 70], [54, 61], [68, 57], [76, 57], [86, 62]]), pal.glow, 1.1);
  return s;
}

/** Lynx debout de profil (adulte / sub-adulte). Sol à y = 205. */
function standing(c: DrawCtx, id: string, o: { headRot: number; tuft: number; ruff: number; gold: boolean; young: number }): string {
  const { pal } = c;
  let s = '';
  // Pattes lointaines (en retrait, plus sombres).
  const farFore = cr([[98, 130], [114, 132], [112, 160], [108, 188], [111, 198], [110, 205], [90, 205, 1], [90, 199], [97, 192], [100, 162]], true);
  const farHind = cr([[140, 120], [162, 116], [168, 140], [162, 160], [160, 180], [163, 197], [162, 205], [141, 205, 1], [142, 199], [149, 192], [150, 172], [146, 150]], true);
  s += ink(farFore, pal.shade, 1.4) + ink(farHind, pal.shade, 1.4);
  s += shadow(farFore, pal.deep, 0.45, 'fine') + shadow(farHind, pal.deep, 0.45, 'fine');
  // Queue courte à bout noir.
  const tail = cr([[176, 102], [190, 94], [202, 92], [206, 100], [198, 108], [184, 112]], true);
  s += ink(tail, pal.body, 1.5) + clip(`${id}-tl`, tail, `<rect x="196" y="85" width="20" height="30" fill="${pal.ink}"/>` + fur(c, 188, 104, 7, 10, 4, 6, pal.ink, 0.6));
  // Corps : poitrail profond, ventre rentré, croupe plus haute.
  const body = cr([[90, 92], [118, 102], [146, 100], [170, 96], [184, 104], [192, 122], [188, 142], [176, 150], [156, 146], [132, 150], [108, 160], [84, 158], [68, 140], [62, 116], [66, 96], [76, 86]], true);
  s += ink(body, pal.body, 1.8);
  s += clip(`${id}-bd`, body,
    shadow(cr([[60, 146], [100, 148], [140, 140], [190, 132], [200, 170], [60, 170]], true), pal.shade, 0.85, 'fine')
    + shadow(cr([[150, 150], [180, 140], [196, 120], [200, 160]], true), pal.deep, 0.5, 'xhatch')
    + `<path d="${cr([[62, 112], [76, 118], [86, 138], [84, 160], [62, 150]], true)}" fill="${pal.belly}" opacity="0.85"/>`
    + spots(c, 140, 124, 40, 18, 22, pal.ink, 0.45)
    + fur(c, 120, 152, 7, 95, 8, 30, pal.ink, 0.6) + fur(c, 76, 146, 7, 110, 5, 10, pal.ink, 0.6)
    + fur(c, 150, 102, 6, -80, 6, 26, pal.ink, 0.5)
    + contour([[70, 158], [100, 160], [130, 150], [156, 146], [182, 150]], 0, -2.4, 6, 0.6, pal.ink, 0.7));
  // Pattes proches (larges pattes « raquettes »).
  const hind = cr([[146, 112], [170, 104], [190, 118], [194, 140], [186, 158], [180, 172], [184, 184], [185, 198], [184, 205], [160, 205, 1], [160, 199], [167, 192], [168, 176], [162, 160], [150, 148], [142, 130]], true);
  s += ink(hind, pal.body, 1.1);
  s += clip(`${id}-hl`, hind, shadow(cr([[150, 150], [170, 160], [194, 150], [194, 210], [170, 210]], true), pal.shade, 0.85, 'fine')
    + shadow(cr([[176, 106], [200, 118], [196, 160], [186, 150], [184, 126]], true), pal.shade, 0.7, 'fine')
    + spots(c, 166, 132, 16, 16, 9, pal.ink, 0.5) + fur(c, 160, 150, 7, 120, 4, 10, pal.ink, 0.6)
    + contour([[176, 104], [192, 122], [194, 142], [186, 160]], -2.3, 0, 6, 0.6, pal.ink, 0.7)
    + contour([[162, 162], [168, 178], [168, 192], [166, 206]], 2.2, 0, 4, 0.6, pal.ink, 0.6));
  s += line(cr([[170, 104], [190, 118], [194, 140], [186, 158], [180, 172], [184, 184], [185, 198], [184, 205]]), 1.7);
  s += line('M150 146 C160 140 172 140 184 150', 0.9, pal.ink, ' opacity="0.6"');
  const fore = cr([[72, 118], [96, 120], [98, 140], [92, 160], [88, 180], [89, 196], [92, 205], [64, 205, 1], [64, 199], [72, 193], [74, 176], [74, 154], [70, 136]], true);
  s += ink(fore, pal.body, 1.7);
  s += clip(`${id}-fl`, fore, shadow(cr([[86, 120], [104, 124], [100, 210], [84, 210], [90, 160]], true), pal.shade, 0.8, 'fine')
    + spots(c, 84, 150, 8, 18, 6, pal.ink, 0.5) + contour([[96, 122], [98, 140], [92, 160], [88, 182], [90, 206]], -2.2, 0, 5, 0.6, pal.ink, 0.7));
  s += line('M70 205 L71 200 M77 205 L78 199 M84 205 L84 200 M166 205 L167 200 M173 205 L174 199', 0.8);
  s += rim('M94 97 C118 104 146 100 170 96 C180 98 186 104 190 114', pal.glow, 1.2);
  if (o.gold) {
    s += gild('M108 116 C116 108 128 110 130 120 C132 130 120 134 116 126 C113 120 120 116 124 120', 1.1);
    s += constellation([[136, 122], [148, 116], [160, 126], [172, 118], [180, 128]], pal.gold);
    s += gild('M170 112 l3 -3 l3 3 l-3 3 Z', 0.9);
  }
  // Tête (pivot à la nuque).
  s += `<g transform="translate(-14 2) rotate(${o.headRot} 92 80)">${head(c, id, o.tuft, o.ruff, o.young)}</g>`;
  return s;
}

/** Chaton endormi, enroulé dans un creux de neige, menton posé sur les pattes. */
function sleeper(c: DrawCtx, id: string): string {
  const { pal } = c;
  let s = `<ellipse cx="108" cy="206" rx="72" ry="9" fill="#000" opacity="0.3"/>`;
  const body = cr([[66, 182], [80, 164], [106, 152], [136, 150], [158, 160], [168, 178], [160, 196], [136, 204], [100, 206], [74, 200]], true);
  s += ink(body, pal.body, 1.7);
  s += clip(`${id}-bd`, body,
    shadow(cr([[60, 190], [110, 196], [170, 180], [172, 212], [60, 212]], true), pal.shade, 0.85, 'fine')
    + shadow(cr([[140, 150], [174, 170], [170, 206], [150, 200], [156, 176]], true), pal.shade, 0.6, 'fine')
    + spots(c, 120, 172, 36, 16, 26, pal.ink, 0.5)
    + fur(c, 112, 154, 6, -95, 10, 40, pal.ink, 0.5) + fur(c, 160, 180, 6, 10, 4, 16, pal.ink, 0.5)
    + contour([[120, 158], [146, 160], [158, 176], [152, 196]], -2.4, 0, 5, 0.6, pal.ink, 0.7));
  s += line('M116 158 C146 154 162 174 152 198', 1, pal.ink, ' opacity="0.8"');
  s += rim(cr([[72, 172], [86, 160], [106, 152], [136, 150], [156, 158]]), pal.glow, 1.3);
  // Pattes avant allongées sous le menton.
  for (const dy of [0, 5]) s += ink(cr([[82, 194 + dy], [60, 194 + dy], [46, 197 + dy], [44, 202 + dy], [50, 205 + dy], [82, 204 + dy]], true), dy ? pal.light : pal.body, 1.3);
  s += line('M48 205 l3 -3 M53 206 l2 -4 M48 210 l3 -3 M53 211 l2 -4', 0.7);
  // Queue enroulée devant le corps, bout noir.
  const tail = cr([[150, 190], [166, 194], [162, 204], [136, 210], [104, 212], [84, 210], [80, 204], [104, 205], [136, 200]], true);
  s += ink(tail, pal.body, 1.5) + clip(`${id}-tl`, tail, `<rect x="70" y="196" width="20" height="20" fill="${pal.ink}"/>` + shadow('M80 207 L166 200 L166 216 L80 216Z', pal.shade, 0.7, 'fine') + spots(c, 126, 205, 22, 3, 6, pal.ink, 0.5));
  // Tête posée, yeux clos.
  s += `<g transform="translate(94 172) rotate(-14) scale(0.98) translate(-92 -78)">${head(c, id, 4, 0.15, 1, true)}</g>`;
  // Flocons accrochés au pelage.
  for (const [x, y] of [[112, 156], [134, 154], [146, 166], [96, 162]] as const) s += sparkle(x, y, 1.6, '#FFF6D8', false);
  return s;
}

export const lynxaure: Species = (c) => {
  const { pal, stage } = c;
  const id = `lynxaure-${stage}`;
  if (stage === 0) {
    return `<g transform="translate(114 200) scale(1.12) translate(-104 -196)">${sleeper(c, id)}</g>`;
  }
  if (stage === 1) {
    // Sub-adulte en maraude sur un lac gelé, tête basse, reflété dans la glace.
    let g = '';
    g += curtain(c, `${id}-a1`, [[86, 100], [110, 90], [138, 88], [164, 78], [188, 62]], 46, [pal.accent, pal.accent2, pal.glow]);
    g += curtain(c, `${id}-a2`, [[96, 108], [124, 102], [150, 100], [176, 92], [196, 80]], 30, [pal.glow, pal.accent, pal.accent2], 0.8);
    g += standing(c, id, { headRot: -16, tuft: 10, ruff: 0.5, gold: false, young: 0.3 });
    const refl = `<g transform="translate(0 410) scale(1 -1)" opacity="0.2">${g}</g>`;
    return `<g transform="translate(111 192) scale(0.84) translate(-121 -206)">${refl}${ground(130, 206, 80)}${g}</g>`;
  }
  // Adulte majestueux : au sommet, poitrail levé, grande crinière d'aurore en rideaux.
  const cols: [string, string, string] = [pal.accent, pal.accent2, pal.glow];
  let g = '';
  g += curtain(c, `${id}-a1`, [[66, 82], [100, 84], [134, 78], [164, 64], [186, 42], [196, 18], [190, 0]], 64, cols);
  g += curtain(c, `${id}-a2`, [[86, 94], [118, 96], [150, 92], [180, 84], [204, 70], [220, 50]], 44, [pal.glow, pal.accent, pal.accent2], 0.9);
  g += curtain(c, `${id}-a3`, [[104, 104], [134, 104], [164, 100], [192, 98], [218, 92]], 26, [pal.accent2, pal.glow, pal.accent], 0.7);
  const rock = cr([[22, 240], [30, 206], [50, 190, 1], [92, 186], [128, 196], [168, 202], [200, 204], [214, 212, 1], [222, 240]], true);
  g += ink(rock, pal.deep, 1.6) + clip(`${id}-rk`, rock, shadow(cr([[110, 200], [224, 200], [224, 244], [90, 244]], true), pal.ink, 0.5, 'xhatch')
    + shadow(cr([[22, 220], [60, 214], [90, 230], [60, 244], [20, 244]], true), pal.ink, 0.35, 'fine')
    + line('M58 196 L70 212 L66 236 M118 198 L126 214 L150 220 M176 206 L186 226', 0.9, pal.ink, ' opacity="0.85"')
    + rim('M34 204 C42 196 52 190 92 186 C110 188 120 192 128 196', '#FFD9A8', 1.3));
  g += `<ellipse cx="128" cy="200" rx="60" ry="6" fill="#000" opacity="0.3" transform="rotate(-7 176 205)"/>`;
  g += `<g transform="rotate(-7 176 205)">${standing(c, id, { headRot: -12, tuft: 16, ruff: 1, gold: true, young: 0 })}</g>`;
  if (stage >= 3) g += constellation([[18, 30], [34, 18], [48, 30], [42, 46]], pal.gold);
  return `<g transform="translate(111 206) scale(0.94) translate(-112 -206)">${g}</g>`;
};

/* ---------- Décors : la taïga boréale ---------- */

const grad = (id: string, stops: [number, string][]) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">${stops.map(([o, col]) => `<stop offset="${o}" stop-color="${col}"/>`).join('')}</linearGradient>`;

function stars(c: DrawCtx, b: Bounds, n: number, ymax: number, op = 0.85): string {
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = b.x0 + c.r() * (b.x1 - b.x0), y = b.y0 + c.r() * (ymax - b.y0), r = 0.3 + c.r() * c.r() * 1.3;
    s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="#FFF6D8" opacity="${f(op * (0.4 + c.r() * 0.6))}"/>`;
  }
  return s;
}

/** Crête de montagnes / collines : ligne brisée aléatoire fermée jusqu'au bas de la fenêtre. */
function ridge(c: DrawCtx, b: Bounds, y: number, amp: number, n: number, fill: string, extra = ''): string {
  const q: Pt[] = [];
  for (let i = 0; i <= n; i++) q.push([b.x0 - 10 + ((b.x1 - b.x0 + 20) * i) / n, y - c.r() * amp, i % 2]);
  const d = cr(q) + ` L${b.x1 + 10} ${b.y1 + 10} L${b.x0 - 10} ${b.y1 + 10}Z`;
  return `<path d="${d}" fill="${fill}"${extra}/>`;
}

/** Sapin : étages dentelés, neige sur les branches. */
function fir(x: number, y: number, h: number, fill: string, snow: string, w = 0.36): string {
  let d = `M${f(x)} ${f(y - h)}`;
  const tiers = 6;
  for (let k = 1; k <= tiers; k++) {
    const ty = y - h + (h * 0.92 * k) / tiers, tw = h * w * (0.25 + 0.75 * (k / tiers));
    d += ` L${f(x + tw)} ${f(ty)} L${f(x + tw * 0.45)} ${f(ty - h * 0.03)}`;
  }
  d += ` L${f(x + 2)} ${f(y)} L${f(x - 2)} ${f(y)}`;
  for (let k = tiers; k >= 1; k--) {
    const ty = y - h + (h * 0.92 * k) / tiers, tw = h * w * (0.25 + 0.75 * (k / tiers));
    d += ` L${f(x - tw * 0.45)} ${f(ty - h * 0.03)} L${f(x - tw)} ${f(ty)}`;
  }
  d += 'Z';
  let sn = '';
  for (let k = 1; k <= tiers; k++) {
    const ty = y - h + (h * 0.92 * k) / tiers, tw = h * w * (0.25 + 0.75 * (k / tiers));
    sn += `M${f(x - tw * 0.7)} ${f(ty - h * 0.02)} Q${f(x - tw * 0.3)} ${f(ty - h * 0.06)} ${f(x + tw * 0.1)} ${f(ty - h * 0.05)} `;
  }
  return `<path d="${d}" fill="${fill}" stroke="#140F24" stroke-width="0.6" stroke-linejoin="round"/>`
    + `<path d="${sn}" fill="none" stroke="${snow}" stroke-width="${f(0.6 + h * 0.008)}" stroke-linecap="round" opacity="0.85"/>`;
}

lynxaure.scene = (c: DrawCtx, b: Bounds): string => {
  const { stage, pal } = c;
  const id = `lynxaure-${stage}-bg`;
  const B = 222 + (c.hue - 200) * 0.12;
  const W = b.x1 - b.x0;
  let s = '';
  if (stage === 0) {
    // Clairière enneigée sous la lune, au pied d'un grand sapin.
    s += `<defs>${grad(`${id}-sky`, [[0, hsl(B, 50, 8)], [0.7, hsl(B, 38, 20)], [1, hsl(B, 30, 28)]])}</defs>`;
    s += `<rect x="${b.x0}" y="${b.y0}" width="${W}" height="${b.y1 - b.y0}" fill="url(#${id}-sky)"/>`;
    s += stars(c, b, 60, 120);
    s += `<circle cx="58" cy="44" r="34" fill="#FFF6D8" opacity="0.18" filter="url(#soft)"/><circle cx="58" cy="44" r="14" fill="#F4EBD0"/>`
      + `<path d="M52 36 a4 4 0 1 0 1 0 M62 50 a3 3 0 1 0 1 0" fill="${hsl(B, 15, 80)}"/>` + `<circle cx="58" cy="44" r="14" fill="none" stroke="#140F24" stroke-width="0.8"/>`;
    s += ridge(c, b, 132, 18, 8, hsl(B, 22, 34));
    for (let i = 0; i < 12; i++) s += fir(b.x0 + 8 + i * (W / 11) + c.r() * 8, 150 + c.r() * 6, 34 + c.r() * 22, hsl(B, 26, 24), hsl(B, 20, 62));
    s += ridge(c, b, 162, 8, 6, hsl(B, 18, 46));
    for (const [x, h] of [[24, 120], [176, 150], [212, 110]] as const) s += fir(x, 190, h, hsl(B, 34, 13), hsl(B, 25, 70), 0.34);
    const snow = cr([[b.x0 - 10, 186], [40, 178], [90, 182], [150, 176], [200, 184], [b.x1 + 10, 180]]) + ` L${b.x1 + 10} ${b.y1 + 10} L${b.x0 - 10} ${b.y1 + 10}Z`;
    s += `<path d="${snow}" fill="${hsl(B, 22, 62)}" stroke="#140F24" stroke-width="0.8"/>`;
    s += clip(`${id}-sn`, snow, shadow('M-20 214 C60 200 160 204 250 214 L250 340 L-20 340Z', hsl(B, 30, 40), 0.6, 'fine')
      + `<ellipse cx="108" cy="208" rx="86" ry="16" fill="${hsl(B, 30, 38)}" opacity="0.7"/><path d="M22 206 C60 196 160 196 196 206" fill="none" stroke="#140F24" stroke-width="0.6" opacity="0.5"/>`);
    s += rim(cr([[b.x0 - 10, 186], [40, 178], [90, 182], [150, 176], [200, 184]]), '#FFF6D8', 1);
    for (let i = 0; i < 26; i++) s += `<circle cx="${f(b.x0 + c.r() * W)}" cy="${f(b.y0 + c.r() * (b.y1 - b.y0))}" r="${f(0.6 + c.r() * 1.1)}" fill="#FFFFFF" opacity="0.7"/>`;
    return s;
  }
  if (stage === 1) {
    // Lac gelé sous les aurores, montagnes au loin.
    s += `<defs>${grad(`${id}-sky`, [[0, hsl(B + 10, 55, 7)], [1, hsl(B - 10, 40, 22)]])}${grad(`${id}-ice`, [[0, hsl(B - 10, 30, 36)], [1, hsl(B, 34, 16)]])}</defs>`;
    s += `<rect x="${b.x0}" y="${b.y0}" width="${W}" height="${b.y1 - b.y0}" fill="url(#${id}-sky)"/>`;
    s += stars(c, b, 70, 130);
    s += `<g opacity="0.45">${curtain(c, `${id}-au1`, [[b.x0 - 10, 70], [40, 56], [100, 66], [160, 48], [b.x1 + 10, 58]], 50, [pal.accent, pal.accent2, pal.glow], 0.6)}</g>`;
    s += `<g opacity="0.35">${curtain(c, `${id}-au2`, [[b.x0 - 10, 104], [60, 92], [130, 100], [b.x1 + 10, 86]], 34, [pal.glow, pal.accent, pal.accent2], 0.5)}</g>`;
    s += ridge(c, b, 128, 34, 7, hsl(B, 18, 40));
    s += clip(`${id}-mt`, `M${b.x0 - 10} 90 H${b.x1 + 10} V128 H${b.x0 - 10}Z`, ridge(c, b, 120, 30, 7, hsl(B, 20, 70), ' opacity="0.25"'));
    for (let i = 0; i < 18; i++) s += fir(b.x0 + 4 + i * (W / 17) + c.r() * 5, 146, 14 + c.r() * 12, hsl(B, 30, 16), hsl(B, 20, 55));
    s += `<rect x="${b.x0}" y="146" width="${W}" height="${b.y1 - 146}" fill="url(#${id}-ice)"/>`;
    s += `<ellipse cx="90" cy="168" rx="90" ry="10" fill="${pal.accent}" opacity="0.22" filter="url(#soft)"/>`;
    s += contour([[b.x0, 156], [80, 155], [160, 157], [b.x1, 155]], 0, 7, 9, 0.5, '#FFF6D8', 0.35);
    s += line('M20 196 l18 6 l10 -3 M150 214 l22 4 l14 -6 M70 226 l26 -2', 0.7, '#FFF6D8', ' opacity="0.5"');
    s += rim(`M${b.x0} 146 H${b.x1}`, '#FFF6D8', 0.7);
    return s;
  }
  // Sommet au-dessus d'une mer de nuages, à l'aube.
  s += `<defs>${grad(`${id}-sky`, [[0, hsl(B + 20, 50, 9)], [0.45, hsl(B + 50, 35, 26)], [0.75, hsl(20, 55, 55)], [1, hsl(40, 70, 72)]])}</defs>`;
  s += `<rect x="${b.x0}" y="${b.y0}" width="${W}" height="${b.y1 - b.y0}" fill="url(#${id}-sky)"/>`;
  s += stars(c, b, 50, 90, 0.7);
  s += `<circle cx="150" cy="168" r="60" fill="#FFE2B0" opacity="0.45" filter="url(#soft)"/>`;
  s += ridge(c, b, 150, 40, 6, hsl(B + 40, 20, 48), ' opacity="0.9"');
  s += ridge(c, b, 162, 22, 9, hsl(B + 40, 24, 38));
  for (let row = 0; row < 3; row++) {
    const y = 172 + row * 18;
    let d = `M${b.x0 - 10} ${y + 30}`;
    for (let x = b.x0 - 10; x < b.x1 + 20; x += 18 + row * 6) d += ` q${f(9 + row * 3)} ${f(-14 - row * 3)} ${f(18 + row * 6)} 0`;
    d += ` L${b.x1 + 20} ${b.y1 + 10} L${b.x0 - 10} ${b.y1 + 10}Z`;
    s += `<path d="${d}" fill="${hsl(B + 50 - row * 10, 22, 70 - row * 10)}" stroke="#140F24" stroke-width="0.6" opacity="${0.85 + row * 0.05}"/>`;
    s += `<path d="${d}" fill="url(#fine)" opacity="${0.25 + row * 0.15}"/>`;
  }
  return s;
};
