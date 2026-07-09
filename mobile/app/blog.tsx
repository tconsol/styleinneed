import { Text, FlatList, Pressable, StyleSheet, ActivityIndicator, View } from 'react-native';
import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import Screen from '../src/components/Screen';
import EmptyState from '../src/components/EmptyState';
import { useBlogs } from '../src/api/content';
import { colors, fonts, radii, spacing } from '../src/theme';

export default function BlogList() {
  const router = useRouter();
  const { data, isLoading } = useBlogs();
  const blogs = data ?? [];

  return (
    <Screen edges={false}>
      <Stack.Screen options={{ headerShown: true, title: 'Journal', headerTintColor: colors.text, headerStyle: { backgroundColor: colors.bg } }} />
      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : blogs.length === 0 ? (
        <EmptyState icon="book-outline" title="No articles yet" />
      ) : (
        <FlatList
          data={blogs}
          keyExtractor={(b) => b._id}
          contentContainerStyle={{ padding: spacing.lg, gap: 18 }}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/blog/${item.slug}`)}>
              <Image source={{ uri: item.coverImage }} style={styles.cover} contentFit="cover" />
              {!!item.category && <Text style={styles.cat}>{item.category}</Text>}
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.excerpt} numberOfLines={2}>{item.excerpt}</Text>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  cover: { width: '100%', aspectRatio: 16 / 10, borderRadius: radii.lg, backgroundColor: colors.surface },
  cat: { fontFamily: fonts.bodySemibold, fontSize: 10, color: colors.primary, letterSpacing: 1, textTransform: 'uppercase', marginTop: 10 },
  title: { fontFamily: fonts.headingBold, fontSize: 18, color: colors.text, marginTop: 4 },
  excerpt: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, marginTop: 4, lineHeight: 19 },
});
