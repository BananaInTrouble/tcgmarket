import { constellation, eyeA, fur, gild, ground, ink, line, rim, shadow, sparkle, type DrawCtx, type Species } from './style.ts';

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
function head(c: DrawCtx, id: string, tuft: number, ruff: number, young = 0): string {
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
  s += clip(`${id}-rf`, ruffD, shadow(cr([[90, 80], [104, 96], [100, 140], [80, 140], [86, 104]], true), pal.shade, 0.75, 'fine')
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
  s += eyeA(ex, ey, 5.6 + young * 0.8, pal.eye, { angle: -8, open: 0.42 + young * 0.08 });
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
    + fur(c, 150, 102, 6, -80, 6, 26, pal.ink, 0.5));
  // Pattes proches (larges pattes « raquettes »).
  const hind = cr([[146, 112], [170, 104], [190, 118], [194, 140], [186, 158], [180, 172], [184, 184], [185, 198], [184, 205], [160, 205, 1], [160, 199], [167, 192], [168, 176], [162, 160], [150, 148], [142, 130]], true);
  s += ink(hind, pal.body, 1.1);
  s += clip(`${id}-hl`, hind, shadow(cr([[150, 150], [170, 160], [194, 150], [194, 210], [170, 210]], true), pal.shade, 0.85, 'fine')
    + shadow(cr([[176, 106], [200, 118], [196, 160], [186, 150], [184, 126]], true), pal.shade, 0.7, 'fine')
    + spots(c, 166, 132, 16, 16, 9, pal.ink, 0.5) + fur(c, 160, 150, 7, 120, 4, 10, pal.ink, 0.6));
  s += line(cr([[170, 104], [190, 118], [194, 140], [186, 158], [180, 172], [184, 184], [185, 198], [184, 205]]), 1.7);
  s += line('M150 146 C160 140 172 140 184 150', 0.9, pal.ink, ' opacity="0.6"');
  const fore = cr([[72, 118], [96, 120], [98, 140], [92, 160], [88, 180], [89, 196], [92, 205], [64, 205, 1], [64, 199], [72, 193], [74, 176], [74, 154], [70, 136]], true);
  s += ink(fore, pal.body, 1.7);
  s += clip(`${id}-fl`, fore, shadow(cr([[86, 120], [104, 124], [100, 210], [84, 210], [90, 160]], true), pal.shade, 0.8, 'fine')
    + spots(c, 84, 150, 8, 18, 6, pal.ink, 0.5));
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

/** Chaton assis de profil. */
function kitten(c: DrawCtx, id: string): string {
  const { pal } = c;
  let s = '';
  const tail = cr([[150, 196], [168, 190], [180, 192], [180, 200], [166, 204], [150, 205]], true);
  s += ink(tail, pal.body, 1.5) + clip(`${id}-tl`, tail, `<rect x="172" y="184" width="20" height="24" fill="${pal.ink}"/>`);
  const farFore = cr([[96, 140], [110, 142], [110, 176], [110, 196], [112, 205], [94, 205, 1], [94, 199], [100, 194], [100, 170]], true);
  s += ink(farFore, pal.shade, 1.3) + shadow(farFore, pal.deep, 0.4, 'fine');
  // Corps assis, pelage duveteux.
  const body = cr([[98, 98], [122, 108], [142, 130], [158, 158], [164, 186], [158, 202], [142, 206], [116, 206], [100, 196], [86, 168], [80, 140], [80, 116]], true);
  s += ink(body, pal.body, 1.8);
  s += clip(`${id}-bd`, body,
    shadow(cr([[132, 120], [168, 150], [168, 210], [120, 210], [146, 180]], true), pal.shade, 0.85, 'fine')
    + shadow(cr([[140, 170], [170, 180], [160, 210], [130, 210]], true), pal.deep, 0.45, 'xhatch')
    + `<path d="${cr([[80, 118], [94, 124], [100, 146], [98, 176], [84, 172]], true)}" fill="${pal.belly}" opacity="0.9"/>`
    + spots(c, 128, 152, 24, 30, 24, pal.ink, 0.55)
    + fur(c, 84, 150, 8, 170, 5, 30, pal.ink, 0.6) + fur(c, 156, 160, 8, 20, 5, 34, pal.ink, 0.55));
  // Duvet du poitrail qui dépasse.
  s += line('M80 128 l-4 3 l4 2 M80 140 l-5 2 l5 3 M82 152 l-4 3 l4 2', 0.9, pal.ink, ' opacity="0.8"');
  s += line('M120 150 C146 150 160 172 156 196', 1.1, pal.ink, ' opacity="0.8"');
  const hp = cr([[112, 206], [116, 196], [132, 192], [146, 196], [148, 205]], true);
  s += ink(hp, pal.light, 1.3) + line('M124 205 L125 199 M132 205 L133 198 M140 205 L140 199', 0.8);
  const fore = cr([[80, 128], [98, 132], [98, 160], [96, 190], [99, 205], [68, 205, 1], [68, 197], [77, 190], [80, 160]], true);
  s += ink(fore, pal.body, 1.7);
  s += clip(`${id}-fl`, fore, shadow(cr([[90, 130], [104, 130], [104, 210], [90, 210]], true), pal.shade, 0.7, 'fine') + spots(c, 88, 160, 6, 18, 5, pal.ink, 0.5));
  s += line('M75 205 L76 199 M82 205 L83 199 M89 205 L89 199', 0.8);
  s += rim('M104 100 C122 108 140 128 156 156', pal.glow, 1.2);
  // Premier voile d'aurore, à peine une lueur au-dessus de la nuque.
  s += curtain(c, `${id}-au`, [[96, 104], [112, 98], [130, 98], [148, 92], [160, 82]], 26, [pal.accent, pal.accent2, pal.glow], 0.7);
  s += `<g transform="translate(8 20) rotate(2 92 80) translate(92 80) scale(1.06) translate(-92 -80)">${head(c, id, 4, 0.1, 1)}</g>`;
  return s;
}

export const lynxaure: Species = (c) => {
  const { pal, stage } = c;
  const id = `lynxaure-${stage}`;
  if (stage === 0) {
    return `<g transform="translate(111 206) scale(1.08) translate(-118 -206)">${ground(124, 206, 62)}${kitten(c, id)}</g>`;
  }
  if (stage === 1) {
    // Sub-adulte : haut sur pattes, la collerette s'effiloche en deux voiles d'aurore.
    let g = ground(130, 206, 80);
    g += curtain(c, `${id}-a1`, [[86, 100], [110, 90], [138, 88], [164, 78], [188, 62]], 46, [pal.accent, pal.accent2, pal.glow]);
    g += curtain(c, `${id}-a2`, [[96, 108], [124, 102], [150, 100], [176, 92], [196, 80]], 30, [pal.glow, pal.accent, pal.accent2], 0.8);
    g += standing(c, id, { headRot: 2, tuft: 10, ruff: 0.5, gold: false, young: 0.3 });
    return `<g transform="translate(111 206) scale(0.98) translate(-126 -206)">${g}</g>`;
  }
  // Adulte majestueux : posé sur un éperon rocheux, poitrail levé, grande crinière d'aurore en rideaux.
  const cols: [string, string, string] = [pal.accent, pal.accent2, pal.glow];
  let g = '';
  g += curtain(c, `${id}-a1`, [[80, 88], [104, 84], [132, 78], [160, 66], [184, 44], [202, 14]], 62, cols);
  g += curtain(c, `${id}-a2`, [[90, 98], [118, 96], [146, 90], [174, 78], [198, 58], [214, 36]], 46, [pal.glow, pal.accent, pal.accent2], 0.9);
  g += curtain(c, `${id}-a3`, [[108, 104], [136, 102], [164, 96], [190, 86], [212, 70]], 30, [pal.accent2, pal.glow, pal.accent], 0.7);
  // Éperon rocheux gravé, plus haut à l'avant.
  const rock = cr([[22, 240], [30, 206], [50, 190, 1], [92, 186], [128, 196], [168, 202], [200, 204], [214, 212, 1], [222, 240]], true);
  g += ink(rock, pal.deep, 1.6) + clip(`${id}-rk`, rock, shadow(cr([[110, 200], [224, 200], [224, 244], [90, 244]], true), pal.ink, 0.5, 'xhatch')
    + shadow(cr([[22, 220], [60, 214], [90, 230], [60, 244], [20, 244]], true), pal.ink, 0.35, 'fine')
    + line('M58 196 L70 212 L66 236 M118 198 L126 214 L150 220 M176 206 L186 226', 0.9, pal.ink, ' opacity="0.85"')
    + rim('M34 204 C42 196 52 190 92 186 C110 188 120 192 128 196', pal.light, 1.1));
  const lynx = standing(c, id, { headRot: -12, tuft: 16, ruff: 1, gold: true, young: 0 });
  g += `<g transform="rotate(-7 176 205)">${lynx}</g>`;
  if (stage >= 3) g += constellation([[18, 30], [34, 18], [48, 30], [42, 46]], pal.gold);
  return `<g transform="translate(111 206) scale(0.94) translate(-112 -206)">${g}</g>`;
};
