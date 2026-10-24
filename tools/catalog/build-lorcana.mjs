// Disney Lorcana : cartes de LorcanaJSON (https://lorcanajson.org, données de l'appli officielle Ravensburger) en
// anglais, français, allemand et italien, visuels officiels de chaque langue, prix Cardmarket (jeu n° 19).
//  - une extension par set (1, 2… 14), par quête des Illumineurs (Q1…) et par groupe de promos (P1, P2, C1…) ;
//  - variantes : normale et foil (« None » + « Silver ») pour les raretés de base, foil seule pour les Enchantées,
//    Épiques, Iconiques… ; fiche Cardmarket de chaque carte donnée par LorcanaJSON (commune à toutes les langues) ;
//  - raretés, encres et types : identifiants anglais (traduits par l'app), noms des autres langues dans `n`.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { CATALOG, getBuffer, getJson, getText, writeJson } from './lib.mjs';
import { saveLogos, scrydexLogo } from './logos.mjs';
import { applyCardmarketPrices } from './variants.mjs';
import { foilAsHolo } from './build-riftbound.mjs';

export const LANGS = ['en', 'fr', 'de', 'it'];
const SOURCE = (lang) => `https://lorcanajson.org/files/current/${lang}/allCards.json`;
export const CM_PRICES = 'https://downloads.s3.cardmarket.com/productCatalog/priceGuide/price_guide_19.json';
const CM_PRODUCTS = 'https://downloads.s3.cardmarket.com/productCatalog/productList/products_singles_19.json';

/** Pages produits du site officiel (logo de chaque extension), par code d'extension. */
const OFFICIAL_PAGES = {
  1: 'the-first-chapter', 2: 'rise-of-the-floodborn', 3: 'into-the-inklands', 4: 'ursulas-return', 5: 'shimmering-skies',
  6: 'azurite-sea', 7: 'archazias-island', 8: 'reign-of-jafar', 9: 'fabled', 10: 'whispers', 11: 'winterspell',
  12: 'wilds-unknown', 13: 'attack-of-the-vine', 14: 'hyperia-city', Q1: 'deep-trouble', Q2: 'palace-heist', Q3: 'great-hunny-rescue',
};

/** Score d'une image candidate au titre de logo : bandeau large (648 × 300 sur le site), fond transparent, « logo » dans l'adresse. */
export function logoScore(url, { width, height, transparent }) {
  const ratio = width / height;
  if (width < 300 || ratio < 1.6 || ratio > 4.2) return -1;
  const file = url.split('/').pop();
  const named = /logo/i.test(file);
  // Bandeaux, visuels de cartes, photos de produits : écartés, sauf fichier nommé « logo ».
  if (!named && (/card|background|header|teaser|product|playmat|photo|glimmer|vineling|encounter|snow|spill/i.test(url) || transparent < 0.3)) return -1;
  return (named ? 10 : 0) + (/_en[._-]|\/en\//i.test(url) ? 3 : 0) + (width === 648 ? 4 : 0) + transparent * 5;
}

/** Logo d'une extension trouvé sur sa page produit officielle (anglaise), ou null. */
async function officialLogo(setId) {
  const slug = OFFICIAL_PAGES[setId];
  if (!slug) return null;
  const html = await getText(`https://www.disneylorcana.com/en-US/product/${slug}`).catch(() => null);
  if (!html) return null;
  const urls = [...new Set([...html.matchAll(/https:\/\/ravensburger\.cloud\/[^"' )]+?\.png/g)].map((m) => m[0]))]
    .filter((u) => logoScore(u, { width: 648, height: 300, transparent: 1 }) >= 0)
    .sort((a, b) => Number(/logo/i.test(b.split('/').pop())) - Number(/logo/i.test(a.split('/').pop())));
  let best = null, bestScore = 0;
  for (const u of urls.slice(0, 30)) {
    const buf = await getBuffer(u).catch(() => null);
    if (!buf) continue;
    const img = sharp(buf);
    const meta = await img.metadata().catch(() => null);
    if (!meta?.width) continue;
    const alpha = meta.hasAlpha ? (await img.extractChannel('alpha').stats().catch(() => null))?.channels[0]?.mean ?? 255 : 255;
    const score = logoScore(u, { width: meta.width, height: meta.height, transparent: 1 - alpha / 255 });
    if (score > bestScore) { best = u; bestScore = score; }
  }
  return best;
}

const cmName = (s) => String(s ?? '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g, '');

/**
 * Fiches Cardmarket des cartes que LorcanaJSON ne relie pas encore (nouvelle extension) : l'extension Cardmarket
 * d'un set est celle qui contient le plus de ses noms (parmi celles qu'aucun set connu n'utilise déjà), puis chaque
 * carte reçoit la fiche de même nom ; plusieurs cartes et fiches de même nom (version de base, Enchantée…) sont
 * appariées dans l'ordre (numéro croissant, fiche la plus ancienne d'abord). Renvoie identifiant de carte → fiche.
 */
export function cardmarketFallback(cards, products) {
  const known = new Map(cards.filter((c) => c.externalLinks?.cardmarketId).map((c) => [c.externalLinks.cardmarketId, c]));
  const byExp = new Map();
  for (const p of products) {
    if (!byExp.has(p.idExpansion)) byExp.set(p.idExpansion, []);
    byExp.get(p.idExpansion).push(p);
  }
  const usedExp = new Set();
  for (const [exp, list] of byExp) if (list.some((p) => known.has(p.idProduct))) usedExp.add(exp);
  const missingBySet = new Map();
  for (const c of cards) {
    if (c.externalLinks?.cardmarketId) continue;
    const set = setOf(c);
    if (!missingBySet.has(set)) missingBySet.set(set, []);
    missingBySet.get(set).push(c);
  }
  const out = new Map();
  for (const [, list] of missingBySet) {
    const wanted = new Set(list.map((c) => cmName(c.fullName ?? c.name)));
    let best = null, bestHits = 0;
    for (const [exp, prods] of byExp) {
      if (usedExp.has(exp)) continue;
      const hits = new Set(prods.map((p) => cmName(p.name)).filter((n) => wanted.has(n))).size;
      if (hits > bestHits) { best = exp; bestHits = hits; }
    }
    // Au moins la moitié des noms retrouvés : sinon l'extension n'est pas encore sur Cardmarket.
    if (best == null || bestHits < wanted.size / 2) continue;
    usedExp.add(best);
    const prods = new Map();
    for (const p of byExp.get(best)) {
      const k = cmName(p.name);
      if (!prods.has(k)) prods.set(k, []);
      prods.get(k).push(p);
    }
    const group = new Map();
    for (const c of list) {
      const k = cmName(c.fullName ?? c.name);
      if (!group.has(k)) group.set(k, []);
      group.get(k).push(c);
    }
    for (const [k, cs] of group) {
      const ps = (prods.get(k) ?? []).sort((a, b) => a.idProduct - b.idProduct);
      cs.sort((a, b) => a.number - b.number);
      cs.forEach((c, i) => { const p = ps[Math.min(i, ps.length - 1)]; if (p) out.set(c.id, p.idProduct); });
    }
  }
  return out;
}

/**
 * Visuel officiel : direct pour Ravensburger (son serveur refuse le proxy wsrv.nl, 403, mais accepte l'affichage
 * depuis l'app), sinon réduit par wsrv.nl (WebP de 360 px ; 900 px sur la fiche).
 */
export const smallImage = (url) => {
  if (!url || /^https?:\/\/api\.lorcana\.ravensburger\.com\//.test(url)) return url;
  return `https://wsrv.nl/?url=${encodeURIComponent(url.replace(/^https?:\/\//, ''))}&w=360&output=webp`;
};

/** Identifiant stable d'une rareté (« Super Rare » → « super_rare »), depuis la carte anglaise. */
export const rarityId = (r) => String(r ?? '').trim().toLowerCase().replace(/[^a-z]+/g, '_').replace(/^_|_$/g, '') || undefined;
const idOf = (s) => String(s ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

/** Extension d'une carte : groupe de promos, sinon son set (« 1 », « Q1 »). */
export const setOf = (c) => String(c.promoGrouping ?? c.setCode);

/** Numéro imprimé : « 1/204 », « 207/204 » (Enchantée), « 1/P1 » (promos : « 1 TFC • EN • 1/P1 »). */
export function printedNumber(c) {
  const parts = String(c.fullIdentifier ?? '').split('•').map((x) => x.trim()).filter(Boolean);
  return parts.find((x) => x.includes('/')) ?? String(c.number);
}

/** Variantes : normale si « None » fait partie des finitions, foil si une autre finition existe. */
export function variantsOf(c, cardmarketId) {
  const types = c.foilTypes ?? [];
  const keys = [];
  if (!types.length || types.includes('None')) keys.push('normal');
  if (types.some((t) => t !== 'None')) keys.push('foil');
  return keys.map((k) => ({ k, ...(cardmarketId ? { id: cardmarketId } : {}) }));
}

/** Attributs de la fiche : illustrateur, coût, force, volonté, éclat (« lore »), histoire (film). */
export function attrsOf(c) {
  const a = {
    illustrator: c.artistsText ?? c.artists?.join(', '),
    cost: c.cost != null ? String(c.cost) : undefined,
    strength: c.strength != null ? String(c.strength) : undefined,
    willpower: c.willpower != null ? String(c.willpower) : undefined,
    lore: c.lore != null ? String(c.lore) : undefined,
    story: c.story,
  };
  const out = Object.fromEntries(Object.entries(a).filter(([, v]) => v !== undefined && v !== null && v !== ''));
  return Object.keys(out).length ? out : undefined;
}

/** Groupes de promos (codes LorcanaJSON) : nom anglais (Lorcast). */
const PROMO_NAMES = {
  C1: 'Lorcana Challenge Promos', C2: 'Lorcana Challenge Year 3', CC1: "Curator's Collection: Heroines Edition",
  D23: 'D23 Collection', DIS: 'EPCOT Festival of the Arts', PD1: 'Promo Deck 1', RPH: 'Rapunzel Promo',
};
/** Nom d'un groupe de promos ou d'une extension. */
const setName = (meta, id) => meta?.name ?? PROMO_NAMES[id] ?? (/^P\d+$/.test(id) ? `Promo Set ${id.slice(1)}` : id);

/** Tri : sets du plus récent au plus ancien, puis quêtes et promos. */
const kindRank = (id) => (/^\d+$/.test(id) ? 0 : /^Q\d+$/.test(id) ? 1 : 2);

export async function buildLorcana() {
  const data = {};
  for (const lang of LANGS) {
    data[lang] = await getJson(SOURCE(lang)).catch(() => null);
    if (!data[lang]?.cards?.length) console.warn(`Lorcana ${lang} : LorcanaJSON indisponible`);
  }
  const en = data.en;
  if (!en?.cards?.length) return;

  // Fiche Cardmarket et données de référence par carte (identifiant LorcanaJSON commun aux langues).
  const ref = new Map(en.cards.map((c) => [c.id, c]));
  const names = new Map();
  for (const lang of LANGS) for (const c of data[lang]?.cards ?? []) names.set(c.id, { ...(names.get(c.id) ?? {}), [lang]: c.fullName ?? c.name });
  const setNames = new Map();
  for (const lang of LANGS) for (const [id, s] of Object.entries(data[lang]?.sets ?? {})) setNames.set(id, { ...(setNames.get(id) ?? {}), [lang]: s.name });

  const [guide, products] = await Promise.all([getJson(CM_PRICES).catch(() => null), getJson(CM_PRODUCTS).catch(() => null)]);
  const fallbackCm = cardmarketFallback(en.cards, products?.products ?? []);
  if (fallbackCm.size) console.log(`Lorcana : ${fallbackCm.size} cartes reliées à Cardmarket par leur nom`);
  const prices = { prices: new Map((guide?.priceGuides ?? []).map((x) => [x.idProduct, foilAsHolo(x)])) };
  if (!prices.prices.size) console.warn('Lorcana : guide des prix Cardmarket indisponible');

  const allSets = [...new Set(en.cards.map(setOf))].map((id) => ({ id }));
  // Logo officiel (page produit du site Disney Lorcana), sinon Scrydex.
  const logos = await saveLogos(allSets, 'lorcana', async (s) => [await officialLogo(s.id), scrydexLogo(`lorcana-${s.id}`.toLowerCase(), 'lorcana')]).catch(() => new Map());
  // Scrydex renvoie le même logo générique « Lorcana » pour les extensions qu'il n'a pas : écarté (code affiché).
  const hashes = new Map();
  for (const [id, rel] of logos) {
    const file = join(CATALOG, rel);
    if (!existsSync(file)) { logos.delete(id); continue; }
    const h = createHash('sha1').update(readFileSync(file)).digest('hex');
    hashes.set(h, [...(hashes.get(h) ?? []), id]);
  }
  for (const ids of hashes.values()) {
    if (ids.length < 3) continue;
    for (const id of ids) { rmSync(join(CATALOG, logos.get(id)), { force: true }); logos.delete(id); }
  }

  for (const lang of LANGS) {
    const src = data[lang];
    if (!src?.cards?.length) continue;
    const bySet = new Map();
    for (const c of src.cards) {
      const r = ref.get(c.id) ?? c;
      const setId = setOf(r);
      if (!setId || setId === 'undefined') continue;
      if (!bySet.has(setId)) bySet.set(setId, []);
      const n = names.get(c.id) ?? {};
      const name = c.fullName ?? c.name;
      const other = Object.fromEntries(Object.entries(n).filter(([l, v]) => l !== lang && l !== 'en' && v !== name && v !== n.en));
      const cm = r.externalLinks?.cardmarketId ?? c.externalLinks?.cardmarketId ?? fallbackCm.get(c.id);
      const inks = [r.color, ...(r.colors ?? [])].filter(Boolean).flatMap((x) => String(x).split(/[-/]/)).map(idOf).filter(Boolean);
      bySet.get(setId).push({
        id: `${setId}-${String(c.number).padStart(3, '0')}${c.variant ? c.variant.toLowerCase() : ''}`,
        localId: String(c.number),
        number: printedNumber(c),
        name,
        ...(n.en && n.en !== name ? { nameEn: n.en } : {}),
        image: smallImage(c.images?.full ?? r.images?.full),
        rarity: rarityId(r.rarity),
        attrs: attrsOf(c),
        facets: {
          ink: [...new Set(inks)],
          type: [idOf(r.type)].filter(Boolean),
        },
        ...(Object.keys(other).length ? { n: other } : {}),
        v: variantsOf(r, cm),
      });
    }
    const sets = [...bySet.keys()].map((id) => {
      const meta = src.sets?.[id] ?? en.sets?.[id];
      const logo = logos.get(id);
      return {
        id, code: id, name: setName(meta, id), names: setNames.get(id), count: bySet.get(id).length,
        ...(meta?.releaseDate ? { releaseDate: meta.releaseDate } : {}), ...(logo ? { logo } : {}),
      };
    }).sort((a, b) => kindRank(a.id) - kindRank(b.id) || (b.releaseDate ?? '').localeCompare(a.releaseDate ?? '') || b.id.localeCompare(a.id, undefined, { numeric: true }));
    let priced = 0;
    for (const [id, list] of bySet) {
      list.sort((a, b) => Number(a.localId) - Number(b.localId) || a.id.localeCompare(b.id));
      priced += applyCardmarketPrices(list, prices);
      writeJson(`cards/lorcana-${lang}/${id}.json`, list);
    }
    const group = (pred, id, label) => ({ id, ...label, sets: sets.filter(pred) });
    const blocs = [
      group((s) => kindRank(s.id) === 0, 'sets', { name: 'Disney Lorcana' }),
      group((s) => kindRank(s.id) === 1, 'quests', { name: "Illumineer's Quest", names: { en: "Illumineer's Quest", fr: 'Quêtes des Illumineurs', de: 'Die Luminari Chroniken', it: 'Avventure degli Illuminatori' } }),
      group((s) => kindRank(s.id) === 2, 'promos', { name: 'Promos', names: { en: 'Promos', fr: 'Promos', de: 'Promos', it: 'Promo' } }),
    ].filter((b) => b.sets.length);
    writeJson(`sets/lorcana-${lang}.json`, { built: new Date().toISOString(), blocs });
    console.log(`Lorcana ${lang} : ${src.cards.length} cartes, ${sets.length} extensions, ${priced} avec prix Cardmarket, logos ${logos.size}`);
  }
  await buildLorcanaJa();
}

// ───────────────────────────── Japonais : recherche officielle Takara Tomy ─────────────────────────────
const JA_ROOT = 'https://www.takaratomy.co.jp';
const JA_UA = { 'user-agent': 'Mozilla/5.0 (TCGMarket catalogue)', 'accept-language': 'ja', referer: `${JA_ROOT}/products/disneylorcana/cardlist/` };
const JA_RARITY = { コモン: 'common', アンコモン: 'uncommon', レア: 'rare', スーパーレア: 'super_rare', レジェンダリー: 'legendary', エンチャンテッド: 'enchanted', エピック: 'epic', アイコニック: 'iconic', プロモーションカード: 'promo', スペシャル: 'special' };
const JA_INK = { アンバー: 'amber', アメジスト: 'amethyst', エメラルド: 'emerald', ルビー: 'ruby', サファイア: 'sapphire', スチール: 'steel' };
const JA_TYPE = { キャラクター: 'character', アクション: 'action', アイテム: 'item', ロケーション: 'location' };
/** Visuel officiel japonais réduit par wsrv.nl. */
export const jaImage = (file) => smallImage(`${JA_ROOT}/products/disneylorcana/cardlist/img/card/${file}.png`);

/**
 * Extension d'une carte japonaise : les sets 1 à 8 et 12 à 14 (ordre ×100) ; Fabled sorti en deux packs promo
 * (750, 850 → 9) ; Whispers in the Well et Winterspell en « Curator's Library » (1000 → 10, 1100 → 11) ; les decks
 * de démarrage à part (« SD1 », « SD2 »).
 */
export function jaSetOf(c, starters) {
  const first = String(c.sets_array?.[0] ?? c.sets ?? '').trim();
  if (/スタートデッキ/.test(first)) {
    if (!starters.has(first)) starters.set(first, `SD${starters.size + 1}`);
    return starters.get(first);
  }
  const o = Number(c.sets_order);
  if (o === 750 || o === 850) return '9';
  if (o >= 100 && o % 100 === 0) return String(o / 100);
  return undefined;
}

async function jaCards() {
  let cookie = '';
  const post = async (path, body = '', token) => {
    const r = await fetch(JA_ROOT + path, {
      method: 'POST', body, signal: AbortSignal.timeout(60000),
      headers: { ...JA_UA, 'content-type': 'application/x-www-form-urlencoded', ...(cookie ? { cookie } : {}), ...(token ? { 'x-csrf-token': token } : {}) },
    });
    const set = r.headers.getSetCookie?.() ?? [];
    if (set.length) cookie = set.map((x) => x.split(';')[0]).join('; ');
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  };
  const { csrf } = await post('/products/disneylorcana/api1.0/card-search/token.json');
  const out = [];
  for (let page = 1; page <= 80; page++) {
    const j = await post('/products/disneylorcana/api1.0/card-search/result', new URLSearchParams({ posts_per_page: '100', page: String(page) }).toString(), csrf);
    out.push(...(j.cards ?? []));
    if ((j.cards ?? []).length < 100) break;
  }
  return out;
}

/** Catalogue japonais : cartes officielles, fiches Cardmarket et variantes reprises des cartes anglaises (même n°). */
export async function buildLorcanaJa() {
  const cards = await jaCards().catch((e) => { console.warn(`Lorcana ja : recherche officielle indisponible (${e.message})`); return []; });
  if (!cards.length) return;
  const enSets = (await import('node:fs')).existsSync(join(CATALOG, 'sets/lorcana-en.json')) ? JSON.parse(readFileSync(join(CATALOG, 'sets/lorcana-en.json'), 'utf8')) : null;
  const enById = new Map();
  const enSetMeta = new Map();
  for (const b of enSets?.blocs ?? []) for (const s of b.sets) {
    enSetMeta.set(s.id, s);
    const f = join(CATALOG, `cards/lorcana-en/${s.id}.json`);
    if (existsSync(f)) for (const c of JSON.parse(readFileSync(f, 'utf8'))) enById.set(c.id, c);
  }
  const starters = new Map();
  const bySet = new Map();
  const jaNames = new Map();
  for (const c of cards) {
    const setId = jaSetOf(c, starters);
    if (!setId || !c.collector_number) continue;
    const id = `${setId}-${String(c.collector_number).padStart(3, '0')}`;
    if (!bySet.has(setId)) bySet.set(setId, new Map());
    if (bySet.get(setId).has(id)) continue;
    const en = enById.get(id);
    const version = c.version && c.version !== '-' ? c.version : '';
    const name = version ? `${c.card_name} - ${version}` : c.card_name;
    const inks = [c.ink_color, c.ink_color2, c.ink_color3].map((x) => JA_INK[x]).filter(Boolean);
    const attrs = Object.fromEntries(Object.entries({
      illustrator: [c.artist_credit1, c.artist_credit2].filter((x) => x && x !== '-').join(', '),
      cost: c.ink_cost != null ? String(c.ink_cost) : undefined,
      strength: c.strength != null && c.strength !== '-' ? String(c.strength) : undefined,
      willpower: c.willpower != null && c.willpower !== '-' ? String(c.willpower) : undefined,
      lore: c.lore_value != null && c.lore_value !== '-' ? String(c.lore_value) : undefined,
      story: en?.attrs?.story,
    }).filter(([, v]) => v !== undefined && v !== ''));
    bySet.get(setId).set(id, {
      id,
      localId: String(c.collector_number),
      number: en?.number ?? String(c.collector_number),
      name,
      ...(en?.name ? { nameEn: en.nameEn ?? en.name } : {}),
      image: jaImage(c.card_file),
      rarity: JA_RARITY[c.rarity] ?? en?.rarity,
      attrs,
      facets: { ink: inks.length ? inks : en?.facets?.ink ?? [], type: [JA_TYPE[c.card_type] ?? en?.facets?.type?.[0]].filter(Boolean) },
      ...(en?.v ? { v: en.v.map((x) => ({ ...x })) } : {}),
      ...(en?.cm ? { cm: { ...en.cm } } : {}),
    });
    const setName = String(c.sets_array?.[0] ?? c.sets ?? '').replace(/^[Ａ-Ｚａ-ｚ０-９A-Za-z0-9’'!！.\s　]+(?=[^\x00-\x7F])/, '').trim();
    if (!jaNames.has(setId) && setName && setName !== '-') jaNames.set(setId, setName);
  }
  const sets = [...bySet.entries()].map(([id, map]) => {
    const meta = enSetMeta.get(id);
    return {
      id, code: id, name: jaNames.get(id) ?? meta?.name ?? id, names: { ...(meta?.names ?? {}), ja: jaNames.get(id) ?? meta?.name ?? id },
      count: map.size, ...(meta?.releaseDate ? { releaseDate: meta.releaseDate } : {}), ...(meta?.logo ? { logo: meta.logo } : {}),
    };
  }).sort((a, b) => kindRank(a.id) - kindRank(b.id) || Number(b.id.replace(/\D/g, '')) - Number(a.id.replace(/\D/g, '')));
  for (const [id, map] of bySet) writeJson(`cards/lorcana-ja/${id}.json`, [...map.values()].sort((a, b) => Number(a.localId) - Number(b.localId)));
  const main = sets.filter((s) => /^\d+$/.test(s.id));
  const decks = sets.filter((s) => !/^\d+$/.test(s.id));
  writeJson('sets/lorcana-ja.json', { built: new Date().toISOString(), blocs: [
    { id: 'sets', name: 'ディズニー・ロルカナ', names: { ja: 'ディズニー・ロルカナ', en: 'Disney Lorcana' }, sets: main },
    ...(decks.length ? [{ id: 'decks', name: 'スタートデッキ', names: { ja: 'スタートデッキ', en: 'Starter decks', fr: 'Decks de démarrage', de: 'Starter-Decks', it: 'Mazzi base' }, sets: decks }] : []),
  ] });
  // Noms japonais des extensions dans les autres catalogues (affichés quand l'app est en japonais).
  for (const lang of LANGS) {
    const rel = `sets/lorcana-${lang}.json`;
    if (!existsSync(join(CATALOG, rel))) continue;
    const data = JSON.parse(readFileSync(join(CATALOG, rel), 'utf8'));
    for (const b of data.blocs) for (const s of b.sets) if (jaNames.has(s.id)) s.names = { ...(s.names ?? {}), ja: jaNames.get(s.id) };
    writeJson(rel, data);
  }
  console.log(`Lorcana ja : ${cards.length} cartes officielles, ${sets.length} extensions`);
}
