import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { PROVIDERS, cloudEnabled } from '../lib/cloud/config';
import { saveDisplayName, sendPasswordReset, signInWith, signInWithPassword, signUpWithPassword, updatePassword } from '../lib/cloud/supabase';
import { strongPassword } from '../lib/cloud/password';
import { useStore } from '../lib/store';
import { PasswordRules } from './PasswordRules';
import { Panel } from './Stats';
import { colors, fonts, s } from './ui';

/** Connexion (e-mail et mot de passe, Google, Apple) et état de la sauvegarde de la collection sur le compte. */
export function AccountPanel() {
  const { t, user, username, sync, recovery, endRecovery } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  if (!cloudEnabled()) return <Text style={[s.muted, { fontSize: 12 }]}>{t('acc.soon')}</Text>;

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    setInfo(null);
    try { await fn(); } catch (e) { setError(authError(e, t)); } finally { setBusy(false); }
  };

  // Lien « mot de passe oublié » ouvert : choix du nouveau mot de passe.
  if (recovery) {
    return (
      <View style={{ gap: 10 }}>
        <Text style={[s.muted, { fontSize: 13 }]}>{t('auth.newPassword')}</Text>
        <TextInput style={s.input} placeholder={t('auth.password')} placeholderTextColor={colors.muted} value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" />
        <PasswordRules password={password} />
        <Pressable style={[s.button, (!strongPassword(password) || busy) && { opacity: 0.5 }]} disabled={!strongPassword(password) || busy}
          onPress={() => run(async () => { await updatePassword(password); setPassword(''); endRecovery(); })}>
          {busy ? <ActivityIndicator color={colors.bg} /> : <Text style={s.buttonText}>{t('auth.savePassword')}</Text>}
        </Pressable>
        {!!error && <Text style={st.error}>{error}</Text>}
      </View>
    );
  }

  if (user) {
    const label = { off: '', syncing: t('auth.syncing'), ok: t('auth.synced'), error: t('auth.syncError') }[sync];
    return (
      <View style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Ionicons name={user.provider === 'google' ? 'logo-google' : user.provider === 'apple' ? 'logo-apple' : 'mail'} size={20} color={colors.text} />
          <Text style={[s.name, { flex: 1 }]} numberOfLines={1}>{user.email ?? t('auth.connected')}</Text>
        </View>
        {!!username && <DisplayName />}
        {!!label && (
          <Text style={[s.meta, { color: sync === 'error' ? colors.danger : sync === 'ok' ? colors.good : colors.muted }]}>
            {sync === 'ok' ? '✓ ' : ''}{label}
          </Text>
        )}
      </View>
    );
  }

  const validEmail = /^\S+@\S+\.\S+$/.test(email.trim());
  const ready = validEmail && (mode === 'reset' || password.length >= 6);
  const submit = () => run(async () => {
    const e = email.trim();
    if (mode === 'signin') await signInWithPassword(e, password);
    else if (mode === 'signup') { if (await signUpWithPassword(e, password)) setInfo(t('auth.confirmSent', { email: e })); }
    else { await sendPasswordReset(e); setInfo(t('auth.resetSent', { email: e })); }
  });
  return (
    <View style={{ gap: 10 }}>
      <Text style={[s.muted, { fontSize: 13 }]}>{t('auth.why')}</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {(['signin', 'signup'] as const).map((m) => (
          <Pressable key={m} onPress={() => { setMode(m); setError(null); setInfo(null); }} style={[st.tab, mode === m && st.tabOn]}>
            <Text style={[st.tabText, mode === m && { color: colors.bg }]}>{t(m === 'signin' ? 'auth.signIn' : 'auth.signUp')}</Text>
          </Pressable>
        ))}
      </View>
      <TextInput
        style={s.input} placeholder={t('auth.email')} placeholderTextColor={colors.muted} value={email}
        onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" inputMode="email"
      />
      {mode !== 'reset' && (
        <TextInput
          style={s.input} placeholder={t(mode === 'signup' ? 'auth.passwordNew' : 'auth.password')} placeholderTextColor={colors.muted}
          value={password} onChangeText={setPassword} secureTextEntry autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          onSubmitEditing={() => ready && submit()}
        />
      )}
      <Pressable style={[s.button, (!ready || busy) && { opacity: 0.5 }]} disabled={!ready || busy} onPress={submit}>
        {busy ? <ActivityIndicator color={colors.bg} /> : <Text style={s.buttonText}>{t(mode === 'signin' ? 'auth.signIn' : mode === 'signup' ? 'auth.create' : 'auth.sendReset')}</Text>}
      </Pressable>
      <Pressable onPress={() => { setMode(mode === 'reset' ? 'signin' : 'reset'); setError(null); setInfo(null); }}>
        <Text style={[s.meta, { textAlign: 'center' }]}>{t(mode === 'reset' ? 'auth.backToSignIn' : 'auth.forgot')}</Text>
      </Pressable>
      {!!info && <Text style={{ color: colors.good, fontFamily: fonts.bold, fontSize: 13 }}>{info}</Text>}
      {!!error && <Text style={st.error}>{error}</Text>}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 2 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.line }} />
        <Text style={s.meta}>{t('auth.or')}</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.line }} />
      </View>
      {PROVIDERS.google && (
        <Pressable style={[s.ghost, { flexDirection: 'row', justifyContent: 'center', gap: 10, backgroundColor: '#fff', borderColor: '#fff' }]} onPress={() => run(() => signInWith('google'))} disabled={busy}>
          <Ionicons name="logo-google" size={18} color="#1f1f1f" />
          <Text style={[s.ghostText, { color: '#1f1f1f' }]}>{t('auth.google')}</Text>
        </Pressable>
      )}
      <Pressable
        style={[s.ghost, { flexDirection: 'row', justifyContent: 'center', gap: 10, backgroundColor: '#000', borderColor: '#000' }, !PROVIDERS.apple && { opacity: 0.45 }]}
        onPress={() => run(() => signInWith('apple'))} disabled={busy || !PROVIDERS.apple}
      >
        <Ionicons name="logo-apple" size={18} color="#fff" />
        <Text style={[s.ghostText, { color: '#fff' }]}>{PROVIDERS.apple ? t('auth.apple') : t('auth.appleSoon')}</Text>
      </Pressable>
    </View>
  );
}

/** Messages d'erreur Supabase les plus courants, traduits. */
export function authError(e: unknown, t: ReturnType<typeof useStore>['t']): string {
  const m = e instanceof Error ? e.message : '';
  if (/invalid login credentials/i.test(m)) return t('auth.errCredentials');
  if (/email not confirmed/i.test(m)) return t('auth.errNotConfirmed');
  if (/already registered|already exists/i.test(m)) return t('auth.errExists');
  if (/rate limit|too many/i.test(m)) return t('auth.errRate');
  if (/password/i.test(m)) return t('auth.errPassword');
  return m || t('auth.error');
}

/** Pseudo affiché (libre) avec son bouton « modifier » juste à côté, et l'identifiant « @ » en dessous. */
function DisplayName() {
  const { t, user, username, displayName, setDisplayName } = useStore();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  if (!user || !username) return null;
  const shown = displayName || username;
  const valid = value.trim().length >= 1 && value.trim().length <= 30;
  const save = async () => {
    if (!valid || busy) return;
    setBusy(true); setError(false);
    try { await saveDisplayName(user.id, value); setDisplayName(value.trim()); setEditing(false); } catch { setError(true); } finally { setBusy(false); }
  };
  if (editing) {
    return (
      <View style={{ gap: 6 }}>
        <Text style={[s.muted, { fontSize: 12 }]}>{t('acc.displayName')}</Text>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <TextInput style={[s.input, { flex: 1 }]} value={value} onChangeText={setValue} maxLength={30} autoFocus onSubmitEditing={save} placeholder={username} placeholderTextColor={colors.muted} />
          <Pressable onPress={save} disabled={!valid || busy} style={[s.button, { paddingHorizontal: 14 }, (!valid || busy) && { opacity: 0.5 }]} accessibilityLabel={t('acc.saveName')}>
            {busy ? <ActivityIndicator color={colors.bg} /> : <Ionicons name="checkmark" size={20} color={colors.bg} />}
          </Pressable>
          <Pressable onPress={() => { setEditing(false); setError(false); }} style={[s.ghost, { paddingHorizontal: 12 }]} accessibilityLabel={t('common.cancel')}>
            <Ionicons name="close" size={20} color={colors.text} />
          </Pressable>
        </View>
        <Text style={[s.muted, { fontSize: 11 }]}>{error ? t('acc.nameError') : t('acc.nameHint')}</Text>
      </View>
    );
  }
  return (
    <View style={{ gap: 2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ color: colors.text, fontFamily: fonts.heavy, fontSize: 18, flexShrink: 1 }} numberOfLines={1}>{shown}</Text>
        <Pressable onPress={() => { setValue(displayName ?? ''); setEditing(true); }} hitSlop={10} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: colors.line }} accessibilityLabel={t('acc.editName')}>
          <Ionicons name="pencil" size={13} color={colors.accent} />
          <Text style={{ color: colors.accent, fontFamily: fonts.bold, fontSize: 12 }}>{t('acc.editName')}</Text>
        </Pressable>
      </View>
      <Text style={[s.meta, { color: colors.muted }]}>@{username}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  error: { color: colors.danger, fontFamily: fonts.bold, fontSize: 13 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.line, alignItems: 'center' },
  tabOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  tabText: { color: colors.text, fontFamily: fonts.bold },
});

export function AccountSection() {
  const { t } = useStore();
  return <Panel title={t('auth.title')}><AccountPanel /></Panel>;
}
