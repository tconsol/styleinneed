import { useEffect, useRef, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, useWindowDimensions, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { Image } from 'expo-image';
import { colors, fonts, radii, spacing, shadow } from '../theme';

export interface Slide {
  image: string;
  label: string;
  title: string;
  cta: string;
  onPress: () => void;
}

export default function HeroCarousel({ slides }: { slides: Slide[] }) {
  const { width } = useWindowDimensions();
  const ref = useRef<FlatList<Slide>>(null);
  const [idx, setIdx] = useState(0);

  // Auto-advance
  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => {
      setIdx((i) => {
        const n = (i + 1) % slides.length;
        ref.current?.scrollToOffset({ offset: n * width, animated: true });
        return n;
      });
    }, 4500);
    return () => clearInterval(t);
  }, [width, slides.length]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) =>
    setIdx(Math.round(e.nativeEvent.contentOffset.x / width));

  return (
    <View>
      <FlatList
        ref={ref}
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => String(i)}
        onMomentumScrollEnd={onScroll}
        renderItem={({ item }) => (
          <Pressable style={{ width }} onPress={item.onPress}>
            <View style={[styles.slide, shadow.card]}>
              <Image source={{ uri: item.image }} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} />
              <View style={styles.overlay} />
              <View style={styles.content}>
                <Text style={styles.label}>{item.label}</Text>
                <Text style={styles.title}>{item.title}</Text>
                <View style={styles.cta}><Text style={styles.ctaText}>{item.cta}</Text></View>
              </View>
            </View>
          </Pressable>
        )}
      />
      <View style={styles.dots}>
        {slides.map((_, i) => (
          <View key={i} style={[styles.dot, i === idx && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  slide: { marginHorizontal: spacing.lg, height: 400, borderRadius: radii.xl, overflow: 'hidden', justifyContent: 'flex-end', backgroundColor: colors.surface },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(28,28,28,0.30)' },
  content: { padding: spacing.xl },
  label: { fontFamily: fonts.bodySemibold, fontSize: 11, color: colors.white, letterSpacing: 2 },
  title: { fontFamily: fonts.headingBold, fontSize: 36, color: colors.white, marginTop: 6, lineHeight: 40 },
  cta: { marginTop: 16, alignSelf: 'flex-start', backgroundColor: colors.white, borderRadius: radii.full, paddingHorizontal: 24, paddingVertical: 12 },
  ctaText: { fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.text },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 12 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
  dotActive: { width: 18, backgroundColor: colors.primary },
});
