import { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSpring, withDelay, withSequence, Easing, FadeInDown,
} from 'react-native-reanimated';
import { colors, fonts, radii, spacing } from '../src/theme';

export default function OrderSuccess() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  // Animated success badge: ring scales + fades, check pops with a spring.
  const ring = useSharedValue(0);
  const check = useSharedValue(0);
  const pulse = useSharedValue(1);

  useEffect(() => {
    ring.value = withTiming(1, { duration: 450, easing: Easing.out(Easing.cubic) });
    check.value = withDelay(250, withSpring(1, { damping: 9, stiffness: 140 }));
    pulse.value = withDelay(250, withSequence(withTiming(1.12, { duration: 220 }), withTiming(1, { duration: 220 })));
  }, []);

  const ringStyle = useAnimatedStyle(() => ({ opacity: ring.value, transform: [{ scale: 0.6 + ring.value * 0.4 }] }));
  const checkStyle = useAnimatedStyle(() => ({ opacity: check.value, transform: [{ scale: check.value * pulse.value }] }));

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.center}>
        <Animated.View style={[styles.ring, ringStyle]}>
          <Animated.View style={checkStyle}>
            <Ionicons name="checkmark" size={64} color={colors.white} />
          </Animated.View>
        </Animated.View>

        <Animated.Text entering={FadeInDown.delay(450).springify()} style={styles.title}>
          Order Placed Successfully!
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(550).springify()} style={styles.subtitle}>
          Thank you for shopping with Style In Need. We've emailed your order confirmation and you can track it anytime.
        </Animated.Text>
      </View>

      <Animated.View entering={FadeInDown.delay(700).springify()} style={styles.actions}>
        <Pressable style={styles.trackBtn} onPress={() => router.replace(`/order/${id}`)}>
          <Ionicons name="navigate-outline" size={18} color={colors.white} />
          <Text style={styles.trackText}>Track Order</Text>
        </Pressable>
        <Pressable style={styles.shopBtn} onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.shopText}>Continue Shopping</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, padding: spacing.xl, justifyContent: 'center' },
  center: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  ring: { width: 120, height: 120, borderRadius: 60, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xl },
  title: { fontFamily: fonts.headingBold, fontSize: 24, color: colors.text, textAlign: 'center' },
  subtitle: { fontFamily: fonts.body, fontSize: 14, color: colors.muted, textAlign: 'center', marginTop: 12, lineHeight: 21, paddingHorizontal: spacing.md },
  actions: { gap: 12 },
  trackBtn: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.text, borderRadius: radii.full, paddingVertical: 16 },
  trackText: { fontFamily: fonts.bodySemibold, fontSize: 15, color: colors.white },
  shopBtn: { alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.text, borderRadius: radii.full, paddingVertical: 15 },
  shopText: { fontFamily: fonts.bodySemibold, fontSize: 15, color: colors.text },
});
