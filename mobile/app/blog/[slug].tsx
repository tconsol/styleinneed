import { View, Text, ScrollView, StyleSheet, ActivityIndicator, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import Screen from '../../src/components/Screen';
import { useBlog } from '../../src/api/content';
import { htmlToText } from '../../src/utils/html';
import { colors, fonts, spacing } from '../../src/theme';

export default function BlogDetail() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { width } = useWindowDimensions();
  const { data: blog, isLoading } = useBlog(slug);

  if (isLoading || !blog) {
    return <View style={styles.center}><Stack.Screen options={{ title: '' }} /><ActivityIndicator color={colors.primary} /></View>;
  }

  return (
    <Screen edges={false}>
      <Stack.Screen options={{ headerShown: true, title: '', headerTintColor: colors.text, headerStyle: { backgroundColor: colors.bg } }} />
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <Image source={{ uri: blog.coverImage }} style={{ width, aspectRatio: 16 / 9, backgroundColor: colors.surface }} contentFit="cover" />
        <View style={{ padding: spacing.lg }}>
          {!!blog.category && <Text style={styles.cat}>{blog.category}</Text>}
          <Text style={styles.title}>{blog.title}</Text>
          {!!blog.publishedAt && <Text style={styles.date}>{new Date(blog.publishedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>}
          <Text style={styles.body}>{htmlToText(blog.content)}</Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  cat: { fontFamily: fonts.bodySemibold, fontSize: 11, color: colors.primary, letterSpacing: 1, textTransform: 'uppercase' },
  title: { fontFamily: fonts.headingBold, fontSize: 26, color: colors.text, marginTop: 6, lineHeight: 32 },
  date: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 6 },
  body: { fontFamily: fonts.body, fontSize: 15, color: colors.text, lineHeight: 24, marginTop: 16 },
});
