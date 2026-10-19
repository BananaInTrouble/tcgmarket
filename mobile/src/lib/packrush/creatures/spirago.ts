import type { Bounds, DrawCtx, Species } from './style.ts';
import { curve, ellipse, facetSky, facets, gem, hsl, limb, mix, prng, type Light, type Pt } from './lowpoly.ts';

/**
 * Spirago → Volutoile → Galactemple, en low-poly : escargot dont la coquille est une galaxie enroulée. Le jeune
 * explore une feuille perlée de rosée la nuit, le sub-adulte gravit un rocher du marais de nébuleuse au crépuscule,
 * l'adulte trône dans des ruines célestes sous une planète à anneaux (arcature d'or, anneau d'orbite).
 */

const GOLD = '#E9C25B', CRYSTAL = '#BFF6FF';
const n1 = (v: number) => v.toFixed(1);
const LIGHTS: Light[] = [
  { dir: [-0.5, -0.7, 0.55], color: '#D8FFF0', shade: '#06101A', rim: '#7CF5E0' },
  { dir: [0.4, -0.7, 0.55], color: '#FFD0E8', shade: '#120A24', rim: '#FF9AD8' },
  { dir: [0.5, -0.6, 0.6], color: '#FFE6F0', shade: '#0E0A26', rim: GOLD },
];
const constel = (pts: Pt[], s = 3.2) =>
  `<polyline points="${pts.map((p) => p.map(n1).join(',')).join(' ')}" fill="none" stroke="${GOLD}" stroke-width="0.7" opacity="0.85"/>`
  + pts.map(([x, y]) => gem(x, y, s, '#FFFFFF', GOLD)).join('');

const draw = (c: DrawCtx): string => {
  const st = Math.min(c.stage, 2);
  const h = c.hue;
  const L = LIGHTS[st];
  const body = hsl(h, 32 + st * 4, 46), deep = hsl(h + 12, 40, 22), belly = mix(body, '#F2EAD8', 0.35);
  const far: Light = { ...L, color: mix(L.color, deep, 0.45), rim: undefined };
  let s = '';
  s += `<ellipse cx="118" cy="205" rx="92" ry="8" fill="#05030C" opacity="0.4"/>`;
  // Traîne de poussière d'étoiles derrière l'escargot.
  const r = prng(5 + st);
  for (let i = 0; i < 8 + st * 4; i++) s += gem(150 + r() * 66, 199 + r() * 6, 1 + r() * 1.6, '#FFFFFF', CRYSTAL);
  // Tentacule supérieur de l'arrière.
  const tl = [0.72, 0.88, 1][st];
  const tent = (bx: number, by: number, ex: number, ey: number, bend: number, w: number, isFar: boolean, seed: number) => {
    let o = facets(limb([[bx, by], [(bx + ex) / 2 + bend, (by + ey) / 2], [ex, ey]], [w, w * 0.62, w * 0.4]), isFar ? deep : body, isFar ? far : L, { size: 3.4, relief: 0.5, seed });
    o += facets(ellipse(ex, ey, w * 0.62, w * 0.62, 8), isFar ? deep : body, isFar ? far : L, { size: 3, relief: 0.6, seed: seed + 1 });
    o += `<circle cx="${n1(ex - 0.8)}" cy="${n1(ey)}" r="${n1(w * 0.36)}" fill="#0B0618"/><circle cx="${n1(ex - 1.4)}" cy="${n1(ey - 0.8)}" r="${n1(w * 0.14)}" fill="#FFFFFF"/>`;
    if (st >= 1) o += gem(ex - 1, ey - w * 1.8, isFar ? 2 : 2.6, '#FFFFFF', CRYSTAL);
    return o;
  };
  const hx = 52, hy = 134;
  s += tent(hx + 6, hy - 4, hx + 26 * tl, hy - 76 * tl, 10, 8, true, 2);
  // Pied : long, bombé, bord clair.
  const foot = curve([206, 204], [[[186, 196], [170, 182], [150, 170]], [[126, 156], [100, 154], [86, 158]], [[76, 150], [66, 130], [50, 128]], [[38, 128], [30, 142], [28, 160]], [[26, 180], [28, 200], [42, 204]], [[100, 206], [160, 206], [206, 204]]]);
  s += facets(foot, body, L, { size: 7, relief: 1.1, seed: 3, base2: deep });
  s += facets([[30, 198], [110, 200], [206, 204], [110, 206], [30, 204]], belly, L, { size: 9, relief: 0.3, seed: 4 });
  // Tête : lèvre frontale claire, tubercules.
  s += facets(curve([28, 190], [[[25, 178], [30, 168], [40, 168]], [[48, 170], [50, 182], [44, 194]], [[38, 199], [30, 198], [28, 190]]]), mix(body, belly, 0.45), L, { size: 4, relief: 0.6, seed: 5 });
  for (let i = 0; i < 34; i++) { const x = 34 + r() * 150, y = 150 + r() * 44; s += `<path d="M${n1(x)} ${n1(y)} l2 -1.6 l2 1.6 l-2 1 z" fill="${mix(body, '#FFFFFF', 0.3)}" opacity="${n1(0.35 + r() * 0.3)}"/>`; }
  if (st >= 1) s += constel([[48, 172], [60, 164], [72, 176], [86, 180]], 2.6);
  // Tentacules inférieurs et tentacule de devant.
  s += facets(limb([[34, 160], [24, 166], [16, 172]], [7, 4.6, 2.4]), body, L, { size: 3, relief: 0.5, seed: 6 });
  s += tent(hx - 2, hy - 2, hx - 24 * tl, hy - 72 * tl, -6, 9, false, 7);

  // ---- Coquille : tours successifs d'une spirale logarithmique, chacun une galaxie facettée ----
  const cx = 128, cy = 106, R = 74;
  const turns = [3, 5, 7][st];
  const shellL: Light = { ...L, color: mix(L.color, '#9AA8E0', 0.3) };
  const galaxy = [hsl(h + 230, 38, 20), hsl(h + 260, 40, 26), hsl(h + 200, 42, 30), hsl(h + 290, 38, 36), hsl(h + 30, 50, 50), '#F6F0FF'];
  let core: Pt = [cx, cy];
  let rr = R;
  for (let i = 0; i <= turns; i++) {
    // Chaque tour est un disque plus petit, tangent au précédent du côté qui tourne : l'empilement dessine la spirale.
    if (i > 0) {
      const nr = rr * 0.72, a = (128 * Math.PI) / 180 + i * 2.1;
      core = [core[0] + Math.cos(a) * (rr - nr) * 0.9, core[1] + Math.sin(a) * (rr - nr) * 0.9];
      rr = nr;
    }
    const [ox, oy] = core;
    const col = galaxy[Math.min(galaxy.length - 1, Math.floor((i / turns) * (galaxy.length - 1)))];
    const tint = st === 0 ? mix(col, '#BFE8E0', 0.4) : col;
    s += facets(ellipse(ox, oy, rr, rr * 0.97, Math.max(10, Math.round(26 - i * 2.4))), tint, shellL, { size: Math.max(4.5, 13 - i * 1.4), relief: 0.9 - i * 0.05, seed: 20 + i, opacity: st === 0 ? 0.9 : 1 });
    // Nébuleuse et étoiles du tour.
    s += facets(ellipse(ox + rr * 0.3, oy - rr * 0.2, rr * 0.4, rr * 0.22, 10, 0.5), hsl(h + 160 + i * 40, 50, 50), shellL, { size: Math.max(3, rr / 5), relief: 0.4, seed: 40 + i, opacity: 0.35 });
    for (let j = 0; j < 7 - i * 0.6; j++) {
      const t = r() * Math.PI * 2, d = rr * (0.55 + r() * 0.35);
      s += `<circle cx="${n1(ox + Math.cos(t) * d)}" cy="${n1(oy + Math.sin(t) * d)}" r="${n1(0.5 + r() * 0.9)}" fill="#FFFFFF" opacity="${n1(0.5 + r() * 0.5)}"/>`;
    }
  }
  // Cœur de la galaxie.
  s += `<circle cx="${n1(core[0])}" cy="${n1(core[1])}" r="${10 + st * 3}" fill="#FFF6D8" opacity="0.25"/>` + gem(core[0], core[1], 5 + st * 2, '#FFFFFF', '#FFE6A8');
  // Stries de croissance d'or (sub-adulte) ; arcature du temple et anneau d'orbite (adulte).
  if (st >= 1) {
    for (let a = -2.6; a < 2.2; a += st >= 2 ? 0.32 : 0.5) {
      const x1 = cx + Math.cos(a) * R * 0.98, y1 = cy + Math.sin(a) * R * 0.96, x2 = cx + Math.cos(a) * R * 0.74 + Math.cos(2.23) * 4, y2 = cy + Math.sin(a) * R * 0.72 + Math.sin(2.23) * 4;
      s += `<path d="M${n1(x1)} ${n1(y1)} L${n1(x2)} ${n1(y2)}" stroke="${GOLD}" stroke-width="${st >= 2 ? 1.1 : 0.7}" opacity="0.8"/>`;
    }
  }
  if (st >= 2) {
    const arc: Pt[] = [];
    for (let a = -2.7; a < 2.4; a += 0.16) arc.push([cx + Math.cos(a) * R * 0.86, cy + Math.sin(a) * R * 0.84]);
    s += `<polyline points="${arc.map((p) => p.map(n1).join(',')).join(' ')}" fill="none" stroke="${GOLD}" stroke-width="1.3" opacity="0.9"/>`;
    for (let i = 0; i < arc.length; i += 4) s += gem(arc[i][0], arc[i][1], 2.2, '#FFFFFF', GOLD);
    // Anneau d'orbite (moitié avant) et sa petite planète.
    const ring: Pt[] = [];
    for (let a = 0; a <= Math.PI + 0.01; a += 0.15) { const x = Math.cos(a) * 92, y = Math.sin(a) * 17, ro = -0.28; ring.push([cx + 4 + x * Math.cos(ro) - y * Math.sin(ro), cy + 6 + x * Math.sin(ro) + y * Math.cos(ro)]); }
    s += facets(limb(ring, [2.6]), GOLD, { ...L, color: '#FFFFFF', shade: '#7A5A10' }, { size: 7, relief: 0.3, seed: 60 });
    s += facets(ellipse(206, 74, 6, 6, 10), hsl(h + 40, 60, 60), L, { size: 3, relief: 0.8, seed: 61 });
    s += constel([[20, 30], [34, 22], [48, 30], [44, 46]]) + constel([[176, 14], [192, 26], [206, 20]]);
  }
  // Clair de bord sur la coquille (petites facettes claires en haut).
  s += `<path d="M${n1(cx - R * 0.6)} ${n1(cy - R * 0.72)} L${n1(cx - R * 0.2)} ${n1(cy - R * 0.96)} L${n1(cx - R * 0.36)} ${n1(cy - R * 0.8)} Z" fill="#FFFFFF" opacity="0.45"/>`;
  const S = [0.84, 0.93, 1][st];
  const rot = st === 1 ? ' rotate(10)' : '';
  return `<g transform="translate(116 205)${rot} scale(${S}) translate(-116 -205)">${s}</g>`;
};

// ---------------------------------------------------------------------------------------------------------------
// Décor : jardin des astres (feuille perlée de rosée, nuit), marais de nébuleuse au crépuscule (rocher moussu),
// ruines célestes sous une planète à anneaux.

const dew = (x: number, y: number, rr: number) =>
  `<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(rr)}" fill="#CFF3EE" opacity="0.35"/><path d="M${n1(x - rr)} ${n1(y)} L${n1(x)} ${n1(y + rr)} L${n1(x + rr)} ${n1(y)} Z" fill="#7CF5E0" opacity="0.3"/>`
  + `<circle cx="${n1(x - rr * 0.35)}" cy="${n1(y - rr * 0.4)}" r="${n1(rr * 0.22)}" fill="#FFFFFF"/>` + gem(x + rr * 0.15, y + rr * 0.1, rr * 0.4, '#FFFFFF', CRYSTAL);
const stars = (b: Bounds, n: number, ymax: number, seed: number) => {
  const r = prng(seed);
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = b.x0 + r() * (b.x1 - b.x0), y = b.y0 + r() * (ymax - b.y0), z = r();
    s += z > 0.78 ? gem(x, y, 1.6 + r() * 2, '#FFFFFF', '#BFD7FF') : `<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(0.5 + z)}" fill="#FFFFFF" opacity="${n1(0.4 + r() * 0.5)}"/>`;
  }
  return s;
};

const scene = (c: DrawCtx, b: Bounds): string => {
  const st = Math.min(c.stage, 2);
  const h = c.hue;
  const r = prng(70 + st);
  let s = '';
  if (st === 0) {
    s += facetSky(b.x0, b.y0, b.x1, b.y1, ['#0A1426', '#10283A', '#123236', '#0C1E1C', '#08120F'], 5, 32);
    for (let i = 0; i < 10; i++) {
      const x = b.x0 + r() * (b.x1 - b.x0), y = 10 + r() * 150, rr = 6 + r() * 14;
      s += `<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(rr)}" fill="${['#7CF5E0', '#E8F59A', '#9FB8FF'][i % 3]}" opacity="${n1(0.08 + r() * 0.1)}"/>`;
    }
    s += stars(b, 24, 120, 3);
    const leafL: Light = { dir: [-0.5, -0.7, 0.5], color: '#9FE0C0', shade: '#04100C' };
    const leaf = (x: number, y: number, l: number, a: number, col: string, seed: number) => {
      const c0 = Math.cos(a), s0 = Math.sin(a), P = (u: number, v: number): Pt => [x + u * c0 - v * s0, y + u * s0 + v * c0];
      return facets([P(0, 0), P(l * 0.3, -l * 0.26), P(l * 0.7, -l * 0.2), P(l, 0), P(l * 0.7, l * 0.2), P(l * 0.3, l * 0.26)], col, leafL, { size: Math.max(8, l / 6), relief: 0.6, seed });
    };
    s += leaf(-10, 120, 84, -0.5, '#1A4036', 31) + leaf(150, 60, 92, -0.35, '#1A4036', 32) + leaf(232, 150, 70, -2.8, '#163830', 33) + leaf(40, 30, 60, -1.0, '#163830', 34);
    // Petite coccinelle dorée sur une feuille du fond.
    s += `<ellipse cx="186" cy="48" rx="5" ry="4" fill="${GOLD}" transform="rotate(-20 186 48)"/><path d="M186 44 L187 52" stroke="#3A2A10" stroke-width="0.7"/><circle cx="184" cy="47" r="0.9" fill="#3A2A10"/><circle cx="188.5" cy="49.5" r="0.9" fill="#3A2A10"/><circle cx="181" cy="50" r="2" fill="#2A1A10"/>`;
    // Grande feuille du premier plan, nervure claire, perles de rosée.
    s += facets([[b.x0 - 4, 236], [b.x0, 214], [30, 196], [90, 190], [150, 186], [b.x1 + 6, 168], [b.x1 + 6, b.y1], [b.x0 - 4, b.y1]], '#2C6A55', leafL, { size: 24, relief: 0.5, seed: 35, base2: '#123228' });
    s += `<path d="M${b.x0} 236 L60 220 L130 206 L${b.x1} 190 L${b.x1} 192 L130 209 L60 223 L${b.x0} 239 Z" fill="#9FE0C0" opacity="0.45"/>`;
    s += dew(14, 186, 9) + dew(196, 194, 6) + dew(170, 214, 4) + dew(60, 222, 3) + dew(206, 178, 3);
    for (let i = 0; i < 6; i++) { const x = 20 + r() * 180, y = 30 + r() * 100; s += `<circle cx="${n1(x)}" cy="${n1(y)}" r="4" fill="#E8F59A" opacity="0.18"/><circle cx="${n1(x)}" cy="${n1(y)}" r="1.2" fill="#FFFFFF"/>`; }
  } else if (st === 1) {
    s += facetSky(b.x0, b.y0, b.x1, b.y1, ['#1C1236', hsl(h + 300, 34, 26), hsl(h + 330, 34, 44), '#2A3A50', '#121A2C', '#0A0E1C'], 7, 32);
    s += stars(b, 26, 120, 4);
    s += `<ellipse cx="60" cy="60" rx="70" ry="24" fill="${hsl(h + 180, 60, 60)}" opacity="0.12"/><ellipse cx="170" cy="40" rx="50" ry="18" fill="${hsl(h + 260, 60, 66)}" opacity="0.12"/>`;
    const wL: Light = { dir: [0.4, -0.8, 0.4], color: hsl(h + 330, 60, 75), shade: '#080A18' };
    s += facets([[b.x0, 150], [b.x1, 150], [b.x1, b.y1], [b.x0, b.y1]], '#1E2A44', wL, { size: 28, relief: 0.3, seed: 40, base2: '#0E1424' });
    for (let i = 0; i < 12; i++) { const y = 154 + i * 5, x = r() * 200; s += `<path d="M${n1(x)} ${n1(y)} h${n1(10 + r() * 26)} l-3 1 h-8 z" fill="${hsl(h + 330, 60, 75)}" opacity="${n1(0.15 + r() * 0.25)}"/>`; }
    // Roseaux et massettes.
    const reedL: Light = { dir: [0.4, -0.6, 0.5], color: hsl(h + 330, 50, 60), shade: '#05060E' };
    for (let i = 0; i < 18; i++) {
      const x = i < 9 ? b.x0 + r() * 64 : b.x1 - r() * 54, y = 162 + r() * 8, hh = 40 + r() * 60, lean = (r() - 0.5) * 14;
      s += `<path d="M${n1(x - 1.6)} ${n1(y)} L${n1(x + lean)} ${n1(y - hh)} L${n1(x + 1.6)} ${n1(y)} Z" fill="#1A2230"/><path d="M${n1(x)} ${n1(y)} L${n1(x + lean)} ${n1(y - hh)} L${n1(x + 1.6)} ${n1(y)} Z" fill="${hsl(h + 330, 30, 30)}" opacity="0.6"/>`;
      if (i % 3 === 0) s += `<ellipse cx="${n1(x + lean * 0.9)}" cy="${n1(y - hh * 0.86)}" rx="2" ry="5.5" fill="#4A2E2A"/><ellipse cx="${n1(x + lean * 0.9 - 0.6)}" cy="${n1(y - hh * 0.86 - 1)}" rx="0.8" ry="3.5" fill="#7A4E3A"/>`;
    }
    // Feux follets et libellule.
    for (let i = 0; i < 6; i++) { const x = 20 + r() * 180, y = 80 + r() * 70; s += `<circle cx="${n1(x)}" cy="${n1(y)}" r="5" fill="${hsl(h + 180, 90, 70)}" opacity="0.18"/>` + gem(x, y, 2, '#FFFFFF', hsl(h + 180, 90, 70)); }
    s += `<g transform="translate(176 76) rotate(70)"><path d="M0 0 L16 -4 L18 0 L16 3 Z" fill="${CRYSTAL}" opacity="0.5"/><path d="M0 0 L-16 -4 L-18 0 L-16 3 Z" fill="${CRYSTAL}" opacity="0.5"/><path d="M0 2 L14 6 L12 9 Z" fill="${CRYSTAL}" opacity="0.4"/><path d="M0 2 L-14 6 L-12 9 Z" fill="${CRYSTAL}" opacity="0.4"/><path d="M-1 -3 L1 -3 L0.6 22 L-0.6 22 Z" fill="${hsl(h + 180, 60, 50)}"/></g>`;
    // Rocher moussu en pente (même pente que l'escargot).
    const y0 = 205 - 116 * 0.176, y1 = 205 + 106 * 0.176;
    const rockL: Light = { dir: [0.3, -0.8, 0.5], color: '#C8A8C8', shade: '#08060E' };
    s += facets([[b.x0 - 4, y0 - 2], [40, y0 + 4], [120, 206], [b.x1 + 4, y1], [b.x1 + 4, b.y1], [b.x0 - 4, b.y1]], '#3C4448', rockL, { size: 24, relief: 0.6, seed: 45, base2: '#16181E' });
    for (let i = 0; i < 22; i++) { const x = b.x0 + r() * (b.x1 - b.x0), y = 205 + (x - 116) * 0.176 + 2 + r() * 4; s += `<path d="M${n1(x - 3)} ${n1(y + 2)} L${n1(x)} ${n1(y - 2 - r() * 2)} L${n1(x + 3)} ${n1(y + 2)} Z" fill="${['#4F7A4A', '#6A9A5A', '#3A6040'][i % 3]}"/>`; }
  } else {
    s += facetSky(b.x0, b.y0, b.x1, b.y1, ['#0C0A26', '#1A1640', '#241C4C', '#2E2448', '#141026'], 9, 32);
    s += stars(b, 34, 160, 5);
    // Planète à anneaux en haut à droite.
    const pL: Light = { dir: [-0.6, -0.5, 0.6], color: '#FFE6F0', shade: '#1A1030' };
    s += `<circle cx="168" cy="64" r="54" fill="${hsl(h + 30, 50, 70)}" opacity="0.1"/>` + facets(ellipse(168, 64, 40, 40, 20), hsl(h + 30, 30, 52), pL, { size: 12, relief: 0.9, seed: 50 });
    const ring: Pt[] = [];
    for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.2) { const x = Math.cos(a) * 70, y = Math.sin(a) * 12, ro = -0.25; ring.push([168 + x * Math.cos(ro) - y * Math.sin(ro), 64 + x * Math.sin(ro) + y * Math.cos(ro)]); }
    s += `<polyline points="${ring.map((p) => p.map(n1).join(',')).join(' ')}" fill="none" stroke="${hsl(h + 40, 50, 80)}" stroke-width="2.4" opacity="0.6"/>`;
    // Colonnes et arche en ruine (lointaines, puis proches).
    const colL: Light = { dir: [0.5, -0.5, 0.6], color: '#E8D8F0', shade: '#0A081A' };
    const column = (x: number, top: number, bot: number, w: number, col: string, seed: number) =>
      facets([[x - w, bot], [x - w, top + 3], [x - w * 0.5, top - 2], [x + w * 0.2, top + 2], [x + w, top - 1], [x + w, bot]], col, colL, { size: Math.max(6, w), relief: 0.4, seed })
      + facets([[x - w * 1.3, bot], [x + w * 1.3, bot], [x + w * 1.3, bot - 5], [x - w * 1.3, bot - 5]], col, colL, { size: 6, relief: 0.2, seed: seed + 1 });
    s += column(30, 70, 170, 6, '#4A4472', 51) + column(80, 110, 170, 5, '#4A4472', 53) + column(200, 96, 170, 6, '#4A4472', 55);
    s += facets([[50, 170], [50, 120], [62, 100], [76, 94], [90, 100], [102, 120], [102, 170], [96, 170], [96, 122], [86, 106], [76, 102], [66, 106], [56, 122], [56, 170]], '#3E3A66', colL, { size: 8, relief: 0.3, seed: 57 });
    s += column(b.x0 + 8, 40, 206, 11, '#6A6294', 58) + column(b.x1 - 8, 120, 206, 10, '#6A6294', 60);
    // Dallage et incrustations d'or en constellation.
    s += facets([[b.x0, 186], [b.x1, 186], [b.x1, b.y1], [b.x0, b.y1]], '#3E3864', { dir: [0.3, -0.8, 0.5], color: '#C8B8E8', shade: '#0A081A' }, { size: 28, relief: 0.3, seed: 62, base2: '#141026' });
    s += constel([[30, 222], [60, 214], [94, 226], [140, 218], [180, 228]]);
    // Lierre lumineux sur la colonne de gauche.
    for (let i = 0; i < 8; i++) { const y = 50 + i * 17, x = b.x0 + 8 + Math.sin(i) * 6; s += `<circle cx="${n1(x)}" cy="${n1(y)}" r="4" fill="${hsl(h + 180, 80, 75)}" opacity="0.2"/>` + gem(x, y, 2.2, '#FFFFFF', hsl(h + 180, 80, 70)); }
  }
  return s;
};

export const spirago: Species = Object.assign(draw, { scene });
