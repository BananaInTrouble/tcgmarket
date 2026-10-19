import type { Bounds, DrawCtx, Species } from '../style.ts';
import { curve, ellipse, facetSky, facets, gem, hsl, limb, mix, prng, type Light, type Pt } from '../lowpoly.ts';

/** Nébularaie en low-poly (essai) : raie manta géante qui plane dans un océan d'étoiles. */
const draw = (c: DrawCtx): string => {
  const h = c.hue;
  const top = hsl(h, 45, 34), belly = hsl(h + 20, 55, 22);
  const light: Light = { dir: [-0.3, -0.8, 0.55], color: '#BFF6FF', shade: '#06051A', rim: '#7CF5E0' };
  let s = '';
  // Queue.
  s += facets(limb([[111, 150], [114, 180], [124, 210], [140, 232]], [10, 6, 3, 1.5]), belly, light, { size: 4, relief: 0.4, seed: 2 });
  // Ailes (une seule forme symétrique) et corps.
  const wing = curve([111, 70], [[[136, 66], [176, 74], [214, 104]], [[200, 116], [168, 122], [140, 150]], [[128, 160], [94, 160], [82, 150]], [[54, 122], [22, 116], [8, 104]], [[46, 74], [86, 66], [111, 70]]], 7);
  s += facets(wing, top, light, { size: 10, relief: 1.6, seed: 3, base2: belly });
  // Taches de nébuleuse et constellations sur les ailes.
  for (const [x, y, rx, col] of [[60, 100, 16, hsl(h + 60, 70, 55)], [160, 98, 18, hsl(h + 140, 65, 55)], [86, 122, 10, hsl(h + 200, 70, 60)], [138, 124, 11, hsl(h + 60, 70, 60)]] as [number, number, number, string][])
    s += facets(ellipse(x, y, rx, rx * 0.6, 12, 0.3), col, light, { size: 5, relief: 0.6, seed: x, opacity: 0.55 });
  const gold = '#E9C25B';
  const constel = (pts: Pt[]) => `<polyline points="${pts.map((p) => p.join(',')).join(' ')}" fill="none" stroke="${gold}" stroke-width="0.7" opacity="0.85"/>` + pts.map(([x, y]) => gem(x, y, 3, '#FFFFFF', gold)).join('');
  s += constel([[36, 104], [52, 96], [70, 104], [80, 94]]) + constel([[142, 94], [160, 104], [176, 96], [192, 104]]);
  // Corps central et nageoires céphaliques.
  s += facets(curve([111, 62], [[[124, 64], [130, 90], [126, 130]], [[122, 150], [100, 150], [96, 130]], [[92, 90], [98, 64], [111, 62]]]), mix(top, '#FFFFFF', 0.08), light, { size: 6, relief: 1.2, seed: 9 });
  s += facets(limb([[100, 68], [94, 52], [96, 40]], [10, 7, 4]), top, light, { size: 4, relief: 0.6, seed: 10 });
  s += facets(limb([[122, 68], [128, 52], [126, 40]], [10, 7, 4]), top, light, { size: 4, relief: 0.6, seed: 11 });
  s += `<circle cx="102" cy="72" r="2.2" fill="#BFF6FF"/><circle cx="120" cy="72" r="2.2" fill="#BFF6FF"/><circle cx="102" cy="72" r="5" fill="#BFF6FF" opacity="0.25"/><circle cx="120" cy="72" r="5" fill="#BFF6FF" opacity="0.25"/>`;
  return `<g transform="translate(0 18) scale(1)">${s}</g>`;
};

const scene = (c: DrawCtx, b: Bounds): string => {
  const r = prng(77);
  let s = facetSky(b.x0, b.y0, b.x1, b.y1, ['#2BB5C9', '#13607E', '#0B2E52', '#071833', '#050C1E'], 5, 22);
  // Rayons de lumière depuis la surface.
  for (let i = 0; i < 5; i++) {
    const x = b.x0 + 20 + i * 48 + r() * 20;
    s += `<path d="M${x} ${b.y0} L${x + 30} ${b.y0} L${x + 70} ${b.y1 - 60} L${x + 10} ${b.y1 - 60} Z" fill="#BFF6FF" opacity="${(0.05 + r() * 0.06).toFixed(2)}"/>`;
  }
  // Algues facettées et fond.
  const kelpL: Light = { dir: [-0.3, -0.8, 0.5], color: '#7CF5E0', shade: '#02070F' };
  for (let i = 0; i < 6; i++) {
    const x = b.x0 + 10 + i * 42 + r() * 14, hh = 50 + r() * 50;
    s += facets(limb([[x, b.y1], [x + 6, b.y1 - hh * 0.5], [x - 4, b.y1 - hh]], [9, 6, 2]), '#0E4A4A', kelpL, { size: 5, relief: 0.5, seed: 50 + i });
  }
  s += facets([[b.x0, 236], [60, 228], [140, 238], [b.x1, 230], [b.x1, b.y1], [b.x0, b.y1]], '#0A2238', kelpL, { size: 16, relief: 0.4, seed: 60 });
  // Banc de petits poissons facettés.
  for (let i = 0; i < 9; i++) {
    const x = 20 + r() * 60 + (i % 3) * 14, y = 30 + r() * 30 + Math.floor(i / 3) * 10;
    s += `<path d="M${x} ${y} l7 -3 l3 3 l-3 3 z" fill="#BFF6FF" opacity="0.8"/><path d="M${x} ${y} l7 3 l-7 -3" fill="#4FA3C9"/><path d="M${x + 10} ${y} l4 -3 l0 6 z" fill="#7CF5E0" opacity="0.8"/>`;
  }
  // Méduses lointaines.
  for (const [x, y] of [[190, 40], [176, 200]] as Pt[]) s += facets(ellipse(x, y, 8, 6, 8), '#E58CFF', kelpL, { size: 4, seed: x, opacity: 0.5 });
  for (let i = 0; i < 16; i++) s += `<circle cx="${(b.x0 + r() * (b.x1 - b.x0)).toFixed(1)}" cy="${(b.y0 + r() * (b.y1 - b.y0)).toFixed(1)}" r="${(0.6 + r()).toFixed(1)}" fill="#DFFBFF" opacity="0.7"/>`;
  return s;
};

export const nebularaieLP: Species = Object.assign(draw, { scene });
