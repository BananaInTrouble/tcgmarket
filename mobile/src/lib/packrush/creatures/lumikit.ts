import { aura, constellation, eyeA, fur, gild, ground, ink, line, rim, shadow, sparkle, speckles, type DrawCtx, type Species } from './style.ts';

/**
 * Lumikit → Lunaréon → Selenvulpe → Astravulpe : renard des comètes dont la queue est une nébuleuse (pointe = tête
 * de comète). Planche naturaliste : renardeau assis, sub-adulte au trot, adulte assis, éveillé constellé d'or.
 */


type Chain = number[];
/** Point d'une chaîne de cubiques [x0 y0, c1 c2 p, c1 c2 p…] au paramètre t du segment k. */
function bz(ch: Chain, k: number, t: number): [number, number, number, number] {
  const o = k * 6, [x0, y0, x1, y1, x2, y2, x3, y3] = ch.slice(o, o + 8), u = 1 - t;
  const x = u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3;
  const y = u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3;
  const dx = 3 * u * u * (x1 - x0) + 6 * u * t * (x2 - x1) + 3 * t * t * (x3 - x2);
  const dy = 3 * u * u * (y1 - y0) + 6 * u * t * (y2 - y1) + 3 * t * t * (y3 - y2);
  const l = Math.hypot(dx, dy) || 1;
  return [x, y, dx / l, dy / l];
}
const f1 = (v: number) => v.toFixed(1);
/** Bord en mèches de poils le long d'une chaîne (côté gauche du sens de parcours si side=1). Renvoie des segments « Q… » sans M. */
function tufts(ch: Chain, per: number, amp: number, side = 1, sweep = 0.5): string {
  const segs = (ch.length - 2) / 6;
  let d = '';
  const N = segs * per;
  for (let i = 0; i < N; i++) {
    const k0 = Math.floor(i / per), t0 = (i % per) / per, t1 = ((i % per) + 1) / per;
    const [ax, ay] = bz(ch, k0, t0), [bx, by, tx, ty] = bz(ch, k0, t1);
    const [mx, my, mtx, mty] = bz(ch, k0, (t0 + t1) / 2);
    const a = amp * [1, 0.6, 1.35, 0.8, 1.1][i % 5];
    const nx = mty * side, ny = -mtx * side;
    const tipx = mx + nx * a + mtx * a * sweep, tipy = my + ny * a + mty * a * sweep;
    d += ` Q${f1(ax + nx * a * 0.7)} ${f1(ay + ny * a * 0.7)} ${f1(tipx)} ${f1(tipy)} Q${f1(mx + nx * a * 0.15 + tx * 0)} ${f1(my + ny * a * 0.15)} ${f1(bx)} ${f1(by)}`;
  }
  return d;
}
/** Chaîne → « C… » (sans M). */
const curve = (ch: Chain) => { let d = ''; for (let o = 2; o < ch.length; o += 6) d += ` C${ch.slice(o, o + 6).join(' ')}`; return d; };
/** Lueur sans filtre (cercles concentriques). */
const glowDot = (x: number, y: number, r: number, col: string) => [1, 0.7, 0.45, 0.25].map((k) => `<circle cx="${x}" cy="${y}" r="${f1(r / k * 0.5)}" fill="${col}" opacity="${(0.22 * k).toFixed(2)}"/>`).join('');

/** Intérieur de nébuleuse découpé dans `d` (queue). */
function nebula(c: DrawCtx, id: string, d: string, blobs: [number, number, number, number, string, number][], stars: [number, number, number, number, number]): string {
  let s = `<clipPath id="${id}"><path d="${d}"/></clipPath><g clip-path="url(#${id})"><path d="${d}" fill="${c.pal.deep}"/>`;
  for (const [x, y, rx, ry, col, op] of blobs) s += `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${col}" opacity="${op}" filter="url(#soft)"/>`;
  s += speckles(c, stars[0], stars[1], stars[2], stars[3], stars[4]);
  return s + `</g>`;
}

function adult(c: DrawCtx): string {
  const { pal, stage } = c;
  const id = `lumikit-${stage}`;
  const woke = stage >= 3;
  let g = '';
  if (woke) g += aura(122, 112, 92, pal.glow);
  g += ground(122, 205, 78);

  // Queue-comète : panache touffu qui s'élève derrière le dos, pointe = tête de comète.
  const outer: Chain = [152, 198, 192, 206, 214, 174, 210, 134, 206, 98, 194, 66, 168, 38];
  const inner: Chain = [168, 38, 176, 64, 180, 94, 176, 124, 172, 150, 166, 166, 150, 180];
  const tail = `M152 198${tufts(outer, 9, 3.6, -1, 1)}${tufts(inner, 7, 3, -1, -1)} Z`;
  g += nebula(c, `${id}-t`, tail, [
    [196, 150, 22, 30, pal.accent, 0.6], [190, 96, 16, 26, pal.accent2, 0.55], [174, 50, 16, 18, '#FFF6D8', 0.95], [196, 190, 20, 12, pal.shade, 0.9],
  ], [190, 120, 20, 72, 20 + stage * 5]);
  g += shadow(`M152 198 C192 206 214 174 210 134 C210 160 196 184 168 190 Z`, pal.deep, 0.45, 'xhatch');
  g += ink(tail, 'none', 1.6);
  g += line(`M160 194 C190 196 206 170 204 136 M200 120 C198 96 190 74 176 52 M186 168 C196 150 196 130 192 112 M188 96 C186 80 180 64 172 48`, 0.7, pal.light, ' opacity="0.55"');
  g += rim('M172 44 C178 66 182 94 178 122', pal.glow, 1);
  g += constellation([[196, 172], [202, 142], [194, 114], [186, 86], [174, 56]], woke ? pal.gold : '#FFF6D8');
  g += glowDot(171, 44, 9, '#FFF6D8') + sparkle(171, 43, 5.5, '#FFF6D8', false);

  // Patte avant lointaine (dans l'ombre).
  g += ink('M101 148 L102 198 C99 200 97 202 97 205 L110 205 C110 201 108 196 108 190 L111 146 Z', pal.deep, 1.3);
  // Corps.
  const body = 'M90 100 C80 110 74 124 76 138 C78 146 82 150 86 152 L88 204 L146 205 C160 205 166 194 164 178 C162 156 154 134 142 118 C132 106 124 88 118 72 L104 76 Z';
  g += ink(body, pal.body, 1.8);
  g += shadow('M164 178 C162 156 154 134 142 118 C146 136 150 152 150 170 C150 186 142 198 132 205 L146 205 C160 205 166 194 164 178 Z', pal.shade, 0.85, 'fine');
  g += shadow('M88 204 C96 186 108 176 122 176 C116 188 120 198 126 205 Z', pal.shade, 0.8, 'xhatch');
  // Épaule, cuisse.
  g += line('M100 116 C108 126 110 140 106 152', 1.1) + shadow('M106 152 C110 140 108 126 100 116 C112 124 116 140 112 156 Z', pal.shade, 0.45, 'fine');
  g += line('M122 198 C112 180 118 154 138 148 C152 144 162 156 164 170', 1.2);
  g += shadow('M122 198 C114 182 116 164 128 154 C126 170 128 184 136 198 Z', pal.shade, 0.5, 'fine');
  g += fur(c, 146, 152, 8, 60, 5, 10) + fur(c, 132, 114, 9, 50, 4, 10) + fur(c, 154, 184, 8, 90, 3, 8) + fur(c, 112, 98, 8, 70, 3, 6) + fur(c, 124, 130, 8, 75, 3, 8);
  g += rim('M118 72 C124 88 132 106 142 118 C154 134 162 156 164 172', pal.light, 1.1);
  // Patte arrière posée à plat.
  g += ink('M112 205 C106 205 105 200 110 197.5 C118 196.5 128 196 136 197 C141 199 141 204 136 205 Z', pal.shade, 1.3);
  g += line('M116 205 L117 201 M121 205 L122 201', 0.8, pal.light);
  // Plastron clair, bord en mèches.
  g += ink('M90 100 C80 110 74 124 76 138 C77 146 82 152 89 158 C90 150 94 144 97 140 L101 135 L97 129 L102 123 L98 117 L102 111 L99 105 Z', pal.belly, 1.1);
  g += fur(c, 84, 140, 8, 95, 4, 5, pal.shade) + fur(c, 92, 120, 8, 110, 4, 6, pal.shade);
  g += rim('M88 102 C79 112 74 124 76 138', '#FFF6D8', 1.2);
  // Patte avant proche (fine, poignet marqué), chaussette sombre.
  g += ink('M84 146 C85 164 86 184 84 198 C80 199 75 202 75 205 L92 205 C93 202 92 198 92 194 C93 180 95 162 98 146 Z', pal.body, 1.5);
  g += ink('M85.5 178 C86 188 85.5 194 84 198 C80 199 75 202 75 205 L92 205 C93 202 92 198 92 194 C92.5 188 93 182 93.6 178 C90 176 88 176 85.5 178 Z', pal.deep, 1.2);
  g += line('M80 205 L81 201.5 M85 205 L85.5 201.5', 0.8, pal.light);
  g += rim('M85 150 C85.5 160 86 170 86 178', pal.light, 1);
  g += shadow('M98 146 C95 162 93 176 93.6 178 C92 170 91 160 92 148 Z', pal.shade, 0.6, 'fine');

  // Oreille lointaine.
  g += ink('M98 62 C93 46 93 30 97 16 C106 24 112 40 113 58 Z', pal.deep, 1.5);
  // Tête.
  const head = 'M46 84 C56 80 66 76 76 70 C82 62 92 56 104 56 C114 56 122 64 122 76 C122 86 118 94 112 100 L114 106 L104 105 L106 110 L94 107 C84 104 72 99 62 96 C56 94 50 92 46 90 C43 88 43 86 46 84 Z';
  g += ink(head, pal.body, 1.8);
  g += shadow('M122 76 C122 86 118 94 112 100 L114 106 L104 105 C110 96 114 86 112 72 C110 64 106 60 104 56 C114 56 122 64 122 76 Z', pal.shade, 0.75, 'fine');
  g += ink('M47 89 C56 90 66 88 76 86 C88 84 98 90 106 100 L110 105 L102 105 L105 109 L94 107 C84 104 72 99 62 96 C56 95 50 93 47 89 Z', pal.belly, 1);
  g += ink('M106 62 C110 46 118 32 129 22 C133 38 132 54 124 72 Z', pal.body, 1.6);
  g += ink('M110 60 C114 48 120 38 127 30 C129 42 127 54 121 66 Z', pal.deep, 0);
  g += fur(c, 117, 60, 9, -70, 4, 6, pal.light, 0.8);
  g += ink('M40 84 C42 80 49 80 51 83 C50 88 44 89 41 87 Z', pal.ink, 0);
  g += line('M48 90 C55 92 61 92 66 92', 1);
  g += line('M60 82 C66 80 72 76 76 72', 0.8, pal.shade);
  g += eyeA(78, 72, 6.5, pal.eye, { angle: -16 });
  g += line('M72 78 C70 84 66 88 62 90', 0.9, pal.ink);
  g += fur(c, 98, 76, 7, 150, 4, 8, pal.shade) + fur(c, 116, 98, 7, 100, 3, 6);
  g += rim('M46 84 C56 80 66 76 76 70 C82 62 92 56 104 56', pal.glow, 1.2);
  g += rim('M108 60 C112 46 118 34 128 23', pal.light, 0.9);

  // Marques célestes.
  if (stage >= 2) g += gild('M92 62 a5 5 0 1 0 8 -3 a4 4 0 1 1 -8 3 Z', 1.1);
  g += constellation([[140, 160], [150, 170], [146, 184], [158, 190]], pal.gold);
  if (woke) {
    g += gild('M84 76 C90 80 96 80 100 76 M86 82 C92 88 100 88 104 84', 1) + gild('M128 132 c10 -6 22 -2 24 8 c2 10 -10 14 -14 6', 1.2);
    g += gild('M84 120 l4 -6 l4 6 l-4 6 Z M86 140 l3 -4 l3 4 l-3 4 Z', 1);
    g += glowDot(78, 72, 12, pal.eye);
    g += constellation([[24, 48], [40, 36], [58, 44], [66, 28]], pal.gold);
    for (const [x, y, z] of [[30, 120, 4], [56, 160, 3], [140, 26, 3.5], [36, 190, 3]] as const) g += sparkle(x, y, z, pal.glow, false);
  }
  return g;
}

export const lumikit: Species = (c) => {
  return `<g transform="translate(116 205) scale(0.95) translate(-116 -205)">${adult(c)}</g>`;
};
