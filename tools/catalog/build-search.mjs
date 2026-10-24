// Fichiers de recherche : toutes les cartes d'un jeu et d'une langue dans un seul fichier compact
// (catalog/search/<jeu>-<langue>.json), pour chercher par nom (y compris traduit) sans charger chaque extension.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CATALOG, writeJson } from './lib.mjs';

/**
 * Colonnes : id, setId, localId, number, name, nameEn, nameFr, rarity, image, prix USD, facettes, attributs, n° produit TCGplayer,
 * prix Cardmarket (EUR : ventes sur 7 jours, sinon 30 jours, toutes les ventes, offres), n° produit Cardmarket,
 * chemin de la fiche Cardmarket, période de ce prix (7, 30, 0 = toutes les ventes, -1 = offres, -2 = offre la plus basse),
 * variantes [clé, n° produit Cardmarket, prix, n° produit TCGplayer de la photo, période (0 = 7 jours), visuel, id officiel],
 * noms dans d'autres langues ({ de, es, ja, 'zh-tw'… }).
 */
export function buildSearch() {
  const dir = join(CATALOG, 'sets');
  if (!existsSync(dir)) return;
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    const key = f.replace(/\.json$/, '');
    const sets = JSON.parse(readFileSync(join(dir, f), 'utf8'));
    const rows = [];
    for (const b of sets.blocs) {
      for (const s of b.sets) {
        const file = join(CATALOG, 'cards', key, `${s.id}.json`);
        if (!existsSync(file)) continue;
        for (const c of JSON.parse(readFileSync(file, 'utf8'))) {
          rows.push([c.id, s.id, c.localId, c.number, c.name, c.nameEn ?? '', c.nameFr ?? '', c.rarity ?? '', c.image ?? '', c.price?.value ?? 0, c.facets ?? 0, c.attrs ?? 0, c.tcgplayer ?? 0, c.cm?.avg7 ?? c.cm?.avg30 ?? c.cm?.avg ?? c.cm?.trend ?? c.cm?.low ?? 0, c.cm?.id ?? 0, c.cmPath ?? 0, c.cm?.avg7 ? 7 : c.cm?.avg30 ? 30 : c.cm?.avg ? 0 : c.cm?.trend ? -1 : -2, c.v?.length ? c.v.map((v) => [v.k, v.id ?? 0, v.p ?? 0, v.tp ?? 0, v.t ?? 0, v.img ?? 0, v.o ?? 0]) : 0, c.n ?? 0, c.ct ?? 0]);
        }
      }
    }
    if (!rows.length) continue;
    writeJson(`search/${key}.json`, { columns: ['id', 'setId', 'localId', 'number', 'name', 'nameEn', 'nameFr', 'rarity', 'image', 'priceUsd', 'facets', 'attrs', 'tcgplayer', 'eur', 'cardmarket', 'cmPath', 'eurDays', 'variants', 'names', 'cardtrader'], rows });
    console.log(`search/${key}.json : ${rows.length} cartes`);
  }
}
