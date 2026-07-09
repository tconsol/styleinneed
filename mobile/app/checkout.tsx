import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as Location from 'expo-location';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { reverseGeocode } from '../src/lib/geocoding';
import Screen from '../src/components/Screen';
import Field from '../src/components/Field';
import { useCart, cartTotals } from '../src/api/cart';
import { useAddresses, useManageAddress } from '../src/api/account';
import { useCreateOrder, usePaymentConfig, useVerifyPayment } from '../src/api/orders';
import { useDelivery } from '../src/store/delivery';
import { colors, fonts, radii, spacing } from '../src/theme';
import { formatPrice } from '../src/utils/format';
import type { Address } from '../src/types';

const addrSchema = z.object({
  label: z.string().min(1, 'Required'),
  fullName: z.string().min(2, 'Required'),
  phone: z.string().min(10, 'Invalid').max(15),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  line1: z.string().min(3, 'Required'),
  line2: z.string().optional(),
  city: z.string().min(2, 'Required'),
  state: z.string().min(2, 'Required'),
  pincode: z.string().min(5, 'Invalid'),
});
type AddrForm = z.infer<typeof addrSchema>;


export default function Checkout() {
  const router = useRouter();
  const { coupon: couponParam } = useLocalSearchParams<{ coupon?: string }>();
  const { data: cart } = useCart();
  const { data: addresses, isLoading: addrLoading } = useAddresses();
  const { addAddress } = useManageAddress();
  const createOrder = useCreateOrder();
  const verify = useVerifyPayment();
  const { data: payConfig } = usePaymentConfig();

  const paymentOptions = [
    { key: 'cod', label: 'Cash on Delivery', icon: 'cash-outline' as const, enabled: true },
    { key: 'razorpay', label: 'UPI / Card / Netbanking (Razorpay)', icon: 'card-outline' as const, enabled: !!payConfig?.razorpayKeyId },
    { key: 'stripe', label: 'International Cards (Stripe)', icon: 'globe-outline' as const, enabled: !!payConfig?.stripePublishableKey },
  ];

  const [selected, setSelected] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [coupon, setCoupon] = useState(couponParam ?? '');
  const [payment, setPayment] = useState('cod');
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locating, setLocating] = useState(false);

  const { subtotal } = cartTotals(cart);
  const shipping = subtotal > 0 && subtotal < 999 ? 99 : 0;
  const total = subtotal + shipping;

  const deliverySel = useDelivery((s) => s.selected);
  const draft = useDelivery((s) => s.draft);
  const setDraft = useDelivery((s) => s.setDraft);
  const addressId = selected ?? deliverySel?._id ?? addresses?.find((a: Address) => a.isDefault)?._id ?? addresses?.[0]?._id ?? null;

  const { control, handleSubmit, reset, setValue, formState: { errors } } = useForm<AddrForm>({
    resolver: zodResolver(addrSchema),
    defaultValues: { label: 'Home', fullName: '', phone: '', email: '', line1: '', line2: '', city: '', state: '', pincode: '' },
  });

  // Open the new-address form, prefilling whatever the location flow geocoded.
  const openForm = () => {
    reset({ label: 'Home', fullName: '', phone: '', email: '',
      line1: draft?.line1 ?? '', line2: '', city: draft?.city ?? '', state: draft?.state ?? '', pincode: draft?.pincode ?? '' });
    setCoords(draft?.lat && draft?.lng ? { latitude: draft.lat, longitude: draft.lng } : null);
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); reset(); setCoords(null); };

  // If user arrived from "current location" (a geocoded draft) and has no saved
  // address, open the prefilled form automatically.
  useEffect(() => {
    if (draft && !addressId && !showForm) openForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, addresses]);

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

  const saveAddress = async (values: AddrForm) => {
    try {
      await addAddress.mutateAsync({
        ...values, country: 'India',
        ...(coords ? { lat: coords.latitude, lng: coords.longitude } : {}),
      } as Address);
      reset(); setCoords(null); setShowForm(false); setDraft(null);
    } catch {
      Alert.alert('Error', 'Could not save address.');
    }
  };

  const placeOrder = async () => {
    if (!addressId) { Alert.alert('Address needed', 'Add a delivery address first.'); return; }
    try {
      const order = await createOrder.mutateAsync({ addressId, paymentMethod: payment, couponCode: coupon.trim() || undefined });

      // Online payment → blocking payment-status screen handles gateway + verify.
      if (order.provider && order.url) {
        router.replace(
          `/payment-status?orderId=${order.orderId}&provider=${order.provider}&url=${encodeURIComponent(order.url)}`
        );
        return;
      }

      // COD
      router.replace(`/order-success?id=${order.orderId}`);
    } catch {
      Alert.alert('Order failed', 'Something went wrong placing your order.');
    }
  };

  return (
    <Screen edges={false}>
      <Stack.Screen options={{ headerShown: true, title: 'Checkout', headerTintColor: colors.textSecondary, headerStyle: { backgroundColor: colors.white }, headerShadowVisible: true }} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        {/* Address */}
        <Text style={styles.section}>Delivery Address</Text>
        {addrLoading ? <ActivityIndicator color={colors.primary} /> : (
          <>
            {addresses?.map((a: Address) => {
              const active = addressId === a._id;
              return (
                <Pressable key={a._id} style={[styles.addr, active && styles.addrActive]} onPress={() => setSelected(a._id!)}>
                  <Ionicons name={active ? 'radio-button-on' : 'radio-button-off'} size={18} color={active ? colors.primary : colors.muted} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.addrName}>{a.fullName} · {a.label}</Text>
                    <Text style={styles.addrText}>{a.line1}{a.line2 ? `, ${a.line2}` : ''}, {a.city}, {a.state} {a.pincode}</Text>
                    <Text style={styles.addrText}>{a.phone}</Text>
                  </View>
                </Pressable>
              );
            })}
            {!showForm && (
              <Pressable style={styles.addNew} onPress={openForm}>
                <Ionicons name="add" size={18} color={colors.primary} />
                <Text style={styles.addNewText}>Add new address</Text>
              </Pressable>
            )}
          </>
        )}

        {showForm && (
          <View style={styles.form}>
            <View style={styles.formHead}>
              <Text style={styles.formTitle}>New Address</Text>
              <Pressable onPress={closeForm} hitSlop={10}><Ionicons name="close" size={22} color={colors.muted} /></Pressable>
            </View>

            <Pressable style={styles.locBtn} onPress={useCurrentLocation} disabled={locating}>
              <Ionicons name="locate" size={16} color={colors.primary} />
              <Text style={styles.locText}>{locating ? 'Getting location…' : 'Use my current location'}</Text>
            </Pressable>

            {coords && (
              <View style={styles.mapWrap}>
                <MapView provider={PROVIDER_GOOGLE} style={StyleSheet.absoluteFill}
                  region={{ ...coords, latitudeDelta: 0.008, longitudeDelta: 0.008 }}>
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

            {([['label', 'Label (Home/Work)'], ['fullName', 'Full name'], ['phone', 'Phone'], ['email', 'Email (order updates)'], ['line1', 'Address line 1'], ['line2', 'Address line 2 (optional)'], ['city', 'City'], ['state', 'State'], ['pincode', 'Pincode']] as const).map(([name, label]) => (
              <Controller key={name} control={control} name={name} render={({ field }) => (
                <Field label={label} value={field.value} onChangeText={field.onChange}
                  keyboardType={name === 'phone' || name === 'pincode' ? 'number-pad' : name === 'email' ? 'email-address' : 'default'}
                  autoCapitalize={name === 'email' ? 'none' : 'sentences'}
                  error={errors[name]?.message} />
              )} />
            ))}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable style={styles.cancelBtn} onPress={closeForm}><Text style={styles.cancelText}>Close</Text></Pressable>
              <Pressable style={[styles.saveBtn, { flex: 1 }]} onPress={handleSubmit(saveAddress)} disabled={addAddress.isPending}>
                <Text style={styles.saveText}>{addAddress.isPending ? 'Saving…' : 'Save Address'}</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Coupon */}
        <Text style={styles.section}>Coupon</Text>
        <Field label="" value={coupon} onChangeText={setCoupon} placeholder="Enter coupon code" autoCapitalize="characters" />

        {/* Payment */}
        <Text style={styles.section}>Payment Method</Text>
        {paymentOptions.map((p) => (
          <Pressable key={p.key} disabled={!p.enabled} style={[styles.pay, !p.enabled && { opacity: 0.45 }, payment === p.key && styles.payActive]} onPress={() => setPayment(p.key)}>
            <Ionicons name={payment === p.key ? 'radio-button-on' : 'radio-button-off'} size={18} color={payment === p.key ? colors.primary : colors.muted} />
            <Ionicons name={p.icon} size={18} color={colors.text} />
            <Text style={styles.payLabel}>{p.label}</Text>
            {!p.enabled && <Text style={styles.soon}>Unavailable</Text>}
          </Pressable>
        ))}

        {/* Summary */}
        <Text style={styles.section}>Order Summary</Text>
        <View style={styles.sumRow}><Text style={styles.sumLabel}>Subtotal</Text><Text style={styles.sumVal}>{formatPrice(subtotal)}</Text></View>
        <View style={styles.sumRow}><Text style={styles.sumLabel}>Shipping</Text><Text style={styles.sumVal}>{shipping === 0 ? 'Free' : formatPrice(shipping)}</Text></View>
        <View style={[styles.sumRow, { marginTop: 6 }]}><Text style={styles.totalLabel}>Total</Text><Text style={styles.totalVal}>{formatPrice(total)}</Text></View>
        <Text style={styles.note}>Coupon discount (if any) is applied on the next step.</Text>
      </ScrollView>

      <View style={styles.bottom}>
        <Pressable style={[styles.place, (createOrder.isPending || verify.isPending) && { opacity: 0.6 }]} disabled={createOrder.isPending || verify.isPending} onPress={placeOrder}>
          <Text style={styles.placeText}>
            {createOrder.isPending ? 'Placing…' : verify.isPending ? 'Confirming…'
              : payment === 'cod' ? `Place Order · ${formatPrice(total)}` : `Pay ${formatPrice(total)}`}
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    fontFamily: fonts.bodySemibold, fontSize: 11, color: colors.muted,
    letterSpacing: 1.5, textTransform: 'uppercase',
    marginTop: spacing.xl, marginBottom: spacing.md,
  },
  addr: {
    flexDirection: 'row', gap: 12, padding: 16,
    borderWidth: 1, borderColor: colors.border, borderRadius: radii.xs,
    marginBottom: 10, alignItems: 'flex-start', backgroundColor: colors.white,
  },
  addrActive: { borderColor: colors.primary, backgroundColor: '#FBF7F1' },
  addrName: { fontFamily: fonts.bodySemibold, fontSize: 14, color: colors.textSecondary },
  addrText: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 3, lineHeight: 18 },
  addNew: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14,
    borderWidth: 1, borderColor: colors.primaryLight, borderRadius: radii.xs,
    borderStyle: 'dashed', justifyContent: 'center', marginBottom: 4,
  },
  addNewText: { fontFamily: fonts.bodySemibold, color: colors.primary, fontSize: 13 },
  form: { marginTop: 8, borderWidth: 1, borderColor: colors.border, borderRadius: radii.xs, padding: 16 },
  formHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  formTitle: { fontFamily: fonts.headingBold, fontSize: 16, color: colors.textSecondary },
  locBtn: {
    flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.primary, borderRadius: radii.xs,
    paddingVertical: 12, marginBottom: 16,
  },
  locText: { fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.primary },
  mapWrap: { height: 160, borderRadius: radii.xs, overflow: 'hidden', marginBottom: 16, backgroundColor: colors.surface },
  cancelBtn: {
    flex: 1, borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.xs, paddingVertical: 14, alignItems: 'center', marginTop: 8,
  },
  cancelText: { fontFamily: fonts.bodySemibold, color: colors.textSecondary },
  saveBtn: {
    backgroundColor: colors.textSecondary, borderRadius: radii.xs,
    paddingVertical: 14, alignItems: 'center', marginTop: 8,
  },
  saveText: { fontFamily: fonts.bodySemibold, color: colors.white },
  pay: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16,
    borderWidth: 1, borderColor: colors.border, borderRadius: radii.xs, marginBottom: 10,
  },
  payActive: { borderColor: colors.primary, backgroundColor: '#FBF7F1' },
  payLabel: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textSecondary, flex: 1 },
  soon: { fontFamily: fonts.body, fontSize: 11, color: colors.muted },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  sumLabel: { fontFamily: fonts.body, fontSize: 14, color: colors.mutedDark },
  sumVal: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textSecondary },
  totalLabel: { fontFamily: fonts.bodySemibold, fontSize: 16, color: colors.textSecondary },
  totalVal: { fontFamily: fonts.headingBold, fontSize: 20, color: colors.textSecondary },
  note: { fontFamily: fonts.body, fontSize: 11, color: colors.muted, marginTop: 8, lineHeight: 17 },
  bottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: spacing.lg, paddingVertical: 14,
    backgroundColor: colors.white,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  place: {
    backgroundColor: colors.textSecondary,
    borderRadius: radii.xs, paddingVertical: 16, alignItems: 'center',
  },
  placeText: { fontFamily: fonts.bodySemibold, fontSize: 15, color: colors.white, letterSpacing: 0.3 },
});
