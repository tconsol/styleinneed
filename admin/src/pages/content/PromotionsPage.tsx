import { useEffect, useMemo, useState } from 'react';
import { Plus, Edit, Trash2, BellRing, Search, X, ImageIcon, Upload, Mail, Send } from 'lucide-react';
import Modal from '../../components/common/Modal';
import Select from '../../components/common/Select';
import Badge from '../../components/common/Badge';
import { promotionApi, notificationApi, productApi, cmsApi, newsletterApi, ctaLinkApi } from '../../api';
import { useCategories } from '../../hooks/useCatalog';
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
  bannerImage?: string;
  badgeText?: string;
  applicableProducts?: string[];
  applicableCategories?: string[];
}

interface MiniProduct { _id: string; name: string; images?: string[]; category?: { _id: string; name: string } }
interface CtaLink { _id: string; label: string; url: string; group: string }

const PROMO_TYPES = ['flash_sale', 'category_discount', 'product_discount', 'buy_x_get_y', 'festival'];
const empty = {
  name: '', type: 'flash_sale', discountType: 'percentage', discountValue: 0,
  startDate: '', expiryDate: '', isActive: true, description: '', bannerImage: '', badgeText: '',
  applicableProducts: [] as string[], applicableCategories: [] as string[],
};

export default function PromotionsPage() {
  const [items, setItems] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [pushing, setPushing] = useState<string | null>(null);
  const [allProducts, setAllProducts] = useState<MiniProduct[]>([]);
  const [prodSearch, setProdSearch] = useState('');
  const [bannerUploading, setBannerUploading] = useState(false);
  const [subscribers, setSubscribers] = useState<string[]>([]);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [emailSearch, setEmailSearch] = useState('');
  const [sendingMail, setSendingMail] = useState(false);
  const [ctaLinks, setCtaLinks] = useState<CtaLink[]>([]);
  const [mailCtaLink, setMailCtaLink] = useState('/sale');
  const [mailCtaText, setMailCtaText] = useState('Shop the Sale');
  const categories = useCategories().data || [];
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
  // Load the catalogue once for the product picker.
  useEffect(() => {
    productApi.getAll({ limit: 1000 }).then(({ data }) => setAllProducts(data.data || [])).catch(() => {});
  }, []);
  // Load newsletter subscribers for the "send promotion mail" picker — only
  // currently-subscribed addresses (unsubscribed ones can't be mailed anyway).
  useEffect(() => {
    newsletterApi.getSubscribers({ status: 'subscribed', limit: 5000 })
      .then(({ data }) => setSubscribers((data.data || []).map((s: { email: string }) => s.email)))
      .catch(() => {});
  }, []);
  // CTA destinations for the promotion email (same presets as announcements).
  useEffect(() => {
    ctaLinkApi.getAll().then(({ data }) => setCtaLinks(data.data || [])).catch(() => {});
  }, []);

  const openEdit = (p: Promotion) => {
    setEditing(p);
    setForm({
      name: p.name, type: p.type, discountType: p.discountType, discountValue: p.discountValue,
      startDate: p.startDate?.slice(0, 10) || '', expiryDate: p.expiryDate?.slice(0, 10) || '',
      isActive: p.isActive, description: p.description || '', bannerImage: p.bannerImage || '', badgeText: p.badgeText || '',
      applicableProducts: (p.applicableProducts || []).map((x) => (typeof x === 'string' ? x : (x as { _id: string })._id)),
      applicableCategories: (p.applicableCategories || []).map((x) => (typeof x === 'string' ? x : (x as { _id: string })._id)),
    });
    setProdSearch('');
    setSelectedEmails([]); setEmailSearch(''); setMailCtaLink('/sale'); setMailCtaText('Shop the Sale');
    setModal(true);
  };

  const openNew = () => { setEditing(null); setForm(empty); setProdSearch(''); setSelectedEmails([]); setEmailSearch(''); setMailCtaLink('/sale'); setMailCtaText('Shop the Sale'); setModal(true); };

  const filteredEmails = useMemo(
    () => subscribers.filter((e) => e.toLowerCase().includes(emailSearch.toLowerCase())),
    [subscribers, emailSearch],
  );
  const allSelected = subscribers.length > 0 && selectedEmails.length === subscribers.length;
  const toggleEmail = (email: string) =>
    setSelectedEmails((s) => (s.includes(email) ? s.filter((x) => x !== email) : [...s, email]));
  const toggleAllEmails = () => setSelectedEmails(allSelected ? [] : [...subscribers]);

  const sendPromoMail = async () => {
    if (!form.name.trim()) { toast.error('Enter a promotion name first'); return; }
    if (selectedEmails.length === 0) { toast.error('Select at least one subscriber'); return; }
    setSendingMail(true);
    try {
      const discountLabel = form.discountValue
        ? form.discountType === 'percentage' ? `${form.discountValue}% OFF` : `₹${form.discountValue} OFF`
        : undefined;
      const { data } = await newsletterApi.broadcastPromotion({
        all: allSelected,
        emails: allSelected ? undefined : selectedEmails,
        promotion: {
          title: form.name,
          description: form.description,
          discountLabel,
          badgeText: form.badgeText,
          bannerImage: form.bannerImage,
          ctaUrl: mailCtaLink,
          ctaText: mailCtaText || 'Shop Now',
        },
      });
      toast.success(data.message || `Sent to ${data.data?.sent} subscriber(s)`);
    } catch { /* interceptor toasts */ } finally { setSendingMail(false); }
  };

  const toggleProduct = (id: string) => setForm((f) => ({ ...f, applicableProducts: f.applicableProducts.includes(id) ? f.applicableProducts.filter((x) => x !== id) : [...f.applicableProducts, id] }));
  const toggleCategory = (id: string) => setForm((f) => ({ ...f, applicableCategories: f.applicableCategories.includes(id) ? f.applicableCategories.filter((x) => x !== id) : [...f.applicableCategories, id] }));

  const filteredProducts = useMemo(
    () => allProducts.filter((p) => p.name.toLowerCase().includes(prodSearch.toLowerCase())).slice(0, 60),
    [allProducts, prodSearch],
  );

  const uploadBanner = async (files: FileList | null) => {
    if (!files?.[0]) return;
    setBannerUploading(true);
    try {
      const fd = new FormData(); fd.append('image', files[0]);
      const { data } = await cmsApi.uploadImage(fd);
      setForm((f) => ({ ...f, bannerImage: data.data.url }));
    } catch { /* interceptor */ } finally { setBannerUploading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Normalise the window: start at 00:00, expire at end-of-day so a same-day
      // sale is actually live (a bare date is midnight, which expires instantly).
      const payload = {
        ...form,
        startDate: form.startDate ? new Date(`${form.startDate}T00:00:00`).toISOString() : form.startDate,
        expiryDate: form.expiryDate ? new Date(`${form.expiryDate}T23:59:59`).toISOString() : form.expiryDate,
      };
      if (editing) { await promotionApi.update(editing._id, payload); toast.success('Updated'); }
      else { await promotionApi.create(payload); toast.success('Created'); }
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
        <button onClick={openNew} className="btn-primary">
          <Plus size={14} /> New Promotion
        </button>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b border-brand-border/40">
            {['Name', 'Type', 'Discount', 'Applies to', 'Period', 'Status', 'Actions'].map((h) => <th key={h} className="th">{h}</th>)}
          </tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={7} className="text-center py-12 text-sm text-brand-muted">Loading...</td></tr>
              : items.length === 0 ? <tr><td colSpan={7} className="text-center py-14">
                  <p className="font-body text-sm text-brand-muted">No promotions yet.</p>
                </td></tr>
              : items.map((p) => {
                const scope = (p.applicableProducts?.length || p.applicableCategories?.length)
                  ? `${p.applicableProducts?.length || 0} product(s), ${p.applicableCategories?.length || 0} cat.`
                  : 'All products';
                return (
                <tr key={p._id} className="border-b border-brand-border/30 hover:bg-brand-bg/50 transition-colors">
                  <td className="td font-medium">{p.name}</td>
                  <td className="td"><Badge value={p.type} /></td>
                  <td className="td font-medium text-primary">{p.discountValue}{p.discountType === 'percentage' ? '%' : '₹'} off</td>
                  <td className="td text-xs text-brand-muted">{scope}</td>
                  <td className="td text-xs text-brand-muted">{formatDate(p.startDate)} → {formatDate(p.expiryDate)}</td>
                  <td className="td"><Badge value={p.isActive && new Date(p.expiryDate) > new Date() ? 'active' : 'inactive'} /></td>
                  <td className="td">
                    <div className="flex gap-1">
                      <button onClick={() => sendPush(p)} disabled={pushing === p._id} title="Send push to all devices"
                        className="btn-ghost py-1 px-2 disabled:opacity-40">
                        {pushing === p._id ? <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin inline-block" /> : <BellRing size={13} />}
                      </button>
                      <button onClick={() => openEdit(p)} className="btn-ghost py-1 px-2"><Edit size={13} /></button>
                      <button onClick={async () => { if (!(await confirm({ title: 'Delete promotion?', message: 'This permanently removes the promotion.', danger: true, confirmText: 'Delete' }))) return; await promotionApi.delete(p._id); toast.success('Deleted'); fetch(); }} className="btn-ghost py-1 px-2 !text-red-500 hover:!bg-red-50"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>

    <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Promotion' : 'New Promotion'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div><label className="input-label">Name *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" placeholder="Diwali Dhamaka" required /></div>
          <div><label className="input-label">Badge Text</label><input value={form.badgeText} onChange={(e) => setForm({ ...form, badgeText: e.target.value })} className="input-field" placeholder="e.g. FLASH SALE (shown on cards)" /></div>
        </div>
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
        <div className="grid grid-cols-3 gap-4">
          <div><label className="input-label">Value ({form.discountType === 'percentage' ? '%' : '₹'})</label>
            <input type="number" value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: Number(e.target.value) })} className="input-field" min="0" /></div>
          <div><label className="input-label">Start Date *</label><input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="input-field" required /></div>
          <div><label className="input-label">Expiry Date *</label><input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} className="input-field" required /></div>
        </div>

        <div><label className="input-label">Description</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="input-field resize-none" /></div>

        {/* Banner */}
        <div>
          <label className="input-label">Sale Banner (shown on the sale page)</label>
          <div className="flex items-center gap-3">
            <div className="w-28 h-16 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0" style={{ background: 'var(--c-bg)', border: '1px solid var(--c-border)' }}>
              {form.bannerImage ? <img src={form.bannerImage} alt="" className="w-full h-full object-cover" /> : <ImageIcon size={20} className="text-brand-border" />}
            </div>
            <label className="btn-outline text-[12px] cursor-pointer">
              <input type="file" accept="image/*" className="hidden" onChange={(e) => { uploadBanner(e.target.files); e.currentTarget.value = ''; }} />
              {bannerUploading ? 'Uploading…' : <><Upload size={13} /> {form.bannerImage ? 'Replace' : 'Upload'}</>}
            </label>
            {form.bannerImage && <button type="button" onClick={() => setForm({ ...form, bannerImage: '' })} className="text-brand-muted hover:text-red-500"><X size={16} /></button>}
          </div>
        </div>

        {/* Categories */}
        <div>
          <label className="input-label">Categories <span className="font-normal text-brand-muted">(optional)</span></label>
          <div className="flex flex-wrap gap-1.5">
            {categories.map((c) => {
              const on = form.applicableCategories.includes(c._id);
              return (
                <button type="button" key={c._id} onClick={() => toggleCategory(c._id)}
                  className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${on ? 'bg-primary text-white border-primary' : 'border-brand-border text-brand-muted hover:border-primary'}`}>
                  {c.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Products */}
        <div>
          <label className="input-label flex items-center justify-between">
            <span>Products <span className="font-normal text-brand-muted">(optional)</span></span>
            {form.applicableProducts.length > 0 && <span className="text-[10px] text-primary font-semibold">{form.applicableProducts.length} selected</span>}
          </label>
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--c-border)' }}>
            <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: '1px solid var(--c-border)', background: 'var(--c-bg)' }}>
              <Search size={13} className="text-brand-muted" />
              <input value={prodSearch} onChange={(e) => setProdSearch(e.target.value)} placeholder="Search products…" className="flex-1 bg-transparent outline-none text-[12px] text-brand-text" />
            </div>
            <div className="max-h-52 overflow-y-auto">
              {filteredProducts.length === 0 ? (
                <p className="px-3 py-4 text-center text-[11px] text-brand-muted">No products found</p>
              ) : filteredProducts.map((p) => {
                const on = form.applicableProducts.includes(p._id);
                return (
                  <button type="button" key={p._id} onClick={() => toggleProduct(p._id)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-brand-bg"
                    style={{ background: on ? 'var(--c-primary-soft)' : 'transparent' }}>
                    <input type="checkbox" readOnly checked={on} className="w-4 h-4 accent-primary pointer-events-none" />
                    <img src={p.images?.[0] || '/placeholder.jpg'} alt="" className="w-7 h-8 object-cover rounded bg-brand-bg flex-shrink-0" />
                    <span className="flex-1 text-[12px] text-brand-text truncate">{p.name}</span>
                    <span className="text-[10px] text-brand-muted">{p.category?.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <p className="text-[10px] text-brand-muted mt-1">Leave both categories and products empty to apply the sale to <b>all products</b>.</p>
        </div>

        {/* Newsletter broadcast */}
        <div className="rounded-xl p-3" style={{ border: '1px solid var(--c-border)', background: 'var(--c-bg)' }}>
          <label className="input-label flex items-center justify-between">
            <span className="flex items-center gap-1.5"><Mail size={14} /> Email this promotion to newsletter subscribers</span>
            {selectedEmails.length > 0 && <span className="text-[10px] text-primary font-semibold">{selectedEmails.length} selected</span>}
          </label>
          {subscribers.length === 0 ? (
            <p className="text-[11px] text-brand-muted">No newsletter subscribers yet.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div>
                  <label className="input-label !text-[10px]">CTA Destination</label>
                  <Select
                    value={ctaLinks.some((l) => l.url === mailCtaLink) ? mailCtaLink : ''}
                    onChange={(url) => {
                      const l = ctaLinks.find((x) => x.url === url);
                      setMailCtaLink(url);
                      if (l && (!mailCtaText || mailCtaText === 'Shop the Sale')) setMailCtaText(l.label);
                    }}
                    placeholder="Choose a link…"
                    options={ctaLinks.map((l) => ({ value: l.url, label: `${l.group} · ${l.label}` }))}
                  />
                </div>
                <div>
                  <label className="input-label !text-[10px]">Button Text</label>
                  <input value={mailCtaText} onChange={(e) => setMailCtaText(e.target.value)} className="input-field" placeholder="Shop the Sale" />
                </div>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <button type="button" onClick={toggleAllEmails}
                  className="text-[11px] px-2.5 py-1 rounded-full border transition-colors border-brand-border text-brand-muted hover:border-primary">
                  {allSelected ? 'Clear all' : `Select all (${subscribers.length})`}
                </button>
                <div className="flex-1 flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ border: '1px solid var(--c-border)' }}>
                  <Search size={12} className="text-brand-muted" />
                  <input value={emailSearch} onChange={(e) => setEmailSearch(e.target.value)} placeholder="Search emails…" className="flex-1 bg-transparent outline-none text-[11px] text-brand-text" />
                </div>
              </div>
              <div className="max-h-40 overflow-y-auto rounded-lg" style={{ border: '1px solid var(--c-border)' }}>
                {filteredEmails.length === 0 ? (
                  <p className="px-3 py-3 text-center text-[11px] text-brand-muted">No matches</p>
                ) : filteredEmails.map((email) => {
                  const on = selectedEmails.includes(email);
                  return (
                    <button type="button" key={email} onClick={() => toggleEmail(email)}
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 text-left transition-colors hover:bg-brand-bg"
                      style={{ background: on ? 'var(--c-primary-soft)' : 'transparent' }}>
                      <input type="checkbox" readOnly checked={on} className="w-3.5 h-3.5 accent-primary pointer-events-none" />
                      <span className="flex-1 text-[12px] text-brand-text truncate">{email}</span>
                    </button>
                  );
                })}
              </div>
              <button type="button" onClick={sendPromoMail} disabled={sendingMail || selectedEmails.length === 0}
                className="btn-outline w-full justify-center mt-2 text-[12px] disabled:opacity-50">
                {sendingMail ? 'Sending…' : <><Send size={13} /> Send Promotion Email{selectedEmails.length ? ` (${selectedEmails.length})` : ''}</>}
              </button>
              <p className="text-[10px] text-brand-muted mt-1">Uses the name, description, discount, badge & banner above, plus the CTA destination selected here. Colours match the site's active theme.</p>
            </>
          )}
        </div>

        <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="accent-primary w-4 h-4" /><span className="font-body text-sm">Active</span></label>
        <button type="submit" disabled={saving} className="btn-primary w-full justify-center">{saving ? 'Saving...' : editing ? 'Update Promotion' : 'Create Promotion'}</button>
      </form>
    </Modal>
    </>
  );
}
