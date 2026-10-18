import { bloom, gloss, hsl, sparkle, speckles, type Bounds, type DrawCtx, type Species } from './style.ts';
import { along, band, f, frames, grad, lum, P, soften, starfish, tube, type Pt } from './legendkit.ts';

/**
 * Koiluna : deux carpes koï célestes, l'une d'ivoire, l'autre d'encre et d'or, qui tournent sans fin autour d'une
 * lune gravée (composition en yin-yang). Carpes de profil, dos vers l'extérieur, ventre éclairé par la lune.
 */
const CX = 111, CY = 112;

function koi(c: DrawCtx, tag: string, base: string, patch: string, patch2: string, dark: boolean): string {
  const { pal } = c;
  const id = `koiluna-${c.stage}-${tag}`;
  const { ink, body: vbody, line, shadow, rim, gild, eyeA } = lum(`${id}-l`, c, [0.5, 0.5], '#FFF6D8');
  // Ligne médiane : arc autour de la lune, légère ondulation.
  const spine: Pt[] = [];
  for (let i = 0; i <= 60; i++) {
    const u = i / 60, a = ((166 + 138 * u) * Math.PI) / 180, R = 64 + Math.sin(u * Math.PI * 1.4) * 5;
    spine.push([CX + Math.cos(a) * R, CY + Math.sin(a) * R]);
  }
  // Côté extérieur (dos) = -normale ici ; on travaille en « dos » (wd) et « ventre » (wv).
  const prof = (u: number) => (u < 0.1 ? 6 + Math.sqrt(u / 0.1) * 10 : u < 0.34 ? 16 + ((u - 0.1) / 0.24) * 2.5 : 18.5 - Math.pow((u - 0.34) / 0.52, 1.25) * 14.5);
  const wd = (u: number) => prof(u) * 1.05, wv = (u: number) => prof(u) * 0.9;
  const fr = frames(spine);
  const out = (u: number, k: number): Pt => { const { p, n } = along(spine, u); return [p[0] - n[0] * k, p[1] - n[1] * k]; };
  const tan = (u: number) => along(spine, u).t;

  let o = '';
  // Nageoire caudale voilée : deux lobes ondulants.
  const tb = 0.86, [bx, by] = out(tb, 0), [tx, ty] = tan(tb);
  const nX = (k: number): Pt => { const { n } = along(spine, tb); return [-n[0] * k, -n[1] * k]; };
  for (const sg of [1, -1]) {
    const q = (a: number, b: number): Pt => [bx + tx * a + nX(b * sg)[0], by + ty * a + nX(b * sg)[1]];
    const d = `M${P(q(-2, 3))} C${P(q(10, 10))} ${P(q(20, 30))} ${P(q(36, 38))} C${P(q(44, 42))} ${P(q(52, 40))} ${P(q(56, 34))} C${P(q(48, 32))} ${P(q(44, 26))} ${P(q(46, 18))} C${P(q(47, 12))} ${P(q(42, 8))} ${P(q(36, 7))} C${P(q(30, 5))} ${P(q(26, 1))} ${P(q(22, 0))} C${P(q(14, 0))} ${P(q(6, 0))} ${P(q(-2, 0))} Z`;
    o += `<path d="${d}" fill="${dark ? pal.deep : base}" opacity="0.92"/>`;
    o += `<path d="${d}" fill="${patch}" opacity="${dark ? 0.25 : 0.35}"/>`;
    for (let k = 1; k < 6; k++) {
      const e = q(30 + k * 4, 6 + k * 6);
      o += `<path d="M${P(q(0, 1 + k * 0.4))} Q${P(q(20, 3 + k * 3))} ${P(e)}" fill="none" stroke="${dark ? pal.gold : pal.shade}" stroke-width="0.5" opacity="0.6"/>`;
    }
    o += `<path d="${d}" fill="none" stroke="${pal.ink}" stroke-width="1"/>`;
  }
  // Nageoires pectorales longues (côté ventre, sous la tête) et pelviennes.
  for (const [u, len, wid] of [[0.17, 26, 9], [0.46, 13, 5], [0.66, 10, 4]] as [number, number, number][]) {
    const b0 = out(u, -wv(u) * 0.7), t0 = tan(u), { n } = along(spine, u);
    const tip: Pt = [b0[0] + t0[0] * len * 0.85 + n[0] * len * 0.55, b0[1] + t0[1] * len * 0.85 + n[1] * len * 0.55];
    const d = `M${P(b0)} C${P([b0[0] + n[0] * wid, b0[1] + n[1] * wid])} ${P([tip[0] - t0[0] * 6, tip[1] - t0[1] * 6])} ${P(tip)} C${P([tip[0] - t0[0] * 4 - n[0] * 4, tip[1] - t0[1] * 4 - n[1] * 4])} ${P([b0[0] + t0[0] * wid, b0[1] + t0[1] * wid])} ${P([b0[0] + t0[0] * wid * 1.2, b0[1] + t0[1] * wid * 1.2])} Z`;
    o += ink(d, dark ? pal.shade : pal.belly, 0.9, ' opacity="0.95"');
    o += line(`M${P(b0)} L${P([tip[0] * 0.8 + b0[0] * 0.2, tip[1] * 0.8 + b0[1] * 0.2])}`, 0.5, dark ? pal.gold : pal.shade, ' opacity="0.6"');
  }
  // Nageoire dorsale (dos) avec rayons.
  {
    const pts: Pt[] = [];
    for (let i = 0; i <= 10; i++) { const u = 0.28 + i * 0.034; pts.push(out(u, wd(u) - 1)); }
    const tips: Pt[] = [];
    for (let i = 0; i <= 10; i++) { const u = 0.29 + i * 0.034; tips.push(out(u + 0.02, wd(u) + 12 - i * 0.8 + Math.sin(i * 1.3) * 1.2)); }
    const d = `M${pts.map(P).join(' L')} L${tips.reverse().map(P).join(' L')} Z`;
    o += ink(d, dark ? pal.deep : base, 0.9);
    o += `<path d="${d}" fill="${patch}" opacity="0.3"/>`;
    for (let i = 0; i <= 10; i += 2) {
      const u = 0.28 + i * 0.034;
      o += line(`M${P(out(u, wd(u)))} L${P(out(u + 0.03, wd(u) + 10 - i * 0.7))}`, 0.5, dark ? pal.gold : pal.shade, ' opacity="0.7"');
    }
  }
  // Corps.
  const bodyPts = spine.filter((_, i) => i <= Math.round(tb * 60));
  const body = tube(bodyPts, (u) => -0 + wv(u * tb), (u) => wd(u * tb));
  o += `<defs><clipPath id="${id}"><path d="${body}"/></clipPath></defs>`;
  let inner = vbody(body, base, { light: [0.5, 0.5], hi: dark ? pal.shade : '#FFFFFF', lo: dark ? '#05030C' : pal.shade, rim: dark ? pal.glow : '#FFF6D8', ao: 0.7 });
  // Motifs de koï (taches), clippés au corps.
  for (const [u, k, rx, ry, col] of [[0.07, 4, 10, 7, patch], [0.3, 6, 16, 11, patch], [0.5, -4, 11, 9, patch2], [0.62, 7, 9, 6, patch], [0.43, 12, 6, 5, patch2]] as [number, number, number, number, string][]) {
    const [x, y] = out(u, k), t0 = tan(u);
    inner += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${rx}" ry="${ry}" fill="${col}" opacity="0.8" transform="rotate(${f((Math.atan2(t0[1], t0[0]) * 180) / Math.PI)} ${f(x)} ${f(y)})"/>`;
  }
  // Ombre du dos (extérieur, loin de la lune) et lumière lunaire au ventre.
  inner += shadow(band(bodyPts, (u) => wd(u * tb), -1.05, -0.35), dark ? '#000' : pal.shade, dark ? 0.45 : 0.45, 'fine');
  inner += `<path d="${band(bodyPts, (u) => wv(u * tb), 1.05, 0.6)}" fill="#FFF6D8" opacity="${dark ? 0.18 : 0.3}"/>`;
  // Écailles : arcs ouverts vers la tête, en rangs décalés.
  for (let i = 0; i < 18; i++) {
    const u = 0.17 + i * 0.037;
    for (let j = -2; j <= 2; j++) {
      const k = (j + (i % 2) * 0.5) * prof(u) * 0.36;
      if (Math.abs(k) > prof(u) * 0.8) continue;
      const [x, y] = out(u, k), t0 = tan(u), { n } = along(spine, u), r = Math.max(1.6, prof(u) * 0.2);
      inner += `<path d="M${f(x - n[0] * r)} ${f(y - n[1] * r)} Q${f(x + t0[0] * r * 1.4)} ${f(y + t0[1] * r * 1.4)} ${f(x + n[0] * r)} ${f(y + n[1] * r)}" fill="none" stroke="${dark ? pal.gold : pal.ink}" stroke-width="0.45" opacity="${dark ? 0.55 : 0.4}"/>`;
    }
  }
  // Ligne latérale.
  inner += `<path d="M${bodyPts.filter((_, i) => i > 8 && i % 3 === 0).map(({ 0: x, 1: y }, i) => { const u = (9 + i * 3) / 60; const [a, b] = out(u, 1); return `${f(a)} ${f(b)}`; }).join(' L')}" fill="none" stroke="${dark ? pal.light : pal.shade}" stroke-width="0.5" stroke-dasharray="1.5 2" opacity="0.6"/>`;
  if (dark) inner += speckles(c, ...out(0.45, 0), 30, 12, 10);
  o += `<g clip-path="url(#${id})">${inner}</g>`;
  for (const u of [0.2, 0.32, 0.44]) { const [gx, gy] = out(u, wd(u) * 0.45), t0 = tan(u); o += gloss(gx, gy, 6, 1.6, (Math.atan2(t0[1], t0[0]) * 180) / Math.PI, dark ? 0.3 : 0.55); }
  o += `<path d="${body}" fill="none" stroke="${pal.ink}" stroke-width="1.6" stroke-linejoin="round"/>`;
  // Lumière de lune sur le ventre.
  o += rim(`M${fr.filter(({ u }) => u > 0.05 && u < 0.75).filter((_, i) => i % 2 === 0).map(({ u }) => P(out(u, -wv(u) + 1))).join(' L')}`, '#FFF6D8', 1);
  // Tête : opercule, œil, bouche et barbillons.
  const g0 = out(0.13, wd(0.13) * 0.85), g1 = out(0.14, 0), g2 = out(0.13, -wv(0.13) * 0.85);
  o += line(`M${P(g0)} Q${P(g1)} ${P(g2)}`, 0.9, pal.ink, ' opacity="0.8"');
  const e = out(0.06, 3.5), te = tan(0.06);
  o += `<circle cx="${f(e[0])}" cy="${f(e[1])}" r="3.8" fill="${dark ? pal.shade : pal.belly}" stroke="${pal.ink}" stroke-width="0.6"/>`;
  o += eyeA(e[0], e[1], 3, pal.eye, { angle: (Math.atan2(te[1], te[0]) * 180) / Math.PI + 180, slit: false, open: 0.7 });
  const m = out(0.0, -2), t0 = tan(0), nn = along(spine, 0).n;
  for (const sg of [1, -1.6]) {
    o += line(`M${P(m)} q${f(-t0[0] * 5 + nn[0] * sg * 2)} ${f(-t0[1] * 5 + nn[1] * sg * 2)} ${f(-t0[0] * 6 + nn[0] * sg * 8)} ${f(-t0[1] * 6 + nn[1] * sg * 8)}`, 0.8, dark ? pal.gold : pal.ink);
  }
  o += line(`M${P(out(0.0, 1))} L${P(out(0.02, -3))}`, 0.9);
  // Filet d'or le long du dos (marque céleste).
  o += gild(`M${[0.12, 0.2, 0.28].map((u) => P(out(u, wd(u) * 0.55))).join(' L')}`, 0.8);
  return o;
}

export const koiluna: Species = (c) => {
  const { pal } = c;
  const id = `koiluna-${c.stage}`;
  const { rim, shadow, constellation } = lum(`${id}-l`, c);
  let s = '';
  // Courants célestes : cercles gravés.
  s += `<circle cx="${CX}" cy="${CY}" r="58" fill="${pal.glow}" opacity="0.18" filter="url(#soft)"/>`;
  for (const [r, w, op, dash] of [[100, 0.6, 0.35, '1 4'], [86, 0.5, 0.3, ''], [44, 0.7, 0.5, '2 3']] as [number, number, number, string][]) {
    s += `<circle cx="${CX}" cy="${CY}" r="${r}" fill="none" stroke="${pal.gold}" stroke-width="${w}" opacity="${op}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
  }
  // Lune gravée : mers, cratères, terminateur hachuré.
  const R = 31;
  s += `<defs><clipPath id="${id}-m"><circle cx="${CX}" cy="${CY}" r="${R}"/></clipPath></defs>`;
  let moon = `<circle cx="${CX}" cy="${CY}" r="${R}" fill="#F3EBD3"/>`;
  for (const [x, y, rx, ry] of [[-10, -8, 12, 8], [6, 8, 10, 7], [10, -14, 6, 4], [-14, 12, 6, 5]] as const) {
    moon += `<ellipse cx="${CX + x}" cy="${CY + y}" rx="${rx}" ry="${ry}" fill="${pal.light}" opacity="0.65"/>`;
  }
  for (const [x, y, r] of [[-16, -16, 3.6], [12, 16, 2.6], [-4, 18, 2], [16, -4, 2.2], [-20, 4, 1.6], [2, -22, 1.8]] as const) {
    moon += `<circle cx="${CX + x}" cy="${CY + y}" r="${r}" fill="none" stroke="${pal.ink}" stroke-width="0.5" opacity="0.6"/>`
      + `<path d="M${f(CX + x - r * 0.7)} ${f(CY + y + r * 0.4)} a${r} ${r} 0 0 0 ${f(r * 1.4)} 0" fill="none" stroke="${pal.shade}" stroke-width="0.8" opacity="0.6"/>`;
  }
  moon += shadow(`M${CX + 6} ${CY - R - 1} A${R} ${R} 0 0 1 ${CX + 6} ${CY + R + 1} A${R * 0.62} ${R} 0 0 0 ${CX + 6} ${CY - R - 1} Z`, pal.shade, 0.55, 'fine');
  moon += shadow(`M${CX + 16} ${CY - R} A${R} ${R} 0 0 1 ${CX + 16} ${CY + R} A${R * 0.4} ${R} 0 0 0 ${CX + 16} ${CY - R} Z`, pal.deep, 0.5, 'xhatch');
  s += `<circle cx="${CX}" cy="${CY}" r="${R + 6}" fill="#FFF6D8" opacity="0.35" filter="url(#soft)"/>`;
  s += bloom(CX, CY, 46, '#FFF6D8', 0.35);
  s += `<g clip-path="url(#${id}-m)">${moon}</g>`;
  s += gloss(CX - 12, CY - 14, 9, 5, -35, 0.35);
  s += `<circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="${pal.ink}" stroke-width="1.4"/>`;
  s += `<circle cx="${CX}" cy="${CY}" r="${R + 4}" fill="none" stroke="${pal.gold}" stroke-width="0.8"/>`;
  s += rim(`M${CX - 22} ${CY - 22} A${R} ${R} 0 0 1 ${CX + 4} ${CY - R}`, '#FFFFFF', 1.2);

  // Les deux carpes (la seconde = rotation de 180°).
  s += koi(c, 'a', '#F1E6CE', pal.accent, pal.gold, false);
  s += `<g transform="rotate(180 ${CX} ${CY})">${koi(c, 'b', pal.deep, pal.gold, pal.light, true)}</g>`;

  // Bulles d'étoiles et constellation.
  s += constellation([[22, 30], [34, 22], [46, 28]], pal.gold) + constellation([[176, 200], [190, 192], [202, 200]], pal.gold);
  for (const [x, y, z] of [[196, 30, 3.4], [24, 196, 3], [111, 18, 2.2], [111, 210, 2.2]] as const) s += sparkle(x, y, z, pal.glow, false);
  return soften(s, pal.deep);
};

/**
 * Décor : un bassin céleste vu d'en haut, la nuit. Eau d'encre où se reflètent les étoiles, ondes concentriques,
 * nénuphars et lotus d'or aux coins, alevins-étoiles, et quelques pétales qui dérivent.
 */
koiluna.scene = (c: DrawCtx, b: Bounds) => {
  const { pal } = c;
  const id = `koiluna-${c.stage}-bg`;
  const wh = c.hue * 0.3 + 215 * 0.7;
  const W = b.x1 - b.x0, H = b.y1 - b.y0;
  let s = `<defs><radialGradient id="${id}-w" cx="0.5" cy="0.47" r="0.62">`
    + `<stop offset="0" stop-color="${hsl(wh, 40, 30)}"/><stop offset="0.55" stop-color="${hsl(wh + 10, 45, 15)}"/><stop offset="1" stop-color="${hsl(wh + 20, 45, 7)}"/></radialGradient></defs>`;
  s += `<rect x="${b.x0}" y="${b.y0}" width="${W}" height="${H}" fill="url(#${id}-w)"/>`;
  // Reflets d'étoiles (petits traits tremblés horizontaux) et voie lactée reflétée.
  s += `<path d="M${b.x0} 40 C60 60 160 150 ${b.x1} 200" fill="none" stroke="${pal.accent2}" stroke-width="40" opacity="0.08" filter="url(#soft)"/>`;
  for (let i = 0; i < 44; i++) {
    const x = b.x0 + c.r() * W, y = b.y0 + c.r() * H, l = 1 + c.r() * 3;
    s += `<path d="M${f(x - l)} ${f(y)} h${f(l * 2)}" stroke="#FFF6D8" stroke-width="${f(0.4 + c.r() * 0.6)}" stroke-linecap="round" opacity="${f(0.25 + c.r() * 0.45)}"/>`;
  }
  // Ondes concentriques autour de la ronde des carpes.
  for (const r of [92, 104, 118]) s += `<circle cx="111" cy="112" r="${r}" fill="none" stroke="${pal.light}" stroke-width="0.5" opacity="${f(0.35 - (r - 92) * 0.008)}"/>`;
  // Nénuphars (feuilles fendues, nervures) et lotus.
  const pad = (x: number, y: number, r: number, rot: number) => {
    let o = `<g transform="translate(${x} ${y}) rotate(${rot})">`;
    o += `<path d="M0 0 L${f(r * 0.96)} ${f(-r * 0.26)} A${r} ${r * 0.82} 0 1 1 ${f(r * 0.96)} ${f(r * 0.26)} Z" fill="${hsl(150 * 0.75 + wh * 0.25, 26, 26)}" stroke="#140F24" stroke-width="0.7"/>`;
    o += `<path d="M0 0 L${f(r * 0.96)} ${f(-r * 0.26)} A${r} ${r * 0.82} 0 0 0 ${f(-r)} 0 Z" fill="url(#fine)" opacity="0.5"/>`;
    for (let k = 0; k < 7; k++) { const a = 0.5 + k * 0.78; o += `<path d="M0 0 L${f(Math.cos(a) * r * 0.85)} ${f(Math.sin(a) * r * 0.7)}" stroke="${pal.light}" stroke-width="0.4" opacity="0.35"/>`; }
    return o + `</g>`;
  };
  const lotus = (x: number, y: number, k: number) => {
    let o = `<g transform="translate(${x} ${y}) scale(${k})">`;
    for (let i = 0; i < 8; i++) o += `<path d="M0 0 C-3 -5 -2 -11 0 -13 C2 -11 3 -5 0 0 Z" fill="${i % 2 ? '#F6E8D4' : pal.light}" stroke="#140F24" stroke-width="0.5" transform="rotate(${i * 45})"/>`;
    for (let i = 0; i < 8; i++) o += `<path d="M0 0 C-2 -3 -1.4 -7 0 -8 C1.4 -7 2 -3 0 0 Z" fill="#FFF6D8" stroke="#140F24" stroke-width="0.4" transform="rotate(${i * 45 + 22})"/>`;
    o += `<circle r="2.4" fill="${pal.gold}" stroke="#140F24" stroke-width="0.4"/><circle r="9" fill="${pal.glow}" opacity="0.25" filter="url(#soft)"/>`;
    return o + `</g>`;
  };
  s += pad(b.x0 + 16, b.y0 + 22, 28, 30) + pad(b.x0 + 52, b.y0 + 8, 15, 200) + lotus(b.x0 + 24, b.y0 + 34, 1.1);
  s += pad(b.x1 - 16, b.y1 - 22, 30, 210) + pad(b.x1 - 54, b.y1 - 8, 16, 20) + pad(b.x1 - 8, b.y1 - 62, 12, 140) + lotus(b.x1 - 26, b.y1 - 34, 1.2);
  s += pad(b.x1 - 8, b.y0 + 34, 16, 160) + pad(b.x0 + 8, b.y1 - 40, 18, -20) + lotus(b.x0 + 12, b.y1 - 46, 0.7);
  // Alevins-étoiles et pétales qui dérivent.
  for (const [x, y, a] of [[190, 70, 120], [198, 80, 130], [184, 84, 110], [30, 150, -60], [24, 140, -50]] as const) s += starfish(x, y, 0.55, a, hsl(wh, 30, 66), pal.glow);
  for (const [x, y, a] of [[60, 210, 30], [150, 20, -20], [206, 150, 70]] as const) s += `<path d="M0 0 C-2 -3 -1 -7 0 -8 C1 -7 2 -3 0 0 Z" fill="#F6E8D4" stroke="#140F24" stroke-width="0.4" transform="translate(${x} ${y}) rotate(${a})"/>`;
  return soften(s, pal.deep);
};
