import { constellation, eyeA, gild, ink, line, rim, shadow, sparkle, speckles, type Species } from './style.ts';
import { band, f, spline, tube, type Pt } from './legendkit.ts';

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
