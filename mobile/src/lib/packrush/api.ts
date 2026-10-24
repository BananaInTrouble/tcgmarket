import { supabase } from '../cloud/supabase';
import type { PrArt, PrRarity } from './art';

/**
 * Pack Rush côté appli : lecture du catalogue virtuel (sets, cartes) et appels aux fonctions du serveur, qui décident
 * de tout (tirages, packs gratuits, Pièces, Fragments, quêtes) — voir supabase/schema.sql (pr_*).
 */
export interface PrSet {
  id: string;
  block: Record<string, string>;
  name: Record<string, string>;
  pack_cost: number;
  rates: {
    version: number;
    standard: Record<PrRarity, number>;
    boosted: Partial<Record<PrRarity, number>>;
    bonus: { chance: number; amounts: Record<string, number> };
    duplicate: Record<PrRarity, number>;
    craft: Record<PrRarity, number>;
    complete: Record<PrRarity, number>;
  };
}

export interface PrCard { id: string; set_id: string; number: number; rarity: PrRarity; name: string; art: PrArt }

export interface PrStatus {
  now: string;
  nextDay: string;
  coins: number;
  fragments: number;
  free: number;
  nextFree: string | null;
  opened: number;
  quests: { login: boolean; open1: boolean; open2: boolean; claimed2: boolean; claimed3: boolean };
  inventory: Record<string, number>;
  completed: PrRarity[];
}

export interface PrPull { id: string; rarity: PrRarity; new: boolean; fragments: number }
export interface PrOpening {
  opening: number;
  cards: PrPull[];
  bonus: number;
  fragments: number;
  completions: { rarity: PrRarity; coins: number }[];
  status: PrStatus;
}

/** Erreurs connues du serveur ; « unavailable » : base pas encore à jour ou hors ligne. */
export type PrError = 'auth' | 'no_free_pack' | 'not_enough_coins' | 'not_enough_fragments' | 'owned' | 'unavailable';

export class PackRushError extends Error {
  constructor(public code: PrError) { super(code); }
}

function fail(error: { message?: string } | null): never {
  const m = error?.message ?? '';
  const code = (['auth', 'no_free_pack', 'not_enough_coins', 'not_enough_fragments', 'owned'] as const).find((c) => m.includes(c));
  throw new PackRushError(code ?? 'unavailable');
}

async function rpc<T>(name: string, args: Record<string, unknown> = {}): Promise<T> {
  const sb = supabase();
  if (!sb) throw new PackRushError('unavailable');
  const { data, error } = await sb.rpc(name, args);
  if (error) fail(error);
  return data as T;
}

/** Set actif (le premier) et ses cartes. */
export async function loadCatalog(): Promise<{ set: PrSet; cards: PrCard[] }> {
  const sb = supabase();
  if (!sb) throw new PackRushError('unavailable');
  const { data: sets, error } = await sb.from('pr_sets').select('id, block, name, pack_cost, rates').eq('active', true).order('sort').limit(1);
  if (error || !sets?.length) fail(error);
  const set = sets[0] as PrSet;
  const { data: cards, error: e2 } = await sb.from('pr_cards').select('id, set_id, number, rarity, name, art').eq('set_id', set.id).order('number');
  if (e2 || !cards?.length) fail(e2);
  for (const c of cards as PrCard[]) KNOWN.set(c.id, c);
  return { set, cards: cards as PrCard[] };
}

/** Cartes du catalogue déjà chargées (pour retrouver la pré-évolution d'une carte). */
const KNOWN = new Map<string, PrCard>();

/** Pré-évolution d'une carte de niveau 2 ou 3 : même espèce, stade précédent, même set. */
export function preEvolution(card: PrCard): PrCard | undefined {
  const stage = card.art?.stage ?? 0;
  if (stage < 1 || stage > 2) return undefined;
  for (const c of KNOWN.values()) if (c.set_id === card.set_id && c.art?.kind === card.art?.kind && (c.art?.stage ?? 0) === stage - 1) return c;
  return undefined;
}

export const loadStatus = (setId: string) => rpc<PrStatus>('pr_status', { p_set: setId });
export const openPack = (setId: string, free: boolean) => rpc<PrOpening>('pr_open', { p_set: setId, p_free: free });
export const claimQuests = () => rpc<{ coins: number }>('pr_claim_quests');
export const craftCard = (cardId: string) => rpc<{ card: string; cost: number; completions: { rarity: PrRarity; coins: number }[]; status: PrStatus }>('pr_craft', { p_card: cardId });

/** Probabilité d'obtenir une carte précise dans un pack (4 emplacements standards + 1 boosté). */
export function perCardChance(set: PrSet, cards: PrCard[], rarity: PrRarity): number {
  const n = cards.filter((c) => c.rarity === rarity).length || 1;
  const sum = (w: Partial<Record<PrRarity, number>>) => Object.values(w).reduce((a, v) => a + (v ?? 0), 0) || 1;
  const pStd = (set.rates.standard[rarity] ?? 0) / sum(set.rates.standard) / n;
  const pBoost = (set.rates.boosted[rarity] ?? 0) / sum(set.rates.boosted) / n;
  return 1 - (1 - pStd) ** 4 * (1 - pBoost);
}
