import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { colors, fonts, s } from '../components/ui';
import { PR_RARITIES, RARITY_STYLE, type PrRarity } from '../lib/packrush/art';
import { setEmblem } from '../lib/packrush/brand';
import { FragmentIcon, Opening, Pack, PackRushLogo, cardDescription, useCardArt } from '../components/PackRush';
import { PackRushError, claimQuests, craftCard, loadCatalog, loadStatus, openPack, perCardChance, type PrCard, type PrOpening, type PrSet, type PrStatus } from '../lib/packrush/api';
import { useStore } from '../lib/store';
import type { TKey } from '../lib/i18n';

const local = (names: Record<string, string>, lang: string) => names[lang] ?? names.en ?? Object.values(names)[0] ?? '';
const pct = (v: number, locale: string) => `${(v * 100).toLocaleString(locale, { maximumFractionDigits: v < 0.01 ? 2 : 1 })} %`;

/** Compte à rebours « 3 h 12 min » jusqu'à une date (heure du serveur, décalage de l'horloge locale corrigé). */
function useCountdown(target: string | null | undefined, serverNow: string | undefined) {
  const offset = useRef(0);
  useEffect(() => { if (serverNow) offset.current = Date.parse(serverNow) - Date.now(); }, [serverNow]);
  const [, tick] = useState(0);
  useEffect(() => { const id = setInterval(() => tick((n) => n + 1), 30000); return () => clearInterval(id); }, []);
  if (!target) return null;
  const ms = Date.parse(target) - (Date.now() + offset.current);
  const total = Math.max(1, Math.ceil(ms / 60000));
  const h = Math.floor(total / 60), m = total % 60;
  return h ? `${h} h ${String(m).padStart(2, '0')} min` : `${m} min`;
}

/** Pack Rush : packs gratuits toutes les 12 h, Pièces, Fragments, quêtes du jour et collection virtuelle. */
export default function PackRush() {
  const { t, appLang, locale } = useStore();
  const art = useCardArt();
  const { width } = useWindowDimensions();
  const [set, setSet] = useState<PrSet | null>(null);
  const [cards, setCards] = useState<PrCard[]>([]);
  const [status, setStatus] = useState<PrStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [filter, setFilter] = useState<PrRarity | 'all'>('all');
  const [showOdds, setShowOdds] = useState(false);
  const [opening, setOpening] = useState<PrOpening | null>(null);
  const [detail, setDetail] = useState<PrCard | null>(null);

  const errText = (e: unknown) => t(`pr.err.${e instanceof PackRushError ? e.code : 'unavailable'}` as TKey);
  const refresh = useCallback(async () => {
    try {
      const cat = set ? { set, cards } : await loadCatalog();
      if (!set) { setSet(cat.set); setCards(cat.cards); }
      setStatus(await loadStatus(cat.set.id));
      setError(null);
    } catch (e) {
      setError(errText(e));
    }
  }, [set, cards]);
  useEffect(() => { refresh(); }, []);

  const nextFree = useCountdown(status?.nextFree, status?.now);
  const nextDay = useCountdown(status?.nextDay, status?.now);
  const byId = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);
  const owned = (c: PrCard) => status?.inventory[c.id] ?? 0;
  const progress = PR_RARITIES.map((r) => {
    const list = cards.filter((c) => c.rarity === r);
    return { r, total: list.length, have: list.filter((c) => owned(c) > 0).length };
  });
  const totalOwned = progress.reduce((a, p) => a + p.have, 0);

  const doOpen = async (free: boolean) => {
    if (!set || busy) return;
    setBusy(true); setNote(null);
    try {
      const r = await openPack(set.id, free);
      setOpening(r);
      setStatus(r.status);
    } catch (e) {
      setNote(errText(e));
    } finally {
      setBusy(false);
    }
  };
  const doClaim = async () => {
    setBusy(true);
    try {
      const r = await claimQuests();
      setNote(r.coins ? t('pr.questsClaimed', { n: r.coins }) : null);
      await refresh();
    } catch (e) { setNote(errText(e)); } finally { setBusy(false); }
  };
  const doCraft = async (c: PrCard) => {
    setBusy(true);
    try {
      const r = await craftCard(c.id);
      setStatus(r.status);
      setNote(t('pr.crafted', { name: c.name }) + (r.completions.length ? ` · ${r.completions.map((x) => t('pr.complete', { r: t(`pr.r.${x.rarity}` as TKey), n: x.coins })).join(' · ')}` : ''));
      setDetail(null);
    } catch (e) { setNote(errText(e)); } finally { setBusy(false); }
  };

  if (error && !status) {
    return (
      <View style={[s.screen, s.pad, { alignItems: 'center', gap: 14, paddingTop: 40 }]}>
        <Ionicons name="planet-outline" size={64} color={colors.muted} />
        <Text style={[s.muted, { textAlign: 'center' }]}>{error}</Text>
        <Pressable style={[s.ghost, { paddingHorizontal: 22 }]} onPress={refresh}><Text style={s.ghostText}>{t('pr.retry')}</Text></Pressable>
      </View>
    );
  }
  if (!set || !status) return <View style={[s.screen, s.pad]}><ActivityIndicator color={colors.accent} style={{ marginTop: 32 }} /></View>;

  const q = status.quests;
  const done = 1 + Number(q.open1) + Number(q.open2);
  const claimable = (done >= 2 && !q.claimed2) || (done >= 3 && !q.claimed3);
  const cols = Math.max(3, Math.floor(Math.min(width, 700) / 120));
  const tile = (Math.min(width, 700) - 32 - (cols - 1) * 8) / cols;
  const shown = cards.filter((c) => filter === 'all' || c.rarity === filter);
  const canPay = status.coins >= set.pack_cost;

  return (
    <View style={s.screen}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48, gap: 14, maxWidth: 700, width: '100%', alignSelf: 'center' }}>
        {/* Bloc, set et soldes. */}
        <View style={{ backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.line, padding: 14, gap: 12 }}>
          <View style={{ alignItems: 'center' }}><PackRushLogo size={20} /></View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Image source={setEmblem(set.id)} style={{ width: 56, height: 56 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.muted, fontFamily: fonts.bold, fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase' }}>{local(set.block, appLang)}</Text>
              <Text style={s.h2}>{local(set.name, appLang)}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Balance icon={<Text style={{ fontSize: 18 }}>🪙</Text>} value={status.coins} label={t('pr.coins')} />
            <Balance icon={<FragmentIcon size={22} />} value={status.fragments} label={t('pr.fragments')} />
            <Balance icon={<Text style={{ fontSize: 18 }}>🃏</Text>} value={totalOwned} label={`/ ${cards.length}`} />
          </View>
        </View>

        {/* Ouverture. */}
        <View style={{ alignItems: 'center', gap: 10 }}>
          <Pack setId={set.id} title={local(set.name, appLang)} width={150} />
          <Text style={{ color: colors.text, fontFamily: fonts.heavy, fontSize: 16 }}>
            {status.free > 0 ? t('pr.freeLeft', { n: status.free }) : t('pr.noFree')}
          </Text>
          {status.free < 1 && nextFree && <Text style={s.muted}>{t('pr.nextFree', { d: nextFree })}</Text>}
          <View style={{ gap: 8, alignSelf: 'stretch' }}>
            <Pressable disabled={busy || status.free < 1} onPress={() => doOpen(true)} style={[s.button, { opacity: status.free < 1 ? 0.45 : 1 }]}>
              <Text style={[s.buttonText, { textAlign: 'center' }]}>🎁 {t('pr.openFree')}</Text>
            </Pressable>
            <Pressable disabled={busy || !canPay} onPress={() => doOpen(false)} style={[s.ghost, { opacity: canPay ? 1 : 0.45, borderColor: colors.accent }]}>
              <Text style={[s.ghostText, { color: colors.accent, textAlign: 'center' }]}>🪙 {t('pr.openPaid', { n: set.pack_cost })}</Text>
            </Pressable>
          </View>
          {busy && <ActivityIndicator color={colors.accent} />}
          {!!note && <Text style={{ color: colors.accent, fontFamily: fonts.bold, textAlign: 'center' }}>{note}</Text>}
          <Pressable onPress={() => setShowOdds((v) => !v)}>
            <Text style={{ color: colors.muted, fontFamily: fonts.bold, textDecorationLine: 'underline' }}>{t('pr.odds')}</Text>
          </Pressable>
          {showOdds && <Odds set={set} cards={cards} />}
        </View>

        {/* Quêtes du jour. */}
        <View style={{ backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.line, padding: 14, gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[s.name, { flex: 1 }]}>{t('pr.quests')}</Text>
            {nextDay && <Text style={[s.muted, { fontSize: 12 }]}>{t('pr.reset', { d: nextDay })}</Text>}
          </View>
          {([['login', q.login], ['open1', q.open1], ['open2', q.open2]] as const).map(([k, ok]) => (
            <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name={ok ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={ok ? colors.good : colors.muted} />
              <Text style={[s.muted, ok && { color: colors.text }]}>{t(`pr.q.${k}` as TKey)}</Text>
            </View>
          ))}
          <Text style={[s.muted, { fontSize: 12 }]}>{t('pr.questRewards')}</Text>
          {claimable && (
            <Pressable style={s.button} onPress={doClaim} disabled={busy}><Text style={s.buttonText}>{t('pr.claim')}</Text></Pressable>
          )}
          {q.claimed3 && <Text style={{ color: colors.good, fontFamily: fonts.bold }}>✓ {t('pr.questsDone')}</Text>}
        </View>

        {/* Progression par rareté. */}
        <View style={{ gap: 8 }}>
          <Text style={s.name}>{t('pr.progress')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {progress.map(({ r, total, have }) => {
              const doneR = status.completed.includes(r);
              return (
                <View key={r} style={{ minWidth: 100, flexGrow: 1, backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: doneR ? colors.good : colors.line, padding: 10, gap: 2 }}>
                  <Text style={{ color: RARITY_STYLE[r].glow, fontFamily: fonts.heavy }}>{RARITY_STYLE[r].symbol} {t(`pr.r.${r}` as TKey)}</Text>
                  <Text style={{ color: colors.text, fontFamily: fonts.bold }}>{have}/{total}</Text>
                  <Text style={[s.muted, { fontSize: 11 }]}>{doneR ? `✓ +${set.rates.complete[r]} ${t('pr.coins')}` : `+${set.rates.complete[r]} ${t('pr.coins')}`}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Collection. */}
        <View style={{ gap: 10 }}>
          <Text style={s.name}>{t('pr.collection')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {(['all', ...PR_RARITIES] as const).map((r) => (
              <Pressable key={r} onPress={() => setFilter(r)} style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: filter === r ? colors.accent : colors.line, backgroundColor: filter === r ? colors.accent : 'transparent' }}>
                <Text style={{ color: filter === r ? colors.bg : colors.text, fontFamily: fonts.bold, fontSize: 13 }}>{r === 'all' ? t('common.all') : r}</Text>
              </Pressable>
            ))}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {shown.map((c) => {
              const n = owned(c);
              return (
                <Pressable key={c.id} onPress={() => setDetail(c)} style={{ width: tile }}>
                  <Image source={art(c, cards.length, n > 0)} style={{ width: tile, height: tile * 1.4, borderRadius: 8, opacity: n > 0 ? 1 : 0.55 }} contentFit="contain" />
                  {n > 1 && (
                    <View style={{ position: 'absolute', top: 4, right: 4, backgroundColor: colors.accent, borderRadius: 9, paddingHorizontal: 6 }}>
                      <Text style={{ color: colors.bg, fontFamily: fonts.heavy, fontSize: 11 }}>×{n}</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
        <Text style={[s.muted, { fontSize: 11, textAlign: 'center' }]}>{t('pr.legal')}</Text>
      </ScrollView>

      {/* Fiche d'une carte. */}
      <Modal visible={!!detail} transparent animationType="fade" onRequestClose={() => setDetail(null)}>
        {detail && (
          <Pressable onPress={() => setDetail(null)} style={{ flex: 1, backgroundColor: 'rgba(5,12,9,0.88)', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }}>
            <Image source={art(detail, cards.length, owned(detail) > 0)} style={{ width: 250, height: 350 }} contentFit="contain" />
            <Text style={{ color: colors.text, fontFamily: fonts.heavy, fontSize: 18 }}>{owned(detail) > 0 ? detail.name : '???'}</Text>
            <Text style={s.muted}>{t(`pr.r.${detail.rarity}` as TKey)} · {owned(detail) > 0 ? t('pr.owned', { n: owned(detail) }) : t('pr.missing')}</Text>
            {owned(detail) > 0 && !!cardDescription(detail.id, appLang) && (
              <Text style={{ color: colors.text, fontFamily: fonts.body, fontStyle: 'italic', textAlign: 'center', maxWidth: 320, lineHeight: 20 }}>{cardDescription(detail.id, appLang)}</Text>
            )}
            <Text style={[s.muted, { fontSize: 12 }]}>{t('pr.chance', { p: pct(perCardChance(set, cards, detail.rarity), locale) })}</Text>
            {owned(detail) === 0 && (
              <Pressable
                disabled={busy || status.fragments < set.rates.craft[detail.rarity]}
                onPress={() => doCraft(detail)}
                style={[s.button, { paddingHorizontal: 20, opacity: status.fragments < set.rates.craft[detail.rarity] ? 0.45 : 1 }]}
              >
                <Text style={s.buttonText}>{t('pr.craft', { n: set.rates.craft[detail.rarity] })}</Text>
              </Pressable>
            )}
          </Pressable>
        )}
      </Modal>

      {/* Ouverture d'un pack. */}
      {opening && <Opening result={opening} byId={byId} total={cards.length} setId={set.id} title={local(set.name, appLang)} onClose={() => setOpening(null)} />}
    </View>
  );
}

function Balance({ icon, value, label }: { icon: ReactNode; value: number; label: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, borderRadius: 12, padding: 10, alignItems: 'center', gap: 2 }}>
      <View style={{ height: 24, justifyContent: 'center' }}>{icon}</View>
      <Text style={{ color: colors.text, fontFamily: fonts.heavy, fontSize: 18 }}>{value}</Text>
      <Text style={{ color: colors.muted, fontFamily: fonts.bold, fontSize: 11 }}>{label}</Text>
    </View>
  );
}

/** Probabilités affichées avant l'ouverture : par emplacement et par carte précise. */
function Odds({ set, cards }: { set: PrSet; cards: PrCard[] }) {
  const { t, locale } = useStore();
  const sum = (w: Partial<Record<PrRarity, number>>) => Object.values(w).reduce((a, v) => a + (v ?? 0), 0) || 1;
  const bonusAmounts = Object.entries(set.rates.bonus.amounts);
  const bonusSum = bonusAmounts.reduce((a, [, w]) => a + w, 0) || 1;
  const cell = { flex: 1, color: colors.text, fontFamily: fonts.bold, fontSize: 12, textAlign: 'center' as const };
  return (
    <View style={{ alignSelf: 'stretch', backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.line, padding: 12, gap: 6 }}>
      <Text style={[s.muted, { fontSize: 12 }]}>{t('pr.oddsIntro')}</Text>
      <View style={{ flexDirection: 'row' }}>
        <Text style={[cell, { color: colors.muted, textAlign: 'left' }]} />
        <Text style={[cell, { color: colors.muted }]}>{t('pr.slotStd')}</Text>
        <Text style={[cell, { color: colors.muted }]}>{t('pr.slotBoost')}</Text>
        <Text style={[cell, { color: colors.muted }]}>{t('pr.perCard')}</Text>
      </View>
      {PR_RARITIES.map((r) => (
        <View key={r} style={{ flexDirection: 'row' }}>
          <Text style={[cell, { textAlign: 'left', color: RARITY_STYLE[r].glow }]}>{RARITY_STYLE[r].symbol} {r}</Text>
          <Text style={cell}>{pct((set.rates.standard[r] ?? 0) / sum(set.rates.standard), locale)}</Text>
          <Text style={cell}>{set.rates.boosted[r] ? pct(set.rates.boosted[r]! / sum(set.rates.boosted), locale) : '—'}</Text>
          <Text style={cell}>{pct(perCardChance(set, cards, r), locale)}</Text>
        </View>
      ))}
      <Text style={[s.muted, { fontSize: 12 }]}>
        {t('pr.bonusOdds', { p: pct(set.rates.bonus.chance, locale), list: bonusAmounts.map(([n, w]) => `${n} (${pct(w / bonusSum, locale)})`).join(', ') })}
      </Text>
    </View>
  );
}
