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
export function cardSvg(card: { name: string; number: number; rarity: PrRarity; art: PrArt }, total: number, owned = true): string {
  const { kind = 'lumikit', hue = 200, seed = 1, stage = 0 } = card.art ?? {};
  const r = rng(seed);
  const st = RARITY_STYLE[card.rarity] ?? RARITY_STYLE.C;
  const full = card.rarity === 'SSR';
  const gold = card.rarity === 'C' || card.rarity === 'U' ? '#C9D6DE' : '#E9C25B';
  const stops = st.frame.map((c, i) => `<stop offset="${(i / Math.max(1, st.frame.length - 1)) * 100}%" stop-color="${c}"/>`).join('');
  const draw = SPECIES[kind] ?? SPECIES.lumikit;
  const creature = draw({ r: rng(seed * 7 + 1), hue, pal: paletteAdult(hue), stage });
  const win = full ? { x: 10, y: 10, w: W - 20, h: H - 20 } : { x: 14, y: 14, w: W - 28, h: 236 };
  const dy = full ? 30 : 0;
  const ctx = { r: rng(seed * 13 + 5), hue, pal: paletteAdult(hue), stage };
  const bounds = full ? { x0: -4, y0: -4 - dy, x1: 226, y1: 326 - dy } : { x0: 0, y0: 0, x1: 222, y1: 236 };
  const backdrop = draw.scene
    ? `<g transform="translate(14 ${14 + dy})">${draw.scene(ctx, bounds)}</g>`
    : `<g transform="translate(${win.x} ${win.y})">${sky(hue, r, win.w, win.h)}</g>`;
  const art = `<g clip-path="url(#win)">${backdrop}`
    + `<g transform="translate(14 ${14 + dy})"><g filter="url(#wobble)"${owned ? '' : ' style="filter:url(#wobble) url(#ghost)"'}>${creature}</g></g>`
    + `<rect x="${win.x}" y="${win.y}" width="${win.w}" height="${win.h}" filter="url(#grain)"/>`
    + (owned && (card.rarity === 'SR' || full) ? `<rect x="${win.x}" y="${win.y}" width="${win.w}" height="${win.h}" fill="url(#holo)" style="mix-blend-mode:soft-light" opacity="0.4"/>` : '')
    + (owned ? '' : `<rect x="${win.x}" y="${win.y}" width="${win.w}" height="${win.h}" fill="#0E0A1C" opacity="0.45"/>`)
    + `</g>`;
  const nameSize = card.name.length > 11 ? 18 : 21;
  const label = owned ? esc(card.name) : '? ? ?';
  const footer = `<text x="22" y="${H - 18}" font-family="${SERIF}" font-size="12" font-weight="700" fill="${gold}">${String(card.number).padStart(3, '0')}/${String(total).padStart(3, '0')}</text>`
    + `<text x="${W - 22}" y="${H - 18}" text-anchor="end" font-family="${SERIF}" font-size="13" font-weight="700" fill="${st.glow}">${st.symbol}</text>`;
  const body = full
    ? `<rect x="10" y="${H - 96}" width="${W - 20}" height="86" fill="url(#fade)"/>`
      + `<text x="${W / 2}" y="${H - 44}" text-anchor="middle" font-family="${SERIF}" font-size="${nameSize + 2}" font-style="italic" font-weight="700" fill="#FFF6D8">${label}</text>`
      + ornaments(10, 10, W - 20, H - 20, gold) + footer
    : ornaments(14, 14, W - 28, 236, gold)
      + `<path d="M40 ${282} h170" stroke="${gold}" stroke-width="0.8" opacity="0.6"/>`
      + `<text x="${W / 2}" y="${276}" text-anchor="middle" font-family="${SERIF}" font-size="${nameSize}" font-style="italic" font-weight="700" fill="${owned ? '#FFF6D8' : '#6E6890'}">${label}</text>`
      + `<path d="M${W / 2 - 6} 290 l6 -4 l6 4 l-6 4 z" fill="${gold}"/>` + footer;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>${STYLE_DEFS}
    <linearGradient id="frame" x1="0" y1="0" x2="1" y2="1">${stops}</linearGradient>
    <linearGradient id="holo" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#FF7EB6"/><stop offset="30%" stop-color="#FFE27A"/><stop offset="55%" stop-color="#7CF5D0"/><stop offset="80%" stop-color="#8FA8FF"/><stop offset="100%" stop-color="#E58CFF"/></linearGradient>
    <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0E0A1C" stop-opacity="0"/><stop offset="60%" stop-color="#0E0A1C" stop-opacity="0.85"/></linearGradient>
    <radialGradient id="sky" cx="45%" cy="40%" r="80%"><stop offset="0%" stop-color="${hsl(hue + 200, 45, 24)}"/><stop offset="100%" stop-color="${hsl(hue + 220, 55, 7)}"/></radialGradient>
    <filter id="ghost"><feColorMatrix values="0 0 0 0 0.17  0 0 0 0 0.15  0 0 0 0 0.27  0 0 0 1 0"/></filter>
    <clipPath id="win"><rect x="${win.x}" y="${win.y}" width="${win.w}" height="${win.h}" rx="8"/></clipPath>
  </defs>
  <rect width="${W}" height="${H}" rx="14" fill="url(#frame)"/>
  <rect x="5" y="5" width="${W - 10}" height="${H - 10}" rx="10" fill="#0E0A1C"/>
  ${art}${body}
</svg>`;
}

export const cardImage = (card: Parameters<typeof cardSvg>[0], total: number, owned = true) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(cardSvg(card, total, owned))}`;
