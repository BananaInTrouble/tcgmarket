import { aura, constellation, eyeA, gild, ground, line, rim, shadow, sparkle, speckles, type DrawCtx, type Species } from './style.ts';
import { part, spl, tube, turn, type Pw } from './cervastre.ts';

const f = (v: number) => +v.toFixed(1);
type Pt = [number, number];

/** Écailles : rangées de petits arcs (à découper dans la forme). */
function scales(x0: number, y0: number, x1: number, y1: number, sz: number, op = 0.35): string {
  let d = '';
  let row = 0;
  for (let y = y0; y < y1; y += sz * 0.8, row++) {
    for (let x = x0 + (row % 2) * sz * 0.5; x < x1; x += sz) d += `M${f(x)} ${f(y)} q${f(sz / 2)} ${f(sz * 0.55)} ${f(sz)} 0 `;
  }
  return `<path d="${d}" fill="none" stroke="#140F24" stroke-width="0.5" opacity="${op}"/>`;
}

/** Comète : noyau éclatant et chevelure de traînées. `ang` = direction de la traîne (degrés). */
function comet(c: DrawCtx, x: number, y: number, ang: number, len: number): string {
  const { pal } = c;
  const a = (ang * Math.PI) / 180;
  let o = `<circle cx="${f(x)}" cy="${f(y)}" r="${f(len * 0.28)}" fill="${pal.glow}" opacity="0.5" filter="url(#soft)"/>`;
  const streaks: [number, number, number, string][] = [[0, 1, 4.2, pal.accent2], [0.16, 0.8, 2.6, pal.glow], [-0.18, 0.75, 2.4, pal.accent], [0.05, 0.95, 1.6, '#FFF6D8']];
  for (const [da, k, w, col] of streaks) {
    const pts: Pw[] = [];
    for (let i = 0; i <= 4; i++) {
      const t = i / 4, aa = a + da * t + Math.sin(t * 3) * 0.06;
      pts.push([x + Math.cos(aa) * len * k * t, y + Math.sin(aa) * len * k * t, w * (1 - t * 0.92)]);
    }
    o += `<path d="${tube(pts)}" fill="${col}" opacity="0.8"/>`;
  }
  o += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(len * 0.07 + 2)}" fill="#FFF6D8" stroke="#140F24" stroke-width="1"/>` + sparkle(x, y, len * 0.12 + 3, '#FFF6D8', false);
  return o;
}

interface Pose {
  body: Pw[]; neck: Pw[]; tail: Pw[];
  head: { x: number; y: number; s: number; r: number };
  hind: Pw[]; hindFar?: Pw[]; arm?: Pw[]; armFar?: Pw[];
  wing: { sh: Pt; el: Pt; wr: Pt; tips: Pt[]; root: Pt; w: number };
  farWing: { dx: number; dy: number; s: number; mirror?: boolean };
  horn: number; spines: number;
}

/** Tête de dragon de profil (vers la gauche), origine à la nuque. */
function head(c: DrawCtx, id: string, st: number, hl: number): string {
  const { pal } = c;
  let o = '';
  const hs = st === 0 ? 0.55 : 1;
  const H0 = (ps: Pw[]) => ps.map(([x, y, w]) => [x, y * hs, w * (0.6 + hs * 0.4)] as Pw);
  // Corne de l'arrière.
  const hornF = tube(H0([[-4, -10, 2.8], [6, -17, 2.4], [16 + hl * 4, -22 - hl * 3, 1.5], [24 + hl * 10, -24 - hl * 7, 0.4]]));
  o += part(`${id}-hf`, hornF, pal.shade, '', 1.1);
  // Collerette d'épines de la joue.
  o += `<path d="M2 8 L18 4 L8 12 L20 14 L6 16 L14 22 L0 16 Z" fill="${pal.deep}" stroke="#140F24" stroke-width="1" stroke-linejoin="round"/>`;
  const H = 'M4 -6 C-4 -15 -16 -17 -25 -13 C-33 -10 -41 -8 -47 -4 C-51 -2 -51 2 -47 4 C-40 6 -30 6 -19 7 C-29 9 -36 10 -41 11 C-35 16 -19 17 -7 15 C3 13 9 5 4 -6 Z';
  let hi = '';
  hi += shadow('M-50 6 C-36 8 -20 8 -4 2 C2 0 8 -2 12 -6 L12 24 L-50 24 Z', pal.shade, 0.85, 'fine');
  hi += shadow('M-44 9 C-30 13 -14 13 0 10 L0 24 L-44 24 Z', pal.deep, 0.5, 'xhatch');
  hi += `<path d="M-41 11 C-34 14 -20 15 -8 13 C-18 12 -30 12 -41 11 Z" fill="${pal.belly}" opacity="0.8"/>`;
  hi += scales(-20, -14, 6, 4, 3.4, 0.3);
  hi += line('M-47 4 C-38 6 -26 7 -12 6', 1.1);
  for (let x = -44; x < -18; x += 4) hi += `<path d="M${x} 4.6 l1 2.2 l1 -2" fill="#FFF6D8" stroke="#140F24" stroke-width="0.4"/>`;
  hi += `<path d="M-45 -4 C-43 -6 -40 -5 -40 -3 C-42 -2 -44 -2 -45 -4 Z" fill="#140F24"/>`;
  hi += line('M-34 -9 C-26 -15 -16 -15 -8 -11', 2, '#140F24');
  hi += eyeA(-19, -7, 4.4, pal.eye, { angle: -10, slit: true, open: 0.5 });
  if (st >= 2) hi += gild('M-38 -7 C-30 -12 -22 -13 -12 -12 M-6 -9 c4 2 6 6 5 10', 0.8);
  o += part(`${id}-h`, H, pal.body, hi, 1.6);
  o += rim('M-25 -13 C-33 -10 -41 -8 -47 -4', pal.glow, 1);
  if (st >= 2) o += `<circle cx="-19" cy="-7" r="7" fill="${pal.eye}" opacity="0.35" filter="url(#soft)"/>`;
  // Corne de devant, annelée.
  const hornN: Pw[] = H0([[-8, -12, 3.2], [2, -20, 2.7], [12 + hl * 4, -26 - hl * 3, 1.8], [20 + hl * 10, -30 - hl * 8, 0.4]]);
  const hn = tube(hornN);
  let hni = turn(hn, pal.light, pal.shade, -1.2, -1);
  if (st > 0) for (let i = 1; i < 4; i++) hni += line(`M${f(-4 + i * 5)} ${f(-22 - i * 1.5)} l4 4`, 0.6, '#140F24', ' opacity="0.6"');
  if (st >= 2) hni += gild(spl(hornN.map(([x, y]) => [x - 0.6, y - 0.8] as Pt)), 0.8);
  o += part(`${id}-hn`, hn, pal.light, hni, 1.2);
  return o;
}

/** Aile de chauve-souris : os en tubes, membrane-ciel nocturne avec nébuleuse et étoiles. */
function wing(c: DrawCtx, id: string, w: Pose['wing'], far: boolean, st: number): string {
  const { pal } = c;
  const { sh, el, wr, tips, root } = w;
  // Membrane : bord d'attaque épaule→coude→poignet→1re pointe, puis festons entre les pointes, retour au flanc.
  let d = `M${f(sh[0])} ${f(sh[1])} L${f(el[0])} ${f(el[1])} L${f(wr[0])} ${f(wr[1])} L${f(tips[0][0])} ${f(tips[0][1])}`;
  for (let i = 1; i < tips.length; i++) {
    const [ax, ay] = tips[i - 1], [bx, by] = tips[i];
    const mx = (ax + bx) / 2 + (wr[0] - (ax + bx) / 2) * 0.28, my = (ay + by) / 2 + (wr[1] - (ay + by) / 2) * 0.28;
    d += ` Q${f(mx)} ${f(my)} ${f(bx)} ${f(by)}`;
  }
  const lt = tips[tips.length - 1];
  d += ` Q${f((lt[0] + root[0]) / 2 + (wr[0] - (lt[0] + root[0]) / 2) * 0.3)} ${f((lt[1] + root[1]) / 2 + (wr[1] - (lt[1] + root[1]) / 2) * 0.3)} ${f(root[0])} ${f(root[1])} Z`;
  let mi = `<path d="${d}" fill="${far ? pal.deep : pal.deep}"/>`;
  const cx = (wr[0] + lt[0] + tips[0][0]) / 3, cy = (wr[1] + lt[1] + tips[0][1]) / 3;
  mi += `<g clip-path="url(#${id}-m)"><ellipse cx="${f(cx)}" cy="${f(cy)}" rx="34" ry="20" fill="${pal.accent}" opacity="${far ? 0.25 : 0.45}" filter="url(#soft)"/>`
    + `<ellipse cx="${f((cx + root[0]) / 2)}" cy="${f((cy + root[1]) / 2)}" rx="24" ry="16" fill="${pal.accent2}" opacity="${far ? 0.2 : 0.4}" filter="url(#soft)"/></g>`;
  for (let i = 0; i < (far ? 10 : 22); i++) {
    const t = tips[Math.floor(c.r() * tips.length)], u = c.r() * 0.85, v = c.r();
    const x = wr[0] + (t[0] - wr[0]) * u + (root[0] - wr[0]) * v * (1 - u) * 0.6, y = wr[1] + (t[1] - wr[1]) * u + (root[1] - wr[1]) * v * (1 - u) * 0.6;
    mi += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(0.4 + c.r() * 1)}" fill="#FFF6D8" opacity="${f(0.4 + c.r() * 0.6)}"/>`;
  }
  // Nervures fines de la membrane.
  for (const t of tips) mi += line(`M${f(wr[0])} ${f(wr[1])} Q${f((wr[0] + t[0]) / 2 + 4)} ${f((wr[1] + t[1]) / 2 + 6)} ${f((wr[0] + t[0] * 3) / 4)} ${f((wr[1] + t[1] * 3) / 4)}`, 0.4, pal.light, ' opacity="0.35"');
  mi += shadow(`M${f(sh[0])} ${f(sh[1])} L${f(el[0])} ${f(el[1])} L${f(root[0])} ${f(root[1])} Z`, '#000', 0.25, 'fine');
  if (!far && st >= 2) mi += constellation(tips.slice(1).map(([x, y], i) => [x + (wr[0] - x) * (0.3 + i * 0.05), y + (wr[1] - y) * (0.3 + i * 0.05)] as Pt), pal.gold);
  let o = part(`${id}-m`, d, pal.deep, mi, far ? 1.1 : 1.4);
  // Os : bras, avant-bras, doigts.
  const bone = far ? pal.shade : pal.body;
  const ww = w.w * (far ? 0.85 : 1);
  const arm = tube([[sh[0], sh[1], ww * 2.2], [(sh[0] + el[0]) / 2, (sh[1] + el[1]) / 2, ww * 1.7], [el[0], el[1], ww * 1.4], [(el[0] + wr[0]) / 2, (el[1] + wr[1]) / 2, ww * 1.1], [wr[0], wr[1], ww * 1.2]]);
  o += part(`${id}-ar`, arm, bone, turn(arm, bone, pal.shade, -1.5, -1.5) + scales(Math.min(sh[0], wr[0]) - 10, Math.min(sh[1], wr[1]) - 10, Math.max(sh[0], wr[0]) + 10, Math.max(sh[1], wr[1]) + 10, 3, 0.25), far ? 1.1 : 1.4);
  tips.forEach((t, i) => {
    const mx = wr[0] + (t[0] - wr[0]) * 0.5, my = wr[1] + (t[1] - wr[1]) * 0.5 - 3;
    o += part(`${id}-d${i}`, tube([[wr[0], wr[1], ww * 0.9], [mx, my, ww * 0.55], [t[0], t[1], ww * 0.2]]), bone, '', far ? 0.9 : 1.1);
  });
  // Griffe du pouce.
  o += `<path d="M${f(wr[0])} ${f(wr[1] - 2)} q-3 -7 -9 -8 q5 4 6 10 Z" fill="${pal.light}" stroke="#140F24" stroke-width="0.9"/>`;
  if (!far) o += rim(`M${f(sh[0])} ${f(sh[1])} L${f(el[0])} ${f(el[1])} L${f(wr[0])} ${f(wr[1])}`, pal.glow, 1);
  return o;
}

/** Patte griffue : tube + trois doigts. */
function limb(c: DrawCtx, id: string, pts: Pw[], fill: string, far: boolean, dir = -1): string {
  const d = tube(pts);
  const e = pts[pts.length - 1];
  let o = part(id, d, fill, (far ? shadow(d, c.pal.deep, 0.4, 'fine') : turn(d, fill, c.pal.shade, -pts[0][2] * 0.4, -2)) + scales(e[0] - 30, Math.min(...pts.map((p) => p[1])) - 10, e[0] + 30, e[1] + 4, 3.4, 0.3), far ? 1.2 : 1.5);
  for (const k of [-1, 0, 1]) {
    const tx = e[0] + dir * 7 + k * 3, ty = e[1] + 3 + Math.abs(k) * 0.5;
    o += `<path d="M${f(e[0] + k * 2)} ${f(e[1] - 1)} Q${f(tx - dir)} ${f(ty - 4)} ${f(tx)} ${f(ty)} L${f(tx + dir * 2.5)} ${f(ty + 1)} L${f(tx - dir * 1)} ${f(ty - 1.5)} Z" fill="${far ? c.pal.shade : fill}" stroke="#140F24" stroke-width="1"/>`;
    o += `<path d="M${f(tx)} ${f(ty)} l${f(dir * 2.5)} 1" stroke="${c.pal.light}" stroke-width="1"/>`;
  }
  return o;
}

function dragon(c: DrawCtx, P: Pose, st: number, extraFront = ''): string {
  const { pal } = c;
  const id = `drakomet-${st}`;
  let g = '';
  // Aile de l'arrière.
  g += `<g transform="translate(${P.farWing.dx} ${P.farWing.dy}) translate(${P.wing.sh[0]} ${P.wing.sh[1]}) scale(${P.farWing.mirror ? -P.farWing.s : P.farWing.s} ${P.farWing.s}) translate(${-P.wing.sh[0]} ${-P.wing.sh[1]})">${wing(c, `${id}-wf`, P.wing, true, st)}</g>`;
  if (P.hindFar) g += limb(c, `${id}-lhf`, P.hindFar, pal.shade, true);
  if (P.armFar) g += limb(c, `${id}-laf`, P.armFar, pal.shade, true);
  // Queue.
  const td = tube(P.tail);
  let ti = turn(td, pal.body, pal.shade, -2, -3) + scales(0, 100, 222, 236, 4, 0.3);
  ti += `<path d="${spl(P.tail.map(([x, y, w]) => [x, y + w * 0.55] as Pt))}" fill="none" stroke="${pal.belly}" stroke-width="2" opacity="0.6"/>`;
  g += part(`${id}-t`, td, pal.body, ti, 1.5);
  // Épines dorsales de la queue.
  for (let i = 1; i < P.tail.length - 1; i++) {
    const [x, y, w] = P.tail[i], [x2, y2] = P.tail[i + 1];
    const a = Math.atan2(y2 - y, x2 - x), nx = Math.sin(a), ny = -Math.cos(a);
    const bx = x + nx * w, by = y + ny * w, h = w * 0.9 + 1;
    g += `<path d="M${f(bx - Math.cos(a) * h * 0.6)} ${f(by - Math.sin(a) * h * 0.6)} L${f(bx + nx * h + Math.cos(a) * h * 0.5)} ${f(by + ny * h + Math.sin(a) * h * 0.5)} L${f(bx + Math.cos(a) * h * 0.6)} ${f(by + Math.sin(a) * h * 0.6)} Z" fill="${pal.deep}" stroke="#140F24" stroke-width="0.9" stroke-linejoin="round"/>`;
  }
  // Corps + cou (un seul volume).
  const bd = tube(P.body), nd = tube(P.neck);
  let bi = turn(bd, pal.body, pal.shade, -4, -5) + scales(0, 0, 222, 236, 4.2, 0.28);
  // Plastron ventral en écailles transversales.
  const belly = P.body.concat(P.neck.slice(1));
  for (let i = 0; i < belly.length - 1; i++) {
    const [x, y, w] = belly[i], [x2, y2] = belly[i + 1];
    for (let t = 0; t < 1; t += 0.25) {
      const px = x + (x2 - x) * t, py = y + (y2 - y) * t, pw = w + (belly[i + 1][2] - w) * t;
      const a = Math.atan2(y2 - y, x2 - x), nx = -Math.sin(a), ny = Math.cos(a);
      bi += line(`M${f(px + nx * pw * 0.35)} ${f(py + ny * pw * 0.35)} L${f(px + nx * pw * 1.1)} ${f(py + ny * pw * 1.1)}`, 0.6, '#140F24', ' opacity="0.5"');
    }
  }
  bi += `<path d="${spl(belly.map(([x, y, w], i) => { const b = belly[Math.min(i + 1, belly.length - 1)], a0 = belly[Math.max(i - 1, 0)]; const a = Math.atan2(b[1] - a0[1], b[0] - a0[0]); return [x - Math.sin(a) * w * 0.75, y + Math.cos(a) * w * 0.75] as Pt; }))}" fill="none" stroke="${pal.belly}" stroke-width="${f(P.neck[0][2] * 0.7)}" opacity="0.55"/>`;
  if (st >= 2) bi += gild(spl(P.body.map(([x, y, w]) => [x + 2, y - w * 0.3] as Pt)), 0.9) + constellation(P.body.slice(1).map(([x, y, w]) => [x + 3, y - w * 0.1] as Pt), pal.gold);
  const both = `${bd} ${nd}`;
  g += part(`${id}-b`, both, pal.body, bi, 1.7);
  g += rim(spl(P.neck.slice().reverse().map(([x, y, w]) => [x + w * 0.7, y - w * 0.4] as Pt)), pal.glow, 1.2);
  // Épines dorsales du cou et du dos.
  const dors = P.neck.slice().reverse().concat(P.body.slice(1));
  for (let i = 1; i < dors.length; i++) {
    const [x, y, w] = dors[i], [x0, y0] = dors[i - 1];
    const a = Math.atan2(y - y0, x - x0), nx = -Math.sin(a), ny = Math.cos(a);
    const s = -1; // côté dos
    const bx = x + nx * w * s * -1 * -1, by = y + ny * w * s;
    const h = P.spines * (0.6 + w / 22);
    void bx;
    const px = x - nx * w, py = y - ny * w;
    g += `<path d="M${f(px - Math.cos(a) * h * 0.5)} ${f(py - Math.sin(a) * h * 0.5)} L${f(px - nx * h + Math.cos(a) * h * 0.4)} ${f(py - ny * h + Math.sin(a) * h * 0.4)} L${f(px + Math.cos(a) * h * 0.6)} ${f(py + Math.sin(a) * h * 0.6)} Z" fill="${pal.deep}" stroke="#140F24" stroke-width="0.9" stroke-linejoin="round"/>`;
  }
  g += extraFront;
  // Patte arrière, bras.
  g += limb(c, `${id}-lh`, P.hind, pal.body, false);
  if (P.arm) g += limb(c, `${id}-la`, P.arm, pal.body, false);
  // Aile de devant.
  g += wing(c, `${id}-wn`, P.wing, false, st);
  // Tête.
  g += `<g transform="translate(${P.head.x} ${P.head.y}) rotate(${P.head.r}) scale(${P.head.s})">${head(c, id, st, P.horn)}</g>`;
  return g;
}

/**
 * Drakomet → Wyvernova → Comethéon : dragon des comètes. Nouveau-né sortant d'un œuf-météorite, jeune wyverne
 * perchée sur un astéroïde, puis grand dragon cabré aux ailes-ciel nocturne, dont la queue s'achève en comète.
 */
export const drakomet: Species = (c) => {
  const { pal } = c;
  const st = Math.min(c.stage, 2);
  let s = '';
  if (st === 2) {
    s += aura(120, 80, 70, pal.glow);
    s += ground(116, 205, 80);
    const P: Pose = {
      body: [[96, 112, 17], [108, 130, 20], [122, 146, 18], [136, 156, 13]],
      neck: [[96, 112, 14], [84, 96, 10.5], [74, 78, 8.5], [72, 62, 7.5], [78, 50, 7]],
      tail: [[134, 156, 12], [158, 170, 9.5], [174, 188, 7], [162, 200, 5.2], [130, 204, 4.2], [98, 200, 3.2], [72, 190, 2.4], [56, 178, 1.4]],
      head: { x: 80, y: 50, s: 1.02, r: 6 },
      hind: [[130, 148, 13], [118, 170, 8], [128, 188, 5.5], [122, 200, 4]],
      hindFar: [[142, 152, 10], [150, 174, 6], [150, 192, 4.5], [146, 200, 3.5]],
      arm: [[94, 124, 8], [104, 142, 5.5], [88, 152, 4.5], [76, 150, 3.5]],
      armFar: [[104, 122, 6], [90, 134, 4.5], [76, 132, 3.6], [68, 126, 3]],
      wing: { sh: [110, 106], el: [148, 74], wr: [146, 30], tips: [[104, 8], [180, 6], [210, 38], [212, 80], [196, 112]], root: [150, 140], w: 3.2 },
      farWing: { dx: -8, dy: -4, s: 0.82, mirror: true },
      horn: 1.2, spines: 6,
    };
    s += dragon(c, P, 2, comet(c, 56, 178, 150, 46).replace(/^/, ''));
    s += constellation([[16, 30], [28, 18], [44, 22], [52, 8]], pal.gold) + sparkle(200, 150, 3, pal.glow, false) + speckles(c, 110, 40, 90, 30, 6, pal.glow);
    return s;
  }
  if (st === 1) {
    s += ground(112, 205, 70);
    // Astéroïde-perchoir.
    const rock = 'M60 204 C56 192 64 180 78 176 C96 170 124 172 142 176 C158 180 168 190 166 204 Z';
    let ri = shadow('M60 190 C90 200 140 200 170 186 L170 210 L60 210 Z', pal.deep, 0.8, 'xhatch');
    ri += shadow('M120 170 C150 176 168 188 168 204 L140 204 C150 192 140 180 120 170 Z', pal.deep, 0.5, 'fine');
    ri += `<circle cx="90" cy="190" r="6" fill="none" stroke="#140F24" stroke-width="0.8" opacity="0.6"/><circle cx="132" cy="186" r="4" fill="none" stroke="#140F24" stroke-width="0.8" opacity="0.6"/>`;
    ri += `<path d="M82 182 l6 -10 l5 9 Z" fill="${pal.accent2}" stroke="#140F24" stroke-width="0.8"/><path d="M90 180 l3 -14 l6 13 Z" fill="${pal.glow}" stroke="#140F24" stroke-width="0.8"/>`;
    const P: Pose = {
      body: [[104, 124, 14], [112, 140, 16], [122, 156, 13], [132, 166, 9]],
      neck: [[104, 124, 11], [96, 108, 8.5], [88, 92, 7], [86, 78, 6.4], [92, 68, 6]],
      tail: [[132, 166, 9], [152, 176, 7], [176, 172, 5], [194, 156, 3.6], [200, 136, 2.4], [194, 120, 1.2]],
      head: { x: 93, y: 68, s: 0.92, r: -4 },
      hind: [[122, 156, 11], [108, 170, 6.5], [118, 180, 4.5], [110, 176, 3.4]],
      hindFar: [[132, 160, 8], [142, 172, 5], [140, 180, 3.8], [134, 178, 3]],
      wing: { sh: [116, 120], el: [142, 98], wr: [136, 58], tips: [[110, 38], [162, 30], [188, 58], [188, 92], [170, 118]], root: [136, 150], w: 2.1 },
      farWing: { dx: -6, dy: -2, s: 0.7, mirror: true },
      horn: 0.5, spines: 4.5,
    };
    s += part('drakomet-1-r', rock, pal.shade, ri, 1.6);
    s += dragon(c, P, 1, '');
    s += comet(c, 194, 120, -70, 28);
    s += sparkle(30, 60, 3, pal.glow, false) + sparkle(46, 140, 2.4, '#FFF6D8', false);
    return `<g transform="translate(116 205) scale(1.12) translate(-116 -205)">${s}</g>`;
  }
  // Stade 0 : nouveau-né dans un œuf-météorite fendu.
  s += ground(112, 205, 70);
  const egg = 'M48 204 C40 176 44 144 62 128 L72 138 L80 124 L92 136 L104 120 L114 136 L128 122 L138 136 L150 126 L160 138 C176 154 180 182 172 204 Z';
  const eggBack = 'M64 130 C76 104 100 92 116 92 C136 92 156 108 160 132 L150 126 L138 136 L128 122 L114 136 L104 120 L92 136 L80 124 L72 138 Z';
  let bk = shadow(eggBack, pal.deep, 0.9, 'xhatch');
  for (let i = 0; i < 6; i++) bk += `<path d="M${f(80 + i * 12)} ${f(128 - (i % 2) * 4)} l3 -9 l4 8 Z" fill="${i % 2 ? pal.glow : pal.accent2}" opacity="0.8"/>`;
  s += part('drakomet-0-eb', eggBack, pal.deep, bk, 1.3);
  const P: Pose = {
    body: [[112, 150, 20], [116, 162, 20]],
    neck: [[110, 146, 12], [100, 128, 9], [92, 110, 8], [92, 96, 7.5], [98, 86, 7.2]],
    tail: [[150, 150, 6], [168, 140, 4.6], [178, 124, 3.2], [176, 110, 1.6]],
    head: { x: 100, y: 86, s: 0.9, r: -6 },
    hind: [[120, 160, 8], [124, 168, 5], [126, 172, 4]],
    arm: [[96, 140, 5], [86, 134, 3.6], [78, 132, 3]],
    wing: { sh: [116, 132], el: [134, 118], wr: [130, 98], tips: [[118, 90], [144, 88], [154, 104], [150, 120]], root: [134, 138], w: 2 },
    farWing: { dx: -24, dy: -2, s: 0.8 },
    horn: 0, spines: 3,
  };
  s += dragon(c, P, 0, '');
  let ei = shadow('M40 180 C80 196 140 196 180 176 L180 210 L40 210 Z', pal.deep, 0.85, 'xhatch');
  ei += shadow('M150 130 C172 150 180 182 172 204 L150 204 C164 182 160 154 140 136 Z', pal.deep, 0.6, 'fine');
  for (const [x, y, r] of [[70, 172, 7], [118, 182, 5], [150, 162, 4], [92, 154, 3.4]] as const) ei += `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="#140F24" stroke-width="0.8" opacity="0.6"/><path d="M${x - r} ${y} a${r} ${r} 0 0 1 ${r * 2} 0" fill="none" stroke="${pal.light}" stroke-width="0.7" opacity="0.5"/>`;
  ei += line('M96 150 l-6 14 l8 6 l-4 12', 0.8, pal.glow, ' opacity="0.9"') + line('M140 146 l6 12 l-6 8', 0.8, pal.glow, ' opacity="0.9"');
  s += part('drakomet-0-e', egg, pal.shade, ei, 1.7);
  s += rim('M48 204 C40 176 44 144 62 128', pal.glow, 1.2);
  // Patte posée sur le bord de la coquille.
  s += limb(c, 'drakomet-0-lp', [[88, 142, 4], [78, 136, 3.2], [72, 134, 2.8]], pal.body, false);
  s += sparkle(40, 80, 3, pal.glow, false) + sparkle(182, 70, 2.4, '#FFF6D8', false) + speckles(c, 112, 112, 60, 20, 5, pal.glow);
  return `<g transform="translate(112 205) scale(1.08) translate(-112 -205)">${s}</g>`;
};
