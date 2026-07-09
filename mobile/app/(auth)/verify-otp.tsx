import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/store/auth';
import { colors, fonts, radii, spacing, shadow } from '../../src/theme';

const LEN = 6;
const RESEND_SECONDS = 60;

export default function VerifyOtp() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const verifyEmail = useAuth((s) => s.verifyEmail);
  const resendOtp = useAuth((s) => s.resendOtp);

  const [digits, setDigits] = useState<string[]>(Array(LEN).fill(''));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const inputs = useRef<(TextInput | null)[]>([]);

  // Countdown for resend availability (starts immediately — OTP sent at register).
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  const code = digits.join('');

  const setDigit = (i: number, val: string) => {
    const ch = val.replace(/[^0-9]/g, '').slice(-1);
    setDigits((prev) => {
      const next = [...prev];
      next[i] = ch;
      return next;
    });
    if (ch && i < LEN - 1) inputs.current[i + 1]?.focus();
  };

  const onKeyPress = (i: number, key: string) => {
    if (key === 'Backspace' && !digits[i] && i > 0) inputs.current[i - 1]?.focus();
  };

  const verify = async () => {
    if (code.length !== LEN) {
      Alert.alert('Incomplete code', `Enter the ${LEN}-digit code sent to your email.`);
      return;
    }
    setLoading(true);
    try {
      await verifyEmail(String(email), code);
      Alert.alert('Email verified', 'Your account is ready. Please sign in.', [
        { text: 'Sign in', onPress: () => router.replace('/(auth)/login') },
      ]);
    } catch {
      Alert.alert('Verification failed', 'The code is invalid or expired. Try again or resend.');
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (secondsLeft > 0 || resending) return;
    setResending(true);
    try {
      await resendOtp(String(email));
      setDigits(Array(LEN).fill(''));
      inputs.current[0]?.focus();
      setSecondsLeft(RESEND_SECONDS);
      Alert.alert('Code sent', 'A new verification code has been sent to your email.');
    } catch {
      Alert.alert('Could not resend', 'Please try again in a moment.');
    } finally {
      setResending(false);
    }
  };

  const mm = String(Math.floor(secondsLeft / 60)).padStart(1, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.hero}>
          <Pressable style={styles.back} onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="chevron-back" size={24} color={colors.white} />
          </Pressable>
          <Text style={styles.brand}>STYLE IN NEED</Text>
          <Text style={styles.brandSub}>FASHIONS</Text>
        </View>

        <View style={[styles.card, shadow.card]}>
          <View style={styles.iconWrap}>
            <Ionicons name="mail-open-outline" size={28} color={colors.primary} />
          </View>
          <Text style={styles.title}>Verify your email</Text>
          <Text style={styles.subtitle}>
            Enter the {LEN}-digit code we sent to{'\n'}
            <Text style={styles.email}>{email}</Text>
          </Text>

          <View style={styles.otpRow}>
            {digits.map((d, i) => (
              <TextInput
                key={i}
                ref={(el) => { inputs.current[i] = el; }}
                value={d}
                onChangeText={(v) => setDigit(i, v)}
                onKeyPress={(e) => onKeyPress(i, e.nativeEvent.key)}
                keyboardType="number-pad"
                maxLength={1}
                style={[styles.otpCell, d && styles.otpCellFilled]}
                autoFocus={i === 0}
                returnKeyType="done"
              />
            ))}
          </View>

          <Pressable style={[styles.cta, (loading || code.length !== LEN) && { opacity: 0.6 }]} disabled={loading || code.length !== LEN} onPress={verify}>
            <Text style={styles.ctaText}>{loading ? 'Verifying…' : 'Verify Email'}</Text>
          </Pressable>

          <View style={styles.resendRow}>
            <Text style={styles.muted}>Didn't get the code? </Text>
            {secondsLeft > 0 ? (
              <Text style={styles.timer}>Resend in {mm}:{ss}</Text>
            ) : (
              <Pressable onPress={resend} disabled={resending} hitSlop={8}>
                <Text style={styles.link}>{resending ? 'Sending…' : 'Resend OTP'}</Text>
              </Pressable>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { height: 200, alignItems: 'center', justifyContent: 'center', paddingTop: 40, backgroundColor: colors.primary },
  back: { position: 'absolute', left: spacing.lg, top: 52, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  brand: { fontFamily: fonts.headingBold, fontSize: 30, color: colors.white, letterSpacing: 5 },
  brandSub: { fontFamily: fonts.body, fontSize: 10, color: 'rgba(255,255,255,0.85)', letterSpacing: 8, marginTop: 4 },
  card: { marginTop: -32, marginHorizontal: spacing.lg, backgroundColor: colors.white, borderRadius: radii.xxl, padding: spacing.xl, alignItems: 'center' },
  iconWrap: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  title: { fontFamily: fonts.headingBold, fontSize: 24, color: colors.text },
  subtitle: { fontFamily: fonts.body, fontSize: 14, color: colors.muted, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  email: { fontFamily: fonts.bodySemibold, color: colors.text },
  otpRow: { flexDirection: 'row', gap: 10, marginTop: spacing.xl, marginBottom: spacing.lg },
  otpCell: {
    width: 46, height: 56, borderWidth: 1.5, borderColor: colors.border, borderRadius: radii.md,
    textAlign: 'center', fontFamily: fonts.headingBold, fontSize: 22, color: colors.text, backgroundColor: colors.white,
  },
  otpCellFilled: { borderColor: colors.primary, backgroundColor: colors.surface },
  cta: { alignSelf: 'stretch', backgroundColor: colors.text, borderRadius: radii.full, paddingVertical: 16, alignItems: 'center' },
  ctaText: { fontFamily: fonts.bodySemibold, color: colors.white, fontSize: 15 },
  resendRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  muted: { fontFamily: fonts.body, color: colors.muted, fontSize: 13 },
  timer: { fontFamily: fonts.bodySemibold, color: colors.text, fontSize: 13 },
  link: { fontFamily: fonts.bodySemibold, color: colors.primary, fontSize: 13 },
});
