import { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, useWindowDimensions, ActivityIndicator, Pressable } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ProductCard from '../src/components/ProductCard';
import EmptyState from '../src/components/EmptyState';
import SortSheet, { SORT_OPTIONS } from '../src/components/SortSheet';
import FilterSheet, { emptyFilters, filtersToQuery, activeFilterCount, type FilterState } from '../src/components/FilterSheet';
import { useProducts, useCategories, useProductTypes, useCollections } from '../src/api/catalog';
import { useCart, cartTotals } from '../src/api/cart';
import { useWishlist } from '../src/api/wishlist';
import { colors, fonts, radii, spacing, shadow } from '../src/theme';

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    search?: string; category?: string; productType?: string; collection?: string;
    isNewArrival?: string; isBestSeller?: string; isTrending?: string;
  }>();
  const { width } = useWindowDimensions();

  const hasContext = !!(params.category || params.productType || params.collection ||
    params.isNewArrival || params.isBestSeller || params.isTrending);

  const [q, setQ] = useState(params.search ?? '');
  const [debounced, setDebounced] = useState(q);
  const [sort, setSort] = useState('-createdAt');
  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const [sortOpen, setSortOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const { data, isLoading } = useProducts({
    search: debounced || undefined,
    category: params.category,
    productType: params.productType,
    collection: params.collection,
    isNewArrival: params.isNewArrival === 'true' || undefined,
    isBestSeller: params.isBestSeller === 'true' || undefined,
    isTrending: params.isTrending === 'true' || undefined,
    sort,
    ...filtersToQuery(filters),
    limit: 24,
  });
  const products = data?.data ?? [];
  const col = (width - spacing.lg * 3) / 2;

  // Resolve a friendly screen title from whatever context we were opened with.
  const { data: cats } = useCategories();
  const { data: types } = useProductTypes();
  const { data: cols } = useCollections();
  const title = useMemo(() => {
    if (params.category) return cats?.find((c) => c.slug === params.category)?.name ?? 'Category';
    if (params.collection) return cols?.find((c) => c.slug === params.collection)?.name ?? 'Collection';
    if (params.productType) return types?.find((t) => t.slug === params.productType)?.name ?? 'Products';
    if (params.isNewArrival) return 'New Arrivals';
    if (params.isBestSeller) return 'Best Sellers';
    if (params.isTrending) return 'Trending Now';
    return 'Search';
  }, [params, cats, types, cols]);

  // Infer productType from category so FilterSheet shows relevant attributes
  const filterProductType = useMemo(() => {
    if (params.productType) return params.productType;
    if (params.category && cats) {
      return cats.find((c) => c.slug === params.category)?.productType;
    }
    return undefined;
  }, [params.productType, params.category, cats]);

  const { data: cart } = useCart();
  const { count: cartCount } = cartTotals(cart);
  const { data: wishlist } = useWishlist();
  const wishCount = wishlist?.length ?? 0;
  const fCount = activeFilterCount(filters);
  const sortLabel = SORT_OPTIONS.find((o) => o.value === sort)?.label ?? 'Sort';

  const [showInput, setShowInput] = useState(!hasContext);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Custom header (safe-area aware) */}
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={styles.hIcon}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
          <Pressable onPress={() => setShowInput((s) => !s)} hitSlop={10} style={styles.hIcon}>
            <Ionicons name="search-outline" size={22} color={colors.text} />
          </Pressable>
          <Pressable onPress={() => router.push('/(tabs)/wishlist')} hitSlop={10} style={styles.hIcon}>
            <Ionicons name="heart-outline" size={22} color={colors.text} />
            {wishCount > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{wishCount}</Text></View>}
          </Pressable>
          <Pressable onPress={() => router.push('/(tabs)/cart')} hitSlop={10} style={styles.hIcon}>
            <Ionicons name="bag-outline" size={22} color={colors.text} />
            {cartCount > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{cartCount}</Text></View>}
          </Pressable>
        </View>

        {showInput && (
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color={colors.muted} />
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="Search sarees, kurtis, jewellery…"
              placeholderTextColor={colors.muted}
              style={styles.input}
              autoFocus={!hasContext}
              returnKeyType="search"
            />
            {!!q && <Pressable onPress={() => setQ('')} hitSlop={8}><Ionicons name="close-circle" size={18} color={colors.muted} /></Pressable>}
          </View>
        )}
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : products.length === 0 ? (
        <EmptyState icon="search-outline" title="No results" subtitle="Try a different search or filter." />
      ) : (
        <FlatList
          data={products}
          numColumns={2}
          keyExtractor={(p) => p._id}
          columnWrapperStyle={{ gap: spacing.lg, paddingHorizontal: spacing.lg }}
          contentContainerStyle={{ paddingVertical: spacing.md, paddingBottom: 90 }}
          ListHeaderComponent={<Text style={styles.resultCount}>{products.length} items</Text>}
          renderItem={({ item }) => <ProductCard product={item} width={col} />}
        />
      )}

      {/* Bottom Sort | Filter bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom || 10 }]}>
        <Pressable style={styles.barBtn} onPress={() => setSortOpen(true)}>
          <Ionicons name="swap-vertical-outline" size={18} color={colors.text} />
          <Text style={styles.barText}>SORT</Text>
        </Pressable>
        <View style={styles.barDivider} />
        <Pressable style={styles.barBtn} onPress={() => setFilterOpen(true)}>
          <Ionicons name="options-outline" size={18} color={colors.text} />
          <Text style={styles.barText}>FILTER{fCount > 0 ? ` (${fCount})` : ''}</Text>
        </Pressable>
      </View>

      <SortSheet visible={sortOpen} value={sort} onSelect={setSort} onClose={() => setSortOpen(false)} />
      <FilterSheet visible={filterOpen} productType={filterProductType} value={filters} onApply={setFilters} onClose={() => setFilterOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: colors.white, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border, ...shadow.soft },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, gap: 6 },
  hIcon: { padding: 6 },
  headerTitle: { flex: 1, fontFamily: fonts.headingBold, fontSize: 18, color: colors.text, marginLeft: 2 },
  badge: { position: 'absolute', top: 0, right: 0, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  badgeText: { fontFamily: fonts.bodySemibold, fontSize: 9, color: colors.white },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: spacing.lg, marginTop: spacing.sm, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1, borderColor: colors.border, borderRadius: radii.full, backgroundColor: colors.bg },
  input: { flex: 1, fontFamily: fonts.body, fontSize: 15, color: colors.text },
  resultCount: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border, ...shadow.card },
  barBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  barText: { fontFamily: fonts.bodySemibold, fontSize: 14, color: colors.text, letterSpacing: 0.5 },
  barDivider: { width: 1, height: 24, backgroundColor: colors.border },
});
