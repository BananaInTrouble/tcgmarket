/**
 * Style commun des créatures Pack Rush : trait d'encre légèrement tremblé (filtre `wobble`), aplats de couleur,
 * ombres hachurées (motif `hatch`), petits reflets blancs. Chaque espèce dessine dans la fenêtre d'illustration
 * (0..AW × 0..AH, sol vers y≈200) avec ces outils, pour que les 58 cartes aient la même « main ».
 */
export const AW = 222, AH = 236;

export interface Palette {
  ink: string; body: string; shade: string; light: string; belly: string;
  accent: string; accent2: string; glow: string; eye: string;
  /** Style adulte : teinte profonde (ombres portées, intérieurs), or des ornements. */
  deep: string; gold: string;
}

export interface DrawCtx {
  /** Aléatoire déterministe propre à la carte (variations de détail, jamais de forme). */
  r: () => number;
  hue: number;
  pal: Palette;
  /** 0 bébé, 1 jeune, 2 adulte, 3 éveillé (variante rare), 4 légendaire. */
  stage: number;
}

/** Limites visibles de la fenêtre dans le repère de la créature (plus grandes pour les SSR plein cadre). */
export interface Bounds { x0: number; y0: number; x1: number; y1: number }

/**
 * Décor propre à l'espèce (et au stade) : remplace le ciel générique de la carte et doit couvrir toute la fenêtre
 * `b` (forêt cosmique, océan d'étoiles, désert lunaire…). Dessiné derrière la créature.
 */
export type Scene = (c: DrawCtx, b: Bounds) => string;

/** Une espèce dessine la créature ; elle peut porter son décor dans `scene`. */
export type Species = ((c: DrawCtx) => string) & { scene?: Scene };

export const hsl = (h: number, s: number, l: number, a = 1) =>
  `hsla(${Math.round(((h % 360) + 360) % 360)},${s}%,${l}%,${a})`;

export function palette(h: number): Palette {
  return {
    ink: '#1A1230',
    body: hsl(h, 48, 60),
    shade: hsl(h + 12, 46, 40),
    light: hsl(h - 8, 70, 82),
    belly: hsl(h - 20, 55, 88),
    accent: hsl(h + 150, 72, 64),
    accent2: hsl(h + 200, 80, 72),
    glow: hsl(h + 40, 95, 82),
    eye: hsl(h + 170, 90, 70),
    deep: hsl(h + 20, 45, 16),
    gold: '#E9C25B',
  };
}

/** Palette du style « adulte » : tons plus sourds et profonds, contrastes de lumière plutôt que couleurs vives. */
export function paletteAdult(h: number): Palette {
  return {
    ink: '#140F24',
    body: hsl(h, 30, 50),
    shade: hsl(h + 14, 36, 30),
    light: hsl(h - 6, 40, 72),
    belly: hsl(h - 14, 28, 80),
    accent: hsl(h + 150, 50, 58),
    accent2: hsl(h + 195, 60, 66),
    glow: hsl(h + 40, 85, 80),
    eye: hsl(h + 50, 95, 66),
    deep: hsl(h + 20, 45, 15),
    gold: '#E9C25B',
  };
}

const n = (v: number) => +v.toFixed(1);

/** Forme encrée : aplat + contour d'encre. */
export const ink = (d: string, fill: string, w = 2.4, extra = '') =>
  `<path d="${d}" fill="${fill}" stroke="#1A1230" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"${extra}/>`;

/** Trait d'encre seul (détails, poils, plis). */
export const line = (d: string, w = 1.8, color = '#1A1230', extra = '') =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`;

/** Ombre : teinte sombre + hachures par-dessus (`fine` ou `xhatch` pour le style adulte). */
export const shadow = (d: string, color: string, opacity = 0.9, hatch = 'hatch') =>
  `<path d="${d}" fill="${color}" opacity="${opacity}"/><path d="${d}" fill="url(#${hatch})"/>`;

/** Reflet : petit trait blanc. */
export const shine = (d: string, w = 2) => line(d, w, '#FFFFFF', ' opacity="0.85"');

/** Étincelle à 4 branches (dessinée). */
export function sparkle(x: number, y: number, s: number, fill = '#FFF6D8', stroke = true): string {
  const k = s * 0.22;
  const d = `M${n(x)} ${n(y - s)} Q${n(x + k)} ${n(y - k)} ${n(x + s)} ${n(y)} Q${n(x + k)} ${n(y + k)} ${n(x)} ${n(y + s)} Q${n(x - k)} ${n(y + k)} ${n(x - s)} ${n(y)} Q${n(x - k)} ${n(y - k)} ${n(x)} ${n(y - s)}Z`;
  return `<path d="${d}" fill="${fill}"${stroke ? ' stroke="#1A1230" stroke-width="1.2" stroke-linejoin="round"' : ''}/>`;
}

/** Œil expressif : blanc, iris lumineux, pupille, deux reflets. `look` décale le regard (-1..1). */
export function eye(x: number, y: number, rad: number, iris: string, look = 0, closed = false): string {
  if (closed) return line(`M${n(x - rad)} ${n(y)} Q${n(x)} ${n(y + rad * 0.8)} ${n(x + rad)} ${n(y)}`, 2.2);
  const ix = x + look * rad * 0.25;
  return `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(rad)}" ry="${n(rad * 1.12)}" fill="#FFFDF5" stroke="#1A1230" stroke-width="2"/>`
    + `<ellipse cx="${n(ix)}" cy="${n(y + rad * 0.12)}" rx="${n(rad * 0.68)}" ry="${n(rad * 0.82)}" fill="${iris}"/>`
    + `<ellipse cx="${n(ix)}" cy="${n(y + rad * 0.18)}" rx="${n(rad * 0.36)}" ry="${n(rad * 0.48)}" fill="#1A1230"/>`
    + `<circle cx="${n(ix - rad * 0.28)}" cy="${n(y - rad * 0.28)}" r="${n(rad * 0.24)}" fill="#fff"/>`
    + `<circle cx="${n(ix + rad * 0.22)}" cy="${n(y + rad * 0.32)}" r="${n(rad * 0.11)}" fill="#fff"/>`;
}

/** Points d'étoiles dispersés sur une forme (taches de pelage « constellation »). */
export function speckles(c: DrawCtx, cx: number, cy: number, rx: number, ry: number, count: number, color = '#FFF6D8'): string {
  let s = '';
  for (let i = 0; i < count; i++) {
    const a = c.r() * Math.PI * 2, d = Math.sqrt(c.r());
    s += `<circle cx="${n(cx + Math.cos(a) * rx * d)}" cy="${n(cy + Math.sin(a) * ry * d)}" r="${n(0.8 + c.r() * 1.4)}" fill="${color}"/>`;
  }
  return s;
}

/** Œil en amande (style adulte) : paupière marquée, iris lumineux, pupille fendue ou ronde, un seul reflet. */
export function eyeA(x: number, y: number, w: number, iris: string, opts: { angle?: number; slit?: boolean; open?: number } = {}): string {
  const { angle = 0, slit = true, open = 0.42 } = opts;
  const h = w * open;
  const lid = `M${n(-w)} 0 Q${n(-w * 0.2)} ${n(-h * 1.5)} ${n(w)} ${n(-h * 0.2)} Q${n(w * 0.1)} ${n(h * 1.2)} ${n(-w)} 0 Z`;
  return `<g transform="translate(${n(x)} ${n(y)}) rotate(${angle})">`
    + `<path d="${lid}" fill="${iris}"/>`
    + (slit ? `<ellipse cx="${n(w * 0.05)}" cy="${n(-h * 0.1)}" rx="${n(w * 0.12)}" ry="${n(h * 0.85)}" fill="#140F24"/>` : `<circle cx="${n(w * 0.05)}" cy="${n(-h * 0.1)}" r="${n(h * 0.55)}" fill="#140F24"/>`)
    + `<circle cx="${n(-w * 0.25)}" cy="${n(-h * 0.45)}" r="${n(Math.max(0.8, h * 0.22))}" fill="#fff"/>`
    + `<path d="${lid}" fill="none" stroke="#140F24" stroke-width="1.3"/>`
    + `<path d="M${n(-w * 1.1)} ${n(h * 0.1)} Q${n(-w * 0.2)} ${n(-h * 1.75)} ${n(w * 1.15)} ${n(-h * 0.35)}" fill="none" stroke="#140F24" stroke-width="2.2" stroke-linecap="round"/>`
    + `</g>`;
}

/** Touffe de poils / plumes : traits fins parallèles, légèrement incurvés. */
export function fur(c: DrawCtx, x: number, y: number, len: number, angle: number, count: number, spread = 6, color = '#140F24', w = 0.9): string {
  let s = '';
  const a = (angle * Math.PI) / 180;
  for (let i = 0; i < count; i++) {
    const o = (i - (count - 1) / 2) * spread / Math.max(1, count - 1) * 2;
    const x0 = x + Math.cos(a + Math.PI / 2) * o, y0 = y + Math.sin(a + Math.PI / 2) * o;
    const l = len * (0.7 + c.r() * 0.5);
    const x1 = x0 + Math.cos(a) * l, y1 = y0 + Math.sin(a) * l;
    const bend = (c.r() - 0.5) * l * 0.4;
    s += `<path d="M${n(x0)} ${n(y0)} Q${n((x0 + x1) / 2 + Math.cos(a + Math.PI / 2) * bend)} ${n((y0 + y1) / 2 + Math.sin(a + Math.PI / 2) * bend)} ${n(x1)} ${n(y1)}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" opacity="0.7"/>`;
  }
  return s;
}

/** Filet d'or (ornements, marques célestes). */
export const gild = (d: string, w = 1.2) => `<path d="${d}" fill="none" stroke="#E9C25B" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;

/** Lumière de contour (bord éclairé par une étoile). */
export const rim = (d: string, color: string, w = 1.6) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" opacity="0.9"/>`;

/** Constellation : étoiles reliées par un trait fin. */
export function constellation(pts: [number, number][], color = '#FFF6D8'): string {
  return `<polyline points="${pts.map((p) => `${n(p[0])},${n(p[1])}`).join(' ')}" fill="none" stroke="${color}" stroke-width="0.8" opacity="0.8"/>`
    + pts.map(([x, y], i) => `<circle cx="${n(x)}" cy="${n(y)}" r="${i % 2 ? 1.3 : 1.9}" fill="${color}"/>`).join('');
}

/** Ombre portée au sol (ellipse douce). */
export const ground = (x: number, y: number, rx: number) =>
  `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(rx)}" ry="${n(rx * 0.16)}" fill="#000" opacity="0.28"/>`;

/** Halo lumineux derrière la créature. */
export const aura = (x: number, y: number, rad: number, color: string) =>
  `<circle cx="${n(x)}" cy="${n(y)}" r="${n(rad)}" fill="${color}" opacity="0.35" filter="url(#soft)"/>`;

/** Définitions SVG partagées (à placer dans <defs>). */
export const STYLE_DEFS = `
  <filter id="wobble" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="1.7"/></filter>
  <filter id="soft" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="10"/></filter>
  <filter id="glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="8"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.09 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>
  <pattern id="hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2="5" stroke="#1A1230" stroke-width="1" opacity="0.45"/></pattern>
  <pattern id="fine" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(40)"><line x1="0" y1="0" x2="0" y2="3" stroke="#140F24" stroke-width="0.6" opacity="0.55"/></pattern>
  <pattern id="xhatch" width="3.4" height="3.4" patternUnits="userSpaceOnUse" patternTransform="rotate(40)"><path d="M0 0 V3.4 M0 0 H3.4" stroke="#140F24" stroke-width="0.55" opacity="0.6"/></pattern>`;
