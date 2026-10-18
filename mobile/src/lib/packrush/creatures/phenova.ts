import { constellation, eyeA, fur, gild, hsl, ink, line, rim, shadow, sparkle, type Bounds, type DrawCtx, type Species } from './style.ts';

/**
 * Phenova → Pyrastrel → Supernovis : oiseau de supernova. Planche d'ornithologie céleste : rapace à crête de
 * plumes-étoiles et longues rectrices. Le poussin en duvet porte déjà quelques plumes de braise ; le jeune se
 * perche, ailes repliées ; l'adulte déploie ses ailes devant l'éclat d'une étoile qui explose.
 */

const f = (v: number) => +v.toFixed(1);
type Pt = [number, number] | [number, number, number];

/** Courbe lisse (Catmull-Rom) ; un 3e élément non nul marque un angle vif. */
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

/** Hachures de gravure : copies décalées d'une courbe, qui s'estompent. */
function contour(q: Pt[], dx: number, dy: number, n: number, w = 0.6, color = '#140F24', op = 0.6): string {
  let s = '';
  for (let i = 0; i < n; i++) s += `<path d="${cr(q.map((p) => [p[0] + dx * i, p[1] + dy * i] as Pt))}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" opacity="${f(op * (1 - i / n))}"/>`;
  return s;
}

/**
 * Plume : rémige effilée partant de (x, y) dans la direction `ang` (degrés), rachis, barbes au trait.
 * `bend` courbe la pointe (positif : vers la droite de la plume), `tip` colore l'extrémité.
 */
function feather(x: number, y: number, ang: number, len: number, w: number, fill: string, o: { bend?: number; tip?: string; sw?: number; barbs?: boolean } = {}): string {
  const { bend = 0, tip, sw = 1.1, barbs = true } = o;
  const L = len, b = bend * L;
  const d = cr([[0, 0], [L * 0.25, -w * 0.9], [L * 0.7, -w * 0.85 + b * 0.5], [L, b, 1], [L * 0.72, w * 0.7 + b * 0.5], [L * 0.3, w * 0.75]], true);
  let s = `<path d="${d}" fill="${fill}"/>`;
  if (tip) s += `<path d="${d}" fill="${tip}" opacity="0.9" clip-path="none" transform="translate(${f(L * 0.62)} ${f(b * 0.4)}) scale(0.38) translate(${f(-L * 0.62)} ${f(-b * 0.4)})"/>`;
  if (barbs) {
    for (let t = 0.25; t < 0.92; t += 0.11) {
      const cx = L * t, cy = b * t * t;
      s += `<path d="M${f(cx)} ${f(cy)} L${f(cx + L * 0.07)} ${f(cy + w * 0.6)}" stroke="#140F24" stroke-width="0.5" opacity="0.5"/>`;
    }
  }
  s += `<path d="M0 0 Q${f(L * 0.5)} ${f(b * 0.2)} ${f(L * 0.94)} ${f(b * 0.9)}" fill="none" stroke="#140F24" stroke-width="0.7" opacity="0.75"/>`;
  s += `<path d="${d}" fill="none" stroke="#140F24" stroke-width="${sw}" stroke-linejoin="round"/>`;
  return `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(ang)})">${s}</g>`;
}

/** Rangée de couvertures : écailles de plumes arrondies le long d'une ligne. */
function coverts(a: [number, number], b: [number, number], n: number, size: number, ang: number, fill: string): string {
  let s = '';
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1), x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t;
    s += feather(x, y, ang, size, size * 0.42, fill, { barbs: false, sw: 0.9 });
  }
  return s;
}

/** Rangée de couvertures dessinées au trait (écailles en U), pour l'aile repliée. */
function scallops(seg: [[number, number], [number, number]], n: number, size: number, ang: number, pal: { ink: string; light: string }): string {
  const [a, b] = seg;
  let s = '';
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t;
    s += `<g transform="translate(${f(x)} ${f(y)}) rotate(${ang - 90})">`
      + `<path d="M${f(-size / 2)} 0 Q0 ${f(size * 1.1)} ${f(size / 2)} 0" fill="none" stroke="${pal.ink}" stroke-width="0.8" opacity="0.8"/>`
      + `<path d="M${f(-size / 3)} ${f(size * 0.2)} Q0 ${f(size * 0.8)} ${f(size / 3)} ${f(size * 0.2)}" fill="none" stroke="${pal.light}" stroke-width="0.6" opacity="0.6"/></g>`;
  }
  return s;
}

/** Tête de rapace de profil (bec à gauche). Repère : bec ≈ (76, 68), nuque ≈ (118, 66). */
function head(c: DrawCtx, id: string, crest: number, young = 0, open = false): string {
  const { pal } = c;
  let s = '';
  // Crête : plumes fines terminées par une petite étoile.
  for (let i = 0; i < 3 + Math.round(crest * 2); i++) {
    const a = -150 + i * 14 + crest * 6, L = (14 + crest * 30) * (1 - i * 0.12);
    const x0 = 108 + i * 3, y0 = 50 + i * 2;
    const r = (a * Math.PI) / 180, x1 = x0 - Math.cos(r) * L, y1 = y0 + Math.sin(r) * L;
    s += line(`M${x0} ${y0} Q${f((x0 + x1) / 2 + 4)} ${f((y0 + y1) / 2 + 4)} ${f(x1)} ${f(y1)}`, 1.2, pal.ink);
    s += line(`M${x0} ${y0} Q${f((x0 + x1) / 2 + 4)} ${f((y0 + y1) / 2 + 4)} ${f(x1)} ${f(y1)}`, 0.5, pal.light);
    if (crest > 0.3) s += sparkle(x1, y1, 2.4 + crest * 1.6, i % 2 ? pal.glow : pal.gold, false);
  }
  const headD = cr([[90, 56], [98, 48], [110, 46], [120, 52], [124, 64], [120, 76], [108, 82], [96, 78], [88, 70]], true);
  s += ink(headD, pal.body, 1.6);
  s += clip(`${id}-hd`, headD, shadow(cr([[104, 66], [126, 56], [128, 86], [100, 86]], true), pal.shade, 0.8, 'fine')
    + `<path d="${cr([[86, 66], [94, 64], [104, 70], [108, 82], [92, 80]], true)}" fill="${pal.light}" opacity="0.9"/>`
    + fur(c, 112, 62, 7, 20, 5, 10, pal.ink, 0.55));
  // Masque sombre derrière l'œil (comme un faucon).
  s += `<path d="${cr([[96, 60], [104, 58], [114, 60], [118, 64], [110, 64], [104, 66], [100, 72], [98, 66]], true)}" fill="${pal.deep}" opacity="${young ? 0.3 : 0.85}"/>`;
  // Bec crochu : cire puis mandibule supérieure en crochet.
  const bk = young ? 0.7 : 1;
  s += ink(`M90 ${f(57)} C${f(90 - 8 * bk)} ${f(56)} ${f(90 - 14 * bk)} ${f(60)} ${f(90 - 15 * bk)} ${f(68)} C${f(90 - 13 * bk)} ${f(66)} ${f(90 - 10 * bk)} 65 ${f(90 - 6 * bk)} 66 L91 66 Z`, pal.gold, 1.3);
  if (open) {
    s += `<path d="M91 65 L${f(90 - 12 * bk)} 67 L${f(90 - 11 * bk)} 76 L92 70Z" fill="${pal.deep}"/>`;
    s += ink(`M91 68 L${f(90 - 11 * bk)} 75 C${f(90 - 9 * bk)} 78 ${f(90 - 3 * bk)} 76 93 71 Z`, pal.light, 1);
    s += line(`M${f(90 - 4 * bk)} 69 q2 2 6 0`, 0.8, pal.accent);
  } else s += ink(`M${f(90 - 6 * bk)} 66 C${f(90 - 4 * bk)} 69 ${f(90 - 1 * bk)} 70 92 69 L91 66 Z`, pal.light, 1);
  s += `<path d="M${f(90 - 2 * bk)} 58 C88 60 88 63 91 64" fill="none" stroke="#140F24" stroke-width="0.7"/>`;
  s += `<circle cx="${f(88 - 3 * bk)}" cy="60" r="0.9" fill="#140F24"/>`;
  s += ink('M89 55 C92 54 95 55 96 58 C94 60 91 61 89 60 Z', pal.gold, 0.8);
  s += eyeA(102, 61, 4.4 + young, pal.eye, { angle: -6, slit: false, open: 0.5 + young * 0.1 });
  s += line('M96 56 C100 53 106 53 110 56', 1.1);
  s += rim('M92 54 C98 48 108 45 118 50', pal.glow, 1.1);
  return s;
}

/** Fond : éclat de supernova (cœur, rayons, onde de choc). */
function supernova(c: DrawCtx, x: number, y: number, R: number): string {
  const { pal } = c;
  let s = `<circle cx="${x}" cy="${y}" r="${f(R * 0.9)}" fill="${pal.glow}" opacity="0.35" filter="url(#soft)"/>`;
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2 + 0.1, L = R * (i % 2 ? 0.95 : 1.45) * (0.85 + c.r() * 0.3), w = i % 2 ? 2.2 : 3.6;
    const ex = x + Math.cos(a) * L, ey = y + Math.sin(a) * L, nx = -Math.sin(a) * w, ny = Math.cos(a) * w;
    s += `<path d="M${f(x + nx)} ${f(y + ny)} L${f(ex)} ${f(ey)} L${f(x - nx)} ${f(y - ny)}Z" fill="${i % 2 ? pal.glow : '#FFF6D8'}" opacity="${i % 2 ? 0.4 : 0.55}"/>`;
  }
  s += `<circle cx="${x}" cy="${y}" r="${f(R * 0.62)}" fill="none" stroke="${pal.gold}" stroke-width="1" opacity="0.8"/>`;
  s += `<circle cx="${x}" cy="${y}" r="${f(R * 0.66)}" fill="none" stroke="${pal.gold}" stroke-width="0.5" stroke-dasharray="2 3" opacity="0.7"/>`;
  s += `<circle cx="${x}" cy="${y}" r="${f(R * 0.32)}" fill="#FFF6D8" opacity="0.8" filter="url(#soft)"/>`;
  return s;
}

/** Aile déployée (gauche du dessin) : épaule S, poignet W, main jusqu'à H. */
function spreadWing(c: DrawCtx, id: string, S: [number, number], W: [number, number], H: [number, number]): string {
  const { pal } = c;
  let s = '';
  // Rémiges primaires (de la pointe vers l'intérieur), couleurs claires et pointes incandescentes.
  const np = 8;
  for (let i = 0; i < np; i++) {
    const t = i / (np - 1);
    const x = H[0] + (W[0] - H[0]) * t, y = H[1] + (W[1] - H[1]) * t;
    s += feather(x, y, -112 - t * 52, 66 - t * 18, 6.4, i % 2 ? pal.light : pal.belly, { bend: -0.06, tip: i % 2 ? pal.glow : pal.accent2 });
  }
  // Rémiges secondaires le long de l'avant-bras.
  const ns = 7;
  for (let i = 0; i < ns; i++) {
    const t = i / (ns - 1);
    const x = W[0] + (S[0] - W[0]) * t, y = W[1] + (S[1] - W[1]) * t;
    s += feather(x, y, 172 - t * 64, 46 - t * 10, 7, i % 2 ? pal.body : pal.light, { bend: 0.05, tip: pal.accent });
  }
  // Bras de l'aile et couvertures en écailles.
  const arm = cr([[S[0] + 4, S[1] + 6], [S[0] - 6, S[1] - 10], [(S[0] + W[0]) / 2, (S[1] + W[1]) / 2 - 12], [W[0], W[1] - 8], [H[0] + 2, H[1] - 2], [H[0] + 6, H[1] + 8], [W[0] + 6, W[1] + 10], [(S[0] + W[0]) / 2 + 4, (S[1] + W[1]) / 2 + 12], [S[0] + 6, S[1] + 18]], true);
  s += ink(arm, pal.shade, 1.5);
  s += clip(`${id}-arm`, arm, coverts([W[0] + 2, W[1] + 6], [S[0] + 2, S[1] + 12], 7, 16, 160, pal.body)
    + coverts([W[0] - 2, W[1] - 2], [S[0] - 2, S[1] + 2], 6, 12, 155, pal.light)
    + shadow(cr([[S[0] - 10, S[1] - 14], [W[0], W[1] - 14], [H[0], H[1] - 6], [W[0] + 4, W[1] - 4], [S[0], S[1] - 2]], true), pal.deep, 0.5, 'fine'));
  s += rim(cr([[S[0] - 6, S[1] - 10], [(S[0] + W[0]) / 2, (S[1] + W[1]) / 2 - 12], [W[0], W[1] - 8], [H[0] + 2, H[1] - 2]]), pal.glow, 1.2);
  return s;
}

/** Adulte : ailes déployées devant la supernova, longues rectrices. */
function adult(c: DrawCtx, id: string): string {
  const { pal, stage } = c;
  let s = supernova(c, 111, 92, 70);
  // Rectrices : éventail + deux longs filets terminés par une étoile.
  for (const [a, L, col] of [[64, 54, pal.body], [116, 54, pal.body], [76, 62, pal.light], [104, 62, pal.light], [90, 70, pal.belly]] as const) {
    s += feather(111, 150, a, L, 8, col, { tip: pal.accent2, bend: (90 - a) * 0.002 });
  }
  for (const k of [-1, 1]) {
    const q: Pt[] = [[111, 150], [111 + k * 10, 182], [111 + k * 34, 206], [111 + k * 62, 214], [111 + k * 78, 200], [111 + k * 70, 188]];
    s += line(cr(q), 2.6, pal.ink) + line(cr(q), 1.2, pal.light);
    s += `<ellipse cx="${111 + k * 70}" cy="188" rx="7" ry="5.5" fill="${pal.deep}" stroke="#140F24" stroke-width="1"/>`
      + `<ellipse cx="${111 + k * 70}" cy="188" rx="4.2" ry="3.3" fill="${pal.glow}" opacity="0.5" filter="url(#glow)"/>`
      + sparkle(111 + k * 70, 188, 4, pal.gold, false) + gild(`M${111 + k * 70 - 8} 188 a8 6.5 0 1 0 16 0 a8 6.5 0 1 0 -16 0`, 0.8);
  }
  // Ailes : gauche dessinée, droite en miroir légèrement raccourcie (trois quarts).
  const wing = spreadWing(c, `${id}-wl`, [100, 104], [56, 74], [34, 64]);
  s += `<g>${wing}</g>`;
  s += `<g transform="translate(111 0) scale(-0.9 1) translate(-111 0)">${spreadWing(c, `${id}-wr`, [100, 104], [56, 74], [34, 64])}</g>`;
  // Pattes pendantes, serres.
  for (const [x, k] of [[104, -1], [118, 1]] as const) {
    s += ink(cr([[x - 3, 158], [x + 3, 158], [x + 2 + k, 170], [x - 2 + k, 170]], true), pal.gold, 1.1);
    s += line(`M${x - 1 + k} 169 q-4 4 -3 9 M${x + 1 + k} 170 q1 5 -1 9 M${x + 3 + k} 169 q4 4 4 8`, 1.4);
    const th = cr([[x - 8, 138], [x + 8, 138], [x + 6, 156], [x + 2, 162, 1], [x, 157], [x - 3, 162, 1], [x - 7, 152]], true);
    s += ink(th, pal.body, 1.2) + clip(`${id}-th${x}`, th, shadow(`M${x} 136 h12 v30 h-12Z`, pal.shade, 0.7, 'fine') + fur(c, x, 148, 6, 90, 4, 6, pal.ink, 0.6));
  }
  // Corps (poitrail), plumes de culotte.
  const body = cr([[100, 80], [92, 98], [92, 122], [98, 142], [111, 154], [124, 144], [130, 122], [128, 100], [120, 84]], true);
  s += ink(body, pal.body, 1.7);
  s += clip(`${id}-bd`, body, `<path d="${cr([[96, 90], [104, 96], [110, 120], [104, 150], [94, 132]], true)}" fill="${pal.belly}" opacity="0.85"/>`
    + shadow(cr([[118, 84], [134, 100], [132, 150], [110, 160], [122, 130]], true), pal.shade, 0.85, 'fine')
    + shadow(cr([[92, 136], [130, 136], [124, 160], [98, 160]], true), pal.deep, 0.4, 'xhatch')
    + Array.from({ length: 5 }, (_, i) => contour([[94, 100 + i * 10], [102, 104 + i * 10], [110, 101 + i * 10], [118, 104 + i * 10], [126, 100 + i * 10]], 0, 0, 1, 0.7, pal.ink, 0.55)).join('')
    + fur(c, 111, 140, 6, 90, 7, 14, pal.ink, 0.5));
  s += gild('M111 104 l3 6 l6 1 l-5 4 l2 6 l-6 -3 l-6 3 l2 -6 l-5 -4 l6 -1 Z', 1);
  if (stage >= 3) s += constellation([[60, 160], [74, 176], [70, 194], [86, 206]], pal.gold);
  // Cou et tête (tournée de profil).
  s += ink(cr([[96, 86], [92, 72], [98, 62], [112, 60], [122, 70], [124, 90]], true), pal.body, 1.5);
  s += `<g transform="translate(6 18) rotate(-6 110 66)">${head(c, id, 1)}</g>`;
  return s;
}

/** Jeune perché de profil, ailes repliées, sur une branche. */
function perched(c: DrawCtx, id: string): string {
  const { pal } = c;
  let s = '';
  // Longue queue (derrière la branche).
  for (const [a, L, col] of [[64, 74, pal.shade], [58, 80, pal.body], [52, 70, pal.light]] as const) s += feather(140, 150, a, L, 8, col, { tip: pal.accent2, bend: 0.03 });
  // Branche gravée.
  const br = cr([[6, 188], [40, 180], [90, 178], [140, 182], [190, 176], [220, 170], [222, 182], [190, 188], [140, 194], [90, 190], [40, 192], [6, 200]], true);
  s += ink(br, pal.deep, 1.5) + clip(`${id}-br`, br, contour([[6, 194], [60, 186], [120, 188], [180, 184], [222, 178]], 0, 2.4, 5, 0.6, '#FFF6D8', 0.3) + line('M60 180 q10 6 24 2 M150 182 q12 4 24 -2', 0.7, pal.ink));
  s += ink(cr([[40, 184], [30, 168], [20, 160, 1], [36, 170], [48, 182]], true), pal.deep, 1.3);
  // Corps.
  const body = cr([[96, 88], [86, 106], [88, 134], [104, 160], [128, 170], [150, 160], [154, 136], [140, 108], [118, 90]], true);
  s += ink(body, pal.body, 1.7);
  s += clip(`${id}-bd`, body, `<path d="${cr([[88, 104], [98, 110], [106, 140], [118, 166], [94, 150]], true)}" fill="${pal.belly}" opacity="0.85"/>`
    + shadow(cr([[90, 150], [130, 150], [150, 176], [100, 176]], true), pal.shade, 0.8, 'fine')
    + Array.from({ length: 5 }, (_, i) => contour([[88, 108 + i * 10], [96, 112 + i * 10], [104, 110 + i * 10]], 0, 0, 1, 0.7, pal.ink, 0.5)).join(''));
  // Pattes agrippées à la branche.
  for (const x of [112, 126]) {
    s += ink(cr([[x - 3, 164], [x + 3, 164], [x + 2, 175], [x - 2, 175]], true), pal.gold, 1.1);
    s += line(`M${x - 2} 175 q-6 1 -8 6 M${x} 176 q0 4 -2 7 M${x + 2} 175 q5 1 6 6`, 1.4);
    const th = cr([[x - 9, 148], [x + 7, 148], [x + 6, 162], [x + 2, 168, 1], [x, 163], [x - 3, 168, 1], [x - 8, 160]], true);
    s += ink(th, pal.body, 1.2) + clip(`${id}-th${x}`, th, shadow(`M${x} 146 h12 v26 h-12Z`, pal.shade, 0.7, 'fine') + fur(c, x, 156, 6, 90, 4, 6, pal.ink, 0.6));
  }
  // Aile repliée : couvertures + rémiges qui descendent vers la queue.
  for (let i = 0; i < 6; i++) s += feather(118 + i * 3, 116 + i * 5, 40 - i * 3, 70 - i * 6, 7, i % 2 ? pal.light : pal.body, { tip: pal.accent, bend: 0.02 });
  const wing = cr([[108, 100], [130, 98], [150, 116], [158, 140], [150, 150], [130, 140], [114, 122]], true);
  s += ink(wing, pal.shade, 1.5) + clip(`${id}-wg`, wing, scallops([[112, 108], [148, 138]], 9, 9, 50, pal) + scallops([[114, 102], [150, 124]], 9, 8, 40, pal) + scallops([[110, 118], [138, 150]], 7, 8, 58, pal)
    + shadow(cr([[130, 130], [160, 140], [150, 156], [126, 146]], true), pal.deep, 0.5, 'fine'));
  s += rim('M108 100 C122 96 140 104 150 116', pal.glow, 1.2);
  s += ink(cr([[96, 92], [94, 76], [104, 64], [118, 66], [124, 84], [118, 96]], true), pal.body, 1.5);
  s += `<g transform="translate(2 14) rotate(-10 112 68)">${head(c, id, 0.55, 0, true)}</g>`;
  return s;
}

/** Poussin en duvet dans un nid de brindilles et de braises stellaires ; premières plumes de braise aux ailes. */
function chick(c: DrawCtx, id: string): string {
  const { pal } = c;
  let s = '';
  // Nid : bord arrière (derrière le poussin).
  const back = cr([[40, 178], [70, 168], [112, 166], [156, 168], [186, 178], [150, 182], [112, 184], [74, 182]], true);
  s += ink(back, pal.deep, 1.3);
  // Aile lointaine (moignon derrière le corps).
  s += ink(cr([[90, 128], [76, 140], [70, 160, 1], [82, 156], [94, 146]], true), pal.shade, 1.2);
  // Corps en poire, duvet.
  const body = cr([[96, 108], [122, 106], [138, 122], [146, 148], [146, 172], [134, 190], [110, 194], [88, 190], [78, 170], [80, 142], [86, 122]], true);
  s += ink(body, pal.light, 1.5);
  s += clip(`${id}-bd`, body, shadow(cr([[122, 96], [150, 130], [150, 196], [110, 200], [136, 160]], true), pal.shade, 0.75, 'fine')
    + `<ellipse cx="100" cy="150" rx="14" ry="26" fill="${pal.belly}" opacity="0.75"/>`
    + fur(c, 112, 150, 7, 80, 16, 30, pal.ink, 0.45) + fur(c, 98, 120, 6, 110, 6, 12, pal.ink, 0.4)
    + contour([[136, 112], [144, 140], [144, 170], [134, 190]], -2.4, 0, 5, 0.6, pal.ink, 0.6));
  for (let i = 0; i < 26; i++) {
    const t = i / 25, a = Math.PI * (0.62 + t * 1.76);
    const x = 112 + Math.cos(a) * 33, y = 146 + Math.sin(a) * 48;
    s += fur(c, x, y, 3.5, (a * 180) / Math.PI, 2, 1.6, pal.ink, 0.8);
  }
  // Aile proche : moignon duveteux, trois plumes de braise naissantes.
  for (let i = 0; i < 3; i++) s += feather(132 + i * 2, 150 + i * 3, 74 - i * 14, 20 - i * 2, 3.2, pal.accent, { barbs: false, sw: 0.9, tip: pal.glow });
  const wing = cr([[122, 124], [138, 130], [146, 150], [144, 166, 1], [130, 156], [120, 140]], true);
  s += ink(wing, pal.body, 1.3) + clip(`${id}-wg`, wing, fur(c, 134, 146, 7, 70, 7, 12, pal.ink, 0.5) + shadow('M128 150 L150 146 L146 170 L126 164Z', pal.shade, 0.6, 'fine'));
  s += rim(cr([[84, 130], [90, 116], [100, 110], [118, 108]]), pal.glow, 1.2);
  // Tête : à peine plus grosse, crâne duveteux, crête de trois plumes naissantes.
  const T = `translate(110 92) scale(1.26) translate(-108 -66)`;
  const hp: Pt[] = [];
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2, r = i % 2 ? 1.04 : 1;
    hp.push([109 + Math.cos(a) * 17 * r, 65 + Math.sin(a) * 16.5 * r]);
  }
  s += `<g transform="${T}">${ink(cr(hp, true), pal.light, 1.3)}${head(c, id, 0.15, 1)}</g>`;
  // Coquille brisée : coupe d'où sort le poussin, et calotte tombée dans le nid.
  const egg = '#EFE4CC';
  const cup = cr([[74, 160, 1], [82, 152, 1], [88, 162, 1], [98, 154, 1], [106, 164, 1], [116, 156, 1], [126, 165, 1], [136, 155, 1], [144, 163, 1], [152, 156, 1], [154, 176], [142, 196], [112, 204], [84, 198], [72, 180]], true);
  s += ink(cup, egg, 1.5) + clip(`${id}-eg`, cup, shadow(cr([[120, 150], [160, 160], [156, 206], [110, 206], [140, 180]], true), pal.shade, 0.55, 'fine')
    + `<ellipse cx="96" cy="176" rx="10" ry="14" fill="#FFFFFF" opacity="0.35"/>`
    + Array.from({ length: 14 }, () => `<circle cx="${f(76 + c.r() * 76)}" cy="${f(162 + c.r() * 38)}" r="${f(0.6 + c.r() * 1.1)}" fill="${pal.deep}" opacity="0.6"/>`).join('')
    + gild('M104 164 L110 176 L106 186 L114 198', 0.9) + gild('M138 160 L134 172 L140 182', 0.8));
  s += `<path d="M74 160 L82 152 L88 162 L98 154 L106 164 L116 156 L126 165 L136 155 L144 163 L152 156" fill="none" stroke="${pal.glow}" stroke-width="1.2" opacity="0.8" filter="url(#glow)"/>`;
  const capD = cr([[156, 178, 1], [160, 166], [172, 160], [184, 166], [188, 178, 1], [182, 174, 1], [176, 180, 1], [170, 174, 1], [164, 181, 1]], true);
  s += ink(capD, egg, 1.3) + clip(`${id}-cap`, capD, shadow('M150 172 L192 172 L192 186 L150 186Z', pal.shade, 0.5, 'fine'));
  // Nid : bord avant (brindilles gravées, braises).
  const front = cr([[36, 178], [74, 186], [112, 188], [150, 186], [190, 176], [182, 196], [150, 210], [112, 214], [72, 210], [44, 196]], true);
  let tw = '';
  for (let i = 0; i < 26; i++) {
    const x = 40 + c.r() * 146, y = 180 + c.r() * 30, L = 16 + c.r() * 24, a = (c.r() - 0.5) * 0.7;
    tw += line(`M${f(x)} ${f(y)} q${f(L / 2)} ${f(Math.sin(a) * L / 2 - 2)} ${f(L * Math.cos(a))} ${f(L * Math.sin(a))}`, 0.8 + c.r() * 0.6, i % 3 ? pal.ink : pal.light, ` opacity="${i % 3 ? 0.8 : 0.5}"`);
  }
  s += ink(front, pal.shade, 1.5) + clip(`${id}-ns`, front, shadow(cr([[36, 196], [112, 204], [190, 190], [190, 216], [36, 216]], true), pal.deep, 0.6, 'xhatch') + tw);
  for (let i = 0; i < 9; i++) {
    const x = 50 + i * 15 + c.r() * 6, y = 182 + Math.sin(i * 1.3) * 3 + c.r() * 4;
    s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(1.4 + c.r() * 1.4)}" fill="${i % 2 ? pal.glow : pal.gold}" filter="url(#glow)"/>`;
  }
  s += rim('M40 178 C70 186 112 190 150 186 C170 184 180 180 188 176', pal.glow, 1);
  s += sparkle(74, 112, 2.6, pal.glow, false) + sparkle(152, 104, 2, pal.gold, false) + sparkle(160, 150, 1.8, pal.glow, false);
  return s;
}

export const phenova: Species = (c) => {
  const id = `phenova-${c.stage}`;
  if (c.stage === 0) return `<g transform="translate(111 206) scale(1.1) translate(-112 -206)">${chick(c, id)}</g>`;
  if (c.stage === 1) return `<g transform="translate(111 186) scale(1.16) translate(-116 -186)">${perched(c, id)}</g>`;
  return `<g transform="translate(111 112) scale(0.97) translate(-111 -110)">${adult(c, id)}</g>`;
};

/* ---------- Décors : hautes terres volcaniques et ciel stellaire ---------- */

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

function ridge(c: DrawCtx, b: Bounds, y: number, amp: number, n: number, fill: string, extra = ''): string {
  const q: Pt[] = [];
  for (let i = 0; i <= n; i++) q.push([b.x0 - 10 + ((b.x1 - b.x0 + 20) * i) / n, y - c.r() * amp, i % 2]);
  return `<path d="${cr(q)} L${b.x1 + 10} ${b.y1 + 10} L${b.x0 - 10} ${b.y1 + 10}Z" fill="${fill}"${extra}/>`;
}

/** Braises qui montent (petits points lumineux). */
function embers(c: DrawCtx, b: Bounds, n: number, col: string, y0: number): string {
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = b.x0 + c.r() * (b.x1 - b.x0), y = b.y0 + c.r() * (y0 - b.y0);
    s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(0.5 + c.r() * 1.2)}" fill="${col}" opacity="${f(0.4 + c.r() * 0.5)}"/>`;
  }
  return s;
}

/** Panache de fumée : bouffées superposées, hachures fines. */
function smoke(x: number, y: number, h: number, col: string): string {
  let s = '';
  for (let k = 0; k < 6; k++) {
    const t = k / 5, cx = x + Math.sin(t * 3) * h * 0.18 + t * h * 0.25, cy = y - t * h, r = 6 + t * h * 0.16;
    s += `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r * 1.3)}" fill="${col}" opacity="${f(0.55 - t * 0.3)}" filter="url(#soft)"/>`
      + `<path d="M${f(cx - r)} ${f(cy + r * 0.2)} A${f(r)} ${f(r)} 0 0 1 ${f(cx + r * 0.6)} ${f(cy - r * 0.8)}" fill="none" stroke="#FFF6D8" stroke-width="0.6" opacity="${f(0.35 - t * 0.2)}"/>`;
  }
  return s;
}

phenova.scene = (c: DrawCtx, b: Bounds): string => {
  const { stage, pal } = c;
  const id = `phenova-${stage}-bg`;
  const W = b.x1 - b.x0, Hh = b.y1 - b.y0;
  const V = 270 + (c.hue - 20) * 0.1;
  let s = '';
  if (stage === 0) {
    // Corniche au crépuscule, volcan lointain qui fume, coulées de lave.
    s += `<defs>${grad(`${id}-sky`, [[0, hsl(V, 45, 12)], [0.55, hsl(V + 40, 35, 30)], [0.85, hsl(20, 60, 50)], [1, hsl(35, 70, 62)]])}</defs>`;
    s += `<rect x="${b.x0}" y="${b.y0}" width="${W}" height="${Hh}" fill="url(#${id}-sky)"/>` + stars(c, b, 40, 90, 0.7);
    s += smoke(150, 96, 90, hsl(V + 30, 15, 38));
    s += `<path d="M96 160 L136 104 L146 98 L158 100 L168 106 L214 160Z" fill="${hsl(V + 20, 22, 30)}" stroke="#140F24" stroke-width="0.7"/>`;
    s += `<path d="M146 100 C143 116 147 128 140 160 M158 102 C163 120 155 140 162 160" fill="none" stroke="#FFB070" stroke-width="2" opacity="0.9" filter="url(#glow)"/>`;
    s += `<ellipse cx="152" cy="100" rx="14" ry="5" fill="#FFC27A" opacity="0.8" filter="url(#glow)"/>`;
    s += ridge(c, b, 162, 14, 8, hsl(V + 20, 20, 24));
    s += embers(c, b, 30, '#FFC27A', 170);
    // Paroi rocheuse du nid (avant-plan).
    const cliff = cr([[b.x0 - 10, 176], [20, 172], [60, 180], [110, 190], [170, 182], [b.x1 + 10, 170]]) + ` L${b.x1 + 10} ${b.y1 + 10} L${b.x0 - 10} ${b.y1 + 10}Z`;
    s += `<path d="${cliff}" fill="${hsl(V, 22, 18)}" stroke="#140F24" stroke-width="0.9"/>`;
    s += clip(`${id}-cl`, cliff, `<path d="${cliff}" fill="url(#xhatch)" opacity="0.5"/>` + line('M20 190 l14 20 l-4 20 M180 192 l-10 24 l8 16 M90 210 l18 14', 0.8, '#140F24'));
    s += rim(cr([[b.x0 - 10, 176], [20, 172], [60, 180], [110, 190], [170, 182], [b.x1 + 10, 170]]), '#FFB070', 1.1);
    return s;
  }
  if (stage === 1) {
    // Nuit au bord d'une caldeira : deux lunes, lueur de lave, colonnes de fumée.
    s += `<defs>${grad(`${id}-sky`, [[0, hsl(V - 20, 50, 7)], [0.7, hsl(V, 35, 18)], [1, hsl(15, 55, 34)]])}</defs>`;
    s += `<rect x="${b.x0}" y="${b.y0}" width="${W}" height="${Hh}" fill="url(#${id}-sky)"/>` + stars(c, b, 60, 140);
    s += `<circle cx="44" cy="44" r="13" fill="#E9DFC6" stroke="#140F24" stroke-width="0.7"/><circle cx="49" cy="40" r="13" fill="${hsl(V - 20, 45, 9)}"/>`;
    s += `<circle cx="70" cy="30" r="5" fill="#E9DFC6" opacity="0.8"/>`;
    s += smoke(30, 170, 110, hsl(V, 15, 26)) + smoke(196, 176, 120, hsl(V, 15, 24));
    s += ridge(c, b, 168, 22, 7, hsl(V, 25, 16));
    s += `<ellipse cx="111" cy="${b.y1}" rx="${W * 0.7}" ry="46" fill="#FF8A3C" opacity="0.55" filter="url(#soft)"/>`;
    const fl = `M${b.x0 - 10} 206 C40 200 90 210 140 204 C180 200 210 206 ${b.x1 + 10} 202 L${b.x1 + 10} ${b.y1 + 10} L${b.x0 - 10} ${b.y1 + 10}Z`;
    s += `<path d="${fl}" fill="${hsl(V, 20, 12)}" stroke="#140F24" stroke-width="0.8"/>`;
    s += clip(`${id}-fl`, fl, `<path d="M10 216 L40 222 L70 214 L110 226 L150 216 L196 224" fill="none" stroke="#FFB070" stroke-width="1.6" filter="url(#glow)"/>`);
    s += embers(c, b, 40, '#FFC27A', 230);
    return s;
  }
  // Très haut au-dessus d'une planète : limbe lumineux, bandes de nuages, nébuleuse.
  s += `<defs>${grad(`${id}-sky`, [[0, hsl(V - 30, 55, 6)], [1, hsl(V, 40, 16)]])}</defs>`;
  s += `<rect x="${b.x0}" y="${b.y0}" width="${W}" height="${Hh}" fill="url(#${id}-sky)"/>`;
  s += `<ellipse cx="40" cy="60" rx="80" ry="40" fill="${pal.accent2}" opacity="0.18" filter="url(#soft)"/><ellipse cx="190" cy="40" rx="60" ry="30" fill="${pal.accent}" opacity="0.15" filter="url(#soft)"/>`;
  s += stars(c, b, 90, b.y1 - 40);
  const R = 300, cx = 111, cy = 196 + R;
  s += `<circle cx="${cx}" cy="${cy}" r="${R + 6}" fill="${pal.glow}" opacity="0.5" filter="url(#soft)"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="${hsl(V + 160, 22, 22)}" stroke="#140F24" stroke-width="0.8"/>`;
  let bands = '';
  for (let i = 0; i < 7; i++) bands += `<ellipse cx="${cx + (c.r() - 0.5) * 40}" cy="${f(cy - R + 12 + i * 11)}" rx="${R}" ry="${f(4 + c.r() * 4)}" fill="${i % 2 ? hsl(V + 170, 22, 38) : hsl(V + 150, 22, 18)}" opacity="0.6"/>`;
  s += clip(`${id}-pl`, `M${cx - R} ${cy} a${R} ${R} 0 1 0 ${2 * R} 0 a${R} ${R} 0 1 0 ${-2 * R} 0`, bands + `<rect x="${b.x0}" y="${cy - R}" width="${W}" height="80" fill="url(#fine)" opacity="0.6"/>`);
  s += rim(`M${b.x0} ${f(cy - Math.sqrt(R * R - (b.x0 - cx) ** 2))} A${R} ${R} 0 0 1 ${b.x1} ${f(cy - Math.sqrt(R * R - (b.x1 - cx) ** 2))}`, '#FFF6D8', 1.2);
  return s;
};
