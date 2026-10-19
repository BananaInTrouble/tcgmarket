import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { Avatar } from '../../components/Avatar';
import { CardRow, colors, fonts, s } from '../../components/ui';
import { fetchPublicProfile, type PublicProfile } from '../../lib/cloud/supabase';
import { normalizeUsername } from '../../lib/cloud/username';
import { conditionLabel, unitValue } from '../../lib/condition';
import { formatMoney } from '../../lib/currency';
import { collectionStats } from '../../lib/stats';
import { useStore } from '../../lib/store';
import { matchTrades } from '../../lib/trades';

type Tab = 'collection' | 'wanted' | 'trade';

/** Profil public d'un collectionneur (lien « …/app/u/pseudo ») : collection, cartes recherchées, cartes à échanger. */
export default function PublicProfilePage() {
  const { username: raw } = useLocalSearchParams<{ username: string }>();
  const name = normalizeUsername(String(raw ?? ''));
  const { t, user, username, settings, setSettings, toCurrency, locale, collection, wishlist } = useStore();
  const [profile, setProfile] = useState<PublicProfile | null | 'unavailable' | undefined>(undefined);
  const [tab, setTab] = useState<Tab>('collection');
  useEffect(() => {
    let alive = true;
    setProfile(undefined);
    fetchPublicProfile(name).then((p) => alive && setProfile(p), () => alive && setProfile(null));
    return () => { alive = false; };
  }, [name]);

  const lists = useMemo(() => {
    if (!profile || profile === 'unavailable') return null;
    return {
      collection: profile.collection ?? [],
      wanted: (profile.wishlist ?? []).map((w) => ({ card: w.card, quantity: 1, addedAt: 0 })),
      trade: (profile.collection ?? []).filter((e) => e.trade),
    };
  }, [profile]);
  const match = useMemo(() => (profile && profile !== 'unavailable' && user && name !== username
    ? matchTrades({ collection, wishlist }, { collection: profile.collection ?? [], wishlist: profile.wishlist ?? [] })
    : null), [profile, user, name, username, collection, wishlist]);
  const stats = useMemo(() => (lists ? collectionStats(lists.collection as never, toCurrency) : null), [lists, toCurrency]);
  const friends = settings.friends ?? [];
  const isFriend = friends.includes(name);
  const toggleFriend = () => setSettings({ friends: isFriend ? friends.filter((f) => f !== name) : [...friends, name] });

  const title = `@${name}`;
  if (profile === undefined) return <View style={[s.screen, s.pad]}><Stack.Screen options={{ title }} /><ActivityIndicator color={colors.accent} /></View>;
  if (!profile || profile === 'unavailable' || !lists || !stats) {
    return (
      <View style={[s.screen, s.pad, { alignItems: 'center', gap: 14, paddingTop: 40 }]}>
        <Stack.Screen options={{ title }} />
        <Ionicons name="person-circle-outline" size={64} color={colors.muted} />
        <Text style={[s.muted, { textAlign: 'center' }]}>{t(profile === 'unavailable' ? 'prof.unavailable' : 'prof.notFound')}</Text>
      </View>
    );
  }

  const data = lists[tab];
  const cards = data.map((e) => e.card);
  const since = profile.since ? new Date(profile.since).toLocaleDateString(locale, { month: 'long', year: 'numeric' }) : '';
  return (
    <View style={s.screen}>
      <Stack.Screen options={{ title }} />
      <FlatList
        data={data}
        keyExtractor={(e, i) => `${e.card.game}:${e.card.lang}:${e.card.id}:${e.card.variant ?? ''}:${i}`}
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 8, maxWidth: 700, width: '100%', alignSelf: 'center' }}
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 6, alignItems: 'center' }}>
            <Avatar value={profile.avatar} size={88} />
            <Text style={s.h2}>{profile.displayName || `@${profile.username}`}</Text>
            {!!profile.displayName && <Text style={[s.muted, { marginTop: -8 }]}>@{profile.username}</Text>}
            {!!since && <Text style={s.muted}>{t('prof.since', { d: since })}</Text>}
            <View style={{ flexDirection: 'row', gap: 18 }}>
              <Text style={s.muted}>{t('acc.inCollection', { n: stats.count })}</Text>
              {stats.value > 0 && <Text style={{ color: colors.accent, fontFamily: fonts.heavy }}>{formatMoney(stats.value, settings.currency, locale)}</Text>}
            </View>
            {user ? (
              <Pressable onPress={toggleFriend} style={[s.ghost, { flexDirection: 'row', gap: 8, paddingHorizontal: 18 }, isFriend && { borderColor: colors.accent }]}>
                <Ionicons name={isFriend ? 'people' : 'person-add-outline'} size={17} color={isFriend ? colors.accent : colors.text} />
                <Text style={[s.ghostText, isFriend && { color: colors.accent }]}>{t(isFriend ? 'prof.following' : 'prof.follow')}</Text>
              </Pressable>
            ) : (
              <Pressable onPress={() => router.replace('/')} style={[s.button, { paddingHorizontal: 22 }]}>
                <Text style={s.buttonText}>{t('prof.join')}</Text>
              </Pressable>
            )}
            {!!match && match.theyHave.length + match.youHave.length > 0 && (
              <Pressable onPress={() => router.push('/trades')} style={{ alignSelf: 'stretch', backgroundColor: colors.good, borderRadius: 12, padding: 12, gap: 2 }}>
                <Text style={{ color: colors.bg, fontFamily: fonts.heavy }}>⇄ {t('trades.total', { n: match.theyHave.length + match.youHave.length })}</Text>
                <Text style={{ color: colors.bg, fontFamily: fonts.bold, fontSize: 12 }}>
                  {[match.theyHave.length ? t('trades.theyHave', { n: match.theyHave.length }) : '', match.youHave.length ? t('trades.youHave', { n: match.youHave.length }) : ''].filter(Boolean).join(' · ')}
                </Text>
              </Pressable>
            )}
            <View style={{ flexDirection: 'row', gap: 6, alignSelf: 'stretch' }}>
              {(['collection', 'wanted', 'trade'] as const).map((k) => (
                <Pressable key={k} onPress={() => setTab(k)} style={{ flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: tab === k ? colors.accent : colors.line, backgroundColor: tab === k ? colors.accent : 'transparent', alignItems: 'center' }}>
                  <Text style={{ color: tab === k ? colors.bg : colors.text, fontFamily: fonts.bold, fontSize: 13 }}>
                    {t(k === 'collection' ? 'prof.tabCollection' : k === 'wanted' ? 'prof.tabWanted' : 'prof.tabTrade')} ({lists[k].length})
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        }
        ListEmptyComponent={<Text style={[s.muted, { textAlign: 'center', marginTop: 16 }]}>{t('prof.empty')}</Text>}
        renderItem={({ item }) => {
          const unit = tab === 'wanted' ? undefined : unitValue(item as never, toCurrency);
          const right = [conditionLabel(item as never), unit !== undefined ? formatMoney(unit, settings.currency, locale) : undefined, item.quantity > 1 ? `×${item.quantity}` : undefined].filter(Boolean).join(' · ');
          return <CardRow card={item.card} list={cards} right={right || undefined} />;
        }}
      />
    </View>
  );
}
