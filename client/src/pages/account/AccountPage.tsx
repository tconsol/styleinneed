import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { User, Package, Heart, RotateCcw, Headphones, LogOut, MapPin, CheckCircle, XCircle } from 'lucide-react';
import type { Order, Product as ProductType } from '../../types';
import { useAuthStore } from '../../stores/authStore';
import { useWishlistStore } from '../../stores/wishlistStore';
import { formatDate, formatPrice } from '../../utils/format';
import { authApi } from '../../api/auth.api';
import { orderApi } from '../../api/order.api';
import { supportApi } from '../../api/misc.api';
import toast from 'react-hot-toast';

const TABS = [
  { id: 'profile', label: 'My Profile', icon: User },
  { id: 'orders', label: 'My Orders', icon: Package },
  { id: 'wishlist', label: 'Wishlist', icon: Heart },
  { id: 'addresses', label: 'Addresses', icon: MapPin },
  { id: 'returns', label: 'Returns', icon: RotateCcw },
  { id: 'support', label: 'Support', icon: Headphones },
];

export default function AccountPage() {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'profile';
  const navigate = useNavigate();
  const { user, logout, fetchMe } = useAuthStore();
  const [profileForm, setProfileForm] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => { fetchMe(); }, []);
  useEffect(() => {
    if (user) setProfileForm({ name: user.name, phone: user.phone || '' });
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await authApi.updateProfile(profileForm);
      await fetchMe();
      toast.success('Profile updated');
    } catch {
    } finally {
      setSavingProfile(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-brand-bg" style={{ paddingTop: "var(--topbar-height)" }}>
      <div className="container-custom py-10">
        <h1 className="heading-sm text-brand-text mb-8">My Account</h1>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <aside className="lg:col-span-1">
            <div className="bg-brand-surface border border-brand-border p-5 mb-4">
              <div className="flex items-center gap-3 mb-5 pb-5 border-b border-brand-border">
                <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-heading font-bold text-xl">
                  {user?.name[0]}
                </div>
                <div>
                  <p className="font-body font-semibold text-brand-text">{user?.name}</p>
                  <p className="font-body text-xs text-brand-muted">{user?.email}</p>
                </div>
              </div>
              <nav className="space-y-1">
                {TABS.map(({ id, label, icon: Icon }) => (
                  <Link
                    key={id}
                    to={`/account?tab=${id}`}
                    className={`flex items-center gap-3 px-3 py-2.5 font-body text-sm transition-colors ${
                      tab === id ? 'bg-primary text-white' : 'text-brand-text hover:bg-brand-border/30 hover:text-primary'
                    }`}
                  >
                    <Icon size={16} />
                    {label}
                  </Link>
                ))}
              </nav>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 font-body text-sm text-red-500 hover:bg-red-50 border border-brand-border transition-colors"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </aside>

          <div className="lg:col-span-3">
            <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              {tab === 'profile' && (
                <div className="bg-white border border-brand-border p-6">
                  <h2 className="font-heading text-xl font-semibold mb-6">My Profile</h2>
                  <form onSubmit={handleSaveProfile} className="space-y-5 max-w-xl">
                    <div>
                      <label className="input-label">Full Name</label>
                      <input value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} className="input-field" required />
                    </div>
                    <div>
                      <label className="input-label">Email Address</label>
                      <input value={user?.email} disabled className="input-field opacity-60 cursor-not-allowed" />
                    </div>
                    <div>
                      <label className="input-label">Phone Number</label>
                      <input value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} className="input-field" placeholder="10-digit mobile" />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="input-label m-0">Email Verified:</label>
                      <span className={`font-body text-sm font-medium ${user?.isEmailVerified ? 'text-green-600' : 'text-orange-500'}`}>
                        {user?.isEmailVerified
                          ? <span className={'flex items-center gap-1'}><CheckCircle size={14} /> Verified</span>
                          : <span className={'flex items-center gap-1'}><XCircle size={14} /> Not Verified</span>
                        }
                      </span>
                    </div>
                    <div>
                      <label className="input-label">Member Since</label>
                      <p className="font-body text-sm text-brand-muted">{user?.createdAt ? formatDate(user.createdAt) : '-'}</p>
                    </div>
                    <button type="submit" disabled={savingProfile} className="btn-primary">
                      {savingProfile ? 'Saving...' : 'Save Changes'}
                    </button>
                  </form>
                </div>
              )}
              {tab === 'orders' && <OrdersTab />}
              {tab === 'wishlist' && <WishlistTab />}
              {tab === 'addresses' && <AddressesTab />}
              {tab === 'returns' && <ReturnsTab />}
              {tab === 'support' && <SupportTab />}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  packed: 'bg-indigo-100 text-indigo-700',
  shipped: 'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  returned: 'bg-orange-100 text-orange-700',
};

function OrdersTab() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    orderApi.getMyOrders().then(({ data }) => setOrders(data.data || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-12"><span className="w-8 h-8 border-2 border-brand-border border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="bg-white border border-brand-border p-6">
      <h2 className="font-heading text-xl font-semibold mb-6">My Orders</h2>
      {orders.length === 0 ? (
        <div className="text-center py-12">
          <Package size={40} className="text-brand-border mx-auto mb-3" />
          <p className="font-body text-brand-muted">No orders yet</p>
          <Link to="/products" className="btn-primary mt-4 inline-flex">Start Shopping</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order._id} className="border border-brand-border p-4 hover:border-primary/40 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-body text-sm font-semibold">#{order.orderId}</p>
                  <p className="font-body text-xs text-brand-muted">{formatDate(order.createdAt)}</p>
                </div>
                <span className={`font-body text-xs px-2 py-1 capitalize font-medium ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-600'}`}>
                  {order.status}
                </span>
              </div>
              <div className="flex gap-2 mb-3 overflow-x-auto">
                {order.items.slice(0, 4).map((item, i) => (
                  <img key={i} src={item.product.images?.[0]} alt="" className="w-14 h-16 object-cover bg-brand-surface flex-shrink-0" />
                ))}
                {order.items.length > 4 && (
                  <div className="w-14 h-16 bg-brand-surface flex items-center justify-center text-xs text-brand-muted flex-shrink-0">+{order.items.length - 4}</div>
                )}
              </div>
              <div className="flex items-center justify-between">
                <p className="font-heading text-sm font-semibold">{formatPrice(order.total)}</p>
                <Link to={`/orders/${order._id}`} className="font-body text-sm text-primary hover:underline">Track Order &rarr;</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WishlistTab() {
  const { products, fetchWishlist, toggle } = useWishlistStore();
  useEffect(() => { fetchWishlist(); }, []);

  return (
    <div className="bg-white border border-brand-border p-6">
      <h2 className="font-heading text-xl font-semibold mb-6">My Wishlist ({products.length})</h2>
      {products.length === 0 ? (
        <div className="text-center py-12">
          <Heart size={40} className="text-brand-border mx-auto mb-3" />
          <p className="font-body text-brand-muted">No saved items</p>
          <Link to="/products" className="btn-primary mt-4 inline-flex">Browse Products</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {products.map((p: ProductType) => (
            <div key={p._id} className="group relative">
              <Link to={`/products/${p.slug}`}>
                <div className="aspect-[3/4] overflow-hidden bg-brand-surface mb-2">
                  <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                </div>
                <p className="font-body text-sm text-brand-text line-clamp-1">{p.name}</p>
                <p className="font-heading text-sm font-semibold text-primary mt-0.5">{formatPrice(p.salePrice)}</p>
              </Link>
              <button onClick={() => toggle(p._id)} className="absolute top-2 right-2 w-7 h-7 bg-white/90 flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all">
                <Heart size={14} fill="currentColor" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AddressesTab() {
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
    <div className="bg-white border border-brand-border p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-heading text-xl font-semibold">Addresses</h2>
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
  );
}

function ReturnsTab() {
  return (
    <div className="bg-white border border-brand-border p-6">
      <h2 className="font-heading text-xl font-semibold mb-6">Returns & Refunds</h2>
      <p className="font-body text-sm text-brand-muted">Visit your orders to initiate a return for delivered items.</p>
      <Link to="/account?tab=orders" className="btn-outline mt-4 inline-flex">View Orders</Link>
    </div>
  );
}

function SupportTab() {
  const [form, setForm] = useState({ subject: '', category: 'General', description: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await supportApi.createTicket(form);
      toast.success("Ticket submitted! We'll respond within 24 hours.");
      setForm({ subject: '', category: 'General', description: '' });
    } catch {
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-brand-border p-6">
      <h2 className="font-heading text-xl font-semibold mb-6">Contact Support</h2>
      <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
        <div>
          <label className="input-label">Category</label>
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input-field">
            {['General', 'Order Issue', 'Return/Refund', 'Product Query', 'Payment Issue', 'Delivery Issue'].map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="input-label">Subject</label>
          <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="input-field" placeholder="Brief description" required />
        </div>
        <div>
          <label className="input-label">Message</label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={5} className="input-field resize-none" placeholder="Describe your issue..." required />
        </div>
        <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Submitting...' : 'Submit Ticket'}</button>
      </form>
    </div>
  );
}
