import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Ticket } from 'lucide-react';
import Modal from '../../components/common/Modal';
import Select from '../../components/common/Select';
import { couponApi } from '../../api';
import type { Coupon } from '../../types';
import { formatDate, formatPrice } from '../../utils/format';
import toast from 'react-hot-toast';

const COUPON_TYPES = ['percentage', 'flat', 'free_shipping', 'first_order', 'festival'];
const empty = { code: '', type: 'percentage', value: 0, minOrderValue: 0, maxDiscount: '', usageLimit: '', perUserLimit: 1, startDate: '', expiryDate: '', isActive: true, description: '' };

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  percentage:   { bg: '#EEF2FF', text: '#4F46E5' },
  flat:         { bg: '#DCFCE7', text: '#166534' },
  free_shipping:{ bg: '#E0F2FE', text: '#0369A1' },
  first_order:  { bg: '#FEF9C3', text: '#854D0E' },
  festival:     { bg: '#FFEDD5', text: '#9A3412' },
};

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    couponApi.getAll().then(({ data }) => setCoupons(data.data || [])).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const openEdit = (c: Coupon) => {
    setEditing(c);
    setForm({ code: c.code, type: c.type, value: c.value, minOrderValue: c.minOrderValue, maxDiscount: c.maxDiscount ? String(c.maxDiscount) : '', usageLimit: c.usageLimit ? String(c.usageLimit) : '', perUserLimit: c.perUserLimit ?? 1, startDate: c.startDate?.slice(0, 10) || '', expiryDate: c.expiryDate?.slice(0, 10) || '', isActive: c.isActive, description: c.description || '' } as typeof empty);
    setModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const payload = { ...form, maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : undefined, usageLimit: form.usageLimit ? Number(form.usageLimit) : undefined };
    try {
      if (editing) { await couponApi.update(editing._id, payload); toast.success('Coupon updated'); }
      else { await couponApi.create(payload); toast.success('Coupon created'); }
      setModal(false); load();
    } catch {} finally { setSaving(false); }
  };

  const discountLabel = (c: Coupon) => {
    if (c.type === 'percentage') return `${c.value}% off`;
    if (c.type === 'flat') return `${formatPrice(c.value)} off`;
    return 'Free Shipping';
  };

  return (
    <>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[15px] font-bold text-brand-text">Coupons</h1>
            <p className="text-[10px] text-brand-muted mt-0.5">{coupons.length} coupons total</p>
          </div>
          <button onClick={() => { setEditing(null); setForm(empty); setModal(true); }} className="btn-primary"><Plus size={14} /> Add Coupon</button>
        </div>

        <div className="bg-white rounded-2xl overflow-x-auto" style={{ border: '1px solid var(--c-border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <table className="w-full min-w-[860px]">
            <thead>
              <tr style={{ background: 'var(--c-th-bg)', borderBottom: '2px solid var(--c-border)' }}>
                <th className="th text-left pl-5" style={{ width: '44px' }}>#</th>
                <th className="th text-left">Code</th>
                <th className="th text-left">Type</th>
                <th className="th text-left">Discount</th>
                <th className="th text-left">Min Order</th>
                <th className="th text-left">Usage</th>
                <th className="th text-left">Expires</th>
                <th className="th text-center">Status</th>
                <th className="th text-center" style={{ width: '100px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-12"><span className="w-6 h-6 border-2 border-brand-border border-t-primary rounded-full animate-spin inline-block" /></td></tr>
              ) : coupons.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-16"><Ticket size={32} className="mx-auto mb-2 text-brand-border" /><p className="text-[11px] text-brand-muted">No coupons yet</p></td></tr>
              ) : coupons.map((c, idx) => {
                const isValid = c.isActive && new Date(c.expiryDate) > new Date();
                const tc = TYPE_COLORS[c.type] || { bg: '#F1F5F9', text: '#64748B' };
                return (
                  <tr key={c._id} className="group transition-colors" style={{ borderBottom: '1px solid var(--c-border)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--c-tr-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--c-surface)')}>
                    <td className="pl-5 py-3 text-[10px] font-bold text-brand-muted/60">{idx + 1}</td>
                    <td className="px-3 py-3">
                      <span className="font-mono text-[12px] font-black" style={{ color: '#4F46E5' }}>{c.code}</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="px-2 py-0.5 rounded-md text-[9px] font-semibold capitalize" style={{ background: tc.bg, color: tc.text }}>{c.type.replace(/_/g, ' ')}</span>
                    </td>
                    <td className="px-3 py-3 text-[11px] font-semibold text-brand-text">{discountLabel(c)}</td>
                    <td className="px-3 py-3 text-[11px] text-brand-muted">{formatPrice(c.minOrderValue)}</td>
                    <td className="px-3 py-3 text-[11px] text-brand-muted">{c.usedCount}{c.usageLimit ? `/${c.usageLimit}` : ''}</td>
                    <td className="px-3 py-3 text-[10px] text-brand-muted">{formatDate(c.expiryDate)}</td>
                    <td className="px-3 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-semibold ${isValid ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isValid ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                        {isValid ? 'Active' : 'Expired'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openEdit(c)} className="w-8 h-8 rounded-lg flex items-center justify-center transition-all" style={{ color: '#64748B' }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#EEF2FF'; e.currentTarget.style.color = '#4F46E5'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748B'; }}>
                          <Edit2 size={13} />
                        </button>
                        <button onClick={() => couponApi.delete(c._id).then(() => { toast.success('Deleted'); load(); })} className="w-8 h-8 rounded-lg flex items-center justify-center transition-all" style={{ color: '#64748B' }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#FEE2E2'; e.currentTarget.style.color = '#EF4444'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748B'; }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Coupon' : 'New Coupon'} size="md">
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className="input-label">Code *</label><input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className="input-field uppercase font-mono font-bold tracking-widest" required /></div>
          <div><label className="input-label">Type *</label>
            <Select value={form.type} onChange={(v) => setForm({ ...form, type: v })}
              options={COUPON_TYPES.map((t) => ({ value: t, label: t.replace(/_/g, ' ') }))} />
          </div>
          <div><label className="input-label">Value ({form.type === 'percentage' ? '%' : '₹'})</label><input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} className="input-field" min="0" /></div>
          <div><label className="input-label">Min Order (₹)</label><input type="number" value={form.minOrderValue} onChange={(e) => setForm({ ...form, minOrderValue: Number(e.target.value) })} className="input-field" min="0" /></div>
          <div><label className="input-label">Max Discount (₹)</label><input type="number" value={form.maxDiscount} onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })} className="input-field" placeholder="No limit" /></div>
          <div><label className="input-label">Usage Limit</label><input type="number" value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value })} className="input-field" placeholder="Unlimited" /></div>
          <div><label className="input-label">Per User Limit</label><input type="number" value={form.perUserLimit} onChange={(e) => setForm({ ...form, perUserLimit: Number(e.target.value) })} className="input-field" min="1" /></div>
          <div><label className="input-label">Start Date *</label><input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="input-field" required /></div>
          <div><label className="input-label">Expiry Date *</label><input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} className="input-field" required /></div>
          <div className="col-span-2"><label className="input-label">Description</label><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field" /></div>
          <div className="col-span-2 flex items-center gap-2">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="accent-primary w-4 h-4" />
            <span className="text-[12px] font-medium">Active</span>
          </div>
          <div className="col-span-2 flex gap-2">
            <button type="button" onClick={() => setModal(false)} className="btn-outline flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">{saving ? 'Saving...' : editing ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
