import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { useAuthStore } from '../stores/authStore';
import { authApi } from '../api/auth.api';
import toast from 'react-hot-toast';

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
      try { await reverseGeocode(latitude, longitude); } catch {}
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
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await authApi.manageAddresses({ action: 'remove', addressId: id });
      await fetchMe();
      toast.success('Address removed');
    } catch {}
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

  return (
    <div className="min-h-screen bg-brand-bg" style={{ paddingTop: 'var(--topbar-height)' }}>
      <div className="container-custom py-10 max-w-4xl">
        <Link to="/account" className="lg:hidden inline-flex items-center gap-1 font-body text-sm text-brand-muted hover:text-primary mb-4">
          <ChevronLeft size={16} /> My Account
        </Link>
        <div className="bg-white border border-brand-border p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="font-heading text-xl font-semibold">Addresses</h1>
            <button onClick={() => setAdding(!adding)} className="btn-outline text-sm">{adding ? 'Cancel' : '+ Add New'}</button>
          </div>
          {adding && (
            <form onSubmit={handleAdd} className="grid grid-cols-2 gap-4 mb-6 p-4 bg-brand-surface">
              <button type="button" onClick={useCurrentLocation} className="col-span-2 flex items-center justify-center gap-2 border border-primary text-primary text-sm py-2.5 rounded-none hover:bg-primary hover:text-white transition-colors">
                📍 Use my current location{coords ? ' ✓' : ''}
              </button>
              {coords && mapsLoaded && (
                <div className="col-span-2 overflow-hidden border border-brand-border" style={{ height: 200 }}>
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
              {ADDR_FIELDS.map(({ key, label, placeholder, col }) => (
                <div key={key} className={col === 2 ? 'col-span-2' : ''}>
                  <label className="input-label">{label}</label>
                  <input
                    value={key === 'isDefault' ? '' : String(addrForm[key])}
                    onChange={(e) => setAddrForm({ ...addrForm, [key]: e.target.value })}
                    placeholder={placeholder}
                    className="input-field"
                    required={key !== 'line2'}
                  />
                </div>
              ))}
              <div className="col-span-2 flex items-center gap-2">
                <input type="checkbox" id="isDefault" checked={addrForm.isDefault} onChange={(e) => setAddrForm({ ...addrForm, isDefault: e.target.checked })} className="accent-primary" />
                <label htmlFor="isDefault" className="font-body text-sm">Set as default</label>
              </div>
              <div className="col-span-2">
                <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving...' : 'Save Address'}</button>
              </div>
            </form>
          )}
          {!user?.addresses.length && !adding ? (
            <p className="font-body text-brand-muted text-sm text-center py-8">No saved addresses</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {user?.addresses.map((addr) => (
                <div key={addr._id} className={`p-4 border-2 ${addr.isDefault ? 'border-primary bg-primary/5' : 'border-brand-border'}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-body text-xs bg-brand-text text-white px-2 py-0.5">{addr.label}</span>
                      {addr.isDefault && <span className="font-body text-xs text-primary">Default</span>}
                    </div>
                    <button onClick={() => addr._id && handleRemove(addr._id)} className="text-brand-muted hover:text-red-500 text-xs">Remove</button>
                  </div>
                  <p className="font-body text-sm font-medium">{addr.fullName}</p>
                  <p className="font-body text-sm text-brand-muted">{addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}</p>
                  <p className="font-body text-sm text-brand-muted">{addr.city}, {addr.state} - {addr.pincode}</p>
                  <p className="font-body text-sm text-brand-muted">{addr.phone}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
