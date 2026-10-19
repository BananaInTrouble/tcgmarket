import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { SUPABASE_KEY, SUPABASE_URL, cloudEnabled } from './config';
import type { SyncEntry } from './merge';

let client: SupabaseClient | null = null;

/** Client Supabase (session gardée sur l'appareil) ; null tant que le projet n'est pas configuré. */
export function supabase(): SupabaseClient | null {
  if (!cloudEnabled()) return null;
  client ??= createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      storage: AsyncStorage,
      persistSession: true,
      autoRefreshToken: true,
      // Retour de Google : la session arrive dans l'adresse de la page.
      detectSessionInUrl: Platform.OS === 'web',
      flowType: 'pkce',
    },
  });
  return client;
}

/** Adresse de retour (Google, liens des e-mails) : une page de l'app, à la même adresse que l'app. */
function returnUrl(page = 'account'): string | undefined {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return undefined;
  const i = window.location.pathname.indexOf('/app');
  return `${window.location.origin}${i >= 0 ? window.location.pathname.slice(0, i) : ''}/app/${page}`;
}

/**
 * Création de compte par e-mail, mot de passe et pseudo (enregistré par la base à la création du compte, voir
 * supabase/schema.sql) ; true si un e-mail de confirmation doit d'abord être validé.
 */
export async function signUpWithPassword(email: string, password: string, username?: string): Promise<boolean> {
  const sb = supabase();
  if (!sb) throw new Error('cloud');
  const { data, error } = await sb.auth.signUp({
    email, password, options: { emailRedirectTo: returnUrl('confirm'), ...(username ? { data: { username } } : {}) },
  });
  if (error) throw error;
  return !data.session;
}

export async function signInWithPassword(email: string, password: string) {
  const sb = supabase();
  if (!sb) throw new Error('cloud');
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

/** Lien de réinitialisation du mot de passe (ouvre l'app, page Compte, pour choisir le nouveau). */
export async function sendPasswordReset(email: string) {
  const sb = supabase();
  if (!sb) throw new Error('cloud');
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: returnUrl() });
  if (error) throw error;
}

export async function updatePassword(password: string) {
  const sb = supabase();
  if (!sb) throw new Error('cloud');
  const { error } = await sb.auth.updateUser({ password });
  if (error) throw error;
}

export async function signInWith(provider: 'google' | 'apple') {
  const sb = supabase();
  if (!sb) throw new Error('cloud');
  const { error } = await sb.auth.signInWithOAuth({ provider, options: { redirectTo: returnUrl() } });
  if (error) throw error;
}

/**
 * Déconnexion. Sans réseau, Supabase garde la session : on l'efface quand même de l'appareil.
 * Renvoie quand la session locale est effacée.
 */
export async function signOut() {
  const sb = supabase();
  if (!sb) return;
  const { error } = await sb.auth.signOut().catch((e) => ({ error: e }));
  if (error) {
    const ref = new URL(SUPABASE_URL).hostname.split('.')[0];
    await AsyncStorage.removeItem(`sb-${ref}-auth-token`).catch(() => {});
    signedOutLocally.forEach((fn) => fn());
  }
}

/** Abonnés prévenus d'une déconnexion faite sans réseau (Supabase n'émet alors aucun événement). */
const signedOutLocally = new Set<() => void>();
export function onLocalSignOut(fn: () => void): () => void {
  signedOutLocally.add(fn);
  return () => { signedOutLocally.delete(fn); };
}

/** Collection et réglages enregistrés sur le compte (une ligne par utilisateur). */
export async function loadRemote(userId: string): Promise<{ entries: SyncEntry[]; settings?: Record<string, unknown> } | null> {
  const sb = supabase();
  if (!sb) return null;
  const { data, error } = await sb.from('collections').select('data, settings').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data ? { entries: (data.data as SyncEntry[]) ?? [], settings: (data.settings as Record<string, unknown>) ?? undefined } : { entries: [] };
}

export async function saveRemote(userId: string, entries: SyncEntry[], settings: Record<string, unknown>) {
  const sb = supabase();
  if (!sb) return;
  const { error } = await sb.from('collections').upsert({ user_id: userId, data: entries, settings, updated_at: new Date().toISOString() });
  if (error) throw error;
}

/** Pseudo libre ? null si la vérification est impossible (base pas encore à jour, hors ligne). */
export async function usernameAvailable(name: string): Promise<boolean | null> {
  const sb = supabase();
  if (!sb) return null;
  const { data, error } = await sb.rpc('username_available', { name });
  return error || typeof data !== 'boolean' ? null : data;
}

/** Pseudo du compte : chaîne vide s'il n'en a pas encore, null si la base ne gère pas encore les pseudos. */
export async function loadUsername(userId: string): Promise<string | null> {
  const sb = supabase();
  if (!sb) return null;
  const { data, error } = await sb.from('profiles').select('username').eq('user_id', userId).maybeSingle();
  if (error) return null;
  return (data?.username as string | undefined) ?? '';
}

/** Choix du pseudo d'un compte qui n'en a pas (comptes créés avant les pseudos). */
export async function saveUsername(userId: string, username: string) {
  const sb = supabase();
  if (!sb) throw new Error('cloud');
  const { error } = await sb.from('profiles').insert({ user_id: userId, username });
  if (error) throw error;
}

/** Pseudo affiché (distinct de l'identifiant « @ ») : null s'il n'est pas choisi ou si la base ne le gère pas encore. */
export async function loadDisplayName(userId: string): Promise<string | null> {
  const sb = supabase();
  if (!sb) return null;
  const { data, error } = await sb.from('profiles').select('display_name').eq('user_id', userId).maybeSingle();
  return error ? null : ((data?.display_name as string | null | undefined) ?? null);
}

export async function saveDisplayName(userId: string, name: string) {
  const sb = supabase();
  if (!sb) throw new Error('cloud');
  const { error } = await sb.from('profiles').update({ display_name: name.trim() || null }).eq('user_id', userId);
  if (error) throw error;
}

/** Profil public : visible par tous avec le lien (voir supabase/schema.sql, fonction public_profile). */
export async function loadProfilePublic(userId: string): Promise<boolean | null> {
  const sb = supabase();
  if (!sb) return null;
  const { data, error } = await sb.from('profiles').select('is_public').eq('user_id', userId).maybeSingle();
  return error || !data ? null : !!data.is_public;
}

export async function setProfilePublic(userId: string, isPublic: boolean) {
  const sb = supabase();
  if (!sb) throw new Error('cloud');
  const { error } = await sb.from('profiles').update({ is_public: isPublic }).eq('user_id', userId);
  if (error) throw error;
}

export interface PublicProfile {
  username: string;
  displayName?: string | null;
  since?: string;
  avatar?: string;
  collection: { card: import('../types').Card; quantity: number; addedAt: number; condition?: string; graded?: { by: string; grade: string }; value?: number; valueCurrency?: string; trade?: boolean }[];
  wishlist: { card: import('../types').Card }[];
}

/** Profil public d'un pseudo ; null s'il n'existe pas ou n'est pas public ; « unavailable » si la base n'est pas à jour. */
export async function fetchPublicProfile(name: string): Promise<PublicProfile | null | 'unavailable'> {
  const sb = supabase();
  if (!sb) return 'unavailable';
  const { data, error } = await sb.rpc('public_profile', { name });
  if (error) return /function|does not exist|schema cache/i.test(error.message) ? 'unavailable' : null;
  return (data as PublicProfile | null) ?? null;
}
