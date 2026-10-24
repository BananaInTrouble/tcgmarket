// Robot du catalogue (GitHub Actions, workflow « Catalogue de cartes »).
//   STEPS=pokemon-ja,pokemon-intl,pokemon-cards,pokemon-details,pokemon-zh,onepiece,riftbound,visual,assets,price-history,prices npm run build
//   VISUAL_TARGETS=pokemon-fr (index visuels à refaire, tous par défaut)
import { buildAssets } from './build-assets.mjs';
import { buildOnePiece } from './build-onepiece.mjs';
import { buildPokemonCards } from './build-pokemon-cards.mjs';
import { buildPokemonDetails } from './build-pokemon-details.mjs';
import { buildPokemonIntl } from './build-pokemon-intl.mjs';
import { buildPokemonJa } from './build-pokemon-ja.mjs';
import { buildPokemonZh } from './build-pokemon-zh.mjs';
import { buildRiftbound } from './build-riftbound.mjs';
import { buildLorcana } from './build-lorcana.mjs';
import { buildSearch } from './build-search.mjs';
import { buildTcgplayer } from './build-tcgplayer.mjs';
import { buildSetNames } from './set-names.mjs';
import { buildPriceHistory } from './price-history.mjs';
import { buildPrices } from './prices.mjs';
import { buildVisual } from './build-visual.mjs';

/** Télécharge des images dans catalog/_grab pour les examiner (étape « grab », URL dans GRAB_URLS). */
async function grab() {
  const { getBuffer, writeJson } = await import('./lib.mjs');
  const { writeFileSync, mkdirSync } = await import('node:fs');
  const { join } = await import('node:path');
  const { CATALOG } = await import('./lib.mjs');
  mkdirSync(join(CATALOG, '_grab'), { recursive: true });
  const urls = (process.env.GRAB_URLS || '').split(',').map((u) => u.trim()).filter(Boolean);
  for (const [i, u] of urls.entries()) {
    const buf = await getBuffer(u);
    if (buf) writeFileSync(join(CATALOG, '_grab', `${String(i).padStart(2, '0')}-${u.split('/').pop().split('?')[0]}`), buf);
  }
  writeJson('_grab/urls.json', urls);
}

const STEPS = {
  grab, 'pokemon-ja': buildPokemonJa, 'pokemon-intl': () => buildPokemonIntl(), 'pokemon-cards': () => buildPokemonCards(), 'pokemon-details': () => buildPokemonDetails(), 'pokemon-zh': buildPokemonZh, onepiece: buildOnePiece, riftbound: buildRiftbound, lorcana: buildLorcana, tcgplayer: buildTcgplayer, visual: () => buildVisual(), assets: buildAssets, prices: buildPrices, 'set-names': () => buildSetNames(), search: buildSearch, 'price-history': () => buildPriceHistory() };
const wanted = (process.env.STEPS || Object.keys(STEPS).join(',')).split(',').map((s) => s.trim()).filter(Boolean);
// Passage horaire des prix seul : recherche et historique refaits, rien d'autre (et rien si le guide n'a pas changé).
const pricesOnly = wanted.length === 1 && wanted[0] === 'prices';
// Noms traduits des extensions puis fichiers de recherche : toujours refaits après les catalogues.
if (!pricesOnly && !wanted.includes('set-names')) wanted.push('set-names');
if (!wanted.includes('search')) wanted.push('search');
// Relevé du jour des prix (variation depuis la veille, graphique de la fiche carte) : à chaque passage.
if (!wanted.includes('price-history')) wanted.push('price-history');

let failed = 0;
for (const name of wanted) {
  const step = STEPS[name];
  if (!step) { console.warn(`Étape inconnue : ${name}`); continue; }
  console.log(`\n=== ${name}`);
  const t = Date.now();
  try {
    if ((await step()) === false && pricesOnly) { console.log('Prix inchangés : fin du passage.'); break; }
  } catch (e) {
    failed++;
    console.error(`Étape ${name} en échec :`, e);
  }
  console.log(`=== ${name} : ${Math.round((Date.now() - t) / 1000)} s`);
}
// Une étape en échec n'empêche pas d'enregistrer les autres ; le workflow le signale quand même.
process.exitCode = failed ? 1 : 0;
