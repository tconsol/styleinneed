import { useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import Screen from '../src/components/Screen';
import { colors, fonts, radii } from '../src/theme';

const SLIDES = [
  { title: 'Welcome to Style In Need', body: 'Premium women’s fashion celebrating Indian heritage with modern elegance.' },
  { title: 'Discover Fashion', body: 'Sarees, kurtis, lehengas, jewellery and more — curated for you.' },
  { title: 'Premium Collections', body: 'Wedding, festive and everyday edits from the finest craftsmanship.' },
  { title: 'Fast Delivery', body: 'Track every order live, right to your door.' },
];

export default function Onboarding() {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const listRef = useRef<FlatList>(null);
  const [index, setIndex] = useState(0);

  const finish = async () => {
    await SecureStore.setItemAsync('onboarded', '1');
    router.replace('/(tabs)');
  };

  const next = () => {
    if (index < SLIDES.length - 1) {
      listRef.current?.scrollToIndex({ index: index + 1 });
      setIndex(index + 1);
    } else {
      void finish();
    }
  };

  return (
    <Screen>
      <Pressable style={styles.skip} onPress={finish}>
        <Text style={styles.skipText}>Skip</Text>
      </Pressable>

      <FlatList
        ref={listRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => String(i)}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <View style={styles.art} />
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.body}>{item.body}</Text>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
        <Pressable style={styles.cta} onPress={next}>
          <Text style={styles.ctaText}>{index === SLIDES.length - 1 ? 'Start Shopping' : 'Next'}</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  skip: { alignSelf: 'flex-end', padding: 20 },
  skipText: { fontFamily: fonts.bodyMedium, color: colors.muted },
  slide: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  art: { width: 220, height: 280, borderRadius: radii.xl, backgroundColor: colors.surface, marginBottom: 40 },
  title: { fontFamily: fonts.headingBold, fontSize: 28, color: colors.text, textAlign: 'center', marginBottom: 12 },
  body: { fontFamily: fonts.body, fontSize: 15, color: colors.muted, textAlign: 'center', lineHeight: 22 },
  footer: { padding: 24 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 20 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.primary, width: 22 },
  cta: { backgroundColor: colors.text, borderRadius: radii.full, paddingVertical: 16, alignItems: 'center' },
  ctaText: { fontFamily: fonts.bodySemibold, color: colors.white, fontSize: 15, letterSpacing: 0.5 },
});
