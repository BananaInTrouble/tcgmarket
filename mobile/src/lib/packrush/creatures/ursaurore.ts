import type { Bounds, DrawCtx, Species } from './style.ts';
import { curve, ellipse, facetSky, facets, gem, hsl, limb, mix, prng, type Light, type Pt } from './lowpoly.ts';

/**
 * Ursaurore (low-poly) : jeune ours au pelage de givre, assis dans la neige, le museau levé vers une aurore
 * boréale ; son souffle s'élève en un petit nuage d'étoiles. Toundra la nuit, sapins et monts enneigés.
 */

/** Polygone depuis un tracé SVG absolu simple (M, L, C, Z). */
function poly(d: string, step = 5): Pt[] {
  const t = d.match(/[MLCZ]|-?\d*\.?\d+/g) ?? [];
  let i = 0, cmd = 'M', start: Pt = [0, 0], cur: Pt = [0, 0];
  const segs: [Pt, Pt, Pt][] = [];
  const num = () => +t[i++];
  while (i < t.length) {
    if (/[MLCZ]/.test(t[i])) cmd = t[i++];
    if (cmd === 'Z') continue;
    if (cmd === 'M') { start = cur = [num(), num()]; cmd = 'L'; continue; }
    if (cmd === 'L') { const p: Pt = [num(), num()]; segs.push([cur, p, p]); cur = p; }
    else { const c1: Pt = [num(), num()], c2: Pt = [num(), num()], p: Pt = [num(), num()]; segs.push([c1, c2, p]); cur = p; }
  }
  return curve(start, segs, step);
}
const flat = (p: Pt[], fill: string, op = 1) => `<path d="M${p.map((q) => `${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join('L')}Z" fill="${fill}"${op < 1 ? ` opacity="${op}"` : ''}/>`;

const GROUND = 198;

const draw = (c: DrawCtx): string => {
  const h = c.hue;
  const fur = hsl(h + 25, 26, 33), furD = hsl(h + 35, 30, 20), pale = hsl(h - 25, 32, 80), gold = '#E9C25B';
  // Lumière de l'aurore (haut), contre-jour vert d'eau.
  const light: Light = { dir: [-0.2, -0.85, 0.55], color: '#E8FFF4', shade: '#060A1E', rim: '#7CF5C8' };
  const far: Light = { ...light, color: mix('#E8FFF4', furD, 0.5), rim: undefined };
  const r = prng(31 + c.stage);
  let s = '';

  s += `<ellipse cx="136" cy="${GROUND}" rx="64" ry="7" fill="#05030C" opacity="0.4" filter="url(#b4)"/>`;
  // Patte avant lointaine.
  s += facets(limb([[122, 122], [124, 160], [126, GROUND - 4]], [17, 14, 13]), furD, far, { size: 6, relief: 0.7, seed: 1 });
  // Corps assis (torse + croupe).
  s += facets(poly('M96 96 C88 112 88 132 92 150 C94 170 98 186 106 196 L176 196 C190 190 194 172 190 154 C186 132 174 112 156 100 C140 90 116 86 96 96 Z'), fur, light, { size: 10, relief: 1.4, seed: 2, base2: mix(fur, furD, 0.45) });
  // Cuisse proche et patte arrière posée devant, coussinet visible.
  s += facets(poly('M142 138 C158 126 184 136 190 158 C194 176 188 192 174 196 L136 196 C128 194 128 186 136 184 C144 182 148 176 146 168 C140 158 136 146 142 138 Z'), fur, light, { size: 8.5, relief: 1.3, seed: 3, base2: mix(fur, furD, 0.3) });
  s += facets(ellipse(138, 192, 17, 7.5, 12), mix(fur, pale, 0.2), light, { size: 5.5, relief: 0.8, seed: 4 });
  for (const [x, y] of [[122.5, 186], [121.5, 191], [122.5, 196]] as const) s += `<circle cx="${x}" cy="${y}" r="1.4" fill="#2A2238" opacity="0.8"/>`;
  // Constellation d'or sur la cuisse.
  const cst: Pt[] = [[156, 148], [168, 142], [178, 152], [174, 166], [162, 168]];
  s += `<polyline points="${cst.map((p) => p.join(',')).join(' ')}" fill="none" stroke="${gold}" stroke-width="0.7" opacity="0.85"/>` + cst.map(([x, y]) => gem(x, y, 2.4, '#FFFFFF', gold)).join('');
  // Bavette claire en croissant sur le poitrail.
  s += facets(poly('M92 110 C98 124 108 132 120 134 C112 126 106 116 104 104 C100 104 96 106 92 110 Z', 4), pale, light, { size: 5, relief: 0.6, seed: 6 });
  // Patte avant proche, griffes.
  s += facets(limb([[104, 116], [104, 156], [104, GROUND - 4]], [22, 17, 16]), fur, light, { size: 7, relief: 1, seed: 7, base2: mix(fur, furD, 0.2) });
  s += facets(ellipse(102, GROUND - 3, 12, 5.5, 12), mix(fur, pale, 0.15), light, { size: 4.5, relief: 0.6, seed: 8 });
  for (const dx of [-8, -4, 0, 4]) s += flat([[100 + dx, GROUND - 4], [97 + dx, GROUND + 0.5], [99.5 + dx, GROUND - 1]], '#F2F6FF');
  // Givre sur le pelage : petits éclats.
  for (let i = 0; i < 14; i++) s += gem(100 + r() * 86, 100 + r() * 90, 0.8 + r() * 1.4, '#FFFFFF', '#BFF6E8');

  // Cou et tête levée vers le ciel.
  s += facets(poly('M84 78 C86 94 98 104 118 104 C126 96 128 84 124 74 Z', 4), fur, light, { size: 7, relief: 1, seed: 9 });
  s += facets(poly('M84 84 C76 76 74 64 80 54 C88 44 104 40 116 46 C126 52 130 66 126 78 C120 88 98 94 84 84 Z', 4), fur, light, { size: 6.5, relief: 1.3, seed: 10, base2: mix(fur, furD, 0.2) });
  // Oreilles rondes.
  s += facets(ellipse(118, 42, 8, 7.5, 10), mix(fur, furD, 0.4), far, { size: 4, relief: 0.6, seed: 11 });
  s += facets(ellipse(119, 42.5, 4.5, 4, 8), mix(furD, '#8A6A8A', 0.4), far, { size: 3, seed: 12 });
  s += facets(ellipse(100, 40, 7, 7, 10), fur, light, { size: 4, relief: 0.6, seed: 13 });
  s += facets(ellipse(100, 40.5, 4, 3.8, 8), mix(furD, '#9A7A9A', 0.5), light, { size: 3, seed: 14 });
  // Museau clair pointé vers le haut, truffe, bouche entrouverte.
  s += facets(poly('M86 62 C80 56 74 50 69 47 C64 45 61 48 63 53 C66 60 74 67 82 71 C86 71 88 67 86 62 Z', 3), pale, light, { size: 4.5, relief: 0.9, seed: 15 });
  s += facets(ellipse(65, 48.5, 4.2, 3.3, 8, 0.7), '#241C34', light, { size: 3, seed: 16 }) + `<circle cx="64" cy="47.2" r="1" fill="#FFFFFF" opacity="0.7"/>`;
  s += flat([[65, 55], [72, 61], [76, 63], [68, 57]], '#2A1A30');
  // Œil levé vers l'aurore.
  s += `<circle cx="88" cy="58" r="2.8" fill="#0B0618"/><circle cx="87.6" cy="57.4" r="1.7" fill="${hsl(h - 50, 85, 64)}"/><circle cx="87.4" cy="57" r="0.8" fill="#0B0618"/><circle cx="86.7" cy="56.3" r="0.7" fill="#FFFFFF"/>`;
  s += `<path d="M84 54 Q88 51.5 92.5 54" fill="none" stroke="${furD}" stroke-width="1" stroke-linecap="round"/>`;

  // Souffle d'étoiles : petits nuages de vapeur qui montent, constellés d'éclats.
  for (const [x, y, rx, op] of [[64, 38, 7, 0.6], [70, 26, 10, 0.48], [80, 14, 13, 0.34], [94, 4, 16, 0.2]] as const) {
    s += `<ellipse cx="${x}" cy="${y}" rx="${rx * 1.3}" ry="${rx}" fill="#E8F8FF" opacity="${op * 0.5}" filter="url(#b4)"/>`;
    s += facets(ellipse(x, y, rx, rx * 0.7, 11, -0.4), '#D8F0FF', { dir: [-0.3, -0.8, 0.5], color: '#FFFFFF', shade: '#6A8AB0' }, { size: 5, relief: 0.6, seed: x, opacity: op });
  }
  for (let i = 0; i < 16; i++) { const t = r(); s += gem(64 + t * 30 + (r() - 0.5) * 22 * t, 40 - t * 38, 1 + r() * 2.4, '#FFFFFF', i % 3 ? '#BFF6E8' : gold); }
  return s;
};

/** Décor : toundra enneigée la nuit sous les rideaux d'une aurore boréale, monts, sapins facettés, neige scintillante. */
const scene = (c: DrawCtx, b: Bounds): string => {
  const h = c.hue;
  const r = prng(71 + c.stage);
  let s = facetSky(b.x0, b.y0, b.x1, b.y1, ['#050C22', '#08163A', '#0C2448', '#123452', '#0E2440', '#08142A'], 43, 30);
  for (let i = 0; i < 46; i++) s += `<circle cx="${(b.x0 + r() * (b.x1 - b.x0)).toFixed(1)}" cy="${(b.y0 + r() * 170).toFixed(1)}" r="${(0.3 + r() * 1).toFixed(2)}" fill="#FFF6E8" opacity="${(0.35 + r() * 0.6).toFixed(2)}"/>`;
  // Aurore : rideaux ondulés, bord inférieur vif qui s'estompe vers le haut, stries verticales.
  const curtains: [number, number, number, string, string, number][] = [
    [40, 26, 70, hsl(h - 50, 85, 62), hsl(h + 110, 70, 66), 1.2],
    [70, 30, 80, hsl(h - 30, 85, 64), hsl(h + 80, 70, 66), 2.6],
    [104, 20, 60, hsl(h - 60, 80, 60), hsl(h - 10, 70, 70), 4.1],
  ];
  curtains.forEach(([y, amp, len, low, high, ph], k) => {
    const id = `ursa-${k}`;
    const top: Pt[] = [], bot: Pt[] = [];
    for (let i = 0; i <= 14; i++) {
      const x = b.x0 - 10 + (i / 14) * (b.x1 - b.x0 + 20), yy = y + Math.sin(i * 0.7 + ph) * amp * 0.5 + Math.sin(i * 1.7 + ph * 2) * amp * 0.2;
      bot.push([x, yy]); top.push([x + 8, yy - len - Math.sin(i * 1.1 + ph) * 14]);
    }
    const d = `M${[...top, ...bot.reverse()].map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('L')}Z`;
    s += `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${high}" stop-opacity="0"/><stop offset="0.55" stop-color="${high}" stop-opacity="0.28"/><stop offset="0.9" stop-color="${low}" stop-opacity="0.6"/><stop offset="1" stop-color="${low}" stop-opacity="0.85"/></linearGradient></defs>`;
    s += `<path d="${d}" fill="url(#${id})" filter="url(#b2)"/>`;
    for (let i = 0; i < 26; i++) {
      const j = Math.floor(r() * 14), p = bot[14 - j], q = top[j];
      s += `<path d="M${p[0].toFixed(1)} ${p[1].toFixed(1)} L${(q[0] + (r() - 0.5) * 4).toFixed(1)} ${(q[1] + len * 0.3).toFixed(1)}" stroke="${low}" stroke-width="${(0.6 + r() * 1.4).toFixed(1)}" opacity="${(0.06 + r() * 0.12).toFixed(2)}"/>`;
    }
  });
  // Monts enneigés lointains.
  const snow: Light = { dir: [-0.3, -0.8, 0.5], color: '#E8FFF6', shade: '#081430' };
  s += facets([[b.x0, 168], [20, 140], [44, 156], [76, 128], [110, 158], [150, 134], [184, 152], [210, 130], [b.x1, 146], [b.x1, 190], [b.x0, 190]], '#3A5478', snow, { size: 18, relief: 0.8, seed: 11, base2: '#1A2A48' });
  // Sapins facettés.
  const pine = (x: number, y: number, k: number, seed: number) => {
    let o = facets([[x - 1.5 * k, y], [x - 1.5 * k, y + 6 * k], [x + 1.5 * k, y + 6 * k], [x + 1.5 * k, y]], '#1A1420', snow, { size: 4 * k, seed });
    for (let t = 0; t < 3; t++) { const w = (12 - t * 3) * k, yy = y - t * 9 * k; o += facets([[x - w, yy], [x, yy - 15 * k], [x + w, yy]], t % 2 ? '#14363C' : '#183E44', snow, { size: 6 * k, relief: 0.5, seed: seed + t }); o += flat([[x - w * 0.5, yy - 7 * k], [x, yy - 15 * k], [x + w * 0.2, yy - 9 * k]], '#DDF2FF', 0.5); }
    return o;
  };
  for (const [x, y, k] of [[6, 182, 1], [22, 186, 0.8], [-2, 192, 1.2], [200, 180, 1.1], [214, 186, 0.8], [186, 188, 0.7], [62, 178, 0.5], [170, 176, 0.5]] as const) s += pine(x, y, k, x + 100);
  // Neige au sol, congère sous l'ourson.
  s += facets([[b.x0, 192], [40, GROUND - 2], [90, GROUND - 6], [150, GROUND - 4], [200, GROUND - 2], [b.x1, 194], [b.x1, b.y1], [b.x0, b.y1]], '#B8CCE4', snow, { size: 20, relief: 0.5, seed: 21, base2: '#3A4A6E' });
  s += `<ellipse cx="130" cy="${GROUND - 2}" rx="90" ry="8" fill="#E8F4FF" opacity="0.35" filter="url(#b4)"/>`;
  for (let i = 0; i < 50; i++) { const x = b.x0 + r() * (b.x1 - b.x0), y = GROUND + r() * 70; s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(0.4 + r() * 0.8).toFixed(2)}" fill="${r() > 0.5 ? '#FFFFFF' : '#BFF6E8'}" opacity="${(0.4 + r() * 0.5).toFixed(2)}"/>`; }
  for (let i = 0; i < 5; i++) s += gem(b.x0 + r() * (b.x1 - b.x0), GROUND + 6 + r() * 40, 1.6 + r() * 1.6, '#FFFFFF', '#BFF6E8');
  return s;
};

export const ursaurore: Species = Object.assign(draw, { scene });
