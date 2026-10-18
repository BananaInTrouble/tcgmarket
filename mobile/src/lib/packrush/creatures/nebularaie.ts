import { constellation, eyeA, gild, hsl, ink, line, rim, shadow, sparkle, speckles, type Bounds, type DrawCtx, type Species } from './style.ts';
import { band, f, grad, spline, starfish, tube, type Pt } from './legendkit.ts';

/**
 * Nébularaie : raie manta géante vue de dessus, en virage lent. Ses nageoires pectorales sont des fenêtres sur une
 * nébuleuse ; un filigrane d'or Art nouveau court le long du bord d'attaque. Planche « bestiaire céleste ».
 */
export const nebularaie: Species = (c) => {
  const { pal } = c;
  const id = `nebularaie-${c.stage}`;
  // Moitié gauche, miroir pour la droite (x → 222 - x).
  const Lp = (x: number, y: number) => `${f(x)} ${f(y)}`;
  const Rp = (x: number, y: number) => `${f(222 - x)} ${f(y)}`;
  type M = (x: number, y: number) => string;
  const half = (Q: M) =>
    `C${Q(100, 64)} ${Q(94, 63)} ${Q(88, 61)}`
    + ` C${Q(64, 54)} ${Q(38, 62)} ${Q(20, 82)} C${Q(12, 92)} ${Q(6, 104)} ${Q(2, 118)}`
    + ` C${Q(22, 122)} ${Q(44, 132)} ${Q(62, 144)} C${Q(78, 154)} ${Q(92, 164)} ${Q(102, 168)} C${Q(105, 170)} ${Q(108, 171)} ${Q(111, 171)}`;
  const rev = (Q: M) =>
    `C${Q(108, 171)} ${Q(105, 170)} ${Q(102, 168)} C${Q(92, 164)} ${Q(78, 154)} ${Q(62, 144)} C${Q(44, 132)} ${Q(22, 122)} ${Q(2, 118)}`
    + ` C${Q(6, 104)} ${Q(12, 92)} ${Q(20, 82)} C${Q(38, 62)} ${Q(64, 54)} ${Q(88, 61)} C${Q(94, 63)} ${Q(100, 64)} ${Q(111, 65)}`;
  const outline = `M${Lp(111, 65)} ${half(Lp)} ${rev(Rp)} Z`;

  // Torse central (relief) : de la tête à la base de la queue.
  const torso = `M111 64 C100 64 92 70 91 84 C90 104 96 130 102 150 C105 160 108 166 111 169 C114 166 117 160 120 150 C126 130 132 104 131 84 C130 70 122 64 111 64 Z`;

  // Queue-fouet : longue, fine, ondulée, terminée en étoile filante.
  const tailPath = spline([[111, 166], [113, 186], [122, 204], [140, 216], [160, 222], [178, 230]], 8);
  const tail = tube(tailPath, (u) => 2.6 * (1 - u) + 0.3);

  let s = '';
  s += `<defs><clipPath id="${id}-w"><path d="${outline}"/></clipPath></defs>`;
  s += `<ellipse cx="111" cy="112" rx="100" ry="46" fill="${pal.glow}" opacity="0.18" filter="url(#soft)"/>`;

  // Queue derrière le corps.
  s += ink(tail, pal.shade, 1.1);
  s += `<circle cx="179" cy="230" r="7" fill="${pal.glow}" opacity="0.6" filter="url(#soft)"/>` + sparkle(179, 230, 4, '#FFF6D8', false);

  // Ailes : nébuleuse intérieure (clip).
  let neb = `<path d="${outline}" fill="${pal.deep}"/>`;
  for (const [x, y, rx, ry, col, op] of [
    [44, 104, 34, 14, pal.accent, 0.75], [178, 104, 34, 14, pal.accent2, 0.7],
    [70, 124, 26, 12, pal.accent2, 0.6], [152, 124, 26, 12, pal.accent, 0.6],
    [30, 104, 16, 8, '#FFF6D8', 0.8], [192, 104, 16, 8, '#FFF6D8', 0.7], [58, 116, 10, 5, '#FFF6D8', 0.6], [164, 116, 10, 5, '#FFF6D8', 0.55],
    [60, 92, 20, 8, pal.glow, 0.55], [162, 92, 20, 8, pal.glow, 0.55],
    [111, 150, 30, 12, pal.body, 0.5],
  ] as [number, number, number, number, string, number][]) {
    neb += `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${col}" opacity="${op}" filter="url(#soft)"/>`;
  }
  // Rayons de nageoire : lignes fines rayonnant depuis le torse.
  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    const [ox, oy]: Pt = [92 + t * 6, 78 + t * 70];
    const ex = 6 + t * 90, ey = 100 + t * 60;
    neb += `<path d="M${f(ox)} ${f(oy)} Q${f((ox + ex) / 2)} ${f((oy + ey) / 2 - 10)} ${f(ex)} ${f(ey)}" fill="none" stroke="${pal.light}" stroke-width="0.5" opacity="0.35"/>`;
    neb += `<path d="M${f(222 - ox)} ${f(oy)} Q${f(222 - (ox + ex) / 2)} ${f((oy + ey) / 2 - 10)} ${f(222 - ex)} ${f(ey)}" fill="none" stroke="${pal.light}" stroke-width="0.5" opacity="0.35"/>`;
  }
  neb += speckles(c, 52, 108, 44, 18, 22) + speckles(c, 170, 108, 44, 18, 22);
  // Ombre du bord de fuite (hachures fines).
  neb += shadow(`M3 116 C20 112 38 114 52 122 C70 132 84 146 96 160 L111 170 L111 176 L0 176 Z`, pal.deep, 0.55, 'fine');
  neb += shadow(`M219 116 C202 112 184 114 170 122 C152 132 138 146 126 160 L111 170 L111 176 L222 176 Z`, pal.deep, 0.75, 'xhatch');
  s += `<g clip-path="url(#${id}-w)">${neb}</g>`;
  // Pointe gauche relevée par le virage : on aperçoit le ventre pâle.
  s += ink(`M2 118 C6 108 10 98 18 88 C16 100 12 110 2 118 Z`, pal.belly, 1, ' opacity="0.9"');
  s += shadow(`M2 118 C8 112 12 104 15 96 C14 104 10 112 2 118 Z`, pal.light, 0.6, 'fine');
  s += constellation([[30, 106], [48, 100], [64, 108], [74, 122], [62, 130]], pal.gold);
  s += constellation([[192, 106], [176, 98], [160, 104], [150, 118]], '#FFF6D8');

  // Filigrane d'or le long du bord d'attaque (double filet + volutes).
  s += gild(`M86 66 C66 68 44 78 28 92 C20 99 14 106 10 112`, 1.1);
  s += gild(`M136 66 C156 68 178 78 194 92 C202 99 208 106 212 112`, 1.1);
  s += gild(`M80 72 C64 76 50 84 40 92 c-6 5 -4 12 2 10 c4 -2 2 -6 -1 -5`, 0.8);
  s += gild(`M142 72 C158 76 172 84 182 92 c6 5 4 12 -2 10 c-4 -2 -2 -6 1 -5`, 0.8);

  // Torse en relief.
  s += `<path d="${torso}" fill="${pal.body}"/>`;
  s += shadow(`M120 150 C126 130 132 104 131 84 C130 70 122 64 116 64 C124 74 126 96 122 118 C119 134 115 152 111 169 C114 166 117 160 120 150 Z`, pal.shade, 0.85, 'fine');
  s += `<path d="M96 74 C94 90 96 112 102 134" fill="none" stroke="${pal.light}" stroke-width="5" opacity="0.35" stroke-linecap="round"/>`;
  s += line(`M91 84 C90 104 96 130 102 150 C105 160 108 166 111 169`, 0.8, pal.ink, ' opacity="0.55"');
  s += line(`M131 84 C132 104 126 130 120 150 C117 160 114 166 111 169`, 1.1, pal.ink, ' opacity="0.8"');
  // Branchies dorsales suggérées : fines lignes de muscles.
  for (const k of [0, 1, 2]) s += line(`M${96 + k * 2} ${96 + k * 12} q15 ${4} 30 0`, 0.5, pal.ink, ' opacity="0.3"');
  // Arête dorsale et petites dorsale près de la queue.
  s += line(`M111 84 C110 110 110 140 111 160`, 0.9, pal.ink, ' opacity="0.5"');
  s += ink(`M106 158 C108 150 112 146 116 148 C114 154 113 160 112 166 Z`, pal.shade, 1);
  // Marques d'or le long de l'arête.
  s += gild(`M111 98 l-4 8 l4 8 l4 -8 Z`, 0.9) + gild(`M111 118 v24`, 0.8);
  s += `<circle cx="111" cy="106" r="1.6" fill="${pal.gold}"/>`;
  s += rim(`M84 82 C82 100 88 126 98 146`, pal.glow, 1);

  // Lobes céphaliques déroulés vers l'avant.
  for (const sg of [1, -1]) {
    const X = (x: number) => f(sg > 0 ? x : 222 - x);
    const lobe = `M${X(86)} 67 C${X(81)} 57 ${X(80)} 44 ${X(84)} 35 C${X(86)} 30 ${X(93)} 29 ${X(96)} 33 C${X(98)} 37 ${X(95)} 40 ${X(93)} 43 C${X(92)} 52 ${X(95)} 60 ${X(100)} 67 Z`;
    s += ink(lobe, pal.body, 1.3);
    s += shadow(`M${X(93)} 43 C${X(92)} 52 ${X(95)} 60 ${X(100)} 67 L${X(94)} 67 C${X(89)} 60 ${X(87)} 50 ${X(89)} 41 Z`, pal.shade, sg > 0 ? 0.55 : 0.9, 'fine');
    s += line(`M${X(85)} 60 C${X(83)} 52 ${X(83)} 44 ${X(86)} 37`, 0.6, pal.ink, ' opacity="0.5"');
    s += rim(`M${X(84)} 62 C${X(81)} 54 ${X(81)} 44 ${X(84)} 36`, pal.glow, sg > 0 ? 0.9 : 0.4);
  }
  // Bouche (bord frontal), yeux sur les côtés de la tête.
  s += line(`M94 66 C104 70 118 70 128 66`, 1.1);
  s += eyeA(87, 72, 4, pal.eye, { angle: 60, open: 0.55, slit: false }) + eyeA(135, 72, 4, pal.eye, { angle: 120, open: 0.55, slit: false });
  // Diadème : petite étoile au front.
  s += sparkle(111, 74, 3.2, pal.gold, false);
  // Contour final (plus épais à l'extérieur) + lumière de bord.
  s += `<path d="${outline}" fill="none" stroke="${pal.ink}" stroke-width="1.8" stroke-linejoin="round"/>`;
  s += rim(`M84 62 C64 64 40 74 24 88 C16 95 9 104 4 114`, pal.glow, 1.2);
  s += rim(`M138 62 C152 64 168 70 180 76`, pal.glow, 0.9);
  // Étoiles détachées dans le sillage.
  for (const [x, y, z] of [[30, 150, 3], [196, 150, 2.6], [150, 196, 2.2], [52, 46, 2.6]] as const) s += sparkle(x, y, z, pal.glow, false);
  return `<g transform="translate(111 116) rotate(-6) scale(1 1.04) translate(-111 -116)">${s}</g>`;
};

/**
 * Décor : océan cosmique vu entre deux eaux. Surface ondoyante et rais de lumière en haut, étoiles en suspension,
 * banc de poissons-étoiles, petites méduses, et tout en bas un fond de sable gravé planté d'algues lumineuses.
 */
nebularaie.scene = (c: DrawCtx, b: Bounds) => {
  const { pal } = c;
  const id = `nebularaie-${c.stage}-bg`;
  const oh = c.hue * 0.2 + 205 * 0.8;
  const W = b.x1 - b.x0, H = b.y1 - b.y0;
  let s = `<defs>${grad(`${id}-sea`, [[0, hsl(oh - 10, 45, 34)], [0.35, hsl(oh, 50, 20)], [0.75, hsl(oh + 15, 50, 11)], [1, hsl(oh + 25, 45, 7)]])}</defs>`;
  s += `<rect x="${b.x0}" y="${b.y0}" width="${W}" height="${H}" fill="url(#${id}-sea)"/>`;
  // Nébuleuses diffuses dans l'eau.
  s += `<ellipse cx="40" cy="70" rx="60" ry="30" fill="${pal.accent}" opacity="0.14" filter="url(#soft)"/>`;
  s += `<ellipse cx="190" cy="150" rx="50" ry="26" fill="${pal.accent2}" opacity="0.14" filter="url(#soft)"/>`;
  // Rais de lumière depuis la surface.
  for (const [x, w, sk] of [[30, 16, 30], [78, 10, 18], [140, 20, 8], [196, 12, -10]] as const) {
    s += `<path d="M${x} ${b.y0} L${x + w} ${b.y0} L${x + w + sk + 30} ${b.y0 + H * 0.8} L${x + sk - 10} ${b.y0 + H * 0.8} Z" fill="#FFF6D8" opacity="0.06"/>`;
  }
  // Surface : ondulations gravées.
  const sy = b.y0 + 16;
  s += `<path d="M${b.x0} ${b.y0} H${b.x1} V${sy} ${Array.from({ length: 12 }, (_, i) => `Q${f(b.x1 - (i + 0.5) * W / 12)} ${sy + (i % 2 ? 5 : -3)} ${f(b.x1 - (i + 1) * W / 12)} ${sy}`).join(' ')} Z" fill="${hsl(oh - 15, 40, 46)}" opacity="0.55"/>`;
  for (let k = 0; k < 3; k++) {
    const y = sy + 6 + k * 7;
    s += `<path d="M${b.x0} ${y} ${Array.from({ length: 9 }, (_, i) => `q${f(W / 18)} ${k % 2 ? 3 : -3} ${f(W / 9)} 0`).join(' ')}" fill="none" stroke="#FFF6D8" stroke-width="0.5" opacity="${0.3 - k * 0.08}"/>`;
  }
  // Étoiles en suspension et bulles.
  for (let i = 0; i < 40; i++) {
    s += `<circle cx="${f(b.x0 + c.r() * W)}" cy="${f(sy + c.r() * (200 - sy))}" r="${f(0.3 + c.r() * 0.9)}" fill="#FFF6D8" opacity="${f(0.3 + c.r() * 0.5)}"/>`;
  }
  for (const [x, y, r] of [[18, 150, 2.2], [22, 138, 1.4], [16, 128, 1], [204, 70, 1.8], [208, 60, 1.2]] as const) {
    s += `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="#FFF6D8" stroke-width="0.5" opacity="0.6"/>`;
  }
  // Petites méduses lointaines.
  for (const [x, y, k] of [[196, 40, 1], [178, 58, 0.7], [26, 186, 0.8]] as const) {
    s += `<g transform="translate(${x} ${y}) scale(${k})" opacity="0.75"><path d="M-7 0 C-7 -8 7 -8 7 0 C4 1.5 -4 1.5 -7 0 Z" fill="${pal.accent2}" opacity="0.5" stroke="#FFF6D8" stroke-width="0.5"/>`
      + `<path d="M-4 1 q-1 5 1 10 M0 1.5 q1 6 -1 12 M4 1 q1 5 -1 10" fill="none" stroke="#FFF6D8" stroke-width="0.5" opacity="0.7"/></g>`;
  }
  // Banc de poissons-étoiles (courbe fluide, en arrière-plan puis plus près).
  for (let i = 0; i < 14; i++) {
    const t = i / 13;
    const x = 8 + t * 70 + Math.sin(t * 9) * 4, y = 46 + Math.sin(t * Math.PI) * -18 + t * 10 + (i % 3) * 5;
    s += starfish(x, y, 0.55 + (i % 3) * 0.08, -8 + Math.cos(t * 3) * 10, hsl(oh - 10, 40, 62), pal.glow);
  }
  for (let i = 0; i < 7; i++) {
    const t = i / 6;
    s += starfish(150 + t * 60, 188 - t * 14 + (i % 2) * 6, 0.7, 196, hsl(oh - 10, 40, 66), pal.glow);
  }
  // Fond : sable gravé, ombre portée de la raie, algues et éventails de corail lumineux.
  const fy = 206;
  s += `<path d="M${b.x0} ${fy} C40 198 80 204 120 202 C160 200 190 196 ${b.x1} 204 V${b.y1} H${b.x0} Z" fill="${hsl(oh + 20, 30, 16)}"/>`;
  s += `<path d="M${b.x0} ${fy} C40 198 80 204 120 202 C160 200 190 196 ${b.x1} 204 V${b.y1} H${b.x0} Z" fill="url(#fine)" opacity="0.6"/>`;
  s += `<ellipse cx="116" cy="214" rx="80" ry="7" fill="#000" opacity="0.3" filter="url(#soft)"/>`;
  for (let k = 0; k < 4; k++) s += `<path d="M${b.x0} ${212 + k * 7} q30 -4 60 0 t60 0 t60 0 t60 0" fill="none" stroke="${pal.light}" stroke-width="0.4" opacity="0.25"/>`;
  for (const [x, h, sw, col] of [[8, 70, 10, pal.accent], [20, 50, -6, pal.accent2], [36, 34, 8, pal.accent], [190, 60, -10, pal.accent2], [206, 84, 8, pal.accent], [216, 44, -4, pal.accent2]] as [number, number, number, string][]) {
    const pts: Pt[] = [[x, fy + 4], [x + sw * 0.4, fy - h * 0.35], [x - sw * 0.3, fy - h * 0.7], [x + sw, fy - h]];
    const path = spline(pts, 6);
    s += `<path d="${tube(path, (u) => 2.4 * (1 - u) + 0.6)}" fill="${hsl(oh + 30, 35, 22)}" stroke="#140F24" stroke-width="0.6"/>`;
    s += `<path d="M${path.map(([px, py]) => `${f(px)} ${f(py)}`).join(' L')}" fill="none" stroke="${col}" stroke-width="0.6" opacity="0.7"/>`;
    for (let i = 3; i < path.length; i += 4) s += `<circle cx="${f(path[i][0])}" cy="${f(path[i][1])}" r="1" fill="${pal.glow}" opacity="0.8"/>`;
  }
  // Éventail de corail (gauche) et rochers.
  s += `<path d="M56 206 C50 196 48 186 52 178 C56 186 58 192 60 198 C60 188 64 180 70 176 C70 186 66 196 64 206 Z" fill="${hsl(oh + 40, 30, 20)}" stroke="#140F24" stroke-width="0.6"/>`;
  s += `<path d="M150 210 C152 202 162 198 172 200 C180 202 182 208 180 212 Z" fill="${hsl(oh + 20, 20, 12)}" stroke="#140F24" stroke-width="0.6"/>`;
  s += `<path d="M150 210 C152 202 162 198 172 200 C180 202 182 208 180 212 Z" fill="url(#xhatch)"/>`;
  return s;
};
