import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, BellRing } from 'lucide-react';
import Modal from '../../components/common/Modal';
import Select from '../../components/common/Select';
import Badge from '../../components/common/Badge';
import { promotionApi, notificationApi } from '../../api';
import { useConfirm } from '../../components/common/ConfirmDialog';
import { formatDate } from '../../utils/format';
import toast from 'react-hot-toast';

interface Promotion {
  _id: string;
  name: string;
  type: string;
  discountType: string;
  discountValue: number;
  startDate: string;
  expiryDate: string;
  isActive: boolean;
  description?: string;
}

const PROMO_TYPES = ['flash_sale', 'category_discount', 'product_discount', 'buy_x_get_y', 'festival'];
const empty = { name: '', type: 'flash_sale', discountType: 'percentage', discountValue: 0, startDate: '', expiryDate: '', isActive: true, description: '' };

export default function PromotionsPage() {
  const [items, setItems] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [pushing, setPushing] = useState<string | null>(null);
  const confirm = useConfirm();

  const sendPush = async (p: Promotion) => {
    setPushing(p._id);
    try {
      const body = `${p.discountValue}${p.discountType === 'percentage' ? '%' : '₹'} off — ${p.description || p.name}`;
      const { data } = await notificationApi.broadcast({ title: `🎉 ${p.name}`, body, type: 'promotion' });
      toast.success(`Sent to ${data.data.sent} devices`);
    } catch { toast.error('Push failed'); } finally { setPushing(null); }
  };

  const fetch = async () => {
    setLoading(true);
    promotionApi.getAll().then(({ data }) => setItems(data.data || [])).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { fetch(); }, []);

  const openEdit = (p: Promotion) => {
    setEditing(p);
    setForm({ name: p.name, type: p.type, discountType: p.discountType, discountValue: p.discountValue, startDate: p.startDate?.slice(0, 10) || '', expiryDate: p.expiryDate?.slice(0, 10) || '', isActive: p.isActive, description: p.description || '' });
    setModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) { await promotionApi.update(editing._id, form); toast.success('Updated'); }
      else { await promotionApi.create(form); toast.success('Created'); }
      setModal(false); fetch();
    } catch {} finally { setSaving(false); }
  };

  return (
    <>
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-body text-lg font-semibold">Promotions</h1>
          <p className="font-body text-xs text-brand-muted mt-0.5">Flash sales, discounts, seasonal campaigns</p>
        </div>
        <button onClick={() => { setEditing(null); setForm(empty); setModal(true); }} className="btn-primary">
          <Plus size={14} /> New Promotion
        </button>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b border-brand-border/40">
            {['Name', 'Type', 'Discount', 'Period', 'Status', 'Actions'].map((h) => <th key={h} className="th">{h}</th>)}
          </tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={6} className="text-center py-12 text-sm text-brand-muted">Loading...</td></tr>
              : items.length === 0 ? <tr><td colSpan={6} className="text-center py-14">
                  <p className="font-body text-sm text-brand-muted">No promotions yet.</p>
                </td></tr>
              : items.map((p) => (
                <tr key={p._id} className="border-b border-brand-border/30 hover:bg-brand-bg/50 transition-colors">
                  <td className="td font-medium">{p.name}</td>
                  <td className="td"><Badge value={p.type} /></td>
                  <td className="td font-medium text-primary">{p.discountValue}{p.discountType === 'percentage' ? '%' : '₹'} off</td>
                  <td className="td text-xs text-brand-muted">{formatDate(p.startDate)} → {formatDate(p.expiryDate)}</td>
                  <td className="td"><Badge value={p.isActive && new Date(p.expiryDate) > new Date() ? 'active' : 'inactive'} /></td>
                  <td className="td">
                    <div className="flex gap-1">
                      <button onClick={() => sendPush(p)} disabled={pushing === p._id} title="Send push to all devices"
                        className="btn-ghost py-1 px-2 disabled:opacity-40">
                        {pushing === p._id ? <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin inline-block" /> : <BellRing size={13} />}
                      </button>
                      <button onClick={() => openEdit(p)} className="btn-ghost py-1 px-2"><Edit size={13} /></button>
                      <button onClick={async () => { if (!(await confirm({ title: 'Delete promotion?', message: 'This permanently removes the promotion.' }))) return; await promotionApi.delete(p._id); toast.success('Deleted'); fetch(); }} className="btn-ghost py-1 px-2 !text-red-500 hover:!bg-red-50"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Promotion' : 'New Promotion'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="input-label">Name *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" required /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="input-label">Type</label>
              <Select value={form.type} onChange={(v) => setForm({ ...form, type: v })}
                options={PROMO_TYPES.map((t) => ({ value: t, label: t.replace(/_/g, ' ') }))} />
            </div>
            <div><label className="input-label">Discount Type</label>
              <Select value={form.discountType} onChange={(v) => setForm({ ...form, discountType: v })}
                options={[{ value: 'percentage', label: 'Percentage (%)' }, { value: 'flat', label: 'Flat Amount (Rs.)' }]} />
            </div>
          </div>
          <div><label className="input-label">Value ({form.discountType === 'percentage' ? '%' : '₹'})</label>
            <input type="number" value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: Number(e.target.value) })} className="input-field" min="0" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="input-label">Start Date *</label><input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="input-field" required /></div>
            <div><label className="input-label">Expiry Date *</label><input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} className="input-field" required /></div>
          </div>
          <div><label className="input-label">Description</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="input-field resize-none" /></div>
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="accent-primary" /><span className="font-body text-sm">Active</span></label>
          <button type="submit" disabled={saving} className="btn-primary w-full justify-center">{saving ? 'Saving...' : editing ? 'Update' : 'Create'}</button>
        </form>
      </Modal>
    </div>
    </>
  );
}
