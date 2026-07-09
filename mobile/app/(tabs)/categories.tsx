import { useState } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet,
  useWindowDimensions, ActivityIndicator, TextInput, ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCategories, useProductTypes } from '../../src/api/catalog';
import { categoryImage } from '../../src/lib/categoryImage';
import { colors, fonts, radii, spacing, shadow } from '../../src/theme';
import type { Category, ProductType } from '../../src/types';

const FEATURED = [
  { label: 'New Arrivals', icon: 'sparkles-outline' as const, href: '/search?isNewArrival=true', color: '#E8D5F0' },
  { label: 'Best Sellers', icon: 'trending-up-outline' as const, href: '/search?isBestSeller=true', color: '#FDE8D8' },
  { label: 'Trending', icon: 'flame-outline' as const, href: '/search?isTrending=true', color: '#D8EDF8' },
  { label: 'Offers', icon: 'pricetag-outline' as const, href: '/search', color: '#D8F8E0' },
];

export default function Categories() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { data, isLoading } = useCategories();
  const { data: types } = useProductTypes();
  const [activeType, setActiveType] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const all = data ?? [];
  const filtered = all.filter((c) => {
    if (activeType && c.productType !== activeType) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const col = (width - spacing.lg * 2 - spacing.sm) / 2;

  return (
    <View style={[s.flex, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Categories</Text>
        <Pressable hitSlop={8} onPress={() => router.push('/search')}>
          <Ionicons name="search-outline" size={22} color={colors.textSecondary} />
        </Pressable>
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <View style={s.searchBar}>
          <Ionicons name="search-outline" size={15} color={colors.muted} />
          <TextInput
            style={s.searchInput}
            placeholder="Search categories..."
            placeholderTextColor={colors.muted}
            value={search}
            onChangeText={setSearch}
          />
          {!!search && (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.muted} />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Featured quick links */}
        <View style={s.featuredRow}>
          {FEATURED.map((f) => (
            <Pressable key={f.label} style={[s.featuredCard, { backgroundColor: f.color }]} onPress={() => router.push(f.href as never)}>
              <Ionicons name={f.icon} size={20} color={colors.textSecondary} />
              <Text style={s.featuredText}>{f.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Product type tabs */}
        {!!types?.length && (
          <>
            <Text style={s.sectionLabel}>SHOP BY TYPE</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.typeTabsContent}>
              {[{ _id: 'all', name: 'All', slug: '' } as ProductType, ...types].map((t) => {
                const active = (t.slug || null) === activeType;
                return (
                  <Pressable key={t._id} style={[s.typeTab, active && s.typeTabActive]}
                    onPress={() => setActiveType(t.slug || null)}>
                    <Text style={[s.typeTabText, active && s.typeTabTextActive]}>{t.name}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </>
        )}

        {/* Category cards */}
        <Text style={s.sectionLabel}>
          {activeType
            ? (types?.find((t) => t.slug === activeType)?.name ?? 'Categories').toUpperCase()
            : 'ALL CATEGORIES'}
        </Text>
        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 40 }} />
        ) : filtered.length === 0 ? (
          <View style={s.emptyWrap}>
            <Ionicons name="search-outline" size={32} color={colors.muted} />
            <Text style={s.emptyText}>No categories found</Text>
          </View>
        ) : (
          <View style={s.grid}>
            {filtered.map((item: Category, index: number) => (
              <Pressable
                key={item._id}
                style={[s.card, { width: col }, shadow.soft]}
                onPress={() => router.push(`/search?category=${item.slug}` as never)}
              >
                <Image
                  source={{ uri: item.image || categoryImage(item.name, index) }}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                  transition={200}
                />
                <View style={s.scrim} />
                <View style={s.cardBody}>
                  <Text style={s.cardName} numberOfLines={2}>{item.name}</Text>
                  <View style={s.cardCta}>
                    <Text style={s.cardCtaText}>Shop</Text>
                    <Ionicons name="arrow-forward" size={11} color={colors.textSecondary} />
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },
  headerTitle: {
    fontFamily: fonts.headingBold,
    fontSize: 22,
    color: colors.textSecondary,
  },
  // Search
  searchWrap: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    height: 40,
    borderRadius: radii.xs,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textSecondary,
  },
  // Featured
  featuredRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.sm,
  },
  featuredCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    gap: 6,
    borderRadius: radii.xs,
  },
  featuredText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  // Section label
  sectionLabel: {
    fontFamily: fonts.bodySemibold,
    fontSize: 11,
    color: colors.muted,
    letterSpacing: 1.5,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
  },
  // Type tabs
  typeTabsContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    paddingBottom: 2,
  },
  typeTab: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  typeTabActive: {
    borderColor: colors.textSecondary,
    backgroundColor: colors.textSecondary,
  },
  typeTabText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.mutedDark,
  },
  typeTabTextActive: {
    color: colors.white,
    fontFamily: fonts.bodySemibold,
  },
  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  card: {
    aspectRatio: 0.85,
    borderRadius: radii.xs,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    backgroundColor: colors.surface,
  },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(20,20,20,0.3)' },
  cardBody: { padding: spacing.md },
  cardName: {
    fontFamily: fonts.headingBold,
    fontSize: 16,
    color: colors.white,
    lineHeight: 20,
  },
  cardCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: colors.white,
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  cardCtaText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 10,
    color: colors.textSecondary,
  },
  // Empty
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.muted,
  },
});
