import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { AccountSection } from '../../components/AccountPanel';
import { PublicProfilePanel } from '../../components/PublicProfilePanel';
import { disablePush } from '../../lib/push';
import { Avatar } from '../../components/Avatar';
import { AvatarPicker } from '../../components/AvatarPicker';
import { signOut } from '../../lib/cloud/supabase';
import { Dropdown } from '../../components/Dropdown';
import { Panel } from '../../components/Stats';
import { colors, fonts, s } from '../../components/ui';
import { CURRENCIES, type Currency } from '../../lib/currency';
import { GAME_LIST, VISIBLE_LANGS } from '../../lib/games';
import { APP_LANGS, APP_LANG_NAMES, deviceLang, type AppLang } from '../../lib/i18n';
import { APP_VERSION } from '../../lib/version';
import { useStore } from '../../lib/store';
import { packRushMark } from '../../lib/packrush/brand';
import type { CardLang, GameId } from '../../lib/types';

const PR_MARK = packRushMark();

const CARD_LANGS: CardLang[] = VISIBLE_LANGS;
const CURRENCY_LABEL: Record<Currency, string> = { EUR: 'Euro (€)', USD: 'US Dollar ($)', JPY: 'Yen (¥)' };

function confirm(message: string, onYes: () => void, cancel = 'Cancel') {
  if (Platform.OS === 'web') {
    if (window.confirm(message)) onYes();
    return;
  }
  Alert.alert('', message, [{ text: cancel, style: 'cancel' }, { text: 'OK', style: 'destructive', onPress: onYes }]);
}

export default function Account() {
  const { settings, setSettings, collection, clear, t, langLabel, user, username, displayName, wishlist } = useStore();
  const [picking, setPicking] = useState(false);
  const count = collection.reduce((n, e) => n + e.quantity, 0);

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.pad, { gap: 14, maxWidth: 700, width: '100%', alignSelf: 'center', paddingBottom: 48 }]}>
      <View style={{ alignItems: 'center', gap: 8, paddingVertical: 8 }}>
        <Pressable onPress={() => setPicking(true)} accessibilityRole="button" accessibilityLabel={t('acc.photoChange')}>
          <Avatar value={settings.avatar} size={96} />
          <View style={{ position: 'absolute', right: -2, bottom: -2, width: 32, height: 32, borderRadius: 16, backgroundColor: colors.accent, borderWidth: 3, borderColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="camera" size={15} color={colors.bg} />
          </View>
        </Pressable>
        <AvatarPicker visible={picking} onClose={() => setPicking(false)} />
        <Text style={s.h2}>{displayName || (username ? `@${username}` : t('acc.trainer'))}</Text>
        {!!username && !!displayName && <Text style={[s.meta, { color: colors.accent }]}>@{username}</Text>}
        <Text style={s.muted}>{t('acc.inCollection', { n: count })}</Text>
        {user?.email ? <Text style={[s.muted, { fontSize: 12 }]}>{user.email}</Text> : null}
      </View>

      <AccountSection />

      <PublicProfilePanel />

      <Panel title={t('acc.prefs')}>
        <Dropdown
          label={t('lang.app')}
          value={settings.appLang ?? 'auto'}
          options={[
            { value: 'auto', label: `${t('lang.auto')} (${APP_LANG_NAMES[deviceLang()]})` },
            ...APP_LANGS.map((l) => ({ value: l, label: APP_LANG_NAMES[l] })),
          ]}
          onChange={(l) => l && setSettings({ appLang: l as AppLang | 'auto' })}
        />
        <Dropdown
          label={t('acc.currency')}
          value={settings.currency}
          options={CURRENCIES.map((c) => ({ value: c, label: CURRENCY_LABEL[c] }))}
          onChange={(c) => c && setSettings({ currency: c as Currency })}
        />
        <Dropdown
          label={t('acc.defaultGame')}
          value={settings.game === 'auto' ? 'pokemon' : settings.game}
          options={GAME_LIST.map((g) => ({ value: g.id, label: g.label }))}
          onChange={(g) => g && setSettings({ game: g as GameId })}
        />
        <Dropdown
          label={t('lang.cards')}
          value={settings.lang}
          options={CARD_LANGS.map((l) => ({ value: l, label: langLabel(l) }))}
          onChange={(l) => l && setSettings({ lang: l as CardLang })}
        />
      </Panel>

      <Panel title={t('acc.collection')}>
        <Pressable style={s.ghost} onPress={() => router.push('/collection')}>
          <Text style={s.ghostText}>{t('acc.see')}</Text>
        </Pressable>
        <Pressable style={[s.ghost, { flexDirection: 'row', justifyContent: 'center', gap: 8 }]} onPress={() => router.push('/wishlist')}>
          <Ionicons name="heart-outline" size={17} color={colors.text} />
          <Text style={s.ghostText}>{t('wish.see')}{wishlist.length ? ` (${wishlist.length})` : ''}</Text>
        </Pressable>
        <Pressable style={[s.ghost, { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, borderColor: colors.accent }]} onPress={() => router.push('/packrush?view=collection')}>
          <Image source={PR_MARK} style={{ width: 20, height: 20 }} />
          <Text style={[s.ghostText, { color: colors.accent }]}>{t('pr.collection')}</Text>
        </Pressable>
        {!!user && (
          <Pressable style={[s.ghost, { flexDirection: 'row', justifyContent: 'center', gap: 8 }]} onPress={() => router.push('/trades')}>
            <Ionicons name="swap-horizontal" size={17} color={colors.text} />
            <Text style={s.ghostText}>{t('trades.see')}</Text>
          </Pressable>
        )}
        <Pressable style={[s.ghost, { flexDirection: 'row', justifyContent: 'center', gap: 8 }]} onPress={() => router.push('/import')}>
          <Ionicons name="cloud-upload-outline" size={17} color={colors.text} />
          <Text style={s.ghostText}>{t('imp.title')}</Text>
        </Pressable>
        <Pressable
          style={[s.ghost, { borderColor: colors.danger }]}
          onPress={() => confirm(t('acc.clearConfirm'), clear, t('common.cancel'))}
          disabled={!collection.length}
        >
          <Text style={[s.ghostText, { color: colors.danger, fontFamily: fonts.bold }]}>{t('acc.clear')}</Text>
        </Pressable>
      </Panel>

      {!!user && (
        <Pressable
          style={[s.ghost, { borderColor: colors.danger, flexDirection: 'row', justifyContent: 'center', gap: 8 }]}
          onPress={() => confirm(t('auth.signOutConfirm'), async () => { await disablePush().catch(() => {}); signOut(); router.replace('/'); }, t('common.cancel'))}
          accessibilityRole="button"
        >
          <Ionicons name="log-out-outline" size={20} color={colors.danger} />
          <Text style={[s.ghostText, { color: colors.danger, fontFamily: fonts.bold }]}>{t('auth.signOut')}</Text>
        </Pressable>
      )}

      <Text style={[s.muted, { fontSize: 12, textAlign: 'center' }]}>{t('acc.footer')}</Text>
      {!!APP_VERSION && (
        <Text style={[s.muted, { fontSize: 13, textAlign: 'center', fontFamily: fonts.bold }]}>{t('acc.version', { v: APP_VERSION })}</Text>
      )}
    </ScrollView>
  );
}
