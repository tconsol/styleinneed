import { Pressable, View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radii } from '../theme';
import { formatPrice } from '../utils/format';
import { useWishlist, useToggleWishlist } from '../api/wishlist';
import { useAuth } from '../store/auth';
import type { Product } from '../types';

export default function ProductCard({ product, width }: { product: Product; width: number }) {
  const router = useRouter();
  const isAuth = useAuth((s) => s.isAuthenticated);
  const { data: wishlist } = useWishlist();
  const toggle = useToggleWishlist();
  const wishlisted = !!wishlist?.some((p: Product) => p._id === product._id);

  const onHeart = () => {
    if (!isAuth) { router.push('/(auth)/login'); return; }
    toggle.mutate(product._id);
  };

  const hasDiscount = product.discountPercentage > 0;
  const rating = product.ratings?.average;
  const ratingCount = product.ratings?.count;

  return (
    <Pressable style={[styles.card, { width }]} onPress={() => router.push(`/product/${product.slug}`)}>
      {/* Image container */}
      <View style={styles.imgWrap}>
        <Image
          source={{ uri: product.images?.[0] }}
          style={styles.image}
          contentFit="cover"
          transition={200}
        />
        {/* Discount badge — top left */}
        {hasDiscount && (
          <View style={styles.discBadge}>
            <Text style={styles.discText}>{product.discountPercentage}% OFF</Text>
          </View>
        )}
        {/* Wishlist — top right */}
        <Pressable style={styles.heart} onPress={onHeart} hitSlop={10}>
          <Ionicons
            name={wishlisted ? 'heart' : 'heart-outline'}
            size={18}
            color={wishlisted ? colors.danger : '#666'}
          />
        </Pressable>
        {/* Out of stock overlay */}
        {product.totalStock === 0 && (
          <View style={styles.oos}>
            <Text style={styles.oosText}>OUT OF STOCK</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.brand} numberOfLines={1}>
          {product.category?.name?.toUpperCase() ?? 'STYLE IN NEED'}
        </Text>
        <Text style={styles.name} numberOfLines={2}>{product.name}</Text>

        {/* Rating */}
        {!!rating && ratingCount > 0 && (
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={10} color={colors.gold} />
            <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
            <Text style={styles.ratingCount}>({ratingCount})</Text>
          </View>
        )}

        {/* Price row */}
        <View style={styles.priceRow}>
          <Text style={styles.price}>{formatPrice(product.salePrice)}</Text>
          {product.mrp > product.salePrice && (
            <Text style={styles.mrp}>{formatPrice(product.mrp)}</Text>
          )}
          {hasDiscount && (
            <Text style={styles.off}>({product.discountPercentage}% off)</Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white },
  imgWrap: {
    width: '100%',
    aspectRatio: 3 / 4,
    backgroundColor: colors.surface,
    position: 'relative',
    overflow: 'hidden',
    borderRadius: radii.xs,
  },
  image: { width: '100%', height: '100%' },
  discBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: colors.success,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 2,
  },
  discText: {
    color: colors.white,
    fontSize: 9,
    fontFamily: fonts.bodySemibold,
    letterSpacing: 0.3,
  },
  heart: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  oos: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  oosText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 11,
    color: colors.muted,
    letterSpacing: 1,
  },
  info: { paddingTop: 8, paddingBottom: 4 },
  brand: {
    fontFamily: fonts.bodySemibold,
    fontSize: 10,
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  name: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.mutedDark,
    lineHeight: 16,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
  },
  ratingText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 10,
    color: colors.textSecondary,
  },
  ratingCount: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.muted,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  price: {
    fontFamily: fonts.bodySemibold,
    fontSize: 13,
    color: colors.textSecondary,
  },
  mrp: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.muted,
    textDecorationLine: 'line-through',
  },
  off: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.success,
  },
});
