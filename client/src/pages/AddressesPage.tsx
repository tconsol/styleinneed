import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Plus, Trash2, LocateFixed, Home, Briefcase, X } from 'lucide-react';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { useAuthStore } from '../stores/authStore';
import { authApi } from '../api/auth.api';
import toast from 'react-hot-toast';
import AccountHeader from '../components/account/AccountHeader';

const LABEL_ICONS: Record<string, typeof Home> = { Home, Work: Briefcase, Other: MapPin };

export default function AddressesPage() {
  const { user, fetchMe } = useAuthStore();
  const [adding, setAdding] = useState(false);
  const [addrForm, setAddrForm] = useState({ label: 'Home', fullName: '', phone: '', email: '', line1: '', line2: '', city: '', state: '', pincode: '', country: 'India', isDefault: false });
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const { isLoaded: mapsLoaded } = useJsApiLoader({ googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_KEY as string });

  const reverseGeocode = async (lat: number, lng: number) => {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${import.meta.env.VITE_GOOGLE_MAPS_KEY as string}`
    );
    const data = await res.json();
    if (data.status !== 'OK' || !data.results?.[0]) return;
    const c: Array<{ long_name: string; types: string[] }> = data.results[0].address_components;
    const get = (type: string) => c.find((x) => x.types.includes(type))?.long_name || '';
    const street = [get('street_number'), get('route')].filter(Boolean).join(' ');
    const sub = get('sublocality_level_1') || get('sublocality');
    setAddrForm((f) => ({
      ...f,
      line1: f.line1 || [street, sub].filter(Boolean).join(', '),
      city: get('locality') || get('administrative_area_level_2') || f.city,
      state: get('administrative_area_level_1') || f.state,
      pincode: get('postal_code') || f.pincode,
    }));
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) { toast.error('Geolocation not supported'); return; }
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      setCoords({ lat: latitude, lng: longitude });
      try { await reverseGeocode(latitude, longitude); } catch { /* geocode best-effort */ }
      toast.success('Location captured');
    }, () => toast.error('Could not get your location'));
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.manageAddresses({ action: 'add', address: { ...addrForm, ...(coords || {}) } });
      await fetchMe();
      setAdding(false);
      setCoords(null);
      toast.success('Address added');
    } catch { /* error toast shown by api interceptor */ } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await authApi.manageAddresses({ action: 'remove', addressId: id });
      await fetchMe();
      toast.success('Address removed');
    } catch { /* error toast shown by api interceptor */ }
  };

  const ADDR_FIELDS: { key: keyof typeof addrForm; label: string; placeholder: string; col?: number }[] = [
    { key: 'label', label: 'Label', placeholder: 'Home / Work' },
    { key: 'fullName', label: 'Full Name', placeholder: 'Name' },
    { key: 'phone', label: 'Phone', placeholder: '10-digit' },
    { key: 'email', label: 'Email (order updates)', placeholder: 'name@email.com', col: 2 },
    { key: 'line1', label: 'Address Line 1', placeholder: 'Street / Area', col: 2 },
    { key: 'line2', label: 'Line 2 (optional)', placeholder: 'Landmark', col: 2 },
    { key: 'city', label: 'City', placeholder: 'City' },
    { key: 'state', label: 'State', placeholder: 'State' },
    { key: 'pincode', label: 'Pincode', placeholder: '6-digit' },
  ];

  const inputCls =
    'w-full px-4 py-3 bg-brand-surface border border-brand-border rounded-xl text-brand-text text-sm outline-none focus:border-primary focus:bg-white transition-all duration-200 placeholder:text-brand-muted/60';

  return (
    <div className="min-h-screen bg-brand-bg" style={{ paddingTop: 'var(--topbar-height)' }}>
      <div className="container-custom py-8 md:py-12 max-w-4xl">
        <AccountHeader
          eyebrow="Account"
          title="Addresses"
          subtitle="Save delivery details for a faster, smoother checkout."
          right={
            <button
              onClick={() => setAdding(!adding)}
              className={`hidden sm:inline-flex items-center gap-2 font-body text-[10px] font-semibold uppercase tracking-[0.2em] px-5 py-3 rounded-full transition-colors ${
                adding ? 'border border-brand-border text-brand-muted hover:text-brand-text' : 'bg-brand-text text-white hover:bg-brand-text/90'
              }`}
            >
              {adding ? <><X size={13} /> Cancel</> : <><Plus size={13} /> Add New Address</>}
            </button>
          }
        />

        {/* Mobile add toggle */}
        <button
          onClick={() => setAdding(!adding)}
          className={`sm:hidden w-full mb-4 inline-flex items-center justify-center gap-2 font-body text-[11px] font-semibold uppercase tracking-[0.2em] px-5 py-3.5 rounded-xl transition-colors ${
            adding ? 'border border-brand-border text-brand-muted' : 'bg-brand-text text-white'
          }`}
        >
          {adding ? <><X size={14} /> Cancel</> : <><Plus size={14} /> Add New Address</>}
        </button>

        {adding && (
          <form onSubmit={handleAdd} className="bg-white border border-brand-border rounded-2xl p-6 md:p-8 mb-8 shadow-[0_8px_30px_rgba(28,28,28,0.05)]">
            <div className="flex items-center gap-3 mb-6">
              <span className="w-1 h-5 bg-primary rounded-full" />
              <h3 className="font-heading text-lg font-semibold text-brand-text">Add New Address</h3>
            </div>

            <button
              type="button"
              onClick={useCurrentLocation}
              className="w-full flex items-center justify-center gap-2 border border-primary/50 text-primary font-body text-sm font-medium py-3.5 rounded-xl bg-primary/5 hover:bg-primary hover:text-white transition-colors duration-200 mb-5"
            >
              <LocateFixed size={16} />
              Use my current location{coords ? ' ✓' : ''}
            </button>

            {coords && mapsLoaded && (
              <div className="mb-5 overflow-hidden rounded-xl border border-brand-border" style={{ height: 200 }}>
                <GoogleMap
                  mapContainerStyle={{ width: '100%', height: '100%' }}
                  center={{ lat: coords.lat, lng: coords.lng }}
                  zoom={16}
                  options={{ disableDefaultUI: true, zoomControl: true }}
                >
                  <Marker
                    position={{ lat: coords.lat, lng: coords.lng }}
                    draggable
                    onDragEnd={async (e) => {
                      if (!e.latLng) return;
                      const lat = e.latLng.lat(); const lng = e.latLng.lng();
                      setCoords({ lat, lng });
                      await reverseGeocode(lat, lng);
                    }}
                  />
                </GoogleMap>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {ADDR_FIELDS.map(({ key, label, placeholder, col }) => (
                <div key={key} className={col === 2 ? 'sm:col-span-2' : ''}>
                  <label className="input-label">{label}</label>
                  <input
                    value={key === 'isDefault' ? '' : String(addrForm[key])}
                    onChange={(e) => setAddrForm({ ...addrForm, [key]: e.target.value })}
                    placeholder={placeholder}
                    className={inputCls}
                    required={key !== 'line2'}
                  />
                </div>
              ))}
              <label className="sm:col-span-2 flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={addrForm.isDefault}
                  onChange={(e) => setAddrForm({ ...addrForm, isDefault: e.target.checked })}
                  className="w-4 h-4 accent-primary"
                />
                <span className="font-body text-sm text-brand-text">Set as default delivery address</span>
              </label>
              <div className="sm:col-span-2 flex justify-end">
                <button type="submit" disabled={loading} className="btn-primary rounded-xl">
                  {loading ? 'Saving...' : 'Save Address'}
                </button>
              </div>
            </div>
          </form>
        )}

        {!user?.addresses.length && !adding ? (
          <div className="bg-white border border-dashed border-brand-border rounded-2xl py-16 px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-5">
              <MapPin size={24} className="text-primary" />
            </div>
            <p className="font-heading text-lg font-semibold text-brand-text mb-1.5">No saved addresses</p>
            <p className="font-body text-sm text-brand-muted mb-7">Add your first address for a faster checkout.</p>
            <Link to="/products" className="btn-outline inline-flex">Start Shopping</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {user?.addresses.map((addr) => {
              const LabelIcon = LABEL_ICONS[addr.label] || MapPin;
              return (
                <div
                  key={addr._id}
                  className={`relative rounded-2xl border p-6 transition-all duration-300 ${
                    addr.isDefault
                      ? 'border-primary/60 bg-gradient-to-br from-primary/10 via-white to-white shadow-[0_8px_30px_rgba(200,169,126,0.15)]'
                      : 'border-brand-border bg-white hover:border-primary/40 hover:shadow-[0_8px_30px_rgba(28,28,28,0.05)]'
                  }`}
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${addr.isDefault ? 'bg-primary text-white' : 'bg-brand-surface text-brand-muted'}`}>
                      <LabelIcon size={18} />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap pt-1">
                      <span className={`font-body text-[10px] font-bold uppercase tracking-[0.15em] px-2.5 py-1 rounded-full ${addr.isDefault ? 'bg-primary text-white' : 'bg-brand-surface text-brand-muted'}`}>
                        {addr.label}
                      </span>
                      {addr.isDefault && (
                        <span className="font-body text-[10px] font-semibold uppercase tracking-[0.15em] text-primary border border-primary/40 px-2.5 py-1 rounded-full">
                          Default
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => addr._id && handleRemove(addr._id)}
                      className="ml-auto w-8 h-8 rounded-full border border-transparent flex items-center justify-center text-brand-muted hover:text-red-500 hover:bg-red-50 hover:border-red-100 transition-all flex-shrink-0"
                      title="Remove address"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <p className="font-body text-sm font-semibold text-brand-text">{addr.fullName}</p>
                  <p className="font-body text-sm text-brand-muted leading-relaxed mt-0.5">
                    {addr.line1}{addr.line2 ? `, ${addr.line2}` : ''},<br />
                    {addr.city}, {addr.state} — {addr.pincode}
                  </p>
                  <p className="font-body text-xs text-brand-muted mt-2">{addr.phone}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
