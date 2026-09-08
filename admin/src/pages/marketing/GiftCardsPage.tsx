import { useEffect, useState, useCallback } from 'react';
import { Gift, Plus, Copy, Check, Ban } from 'lucide-react';
import Modal from '../../components/common/Modal';
import Select from '../../components/common/Select';
import { useConfirm } from '../../components/common/ConfirmDialog';
import { walletApi } from '../../api';
import { formatPrice, formatDate } from '../../utils/format';
import toast from 'react-hot-toast';

interface GiftCard {
  _id: string;
  code: string;
  amount: number;
  isRedeemed: boolean;
  isActive: boolean;
  issuedTo?: string;
  note?: string;
  expiresAt?: string;
  redeemedAt?: string;
  redeemedBy?: { name: string; email: string };
  createdAt: string;
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'available', label: 'Available' },
  { value: 'redeemed', label: 'Redeemed' },
];

const EMPTY = { amount: '500', quantity: '1', issuedTo: '', note: '', expiresAt: '' };

export default function GiftCardsPage() {
  const [cards, setCards] = useState<GiftCard[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('all');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const confirm = useConfirm();

  const load = useCallback(() => {
    setLoading(true);
    walletApi.listGiftCards({ page, limit: 20, status })
      .then(({ data }) => {
        setCards(data.data || []);
        if (data.pagination) setPagination(data.pagination);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, status]);

  useEffect(load, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await walletApi.createGiftCards({
        amount: Number(form.amount),
        quantity: Number(form.quantity),
        issuedTo: form.issuedTo || undefined,
        note: form.note || undefined,
        expiresAt: form.expiresAt || undefined,
      });
      toast.success(data.message || 'Gift cards created');
      setModal(false); setForm(EMPTY); setPage(1); load();
    } catch { /* interceptor */ } finally { setSaving(false); }
  };

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      setTimeout(() => setCopied(null), 2000);
    } catch { toast.error('Could not copy'); }
  };

  const deactivate = async (card: GiftCard) => {
    if (!(await confirm({
      title: 'Deactivate gift card?',
      message: `${card.code} will stop working immediately. This cannot be undone.`,
      confirmText: 'Deactivate', danger: true,
    }))) return;
    try {
      await walletApi.deactivateGiftCard(card._id);
      toast.success('Gift card deactivated');
      load();
    } catch { /* interceptor */ }
  };

  const outstanding = cards.filter((c) => !c.isRedeemed && c.isActive).reduce((s, c) => s + c.amount, 0);

  return (
    <>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[15px] font-bold text-brand-text">Gift Cards</h1>
            <p className="text-[10px] text-brand-muted mt-0.5">
              {pagination.total} issued · {formatPrice(outstanding)} outstanding on this page
            </p>
          </div>
          <button onClick={() => setModal(true)} className="btn-primary"><Plus size={15} /> Issue Gift Cards</button>
        </div>

        <div className="w-44">
          <Select value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={STATUS_OPTIONS} />
        </div>

        <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid var(--c-border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <table className="w-full">
            <thead>
              <tr style={{ background: 'var(--c-th-bg)', borderBottom: '2px solid var(--c-border)' }}>
                <th className="th text-left pl-5">Code</th>
                <th className="th text-right" style={{ width: '90px' }}>Amount</th>
                <th className="th text-left">Issued to</th>
                <th className="th text-center" style={{ width: '110px' }}>Status</th>
                <th className="th text-left" style={{ width: '110px' }}>Created</th>
                <th className="th text-center" style={{ width: '80px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12"><span className="w-6 h-6 border-2 border-brand-border border-t-primary rounded-full animate-spin inline-block" /></td></tr>
              ) : cards.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-16">
                  <Gift size={32} className="mx-auto mb-2 text-brand-border" />
                  <p className="text-[11px] text-brand-muted">No gift cards yet</p>
                </td></tr>
              ) : cards.map((c) => (
                <tr key={c._id} style={{ borderBottom: '1px solid var(--c-border)' }}>
                  <td className="pl-5 py-3">
                    <button onClick={() => copy(c.code)} className="flex items-center gap-1.5 font-mono text-[11px] font-semibold text-brand-text hover:text-primary transition-colors">
                      {c.code}
                      {copied === c.code ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} className="opacity-40" />}
                    </button>
                  </td>
                  <td className="px-3 py-3 text-right text-[11px] font-semibold">{formatPrice(c.amount)}</td>
                  <td className="px-3 py-3 text-[11px] text-brand-muted">
                    {c.redeemedBy ? `${c.redeemedBy.name} (${c.redeemedBy.email})` : c.issuedTo || '—'}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-[9px] font-semibold ${
                      c.isRedeemed ? 'bg-emerald-50 text-emerald-700'
                        : !c.isActive ? 'bg-red-50 text-red-600'
                        : 'bg-brand-bg text-brand-muted'
                    }`}>
                      {c.isRedeemed ? 'Redeemed' : !c.isActive ? 'Deactivated' : 'Available'}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-[10px] text-brand-muted">{formatDate(c.createdAt)}</td>
                  <td className="px-3 py-3">
                    <div className="flex justify-center">
                      {!c.isRedeemed && c.isActive && (
                        <button onClick={() => deactivate(c)} title="Deactivate"
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-brand-muted hover:bg-red-50 hover:text-red-500 transition-colors">
                          <Ban size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {pagination.pages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-brand-border/40" style={{ background: 'var(--c-th-bg)' }}>
              <p className="text-[10px] text-brand-muted">Page {page} of {pagination.pages}</p>
              <div className="flex items-center gap-1">
                {[...Array(Math.min(5, pagination.pages))].map((_, i) => {
                  const p = Math.max(1, Math.min(page - 2, pagination.pages - 4)) + i;
                  return (
                    <button key={p} onClick={() => setPage(p)} className="w-7 h-7 text-[10px] font-semibold rounded-lg transition-all"
                      style={p === page ? { background: 'var(--c-primary)', color: 'white' } : { background: 'var(--c-surface)', color: 'var(--c-muted)', border: '1px solid var(--c-border)' }}>
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Issue Gift Cards" size="sm">
        <form onSubmit={create} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="input-label">Amount each (₹) *</label>
              <input type="number" min="1" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="input-field" required />
            </div>
            <div>
              <label className="input-label">How many *</label>
              <input type="number" min="1" max="100" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="input-field" required />
            </div>
          </div>
          <div>
            <label className="input-label">Issued to <span className="font-normal text-brand-muted">(optional)</span></label>
            <input value={form.issuedTo} onChange={(e) => setForm({ ...form, issuedTo: e.target.value })} className="input-field" placeholder="Name or email — for your own records" />
          </div>
          <div>
            <label className="input-label">Expires on <span className="font-normal text-brand-muted">(optional)</span></label>
            <input type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="input-label">Note <span className="font-normal text-brand-muted">(optional)</span></label>
            <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} rows={2} className="input-field resize-none" placeholder="Why this was issued" />
          </div>
          <p className="text-[10px] text-brand-muted">
            Codes are generated here — copy them from the table and send them out. A redeemed card adds its value to
            the customer&rsquo;s store credit.
          </p>
          <button type="submit" disabled={saving} className="btn-primary w-full justify-center">
            {saving ? 'Creating…' : `Create ${form.quantity || 1} card(s)`}
          </button>
        </form>
      </Modal>
    </>
  );
}
