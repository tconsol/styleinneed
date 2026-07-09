import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, cancelAnimation } from 'react-native-reanimated';
import { colors, fonts } from '../theme';

// Continuously scrolling marquee. Items are rendered twice; we translate by one
// set's width and loop, giving a seamless infinite scroll.
export default function InfiniteMarquee({ items, reverse = false, speed = 40 }: { items: string[]; reverse?: boolean; speed?: number }) {
  const tx = useSharedValue(0);
  const [setWidth, setSetWidth] = useState(0);

  useEffect(() => {
    if (!setWidth) return;
    cancelAnimation(tx);
    const from = reverse ? -setWidth : 0;
    const to = reverse ? 0 : -setWidth;
    tx.value = from;
    const duration = (setWidth / speed) * 1000;
    tx.value = withRepeat(withTiming(to, { duration, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(tx);
  }, [setWidth, reverse, speed]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }] }));

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width / 2; // two copies → one set
    if (w && Math.abs(w - setWidth) > 1) setSetWidth(w);
  };

  return (
    <View style={styles.wrap}>
      <Animated.View style={[styles.row, style]} onLayout={onLayout}>
        {[...items, ...items].map((it, i) => (
          <Text key={i} style={styles.item}>{it}  ✦  </Text>
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border, paddingVertical: 12, backgroundColor: colors.surface },
  row: { flexDirection: 'row' },
  item: { fontFamily: fonts.heading, fontSize: 16, color: colors.primary },
});
