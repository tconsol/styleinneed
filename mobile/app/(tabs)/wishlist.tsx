import { View, Text, FlatList, Pressable, StyleSheet, useWindowDimensions, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import EmptyState from '../../src/components/EmptyState';
import ProductCard from '../../src/components/ProductCard';
import { useAuth } from '../../src/store/auth';
import { useWishlist, useToggleWishlist } from '../../src/api/wishlist';
import { useCartMutations } from '../../src/api/cart';
import { colors, fonts, spacing } from '../../src/theme';
import type { Product } from '../../src/types';

export default function Wishlist() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isAuth = useAuth((s) => s.isAuthenticated);
  const { data: products, isLoading } = useWishlist();
  const toggle = useToggleWishlist();
  const { add } = useCartMutations();
  const cardW = (width - spacing.lg * 2 - spacing.sm) / 2;

  if (!isAuth) {
    return (
      <View style={[s.flex, { paddingTop: insets.top }]}>
        <View style={s.header}><Text style={s.headerTitle}>Wishlist</Text></View>
        <EmptyState icon="heart-outline" title="Sign in to view your wishlist"
          ctaText="Sign In" onCta={() => router.push('/(auth)/login')} />
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={[s.flex, { paddingTop: insets.top }]}>
        <View style={s.header}><Text style={s.headerTitle}>Wishlist</Text></View>
        <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />
      </View>
    );
  }

  if (!products?.length) {
    return (
      <View style={[s.flex, { paddingTop: insets.top }]}>
        <View style={s.header}><Text style={s.headerTitle}>Wishlist</Text></View>
        <EmptyState icon="heart-outline" title="Your wishlist is empty"
          subtitle="Tap the heart on any product to save it here."
          ctaText="Browse Products" onCta={() => router.push('/(tabs)')} />
      </View>
    );
  }

  return (
    <View style={[s.flex, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Wishlist</Text>
          <Text style={s.headerSub}>{products.length} saved {products.length === 1 ? 'item' : 'items'}</Text>
        </View>
        <Pressable style={s.moveAllBtn} onPress={() => {
          products.forEach((p: Product) => {
            const v = p.variants?.find((x) => x.stock > 0) ?? p.variants?.[0];
            if (v) add.mutate({ productId: p._id, variantSku: v.sku, quantity: 1 });
            toggle.mutate(p._id);
          });
        }}>
          <Ionicons name="bag-outline" size={14} color={colors.textSecondary} />
          <Text style={s.moveAllText}>Move All to Bag</Text>
        </Pressable>
      </View>

      <FlatList
        data={products}
        numColumns={2}
        keyExtractor={(p) => p._id}
        columnWrapperStyle={{ gap: spacing.sm, paddingHorizontal: spacing.lg }}
        contentContainerStyle={{ paddingBottom: 32, gap: spacing.sm, paddingTop: spacing.sm }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }: { item: Product }) => <ProductCard product={item} width={cardW} />}
      />
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
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
  headerSub: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
    marginTop: 1,
  },
  moveAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 2,
  },
  moveAllText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 11,
    color: colors.textSecondary,
  },
});
