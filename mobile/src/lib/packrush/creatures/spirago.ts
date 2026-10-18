import { aura, constellation, eyeA, gild, ground, line, rim, shadow, sparkle, type Species } from './style.ts';
import { part, spl, tube } from './cervastre.ts';

const f = (v: number) => +v.toFixed(1);
type Pt = [number, number];

/**
 * Spirago → Volutoile → Galactemple : escargot de bestiaire céleste dont la coquille est une galaxie enroulée.
 * Jeune à coquille translucide et peu de tours, puis coquille-galaxie aux stries d'or, enfin coquille-temple
 * (arcature dorée Art nouveau, anneau d'orbite, traîne de poussière d'étoiles).
 */
export const spirago: Species = (c) => {
  const { pal, stage } = c;
  const st = Math.min(stage, 2);
  const id = `spirago-${st}`;
  const cx = 128, cy = 106, R = 74;
  const turns = [2.6, 3.6, 4.6][st];
  const k = 0.6; // rétrécissement d'un tour à l'autre
  const a0 = (128 * Math.PI) / 180; // ouverture en bas à gauche
  const sp = (phi: number, scale = 1): Pt => {
    const r = R * Math.pow(k, phi / (2 * Math.PI)) * scale;
    return [cx + Math.cos(a0 + phi) * r, cy + Math.sin(a0 + phi) * r];
  };
  const arc = (p0: number, p1: number, scale = 1, step = 0.25) => {
    const ps: Pt[] = [];
    for (let p = p0; p <= p1 + 1e-6; p += step) ps.push(sp(p, scale));
    return ps;
  };
  const TAU = Math.PI * 2;

  let g = '';
  if (st >= 2) g += aura(cx, cy, 92, pal.accent2) + aura(60, 120, 50, pal.glow);
  g += ground(118, 205, 92);

  // ---- Traîne de poussière d'étoiles derrière l'escargot ----
  for (let i = 0; i < 10 + st * 6; i++) {
    const x = 150 + c.r() * 66, y = 199 + c.r() * 6;
    g += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(0.5 + c.r() * 1.1)}" fill="${i % 3 ? '#FFF6D8' : pal.glow}" opacity="${f(0.5 + c.r() * 0.5)}"/>`;
  }

  // ---- Tentacules supérieurs (derrière la tête) ----
  const tl = [0.7, 0.86, 1][st];
  const tent = (bx: number, by: number, ex: number, ey: number, bend: number, w: number, far: boolean) => {
    const mx = (bx + ex) / 2 + bend, my = (by + ey) / 2;
    const ps: [number, number, number][] = [[bx, by, w], [mx, my, w * 0.62], [ex, ey, w * 0.42]];
    const d = tube(ps);
    let o = part(`${id}-t${far ? 'f' : 'n'}`, d, far ? pal.shade : pal.body,
      shadow(d, pal.deep, far ? 0.5 : 0.25, 'fine') + line(spl([[bx + 1, by], [mx + 1, my], [ex + 0.5, ey]]), 0.6, '#140F24', ' opacity="0.5"'), 1.2);
    o += `<circle cx="${f(ex)}" cy="${f(ey)}" r="${f(w * 0.9)}" fill="${far ? pal.shade : pal.body}" stroke="#140F24" stroke-width="1.2"/>`;
    o += eyeA(ex - 0.6, ey + 0.2, w * 0.62, pal.eye, { slit: false, open: 0.75, angle: -10 });
    if (st >= 1) o += sparkle(ex - 1, ey - w * 1.7, far ? 1.8 : 2.4, pal.glow, false);
    return o;
  };
  const hx = 52, hy = 134;
  g += tent(hx + 6, hy - 4, hx + 26 * tl, hy - 76 * tl, 10, 4.4, true);

  // ---- Corps (pied) ----
  const B = 'M206 204 C190 198 172 186 156 172 C138 158 112 152 92 158 C84 158 76 150 70 140 C62 128 48 126 40 134 C32 142 30 160 28 178 C26 194 30 203 42 204 Z';
  let bi = '';
  bi += shadow('M20 196 C60 192 120 196 210 198 L210 214 L20 214 Z', pal.deep, 0.75, 'xhatch');
  bi += `<ellipse cx="132" cy="166" rx="54" ry="16" fill="${pal.deep}" opacity="0.55" filter="url(#soft)"/>`;
  bi += shadow('M30 186 C70 180 130 184 210 194 L210 214 L20 214 Z', pal.shade, 0.55, 'fine');
  // Bordure du pied plus claire, granulée.
  bi += `<path d="M26 198 C70 196 140 198 206 203 L206 206 L26 206 Z" fill="${pal.belly}" opacity="0.7"/>`;
  for (let x = 34; x < 200; x += 5 + c.r() * 3) bi += line(`M${f(x)} 197.5 l${f(1 + c.r())} 4`, 0.6, '#140F24', ' opacity="0.5"');
  // Peau réticulée : sillons parallèles au dos et petites cellules.
  for (const o of [6, 12, 18]) bi += line(spl([[40, 150 + o * 0.6], [60, 146 + o], [80, 168 + o * 0.6], [120, 182 + o * 0.3], [170, 192 + o * 0.15]]), 0.7, '#140F24', ' opacity="0.45"');
  for (let i = 0; i < 46; i++) {
    const x = 36 + c.r() * 150, y = 150 + c.r() * 46;
    bi += line(`M${f(x)} ${f(y)} q${f(2 + c.r() * 2)} ${f(-1.5 - c.r())} ${f(4 + c.r() * 2)} 0`, 0.5, '#140F24', ' opacity="0.4"');
  }
  bi += `<path d="M40 136 C48 128 60 130 68 140" fill="none" stroke="${pal.light}" stroke-width="3" opacity="0.5"/>`;
  if (st >= 1) bi += constellation([[46, 170], [58, 162], [70, 176], [84, 180]], st >= 2 ? pal.gold : pal.light);
  g += part(`${id}-b`, B, pal.body, bi, 1.7);
  g += rim('M40 134 C48 126 62 128 70 140 C76 150 84 158 92 158', pal.glow, 1.2);
  // Tentacules inférieurs (courts, vers le sol).
  g += part(`${id}-tl`, tube([[34, 160, 3.4], [24, 166, 2.4], [16, 172, 1.4]]), pal.body, shadow('M10 172 L40 176 L40 190 L10 190 Z', pal.shade, 0.7, 'fine'), 1.2);
  g += line('M30 186 C34 190 40 190 44 188', 0.9, '#140F24', ' opacity="0.7"');
  // Tentacule supérieur de devant.
  g += tent(hx - 2, hy - 2, hx - 24 * tl, hy - 72 * tl, -6, 4.8, false);

  // ---- Coquille ----
  const outer = arc(0, TAU);
  const shellD = spl(outer) + ` L${f(sp(0)[0])} ${f(sp(0)[1])} Z`;
  const shellD2 = spl(outer) + ` Q${f(cx - 46)} ${f(cy + 64)} ${f(sp(0)[0])} ${f(sp(0)[1])} Z`;
  let si = '';
  // Fond galactique.
  si += `<path d="${shellD2}" fill="${pal.deep}"/>`;
  const center = sp(turns * TAU);
  const blobs: [number, string, number][] = [[0.6, pal.accent, 0.55], [2.2, pal.accent2, 0.5], [3.6, pal.glow, 0.4], [5, pal.accent, 0.45], [7, pal.accent2, 0.5], [9, pal.glow, 0.6]];
  for (const [p, col, op] of blobs) {
    if (p > turns * TAU) continue;
    const [x, y] = sp(p, 0.86);
    const rr = R * Math.pow(k, p / TAU) * 0.32;
    si += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rr * 1.4)}" ry="${f(rr)}" fill="${col}" opacity="${f(op * (st === 0 ? 0.6 : 1))}" filter="url(#soft)"/>`;
  }
  si += `<circle cx="${f(center[0])}" cy="${f(center[1])}" r="${f(10 + st * 3)}" fill="#FFF6D8" opacity="0.85" filter="url(#soft)"/>`;
  // Bras spiraux lumineux.
  si += `<path d="${spl(arc(TAU * 0.3, turns * TAU, 0.82))}" fill="none" stroke="${pal.glow}" stroke-width="3" opacity="0.35" filter="url(#soft)"/>`;
  // Étoiles semées le long de la spirale.
  for (let i = 0; i < 40 + st * 30; i++) {
    const p = c.r() * turns * TAU, s2 = 0.72 + c.r() * 0.26;
    const [x, y] = sp(p, s2);
    si += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(0.4 + c.r() * (p < 6 ? 1.2 : 0.7))}" fill="#FFF6D8" opacity="${f(0.5 + c.r() * 0.5)}"/>`;
  }
  // Volume de chaque tour : ombre côté intérieur-bas, hachures fines.
  for (let t = 0; t < turns - 0.2; t += 1) {
    const ps = arc(t * TAU + 0.6, Math.min((t + 1) * TAU, turns * TAU), 1);
    const inner = arc(t * TAU + 0.6, Math.min((t + 1) * TAU, turns * TAU), k * 1.0).reverse();
    const mid = arc(t * TAU + 0.6, Math.min((t + 1) * TAU, turns * TAU), (1 + k) / 2 * 0.86).reverse();
    si += shadow(spl(ps) + ' L' + spl(mid).slice(1) + ' Z', '#000', 0, 'fine');
    si += `<path d="${spl(inner)}" fill="none" stroke="#000" stroke-width="${f(R * Math.pow(k, t) * 0.1)}" opacity="0.22"/>`;
  }
  // Stries de croissance : traits fins en travers des tours.
  for (let p = 0.3; p < turns * TAU - 1; p += st === 0 ? 0.32 : 0.22) {
    const [x1, y1] = sp(p), [x2, y2] = sp(p + TAU);
    const col = st >= 1 && Math.round(p / 0.22) % 4 === 0 ? pal.gold : '#FFF6D8';
    si += `<path d="M${f(x1)} ${f(y1)} Q${f((x1 + x2) / 2 + (cx - (x1 + x2) / 2) * 0.05)} ${f((y1 + y2) / 2)} ${f(x2)} ${f(y2)}" fill="none" stroke="${col}" stroke-width="${col === pal.gold ? 0.8 : 0.45}" opacity="${col === pal.gold ? 0.8 : 0.35}"/>`;
  }
  // Sutures (ligne d'enroulement).
  si += line(spl(arc(TAU, turns * TAU)), 1.3);
  if (st === 0) si += `<path d="${shellD2}" fill="${pal.belly}" opacity="0.28"/>`;
  // Arcature dorée (le « temple ») le long du dernier tour.
  if (st >= 2) {
    for (let p = 0.5; p < TAU - 0.4; p += 0.42) {
      const a = sp(p, 0.96), b = sp(p + 0.42, 0.96), base1 = sp(p, 0.72), base2 = sp(p + 0.42, 0.72);
      const m = sp(p + 0.21, 0.98);
      si += gild(`M${f(base1[0])} ${f(base1[1])} L${f(a[0])} ${f(a[1])} Q${f(m[0])} ${f(m[1])} ${f(b[0])} ${f(b[1])}`, 0.9);
      const k2 = sp(p + 0.21, 0.9);
      si += `<circle cx="${f(k2[0])}" cy="${f(k2[1])}" r="0.9" fill="${pal.gold}"/>`;
      void base2;
    }
    si += gild(spl(arc(0.4, TAU - 0.2, 0.7)), 0.8);
    si += gild(spl(arc(TAU + 0.4, TAU * 2 - 0.2, 0.85)), 0.6);
  }
  // Clair de bord (le halo derrière éclaire le haut de la coquille).
  g += part(`${id}-s`, shellD2, pal.deep, si, 1.9);
  g += rim(spl(arc(1.4, 3.6, 0.985)), pal.glow, 1.4);
  // Lèvre de l'ouverture (péristome) et collerette du manteau.
  const lip0 = sp(0), lip1 = sp(TAU);
  const lipD = `M${f(lip0[0])} ${f(lip0[1])} Q${f(cx - 46)} ${f(cy + 64)} ${f(lip1[0])} ${f(lip1[1])}`;
  g += line(lipD, 1, pal.gold, ' opacity="0.8"');
  g += sparkle(center[0], center[1], 4 + st * 1.5, '#FFF6D8', false);

  // ---- Anneau d'orbite et constellations (stade adulte) ----
  if (st >= 2) {
    const ring = (front: boolean) => {
      const rx = 86, ry = 18, rot = -16, ox = cx + 4, oy = cy + 4;
      const pts: Pt[] = [];
      for (let a = front ? 0 : Math.PI; a <= (front ? Math.PI : TAU) + 1e-6; a += 0.2) {
        const x = Math.cos(a) * rx, y = Math.sin(a) * ry, r = (rot * Math.PI) / 180;
        pts.push([ox + x * Math.cos(r) - y * Math.sin(r), oy + x * Math.sin(r) + y * Math.cos(r)]);
      }
      return line(spl(pts), 2.6, '#140F24', ' opacity="0.6"') + gild(spl(pts), 1.2);
    };
    g = g.replace(`<defs><clipPath id="${id}-s">`, ring(false) + `<defs><clipPath id="${id}-s">`);
    g += ring(true);
    g += `<circle cx="196" cy="78" r="5" fill="${pal.gold}" stroke="#140F24" stroke-width="1.1"/>` + `<path d="M193 76 a4 4 0 0 1 5 -1" fill="none" stroke="#FFF6D8" stroke-width="0.8"/>`;
    g += constellation([[20, 30], [34, 22], [48, 30], [44, 46]], pal.gold) + constellation([[176, 18], [192, 30], [206, 24]], pal.gold);
    g += sparkle(150, 22, 3.4, pal.glow, false) + sparkle(26, 92, 2.6, '#FFF6D8', false);
  } else {
    g += sparkle(30, 40 + st * 6, 2.6, pal.glow, false) + sparkle(196, 50, 2.2, '#FFF6D8', false);
  }
  const S = [0.84, 0.93, 1][st];
  return `<g transform="translate(116 205) scale(${S}) translate(-116 -205)">${g}</g>`;
};
