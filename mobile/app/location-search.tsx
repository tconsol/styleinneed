import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { forwardGeocode } from '../src/lib/geocoding';
import { useAddresses } from '../src/api/account';
import { useDelivery } from '../src/store/delivery';
import { colors, fonts, radii, spacing } from '../src/theme';
import type { Address } from '../src/types';

export default function LocationSearch() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: addresses } = useAddresses();
  const setSelected = useDelivery((s) => s.setSelected);
  const [q, setQ] = useState('');
  const [searching, setSearching] = useState(false);

  const search = async () => {
    if (!q.trim()) return;
    setSearching(true);
    try {
      const result = await forwardGeocode(q.trim());
      if (result) router.push(`/location-map?lat=${result.lat}&lng=${result.lng}`);
      else router.push('/location-map');
    } catch {
      router.push('/location-map');
    } finally {
      setSearching(false);
    }
  };

  const choose = (a: Address) => { setSelected(a); router.navigate('/(tabs)'); };

  return (
    <View style={{ flex: 1, backgroundColor: colors.white }}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10}><Ionicons name="arrow-back" size={24} color={colors.text} /></Pressable>
        <Text style={styles.headerTitle}>SELECT DELIVERY ADDRESS</Text>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: spacing.lg }}>
        {/* Important banner */}
        <View style={styles.banner}>
          <Ionicons name="information-circle" size={18} color="#D97706" />
          <Text style={styles.bannerText}>
            <Text style={{ fontFamily: fonts.bodySemibold }}>Important: </Text>
            Use your current location or manually search on the map to guide delivery partners.
          </Text>
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={colors.muted} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Please enter your society details for better delivery"
            placeholderTextColor={colors.muted}
            style={styles.input}
            returnKeyType="search"
            onSubmitEditing={search}
          />
          {searching && <ActivityIndicator size="small" color={colors.primary} />}
        </View>

        <Pressable style={styles.current} onPress={() => router.push('/location-map')}>
          <Ionicons name="locate" size={20} color={colors.primary} />
          <Text style={styles.currentText}>Use my current Location</Text>
        </Pressable>

        <View style={styles.divider} />

        <Text style={styles.section}>Saved Address</Text>
        {!addresses?.length ? (
          <Text style={styles.empty}>No saved addresses yet.</Text>
        ) : (
          addresses.map((a) => (
            <Pressable key={a._id} style={styles.addr} onPress={() => choose(a)}>
              <Ionicons name="location-outline" size={18} color={colors.text} style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <View style={styles.addrTop}>
                  <Text style={styles.addrName}>{a.fullName}, {a.pincode}</Text>
                  {!!a.label && <View style={styles.tag}><Text style={styles.tagText}>{a.label.toUpperCase()}</Text></View>}
                </View>
                <Text style={styles.addrText}>{a.line1}{a.line2 ? `, ${a.line2}` : ''}, {a.city}, {a.state}</Text>
              </View>
              <Ionicons name="checkmark-circle-outline" size={22} color={colors.border} />
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  headerTitle: { fontFamily: fonts.headingBold, fontSize: 18, color: colors.text, letterSpacing: 0.5 },
  banner: { flexDirection: 'row', gap: 8, backgroundColor: '#FEF3E2', borderRadius: radii.md, padding: 12, marginBottom: spacing.lg },
  bannerText: { flex: 1, fontFamily: fonts.body, fontSize: 13, color: '#92400E', lineHeight: 18 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, paddingHorizontal: 14, paddingVertical: 4 },
  input: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.text, paddingVertical: 14 },
  current: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 18 },
  currentText: { fontFamily: fonts.bodySemibold, fontSize: 15, color: colors.primary },
  divider: { height: 1, backgroundColor: colors.border, marginBottom: spacing.lg },
  section: { fontFamily: fonts.headingBold, fontSize: 18, color: colors.text, marginBottom: spacing.md },
  empty: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  addr: { flexDirection: 'row', gap: 10, padding: 14, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, marginBottom: 12, alignItems: 'flex-start' },
  addrTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addrName: { fontFamily: fonts.bodySemibold, fontSize: 14, color: colors.text },
  tag: { backgroundColor: colors.surface, borderRadius: radii.sm, paddingHorizontal: 8, paddingVertical: 2 },
  tagText: { fontFamily: fonts.bodyMedium, fontSize: 10, color: colors.muted },
  addrText: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 4, lineHeight: 17 },
});
