import { bloom, gloss, hsl, softShadow, sparkle, speckles, type Bounds, type DrawCtx, type Species } from './style.ts';
import { band, f, feather, grad, lum, P, smooth, soften, spline, tube, type Pt } from './legendkit.ts';

/**
 * Griffastre : griffon céleste de profil, avant d'aigle et arrière de lion, une serre levée, ailes dressées
 * « adossées » comme sur un blason. Les rémiges secondaires sont des fenêtres sur le ciel étoilé.
 */
export const griffastre: Species = (c) => {
  const { pal } = c;
  const { ink, body: vbody, line, shadow, rim, gild, fur, eyeA, constellation } = lum(`griffastre-${c.stage}`, c, [0.25, 0.15], '#FFE2B0');
  const ground = (x: number, y: number, rx: number) => softShadow(`M${x - rx} ${y} a${rx} ${rx * 0.14} 0 1 0 ${rx * 2} 0 a${rx} ${rx * 0.14} 0 1 0 ${-rx * 2} 0 Z`, 0.6, 'b4');
  const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

  // Aile : os (épaule, coude, poignet, main), rémiges primaires et secondaires, couvertures.
  const wing = (S: Pt, E: Pt, W: Pt, H: Pt, prim: Pt[], sec: Pt[], far: boolean) => {
    let o = '';
    const fillP = far ? pal.shade : pal.body;
    // Secondaires (derrière) : attachées le long du coude → poignet, pointes vers l'arrière.
    sec.forEach((tip, i) => {
      const base = lerp(W, E, i / (sec.length - 1) * 0.85 + 0.05);
      const fe = feather(base, tip, far ? 5 : 7.5, 0.2);
      o += ink(fe.d, pal.deep, far ? 0.9 : 1.1);
      if (!far) {
        o += `<path d="${fe.d}" fill="${i % 2 ? pal.accent2 : pal.accent}" opacity="0.18"/>`;
        for (let k = 0; k < 3; k++) {
          const q = lerp(base, tip, 0.45 + k * 0.17 + c.r() * 0.05);
          o += `<circle cx="${f(q[0] + (c.r() - 0.5) * 4)}" cy="${f(q[1] + (c.r() - 0.5) * 4)}" r="${f(0.6 + c.r() * 0.7)}" fill="#FFF6D8"/>`;
        }
        const q = lerp(base, tip, 0.86);
        o += gild(`M${P(lerp(q, tip, -0.2))} Q${P([q[0] + 2, q[1] + 2])} ${P(tip)}`, 0.7);
      }
      o += line(fe.rachis, 0.5, far ? pal.ink : pal.gold, ' opacity="0.55"');
    });
    // Primaires : le long du poignet → main.
    prim.forEach((tip, i) => {
      const base = lerp(W, H, i / (prim.length - 1));
      const fe = feather(base, tip, 4, -0.15);
      o += ink(fe.d, i % 2 ? fillP : far ? pal.deep : pal.light, far ? 0.9 : 1.1);
      o += shadow(feather(lerp(base, tip, 0.05), tip, 1.8, -0.1).d, pal.shade, far ? 0.4 : 0.55, 'fine');
      o += line(fe.rachis, 0.5, pal.ink, ' opacity="0.55"');
    });
    return o;
  };

  let s = '';
  s += ground(128, 206, 76);

  // ——— Aile lointaine ———
  {
    const S: Pt = [100, 100], E: Pt = [102, 68], W: Pt = [112, 42], H: Pt = [124, 30];
    const prim: Pt[] = [[104, 8], [114, 4], [126, 4], [138, 8], [148, 14]];
    const sec: Pt[] = [[146, 50], [146, 64], [142, 78]];
    s += wing(S, E, W, H, prim, sec, true);
    const cv = `M${P(S)} C98 88 98 76 ${P(E)} C106 58 108 50 ${P(W)} C116 36 120 32 ${P(H)} C132 34 134 42 130 52 C124 66 116 84 110 100 Z`;
    s += ink(cv, pal.shade, 1.1) + shadow(cv, pal.deep, 0.5, 'xhatch');
  }

  // ——— Queue de lion, pompon d'étoiles ———
  const tailPath = spline([[194, 134], [210, 146], [214, 168], [206, 186], [196, 192]], 8);
  s += ink(tube(tailPath, (u) => 3.4 - u * 1.6), pal.body, 1.2);
  s += shadow(band(tailPath, (u) => 3.4 - u * 1.6, -1, 0), pal.shade, 0.8, 'fine');
  s += ink('M196 188 C188 186 182 192 184 198 C186 204 194 206 200 202 C204 198 202 190 196 188 Z', pal.deep, 1.1);
  s += fur(c, 192, 196, 6, 160, 4, 5, pal.light, 0.7) + sparkle(190, 198, 3, pal.gold, false);

  // ——— Pattes lointaines (sombres) ———
  const farHind = 'M142 140 C142 154 148 164 158 170 C162 176 164 186 162 196 C160 200 156 202 154 204 C156 208 166 208 172 207 C174 202 170 198 170 194 C172 184 172 174 170 166 C166 156 162 146 160 136 Z';
  s += ink(farHind, pal.shade, 1.2) + shadow(farHind, pal.deep, 0.55, 'xhatch');
  // Patte avant lointaine (aigle) : culotte de plumes, tarse écailleux, serres.
  s += ink('M88 146 C86 160 90 172 94 180 L106 180 C108 170 108 158 106 146 Z', pal.shade, 1.1);
  s += fur(c, 98, 172, 6, 100, 4, 6, pal.ink, 0.6);
  s += ink('M95 178 C94 186 94 192 95 199 L104 199 C104 192 104 186 105 178 Z', pal.shade, 1);
  s += shadow('M95 178 C94 186 94 192 95 199 L104 199 C104 192 104 186 105 178 Z', pal.deep, 0.6, 'xhatch');
  for (let k = 0; k < 5; k++) s += line(`M95 ${182 + k * 3.4} q5 2 9 0`, 0.5, pal.ink, ' opacity="0.6"');
  for (const [a, b] of [[[97, 198], [82, 205]], [[99, 199], [90, 207]], [[102, 198], [110, 205]]] as [Pt, Pt][]) {
    s += ink(tube(spline([a, b], 4), (u) => 2.6 - u), pal.shade, 0.9);
    s += ink(`M${P(b)} q${b[0] < a[0] ? -3 : 3} 1 ${b[0] < a[0] ? -4 : 4} 4 q${b[0] < a[0] ? 2 : -2} -2 ${b[0] < a[0] ? 2 : -2} -4 Z`, pal.ink, 0.6);
  }

  // ——— Corps de lion ———
  const body = 'M60 122 C56 138 64 150 80 153 C100 156 122 156 140 150 C150 147 156 144 162 142 C176 146 190 144 194 134 C198 122 190 110 176 106 C158 102 136 106 116 102 C104 98 94 88 88 74 L56 74 C54 90 56 106 60 122 Z';
  s += ink(body, pal.body, 1.7);
  s += shadow('M80 153 C100 156 122 156 140 150 C150 147 156 144 162 142 C150 144 136 146 120 146 C100 146 88 144 78 138 Z', pal.shade, 0.85, 'fine');
  
  // Côtes et muscles suggérés, pelage.
  s += line('M128 118 C134 128 136 140 132 150', 0.6, pal.ink, ' opacity="0.4"') + line('M140 120 C146 130 148 142 146 152', 0.6, pal.ink, ' opacity="0.35"');
  s += fur(c, 120, 154, 6, 95, 5, 12) + fur(c, 160, 112, 6, 160, 4, 8);
  s += rim('M114 100 C134 104 160 104 178 108 C193 112 201 126 197 142', pal.glow, 1.1);
  // Constellation dorée sur la cuisse.
  s += constellation([[160, 124], [172, 120], [182, 130], [176, 142], [164, 140]], pal.gold);

  // ——— Patte arrière proche (lion) ———
  const hind = 'M158 118 C176 108 196 120 194 140 C193 152 190 160 192 168 C194 178 190 190 188 198 C192 200 195 204 192 208 L174 208 C170 206 172 202 177 200 C179 192 179 184 177 178 C170 172 162 166 158 158 C150 146 148 128 158 118 Z';
  s += `<path d="${hind}" fill="${pal.body}"/>`;
  s += line('M166 114 C180 110 196 122 194 140 C193 152 190 160 192 168 C194 178 190 190 188 198 C192 200 195 204 192 208 L174 208 C170 206 172 202 177 200 C179 192 179 184 177 178 C170 172 162 166 158 158', 1.6);
  s += shadow('M194 140 C193 152 190 160 192 168 C194 178 190 190 188 198 L183 200 C185 190 186 180 184 170 C182 160 186 150 186 140 C186 130 180 122 172 118 C184 120 194 128 194 140 Z', pal.shade, 0.85, 'fine');
  s += line('M174 208 C176 204 180 204 182 208 M182 208 C184 204 188 204 190 208', 0.7, pal.ink, ' opacity="0.7"');
  s += line('M158 158 C164 150 172 146 180 148', 0.6, pal.ink, ' opacity="0.45"');
  s += fur(c, 176, 140, 7, 110, 4, 8);

  // Omoplate, flanc : musculature suggérée.
  s += line('M100 142 C112 132 118 120 116 106', 0.7, pal.ink, ' opacity="0.45"') + line('M104 146 C114 140 122 134 128 124', 0.5, pal.ink, ' opacity="0.3"');
  s += shadow('M100 142 C112 132 118 120 116 106 C124 116 124 132 114 146 Z', pal.shade, 0.35, 'fine');
  s += fur(c, 108, 152, 5, 100, 6, 14, pal.ink, 0.6);
  // ——— Cou et poitrail emplumés ———
  const neck = 'M50 66 C48 86 52 108 60 122 C66 136 80 142 92 138 C100 130 104 116 100 100 C96 90 90 80 86 66 C78 56 60 56 50 66 Z';
  s += ink(neck, pal.light, 1.4);
  s += shadow('M100 100 C104 116 100 130 92 138 C96 124 96 110 90 98 C86 90 82 80 80 70 C86 76 92 88 100 100 Z', pal.shade, 0.6, 'fine');
  // Écailles de plumes en rangs (gravure).
  for (let row = 0; row < 7; row++) {
    for (let k = 0; k < 4; k++) {
      const x = 58 + k * 9 + (row % 2) * 4.5 + row * 1.6, y = 84 + row * 8;
      if (x > 96 - row * 0.4 || (row > 5 && k > 2)) continue;
      s += `<path d="M${f(x - 4)} ${f(y)} Q${f(x)} ${f(y + 5)} ${f(x + 4)} ${f(y)}" fill="none" stroke="${pal.ink}" stroke-width="0.55" opacity="0.5"/>`;
    }
  }
  s += rim('M50 66 C48 86 52 108 60 122', pal.glow, 1.1);
  // Lisière plumes → pelage : pointes de plumes débordant sur l'épaule.
  for (let i = 0; i < 7; i++) {
    const t = i / 6, x = 92 + t * 9 + Math.sin(t * 3) * 2, y = 84 + t * 54;
    const fe = feather([x - 8, y - 3], [x + 5, y + 2], 2.2, 0.3);
    s += `<path d="${fe.d}" fill="${pal.light}"/>` + line(fe.rachis.replace(/^M[^Q]+/, `M${f(x - 2)} ${f(y)} `), 0.5, pal.ink, ' opacity="0.5"');
  }
  s += gild('M58 118 C68 126 82 128 94 122 M62 124 l2 5 l2 -5', 1);

  // ——— Aile proche ———
  {
    const S: Pt = [112, 102], E: Pt = [126, 70], W: Pt = [148, 46], H: Pt = [168, 32];
    const prim: Pt[] = [[170, 2], [184, 3], [197, 9], [207, 19], [214, 31], [216, 44], [214, 57]];
    const sec: Pt[] = [[208, 70], [202, 82], [192, 92], [180, 100], [166, 106], [152, 110]];
    s += wing(S, E, W, H, prim, sec, false);
    // Couvertures : bande le long du bras, rangs de plumes écailleux.
    const cov = `M${P(S)} C114 88 118 78 ${P(E)} C134 60 140 52 ${P(W)} C154 40 160 35 ${P(H)} C172 34 174 38 170 44 C162 52 152 60 144 70 C136 80 128 94 122 106 Z`;
    s += ink(cov, pal.body, 1.4);
    // Grandes couvertures : rang de plumes courtes à la base des rémiges.
    for (let i = 0; i < 9; i++) {
      const t = i / 8;
      const a: Pt = [170 - t * 48, 44 + t * 60];
      const fe = feather(lerp(a, [a[0] - 6, a[1] - 6], 0.9), [a[0] + 10 + (1 - t) * 4, a[1] + 8 - t * 2], 3.6, 0.2);
      s += ink(fe.d, i % 2 ? pal.light : pal.body, 0.8) + line(fe.rachis, 0.4, pal.ink, ' opacity="0.5"');
    }
    for (const [pts, sz] of [
      [[[150, 44], [158, 40], [164, 38]], 3.6], [[[130, 70], [138, 62], [146, 54], [154, 48], [162, 44]], 4],
      [[[120, 92], [126, 84], [132, 76], [140, 68], [148, 60]], 4.4],
    ] as [Pt[], number][]) {
      for (const [x, y] of pts) s += `<path d="M${f(x - sz)} ${f(y - 2)} Q${f(x)} ${f(y + sz * 0.9)} ${f(x + sz)} ${f(y - 2)}" fill="none" stroke="${pal.ink}" stroke-width="0.6" opacity="0.55"/>`;
    }
    s += shadow('M170 44 C162 52 152 60 144 70 C136 80 128 94 122 106 L118 102 C126 90 134 78 142 68 C150 58 160 50 170 44 Z', pal.shade, 0.7, 'fine');
    s += rim(`M${P(S)} C112 84 116 72 ${P(E)} C132 50 140 40 ${P(W)} C156 24 164 18 ${P(H)}`, pal.glow, 1.3);
    s += gild(`M118 96 C120 84 124 76 132 66 c5 -6 12 -5 11 1 c-1 4 -5 3 -4 0`, 0.9);
    s += speckles(c, 184, 84, 20, 12, 12) + constellation([[160, 96], [174, 90], [186, 80], [196, 70]], '#FFF6D8');
  }

  // ——— Tête d'aigle ———
  const head = 'M86 66 C88 52 80 40 66 38 C56 37 48 42 44 50 C40 52 36 54 33 57 C38 60 44 64 48 70 C52 74 62 76 72 74 C80 72 84 70 86 66 Z';
  s += ink(head, pal.light, 1.6);
  s += shadow('M86 66 C88 52 80 40 66 38 C76 44 80 54 78 64 C76 70 70 74 64 76 C72 76 82 72 86 66 Z', pal.shade, 0.6, 'fine');
  // Plumes de nuque, longues et effilées vers l'arrière.
  for (const [a, b] of [[[78, 44], [100, 40]], [[82, 52], [104, 52]], [[84, 60], [102, 64]]] as [Pt, Pt][]) {
    const fe = feather(a, b, 3, 0.3);
    s += ink(fe.d, pal.light, 0.9) + line(fe.rachis, 0.4, pal.ink, ' opacity="0.5"');
  }
  s += ink('M78 44 C84 40 92 38 100 40 C92 42 86 44 82 48 Z', pal.gold, 0.6, ' opacity="0.9"');
  // Bec crochu : cire, mandibule supérieure, inférieure.
  s += ink('M48 50 C41 50 35 53 31 58 C28 63 28 69 30 74 C31 70 34 67 37 66 C41 65 45 65 49 63 Z', pal.belly, 1.4);
  s += shadow('M30 74 C31 70 34 67 37 66 C41 65 45 65 49 63 L48 60 C42 61 36 62 32 66 Z', pal.shade, 0.55, 'fine');
  s += ink('M37 67 C41 69 45 69 49 66 C46 71 42 72 38 71 Z', pal.belly, 1);
  s += ink('M48 50 C46 54 46 60 49 64 C52 60 52 54 48 50 Z', pal.gold, 0.8);
  s += `<circle cx="42" cy="56" r="1" fill="${pal.ink}"/>`;
  s += line('M33 57 C36 54 40 53 44 53', 0.6, '#FFF6D8', ' opacity="0.7"');
  // Œil d'aigle sous l'arcade sourcilière.
  s += eyeA(58, 54, 4.6, pal.eye, { angle: 6, slit: false, open: 0.55 });
  s += line('M50 49 C56 46 64 47 70 51', 1.6) + line('M62 58 C66 60 70 60 74 58', 0.6, pal.ink, ' opacity="0.5"');
  s += rim('M66 38 C56 37 48 42 44 50', pal.glow, 1.1);
  // Diadème céleste : trois étoiles d'or sur un filet.
  s += gild('M54 40 C62 32 74 30 84 36', 1) + sparkle(56, 38, 2.6, pal.gold, false) + sparkle(68, 32, 3.4, pal.gold, false) + sparkle(80, 33, 2.6, pal.gold, false);

  // ——— Patte avant proche, levée (serres repliées) ———
  const thigh = 'M62 116 C56 126 56 140 62 148 C68 152 78 150 84 144 C88 134 86 122 80 116 Z';
  s += `<path d="${thigh}" fill="${pal.light}"/>` + line('M58 128 C56 138 58 144 62 148 C68 152 78 150 84 144 C86 140 87 134 86 128', 1.3);
  s += shadow('M84 144 C78 150 68 152 62 148 C70 146 78 140 82 130 Z', pal.shade, 0.6, 'fine');
  s += fur(c, 70, 144, 7, 120, 5, 7);
  const tars = spline([[66, 146], [56, 156], [48, 164]], 6);
  s += ink(tube(tars, (u) => 4.4 - u * 0.8), pal.belly, 1.2);
  s += shadow(band(tars, (u) => 4.4 - u * 0.8, -1, 0), pal.shade, 0.5, 'fine');
  for (let k = 0; k < 5; k++) s += line(`M${f(61 - k * 3)} ${f(148 + k * 3.2)} l4 4`, 0.5, pal.ink, ' opacity="0.6"');
  for (const pts of [[[48, 164], [38, 166], [33, 174]], [[48, 166], [44, 174], [45, 181]], [[50, 164], [56, 170], [55, 177]]] as Pt[][]) {
    s += ink(tube(spline(pts, 4), (u) => 2.4 - u * 0.8), pal.belly, 1);
    const e = pts[2], d = pts[1];
    const dx = e[0] - d[0], dy = e[1] - d[1], l = Math.hypot(dx, dy);
    const ux = dx / l, uy = dy / l;
    s += ink(`M${f(e[0] - uy * 1.8)} ${f(e[1] + ux * 1.8)} Q${f(e[0] + ux * 5)} ${f(e[1] + uy * 5)} ${f(e[0] + ux * 3 - uy * 4)} ${f(e[1] + uy * 3 + ux * 4)} L${f(e[0] + uy * 1.8)} ${f(e[1] - ux * 1.8)} Z`, pal.ink, 0.6);
  }
  s += rim('M62 116 C56 126 56 140 62 148', pal.glow, 0.8);

  // ——— Éclats ———
  for (const [x, y, z] of [[24, 30, 3.4], [16, 110, 2.4], [30, 196, 2.6], [212, 112, 2.4]] as const) s += sparkle(x, y, z, pal.glow, false);
  return soften(`<g transform="translate(116 206) scale(1.02) translate(-116 -206)">${s}</g>`, pal.deep);
};

/**
 * Décor : un pic au-dessus d'une mer de nuages, à l'aube. Ciel qui passe de la nuit (dernières étoiles) à l'ambre,
 * planète annelée qui se lève, sommets lointains bleutés, hirondelles, et la corniche de roche où se tient le griffon.
 */
griffastre.scene = (c: DrawCtx, b: Bounds) => {
  const { pal } = c;
  const id = `griffastre-${c.stage}-bg`;
  const sh = c.hue * 0.3 + 235 * 0.7;
  const W = b.x1 - b.x0, H = b.y1 - b.y0;
  let s = `<defs>${grad(`${id}-sky`, [[0, hsl(sh, 40, 12)], [0.4, hsl(sh - 10, 35, 26)], [0.62, hsl(sh + 60, 35, 44)], [0.78, hsl(32, 60, 66)], [1, hsl(28, 50, 60)]])}</defs>`;
  s += `<rect x="${b.x0}" y="${b.y0}" width="${W}" height="${H}" fill="url(#${id}-sky)"/>`;
  for (let i = 0; i < 30; i++) {
    const y = b.y0 + c.r() * 100;
    s += `<circle cx="${f(b.x0 + c.r() * W)}" cy="${f(y)}" r="${f(0.3 + c.r() * 0.8)}" fill="#FFF6D8" opacity="${f((1 - (y - b.y0) / 110) * (0.4 + c.r() * 0.5))}"/>`;
  }
  // Planète annelée qui se lève derrière la mer de nuages.
  const PX = 70, PY = 58, PR = 40;
  s += `<circle cx="${PX}" cy="${PY}" r="${PR + 10}" fill="#FFE7B8" opacity="0.25" filter="url(#soft)"/>`;
  s += `<ellipse cx="${PX}" cy="${PY}" rx="${PR * 1.9}" ry="${PR * 0.42}" fill="none" stroke="#F6E2BC" stroke-width="2.4" opacity="0.5" transform="rotate(-16 ${PX} ${PY})"/>`;
  s += `<circle cx="${PX}" cy="${PY}" r="${PR}" fill="${hsl(28, 40, 74)}" stroke="#140F24" stroke-width="0.6" opacity="0.9"/>`;
  for (let k = 0; k < 5; k++) s += `<path d="M${PX - PR + 2} ${PY - 18 + k * 9} Q${PX} ${PY - 22 + k * 9} ${PX + PR - 2} ${PY - 16 + k * 9}" fill="none" stroke="${hsl(20, 35, 56)}" stroke-width="${k % 2 ? 1.6 : 0.8}" opacity="0.5"/>`;
  s += `<path d="M${PX + 4} ${PY - PR} A${PR} ${PR} 0 0 1 ${PX + 4} ${PY + PR} A${PR * 0.7} ${PR} 0 0 0 ${PX + 4} ${PY - PR} Z" fill="url(#fine)" opacity="0.6"/>`;
  s += `<path d="M${PX - PR * 1.9} ${PY + 14} A${PR * 1.9} ${PR * 0.42} 0 0 0 ${PX + PR * 1.9} ${PY - 2}" fill="none" stroke="#F6E2BC" stroke-width="2.4" opacity="0.75" transform="rotate(-16 ${PX} ${PY})"/>`;
  // Sommets lointains (perspective atmosphérique : pâles, bleutés).
  const far = `M${b.x0} 176 L14 156 L26 164 L44 138 L58 154 L70 146 L86 170 L120 172 L134 150 L146 160 L160 144 L176 168 L${b.x1} 166 L${b.x1} 200 L${b.x0} 200 Z`;
  s += `<path d="${far}" fill="${hsl(sh + 20, 22, 58)}" opacity="0.85" stroke="#140F24" stroke-width="0.4"/>`;
  s += `<path d="M44 138 L50 156 L58 154 M134 150 L138 162 M160 144 L164 160" fill="none" stroke="#FFF6D8" stroke-width="0.6" opacity="0.6"/>`;
  // Mer de nuages : bancs festonnés, plus clairs en avant.
  for (const [y, col, op] of [[172, hsl(sh + 40, 22, 62), 0.75], [184, hsl(sh + 70, 28, 70), 0.8], [198, hsl(30, 35, 76), 0.85]] as [number, string, number][]) {
    let d = `M${b.x0} ${y + 6}`;
    let x = b.x0, k = 0;
    while (x < b.x1) { const w = 10 + ((k * 7 + y) % 4) * 5; d += ` q${f(w / 2)} ${f(-w * 0.55)} ${w} 0`; x += w; k++; }
    d += ` L${b.x1} ${b.y1} L${b.x0} ${b.y1} Z`;
    s += `<path d="${d}" fill="${col}" opacity="${op}" stroke="#140F24" stroke-width="0.4"/>`;
  }
  // Hirondelles au loin.
  for (const [x, y, k] of [[20, 96, 1], [34, 104, 0.8], [14, 110, 0.7], [150, 128, 0.7]] as const) {
    s += `<path d="M${x - 5 * k} ${y - 2 * k} Q${x - 2 * k} ${y - 1 * k} ${x} ${y + 1 * k} Q${x + 2 * k} ${y - 1 * k} ${x + 5 * k} ${y - 3 * k}" fill="none" stroke="#140F24" stroke-width="${0.9 * k}" stroke-linecap="round"/>`;
  }
  // Corniche : roche taillée, face ombrée, arête éclairée par l'aube.
  const ledge = `M62 205 C80 200 140 200 ${b.x1} 202 L${b.x1} ${b.y1} L76 ${b.y1} C72 230 66 220 62 205 Z`;
  s += `<path d="${ledge}" fill="${hsl(sh + 10, 18, 26)}" stroke="#140F24" stroke-width="0.9"/>`;
  s += `<path d="${ledge}" fill="url(#xhatch)" opacity="0.55"/>`;
  s += `<path d="M62 205 C80 200 140 200 ${b.x1} 202 L${b.x1} 210 C150 208 90 208 66 212 Z" fill="${hsl(30, 30, 46)}" opacity="0.9"/>`;
  s += `<path d="M62 205 C80 200 140 200 ${b.x1} 202" fill="none" stroke="#FFE7B8" stroke-width="1" opacity="0.8"/>`;
  s += `<path d="M90 212 L96 226 M128 210 L124 222 L130 236 M172 212 L178 230 M66 214 L70 230" fill="none" stroke="#140F24" stroke-width="0.6" opacity="0.7"/>`;
  s += `<path d="${smooth([[200, 203], [206, 196], [214, 198], [222, 203]])}" fill="${hsl(sh + 10, 18, 30)}" stroke="#140F24" stroke-width="0.6"/>`;
  return soften(s, pal.deep);
};
