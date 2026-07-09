import { useState, useEffect } from 'react';
import {
  View, Text, Pressable, StyleSheet, Alert,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Link } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Ionicons } from '@expo/vector-icons';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import Field from '../../src/components/Field';
import { useAuth } from '../../src/store/auth';
import { colors, fonts, radii, spacing } from '../../src/theme';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_SVG = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZD0iTTIyLjU2IDEyLjI1YzAtLjc4LS4wNy0xLjUzLS4yLTIuMjVIMTJ2NC4yNmg1LjkyYy0uMjYgMS4zNy0xLjA0IDIuNTMtMi4yMSAzLjMxdjIuNzdoMy41N2MyLjA4LTEuOTIgMy4yOC00Ljc0IDMuMjgtOC4wOXoiIGZpbGw9IiM0Mjg1RjQiLz48cGF0aCBkPSJNMTIgMjNjMi45NyAwIDUuNDYtLjk4IDcuMjgtMi42NmwtMy41Ny0yLjc3Yy0uOTguNjYtMi4yMyAxLjA2LTMuNzEgMS4wNi0yLjg2IDAtNS4yOS0xLjkzLTYuMTYtNC41M0gyLjE4djIuODRDMy45OSAyMC41MyA3LjcgMjMgMTIgMjN6IiBmaWxsPSIjMzRBODUzIi8+PHBhdGggZD0iTTUuODQgMTQuMDljLS4yMi0uNjYtLjM1LTEuMzYtLjM1LTIuMDlzLjEzLTEuNDMuMzUtMi4wOVY3LjA3SDIuMThDMS40MyA4LjU1IDEgMTAuMjIgMSAxMnMuNDMgMy40NSAxLjE4IDQuOTNsMi44NS0yLjIyLjgxLS42MnoiIGZpbGw9IiNGQkJDMDUiLz48cGF0aCBkPSJNMTIgNS4zOGMxLjYyIDAgMy4wNi41NiA0LjIxIDEuNjRsMy4xNS0zLjE1QzE3LjQ1IDIuMDkgMTQuOTcgMSAxMiAxIDcuNyAxIDMuOTkgMy40NyAyLjE4IDcuMDdsMy42NiAyLjg0Yy44Ny0yLjYgMy4zLTQuNTMgNi4xNi00LjUzeiIgZmlsbD0iI0VBNDMzNSIvPjwvc3ZnPg==';

const schema = z
  .object({
    name: z.string().min(2, 'Enter your full name'),
    email: z.string().email('Enter a valid email'),
    phone: z.string().min(10, 'Enter a valid phone').max(15),
    password: z
      .string()
      .min(8, 'Min 8 characters')
      .regex(/[A-Z]/, 'One uppercase letter required')
      .regex(/[0-9]/, 'One number required')
      .regex(/[^A-Za-z0-9]/, 'One special character required'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
type Form = z.infer<typeof schema>;

const PWD_RULES = [
  { test: (p: string) => p.length >= 8, label: 'At least 8 characters' },
  { test: (p: string) => /[A-Z]/.test(p), label: 'One uppercase letter' },
  { test: (p: string) => /[0-9]/.test(p), label: 'One number' },
  { test: (p: string) => /[^A-Za-z0-9]/.test(p), label: 'One special character' },
];

export default function Register() {
  const router = useRouter();
  const register = useAuth((s) => s.register);
  const googleLogin = useAuth((s) => s.googleLogin);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const { control, handleSubmit, watch, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: { name: '', email: '', phone: '', password: '', confirmPassword: '' },
  });
  const pwd = watch('password');

  const [_req, gResponse, promptGoogle] = Google.useAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '',
  });

  useEffect(() => {
    if (gResponse?.type === 'success' && gResponse.authentication?.accessToken) {
      void handleGoogleSignup(gResponse.authentication.accessToken);
    }
  }, [gResponse]);

  const handleGoogleSignup = async (accessToken: string) => {
    setGoogleLoading(true);
    try {
      await googleLogin(accessToken);
      router.replace('/(tabs)');
    } catch {
      Alert.alert('Google sign-up failed', 'Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const onSubmit = async (values: Form) => {
    setLoading(true);
    try {
      await register({ name: values.name, email: values.email, phone: values.phone, password: values.password });
      router.push({ pathname: '/(auth)/verify-otp', params: { email: values.email } });
    } catch {
      Alert.alert('Registration failed', 'That email may already be in use.');
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
            <Text style={s.brandSub}>Join the community</Text>
          </View>

          {/* Form */}
          <View style={s.form}>
            <Text style={s.heading}>Create account</Text>
            <Text style={s.sub}>Sign up for exclusive deals & fast checkout</Text>

            {/* Google */}
            <Pressable
              style={[s.googleBtn, googleLoading && { opacity: 0.6 }]}
              disabled={googleLoading}
              onPress={() => promptGoogle()}
            >
              <Image source={{ uri: GOOGLE_SVG }} style={s.googleIcon} />
              <Text style={s.googleText}>
                {googleLoading ? 'Signing up…' : 'Sign up with Google'}
              </Text>
            </Pressable>

            {/* Divider */}
            <View style={s.divider}>
              <View style={s.divLine} />
              <Text style={s.divText}>or sign up with email</Text>
              <View style={s.divLine} />
            </View>

            {/* Fields */}
            <Controller control={control} name="name" render={({ field }) => (
              <Field label="Full name" required value={field.value} onChangeText={field.onChange} error={errors.name?.message} />
            )} />
            <Controller control={control} name="email" render={({ field }) => (
              <Field label="Email" required autoCapitalize="none" keyboardType="email-address" value={field.value} onChangeText={field.onChange} error={errors.email?.message} />
            )} />
            <Controller control={control} name="phone" render={({ field }) => (
              <Field label="Phone number" required keyboardType="phone-pad" value={field.value} onChangeText={field.onChange} error={errors.phone?.message} />
            )} />
            <Controller control={control} name="password" render={({ field }) => (
              <Field label="Password" required secureTextEntry value={field.value} onChangeText={field.onChange} error={errors.password?.message} />
            )} />

            {/* Password strength checklist */}
            {pwd.length > 0 && (
              <View style={s.pwdRules}>
                {PWD_RULES.map((r) => {
                  const ok = r.test(pwd);
                  return (
                    <View key={r.label} style={s.pwdRule}>
                      <Ionicons
                        name={ok ? 'checkmark-circle' : 'ellipse-outline'}
                        size={14}
                        color={ok ? colors.success : colors.muted}
                      />
                      <Text style={[s.pwdRuleText, ok && s.pwdRuleOk]}>{r.label}</Text>
                    </View>
                  );
                })}
              </View>
            )}

            <Controller control={control} name="confirmPassword" render={({ field }) => (
              <Field label="Confirm password" required secureTextEntry value={field.value} onChangeText={field.onChange} error={errors.confirmPassword?.message} />
            )} />

            <Pressable
              style={[s.cta, loading && { opacity: 0.6 }]}
              disabled={loading}
              onPress={handleSubmit(onSubmit)}
            >
              <Text style={s.ctaText}>{loading ? 'Creating account…' : 'Create Account'}</Text>
              {!loading && <Ionicons name="arrow-forward" size={16} color={colors.white} />}
            </Pressable>

            <View style={s.footer}>
              <Text style={s.footerMuted}>Already have an account? </Text>
              <Link href="/(auth)/login" style={s.footerLink}>Sign in</Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  scroll: { flexGrow: 1, paddingBottom: 40 },

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
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  monogram: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  monogramText: {
    fontFamily: fonts.headingBold,
    fontSize: 26,
    color: colors.white,
  },
  brandName: {
    fontFamily: fonts.headingBold,
    fontSize: 18,
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

  form: { paddingHorizontal: spacing.xl },
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

  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: '#DADCE0',
    backgroundColor: colors.white,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  googleIcon: { width: 20, height: 20 },
  googleText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 15,
    color: '#3C4043',
  },

  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  divLine: { flex: 1, height: 1, backgroundColor: colors.border },
  divText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
    flexShrink: 0,
  },

  pwdRules: {
    backgroundColor: colors.surface,
    borderRadius: radii.xs,
    padding: 12,
    gap: 8,
    marginTop: -8,
    marginBottom: 12,
  },
  pwdRule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pwdRuleText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
  },
  pwdRuleOk: {
    color: colors.success,
    fontFamily: fonts.bodyMedium,
  },

  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.textSecondary,
    borderRadius: radii.sm,
    paddingVertical: 16,
    marginTop: 8,
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
});
