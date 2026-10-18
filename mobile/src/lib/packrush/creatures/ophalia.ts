import { bloom, gloss, hsl, softShadow, speckles, type Bounds, type DrawCtx, type Species } from './style.ts';
import { kit } from './mythkit.ts';

type Pt = [number, number];
const f = (v: number) => v.toFixed(1);
const P = (p: Pt) => `${f(p[0])} ${f(p[1])}`;

/** Courbe lisse (Catmull-Rom → Bézier) passant par les points. */
function smooth(pts: Pt[], start = true): string {
  let d = start ? `M${P(pts[0])}` : `L${P(pts[0])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    d += ` C${P([p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6])} ${P([p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6])} ${P(p2)}`;
  }
  return d;
}

/** Corps tubulaire : contour lisse autour d'une colonne, épaisseur par point. Renvoie aussi les deux bords. */
function tube(pts: Pt[], w: number[]): { d: string; L: Pt[]; R: Pt[] } {
  const L: Pt[] = [], R: Pt[] = [];
  pts.forEach((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const tx = b[0] - a[0], ty = b[1] - a[1], k = Math.hypot(tx, ty) || 1;
    L.push([p[0] - ty / k * w[i] / 2, p[1] + tx / k * w[i] / 2]);
    R.push([p[0] + ty / k * w[i] / 2, p[1] - tx / k * w[i] / 2]);
  });
  const d = `${smooth(L)} L${P(R[R.length - 1])}${smooth(R.slice().reverse(), false).replace(/^L[^C]*/, '')} Z`;
  return { d, L, R };
}

/**
 * Ophalia : serpent ailé céleste (mythique, carte plein cadre). Un grand serpent à plumes, six ailes de séraphin
 * déployées, s'enroule autour d'un soleil qu'il garde : une boucle passe devant l'astre, l'autre derrière. Tête de
 * profil, crête de longues plumes, barbillons d'or. Style gravure : écailles et plumes au trait, hachures, or.
 */
export const ophalia: Species = (c: DrawCtx) => {
  const { pal } = c;
  const { V, uid, ink, shadow, line, rim, gild, fur, eyeA, constellation, sparkle } = kit(c, 'ophalia-4');
  const CREAM = '#FFF6D8', INK = '#140F24';
  const id = 'ophalia-4';
  let s = '';

  // ---------- Ailes (repère local : bras le long de +x, rémiges vers +y) ----------
  const feather = (bx: number, by: number, ang: number, len: number, w: number, fill: string, tip: string | null) => {
    const r = (ang * Math.PI) / 180, ux = Math.cos(r), uy = Math.sin(r), nx = -uy, ny = ux;
    const at = (k: number, o: number): Pt => [bx + ux * len * k + nx * o, by + uy * len * k + ny * o];
    const d = `M${P(at(0, -w * 0.35))} C${P(at(0.4, -w * 0.6))} ${P(at(0.8, -w * 0.55))} ${P(at(0.97, -w * 0.2))} Q${P(at(1.04, 0))} ${P(at(0.97, w * 0.25))} C${P(at(0.8, w * 0.6))} ${P(at(0.4, w * 0.55))} ${P(at(0, w * 0.35))} Z`;
    let o = ink(d, fill, 0.8);
    if (tip) o += `<path d="M${P(at(0.78, -w * 0.5))} C${P(at(0.9, -w * 0.4))} ${P(at(0.97, -w * 0.2))} ${P(at(1.0, 0))} C${P(at(0.97, w * 0.25))} ${P(at(0.9, w * 0.45))} ${P(at(0.78, w * 0.55))} Q${P(at(0.74, 0))} ${P(at(0.78, -w * 0.5))} Z" fill="${tip}" opacity="0.9"/>`;
    o += line(`M${P(at(0.05, 0))} Q${P(at(0.5, w * 0.06))} ${P(at(0.92, 0))}`, 0.6, INK, ' opacity="0.7"');
    o += line(`M${P(at(0.3, 0))} l${f(nx * w * 0.35 + ux * 3)} ${f(ny * w * 0.35 + uy * 3)} M${P(at(0.55, 0))} l${f(nx * w * 0.4 + ux * 3)} ${f(ny * w * 0.4 + uy * 3)}`, 0.4, INK, ' opacity="0.45"');
    return o;
  };
  const wing = (x: number, y: number, rot: number, k: number, left: boolean, tone: number) => {
    const prim = tone ? pal.body : pal.light, sec = tone ? pal.shade : pal.body, cov = tone ? pal.body : pal.belly;
    let w = '';
    // Rémiges secondaires (bras), primaires (main), en éventail.
    for (let i = 0; i < 6; i++) w += feather(8 + i * 7.5, -2, 96 - i * 4, 36 - i * 0.6, 9, sec, null);
    for (let i = 6; i >= 0; i--) w += feather(52 + i * 7, -8 - i * 0.6, 72 - i * 9.5, 40 + i * 2.6, 9.5, prim, pal.gold);
    // Couvertures : deux rangées d'écailles-plumes.
    for (let i = 0; i < 9; i++) w += feather(4 + i * 9, -6 - Math.sin((i / 8) * Math.PI) * 6, 88 - i * 5, 18, 8, cov, null);
    for (let i = 0; i < 10; i++) w += feather(2 + i * 8.6, -10 - Math.sin((i / 9) * Math.PI) * 8, 86 - i * 4, 9, 6.5, prim, null);
    // Bord d'attaque.
    w += ink('M-2 -6 C14 -16 34 -20 50 -18 C70 -16 88 -10 104 -4 C88 -12 70 -22 50 -24 C30 -26 12 -20 -2 -10 Z', cov, 1.1);
    w += rim('M-2 -10 C12 -20 30 -26 50 -24 C70 -22 88 -12 104 -4', pal.glow, 1);
    w += gild('M10 -16 C24 -22 40 -24 56 -21', 0.8);
    return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${k} ${left ? -k : k})">${w}</g>`;
  };
  // Ailes de l'arrière-plan (côté lointain, plus sombres), puis côté proche.
  s += wing(144, 50, -172, 0.9, true, 1) + wing(144, 44, -128, 0.86, true, 1) + wing(150, 58, 18, 0.72, false, 1);
  s += wing(152, 44, -60, 0.86, false, 0) + wing(154, 50, -24, 0.84, false, 0) + wing(140, 60, 168, 0.72, true, 0);

  // ---------- Corps (colonne qui s'enroule autour du soleil, centre 112,112 r 46) ----------
  const spine: Pt[] = [[-2, 222], [28, 238], [68, 246], [116, 240], [160, 228], [192, 204], [206, 170], [200, 140], [180, 126], [150, 132], [118, 146], [86, 152], [58, 146], [38, 126], [30, 100], [42, 82], [74, 76], [110, 74], [138, 74], [150, 60], [150, 42], [144, 26]];
  const width = [2, 5, 8, 11, 14, 17, 19, 21, 22, 22, 22, 22, 22, 22, 21, 21, 20, 20, 19, 18, 17, 15];
  const back = tube(spine.slice(13), width.slice(13));
  const front = tube(spine.slice(0, 16), width.slice(0, 16));
  const scales = (t: { L: Pt[]; R: Pt[] }, seg: Pt[]) => {
    let o = '';
    for (let i = 1; i < seg.length - 1; i++) {
      for (let k = 0; k < 3; k++) {
        const u = k / 3;
        const l: Pt = [t.L[i][0] + (t.L[i + 1][0] - t.L[i][0]) * u, t.L[i][1] + (t.L[i + 1][1] - t.L[i][1]) * u];
        const r: Pt = [t.R[i][0] + (t.R[i + 1][0] - t.R[i][0]) * u, t.R[i][1] + (t.R[i + 1][1] - t.R[i][1]) * u];
        const m: Pt = [(l[0] + r[0]) / 2, (l[1] + r[1]) / 2];
        o += `<path d="M${P(l)} Q${P([m[0] + (seg[i + 1][0] - seg[i][0]) * 0.12, m[1] + (seg[i + 1][1] - seg[i][1]) * 0.12])} ${P(r)}" fill="none" stroke="#05030C" stroke-opacity="0.3" stroke-width="0.5" opacity="0.35"/>`;
      }
    }
    return o;
  };
  // Motif dorsal : losanges sombres cernés d'or, entre la colonne et le flanc ombré.
  const diamonds = (t: { L: Pt[]; R: Pt[] }, seg: Pt[]) => {
    let o = '';
    for (let i = 1; i < seg.length - 1; i++) {
      for (let k = 0; k < 2; k++) {
        const u = k / 2 + 0.25, a = seg[i], b2 = seg[i + 1];
        const m: Pt = [a[0] + (b2[0] - a[0]) * u, a[1] + (b2[1] - a[1]) * u];
        const l: Pt = [t.L[i][0] + (t.L[i + 1][0] - t.L[i][0]) * u, t.L[i][1] + (t.L[i + 1][1] - t.L[i][1]) * u];
        const c0: Pt = [(m[0] * 0.6 + l[0] * 0.4), (m[1] * 0.6 + l[1] * 0.4)];
        const tx = (b2[0] - a[0]) * 0.16, ty = (b2[1] - a[1]) * 0.16, nx = (l[0] - m[0]) * 0.25, ny = (l[1] - m[1]) * 0.25;
        o += `<path d="M${P([c0[0] - tx, c0[1] - ty])} L${P([c0[0] + nx, c0[1] + ny])} L${P([c0[0] + tx, c0[1] + ty])} L${P([c0[0] - nx, c0[1] - ny])} Z" fill="${pal.deep}" stroke="${pal.gold}" stroke-width="0.6" opacity="0.85"/>`;
      }
    }
    return o;
  };
  const paint = (t: { d: string; L: Pt[]; R: Pt[] }, seg: Pt[], cid: string) =>
    `<defs><clipPath id="${id}-${cid}"><path d="${t.d}"/></clipPath></defs><path d="${t.d}" fill="${pal.body}"/>`
    + `<g clip-path="url(#${id}-${cid})">`
    + `<path d="${smooth(t.R)}" fill="none" stroke="${pal.belly}" stroke-width="12" opacity="0.9"/>`
    + `<path d="${smooth(t.L)}" fill="none" stroke="${pal.shade}" stroke-width="12"/>`
    + `<path d="${smooth(t.L)}" fill="none" stroke="url(#fine)" stroke-width="12"/>`
    + diamonds(t, seg)
    + scales(t, seg) + `</g>` + ink(t.d, 'none', 1.5) + rim(smooth(t.R), pal.glow, 1.1);
  // Boucle arrière : masquée par le disque solaire.
  s += `<defs><clipPath id="${id}-sun"><path clip-rule="evenodd" d="M-40 -60 H260 V320 H-40 Z M66 112 A46 46 0 1 0 158 112 A46 46 0 1 0 66 112 Z"/></clipPath></defs>`;
  s += `<g clip-path="url(#${id}-sun)">${paint(back, spine.slice(13), 'bk')}</g>`;
  s += paint(front, spine.slice(0, 16), 'fr');
  // Crête de plumes le long de la nuque et nageoire caudale en plumes.
  for (let i = 0; i < 6; i++) {
    const p = spine[16 + Math.min(5, i)], q = spine[Math.min(21, 17 + i)];
    s += feather(p[0] + (q[0] - p[0]) * 0.5, p[1] + (q[1] - p[1]) * 0.5 - 6, -150 + i * 12, 14 - i, 5, pal.light, pal.gold);
  }
  for (let i = 0; i < 5; i++) s += feather(0, 224, 196 + i * 12, 26 - i * 2, 6, i % 2 ? pal.light : pal.body, pal.gold);
  s += constellation([[40, 252], [64, 256], [92, 254], [120, 250]], pal.gold);

  for (let i = 0; i < 9; i++) s += feather(140 + (i % 3) * 6, 46 + Math.floor(i / 3) * 7, 100 + i * 14, 16, 6, i % 2 ? pal.light : pal.belly, i % 3 ? null : pal.gold);
  // ---------- Tête (profil, regard vers la gauche) ----------
  let hd = '';
  for (let i = 0; i < 5; i++) hd += feather(4, -4 + i * 1.5, 192 - i * 9, 34 - i * 3, 6, i % 2 ? pal.light : pal.body, pal.gold);
  // Mâchoire inférieure entrouverte, langue fourchue.
  hd += ink('M30 4 L50 3 C45 7 36 9 24 10 C14 11 6 10 2 8 Z', INK, 0.9);
  hd += line('M52 4 L62 6 L67 4 M62 6 L67 9', 1, pal.accent);
  hd += ink('M50 5 C45 9 36 11 24 12 C14 13 6 12 2 9 C10 9 22 8 34 7 Z', pal.belly, 1.1);
  hd += ink('M45 3.6 L46 7.4 L47.6 3.4 Z M39 4 L40 6.6 L41.4 3.9 Z', CREAM, 0.5);
  const skull = 'M0 -10 C10 -16 22 -16 32 -12 C40 -9 48 -5 54 -1 C55 1 53 3 49 3 L30 4.5 C20 6 10 8 2 8 C-2 4 -2 -5 0 -10 Z';
  hd += ink(skull, pal.belly, 1.5);
  hd += `<path d="M0 -10 C10 -16 22 -16 32 -12 C40 -9 48 -5 54 -1 C44 -2 34 -2 24 -1 C14 0 6 2 -1 3 Z" fill="${pal.shade}"/>`;
  hd += shadow('M0 -10 C10 -16 22 -16 32 -12 C22 -10 12 -6 1 -2 Z', pal.deep, 0.6, 'fine') + speckles(c, 20, -8, 12, 3, 6, pal.gold);
  hd += `<path d="M8 -12 L15 -14 L18 -9 L11 -7 Z M18 -14 L25 -14 L26 -9 L19 -9 Z M38 -8 L44 -6 L43 -3 L37 -4 Z M2 -7 L8 -12 L11 -7 L5 -3 Z" fill="${pal.deep}" opacity="0.85"/>`;
  hd += line('M52 0 C44 1 34 2 26 3', 0.7, INK, ' opacity="0.6"');
  hd += ink(skull, 'none', 1.5);
  hd += ink('M24 -13 C26 -18 30 -22 36 -23 C34 -19 33 -15 34 -11 Z', pal.light, 1);
  hd += eyeA(30, -6, 4.2, pal.gold, { angle: 6, slit: true, open: 0.42 });
  hd += line('M22 -9 C27 -12 34 -11 38 -8', 1.1);
  hd += `<ellipse cx="48" cy="-3" rx="1.4" ry="0.7" fill="${INK}" transform="rotate(20 48 -3)"/>`;
  hd += gild('M20 12 C18 20 22 28 16 36 M12 12 C8 20 12 26 6 32', 0.9);
  hd += rim('M0 -9 C8 -15 20 -16 30 -13 C38 -11 46 -7 52 -3', pal.glow, 1);
  s += `<g transform="translate(144 30) rotate(200) scale(1.4 -1.4)">${hd}</g>`;

  s += sparkle(20, 40, 3.5, CREAM, false) + sparkle(214, 120, 3, pal.glow, false) + sparkle(200, 250, 2.6, CREAM, false);
  return s;
};

/** Décor : le cœur d'un système solaire gravé comme un astrolabe (orbites d'or, planètes, éruptions), oiseaux-soleil. */
ophalia.scene = (c: DrawCtx, b: Bounds) => {
  const { pal } = c;
  const { V, uid, ink, shadow, line, rim, gild, fur, eyeA, constellation, sparkle } = kit(c, 'ophalia-4-bg');
  const CREAM = '#FFF6D8', INK = '#140F24';
  const id = 'ophalia-4-bg';
  const W = b.x1 - b.x0, H = b.y1 - b.y0;
  const SX = 112, SY = 112, SR = 46;
  let s = `<defs><radialGradient id="${id}-g" cx="${f((SX - b.x0) / W * 100)}%" cy="${f((SY - b.y0) / H * 100)}%" r="80%"><stop offset="0" stop-color="${hsl(36, 70, 42)}"/><stop offset="0.35" stop-color="${hsl(c.hue - 10, 55, 20)}"/><stop offset="1" stop-color="${hsl(c.hue + 240, 50, 6)}"/></radialGradient>`
    + `<radialGradient id="${id}-s" cx="42%" cy="40%" r="65%"><stop offset="0" stop-color="#FFFBEA"/><stop offset="0.5" stop-color="${hsl(44, 95, 76)}"/><stop offset="1" stop-color="${hsl(32, 90, 56)}"/></radialGradient></defs>`;
  s += `<rect x="${b.x0}" y="${b.y0}" width="${W}" height="${H}" fill="url(#${id}-g)"/>`;
  for (let i = 0; i < 60; i++) {
    const x = b.x0 + c.r() * W, y = b.y0 + c.r() * H;
    if (Math.hypot(x - SX, y - SY) < 90) continue;
    s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(0.3 + c.r() * c.r() * 1.3)}" fill="${CREAM}" opacity="${f(0.3 + c.r() * 0.6)}"/>`;
  }
  // Orbites gravées (astrolabe) et planètes.
  for (const [r, k, a] of [[70, 0.42, -16], [96, 0.42, -16], [128, 0.42, -16], [160, 0.42, -16]] as const) {
    s += `<ellipse cx="${SX}" cy="${SY}" rx="${r}" ry="${f(r * k)}" fill="none" stroke="${pal.gold}" stroke-width="0.7" opacity="0.45" transform="rotate(${a} ${SX} ${SY})"/>`;
  }
  s += `<circle cx="${SX}" cy="${SY}" r="104" fill="none" stroke="${pal.gold}" stroke-width="0.5" stroke-dasharray="1.5 3" opacity="0.4"/>`;
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2, r1 = 108, r2 = i % 3 ? 112 : 118;
    s += `<line x1="${f(SX + Math.cos(a) * r1)}" y1="${f(SY + Math.sin(a) * r1)}" x2="${f(SX + Math.cos(a) * r2)}" y2="${f(SY + Math.sin(a) * r2)}" stroke="${pal.gold}" stroke-width="0.6" opacity="0.4"/>`;
  }
  const planet = (x: number, y: number, r: number, h: number) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${hsl(h, 30, 55)}"/>`
    + shadow(`M${x} ${y - r} A${r} ${r} 0 0 1 ${x} ${y + r} C${x + r * 0.7} ${y + r * 0.5} ${x + r * 0.7} ${y - r * 0.5} ${x} ${y - r} Z`, hsl(h, 30, 25), 0.6, 'fine');
  s += planet(24, 168, 6, c.hue + 180) + planet(214, 30, 8, c.hue + 120) + planet(36, 220, 4, c.hue + 60) + planet(196, 262, 5, c.hue + 220);
  // Le soleil : couronne, rayons gravés, granulation, protubérances.
  s += `<circle cx="${SX}" cy="${SY}" r="${SR + 40}" fill="${pal.glow}" opacity="0.4" filter="url(#b8)"/>`;
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2, r2 = SR + (i % 2 ? 10 : 20) + c.r() * 6;
    s += `<path d="M${f(SX + Math.cos(a - 0.05) * SR)} ${f(SY + Math.sin(a - 0.05) * SR)} L${f(SX + Math.cos(a) * r2)} ${f(SY + Math.sin(a) * r2)} L${f(SX + Math.cos(a + 0.05) * SR)} ${f(SY + Math.sin(a + 0.05) * SR)} Z" fill="${hsl(42, 95, 70)}" opacity="0.75"/>`;
  }
  s += `<circle cx="${SX}" cy="${SY}" r="${SR}" fill="url(#${id}-s)"/>`;
  s += `<circle cx="${SX}" cy="${SY}" r="${SR - 7}" fill="none" stroke="${hsl(30, 85, 58)}" stroke-width="0.8" opacity="0.6"/>`;
  for (let i = 0; i < 26; i++) {
    const a = c.r() * Math.PI * 2, d = Math.sqrt(c.r()) * (SR - 6);
    s += `<circle cx="${f(SX + Math.cos(a) * d)}" cy="${f(SY + Math.sin(a) * d)}" r="${f(1.5 + c.r() * 2.5)}" fill="none" stroke="${hsl(30, 85, 58)}" stroke-width="0.6" opacity="0.6"/>`;
  }
  s += shadow(`M${SX + 20} ${SY - SR + 4} A${SR} ${SR} 0 0 1 ${SX + 10} ${SY + SR - 1} C${SX + 50} ${SY + 20} ${SX + 50} ${SY - 20} ${SX + 20} ${SY - SR + 4} Z`, hsl(24, 85, 50), 0.45, 'fine');
  s += line(`M${SX - 36} ${SY - 50} C${SX - 50} ${SY - 70} ${SX - 20} ${SY - 78} ${SX - 14} ${SY - 50}`, 2.2, hsl(40, 100, 72), ' opacity="0.8"');
  s += line(`M${SX + 44} ${SY + 22} C${SX + 70} ${SY + 20} ${SX + 70} ${SY + 46} ${SX + 40} ${SY + 32}`, 1.8, hsl(40, 100, 72), ' opacity="0.7"');
  // Oiseaux-soleil en vol sur les orbites (petites créatures secondaires).
  const bird = (x: number, y: number, k: number, r: number) => `<path transform="translate(${x} ${y}) rotate(${r}) scale(${k})" d="M0 0 C-4 -6 -10 -7 -14 -4 C-9 -4 -5 -2 -2 1 L-8 4 L0 3 C4 3 8 1 10 -1 L13 -1 L10 1 C6 4 2 5 0 5 C4 -2 10 -6 16 -6 C10 -3 6 -1 0 0 Z" fill="${hsl(c.hue + 30, 70, 70)}" opacity="0.85"/>`;
  s += bird(30, 10, 0.9, -8) + bird(200, 214, 0.8, 12) + bird(46, 194, 0.6, -20) + bird(186, 6, 0.65, 6);
  s += `<ellipse cx="${SX}" cy="282" rx="130" ry="26" fill="${hsl(c.hue + 240, 50, 5)}" opacity="0.5" filter="url(#b8)"/>`;
  return s;
};
