import { View, Text, Pressable, StyleSheet, ScrollView, Alert, Linking } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../src/store/auth';
import { useCurrency, type Currency } from '../src/store/currency';
import { colors, fonts, radii, spacing, shadow } from '../src/theme';

type SettingRow = {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  label: string;
  sub?: string;
  onPress: () => void;
  danger?: boolean;
};

export default function Settings() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, user, logout } = useAuth();
  const currency = useCurrency((s) => s.currency);
  const setCurrency = useCurrency((s) => s.setCurrency);
  const currencyOpts: { c: Currency; label: string }[] = [
    { c: 'INR', label: '₹ INR' },
    { c: 'USD', label: '$ USD' },
  ];

  const onLogout = () => {
    Alert.alert('Sign out?', 'You can sign back in anytime.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const sections: { title: string; rows: SettingRow[] }[] = [
    {
      title: 'Account',
      rows: [
        {
          icon: 'location-outline',
          iconColor: '#6366F1',
          iconBg: '#EEF2FF',
          label: 'Saved Addresses',
          sub: 'Manage delivery addresses',
          onPress: () => router.push('/addresses'),
        },
        {
          icon: 'notifications-outline',
          iconColor: '#F59E0B',
          iconBg: '#FFFBEB',
          label: 'Notifications',
          sub: 'Order updates & offers',
          onPress: () => router.push('/notifications'),
        },
      ],
    },
    {
      title: 'Support',
      rows: [
        {
          icon: 'headset-outline',
          iconColor: '#10B981',
          iconBg: '#ECFDF5',
          label: 'Help & Support',
          sub: 'Raise a ticket or chat with us',
          onPress: () => router.push('/support'),
        },
        {
          icon: 'chatbubble-ellipses-outline',
          iconColor: '#6366F1',
          iconBg: '#EEF2FF',
          label: 'WhatsApp Us',
          sub: 'Quick support on WhatsApp',
          onPress: () => Linking.openURL('https://wa.me/917989XXXXXX'),
        },
      ],
    },
    {
      title: 'Legal',
      rows: [
        {
          icon: 'document-text-outline',
          iconColor: '#64748B',
          iconBg: '#F1F5F9',
          label: 'Privacy Policy',
          onPress: () => Linking.openURL('https://styleinneedfashions.com/privacy'),
        },
        {
          icon: 'shield-checkmark-outline',
          iconColor: '#64748B',
          iconBg: '#F1F5F9',
          label: 'Terms of Service',
          onPress: () => Linking.openURL('https://styleinneedfashions.com/terms'),
        },
        {
          icon: 'information-circle-outline',
          iconColor: '#64748B',
          iconBg: '#F1F5F9',
          label: 'About Us',
          onPress: () => Linking.openURL('https://styleinneedfashions.com/about'),
        },
      ],
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Custom header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
        </Pressable>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>

        {/* Account mini-card */}
        {isAuthenticated && (
          <View style={[styles.accountCard, shadow.soft]}>
            <View style={styles.accountAvatar}>
              <Text style={styles.accountAvatarText}>{user?.name?.[0]?.toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.accountName}>{user?.name}</Text>
              <Text style={styles.accountEmail} numberOfLines={1}>{user?.email}</Text>
            </View>
          </View>
        )}

        {/* Currency preference */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CURRENCY</Text>
          <View style={[styles.sectionCard, shadow.soft, { flexDirection: 'row', padding: 6, gap: 6 }]}>
            {currencyOpts.map(({ c, label }) => {
              const active = currency === c;
              return (
                <Pressable key={c} onPress={() => setCurrency(c)}
                  style={[styles.curBtn, active && styles.curBtnActive]}>
                  <Text style={[styles.curText, active && styles.curTextActive]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.curNote}>USA/Canada prices are shown in USD. India in INR.</Text>
        </View>

        {/* Sections */}
        {sections.map((sec) => (
          <View key={sec.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{sec.title.toUpperCase()}</Text>
            <View style={[styles.sectionCard, shadow.soft]}>
              {sec.rows.map((row, i) => (
                <Pressable
                  key={row.label}
                  style={[styles.row, i === sec.rows.length - 1 && { borderBottomWidth: 0 }]}
                  onPress={row.onPress}
                >
                  <View style={[styles.rowIcon, { backgroundColor: row.iconBg }]}>
                    <Ionicons name={row.icon} size={18} color={row.iconColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowLabel, row.danger && { color: colors.danger }]}>{row.label}</Text>
                    {!!row.sub && <Text style={styles.rowSub}>{row.sub}</Text>}
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.muted} />
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        {/* Sign out */}
        {isAuthenticated && (
          <Pressable style={styles.logoutBtn} onPress={onLogout}>
            <Ionicons name="log-out-outline" size={18} color={colors.danger} />
            <Text style={styles.logoutText}>Sign Out</Text>
          </Pressable>
        )}

        {/* App version */}
        <View style={styles.versionWrap}>
          <Text style={styles.versionBrand}>STYLE IN NEED FASHIONS</Text>
          <Text style={styles.versionNum}>Version {Constants.expoConfig?.version ?? '1.0.0'}</Text>
          <Text style={styles.versionSub}>Made with ♥ in India</Text>
        </View>
      </ScrollView>
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
  headerTitle: {
    flex: 1,
    fontFamily: fonts.headingBold,
    fontSize: 20,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  accountAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountAvatarText: {
    fontFamily: fonts.headingBold,
    fontSize: 20,
    color: colors.white,
  },
  accountName: {
    fontFamily: fonts.bodySemibold,
    fontSize: 15,
    color: colors.textSecondary,
  },
  accountEmail: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  curBtn: { flex: 1, paddingVertical: 12, borderRadius: radii.xs, alignItems: 'center', backgroundColor: colors.surface },
  curBtnActive: { backgroundColor: colors.primary },
  curText: { fontFamily: fonts.bodySemibold, fontSize: 14, color: colors.textSecondary },
  curTextActive: { color: colors.white },
  curNote: { fontFamily: fonts.body, fontSize: 11, color: colors.muted, marginTop: 8, marginLeft: 4 },
  section: { marginBottom: spacing.lg },
  sectionTitle: {
    fontFamily: fonts.bodySemibold,
    fontSize: 11,
    color: colors.muted,
    letterSpacing: 1.2,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.textSecondary,
  },
  rowSub: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.muted,
    marginTop: 1,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: '#FFD7D7',
    borderRadius: radii.xs,
    backgroundColor: '#FFF5F5',
    marginBottom: spacing.xl,
  },
  logoutText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 15,
    color: colors.danger,
  },
  versionWrap: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.lg,
  },
  versionBrand: {
    fontFamily: fonts.headingBold,
    fontSize: 12,
    color: colors.primary,
    letterSpacing: 3,
  },
  versionNum: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
  },
  versionSub: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.muted,
  },
});
