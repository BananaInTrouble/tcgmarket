/**
 * Illustrations des cartes Pack Rush, dessinées par le code (SVG) : créatures cosmiques originales au trait d'encre
 * (voir creatures/), aucune image ni personnage sous licence. Chaque carte a son espèce (`kind`), son stade
 * (`stage`), sa teinte (`hue`) et sa graine (`seed`, détails et ciel), enregistrés avec la carte sur le serveur ;
 * le cadre suit la rareté (plein cadre pour les SSR).
 */
import { SPECIES } from './creatures/index.ts';
import { STYLE_DEFS, paletteAdult, sparkle } from './creatures/style.ts';

export type PrRarity = 'C' | 'U' | 'R' | 'SR' | 'SSR';
export const PR_RARITIES: PrRarity[] = ['C', 'U', 'R', 'SR', 'SSR'];

export interface PrArt { kind?: string; hue?: number; seed?: number; stage?: number }

/** Couleurs du cadre et symbole de chaque rareté. */
export const RARITY_STYLE: Record<PrRarity, { frame: string[]; symbol: string; glow: string }> = {
  C: { frame: ['#3B4A5C', '#7D8FA3'], symbol: '●', glow: '#AFC0CF' },
  U: { frame: ['#9AA7B4', '#E3E8EE'], symbol: '◆', glow: '#C9D3DD' },
  R: { frame: ['#C9971F', '#F4C542'], symbol: '★', glow: '#F4C542' },
  SR: { frame: ['#F4C542', '#E86FB5', '#7C6CF0'], symbol: '★★', glow: '#E86FB5' },
  SSR: { frame: ['#FF5E7E', '#F4C542', '#3DDC97', '#4FA3FF', '#B26CFF'], symbol: '★★★', glow: '#FFFFFF' },
};

/** Générateur pseudo-aléatoire déterministe (mulberry32). */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const W = 250, H = 350;
const hsl = (h: number, s: number, l: number, a = 1) => `hsla(${Math.round(((h % 360) + 360) % 360)},${s}%,${l}%,${a})`;
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const SERIF = `Georgia, 'Times New Roman', serif`;

/** Fond cosmique dessiné : nuit profonde, voiles de nébuleuse, volutes à l'encre claire, étoiles. */
function sky(hue: number, r: () => number, w: number, h: number): string {
  const bh = hue + 190;
  let s = `<rect width="${w}" height="${h}" fill="url(#sky)"/>`;
  for (let i = 0; i < 3; i++) {
    s += `<ellipse cx="${(r() * w).toFixed(1)}" cy="${(r() * h * 0.8).toFixed(1)}" rx="${(50 + r() * 60).toFixed(1)}" ry="${(24 + r() * 30).toFixed(1)}" fill="${hsl(bh + i * 40, 70, 55, 0.22)}" filter="url(#soft)"/>`;
  }
  for (let i = 0; i < 3; i++) {
    const y = 20 + r() * h * 0.6, x0 = -10 + r() * 30;
    s += `<path d="M${x0.toFixed(1)} ${y.toFixed(1)} c${(40 + r() * 30).toFixed(1)} ${(-20 - r() * 20).toFixed(1)} ${(90 + r() * 40).toFixed(1)} ${(20 + r() * 20).toFixed(1)} ${(150 + r() * 60).toFixed(1)} ${(-10 + r() * 20).toFixed(1)}" fill="none" stroke="${hsl(bh + 30, 60, 85, 0.18)}" stroke-width="${(1 + r() * 1.5).toFixed(1)}" stroke-linecap="round"/>`;
  }
  for (let i = 0; i < 38; i++) {
    s += `<circle cx="${(r() * w).toFixed(1)}" cy="${(r() * h).toFixed(1)}" r="${(0.4 + r() * 1.2).toFixed(2)}" fill="#FFF6D8" opacity="${(0.35 + r() * 0.65).toFixed(2)}"/>`;
  }
  for (let i = 0; i < 4; i++) s += sparkle(r() * w, r() * h * 0.7, 2.5 + r() * 3, '#FFF6D8', false);
  // Halo céleste gravé (façon arcane) derrière la créature.
  const hx = w / 2, hy = h * 0.46, hr = Math.min(w, h) * 0.36;
  s += `<circle cx="${hx}" cy="${hy}" r="${hr}" fill="none" stroke="#E9C25B" stroke-width="0.9" opacity="0.32"/>`
    + `<circle cx="${hx}" cy="${hy}" r="${hr * 0.93}" fill="none" stroke="#E9C25B" stroke-width="0.5" stroke-dasharray="1.5 3" opacity="0.4"/>`
    + Array.from({ length: 24 }, (_, i) => {
      const a = (i / 24) * Math.PI * 2, r1 = hr * 1.03, r2 = hr * (i % 2 ? 1.08 : 1.14);
      return `<line x1="${(hx + Math.cos(a) * r1).toFixed(1)}" y1="${(hy + Math.sin(a) * r1).toFixed(1)}" x2="${(hx + Math.cos(a) * r2).toFixed(1)}" y2="${(hy + Math.sin(a) * r2).toFixed(1)}" stroke="#E9C25B" stroke-width="0.7" opacity="0.3"/>`;
    }).join('');
  return s;
}

/** Ornements du cadre : double filet et volutes aux coins (style gravure). */
function ornaments(x: number, y: number, w: number, h: number, color: string): string {
  const corner = (cx: number, cy: number, sx: number, sy: number) =>
    `<path d="M${cx} ${cy + sy * 22} q0 ${-sy * 22} ${sx * 22} ${-sy * 22}" fill="none" stroke="${color}" stroke-width="1.4"/>`
    + `<path d="M${cx + sx * 6} ${cy + sy * 16} q${sx * 3} ${-sy * 9} ${sx * 10} ${-sy * 10}" fill="none" stroke="${color}" stroke-width="1"/>`
    + `<circle cx="${cx + sx * 4}" cy="${cy + sy * 4}" r="2.4" fill="${color}"/>`;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="none" stroke="${color}" stroke-width="1.6"/>`
    + `<rect x="${x + 4}" y="${y + 4}" width="${w - 8}" height="${h - 8}" rx="5" fill="none" stroke="${color}" stroke-width="0.7" opacity="0.7"/>`
    + corner(x + 4, y + 4, 1, 1) + corner(x + w - 4, y + 4, -1, 1) + corner(x + 4, y + h - 4, 1, -1) + corner(x + w - 4, y + h - 4, -1, -1);
}

/** Illustration complète d'une carte (SVG). `owned` faux : silhouette sombre (carte manquante). */
/** Textes posés sur la carte, dans la langue de l'appli : niveau d'évolution (« Niv. 2 ») et texte d'ambiance. */
export interface CardText { level?: string; desc?: string }

/** Découpe un texte en lignes (les caractères CJK/thaï comptent double et peuvent couper n'importe où). */
function wrap(text: string, max: number, lines: number): string[] {
  const wide = (ch: string) => /[\u0E00-\u0E7F\u3000-\u9FFF\uAC00-\uD7AF\uFF00-\uFFEF]/.test(ch);
  const out: string[] = [];
  let cur = '', w = 0;
  const tokens = text.match(/[\u0E00-\u0E7F\u3000-\u9FFF\uAC00-\uD7AF\uFF00-\uFFEF]|[^\s\u0E00-\u0E7F\u3000-\u9FFF\uAC00-\uD7AF\uFF00-\uFFEF]+|\s+/g) ?? [];
  for (const tk of tokens) {
    const tw = [...tk].reduce((a, ch) => a + (wide(ch) ? 2 : 1), 0);
    if (/^\s+$/.test(tk)) { if (cur) { cur += ' '; w += 1; } continue; }
    if (w + tw > max && cur.trim()) { out.push(cur.trim()); cur = ''; w = 0; }
    cur += tk; w += tw;
  }
  if (cur.trim()) out.push(cur.trim());
  if (out.length > lines) { out.length = lines; out[lines - 1] = out[lines - 1].replace(/.$/, '…'); }
  return out;
}

type CardLike = { name: string; number: number; rarity: PrRarity; art: PrArt };
const WIN = { x: 8, y: 8, w: W - 16, h: H - 16 };

/** Couche « illustration » seule (décor + créature), pleine carte, sans cadre ni texte. Silhouette si `owned` faux. */
export function cardArtSvg(card: CardLike, owned = true): string {
  const { kind = 'lumikit', hue = 200, seed = 1, stage = 0 } = card.art ?? {};
  const full = card.rarity === 'SSR';
  const draw = SPECIES[kind] ?? SPECIES.lumikit;
  const creature = draw({ r: rng(seed * 7 + 1), hue, pal: paletteAdult(hue), stage });
  // La créature est dessinée dans un repère décalé de (14, oy) ; le décor couvre toute la fenêtre.
  const ox = 14, oy = full ? 44 : 14;
  const ctx = { r: rng(seed * 13 + 5), hue, pal: paletteAdult(hue), stage };
  const bounds = { x0: WIN.x - ox, y0: WIN.y - oy, x1: WIN.x + WIN.w - ox, y1: WIN.y + WIN.h - oy };
  const backdrop = draw.scene
    ? `<g transform="translate(${ox} ${oy})">${draw.scene(ctx, bounds)}</g>`
    : `<g transform="translate(${WIN.x} ${WIN.y})">${sky(hue, rng(seed), WIN.w, WIN.h)}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>${STYLE_DEFS}
    <radialGradient id="sky" cx="45%" cy="40%" r="80%"><stop offset="0%" stop-color="${hsl(hue + 200, 45, 24)}"/><stop offset="100%" stop-color="${hsl(hue + 220, 55, 7)}"/></radialGradient>
    <radialGradient id="mood" cx="50%" cy="40%" r="75%"><stop offset="40%" stop-color="#0B0716" stop-opacity="0"/><stop offset="100%" stop-color="#0B0716" stop-opacity="0.7"/></radialGradient>
    <filter id="ghost"><feColorMatrix values="0 0 0 0 0.16  0 0 0 0 0.13  0 0 0 0 0.26  0 0 0 1 0"/></filter>
  </defs>
  <rect width="${W}" height="${H}" fill="#0B0716"/>
  ${backdrop}
  <rect x="${WIN.x}" y="${WIN.y}" width="${WIN.w}" height="${WIN.h}" fill="url(#mood)" opacity="0.6"/>
  <g transform="translate(${ox} ${oy})"${owned ? '' : ' filter="url(#ghost)"'}>${creature}</g>
  ${owned ? '' : `<rect width="${W}" height="${H}" fill="#07050F" opacity="0.4"/>`}
</svg>`;
}

/**
 * Couche « cadre » : bordure de rareté, filets dorés, orbes, niveau, nom, texte d'ambiance, numéro. La fenêtre de
 * l'illustration reste transparente : on la pose par-dessus `cardArtSvg` (ou l'image pré-calculée de la carte).
 */
export function cardFrameSvg(card: CardLike, total: number, owned = true, text: CardText = {}): string {
  const st = RARITY_STYLE[card.rarity] ?? RARITY_STYLE.C;
  const full = card.rarity === 'SSR';
  const gold = card.rarity === 'C' || card.rarity === 'U' ? '#C9D6DE' : '#E9C25B';
  const stops = st.frame.map((c, i) => `<stop offset="${(i / Math.max(1, st.frame.length - 1)) * 100}%" stop-color="${c}"/>`).join('');
  const rr = (x: number, y: number, w: number, h: number, r: number) =>
    `M${x + r} ${y} H${x + w - r} A${r} ${r} 0 0 1 ${x + w} ${y + r} V${y + h - r} A${r} ${r} 0 0 1 ${x + w - r} ${y + h} H${x + r} A${r} ${r} 0 0 1 ${x} ${y + h - r} V${y + r} A${r} ${r} 0 0 1 ${x + r} ${y} Z`;
  const border = `<path d="${rr(0, 0, W, H, 14)} ${rr(WIN.x, WIN.y, WIN.w, WIN.h, 9)}" fill="url(#frame)" fill-rule="evenodd"/>`;
  const orb = (x: number, y: number) => `<circle cx="${x}" cy="${y}" r="7.5" fill="#0B0716" stroke="${gold}" stroke-width="1"/><circle cx="${x}" cy="${y}" r="4.6" fill="url(#orb)"/><circle cx="${x - 1.2}" cy="${y - 1.2}" r="1.2" fill="#FFFFFF"/>`;
  const bracket = (x: number, y: number, sx: number, sy: number) =>
    `<path d="M${x + sx * 14} ${y} h${sx * 22} l${sx * 6} ${sy * 6} M${x} ${y + sy * 14} v${sy * 22} l${sx * 6} ${sy * 6}" fill="none" stroke="${gold}" stroke-width="0.9" stroke-linecap="round"/>`
    + `<path d="M${x + sx * 10} ${y + sy * 30} q${sx * 10} ${-sy * 10} ${sx * 22} ${-sy * 20}" fill="none" stroke="${gold}" stroke-width="0.6" opacity="0.7"/>`;
  const fi = 15;
  const frame = `<rect x="${fi}" y="${fi}" width="${W - fi * 2}" height="${H - fi * 2}" rx="6" fill="none" stroke="${gold}" stroke-width="0.9" opacity="0.85"/>`
    + `<rect x="${fi + 4}" y="${fi + 4}" width="${W - fi * 2 - 8}" height="${H - fi * 2 - 8}" rx="4" fill="none" stroke="${gold}" stroke-width="0.4" opacity="0.5"/>`
    + bracket(fi + 4, fi + 4, 1, 1) + bracket(W - fi - 4, fi + 4, -1, 1) + bracket(fi + 4, H - fi - 4, 1, -1) + bracket(W - fi - 4, H - fi - 4, -1, -1)
    + orb(fi + 6, fi + 6) + orb(W - fi - 6, fi + 6) + orb(fi + 6, H - fi - 6) + orb(W - fi - 6, H - fi - 6);
  const lv = text.level ? esc(text.level) : '';
  const lvW = lv.length * 5.4 + 14;
  const level = lv
    ? `<rect x="34" y="23" width="${lvW.toFixed(1)}" height="15" rx="7.5" fill="#0B0716" fill-opacity="0.8" stroke="${gold}" stroke-width="0.8"/>`
      + `<text x="${(34 + lvW / 2).toFixed(1)}" y="34" text-anchor="middle" font-family="${SERIF}" font-size="9" font-weight="700" letter-spacing="0.6" fill="${gold}">${lv}</text>`
    : '';
  const name = owned ? esc(card.name.toUpperCase()) : '? ? ?';
  const nameSize = card.name.length > 11 ? 14 : 16;
  const lines = owned && text.desc ? wrap(text.desc, 48, 3) : [];
  const desc = lines.map((l, i) => `<text x="${W / 2}" y="${300 + i * 10}" text-anchor="middle" font-family="${SERIF}" font-size="8.4" font-style="italic" fill="#EDE6FF" fill-opacity="0.85">${esc(l)}</text>`).join('');
  const body = `<text x="${W / 2}" y="278" text-anchor="middle" font-family="${SERIF}" font-size="${nameSize}" font-weight="700" letter-spacing="3.2" fill="${owned ? '#FFF1D0' : '#6E6890'}" filter="url(#txtglow)">${name}</text>`
    + `<path d="M62 287 h52 M136 287 h52" stroke="${gold}" stroke-width="0.7" opacity="0.8"/><path d="M${W / 2 - 5} 287 l5 -3.5 l5 3.5 l-5 3.5 z" fill="${gold}"/>`
    + desc
    + `<text x="34" y="${H - 22}" font-family="${SERIF}" font-size="8" font-weight="700" letter-spacing="1" fill="${gold}" opacity="0.9">${String(card.number).padStart(3, '0')}/${String(total).padStart(3, '0')}</text>`
    + `<text x="${W - 34}" y="${H - 22}" text-anchor="end" font-family="${SERIF}" font-size="9" font-weight="700" fill="${st.glow}">${st.symbol}</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    <filter id="txtglow" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <radialGradient id="orb" cx="40%" cy="40%" r="60%"><stop offset="0%" stop-color="#BFF6FF"/><stop offset="45%" stop-color="#3A7BD5"/><stop offset="100%" stop-color="#101A3A"/></radialGradient>
    <linearGradient id="frame" x1="0" y1="0" x2="1" y2="1">${stops}</linearGradient>
    <linearGradient id="holo" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#FF7EB6"/><stop offset="30%" stop-color="#FFE27A"/><stop offset="55%" stop-color="#7CF5D0"/><stop offset="80%" stop-color="#8FA8FF"/><stop offset="100%" stop-color="#E58CFF"/></linearGradient>
    <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0B0716" stop-opacity="0"/><stop offset="45%" stop-color="#0B0716" stop-opacity="0.82"/><stop offset="100%" stop-color="#0B0716" stop-opacity="0.95"/></linearGradient>
  </defs>
  ${owned && (card.rarity === 'SR' || full) ? `<rect x="${WIN.x}" y="${WIN.y}" width="${WIN.w}" height="${WIN.h}" rx="9" fill="url(#holo)" style="mix-blend-mode:soft-light" opacity="0.3"/>` : ''}
  <rect x="${WIN.x}" y="${H - 116}" width="${WIN.w}" height="108" fill="url(#fade)"/>
  ${border}${frame}${level}${body}
</svg>`;
}

/** Carte complète (illustration + cadre) en un seul SVG : aperçus et outils. */
export function cardSvg(card: CardLike, total: number, owned = true, text: CardText = {}): string {
  const inner = (svg: string) => svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><defs><clipPath id="cardclip"><rect width="${W}" height="${H}" rx="14"/></clipPath></defs>`
    + `<g clip-path="url(#cardclip)">${inner(cardArtSvg(card, owned))}</g>${inner(cardFrameSvg(card, total, owned, text))}</svg>`;
}

const uri = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
export const cardImage = (card: CardLike, total: number, owned = true, text: CardText = {}) => uri(cardSvg(card, total, owned, text));
export const cardFrameImage = (card: CardLike, total: number, owned = true, text: CardText = {}) => uri(cardFrameSvg(card, total, owned, text));
