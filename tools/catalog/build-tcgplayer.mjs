// Fiches TCGplayer : n° de produit de chaque carte (lien direct vers sa fiche, comme pour Cardmarket), d'après le
// catalogue public de TCGplayer republié chaque jour par tcgcsv.com (extensions → produits, avec leur numéro).
//  - One Piece, Lorcana, Riftbound : toutes les langues (TCGplayer vend la version anglaise de la même carte) ;
//  - Pokémon : langues internationales (seulement les cartes qui n'en ont pas encore : TCGdex en donne déjà la plupart)
//    et japonais (catégorie « Pokemon Japan » de TCGplayer, noms anglais) ;
//  - cartes de sets sans extension TCGplayer correspondante (promos, McDonald's, decks…) : recherchées dans tout le
//    catalogue du jeu par nom anglais + numéro, extension au nom le plus proche en cas d'homonymes.
// Étape à lancer après les catalogues des jeux (elle complète les fichiers cards/<jeu>-<langue>/<set>.json).
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CATALOG, getJson, pool } from './lib.mjs';

const BASE = 'https://tcgcsv.com/tcgplayer';
const GAMES = [
  { game: 'onepiece', category: 68, langs: ['en', 'fr', 'ja'] },
  { game: 'lorcana', category: 71, langs: ['en', 'fr', 'de', 'it', 'ja'] },
  { game: 'riftbound', category: 89, langs: ['en', 'ko', 'zh-cn', 'zh-tw'] },
  { game: 'pokemon', category: 3, langs: ['en', 'fr', 'de', 'es', 'it', 'pt'] },
  { game: 'pokemon', category: 85, langs: ['ja'] },
];

const norm = (s) => String(s ?? '').toLowerCase().normalize('NFKD').replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');
/** Nom d'extension TCGplayer sans préfixe de série (« SV03: Obsidian Flames » → « Obsidian Flames »). */
export const groupName = (name) => norm(String(name).replace(/^[A-Z0-9]{1,8}\d*:\s*/, ''));
/** Clé d'un numéro de carte : « OP01-001 », « 001/298 », « OGN-001/298 » → « 1 » ; « TG01/TG30 » → « TG01 ». */
export const numberKey = (n) => String(n ?? '').split('/')[0].replace(/^.*-/, '').trim().toUpperCase().replace(/^0+(?=\d)/, '');

/** Extension TCGplayer d'un set : abréviation identique (« OP01 », « 14 », « OGN ») ou même nom. */
export function findGroup(set, groups, englishName) {
  const code = norm(set.code ?? set.id);
  return groups.find((g) => g.abbreviation && norm(g.abbreviation) === code)
    ?? groups.find((g) => groupName(g.name) === norm(englishName ?? set.name));
}

/** Produit d'une carte parmi ceux de son extension : même numéro, puis même nom, puis version de base (sans parenthèses). */
export function findProduct(card, byNumber) {
  const list = byNumber.get(numberKey(card.number ?? card.localId)) ?? [];
  if (list.length <= 1) return list[0];
  const name = norm(card.nameEn ?? card.name);
  const score = (p) => (norm(p.name).startsWith(name) ? 2 : 0) + (/\(/.test(p.name) ? 0 : 1);
  return [...list].sort((a, b) => score(b) - score(a) || a.productId - b.productId)[0];
}

/** Nom de carte comparable : sans précision entre parenthèses ni suffixe « - 001/165 ». */
export const cardName = (s) => norm(String(s ?? '').replace(/\s*\(.*$/, '').replace(/\s+-\s+[^-]*\d[^-]*$/, ''));

/** Mots communs entre deux noms d'extension (départage des homonymes). */
const overlap = (a, b) => {
  const wa = new Set(String(a ?? '').toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 1));
  return String(b ?? '').toLowerCase().split(/[^a-z0-9]+/).filter((w) => wa.has(w)).length;
};

/** Produit d'une carte cherché dans tout le catalogue du jeu : même nom anglais et même numéro. */
export function findAnywhere(card, setName, index, groupNames) {
  const list = index.get(`${cardName(card.nameEn ?? card.name)}|${numberKey(card.number ?? card.localId)}`) ?? [];
  if (list.length <= 1) return list[0];
  const score = (p) => overlap(setName, groupNames.get(p.groupId)) * 2 + (/\(/.test(p.name) ? 0 : 1);
  return [...list].sort((a, b) => score(b) - score(a) || a.productId - b.productId)[0];
}

export async function buildTcgplayer() {
  for (const { game, category, langs } of GAMES) {
    const groups = (await getJson(`${BASE}/${category}/groups`).catch(() => null))?.results ?? [];
    if (!groups.length) { console.warn(`TCGplayer ${game} (${category}) : extensions indisponibles`); continue; }
    const enSets = setsOf(game, 'en');
    const enName = new Map(enSets.map((s) => [s.id, s.name]));
    // Extensions TCGplayer utiles (au moins un set relié dans une langue) et leurs produits, chargés une seule fois.
    const wanted = new Map();
    for (const lang of langs) for (const s of setsOf(game, lang)) {
      const g = findGroup(s, groups, enName.get(s.id));
      if (g) wanted.set(s.id, g.groupId);
    }
    // Tout le catalogue du jeu : par extension (n° → produits) et global (nom + n° → produits).
    const products = new Map();
    const index = new Map();
    const groupNames = new Map(groups.map((g) => [g.groupId, g.name]));
    await pool(groups.map((g) => g.groupId), 6, async (groupId) => {
      const list = (await getJson(`${BASE}/${category}/${groupId}/products`).catch(() => null))?.results ?? [];
      const byNumber = new Map();
      for (const p of list) {
        const num = p.extendedData?.find((d) => d.name === 'Number')?.value;
        if (!num) continue;
        const k = numberKey(num);
        if (!byNumber.has(k)) byNumber.set(k, []);
        byNumber.get(k).push(p);
        const g = `${cardName(p.name)}|${k}`;
        if (!index.has(g)) index.set(g, []);
        index.get(g).push({ ...p, groupId });
      }
      products.set(groupId, byNumber);
    });
    let linked = 0, total = 0;
    for (const lang of langs) {
      const dir = join(CATALOG, 'cards', `${game}-${lang}`);
      if (!existsSync(dir)) continue;
      const names = new Map(setsOf(game, lang).map((s) => [s.id, enName.get(s.id) ?? s.name]));
      for (const file of readdirSync(dir)) {
        const setId = file.replace(/\.json$/, '');
        const byNumber = products.get(wanted.get(setId));
        const path = join(dir, file);
        const cards = JSON.parse(readFileSync(path, 'utf8'));
        let changed = false;
        for (const c of cards) {
          total++;
          if (c.tcgplayer) continue;
          const p = (byNumber && findProduct(c, byNumber)) || findAnywhere(c, names.get(setId), index, groupNames);
          if (p) { c.tcgplayer = p.productId; changed = true; linked++; }
        }
        if (changed) writeFileSync(path, JSON.stringify(cards));
      }
    }
    console.log(`TCGplayer ${game} (${category}) : ${wanted.size} extensions reliées, ${linked} cartes complétées (sur ${total})`);
  }
}

function setsOf(game, lang) {
  const file = join(CATALOG, 'sets', `${game}-${lang}.json`);
  if (!existsSync(file)) return [];
  return (JSON.parse(readFileSync(file, 'utf8')).blocs ?? []).flatMap((b) => b.sets);
}
