import { hsl, speckles, type Bounds, type DrawCtx, type Species } from './style.ts';
import { begin, unink, aura, constellation, eyeA, gild, ground, ink, line, rim, shadow, sparkle } from './lumen.ts';

/**
 * Hibouclipse → Éclipsule → Grand-Umbrel → Umbrelion : grand-duc des éclipses. Planche d'ornithologie céleste :
 * poussin en duvet tapi au creux d'un vieil arbre, jeune « branchu » curieux sur sa branche, adulte dressé sur une
 * colonne en ruine sous la lune, éveillé ailes déployées devant une éclipse totale.
 */

const f = (v: number) => v.toFixed(1);
const CX = 111;
const mirror = (s: string) => s + `<g transform="matrix(-1 0 0 1 ${CX * 2} 0)">${s}</g>`;
const glowDot = (x: number, y: number, r: number, col: string) => [1, 0.7, 0.45, 0.25].map((k) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r / k * 0.5)}" fill="${col}" opacity="${(0.22 * k).toFixed(2)}"/>`).join('');

/** Ellipse au bord en mèches de duvet (pointes régulières). */
function fluff(cx: number, cy: number, rx: number, ry: number, n: number, amp: number, a0 = 0): string {
  let d = '';
  for (let i = 0; i <= n; i++) {
    const a = a0 + (i / n) * Math.PI * 2, am = a - Math.PI / n;
    const x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry;
    const k = 1 + amp * (i % 2 ? 1 : 0.7);
    if (i === 0) d += `M${f(x)} ${f(y)}`;
    else d += ` Q${f(cx + Math.cos(am - 0.05) * rx * k)} ${f(cy + Math.sin(am - 0.05) * ry * k)} ${f(x)} ${f(y)}`;
  }
  return d + ' Z';
}

/** Rangées d'écailles de plumes (petits arcs) dans une zone, à découper par un clipPath. */
function scales(x0: number, y0: number, x1: number, y1: number, w: number, h: number, col: string, op = 0.6): string {
  let d = '';
  for (let y = y0, row = 0; y < y1; y += h, row++) {
    for (let x = x0 + (row % 2 ? w / 2 : 0); x < x1; x += w) d += `M${f(x)} ${f(y)} q${f(w / 2)} ${f(h * 0.9)} ${f(w)} 0 `;
  }
  return `<path d="${d}" fill="none" stroke="${col}" stroke-width="0.6" opacity="${op}"/>`;
}

/** Poitrine : barres ondulées fines + stries verticales (motif de grand-duc). */
function barring(c: DrawCtx, x0: number, y0: number, x1: number, y1: number): string {
  let s = '';
  for (let y = y0; y < y1; y += 5) s += `M${f(x0)} ${f(y)} ${Array.from({ length: Math.ceil((x1 - x0) / 6) }, (_, k) => `q3 ${k % 2 ? 1.6 : -1.6} 6 0`).join(' ')} `;
  let st = '';
  for (let i = 0; i < 16; i++) {
    const x = x0 + 4 + c.r() * (x1 - x0 - 8), y = y0 + c.r() * (y1 - y0 - 12);
    st += `M${f(x)} ${f(y)} q${f((c.r() - 0.5) * 2)} 5 0 ${f(7 + c.r() * 5)} `;
  }
  return `<path d="${s}" fill="none" stroke="${c.pal.shade}" stroke-width="0.7" opacity="0.55"/><path d="${st}" fill="none" stroke="${c.pal.deep}" stroke-width="1.6" stroke-linecap="round" opacity="0.6" filter="url(#b2)"/>`;
}

/** Œil d'éclipse : œil en amande, pupille ronde ceinte d'une couronne d'or. */
function owlEye(c: DrawCtx, x: number, y: number, w: number, open: number, glow: boolean): string {
  return (glow ? glowDot(x, y, w * 1.4, c.pal.eye) : '')
    + eyeA(x, y, w, c.pal.eye, { angle: 6, slit: false, open })
    + `<circle cx="${f(x + w * 0.05)}" cy="${f(y - w * open * 0.1)}" r="${f(w * open * 0.66)}" fill="none" stroke="#FFF6D8" stroke-width="0.5" opacity="0.8"/>`;
}

/** Moitié gauche de la tête (miroir ensuite) : disque facial, aigrette, sourcil clair, œil. */
function headHalf(c: DrawCtx, o: { tuft: number; open: number; glow: boolean; down: boolean }): string {
  const { pal } = c;
  let s = '';
  // Aigrette (plumes de « corne »).
  if (o.tuft > 0) {
    const t = o.tuft;
    const tip = [62 - t * 0.3, 40 - t];
    s += ink(`M80 48 C78 ${f(40 - t * 0.5)} ${f(70 - t * 0.3)} ${f(36 - t * 0.9)} ${f(tip[0])} ${f(tip[1])} C76 ${f(36 - t * 0.7)} 92 ${f(36 - t * 0.4)} 100 44 Z`, pal.shade, 1.3);
    for (let k = 0; k < 4; k++) s += line(`M${f(84 + k * 4)} 44 Q${f(76 + k * 2)} ${f(34 - t * 0.5)} ${f(tip[0] + 2 + k * 2)} ${f(tip[1] + 3 + k * 2)}`, 0.6, k % 2 ? pal.deep : pal.light, ' opacity="0.8"');
  }
  // Disque facial.
  s += ink('M111 50 C100 46 84 48 78 58 C72 70 76 86 90 92 C98 95 106 92 111 88 Z', pal.light, 1.1);
  s += line('M90 54 C82 60 80 72 84 82 M94 52 C86 60 86 74 90 84', 0.5, pal.shade, ' opacity="0.6"');
  s += line('M111 50 C100 46 84 48 78 58 C72 70 76 86 90 92', 1.8, pal.deep);
  // Sourcil clair en V.
  s += ink('M111 60 C104 52 94 50 84 50 C94 46 106 48 112 54 Z', pal.belly, 0.8);
  s += owlEye(c, 95, 68, 8.5, o.open, o.glow);
  if (o.down) s += line('M80 86 l-4 3 M86 92 l-3 4 M94 94 l-2 4', 0.8, pal.belly);
  return s;
}

/** Tête complète (centrée en x = 111, y ≈ 66), avec bec. */
function owlHead(c: DrawCtx, o: { tuft: number; open: number; glow: boolean; down: boolean }): string {
  const { pal } = c;
  const outer = o.down ? fluff(CX, 68, 42, 36, 30, 0.07, -Math.PI / 2) : 'M111 32 C136 32 156 44 156 66 C156 88 138 104 111 104 C84 104 66 88 66 66 C66 44 86 32 111 32 Z';
  let s = ink(outer, pal.body, 1.8);
  s += `<clipPath id="hibouclipse-${c.stage}-hd"><path d="${outer}"/></clipPath><g clip-path="url(#hibouclipse-${c.stage}-hd)">`
    + scales(64, 34, 160, 52, 6, 4, pal.light, 0.35)
    + shadow('M130 30 C150 36 162 54 160 74 C158 94 140 108 111 108 L111 104 C138 100 152 84 150 64 C148 48 140 38 130 30 Z', pal.shade, 0.8, 'fine')
    + `</g>`;
  s += mirror(headHalf(c, o));
  // Bec crochu et soies.
  s += ink('M111 70 C106 74 106 84 111 92 C116 84 116 74 111 70 Z', pal.deep, 1.2);
  s += line('M109.5 74 C108.5 80 109 86 111 90', 0.7, pal.light, ' opacity="0.8"');
  s += line('M104 74 l-6 -2 M104 78 l-7 0 M118 74 l6 -2 M118 78 l7 0', 0.6, pal.belly);
  s += rim('M70 58 C74 44 90 34 111 32', pal.glow, 1.2);
  return s;
}

/** Corps de profil frontal, ailes repliées, pattes emplumées sur un perchoir (y ≈ 198). */
function perched(c: DrawCtx, o: { head: string; down: boolean; gold: boolean; wings?: boolean }): string {
  const { pal, stage } = c;
  const id = `hibouclipse-${stage}`;
  let s = '';
  // Queue (derrière).
  s += ink('M100 196 C99 206 100 216 104 224 L111 226 L118 224 C122 216 123 206 122 196 Z', pal.shade, 1.3) + line('M101 204 h20 M102 212 h18 M104 220 h14', 0.8, pal.light, ' opacity="0.6"');
  // Corps.
  const body = o.down ? fluff(CX, 150, 50, 58, 34, 0.05) : 'M74 92 C56 112 56 150 64 176 C72 196 90 206 111 208 C132 206 150 196 158 176 C166 150 166 112 148 92 Z';
  s += ink(body, pal.body, 1.8);
  s += ink('M90 100 C80 128 84 170 98 198 L124 198 C138 170 142 128 132 100 Z', pal.belly, 1);
  s += `<clipPath id="${id}-br"><path d="M90 100 C80 128 84 170 98 198 L124 198 C138 170 142 128 132 100 Z"/></clipPath><g clip-path="url(#${id}-br)">${barring(c, 80, 104, 142, 198)}`
    + shadow('M124 100 C136 128 136 170 124 198 L140 198 L140 100 Z', pal.shade, 0.6, 'fine') + `</g>`;
  if (o.down) s += `<path d="${fluff(CX, 150, 26, 40, 24, 0.08)}" fill="${pal.belly}" opacity="0.75"/>`;
  // Ailes repliées (gauche puis miroir).
  const wing = 'M76 96 C58 114 54 156 62 186 C66 202 76 214 86 222 C84 200 84 168 90 140 C93 120 90 104 76 96 Z';
  let w = ink(wing, pal.body, 1.6);
  w += `<clipPath id="${id}-w"><path d="${wing}"/></clipPath><g clip-path="url(#${id}-w)">`
    + scales(52, 98, 96, 150, 7, 5, pal.light, 0.45)
    + Array.from({ length: 10 }, (_, i) => `<circle cx="${f(60 + (i * 7) % 28)}" cy="${f(110 + i * 4.4)}" r="1.4" fill="${pal.belly}" opacity="0.8"/>`).join('')
    // Rémiges : longues plumes aux barres claires.
    + [0, 1, 2, 3].map((k) => ink(`M${64 + k * 6} 146 C${62 + k * 6} 176 ${70 + k * 5} 204 ${84 + k * 2} 224 C${78 + k * 5} 200 ${72 + k * 6} 172 ${72 + k * 6} 146 Z`, k % 2 ? pal.shade : pal.body, 0.8)).join('')
    + line('M62 162 l10 2 M62 176 l12 2 M66 190 l12 3 M72 204 l10 3', 0.9, pal.light, ' opacity="0.6"')
    + shadow('M54 150 C58 180 70 206 86 222 L90 222 C78 200 70 176 70 150 Z', pal.deep, 0.35, 'fine')
    + `</g>` + ink(wing, 'none', 1.6);
  if (o.gold) w += gild('M66 120 C62 140 62 166 68 188', 1);
  w += rim('M74 98 C58 116 54 154 62 184', pal.glow, 1.1);
  if (o.wings === false) {
    s += `<clipPath id="${id}-bd"><path d="${body}"/></clipPath><g clip-path="url(#${id}-bd)">${scales(56, 96, 92, 200, 7, 5, pal.light, 0.35)}${scales(130, 96, 166, 200, 7, 5, pal.light, 0.35)}`
      + shadow('M150 96 C166 120 168 160 156 184 C148 198 132 206 120 208 L140 208 L170 208 L170 96 Z', pal.shade, 0.8, 'fine') + `</g>`;
    s += rim('M72 96 C58 114 56 150 64 176', pal.glow, 1.1);
  }
  if (o.wings !== false) s += w + `<g transform="matrix(-1 0 0 1 ${CX * 2} 0)">${w.replace(/hibouclipse-(\d)-w/g, 'hibouclipse-$1-wr').replace(new RegExp(pal.glow.replace(/[()]/g, '\\$&'), 'g'), pal.shade)}</g>`;
  // Pattes emplumées et serres.
  for (const x of [100, 122]) {
    s += ink(`M${x - 8} 188 C${x - 9} 194 ${x - 8} 198 ${x - 6} 199 L${x + 6} 199 C${x + 8} 198 ${x + 9} 194 ${x + 8} 188 Z`, pal.belly, 1.1);
    s += line(`M${x - 6} 192 l1 5 M${x - 2} 192 l0.5 6 M${x + 2} 192 l-0.5 6 M${x + 6} 192 l-1 5`, 0.6, pal.shade);
    for (const dx of [-5, 0, 5]) s += `<path d="M${x + dx - 1.6} 198 C${x + dx - 2} 202 ${x + dx} 205 ${x + dx + 2.4} 205.5 C${x + dx + 1} 203 ${x + dx + 1} 200 ${x + dx + 1.6} 198 Z" fill="#140F24"/>`;
  }
  s += o.head;
  return s;
}

/** Stade 3 : ailes déployées en héraldique (moitié gauche, puis miroir). */
function spreadWing(c: DrawCtx): string {
  const { pal } = c;
  let s = '';
  // Rémiges secondaires (pendantes) puis primaires (en éventail).
  for (let k = 0; k < 7; k++) {
    const bx = 98 - k * 9, by = 108 - k * 6, len = 64 - k * 3, a = (100 + k * 6) * Math.PI / 180;
    const tx = bx + Math.cos(a) * len, ty = by + Math.sin(a) * len;
    s += ink(`M${f(bx - 7)} ${f(by)} Q${f(tx - 9)} ${f(ty - 14)} ${f(tx)} ${f(ty)} Q${f(tx + 9)} ${f(ty - 16)} ${f(bx + 7)} ${f(by)} Z`, k % 2 ? pal.shade : pal.body, 1);
    s += line(`M${f(bx)} ${f(by + 6)} Q${f(tx - 2)} ${f(ty - 14)} ${f(tx)} ${f(ty - 2)}`, 0.5, pal.light, ' opacity="0.7"');
  }
  for (let k = 0; k < 10; k++) {
    const bx = 40 - k * 1, by = 64 - k * 1.5, len = 66 - Math.abs(k - 4) * 4, a = (186 + k * 11) * Math.PI / 180;
    const tx = bx + Math.cos(a) * len, ty = by + Math.sin(a) * len;
    const nx = -Math.sin(a) * 7, ny = Math.cos(a) * 7;
    s += ink(`M${f(bx + nx)} ${f(by + ny)} Q${f(tx + nx * 1.2)} ${f(ty + ny * 1.2)} ${f(tx)} ${f(ty)} Q${f(tx - nx * 0.6)} ${f(ty - ny * 0.6)} ${f(bx - nx)} ${f(by - ny)} Z`, k % 2 ? pal.body : pal.shade, 1);
    s += line(`M${f(bx)} ${f(by)} L${f(tx - Math.cos(a) * 3)} ${f(ty - Math.sin(a) * 3)}`, 0.6, '#140F24', ' opacity="0.6"');
    for (let j = 1; j < 4; j++) {
      const px = bx + Math.cos(a) * len * j / 4, py = by + Math.sin(a) * len * j / 4;
      s += line(`M${f(px + nx * 0.8)} ${f(py + ny * 0.8)} L${f(px - nx * 0.8)} ${f(py - ny * 0.8)}`, 0.8, pal.light, ' opacity="0.55"');
    }
  }
  // Bras de l'aile et couvertures.
  const arm = 'M100 96 C84 76 62 62 40 56 C30 56 24 64 30 72 C44 80 56 96 62 114 C72 116 86 116 100 112 Z';
  s += ink(arm, pal.body, 1.6);
  s += `<clipPath id="hibouclipse-3-a"><path d="${arm}"/></clipPath><g clip-path="url(#hibouclipse-3-a)">${scales(24, 58, 104, 118, 7, 5, pal.light, 0.45)}`
    + shadow('M30 72 C44 80 56 96 62 114 C72 116 86 116 100 112 L100 104 C86 108 72 106 64 100 C56 88 44 76 30 72 Z', pal.shade, 0.7, 'fine') + `</g>`;
  s += gild('M98 98 C84 80 62 66 40 60', 1.3) + rim('M100 94 C84 74 62 60 40 54', pal.glow, 1.2);
  s += constellation([[36, 110], [52, 124], [46, 146], [62, 158]], pal.gold);
  return s;
}

const draw = (c: DrawCtx): string => {
  const { pal, stage } = c;
  if (stage <= 0) {
    // Poussin en duvet tapi au creux de l'arbre (le bord du creux passe devant).
    let s = '<g transform="translate(0 12)">' + ink(fluff(CX, 160, 44, 46, 34, 0.07), pal.light, 1.6);
    s += `<path d="${fluff(CX, 166, 26, 30, 22, 0.1)}" fill="${pal.belly}" opacity="0.9"/>` + shadow(fluff(CX + 22, 160, 22, 42, 20, 0.08), pal.shade, 0.55, 'fine');
    s += line('M84 150 q-6 12 -2 24 M138 150 q6 12 2 24', 0.8, pal.shade);
    const head = `<g transform="translate(111 96) rotate(-8) scale(0.92) translate(-111 -70)">${owlHead({ ...c, pal: { ...pal, body: pal.light } }, { tuft: 0, open: 0.32, glow: false, down: true })}</g>`;
    s += head + '</g>';
    // Lèvre du creux, devant.
    const bark = hsl(c.hue + 20, 22, 24);
    s += ink('M30 236 L32 214 C46 200 78 194 111 196 C144 194 176 200 192 214 L194 236 Z', bark, 1.8);
    s += line('M44 214 C70 204 100 202 120 204 M40 226 C70 218 140 216 186 224', 0.8, '#140F24', ' opacity="0.6"');
    s += line('M70 202 c10 -4 20 -4 30 -2 M130 202 c10 0 20 2 28 6', 1.4, hsl(c.hue + 110, 35, 42));
    s += rim('M34 212 C50 200 80 194 111 196', pal.glow, 1);
    return s;
  }
  if (stage === 1) {
    // Jeune « branchu » : encore du duvet, tête penchée vers une phalène.
    const head = `<g transform="rotate(-16 111 100)">${owlHead(c, { tuft: 8, open: 0.62, glow: false, down: true })}</g>`;
    return perched(c, { head, down: true, gold: false });
  }
  if (stage === 2) {
    const head = owlHead(c, { tuft: 22, open: 0.55, glow: false, down: false });
    return perched(c, { head, down: false, gold: true })
      + gild('M106 38 a6 6 0 1 0 10 0 a5 5 0 1 1 -10 0 Z', 1.1);
  }
  // Stade 3 : éveillé, ailes levées.
  let s = aura(CX, 100, 96, pal.glow);
  s += `<g transform="translate(111 104) scale(0.86) translate(-111 -104)">${mirror(spreadWing(c))}</g>`;
  const head = owlHead(c, { tuft: 24, open: 0.6, glow: true, down: false });
  s += `<g transform="translate(0 6)">${perched(c, { head, down: false, gold: true, wings: false })}</g>`;
  s += gild('M100 38 a12 12 0 1 0 22 0 a9 9 0 1 1 -22 0 Z', 1.3);
  for (const [x, y, z] of [[30, 200, 3], [196, 200, 3], [111, 18, 4.5], [20, 30, 3], [204, 30, 3]] as const) s += sparkle(x, y, z, pal.gold, false);
  return s;
};

/* ---------- Décor : forêt des éclipses et ruines célestes ---------- */

const sceneRaw = (c: DrawCtx, b: Bounds): string => {
  const { stage, hue } = c;
  const id = `hibouclipse-${stage}-bg`;
  const W = b.x1 - b.x0, H = b.y1 - b.y0;
  const sh = 215 + ((((hue * 1.7) % 70) + 70) % 70);
  const skyTop = [hsl(sh, 40, 10), hsl(sh - 30, 45, 30), hsl(sh, 45, 12), hsl(sh + 20, 50, 8)][stage] ?? hsl(sh, 45, 12);
  const skyBot = [hsl(sh + 20, 40, 6), hsl(sh + 40, 55, 46), hsl(sh + 10, 40, 24), hsl(sh - 20, 50, 20)][stage] ?? hsl(sh, 40, 20);
  let s = `<defs><linearGradient id="${id}-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${skyTop}"/><stop offset="1" stop-color="${skyBot}"/></linearGradient></defs>`;
  s += `<rect x="${b.x0}" y="${b.y0}" width="${W}" height="${H}" fill="url(#${id}-g)"/>`;
  for (let i = 0; i < 55; i++) s += `<circle cx="${f(b.x0 + c.r() * W)}" cy="${f(b.y0 + c.r() * H * 0.7)}" r="${f(0.3 + c.r() * 1)}" fill="#FFF6D8" opacity="${f((stage === 1 ? 0.15 : 0.3) + c.r() * 0.6)}"/>`;
  const trunkCol = hsl(hue + 20, 22, 20), trunkLight = hsl(hue + 10, 25, 34), far = hsl(sh + 10, 30, 22);
  if (stage === 0) {
    // Gros plan sur le tronc d'un vieil arbre : écorce, mousse, creux sombre ; lucioles.
    s += `<path d="M${b.x0} ${b.y0} L${b.x1} ${b.y0} L${b.x1} ${b.y1} L${b.x0} ${b.y1} Z" fill="${trunkCol}" opacity="0.92"/>`;
    let bark = '';
    for (let i = 0; i < 18; i++) { const x = b.x0 + (i / 18) * W + c.r() * 6; bark += `M${f(x)} ${f(b.y0)} C${f(x + 6)} ${f(b.y0 + H * 0.3)} ${f(x - 6)} ${f(b.y0 + H * 0.6)} ${f(x + 3)} ${f(b.y1)} `; }
    s += `<path d="${bark}" fill="none" stroke="#140F24" stroke-width="1.2" opacity="0.55"/><path d="${bark}" fill="none" stroke="${trunkLight}" stroke-width="0.6" opacity="0.5" transform="translate(2 0)"/>`;
    s += `<ellipse cx="${CX}" cy="150" rx="66" ry="80" fill="#0B0816" stroke="#140F24" stroke-width="2"/>`;
    s += `<ellipse cx="${CX}" cy="150" rx="66" ry="80" fill="none" stroke="${trunkLight}" stroke-width="5" opacity="0.6"/>`;
    for (let i = 0; i < 22; i++) { const a = Math.PI * (1.05 + i * 0.04); s += `<circle cx="${f(CX + Math.cos(a) * 68 + c.r() * 3)}" cy="${f(150 + Math.sin(a) * 82 + c.r() * 3)}" r="${f(1.6 + c.r() * 2.2)}" fill="${hsl(hue + 110, 35, 40)}" opacity="0.8"/>`; }
    for (const [x, y] of [[24, 40], [196, 70], [180, 30], [30, 228], [204, 210]] as const) s += glowDot(x, y, 7, hsl(hue + 60, 90, 75)) + `<circle cx="${x}" cy="${y}" r="1.4" fill="#FFF6D8"/>`;
  } else if (stage === 1) {
    // Crépuscule dans la canopée : cimes lointaines, croissant de lune, branche, phalène.
    s += `<circle cx="176" cy="44" r="16" fill="${hsl(sh - 40, 60, 88)}" opacity="0.9"/><circle cx="183" cy="40" r="14" fill="${skyTop}"/>`;
    s += `<path d="M${b.x0} 150 ${Array.from({ length: 12 }, (_, i) => `l${f(W / 24)} ${i % 2 ? 14 : -18} l${f(W / 24)} ${i % 2 ? -10 : 14}`).join(' ')} L${b.x1} ${b.y1} L${b.x0} ${b.y1} Z" fill="${hsl(sh + 30, 30, 36)}" opacity="0.55"/>`;
    s += `<path d="M${b.x0} 180 ${Array.from({ length: 9 }, (_, i) => `l${f(W / 18)} ${i % 2 ? 16 : -22} l${f(W / 18)} ${i % 2 ? -12 : 18}`).join(' ')} L${b.x1} ${b.y1} L${b.x0} ${b.y1} Z" fill="${hsl(sh + 30, 30, 22)}" opacity="0.85"/>`;
    s += ink(`M${b.x0} 206 C40 200 90 198 130 202 C170 206 200 196 ${b.x1} 190 L${b.x1} 202 C200 210 170 214 130 212 C90 210 40 212 ${b.x0} 218 Z`, trunkCol, 1.4);
    s += `<path d="M30 206 C60 204 100 203 130 206" fill="none" stroke="${trunkLight}" stroke-width="0.8"/>`;
    s += `<path d="M190 196 C196 186 204 178 214 176" fill="none" stroke="${trunkCol}" stroke-width="3"/><path d="M204 180 c6 -6 12 -6 14 -2 c-4 4 -10 4 -14 2 Z" fill="${hsl(hue + 110, 30, 34)}" stroke="#140F24" stroke-width="0.8"/>`;
    // Phalène qui attire son regard.
    s += `<g transform="translate(46 70) rotate(-20)"><path d="M0 0 C-8 -10 -16 -8 -14 0 C-12 4 -6 4 0 0 C6 4 12 4 14 0 C16 -8 8 -10 0 0 Z" fill="${hsl(hue + 40, 40, 70)}" stroke="#140F24" stroke-width="0.8"/><path d="M0 -2 V6" stroke="#140F24" stroke-width="1.6"/><path d="M0 -2 q-3 -5 -6 -6 M0 -2 q3 -5 6 -6" fill="none" stroke="#140F24" stroke-width="0.6"/></g>`;
    s += glowDot(46, 70, 8, hsl(hue + 40, 80, 80));
  } else if (stage === 2) {
    // Ruines célestes sous la pleine lune : colonnes brisées, brume.
    s += glowDot(60, 50, 60, hsl(sh - 40, 50, 80)) + `<circle cx="60" cy="50" r="24" fill="${hsl(sh - 40, 30, 86)}" stroke="#140F24" stroke-width="0.8" opacity="0.92"/>`;
    s += `<circle cx="52" cy="44" r="5" fill="${hsl(sh - 30, 20, 72)}" opacity="0.6"/><circle cx="68" cy="58" r="3.5" fill="${hsl(sh - 30, 20, 72)}" opacity="0.6"/>`;
    for (const [x, w, h] of [[14, 14, 90], [176, 16, 120], [204, 12, 70]] as const) {
      s += `<rect x="${x}" y="${f(b.y1 - h - (b.y1 - 236))}" width="${w}" height="${f(h + (b.y1 - 236))}" fill="${far}" stroke="#140F24" stroke-width="0.8" opacity="0.8"/>`;
      s += `<path d="M${x + 3} ${f(236 - h + 4)} V236 M${x + w - 3} ${f(236 - h + 4)} V236" stroke="${hsl(sh, 20, 40)}" stroke-width="0.6" opacity="0.6"/>`;
    }
    // Colonne du perchoir, au premier plan.
    s += ink(`M64 208 L158 208 L154 ${b.y1 + 2} L68 ${b.y1 + 2} Z`, hsl(sh - 10, 18, 40), 1.6);
    s += ink('M50 198 L172 198 L168 210 L54 210 Z', hsl(sh - 10, 18, 52), 1.4);
    s += ink('M56 194 L166 194 L172 198 L50 198 Z', hsl(sh - 10, 18, 62), 1.2);
    s += line(`M80 212 V${b.y1} M96 212 V${b.y1} M126 212 V${b.y1} M142 212 V${b.y1}`, 0.8, '#140F24', ' opacity="0.7"') + shadow(`M138 210 L158 210 L154 ${b.y1} L134 ${b.y1} Z`, hsl(sh, 30, 20), 0.6, 'fine');
    s += gild('M56 204 h110', 0.8) + gild('M60 206 c4 -4 8 -4 12 0 c4 -4 8 -4 12 0 M138 206 c4 -4 8 -4 12 0 c4 -4 8 -4 12 0', 0.7);
    s += line('M150 196 l-6 14 l4 6', 0.7, '#140F24');
    s += `<ellipse cx="111" cy="226" rx="140" ry="16" fill="${hsl(sh - 20, 30, 70)}" opacity="0.18" filter="url(#soft)"/>`;
  } else {
    // Éclipse totale au-dessus d'une mer de nuages.
    s += glowDot(CX, 84, 120, hsl(sh - 60, 80, 70));
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2, r1 = 50, r2 = 58 + (i % 3) * 10;
      s += `<path d="M${f(CX + Math.cos(a) * r1)} ${f(84 + Math.sin(a) * r1)} L${f(CX + Math.cos(a) * r2)} ${f(84 + Math.sin(a) * r2)}" stroke="#E9C25B" stroke-width="0.8" opacity="0.5"/>`;
    }
    s += `<circle cx="${CX}" cy="84" r="50" fill="#FFF0C8" opacity="0.9"/><circle cx="${CX}" cy="84" r="46" fill="#0B0816" stroke="#140F24" stroke-width="1"/>`;
    for (let k = 0; k < 3; k++) {
      const y = 196 + k * 16;
      s += `<path d="M${b.x0} ${b.y1} L${b.x0} ${y} ${Array.from({ length: 7 }, (_, i) => `q${f(W / 14)} ${-12 + (i % 2) * 4} ${f(W / 7)} 0`).join(' ')} L${b.x1} ${b.y1} Z" fill="${hsl(sh - 20 + k * 10, 30, 30 + k * 8)}" stroke="#140F24" stroke-width="0.8" opacity="${f(0.65 + k * 0.12)}"/>`;
    }
  }
  return s;
};

/** Lumière de contour de chaque stade, accordée à la source de lumière du décor. */
const RIMS = ['#C8FF9A', '#FFB0D8', '#B8DCFF', '#FFD27A'];
export const hibouclipse: Species = (c: DrawCtx) => {
  begin(`hibouclipse-${c.stage}`, RIMS[Math.min(c.stage, RIMS.length - 1)], c.pal.light);
  return unink(draw(c));
};
hibouclipse.scene = (c: DrawCtx, b: Bounds) => {
  begin(`hibouclipse-${c.stage}-bg`, RIMS[Math.min(c.stage, RIMS.length - 1)], c.pal.light);
  return unink(sceneRaw(c, b));
};
