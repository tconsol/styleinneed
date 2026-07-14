import { useEffect, useState } from 'react';
import { shippingApi } from '../../api';
import { PageSpinner } from '../../components/common/Spinner';
import toast from 'react-hot-toast';

interface Rate { _id: string; country: 'US' | 'CA'; stateCode: string; stateName: string; charge: number; isActive: boolean }

const COUNTRY_LABEL: Record<string, string> = { US: 'United States', CA: 'Canada' };

export default function ShippingRatesPage() {
  const [rates, setRates] = useState<Rate[]>([]);
  const [edited, setEdited] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    shippingApi.getAll().then(({ data }) => setRates(data.data || [])).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const setCharge = (id: string, val: string) => setEdited((p) => ({ ...p, [id]: val }));

  const saveAll = async () => {
    const changes = Object.entries(edited).filter(([id, val]) => {
      const rate = rates.find((r) => r._id === id);
      return rate && val !== '' && Number(val) !== rate.charge;
    });
    if (changes.length === 0) { toast('No changes to save'); return; }
    setSaving(true);
    try {
      await Promise.all(changes.map(([id, val]) => shippingApi.update(id, { charge: Number(val) })));
      toast.success(`${changes.length} rate(s) saved`);
      setEdited({});
      load();
    } catch { /* interceptor */ } finally { setSaving(false); }
  };

  const bulkSet = async (country: 'US' | 'CA') => {
    const val = window.prompt(`Set the SAME shipping charge (USD) for ALL ${COUNTRY_LABEL[country]} states:`);
    if (val == null || val === '') return;
    if (isNaN(Number(val))) { toast.error('Enter a number'); return; }
    try {
      await shippingApi.bulkSet(country, Number(val));
      toast.success(`${COUNTRY_LABEL[country]} rates set to $${Number(val).toFixed(2)}`);
      setEdited({});
      load();
    } catch { /* interceptor */ }
  };

  const toggleActive = async (r: Rate) => {
    try {
      await shippingApi.update(r._id, { isActive: !r.isActive });
      setRates((prev) => prev.map((x) => (x._id === r._id ? { ...x, isActive: !x.isActive } : x)));
    } catch { /* interceptor */ }
  };

  if (loading) return <PageSpinner />;

  const groups: Array<'US' | 'CA'> = ['US', 'CA'];

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-heading text-xl font-bold">Shipping Rates — USA & Canada</h1>
          <p className="text-sm text-brand-muted mt-1">Per-state delivery charge in USD. There is no free shipping for US/Canada. India shipping is set in Settings.</p>
        </div>
        <button onClick={saveAll} disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save Changes'}</button>
      </div>

      {groups.map((country) => {
        const list = rates.filter((r) => r.country === country);
        return (
          <div key={country} className="card">
            <div className="flex items-center justify-between border-b border-brand-border pb-3 mb-3">
              <h2 className="font-heading text-base font-semibold">{COUNTRY_LABEL[country]} <span className="text-brand-muted font-normal text-sm">({list.length} states)</span></h2>
              <button onClick={() => bulkSet(country)} className="btn-outline text-xs py-1.5 px-3">Set all to…</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2">
              {list.map((r) => (
                <div key={r._id} className={`flex items-center gap-2 py-1.5 ${r.isActive ? '' : 'opacity-50'}`}>
                  <button onClick={() => toggleActive(r)} title={r.isActive ? 'Active — click to disable' : 'Disabled — click to enable'}
                    className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${r.isActive ? 'bg-green-500' : 'bg-brand-border'}`} />
                  <span className="text-[13px] flex-1 truncate" title={r.stateName}>{r.stateName}</span>
                  <span className="text-brand-muted text-sm">$</span>
                  <input
                    type="number" min="0" step="0.01"
                    value={edited[r._id] ?? String(r.charge)}
                    onChange={(e) => setCharge(r._id, e.target.value)}
                    className="input-field w-20 py-1 text-sm text-right"
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
