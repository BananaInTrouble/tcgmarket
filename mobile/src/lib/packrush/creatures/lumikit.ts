import { hsl, speckles, type Bounds, type DrawCtx, type Species } from './style.ts';
import { begin, unink, aura, constellation, eyeA, fur, gild, ground, ink, line, rim, shadow, sparkle } from './lumen.ts';

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

/** Stade 0 : renardeau endormi, enroulé, la queue-nébuleuse ramenée sur le museau. */
function sleeper(c: DrawCtx): string {
  const { pal } = c;
  const id = 'lumikit-0';
  let g = ground(112, 206, 82);
  const back: Chain = [44, 194, 40, 166, 66, 140, 106, 136, 146, 132, 184, 150, 188, 180];
  const body = `M44 194${tufts(back, 9, 2.6, 1, 0.4)} C190 198 176 206 150 206 L60 206 C50 206 45 202 44 194 Z`;
  g += ink(body, pal.body, 1.8);
  g += shadow('M188 180 C190 198 176 206 150 206 L120 206 C150 200 168 188 170 168 C172 156 166 146 160 140 C176 148 186 162 188 180 Z', pal.shade, 0.85, 'fine');
  g += line('M146 150 C170 160 176 186 160 204', 1.1) + shadow('M146 150 C160 158 166 176 160 196 C150 180 148 164 146 150 Z', pal.shade, 0.45, 'fine');
  g += fur(c, 130, 146, 7, 80, 5, 12) + fur(c, 98, 146, 6, 90, 4, 10) + fur(c, 170, 170, 6, 100, 3, 6);
  g += rim('M48 170 C56 150 76 140 106 136 C140 132 170 140 182 156', pal.light, 1.1);
  // Oreilles couchées.
  g += ink('M100 156 C110 146 122 142 134 142 C128 150 120 158 110 162 Z', pal.deep, 1.3);
  g += ink('M92 154 C100 140 112 134 126 132 C122 142 114 152 104 158 Z', pal.body, 1.4) + ink('M98 152 C104 144 112 139 120 137 C117 143 112 149 105 153 Z', pal.deep, 0);
  // Tête posée, yeux clos.
  const head = 'M44 182 C50 174 60 166 72 158 C82 150 98 148 108 154 C118 160 118 176 108 184 C98 192 76 194 58 192 C50 191 45 188 44 185 Z';
  g += ink(head, pal.body, 1.7);
  g += shadow('M108 154 C118 160 118 176 108 184 C102 188 94 190 86 191 C100 182 106 170 104 158 Z', pal.shade, 0.7, 'fine');
  g += ink('M45 186 C50 190 58 192 66 191 C60 188 53 186 47 183 Z', pal.belly, 0.8);
  g += ink('M39 182 C41 178 47 178 49 181 C48 185 43 186 40 185 Z', pal.ink, 0);
  g += line('M66 168 Q73 173 81 168', 1.4) + line('M68 171 l-1 2 M72 172.5 l-0.4 2.2 M76 172 l0.4 2.2', 0.7);
  g += line('M60 164 C66 160 74 159 82 161', 0.8, pal.shade) + fur(c, 96, 170, 6, 150, 4, 8, pal.shade);
  g += rim('M44 182 C50 174 60 166 72 158 C82 150 98 148 108 154', pal.glow, 1.1);
  g += sparkle(92, 160, 2.6, pal.gold, false);
  // Queue enroulée par-dessus les pattes, pointe sous le museau.
  const low: Chain = [184, 184, 178, 206, 140, 214, 100, 214, 70, 214, 46, 210, 34, 200];
  const tail = `M184 184${tufts(low, 9, 2.6, 1, 0.6)} C30 194 34 188 42 190 C60 198 90 200 120 198 C150 196 172 190 184 184 Z`;
  g += nebula(c, `${id}-t`, tail, [[70, 206, 26, 8, pal.accent, 0.6], [130, 206, 24, 7, pal.accent2, 0.5], [40, 198, 10, 8, '#FFF6D8', 0.9]], [110, 206, 66, 7, 16]);
  g += ink(tail, 'none', 1.6) + rim('M176 188 C150 196 120 198 90 199 C70 198 54 194 44 190', pal.glow, 0.9);
  g += glowDot(40, 198, 6, '#FFF6D8') + sparkle(39, 197, 3.4, '#FFF6D8', false);
  return g;
}

/** Tête adulte de profil trois-quarts (nez vers (46, 84)). */
function foxHead(c: DrawCtx): string {
  const { pal } = c;
  let g = '';
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

  return g;
}

/** Stade 1 : sub-adulte debout, à l'arrêt, patte avant levée ; queue basse qui remonte en comète. */
function young(c: DrawCtx): string {
  const { pal } = c;
  const id = 'lumikit-1';
  let g = ground(122, 205, 84);
  // Queue pendante, touffue, dont la pointe-comète frôle le sol.
  const outer: Chain = [174, 102, 198, 102, 216, 120, 218, 148, 220, 174, 210, 196, 188, 201];
  const inner: Chain = [188, 201, 192, 186, 190, 168, 186, 152, 184, 140, 180, 132, 172, 128];
  const tail = `M174 104${tufts(outer, 8, 3.2, -1, 1)}${tufts(inner, 7, 2.4, -1, -1)} Z`;
  g += nebula(c, `${id}-t`, tail, [[204, 140, 12, 22, pal.accent, 0.6], [200, 176, 10, 14, pal.accent2, 0.55], [194, 196, 10, 8, '#FFF6D8', 0.95], [190, 110, 16, 10, pal.shade, 0.9]], [202, 150, 12, 40, 16]);
  g += ink(tail, 'none', 1.6) + line('M184 110 C200 114 208 132 208 156 C208 174 204 186 196 194', 0.7, pal.light, ' opacity="0.55"');
  g += constellation([[192, 116], [204, 132], [206, 156], [202, 178]]);
  g += glowDot(194, 196, 7, '#FFF6D8') + sparkle(193, 195, 4.5, '#FFF6D8', false);
  // Pattes lointaines (dans l'ombre).
  g += ink('M100 142 C101 160 101 172 100 182 C100 190 99 196 98 199 C95 200 93 202 93 205 L106 205 C106 202 105 199 106 196 C107 188 108 180 108 170 L111 142 Z', pal.shade, 1.2);
  g += shadow('M100 142 C101 160 101 172 100 182 C100 190 99 196 98 199 C95 200 93 202 93 205 L106 205 C106 202 105 199 106 196 C107 188 108 180 108 170 L111 142 Z', pal.deep, 0.5, 'xhatch');
  g += ink('M146 136 C148 152 152 166 156 176 L151 199 C148 200 145 202 145 205 L157 205 C158 200 160 192 164 180 C163 166 161 150 159 136 Z', pal.shade, 1.2);
  g += shadow('M146 136 C148 152 152 166 156 176 L151 199 C148 200 145 202 145 205 L157 205 C158 200 160 192 164 180 C163 166 161 150 159 136 Z', pal.deep, 0.5, 'xhatch');
  // Corps : poitrail profond, ventre qui remonte vers les hanches.
  const body = 'M84 98 C70 108 66 124 72 140 C80 152 100 154 116 150 C132 146 148 142 162 138 C176 134 184 122 182 110 C180 98 170 92 158 94 C144 96 132 102 120 98 C114 94 110 84 110 72 L96 80 Z';
  g += ink(body, pal.body, 1.8);
  g += shadow('M72 140 C80 152 100 154 116 150 C132 146 148 142 162 138 C148 138 138 136 122 140 C104 144 88 144 72 140 Z', pal.shade, 0.85, 'xhatch');
  g += shadow('M120 98 C132 102 144 96 158 94 C170 92 180 98 182 110 C168 104 150 104 134 108 C126 108 122 104 120 98 Z', pal.shade, 0.55, 'fine');
  g += line('M90 104 C100 112 104 126 100 140', 1.1) + shadow('M100 140 C104 126 100 112 90 104 C104 110 112 126 108 142 Z', pal.shade, 0.45, 'fine');
  g += fur(c, 128, 112, 8, 80, 3, 6) + fur(c, 112, 110, 7, 70, 3, 5) + fur(c, 138, 138, 6, 100, 3, 6, pal.light) + fur(c, 156, 104, 7, 70, 3, 6);
  g += rim('M120 98 C132 102 144 96 158 94 C170 92 180 98 182 110', pal.light, 1.1);
  // Plastron.
  g += ink('M84 98 C70 108 66 124 72 140 C76 145 82 147 88 146 C88 138 90 132 92 126 L88 120 L94 115 L89 109 L94 103 Z', pal.belly, 1.1);
  g += fur(c, 80, 130, 7, 95, 3, 5, pal.shade);
  g += rim('M82 100 C70 110 66 124 70 134', '#FFF6D8', 1.1);
  // Patte arrière proche.
  g += ink('M146 118 C148 132 152 146 158 154 C162 162 166 170 168 178 L166 198 C163 200 160 202 160 205 L175 205 C176 200 176 194 176 184 L178 176 C182 168 182 158 180 148 C182 136 182 120 174 110 C166 104 154 108 146 118 Z', pal.body, 1.6);
  g += shadow('M180 148 C182 158 182 168 178 176 L176 184 C174 172 172 160 168 152 C174 150 178 146 180 148 Z', pal.shade, 0.8, 'fine');
  g += ink('M167 186 L166 198 C163 200 160 202 160 205 L175 205 C176 200 176 194 176 186 Z', pal.deep, 1.1);
  g += line('M154 124 C164 122 172 128 174 140', 0.9) + fur(c, 164, 130, 7, 80, 3, 8);
  g += rim('M147 120 C149 134 153 146 159 154', pal.light, 0.9);
  // Patte avant proche levée : avant-bras à l'horizontale, patte pendante.
  g += ink('M84 128 C86 138 88 144 86 148 C80 150 72 150 68 152 C64 154 62 160 62 166 C62 172 64 178 67 180 C70 182 73 179 71 175 C69 170 69 164 72 160 C78 158 88 160 96 160 C102 158 106 152 104 142 L102 128 Z', pal.body, 1.5);
  g += ink('M70 151 C66 152 63 156 62 162 C62 170 64 178 67 180 C70 182 73 179 71 175 C69 170 69 164 72 160 C71.5 157 71 154 70 151 Z', pal.deep, 1.1);
  g += shadow('M72 160 C78 158 88 160 96 160 C102 158 106 152 104 142 C102 150 96 154 86 154 C80 154 76 156 72 160 Z', pal.shade, 0.6, 'fine');
  g += rim('M84 130 C86 138 88 144 86 148 C80 150 72 150 68 152', pal.light, 1);
  // Tête un peu plus fine que l'adulte.
  g += `<g transform="translate(110 96) scale(0.86) translate(-112 -100)">${foxHead(c)}${sparkle(97, 60, 3.2, pal.gold, false)}</g>`;
  // Hautes herbes au premier plan, devant les pattes.
  for (const [x, h, bd] of [[58, 30, -6], [88, 22, 5], [112, 34, -8], [134, 20, 6], [150, 28, -4], [186, 26, 7], [200, 34, -5]] as const) g += blade(x, 208, h, bd, hsl(c.hue + 80, 28, 30));
  return g;
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

  // Tête (levée vers le ciel, en plein chant, chez l'éveillé) et marques célestes du visage.
  let hd = foxHead(c);
  if (stage >= 2) hd += gild('M92 62 a5 5 0 1 0 8 -3 a4 4 0 1 1 -8 3 Z', 1.1);
  if (woke) {
    hd += gild('M84 76 C90 80 96 80 100 76 M86 82 C92 88 100 88 104 84', 1) + glowDot(78, 72, 12, pal.eye) + gild('M106 62 C110 46 118 32 129 22', 1.1);
    for (const [x, y, z] of [[100, 40, 3.2], [112, 30, 4.2], [124, 14, 3.2]] as const) hd += sparkle(x, y, z, pal.gold, false);
    // Souffle d'étoiles qui s'échappe du museau.
    hd += line('M40 82 C30 76 24 66 22 56 M42 88 C30 86 20 80 14 72', 0.9, pal.glow, ' opacity="0.8" stroke-dasharray="2 3"');
    for (const [x, y, z] of [[22, 50, 3], [12, 66, 2.4], [30, 70, 2]] as const) hd += sparkle(x, y, z, pal.glow, false);
  }
  g += woke ? `<g transform="rotate(26 116 100)">${hd}</g>` : hd;
  g += constellation([[140, 160], [150, 170], [146, 184], [158, 190]], pal.gold);
  if (woke) {
    g += gild('M128 132 c10 -6 22 -2 24 8 c2 10 -10 14 -14 6', 1.2) + gild('M84 120 l4 -6 l4 6 l-4 6 Z M86 140 l3 -4 l3 4 l-3 4 Z', 1);
    g += gild('M118 72 C124 88 132 106 142 118 C154 134 162 156 164 172', 1.3) + gild('M210 134 C214 160 200 186 170 194', 1.2);
    g += gild('M90 150 c-6 -6 -6 -16 2 -20 c-4 6 -2 14 4 18 Z', 1);
    for (const [x, y, z] of [[30, 120, 4], [56, 160, 3], [140, 26, 3.5], [36, 190, 3]] as const) g += sparkle(x, y, z, pal.glow, false);
  }
  return g;
}

const draw = (c: DrawCtx): string => {
  const k = [1.08, 0.97, 0.95, 0.95, 0.95][c.stage] ?? 0.95;
  return `<g transform="translate(114 205) scale(${k}) translate(-114 -205)">${c.stage === 0 ? sleeper(c) : c.stage === 1 ? young(c) : adult(c)}</g>`;
};

/* ---------- Décor : plaines et cimes des comètes ---------- */

/** Brin d'herbe haute (trait plein effilé). */
const blade = (x: number, y: number, h: number, bend: number, col: string, op = 1) =>
  `<path d="M${f1(x - 1.6)} ${f1(y)} Q${f1(x + bend * 0.4)} ${f1(y - h * 0.6)} ${f1(x + bend)} ${f1(y - h)} Q${f1(x + bend * 0.4 + 1)} ${f1(y - h * 0.55)} ${f1(x + 1.6)} ${f1(y)} Z" fill="${col}" stroke="#140F24" stroke-width="0.5" opacity="${op}"/>`;

function cometSky(c: DrawCtx, b: Bounds, id: string, top: string, bot: string, stars: number): string {
  const W = b.x1 - b.x0, H = b.y1 - b.y0;
  let s = `<defs><linearGradient id="${id}-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bot}"/></linearGradient></defs>`;
  s += `<rect x="${b.x0}" y="${b.y0}" width="${W}" height="${H}" fill="url(#${id}-g)"/>`;
  for (let i = 0; i < stars; i++) s += `<circle cx="${f1(b.x0 + c.r() * W)}" cy="${f1(b.y0 + c.r() * H * 0.75)}" r="${f1(0.3 + c.r() * 1.1)}" fill="#FFF6D8" opacity="${f1(0.25 + c.r() * 0.7)}"/>`;
  return s;
}

const sceneRaw = (c: DrawCtx, b: Bounds): string => {
  const { stage, hue } = c;
  const id = `lumikit-${stage}-bg`;
  const W = b.x1 - b.x0, sh = 215 + ((((hue * 1.7) % 70) + 70) % 70);
  let s = '';
  if (stage <= 0) {
    // Terrier sous les racines : voûte de terre, ouverture sur la nuit et une étoile filante, mousse, champignons.
    s += cometSky(c, b, id, hsl(sh, 45, 14), hsl(sh + 20, 40, 22), 40);
    s += line('M150 30 L196 14', 1.2, '#FFF6D8', ' opacity="0.8"') + sparkle(150, 30, 3, '#FFF6D8', false);
    const earth = hsl(hue + 25, 25, 14), earth2 = hsl(hue + 25, 22, 20);
    s += `<path d="M${b.x0} ${b.y0} L${b.x1} ${b.y0} L${b.x1} ${b.y1} L${b.x0} ${b.y1} Z M24 236 C10 160 30 70 111 60 C192 70 214 160 200 236 Z" fill="${earth}" fill-rule="evenodd" stroke="#140F24" stroke-width="1.4"/>`;
    s += `<path d="M24 236 C14 170 32 84 111 72 C190 84 210 170 200 236" fill="none" stroke="${earth2}" stroke-width="8" opacity="0.8"/>`;
    for (const d of ['M22 150 C26 110 50 80 90 70 C100 68 108 72 112 80', 'M200 160 C198 120 180 90 140 74 C128 70 120 74 116 84', 'M60 90 C66 100 64 112 70 122', 'M164 92 C158 104 162 114 156 124', 'M100 70 C98 80 102 88 98 96']) s += line(d, 4.4, '#140F24', ' opacity="0.9"') + line(d, 2.6, hsl(hue + 25, 25, 32));
    s += `<path d="M${b.x0} ${b.y1} L${b.x0} 204 C50 196 170 196 ${b.x1} 204 L${b.x1} ${b.y1} Z" fill="${hsl(hue + 110, 30, 22)}" stroke="#140F24" stroke-width="1"/>`;
    for (let i = 0; i < 30; i++) s += `<circle cx="${f1(b.x0 + c.r() * W)}" cy="${f1(204 + c.r() * 30)}" r="${f1(1 + c.r() * 2)}" fill="${hsl(hue + 110, 35, 34)}" opacity="0.8"/>`;
    for (const [x, y, k] of [[22, 206, 1], [32, 210, 0.7], [200, 204, 0.9]] as const) {
      s += `<g transform="translate(${x} ${y}) scale(${k})"><path d="M-1.5 0 L-1 -10 L1 -10 L1.5 0 Z" fill="${hsl(hue + 40, 30, 80)}" stroke="#140F24" stroke-width="0.6"/><path d="M-8 -9 C-7 -17 7 -17 8 -9 Z" fill="${hsl(hue + 160, 60, 60)}" stroke="#140F24" stroke-width="0.7"/></g>` + glowDot(x, y - 12 * k, 8 * k, hsl(hue + 160, 80, 70));
    }
  } else if (stage === 1) {
    // Prairie au crépuscule : collines, hautes herbes, lucioles, souris-étoile dans l'herbe.
    s += cometSky(c, b, id, hsl(sh - 20, 40, 22), hsl(hue + 20, 55, 58), 26);
    s += `<circle cx="168" cy="160" r="40" fill="${hsl(hue + 30, 80, 80)}" opacity="0.35" filter="url(#soft)"/>`;
    s += `<path d="M${b.x0} 170 C40 150 90 160 130 152 C170 144 200 156 ${b.x1} 150 L${b.x1} ${b.y1} L${b.x0} ${b.y1} Z" fill="${hsl(sh + 30, 25, 38)}" opacity="0.7"/>`;
    s += `<path d="M${b.x0} 190 C60 178 120 186 ${b.x1} 176 L${b.x1} ${b.y1} L${b.x0} ${b.y1} Z" fill="${hsl(hue + 80, 25, 22)}" stroke="#140F24" stroke-width="0.8"/>`;
    for (let i = 0; i < 40; i++) { const x = b.x0 + (i / 40) * W + c.r() * 4; s += blade(x, 200 + c.r() * 10, 26 + c.r() * 34, (c.r() - 0.5) * 18, hsl(hue + 80, 28, 28 + c.r() * 12), 0.9); }
    // Souris-étoile, proie du jeune renard.
    s += `<g transform="translate(30 196)"><path d="M0 0 C0 -7 10 -9 14 -3 L18 -2 L14 1 C10 3 2 3 0 0 Z" fill="${hsl(hue + 40, 25, 70)}" stroke="#140F24" stroke-width="0.8"/><circle cx="10" cy="-6" r="2.2" fill="${hsl(hue + 40, 25, 70)}" stroke="#140F24" stroke-width="0.6"/><circle cx="14" cy="-3" r="0.7" fill="#140F24"/><path d="M0 0 C-6 2 -10 -2 -14 -6" fill="none" stroke="#140F24" stroke-width="0.8"/></g>`;
    for (const [x, y] of [[24, 120], [60, 150], [190, 110], [176, 190], [150, 130]] as const) s += glowDot(x, y, 6, hsl(hue + 60, 90, 75)) + `<circle cx="${x}" cy="${y}" r="1.2" fill="#FFF6D8"/>`;
  } else if (stage === 2) {
    // Promontoire rocheux sous une grande comète.
    s += cometSky(c, b, id, hsl(sh, 50, 9), hsl(sh + 20, 40, 24), 70);
    s += `<path d="M20 20 C60 34 100 50 140 80" fill="none" stroke="${hsl(hue + 180, 60, 80)}" stroke-width="10" opacity="0.18" filter="url(#soft)"/>` + line('M24 22 C60 34 100 50 138 78', 1, '#FFF6D8', ' opacity="0.6"') + glowDot(140, 80, 10, '#FFF6D8') + sparkle(140, 80, 4, '#FFF6D8', false);
    s += `<path d="M${b.x0} 170 L30 140 L52 156 L84 118 L110 150 L140 128 L170 160 L196 136 L${b.x1} 158 L${b.x1} ${b.y1} L${b.x0} ${b.y1} Z" fill="${hsl(sh + 10, 25, 30)}" stroke="#140F24" stroke-width="0.8" opacity="0.75"/>`;
    s += `<path d="M84 118 L92 128 L88 134 M140 128 L148 136" fill="none" stroke="${hsl(sh, 30, 80)}" stroke-width="1" opacity="0.6"/>`;
    s += ink(`M${b.x0} 214 C30 204 60 200 90 202 C130 204 180 196 ${b.x1} 202 L${b.x1} ${b.y1} L${b.x0} ${b.y1} Z`, hsl(hue + 30, 15, 26), 1.4);
    s += shadow(`M${b.x0} 226 C60 216 140 220 ${b.x1} 214 L${b.x1} ${b.y1} L${b.x0} ${b.y1} Z`, hsl(hue + 30, 20, 14), 0.7, 'xhatch');
    s += line('M40 206 l10 8 M150 204 l-8 10 l6 8', 0.8, '#140F24') + rim(`M${b.x0} 214 C30 204 60 200 90 202 C130 204 180 196 ${b.x1} 202`, hsl(sh - 20, 40, 70), 1);
  } else {
    // Cime enneigée sous les aurores.
    s += cometSky(c, b, id, hsl(sh + 20, 55, 8), hsl(sh - 20, 45, 22), 70);
    for (let k = 0; k < 3; k++) {
      const col = hsl(hue + 120 + k * 40, 70, 60);
      let d = `M${b.x0} ${40 + k * 18}`;
      for (let i = 1; i <= 8; i++) d += ` Q${f1(b.x0 + (i - 0.5) * W / 8)} ${f1(30 + k * 18 + (i % 2 ? -16 : 16))} ${f1(b.x0 + i * W / 8)} ${f1(40 + k * 18)}`;
      s += `<path d="${d}" fill="none" stroke="${col}" stroke-width="${14 - k * 3}" opacity="0.22" filter="url(#soft)"/>`;
      s += `<path d="${d}" fill="none" stroke="${col}" stroke-width="0.8" opacity="0.5" stroke-dasharray="1 4"/>`;
    }
    s += `<path d="M${b.x0} 176 L36 120 L60 150 L96 96 L128 140 L160 110 L200 160 L${b.x1} 150 L${b.x1} ${b.y1} L${b.x0} ${b.y1} Z" fill="${hsl(sh, 20, 46)}" stroke="#140F24" stroke-width="0.8" opacity="0.8"/>`;
    s += `<path d="M36 120 L44 132 L38 136 L50 140 M96 96 L104 108 L98 112 L110 118 M160 110 L168 122 L176 126" fill="none" stroke="#FFF6D8" stroke-width="1" opacity="0.7"/>`;
    s += ink(`M${b.x0} 212 C40 200 90 198 130 200 C170 202 200 196 ${b.x1} 200 L${b.x1} ${b.y1} L${b.x0} ${b.y1} Z`, hsl(sh - 10, 25, 82), 1.4);
    s += shadow(`M${b.x0} 224 C70 214 150 220 ${b.x1} 212 L${b.x1} ${b.y1} L${b.x0} ${b.y1} Z`, hsl(sh, 30, 60), 0.6, 'fine');
    for (let i = 0; i < 24; i++) s += `<circle cx="${f1(b.x0 + c.r() * W)}" cy="${f1(b.y0 + c.r() * 200)}" r="${f1(0.6 + c.r() * 1)}" fill="#FFFFFF" opacity="0.7"/>`;
  }
  return s;
};

/** Lumière de contour de chaque stade, accordée à la source de lumière du décor. */
const RIMS = ['#7FE8E0', '#FFC27A', '#9FD8FF', '#8FFFD0'];
export const lumikit: Species = (c: DrawCtx) => {
  begin(`lumikit-${c.stage}`, RIMS[Math.min(c.stage, RIMS.length - 1)], c.pal.light);
  return unink(draw(c));
};
lumikit.scene = (c: DrawCtx, b: Bounds) => {
  begin(`lumikit-${c.stage}-bg`, RIMS[Math.min(c.stage, RIMS.length - 1)], c.pal.light);
  return unink(sceneRaw(c, b));
};
