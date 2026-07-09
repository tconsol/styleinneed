import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radii } from '../theme';

interface Props extends TextInputProps {
  label: string;
  error?: string;
  required?: boolean;
}

export default function Field({ label, error, required, secureTextEntry, ...props }: Props) {
  const isPassword = !!secureTextEntry;
  const [hidden, setHidden] = useState(true);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.star}> *</Text>}
      </Text>
      <View style={[styles.row, !!error && styles.rowError]}>
        <TextInput
          placeholderTextColor={colors.muted}
          style={styles.input}
          secureTextEntry={isPassword ? hidden : false}
          {...props}
        />
        {isPassword && (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10} style={styles.eye}>
            <Ionicons name={hidden ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.muted} />
          </Pressable>
        )}
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  label: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.text, marginBottom: 6 },
  star: { color: colors.danger, fontFamily: fonts.bodySemibold },
  row: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: colors.border, borderRadius: radii.md,
    backgroundColor: colors.white, paddingHorizontal: 14,
  },
  rowError: { borderColor: colors.danger },
  input: { flex: 1, paddingVertical: 12, fontFamily: fonts.body, fontSize: 15, color: colors.text },
  eye: { paddingLeft: 8 },
  error: { fontFamily: fonts.body, fontSize: 11, color: colors.danger, marginTop: 4 },
});
