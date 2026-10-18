import { aura, hsl, sparkle, type Bounds, type DrawCtx, type Species } from './style.ts';
import { bloom, constellation, eyeA, fern, fireflies, gild, gloss, grass, ground, line, noInk, part, rim, setLook, shadow, skyGrad, spl, stars, tube } from './cervastre.ts';

const f = (v: number) => +v.toFixed(1);
type Pt = [number, number];

/**
 * Spirago → Volutoile → Galactemple : escargot de bestiaire céleste dont la coquille est une galaxie enroulée.
 * Jeune à coquille translucide et peu de tours, puis coquille-galaxie aux stries d'or, enfin coquille-temple
 * (arcature dorée Art nouveau, anneau d'orbite, traîne de poussière d'étoiles).
 */
function drawSpir(c: DrawCtx): string {
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
    // Anneaux fins le long du tentacule.
    for (let t = 0.15; t < 0.9; t += 0.11) {
      const x = (1 - t) * (1 - t) * bx + 2 * t * (1 - t) * mx + t * t * ex, y = (1 - t) * (1 - t) * by + 2 * t * (1 - t) * my + t * t * ey;
      const ww = w * (1 - t * 0.55) * 0.8;
      o += line(`M${f(x - ww)} ${f(y + 0.6)} L${f(x + ww)} ${f(y - 0.6)}`, 0.45, '#140F24', ' opacity="0.45"');
    }
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
  // Tête : lèvre frontale, plis du cou, tubercules en relief, collerette du manteau.
  bi += `<path d="M27 190 C25 178 30 168 40 168 C48 170 50 182 44 194 C38 198 30 198 27 190 Z" fill="${pal.belly}" opacity="0.55"/>`;
  bi += line('M30 178 C34 174 40 174 44 178', 0.7, '#140F24', ' opacity="0.55"');
  for (const [x, y, l] of [[58, 138, 26], [66, 146, 26], [74, 154, 22], [48, 136, 18]] as const) bi += line(`M${x} ${y} c${f(-4)} ${f(l * 0.3)} ${f(-4)} ${f(l * 0.7)} 0 ${l}`, 0.7, '#140F24', ' opacity="0.5"');
  for (let i = 0; i < 60; i++) {
    const x = 32 + c.r() * 150, y = 140 + c.r() * 52;
    bi += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(1 + c.r() * 1.2)}" ry="${f(0.7 + c.r() * 0.6)}" fill="${pal.light}" opacity="${f(0.25 + c.r() * 0.3)}"/>`;
  }
  bi += `<path d="M82 160 C102 150 140 152 164 172" fill="none" stroke="${pal.belly}" stroke-width="5" opacity="0.55"/>`;
  bi += `<path d="M82 164 C102 155 140 157 162 176" fill="none" stroke="#140F24" stroke-width="0.7" opacity="0.5"/>`;
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
  // Stade 1 : il gravit la pente d'un rocher moussu (le décor suit la même pente).
  const rot = st === 1 ? ' rotate(10)' : '';
  return `<g transform="translate(116 205)${rot} scale(${S}) translate(-116 -205)">${g}</g>`;
}

export const spirago: Species = (c) => {
  const st = Math.min(c.stage, 2);
  setLook(`spirago-${st}`, c.pal, ['#9FF5D8', '#FF9AD8', '#FFC8E8'][st]);
  return noInk(drawSpir(c));
};

// ---------------------------------------------------------------------------------------------------------------
// Décor : jardin des astres (feuille couverte de rosée la nuit), marais de nébuleuse au crépuscule (rocher moussu),
// ruines célestes sous une planète à anneaux.

/** Goutte de rosée qui reflète une étoile. */
function dew(x: number, y: number, r: number, star = true): string {
  return `<ellipse cx="${f(x)}" cy="${f(y + r * 0.85)}" rx="${f(r * 0.9)}" ry="${f(r * 0.2)}" fill="#000" opacity="0.3"/>`
    + `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="#CFF3EE" opacity="0.28" stroke="#140F24" stroke-width="${f(Math.min(0.9, r * 0.12))}"/>`
    + `<path d="M${f(x - r * 0.7)} ${f(y + r * 0.3)} A${f(r)} ${f(r)} 0 0 0 ${f(x + r * 0.7)} ${f(y + r * 0.3)}" fill="none" stroke="#FFF6D8" stroke-width="${f(r * 0.12)}" opacity="0.5"/>`
    + `<circle cx="${f(x - r * 0.38)}" cy="${f(y - r * 0.4)}" r="${f(r * 0.2)}" fill="#fff" opacity="0.9"/>`
    + (star ? sparkle(x + r * 0.15, y + r * 0.1, r * 0.4, '#FFF6D8', false) : '');
}

function dragonfly(x: number, y: number, s: number, ang: number, col: string): string {
  const w = (dx: number, dy: number, a: number) => `<ellipse cx="${dx}" cy="${dy}" rx="9" ry="2.4" transform="rotate(${a} 0 0)" fill="${col}" fill-opacity="0.25" stroke="#140F24" stroke-width="0.5"/>`;
  return `<g transform="translate(${f(x)} ${f(y)}) rotate(${ang}) scale(${s})">`
    + w(9, -1, -12) + w(9, 1, 14) + w(-9, -1, 12) + w(-9, 1, -14)
    + `<path d="M0 -3 L0 22" stroke="#140F24" stroke-width="1.6" stroke-linecap="round"/><path d="M0 -3 L0 22" stroke="${col}" stroke-width="0.8"/><circle cx="0" cy="-4" r="1.8" fill="#140F24"/></g>`;
}

spirago.scene = (c: DrawCtx, b: Bounds) => noInk(spirScene(c, b), '#05030C');
function spirScene(c: DrawCtx, b: Bounds): string {
  const st = Math.min(c.stage, 2);
  const id = `spirago-${st}-bg`;
  const h = c.hue;
  const W = b.x1 - b.x0;
  let o = '';
  if (st === 0) {
    // Gros plan : la nuit, sur une large feuille perlée de rosée, au jardin des astres.
    o += skyGrad(`${id}-s`, b, [[0, '#0D1A2C'], [0.6, '#123036'], [1, '#0C1E1C']]);
    for (let i = 0; i < 14; i++) {
      const x = b.x0 + c.r() * W, y = 10 + c.r() * 140, r = 6 + c.r() * 14;
      o += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${[hsl(h + 160, 60, 60), '#E8F59A', hsl(h + 220, 60, 70)][i % 3]}" opacity="${f(0.12 + c.r() * 0.15)}"/>`;
    }
    o += stars(c, b, 26, 120);
    // Feuilles d'arrière-plan.
    const leafD = (x: number, y: number, l: number, a: number) => `<g transform="translate(${x} ${y}) rotate(${a})"><path d="M0 0 C${f(l * 0.3)} ${f(-l * 0.28)} ${f(l * 0.75)} ${f(-l * 0.22)} ${l} 0 C${f(l * 0.75)} ${f(l * 0.22)} ${f(l * 0.3)} ${f(l * 0.28)} 0 0 Z" fill="#1E4A40" stroke="#140F24" stroke-width="0.6" opacity="0.8"/><path d="M0 0 L${f(l * 0.95)} 0" stroke="#3E7A66" stroke-width="0.7" opacity="0.8"/></g>`;
    o += leafD(-10, 120, 80, -30) + leafD(150, 60, 90, -20) + leafD(200, 140, 70, -160) + leafD(40, 40, 60, -60);
    // Petite coccinelle d'étoiles sur une feuille du fond.
    o += `<g transform="translate(186 50) rotate(-20)"><ellipse cx="0" cy="0" rx="5" ry="4" fill="#E9C25B" stroke="#140F24" stroke-width="0.8"/><path d="M0 -4 L0 4" stroke="#140F24" stroke-width="0.6"/><circle cx="-2" cy="-1" r="0.9" fill="#140F24"/><circle cx="2" cy="1.4" r="0.9" fill="#140F24"/><circle cx="-6" cy="0" r="2" fill="#140F24"/></g>`;
    // Grande feuille du premier plan (nervures, bord dentelé).
    const leaf = `M${b.x0 - 4} 236 C${b.x0} 210 30 192 90 190 C140 188 190 182 ${b.x1 + 6} 168 L${b.x1 + 6} ${b.y1} L${b.x0 - 4} ${b.y1} Z`;
    o += `<path d="${leaf}" fill="#2C6A55" stroke="#140F24" stroke-width="1"/>`;
    o += `<path d="M${b.x0} 236 C30 222 80 212 130 206 C170 200 200 196 ${b.x1} 190" fill="none" stroke="#7FC0A0" stroke-width="2" opacity="0.7"/>`;
    for (let i = 0; i < 8; i++) { const x = 10 + i * 28; o += `<path d="M${x} ${f(230 - i * 4.4)} q${f(10)} ${f(-14)} ${f(24)} ${f(-22)} M${x} ${f(230 - i * 4.4)} q${f(12)} ${f(4)} ${f(26)} ${f(14)}" fill="none" stroke="#7FC0A0" stroke-width="0.8" opacity="0.45"/>`; }
    o += `<path d="${leaf}" fill="url(#fine)" opacity="0.35"/>`;
    o += `<path d="M30 194 C80 186 150 186 ${b.x1} 170" fill="none" stroke="#BFF0D8" stroke-width="1.2" opacity="0.5"/>`;
    o += dew(14, 186, 9) + dew(196, 194, 6) + dew(170, 212, 4, false) + dew(60, 222, 3, false) + dew(206, 178, 3, false);
    o += fireflies(c, 20, 30, 200, 130, 6, '#E8F59A');
  } else if (st === 1) {
    // Marais de nébuleuse au crépuscule : il gravit un rocher moussu au bord de l'eau.
    o += skyGrad(`${id}-s`, b, [[0, '#1C1236'], [0.4, hsl(h + 300, 40, 30)], [0.62, hsl(h + 330, 34, 44)], [0.7, '#2A3A50']]);
    o += stars(c, b, 34, 120);
    o += `<ellipse cx="60" cy="60" rx="70" ry="26" fill="${hsl(h + 180, 70, 60)}" opacity="0.3" filter="url(#soft)"/><ellipse cx="170" cy="40" rx="50" ry="20" fill="${hsl(h + 260, 70, 66)}" opacity="0.3" filter="url(#soft)"/>`;
    // Eau du marais et ses reflets.
    o += `<rect x="${b.x0}" y="150" width="${W}" height="${b.y1 - 150}" fill="#1E2A44"/>`;
    for (let i = 0; i < 16; i++) { const y = 154 + i * 4, x = c.r() * 200; o += `<path d="M${f(x)} ${f(y)} h${f(10 + c.r() * 30)}" stroke="${hsl(h + 330, 60, 75)}" stroke-width="0.7" opacity="${f(0.15 + c.r() * 0.3)}"/>`; }
    o += `<rect x="${b.x0}" y="146" width="${W}" height="10" fill="${hsl(h + 330, 60, 75)}" opacity="0.3" filter="url(#soft)"/>`;
    // Roseaux et massettes.
    let reeds = '';
    for (let i = 0; i < 26; i++) {
      const x = i < 13 ? b.x0 + c.r() * 60 : b.x1 - c.r() * 50, y = 160 + c.r() * 10, hh = 40 + c.r() * 60, lean = (c.r() - 0.5) * 14;
      reeds += `<path d="M${f(x)} ${f(y)} q${f(lean * 0.3)} ${f(-hh * 0.5)} ${f(lean)} ${f(-hh)}" fill="none" stroke="#1A2230" stroke-width="${f(1 + c.r())}"/>`;
      if (i % 3 === 0) reeds += `<ellipse cx="${f(x + lean)}" cy="${f(y - hh + 6)}" rx="1.8" ry="5" transform="rotate(${f(lean)} ${f(x + lean)} ${f(y - hh + 6)})" fill="#3A2A2A" stroke="#140F24" stroke-width="0.5"/>`;
    }
    o += reeds;
    o += fireflies(c, 20, 80, 200, 160, 7, hsl(h + 180, 90, 70));
    o += dragonfly(178, 78, 0.9, 70, hsl(h + 180, 70, 70));
    // Rocher moussu en pente (même pente que l'escargot).
    const y0 = 205 - 116 * 0.176, y1 = 205 + 106 * 0.176;
    const rock = `M${b.x0 - 4} ${f(y0 - 2)} C40 ${f(y0 + 3)} 160 ${f(y1 - 14)} ${b.x1 + 4} ${f(y1 - 1)} L${b.x1 + 4} ${b.y1} L${b.x0 - 4} ${b.y1} Z`;
    o += `<path d="${rock}" fill="#3C4448" stroke="#140F24" stroke-width="1.1"/><path d="${rock}" fill="url(#fine)" opacity="0.5"/>`;
    o += `<path d="M${b.x0} ${f(y0 + 10)} C60 ${f(y0 + 22)} 150 ${f(y1 + 2)} ${b.x1} ${f(y1 + 14)}" fill="none" stroke="#140F24" stroke-width="0.6" opacity="0.5"/>`;
    for (let i = 0; i < 26; i++) { const x = b.x0 + c.r() * W, y = 205 + (x - 116) * 0.176 + 1 + c.r() * 4; o += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(1.5 + c.r() * 2.5)}" fill="${['#4F7A4A', '#6A9A5A', '#3A6040'][i % 3]}"/>`; }
    o += grass(c, b.x0, 60, y0 + 4, 9, '#6A9A5A', 14);
  } else {
    // Ruines célestes : dalle d'un temple effondré sous une planète à anneaux.
    o += skyGrad(`${id}-s`, b, [[0, '#0C0A26'], [0.55, '#241C4C'], [1, '#2E2448']]);
    o += stars(c, b, 60, 160);
    const px = 168, py = 64;
    o += `<circle cx="${px}" cy="${py}" r="58" fill="${hsl(h + 30, 50, 70)}" opacity="0.25" filter="url(#soft)"/>`;
    o += `<circle cx="${px}" cy="${py}" r="40" fill="${hsl(h + 30, 30, 58)}"/><circle cx="${px}" cy="${py}" r="40" fill="url(#fine)" opacity="0.5"/>`;
    for (const k of [-16, -6, 6, 18]) o += `<path d="M${px - 40} ${py + k} Q${px} ${py + k + 6} ${px + 40} ${py + k}" fill="none" stroke="${hsl(h + 20, 30, 72)}" stroke-width="2" opacity="0.4"/>`;
    o += `<path d="M${px - 40} ${py} A40 40 0 0 0 ${px + 40} ${py}" fill="#140F24" opacity="0.35"/>`;
    o += `<ellipse cx="${px}" cy="${py}" rx="70" ry="12" transform="rotate(-14 ${px} ${py})" fill="none" stroke="${hsl(h + 40, 50, 80)}" stroke-width="3" opacity="0.6"/>`;
    // Colonnes et arche en ruine (lointaines puis proches).
    const col = (x: number, top: number, bot: number, w: number, fill: string, det: number) => {
      let r = `<path d="M${x - w} ${bot} L${x - w} ${top + 3} L${x - w * 0.6} ${top - 2} L${x + w * 0.2} ${top + 2} L${x + w} ${top - 1} L${x + w} ${bot} Z" fill="${fill}" stroke="#140F24" stroke-width="${0.4 + det}" opacity="${0.6 + det * 0.4}"/>`;
      for (let k = -0.5; k <= 0.5; k += 0.25) r += `<path d="M${f(x + k * w * 1.6)} ${top + 4} V${bot}" stroke="#140F24" stroke-width="0.5" opacity="${f(0.2 + det * 0.4)}"/>`;
      r += `<rect x="${x - w * 1.25}" y="${bot - 5}" width="${w * 2.5}" height="5" fill="${fill}" stroke="#140F24" stroke-width="${0.4 + det}"/>`;
      return r;
    };
    o += col(30, 70, 168, 6, '#5A5482', 0) + col(80, 110, 168, 5, '#5A5482', 0) + col(200, 96, 168, 6, '#5A5482', 0);
    o += `<path d="M50 168 L50 120 A26 26 0 0 1 102 120 L102 168 L96 168 L96 122 A20 20 0 0 0 56 122 L56 168 Z" fill="#4A4472" opacity="0.8"/>`;
    o += `<rect x="${b.x0}" y="150" width="${W}" height="30" fill="${hsl(h + 30, 50, 70)}" opacity="0.15" filter="url(#soft)"/>`;
    o += col(b.x0 + 8, 40, 206, 11, '#6E6696', 1) + col(b.x1 - 8, 120, 206, 10, '#6E6696', 1);
    o += gild(`M${b.x0 - 3} 52 h22 M${b.x1 - 18} 132 h20`, 1);
    // Dallage : perspective, incrustations d'or en constellation.
    o += `<path d="M${b.x0} 186 L${b.x1} 186 L${b.x1} ${b.y1} L${b.x0} ${b.y1} Z" fill="#3E3864"/>`;
    o += `<path d="M${b.x0} 186 L${b.x1} 186 L${b.x1} ${b.y1} L${b.x0} ${b.y1} Z" fill="url(#fine)" opacity="0.35"/>`;
    let tiles = '';
    for (const y of [192, 200, 212, 228]) tiles += `M${b.x0} ${y} H${b.x1} `;
    for (let k = -6; k <= 6; k++) tiles += `M${111 + k * 12} 186 L${111 + k * 40} 236 `;
    o += `<path d="${tiles}" stroke="#140F24" stroke-width="0.6" opacity="0.5"/>`;
    o += `<path d="M${b.x0} 186 H${b.x1}" stroke="#9A90C8" stroke-width="1" opacity="0.6"/>`;
    o += constellation([[30, 222], [60, 214], [94, 226], [140, 218], [180, 228]], '#E9C25B');
    // Lierre lumineux sur la colonne de gauche.
    o += `<path d="M${b.x0 + 4} 40 C${b.x0 + 18} 80 ${b.x0 - 2} 120 ${b.x0 + 14} 180" fill="none" stroke="#3E6A50" stroke-width="1.4"/>`;
    for (let i = 0; i < 8; i++) { const y = 50 + i * 17, x = b.x0 + 8 + Math.sin(i) * 6; o += `<circle cx="${f(x)}" cy="${f(y)}" r="2" fill="${hsl(h + 180, 80, 75)}" opacity="0.9"/><circle cx="${f(x)}" cy="${f(y)}" r="4" fill="${hsl(h + 180, 80, 75)}" opacity="0.3" filter="url(#glow)"/>`; }
    for (let i = 0; i < 3; i++) o += `<path d="M${f(40 + i * 60)} ${f(20 + i * 10)} l-18 8" stroke="#FFF6D8" stroke-width="0.8" opacity="0.6"/>`;
  }
  if (b.y1 > 240) o += `<rect x="${b.x0}" y="236" width="${W}" height="${b.y1 - 236}" fill="#0B0A18" opacity="0.5"/>`;
  return o;
}

