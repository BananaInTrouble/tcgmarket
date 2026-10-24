// Fiches CardTrader : n° de « blueprint » de chaque carte (lien direct vers sa fiche, comme pour Cardmarket).
// L'API CardTrader (clé personnelle, secret GitHub CARDTRADER_TOKEN, jamais affichée) donne pour chaque fiche ses
// n° Cardmarket et TCGplayer : la carte du catalogue est reliée par son n° Cardmarket, sinon par son n° TCGplayer.
// Étape à lancer après les catalogues et l'étape tcgplayer (elle complète les fichiers cards/<jeu>-<langue>/<set>.json).
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CATALOG, pool, sleep } from './lib.mjs';

const API = 'https://api.cardtrader.com/api/v2';
/** Jeux CardTrader (n° de jeu) et langues du catalogue. */
const GAMES = [
  { game: 'pokemon', id: 5, langs: ['en', 'fr', 'de', 'es', 'it', 'pt', 'ja', 'zh-tw', 'zh-cn'] },
  { game: 'onepiece', id: 15, langs: ['en', 'fr', 'ja'] },
  { game: 'lorcana', id: 18, langs: ['en', 'fr', 'de', 'it', 'ja'] },
  { game: 'riftbound', id: 22, langs: ['en', 'ko', 'zh-cn', 'zh-tw'] },
];

async function api(path, token) {
  for (let i = 0; i < 4; i++) {
    const r = await fetch(`${API}/${path}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null);
    if (r?.ok) return r.json();
    if (r && r.status !== 429 && r.status < 500) return null;
    await sleep(2000 * (i + 1));
  }
  return null;
}

/** Tables n° Cardmarket → fiche et n° TCGplayer → fiche, d'après les fiches CardTrader (cartes à l'unité seulement). */
export function blueprintIndex(blueprints) {
  const byCm = new Map(), byTp = new Map();
  for (const b of blueprints) {
    if (!b?.id || b.fixed_properties == null) continue;
    for (const cm of b.card_market_ids ?? []) if (!byCm.has(cm)) byCm.set(cm, b.id);
    if (b.tcg_player_id && !byTp.has(b.tcg_player_id)) byTp.set(b.tcg_player_id, b.id);
  }
  return { byCm, byTp };
}

/** Fiche CardTrader d'une carte du catalogue (n° Cardmarket de la carte ou de ses variantes, puis n° TCGplayer). */
export function blueprintOf(card, { byCm, byTp }) {
  const cms = [card.cm?.id, card.cardmarket, ...(card.v ?? []).map((v) => v.id)].filter(Boolean);
  for (const id of cms) if (byCm.has(id)) return byCm.get(id);
  return card.tcgplayer ? byTp.get(card.tcgplayer) : undefined;
}

export async function buildCardtrader() {
  const token = process.env.CARDTRADER_TOKEN;
  if (!token) { console.warn('CardTrader : clé absente (secret CARDTRADER_TOKEN), étape ignorée'); return; }
  const expansions = (await api('expansions', token)) ?? [];
  if (!expansions.length) { console.warn('CardTrader : extensions indisponibles'); return; }
  for (const { game, id, langs } of GAMES) {
    const list = expansions.filter((e) => e.game_id === id);
    const blueprints = [];
    await pool(list, 4, async (e) => {
      const b = await api(`blueprints/export?expansion_id=${e.id}`, token);
      if (Array.isArray(b)) blueprints.push(...b);
      await sleep(150);
    });
    const index = blueprintIndex(blueprints);
    let linked = 0, total = 0;
    for (const lang of langs) {
      const dir = join(CATALOG, 'cards', `${game}-${lang}`);
      if (!existsSync(dir)) continue;
      for (const file of readdirSync(dir)) {
        const path = join(dir, file);
        const cards = JSON.parse(readFileSync(path, 'utf8'));
        let changed = false;
        for (const c of cards) {
          total++;
          const ct = blueprintOf(c, index);
          if (ct && c.ct !== ct) { c.ct = ct; changed = true; }
          if (c.ct) linked++;
        }
        if (changed) writeFileSync(path, JSON.stringify(cards));
      }
    }
    console.log(`CardTrader ${game} : ${list.length} extensions, ${blueprints.length} fiches, ${linked} cartes reliées (sur ${total})`);
  }
}
