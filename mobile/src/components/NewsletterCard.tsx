import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from 'react-native';
import { api } from '../lib/api';
import { colors, fonts, radii, spacing } from '../theme';

export default function NewsletterCard() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  const subscribe = async () => {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { Alert.alert('Invalid email', 'Enter a valid email.'); return; }
    setBusy(true);
    try {
      await api.post('/newsletter/subscribe', { email });
      setEmail('');
      Alert.alert('Subscribed', 'Thanks for joining the list!');
    } catch {
      Alert.alert('Oops', 'Could not subscribe right now.');
    } finally { setBusy(false); }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Join the List</Text>
      <Text style={styles.subtitle}>Early access to new drops, offers & styling tips.</Text>
      <View style={styles.row}>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Your email"
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
        />
        <Pressable style={[styles.btn, busy && { opacity: 0.6 }]} disabled={busy} onPress={subscribe}>
          <Text style={styles.btnText}>{busy ? '…' : 'Join'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { margin: spacing.lg, marginTop: spacing.xxl, padding: spacing.xl, borderRadius: radii.lg, backgroundColor: colors.text },
  title: { fontFamily: fonts.headingBold, fontSize: 22, color: colors.white },
  subtitle: { fontFamily: fonts.body, fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4, marginBottom: 16 },
  row: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, backgroundColor: colors.white, borderRadius: radii.full, paddingHorizontal: 16, paddingVertical: 12, fontFamily: fonts.body, fontSize: 14, color: colors.text },
  btn: { backgroundColor: colors.primary, borderRadius: radii.full, paddingHorizontal: 22, justifyContent: 'center' },
  btnText: { fontFamily: fonts.bodySemibold, fontSize: 14, color: colors.white },
});
