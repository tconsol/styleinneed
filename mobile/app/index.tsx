import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '../src/store/auth';
import { colors, fonts } from '../src/theme';

export default function Index() {
  const hydrated = useAuth((s) => s.hydrated);
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    SecureStore.getItemAsync('onboarded').then((v) => setOnboarded(v === '1'));
  }, []);

  if (!hydrated || onboarded === null) {
    return (
      <View style={styles.splash}>
        <Text style={styles.logo}>STYLE IN NEED</Text>
        <Text style={styles.sub}>FASHIONS</Text>
        <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
      </View>
    );
  }

  if (!onboarded) return <Redirect href="/onboarding" />;
  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  logo: { fontFamily: fonts.headingBold, fontSize: 34, color: colors.text, letterSpacing: 4 },
  sub: { fontFamily: fonts.body, fontSize: 11, color: colors.primary, letterSpacing: 8, marginTop: 4 },
});
