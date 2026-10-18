import { eyeA, gild, ink, line, rim, shadow, sparkle, speckles, type Species } from './style.ts';
import { along, band, f, frames, spline, tube, type Pt } from './legendkit.ts';

/**
 * Abyssquid : calmar géant des abysses du ciel, manteau dressé en diagonale, qui enlace de ses bras un trou noir
 * et son disque d'accrétion. Certains bras passent derrière l'horizon des événements, d'autres devant.
 */
export const abyssquid: Species = (c) => {
  const { pal } = c;
  const id = `abyssquid-${c.stage}`;
  const BH: Pt = [113, 166];

  // Bras : ligne médiane, largeur à la base, devant/derrière le trou noir, massue (tentacule).
  type Arm = { pts: Pt[]; w: number; front: boolean; club?: boolean };
  const arms: Arm[] = [
    { pts: [[94, 120], [64, 118], [42, 128], [30, 146], [32, 162], [40, 166]], w: 5, front: false },
    { pts: [[108, 118], [142, 114], [168, 124], [184, 140], [186, 158], [180, 164]], w: 5, front: false },
    { pts: [[98, 121], [76, 126], [60, 142], [58, 160], [66, 174]], w: 5.4, front: false },
    { pts: [[106, 121], [132, 126], [150, 142], [156, 160], [150, 174]], w: 5.4, front: false },
    { pts: [[106, 119], [146, 104], [180, 92], [202, 70], [200, 48], [190, 40]], w: 2.8, front: false, club: true },
    { pts: [[96, 124], [80, 136], [74, 154], [78, 172], [88, 184], [98, 186]], w: 5.8, front: true },
    { pts: [[107, 124], [124, 134], [136, 150], [140, 168], [134, 184], [124, 190]], w: 5.8, front: true },
    { pts: [[99, 125], [62, 150], [42, 184], [58, 214], [106, 226], [156, 216], [184, 198], [196, 176]], w: 3, front: true, club: true },
  ];
  const drawArm = (a: Arm) => {
    const path = spline(a.pts, 9);
    const w = a.club
      ? (u: number) => (u < 0.82 ? a.w - u * 1.2 : a.w - 1 + Math.sin(((u - 0.82) / 0.18) * Math.PI) * 3.4)
      : (u: number) => a.w * Math.pow(1 - u, 0.8) + 0.5;
    let o = ink(tube(path, w), a.front ? pal.body : pal.shade, a.front ? 1.3 : 1.1);
    o += shadow(band(path, w, -1, -0.15), pal.deep, a.front ? 0.55 : 0.8, a.front ? 'fine' : 'xhatch');
    if (a.front) o += rim(`M${frames(path).filter((_, i) => i % 2 === 0).map(({ p, n, u }) => `${f(p[0] + n[0] * w(u) * 0.7)} ${f(p[1] + n[1] * w(u) * 0.7)}`).join(' L')}`, pal.light, 0.7);
    // Ventouses le long de la face inférieure.
    const fr = frames(path);
    const k0 = a.club ? Math.round(fr.length * 0.82) : 3;
    for (let i = k0; i < fr.length - 3; i += a.club ? 2 : 4) {
      const { p, n, u } = fr[i];
      const r = Math.max(0.6, w(u) * 0.28);
      o += `<circle cx="${f(p[0] - n[0] * w(u) * 0.55)}" cy="${f(p[1] - n[1] * w(u) * 0.55)}" r="${f(r)}" fill="${pal.belly}" stroke="${pal.ink}" stroke-width="0.5" opacity="${a.front ? 0.9 : 0.6}"/>`;
    }
    // Photophores (points de lumière).
    for (let i = 6; i < fr.length - 4; i += 9) {
      const { p, n, u } = fr[i];
      o += `<circle cx="${f(p[0] + n[0] * w(u) * 0.2)}" cy="${f(p[1] + n[1] * w(u) * 0.2)}" r="0.9" fill="${pal.glow}"/>`;
    }
    return o;
  };

  // Disque d'accrétion : moitié arrière / avant via deux découpes.
  const disk = (half: 'back' | 'front') => {
    let o = `<g clip-path="url(#${id}-${half})"><g transform="rotate(-9 ${BH[0]} ${BH[1]})">`;
    o += `<ellipse cx="${BH[0]}" cy="${BH[1]}" rx="80" ry="17" fill="none" stroke="${pal.accent2}" stroke-width="9" opacity="0.45" filter="url(#soft)"/>`;
    o += `<ellipse cx="${BH[0]}" cy="${BH[1]}" rx="56" ry="12" fill="none" stroke="${pal.glow}" stroke-width="10" opacity="0.55" filter="url(#soft)"/>`;
    for (const [rx, col, w, op] of [[82, pal.accent2, 0.6, 0.6], [74, pal.light, 0.8, 0.7], [64, pal.glow, 1.2, 0.85], [54, '#FFF6D8', 1.6, 0.9], [44, '#FFF6D8', 2.2, 1], [36, pal.gold, 1, 0.9]] as [number, string, number, number][]) {
      o += `<ellipse cx="${BH[0]}" cy="${BH[1]}" rx="${rx}" ry="${f(rx * 0.21)}" fill="none" stroke="${col}" stroke-width="${w}" opacity="${op}"/>`;
    }
    o += `</g></g>`;
    return o;
  };

  // Calmar : manteau + tête dans un repère local (origine à la jonction manteau/tête), incliné.
  let sq = '';
  const mantle = 'M-15 2 C-19 -24 -16 -52 -10 -72 C-7 -82 -3 -90 0 -98 C3 -90 7 -82 10 -72 C16 -52 19 -24 15 2 C6 5 -6 5 -15 2 Z';
  for (const sg of [-1, 1]) {
    const fin = `M${sg * 9} -50 C${sg * 24} -56 ${sg * 36} -68 ${sg * 40} -80 C${sg * 30} -88 ${sg * 14} -94 ${sg * 2} -97 Z`;
    sq += ink(fin, sg < 0 ? pal.light : pal.shade, 1.3);
    if (sg < 0) sq += shadow(`M-9 -50 C-24 -56 -36 -68 -40 -80 C-30 -72 -20 -62 -8 -58 Z`, pal.shade, 0.6, 'fine');
    for (let k = 1; k < 6; k++) sq += line(`M${sg * (4 + k)} ${-60 - k * 6.5} L${sg * (12 + k * 5)} ${-62 - k * 4}`, 0.5, pal.ink, ' opacity="0.45"');
  }
  sq += ink(mantle, pal.body, 1.7);
  sq += shadow('M15 2 C19 -24 16 -52 10 -72 C7 -82 3 -90 0 -98 C6 -80 9 -50 6 -20 C5 -8 3 0 2 4 C8 4 12 3 15 2 Z', pal.shade, 0.9, 'fine');
  sq += shadow('M15 2 C18 -14 18 -30 16 -44 C14 -30 12 -14 8 3 Z', pal.deep, 0.6, 'xhatch');
  // Contours transversaux gravés (volume du manteau).
  for (const [y, hw] of [[-8, 16], [-18, 17], [-28, 17], [-38, 16], [-48, 14.5], [-58, 12.5], [-68, 10.5], [-78, 8]] as const) {
    sq += `<path d="M${-hw} ${y} Q0 ${y + 4} ${hw} ${y}" fill="none" stroke="${pal.ink}" stroke-width="0.45" opacity="0.35"/>`;
  }
  // Chromatophores et filigrane doré (gravure Art nouveau).
  for (const [x, y, r] of [[-8, -20, 1.6], [-4, -34, 1.2], [-10, -44, 1], [-2, -58, 1.3], [-6, -66, 0.9], [-12, -8, 1.1], [3, -12, 1], [-1, -46, 0.8]] as const) {
    sq += `<circle cx="${x}" cy="${y}" r="${r}" fill="${pal.deep}" opacity="0.8"/>`;
  }
  sq += gild('M0 -94 C-3 -70 -4 -40 -2 -6', 0.9);
  sq += gild('M-2 -30 c-6 -4 -9 -12 -5 -16 c3 -3 7 0 5 3 M-2 -52 c5 -4 7 -10 3 -13 c-3 -2 -6 1 -4 3', 0.8);
  sq += rim('M-15 2 C-19 -24 -16 -52 -10 -72 C-7 -82 -3 -90 0 -98', pal.glow, 1.2);
  // Tête et yeux globuleux.
  const head = 'M-14 2 C-19 10 -18 22 -12 28 L12 28 C18 22 19 10 14 2 Z';
  sq += ink(head, pal.body, 1.6);
  sq += shadow('M14 2 C19 10 18 22 12 28 L4 28 C10 20 10 10 8 3 Z', pal.shade, 0.85, 'fine');
  for (const sg of [-1, 1]) {
    sq += `<circle cx="${sg * 11}" cy="14" r="7.2" fill="${pal.deep}" stroke="${pal.ink}" stroke-width="1.2"/>`;
    sq += `<circle cx="${sg * 11}" cy="14" r="9" fill="${pal.eye}" opacity="0.25" filter="url(#soft)"/>`;
    sq += eyeA(sg * 11, 14, 6, pal.eye, { angle: sg * -8, slit: false, open: 0.62 });
  }
  sq += line('M-6 6 C-2 9 2 9 6 6', 0.7, pal.ink, ' opacity="0.6"');
  sq += line('M-15 2 C-10 5 -5 3 0 5 C5 3 10 5 15 2', 1, pal.ink, ' opacity="0.7"');
  sq += ink('M-4 26 C-3 30 3 30 4 26 Z', pal.shade, 0.8);
  const squid = `<g transform="translate(102 98) rotate(20) scale(0.9)">${sq}</g>`;

  const rt = `transform="rotate(-9 ${BH[0]} ${BH[1]})"`;
  let s = `<defs><clipPath id="${id}-back"><rect x="-60" y="-100" width="340" height="${BH[1] + 100}" ${rt}/></clipPath>`
    + `<clipPath id="${id}-front"><rect x="-60" y="${BH[1]}" width="340" height="140" ${rt}/></clipPath></defs>`;
  s += `<circle cx="${BH[0]}" cy="${BH[1]}" r="46" fill="${pal.accent2}" opacity="0.25" filter="url(#soft)"/>`;
  s += disk('back');
  for (const a of arms.filter((a) => !a.front)) s += drawArm(a);
  // Trou noir : horizon, anneau de photons, arc lentillé au-dessus.
  s += `<circle cx="${BH[0]}" cy="${BH[1]}" r="20" fill="${pal.glow}" opacity="0.5" filter="url(#soft)"/>`;
  s += `<ellipse cx="${BH[0]}" cy="${BH[1] - 2}" rx="25" ry="23" fill="none" stroke="#FFF6D8" stroke-width="3" opacity="0.5" filter="url(#glow)"/>`;
  s += `<ellipse cx="${BH[0]}" cy="${BH[1] - 2}" rx="25" ry="23" fill="none" stroke="${pal.gold}" stroke-width="0.8"/>`;
  s += `<circle cx="${BH[0]}" cy="${BH[1]}" r="17" fill="#05030A" stroke="#FFF6D8" stroke-width="1.6"/>`;
  s += `<circle cx="${BH[0]}" cy="${BH[1]}" r="17" fill="none" stroke="${pal.ink}" stroke-width="0.6"/>`;
  s += disk('front');
  for (const a of arms.filter((a) => a.front)) s += drawArm(a);
  s += squid;
  // Poussière d'étoiles aspirée et éclats.
  s += speckles(c, BH[0], BH[1], 70, 22, 14, '#FFF6D8');
  const tip = along(spline(arms[4].pts, 9), 1).p;
  s += sparkle(tip[0], tip[1], 3, pal.gold, false);
  for (const [x, y, z] of [[30, 40, 3.4], [48, 92, 2.4], [190, 228, 2.6], [16, 210, 2.2]] as const) s += sparkle(x, y, z, pal.glow, false);
  return s;
};
