import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Truck, RefreshCw } from 'lucide-react';
import { settingsApi } from '../../api';
import { PageSpinner } from '../../components/common/Spinner';
import toast from 'react-hot-toast';

interface Form {
  usdExchangeRate: string;
  indiaFreeShipThreshold: string;
  indiaFlatShipping: string;
}

export default function SettingsPage() {
  const [form, setForm] = useState<Form>({ usdExchangeRate: '', indiaFreeShipThreshold: '', indiaFlatShipping: '' });
  const [rateUpdatedAt, setRateUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const apply = (s: { usdExchangeRate?: number; indiaFreeShipThreshold?: number; indiaFlatShipping?: number; rateUpdatedAt?: string }) => {
    setForm({
      usdExchangeRate: String(s.usdExchangeRate ?? 83),
      indiaFreeShipThreshold: String(s.indiaFreeShipThreshold ?? 999),
      indiaFlatShipping: String(s.indiaFlatShipping ?? 99),
    });
    setRateUpdatedAt(s.rateUpdatedAt ?? null);
  };

  useEffect(() => {
    settingsApi.get().then(({ data }) => apply(data.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const refreshRate = async () => {
    setRefreshing(true);
    try {
      const { data } = await settingsApi.refreshRate();
      apply(data.data);
      toast.success(`Live rate: $1 = ₹${data.data.usdExchangeRate}`);
    } catch { toast.error('Could not fetch live rate'); } finally { setRefreshing(false); }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await settingsApi.update({
        usdExchangeRate: Number(form.usdExchangeRate),
        indiaFreeShipThreshold: Number(form.indiaFreeShipThreshold),
        indiaFlatShipping: Number(form.indiaFlatShipping),
      });
      toast.success('Settings saved');
    } catch { /* toast handled by interceptor */ } finally { setSaving(false); }
  };

  if (loading) return <PageSpinner />;

  const usd = Number(form.usdExchangeRate) || 83;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-xl font-bold">Store Settings</h1>
        <p className="text-sm text-brand-muted mt-1">Currency conversion and India shipping.</p>
      </div>

      {/* Prominent CTA to the per-state US/Canada shipping page */}
      <Link
        to="/shipping-rates"
        className="flex items-center justify-between gap-3 rounded-xl px-5 py-4 text-white transition-transform hover:-translate-y-0.5"
        style={{ background: 'linear-gradient(135deg, #4F46E5, #818CF8)', boxShadow: '0 4px 16px rgba(79,70,229,0.35)' }}
      >
        <span className="flex items-center gap-3">
          <Truck size={20} />
          <span>
            <span className="block font-semibold text-sm">USA & Canada Shipping Rates</span>
            <span className="block text-[12px] text-white/80">Set per-state delivery charges →</span>
          </span>
        </span>
        <span className="text-lg">→</span>
      </Link>

      <form onSubmit={save} className="card space-y-5">
        <div>
          <h2 className="font-heading text-base font-semibold border-b border-brand-border pb-3 mb-4">Currency</h2>
          <label className="input-label">USD Exchange Rate (₹ per $1)</label>
          <div className="flex items-center gap-2 max-w-md">
            <input type="number" min="1" step="0.01" value={form.usdExchangeRate}
              onChange={(e) => setForm({ ...form, usdExchangeRate: e.target.value })}
              className="input-field flex-1" required />
            <button type="button" onClick={refreshRate} disabled={refreshing}
              className="btn-outline text-[12px] gap-1.5 whitespace-nowrap disabled:opacity-60">
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} /> {refreshing ? 'Fetching…' : 'Refresh live rate'}
            </button>
          </div>
          <p className="text-[11px] text-brand-muted mt-1.5">
            Auto-synced from a live FX feed every 6 hours{rateUpdatedAt ? ` · last updated ${new Date(rateUpdatedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}` : ''}.
            USA prices auto-convert: a ₹{(1000).toLocaleString('en-IN')} item shows as <b>${(1000 / usd).toFixed(2)}</b>. Explicit per-product USD prices override this.
          </p>
        </div>

        <div>
          <h2 className="font-heading text-base font-semibold border-b border-brand-border pb-3 mb-4">India Shipping</h2>
          <div className="grid grid-cols-2 gap-4 max-w-md">
            <div>
              <label className="input-label">Free-shipping threshold (₹)</label>
              <input type="number" min="0" value={form.indiaFreeShipThreshold}
                onChange={(e) => setForm({ ...form, indiaFreeShipThreshold: e.target.value })}
                className="input-field" required />
            </div>
            <div>
              <label className="input-label">Flat charge below threshold (₹)</label>
              <input type="number" min="0" value={form.indiaFlatShipping}
                onChange={(e) => setForm({ ...form, indiaFlatShipping: e.target.value })}
                className="input-field" required />
            </div>
          </div>
          <p className="text-[11px] text-brand-muted mt-2">USA/Canada orders never get free shipping — set per-state charges in Shipping Rates.</p>
        </div>

        <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save Settings'}</button>
      </form>
    </div>
  );
}
