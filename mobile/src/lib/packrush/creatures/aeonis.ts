import { constellation, eyeA, fur, gild, hsl, ink, line, rim, shadow, sparkle, speckles, type Bounds, type DrawCtx, type Species } from './style.ts';

type Pt = [number, number];
const f = (v: number) => v.toFixed(1);
const P = (p: Pt) => `${f(p[0])} ${f(p[1])}`;

/** Courbe lisse (Catmull-Rom → Bézier) passant par les points. */
function smooth(pts: Pt[]): string {
  let d = `M${P(pts[0])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    d += ` C${P([p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6])} ${P([p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6])} ${P(p2)}`;
  }
  return d;
}

/** Bras spiral d'une galaxie inclinée (ellipse de centre cx,cy, aplatie par k, tournée de rot degrés). */
function arm(cx: number, cy: number, r0: number, r1: number, t0: number, turns: number, k: number, rot: number): Pt[] {
  const pts: Pt[] = [], cr = Math.cos((rot * Math.PI) / 180), sr = Math.sin((rot * Math.PI) / 180);
  for (let i = 0; i <= 14; i++) {
    const u = i / 14, t = t0 + u * turns * Math.PI * 2, r = r0 + (r1 - r0) * u;
    const x = Math.cos(t) * r, y = Math.sin(t) * r * k;
    pts.push([cx + x * cr - y * sr, cy + x * sr + y * cr]);
  }
  return pts;
}

/**
 * Aeonis : tortue-monde ancestrale (mythique, carte plein cadre). Une immense tortue de mer nage dans le vide en
 * portant un monde : montagnes enneigées, forêts, cascades qui se perdent en poussière d'étoiles, et au sommet un
 * arbre de lumière dont la couronne est une galaxie spirale. Style gravure : écailles au trait, hachures, or.
 */
export const aeonis: Species = (c: DrawCtx) => {
  const { pal } = c;
  const CREAM = '#FFF6D8', INK = '#140F24';
  const id = 'aeonis-4';
  const skin = pal.light, skinShade = pal.body, stone = hsl(c.hue + 190, 14, 60);
  let s = '<g transform="translate(-12 4)">';

  // ---------- Couronne-galaxie de l'arbre (derrière tout) ----------
  const GX = 112, GY = -4;
  s += `<ellipse cx="${GX}" cy="${GY}" rx="96" ry="40" fill="${pal.glow}" opacity="0.22" filter="url(#soft)"/>`;
  s += `<ellipse cx="${GX}" cy="${GY}" rx="60" ry="22" fill="${pal.accent2}" opacity="0.28" filter="url(#soft)" transform="rotate(-8 ${GX} ${GY})"/>`;
  s += `<ellipse cx="${GX}" cy="${GY}" rx="88" ry="30" fill="none" stroke="${pal.gold}" stroke-width="0.6" stroke-dasharray="1 3" opacity="0.6" transform="rotate(-8 ${GX} ${GY})"/>`;
  for (let a = 0; a < 3; a++) {
    const pts = arm(GX, GY, 6, 84, (a * 2 * Math.PI) / 3, 0.85, 0.36, -8);
    s += line(smooth(pts), 7, pal.glow, ' opacity="0.22"');
    s += line(smooth(pts), 2.2, CREAM, ' opacity="0.55"');
    s += line(smooth(pts), 0.8, pal.gold);
    for (let i = 2; i < pts.length; i++) {
      const [x, y] = pts[i];
      s += `<circle cx="${f(x + (c.r() - 0.5) * 8)}" cy="${f(y + (c.r() - 0.5) * 5)}" r="${f(0.6 + c.r() * 1.3)}" fill="${CREAM}" opacity="${f(0.6 + c.r() * 0.4)}"/>`;
      if (i % 4 === 0) s += sparkle(x, y, 2 + c.r() * 1.5, CREAM, false);
    }
  }
  s += `<circle cx="${GX}" cy="${GY}" r="14" fill="${CREAM}" opacity="0.8" filter="url(#soft)"/>`;
  s += `<ellipse cx="${GX}" cy="${GY}" rx="8" ry="4.5" fill="${CREAM}" transform="rotate(-8 ${GX} ${GY})"/>`;

  // ---------- Nageoire antérieure lointaine (relevée) ----------
  const farFlip = 'M178 150 C186 132 198 112 214 94 C220 88 226 90 224 98 C214 118 200 140 190 160 Z';
  s += ink(farFlip, skinShade, 1.2) + shadow(farFlip, INK, 0.45, 'xhatch');
  s += line('M190 130 l8 4 M198 118 l8 4 M206 106 l7 4', 0.7, INK, ' opacity="0.6"');

  // ---------- Nageoire postérieure + queue ----------
  const rear = 'M46 170 C34 180 18 190 2 194 C-4 196 -4 190 2 187 C16 180 28 172 36 162 Z';
  s += ink(rear, skin, 1.3) + shadow('M46 170 C34 180 18 190 2 194 C-4 196 -4 190 -1 189 C14 186 30 178 42 166 Z', skinShade, 0.7, 'fine');
  s += line('M30 176 l-3 -5 M20 182 l-3 -5 M12 186 l-2 -4', 0.7);
  s += ink('M30 168 L12 172 L28 176 Z', skin, 1);

  // ---------- Cou et tête (vieille tortue de mer, bec crochu) ----------
  const neck = 'M168 146 C180 140 188 138 194 140 C198 150 198 162 194 168 C186 172 178 174 170 174 Z';
  s += ink(neck, skin, 1.4);
  s += shadow('M170 164 C180 166 192 168 200 166 C200 170 196 172 190 172 C182 173 176 174 170 174 Z', skinShade, 0.8, 'fine');
  s += line('M178 150 c2 6 2 14 0 20 M186 148 c2 7 2 14 0 21 M193 147 c2 6 2 12 0 18', 0.8, INK, ' opacity="0.65"');
  // Tête : repère local (museau vers +x), origine à la jonction du cou.
  let hd = '';
  const headP = 'M0 -8 C6 -14 16 -17 26 -16 C34 -15 40 -10 41 -3 C42 2 40 6 37 8 C36 11 33 12 30 11 C24 14 14 15 4 14 C0 10 -1 0 0 -8 Z';
  hd += ink(headP, skin, 1.5);
  hd += shadow('M4 14 C14 15 24 14 30 11 C24 9 14 8 4 6 C2 8 2 12 4 14 Z', skinShade, 0.8, 'fine');
  // Écailles céphaliques gravées (préfrontales, frontale, pariétales, post-orbitales).
  hd += `<path d="M28 -15 L36 -11 L33 -6 L26 -8 Z M18 -16 L28 -15 L26 -8 L18 -9 Z M8 -14 L18 -16 L18 -9 L10 -6 Z M1 -9 L8 -14 L10 -6 L3 -1 Z M10 -6 L18 -9 L19 -3 L12 1 Z M3 -1 L12 1 L10 7 L1 5 Z M12 1 L19 -3 L21 3 L15 7 Z" fill="${pal.body}" stroke="${INK}" stroke-width="0.7" stroke-linejoin="round" opacity="0.9"/>`;
  hd += `<path d="M26 -8 L33 -6 L38 -2 L36 2 L30 0 Z" fill="${pal.body}" stroke="${INK}" stroke-width="0.6" opacity="0.7"/>`;
  hd += ink('M41 -3 C42 2 40 6 37 8 C36 11 33 12 30 11 L29 7 C33 6 37 3 41 -3 Z', pal.deep, 0.9);
  hd += line('M29 7 C22 8 14 8 8 7', 1, INK) + line('M30 11 C24 12 16 12 8 11', 0.6, INK, ' opacity="0.6"');
  hd += `<path d="M20 -5 C22 -9 30 -9 32 -4 C30 0 22 0 20 -5 Z" fill="${pal.deep}" opacity="0.6"/>`;
  hd += eyeA(26, -4, 4.4, pal.gold, { angle: 4, slit: false, open: 0.48 });
  hd += line('M19 -1 c-3 1 -5 3 -6 5 M19 -6 c-3 -1 -6 -1 -8 0 M21 1 c-1 2 -1 4 0 6', 0.7, INK, ' opacity="0.7"');
  hd += `<circle cx="39" cy="-6" r="0.8" fill="${INK}"/>`;
  hd += rim('M0 -8 C6 -14 16 -17 26 -16 C34 -15 40 -10 41 -3', pal.glow, 1);
  s += `<g transform="translate(190 152) rotate(-4) scale(1.1)">${hd}</g>`;

  // ---------- Plastron et carapace ----------
  s += ink('M38 172 C80 186 140 186 184 170 C182 178 170 184 150 186 C110 190 70 188 44 180 Z', pal.belly, 1.2);
  s += line('M70 184 l2 -6 M100 187 l1 -7 M130 186 l0 -7 M156 182 l-1 -6', 0.7, INK, ' opacity="0.6"');
  const shell = 'M22 168 C22 146 54 120 106 116 C152 114 184 134 192 158 C194 166 190 172 182 174 C140 178 80 178 40 178 C30 178 22 174 22 168 Z';
  s += `<defs><clipPath id="${id}-sh"><path d="${shell}"/></clipPath></defs>`;
  s += `<path d="${shell}" fill="${pal.body}"/>`;
  s += `<g clip-path="url(#${id}-sh)">`
    // Écailles costales : plaques avec stries de croissance gravées.
    + [[30, 60], [60, 96], [96, 132], [132, 166], [166, 196]].map(([x0, x1], i) => {
      const cx = (x0 + x1) / 2, cy = 160 - (i === 2 ? 4 : 0);
      return ink(`M${x0} 176 C${x0 - 2} 160 ${x0 + 4} 146 ${x0 + 8} 140 L${x1 - 6} 138 C${x1} 146 ${x1 + 2} 160 ${x1} 176 Z`, i % 2 ? pal.shade : pal.body, 0.9)
        + `<ellipse cx="${cx}" cy="${cy}" rx="${(x1 - x0) / 2 - 6}" ry="11" fill="none" stroke="${INK}" stroke-width="0.6" opacity="0.5"/>`
        + `<ellipse cx="${cx}" cy="${cy}" rx="${(x1 - x0) / 2 - 11}" ry="6" fill="none" stroke="${pal.gold}" stroke-width="0.7" opacity="0.8"/>`;
    }).join('')
    // Bord marginal.
    + `<path d="M20 168 C60 176 140 176 196 164 L196 182 L20 182 Z" fill="${pal.deep}" opacity="0.75"/>`
    + Array.from({ length: 11 }, (_, i) => line(`M${30 + i * 15} ${f(171 - Math.max(0, i - 6) * 1.4)} l1 9`, 0.8, CREAM, ' opacity="0.5"')).join('')
    + shadow('M22 168 C40 172 80 176 120 176 C150 176 176 172 192 160 L196 182 L20 182 Z', INK, 0.3, 'xhatch')
    + `</g>`;
  s += ink(shell, 'none', 1.8);

  // ---------- Le monde porté : sol, forêts, montagnes ----------
  const land = 'M26 150 C40 134 70 124 106 122 C146 120 176 132 188 150 C170 142 150 140 130 142 C110 140 80 142 60 146 C46 148 34 150 26 150 Z';
  s += ink(land, hsl(c.hue + 80, 25, 34), 1.2);
  // Montagnes (gauche, droite, puis massif central).
  const mountain = (d: string, shade: string, snow: string, light: string) =>
    ink(d, stone, 1.3) + shadow(shade, pal.deep, 0.55, 'fine') + ink(snow, CREAM, 0.9) + rim(light, pal.glow, 0.9);
  s += `<path d="M44 132 L70 92 L80 100 L94 70 L104 84 L120 60 L134 82 L146 76 L170 120 Z" fill="${hsl(c.hue + 190, 18, 74)}" stroke="${INK}" stroke-width="0.7" opacity="0.55"/>`;
  s += mountain('M34 146 L50 112 L58 118 L68 98 L80 120 L88 116 L100 138 Z', 'M68 98 L80 120 L88 116 L100 138 L70 142 C74 128 72 112 68 98 Z',
    'M60 108 L68 98 L74 110 L69 108 L65 113 Z', 'M34 146 L50 112 L58 118 L68 98');
  s += mountain('M124 136 L140 100 L148 108 L160 84 L174 116 L180 112 L190 146 Z', 'M160 84 L174 116 L180 112 L190 146 L162 142 C168 124 166 100 160 84 Z',
    'M152 98 L160 84 L167 99 L161 96 L157 102 Z', 'M124 136 L140 100 L148 108 L160 84');
  s += `<ellipse cx="112" cy="60" rx="30" ry="40" fill="${pal.glow}" opacity="0.25" filter="url(#soft)"/>`;
  s += mountain('M64 132 L86 84 L96 92 L112 46 L126 78 L134 72 L160 134 Z', 'M112 46 L126 78 L134 72 L160 134 L118 136 C124 110 120 74 112 46 Z',
    'M100 74 L106 62 L112 46 L119 64 L114 61 L110 68 L106 64 Z', 'M64 132 L86 84 L96 92 L112 46');
  s += line('M90 104 l6 10 M80 118 l4 8 M140 112 l-4 10 M98 96 l8 4 M84 110 l10 4 M104 84 l6 2 M52 122 l8 3 M46 132 l10 3 M146 104 l8 3 M138 118 l10 3', 0.7, INK, ' opacity="0.55"');
  s += line('M106 62 l-3 8 M100 74 l-4 7 M118 66 l2 8 M62 106 l-3 6 M154 96 l-3 7 M166 98 l2 6', 1.2, CREAM, ' opacity="0.8"');
  s += line('M112 46 L108 70 L114 90 L110 120 M68 98 L66 116 L72 134 M160 84 L156 104 L162 128', 0.8, INK, ' opacity="0.5"');
  // Forêts de conifères (petits traits).
  for (const [x0, x1, y0] of [[30, 64, 146], [92, 130, 138], [150, 186, 146]] as const) {
    for (let x = x0; x < x1; x += 4.2) {
      const y = y0 - Math.sin(((x - x0) / (x1 - x0)) * Math.PI) * 4 + c.r() * 2, h = 5 + c.r() * 3;
      s += `<path d="M${f(x - 1.8)} ${f(y)} L${f(x)} ${f(y - h)} L${f(x + 1.8)} ${f(y)} Z" fill="${hsl(c.hue + 90, 30, 22)}" stroke="${INK}" stroke-width="0.4"/>`;
    }
  }
  // Cascades qui tombent du bord de la carapace et se dissolvent en étoiles.
  for (const [x, y, l] of [[30, 152, 60], [184, 150, 44], [62, 148, 36]] as const) {
    s += line(`M${x} ${y} C${x - 4} ${y + 6} ${x - 6} ${y + 14} ${x - 6} ${y + 24}`, 2.6, CREAM, ' opacity="0.85"');
    s += line(`M${x - 6} ${y + 24} L${x - 7} ${y + l}`, 1.6, pal.glow, ' opacity="0.45"');
    for (let i = 0; i < 6; i++) s += `<circle cx="${f(x - 6 + (c.r() - 0.5) * 8)}" cy="${f(y + 26 + c.r() * l)}" r="${f(0.6 + c.r())}" fill="${CREAM}" opacity="0.8"/>`;
  }

  // ---------- Arbre de lumière (racines sur le sommet, ramure qui rejoint la galaxie) ----------
  s += `<circle cx="112" cy="20" r="16" fill="${pal.glow}" opacity="0.45" filter="url(#soft)"/>`;
  s += ink('M108 50 C109 40 110 26 108 12 L111 4 L116 12 C114 26 115 40 117 50 C114 48 111 48 108 50 Z', CREAM, 1.2);
  s += line('M108 50 c-6 2 -10 6 -12 12 M117 50 c5 2 9 6 10 12 M112 49 c0 6 -1 10 -3 14', 1, CREAM);
  s += line('M110 14 C100 8 90 6 80 8 M113 10 C122 2 134 0 146 4 M111 6 C108 -4 100 -10 92 -12 M114 4 C120 -6 130 -10 140 -10', 1.6, CREAM);
  s += line('M80 8 C74 9 70 12 68 16 M146 4 C152 6 156 10 158 14 M92 -12 C86 -14 80 -12 76 -8', 1, CREAM, ' opacity="0.8"');
  s += gild('M110 40 C111 30 111 22 110 14 M114 40 C114 32 114 24 113 16', 0.6);
  for (const [x, y] of [[80, 8], [146, 4], [92, -12], [140, -10], [68, 16], [158, 14], [76, -8], [124, 0], [100, 2]] as const) {
    s += `<circle cx="${x}" cy="${y}" r="3.4" fill="${pal.glow}" opacity="0.6" filter="url(#soft)"/>` + `<circle cx="${x}" cy="${y}" r="1.4" fill="${CREAM}"/>`;
  }

  // ---------- Nageoire antérieure proche (en pleine brasse) ----------
  const flip = 'M158 168 C174 172 180 184 172 198 C158 220 132 236 102 246 C94 248 92 242 98 238 C122 222 140 204 146 186 C148 178 152 172 158 168 Z';
  s += `<defs><clipPath id="${id}-fl"><path d="${flip}"/></clipPath></defs>${ink(flip, skin, 1.6)}`;
  s += `<g clip-path="url(#${id}-fl)">`
    + shadow('M172 198 C158 220 132 236 102 246 L96 240 C124 228 150 212 166 190 Z', skinShade, 0.8, 'fine')
    + Array.from({ length: 9 }, (_, i) => {
      const t = i / 9, x = 166 - t * 62, y = 184 + t * 56;
      return line(`M${f(x - 14 + t * 6)} ${f(y - 10 + t * 4)} Q${f(x)} ${f(y + 2)} ${f(x + 8 - t * 4)} ${f(y + 10 - t * 2)}`, 0.7, INK, ' opacity="0.6"');
    }).join('')
    + Array.from({ length: 10 }, (_, i) => {
      const t = i / 10, x = 170 - t * 64, y = 180 + t * 58;
      return `<path d="M${f(x)} ${f(y)} l-4 3 l2 4 l5 -1 Z" fill="${pal.body}" stroke="${INK}" stroke-width="0.5" opacity="0.8"/>`;
    }).join('')
    + `</g>` + ink(flip, 'none', 1.6);
  s += rim('M158 168 C174 172 180 184 172 198 C158 220 132 236 102 246', pal.glow, 1);
  s += line('M100 244 l-4 3', 1.1);

  // Constellation dorée gravée sur le flanc, éclats autour.
  s += constellation([[44, 160], [62, 154], [80, 158], [96, 152]], pal.gold);
  s += fur(c, 186, 148, 6, 180, 3, 6, INK, 0.6);
  s += sparkle(196, 40, 3.5, CREAM, false) + sparkle(30, 70, 3, pal.glow, false) + sparkle(210, 196, 2.8, CREAM, false);
  return s + '</g>';
};

/** Décor : océan d'étoiles profond, nébuleuses en voiles, galaxies lointaines et bébés tortues qui escortent le monde. */
aeonis.scene = (c: DrawCtx, b: Bounds) => {
  const { pal } = c;
  const CREAM = '#FFF6D8', INK = '#140F24';
  const id = 'aeonis-4-bg';
  const W = b.x1 - b.x0, H = b.y1 - b.y0;
  let s = `<defs><radialGradient id="${id}-g" cx="50%" cy="38%" r="75%"><stop offset="0" stop-color="${hsl(c.hue + 190, 40, 22)}"/><stop offset="0.6" stop-color="${hsl(c.hue + 210, 45, 11)}"/><stop offset="1" stop-color="${hsl(c.hue + 230, 50, 5)}"/></radialGradient></defs>`;
  s += `<rect x="${b.x0}" y="${b.y0}" width="${W}" height="${H}" fill="url(#${id}-g)"/>`;
  // Voiles de nébuleuse (courants de l'océan d'étoiles).
  s += `<ellipse cx="30" cy="230" rx="110" ry="40" fill="${hsl(c.hue + 160, 50, 45)}" opacity="0.22" filter="url(#soft)"/>`;
  s += `<ellipse cx="200" cy="70" rx="80" ry="50" fill="${hsl(c.hue + 260, 50, 50)}" opacity="0.18" filter="url(#soft)"/>`;
  for (let i = 0; i < 4; i++) {
    const y = 40 + i * 62;
    s += `<path d="M${b.x0} ${y} C40 ${y - 18} 90 ${y + 20} 140 ${y} C180 ${y - 14} 210 ${y + 6} ${b.x1} ${y - 6}" fill="none" stroke="${pal.light}" stroke-width="${f(0.8 + i * 0.3)}" opacity="0.14"/>`;
  }
  for (let i = 0; i < 80; i++) {
    const x = b.x0 + c.r() * W, y = b.y0 + c.r() * H;
    s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(0.3 + c.r() * c.r() * 1.3)}" fill="${CREAM}" opacity="${f(0.3 + c.r() * 0.6)}"/>`;
  }
  // Galaxies lointaines.
  for (const [x, y, r, a] of [[24, 10, 12, 20], [206, 250, 9, -30]] as const) {
    s += `<g transform="rotate(${a} ${x} ${y})" opacity="0.6"><ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 0.35}" fill="${pal.light}" opacity="0.5" filter="url(#soft)"/>`
      + `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 0.3}" fill="none" stroke="${CREAM}" stroke-width="0.5"/><circle cx="${x}" cy="${y}" r="1.5" fill="${CREAM}"/></g>`;
  }
  // Petite planète océane au loin.
  s += `<circle cx="196" cy="232" r="11" fill="${hsl(c.hue + 170, 30, 42)}" stroke="${INK}" stroke-width="0.8" opacity="0.8"/>`
    + shadow('M196 221 A11 11 0 0 1 196 243 C204 238 204 226 196 221 Z', hsl(c.hue + 170, 40, 20), 0.6, 'fine');
  // Bébés tortues qui escortent (silhouettes gravées, plus petites et moins contrastées).
  const baby = (x: number, y: number, k: number, rot: number) =>
    `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${k})" opacity="0.75">`
    + `<path d="M-8 -2 L-14 -8 L-10 -1 Z M6 -2 L12 -9 L8 -1 Z M-8 3 L-13 8 L-6 4 Z M6 3 L11 8 L5 4 Z" fill="${pal.light}" stroke="${INK}" stroke-width="0.6"/>`
    + `<ellipse cx="13" cy="0" rx="3.2" ry="2.4" fill="${pal.light}" stroke="${INK}" stroke-width="0.6"/>`
    + `<ellipse cx="0" cy="0" rx="10" ry="6.5" fill="${pal.body}" stroke="${INK}" stroke-width="0.8"/>`
    + `<path d="M-4 -6 L-4 6 M4 -6 L4 6 M-10 0 H10" stroke="${INK}" stroke-width="0.5" opacity="0.6"/></g>`;
  s += baby(46, 262, 0.9, -18) + baby(20, 236, 0.65, -10) + baby(168, 274, 0.7, -24);
  s += line('M60 268 c10 2 18 0 24 -4 M180 278 c6 1 12 0 16 -3', 0.6, CREAM, ' opacity="0.4"');
  // Lueur basse : le monde se reflète dans le vide.
  s += `<ellipse cx="110" cy="250" rx="100" ry="20" fill="${pal.glow}" opacity="0.1" filter="url(#soft)"/>`;
  return s;
};
