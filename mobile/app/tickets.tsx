import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import Screen from '../src/components/Screen';
import EmptyState from '../src/components/EmptyState';
import { useTickets } from '../src/api/content';
import { colors, fonts, radii, spacing } from '../src/theme';

const STATUS_COLOR: Record<string, string> = {
  open: '#1E40AF', pending: '#854D0E', resolved: '#166534', closed: '#6B7280',
};

export default function AllTickets() {
  const router = useRouter();
  const { data: tickets, isLoading } = useTickets();

  return (
    <Screen edges={false}>
      <Stack.Screen options={{ headerShown: true, title: 'My Tickets', headerTintColor: colors.text, headerStyle: { backgroundColor: colors.bg } }} />
      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : !tickets?.length ? (
        <EmptyState icon="chatbubbles-outline" title="No tickets" />
      ) : (
        <FlatList
          data={tickets}
          keyExtractor={(t) => t._id}
          contentContainerStyle={{ padding: spacing.lg, gap: 12 }}
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => router.push(`/support/${item._id}`)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.subject} numberOfLines={1}>{item.subject}</Text>
                <Text style={styles.meta}>{item.category} · {new Date(item.createdAt).toLocaleDateString('en-IN')}</Text>
              </View>
              <Text style={[styles.status, { color: STATUS_COLOR[item.status] }]}>{item.status}</Text>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.white },
  subject: { fontFamily: fonts.bodySemibold, fontSize: 14, color: colors.text },
  meta: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 2 },
  status: { fontFamily: fonts.bodySemibold, fontSize: 11, textTransform: 'capitalize' },
});
