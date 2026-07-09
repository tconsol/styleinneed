import { useEffect, useRef } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, Alert, Linking } from 'react-native';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useOrder, useCancelOrder, useVerifyPayment } from '../../src/api/orders';
import type { OrderItem, OrderStatus } from '../../src/types';
import { colors, fonts, radii, spacing, shadow } from '../../src/theme';
import { formatPrice } from '../../src/utils/format';
import { statusColor } from '../../src/utils/status';

const FLOW_STEPS: { key: OrderStatus; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'pending', label: 'Placed', icon: 'receipt-outline' },
  { key: 'confirmed', label: 'Confirmed', icon: 'checkmark-done-outline' },
  { key: 'packed', label: 'Packed', icon: 'cube-outline' },
  { key: 'shipped', label: 'Shipped', icon: 'car-outline' },
  { key: 'delivered', label: 'Delivered', icon: 'home-outline' },
];

export default function OrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: order, isLoading } = useOrder(id);
  const cancel = useCancelOrder();
  const verify = useVerifyPayment();
  const tried = useRef(false);

  useEffect(() => {
    if (!order || tried.current) return;
    const online = order.paymentMethod === 'razorpay' || order.paymentMethod === 'stripe';
    if (online && order.paymentStatus === 'pending') {
      tried.current = true;
      verify.mutate({ orderId: order._id, provider: order.paymentMethod as 'razorpay' | 'stripe' });
    }
  }, [order?._id, order?.paymentStatus]);

  const Header = (
    <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
      <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
        <Ionicons name="chevron-back" size={22} color={colors.text} />
      </Pressable>
      <Text style={styles.headerTitle} numberOfLines={1}>{order ? `Order #${order.orderId}` : 'Order'}</Text>
      <View style={styles.backBtn} />
    </View>
  );

  if (isLoading || !order) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Stack.Screen options={{ headerShown: false }} />
        {Header}
        <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />
      </View>
    );
  }

  const c = statusColor(order.status);
  const canCancel = order.status === 'pending' || order.status === 'confirmed';
  const flowIndex = FLOW_STEPS.findIndex((s) => s.key === order.status);
  const isTerminal = order.status === 'cancelled' || order.status === 'returned';
  const history = (order.statusHistory ?? []).slice().reverse();

  const onCancel = () => {
    Alert.alert('Cancel order?', 'This cannot be undone.', [
      { text: 'No', style: 'cancel' },
      { text: 'Cancel Order', style: 'destructive', onPress: () => cancel.mutate({ id: order._id, reason: 'Customer request' }) },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      {Header}

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        {/* Status hero */}
        <View style={[styles.hero, shadow.soft]}>
          <View style={[styles.heroIcon, { backgroundColor: c.bg }]}>
            <Ionicons
              name={isTerminal ? 'close-circle' : order.status === 'delivered' ? 'checkmark-circle' : 'time'}
              size={26}
              color={c.text}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.heroStatus, { color: c.text }]}>{order.status}</Text>
            <Text style={styles.heroSub}>
              {order.status === 'delivered' ? 'Your order has been delivered'
                : order.status === 'cancelled' ? 'This order was cancelled'
                : order.status === 'shipped' ? 'On the way to you'
                : 'We are processing your order'}
            </Text>
          </View>
        </View>

        {verify.isPending && (
          <View style={styles.verifying}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.verifyingText}>Confirming your payment…</Text>
          </View>
        )}

        {/* Modern horizontal flow */}
        {!isTerminal && (
          <View style={[styles.flowCard, shadow.soft]}>
            {FLOW_STEPS.map((s, i) => {
              const done = i <= flowIndex;
              const current = i === flowIndex;
              return (
                <View key={s.key} style={styles.flowStep}>
                  {/* connector to previous */}
                  {i > 0 && <View style={[styles.connector, done && styles.connectorDone]} />}
                  <View style={[styles.flowDot, done && styles.flowDotDone, current && styles.flowDotCurrent]}>
                    <Ionicons name={s.icon} size={16} color={done ? colors.white : colors.muted} />
                  </View>
                  <Text style={[styles.flowLabel, done && styles.flowLabelDone]}>{s.label}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Tracking history */}
        {history.length > 0 && (
          <View style={[styles.card, shadow.soft]}>
            <Text style={styles.cardTitle}>Order Tracking</Text>
            {history.map((h, i, arr) => (
              <View key={i} style={styles.trackRow}>
                <View style={styles.trackDotCol}>
                  <View style={[styles.trackDot, i === 0 && styles.trackDotActive]}>
                    {i === 0 && <Ionicons name="ellipse" size={8} color={colors.white} />}
                  </View>
                  {i < arr.length - 1 && <View style={styles.trackLine} />}
                </View>
                <View style={{ flex: 1, paddingBottom: 18 }}>
                  <Text style={[styles.trackStatus, i === 0 && { color: colors.primary }]}>{h.status}</Text>
                  {!!h.note && <Text style={styles.trackNote}>{h.note}</Text>}
                  <Text style={styles.trackTime}>
                    {new Date(h.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {order.trackingUrl && (
          <Pressable style={styles.track} onPress={() => Linking.openURL(order.trackingUrl!)}>
            <Ionicons name="navigate-outline" size={16} color={colors.white} />
            <Text style={styles.trackBtnText}>Track Shipment{order.awbCode ? ` · ${order.awbCode}` : ''}</Text>
          </Pressable>
        )}

        {/* Items */}
        <View style={[styles.card, shadow.soft]}>
          <Text style={styles.cardTitle}>Items ({order.items.length})</Text>
          {order.items.map((it: OrderItem, idx: number) => (
            <View key={idx} style={[styles.item, idx > 0 && styles.itemBorder]}>
              <Image source={{ uri: it.product.images?.[0] }} style={styles.thumb} contentFit="cover" />
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName} numberOfLines={2}>{it.product.name}</Text>
                {!!it.variant?.attributes && <Text style={styles.itemVar}>{Object.values(it.variant.attributes).join(' · ')}</Text>}
                <Text style={styles.itemMeta}>Qty {it.quantity} · {formatPrice(it.price)}</Text>
                {order.status === 'delivered' && (
                  <Pressable onPress={() => router.push(`/review/${it.product._id}?orderId=${order._id}`)}>
                    <Text style={styles.reviewLink}>Write a review</Text>
                  </Pressable>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Address */}
        <View style={[styles.card, shadow.soft]}>
          <Text style={styles.cardTitle}>Delivery Address</Text>
          <Text style={styles.addr}>
            {order.shippingAddress.fullName}{'\n'}
            {order.shippingAddress.line1}{order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ''}{'\n'}
            {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.pincode}{'\n'}
            {order.shippingAddress.phone}
          </Text>
        </View>

        {/* Payment */}
        <View style={[styles.card, shadow.soft]}>
          <Text style={styles.cardTitle}>Payment Summary</Text>
          <Row label="Subtotal" value={formatPrice(order.subtotal)} />
          {order.discount > 0 && <Row label="Discount" value={`- ${formatPrice(order.discount)}`} />}
          <Row label="Shipping" value={order.shippingCharge === 0 ? 'Free' : formatPrice(order.shippingCharge)} />
          <View style={styles.totalDivider} />
          <Row label="Total" value={formatPrice(order.total)} bold />
          <View style={styles.payBadge}>
            <Ionicons name="card-outline" size={14} color={colors.muted} />
            <Text style={styles.payMeta}>{order.paymentMethod.toUpperCase()} · {order.paymentStatus}</Text>
          </View>
        </View>

        {canCancel && (
          <Pressable style={styles.cancelBtn} onPress={onCancel} disabled={cancel.isPending}>
            <Ionicons name="close-circle-outline" size={18} color={colors.danger} />
            <Text style={styles.cancelText}>{cancel.isPending ? 'Cancelling…' : 'Cancel Order'}</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, bold && styles.boldLabel]}>{label}</Text>
      <Text style={[styles.rowVal, bold && styles.boldVal]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingBottom: spacing.sm, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: fonts.headingBold, fontSize: 17, color: colors.text },

  hero: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.white, borderRadius: radii.lg, padding: spacing.lg },
  heroIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  heroStatus: { fontFamily: fonts.headingBold, fontSize: 18, textTransform: 'capitalize' },
  heroSub: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, marginTop: 2 },

  verifying: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, backgroundColor: colors.surface, borderRadius: radii.md, padding: 12 },
  verifyingText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.text },

  flowCard: { flexDirection: 'row', backgroundColor: colors.white, borderRadius: radii.lg, paddingVertical: spacing.lg, paddingHorizontal: spacing.sm, marginTop: spacing.lg },
  flowStep: { flex: 1, alignItems: 'center' },
  connector: { position: 'absolute', top: 18, right: '50%', width: '100%', height: 3, backgroundColor: colors.border, borderRadius: 2 },
  connectorDone: { backgroundColor: colors.primary },
  flowDot: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  flowDotDone: { backgroundColor: colors.primary, borderColor: colors.primary },
  flowDotCurrent: { transform: [{ scale: 1.12 }], ...shadow.soft },
  flowLabel: { fontFamily: fonts.body, fontSize: 10, color: colors.muted, marginTop: 6 },
  flowLabelDone: { fontFamily: fonts.bodySemibold, color: colors.text },

  card: { backgroundColor: colors.white, borderRadius: radii.lg, padding: spacing.lg, marginTop: spacing.lg },
  cardTitle: { fontFamily: fonts.headingBold, fontSize: 16, color: colors.text, marginBottom: spacing.md },

  trackRow: { flexDirection: 'row', gap: 12 },
  trackDotCol: { alignItems: 'center', width: 18 },
  trackDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  trackDotActive: { backgroundColor: colors.primary },
  trackLine: { flex: 1, width: 2, backgroundColor: colors.border, marginVertical: 2 },
  trackStatus: { fontFamily: fonts.bodySemibold, fontSize: 14, color: colors.text, textTransform: 'capitalize' },
  trackNote: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 2 },
  trackTime: { fontFamily: fonts.body, fontSize: 11, color: colors.muted, marginTop: 2 },

  track: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderRadius: radii.full, paddingVertical: 14, marginTop: spacing.lg },
  trackBtnText: { fontFamily: fonts.bodySemibold, color: colors.white, fontSize: 14 },

  item: { flexDirection: 'row', gap: 12, paddingVertical: 12 },
  itemBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  thumb: { width: 56, height: 74, borderRadius: radii.sm, backgroundColor: colors.surface },
  itemName: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.text },
  itemVar: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 2 },
  itemMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 2 },
  reviewLink: { fontFamily: fonts.bodySemibold, fontSize: 12, color: colors.primary, marginTop: 6 },

  addr: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, lineHeight: 21 },

  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  rowLabel: { fontFamily: fonts.body, fontSize: 14, color: colors.muted },
  rowVal: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.text },
  boldLabel: { fontFamily: fonts.bodySemibold, color: colors.text },
  boldVal: { fontFamily: fonts.headingBold, fontSize: 17, color: colors.text },
  totalDivider: { height: 1, backgroundColor: colors.border, marginVertical: 6 },
  payBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  payMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, textTransform: 'capitalize' },

  cancelBtn: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', marginTop: spacing.xl, borderWidth: 1.5, borderColor: colors.danger, borderRadius: radii.full, paddingVertical: 14 },
  cancelText: { fontFamily: fonts.bodySemibold, fontSize: 15, color: colors.danger },
});
