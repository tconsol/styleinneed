import { useEffect, useState, useCallback, useRef } from 'react';
import { Gift, Plus, Copy, Check, Ban, Search, X, Users, UserPlus, Mail, MailCheck } from 'lucide-react';
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
  emailSentAt?: string;
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

interface Recipient {
  _id: string;
  name: string;
  email: string;
}

const EMPTY = { amount: '500', quantity: '1', issuedTo: '', note: '', expiresAt: '' };

/**
 * Search the registered customers and pick who each card goes to.
 * One card is issued per selected email, so `quantity` is hidden while any
 * are chosen — the two would otherwise multiply into cards nobody asked for.
 */
function RecipientPicker({
  selected, onChange,
}: {
  selected: Recipient[];
  onChange: (next: Recipient[]) => void;
}) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Recipient[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // Debounced so typing doesn't fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      walletApi.listRecipients({ search: search || undefined, limit: 20 })
        .then(({ data }) => {
          setResults(data.data || []);
          setTotal(data.pagination?.total ?? (data.data || []).length);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const isPicked = (r: Recipient) => selected.some((s) => s._id === r._id);
  const toggle = (r: Recipient) =>
    onChange(isPicked(r) ? selected.filter((s) => s._id !== r._id) : [...selected, r]);

  return (
    <div ref={boxRef}>
      <label className="input-label flex items-center justify-between">
        <span>Send to <span className="font-normal text-brand-muted">(optional)</span></span>
        {selected.length > 0 && (
          <button type="button" onClick={() => onChange([])}
            className="text-[10px] font-semibold" style={{ color: 'var(--c-danger)' }}>
            Clear all
          </button>
        )}
      </label>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected.map((r) => (
            <span key={r._id}
              className="inline-flex items-center gap-1 pl-2 pr-1 py-1 rounded-lg text-[10px] font-medium"
              style={{ background: 'var(--c-primary-soft)', color: 'var(--c-primary-dark)' }}>
              {r.email}
              <button type="button" onClick={() => toggle(r)} className="opacity-70 hover:opacity-100" title="Remove">
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search registered customers by name or email…"
          className="input-field pl-8"
        />
      </div>

      {open && (
        <div className="mt-1 rounded-xl overflow-hidden"
          style={{ border: '1.5px solid var(--c-border)', background: 'var(--c-surface)', maxHeight: '200px', overflowY: 'auto' }}>
          {loading ? (
            <p className="text-[11px] text-brand-muted text-center py-4">Searching…</p>
          ) : results.length === 0 ? (
            <p className="text-[11px] text-brand-muted text-center py-4">
              {search ? 'No customer matches that' : 'No registered customers yet'}
            </p>
          ) : (
            <>
              {results.map((r) => {
                const picked = isPicked(r);
                return (
                  <button key={r._id} type="button" onClick={() => toggle(r)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left transition-colors"
                    style={{ background: picked ? 'var(--c-primary-soft)' : 'transparent' }}
                    onMouseEnter={(e) => { if (!picked) (e.currentTarget as HTMLElement).style.background = 'var(--c-bg)'; }}
                    onMouseLeave={(e) => { if (!picked) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                    <span className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                      style={picked
                        ? { background: 'var(--c-primary)' }
                        : { border: '1.5px solid var(--c-border)' }}>
                      {picked && <Check size={10} color="#fff" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[11px] font-semibold text-brand-text truncate">{r.name}</span>
                      <span className="block text-[10px] text-brand-muted truncate">{r.email}</span>
                    </span>
                  </button>
                );
              })}
              {total > results.length && (
                <p className="text-[10px] text-brand-muted text-center py-2" style={{ borderTop: '1px solid var(--c-border)' }}>
                  Showing {results.length} of {total} — narrow the search to see more
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function GiftCardsPage() {
  const [cards, setCards] = useState<GiftCard[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('all');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [sendEmail, setSendEmail] = useState(true);
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
        // One card per picked customer; `quantity` only applies to blank cards.
        recipients: recipients.length ? recipients.map((r) => r.email) : undefined,
        sendEmail,
        issuedTo: recipients.length ? undefined : (form.issuedTo || undefined),
        note: form.note || undefined,
        expiresAt: form.expiresAt || undefined,
      });
      toast.success(data.message || 'Gift cards created');
      setModal(false); setForm(EMPTY); setRecipients([]); setPage(1); load();
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

  const resend = async (c: GiftCard) => {
    const target = (c.issuedTo || '').includes('@')
      ? c.issuedTo!
      : (window.prompt('Send this gift card to which email address?') || '').trim();
    if (!target) return;
    if (!(await confirm({
      title: `Send card to ${target}?`,
      message: 'They get the card design with its number and PIN. The PIN is not shown here — only in the email.',
      confirmText: 'Send',
    }))) return;
    try {
      const { data } = await walletApi.resendGiftCard(c._id, target);
      toast.success(data.message || 'Gift card sent');
      load();
    } catch { /* interceptor */ }
  };

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
                    {!c.redeemedBy && c.issuedTo && (
                      <span className="flex items-center gap-1 text-[9px] mt-0.5"
                        style={{ color: c.emailSentAt ? 'var(--c-success)' : 'var(--c-warning)' }}>
                        {c.emailSentAt
                          ? <><MailCheck size={9} /> Emailed {formatDate(c.emailSentAt)}</>
                          : <><Mail size={9} /> Not emailed yet</>}
                      </span>
                    )}
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
                        <button onClick={() => resend(c)} title={c.emailSentAt ? 'Send again' : 'Email this card'}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-brand-muted hover:text-primary transition-colors">
                          <Mail size={13} />
                        </button>
                      )}
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
            {recipients.length > 0 ? (
              <div>
                <label className="input-label">How many</label>
                <div className="input-field flex items-center gap-1.5" style={{ opacity: 0.75 }}>
                  <Users size={13} style={{ color: 'var(--c-primary)' }} />
                  <span className="text-[12px] font-semibold">{recipients.length}</span>
                  <span className="text-[10px] text-brand-muted">one per recipient</span>
                </div>
              </div>
            ) : (
              <div>
                <label className="input-label">How many *</label>
                <input type="number" min="1" max="100" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="input-field" required />
              </div>
            )}
          </div>

          <RecipientPicker selected={recipients} onChange={setRecipients} />

          {recipients.length === 0 && (
            <div>
              <label className="input-label flex items-center gap-1.5">
                <UserPlus size={12} className="text-brand-muted" />
                Or issue to <span className="font-normal text-brand-muted">(optional, free text)</span>
              </label>
              <input value={form.issuedTo} onChange={(e) => setForm({ ...form, issuedTo: e.target.value })} className="input-field" placeholder="Name or email — for someone not registered" />
            </div>
          )}
          <div>
            <label className="input-label">Expires on <span className="font-normal text-brand-muted">(optional)</span></label>
            <input type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="input-label">Note <span className="font-normal text-brand-muted">(optional)</span></label>
            <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} rows={2} className="input-field resize-none" placeholder="Why this was issued" />
          </div>
          {recipients.length > 0 && (
            <label className="flex items-start gap-2 p-3 rounded-xl cursor-pointer" style={{ background: 'var(--c-input)' }}>
              <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} className="mt-0.5" />
              <span>
                <span className="block text-[11px] font-semibold text-brand-text">
                  Email the card to each recipient
                </span>
                <span className="block text-[10px] text-brand-muted mt-0.5">
                  Sends a gift card design with the number and PIN on it.
                </span>
              </span>
            </label>
          )}
          <p className="text-[10px] text-brand-muted">
            Each card carries a 6-digit PIN shown <strong>only in the email</strong> — it is never displayed here again.
            A card can be redeemed once, adding its value to the customer&rsquo;s store credit.
          </p>
          <button type="submit" disabled={saving} className="btn-primary w-full justify-center">
            {saving ? 'Creating…' : `Create ${recipients.length || form.quantity || 1} card(s)`}
          </button>
        </form>
      </Modal>
    </>
  );
}
