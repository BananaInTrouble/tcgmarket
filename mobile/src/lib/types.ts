export type GameId = 'pokemon' | 'onepiece' | 'riftbound' | 'lorcana';

/** Codes de langue des cartes (pas de l'interface). */
export type CardLang =
  | 'en' | 'fr' | 'de' | 'es' | 'it' | 'pt'
  | 'ja' | 'ko' | 'zh-tw' | 'zh-cn' | 'id' | 'th';

export interface Price {
  source: 'cardmarket' | 'tcgplayer' | 'cardtrader' | 'ebay';
  /** Libellé court : "Tendance", "Moyenne", "Market"... */
  label: string;
  value: number;
  currency: 'EUR' | 'USD' | 'JPY';
}

export interface Card {
  game: GameId;
  /** Identifiant unique côté fournisseur de données. */
  id: string;
  lang: CardLang;
  name: string;
  /** Nom anglais (ou traduit) quand la carte est dans une autre langue. */
  nameEn?: string;
  /** Nom français quand il est connu. */
  nameFr?: string;
  /** Noms officiels dans d'autres langues ({ de, es, it, pt, ja, 'zh-tw'… }), quand ils sont connus. */
  names?: Partial<Record<string, string>>;
  /** Numéro imprimé : "136/189", "OP05-119", "OGN-042/298". */
  number: string;
  setId?: string;
  setName?: string;
  rarity?: string;
  imageSmall?: string;
  imageLarge?: string;
  prices: Price[];
  /** Valeurs filtrables propres au jeu (type, couleur, domaine…), par clé de facette. */
  facets?: Record<string, string[]>;
  /** Attributs affichés sur la fiche (illustrateur, PV, coût…), dans l'ordre d'affichage. */
  attributes?: CardAttribute[];
  /** Identifiants des fiches produit sur les places de marché (liens directs). */
  /** Fiches produit : n° Cardmarket, chemin exact de la fiche Cardmarket (« Extension/Carte-V1-CODE001 »), n° TCGplayer. */
  marketIds?: { cardmarket?: number; cardmarketPath?: string; tcgplayer?: number; cardtrader?: number };
  /** Variantes imprimées (normale, holo, reverse, Poké Ball…), la première est la carte de base. */
  variants?: CardVariant[];
  /** Variante choisie (cartes de la collection) ; absente = la première. */
  variant?: string;
  /** Visuel de la carte de base, gardé quand celui d'une variante (photo à part) le remplace. */
  baseImage?: { small?: string; large?: string };
}

/** Variante d'une carte : clé (« normal », « reverse », « pokeball », « holo|shadowless|1st-edition »…), fiche et prix Cardmarket. */
export interface CardVariant {
  key: string;
  /** N° produit Cardmarket de la variante (souvent celui de la carte ; à part pour Poké Ball, Master Ball…). */
  cardmarket?: number;
  /** Prix Cardmarket (EUR) : moyenne des ventes sur 7 jours, sinon la période indiquée par `priceTier`. */
  price?: number;
  /** Période du prix quand ce n'est pas 7 jours : 30 jours, toutes les ventes ; jamais vendue : offres, offre la plus basse. */
  priceTier?: 'avg30' | 'avg' | 'trend' | 'low';
  /** N° produit TCGplayer de la variante quand elle a sa propre photo (Poké Ball, Master Ball, motifs japonais). */
  tcgplayer?: number;
  /** Visuel propre à la variante (One Piece : parallèles, réimpressions). */
  image?: string;
  /** Identifiant officiel de la version (One Piece : « OP01-120_p1 »). */
  official?: string;
}

export type AttributeKey =
  | 'illustrator' | 'release' | 'rarity' | 'dex' | 'type' | 'hp' | 'stage' | 'category' | 'regulation'
  | 'cost' | 'life' | 'power' | 'counter' | 'attribute' | 'feature' | 'block' | 'color'
  | 'domain' | 'energy' | 'might' | 'ink' | 'strength' | 'willpower' | 'lore' | 'story';

export interface CardAttribute {
  key: AttributeKey;
  value: string;
}

export type SortKey = 'relevance' | 'name' | 'number' | 'price-desc' | 'price-asc';

export interface SearchFilters {
  text: string;
  blocId?: string;
  setId?: string;
  /** Valeur choisie par facette (clé → valeur). */
  facets: Record<string, string>;
  sort: SortKey;
}

export interface Facet {
  key: string;
  label: string;
  values: string[];
}

/** Une extension. `code` est le code imprimé / court (« SV4a », « OP05 »). */
export interface SetInfo {
  id: string;
  code: string;
  name: string;
  logo?: string;
  symbol?: string;
  count?: number;
  blocId?: string;
  /** Date de sortie (« 2026-09-16 »), quand elle est connue. */
  releaseDate?: string;
  /** Nom par langue de l'app (« fr », « ja », « zh-tw »…), quand il est connu. */
  names?: Record<string, string>;
}

/** Un bloc (série) regroupant des extensions, les plus récentes d'abord. */
export interface Bloc {
  id: string;
  name: string;
  /** Nom par langue de l'app (« fr », « ja », « zh-tw »…), quand il est connu. */
  names?: Record<string, string>;
  sets: SetInfo[];
}

export interface FilterOptions {
  blocs: Bloc[];
  sets: { id: string; name: string }[];
  facets: Facet[];
  sorts: SortKey[];
}

/** Ce que l'OCR a reconnu sur la carte, avant interrogation du catalogue. */
export interface ScanHint {
  game: GameId;
  /** Code complet tel que lu : "OP05-119", "OGN-042", "136/189". */
  code: string;
  setCode?: string;
  localId?: string;
  setTotal?: number;
  /** Texte brut, utile pour départager plusieurs candidats par le nom. */
  text: string;
  lang?: CardLang;
}

export interface GameProvider {
  id: GameId;
  label: string;
  langs: CardLang[];
  search(filters: SearchFilters, lang: CardLang): Promise<Card[]>;
  filterOptions(lang: CardLang): Promise<FilterOptions>;
  blocs(lang: CardLang): Promise<Bloc[]>;
  setCards(setId: string, lang: CardLang): Promise<{ set: SetInfo | null; cards: Card[] }>;
  getCard(id: string, lang: CardLang): Promise<Card | null>;
  /** Résout un code lu par le scanner en cartes candidates (meilleure en premier). */
  resolveScan(hint: ScanHint, lang: CardLang): Promise<Card[]>;
}
