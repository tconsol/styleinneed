import { useState } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { reverseGeocode } from '../src/lib/geocoding';
import Field from '../src/components/Field';
import EmptyState from '../src/components/EmptyState';
import { useAddresses, useManageAddress } from '../src/api/account';
import { colors, fonts, radii, spacing, shadow } from '../src/theme';
import type { Address } from '../src/types';

const schema = z.object({
  label: z.string().min(1, 'Required'),
  fullName: z.string().min(2, 'Required'),
  phone: z.string().min(10, 'Invalid').max(15),
  email: z.string().email('Invalid').optional().or(z.literal('')),
  line1: z.string().min(3, 'Required'),
  line2: z.string().optional(),
  city: z.string().min(2, 'Required'),
  state: z.string().min(2, 'Required'),
  pincode: z.string().min(5, 'Invalid'),
});
type AddrForm = z.infer<typeof schema>;

const LABELS = ['Home', 'Work', 'Other'] as const;

export default function Addresses() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: addresses, isLoading } = useAddresses();
  const { addAddress, deleteAddress } = useManageAddress();
  const [showForm, setShowForm] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState('Home');
  const [locating, setLocating] = useState(false);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  const { control, handleSubmit, reset, setValue, formState: { errors } } = useForm<AddrForm>({
    resolver: zodResolver(schema),
    defaultValues: { label: 'Home', fullName: '', phone: '', email: '', line1: '', line2: '', city: '', state: '', pincode: '' },
  });

  const openForm = () => {
    reset({ label: 'Home', fullName: '', phone: '', email: '', line1: '', line2: '', city: '', state: '', pincode: '' });
    setSelectedLabel('Home');
    setCoords(null);
    setShowForm(true);
  };

  const useCurrentLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission needed', 'Allow location to autofill your address.'); return; }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = pos.coords;
      setCoords({ latitude, longitude });
      const geo = await reverseGeocode(latitude, longitude);
      if (geo) {
        setValue('line1', geo.line1);
        setValue('city', geo.city);
        setValue('state', geo.state);
        setValue('pincode', geo.pincode);
      }
    } catch { Alert.alert('Error', 'Could not get your location.'); } finally { setLocating(false); }
  };

  const save = async (v: AddrForm) => {
    try {
      await addAddress.mutateAsync({
        ...v, label: selectedLabel, country: 'India',
        ...(coords ? { lat: coords.latitude, lng: coords.longitude } : {}),
      } as Address);
      reset(); setCoords(null); setShowForm(false);
    } catch { Alert.alert('Error', 'Could not save address.'); }
  };

  const confirmDelete = (id: string) => {
    Alert.alert('Delete address?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteAddress.mutate(id) },
    ]);
  };

  if (showForm) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => setShowForm(false)} hitSlop={10}>
            <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
          </Pressable>
          <Text style={styles.headerTitle}>Add New Address</Text>
          <View style={{ width: 36 }} />
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView
            contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Label chips */}
            <Text style={styles.fieldLabel}>Address type</Text>
            <View style={styles.labelRow}>
              {LABELS.map((l) => (
                <Pressable
                  key={l}
                  style={[styles.labelChip, selectedLabel === l && styles.labelChipActive]}
                  onPress={() => { setSelectedLabel(l); setValue('label', l); }}
                >
                  <Ionicons
                    name={l === 'Home' ? 'home-outline' : l === 'Work' ? 'briefcase-outline' : 'location-outline'}
                    size={14}
                    color={selectedLabel === l ? colors.white : colors.muted}
                  />
                  <Text style={[styles.labelChipText, selectedLabel === l && styles.labelChipTextActive]}>{l}</Text>
                </Pressable>
              ))}
            </View>

            {/* Location autofill */}
            <Pressable style={styles.locBtn} onPress={useCurrentLocation} disabled={locating}>
              {locating ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="locate" size={16} color={colors.primary} />
              )}
              <Text style={styles.locText}>{locating ? 'Getting location…' : 'Use my current location'}</Text>
            </Pressable>

            {/* Map preview */}
            {coords && (
              <View style={styles.mapWrap}>
                <MapView
                  provider={PROVIDER_GOOGLE}
                  style={StyleSheet.absoluteFill}
                  region={{ ...coords, latitudeDelta: 0.008, longitudeDelta: 0.008 }}
                >
                  <Marker
                    draggable
                    coordinate={coords}
                    onDragEnd={async (e) => {
                      const { latitude, longitude } = e.nativeEvent.coordinate;
                      setCoords({ latitude, longitude });
                      const geo = await reverseGeocode(latitude, longitude);
                      if (geo) {
                        setValue('line1', geo.line1);
                        setValue('city', geo.city);
                        setValue('state', geo.state);
                        setValue('pincode', geo.pincode);
                      }
                    }}
                  />
                </MapView>
              </View>
            )}

            <Controller control={control} name="fullName" render={({ field }) => (
              <Field label="Full name" required value={field.value} onChangeText={field.onChange} error={errors.fullName?.message} />
            )} />
            <Controller control={control} name="phone" render={({ field }) => (
              <Field label="Phone" required keyboardType="phone-pad" value={field.value} onChangeText={field.onChange} error={errors.phone?.message} />
            )} />
            <Controller control={control} name="email" render={({ field }) => (
              <Field label="Email (order updates)" autoCapitalize="none" keyboardType="email-address" value={field.value ?? ''} onChangeText={field.onChange} error={errors.email?.message} />
            )} />
            <Controller control={control} name="line1" render={({ field }) => (
              <Field label="Address line 1" required value={field.value} onChangeText={field.onChange} error={errors.line1?.message} />
            )} />
            <Controller control={control} name="line2" render={({ field }) => (
              <Field label="Address line 2 (optional)" value={field.value ?? ''} onChangeText={field.onChange} />
            )} />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Controller control={control} name="city" render={({ field }) => (
                  <Field label="City" required value={field.value} onChangeText={field.onChange} error={errors.city?.message} />
                )} />
              </View>
              <View style={{ flex: 1 }}>
                <Controller control={control} name="pincode" render={({ field }) => (
                  <Field label="Pincode" required keyboardType="number-pad" value={field.value} onChangeText={field.onChange} error={errors.pincode?.message} />
                )} />
              </View>
            </View>
            <Controller control={control} name="state" render={({ field }) => (
              <Field label="State" required value={field.value} onChangeText={field.onChange} error={errors.state?.message} />
            )} />

            <Pressable
              style={[styles.saveBtn, addAddress.isPending && { opacity: 0.6 }]}
              onPress={handleSubmit(save)}
              disabled={addAddress.isPending}
            >
              <Ionicons name="checkmark" size={18} color={colors.white} />
              <Text style={styles.saveBtnText}>{addAddress.isPending ? 'Saving…' : 'Save Address'}</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
        </Pressable>
        <Text style={styles.headerTitle}>My Addresses</Text>
        <Pressable style={styles.addBtn} onPress={openForm} hitSlop={8}>
          <Ionicons name="add" size={22} color={colors.primary} />
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />
      ) : !addresses?.length ? (
        <EmptyState
          icon="location-outline"
          title="No saved addresses"
          subtitle="Add an address to speed up checkout."
          ctaText="Add Address"
          onCta={openForm}
        />
      ) : (
        <FlatList
          data={addresses}
          keyExtractor={(a) => a._id!}
          contentContainerStyle={{ padding: spacing.lg, gap: 14, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.card}>
              {/* Card header */}
              <View style={styles.cardHead}>
                <View style={styles.labelBadge}>
                  <Ionicons
                    name={item.label === 'Home' ? 'home' : item.label === 'Work' ? 'briefcase' : 'location'}
                    size={12}
                    color={colors.primary}
                  />
                  <Text style={styles.labelBadgeText}>{item.label?.toUpperCase()}</Text>
                </View>
                {item.isDefault && (
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultBadgeText}>DEFAULT</Text>
                  </View>
                )}
              </View>

              {/* Address details */}
              <Text style={styles.addrName}>{item.fullName}</Text>
              <Text style={styles.addrText}>
                {item.line1}{item.line2 ? `, ${item.line2}` : ''}
              </Text>
              <Text style={styles.addrText}>{item.city}, {item.state} – {item.pincode}</Text>
              <Text style={styles.addrPhone}>
                <Ionicons name="call-outline" size={12} color={colors.muted} /> {item.phone}
              </Text>

              {/* Actions */}
              <View style={styles.cardActions}>
                <Pressable
                  style={styles.deleteBtn}
                  onPress={() => confirmDelete(item._id!)}
                  hitSlop={8}
                >
                  <Ionicons name="trash-outline" size={14} color={colors.danger} />
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </Pressable>
              </View>
            </View>
          )}
          ListFooterComponent={
            <Pressable style={styles.addNewCard} onPress={openForm}>
              <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
              <Text style={styles.addNewText}>Add new address</Text>
            </Pressable>
          }
        />
      )}
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
  addBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.surfaceWarm,
    alignItems: 'center', justifyContent: 'center',
  },
  // List cards
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...shadow.soft,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.sm,
  },
  labelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceWarm,
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  labelBadgeText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 10,
    color: colors.primary,
    letterSpacing: 0.8,
  },
  defaultBadge: {
    backgroundColor: '#E8F5E9',
    borderRadius: radii.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  defaultBadgeText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 9,
    color: '#2E7D32',
    letterSpacing: 0.8,
  },
  addrName: {
    fontFamily: fonts.bodySemibold,
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  addrText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted,
    lineHeight: 19,
  },
  addrPhone: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
    marginTop: 4,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: '#FFD7D7',
    backgroundColor: '#FFF5F5',
  },
  deleteBtnText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.danger,
  },
  addNewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: colors.primaryLight,
    borderStyle: 'dashed',
    borderRadius: radii.md,
    paddingVertical: 18,
    backgroundColor: colors.surfaceWarm,
  },
  addNewText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 14,
    color: colors.primary,
  },
  // Form styles
  fieldLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.muted,
    marginBottom: 10,
  },
  labelRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: spacing.lg,
  },
  labelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  labelChipActive: {
    backgroundColor: colors.textSecondary,
    borderColor: colors.textSecondary,
  },
  labelChipText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.muted,
  },
  labelChipTextActive: {
    color: colors.white,
  },
  locBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    borderRadius: radii.xs,
    paddingVertical: 12,
    marginBottom: spacing.lg,
    backgroundColor: colors.surfaceWarm,
  },
  locText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 13,
    color: colors.primary,
  },
  mapWrap: {
    height: 160,
    borderRadius: radii.md,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.textSecondary,
    borderRadius: radii.xs,
    paddingVertical: 16,
    marginTop: spacing.lg,
  },
  saveBtnText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 15,
    color: colors.white,
    letterSpacing: 0.3,
  },
});
