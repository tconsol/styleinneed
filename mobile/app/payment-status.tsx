import { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, BackHandler } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useVerifyPayment, useCancelOrder } from '../src/api/orders';
import { colors, fonts, radii, spacing } from '../src/theme';

type Phase = 'paying' | 'verifying' | 'failed' | 'cancelling';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function PaymentStatus() {
  const router = useRouter();
  const params = useLocalSearchParams<{ orderId: string; provider: string; url: string }>();
  const orderId = String(params.orderId);
  const provider = (params.provider === 'stripe' ? 'stripe' : 'razorpay') as 'razorpay' | 'stripe';
  const url = decodeURIComponent(String(params.url || ''));

  const verify = useVerifyPayment();
  const cancel = useCancelOrder();
  const [phase, setPhase] = useState<Phase>('paying');
  const started = useRef(false);

  const autoCancelOrder = useCallback(async () => {
    setPhase('cancelling');
    try {
      await cancel.mutateAsync({ id: orderId, reason: 'Payment not completed by customer' });
    } catch { /* ignore cancel errors */ }
    setPhase('failed');
  }, [orderId]);

  const run = useCallback(async () => {
    setPhase('paying');
    if (url) {
      // Opens Chrome Custom Tabs (Android) / SFSafariViewController (iOS) — stays in-app
      await WebBrowser.openBrowserAsync(url, {
        dismissButtonStyle: 'cancel',
        toolbarColor: colors.white,
        controlsColor: colors.primary,
        showTitle: true,
        enableBarCollapsing: false,
      });
    }

    // Verify payment after browser closes
    setPhase('verifying');
    for (let i = 0; i < 4; i++) {
      try {
        await verify.mutateAsync({ orderId, provider });
        router.replace(`/order-success?id=${orderId}`);
        return;
      } catch {
        if (i < 3) await sleep(1500);
      }
    }

    // All retries failed — auto-cancel the order
    await autoCancelOrder();
  }, [orderId, provider, url, autoCancelOrder]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void run();
  }, [run]);

  // Block hardware back while paying/verifying
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => phase !== 'failed');
    return () => sub.remove();
  }, [phase]);

  const isBlocking = phase === 'paying' || phase === 'verifying' || phase === 'cancelling';

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />

      {isBlocking ? (
        <Animated.View entering={FadeIn} style={styles.center}>
          <View style={styles.spinnerWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
          <Text style={styles.title}>
            {phase === 'paying'
              ? 'Complete Payment'
              : phase === 'cancelling'
              ? 'Cancelling Order…'
              : 'Verifying Payment…'}
          </Text>
          <Text style={styles.sub}>
            {phase === 'paying'
              ? 'Finish your payment in the secure window. Return here once done.'
              : phase === 'cancelling'
              ? 'Payment was not confirmed. Cancelling your order automatically.'
              : 'Please wait while we confirm your payment. Do not close the app.'}
          </Text>
        </Animated.View>
      ) : (
        <Animated.View entering={FadeIn} style={styles.center}>
          <View style={styles.failIcon}>
            <Ionicons name="close-circle" size={72} color={colors.danger} />
          </View>
          <Text style={styles.title}>Payment Failed</Text>
          <Text style={styles.sub}>
            Your order has been cancelled automatically. If any amount was deducted, it will be refunded within 3–5 business days.
          </Text>

          <Pressable style={styles.retryBtn} onPress={() => {
            started.current = false;
            void run();
          }}>
            <Ionicons name="refresh" size={18} color={colors.white} />
            <Text style={styles.retryText}>Try Again</Text>
          </Pressable>

          <Pressable style={styles.shopBtn} onPress={() => router.replace('/(tabs)')}>
            <Text style={styles.shopText}>Continue Shopping</Text>
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white, padding: spacing.xl, justifyContent: 'center' },
  center: { alignItems: 'center' },
  spinnerWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.surfaceWarm,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  failIcon: { marginBottom: spacing.xl },
  title: {
    fontFamily: fonts.headingBold,
    fontSize: 22,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
  },
  sub: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing.md,
  },
  retryBtn: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    backgroundColor: colors.textSecondary,
    borderRadius: radii.xs,
    paddingVertical: 16,
    marginTop: spacing.xxl,
  },
  retryText: { fontFamily: fonts.bodySemibold, fontSize: 15, color: colors.white },
  shopBtn: { paddingVertical: 16 },
  shopText: { fontFamily: fonts.bodySemibold, fontSize: 14, color: colors.primary },
});
