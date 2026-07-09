import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, ScrollView } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../src/components/Screen';
import Field from '../../src/components/Field';
import { useCreateReview } from '../../src/api/content';
import { colors, fonts, radii, spacing } from '../../src/theme';

export default function WriteReview() {
  const { productId, orderId } = useLocalSearchParams<{ productId: string; orderId: string }>();
  const router = useRouter();
  const createReview = useCreateReview();
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const submit = async () => {
    if (body.trim().length < 3) { Alert.alert('Review needed', 'Write a few words about the product.'); return; }
    try {
      await createReview.mutateAsync({ productId, orderId, rating, title: title.trim() || undefined, body: body.trim() });
      Alert.alert('Thank you!', 'Your review has been submitted.');
      router.back();
    } catch {
      Alert.alert('Could not submit', 'You may have already reviewed this item.');
    }
  };

  return (
    <Screen edges={false}>
      <Stack.Screen options={{ headerShown: true, title: 'Write a Review', headerTintColor: colors.text, headerStyle: { backgroundColor: colors.bg } }} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <Text style={styles.label}>Your rating</Text>
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((s) => (
            <Pressable key={s} onPress={() => setRating(s)} hitSlop={6}>
              <Ionicons name={s <= rating ? 'star' : 'star-outline'} size={32} color={colors.primary} />
            </Pressable>
          ))}
        </View>

        <Field label="Title (optional)" value={title} onChangeText={setTitle} placeholder="Loved it!" />
        <Text style={styles.label}>Review</Text>
        <Field label="" value={body} onChangeText={setBody} placeholder="Share your experience…" multiline numberOfLines={5} style={{ height: 120, textAlignVertical: 'top' }} />

        <Pressable style={[styles.submit, createReview.isPending && { opacity: 0.6 }]} disabled={createReview.isPending} onPress={submit}>
          <Text style={styles.submitText}>{createReview.isPending ? 'Submitting…' : 'Submit Review'}</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.text, marginBottom: 8, marginTop: 6 },
  stars: { flexDirection: 'row', gap: 8, marginBottom: spacing.lg },
  submit: { backgroundColor: colors.text, borderRadius: radii.full, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  submitText: { fontFamily: fonts.bodySemibold, fontSize: 15, color: colors.white },
});
