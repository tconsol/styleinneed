import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radii, spacing } from '../theme';

export const SORT_OPTIONS = [
  { label: "What's new", value: '-createdAt' },
  { label: 'Popularity', value: '-ratings.count' },
  { label: 'Customer Rating', value: '-ratings.average' },
  { label: 'Discount', value: '-discountPercentage' },
  { label: 'Price - low to high', value: 'salePrice' },
  { label: 'Price - high to low', value: '-salePrice' },
];

export default function SortSheet({
  visible, value, onSelect, onClose,
}: {
  visible: boolean;
  value: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <Text style={styles.title}>SORT BY</Text>
        {SORT_OPTIONS.map((o) => {
          const active = o.value === value;
          return (
            <Pressable key={o.value} style={styles.row} onPress={() => { onSelect(o.value); onClose(); }}>
              <Text style={[styles.label, active && styles.labelActive]}>{o.label}</Text>
              {active && <Ionicons name="checkmark" size={20} color={colors.primary} />}
            </Pressable>
          );
        })}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, paddingBottom: 28, paddingTop: spacing.lg },
  title: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.muted, letterSpacing: 1, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, paddingHorizontal: spacing.lg },
  label: { fontFamily: fonts.body, fontSize: 15, color: colors.text },
  labelActive: { fontFamily: fonts.bodySemibold, color: colors.primary },
});
