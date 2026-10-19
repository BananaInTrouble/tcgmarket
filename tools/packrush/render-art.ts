// Pré-calcule les illustrations des cartes Pack Rush (décor + créature, sans cadre ni texte) en images JPEG,
// publiées avec le site dans /packrush/<set>/ : l'appli n'a plus à calculer des milliers de facettes sur le téléphone.
// Deux images par carte : <id>.jpg (illustration) et <id>-g.jpg (silhouette, carte non possédée).
// Usage : node --experimental-strip-types tools/packrush/render-art.ts [id…]   (Playwright requis)
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { cardArtSvg } from '../../mobile/src/lib/packrush/art.ts';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT ?? '/opt/node-tools/node_modules/playwright');
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');

// Cartes lues dans le catalogue du serveur (supabase/schema.sql).
const sql = readFileSync(path.join(root, 'supabase/schema.sql'), 'utf8');
const cards = [...sql.matchAll(/\('(\w+-\d+)', '(\w+)', (\d+), '(\w+)', '((?:[^']|'')+)', '(\{[^']+\})'::jsonb\)/g)]
  .map(([, id, set, number, rarity, name, art]) => ({ id, set, number: +number, rarity, name: name.replace(/''/g, "'"), art: JSON.parse(art) }));
const only = process.argv.slice(2);
const todo = only.length ? cards.filter((c) => only.includes(c.id)) : cards;

const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 250, height: 350 }, deviceScaleFactor: 2 });
for (const c of todo) {
  const dir = path.join(root, 'packrush', c.set);
  mkdirSync(dir, { recursive: true });
  for (const owned of [true, false]) {
    const svg = cardArtSvg(c as never, owned);
    await p.setContent(`<style>html,body{margin:0;background:#0B0716}</style><img width="250" height="350" src="data:image/svg+xml;utf8,${encodeURIComponent(svg)}">`);
    await p.waitForFunction(() => document.images[0]?.complete);
    const file = path.join(dir, `${c.id}${owned ? '' : '-g'}.jpg`);
    writeFileSync(file, await p.screenshot({ type: 'jpeg', quality: owned ? 84 : 70 }));
  }
  console.log(c.id, c.name);
}
await b.close();
