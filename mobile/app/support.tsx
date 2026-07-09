import { useState } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Linking,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Field from '../src/components/Field';
import EmptyState from '../src/components/EmptyState';
import { useAuth } from '../src/store/auth';
import { useTickets, useCreateTicket } from '../src/api/content';
import { colors, fonts, radii, spacing, shadow } from '../src/theme';

const STATUS_META: Record<string, { color: string; bg: string; label: string }> = {
  open:     { color: '#1D4ED8', bg: '#EFF6FF', label: 'Open' },
  pending:  { color: '#92400E', bg: '#FFFBEB', label: 'Pending' },
  resolved: { color: '#166534', bg: '#F0FDF4', label: 'Resolved' },
  closed:   { color: '#6B7280', bg: '#F9FAFB', label: 'Closed' },
};

const FAQS = [
  { q: 'How do I track my order?', a: 'Go to My Orders in your profile. Each order shows live status. You\'ll also get notifications at each step.' },
  { q: 'What is the return policy?', a: 'We offer 7-day returns on all items in original condition with tags intact. Initiate from My Orders page.' },
  { q: 'How long does delivery take?', a: 'Standard delivery: 3–7 business days. Express available at checkout for select pincodes.' },
  { q: 'Can I cancel my order?', a: 'Orders can be cancelled within 24 hours of placing. After dispatch, only returns are accepted.' },
];

export default function Support() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isAuth = useAuth((s) => s.isAuthenticated);
  const { data: tickets, isLoading } = useTickets();
  const createTicket = useCreateTicket();
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('General');
  const [description, setDescription] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const submit = async () => {
    if (subject.trim().length < 3 || description.trim().length < 5) {
      Alert.alert('Missing info', 'Add a subject and description.');
      return;
    }
    try {
      await createTicket.mutateAsync({ subject: subject.trim(), category, description: description.trim() });
      setSubject(''); setDescription(''); setCategory('General'); setShowForm(false);
    } catch { Alert.alert('Error', 'Could not create ticket.'); }
  };

  if (showForm) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => setShowForm(false)} hitSlop={10}>
            <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
          </Pressable>
          <Text style={styles.headerTitle}>New Support Ticket</Text>
          <View style={{ width: 36 }} />
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView
            contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
              <Text style={styles.infoText}>Our team usually responds within 24 hours on business days.</Text>
            </View>

            <Field
              label="Subject"
              required
              value={subject}
              onChangeText={setSubject}
              placeholder="e.g. Wrong item received"
            />
            <Field
              label="Category"
              required
              value={category}
              onChangeText={setCategory}
              placeholder="General / Order / Payment / Return"
            />
            <Field
              label="Description"
              required
              value={description}
              onChangeText={setDescription}
              placeholder="Describe your issue in detail…"
              multiline
              numberOfLines={5}
              style={{ height: 120, textAlignVertical: 'top' }}
            />

            <View style={styles.formActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setShowForm(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.submitBtn, createTicket.isPending && { opacity: 0.6 }]}
                onPress={submit}
                disabled={createTicket.isPending}
              >
                <Ionicons name="send-outline" size={16} color={colors.white} />
                <Text style={styles.submitBtnText}>{createTicket.isPending ? 'Sending…' : 'Submit Ticket'}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
        </Pressable>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Contact channels */}
        <View style={styles.contactRow}>
          <Pressable style={styles.contactCard} onPress={() => Linking.openURL('https://wa.me/917989XXXXXX')}>
            <View style={[styles.contactIcon, { backgroundColor: '#ECFDF5' }]}>
              <Ionicons name="logo-whatsapp" size={22} color="#10B981" />
            </View>
            <Text style={styles.contactLabel}>WhatsApp</Text>
            <Text style={styles.contactSub}>Quick chat</Text>
          </Pressable>
          <Pressable style={styles.contactCard} onPress={() => Linking.openURL('mailto:support@styleinneedfashions.com')}>
            <View style={[styles.contactIcon, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="mail-outline" size={22} color="#3B82F6" />
            </View>
            <Text style={styles.contactLabel}>Email</Text>
            <Text style={styles.contactSub}>24h reply</Text>
          </Pressable>
          <Pressable style={styles.contactCard} onPress={() => Linking.openURL('tel:+917989XXXXXX')}>
            <View style={[styles.contactIcon, { backgroundColor: '#FFFBEB' }]}>
              <Ionicons name="call-outline" size={22} color="#F59E0B" />
            </View>
            <Text style={styles.contactLabel}>Call</Text>
            <Text style={styles.contactSub}>Mon–Sat 10–6</Text>
          </Pressable>
        </View>

        {/* Raise ticket CTA */}
        {isAuth && (
          <Pressable style={styles.ticketCta} onPress={() => setShowForm(true)}>
            <View style={styles.ticketCtaLeft}>
              <Ionicons name="create-outline" size={20} color={colors.primary} />
              <View>
                <Text style={styles.ticketCtaTitle}>Raise a support ticket</Text>
                <Text style={styles.ticketCtaSub}>Track your issue until resolved</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.primary} />
          </Pressable>
        )}

        {/* FAQ section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>FREQUENTLY ASKED</Text>
        </View>
        <View style={[styles.faqCard, shadow.soft]}>
          {FAQS.map((faq, i) => {
            const expanded = expandedFaq === i;
            return (
              <Pressable
                key={i}
                style={[styles.faqRow, i === FAQS.length - 1 && { borderBottomWidth: 0 }]}
                onPress={() => setExpandedFaq(expanded ? null : i)}
              >
                <View style={styles.faqTop}>
                  <Text style={styles.faqQ}>{faq.q}</Text>
                  <Ionicons
                    name={expanded ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={colors.muted}
                  />
                </View>
                {expanded && <Text style={styles.faqA}>{faq.a}</Text>}
              </Pressable>
            );
          })}
        </View>

        {/* My tickets */}
        {isAuth && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>MY TICKETS</Text>
              {tickets && tickets.length > 3 && (
                <Pressable onPress={() => router.push('/tickets')}>
                  <Text style={styles.viewAll}>View all</Text>
                </Pressable>
              )}
            </View>
            {isLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
            ) : !tickets?.length ? (
              <View style={styles.noTickets}>
                <Ionicons name="chatbubbles-outline" size={32} color={colors.muted} />
                <Text style={styles.noTicketsText}>No tickets raised yet</Text>
              </View>
            ) : (
              <View style={[styles.ticketList, shadow.soft]}>
                {tickets.slice(0, 3).map((item, i) => {
                  const meta = STATUS_META[item.status] ?? STATUS_META.open;
                  return (
                    <Pressable
                      key={item._id}
                      style={[styles.ticketRow, i === Math.min(tickets.length, 3) - 1 && { borderBottomWidth: 0 }]}
                      onPress={() => router.push(`/support/${item._id}`)}
                    >
                      <View style={styles.ticketIcon}>
                        <Ionicons name="ticket-outline" size={16} color={colors.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.ticketSubject} numberOfLines={1}>{item.subject}</Text>
                        <Text style={styles.ticketMeta}>
                          {item.category} · {new Date(item.createdAt).toLocaleDateString('en-IN')}
                        </Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
                        <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </>
        )}

        {!isAuth && (
          <View style={styles.signInPrompt}>
            <Ionicons name="lock-closed-outline" size={28} color={colors.muted} />
            <Text style={styles.signInText}>Sign in to raise tickets and track your support history</Text>
            <Pressable style={styles.signInBtn} onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.signInBtnText}>Sign In</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },
  backBtn: { padding: 6 },
  headerTitle: {
    flex: 1,
    fontFamily: fonts.headingBold,
    fontSize: 20,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  contactRow: {
    flexDirection: 'row',
    gap: 10,
    padding: spacing.lg,
  },
  contactCard: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    padding: 14,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.soft,
  },
  contactIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactLabel: {
    fontFamily: fonts.bodySemibold,
    fontSize: 13,
    color: colors.textSecondary,
  },
  contactSub: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.muted,
    textAlign: 'center',
  },
  ticketCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.surfaceWarm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  ticketCtaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ticketCtaTitle: {
    fontFamily: fonts.bodySemibold,
    fontSize: 14,
    color: colors.textSecondary,
  },
  ticketCtaSub: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.muted,
    marginTop: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: 10,
  },
  sectionTitle: {
    fontFamily: fonts.bodySemibold,
    fontSize: 11,
    color: colors.muted,
    letterSpacing: 1.2,
  },
  viewAll: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.primary,
  },
  faqCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  faqRow: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  faqTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  faqQ: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
  },
  faqA: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted,
    lineHeight: 20,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  ticketList: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  ticketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  ticketIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceWarm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ticketSubject: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.textSecondary,
  },
  ticketMeta: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  statusText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 11,
  },
  noTickets: {
    alignItems: 'center',
    gap: 8,
    padding: spacing.xl,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    marginBottom: spacing.lg,
  },
  noTicketsText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted,
  },
  signInPrompt: {
    alignItems: 'center',
    gap: 12,
    margin: spacing.xl,
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
  },
  signInText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  signInBtn: {
    backgroundColor: colors.textSecondary,
    borderRadius: radii.xs,
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  signInBtnText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 14,
    color: colors.white,
  },
  // New ticket form
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surfaceWarm,
    borderRadius: radii.xs,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  infoText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.mutedDark,
    flex: 1,
    lineHeight: 19,
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: spacing.md,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xs,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 14,
    color: colors.muted,
  },
  submitBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.textSecondary,
    borderRadius: radii.xs,
    paddingVertical: 14,
  },
  submitBtnText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 14,
    color: colors.white,
  },
});
