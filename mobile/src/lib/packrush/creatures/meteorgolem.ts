import { hsl, type Bounds, type DrawCtx, type Species } from './style.ts';
import { constellation, eyeA, gild, ink, line, rim, sparkle, setKit } from './v4kit.ts';

/**
 * Météorin → Cristallos → Astrolithe : golem de météorite et de cristal. Planche de « minéralogie vivante » :
 * blocs de roche taillés en facettes (face sombre hachurée, arête éclairée), cratères d'impact, fissures où
 * rougeoie un cœur d'étoile, cristaux prismatiques qui poussent sur les épaules. Le petit vient de tomber au fond
 * d'un cratère encore fumant ; le jeune traverse une caverne de cristal, une géode en guise de lanterne ; l'adulte
 * se dresse sur un astéroïde, bras ouverts, cœur embrasé.
 */

const f = (v: number) => +v.toFixed(1);
type P2 = [number, number];

const poly = (q: P2[]) => q.map(([x, y], i) => `${i ? 'L' : 'M'}${f(x)} ${f(y)}`).join('') + 'Z';
const clip = (id: string, d: string, inner: string) => `<clipPath id="${id}"><path d="${d}"/></clipPath><g clip-path="url(#${id})">${inner}</g>`;
/** Petit décalage déterministe (-0.5..0.5) : irrégularité des blocs, identique d'une carte à l'autre. */
const jit = (i: number, k: number) => (Math.sin(i * 12.9898 + k * 78.233) * 43758.5453) % 1 * 0.5;

/**
 * Bloc de roche à facettes : aplat, face à l'ombre (en bas à droite) hachurée, facette claire en haut à gauche,
 * arêtes éclairées côté lumière, quelques cratères.
 */
function rock(c: DrawCtx, id: string, q: P2[], fill: string, o: { pits?: number; light?: string; depth?: number } = {}): string {
  const { pal } = c;
  const d = poly(q);
  let cx = 0, cy = 0;
  for (const [x, y] of q) { cx += x / q.length; cy += y / q.length; }
  let size = 0;
  for (const [x, y] of q) size = Math.max(size, Math.hypot(x - cx, y - cy));
  const k = size * (o.depth ?? 0.28);
  const lit = poly(q.map(([x, y]) => [x - k, y - k] as P2));
  const top = poly(q.map(([x, y]) => [cx + (x - cx) * 0.55 - k * 0.9, cy + (y - cy) * 0.55 - k * 0.9] as P2));
  let g = `<path d="${d}" fill="${pal.deep}"/>`;
  g += `<path d="${lit}" fill="${fill}" opacity="0.55" filter="url(#b2)"/>`;
  g += ink(d, fill, 1.6, ' opacity="0.8"', { light: [0.28, 0.22], ao: 0.7 });
  g += `<path d="${top}" fill="${pal.light}" opacity="0.22" filter="url(#b2)"/>`;
  for (let i = 0; i < (o.pits ?? 2); i++) {
    const px = cx + jit(i, q.length) * size * 1.1, py = cy + jit(i + 7, q.length) * size * 1.1, r = size * (0.08 + Math.abs(jit(i, 3)) * 0.12);
    g += `<ellipse cx="${f(px)}" cy="${f(py)}" rx="${f(r)}" ry="${f(r * 0.75)}" fill="${pal.deep}" opacity="0.6"/>`
      + `<path d="M${f(px - r)} ${f(py)} A${f(r)} ${f(r * 0.75)} 0 0 1 ${f(px + r)} ${f(py)}" fill="none" stroke="#05030C" stroke-opacity="0.3" stroke-width="0.6"/>`
      + `<path d="M${f(px - r * 0.8)} ${f(py + r * 0.3)} A${f(r)} ${f(r * 0.75)} 0 0 0 ${f(px + r * 0.8)} ${f(py + r * 0.3)}" fill="none" stroke="${pal.light}" stroke-width="0.6" opacity="0.7"/>`;
  }
  let s = clip(id, d, g) + `<path d="${d}" fill="none" stroke="#05030C" stroke-opacity="0.3" stroke-width="1.6" stroke-linejoin="round"/>`;
  // Arêtes tournées vers la lumière (haut-gauche).
  let rl = '';
  for (let i = 0; i < q.length; i++) {
    const a = q[i], b = q[(i + 1) % q.length];
    const nx = b[1] - a[1], ny = -(b[0] - a[0]);
    if (nx + ny < 0) rl += `M${f(a[0])} ${f(a[1])}L${f(b[0])} ${f(b[1])}`;
  }
  if (rl) s += rim(rl, o.light ?? pal.glow, 1.1);
  return s;
}

/** Bloc allongé entre deux articulations (membres). */
function seg(A: P2, B: P2, wa: number, wb: number, i: number): P2[] {
  const dx = B[0] - A[0], dy = B[1] - A[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l, ux = dx / l, uy = dy / l;
  const P = (t: number, side: number, w: number, j: number): P2 => {
    const x = A[0] + dx * t, y = A[1] + dy * t, ww = w * (1 + jit(i, j) * 0.25);
    return [x + nx * ww * side, y + ny * ww * side];
  };
  return [
    [A[0] - ux * wa * 0.5 + nx * wa * 0.4, A[1] - uy * wa * 0.5 + ny * wa * 0.4], P(0.05, 1, wa, 1), P(0.5, 1, (wa + wb) / 2 * 1.08, 2), P(0.95, 1, wb, 3),
    [B[0] + ux * wb * 0.45 + nx * wb * 0.3, B[1] + uy * wb * 0.45 + ny * wb * 0.3], [B[0] + ux * wb * 0.4 - nx * wb * 0.4, B[1] + uy * wb * 0.4 - ny * wb * 0.4],
    P(0.95, -1, wb, 4), P(0.5, -1, (wa + wb) / 2, 5), P(0.05, -1, wa, 6), [A[0] - ux * wa * 0.5 - nx * wa * 0.3, A[1] - uy * wa * 0.5 - ny * wa * 0.3],
  ];
}

/** Bloc arrondi autour d'un point (poing, genou, tête de petit). */
function blob(x: number, y: number, rx: number, ry: number, n: number, i: number, rot = 0): P2[] {
  return Array.from({ length: n }, (_, k) => {
    const a = (k / n) * Math.PI * 2 + rot, r = 1 + jit(i, k) * 0.28;
    return [x + Math.cos(a) * rx * r, y + Math.sin(a) * ry * r] as P2;
  });
}

/** Cristal prismatique (pointe vers `ang` degrés) : facette claire, facette sombre, arête centrale. */
function crystal(c: DrawCtx, x: number, y: number, ang: number, len: number, w: number, col: string): string {
  const L = len, h = w / 2;
  const out = `M0 ${-h} L${f(L * 0.78)} ${-h} L${L} 0 L${f(L * 0.78)} ${h} L0 ${h}Z`;
  let s = `<path d="${out}" fill="${col}"/>`;
  s += `<path d="M0 ${-h} L${f(L * 0.78)} ${-h} L${L} 0 L0 ${f(-h * 0.15)}Z" fill="#FFFFFF" opacity="0.38"/>`;
  s += `<path d="M0 ${f(h * 0.25)} L${L} 0 L${f(L * 0.78)} ${h} L0 ${h}Z" fill="${c.pal.deep}" opacity="0.45"/>`;
  s += `<path d="M0 ${f(h * 0.25)} L${L} 0" stroke="#05030C" stroke-opacity="0.3" stroke-width="0.6" opacity="0.7"/>`;
  s += `<path d="M${f(L * 0.2)} ${f(-h * 0.5)} L${f(L * 0.6)} ${f(-h * 0.5)}" stroke="#FFFFFF" stroke-width="0.8" opacity="0.8"/>`;
  s += `<path d="${out}" fill="none" stroke="#05030C" stroke-opacity="0.3" stroke-width="1.1" stroke-linejoin="round"/>`;
  return `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(ang)})">${s}</g>`;
}

/** Grappe de cristaux en éventail. */
function cluster(c: DrawCtx, x: number, y: number, base: number, sizes: number[], col: string, col2: string): string {
  let s = `<circle cx="${f(x + Math.cos(base * Math.PI / 180) * sizes[0] * 0.5)}" cy="${f(y + Math.sin(base * Math.PI / 180) * sizes[0] * 0.5)}" r="${f(sizes[0] * 0.6)}" fill="${c.pal.glow}" opacity="0.35" filter="url(#soft)"/>`;
  sizes.forEach((L, i) => {
    const a = base + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 17;
    s += crystal(c, x, y, a, L, L * 0.3, i % 2 ? col2 : col);
  });
  return s;
}

/** Cœur d'étoile visible dans une cavité, fissures incandescentes rayonnantes. */
function core(c: DrawCtx, x: number, y: number, r: number, cracks: P2[][]): string {
  const { pal } = c;
  let s = '';
  for (const cr of cracks) {
    const d = cr.map(([a, b], i) => `${i ? 'L' : 'M'}${f(a)} ${f(b)}`).join('');
    s += `<path d="${d}" fill="none" stroke="${pal.glow}" stroke-width="2.6" opacity="0.6" filter="url(#glow)"/><path d="${d}" fill="none" stroke="#FFF6D8" stroke-width="0.9"/>`;
  }
  s += `<circle cx="${x}" cy="${y}" r="${f(r * 2.2)}" fill="${pal.glow}" opacity="0.5" filter="url(#soft)"/>`;
  s += ink(poly(blob(x, y, r, r * 0.95, 9, 5)), pal.deep, 1.4);
  s += `<circle cx="${x}" cy="${y}" r="${f(r * 0.7)}" fill="${pal.glow}" filter="url(#glow)"/><circle cx="${x}" cy="${y}" r="${f(r * 0.4)}" fill="#FFF6D8"/>`;
  s += sparkle(x, y, r * 0.95, '#FFFFFF', false);
  return s;
}

interface Pose {
  chest: P2; ts: number; head: P2; hs: number;
  sh: [P2, P2]; el: [P2, P2]; ha: [P2, P2]; hip: [P2, P2]; kn: [P2, P2]; ft: [P2, P2];
  arm: number; leg: number; crystals: number;
}

/** Golem articulé : membres en blocs, torse massif, cœur, cristaux. Le membre « 1 » (droite du dessin) est derrière. */
function golem(c: DrawCtx, id: string, P: Pose, extra: { hand0?: string } = {}): string {
  const { pal } = c;
  const col = pal.body, col2 = pal.accent2, col3 = pal.glow;
  let s = '';
  const limb = (k: 0 | 1, fill: string) => {
    let t = '';
    t += rock(c, `${id}-lt${k}`, seg(P.hip[k], P.kn[k], P.leg, P.leg * 0.9, 10 + k), fill, { pits: 1 });
    t += rock(c, `${id}-ls${k}`, seg(P.kn[k], P.ft[k], P.leg * 0.85, P.leg * 0.95, 20 + k), fill, { pits: 1 });
    const [fx, fy] = P.ft[k];
    t += rock(c, `${id}-lf${k}`, [[fx - P.leg * 1.2, fy + 2], [fx - P.leg * 1.1, fy - P.leg * 0.5], [fx - P.leg * 0.2, fy - P.leg * 0.9], [fx + P.leg * 0.9, fy - P.leg * 0.6], [fx + P.leg * 1.2, fy + 2]], fill, { pits: 0 });
    return t;
  };
  const arm = (k: 0 | 1, fill: string) => {
    let t = '';
    t += rock(c, `${id}-au${k}`, seg(P.sh[k], P.el[k], P.arm, P.arm * 0.85, 30 + k), fill, { pits: 1 });
    t += rock(c, `${id}-af${k}`, seg(P.el[k], P.ha[k], P.arm * 0.85, P.arm * 1.1, 40 + k), fill, { pits: 1 });
    t += rock(c, `${id}-ah${k}`, blob(P.ha[k][0], P.ha[k][1], P.arm * 1.15, P.arm * 1.05, 7, 50 + k), fill, { pits: 1 });
    const [hx, hy] = P.ha[k];
    t += line(`M${f(hx - P.arm * 0.6)} ${f(hy + P.arm * 0.2)} l${f(P.arm * 0.4)} ${f(P.arm * 0.4)} M${f(hx)} ${f(hy + P.arm * 0.4)} l0 ${f(P.arm * 0.5)} M${f(hx + P.arm * 0.6)} ${f(hy + P.arm * 0.2)} l${f(-P.arm * 0.3)} ${f(P.arm * 0.5)}`, 0.9);
    return t;
  };
  const back = pal.shade;
  // Membres arrière (plus sombres).
  s += `<g opacity="0.92">${limb(1, back)}${arm(1, back)}</g>`;
  // Bassin.
  const [cx, cy] = P.chest, T = P.ts;
  s += rock(c, `${id}-pv`, [[cx - 26 * T, cy + 36 * T], [cx + 26 * T, cy + 36 * T], [cx + 30 * T, cy + 54 * T], [cx, cy + 62 * T], [cx - 30 * T, cy + 54 * T]], col, { pits: 1 });
  s += limb(0, col);
  // Torse : gros bloc taillé.
  const torso: P2[] = [[-41, -38], [-19, -48], [19, -48], [45, -36], [51, -4], [39, 32], [13, 44], [-15, 44], [-39, 32], [-49, -4]].map(([x, y]) => [cx + x * T, cy + y * T] as P2);
  s += rock(c, `${id}-to`, torso, col, { pits: 3, depth: 0.2 });
  s += line(`M${f(cx - 30 * T)} ${f(cy - 20 * T)} L${f(cx - 8 * T)} ${f(cy - 30 * T)} M${f(cx + 10 * T)} ${f(cy + 30 * T)} L${f(cx + 30 * T)} ${f(cy + 14 * T)}`, 0.8, '#140F24', ' opacity="0.7"');
  s += core(c, cx, cy - 2 * T, 11 * T, [
    [[cx, cy - 2 * T], [cx - 18 * T, cy - 10 * T], [cx - 34 * T, cy - 4 * T]],
    [[cx, cy - 2 * T], [cx + 16 * T, cy - 18 * T], [cx + 30 * T, cy - 30 * T]],
    [[cx, cy], [cx + 6 * T, cy + 20 * T], [cx - 4 * T, cy + 38 * T]],
    [[cx, cy], [cx + 24 * T, cy + 6 * T], [cx + 42 * T, cy + 2 * T]],
  ]);
  // Épaulières + cristaux.
  for (const k of [1, 0] as const) {
    const [sx, sy] = P.sh[k];
    s += rock(c, `${id}-sp${k}`, blob(sx, sy - 4, P.arm * 1.7, P.arm * 1.35, 7, 60 + k, 0.3), k ? back : col, { pits: 1 });
    if (P.crystals > 0) s += cluster(c, sx + (k ? 4 : -4), sy - P.arm * 0.9, k ? -70 : -110, [34, 24, 22, 14].map((v) => v * P.crystals), k ? col3 : col2, k ? col2 : col3);
  }
  s += arm(0, col);
  if (extra.hand0) s += extra.hand0;
  // Tête : petit bloc enfoncé entre les épaules, arcade lourde, yeux de braise.
  const [hx, hy] = P.head, H = P.hs;
  const hq: P2[] = [[-16, -12], [-4, -20], [12, -16], [18, -2], [12, 12], [-6, 14], [-18, 4]].map(([x, y]) => [hx + x * H, hy + y * H] as P2);
  s += rock(c, `${id}-hd`, hq, col, { pits: 1 });
  s += `<path d="M${f(hx - 16 * H)} ${f(hy - 3 * H)} L${f(hx + 16 * H)} ${f(hy - 5 * H)} L${f(hx + 14 * H)} ${f(hy + 2 * H)} L${f(hx - 15 * H)} ${f(hy + 4 * H)}Z" fill="${pal.deep}" stroke="#05030C" stroke-opacity="0.3" stroke-width="1"/>`;
  for (const ex of [-8, 7]) {
    s += `<circle cx="${f(hx + ex * H)}" cy="${f(hy)}" r="${f(5 * H)}" fill="${pal.eye}" opacity="0.55" filter="url(#soft)"/>`;
    s += eyeA(hx + ex * H, hy + 0.5 * H, 4 * H, pal.eye, { angle: ex < 0 ? 6 : -6, slit: false, open: 0.38 });
  }
  if (P.crystals > 0.6) s += cluster(c, hx + 4 * H, hy - 16 * H, -95, [16, 11, 10].map((v) => v * P.crystals), col3, col2);
  return s;
}

export const meteorgolem: Species = (c) => {
  const { pal, stage } = c;
  const id = `meteorgolem-${stage}`;
  setKit(id, c.pal, (['#9FD0FF', c.pal.accent2, '#FFD9A0'])[Math.min(2, stage)]);
  if (stage === 0) {
    // Météorin, tout juste tombé : recroquevillé au fond de son cratère, encore fumant, il ouvre un œil.
    let s = `<ellipse cx="112" cy="194" rx="60" ry="12" fill="#000" opacity="0.4"/>`;
    // Volutes de vapeur.
    for (const [x, k] of [[78, 1], [126, -1], [150, 1]] as const) s += line(`M${x} 140 c${k * 8} -10 ${k * -6} -20 ${k * 2} -32 c${k * 8} -10 ${k * -4} -20 ${k * 4} -30`, 1.2, '#FFF6D8', ' opacity="0.4"');
    const shell: P2[] = [[64, 186], [62, 160], [76, 136], [100, 122], [132, 120], [156, 132], [168, 156], [164, 184], [140, 194], [90, 196]];
    s += rock(c, `${id}-sh`, shell, pal.body, { pits: 4, depth: 0.22 });
    s += core(c, 136, 150, 5, [[[136, 150], [150, 140], [160, 146]], [[136, 150], [128, 168], [134, 184]], [[136, 150], [112, 140], [96, 130]]]);
    s += cluster(c, 110, 124, -80, [22, 15, 13], pal.accent2, pal.glow) + cluster(c, 150, 130, -50, [14, 10], pal.glow, pal.accent2);
    // Petite tête rentrée, un œil entrouvert, une main posée sur le bord.
    const hq: P2[] = [[56, 160], [66, 146], [86, 142], [100, 152], [100, 172], [86, 182], [64, 180]];
    s += rock(c, `${id}-hd`, hq, pal.body, { pits: 1, depth: 0.2 });
    s += `<path d="M58 158 L68 152 L98 154 L96 160 L66 161Z" fill="${pal.deep}" stroke="#05030C" stroke-opacity="0.3" stroke-width="0.9"/>`;
    s += `<circle cx="72" cy="166" r="7" fill="${pal.eye}" opacity="0.6" filter="url(#soft)"/>` + eyeA(72, 166.5, 4.8, pal.eye, { slit: false, open: 0.42, angle: 4 });
    s += line('M84 166 q5 3 10 0', 1.3) + line('M62 174 l8 1 M76 176 l6 -1', 0.7, '#140F24', ' opacity="0.7"');
    s += rock(c, `${id}-hn`, blob(58, 186, 10, 8, 6, 9), pal.body, { pits: 0 });
    // Lèvre avant du cratère (couvre le bas du corps).
    const lip = `M10 236 L14 196 C40 184 70 194 112 196 C150 198 180 186 212 194 L214 236Z`;
    s += `<path d="${lip}" fill="${hsl(235 + (c.hue - 200) * 0.1 + 10, 12, 24)}" stroke="#05030C" stroke-opacity="0.3" stroke-width="1.4"/>` + clip(`${id}-lp`, lip, `<path d="${lip}" fill="url(#xhatch)" opacity="0.45"/>`
      + line('M30 200 l10 16 l-6 18 M180 200 l-8 18 l10 16 M100 204 l6 14', 0.8, '#140F24'));
    s += rim('M14 196 C40 184 70 194 112 196 C150 198 180 186 212 194', pal.glow, 1.3);
    for (let i = 0; i < 7; i++) s += `<circle cx="${f(40 + i * 24 + c.r() * 8)}" cy="${f(194 + c.r() * 6)}" r="${f(1 + c.r())}" fill="${pal.glow}" filter="url(#glow)"/>`;
    return `<g transform="translate(111 200) scale(1.15) translate(-112 -196)">${s}</g>`;
  }
  if (stage === 1) {
    // Cristallos traverse une caverne de cristal, une géode lumineuse brandie comme une lanterne.
    const lantern = `<circle cx="44" cy="112" r="26" fill="${pal.glow}" opacity="0.45" filter="url(#soft)"/>` + cluster(c, 44, 122, -90, [26, 18, 18, 12], pal.glow, pal.accent2) + sparkle(44, 104, 5, '#FFFFFF', false);
    const P: Pose = {
      chest: [118, 104], ts: 0.78, head: [96, 66], hs: 0.95,
      sh: [[90, 80], [146, 82]], el: [[66, 110], [160, 124]], ha: [[48, 128], [166, 160]],
      hip: [[108, 150], [132, 150]], kn: [[96, 176], [140, 176]], ft: [[84, 202], [154, 202]],
      arm: 11, leg: 11.5, crystals: 0.75,
    };
    const s = `<ellipse cx="118" cy="204" rx="62" ry="7" fill="#000" opacity="0.35"/>` + golem(c, id, P, { hand0: lantern });
    return `<g transform="translate(111 204) scale(1.06) translate(-114 -204)">${s}</g>`;
  }
  // Astrolithe : debout sur un astéroïde, bras ouverts, le cœur embrasé.
  const P: Pose = {
    chest: [111, 106], ts: 1, head: [111, 50], hs: 1.05,
    sh: [[62, 78], [160, 78]], el: [[38, 112], [184, 112]], ha: [[28, 150], [194, 150]],
    hip: [[92, 160], [130, 160]], kn: [[82, 184], [140, 184]], ft: [[76, 206], [146, 206]],
    arm: 14, leg: 15, crystals: 1.45,
  };
  let s = `<ellipse cx="111" cy="208" rx="70" ry="8" fill="#000" opacity="0.4"/>`;
  s += `<circle cx="111" cy="104" r="70" fill="${pal.glow}" opacity="0.25" filter="url(#soft)"/>`;
  // Le corps est symétrique : on dessine le membre arrière en miroir pour une pose frontale.
  s += golem(c, id, P);
  s += `<circle cx="111" cy="104" r="24" fill="none" stroke="${pal.gold}" stroke-width="0.9" stroke-dasharray="5 2 1 2"/>` + gild('M111 76 l3 5 l-3 5 l-3 -5Z M111 122 l3 5 l-3 5 l-3 -5Z', 1);
  for (const [x, y, z] of [[20, 100, 3], [204, 96, 3.4], [111, 8, 3]] as const) s += sparkle(x, y, z, pal.glow, false);
  if (stage >= 3) s += constellation([[20, 30], [40, 18], [58, 28]], pal.gold);
  return `<g transform="translate(111 210) scale(0.98) translate(-111 -210)">${s}</g>`;
};

/* ---------- Décors : désert lunaire, caverne de cristal, champ d'astéroïdes ---------- */

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

/** Rocher lointain, peu contrasté (perspective atmosphérique). */
function farRock(q: P2[], fill: string, op = 1): string {
  return `<path d="${poly(q)}" fill="${fill}" stroke="#05030C" stroke-opacity="0.3" stroke-width="0.6" opacity="${op}"/><path d="${poly(q)}" fill="url(#fine)" opacity="${f(0.35 * op)}"/>`;
}

meteorgolem.scene = (c: DrawCtx, b: Bounds): string => {
  const { stage, pal } = c;
  const id = `meteorgolem-${stage}-bg`;
  setKit(id, c.pal, (['#9FD0FF', c.pal.accent2, '#FFD9A0'])[Math.min(2, stage)]);
  const W = b.x1 - b.x0, Hh = b.y1 - b.y0;
  const S = 235 + (c.hue - 200) * 0.1;
  let s = '';
  if (stage === 0) {
    // Désert lunaire : planète bleue au-dessus de l'horizon, traînée du météore, cratère au premier plan.
    s += `<defs>${grad(`${id}-sky`, [[0, hsl(S, 45, 6)], [1, hsl(S, 30, 18)]])}</defs>`;
    s += `<rect x="${b.x0}" y="${b.y0}" width="${W}" height="${Hh}" fill="url(#${id}-sky)"/>` + stars(c, b, 80, 130);
    s += `<circle cx="168" cy="52" r="30" fill="${hsl(S - 30, 40, 50)}" opacity="0.25" filter="url(#soft)"/>`;
    s += `<circle cx="168" cy="52" r="22" fill="${hsl(S - 30, 35, 42)}" stroke="#05030C" stroke-opacity="0.3" stroke-width="0.8"/>`;
    s += clip(`${id}-pl`, 'M146 52 a22 22 0 1 0 44 0 a22 22 0 1 0 -44 0', `<path d="M146 46 q12 -6 22 2 t22 -2 M150 60 q14 4 26 -4" fill="none" stroke="#FFF6D8" stroke-width="2" opacity="0.4"/><circle cx="160" cy="62" r="24" fill="${hsl(S, 45, 8)}" opacity="0.6"/>`);
    s += `<path d="M10 20 L96 120" stroke="${pal.glow}" stroke-width="3" opacity="0.35" filter="url(#glow)"/><path d="M10 20 L96 120" stroke="#FFF6D8" stroke-width="0.8" opacity="0.7"/>`;
    s += farRock([[b.x0 - 10, 150], [20, 132], [44, 130], [60, 146], [100, 148], [120, 136], [150, 134], [170, 148], [b.x1 + 10, 146], [b.x1 + 10, 170], [b.x0 - 10, 170]], hsl(S, 12, 34), 0.9);
    const plain = `M${b.x0 - 10} 158 C60 150 160 152 ${b.x1 + 10} 158 L${b.x1 + 10} ${b.y1 + 10} L${b.x0 - 10} ${b.y1 + 10}Z`;
    s += `<path d="${plain}" fill="${hsl(S + 10, 10, 30)}"/>`;
    s += `<ellipse cx="112" cy="190" rx="100" ry="30" fill="${hsl(S + 10, 14, 16)}" stroke="#05030C" stroke-opacity="0.3" stroke-width="0.8"/>`;
    s += `<ellipse cx="112" cy="190" rx="100" ry="30" fill="url(#xhatch)" opacity="0.4"/>`;
    s += `<ellipse cx="112" cy="196" rx="60" ry="14" fill="${pal.glow}" opacity="0.25" filter="url(#soft)"/>`;
    for (const [x, y, r] of [[30, 172, 8], [190, 166, 6], [170, 220, 9]] as const) s += `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${f(r * 0.35)}" fill="${hsl(S + 10, 12, 20)}" stroke="#05030C" stroke-opacity="0.3" stroke-width="0.6"/>`;
    return s;
  }
  if (stage === 1) {
    // Caverne de cristal : parois sombres, stalactites, grappes de cristaux luisants, rai de lumière.
    s += `<rect x="${b.x0}" y="${b.y0}" width="${W}" height="${Hh}" fill="${hsl(S + 20, 30, 9)}"/>`;
    s += `<ellipse cx="130" cy="110" rx="90" ry="80" fill="${pal.accent2}" opacity="0.18" filter="url(#soft)"/>`;
    s += `<path d="M150 ${b.y0} L190 ${b.y0} L140 220 L100 220Z" fill="#FFF6D8" opacity="0.07"/>`;
    s += farRock([[b.x0 - 10, b.y0 - 10], [b.x1 + 10, b.y0 - 10], [b.x1 + 10, 30], [190, 40], [176, 60], [164, 36], [140, 46], [124, 30], [100, 50], [86, 30], [60, 44], [44, 70], [30, 40], [b.x0 - 10, 50]], hsl(S + 20, 16, 18));
    s += farRock([[b.x0 - 10, 40], [24, 60], [30, 120], [20, 200], [b.x0 - 10, 210]], hsl(S + 20, 16, 16));
    s += farRock([[b.x1 + 10, 30], [196, 70], [204, 140], [196, 200], [b.x1 + 10, 214]], hsl(S + 20, 16, 16));
    for (const [x, y, a, k] of [[30, 120, -40, 0.8], [200, 140, -140, 1], [180, 60, 120, 0.6], [60, 44, 80, 0.5], [120, 36, 95, 0.5]] as const) s += `<g opacity="0.75">${cluster(c, x, y, a, [26, 18, 16, 12].map((v) => v * k), pal.accent2, pal.accent)}</g>`;
    const floor = `M${b.x0 - 10} 196 C50 190 170 192 ${b.x1 + 10} 198 L${b.x1 + 10} ${b.y1 + 10} L${b.x0 - 10} ${b.y1 + 10}Z`;
    s += `<path d="${floor}" fill="${hsl(S + 20, 14, 20)}" stroke="#05030C" stroke-opacity="0.3" stroke-width="0.8"/><path d="${floor}" fill="url(#fine)" opacity="0.5"/>`;
    s += `<ellipse cx="60" cy="214" rx="50" ry="8" fill="${pal.accent2}" opacity="0.18"/>`;
    for (const [x, k] of [[190, 0.7], [16, 0.5]] as const) s += cluster(c, x, 210, -90, [20, 14, 12].map((v) => v * k), pal.accent, pal.accent2);
    return s;
  }
  // Champ d'astéroïdes devant une planète à anneaux, nébuleuse ; un gros astéroïde sert de piédestal.
  s += `<defs>${grad(`${id}-sky`, [[0, hsl(S + 30, 50, 6)], [1, hsl(S, 40, 14)]])}</defs>`;
  s += `<rect x="${b.x0}" y="${b.y0}" width="${W}" height="${Hh}" fill="url(#${id}-sky)"/>`;
  s += `<ellipse cx="60" cy="70" rx="90" ry="40" fill="${pal.accent}" opacity="0.2" filter="url(#soft)"/><ellipse cx="180" cy="150" rx="70" ry="50" fill="${pal.accent2}" opacity="0.16" filter="url(#soft)"/>`;
  s += stars(c, b, 90, b.y1);
  s += `<circle cx="178" cy="40" r="20" fill="${hsl(S + 140, 25, 40)}" stroke="#05030C" stroke-opacity="0.3" stroke-width="0.8"/><circle cx="184" cy="46" r="20" fill="${hsl(S, 40, 10)}" opacity="0.5"/>`;
  s += `<ellipse cx="178" cy="40" rx="36" ry="7" fill="none" stroke="${hsl(S + 140, 25, 70)}" stroke-width="1.4" transform="rotate(-18 178 40)" opacity="0.8"/>`;
  for (let i = 0; i < 12; i++) {
    const x = b.x0 + c.r() * W, y = b.y0 + 20 + c.r() * 160, r = 3 + c.r() * 9;
    if (Math.abs(x - 111) < 50 && y > 40) continue;
    s += farRock(blob(x, y, r, r * 0.8, 7, i), hsl(S + 10, 12, 22 + r), 0.85);
  }
  const ast: P2[] = [[b.x0 - 10, 216], [20, 204], [60, 200], [100, 206], [150, 202], [190, 206], [b.x1 + 10, 212], [b.x1 + 10, b.y1 + 10], [b.x0 - 10, b.y1 + 10]];
  s += `<path d="${poly(ast)}" fill="${hsl(S + 10, 12, 22)}" stroke="#05030C" stroke-opacity="0.3" stroke-width="1"/>`;
  s += clip(`${id}-as`, poly(ast), `<path d="${poly(ast)}" fill="url(#xhatch)" opacity="0.5"/>` + `<ellipse cx="50" cy="222" rx="16" ry="4" fill="${hsl(S, 20, 12)}"/><ellipse cx="170" cy="226" rx="20" ry="5" fill="${hsl(S, 20, 12)}"/>`);
  s += rim(`M${b.x0 - 10} 216 L20 204 L60 200 L100 206 L150 202 L190 206 L${b.x1 + 10} 212`, pal.glow, 1);
  return s;
};
