import { eyeA, gild, hsl, ink, line, rim, shadow, sparkle, speckles, type Bounds, type DrawCtx, type Species } from './style.ts';
import { along, band, f, frames, grad, smooth, spline, starfish, tube, type Pt } from './legendkit.ts';

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

/**
 * Décor : la fosse abyssale du ciel. Parois de roche stratifiée qui plongent vers le trou noir, neige d'étoiles
 * qui tombe, lueurs de créatures des profondeurs (baudroie, siphonophore) et poissons-lanternes aspirés.
 */
abyssquid.scene = (c: DrawCtx, b: Bounds) => {
  const { pal } = c;
  const id = `abyssquid-${c.stage}-bg`;
  const ah = c.hue * 0.15 + 255 * 0.85;
  const W = b.x1 - b.x0, H = b.y1 - b.y0;
  let s = `<defs>${grad(`${id}-d`, [[0, hsl(ah - 20, 40, 20)], [0.45, hsl(ah, 45, 10)], [1, hsl(ah + 10, 50, 5)]])}</defs>`;
  s += `<rect x="${b.x0}" y="${b.y0}" width="${W}" height="${H}" fill="url(#${id}-d)"/>`;
  // Lueur du disque d'accrétion qui remonte la fosse.
  s += `<ellipse cx="113" cy="170" rx="80" ry="44" fill="${pal.accent2}" opacity="0.12" filter="url(#soft)"/>`;
  s += `<ellipse cx="113" cy="166" rx="60" ry="26" fill="${pal.glow}" opacity="0.14" filter="url(#soft)"/>`;
  // Blocs de basalte arrachés et aspirés : polygones à facettes, face éclairée tournée vers le disque.
  const rock = (cx: number, cy: number, r: number, far: boolean) => {
    const n = 7, pts: Pt[] = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + c.r() * 0.4, rr = r * (0.7 + c.r() * 0.45);
      pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.8]);
    }
    const d = `M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join(' L')} Z`;
    const ang = Math.atan2(166 - cy, 113 - cx);
    const lit = pts.filter(([x, y]) => Math.cos(Math.atan2(y - cy, x - cx) - ang) > 0.1);
    const col = far ? hsl(ah - 10, 18, 26) : hsl(ah + 10, 25, 12);
    let o = `<path d="${d}" fill="${col}" stroke="#140F24" stroke-width="${far ? 0.5 : 0.9}" stroke-linejoin="round"/>`;
    if (lit.length > 1) o += `<path d="M${f(cx)} ${f(cy)} L${lit.map(([x, y]) => `${f(x)} ${f(y)}`).join(' L')} Z" fill="${pal.accent2}" opacity="${far ? 0.25 : 0.35}"/>`;
    o += `<path d="M${f(cx)} ${f(cy)} L${pts.filter((p) => !lit.includes(p)).map(([x, y]) => `${f(x)} ${f(y)}`).join(' L')} Z" fill="url(#xhatch)" opacity="${far ? 0.4 : 0.8}"/>`;
    o += `<path d="M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join(' L')} Z" fill="none" stroke="#140F24" stroke-width="${far ? 0.4 : 0.7}"/>`;
    for (const [x, y] of lit.slice(0, 3)) o += `<path d="M${f(cx)} ${f(cy)} L${f(x)} ${f(y)}" stroke="#140F24" stroke-width="0.4" opacity="0.6"/>`;
    return o;
  };
  // Lointaine crête de la fosse, en silhouette pâle.
  s += `<path d="M${b.x0} ${b.y1} L${b.x0} 196 L18 186 L30 192 L44 178 L58 190 L70 184 L80 196 L150 198 L160 184 L174 190 L188 176 L200 186 L212 180 L${b.x1} 188 L${b.x1} ${b.y1} Z" fill="${hsl(ah - 10, 20, 20)}" stroke="#140F24" stroke-width="0.5" opacity="0.85"/>`;
  s += `<path d="M${b.x0} ${b.y1} L${b.x0} 196 L18 186 L30 192 L44 178 L58 190 L70 184 L80 196 L150 198 L160 184 L174 190 L188 176 L200 186 L212 180 L${b.x1} 188 L${b.x1} ${b.y1} Z" fill="url(#fine)" opacity="0.5"/>`;
  for (const [x, y, r] of [[26, 44, 11], [192, 128, 9], [16, 122, 7], [206, 22, 8], [62, 18, 5], [150, 30, 4]] as const) s += rock(x, y, r, true);
  // Traînée de débris étirée qui spirale vers le disque (spaghettification).
  s += `<path d="M34 48 C60 70 40 120 70 150 C84 162 100 166 112 166" fill="none" stroke="${pal.light}" stroke-width="2.4" opacity="0.18" filter="url(#glow)"/>`;
  for (let i = 0; i < 16; i++) {
    const t = i / 15, x = 34 + t * 78 - Math.sin(t * Math.PI) * 20, y = 48 + t * 118;
    s += `<rect x="${f(x)}" y="${f(y)}" width="${f(2.2 - t * 1.4)}" height="${f(1.6 - t)}" fill="${hsl(ah, 20, 50)}" stroke="#140F24" stroke-width="0.3" transform="rotate(${f(t * 140)} ${f(x)} ${f(y)})"/>`;
  }
  // Neige d'étoiles qui tombe vers le trou noir.
  for (let i = 0; i < 46; i++) {
    const x = b.x0 + 30 + c.r() * (W - 60), y = b.y0 + c.r() * H, l = 1 + c.r() * 3;
    s += `<path d="M${f(x)} ${f(y)} l${f((113 - x) * 0.02)} ${f(l)}" stroke="#FFF6D8" stroke-width="${f(0.5 + c.r() * 0.6)}" stroke-linecap="round" opacity="${f(0.25 + c.r() * 0.5)}"/>`;
  }
  // Siphonophore lointain (chapelet lumineux) et poissons-lanternes.
  let sp = 'M180 20';
  for (let i = 0; i < 8; i++) sp += ` q${i % 2 ? 4 : -4} 6 0 12`;
  s += `<path d="${sp}" fill="none" stroke="${pal.accent}" stroke-width="0.7" opacity="0.5"/>`;
  for (let i = 0; i < 8; i++) s += `<circle cx="180" cy="${20 + i * 12}" r="${f(1.8 - i * 0.15)}" fill="${pal.glow}" opacity="0.55"/>`;
  for (const [x, y, sc, a] of [[40, 70, 0.7, 30], [52, 82, 0.55, 40], [30, 92, 0.6, 20], [186, 202, 0.7, 200], [196, 214, 0.55, 210]] as const) {
    s += starfish(x, y, sc, a, hsl(ah, 25, 40), pal.glow);
  }
  // Baudroie des abysses, tapie contre la paroi gauche (seul son leurre brille vraiment).
  s += `<g transform="translate(74 222) scale(0.8)"><path d="M-14 0 C-12 -10 4 -12 12 -4 L20 -9 L18 0 L20 9 L12 4 C4 12 -12 10 -14 0 Z" fill="${hsl(ah + 10, 25, 14)}" stroke="#140F24" stroke-width="0.7"/>`
    + `<path d="M-14 -1 l3 2 l2 -2 l2 2 l2 -2" fill="none" stroke="#FFF6D8" stroke-width="0.5" opacity="0.7"/>`
    + `<path d="M-6 -9 C-6 -18 -14 -22 -20 -18" fill="none" stroke="#140F24" stroke-width="0.8"/>`
    + `<circle cx="-20" cy="-18" r="5" fill="${pal.glow}" opacity="0.5" filter="url(#soft)"/><circle cx="-20" cy="-18" r="1.6" fill="#FFF6D8"/>`
    + `<circle cx="-7" cy="-4" r="1.1" fill="${pal.eye}"/></g>`;
  // Avant-plan : gros blocs sombres en coin (cadrage).
  s += rock(b.x0 + 8, 228, 22, false) + rock(b.x1 - 6, 70, 14, false) + rock(b.x1 - 14, 226, 16, false);
  return s;
};
