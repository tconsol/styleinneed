import { useState } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import EmptyState from '../../src/components/EmptyState';
import { useAuth } from '../../src/store/auth';
import { useCart, useCartMutations, cartTotals } from '../../src/api/cart';
import { useApplyCoupon, type CouponResult } from '../../src/api/coupon';
import { colors, fonts, radii, spacing, shadow } from '../../src/theme';
import { useMoney, useCurrency } from '../../src/store/currency';
import type { CartItem, ProductVariant } from '../../src/types';

const variantLabel = (item: CartItem) => {
  const v = item.product.variants?.find((x: ProductVariant) => x.sku === item.variantSku);
  const attrs = v?.attributes ? Object.values(v.attributes).filter(Boolean) : [];
  return attrs.length ? attrs.join(' · ') : null;
};

export default function Cart() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isAuth = useAuth((s) => s.isAuthenticated);
  const { data: cart, isLoading } = useCart();
  const { update, remove } = useCartMutations();
  const { count, subtotal } = cartTotals(cart);
  const applyCoupon = useApplyCoupon();
  const { format, isUSA } = useMoney();
  const freeShipThreshold = useCurrency((s) => s.freeShipThreshold);
  const [coupon, setCoupon] = useState('');
  const [couponResult, setCouponResult] = useState<CouponResult | null>(null);
  const [couponError, setCouponError] = useState('');

  // Cart amounts are INR; format() converts for USD viewers. Real shipping is
  // finalised at checkout (per-state for US, threshold for India).
  const mrpTotal = cart?.items?.reduce((s, i) => s + (i.product?.mrp ?? i.price) * i.quantity, 0) ?? 0;
  const discount = Math.max(0, mrpTotal - subtotal);
  const couponDiscount = couponResult?.discountAmount ?? 0;
  const shipping = isUSA ? 0 : couponResult?.freeShipping ? 0 : (subtotal > 0 && subtotal < freeShipThreshold ? 99 : 0);
  const total = subtotal + shipping - couponDiscount;

  const handleApplyCoupon = async () => {
    setCouponError('');
    try {
      const result = await applyCoupon.mutateAsync({ code: coupon.trim(), cartTotal: subtotal });
      setCouponResult(result);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Invalid coupon code';
      setCouponError(msg);
    }
  };

  const handleRemoveCoupon = () => {
    setCoupon('');
    setCouponResult(null);
    setCouponError('');
  };

  if (!isAuth) {
    return (
      <View style={[styles.flex, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Bag</Text>
        </View>
        <EmptyState icon="bag-outline" title="Sign in to view your bag"
          ctaText="Sign In" onCta={() => router.push('/(auth)/login')} />
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.flex, { paddingTop: insets.top }]}>
        <View style={styles.header}><Text style={styles.headerTitle}>My Bag</Text></View>
        <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />
      </View>
    );
  }

  if (!cart?.items?.length) {
    return (
      <View style={[styles.flex, { paddingTop: insets.top }]}>
        <View style={styles.header}><Text style={styles.headerTitle}>My Bag</Text></View>
        <EmptyState icon="bag-outline" title="Your bag is empty"
          subtitle="Add pieces you love and they'll show up here."
          ctaText="Start Shopping" onCta={() => router.push('/(tabs)')} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.flex, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>My Bag</Text>
            <Text style={styles.headerSub}>{count} {count === 1 ? 'item' : 'items'}</Text>
          </View>
          <Pressable onPress={() => router.push(couponResult ? `/checkout?coupon=${couponResult.code}` : '/checkout')} style={styles.headerCta}>
            <Text style={styles.headerCtaText}>PLACE ORDER</Text>
          </Pressable>
        </View>

        <FlatList
          data={cart.items}
          keyExtractor={(i) => `${i.product._id}-${i.variantSku}`}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 160 }}
          ListFooterComponent={
            <View style={{ paddingHorizontal: spacing.lg }}>
              {/* Coupon */}
              <View style={[styles.couponBox, couponResult && styles.couponBoxApplied]}>
                <Ionicons
                  name={couponResult ? 'checkmark-circle' : 'pricetag-outline'}
                  size={16}
                  color={couponResult ? colors.success : colors.primary}
                />
                <TextInput
                  style={styles.couponInput}
                  placeholder="Enter coupon code"
                  placeholderTextColor={colors.muted}
                  value={coupon}
                  onChangeText={(t) => { setCoupon(t); setCouponError(''); }}
                  autoCapitalize="characters"
                  editable={!couponResult}
                />
                {applyCoupon.isPending ? (
                  <ActivityIndicator size="small" color={colors.primary} style={{ paddingHorizontal: 10 }} />
                ) : (
                  <Pressable
                    style={[styles.couponBtn, (!coupon && !couponResult) && { opacity: 0.4 }]}
                    disabled={(!coupon && !couponResult) || applyCoupon.isPending}
                    onPress={couponResult ? handleRemoveCoupon : handleApplyCoupon}
                  >
                    <Text style={[styles.couponBtnText, couponResult && { color: colors.danger }]}>
                      {couponResult ? 'REMOVE' : 'APPLY'}
                    </Text>
                  </Pressable>
                )}
              </View>
              {!!couponError && <Text style={styles.couponError}>{couponError}</Text>}
              {!!couponResult && (
                <View style={styles.couponSuccess}>
                  <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                  <Text style={styles.couponSuccessText}>
                    "{couponResult.code}" applied! You save {format(couponDiscount)}
                    {couponResult.freeShipping ? ' + Free Shipping' : ''}
                  </Text>
                </View>
              )}

              {/* Delivery info */}
              <View style={styles.deliveryBox}>
                <Ionicons name="cube-outline" size={16} color={colors.success} />
                <Text style={styles.deliveryText}>
                  {isUSA
                    ? 'Delivery charged by state at checkout'
                    : shipping === 0
                    ? 'Free delivery on this order 🎉'
                    : `Add ${format(freeShipThreshold - subtotal)} more for free delivery`}
                </Text>
              </View>

              {/* Price summary */}
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>PRICE DETAILS</Text>
                <View style={styles.sumRow}>
                  <Text style={styles.sumLabel}>MRP Total ({count} items)</Text>
                  <Text style={styles.sumVal}>{format(mrpTotal)}</Text>
                </View>
                {discount > 0 && (
                  <View style={styles.sumRow}>
                    <Text style={styles.sumLabel}>Discount</Text>
                    <Text style={[styles.sumVal, { color: colors.success }]}>- {format(discount)}</Text>
                  </View>
                )}
                {couponDiscount > 0 && (
                  <View style={styles.sumRow}>
                    <Text style={styles.sumLabel}>Coupon ({couponResult?.code})</Text>
                    <Text style={[styles.sumVal, { color: colors.success }]}>- {format(couponDiscount)}</Text>
                  </View>
                )}
                <View style={styles.sumRow}>
                  <Text style={styles.sumLabel}>Delivery</Text>
                  <Text style={[styles.sumVal, shipping === 0 && !isUSA && { color: colors.success }]}>
                    {isUSA ? 'At checkout' : shipping === 0 ? 'FREE' : format(shipping)}
                  </Text>
                </View>
                <View style={styles.sumDivider} />
                <View style={styles.sumRow}>
                  <Text style={styles.totalLabel}>Total Amount</Text>
                  <Text style={styles.totalVal}>{format(Math.max(0, total))}</Text>
                </View>
                {(discount > 0 || couponDiscount > 0) && (
                  <Text style={styles.savingsNote}>
                    You save {format(discount + couponDiscount)} on this order
                  </Text>
                )}
              </View>
            </View>
          }
          renderItem={({ item }: { item: CartItem }) => {
            const v = item.product.variants?.find((x: ProductVariant) => x.sku === item.variantSku);
            const maxStock = v?.stock ?? 99;
            const label = variantLabel(item);
            const hasDiscount = item.product.discountPercentage > 0;

            return (
              <View style={styles.itemCard}>
                {/* Image */}
                <Pressable onPress={() => router.push(`/product/${item.product.slug}`)}>
                  <Image source={{ uri: item.product.images?.[0] }} style={styles.thumb} contentFit="cover" />
                </Pressable>

                {/* Info */}
                <View style={styles.itemBody}>
                  <Pressable onPress={() => router.push(`/product/${item.product.slug}`)}>
                    <Text style={styles.brand} numberOfLines={1}>
                      {item.product.category?.name?.toUpperCase() ?? 'STYLE IN NEED'}
                    </Text>
                    <Text style={styles.name} numberOfLines={2}>{item.product.name}</Text>
                    {!!label && <Text style={styles.variant}>{label}</Text>}
                  </Pressable>

                  {/* Price row */}
                  <View style={styles.priceRow}>
                    <Text style={styles.price}>{format(item.price)}</Text>
                    {item.product.mrp > item.price && (
                      <Text style={styles.mrp}>{format(item.product.mrp)}</Text>
                    )}
                    {hasDiscount && (
                      <Text style={styles.off}>{item.product.discountPercentage}% off</Text>
                    )}
                  </View>

                  {/* Qty stepper */}
                  <View style={styles.qtyRow}>
                    <Pressable
                      style={[styles.qtyBtn, item.quantity <= 1 && styles.qtyBtnDanger]}
                      onPress={() => {
                        if (item.quantity <= 1) remove.mutate({ productId: item.product._id, variantSku: item.variantSku });
                        else update.mutate({ productId: item.product._id, variantSku: item.variantSku, quantity: item.quantity - 1 });
                      }}
                    >
                      <Ionicons name={item.quantity <= 1 ? 'trash-outline' : 'remove'} size={14}
                        color={item.quantity <= 1 ? colors.danger : colors.textSecondary} />
                    </Pressable>
                    <Text style={styles.qty}>{item.quantity}</Text>
                    <Pressable
                      style={[styles.qtyBtn, item.quantity >= maxStock && { opacity: 0.4 }]}
                      disabled={item.quantity >= maxStock}
                      onPress={() => update.mutate({ productId: item.product._id, variantSku: item.variantSku, quantity: item.quantity + 1 })}
                    >
                      <Ionicons name="add" size={14} color={colors.textSecondary} />
                    </Pressable>
                  </View>
                </View>

                {/* Remove X */}
                <Pressable
                  style={styles.removeBtn}
                  onPress={() => remove.mutate({ productId: item.product._id, variantSku: item.variantSku })}
                  hitSlop={10}
                >
                  <Ionicons name="close" size={16} color={colors.muted} />
                </Pressable>
              </View>
            );
          }}
        />

        {/* Fixed bottom CTA */}
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 10 }]}>
          <View>
            <Text style={styles.bottomTotal}>{format(total)}</Text>
            <Text style={styles.bottomSub}>incl. all taxes</Text>
          </View>
          <Pressable style={styles.placeOrder} onPress={() => router.push(couponResult ? `/checkout?coupon=${couponResult.code}` : '/checkout')}>
            <Text style={styles.placeOrderText}>PLACE ORDER</Text>
            <Ionicons name="arrow-forward" size={16} color={colors.white} />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
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
  headerSub: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
    marginTop: 1,
  },
  headerCta: {
    borderWidth: 1.5,
    borderColor: colors.textSecondary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radii.xs,
  },
  headerCtaText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  // Cart item
  itemCard: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'flex-start',
  },
  thumb: {
    width: 86,
    height: 112,
    borderRadius: radii.xs,
    backgroundColor: colors.surface,
  },
  itemBody: { flex: 1 },
  brand: {
    fontFamily: fonts.bodySemibold,
    fontSize: 10,
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  name: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  variant: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.muted,
    marginTop: 3,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  price: {
    fontFamily: fonts.bodySemibold,
    fontSize: 14,
    color: colors.textSecondary,
  },
  mrp: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
    textDecorationLine: 'line-through',
  },
  off: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.success,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
    marginTop: 10,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xs,
    overflow: 'hidden',
  },
  qtyBtn: {
    width: 32,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  qtyBtnDanger: { backgroundColor: '#FFF0F0' },
  qty: {
    fontFamily: fonts.bodySemibold,
    fontSize: 13,
    color: colors.textSecondary,
    minWidth: 30,
    textAlign: 'center',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border,
    height: 30,
    lineHeight: 30,
  },
  removeBtn: {
    padding: 4,
    marginTop: -4,
  },
  // Coupon
  couponBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xs,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: spacing.lg,
    backgroundColor: colors.white,
  },
  couponBoxApplied: {
    borderColor: colors.success,
    backgroundColor: '#F0FBF4',
  },
  couponInput: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.textSecondary,
  },
  couponBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  couponBtnText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
    color: colors.primary,
    letterSpacing: 0.5,
  },
  couponError: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.danger,
    marginTop: 6,
    marginLeft: 4,
  },
  couponSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    marginLeft: 4,
  },
  couponSuccessText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.success,
    flex: 1,
  },
  // Delivery
  deliveryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.successLight,
    borderRadius: radii.xs,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: spacing.sm,
  },
  deliveryText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.success,
    flex: 1,
  },
  // Summary
  summaryCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xs,
    padding: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  summaryTitle: {
    fontFamily: fonts.bodySemibold,
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 1.5,
    marginBottom: spacing.md,
  },
  sumRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sumLabel: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.mutedDark,
  },
  sumVal: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.textSecondary,
  },
  sumDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  totalLabel: {
    fontFamily: fonts.bodySemibold,
    fontSize: 15,
    color: colors.textSecondary,
  },
  totalVal: {
    fontFamily: fonts.headingBold,
    fontSize: 16,
    color: colors.textSecondary,
  },
  savingsNote: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.success,
    textAlign: 'center',
    marginTop: 10,
    backgroundColor: colors.successLight,
    paddingVertical: 8,
    borderRadius: radii.xs,
  },
  // Bottom bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: 14,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadow.bottom,
  },
  bottomTotal: {
    fontFamily: fonts.headingBold,
    fontSize: 18,
    color: colors.textSecondary,
  },
  bottomSub: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.muted,
    marginTop: 1,
  },
  placeOrder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.textSecondary,
    paddingHorizontal: 28,
    paddingVertical: 15,
    borderRadius: radii.xs,
  },
  placeOrderText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 14,
    color: colors.white,
    letterSpacing: 0.5,
  },
});
