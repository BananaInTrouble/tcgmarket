import { constellation, eyeA, fur, gild, ink, line, rim, shadow, sparkle, speckles, type Species } from './style.ts';

type Pt = [number, number];

/**
 * Lunaphage : grand loup cosmique (mythique, carte plein cadre). Dressé sur un éperon de roche lunaire, il a bondi
 * sur la pleine lune et en arrache une bouchée : l'éclat brille entre ses crocs, la lumière lunaire coule de sa
 * gueule. Son dos est une nuit étoilée, sa queue se dissout en nébuleuse. Style gravure : hachures fines, or, liseré.
 */
export const lunaphage: Species = (c) => {
  const { pal } = c;
  const CREAM = '#FFF6D8', INK = '#140F24';
  const id = 'lunaphage-4';
  const f = (v: number) => v.toFixed(1);
  const P = (p: Pt) => `${f(p[0])} ${f(p[1])}`;
  let s = '';

  // Tête : dessinée de profil (vers +x) dans un repère local, pivotée vers la lune.
  const HX = 150, HY = 84, HA = -50, HS = 0.92;
  const ca = Math.cos((HA * Math.PI) / 180), sa = Math.sin((HA * Math.PI) / 180);
  const hp = (x: number, y: number): Pt => [HX + HS * (x * ca - y * sa), HY + HS * (x * sa + y * ca)];

  // ---------- Lune mordue ----------
  const MX = 168, MY = -6, MR = 54;
  const bite = hp(66, 6); // point de morsure (entre les mâchoires)
  const BX = bite[0] - 2, BY = bite[1] - 8, BR = 22;
  // Bord de morsure festonné (traces de crocs) : arcs successifs du cercle de morsure, bombés vers la lune.
  const dd = Math.hypot(BX - MX, BY - MY);
  const a0 = (MR * MR - BR * BR + dd * dd) / (2 * dd), hh = Math.sqrt(MR * MR - a0 * a0);
  const ux = (BX - MX) / dd, uy = (BY - MY) / dd;
  const p1: Pt = [MX + a0 * ux - hh * uy, MY + a0 * uy + hh * ux], p2: Pt = [MX + a0 * ux + hh * uy, MY + a0 * uy - hh * ux];
  const t1 = Math.atan2(p1[1] - BY, p1[0] - BX), t2 = Math.atan2(p2[1] - BY, p2[0] - BX);
  let span = t2 - t1; while (span > 0) span -= Math.PI * 2; // sens qui passe à l'intérieur de la lune
  const N = 7;
  let scallop = '';
  for (let i = 1; i <= N; i++) {
    const ta = t1 + (span * (i - 0.5)) / N, tb = t1 + (span * i) / N;
    const ctl: Pt = [BX + Math.cos(ta) * (BR - 4), BY + Math.sin(ta) * (BR - 4)];
    scallop += ` Q${P(ctl)} ${P([BX + Math.cos(tb) * BR, BY + Math.sin(tb) * BR])}`;
  }
  const moon = `M${P(p1)}${scallop} A${MR} ${MR} 0 1 0 ${P(p1)} Z`;
  s += `<defs><clipPath id="${id}-m"><path d="${moon}"/></clipPath><clipPath id="${id}-b"><path id="${id}-bp" d="BODY"/></clipPath></defs>`;
  s += `<circle cx="${MX}" cy="${MY}" r="${MR + 30}" fill="${pal.glow}" opacity="0.3" filter="url(#soft)"/>`;
  s += `<circle cx="${MX}" cy="${MY}" r="${MR + 9}" fill="none" stroke="${pal.gold}" stroke-width="0.8" opacity="0.7"/>`;
  s += `<circle cx="${MX}" cy="${MY}" r="${MR + 13}" fill="none" stroke="${pal.gold}" stroke-width="0.5" stroke-dasharray="1 3" opacity="0.7"/>`;
  s += `<path d="${moon}" fill="${CREAM}"/>`;
  s += `<g clip-path="url(#${id}-m)">`
    // Mers lunaires gravées.
    + shadow(`M${MX - 30} ${MY - 20} C${MX - 18} ${MY - 34} ${MX + 4} ${MY - 30} ${MX + 8} ${MY - 16} C${MX + 12} ${MY - 2} ${MX - 6} ${MY + 4} ${MX - 18} ${MY - 2} C${MX - 28} ${MY - 6} ${MX - 36} ${MY - 10} ${MX - 30} ${MY - 20} Z`, pal.light, 0.55, 'fine')
    + shadow(`M${MX + 14} ${MY + 6} C${MX + 26} ${MY - 2} ${MX + 40} ${MY + 6} ${MX + 36} ${MY + 22} C${MX + 32} ${MY + 34} ${MX + 16} ${MY + 32} ${MX + 12} ${MY + 22} C${MX + 8} ${MY + 14} ${MX + 8} ${MY + 10} ${MX + 14} ${MY + 6} Z`, pal.light, 0.5, 'fine')
    + shadow(`M${MX - 4} ${MY + 30} c10 -6 22 0 20 10 c-2 8 -16 10 -22 4 c-4 -4 -2 -10 2 -14 Z`, pal.light, 0.45, 'fine')
    // Assombrissement du limbe (droite) en hachures croisées.
    + shadow(`M${MX + 30} ${MY - MR} A${MR} ${MR} 0 0 1 ${MX + 30} ${MY + MR} C${MX + 56} ${MY + 24} ${MX + 56} ${MY - 24} ${MX + 30} ${MY - MR} Z`, pal.light, 0.35, 'xhatch')
    // Cratères.
    + [[MX - 8, MY - 40, 6], [MX + 26, MY - 28, 8], [MX - 34, MY + 14, 5], [MX + 4, MY + 12, 4], [MX + 40, MY - 6, 3.5], [MX - 20, MY + 34, 3], [MX + 22, MY + 42, 4]]
      .map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 0.82}" fill="none" stroke="${INK}" stroke-width="0.8" opacity="0.55"/>`
        + `<path d="M${x - r * 0.8} ${y + r * 0.1} A${r} ${r * 0.82} 0 0 0 ${x + r * 0.8} ${y + r * 0.2}" fill="none" stroke="${pal.shade}" stroke-width="${f(r * 0.35)}" opacity="0.4"/>`).join('')
    + `</g>`;
  s += `<path d="${moon}" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>`;
  // Lumière qui s'échappe de la morsure.
  s += `<circle cx="${f(BX)}" cy="${f(BY)}" r="${BR}" fill="${pal.glow}" opacity="0.35" filter="url(#soft)"/>`;

  // ---------- Queue-nébuleuse (dressée, à gauche) ----------
  const tail = 'M40 154 C26 150 16 136 14 116 C12 96 18 74 30 58 C38 48 48 42 56 40 C46 54 40 70 40 88 C40 108 46 124 58 138 C54 146 48 152 40 154 Z';
  s += `<defs><clipPath id="${id}-t"><path d="${tail}"/></clipPath></defs>`;
  // Volutes de la queue qui se dissolvent en étoiles.
  s += `<ellipse cx="44" cy="40" rx="22" ry="14" fill="${pal.accent}" opacity="0.35" filter="url(#soft)"/>`;
  s += line('M56 40 C66 30 72 18 70 4 M48 44 C52 30 50 16 42 6 M30 58 C22 48 18 34 22 22', 0.9, pal.light, ' opacity="0.55"');
  s += speckles(c, 52, 22, 22, 22, 14);
  s += constellation([[70, 4], [62, -12], [46, -16], [34, -6]], pal.gold);
  s += `<path d="${tail}" fill="${pal.deep}"/><g clip-path="url(#${id}-t)">`
    + `<ellipse cx="26" cy="96" rx="12" ry="34" fill="${pal.accent}" opacity="0.6" filter="url(#soft)"/>`
    + `<ellipse cx="44" cy="58" rx="12" ry="14" fill="${CREAM}" opacity="0.55" filter="url(#soft)"/>`
    + `<ellipse cx="48" cy="130" rx="12" ry="14" fill="${pal.accent2}" opacity="0.5" filter="url(#soft)"/>`
    + speckles(c, 32, 100, 18, 50, 22)
    + line('M22 132 C18 110 20 84 32 62 M30 140 C26 116 28 90 40 66 M48 146 C40 128 36 104 42 80', 0.7, INK, ' opacity="0.5"')
    + `</g>`;
  s += ink(tail, 'none', 1.5);
  s += rim('M56 40 C46 54 40 70 40 88 C40 108 46 124 58 138', pal.glow, 1.1);

  // ---------- Roche lunaire ----------
  const rock = 'M-10 252 C20 246 40 250 70 247 C100 244 128 248 150 242 C164 238 172 234 186 234 C204 234 218 238 236 240 L236 270 C160 266 70 268 -10 270 Z';
  s += ink(rock, pal.deep, 1.4);
  s += shadow('M-10 258 C40 256 100 258 150 252 C176 248 200 246 236 250 L236 270 C160 266 70 268 -10 270 Z', INK, 0.5, 'xhatch');
  s += rim('M-10 252 C20 246 40 250 70 247 C100 244 128 248 150 242 C164 238 172 234 186 234 C204 234 218 238 236 240', pal.light, 1);
  s += line('M168 238 c6 4 14 4 20 0 M100 250 c8 3 16 2 22 -2 M20 254 c6 2 12 2 18 0', 0.8, INK, ' opacity="0.7"');

  // ---------- Pattes lointaines (derrière le corps) ----------
  const farFore = 'M176 186 C188 196 196 210 200 224 C202 230 206 234 214 236 C216 240 212 242 204 241 L194 241 C192 234 190 226 184 216 C178 206 170 200 164 196 Z';
  const farHind = 'M74 196 C84 204 90 214 88 222 C86 230 80 236 80 244 L82 248 C88 250 92 252 88 254 L72 254 C70 246 70 238 70 230 C70 222 64 214 58 208 Z';
  s += ink(farFore, pal.shade, 1.3) + shadow(farFore, INK, 0.45, 'xhatch');
  s += ink(farHind, pal.shade, 1.3) + shadow(farHind, INK, 0.45, 'xhatch');

  // ---------- Corps ----------
  const nb = hp(-6, 8), nt = hp(14, 22);
  const body = `M132 122 C110 128 82 140 54 148 C38 152 26 160 22 174 C18 190 24 206 38 214 C52 220 64 214 76 206 C96 198 120 202 146 204 `
    + `C168 204 184 188 186 166 C188 140 ${f(nt[0] + 8)} ${f(nt[1] + 30)} ${P(nt)} L${P(nb)} C${f(nb[0] - 4)} ${f(nb[1] + 14)} 142 116 132 122 Z`;
  s = s.replace('d="BODY"', `d="${body}"`);
  s += `<path d="${body}" fill="${pal.body}"/>`;
  s += `<g clip-path="url(#${id}-b)">`
    // Selle « nuit étoilée » sur le dos et l'encolure.
    + `<path d="M${P(nb)} C150 110 140 120 130 128 C104 138 74 150 44 156 C30 160 22 172 22 186 C40 178 60 172 84 168 C112 162 136 156 150 140 C160 128 164 110 ${P(hp(20, 4))} Z" fill="${pal.deep}" filter="url(#soft)"/>`
    + `<path d="M${P(nb)} C150 110 140 120 130 128 C104 138 74 150 44 156 C30 160 22 172 24 180 C44 170 70 164 92 160 C116 154 138 146 148 132 C156 120 160 106 ${P(hp(16, 6))} Z" fill="${pal.deep}"/>`
    + `<ellipse cx="96" cy="150" rx="26" ry="7" fill="${pal.accent}" opacity="0.45" filter="url(#soft)" transform="rotate(-14 96 150)"/>`
    + `<ellipse cx="146" cy="120" rx="10" ry="16" fill="${pal.accent2}" opacity="0.4" filter="url(#soft)"/>`
    + speckles(c, 90, 152, 60, 10, 26) + speckles(c, 148, 116, 10, 18, 8)
    + constellation([[44, 160], [62, 152], [84, 150], [100, 142], [118, 140], [134, 128]], pal.gold)
    // Hachures de volume : ventre, poitrail, cuisse.
    + shadow('M22 174 C18 190 24 206 38 214 C52 220 64 214 76 206 C96 198 120 202 146 204 C120 192 96 190 76 196 C60 202 46 206 34 196 C26 188 24 180 22 174 Z', pal.shade, 0.75, 'fine')
    + shadow('M186 166 C184 188 168 204 146 204 C160 196 170 182 172 164 C174 148 172 134 168 122 C180 132 188 148 186 166 Z', pal.shade, 0.55, 'fine')
    + `</g>`;
  // Poitrail clair (plastron) et crinière.
  const ruff = `M${P(hp(8, 22))} C182 112 194 134 190 156 C196 164 186 168 188 176 C180 176 182 186 174 184 C170 192 162 186 158 192 C156 182 160 170 164 160 C168 140 166 116 ${P(hp(4, 16))} Z`;
  s += ink(ruff, pal.belly, 1.1);
  s += shadow(`M${P(hp(4, 16))} C166 116 168 140 164 160 C160 170 156 182 158 192 C150 178 152 160 156 146 C160 128 158 112 ${P(hp(4, 16))} Z`, pal.light, 0.6, 'fine');
  s += fur(c, 180, 130, 10, 100, 4, 6) + fur(c, 182, 152, 10, 95, 4, 6) + fur(c, 170, 168, 9, 100, 3, 6);
  // Mèches de la nuque dressées (crinière sombre).
  const mane = `M${P(hp(-8, 2))} C${f(nb[0] - 14)} ${f(nb[1] + 2)} 138 106 128 116 L136 114 L126 126 L138 120 L132 130 L146 122 C150 112 ${f(nb[0])} ${f(nb[1] + 4)} ${P(hp(2, 6))} Z`;
  s += ink(mane, pal.deep, 1.2) + speckles(c, 138, 112, 6, 6, 4);
  s += ink(body, 'none', 1.7);
  s += rim('M132 122 C110 128 82 140 54 148 C38 152 26 160 22 174', pal.glow, 1.2);
  s += fur(c, 30, 196, 10, 120, 5, 8) + fur(c, 64, 206, 8, 100, 4, 8) + fur(c, 112, 200, 7, 95, 5, 10);

  // ---------- Patte arrière proche ----------
  const hind = 'M36 160 C58 158 76 172 78 192 C80 204 74 214 66 222 C60 228 54 232 52 238 C52 242 54 246 60 248 C66 250 68 254 62 255 L42 255 C40 248 40 242 40 236 C40 230 36 226 32 220 C24 210 20 196 22 182 C24 170 28 162 36 160 Z';
  s += ink(hind, pal.body, 1.6);
  s += `<g clip-path="url(#${id}-b2)">` + `</g>`;
  s += shadow('M78 192 C80 204 74 214 66 222 C60 228 54 232 52 238 C52 242 54 246 60 248 L48 250 C46 240 48 232 54 224 C62 214 70 204 78 192 Z', pal.shade, 0.7, 'fine');
  s += shadow('M32 220 C24 210 20 196 22 182 C26 196 32 206 40 214 C42 222 42 228 40 236 C40 230 36 226 32 220 Z', pal.shade, 0.8, 'xhatch');
  s += line('M38 166 C52 168 64 178 66 192', 0.9, INK, ' opacity="0.6"') + line('M52 255 l1 -5 M57 255 l1 -4', 0.9);
  s += fur(c, 36, 170, 9, 150, 4, 8);
  s += rim('M36 160 C58 158 76 172 78 192', pal.light, 1);

  // ---------- Patte avant proche (appuyée sur l'éperon) ----------
  const fore = 'M150 180 C162 176 172 182 174 194 C176 206 172 218 172 226 C172 230 176 234 184 236 C190 238 190 242 184 243 L166 243 C162 236 160 228 160 220 C160 210 154 202 148 196 C144 190 144 184 150 180 Z';
  s += ink(fore, pal.belly, 1.6);
  s += shadow('M174 194 C176 206 172 218 172 226 C172 230 176 234 184 236 L176 238 C168 234 166 226 166 216 C166 206 170 200 174 194 Z', pal.shade, 0.6, 'fine');
  s += line('M174 243 l1 -5 M180 243 l1 -4', 0.9) + fur(c, 156, 190, 8, 110, 4, 6);
  s += rim('M150 180 C162 176 172 182 174 194', pal.light, 1);

  // ---------- Tête ----------
  let hd = '';
  const earF = 'M6 -12 C2 -22 2 -32 4 -40 C12 -34 20 -24 24 -14 Z';
  hd += ink('M-2 -10 C-8 -20 -8 -30 -6 -38 C2 -32 8 -22 12 -12 Z', pal.deep, 1.2);
  const skull = 'M-8 8 C-10 -4 -4 -14 8 -16 C18 -18 28 -17 34 -13 C38 -11 41 -9 46 -8 C54 -7 62 -6 68 -5 C71 -5 73 -3 73 0 C73 2 71 3 69 3 L66 4 C58 5 50 6 42 8 C36 10 30 14 22 16 C12 18 0 16 -8 8 Z';
  const jaw = 'M40 10 C48 12 56 15 63 17 C65 19 62 22 58 22 C46 22 34 22 24 19 C30 16 36 12 40 10 Z';
  // Intérieur de la gueule + éclat de lune.
  hd += ink('M42 8 L66 4 C66 10 64 15 63 17 L40 10 Z', INK, 1);
  hd += ink(jaw, pal.body, 1.3);
  hd += shadow('M24 19 C34 22 46 22 58 22 C50 20 40 19 30 17 Z', pal.shade, 0.8, 'fine');
  hd += ink(skull, pal.body, 1.6);
  // Masque : dessus de la tête sombre, babines et joues claires.
  hd += `<path d="M-8 8 C-10 -4 -4 -14 8 -16 C18 -18 28 -17 34 -13 C38 -11 41 -9 46 -8 C54 -7 62 -6 68 -5 C60 -3 50 -3 42 -4 C34 -4 26 -2 18 2 C8 6 0 10 -8 8 Z" fill="${pal.deep}" opacity="0.85"/>`;
  hd += `<path d="M42 8 C36 10 30 14 22 16 C14 17 8 16 2 12 C10 8 20 4 30 2 C40 0 50 2 58 3 L66 4 C58 5 50 6 42 8 Z" fill="${pal.belly}"/>`;
  hd += shadow('M-8 8 C0 16 12 18 22 16 C14 12 6 10 -8 8 Z', pal.shade, 0.7, 'fine');
  hd += speckles(c, 12, -8, 10, 4, 5);
  hd += ink(skull, 'none', 1.6);
  hd += ink('M66 -4 C70 -6 74 -4 73 0 C73 2 71 3 68 3 C66 1 65 -2 66 -4 Z', INK, 0.8);
  hd += line('M46 -8 C54 -7 62 -6 68 -5', 0.8, pal.light, ' opacity="0.8"');
  hd += line('M50 0 l2 1 M54 0 l2 1 M52 2 l2 1', 0.6);
  // Crocs.
  hd += ink('M60 4.6 L61 10 L63 4.3 Z', CREAM, 0.6) + ink('M49 6 L50 10 L52 5.7 Z', CREAM, 0.5);
  hd += ink('M58 18 L59.5 13 L61 18.5 Z', CREAM, 0.6) + ink('M48 16 L49 12.5 L50.5 16.6 Z', CREAM, 0.5);
  // Oreille avant.
  hd += ink(earF, pal.body, 1.3) + ink('M9 -14 C7 -22 7 -30 8 -35 C13 -29 17 -22 19 -15 Z', pal.deep, 0) + fur(c, 12, -16, 6, -100, 3, 4, CREAM, 0.6);
  // Œil d'or et arcade.
  hd += eyeA(33, -7, 4.6, pal.gold, { angle: 6, slit: false, open: 0.45 });
  hd += line('M26 -12 C30 -15 36 -15 40 -12', 1.1);
  hd += line('M38 -4 C42 -2 44 0 46 2', 0.7, INK, ' opacity="0.7"');
  // Joue touffue.
  hd += `<path d="M22 16 L14 22 L16 17 L6 22 L8 16 L-2 18 L2 12" fill="${pal.belly}" stroke="${INK}" stroke-width="1" stroke-linejoin="round"/>`;
  hd += fur(c, 20, 8, 7, 160, 4, 4) + fur(c, 0, -6, 6, 170, 3, 4, CREAM, 0.6);
  hd += rim('M8 -16 C18 -18 28 -17 34 -13 C38 -11 41 -9 46 -8 C54 -7 62 -6 68 -5', pal.glow, 1);
  hd += gild('M22 -10 c3 -4 8 -4 10 -1', 0.9);
  s += `<g transform="translate(${HX} ${HY}) rotate(${HA}) scale(${HS})">${hd}</g>`;

  // Éclat de lune entre les crocs, lumière qui coule.
  const fr = hp(60, 10);
  s += `<circle cx="${f(fr[0])}" cy="${f(fr[1])}" r="12" fill="${pal.glow}" opacity="0.55" filter="url(#soft)"/>`;
  s += ink(`M${f(fr[0] - 6)} ${f(fr[1] + 2)} C${f(fr[0] - 4)} ${f(fr[1] - 6)} ${f(fr[0] + 4)} ${f(fr[1] - 8)} ${f(fr[0] + 8)} ${f(fr[1] - 4)} C${f(fr[0] + 4)} ${f(fr[1] - 3)} ${f(fr[0] + 2)} ${f(fr[1] + 2)} ${f(fr[0] + 4)} ${f(fr[1] + 6)} C${f(fr[0])} ${f(fr[1] + 6)} ${f(fr[0] - 4)} ${f(fr[1] + 5)} ${f(fr[0] - 6)} ${f(fr[1] + 2)} Z`, CREAM, 1);
  const dr = hp(44, 20);
  s += line(`M${P(dr)} c2 6 0 12 3 18 M${f(dr[0] + 6)} ${f(dr[1] - 2)} c1 5 0 9 2 13`, 1.1, CREAM, ' opacity="0.85"');
  s += `<circle cx="${f(dr[0] + 3)}" cy="${f(dr[1] + 22)}" r="1.4" fill="${CREAM}"/>`;
  // Éclats arrachés qui dérivent.
  for (const [x, y, k] of [[208, 58, 4.5], [216, 74, 3], [200, 80, 2.4], [212, 40, 2.2], [194, 66, 1.8]] as const) {
    s += ink(`M${x - k} ${y} L${x - k * 0.2} ${y - k} L${x + k} ${y - k * 0.3} L${x + k * 0.4} ${y + k * 0.9} Z`, CREAM, 0.8);
  }
  s += sparkle(206, 96, 4, pal.glow, false) + sparkle(96, 40, 3.5, CREAM, false) + sparkle(8, 210, 3, pal.glow, false);
  return s;
};
