import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import EmptyState from '../src/components/EmptyState';
import { useAuth } from '../src/store/auth';
import { useMyOrders } from '../src/api/orders';
import { colors, fonts, radii, spacing, shadow } from '../src/theme';
import { formatPrice } from '../src/utils/format';
import { statusColor } from '../src/utils/status';

const STATUS_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  pending: 'time-outline',
  confirmed: 'checkmark-circle-outline',
  processing: 'construct-outline',
  shipped: 'airplane-outline',
  delivered: 'bag-check-outline',
  cancelled: 'close-circle-outline',
  returned: 'return-down-back-outline',
};

export default function Orders() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isAuth = useAuth((s) => s.isAuthenticated);
  const { data, isLoading } = useMyOrders();
  const orders = data?.data ?? [];

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Custom header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
        </Pressable>
        <Text style={styles.headerTitle}>My Orders</Text>
        <Pressable style={styles.searchBtn} onPress={() => router.push('/search')} hitSlop={10}>
          <Ionicons name="search-outline" size={22} color={colors.textSecondary} />
        </Pressable>
      </View>

      {!isAuth ? (
        <EmptyState icon="cube-outline" title="Sign in to view orders"
          ctaText="Sign In" onCta={() => router.push('/(auth)/login')} />
      ) : isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />
      ) : orders.length === 0 ? (
        <EmptyState icon="cube-outline" title="No orders yet"
          subtitle="Your placed orders will appear here."
          ctaText="Start Shopping" onCta={() => router.push('/(tabs)')} />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(o) => o._id}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 32 }}
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.border }} />}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const c = statusColor(item.status);
            const statusIcon = STATUS_ICON[item.status] ?? 'cube-outline';

            return (
              <Pressable style={styles.card} onPress={() => router.push(`/order/${item._id}`)}>
                {/* Top row */}
                <View style={styles.cardTop}>
                  <View style={styles.orderIdRow}>
                    <Text style={styles.orderLabel}>ORDER</Text>
                    <Text style={styles.orderId}>#{item.orderId}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: c.bg }]}>
                    <Ionicons name={statusIcon} size={11} color={c.text} />
                    <Text style={[styles.statusText, { color: c.text }]}>{item.status.toUpperCase()}</Text>
                  </View>
                </View>

                {/* Meta */}
                <View style={styles.metaRow}>
                  <Ionicons name="calendar-outline" size={12} color={colors.muted} />
                  <Text style={styles.meta}>{new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
                  <Text style={styles.metaDot}>·</Text>
                  <Text style={styles.meta}>{item.items.length} {item.items.length === 1 ? 'item' : 'items'}</Text>
                </View>

                {/* Amount + arrow */}
                <View style={styles.cardBottom}>
                  <View>
                    <Text style={styles.totalLabel}>Total Amount</Text>
                    <Text style={styles.total}>{formatPrice(item.total)}</Text>
                  </View>
                  <View style={styles.viewBtn}>
                    <Text style={styles.viewBtnText}>Details</Text>
                    <Ionicons name="chevron-forward" size={14} color={colors.primary} />
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },
  backBtn: { padding: 6 },
  headerTitle: {
    flex: 1,
    fontFamily: fonts.headingBold,
    fontSize: 20,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  searchBtn: { padding: 6 },
  card: {
    paddingVertical: 18,
    backgroundColor: colors.white,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  orderIdRow: { gap: 2 },
  orderLabel: {
    fontFamily: fonts.bodySemibold,
    fontSize: 9,
    color: colors.muted,
    letterSpacing: 1.5,
  },
  orderId: {
    fontFamily: fonts.bodySemibold,
    fontSize: 15,
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.full,
  },
  statusText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 10,
    letterSpacing: 0.3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 12,
  },
  meta: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
  },
  metaDot: {
    color: colors.muted,
    fontSize: 12,
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.muted,
  },
  total: {
    fontFamily: fonts.bodySemibold,
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 1,
  },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    borderRadius: radii.full,
  },
  viewBtnText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
    color: colors.primary,
  },
});
