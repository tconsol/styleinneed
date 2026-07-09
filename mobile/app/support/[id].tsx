import { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../src/components/Screen';
import { useTicket, useAddTicketMessage } from '../../src/api/content';
import { colors, fonts, radii, spacing } from '../../src/theme';

export default function TicketDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: ticket, isLoading } = useTicket(id);
  const addMessage = useAddTicketMessage();
  const [text, setText] = useState('');

  if (isLoading || !ticket) {
    return <View style={styles.center}><Stack.Screen options={{ title: 'Ticket' }} /><ActivityIndicator color={colors.primary} /></View>;
  }

  const send = async () => {
    if (!text.trim()) return;
    await addMessage.mutateAsync({ id, content: text.trim() });
    setText('');
  };

  const closed = ticket.status === 'closed' || ticket.status === 'resolved';

  return (
    <Screen edges={false}>
      <Stack.Screen options={{ headerShown: true, title: ticket.subject, headerTintColor: colors.text, headerStyle: { backgroundColor: colors.bg } }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: 12 }}>
          <Text style={styles.status}>Status: {ticket.status}</Text>
          {!!ticket.description && (
            <View style={[styles.bubble, styles.mine]}><Text style={styles.bubbleText}>{ticket.description}</Text></View>
          )}
          {(ticket.messages ?? []).filter((m: { isInternal?: boolean }) => !m.isInternal).map((m: { content: string }, i: number) => (
            <View key={i} style={[styles.bubble, styles.theirs]}>
              <Text style={styles.bubbleText}>{m.content}</Text>
            </View>
          ))}
        </ScrollView>

        {!closed && (
          <View style={styles.inputBar}>
            <TextInput value={text} onChangeText={setText} placeholder="Type a message…" placeholderTextColor={colors.muted} style={styles.input} multiline />
            <Pressable style={styles.send} onPress={send} disabled={addMessage.isPending}>
              <Ionicons name="send" size={18} color={colors.white} />
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  status: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.muted, textTransform: 'capitalize' },
  bubble: { maxWidth: '85%', padding: 12, borderRadius: radii.md },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.surface },
  theirs: { alignSelf: 'flex-start', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  bubbleText: { fontFamily: fonts.body, fontSize: 14, color: colors.text, lineHeight: 20 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.white },
  input: { flex: 1, maxHeight: 100, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, paddingHorizontal: 14, paddingVertical: 10, fontFamily: fonts.body, fontSize: 14, color: colors.text },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.text, alignItems: 'center', justifyContent: 'center' },
});
