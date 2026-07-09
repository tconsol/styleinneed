import { useState } from 'react';
import { Modal, View, Text, Pressable, StyleSheet, ScrollView, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAddresses } from '../api/account';
import { useDelivery } from '../store/delivery';
import { colors, fonts, radii, spacing } from '../theme';
import type { Address } from '../types';

export default function LocationSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const router = useRouter();
  const { data: addresses } = useAddresses();
  const selected = useDelivery((s) => s.selected);
  const setSelected = useDelivery((s) => s.setSelected);
  const setCurrentLabel = useDelivery((s) => s.setCurrentLabel);
  const [pincode, setPincode] = useState('');

  const go = (path: string) => { onClose(); router.push(path as never); };

  const checkPin = () => {
    if (pincode.length !== 6) return;
    setCurrentLabel(`Delivering to ${pincode}`);
    onClose();
  };

  const choose = (a: Address) => { setSelected(a); onClose(); };

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.head}>
          <Text style={styles.title}>Select Delivery Location</Text>
          <Pressable onPress={onClose} hitSlop={10}><Ionicons name="close" size={24} color={colors.text} /></Pressable>
        </View>

        {/* Pincode */}
        <View style={styles.pinRow}>
          <TextInput
            value={pincode}
            onChangeText={(t) => setPincode(t.replace(/[^0-9]/g, '').slice(0, 6))}
            placeholder="Enter pincode"
            placeholderTextColor={colors.muted}
            keyboardType="number-pad"
            style={styles.pinInput}
          />
          <Pressable onPress={checkPin} disabled={pincode.length !== 6}>
            <Text style={[styles.checkPin, pincode.length === 6 && { color: colors.primary }]}>Check Pincode</Text>
          </Pressable>
        </View>

        {/* Actions */}
        <Pressable style={styles.action} onPress={() => go('/location-map')}>
          <Ionicons name="locate" size={20} color={colors.primary} />
          <Text style={styles.actionText}>Use my current location</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.primary} />
        </Pressable>
        <Pressable style={styles.action} onPress={() => go('/location-search')}>
          <Ionicons name="search" size={20} color={colors.primary} />
          <Text style={styles.actionText}>Search location</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.primary} />
        </Pressable>

        {/* Or */}
        <View style={styles.orRow}>
          <View style={styles.line} />
          <Text style={styles.orText}>Or</Text>
          <View style={styles.line} />
        </View>

        <Text style={styles.section}>Select Saved Address</Text>
        <ScrollView style={{ maxHeight: 280 }} contentContainerStyle={{ gap: 10, paddingBottom: spacing.md }}>
          {!addresses?.length ? (
            <Text style={styles.empty}>No saved addresses yet.</Text>
          ) : (
            addresses.map((a) => {
              const active = selected?._id === a._id;
              return (
                <Pressable key={a._id} style={[styles.addr, active && styles.addrActive]} onPress={() => choose(a)}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.addrLabel}>{a.fullName}, {a.pincode}{a.label ? `   ${a.label.toUpperCase()}` : ''}</Text>
                    <Text style={styles.addrText} numberOfLines={2}>{a.line1}{a.line2 ? `, ${a.line2}` : ''}, {a.city}</Text>
                  </View>
                  <Ionicons
                    name={active ? 'checkmark-circle' : 'ellipse-outline'}
                    size={24}
                    color={active ? colors.primary : colors.border}
                  />
                </Pressable>
              );
            })
          )}
        </ScrollView>

        <Pressable style={styles.addBtn} onPress={() => go('/addresses')}>
          <Ionicons name="add" size={18} color={colors.white} />
          <Text style={styles.addText}>Add New Address</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.white, borderTopLeftRadius: radii.xxl, borderTopRightRadius: radii.xxl, padding: spacing.lg, paddingBottom: 28 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  title: { fontFamily: fonts.headingBold, fontSize: 20, color: colors.text },
  pinRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, paddingHorizontal: 14, paddingVertical: 4 },
  pinInput: { flex: 1, fontFamily: fonts.body, fontSize: 15, color: colors.text, paddingVertical: 12 },
  checkPin: { fontFamily: fonts.bodySemibold, fontSize: 14, color: colors.muted },
  action: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16 },
  actionText: { flex: 1, fontFamily: fonts.bodySemibold, fontSize: 15, color: colors.primary },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 6 },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  orText: { fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.text },
  section: { fontFamily: fonts.headingBold, fontSize: 16, color: colors.text, marginTop: spacing.md, marginBottom: spacing.sm },
  empty: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  addr: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md },
  addrActive: { borderColor: colors.primary, backgroundColor: '#FBF7F1' },
  addrLabel: { fontFamily: fonts.bodySemibold, fontSize: 14, color: colors.text },
  addrText: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 3, lineHeight: 17 },
  addBtn: { flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.text, borderRadius: radii.full, paddingVertical: 15, marginTop: spacing.lg },
  addText: { fontFamily: fonts.bodySemibold, color: colors.white, fontSize: 14 },
});
