import { aura, constellation, gild, ink, line, rim, shadow, sparkle, speckles, type DrawCtx, type Species } from './style.ts';

/**
 * Médusel → Filastra → Coronéa : méduse stellaire. Planche de zoologie marine céleste : éphyrule en étoile à huit
 * bras, jeune méduse à cloche haute, puis grande méduse adulte à bras oraux en rubans et longs tentacules, la
 * cloche translucide laissant voir une nébuleuse et ses gonades d'or.
 */

const f = (v: number) => v.toFixed(1);
const CX = 111;
/** Lueur sans filtre (cercles concentriques). */
const glowDot = (x: number, y: number, r: number, col: string) => [1, 0.7, 0.45, 0.25].map((k) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r / k * 0.5)}" fill="${col}" opacity="${(0.22 * k).toFixed(2)}"/>`).join('');

type P4 = [number, number, number, number];
/** Spline de Catmull-Rom échantillonnée : [x, y, tx, ty]. */
function spline(pts: [number, number][], n: number): P4[] {
  const out: P4[] = [];
  const m = pts.length - 1;
  for (let i = 0; i <= n; i++) {
    const u = (i / n) * m, k = Math.min(m - 1, Math.floor(u)), t = u - k;
    const p0 = pts[Math.max(0, k - 1)], p1 = pts[k], p2 = pts[k + 1], p3 = pts[Math.min(m, k + 2)];
    const t2 = t * t, t3 = t2 * t;
    const c = (a: number, b: number, d: number, e: number) => 0.5 * (2 * b + (-a + d) * t + (2 * a - 5 * b + 4 * d - e) * t2 + (-a + 3 * b - 3 * d + e) * t3);
    const dc = (a: number, b: number, d: number, e: number) => 0.5 * ((-a + d) + 2 * (2 * a - 5 * b + 4 * d - e) * t + 3 * (-a + 3 * b - 3 * d + e) * t2);
    const dx = dc(p0[0], p1[0], p2[0], p3[0]), dy = dc(p0[1], p1[1], p2[1], p3[1]), l = Math.hypot(dx, dy) || 1;
    out.push([c(p0[0], p1[0], p2[0], p3[0]), c(p0[1], p1[1], p2[1], p3[1]), dx / l, dy / l]);
  }
  return out;
}
const off = (p: P4, o: number): [number, number] => [p[0] + p[3] * o, p[1] - p[2] * o];
const poly = (pts: [number, number][]) => pts.map((q, i) => `${i ? 'L' : 'M'}${f(q[0])} ${f(q[1])}`).join(' ');

/** Bras oral : ruban qui s'affine, bords froncés, plis intérieurs. */
function oralArm(c: DrawCtx, pts: [number, number][], w0: number, frill: number, col: string, ph = 0): string {
  const N = 70, sp = spline(pts, N);
  const W = (i: number) => { const t = i / N; return w0 * (1 - t * 0.8) * (1 + 0.25 * Math.sin(t * 40 + ph)); };
  const a = sp.map((p, i) => off(p, W(i) + frill * Math.max(0, Math.sin(i * 1.3 + ph)))), b = sp.map((p, i) => off(p, -W(i) - frill * Math.max(0, Math.sin(i * 1.3 + ph + 1.7))));
  const d = poly(a) + ' ' + poly([...b].reverse()).replace(/^M/, 'L') + ' Z';
  let s = `<path d="${d}" fill="${col}" opacity="0.72" stroke="#140F24" stroke-width="1" stroke-linejoin="round"/>`;
  s += `<path d="${poly(sp.map((p, i) => off(p, -W(i) * 0.2)))} ${poly([...b].reverse()).replace(/^M/, 'L')} Z" fill="url(#fine)"/>`;
  s += line(poly(sp.slice(2, N - 4).map((p, i) => off(p, W(i + 2) * 0.35 * Math.sin(i * 0.5 + ph)))), 0.7, c.pal.light, ' opacity="0.8"');
  s += line(poly(sp.slice(2, N - 6).map((p, i) => off(p, W(i + 2) * 0.8))), 0.7, c.pal.glow, ' opacity="0.6"');
  return s;
}

/** Tentacule marginal : filament ondulant, perles de cnidocytes. */
function tentacle(x: number, y: number, len: number, amp: number, ph: number, drift: number, col: string, beads = 0, gold = '#E9C25B'): string {
  let d = `M${f(x)} ${f(y)}`;
  const n = 24;
  const pts: [number, number][] = [];
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const px = x + Math.sin(t * 7 + ph) * amp * t + drift * t * t, py = y + len * t;
    pts.push([px, py]);
    d += ` L${f(px)} ${f(py)}`;
  }
  let s = `<path d="${d}" fill="none" stroke="${col}" stroke-width="1.1" stroke-linecap="round" opacity="0.85"/>`;
  for (let i = 3; i < beads * 3 && i < n; i += 3) s += `<circle cx="${f(pts[i][0])}" cy="${f(pts[i][1])}" r="1" fill="${gold}"/>`;
  return s;
}

/** Cloche : dôme + bord festonné. */
function bellPath(cx: number, top: number, rimY: number, w: number, lobes: number, depth: number, shoulder = 0.62): string {
  const h = rimY - top;
  let d = `M${f(cx - w)} ${f(rimY)} C${f(cx - w * 1.04)} ${f(top + h * (1 - shoulder))} ${f(cx - w * 0.6)} ${f(top)} ${f(cx)} ${f(top)} C${f(cx + w * 0.6)} ${f(top)} ${f(cx + w * 1.04)} ${f(top + h * (1 - shoulder))} ${f(cx + w)} ${f(rimY)}`;
  for (let i = 1; i <= lobes; i++) {
    const x0 = cx + w - ((i - 1) / lobes) * 2 * w, x1 = cx + w - (i / lobes) * 2 * w;
    const sag = Math.sin((i - 0.5) / lobes * Math.PI) * depth * 0.6;
    d += ` Q${f((x0 + x1) / 2)} ${f(rimY + depth + sag)} ${f(x1)} ${f(rimY)}`;
  }
  return d + ' Z';
}

/** Méduse (stades 1–2) : cloche translucide à nébuleuse, gonades, bras oraux, tentacules. */
function medusa(c: DrawCtx, o: { top: number; rim: number; w: number; arms: number; armLen: number; tent: number; tentLen: number; lobes: number }): string {
  const { pal, stage } = c;
  const id = `medusel-${stage}`;
  const { top, rim: rimY, w } = o;
  const bell = bellPath(CX, top, rimY, w, o.lobes, 5);
  let s = '';
  // Tentacules marginaux (derrière).
  for (let i = 0; i < o.tent; i++) {
    const t = (i + 0.5) / o.tent, x = CX - w * 0.94 + t * w * 1.88;
    s += tentacle(x, rimY + 3, o.tentLen * (0.75 + 0.25 * Math.sin(i * 2.3)), 3 + (i % 3), i * 1.7, (x - CX) * 0.25, i % 2 ? pal.light : pal.accent2, i % 2 ? 6 : 0);
  }
  // Bras oraux.
  const arm = (dx: number, sway: number, ph: number, col: string) => oralArm(c, [[CX + dx * 0.4, rimY - 4], [CX + dx, rimY + o.armLen * 0.25], [CX + dx * 1.2 + sway, rimY + o.armLen * 0.55], [CX + dx * 0.8 - sway, rimY + o.armLen * 0.8], [CX + dx * 1.1 + sway * 0.5, rimY + o.armLen]], o.arms, 3, col, ph);
  s += arm(-16, -8, 0, pal.shade) + arm(18, 8, 2, pal.shade);
  s += arm(-6, 6, 4, pal.accent) + arm(6, -6, 1, pal.accent);
  // Sous-ombrelle (intérieur de la cloche vu par en dessous).
  s += `<ellipse cx="${CX}" cy="${rimY}" rx="${f(w * 0.98)}" ry="${f(w * 0.14)}" fill="${pal.deep}" opacity="0.7" stroke="#140F24" stroke-width="1"/>`;
  // Cloche translucide, nébuleuse intérieure.
  s += `<clipPath id="${id}-b"><path d="${bell}"/></clipPath><g clip-path="url(#${id}-b)">`
    + `<path d="${bell}" fill="${pal.deep}" opacity="0.55"/>`
    + `<ellipse cx="${CX - w * 0.3}" cy="${top + (rimY - top) * 0.35}" rx="${f(w * 0.6)}" ry="${f((rimY - top) * 0.35)}" fill="${pal.accent2}" opacity="0.5" filter="url(#soft)"/>`
    + `<ellipse cx="${CX + w * 0.35}" cy="${top + (rimY - top) * 0.6}" rx="${f(w * 0.5)}" ry="${f((rimY - top) * 0.3)}" fill="${pal.accent}" opacity="0.45" filter="url(#soft)"/>`
    + `<ellipse cx="${CX - w * 0.2}" cy="${top + (rimY - top) * 0.2}" rx="${f(w * 0.35)}" ry="${f((rimY - top) * 0.18)}" fill="#FFF6D8" opacity="0.5" filter="url(#soft)"/>`
    + speckles(c, CX, top + (rimY - top) * 0.5, w * 0.9, (rimY - top) * 0.5, 18 + stage * 8)
    // Canaux radiaux.
    + Array.from({ length: 16 }, (_, i) => { const t = (i + 0.5) / 16, x = CX - w + t * 2 * w; return line(`M${f(CX + (x - CX) * 0.15)} ${f(top + (rimY - top) * 0.45)} Q${f(CX + (x - CX) * 0.85)} ${f(top + (rimY - top) * 0.3)} ${f(x)} ${f(rimY + 2)}`, 0.6, pal.light, ' opacity="0.5"'); }).join('')
    // Ombre propre à droite, hachures fines.
    + shadow(`M${f(CX + w * 0.3)} ${f(top)} C${f(CX + w * 0.9)} ${f(top + 6)} ${f(CX + w * 1.1)} ${f(rimY - 20)} ${f(CX + w)} ${f(rimY + 6)} L${f(CX + w * 0.6)} ${f(rimY + 6)} C${f(CX + w * 0.8)} ${f(rimY - 30)} ${f(CX + w * 0.7)} ${f(top + 20)} ${f(CX + w * 0.3)} ${f(top)} Z`, pal.deep, 0.35, 'fine')
    + `</g>`;
  // Gonades en fer à cheval (or), vues par transparence.
  const gy = top + (rimY - top) * 0.55;
  for (const [dx, dy, a] of [[-w * 0.32, 0, -20], [w * 0.32, 0, 20], [-w * 0.12, -8, -5], [w * 0.12, -8, 5]] as const) {
    s += `<g transform="translate(${f(CX + dx)} ${f(gy + dy)}) rotate(${a})"><path d="M-7 4 C-8 -6 8 -6 7 4" fill="none" stroke="#140F24" stroke-width="3.6" stroke-linecap="round" opacity="0.6"/><path d="M-7 4 C-8 -6 8 -6 7 4" fill="none" stroke="${pal.gold}" stroke-width="2.2" stroke-linecap="round"/></g>`;
  }
  s += ink(bell, 'none', 1.6);
  // Bord : anneau musculaire clair, rhopalies lumineuses.
  s += line(`M${f(CX - w * 0.96)} ${f(rimY - 2)} Q${f(CX)} ${f(rimY + w * 0.16)} ${f(CX + w * 0.96)} ${f(rimY - 2)}`, 1.2, pal.light, ' opacity="0.8"');
  for (let i = 0; i <= 8; i++) { const x = CX - w * 0.9 + (i / 8) * w * 1.8; s += `<circle cx="${f(x)}" cy="${f(rimY + 3 + Math.sin((i / 8) * Math.PI) * w * 0.06)}" r="1.2" fill="${pal.glow}"/>`; }
  s += rim(`M${f(CX - w * 0.98)} ${f(rimY - 12)} C${f(CX - w)} ${f(top + 20)} ${f(CX - w * 0.6)} ${f(top + 1)} ${f(CX)} ${f(top + 1)}`, pal.glow, 1.3);
  s += line(`M${f(CX - w * 0.7)} ${f(top + 24)} C${f(CX - w * 0.6)} ${f(top + 12)} ${f(CX - w * 0.4)} ${f(top + 7)} ${f(CX - w * 0.2)} ${f(top + 6)}`, 1.4, '#fff', ' opacity="0.7"');
  return s;
}

/** Stade 0 : éphyrule, disque-étoile à huit bras bifides, vu en légère perspective. */
function ephyra(c: DrawCtx): string {
  const { pal } = c;
  const id = 'medusel-0';
  const arm: [number, number][] = [[-15, -30], [-11, -58], [-15, -80], [-9, -90], [0, -78], [9, -90], [15, -80], [11, -58], [15, -30]];
  const rot = (p: [number, number], a: number): [number, number] => [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a)];
  let d = '';
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    const q = arm.map((p) => rot(p, a));
    d += (k ? ` Q${f(rot([0, -28], a - Math.PI / 8)[0])} ${f(rot([0, -28], a - Math.PI / 8)[1])} ` : 'M') + `${f(q[0][0])} ${f(q[0][1])}`;
    d += ` C${f(q[1][0])} ${f(q[1][1])} ${f(q[2][0])} ${f(q[2][1])} ${f(q[3][0])} ${f(q[3][1])}`;
    d += ` Q${f(rot([-4, -88], a)[0])} ${f(rot([-4, -88], a)[1])} ${f(q[4][0])} ${f(q[4][1])} Q${f(rot([4, -88], a)[0])} ${f(rot([4, -88], a)[1])} ${f(q[5][0])} ${f(q[5][1])}`;
    d += ` C${f(q[6][0])} ${f(q[6][1])} ${f(q[7][0])} ${f(q[7][1])} ${f(q[8][0])} ${f(q[8][1])}`;
  }
  d += ` Q${f(rot([0, -28], -Math.PI / 8)[0])} ${f(rot([0, -28], -Math.PI / 8)[1])} ${f(rot(arm[0], 0)[0])} ${f(rot(arm[0], 0)[1])} Z`;
  let s = '';
  s += `<clipPath id="${id}-d"><path d="${d}"/></clipPath><g clip-path="url(#${id}-d)">`
    + `<path d="${d}" fill="${pal.deep}" opacity="0.6"/>`
    + `<circle cx="-20" cy="-30" r="50" fill="${pal.accent2}" opacity="0.5" filter="url(#soft)"/>`
    + `<circle cx="30" cy="30" r="44" fill="${pal.accent}" opacity="0.45" filter="url(#soft)"/>`
    + `<circle cx="0" cy="0" r="26" fill="${pal.light}" opacity="0.6" filter="url(#soft)"/>`
    + speckles(c, 0, 0, 80, 80, 26)
    + `</g>`;
  // Canaux qui se divisent dans chaque bras.
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    const P = (x: number, y: number) => { const r = rot([x, y], a); return `${f(r[0])} ${f(r[1])}`; };
    s += line(`M${P(0, -16)} L${P(0, -56)} M${P(0, -56)} Q${P(-6, -66)} ${P(-9, -82)} M${P(0, -56)} Q${P(6, -66)} ${P(9, -82)}`, 0.9, pal.light, ' opacity="0.7"');
    const rh = rot([0, -79], a);
    s += `<circle cx="${f(rh[0])}" cy="${f(rh[1])}" r="2" fill="${pal.gold}" stroke="#140F24" stroke-width="0.7"/>`;
    const sh = rot([10, -40], a);
    s += `<circle cx="${f(sh[0])}" cy="${f(sh[1])}" r="0.9" fill="#FFF6D8"/>`;
  }
  s += shadow(`M${f(d.length ? 0 : 0)} 0` + ' ' + d.replace(/^M[^C]+/, (m) => m), pal.deep, 0, 'fine').replace(/<path d="[^"]*" fill="[^"]*" opacity="0"\/>/, '');
  s += ink(d, 'none', 1.5);
  // Estomac central en croix, filaments gastriques dorés.
  s += ink('M0 -14 C5 -5 5 -5 14 0 C5 5 5 5 0 14 C-5 5 -5 5 -14 0 C-5 -5 -5 -5 0 -14 Z', pal.belly, 1.2, ' opacity="0.9"');
  s += gild('M-6 -6 q3 2 6 0 q3 -2 6 0 M-6 6 q3 -2 6 0 q3 2 6 0', 0.9);
  s += `<circle cx="0" cy="0" r="2.4" fill="${pal.deep}"/>`;
  s += rim(d.split(' Q')[0] ? 'M-86 -20 C-80 -50 -56 -74 -24 -86' : '', pal.glow, 1.2);
  return `<g transform="translate(${CX} 118) rotate(-12) scale(1 0.8)">${s}</g>`
    + glowDot(CX, 118, 10, '#FFF6D8') + sparkle(CX, 118, 4, '#FFF6D8', false)
    + speckles(c, CX, 120, 100, 100, 8, pal.glow) + sparkle(30, 40, 3, pal.gold, false) + sparkle(196, 200, 3.4, pal.glow, false);
}

export const medusel: Species = (c) => {
  const { pal, stage } = c;
  if (stage <= 0) return ephyra(c);
  if (stage === 1) return medusa(c, { top: 22, rim: 104, w: 52, arms: 6, armLen: 100, tent: 10, tentLen: 96, lobes: 12 })
    + sparkle(186, 40, 3, pal.gold, false) + sparkle(34, 150, 2.6, pal.glow, false);
  let s = aura(CX, 80, 86, pal.glow);
  s += medusa(c, { top: 14, rim: 92, w: 74, arms: 8, armLen: 136, tent: 18, tentLen: 138, lobes: 16 });
  // Couronne de lunes et constellation (stade adulte).
  s += gild(`M${CX - 50} 34 C${CX - 30} 12 ${CX + 30} 12 ${CX + 50} 34`, 1.1);
  for (const [x, y, z] of [[CX, 6, 4.6], [CX - 30, 12, 3], [CX + 30, 12, 3], [CX - 50, 24, 2.4], [CX + 50, 24, 2.4]] as const) s += sparkle(x, y, z, pal.gold, false);
  s += constellation([[CX - 40, 52], [CX - 18, 40], [CX + 6, 48], [CX + 30, 38], [CX + 48, 58]], pal.gold);
  s += speckles(c, CX, 180, 100, 50, 10, pal.glow);
  return s;
};
