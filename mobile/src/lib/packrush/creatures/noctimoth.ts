import { aura, constellation, gild, ground, hsl, ink, line, rim, shadow, sparkle, speckles, type Bounds, type DrawCtx, type Species } from './style.ts';

/**
 * Noctimoth → Phalénuit → Séléniaile → Astrophalène : bombyx de nuit. Planche d'entomologie céleste : chenille à
 * tubercules d'étoiles cabrée sur un rameau, jeune phalène au repos ailes en toit, adulte ailes déployées à
 * ocelles de lune et longues queues, puis éveillé aux nervures d'or et ailes constellées.
 */

const f = (v: number) => v.toFixed(1);
const CX = 111;
/** Dessin de la moitié droite + son miroir autour de x = 111. */
const mirror = (s: string) => s + `<g transform="matrix(-1 0 0 1 ${CX * 2} 0)">${s}</g>`;
/** Lueur sans filtre (cercles concentriques). */
const glowDot = (x: number, y: number, r: number, col: string) => [1, 0.7, 0.45, 0.25].map((k) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r / k * 0.5)}" fill="${col}" opacity="${(0.22 * k).toFixed(2)}"/>`).join('');

/** Antenne bipectinée (plumeuse) : tige + barbules fines. */
function antenna(x0: number, y0: number, qx: number, qy: number, x1: number, y1: number, n: number, len: number, col: string): string {
  let barbs = '';
  for (let i = 1; i < n; i++) {
    const t = i / n, u = 1 - t;
    const x = u * u * x0 + 2 * u * t * qx + t * t * x1, y = u * u * y0 + 2 * u * t * qy + t * t * y1;
    let tx = 2 * u * (qx - x0) + 2 * t * (x1 - qx), ty = 2 * u * (qy - y0) + 2 * t * (y1 - qy);
    const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
    const L = len * Math.sin(Math.PI * (0.15 + t * 0.8));
    for (const sd of [-1, 1]) {
      const nx = -ty * sd, ny = tx * sd;
      barbs += `M${f(x)} ${f(y)} l${f((nx * 0.8 + tx * 0.6) * L)} ${f((ny * 0.8 + ty * 0.6) * L)} `;
    }
  }
  return line(barbs, 0.6, col) + line(`M${f(x0)} ${f(y0)} Q${f(qx)} ${f(qy)} ${f(x1)} ${f(y1)}`, 1.2);
}

/** Ocelle-lune : anneau sombre, disque clair, ombre d'éclipse en croissant. */
function moonEye(x: number, y: number, r: number, c: DrawCtx, phase = 0.45): string {
  const { pal } = c;
  return `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${pal.deep}" stroke="#140F24" stroke-width="1"/>`
    + `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r * 0.72)}" fill="${pal.glow}"/>`
    + `<circle cx="${f(x + r * phase)}" cy="${f(y - r * 0.1)}" r="${f(r * 0.66)}" fill="${pal.shade}" opacity="0.9"/>`
    + `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r * 0.86)}" fill="none" stroke="#E9C25B" stroke-width="0.7"/>`
    + `<path d="M${f(x - r * 0.5)} ${f(y - r * 0.35)} q${f(r * 0.2)} ${f(-r * 0.25)} ${f(r * 0.45)} ${f(-r * 0.3)}" stroke="#fff" stroke-width="0.9" fill="none" stroke-linecap="round"/>`;
}

/** Corps de phalène vu de dessus (tête en haut) : abdomen annelé, thorax velu, tête, yeux composés. */
function mothBody(c: DrawCtx, y0: number, k: number): string {
  const { pal } = c;
  const Y = (v: number) => f(y0 + v * k), X = (v: number) => f(CX + v * k);
  let s = '';
  const abd = `M${X(0)} ${Y(14)} C${X(9)} ${Y(16)} ${X(10)} ${Y(32)} ${X(9)} ${Y(46)} C${X(8)} ${Y(60)} ${X(4)} ${Y(70)} ${X(0)} ${Y(74)} C${X(-4)} ${Y(70)} ${X(-8)} ${Y(60)} ${X(-9)} ${Y(46)} C${X(-10)} ${Y(32)} ${X(-9)} ${Y(16)} ${X(0)} ${Y(14)} Z`;
  s += ink(abd, pal.shade, 1.4);
  s += shadow(`M${X(2)} ${Y(16)} C${X(9)} ${Y(18)} ${X(10)} ${Y(32)} ${X(9)} ${Y(46)} C${X(8)} ${Y(60)} ${X(4)} ${Y(70)} ${X(0)} ${Y(74)} C${X(4)} ${Y(60)} ${X(5)} ${Y(36)} ${X(2)} ${Y(16)} Z`, pal.deep, 0.6, 'fine');
  for (let i = 0; i < 6; i++) {
    const yy = 24 + i * 8.2, w = 9.4 - i * 1.1;
    s += line(`M${X(-w)} ${Y(yy)} Q${X(0)} ${Y(yy + 3)} ${X(w)} ${Y(yy)}`, 0.8, pal.light, ' opacity="0.7"');
  }
  // Thorax velu.
  s += ink(`M${X(0)} ${Y(-14)} C${X(11)} ${Y(-14)} ${X(13)} ${Y(-2)} ${X(11)} ${Y(8)} C${X(9)} ${Y(18)} ${X(4)} ${Y(22)} ${X(0)} ${Y(22)} C${X(-4)} ${Y(22)} ${X(-9)} ${Y(18)} ${X(-11)} ${Y(8)} C${X(-13)} ${Y(-2)} ${X(-11)} ${Y(-14)} ${X(0)} ${Y(-14)} Z`, pal.belly, 1.4);
  for (let i = -4; i <= 4; i++) s += line(`M${X(i * 2.2)} ${Y(-10 + Math.abs(i))} q${f(i * 0.6 * k)} ${f(6 * k)} ${f(i * 0.4 * k)} ${f(14 * k)}`, 0.6, pal.shade, ' opacity="0.7"');
  s += shadow(`M${X(4)} ${Y(-12)} C${X(12)} ${Y(-10)} ${X(13)} ${Y(4)} ${X(10)} ${Y(12)} C${X(8)} ${Y(18)} ${X(4)} ${Y(21)} ${X(1)} ${Y(22)} C${X(6)} ${Y(12)} ${X(8)} ${Y(-2)} ${X(4)} ${Y(-12)} Z`, pal.shade, 0.5, 'fine');
  // Collier et tête.
  s += ink(`M${X(-8)} ${Y(-13)} C${X(-6)} ${Y(-19)} ${X(6)} ${Y(-19)} ${X(8)} ${Y(-13)} C${X(4)} ${Y(-11)} ${X(-4)} ${Y(-11)} ${X(-8)} ${Y(-13)} Z`, pal.light, 1);
  s += ink(`M${X(-6)} ${Y(-18)} C${X(-6)} ${Y(-26)} ${X(6)} ${Y(-26)} ${X(6)} ${Y(-18)} C${X(4)} ${Y(-15)} ${X(-4)} ${Y(-15)} ${X(-6)} ${Y(-18)} Z`, pal.shade, 1.2);
  for (const sd of [-1, 1]) {
    s += `<ellipse cx="${X(sd * 5.6)}" cy="${Y(-20)}" rx="${f(2.6 * k)}" ry="${f(3.2 * k)}" fill="#140F24"/>`
      + `<circle cx="${X(sd * 5.6 - 0.8)}" cy="${Y(-21.2)}" r="${f(0.8 * k)}" fill="${pal.glow}"/>`;
  }
  return s;
}

/** Stades 2–3 : ailes déployées en planche, ocelles de lune, longues queues. */
function spread(c: DrawCtx): string {
  const { pal, stage } = c;
  const woke = stage >= 3;
  const id = `noctimoth-${stage}`;
  const FW = 'M114 80 C134 62 176 42 208 30 C213 30 213 35 210 39 C200 58 192 84 184 108 C168 117 136 113 116 100 Z';
  const HW = 'M114 98 C136 104 170 108 184 124 C194 138 186 154 172 160 C166 172 167 194 175 216 C170 221 162 214 157 203 C150 188 146 170 136 157 C126 147 118 136 114 124 Z';
  let half = '';
  // Aile arrière.
  half += `<clipPath id="${id}-h"><path d="${HW}"/></clipPath><g clip-path="url(#${id}-h)"><path d="${HW}" fill="${pal.body}"/>`
    + `<ellipse cx="128" cy="118" rx="26" ry="18" fill="${pal.light}" opacity="0.8" filter="url(#soft)"/>`
    + `<ellipse cx="178" cy="150" rx="18" ry="22" fill="${pal.deep}" opacity="0.8" filter="url(#soft)"/>`
    + `<ellipse cx="166" cy="206" rx="10" ry="18" fill="${pal.accent}" opacity="0.8" filter="url(#soft)"/>`
    + shadow('M184 124 C194 138 186 154 172 160 C166 172 167 194 175 216 L160 216 C156 196 158 172 166 156 C176 150 182 138 180 124 Z', pal.shade, 0.75, 'fine')
    + line('M118 112 C140 116 160 122 176 136 M118 120 C136 132 150 146 160 162 M118 128 C130 146 140 166 160 200', 0.6, '#140F24', ' opacity="0.5"')
    + line('M180 128 C184 140 180 150 170 156 C164 168 164 190 170 210', 0.8, '#E9C25B', ' opacity="0.8"')
    + (woke ? speckles(c, 170, 150, 16, 50, 12) : '')
    + `</g>` + ink(HW, 'none', 1.5);
  half += moonEye(158, 134, 9.5, c, 0.5);
  // Aile avant (par-dessus).
  half += `<clipPath id="${id}-f"><path d="${FW}"/></clipPath><g clip-path="url(#${id}-f)"><path d="${FW}" fill="${pal.body}"/>`
    + `<ellipse cx="132" cy="92" rx="26" ry="16" fill="${pal.light}" opacity="0.85" filter="url(#soft)"/>`
    + `<ellipse cx="196" cy="70" rx="16" ry="36" fill="${pal.deep}" opacity="0.7" filter="url(#soft)"/>`
    + `<path d="M112 78 C134 58 176 38 210 26 L211 37 C178 50 142 70 118 88 Z" fill="${pal.deep}"/>`
    + shadow('M210 39 C200 58 192 84 184 108 L174 108 C182 86 190 62 200 42 Z', pal.shade, 0.8, 'fine')
    + line('M118 88 C150 72 180 56 206 40 M120 94 C150 88 178 76 200 62 M122 98 C150 100 172 96 192 88 M124 102 C150 108 168 108 186 104', 0.6, '#140F24', ' opacity="0.5"')
    + line('M170 52 C162 70 160 88 166 110', 0.9, '#140F24', ' opacity="0.7"') + line('M146 64 C140 80 140 96 146 110', 0.7, pal.light, ' opacity="0.8"')
    + gild('M200 46 C192 66 186 88 180 106', 0.9)
    + (woke ? `<ellipse cx="186" cy="66" rx="12" ry="22" fill="${pal.accent2}" opacity="0.55" filter="url(#soft)"/>` + speckles(c, 184, 70, 22, 30, 16) : '')
    + `</g>` + ink(FW, 'none', 1.6);
  half += moonEye(168, 74, 7.5, c, -0.45);
  half += rim('M118 80 C138 62 176 44 206 32', pal.glow, 1);
  // Duvet à la base des ailes.
  for (let i = 0; i < 6; i++) half += line(`M${f(116 + i)} ${f(86 + i * 4)} q6 1 ${f(10 - i)} ${f(-2 + i * 0.6)}`, 0.7, pal.belly, ' opacity="0.8"');
  if (woke) {
    half += gild('M118 88 C150 72 180 56 206 40 M122 98 C150 100 172 96 192 88 M118 120 C136 132 150 146 160 162', 0.8);
    half += constellation([[184, 52], [194, 64], [188, 82], [196, 92]], pal.gold) + constellation([[140, 130], [146, 146], [138, 156]], '#FFF6D8');
  }
  let s = '';
  if (woke) s += aura(CX, 104, 96, pal.glow);
  s += mirror(half);
  // Antennes plumeuses.
  s += mirror(antenna(114, 70, 120, 48, 140, 30, 13, 6, pal.light));
  s += mothBody(c, 92, 1);
  if (woke) {
    s += gild('M99 36 a14 14 0 1 0 24 0 a11 11 0 1 1 -24 0 Z', 1.2) + glowDot(CX, 40, 10, pal.glow);
    for (const [x, y, z] of [[166, 222, 3], [56, 222, 3], [180, 200, 2.4], [42, 200, 2.4], [24, 30, 3.5], [198, 120, 3]] as const) s += sparkle(x, y, z, pal.glow, false);
  }
  return s;
}

/** Rameau incliné (sous l'insecte), avec deux feuilles. */
function twig(c: DrawCtx, d: string, leaves: [number, number, number, number][]): string {
  const { pal } = c;
  let s = line(d, 9, '#140F24') + line(d, 6.4, pal.deep) + line(d, 1, pal.shade, ' opacity="0.9" stroke-dasharray="6 5"');
  for (const [x, y, len, a] of leaves) {
    const leaf = `M0 0 C${f(len * 0.3)} ${f(-len * 0.28)} ${f(len * 0.75)} ${f(-len * 0.22)} ${f(len)} 0 C${f(len * 0.75)} ${f(len * 0.2)} ${f(len * 0.3)} ${f(len * 0.26)} 0 0 Z`;
    s += `<g transform="translate(${x} ${y}) rotate(${a})">${ink(leaf, pal.shade, 1.3)}${shadow(`M0 0 C${f(len * 0.3)} ${f(len * 0.26)} ${f(len * 0.75)} ${f(len * 0.2)} ${f(len)} 0 C${f(len * 0.6)} ${f(len * 0.06)} ${f(len * 0.3)} ${f(len * 0.06)} 0 0 Z`, pal.deep, 0.6, 'fine')}${line(`M2 0 L${f(len - 3)} 0 M${f(len * 0.3)} 0 l${f(len * 0.12)} ${f(-len * 0.1)} M${f(len * 0.55)} 0 l${f(len * 0.12)} ${f(-len * 0.1)} M${f(len * 0.4)} 0 l${f(len * 0.12)} ${f(len * 0.1)}`, 0.6, pal.light, ' opacity="0.7"')}</g>`;
  }
  return s;
}

/** Stade 1 : jeune phalène au repos sur un rameau, ailes repliées en toit (vue de dessus). */
function resting(c: DrawCtx): string {
  const { pal } = c;
  const id = 'noctimoth-1';
  const FW = 'M114 66 C142 78 174 122 196 174 C199 182 195 188 188 188 C164 192 136 200 113 210 C112 160 112 110 114 66 Z';
  const HW = 'M116 124 C150 142 184 170 194 186 C182 202 150 210 116 214 Z';
  let s = twig(c, 'M6 226 C60 200 150 150 218 128', [[40, 208, 40, 160], [176, 146, 38, -20]]);
  let half = '';
  half += ink(HW, pal.shade, 1.3) + line('M190 190 C170 202 146 208 118 212', 0.6, pal.light, ' opacity="0.7" stroke-dasharray="1.2 2"');
  half += `<clipPath id="${id}-f"><path d="${FW}"/></clipPath><g clip-path="url(#${id}-f)"><path d="${FW}" fill="${pal.body}"/>`
    + `<ellipse cx="130" cy="110" rx="18" ry="34" fill="${pal.light}" opacity="0.8" filter="url(#soft)"/>`
    + `<ellipse cx="176" cy="184" rx="26" ry="16" fill="${pal.deep}" opacity="0.75" filter="url(#soft)"/>`
    + `<path d="M114 62 C144 74 178 120 202 172 L194 176 C172 128 144 88 118 76 Z" fill="${pal.deep}"/>`
    + line('M118 84 C140 110 160 150 176 182 M118 100 C134 130 146 166 154 192 M118 118 C126 146 132 176 136 198', 0.6, '#140F24', ' opacity="0.5"')
    + line('M112 150 C130 146 150 150 168 160 C176 164 182 168 186 174', 1, '#140F24', ' opacity="0.65"')
    + line('M112 156 C130 152 148 156 164 166', 0.8, pal.light, ' opacity="0.8"')
    + shadow('M188 188 C164 192 136 200 113 210 L113 198 C138 188 164 180 192 178 Z', pal.shade, 0.8, 'fine')
    + gild('M120 196 C142 186 166 180 186 180', 0.8)
    + `</g>` + ink(FW, 'none', 1.6);
  half += moonEye(146, 124, 6.5, c, -0.45);
  half += rim('M116 68 C142 80 172 120 194 170', pal.glow, 1);
  half += line('M190 188 l2 3 M182 189 l1.5 3.4 M172 191 l1 3.4 M162 193 l1 3.4 M150 196 l0.6 3.4 M138 200 l0.4 3.4 M126 204 l0.2 3.4', 0.7, pal.light);
  // Cocon de soie vide, fendu, suspendu au rameau : elle vient d'éclore.
  let co = '';
  co += line('M190 140 L192 150', 0.8, pal.light);
  co += ink('M184 150 C194 144 204 150 204 166 C204 184 198 198 192 204 L188 196 L184 204 C178 194 176 176 178 164 C178 156 180 152 184 150 Z', hsl(c.hue + 30, 15, 72), 1.3);
  co += line('M180 160 C188 158 196 160 202 164 M178 172 C188 170 196 172 203 176 M179 184 C186 182 194 184 200 188', 0.6, '#140F24', ' opacity="0.5"');
  co += shadow('M196 150 C204 156 204 172 202 182 C200 192 196 198 192 204 L190 190 C196 178 198 162 196 150 Z', hsl(c.hue + 30, 20, 40), 0.6, 'fine');
  co += ink('M184 204 L188 196 L192 204 C190 210 186 210 184 204 Z', '#140F24', 0);
  s += `<g transform="translate(14 -16)">${co}</g>`;
  let g = s + mirror(half);
  g += line('M111 74 L111 208', 1.2);
  g += mirror(antenna(113, 50, 122, 30, 144, 16, 12, 5, pal.light));
  // Tête et thorax qui dépassent entre les ailes.
  g += ink('M111 50 C120 50 124 58 122 68 C120 76 116 80 111 80 C106 80 102 76 100 68 C98 58 102 50 111 50 Z', pal.belly, 1.4);
  for (let i = -3; i <= 3; i++) g += line(`M${f(111 + i * 2.6)} ${f(56 + Math.abs(i))} q${f(i * 0.5)} 8 ${f(i * 0.3)} 18`, 0.6, pal.shade, ' opacity="0.7"');
  g += ink('M105 50 C105 42 117 42 117 50 C115 53 107 53 105 50 Z', pal.shade, 1.2);
  for (const sd of [-1, 1]) g += `<ellipse cx="${f(CX + sd * 5.4)}" cy="47.5" rx="2.4" ry="2.9" fill="#140F24"/><circle cx="${f(CX + sd * 5.4 - 0.7)}" cy="46.5" r="0.7" fill="${pal.glow}"/>`;
  g += sparkle(CX, 30, 3.2, pal.gold, false);
  return g;
}

type P4 = [number, number, number, number];
/** Spline de Catmull-Rom échantillonnée : [x, y, tx, ty] (tangente unitaire). */
function spline(pts: [number, number][], n: number): P4[] {
  const out: P4[] = [];
  const m = pts.length - 1;
  for (let i = 0; i <= n; i++) {
    const u = (i / n) * m, k = Math.min(m - 1, Math.floor(u)), t = u - k;
    const p0 = pts[Math.max(0, k - 1)], p1 = pts[k], p2 = pts[k + 1], p3 = pts[Math.min(m, k + 2)];
    const t2 = t * t, t3 = t2 * t;
    const x = 0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3);
    const y = 0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
    const dx = 0.5 * ((-p0[0] + p2[0]) + 2 * (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t + 3 * (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t2);
    const dy = 0.5 * ((-p0[1] + p2[1]) + 2 * (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t + 3 * (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t2);
    const l = Math.hypot(dx, dy) || 1;
    out.push([x, y, dx / l, dy / l]);
  }
  return out;
}
/** Point décalé perpendiculairement (o > 0 : côté dos). */
const off = (p: P4, o: number): [number, number] => [p[0] + p[3] * o, p[1] - p[2] * o];
const poly = (pts: [number, number][]) => pts.map((q, i) => `${i ? 'L' : 'M'}${f(q[0])} ${f(q[1])}`).join(' ');

/** Stade 0 : chenille à tubercules d'étoiles, cabrée en point d'interrogation sur un rameau. */
function larva(c: DrawCtx): string {
  const { pal } = c;
  const N = 90;
  const sp = spline([[30, 200], [60, 197], [90, 193], [116, 186], [136, 172], [146, 148], [146, 120], [152, 96], [168, 80], [184, 84]], N);
  const segs = 12, segLen = (N - 6) / segs;
  const R0 = (i: number) => { const t = i / N; return t < 0.06 ? 7 + (t / 0.06) * 6 : t > 0.78 ? 13 - (t - 0.78) / 0.22 * 4 : 13 + Math.sin(t * Math.PI) * 1.2; };
  const R = (i: number) => R0(i) * (0.9 + 0.1 * Math.abs(Math.sin((Math.PI * i) / segLen)));
  const dorsal = sp.map((p, i) => off(p, R(i))), ventral = sp.map((p, i) => off(p, -R(i)));
  const outline = poly(dorsal) + ' ' + poly([...ventral].reverse()).replace(/^M/, 'L') + ' Z';
  let g = twig(c, 'M2 222 C60 212 130 204 220 184', [[188, 190, 34, -40], [14, 220, 30, 200]]);
  g += ground(100, 214, 80);
  // Fausses pattes agrippées au rameau.
  for (const i of [6, 14, 22, 30, 38]) {
    const [x, y] = off(sp[i], -R(i) + 3);
    g += ink(`M${f(x - 4)} ${f(y - 2)} C${f(x - 5)} ${f(y + 8)} ${f(x + 5)} ${f(y + 8)} ${f(x + 4)} ${f(y - 2)} Z`, pal.shade, 1.1) + line(`M${f(x - 3)} ${f(y + 6)} l6 0`, 0.6, pal.light);
  }
  g += ink(outline, pal.body, 1.6);
  // Ventre dans l'ombre, bande latérale claire, dos éclairé.
  const mid = sp.map((p, i) => off(p, -R(i) * 0.15));
  g += shadow(poly(mid) + ' ' + poly([...ventral].reverse()).replace(/^M/, 'L') + ' Z', pal.shade, 0.8, 'fine');
  g += line(poly(sp.slice(4, 84).map((p, i) => off(p, -R(i + 4) * 0.25))), 1.4, pal.belly, ' opacity="0.85"');
  g += rim(poly(sp.slice(3, 86).map((p, i) => off(p, R(i + 3) * 0.75))), pal.light, 1.1);
  // Corne caudale dorée.
  const [hx, hy] = off(sp[7], R(7) - 3);
  g += ink(`M${f(hx - 4)} ${f(hy + 2)} C${f(hx - 6)} ${f(hy - 10)} ${f(hx - 12)} ${f(hy - 18)} ${f(hx - 20)} ${f(hy - 22)} C${f(hx - 12)} ${f(hy - 14)} ${f(hx - 1)} ${f(hy - 8)} ${f(hx + 5)} ${f(hy + 1)} Z`, pal.gold, 1.1);
  // Anneaux des segments + stigmates + tubercules.
  for (let k = 1; k < segs; k++) {
    const i = Math.round((k / segs) * (N - 6));
    const p = sp[i], r = R(i);
    const a = off(p, r), b = off(p, -r), m = [p[0] + p[2] * 4, p[1] + p[3] * 4];
    g += line(`M${f(a[0])} ${f(a[1])} Q${f(m[0])} ${f(m[1])} ${f(b[0])} ${f(b[1])}`, 0.8, '#140F24', ' opacity="0.55"');
    if (k < segs - 2) {
      const sx = off(sp[i + 3], -r * 0.45);
      g += `<ellipse cx="${f(sx[0])}" cy="${f(sx[1])}" rx="1.4" ry="1" fill="#140F24"/><ellipse cx="${f(sx[0])}" cy="${f(sx[1])}" rx="2.2" ry="1.7" fill="none" stroke="${pal.light}" stroke-width="0.6"/>`;
    }
    // Tubercule dorsal (doré) et latéral (accent), garnis de soies.
    const q = sp[i + 3];
    const [tx, ty] = off(q, r + 1.5), big = k > segs - 5 ? 3.6 : 2.6;
    g += `<circle cx="${f(tx)}" cy="${f(ty)}" r="${big}" fill="${k > segs - 5 ? pal.accent : pal.gold}" stroke="#140F24" stroke-width="0.8"/>`;
    for (let j = -2; j <= 2; j++) {
      const ang = Math.atan2(-q[2], q[3]) + j * 0.4;
      g += line(`M${f(tx + Math.cos(ang) * big)} ${f(ty + Math.sin(ang) * big)} l${f(Math.cos(ang) * 3)} ${f(Math.sin(ang) * 3)}`, 0.6);
    }
    g += `<circle cx="${f(tx - 0.8)}" cy="${f(ty - 0.8)}" r="0.8" fill="#FFF6D8"/>`;
    const [lx, ly] = off(q, -r * 0.1);
    if (k % 2 === 0 && k < segs - 1) g += `<circle cx="${f(lx)}" cy="${f(ly)}" r="1.6" fill="${pal.accent2}" stroke="#140F24" stroke-width="0.6"/>`;
  }
  // Vraies pattes (thorax).
  for (const i of [74, 79, 84]) {
    const [x, y] = off(sp[i], -R(i)), p = sp[i];
    g += line(`M${f(x)} ${f(y)} l${f(-p[3] * 5 + p[2] * 1)} ${f(p[2] * 5 + p[3] * 1)} l${f(p[2] * 2)} ${f(p[3] * 2)}`, 1.4);
  }
  // Tête (capsule), penchée vers le bas.
  const h = sp[N];
  g += `<g transform="translate(${f(h[0] + h[2] * 3)} ${f(h[1] + h[3] * 3)}) rotate(${f((Math.atan2(h[3], h[2]) * 180) / Math.PI)})">`
    + ink('M-6 -9 C4 -10 10 -5 10 0 C10 5 4 10 -6 9 C-9 5 -9 -5 -6 -9 Z', pal.deep, 1.4)
    + shadow('M-6 3 C0 6 6 6 10 0 C10 5 4 10 -6 9 Z', '#140F24', 0.5, 'fine')
    + line('M-5 -8 C0 -4 0 4 -5 8', 0.7, pal.light, ' opacity="0.7"')
    + `<circle cx="5" cy="-4" r="1" fill="${pal.glow}"/><circle cx="7" cy="-1.6" r="0.8" fill="${pal.glow}"/><circle cx="3" cy="-6" r="0.7" fill="${pal.glow}"/>`
    + line('M9 2 l3 1 M8 5 l3 2', 0.9) + `</g>`;
  g += speckles(c, 96, 110, 70, 50, 6, pal.glow);
  g += sparkle(42, 120, 3.4, pal.gold, false) + sparkle(196, 46, 3, pal.glow, false);
  return g;
}

export const noctimoth: Species = (c: DrawCtx) => {
  return c.stage <= 0 ? larva(c) : c.stage === 1 ? resting(c) : spread(c);
};

/* ---------- Décor : sous-bois et jardins de lune ---------- */

/** Fleur-de-lune (trompette blanche) sur sa tige. */
function moonflower(x: number, y: number, k: number, a: number, col: string): string {
  return `<g transform="translate(${f(x)} ${f(y)}) rotate(${a}) scale(${k})">`
    + `<path d="M0 0 C-2 -8 -2 -14 0 -20" fill="none" stroke="#140F24" stroke-width="2.4"/><path d="M0 0 C-2 -8 -2 -14 0 -20" fill="none" stroke="${hsl(140, 25, 30)}" stroke-width="1.4"/>`
    + `<path d="M-2 -20 L-10 -36 C-6 -40 6 -40 10 -36 L2 -20 Z" fill="${col}" stroke="#140F24" stroke-width="0.8"/>`
    + `<ellipse cx="0" cy="-37" rx="10" ry="3" fill="#FFF6D8" stroke="#140F24" stroke-width="0.8"/><path d="M0 -22 L0 -36 M-4 -26 L-7 -36 M4 -26 L7 -36" stroke="#140F24" stroke-width="0.4" opacity="0.5"/></g>`;
}

noctimoth.scene = (c: DrawCtx, b: Bounds): string => {
  const { stage, hue } = c;
  const id = `noctimoth-${stage}-bg`;
  const W = b.x1 - b.x0, H = b.y1 - b.y0, sh = 215 + ((((hue * 1.7) % 70) + 70) % 70);
  const top = [hsl(sh, 40, 10), hsl(sh, 25, 34), hsl(sh, 50, 12), hsl(sh + 30, 55, 9)][stage] ?? hsl(sh, 40, 12);
  const bot = [hsl(sh + 40, 40, 14), hsl(36, 45, 62), hsl(sh + 20, 40, 18), hsl(sh - 30, 45, 24)][stage] ?? hsl(sh, 40, 20);
  let s = `<defs><linearGradient id="${id}-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bot}"/></linearGradient></defs>`;
  s += `<rect x="${b.x0}" y="${b.y0}" width="${W}" height="${H}" fill="url(#${id}-g)"/>`;
  for (let i = 0; i < 50; i++) s += `<circle cx="${f(b.x0 + c.r() * W)}" cy="${f(b.y0 + c.r() * H * 0.8)}" r="${f(0.3 + c.r())}" fill="#FFF6D8" opacity="${f((stage === 1 ? 0.1 : 0.3) + c.r() * 0.6)}"/>`;
  if (stage <= 0) {
    // Sous-bois nocturne en gros plan : grandes feuilles en contre-jour, lune entre les branches, bokeh.
    s += `<circle cx="168" cy="54" r="20" fill="${hsl(sh - 40, 40, 86)}" opacity="0.85"/>` + glowDot(168, 54, 50, hsl(sh - 40, 60, 80));
    for (const [x, y, len, a, l] of [[-10, 40, 90, 20, 18], [230, 90, 80, 160, 16], [-6, 150, 70, -10, 20], [120, -10, 70, 70, 14], [200, 10, 60, 120, 18]] as const) {
      const leaf = `M0 0 C${f(len * 0.3)} ${f(-len * 0.3)} ${f(len * 0.75)} ${f(-len * 0.24)} ${len} 0 C${f(len * 0.75)} ${f(len * 0.22)} ${f(len * 0.3)} ${f(len * 0.28)} 0 0 Z`;
      s += `<g transform="translate(${x} ${y}) rotate(${a})"><path d="${leaf}" fill="${hsl(hue + 120, 25, l)}" stroke="#140F24" stroke-width="1"/><path d="M2 0 L${len - 4} 0 M${f(len * 0.3)} 0 l8 -8 M${f(len * 0.5)} 0 l8 -7 M${f(len * 0.3)} 0 l8 8 M${f(len * 0.5)} 0 l8 7" stroke="${hsl(hue + 120, 25, l + 14)}" stroke-width="0.7" fill="none"/></g>`;
    }
    for (let i = 0; i < 8; i++) s += `<circle cx="${f(b.x0 + c.r() * W)}" cy="${f(40 + c.r() * 140)}" r="${f(4 + c.r() * 8)}" fill="${hsl(hue + 60 + c.r() * 80, 60, 70)}" opacity="0.14"/>`;
  } else if (stage === 1) {
    // Aube brumeuse en forêt : troncs estompés en plans successifs.
    for (const [x, w, l, op] of [[30, 10, 60, 0.35], [70, 14, 54, 0.4], [160, 12, 58, 0.35], [200, 18, 50, 0.45], [120, 8, 64, 0.25]] as const) {
      s += `<rect x="${x}" y="${b.y0}" width="${w}" height="${H}" fill="${hsl(sh + 20, 20, l)}" opacity="${op}"/>`;
    }
    for (const [x, w] of [[4, 24], [178, 30]] as const) s += `<rect x="${x}" y="${b.y0}" width="${w}" height="${H}" fill="${hsl(hue + 20, 20, 26)}" stroke="#140F24" stroke-width="1" opacity="0.8"/>` + line(`M${x + 6} ${b.y0} V${b.y1} M${x + w - 8} ${b.y0} V${b.y1}`, 0.6, '#140F24', ' opacity="0.5"');
    s += `<ellipse cx="111" cy="200" rx="160" ry="34" fill="#FFF6E8" opacity="0.25" filter="url(#soft)"/>`;
    for (let i = 0; i < 6; i++) s += line(`M${f(60 + i * 26)} ${b.y0} L${f(10 + i * 30)} ${b.y1}`, 6, '#FFF6D8', ' opacity="0.04"');
  } else if (stage === 2) {
    // Jardin de nuit : grande lune derrière l'insecte, fleurs-de-lune et lianes.
    s += glowDot(111, 96, 120, hsl(sh - 40, 50, 80)) + `<circle cx="111" cy="96" r="66" fill="${hsl(sh - 40, 30, 82)}" opacity="0.5" stroke="#140F24" stroke-width="0.8"/>`;
    s += `<circle cx="86" cy="80" r="12" fill="${hsl(sh - 30, 20, 70)}" opacity="0.4"/><circle cx="134" cy="120" r="8" fill="${hsl(sh - 30, 20, 70)}" opacity="0.4"/><circle cx="130" cy="70" r="5" fill="${hsl(sh - 30, 20, 70)}" opacity="0.4"/>`;
    s += `<path d="M${b.x0} ${b.y1} L${b.x0} 200 C40 190 80 206 120 198 C160 190 190 204 ${b.x1} 196 L${b.x1} ${b.y1} Z" fill="${hsl(hue + 130, 25, 16)}" stroke="#140F24" stroke-width="1"/>`;
    s += line('M0 120 C20 140 10 170 30 200 M222 110 C200 140 216 170 196 200', 1.6, hsl(hue + 130, 25, 30));
    for (const [x, y, k, a] of [[20, 210, 0.9, -10], [44, 220, 0.7, 12], [190, 206, 1, 8], [206, 220, 0.7, -14], [6, 160, 0.7, 30], [214, 150, 0.7, -30]] as const) s += moonflower(x, y, k, a, hsl(hue + 40, 30, 88));
  } else {
    // Au-dessus des nuages, aurores et nuée de petites phalènes en spirale.
    for (let k = 0; k < 3; k++) {
      let d = `M${b.x0} ${30 + k * 22}`;
      for (let i = 1; i <= 6; i++) d += ` Q${f(b.x0 + (i - 0.5) * W / 6)} ${f(20 + k * 22 + (i % 2 ? -14 : 14))} ${f(b.x0 + i * W / 6)} ${f(30 + k * 22)}`;
      s += `<path d="${d}" fill="none" stroke="${hsl(hue + 100 + k * 50, 70, 62)}" stroke-width="${12 - k * 3}" opacity="0.25" filter="url(#soft)"/>`;
    }
    for (let k = 0; k < 3; k++) {
      const y = 190 + k * 16;
      s += `<path d="M${b.x0} ${b.y1} L${b.x0} ${y} ${Array.from({ length: 6 }, (_, i) => `q${f(W / 12)} ${-14 + (i % 2) * 5} ${f(W / 6)} 0`).join(' ')} L${b.x1} ${b.y1} Z" fill="${hsl(sh - 10 + k * 10, 25, 34 + k * 10)}" stroke="#140F24" stroke-width="0.8" opacity="${f(0.6 + k * 0.15)}"/>`;
    }
    for (let i = 0; i < 14; i++) {
      const a = i * 0.9, r = 70 + i * 4, x = 111 + Math.cos(a) * r, y = 110 + Math.sin(a) * r * 0.6;
      s += `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(a * 57)}) scale(0.5)" opacity="0.7"><path d="M0 0 C-8 -10 -16 -8 -14 0 C-12 4 -6 4 0 0 C6 4 12 4 14 0 C16 -8 8 -10 0 0 Z" fill="${hsl(hue + 40, 50, 80)}" stroke="#140F24" stroke-width="1"/></g>`;
    }
  }
  return s;
};
