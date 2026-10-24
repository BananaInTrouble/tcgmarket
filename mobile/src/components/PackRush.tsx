import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Modal, PanResponder, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { colors, fonts, s } from './ui';
import { PR_RARITIES, RARITY_STYLE, cardArtSvg, cardFrameImage, type PrRarity } from '../lib/packrush/art';
import { catalogBase } from '../lib/catalog/static';
import { PR_DESCRIPTIONS } from '../lib/packrush/descriptions';
import { FX, PACK_H, PACK_TEAR_Y, PACK_W, cardBack, fragmentIcon, packFoil, packRushMark } from '../lib/packrush/brand';
import { preEvolution, type PrCard, type PrOpening } from '../lib/packrush/api';
import { useStore } from '../lib/store';
import type { TKey } from '../lib/i18n';

const FRAGMENT = fragmentIcon();
const MARK = packRushMark();
const BACK = cardBack();

/** Texte d'ambiance d'une carte dans la langue de l'appli (sinon anglais). */
export function cardDescription(id: string, lang: string): string | undefined {
  const d = PR_DESCRIPTIONS[id];
  return d?.[lang] ?? d?.en;
}

/** Version des illustrations pré-calculées (tools/packrush/render-art.ts) : à augmenter à chaque nouveau rendu. */
const ART_VERSION = 2;

/** Adresse de l'illustration pré-calculée d'une carte (publiée avec le site dans /packrush/<set>/). */
export function cardArtUrl(card: PrCard, owned: boolean): string {
  return `${catalogBase().replace(/\/catalog$/, '')}/packrush/${card.set_id}/${card.id}${owned ? '' : '-g'}.jpg?v=${ART_VERSION}`;
}

/** Cadre d'une carte avec son niveau d'évolution (« Niv. 2 », Légende, Mythe) et son texte, dans la langue de l'appli. */
export function useCardFrame() {
  const { t, appLang } = useStore();
  return (card: PrCard, total: number, owned = true) => {
    const stage = card.art?.stage ?? 0;
    const level = stage >= 4 ? t(card.rarity === 'SSR' ? 'pr.myth' : 'pr.legend') : t('pr.level', { n: stage + 1 });
    // Niveaux 2 et 3 : « Évolue à partir de … » (nom de la pré-évolution).
    const prev = preEvolution(card);
    const evolves = prev ? t('pr.evolvesFrom', { name: prev.name }) : undefined;
    return cardFrameImage(card, total, owned, { level, desc: cardDescription(card.id, appLang), evolves });
  };
}

/**
 * Carte Pack Rush : illustration pré-calculée (image) + cadre et textes par-dessus. Si l'image n'est pas encore
 * publiée, l'illustration est calculée sur place (plus lent).
 */
export function PrCardPic({ card, total, owned = true, width, style }: { card: PrCard; total: number; owned?: boolean; width: number; style?: object }) {
  const frame = useCardFrame();
  const [fallback, setFallback] = useState(false);
  const art = useMemo(() => (fallback ? `data:image/svg+xml;utf8,${encodeURIComponent(cardArtSvg(card, owned))}` : cardArtUrl(card, owned)), [card.id, owned, fallback]);
  const h = width * 1.4, radius = (width * 14) / 250;
  return (
    <View style={[{ width, height: h, borderRadius: radius, overflow: 'hidden', backgroundColor: '#0B0716' }, style]}>
      <Image source={art} style={{ position: 'absolute', width, height: h }} contentFit="cover" onError={() => setFallback(true)} transition={120} />
      <Image source={frame(card, total, owned)} style={{ position: 'absolute', width, height: h }} contentFit="contain" />
    </View>
  );
}

/** Icône de Fragment (étoile de cristal). */
export function FragmentIcon({ size = 16 }: { size?: number }) {
  return <Image source={FRAGMENT} style={{ width: size, height: size }} />;
}

/** Logo générique « PACK RUSH ». */
export function PackRushLogo({ size = 20, mark = true }: { size?: number; mark?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: size * 0.3 }}>
      {mark && <Image source={MARK} style={{ width: size * 1.4, height: size * 1.4 }} />}
      <Text style={{ fontFamily: fonts.display, fontSize: size, color: '#FFF6D8', letterSpacing: size * 0.04, transform: [{ skewX: '-8deg' }] }}>
        PACK <Text style={{ color: colors.accent }}>RUSH</Text>
      </Text>
    </View>
  );
}

/** Face du pack : habillage du set, logo Pack Rush et nom du set. */
function PackFace({ setId, title, width }: { setId: string; title: string; width: number }) {
  const k = width / PACK_W;
  const foil = useMemo(() => packFoil(setId), [setId]);
  return (
    <View style={{ width, height: PACK_H * k }}>
      <Image source={foil} style={{ width, height: PACK_H * k }} contentFit="fill" />
      <View style={{ position: 'absolute', top: 52 * k, left: 0, right: 0, alignItems: 'center' }}>
        <PackRushLogo size={15 * k} />
      </View>
      <View style={{ position: 'absolute', top: 262 * k, left: 16 * k, right: 16 * k, alignItems: 'center' }}>
        <Text numberOfLines={2} style={{ color: colors.accent, fontFamily: fonts.heavy, fontSize: 15 * k, textAlign: 'center', letterSpacing: 0.4 }}>{title}</Text>
      </View>
    </View>
  );
}

/** Pack (fermé). */
export function Pack({ setId, title, width }: { setId: string; title: string; width: number }) {
  return <PackFace setId={setId} title={title} width={width} />;
}

const rank = (r: PrRarity) => PR_RARITIES.indexOf(r);
const clamp = (v: number) => Math.max(0, Math.min(1, v));
/** Sur le web : le navigateur ne doit ni défiler ni revenir en arrière pendant qu'on glisse le doigt. */
const NO_TOUCH_SCROLL = { touchAction: 'none' } as object;

/**
 * Ouverture façon « booster » : on glisse le doigt sur le haut du pack pour le déchirer (ou on le touche), le haut
 * s'envole, puis les cartes apparaissent en pile ; on touche ou on glisse chaque carte pour passer à la suivante.
 * Les cartes rares (R et plus) arrivent face cachée et se retournent d'un toucher. Les plus rares passent en dernier.
 */
export function Opening({ result, byId, total, setId, title, onClose }: { result: PrOpening; byId: Map<string, PrCard>; total: number; setId: string; title: string; onClose(): void }) {
  const { t } = useStore();
  const { width, height } = useWindowDimensions();
  const packW = Math.min(width * 0.62, 250, (height - 220) * PACK_W / PACK_H);
  const k = packW / PACK_W;
  const packH = PACK_H * k, tearH = PACK_TEAR_Y * k;
  const cardW = Math.min(width * 0.72, 290, (height - 230) / 1.4);
  const pulls = useMemo(() => result.cards.map((p, i) => ({ ...p, i })).sort((a, b) => rank(a.rarity) - rank(b.rarity) || a.i - b.i), [result]);

  const [phase, setPhase] = useState<'pack' | 'cards' | 'summary'>('pack');
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

  // Pack : flottement, trait de découpe, envol du haut, chute du bas, éclair.
  const bob = useRef(new Animated.Value(0)).current;
  const cut = useRef(new Animated.Value(0)).current;
  const lid = useRef(new Animated.Value(0)).current;
  const drop = useRef(new Animated.Value(0)).current;
  const flash = useRef(new Animated.Value(0)).current;
  const hint = useRef(new Animated.Value(0)).current;
  const torn = useRef(false);
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(bob, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(bob, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(hint, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.delay(500),
      Animated.timing(hint, { toValue: 0, duration: 0, useNativeDriver: true }),
    ])).start();
  }, []);

  const tear = () => {
    if (torn.current) return;
    torn.current = true;
    Animated.sequence([
      Animated.timing(cut, { toValue: 1, duration: 160, useNativeDriver: false }),
      Animated.parallel([
        Animated.timing(lid, { toValue: 1, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
        Animated.sequence([
          Animated.timing(flash, { toValue: 1, duration: 140, useNativeDriver: false }),
          Animated.timing(flash, { toValue: 0, duration: 420, useNativeDriver: false }),
        ]),
        Animated.sequence([Animated.delay(260), Animated.timing(drop, { toValue: 1, duration: 520, easing: Easing.in(Easing.cubic), useNativeDriver: false })]),
      ]),
    ]).start(() => { setPhase('cards'); enter(); });
  };

  const packPan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (_, g) => {
      if (torn.current) return;
      const p = clamp(Math.abs(g.dx) / (packW * 0.75));
      cut.setValue(p);
      if (p >= 1) tear();
    },
    onPanResponderRelease: (_, g) => {
      if (torn.current) return;
      const p = clamp(Math.abs(g.dx) / (packW * 0.75));
      if (p > 0.55 || (Math.abs(g.dx) < 6 && Math.abs(g.dy) < 6)) tear();
      else Animated.spring(cut, { toValue: 0, useNativeDriver: false }).start();
    },
  }), [packW]);

  // Cartes : entrée de la pile, glissement de la carte du dessus, retournement des rares.
  const stackIn = useRef(new Animated.Value(0)).current;
  const swipe = useRef(new Animated.ValueXY()).current;
  const flip = useRef(new Animated.Value(1)).current;
  const enter = () => Animated.spring(stackIn, { toValue: 1, friction: 7, useNativeDriver: false }).start();
  const cur = pulls[idx];
  const hidden = !!cur && rank(cur.rarity) >= rank('R') && !flipped;
  // Cartes SSR : mise en scène propre à chaque mythique, avant (burst) et après (after) le retournement.
  const burst = useRef(new Animated.Value(0)).current;
  const after = useRef(new Animated.Value(0)).current;
  const fxBusy = useRef(false);
  const ssr = cur?.rarity === 'SSR';
  const kind = cur ? byId.get(cur.id)?.art?.kind : undefined;
  const theme: FxTheme = kind === 'lunaphage' || kind === 'aeonis' ? kind : 'ophalia';

  const next = (dir: number) => {
    Animated.timing(swipe, { toValue: { x: dir * width, y: -40 }, duration: 260, easing: Easing.in(Easing.quad), useNativeDriver: false }).start(() => {
      swipe.setValue({ x: 0, y: 0 });
      burst.setValue(0); after.setValue(0);
      setFlipped(false);
      if (idx + 1 >= pulls.length) setPhase('summary');
      else setIdx(idx + 1);
    });
  };
  const flipCard = (then?: () => void) => {
    Animated.timing(flip, { toValue: 0, duration: 170, easing: Easing.in(Easing.quad), useNativeDriver: false }).start(() => {
      setFlipped(true);
      Animated.timing(flip, { toValue: 1, duration: 230, easing: Easing.out(Easing.back(2)), useNativeDriver: false }).start(then);
    });
  };
  const turn = () => {
    if (fxBusy.current) return;
    if (!ssr) { flipCard(); return; }
    fxBusy.current = true;
    Animated.timing(burst, { toValue: 1, duration: 1700, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }).start(() => {
      flipCard(() => {
        Animated.timing(after, { toValue: 1, duration: 2200, easing: Easing.out(Easing.quad), useNativeDriver: false }).start(() => { fxBusy.current = false; });
      });
    });
  };
  const cardPan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (_, g) => { if (!hidden) swipe.setValue({ x: g.dx, y: g.dy * 0.3 }); },
    onPanResponderRelease: (_, g) => {
      const tap = Math.abs(g.dx) < 6 && Math.abs(g.dy) < 6;
      if (hidden) { if (tap || Math.abs(g.dx) > 40) turn(); return; }
      if (fxBusy.current) { Animated.spring(swipe, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start(); return; }
      if (tap) next(1);
      else if (Math.abs(g.dx) > 70) next(Math.sign(g.dx));
      else Animated.spring(swipe, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
    },
  }), [hidden, idx, width, ssr]);

  const glow = cur ? RARITY_STYLE[cur.rarity].glow : '#fff';
  const curCard = cur && byId.get(cur.id);
  // Plein écran : rien sous la barre d'état (floutée sur iPhone) ni sous la barre d'accueil.
  const insets = useSafeAreaInsets();

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ ...NO_TOUCH_SCROLL, flex: 1, backgroundColor: 'rgba(7,5,18,0.96)', alignItems: 'center', justifyContent: 'center', padding: 20, paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20, gap: 16 }}>
        {phase === 'pack' && (
          <>
            <Animated.View {...packPan.panHandlers} style={{ ...NO_TOUCH_SCROLL, width: packW, height: packH, transform: [{ translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [-6, 6] }) }] }}>
              <View style={{ position: 'absolute', left: -30, right: -30, top: -30, bottom: -30, borderRadius: 40, backgroundColor: '#8E7BFF', opacity: 0.18 }} />
              {/* Bas du pack. */}
              <Animated.View style={{ position: 'absolute', top: tearH, left: 0, width: packW, height: packH - tearH, overflow: 'hidden', opacity: drop.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }), transform: [{ translateY: drop.interpolate({ inputRange: [0, 1], outputRange: [0, packH * 0.9] }) }] }}>
                <View style={{ marginTop: -tearH }}><PackFace setId={setId} title={title} width={packW} /></View>
              </Animated.View>
              {/* Bande du haut, qui s'envole. */}
              <Animated.View style={{
                position: 'absolute', top: 0, left: 0, width: packW, height: tearH, overflow: 'hidden',
                opacity: lid.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }),
                transform: [
                  { translateX: lid.interpolate({ inputRange: [0, 1], outputRange: [0, packW * 0.45] }) },
                  { translateY: lid.interpolate({ inputRange: [0, 1], outputRange: [0, -packH * 0.45] }) },
                  { rotate: lid.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '28deg'] }) },
                ],
              }}>
                <PackFace setId={setId} title={title} width={packW} />
              </Animated.View>
              {/* Trait de découpe lumineux. */}
              <Animated.View style={{ position: 'absolute', top: tearH - 2, left: 0, height: 4, borderRadius: 2, backgroundColor: '#FFF3C4', shadowColor: '#FFE8A3', shadowRadius: 10, shadowOpacity: 1, width: cut.interpolate({ inputRange: [0, 1], outputRange: [0, packW] }), opacity: lid.interpolate({ inputRange: [0, 0.3], outputRange: [1, 0], extrapolate: 'clamp' }) }} />
              {/* Indice : un point lumineux parcourt la ligne de découpe. */}
              <Animated.View pointerEvents="none" style={{ position: 'absolute', top: tearH - 9, left: -9, width: 18, height: 18, borderRadius: 9, backgroundColor: '#FFFFFF', shadowColor: '#FFFFFF', shadowRadius: 12, shadowOpacity: 1, opacity: Animated.multiply(hint.interpolate({ inputRange: [0, 0.1, 0.9, 1], outputRange: [0, 0.9, 0.9, 0] }), cut.interpolate({ inputRange: [0, 0.05], outputRange: [1, 0], extrapolate: 'clamp' })), transform: [{ translateX: hint.interpolate({ inputRange: [0, 1], outputRange: [0, packW] }) }] }} />
            </Animated.View>
            <Text style={{ color: colors.accent, fontFamily: fonts.heavy, fontSize: 16, textAlign: 'center' }}>{t('pr.tapToOpen')}</Text>
          </>
        )}

        {phase === 'cards' && cur && (
          <>
            <Text style={[s.muted, { fontFamily: fonts.bold }]}>{t('pr.cardOf', { i: idx + 1, n: pulls.length })}</Text>
            <Animated.View style={{ width: cardW, height: cardW * 1.4, opacity: stackIn, transform: [{ scale: stackIn.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }, { translateY: stackIn.interpolate({ inputRange: [0, 1], outputRange: [60, 0] }) }] }}>
              {ssr && <SsrFx theme={theme} burst={burst} after={after} size={cardW * 2.1} cardW={cardW} />}
              {/* Cartes suivantes, dos visible, légèrement décalées. */}
              {pulls.slice(idx + 1).map((_, j) => j).reverse().map((j) => (
                <Image key={j} source={BACK} style={{ position: 'absolute', width: cardW, height: cardW * 1.4, borderRadius: 12, transform: [{ translateY: (j + 1) * 6 }, { scale: 1 - (j + 1) * 0.03 }] }} />
              ))}
              <Animated.View {...cardPan.panHandlers} style={{
                ...NO_TOUCH_SCROLL, position: 'absolute', width: cardW, height: cardW * 1.4,
                shadowColor: glow, shadowRadius: rank(cur.rarity) >= rank('R') ? 28 : 10, shadowOpacity: rank(cur.rarity) >= rank('R') ? 0.9 : 0.4,
                transform: [
                  { translateX: swipe.x }, { translateY: swipe.y },
                  { rotate: swipe.x.interpolate({ inputRange: [-300, 0, 300], outputRange: ['-14deg', '0deg', '14deg'] }) },
                  { scaleX: flip },
                  ...(ssr ? [{ rotate: burst.interpolate({ inputRange: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 1], outputRange: ['0deg', '-3deg', '3deg', '-3deg', '3deg', '0deg', '0deg'] }) }, { scale: burst.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1.06, 1] }) }] : []),
                ],
              }}>
                {hidden || !curCard ? <Image source={BACK} style={{ width: cardW, height: cardW * 1.4, borderRadius: 12 }} contentFit="contain" /> : <PrCardPic card={curCard} total={total} width={cardW} />}
              </Animated.View>
            </Animated.View>
            {ssr && (
              <Animated.Text style={{ position: 'absolute', top: '12%', color: FX_COLOR[theme], fontFamily: fonts.display, fontSize: 22, letterSpacing: 3, opacity: after.interpolate({ inputRange: [0, 0.25], outputRange: [0, 1], extrapolate: 'clamp' }), transform: [{ scale: after.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0.6, 1.1, 1] }) }] }}>
                ✦ {t('pr.mythic')} ✦
              </Animated.Text>
            )}
            <View style={{ minHeight: 22 }}>{hidden ? <Text style={{ color: glow, fontFamily: fonts.heavy, fontSize: 15 }}>{RARITY_STYLE[cur.rarity].symbol} {t('pr.tapToFlip')}</Text> : <PullTag pull={cur} />}</View>
            <Text style={[s.muted, { fontSize: 12 }]}>{t('pr.tapNext')}</Text>
          </>
        )}

        {phase === 'summary' && (
          <ScrollView contentContainerStyle={{ alignItems: 'center', gap: 12 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 520 }}>
              {pulls.map((p) => {
                const c = byId.get(p.id);
                return c ? (
                  <View key={p.i} style={{ alignItems: 'center', gap: 4 }}>
                    <PrCardPic card={c} total={total} width={96} />
                    <PullTag pull={p} small />
                  </View>
                ) : null;
              })}
            </View>
            {result.bonus > 0 && (
              <View style={{ backgroundColor: colors.accent, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10 }}>
                <Text style={{ color: colors.bg, fontFamily: fonts.heavy, fontSize: 16 }}>🪙 {t('pr.bonus', { n: result.bonus })}</Text>
              </View>
            )}
            {result.fragments > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <FragmentIcon size={18} />
                <Text style={{ color: '#B9C2FF', fontFamily: fonts.bold }}>{t('pr.fragGained', { n: result.fragments })}</Text>
              </View>
            )}
            {result.completions.map((x) => (
              <Text key={x.rarity} style={{ color: colors.good, fontFamily: fonts.heavy }}>🏆 {t('pr.complete', { r: t(`pr.r.${x.rarity}` as TKey), n: x.coins })}</Text>
            ))}
          </ScrollView>
        )}

        <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: '#FFFFFF', opacity: flash.interpolate({ inputRange: [0, 1], outputRange: [0, 0.75] }) }} />

        <View style={{ flexDirection: 'row', gap: 10 }}>
          {phase !== 'summary' && <Pressable onPress={() => { torn.current = true; setPhase('summary'); }} style={[s.ghost, { paddingHorizontal: 18 }]}><Text style={s.ghostText}>{t('pr.skip')}</Text></Pressable>}
          {phase === 'summary' && <Pressable onPress={onClose} style={[s.button, { paddingHorizontal: 28 }]}><Text style={s.buttonText}>{t('pr.continue')}</Text></Pressable>}
        </View>
      </View>
    </Modal>
  );
}

type FxTheme = 'lunaphage' | 'aeonis' | 'ophalia';
const FX_COLOR: Record<FxTheme, string> = { lunaphage: '#E6E9FF', aeonis: '#7CF5D0', ophalia: '#FFD36B' };

/** Particules : positions aléatoires figées pour toute la durée de l'animation. */
function useParticles(n: number) {
  return useMemo(() => Array.from({ length: n }, (_, i) => ({ a: (i / n) * Math.PI * 2 + Math.random() * 0.4, r: 0.5 + Math.random() * 0.5, d: Math.random(), s: 4 + Math.random() * 6 })), [n]);
}

/**
 * Mise en scène des cartes SSR, derrière la carte : Lunaphage = éclipse de lune puis pluie d'éclats d'argent ;
 * Aeonis = galaxie qui s'ouvre en tourbillonnant et aspire la poussière d'étoiles ; Ophalia = soleil qui s'embrase,
 * six ailes de lumière qui se déploient, puis braises qui montent.
 */
function SsrFx({ theme, burst, after, size, cardW }: { theme: FxTheme; burst: Animated.Value; after: Animated.Value; size: number; cardW: number }) {
  const parts = useParticles(18);
  const box = { position: 'absolute' as const, left: (cardW - size) / 2, top: (cardW * 1.4 - size) / 2, width: size, height: size, alignItems: 'center' as const, justifyContent: 'center' as const };
  const layer = (src: string, z: number, style: object) => (
    <Animated.View style={[{ position: 'absolute', width: size * z, height: size * z }, style]}><Image source={src} style={{ width: '100%', height: '100%' }} /></Animated.View>
  );
  const veil = <Animated.View pointerEvents="none" style={{ position: 'absolute', left: -2000, right: -2000, top: -2000, bottom: -2000, backgroundColor: '#000', opacity: burst.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0.55, 0.35] }) }} />;
  const flash = (color: string) => <Animated.View pointerEvents="none" style={{ position: 'absolute', left: -2000, right: -2000, top: -2000, bottom: -2000, backgroundColor: color, opacity: burst.interpolate({ inputRange: [0, 0.88, 0.95, 1], outputRange: [0, 0, 0.85, 0] }) }} />;

  if (theme === 'lunaphage') {
    return (
      <View pointerEvents="none" style={box}>
        {veil}
        {layer(FX.moon, 0.62, { opacity: burst.interpolate({ inputRange: [0, 0.3], outputRange: [0, 1], extrapolate: 'clamp' }), transform: [{ translateY: burst.interpolate({ inputRange: [0, 0.4], outputRange: [size * 0.35, -size * 0.05], extrapolate: 'clamp' }) }, { scale: burst.interpolate({ inputRange: [0, 0.4], outputRange: [0.5, 1], extrapolate: 'clamp' }) }] })}
        {layer(FX.eclipse, 0.62, { opacity: burst.interpolate({ inputRange: [0.35, 0.4], outputRange: [0, 1], extrapolate: 'clamp' }), transform: [{ translateY: -size * 0.05 }, { translateX: burst.interpolate({ inputRange: [0.35, 0.8], outputRange: [size * 0.62, 0], extrapolate: 'clamp' }) }] })}
        {layer(FX.corona, 0.7, { opacity: Animated.add(burst.interpolate({ inputRange: [0.75, 0.85], outputRange: [0, 1], extrapolate: 'clamp' }), after.interpolate({ inputRange: [0, 1], outputRange: [0, -0.4] })), transform: [{ translateY: -size * 0.05 }, { scale: burst.interpolate({ inputRange: [0.75, 1], outputRange: [0.9, 1.3], extrapolate: 'clamp' }) }, { rotate: after.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '40deg'] }) }] })}
        {flash('#F4F6FF')}
        {parts.map((p, i) => (
          <Animated.View key={i} style={{ position: 'absolute', width: p.s, height: p.s * 1.6, backgroundColor: i % 3 ? '#E6E9FF' : '#FFFFFF', borderRadius: 1,
            opacity: after.interpolate({ inputRange: [0, 0.1, 0.8, 1], outputRange: [0, 1, 0.8, 0] }),
            transform: [
              { translateX: (p.d - 0.5) * size * 0.9 },
              { translateY: after.interpolate({ inputRange: [0, 1], outputRange: [-size * 0.45 * p.r, size * 0.55] }) },
              { rotate: after.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${(p.d - 0.5) * 720}deg`] }) },
            ] }} />
        ))}
      </View>
    );
  }
  if (theme === 'aeonis') {
    const steps = [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1];
    return (
      <View pointerEvents="none" style={box}>
        {veil}
        {layer(FX.galaxy, 1, {
          opacity: Animated.add(burst.interpolate({ inputRange: [0, 0.25], outputRange: [0, 1], extrapolate: 'clamp' }), after.interpolate({ inputRange: [0, 1], outputRange: [0, -0.45] })),
          transform: [
            { rotate: Animated.add(burst, after).interpolate({ inputRange: [0, 2], outputRange: ['0deg', '900deg'] }) },
            { scale: burst.interpolate({ inputRange: [0, 1], outputRange: [0.1, 1.25] }) },
          ],
        })}
        {flash('#DFFFF3')}
        {parts.map((p, i) => (
          <Animated.View key={i} style={{ position: 'absolute', width: p.s * 0.7, height: p.s * 0.7, borderRadius: p.s, backgroundColor: i % 2 ? '#7CF5D0' : '#FFF6D8',
            opacity: burst.interpolate({ inputRange: [0, 0.1, 0.85, 0.9], outputRange: [0, 1, 1, 0], extrapolate: 'clamp' }),
            transform: [
              { translateX: burst.interpolate({ inputRange: steps, outputRange: steps.map((t) => Math.cos(p.a + t * 3 * Math.PI) * size * 0.55 * p.r * (1 - t)) }) },
              { translateY: burst.interpolate({ inputRange: steps, outputRange: steps.map((t) => Math.sin(p.a + t * 3 * Math.PI) * size * 0.55 * p.r * (1 - t)) }) },
            ] }} />
        ))}
        {parts.slice(0, 10).map((p, i) => (
          <Animated.View key={`u${i}`} style={{ position: 'absolute', width: 5, height: 5, borderRadius: 3, backgroundColor: '#E9C25B',
            opacity: after.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0] }),
            transform: [{ translateX: Math.cos(p.a) * size * 0.3 }, { translateY: after.interpolate({ inputRange: [0, 1], outputRange: [size * 0.2, -size * 0.5 * p.r] }) }] }} />
        ))}
      </View>
    );
  }
  const wings = [-80, -52, -24, 24, 52, 80];
  return (
    <View pointerEvents="none" style={box}>
      {veil}
      {layer(FX.rays, 1.25, {
        opacity: Animated.add(burst.interpolate({ inputRange: [0.1, 0.5], outputRange: [0, 1], extrapolate: 'clamp' }), after.interpolate({ inputRange: [0, 1], outputRange: [0, -0.5] })),
        transform: [{ rotate: Animated.add(burst, after).interpolate({ inputRange: [0, 2], outputRange: ['0deg', '160deg'] }) }, { scale: burst.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1.1] }) }],
      })}
      {wings.map((a, i) => (
        <Animated.View key={i} style={{ position: 'absolute', width: size * 0.16, height: size * 1.1, alignItems: 'center',
          opacity: Animated.add(burst.interpolate({ inputRange: [0.35, 0.6], outputRange: [0, 0.95], extrapolate: 'clamp' }), after.interpolate({ inputRange: [0, 1], outputRange: [0, -0.6] })),
          transform: [{ rotate: burst.interpolate({ inputRange: [0.35, 0.9], outputRange: ['0deg', `${a}deg`], extrapolate: 'clamp' }) }] }}>
          <Image source={FX.beam} style={{ width: size * 0.16, height: size * 0.55 }} />
        </Animated.View>
      ))}
      {layer(FX.sun, 0.6, { opacity: after.interpolate({ inputRange: [0, 1], outputRange: [1, 0.6] }), transform: [{ scale: burst.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 1.15, 0.95] }) }] })}
      {flash('#FFF3C4')}
      {parts.map((p, i) => (
        <Animated.View key={i} style={{ position: 'absolute', width: p.s * 0.6, height: p.s * 0.6, borderRadius: p.s, backgroundColor: i % 2 ? '#F5A623' : '#FFE8A3',
          opacity: after.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 1, 0] }),
          transform: [{ translateX: after.interpolate({ inputRange: [0, 1], outputRange: [(p.d - 0.5) * size * 0.6, (p.d - 0.5) * size * 0.9] }) }, { translateY: after.interpolate({ inputRange: [0, 1], outputRange: [size * 0.3, -size * 0.55 * p.r] }) }] }} />
      ))}
    </View>
  );
}

function PullTag({ pull, small }: { pull?: { rarity: PrRarity; new: boolean; fragments: number }; small?: boolean }) {
  const { t } = useStore();
  if (!pull) return null;
  const size = small ? 11 : 14;
  return pull.new
    ? <Text style={{ color: colors.good, fontFamily: fonts.heavy, fontSize: size }}>✨ {t('pr.new')}</Text>
    : (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
        <Text style={{ color: '#B9C2FF', fontFamily: fonts.bold, fontSize: size }}>+{pull.fragments}</Text>
        <FragmentIcon size={size + 2} />
      </View>
    );
}
