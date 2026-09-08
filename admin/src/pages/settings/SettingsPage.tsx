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
  usaFreeShipThreshold: string;
  lowStockThreshold: string;
  lowStockAlerts: boolean;
  abandonedCartEmails: boolean;
  abandonedCartDelayHours: string;
  abandonedCartMaxReminders: string;
  loyaltyEnabled: boolean;
  loyaltyEarnPercent: string;
  loyaltyMinOrder: string;
  walletMaxRedeemPercent: string;
  referralEnabled: boolean;
  referrerReward: string;
  refereeReward: string;
}

export default function SettingsPage() {
  const [form, setForm] = useState<Form>({ usdExchangeRate: '', indiaFreeShipThreshold: '', indiaFlatShipping: '', usaFreeShipThreshold: '', lowStockThreshold: '5', lowStockAlerts: true, abandonedCartEmails: true, abandonedCartDelayHours: '6', abandonedCartMaxReminders: '2', loyaltyEnabled: true, loyaltyEarnPercent: '2', loyaltyMinOrder: '0', walletMaxRedeemPercent: '100', referralEnabled: true, referrerReward: '200', refereeReward: '100' });
  const [rateUpdatedAt, setRateUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const apply = (s: { usdExchangeRate?: number; indiaFreeShipThreshold?: number; indiaFlatShipping?: number; usaFreeShipThreshold?: number; lowStockThreshold?: number; lowStockAlerts?: boolean; abandonedCartEmails?: boolean; abandonedCartDelayHours?: number; abandonedCartMaxReminders?: number; loyaltyEnabled?: boolean; loyaltyEarnPercent?: number; loyaltyMinOrder?: number; walletMaxRedeemPercent?: number; referralEnabled?: boolean; referrerReward?: number; refereeReward?: number; rateUpdatedAt?: string }) => {
    setForm({
      usdExchangeRate: String(s.usdExchangeRate ?? 83),
      indiaFreeShipThreshold: String(s.indiaFreeShipThreshold ?? 999),
      indiaFlatShipping: String(s.indiaFlatShipping ?? 99),
      usaFreeShipThreshold: String(s.usaFreeShipThreshold ?? 0),
      lowStockThreshold: String(s.lowStockThreshold ?? 5),
      lowStockAlerts: s.lowStockAlerts ?? true,
      abandonedCartEmails: s.abandonedCartEmails ?? true,
      abandonedCartDelayHours: String(s.abandonedCartDelayHours ?? 6),
      abandonedCartMaxReminders: String(s.abandonedCartMaxReminders ?? 2),
      loyaltyEnabled: s.loyaltyEnabled ?? true,
      loyaltyEarnPercent: String(s.loyaltyEarnPercent ?? 2),
      loyaltyMinOrder: String(s.loyaltyMinOrder ?? 0),
      walletMaxRedeemPercent: String(s.walletMaxRedeemPercent ?? 100),
      referralEnabled: s.referralEnabled ?? true,
      referrerReward: String(s.referrerReward ?? 200),
      refereeReward: String(s.refereeReward ?? 100),
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
        usaFreeShipThreshold: Number(form.usaFreeShipThreshold),
        lowStockThreshold: Number(form.lowStockThreshold),
        lowStockAlerts: form.lowStockAlerts,
        abandonedCartEmails: form.abandonedCartEmails,
        abandonedCartDelayHours: Number(form.abandonedCartDelayHours),
        abandonedCartMaxReminders: Number(form.abandonedCartMaxReminders),
        loyaltyEnabled: form.loyaltyEnabled,
        loyaltyEarnPercent: Number(form.loyaltyEarnPercent),
        loyaltyMinOrder: Number(form.loyaltyMinOrder),
        walletMaxRedeemPercent: Number(form.walletMaxRedeemPercent),
        referralEnabled: form.referralEnabled,
        referrerReward: Number(form.referrerReward),
        refereeReward: Number(form.refereeReward),
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
        style={{ background: 'var(--c-primary)', boxShadow: '0 4px 16px rgba(79,70,229,0.35)' }}
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
        </div>

        <div>
          <h2 className="font-heading text-base font-semibold border-b border-brand-border pb-3 mb-4">USA / Canada Shipping</h2>
          <div className="max-w-md">
            <label className="input-label">Free-delivery minimum ($)</label>
            <input type="number" min="0" step="0.01" value={form.usaFreeShipThreshold}
              onChange={(e) => setForm({ ...form, usaFreeShipThreshold: e.target.value })}
              className="input-field" placeholder="0 = never free" />
            <p className="text-[11px] text-brand-muted mt-2">
              Orders at or above this USD subtotal ship free to the USA &amp; Canada. Set <b>0</b> to always charge the
              per-state rate from Shipping Rates.
            </p>
          </div>
        </div>

        <div>
          <h2 className="font-heading text-base font-semibold border-b border-brand-border pb-3 mb-4">Inventory Alerts</h2>
          <label className="flex items-center gap-2.5 cursor-pointer select-none mb-3">
            <input type="checkbox" checked={form.lowStockAlerts}
              onChange={(e) => setForm({ ...form, lowStockAlerts: e.target.checked })}
              className="accent-primary w-4 h-4" />
            <span className="text-[12px] font-medium">Email &amp; notify admins when stock runs low</span>
          </label>
          <div className="max-w-md">
            <label className="input-label">Low-stock threshold (units)</label>
            <input type="number" min="0" value={form.lowStockThreshold}
              onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })}
              className="input-field" disabled={!form.lowStockAlerts} />
            <p className="text-[11px] text-brand-muted mt-2">
              Alerts fire once, when a sale takes a variant down to this level (or to zero) — not on every
              subsequent order, so restocking resets it.
            </p>
          </div>
        </div>

        <div>
          <h2 className="font-heading text-base font-semibold border-b border-brand-border pb-3 mb-4">Abandoned Cart Recovery</h2>
          <label className="flex items-center gap-2.5 cursor-pointer select-none mb-3">
            <input type="checkbox" checked={form.abandonedCartEmails}
              onChange={(e) => setForm({ ...form, abandonedCartEmails: e.target.checked })}
              className="accent-primary w-4 h-4" />
            <span className="text-[12px] font-medium">Email shoppers who leave items in their cart</span>
          </label>
          <div className="grid grid-cols-2 gap-4 max-w-md">
            <div>
              <label className="input-label">Wait before first email (hours)</label>
              <input type="number" min="1" value={form.abandonedCartDelayHours}
                onChange={(e) => setForm({ ...form, abandonedCartDelayHours: e.target.value })}
                className="input-field" disabled={!form.abandonedCartEmails} />
            </div>
            <div>
              <label className="input-label">Max reminders per cart</label>
              <input type="number" min="0" max="3" value={form.abandonedCartMaxReminders}
                onChange={(e) => setForm({ ...form, abandonedCartMaxReminders: e.target.value })}
                className="input-field" disabled={!form.abandonedCartEmails} />
            </div>
          </div>
          <p className="text-[11px] text-brand-muted mt-2">
            Reminders are spaced at least 24 hours apart, stop once the shopper orders, and every email carries an
            unsubscribe link.
          </p>
        </div>

        <div>
          <h2 className="font-heading text-base font-semibold border-b border-brand-border pb-3 mb-4">Store Credit &amp; Loyalty</h2>
          <label className="flex items-center gap-2.5 cursor-pointer select-none mb-3">
            <input type="checkbox" checked={form.loyaltyEnabled}
              onChange={(e) => setForm({ ...form, loyaltyEnabled: e.target.checked })}
              className="accent-primary w-4 h-4" />
            <span className="text-[12px] font-medium">Give customers cashback as store credit</span>
          </label>
          <div className="grid grid-cols-3 gap-4 max-w-xl">
            <div>
              <label className="input-label">Cashback (% of order)</label>
              <input type="number" min="0" max="100" step="0.5" value={form.loyaltyEarnPercent}
                onChange={(e) => setForm({ ...form, loyaltyEarnPercent: e.target.value })}
                className="input-field" disabled={!form.loyaltyEnabled} />
            </div>
            <div>
              <label className="input-label">Min order (₹)</label>
              <input type="number" min="0" value={form.loyaltyMinOrder}
                onChange={(e) => setForm({ ...form, loyaltyMinOrder: e.target.value })}
                className="input-field" disabled={!form.loyaltyEnabled} />
            </div>
            <div>
              <label className="input-label">Max % of an order payable by credit</label>
              <input type="number" min="0" max="100" value={form.walletMaxRedeemPercent}
                onChange={(e) => setForm({ ...form, walletMaxRedeemPercent: e.target.value })}
                className="input-field" />
            </div>
          </div>
          <p className="text-[11px] text-brand-muted mt-2">
            Cashback is credited once a payment settles, never on COD orders that are still pending. Gift cards,
            referral rewards and refunds all land in the same balance.
          </p>
        </div>

        <div>
          <h2 className="font-heading text-base font-semibold border-b border-brand-border pb-3 mb-4">Referrals</h2>
          <label className="flex items-center gap-2.5 cursor-pointer select-none mb-3">
            <input type="checkbox" checked={form.referralEnabled}
              onChange={(e) => setForm({ ...form, referralEnabled: e.target.checked })}
              className="accent-primary w-4 h-4" />
            <span className="text-[12px] font-medium">Let customers invite friends with a referral code</span>
          </label>
          <div className="grid grid-cols-2 gap-4 max-w-md">
            <div>
              <label className="input-label">Reward to the inviter (₹)</label>
              <input type="number" min="0" value={form.referrerReward}
                onChange={(e) => setForm({ ...form, referrerReward: e.target.value })}
                className="input-field" disabled={!form.referralEnabled} />
            </div>
            <div>
              <label className="input-label">Reward to the invitee (₹)</label>
              <input type="number" min="0" value={form.refereeReward}
                onChange={(e) => setForm({ ...form, refereeReward: e.target.value })}
                className="input-field" disabled={!form.referralEnabled} />
            </div>
          </div>
          <p className="text-[11px] text-brand-muted mt-2">
            Both rewards pay out once — when the invited customer&rsquo;s first order is paid — so throwaway signups
            earn nothing.
          </p>
        </div>

        <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save Settings'}</button>
      </form>
    </div>
  );
}
