import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, FlatList, StyleSheet,
  Pressable, ActivityIndicator, useWindowDimensions, Animated, Easing,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Screen from '../../src/components/Screen';
import ProductCard from '../../src/components/ProductCard';
import LocationSheet from '../../src/components/LocationSheet';
import LocationPermissionModal from '../../src/components/LocationPermissionModal';
import * as Location from 'expo-location';
import { useProducts, useCategories, useCollections, useProductTypes } from '../../src/api/catalog';
import { useAuth } from '../../src/store/auth';
import { useDelivery } from '../../src/store/delivery';
import { useCart, cartTotals } from '../../src/api/cart';
import { useWishlist } from '../../src/api/wishlist';
import { recentlyViewed, type MiniProduct } from '../../src/lib/recentlyViewed';
import { categoryImage } from '../../src/lib/categoryImage';
import { useMoney } from '../../src/store/currency';
import { colors, fonts, radii, spacing, shadow } from '../../src/theme';
import type { Product, Category, ProductType } from '../../src/types';

const { width: SCREEN_W } = { width: 390 };
const CARD_GAP = 1;
const CARD_W_GRID = 0; // computed at render

const HERO_BANNERS = [
  { image: 'https://images.unsplash.com/photo-1614093302611-8efc4c438a87?w=1000&q=80', label: 'NEW COLLECTION 2026', title: 'Elegance\nRedefined', cta: 'Shop Now', href: '/search?isNewArrival=true' },
  { image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1000&q=80', label: 'WEDDING EDIT', title: 'Handwoven\nSilks', cta: 'Explore', href: '/search?productType=clothing' },
  { image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=1000&q=80', label: '1 GRAM GOLD', title: 'Jewellery\nThat Shines', cta: 'View Edit', href: '/search?productType=jewellery' },
];

const MARQUEE_ITEMS = ['Silk Sarees', 'Designer Kurtis', 'Bridal Lehengas', '1 Gram Gold', 'Festive Edit', 'Free Shipping ₹999+', 'Premium Quality'];

function SectionHeader({ title, onSeeAll }: { title: string; onSeeAll?: () => void }) {
  return (
    <View style={s.secHead}>
      <Text style={s.secTitle}>{title}</Text>
      {onSeeAll && (
        <Pressable onPress={onSeeAll} style={s.seeAllBtn}>
          <Text style={s.seeAllText}>SEE ALL</Text>
          <Ionicons name="chevron-forward" size={12} color={colors.primary} />
        </Pressable>
      )}
    </View>
  );
}

function HeroCarousel() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [active, setActive] = useState(0);

  return (
    <View>
      <FlatList
        data={HERO_BANNERS}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => String(i)}
        onMomentumScrollEnd={(e) => setActive(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => (
          <Pressable style={{ width }} onPress={() => router.push(item.href as never)}>
            <Image source={{ uri: item.image }} style={{ width, height: width * 1.1 }} contentFit="cover" />
            <View style={s.heroOverlay} />
            <View style={s.heroContent}>
              <Text style={s.heroLabel}>{item.label}</Text>
              <Text style={s.heroTitle}>{item.title}</Text>
              <View style={s.heroCta}>
                <Text style={s.heroCtaText}>{item.cta}</Text>
                <Ionicons name="arrow-forward" size={13} color={colors.white} />
              </View>
            </View>
          </Pressable>
        )}
      />
      {/* Dot indicators */}
      <View style={s.heroDots}>
        {HERO_BANNERS.map((_, i) => (
          <View key={i} style={[s.heroDot, i === active && s.heroDotActive]} />
        ))}
      </View>
    </View>
  );
}

function MarqueeBar() {
  const translateX = useRef(new Animated.Value(0)).current;
  const [contentWidth, setContentWidth] = useState(0);
  const measured = useRef(false);
  const doubled = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS];

  useEffect(() => {
    if (!contentWidth) return;
    const halfW = contentWidth / 2;
    translateX.setValue(0);
    Animated.loop(
      Animated.timing(translateX, {
        toValue: -halfW,
        duration: halfW * 28,
        useNativeDriver: true,
        easing: Easing.linear,
      })
    ).start();
    return () => translateX.stopAnimation();
  }, [contentWidth]);

  return (
    <View style={[s.marqueeBar, { overflow: 'hidden' }]}>
      <Animated.View
        style={[s.marqueeContent, { transform: [{ translateX }] }]}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          if (!measured.current && w > 0) {
            measured.current = true;
            setContentWidth(w);
          }
        }}
      >
        {doubled.map((item, i) => (
          <View key={i} style={s.marqueeItem}>
            <Text style={s.marqueeDot}>•</Text>
            <Text style={s.marqueeText}>{item}</Text>
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

function ProductRail({ title, query, href }: { title: string; query: object; href: string }) {
  const router = useRouter();
  const { data, isLoading } = useProducts({ ...query, limit: 10 });
  const products = data?.data ?? [];
  const { width } = useWindowDimensions();
  const cardW = (width - spacing.lg * 2 - spacing.md) / 2;

  if (!isLoading && products.length === 0) return null;

  return (
    <View style={s.railWrap}>
      <SectionHeader title={title} onSeeAll={() => router.push(href as never)} />
      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
      ) : (
        <FlatList
          data={products}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(p) => p._id}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.md }}
          renderItem={({ item }: { item: Product }) => <ProductCard product={item} width={cardW * 0.85} />}
        />
      )}
    </View>
  );
}

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { user, isAuthenticated } = useAuth();
  const { data: cats } = useCategories();
  const { data: ptypes } = useProductTypes();
  const { data: cols } = useCollections();
  const categories = cats ?? [];
  const types = ptypes ?? [];
  const collections = cols ?? [];
  const delivery = useDelivery((s) => s.selected);
  const currentLabel = useDelivery((s) => s.currentLabel);
  const { data: cart } = useCart();
  const { count: cartCount } = cartTotals(cart);
  const { data: wishlist } = useWishlist();
  const { format } = useMoney();
  const wishCount = wishlist?.length ?? 0;
  const [recent, setRecent] = useState<MiniProduct[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [permVisible, setPermVisible] = useState(false);
  const cardW = (width - spacing.lg * 2 - spacing.md) / 2;

  useFocusEffect(useCallback(() => { recentlyViewed.get().then(setRecent); }, []));

  const openDelivery = async () => {
    const perm = await Location.getForegroundPermissionsAsync();
    if (perm.granted) setSheetOpen(true);
    else setPermVisible(true);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* ── Header ── */}
      <View style={[s.header, { paddingTop: insets.top + 4 }]}>
        {/* Delivery row */}
        <Pressable style={s.deliverRow} onPress={openDelivery}>
          <Ionicons name="location-outline" size={14} color={colors.primary} />
          <Text style={s.deliverText} numberOfLines={1}>
            {delivery
              ? `${delivery.city}${delivery.pincode ? ` - ${delivery.pincode}` : ''}`
              : currentLabel || 'Set delivery location'}
          </Text>
          <Ionicons name="chevron-down" size={12} color={colors.muted} />
        </Pressable>

        {/* Logo + action icons */}
        <View style={s.headerMain}>
          <Text style={s.logo}>STYLE IN NEED</Text>
          <View style={s.headerActions}>
            <Pressable onPress={() => router.push('/search')} style={s.actionBtn}>
              <Ionicons name="search-outline" size={22} color={colors.textSecondary} />
            </Pressable>
            <Pressable onPress={() => router.push('/(tabs)/wishlist')} style={s.actionBtn}>
              <Ionicons name="heart-outline" size={22} color={colors.textSecondary} />
              {wishCount > 0 && <View style={s.headerBadge}><Text style={s.headerBadgeText}>{wishCount > 9 ? '9+' : wishCount}</Text></View>}
            </Pressable>
            <Pressable onPress={() => router.push('/(tabs)/cart')} style={s.actionBtn}>
              <Ionicons name="bag-outline" size={22} color={colors.textSecondary} />
              {cartCount > 0 && <View style={s.headerBadge}><Text style={s.headerBadgeText}>{cartCount > 9 ? '9+' : cartCount}</Text></View>}
            </Pressable>
          </View>
        </View>

        {/* Search bar */}
        <Pressable style={s.searchBar} onPress={() => router.push('/search')}>
          <Ionicons name="search-outline" size={16} color={colors.muted} />
          <Text style={s.searchPlaceholder}>Search sarees, kurtis, jewellery…</Text>
        </Pressable>
      </View>

      <LocationPermissionModal
        visible={permVisible}
        onResult={() => { setPermVisible(false); setSheetOpen(true); }}
        onSkip={() => { setPermVisible(false); setSheetOpen(true); }}
      />
      <LocationSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Shop by Type — tabs + filtered categories */}
        <ShopByType categories={categories} types={types} router={router} />

        {/* Hero banners */}
        <HeroCarousel />

        {/* Marquee */}
        <MarqueeBar />

        {/* New Arrivals rail */}
        <ProductRail title="New Arrivals" query={{ isNewArrival: true }} href="/search?isNewArrival=true" />


        {/* Promo strip — 2 cards */}
        <View style={s.promoRow}>
          {[
            { title: 'New Arrivals', sub: 'Fresh drops', img: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600&q=80', href: '/search?isNewArrival=true' },
            { title: 'Jewellery', sub: '1 Gram Gold', img: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&q=80', href: '/search?productType=jewellery' },
          ].map((p) => (
            <Pressable key={p.title} style={[s.promoCard, shadow.soft]} onPress={() => router.push(p.href as never)}>
              <Image source={{ uri: p.img }} style={StyleSheet.absoluteFill} contentFit="cover" />
              <View style={s.promoScrim} />
              <View style={s.promoBody}>
                <Text style={s.promoSub}>{p.sub}</Text>
                <Text style={s.promoTitle}>{p.title}</Text>
              </View>
            </Pressable>
          ))}
        </View>

        {/* Best Sellers */}
        <ProductRail title="Best Sellers" query={{ isBestSeller: true }} href="/search?isBestSeller=true" />

        {/* Collections horizontal */}
        {collections.length > 0 && (
          <View style={s.railWrap}>
            <SectionHeader title="Collections" />
            <FlatList
              data={collections}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(c) => c._id}
              contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.md }}
              renderItem={({ item }) => (
                <Pressable style={s.colCard} onPress={() => router.push(`/search?collection=${item.slug}` as never)}>
                  <Image source={{ uri: item.bannerImage || item.image || categoryImage(item.name) }} style={StyleSheet.absoluteFill} contentFit="cover" />
                  <View style={s.promoScrim} />
                  <Text style={s.colName}>{item.name}</Text>
                </Pressable>
              )}
            />
          </View>
        )}

        {/* Trending — 2-column grid */}
        <View style={s.railWrap}>
          <SectionHeader title="Trending Now" onSeeAll={() => router.push('/search?isTrending=true' as never)} />
          <TrendingGrid cardW={cardW} />
        </View>

        {/* Recently viewed */}
        {recent.length > 0 && (
          <View style={s.railWrap}>
            <SectionHeader title="Recently Viewed" />
            <FlatList
              data={recent}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(p) => p._id}
              contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.md }}
              renderItem={({ item }) => (
                <Pressable style={{ width: cardW * 0.75 }} onPress={() => router.push(`/product/${item.slug}` as never)}>
                  <Image source={{ uri: item.images?.[0] }} style={[s.recentImg, { width: cardW * 0.75, height: (cardW * 0.75) * 4 / 3 }]} contentFit="cover" />
                  <Text style={s.recentName} numberOfLines={1}>{item.name}</Text>
                  <Text style={s.recentPrice}>{format(item.salePrice)}</Text>
                </Pressable>
              )}
            />
          </View>
        )}

        {/* Journal / Blog */}
        <Pressable style={s.journal} onPress={() => router.push('/blog')}>
          <View>
            <Text style={s.journalLabel}>FASHION STORIES</Text>
            <Text style={s.journalTitle}>Read the Journal</Text>
            <Text style={s.journalSub}>Style guides · Trend reports · Lookbooks</Text>
          </View>
          <View style={s.journalArrow}>
            <Ionicons name="arrow-forward" size={18} color={colors.primary} />
          </View>
        </Pressable>

        {/* Brand strip */}
        <View style={s.brandStrip}>
          {['Free Delivery', 'Easy Returns', 'Authentic Products', 'Secure Payments'].map((b, i) => (
            <View key={i} style={s.brandItem}>
              <Ionicons
                name={(['cube-outline', 'sync-outline', 'shield-checkmark-outline', 'lock-closed-outline'] as const)[i]}
                size={18}
                color={colors.primary}
              />
              <Text style={s.brandText}>{b}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function ShopByType({
  categories,
  types,
  router,
}: {
  categories: Category[];
  types: ProductType[];
  router: ReturnType<typeof useRouter>;
}) {
  const [activeType, setActiveType] = useState<string | null>(null);

  const tabs = [
    { _id: '__all__', slug: null as string | null, name: 'ALL' },
    ...types.map((t) => ({ ...t, slug: t.slug as string | null })),
  ];

  const filtered = activeType
    ? categories.filter((c) => c.productType === activeType)
    : categories;

  return (
    <View style={s.sbtWrap}>
      {/* ── Tab row with bump effect ── */}
      <View style={s.sbtTabOuter}>
        {/* Bottom line rendered BEHIND the ScrollView */}
        <View style={s.sbtLine} />

        {/* Tabs rendered ON TOP — active tab's white bg covers the line below */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.sbtTabs}
        >
          {tabs.map((t) => {
            const active = t.slug === activeType;
            return (
              <Pressable
                key={t._id}
                onPress={() => setActiveType(t.slug)}
                style={[s.sbtTab, active && s.sbtTabActive]}
              >
                <Text style={[s.sbtTabText, active && s.sbtTabTextActive]}>
                  {t.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Category icons ── */}
      {filtered.length > 0 && (
        <FlatList
          data={filtered}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(c) => c._id}
          contentContainerStyle={s.sbtCatList}
          renderItem={({ item, index }: { item: Category; index: number }) => (
            <Pressable
              style={s.sbtCatItem}
              onPress={() => router.push(`/search?category=${item.slug}` as never)}
            >
              <View style={s.sbtCatImgWrap}>
                <Image
                  source={{ uri: item.image || categoryImage(item.name, index) }}
                  style={s.sbtCatImg}
                  contentFit="cover"
                />
              </View>
              <Text style={s.sbtCatLabel} numberOfLines={2}>{item.name}</Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

function TrendingGrid({ cardW }: { cardW: number }) {
  const { data, isLoading } = useProducts({ isTrending: true, limit: 6 });
  const products = data?.data ?? [];
  if (isLoading) return <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.lg, gap: spacing.md }}>
      {products.slice(0, 6).map((p) => <ProductCard key={p._id} product={p} width={cardW} />)}
    </View>
  );
}

const s = StyleSheet.create({
  // Header
  header: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  deliverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  deliverText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 0.2,
    maxWidth: '70%',
    flexShrink: 1,
  },
  headerMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  logo: {
    fontFamily: fonts.headingBold,
    fontSize: 22,
    color: colors.textSecondary,
    letterSpacing: 3,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  headerBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  headerBadgeText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 8,
    color: colors.white,
    lineHeight: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: radii.xs,
    paddingHorizontal: 14,
    height: 42,
  },
  searchPlaceholder: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted,
    flex: 1,
  },
  // ── ShopByType ──────────────────────────────────────────────────────────
  sbtWrap: {
    backgroundColor: colors.surfaceWarm,
    paddingBottom: spacing.md,
  },
  // Tab row wrapper — relative so absolute line sits behind ScrollView
  sbtTabOuter: {
    position: 'relative',
  },
  // The colored line across the bottom of the tab row
  // Rendered FIRST in JSX so the ScrollView (rendered after) stacks on top
  sbtLine: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.primary,
  },
  sbtTabs: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: 0,
    alignItems: 'flex-end',
  },
  // Inactive tab
  sbtTab: {
    paddingHorizontal: spacing.xl,
    paddingTop: 10,
    paddingBottom: 10,
    marginRight: 2,
    alignItems: 'center',
  },
  // Active tab: white card, 3-sided border (left + top + right), rounded top corners
  // paddingBottom: 12 + marginBottom: 0 means the white bg extends to the bottom
  // of the ScrollView content, which covers the absolute sbtLine behind it
  sbtTabActive: {
    backgroundColor: colors.white,
    borderLeftWidth: 2,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: colors.primary,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingBottom: 12,
    marginBottom: 0,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  sbtTabText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 13,
    color: colors.muted,
    letterSpacing: 0.8,
  },
  sbtTabTextActive: {
    color: colors.textSecondary,
  },
  // Category icons
  sbtCatList: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    gap: spacing.lg,
  },
  sbtCatItem: {
    alignItems: 'center',
    width: 76,
    gap: 6,
  },
  sbtCatImgWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  sbtCatImg: {
    width: 68,
    height: 68,
  },
  sbtCatLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 14,
  },
  // Hero
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    background: 'transparent',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  heroContent: {
    position: 'absolute',
    bottom: 40,
    left: spacing.xl,
  },
  heroLabel: {
    fontFamily: fonts.bodySemibold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 2,
  },
  heroTitle: {
    fontFamily: fonts.headingBold,
    fontSize: 36,
    color: colors.white,
    lineHeight: 42,
    marginTop: 4,
  },
  heroCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  heroCtaText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 13,
    color: colors.white,
    letterSpacing: 1,
  },
  heroDots: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
  },
  heroDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  heroDotActive: {
    width: 20,
    backgroundColor: colors.white,
  },
  // Marquee
  marqueeBar: {
    backgroundColor: colors.textSecondary,
    paddingVertical: 8,
  },
  marqueeContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  marqueeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  marqueeDot: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    marginRight: 0,
  },
  marqueeText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 1,
    paddingHorizontal: 8,
  },
  // Sections
  railWrap: { marginTop: spacing.xl },
  secHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  secTitle: {
    fontFamily: fonts.headingBold,
    fontSize: 18,
    color: colors.textSecondary,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 11,
    color: colors.primary,
    letterSpacing: 0.5,
  },
  // Promo
  promoRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
  },
  promoCard: {
    flex: 1,
    height: 160,
    borderRadius: radii.xs,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    backgroundColor: colors.surface,
  },
  promoScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  promoBody: { padding: spacing.md },
  promoSub: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 0.5,
  },
  promoTitle: {
    fontFamily: fonts.headingBold,
    fontSize: 16,
    color: colors.white,
    marginTop: 2,
  },
  // Collections
  colCard: {
    width: 200,
    height: 120,
    borderRadius: radii.xs,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    backgroundColor: colors.surface,
  },
  colName: {
    fontFamily: fonts.headingBold,
    fontSize: 16,
    color: colors.white,
    padding: spacing.md,
  },
  // Recently viewed
  recentImg: {
    borderRadius: radii.xs,
    backgroundColor: colors.surface,
  },
  recentName: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 6,
  },
  recentPrice: {
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  // Journal
  journal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    padding: spacing.lg,
    backgroundColor: colors.surfaceWarm,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    borderRadius: radii.xs,
  },
  journalLabel: {
    fontFamily: fonts.bodySemibold,
    fontSize: 10,
    color: colors.primary,
    letterSpacing: 2,
  },
  journalTitle: {
    fontFamily: fonts.headingBold,
    fontSize: 20,
    color: colors.textSecondary,
    marginTop: 4,
  },
  journalSub: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.muted,
    marginTop: 4,
  },
  journalArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Brand strip
  brandStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  brandItem: {
    width: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  brandText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.textSecondary,
  },
});
