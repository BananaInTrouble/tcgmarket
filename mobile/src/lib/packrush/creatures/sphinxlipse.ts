import { constellation, eyeA, fur, gild, ground, hsl, ink, line, rim, shadow, sparkle, type Bounds, type DrawCtx, type Species } from './style.ts';
import { band, f, feather, grad, P, spline, tube, type Pt } from './legendkit.ts';

/**
 * Sphinxlipse : sphinx ailé couché de profil, tête de lionne de face coiffée d'un némès rayé d'or, ailes en
 * faucille dressées sur le dos. Une éclipse totale (disque noir, couronne solaire filée) lui sert de diadème.
 */
export const sphinxlipse: Species = (c) => {
  const { pal } = c;
  const id = `sphinxlipse-${c.stage}`;
  const EC: Pt = [80, 46];
  let s = '';

  // ——— Éclipse : couronne solaire, rayons filés, disque noir ———
  s += `<circle cx="${EC[0]}" cy="${EC[1]}" r="38" fill="${pal.glow}" opacity="0.4" filter="url(#soft)"/>`;
  s += `<circle cx="${EC[0]}" cy="${EC[1]}" r="30" fill="#FFF6D8" opacity="0.55" filter="url(#soft)"/>`;
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2 + 0.05, len = 30 + (i % 4 === 0 ? 20 : i % 2 ? 6 : 12) + c.r() * 5;
    const r0 = 25, bend = 0.12 * (i % 2 ? 1 : -1);
    const p0: Pt = [EC[0] + Math.cos(a) * r0, EC[1] + Math.sin(a) * r0];
    const p1: Pt = [EC[0] + Math.cos(a + bend) * len, EC[1] + Math.sin(a + bend) * len];
    const pm: Pt = [EC[0] + Math.cos(a + bend * 0.3) * (r0 + len) / 2, EC[1] + Math.sin(a + bend * 0.3) * (r0 + len) / 2];
    s += `<path d="M${P(p0)} Q${P(pm)} ${P(p1)}" fill="none" stroke="${i % 4 === 0 ? pal.gold : '#FFF6D8'}" stroke-width="${i % 4 === 0 ? 0.9 : 0.5}" opacity="${i % 4 === 0 ? 0.95 : 0.6}" stroke-linecap="round"/>`;
  }
  s += `<circle cx="${EC[0]}" cy="${EC[1]}" r="25" fill="none" stroke="#FFF6D8" stroke-width="2.4" opacity="0.8" filter="url(#glow)"/>`;
  s += `<circle cx="${EC[0]}" cy="${EC[1]}" r="23.5" fill="#05030A" stroke="${pal.gold}" stroke-width="0.9"/>`;
  s += `<circle cx="${EC[0] + 17}" cy="${EC[1] - 16}" r="4" fill="#FFF6D8" filter="url(#glow)"/>` + sparkle(EC[0] + 17, EC[1] - 16, 6, '#FFF6D8', false);

  // ——— Aile lointaine (derrière, sombre) ———
  const wingShape = (dx: number, dy: number) => {
    const q = (x: number, y: number) => `${f(x + dx)} ${f(y + dy)}`;
    return `M${q(100, 122)} C${q(104, 100)} ${q(116, 82)} ${q(134, 72)} C${q(154, 62)} ${q(178, 60)} ${q(196, 50)} C${q(204, 46)} ${q(210, 38)} ${q(212, 30)} C${q(216, 42)} ${q(212, 56)} ${q(202, 66)} C${q(196, 84)} ${q(188, 104)} ${q(176, 122)} C${q(160, 130)} ${q(130, 130)} ${q(100, 122)} Z`;
  };
  s += ink(wingShape(-14, 0), pal.shade, 1.1) + shadow(wingShape(-14, 0), pal.deep, 0.6, 'xhatch');

  // ——— Queue enroulée au sol ———
  const tailPath = spline([[198, 196], [194, 212], [160, 216], [126, 212], [110, 204]], 8);
  s += ink(tube(tailPath, (u) => 3.6 - u * 1.4), pal.body, 1.2);
  s += shadow(band(tailPath, (u) => 3.6 - u * 1.4, 1, 0), pal.shade, 0.7, 'fine');
  s += ink('M112 198 C104 196 98 200 99 206 C100 211 108 212 113 208 C116 205 116 200 112 198 Z', pal.deep, 1);
  s += gild('M150 210 l0 8 M154 210 l0 8', 0.9);

  s += ground(112, 206, 96);
  // ——— Patte avant lointaine ———
  const farFore = 'M84 140 C76 150 74 168 76 180 C64 184 52 186 40 188 C30 189 26 194 28 199 C30 201 36 201 42 201 L94 200 C98 190 98 176 96 164 Z';
  s += ink(farFore, pal.shade, 1.2) + shadow(farFore, pal.deep, 0.5, 'xhatch');

  // ——— Corps couché ———
  const body = 'M66 154 C70 140 84 132 100 130 C124 128 148 134 168 144 C188 152 204 166 206 184 C207 196 202 204 194 207 L80 207 C70 200 64 178 66 154 Z';
  s += ink(body, pal.body, 1.7);
  s += shadow('M206 180 C207 194 202 204 194 207 L120 207 C150 204 176 200 190 188 C198 178 200 166 196 154 C202 162 205 170 206 180 Z', pal.shade, 0.85, 'fine');
  s += shadow('M80 207 C70 200 64 176 66 152 C72 170 80 190 96 207 Z', pal.shade, 0.6, 'fine');
  s += rim('M100 130 C124 128 148 134 168 144 C188 152 204 166 206 184', pal.glow, 1.2);
  s += fur(c, 130, 180, 6, 95, 6, 16) + fur(c, 112, 140, 6, 80, 4, 10);
  // Omoplate, côtes, flanc : volumes gravés.
  s += line('M96 128 C108 136 112 150 106 166', 0.8, pal.ink, ' opacity="0.55"');
  s += shadow('M96 128 C108 136 112 150 106 166 C102 154 100 140 96 128 Z', pal.shade, 0.5, 'fine');
  for (const k of [0, 1, 2, 3]) s += line(`M${118 + k * 9} ${150 + k * 1.5} C${122 + k * 9} ${162 + k} ${122 + k * 9} ${174 + k} ${118 + k * 9} ${184}`, 0.5, pal.ink, ' opacity="0.3"');
  s += shadow('M100 196 C120 192 140 194 150 200 L150 207 L96 207 Z', pal.shade, 0.6, 'fine');
  s += fur(c, 122, 200, 5, 90, 8, 22, pal.ink, 0.6);
  // Cuisse repliée, patte arrière ramenée vers l'avant.
  const haunch = 'M146 166 C152 150 180 148 194 164 C204 178 200 196 188 204 L136 206 C126 206 124 198 132 195 C142 192 152 193 158 190 C150 184 144 176 146 164 Z';
  s += ink(haunch, pal.body, 1.4);
  s += shadow('M194 164 C204 178 200 196 188 204 L170 205 C184 198 192 184 190 172 C188 162 182 156 176 152 C184 152 190 156 194 164 Z', pal.shade, 0.85, 'fine');
  s += line('M132 206 C133 202 136 201 138 206 M138 206 C139 202 142 201 144 206', 0.7, pal.ink, ' opacity="0.7"');
  s += constellation([[158, 160], [170, 154], [182, 162], [178, 176], [166, 180]], pal.gold);
  s += fur(c, 172, 186, 6, 120, 4, 8);

  // ——— Aile proche : faucille dressée, couvertures, rémiges dorées ———
  {
    const w = wingShape(0, 0);
    const s0 = s.length;
    s += `<defs><clipPath id="${id}-w"><path d="${w}"/></clipPath></defs>`;
    let inner = `<path d="${w}" fill="${pal.body}"/>`;
    // Rémiges : trois rangs de plumes imbriquées, pointes vers l'arrière et le bas.
    const tier = (n: number, y0: number, len: number, wid: number, fills: string[], gold: boolean) => {
      let o = '';
      for (let i = n - 1; i >= 0; i--) {
        const t = i / (n - 1);
        const a: Pt = [104 + t * 100, y0 + 18 - t * 62];
        const dir: Pt = [0.35 + t * 0.5, 0.94 - t * 0.4];
        const l = len * (1 - t * 0.25);
        const b: Pt = [a[0] + dir[0] * l, a[1] + dir[1] * l];
        const fe = feather(a, b, wid, 0.2);
        o += ink(fe.d, fills[i % fills.length], 0.7);
        o += line(fe.rachis, 0.4, pal.ink, ' opacity="0.45"');
        if (gold) o += gild(`M${P([a[0] + (b[0] - a[0]) * 0.8, a[1] + (b[1] - a[1]) * 0.8])} L${P(b)}`, 0.7);
      }
      return o;
    };
    inner += tier(16, 100, 40, 5.5, [pal.light, pal.belly, pal.body], true);
    inner += tier(15, 90, 22, 4.6, [pal.body, pal.shade], false);
    inner += tier(14, 80, 14, 3.8, [pal.shade, pal.deep], false);
    // Couvertures : bande foncée le long du bord d'attaque, écailles de plumes.
    inner += `<path d="M100 122 C104 100 116 82 134 72 C154 62 178 60 196 50 C204 46 210 38 212 30 C210 42 204 50 194 56 C176 66 152 70 134 80 C120 88 110 102 106 124 Z" fill="${pal.deep}"/>`;
    for (let i = 0; i < 14; i++) {
      const t = i / 13;
      const x = 110 + t * 90, y = 100 - t * 46;
      inner += `<path d="M${f(x - 4)} ${f(y - 4)} Q${f(x)} ${f(y + 2)} ${f(x + 4)} ${f(y - 4)}" fill="none" stroke="${pal.gold}" stroke-width="0.6" opacity="0.8"/>`;
    }
    inner += shadow('M100 122 C130 130 160 130 176 122 C188 104 196 84 202 66 C196 90 186 110 172 120 C150 126 124 126 100 122 Z', pal.deep, 0.35, 'fine');
    s += `<g clip-path="url(#${id}-w)">${inner}</g>`;
    s += `<path d="${w}" fill="none" stroke="${pal.ink}" stroke-width="1.5" stroke-linejoin="round"/>`;
    s += rim('M104 100 C116 82 134 72 C154 62 178 60 196 50 C204 46 210 38 212 30'.replace('C154', 'S154').replace('M104 100 C116 82 134 72 S154 62', 'M104 100 C116 82 124 76 134 72 S154 62'), pal.glow, 1.3);
    s += gild('M118 98 C130 84 148 76 168 72 c10 -2 16 -8 14 -12 c-2 -3 -6 -1 -5 2', 0.9);
    s = s.slice(0, s0) + `<g transform="translate(0 6)">${s.slice(s0)}</g>`;
  }

  // ——— Patte avant proche (allongée) ———
  const fore = 'M70 142 C62 152 62 170 66 186 C54 189 40 191 28 193 C17 194 13 199 15 204 C17 207 23 207 30 207 L90 207 C96 198 96 184 92 170 C89 156 84 146 70 142 Z';
  s += shadow('M88 160 C96 176 98 194 92 207 L110 207 C108 190 102 172 92 156 Z', pal.deep, 0.55, 'fine');
  s += ink(fore, pal.body, 1.5);
  s += line('M84 150 C90 162 92 176 90 190', 0.6, pal.ink, ' opacity="0.5"') + fur(c, 80, 170, 6, 100, 4, 6);
  s += shadow('M66 186 C54 189 40 191 28 193 L30 199 C46 198 62 197 78 196 C86 194 92 188 92 178 C90 186 80 186 66 186 Z', pal.shade, 0.7, 'fine');
  s += line('M18 205 C18 200 22 198 24 205 M24 206 C25 200 29 199 31 206 M31 207 C32 201 36 200 38 207', 0.7, pal.ink, ' opacity="0.75"');
  s += rim('M28 193 C40 191 54 189 66 186', pal.glow, 0.8);
  s += gild('M58 188 C60 196 60 202 58 207 M62 188 C64 196 64 202 62 207', 0.9);

  // ——— Tête : némès rayé, visage de lionne de face ———
  const nemes = 'M80 62 C64 62 56 72 55 86 L46 128 C52 134 62 134 67 128 L69 108 L91 108 L93 128 C98 134 108 134 114 128 L105 86 C104 72 96 62 80 62 Z';
  s += `<defs><clipPath id="${id}-n"><path d="${nemes}"/></clipPath></defs>`;
  let ns = `<path d="${nemes}" fill="${pal.deep}"/>`;
  for (let k = 0; k < 16; k++) {
    const y = 66 + k * 4.4;
    ns += `<path d="M40 ${f(y + 6)} Q80 ${f(y - 8)} 120 ${f(y + 6)}" fill="none" stroke="${pal.gold}" stroke-width="1.9" opacity="0.85"/>`;
  }
  ns += shadow('M105 86 L114 128 C108 134 98 134 93 128 L91 108 Z', '#000', 0.25, 'fine');
  s += `<g clip-path="url(#${id}-n)">${ns}</g>`;
  s += `<path d="${nemes}" fill="none" stroke="${pal.ink}" stroke-width="1.5" stroke-linejoin="round"/>`;
  s += ink('M60 76 C66 70 74 68 80 68 C86 68 94 70 100 76 L100 80 C94 75 86 73 80 73 C74 73 66 75 60 80 Z', pal.gold, 0.8);
  // Visage.
  const face = 'M80 72 C70 72 64 78 64 88 C64 98 68 105 73 110 C76 114 78 117 80 117 C82 117 84 114 87 110 C92 105 96 98 96 88 C96 78 90 72 80 72 Z';
  s += ink(face, pal.light, 1.4);
  s += shadow('M96 88 C96 98 92 105 87 110 C84 114 82 117 80 117 C84 110 88 100 89 92 C90 84 88 78 86 74 C92 76 96 82 96 88 Z', pal.shade, 0.6, 'fine');
  s += shadow('M73 110 C76 114 78 117 80 117 C82 117 84 114 87 110 C84 112 76 112 73 110 Z', pal.shade, 0.5, 'fine');
  // Museau, nez, bouche (sévère), front.
  s += ink('M74 102 C74 98 78 96 80 96 C82 96 86 98 86 102 C86 107 82 109 80 109 C78 109 74 107 74 102 Z', pal.belly, 0.7);
  s += ink('M76.5 97.5 L83.5 97.5 C83 100 81.5 101.5 80 102 C78.5 101.5 77 100 76.5 97.5 Z', pal.shade, 0.8);
  s += line('M80 102 L80 105 M80 105 C78 107 76 107 74.5 106 M80 105 C82 107 84 107 85.5 106', 0.8);
  for (const [x, y] of [[76, 103.5], [77.5, 105], [84, 103.5], [82.5, 105]] as const) s += `<circle cx="${x}" cy="${y}" r="0.45" fill="${pal.ink}"/>`;
  s += line('M80 76 L80 92', 0.5, pal.ink, ' opacity="0.4"') + line('M76 80 C77 84 78 88 79 92 M84 80 C83 84 82 88 81 92', 0.45, pal.ink, ' opacity="0.35"');
  // Yeux en amande, fard d'or prolongé (khôl).
  s += eyeA(72.5, 89, 4.4, pal.eye, { angle: 10, open: 0.48 });
  s += `<g transform="translate(160 0) scale(-1 1)">${eyeA(72.5, 89, 4.4, pal.eye, { angle: 10, open: 0.48 })}</g>`;
  s += gild('M67.5 88.5 C66 89.5 64.5 90.5 63.5 92.5 M92.5 88.5 C94 89.5 95.5 90.5 96.5 92.5', 1);
  s += line('M66 84 C69 82 74 82 77 84 M94 84 C91 82 86 82 83 84', 0.8, pal.ink, ' opacity="0.8"');
  // Uræus : croissant d'éclipse d'or au front.
  s += `<circle cx="80" cy="68" r="4.2" fill="#05030A" stroke="${pal.gold}" stroke-width="1.2"/>` + `<path d="M77 65 a4.2 4.2 0 0 1 6 0" fill="none" stroke="#FFF6D8" stroke-width="0.8"/>`;
  // Collier ousekh : arcs de perles sur le poitrail.
  for (let k = 0; k < 3; k++) {
    const r = 18 + k * 5;
    s += `<path d="M${80 - r} ${f(116 + k * 1.5)} A${r} ${r * 0.62} 0 0 0 ${80 + r} ${f(116 + k * 1.5)}" fill="none" stroke="${k === 1 ? pal.accent : pal.gold}" stroke-width="${k === 1 ? 2.4 : 1.3}"/>`;
    for (let i = 1; i < 9; i++) {
      const a = Math.PI * (i / 9);
      s += `<circle cx="${f(80 - Math.cos(a) * r)}" cy="${f(116 + k * 1.5 + Math.sin(a) * r * 0.62)}" r="${k === 2 ? 1.3 : 0.9}" fill="${pal.gold}" stroke="${pal.ink}" stroke-width="0.3"/>`;
    }
  }
  s += line('M58 116 A22 13.6 0 0 0 102 116', 0.6, pal.ink, ' opacity="0.6"');

  for (const [x, y, z] of [[180, 18, 3.2], [24, 120, 2.6], [212, 120, 2.2], [146, 40, 2]] as const) s += sparkle(x, y, z, pal.glow, false);
  return s;
};

/**
 * Décor : désert lunaire en pleine éclipse. Ciel nocturne en plein jour, horizon embrasé tout autour, dunes
 * gravées, pyramides et obélisques à pointe d'or au loin, et le socle de pierre gravé où repose le sphinx,
 * visité par deux scarabées d'étoiles.
 */
sphinxlipse.scene = (c: DrawCtx, b: Bounds) => {
  const { pal } = c;
  const id = `sphinxlipse-${c.stage}-bg`;
  const dh = 32 + ((((c.hue % 360) + 360) % 360) / 360 - 0.5) * 24;
  const sk = 250 + ((((c.hue % 360) + 360) % 360) / 360 - 0.5) * 50;
  const W = b.x1 - b.x0, H = b.y1 - b.y0;
  let s = `<defs>${grad(`${id}-sky`, [[0, hsl(sk, 35, 9)], [0.45, hsl(sk + 20, 28, 20)], [0.66, hsl(dh - 10, 55, 48)], [0.74, hsl(dh, 60, 62)], [1, hsl(dh, 40, 40)]])}</defs>`;
  s += `<rect x="${b.x0}" y="${b.y0}" width="${W}" height="${H}" fill="url(#${id}-sky)"/>`;
  for (let i = 0; i < 34; i++) {
    const y = b.y0 + c.r() * 130;
    s += `<circle cx="${f(b.x0 + c.r() * W)}" cy="${f(y)}" r="${f(0.3 + c.r() * 0.8)}" fill="#FFF6D8" opacity="${f(0.3 + c.r() * 0.5)}"/>`;
  }
  // Pyramides et obélisques lointains (pâles, peu contrastés).
  const hz = 158;
  const farCol = hsl(dh + 10, 25, 46), farSh = hsl(dh + 200, 20, 30);
  for (const [x, w, h] of [[150, 46, 34], [188, 30, 22], [124, 22, 14]] as const) {
    s += `<path d="M${x - w / 2} ${hz} L${x} ${hz - h} L${x + w / 2} ${hz} Z" fill="${farCol}" stroke="#140F24" stroke-width="0.4" opacity="0.9"/>`;
    s += `<path d="M${x} ${hz - h} L${x + w / 2} ${hz} L${x + w * 0.1} ${hz} Z" fill="${farSh}" opacity="0.45"/>`;
    s += `<path d="M${x - 2} ${hz - h + 3} L${x} ${hz - h} L${x + 2} ${hz - h + 3} Z" fill="${pal.gold}"/>`;
  }
  for (const [x, h] of [[24, 40], [40, 30]] as const) {
    s += `<path d="M${x - 3} ${hz} L${x - 2} ${hz - h} L${x} ${hz - h - 5} L${x + 2} ${hz - h} L${x + 3} ${hz} Z" fill="${farCol}" stroke="#140F24" stroke-width="0.4"/>`;
    s += `<path d="M${x - 2} ${hz - h} L${x} ${hz - h - 5} L${x + 2} ${hz - h} Z" fill="${pal.gold}"/>`;
  }
  // Dunes : plans successifs, crêtes éclairées par l'anneau de l'éclipse, hachures fines.
  for (const [y, l, amp, op] of [[hz, 40, 4, 0.9], [172, 34, 7, 0.95], [188, 26, 8, 1]] as const) {
    const d = `M${b.x0} ${y + 2} C40 ${y - amp} 80 ${y + amp} 120 ${y} C160 ${y - amp} 190 ${y + amp * 0.5} ${b.x1} ${y - 2} L${b.x1} ${b.y1} L${b.x0} ${b.y1} Z`;
    s += `<path d="${d}" fill="${hsl(dh, 32, l)}" stroke="#140F24" stroke-width="0.5"/>`;
    s += `<path d="${d}" fill="url(#fine)" opacity="${0.25 + (y - hz) * 0.01}"/>`;
    s += `<path d="M${b.x0} ${y + 2} C40 ${y - amp} 80 ${y + amp} 120 ${y} C160 ${y - amp} 190 ${y + amp * 0.5} ${b.x1} ${y - 2}" fill="none" stroke="#FFE7B8" stroke-width="0.7" opacity="${op * 0.6}"/>`;
  }
  // Socle gravé du sphinx.
  const top = 204;
  s += `<path d="M${b.x0} ${top} L${b.x1} ${top} L${b.x1} ${b.y1} L${b.x0} ${b.y1} Z" fill="${hsl(dh + 10, 22, 30)}" stroke="#140F24" stroke-width="0.9"/>`;
  s += `<path d="M${b.x0} ${top} L${b.x1} ${top} L${b.x1} ${top + 5} L${b.x0} ${top + 5} Z" fill="${hsl(dh, 35, 52)}"/>`;
  s += `<path d="M${b.x0} ${top + 5} L${b.x1} ${top + 5} L${b.x1} ${b.y1} L${b.x0} ${b.y1} Z" fill="url(#xhatch)" opacity="0.45"/>`;
  s += `<path d="M${b.x0} ${top + 9} H${b.x1} M${b.x0} ${top + 28} H${b.x1}" stroke="${pal.gold}" stroke-width="0.6" opacity="0.6"/>`;
  // Frise de glyphes célestes entre les deux filets.
  for (let i = 0; i < 12; i++) {
    const x = b.x0 + 10 + i * 18, y = top + 18.5;
    const g = i % 4;
    s += g === 0 ? `<circle cx="${x}" cy="${y}" r="3.4" fill="none" stroke="${pal.gold}" stroke-width="0.6" opacity="0.7"/><circle cx="${x}" cy="${y}" r="1" fill="${pal.gold}" opacity="0.7"/>`
      : g === 1 ? `<path d="M${x - 3} ${y + 3} a3.4 3.4 0 1 0 0 -6 a2.6 2.6 0 1 1 0 6 Z" fill="none" stroke="${pal.gold}" stroke-width="0.6" opacity="0.7"/>`
      : g === 2 ? `<path d="M${x} ${y - 4} L${x + 1} ${y - 1} L${x + 4} ${y} L${x + 1} ${y + 1} L${x} ${y + 4} L${x - 1} ${y + 1} L${x - 4} ${y} L${x - 1} ${y - 1} Z" fill="none" stroke="${pal.gold}" stroke-width="0.6" opacity="0.7"/>`
      : `<path d="M${x - 3} ${y + 4} V${y - 2} M${x - 3} ${y - 2} Q${x} ${y - 6} ${x + 3} ${y - 2} V${y + 4}" fill="none" stroke="${pal.gold}" stroke-width="0.6" opacity="0.7"/>`;
  }
  // Scarabées d'étoiles sur le rebord.
  for (const [x, k] of [[10, 0.9], [206, 0.8]] as const) {
    s += `<g transform="translate(${x} ${top - 1}) scale(${k})"><ellipse cx="0" cy="-3" rx="4" ry="3" fill="${hsl(c.hue + 150, 40, 30)}" stroke="#140F24" stroke-width="0.6"/>`
      + `<path d="M0 -6 V0 M-3 -1 l-2 2 M3 -1 l2 2 M-3.6 -4 l-2 -1 M3.6 -4 l2 -1" stroke="#140F24" stroke-width="0.5"/><circle cx="0" cy="-6.6" r="1.4" fill="#140F24"/><circle cx="-1.5" cy="-3.5" r="0.6" fill="${pal.gold}"/><circle cx="1.6" cy="-2.6" r="0.5" fill="${pal.gold}"/></g>`;
  }
  return s;
};
