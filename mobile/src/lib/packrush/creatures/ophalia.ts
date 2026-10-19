import type { Bounds, DrawCtx, Species } from './style.ts';
import { curve, ellipse, facetSky, facets, gem, hsl, limb, mix, prng, type Light, type Pt } from './lowpoly.ts';

/** Tracé SVG simple (M, L, C absolus, Z) → polygone échantillonné. */
function pathPts(d: string, step = 6): Pt[] {
  const t = d.match(/[MLCZ]|-?\d*\.?\d+/g) ?? [];
  let i = 0, cmd = '', start: Pt = [0, 0], cur: Pt = [0, 0];
  const segs: [Pt, Pt, Pt][] = [];
  const num = () => +t[i++];
  while (i < t.length) {
    if (/[MLCZ]/.test(t[i])) cmd = t[i++];
    if (cmd === 'M') { start = cur = [num(), num()]; cmd = 'L'; continue; }
    if (cmd === 'Z') break;
    if (cmd === 'L') { const p: Pt = [num(), num()]; segs.push([cur, p, p]); cur = p; }
    else if (cmd === 'C') { const a: Pt = [num(), num()], b: Pt = [num(), num()], p: Pt = [num(), num()]; segs.push([a, b, p]); cur = p; }
  }
  return curve(start, segs, step);
}

/** Lissage Catmull-Rom d'une colonne de points (sous-échantillonnée). */
function spline(pts: Pt[], per = 3): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < per; k++) {
      const t = k / per, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)) as Pt);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

const GOLD = '#E9C25B', CREAM = '#FFF6D8';
const SX = 112, SY = 112, SR = 46;
/** Créature et soleil réduits ensemble pour laisser le bas de la carte au nom. */
const FIT = 'translate(111 -36) scale(0.9) translate(-111 36)';

/**
 * Ophalia (low-poly) : grand serpent à plumes et à six ailes de séraphin, enroulé autour du soleil qu'il garde ;
 * une boucle passe devant l'astre, l'autre derrière. Tête de profil, cornes-plumes, barbillons d'or.
 */
const draw = (c: DrawCtx): string => {
  const h = c.hue;
  const body = hsl(h, 48, 40), deep = hsl(h + 20, 50, 16), pale = hsl(h - 10, 50, 70);
  // Lumière principale : le soleil au centre ; contour rosé de la couronne.
  const light: Light = { dir: [-0.55, -0.35, 0.5], color: '#FFD9A0', shade: '#0E0414', rim: '#FF9A5A' };
  const far: Light = { ...light, color: mix('#FFE3A8', deep, 0.5), rim: undefined };
  let s = '';

  // ---------- Soleil gardé ----------
  s += `<circle cx="${SX}" cy="${SY}" r="${SR + 34}" fill="#FFB26B" opacity="0.12"/><circle cx="${SX}" cy="${SY}" r="${SR + 18}" fill="#FFD27A" opacity="0.16"/>`;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2, r2 = SR + (i % 2 ? 12 : 24);
    const P = (aa: number, rr: number) => `${(SX + Math.cos(aa) * rr).toFixed(1)} ${(SY + Math.sin(aa) * rr).toFixed(1)}`;
    s += `<path d="M${P(a - 0.09, SR - 2)}L${P(a, r2)}L${P(a, SR - 2)}Z" fill="#FFE08A"/><path d="M${P(a, SR - 2)}L${P(a, r2)}L${P(a + 0.09, SR - 2)}Z" fill="#F0A24A"/>`;
  }
  s += facets(ellipse(SX, SY, SR, SR, 30), '#FFC65A', { dir: [-0.4, -0.5, 0.8], color: '#FFFBEA', shade: '#D2621E' }, { size: 16, relief: 1.6, seed: 2, base2: '#F2973C', jitter: 0.2 });

  // ---------- Ailes (repère local : bras le long de +x, rémiges vers +y) ----------
  const feather = (bx: number, by: number, ang: number, len: number, w: number): Pt[] => {
    const r = (ang * Math.PI) / 180, ux = Math.cos(r), uy = Math.sin(r), nx = -uy, ny = ux;
    const at = (k: number, o: number): Pt => [bx + ux * len * k + nx * o, by + uy * len * k + ny * o];
    return [at(0, -w * 0.4), at(0.45, -w * 0.55), at(0.85, -w * 0.4), at(1.03, 0), at(0.85, w * 0.45), at(0.45, w * 0.55), at(0, w * 0.4)];
  };
  const wing = (x: number, y: number, rot: number, k: number, left: boolean, near: boolean, seed: number) => {
    const a = (rot * Math.PI) / 180, cr = Math.cos(a), sr = Math.sin(a), sy = left ? -1 : 1;
    const T = (p: Pt): Pt => { const px = p[0] * k, py = p[1] * k * sy; return [x + px * cr - py * sr, y + px * sr + py * cr]; };
    const L = near ? light : far;
    const prim = near ? mix(pale, '#FFF3C8', 0.3) : mix(body, deep, 0.3), sec = near ? body : deep, cov = near ? pale : body;
    let w = '';
    for (let i = 0; i < 4; i++) w += facets(feather(10 + i * 11, -2, 96 - i * 4, 34, 11).map(T), sec, L, { size: 14, relief: 0.6, seed: seed + i });
    for (let i = 5; i >= 0; i--) {
      const f = feather(52 + i * 8, -8 - i * 0.6, 72 - i * 11, 40 + i * 3, 11);
      w += facets(f.map(T), prim, L, { size: 14, relief: 0.7, seed: seed + 10 + i, base2: near ? GOLD : mix(prim, hsl(h + 160, 50, 50), 0.5) });
    }
    // Couvertures (une rangée de plumes courtes) et bord d'attaque.
    for (let i = 0; i < 5; i++) w += facets(feather(4 + i * 17, -8 - Math.sin((i / 5) * Math.PI) * 6, 86 - i * 6, 20, 13).map(T), cov, L, { size: 12, relief: 0.6, seed: seed + 20 + i });
    w += facets(pathPts('M-2 -6 C14 -16 34 -20 50 -18 C70 -16 88 -10 104 -4 C88 -12 70 -22 50 -24 C30 -26 12 -20 -2 -10 Z', 6).map(T), cov, L, { size: 9, relief: 0.6, seed: seed + 30 });
    return w;
  };
  // Ailes lointaines (sombres), puis proches.
  s += wing(144, 50, -172, 0.9, true, false, 100) + wing(144, 44, -128, 0.86, true, false, 140) + wing(150, 58, 18, 0.72, false, false, 180);

  // ---------- Corps : colonne enroulée autour du soleil ----------
  const spine: Pt[] = [[-2, 222], [28, 238], [68, 246], [116, 240], [160, 228], [192, 204], [206, 170], [200, 140], [180, 126], [150, 132], [118, 146], [86, 152], [58, 146], [38, 126], [30, 100], [42, 82], [74, 76], [110, 74], [138, 74], [150, 60], [150, 42], [144, 26]];
  const width = [2, 6, 9, 12, 15, 17, 19, 21, 22, 22, 22, 22, 22, 22, 21, 21, 20, 20, 19, 18, 17, 15];
  const seg = (a: number, b: number) => { const sp = spline(spine.slice(a, b), 2); const wd = spline(width.slice(a, b).map((v) => [v, 0] as Pt), 2).map((p) => p[0]); return { sp, wd }; };
  // Boucle arrière : seulement les parties hors du disque solaire (derrière).
  const backS = seg(13, 22);
  const scaleBand = (sp: Pt[], wd: number[], seed: number, L: Light, base: string) => {
    let o = facets(limb(sp, wd), base, L, { size: 15, relief: 1.4, seed, base2: mix(base, deep, 0.35) });
    // Ventre clair (bande du côté intérieur).
    o += facets(limb(sp.map((p, i) => { const q = sp[Math.min(sp.length - 1, i + 1)], pr = sp[Math.max(0, i - 1)], dx = q[0] - pr[0], dy = q[1] - pr[1], l = Math.hypot(dx, dy) || 1; return [p[0] + dy / l * wd[i] * 0.3, p[1] - dx / l * wd[i] * 0.3] as Pt; }), wd.map((v) => v * 0.32)), pale, L, { size: 10, relief: 0.4, seed: seed + 1 });
    // Losanges dorsaux sertis.
    for (let i = 2; i < sp.length - 1; i += 2) {
      const p = sp[i], q = sp[i + 1], dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1, ox = -dy / l * wd[i] * 0.18, oy = dx / l * wd[i] * 0.18;
      const m: Pt = [p[0] + ox, p[1] + oy], tx = dx / l * 3.2, ty = dy / l * 3.2, nx = ox * 0.6, ny = oy * 0.6;
      o += `<path d="M${(m[0] - tx).toFixed(1)} ${(m[1] - ty).toFixed(1)}L${(m[0] + nx).toFixed(1)} ${(m[1] + ny).toFixed(1)}L${(m[0] + tx).toFixed(1)} ${(m[1] + ty).toFixed(1)}Z" fill="${GOLD}"/><path d="M${(m[0] - tx).toFixed(1)} ${(m[1] - ty).toFixed(1)}L${(m[0] - nx).toFixed(1)} ${(m[1] - ny).toFixed(1)}L${(m[0] + tx).toFixed(1)} ${(m[1] + ty).toFixed(1)}Z" fill="${deep}"/>`;
    }
    return o;
  };
  s += `<defs><clipPath id="ophalia-4-sun"><path clip-rule="evenodd" d="M-60 -80 H280 V340 H-60 Z M${SX - SR} ${SY} A${SR} ${SR} 0 1 0 ${SX + SR} ${SY} A${SR} ${SR} 0 1 0 ${SX - SR} ${SY} Z"/></clipPath></defs>`;
  s += `<g clip-path="url(#ophalia-4-sun)">${scaleBand(backS.sp, backS.wd, 30, light, body)}</g>`;
  const frontS = seg(0, 16);
  s += scaleBand(frontS.sp, frontS.wd, 40, light, body);
  // Nageoire caudale en éventail de plumes.
  for (let i = 0; i < 5; i++) s += facets(feather(0, 224, 196 + i * 12, 26 - i * 2, 7), i % 2 ? pale : GOLD, light, { size: 10, relief: 0.5, seed: 50 + i });
  // Constellation sur la boucle avant.
  const cst: Pt[] = [[40, 252], [64, 256], [92, 254], [120, 250]];
  s += `<polyline points="${cst.map((p) => p.join(',')).join(' ')}" fill="none" stroke="${GOLD}" stroke-width="0.7" opacity="0.8"/>` + cst.map(([x, y]) => gem(x, y, 3, '#FFFFFF', GOLD)).join('');

  // Ailes proches, puis collerette de plumes à leur racine.
  s += wing(152, 44, -60, 0.86, false, true, 200) + wing(154, 50, -24, 0.84, false, true, 240) + wing(140, 60, 168, 0.72, true, true, 280);
  for (let i = 0; i < 7; i++) s += facets(feather(140 + (i % 3) * 6, 46 + Math.floor(i / 3) * 7, 100 + i * 18, 18, 7), i % 2 ? pale : body, light, { size: 10, relief: 0.6, seed: 60 + i });

  // ---------- Tête : profil effilé, regard vers la gauche ----------
  const HX = 146, HY = 30, HA = (200 * Math.PI) / 180, HK = 1.6;
  const H = (x: number, y: number): Pt => { const yy = -y; return [HX + (x * Math.cos(HA) - yy * Math.sin(HA)) * HK, HY + (x * Math.sin(HA) + yy * Math.cos(HA)) * HK]; };
  const HM = (pts: Pt[]) => pts.map((p) => H(p[0], p[1]));
  const Pd = (pts: Pt[]) => 'M' + HM(pts).map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('L') + 'Z';
  // Plumes de crête (vers l'arrière de la tête).
  for (let i = 0; i < 4; i++) s += facets(HM(feather(4, -4 + i * 2, 192 - i * 10, 30 - i * 3, 6)), i % 2 ? pale : GOLD, light, { size: 10, relief: 0.5, seed: 70 + i });
  // Gueule entrouverte, langue fourchue, mâchoire fine.
  s += `<path d="${Pd([[30, 3], [52, 2.5], [46, 6], [26, 9], [8, 9], [2, 7]])}" fill="#16050C"/>`;
  s += `<path d="${Pd([[53, 3.6], [63, 5.6], [68, 3.4], [63.6, 6.4], [68, 9], [62.6, 7], [53, 4.8]])}" fill="#E8607A"/>`;
  s += facets(HM(pathPts('M52 4 C47 8 38 10 26 11 C16 12 8 11 2 8 C10 8 22 7 34 6 Z', 4)), pale, light, { size: 7, relief: 0.5, seed: 75 });
  s += `<path d="${Pd([[47, 3.4], [48, 6.6], [49.4, 3.2]])}" fill="${CREAM}"/><path d="${Pd([[41, 3.8], [42, 6.2], [43.2, 3.7]])}" fill="${CREAM}"/>`;
  // Crâne : dessus sombre écaillé, flanc de la mâchoire clair.
  const skull = HM(pathPts('M0 -7 C6 -13 17 -15 27 -13 C33 -12 38 -9 44 -7 C50 -5 55 -3 57 -1 C57 1 55 2.5 52 2.5 L30 3 C20 4 10 6 2 7 C-2 4 -2 -2 0 -7 Z', 4));
  s += facets(skull, body, light, { size: 8, relief: 1.1, seed: 76, base2: pale });
  s += facets(HM(pathPts('M0 -7 C6 -13 17 -15 27 -13 C33 -12 38 -9 44 -7 C50 -5 55 -3 57 -1 C46 -2 34 -2 24 -1 C14 0 6 2 0 2 Z', 4)), deep, light, { size: 7, relief: 0.8, seed: 77 });
  // Arcade claire et cornes-plumes au-dessus de l'œil.
  s += facets(HM([[20, -12], [26, -16], [32, -16], [38, -11], [30, -11], [22, -9]]), pale, light, { size: 6, relief: 0.5, seed: 78 });
  s += facets(HM(feather(24, -13, 200, 26, 4.5)), pale, light, { size: 7, relief: 0.4, seed: 79 }) + facets(HM(feather(27, -14, 206, 20, 3.5)), GOLD, light, { size: 7, relief: 0.4, seed: 80 });
  // Œil incandescent (gemme), narine.
  const [ex, ey] = H(31, -8);
  s += `<circle cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" r="6" fill="#FFD27A" opacity="0.22"/><path d="${Pd([[26, -8], [31, -11], [36, -8.5], [31, -6]])}" fill="#FFC84A"/><path d="${Pd([[30.4, -10.4], [31.6, -10.4], [31.6, -6.6], [30.4, -6.6]])}" fill="#1A0606"/><circle cx="${(ex - 1).toFixed(1)}" cy="${(ey - 1.2).toFixed(1)}" r="0.7" fill="#FFFFFF"/>`;
  s += `<path d="${Pd([[50.6, -3.2], [53.2, -2.6], [50.8, -2]])}" fill="#16050C"/>`;
  // Barbillons d'or.
  for (const [sp, sd] of [[[[18, 8], [16, 16], [20, 24], [14, 32]], 81], [[[10, 8], [6, 16], [10, 22], [4, 28]], 82]] as [Pt[], number][])
    s += facets(limb(HM(sp), [2.4, 2, 1.4, 0.6]), GOLD, light, { size: 6, relief: 0.3, seed: sd });

  s += gem(20, 40, 3.5, '#FFFFFF', '#FFE2A0') + gem(214, 120, 3, '#FFFFFF', '#FFE2A0') + gem(200, 250, 2.6, '#FFFFFF', '#FFE2A0');
  return `<g transform="${FIT}">${s}</g>`;
};

/** Décor : cœur d'un système solaire en astrolabe (orbites d'or, planètes facettées) et oiseaux-soleil. */
const scene = (c: DrawCtx, b: Bounds): string => {
  const h = c.hue, r = prng(23);
  let s = facetSky(b.x0, b.y0, b.x1, b.y1, ['#08051A', hsl(h + 250, 45, 14), '#3A1A2E', '#5A2A24', '#2A1430', '#07040F'], 13, 30);
  for (let i = 0; i < 40; i++) s += `<circle cx="${(b.x0 + r() * (b.x1 - b.x0)).toFixed(1)}" cy="${(b.y0 + r() * (b.y1 - b.y0)).toFixed(1)}" r="${(0.4 + r() * r() * 1.3).toFixed(1)}" fill="#FFF2DA" opacity="${(0.35 + r() * 0.6).toFixed(2)}"/>`;
  s += `<g transform="${FIT}">`;
  // Orbites d'or (astrolabe) et graduations.
  for (const rr of [70, 98, 130, 162]) s += `<ellipse cx="${SX}" cy="${SY}" rx="${rr}" ry="${(rr * 0.42).toFixed(1)}" fill="none" stroke="${GOLD}" stroke-width="0.7" opacity="0.4" transform="rotate(-16 ${SX} ${SY})"/>`;
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2, r1 = 108, r2 = i % 3 ? 112 : 118;
    s += `<line x1="${(SX + Math.cos(a) * r1).toFixed(1)}" y1="${(SY + Math.sin(a) * r1).toFixed(1)}" x2="${(SX + Math.cos(a) * r2).toFixed(1)}" y2="${(SY + Math.sin(a) * r2).toFixed(1)}" stroke="${GOLD}" stroke-width="0.6" opacity="0.35"/>`;
  }
  // Planètes facettées sur les orbites, éclairées par le soleil.
  const planet = (x: number, y: number, rad: number, col: string, seed: number) => {
    const dx = SX - x, dy = SY - y, l = Math.hypot(dx, dy) || 1;
    return facets(ellipse(x, y, rad, rad, 12), col, { dir: [dx / l, dy / l, 0.5], color: '#FFE3A8', shade: '#07040F' }, { size: Math.max(3, rad * 0.7), relief: 1.4, seed });
  };
  s += planet(24, 168, 7, hsl(h + 180, 35, 45), 31) + planet(214, 30, 9, hsl(h + 120, 35, 45), 32) + planet(36, 220, 5, hsl(h + 60, 40, 45), 33) + planet(196, 262, 6, hsl(h + 220, 35, 45), 34);
  s += `<ellipse cx="214" cy="30" rx="16" ry="3" fill="none" stroke="#E8C9A0" stroke-width="1" opacity="0.6" transform="rotate(-20 214 30)"/>`;
  s += '</g>';
  // Oiseaux-soleil en vol (petites créatures facettées).
  const bird = (x: number, y: number, k: number, seed: number) =>
    facets([[x, y], [x - 12 * k, y - 6 * k], [x - 4 * k, y + 1 * k]], '#F2A85A', { dir: [0, -1, 0.5], color: '#FFF1C8', shade: '#3A1408' }, { size: 6, seed })
    + facets([[x, y], [x + 12 * k, y - 7 * k], [x + 4 * k, y + 1 * k]], '#E58A3E', { dir: [0, -1, 0.5], color: '#FFF1C8', shade: '#3A1408' }, { size: 6, seed: seed + 1 })
    + `<path d="M${x - 2 * k} ${y}L${x} ${y + 3 * k}L${x + 2 * k} ${y}Z" fill="#FFD27A"/>`;
  s += bird(30, 10, 0.9, 40) + bird(200, 214, 0.8, 42) + bird(46, 196, 0.6, 44) + bird(186, 4, 0.65, 46);
  return s;
};

export const ophalia: Species = Object.assign(draw, { scene });
