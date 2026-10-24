import type { Card, CardLang, GameId } from '../types.ts';

export type MarketplaceId = 'cardmarket' | 'tcgplayer' | 'cardtrader' | 'ebay';

export interface MarketLink {
  id: MarketplaceId;
  label: string;
  url: string;
}

/** Chemins des jeux sur chaque site. */
const CARDMARKET_GAME: Record<GameId, string> = {
  pokemon: 'Pokemon',
  onepiece: 'OnePiece',
  riftbound: 'Riftbound',
  lorcana: 'Lorcana',
};

const TCGPLAYER_GAME: Record<GameId, string> = {
  pokemon: 'pokemon',
  onepiece: 'one-piece-card-game',
  riftbound: 'riftbound-league-of-legends-trading-card-game',
  lorcana: 'lorcana-tcg',
};

const EBAY_GAME: Record<GameId, string> = {
  pokemon: 'pokemon',
  onepiece: 'one piece card',
  riftbound: 'riftbound',
  lorcana: 'lorcana',
};

/** Langue du site Cardmarket selon la langue de l'utilisateur. */
const CARDMARKET_SITE_LANGS = ['en', 'fr', 'de', 'es', 'it'];

const EBAY_DOMAIN: Record<string, string> = {
  fr: 'www.ebay.fr', de: 'www.ebay.de', es: 'www.ebay.es', it: 'www.ebay.it',
  en: 'www.ebay.com', 'en-GB': 'www.ebay.co.uk', ja: 'www.ebay.com',
};

const LANG_WORD: Partial<Record<CardLang, string>> = {
  ja: 'japanese', ko: 'korean', 'zh-tw': 'chinese', 'zh-cn': 'chinese', fr: 'french',
  de: 'german', es: 'spanish', it: 'italian', pt: 'portuguese', th: 'thai', id: 'indonesian',
};

const q = encodeURIComponent;

/** Filtre de langue des offres sur une fiche produit Cardmarket (1 anglais, 2 français, 7 japonais…). */
const CARDMARKET_LANGUAGE: Partial<Record<CardLang, number>> = { en: 1, fr: 2, de: 3, es: 4, it: 5, pt: 8, ja: 7, ko: 10, 'zh-tw': 11 };

/**
 * Requête de recherche : « nom (CODE numéro) », ex. « Mega Rayquaza (M6 110/076) », « Monkey.D.Luffy (OP05-119) ».
 * Le nom anglais est préféré quand il est connu (c'est celui des fiches Cardmarket / TCGplayer).
 */
export function searchTerms(card: Card): string {
  const name = card.nameEn ?? card.name;
  // One Piece et Riftbound : le numéro contient déjà le code d'extension.
  if (card.game !== 'pokemon' || !card.setId) return `${name} (${card.number})`;
  return `${name} (${card.setId.toUpperCase()} ${card.number})`;
}

/**
 * Liens vers les places de marché : fiche produit directe quand son identifiant est connu
 * (Cardmarket et TCGplayer, fournis avec les prix TCGdex), sinon recherche « nom (CODE numéro) ».
 * Ce sont des liens profonds (pas d'API) : ils marchent sans clé et peuvent porter un identifiant d'affiliation.
 */
export function marketLinks(card: Card, userLang = 'fr'): MarketLink[] {
  const terms = searchTerms(card);
  const siteLang = CARDMARKET_SITE_LANGS.includes(userLang) ? userLang : 'en';
  // TCGplayer sépare les cartes Pokémon japonaises dans une catégorie dédiée.
  const tcgGame = card.game === 'pokemon' && card.lang === 'ja' ? 'pokemon-japan' : TCGPLAYER_GAME[card.game];
  const langWord = card.lang !== 'en' ? LANG_WORD[card.lang] : undefined;
  const ebayQuery = [EBAY_GAME[card.game], terms, langWord].filter(Boolean).join(' ');

  // Cartes japonaises : Cardmarket a des fiches à part (« 30th-Celebration-JP/Exeggcute-m6a001 »). Leur n° produit
  // (TCGdex japonais, fichiers Cardmarket) y mène directement ; le chemin Limitless, lui, mène à la version internationale.
  // Le chinois traditionnel partage les fiches japonaises (mêmes codes d'extension).
  const japanese = card.game === 'pokemon' && (card.lang === 'ja' || card.lang === 'zh-tw');
  const cmId = card.marketIds?.cardmarket;
  const cmPath = japanese ? undefined : card.marketIds?.cardmarketPath;
  // Recherche « nom anglais (ou français) + code japonais + numéro » : « Exeggcute m6a 001 ».
  const num = card.number.split('/')[0];
  const jpCode = card.setId ? `${card.setId.toLowerCase()} ${/^\d+$/.test(num) ? num.padStart(3, '0') : num.toLowerCase()}` : '';
  const cmSearch = japanese ? [card.nameEn ?? card.nameFr ?? card.name, jpCode].filter(Boolean).join(' ') : terms;
  const cmLanguage = CARDMARKET_LANGUAGE[card.lang];
  const tpId = card.marketIds?.tcgplayer;

  // Variante reverse vendue sur la fiche de la carte : offres filtrées sur le reverse.
  const reverse = card.variant === 'reverse' && (cmPath || cmId) ? '&isReverseHolo=Y' : '';
  return [
    {
      id: 'cardmarket',
      label: 'Cardmarket',
      // 1) fiche exacte (chemin relevé sur Limitless), 2) n° produit, 3) recherche ; offres filtrées sur la langue de la carte.
      url: cmPath
        ? `https://www.cardmarket.com/${siteLang}/${CARDMARKET_GAME[card.game]}/Products/Singles/${cmPath.split('/').map(q).join('/')}?${cmLanguage ? `language=${cmLanguage}` : ''}${reverse}`.replace('?&', '?').replace(/\?$/, '')
        : cmId
          ? `https://www.cardmarket.com/${siteLang}/${CARDMARKET_GAME[card.game]}/Products?idProduct=${cmId}${cmLanguage ? `&language=${cmLanguage}` : ''}${reverse}`
          : `https://www.cardmarket.com/${siteLang}/${CARDMARKET_GAME[card.game]}/Products/Search?searchString=${q(cmSearch)}`,
    },
    {
      id: 'tcgplayer',
      label: 'TCGplayer',
      url: tpId
        ? `https://www.tcgplayer.com/product/${tpId}`
        : `https://www.tcgplayer.com/search/${tcgGame}/product?q=${q(terms)}&view=grid`,
    },
    {
      id: 'cardtrader',
      label: 'CardTrader',
      // Fiche exacte (n° CardTrader du catalogue), sinon recherche sur le seul nom.
      url: card.marketIds?.cardtrader
        ? `https://www.cardtrader.com/${siteLang}/cards/${card.marketIds.cardtrader}`
        : `https://www.cardtrader.com/${siteLang}/search?q=${q(card.nameEn ?? card.name)}`,
    },
    {
      id: 'ebay',
      label: 'eBay',
      url: `https://${EBAY_DOMAIN[userLang] ?? 'www.ebay.com'}/sch/i.html?_nkw=${q(ebayQuery)}`,
    },
  ];
}

export function formatPrice(value: number, currency: string, locale = 'fr-FR'): string {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}
