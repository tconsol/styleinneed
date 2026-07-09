import { useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, Alert,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Link } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Ionicons } from '@expo/vector-icons';
import Field from '../../src/components/Field';
import { useAuth } from '../../src/store/auth';
import { colors, fonts, radii, spacing } from '../../src/theme';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
});
type Form = z.infer<typeof schema>;

export default function ForgotPassword() {
  const router = useRouter();
  const forgotPassword = useAuth((s) => s.forgotPassword);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState<{ email: string; message: string } | null>(null);

  const { control, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (values: Form) => {
    setLoading(true);
    try {
      const message = await forgotPassword(values.email);
      setSent({ email: values.email, message });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Please try again in a moment.';
      Alert.alert('Something went wrong', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top nav */}
          <View style={s.topNav}>
            <Pressable style={s.backBtn} onPress={() => router.canGoBack() && router.back()} hitSlop={12}>
              <Ionicons name="chevron-back" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Brand mark */}
          <View style={s.brand}>
            <View style={s.monogram}>
              <Text style={s.monogramText}>A</Text>
            </View>
            <Text style={s.brandName}>STYLE IN NEED</Text>
            <Text style={s.brandSub}>Premium Indian Fashion</Text>
          </View>

          {sent ? (
            /* Confirmation state */
            <View style={s.form}>
              <View style={s.iconWrap}>
                <Ionicons name="mail-open-outline" size={26} color={colors.primary} />
              </View>
              <Text style={s.confirmHeading}>Check your email</Text>
              <Text style={s.confirmSub}>
                {sent.message}{'\n'}
                <Text style={s.emailText}>{sent.email}</Text>
              </Text>
              <Text style={s.note}>
                Open the reset link from your email to finish changing your password on the web.
              </Text>

              <Pressable style={s.cta} onPress={() => router.replace('/(auth)/login')}>
                <Text style={s.ctaText}>Back to Sign In</Text>
              </Pressable>

              <Pressable style={s.secondaryLink} onPress={() => setSent(null)} hitSlop={8}>
                <Text style={s.secondaryLinkText}>Use a different email</Text>
              </Pressable>
            </View>
          ) : (
            /* Request state */
            <View style={s.form}>
              <Text style={s.heading}>Forgot password?</Text>
              <Text style={s.sub}>
                Enter the email on your account and we&apos;ll send you a link to reset your password.
              </Text>

              <Controller control={control} name="email" render={({ field }) => (
                <Field
                  label="Email address"
                  required
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={field.value}
                  onChangeText={field.onChange}
                  error={errors.email?.message}
                />
              )} />

              <Pressable
                style={[s.cta, loading && { opacity: 0.6 }]}
                disabled={loading}
                onPress={handleSubmit(onSubmit)}
              >
                <Text style={s.ctaText}>{loading ? 'Sending…' : 'Send Reset Link'}</Text>
                {!loading && <Ionicons name="arrow-forward" size={16} color={colors.white} />}
              </Pressable>

              <View style={s.footer}>
                <Text style={s.footerMuted}>Remembered your password? </Text>
                <Link href="/(auth)/login" style={s.footerLink}>Sign in</Link>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  scroll: { flexGrow: 1, paddingBottom: 32 },

  topNav: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  brand: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  monogram: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  monogramText: {
    fontFamily: fonts.headingBold,
    fontSize: 28,
    color: colors.white,
  },
  brandName: {
    fontFamily: fonts.headingBold,
    fontSize: 20,
    color: colors.textSecondary,
    letterSpacing: 5,
  },
  brandSub: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
    marginTop: 4,
    letterSpacing: 0.3,
  },

  form: {
    paddingHorizontal: spacing.xl,
  },
  heading: {
    fontFamily: fonts.headingBold,
    fontSize: 26,
    color: colors.textSecondary,
  },
  sub: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.muted,
    marginTop: 4,
    marginBottom: 24,
  },

  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.textSecondary,
    borderRadius: radii.sm,
    paddingVertical: 16,
  },
  ctaText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 15,
    color: colors.white,
    letterSpacing: 0.3,
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerMuted: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.muted,
  },
  footerLink: {
    fontFamily: fonts.bodySemibold,
    fontSize: 14,
    color: colors.primary,
  },

  // Confirmation state
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    alignSelf: 'center',
  },
  confirmHeading: {
    fontFamily: fonts.headingBold,
    fontSize: 26,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  confirmSub: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 8,
    lineHeight: 20,
  },
  emailText: {
    fontFamily: fonts.bodySemibold,
    color: colors.text,
  },
  note: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 18,
  },
  secondaryLink: {
    alignSelf: 'center',
    marginTop: 16,
    paddingVertical: 4,
  },
  secondaryLinkText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.primary,
  },
});
