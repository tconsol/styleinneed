import { View, Text, Pressable, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Screen from '../../src/components/Screen';
import EmptyState from '../../src/components/EmptyState';
import { useAuth } from '../../src/store/auth';
import { useMyOrders } from '../../src/api/orders';
import { useWishlist } from '../../src/api/wishlist';
import { colors, fonts, radii, spacing, shadow } from '../../src/theme';

const ROWS: { icon: keyof typeof Ionicons.glyphMap; label: string; href: string }[] = [
  { icon: 'cube-outline', label: 'My Orders', href: '/orders' },
  { icon: 'location-outline', label: 'Addresses', href: '/addresses' },
  { icon: 'heart-outline', label: 'Wishlist', href: '/(tabs)/wishlist' },
  { icon: 'notifications-outline', label: 'Notifications', href: '/notifications' },
  { icon: 'help-circle-outline', label: 'Support', href: '/support' },
  { icon: 'settings-outline', label: 'Settings', href: '/settings' },
];

export default function Profile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated, logout } = useAuth();
  const { data: orders } = useMyOrders();
  const { data: wishlist } = useWishlist();
  const orderCount = orders?.data?.length ?? 0;
  const wishCount = wishlist?.length ?? 0;

  if (!isAuthenticated) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
        <View style={styles.authHeader}><Text style={styles.authHeaderTitle}>Profile</Text></View>
        <EmptyState
          icon="person-outline"
          title="Sign in to your account"
          subtitle="Access orders, wishlist, addresses and more."
          ctaText="Sign In"
          onCta={() => router.push('/(auth)/login')}
        />
      </View>
    );
  }

  const onLogout = () => {
    Alert.alert('Sign out?', 'You can sign back in anytime.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Brand header with avatar */}
        <View style={[styles.hero, { paddingTop: insets.top + 20 }]}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase()}</Text></View>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          {!!user?.phone && <Text style={styles.phone}>{user.phone}</Text>}
        </View>

        {/* Stats strip */}
        <View style={styles.statsRow}>
          <Pressable style={styles.statItem} onPress={() => router.push('/orders')}>
            <Text style={styles.statNum}>{orderCount}</Text>
            <Text style={styles.statLabel}>Orders</Text>
          </Pressable>
          <View style={styles.statDivider} />
          <Pressable style={styles.statItem} onPress={() => router.push('/(tabs)/wishlist')}>
            <Text style={styles.statNum}>{wishCount}</Text>
            <Text style={styles.statLabel}>Wishlist</Text>
          </Pressable>
          <View style={styles.statDivider} />
          <Pressable style={styles.statItem} onPress={() => router.push('/addresses')}>
            <Ionicons name="location-outline" size={20} color={colors.primary} />
            <Text style={styles.statLabel}>Addresses</Text>
          </Pressable>
        </View>

        {/* Menu list */}
        <View style={[styles.menu, shadow.card]}>
          {ROWS.map((r, i) => (
            <Pressable key={r.label} style={[styles.row, i === ROWS.length - 1 && { borderBottomWidth: 0 }]} onPress={() => router.push(r.href as never)}>
              <View style={styles.rowIcon}><Ionicons name={r.icon} size={18} color={colors.primary} /></View>
              <Text style={styles.rowLabel}>{r.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} style={{ marginLeft: 'auto' }} />
            </Pressable>
          ))}
        </View>

        <Pressable style={styles.logout} onPress={onLogout}>
          <Ionicons name="log-out-outline" size={20} color={colors.danger} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { fontFamily: fonts.headingBold, fontSize: 26, color: colors.text, padding: spacing.lg },
  authHeader: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  authHeaderTitle: { fontFamily: fonts.headingBold, fontSize: 22, color: colors.textSecondary },
  hero: { paddingBottom: 56, alignItems: 'center', backgroundColor: colors.primary },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.25)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.headingBold, fontSize: 30, color: colors.white },
  name: { fontFamily: fonts.headingBold, fontSize: 22, color: colors.white, marginTop: 12 },
  email: { fontFamily: fonts.body, fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  phone: { fontFamily: fonts.body, fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    marginHorizontal: spacing.lg,
    marginTop: -20,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadow.soft,
  },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 14, gap: 4 },
  statNum: { fontFamily: fonts.headingBold, fontSize: 20, color: colors.textSecondary },
  statLabel: { fontFamily: fonts.body, fontSize: 11, color: colors.muted },
  statDivider: { width: 1, backgroundColor: colors.border, marginVertical: 12 },
  menu: {
    marginTop: spacing.lg,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.soft,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 16, paddingHorizontal: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  rowIcon: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.surfaceWarm,
    alignItems: 'center', justifyContent: 'center',
  },
  rowLabel: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.textSecondary },
  logout: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: spacing.xl, marginHorizontal: spacing.lg, paddingVertical: 15,
    borderWidth: 1, borderColor: '#FFD7D7', borderRadius: radii.xs,
    backgroundColor: '#FFF5F5',
  },
  logoutText: { fontFamily: fonts.bodySemibold, fontSize: 15, color: colors.danger },
});
