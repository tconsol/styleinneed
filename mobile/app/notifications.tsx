import { useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import EmptyState from '../src/components/EmptyState';
import { useNotifications, useMarkRead, useMarkAllRead, type AppNotification } from '../src/api/notifications';
import { colors, fonts, radii, spacing, shadow } from '../src/theme';
import { formatDate } from '../src/utils/format';

const TYPE_META: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; label: string }> = {
  order_confirmed:      { icon: 'checkmark-circle', color: '#10B981', label: 'Order' },
  order_cancelled:      { icon: 'close-circle',     color: colors.danger, label: 'Order' },
  order_shipped:        { icon: 'bicycle',           color: '#6366F1', label: 'Shipping' },
  order_delivered:      { icon: 'gift',              color: '#F59E0B', label: 'Delivered' },
  order_status_changed: { icon: 'refresh-circle',   color: '#6366F1', label: 'Update' },
  general:              { icon: 'megaphone',         color: colors.primary, label: 'Promo' },
};

function NotifCard({ item, onPress }: { item: AppNotification; onPress: () => void }) {
  const meta = TYPE_META[item.type] ?? TYPE_META.general;
  return (
    <Pressable style={[styles.card, !item.isRead && styles.cardUnread]} onPress={onPress}>
      {/* Unread accent bar */}
      {!item.isRead && <View style={styles.unreadBar} />}

      <View style={[styles.iconWrap, { backgroundColor: meta.color + '18' }]}>
        <Ionicons name={meta.icon} size={22} color={meta.color} />
      </View>

      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <Text style={[styles.notifType, { color: meta.color }]}>{meta.label.toUpperCase()}</Text>
          <Text style={styles.notifTime}>{formatDate(item.createdAt)}</Text>
        </View>
        <Text style={styles.notifTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.notifBody} numberOfLines={2}>{item.body}</Text>
      </View>

      {!item.isRead && <View style={styles.unreadDot} />}
    </Pressable>
  );
}

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, isLoading, refetch } = useNotifications();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  const items = data?.items ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  const handlePress = useCallback(
    (item: AppNotification) => {
      if (!item.isRead) markRead.mutate(item._id);
      if (item.orderId) router.push(`/order/${item.orderId}` as never);
    },
    [markRead, router]
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Custom header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount} new</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 ? (
          <Pressable style={styles.markAllBtn} onPress={() => markAllRead.mutate()}>
            <Text style={styles.markAllText}>Read all</Text>
          </Pressable>
        ) : (
          <View style={{ width: 64 }} />
        )}
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />
      ) : items.length === 0 ? (
        <EmptyState
          icon="notifications-outline"
          title="All caught up!"
          subtitle="Order updates and promotions will appear here."
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(n) => n._id}
          contentContainerStyle={{ padding: spacing.lg, gap: 10, paddingBottom: 32 }}
          onRefresh={refetch}
          refreshing={false}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <NotifCard item={item} onPress={() => handlePress(item)} />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginLeft: 4,
  },
  headerTitle: {
    fontFamily: fonts.headingBold,
    fontSize: 20,
    color: colors.textSecondary,
  },
  unreadBadge: {
    backgroundColor: colors.primary,
    borderRadius: radii.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  unreadBadgeText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 10,
    color: colors.white,
    letterSpacing: 0.3,
  },
  markAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.xs,
    backgroundColor: colors.surfaceWarm,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  markAllText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
    color: colors.primary,
  },
  // Notification card
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    paddingLeft: 18,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    overflow: 'hidden',
    position: 'relative',
    ...shadow.soft,
  },
  cardUnread: {
    backgroundColor: '#FFFBF4',
    borderColor: colors.primaryLight,
  },
  unreadBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: colors.primary,
    borderTopLeftRadius: radii.md,
    borderBottomLeftRadius: radii.md,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardBody: { flex: 1 },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  notifType: {
    fontFamily: fonts.bodySemibold,
    fontSize: 9,
    letterSpacing: 1,
  },
  notifTime: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.muted,
  },
  notifTitle: {
    fontFamily: fonts.bodySemibold,
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 3,
  },
  notifBody: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
    lineHeight: 17,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 4,
    flexShrink: 0,
  },
});
