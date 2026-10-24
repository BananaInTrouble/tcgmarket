import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { CollectionPage } from '../../components/dash/CollectionPage';
import { InsightsPage } from '../../components/dash/InsightsPage';
import { NewsPage } from '../../components/dash/NewsPage';
import { SetsPage } from '../../components/dash/SetsPage';
import { Pager } from '../../components/Pager';
import { colors, fonts, s } from '../../components/ui';
import { collectionStats } from '../../lib/stats';
import { useStore } from '../../lib/store';
import { packRushMark } from '../../lib/packrush/brand';

const PR_MARK = packRushMark();

/**
 * Tableau de bord en quatre pages à faire glisser : la collection et sa valeur, l'avancement des extensions,
 * les nouveautés du jeu choisi, et la répartition de la collection.
 */
export default function Dashboard() {
  const { ready, collection, settings, t, toCurrency, displayName, username } = useStore();
  const st = useMemo(() => collectionStats(collection, toCurrency), [collection, toCurrency]);
  const who = displayName || username || settings.profileName;
  const hello = who ? `${t('dash.hello')} ${who}` : t('dash.hello');

  if (!ready) return <View style={s.screen}><ActivityIndicator color={colors.accent} style={{ marginTop: 32 }} /></View>;

  return (
    <View style={s.screen}>
      <Text style={[s.h2, { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, maxWidth: 900, width: '100%', alignSelf: 'center' }]}>{hello} !</Text>
      {/* Pack Rush : packs virtuels gratuits. */}
      <Pressable onPress={() => router.push('/packrush')} style={{ marginHorizontal: 16, marginBottom: 8, maxWidth: 868, width: 'auto', alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.accent, paddingHorizontal: 14, paddingVertical: 10 }}>
        <Image source={PR_MARK} style={{ width: 34, height: 34 }} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.accent, fontFamily: fonts.heavy, fontSize: 14 }}>{t('pr.banner')}</Text>
          <Text style={{ color: colors.muted, fontFamily: fonts.bold, fontSize: 12 }}>{t('pr.bannerSub')}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.accent} />
      </Pressable>
      <Pager
        initial={collection.length ? 0 : 2}
        tabs={[
          { label: t('dash.tab.collection'), icon: 'wallet' },
          { label: t('dash.tab.sets'), icon: 'albums' },
          { label: t('dash.tab.news'), icon: 'sparkles' },
          { label: t('dash.tab.insights'), icon: 'pie-chart' },
        ]}
      >
        {[
          <CollectionPage key="c" st={st} />,
          <SetsPage key="s" st={st} />,
          <NewsPage key="n" />,
          <InsightsPage key="i" st={st} />,
        ]}
      </Pager>
    </View>
  );
}
