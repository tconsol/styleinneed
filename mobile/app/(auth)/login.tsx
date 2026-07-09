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

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Min 8 characters'),
});
type Form = z.infer<typeof schema>;

export default function Login() {
  const router = useRouter();
  const login = useAuth((s) => s.login);
  const googleLogin = useAuth((s) => s.googleLogin);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const [_req, gResponse, promptGoogle] = Google.useAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '',
  });

  useEffect(() => {
    if (gResponse?.type === 'success' && gResponse.authentication?.accessToken) {
      void handleGoogleLogin(gResponse.authentication.accessToken);
    }
  }, [gResponse]);

  const handleGoogleLogin = async (accessToken: string) => {
    setGoogleLoading(true);
    try {
      await googleLogin(accessToken);
      router.replace('/(tabs)');
    } catch {
      Alert.alert('Google sign-in failed', 'Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const onSubmit = async (values: Form) => {
    setLoading(true);
    try {
      await login(values.email, values.password);
      router.replace('/(tabs)');
    } catch {
      Alert.alert('Login failed', 'Check your email and password.');
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

          {/* Form */}
          <View style={s.form}>
            <Text style={s.heading}>Welcome back</Text>
            <Text style={s.sub}>Sign in to your account</Text>

            {/* Google */}
            <Pressable
              style={[s.googleBtn, googleLoading && { opacity: 0.6 }]}
              disabled={googleLoading}
              onPress={() => promptGoogle()}
            >
              <Image source={{ uri: GOOGLE_SVG }} style={s.googleIcon} />
              <Text style={s.googleText}>
                {googleLoading ? 'Signing in…' : 'Continue with Google'}
              </Text>
            </Pressable>

            {/* Divider */}
            <View style={s.divider}>
              <View style={s.divLine} />
              <Text style={s.divText}>or continue with email</Text>
              <View style={s.divLine} />
            </View>

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
            <Controller control={control} name="password" render={({ field }) => (
              <Field
                label="Password"
                required
                secureTextEntry
                value={field.value}
                onChangeText={field.onChange}
                error={errors.password?.message}
              />
            )} />

            <Pressable
              style={s.forgotRow}
              onPress={() => router.push('/(auth)/forgot-password' as never)}
            >
              <Text style={s.forgotText}>Forgot password?</Text>
            </Pressable>

            <Pressable
              style={[s.cta, loading && { opacity: 0.6 }]}
              disabled={loading}
              onPress={handleSubmit(onSubmit)}
            >
              <Text style={s.ctaText}>{loading ? 'Signing in…' : 'Sign In'}</Text>
              {!loading && <Ionicons name="arrow-forward" size={16} color={colors.white} />}
            </Pressable>

            {/* Perks */}
            <View style={s.perks}>
              {['Track orders in real-time', 'Wishlist your favourites', 'Exclusive member offers'].map((p) => (
                <View key={p} style={s.perkRow}>
                  <View style={s.perkDot} />
                  <Text style={s.perkText}>{p}</Text>
                </View>
              ))}
            </View>

            <View style={s.footer}>
              <Text style={s.footerMuted}>New to Style In Need? </Text>
              <Link href="/(auth)/register" style={s.footerLink}>Create account</Link>
            </View>
          </View>
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

  forgotRow: {
    alignSelf: 'flex-end',
    marginTop: -4,
    marginBottom: 20,
    paddingVertical: 4,
  },
  forgotText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.primary,
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

  perks: {
    marginTop: 28,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 10,
  },
  perkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  perkDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  perkText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.mutedDark,
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
