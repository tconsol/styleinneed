import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, BellRing, ImageIcon, Upload, X } from 'lucide-react';
import Modal from '../../components/common/Modal';
import Select from '../../components/common/Select';
import Badge from '../../components/common/Badge';
import StatusToggle from '../../components/common/StatusToggle';
import { announcementApi, notificationApi, ctaLinkApi, cmsApi } from '../../api';
import type { Announcement } from '../../types';
import { formatDate } from '../../utils/format';
import toast from 'react-hot-toast';

interface CtaLink { _id: string; label: string; url: string; group: string }

const empty = { title: '', content: '', type: 'top_bar', image: '', ctaText: '', ctaLink: '', startDate: '', expiryDate: '', isActive: true };
const TYPES = ['top_bar', 'popup', 'promotional_banner', 'flash_sale', 'festival'];

export default function AnnouncementsPage() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [pushing, setPushing] = useState<string | null>(null);
  const [ctaLinks, setCtaLinks] = useState<CtaLink[]>([]);
  const [bannerUploading, setBannerUploading] = useState(false);

  const uploadBanner = async (files: FileList | null) => {
    if (!files?.[0]) return;
    setBannerUploading(true);
    try {
      const fd = new FormData(); fd.append('image', files[0]);
      const { data } = await cmsApi.uploadImage(fd);
      setForm((f) => ({ ...f, image: data.data.url }));
    } catch { /* interceptor */ } finally { setBannerUploading(false); }
  };

  useEffect(() => {
    ctaLinkApi.getAll().then(({ data }) => setCtaLinks(data.data || [])).catch(() => {});
  }, []);

  const sendPush = async (a: Announcement) => {
    setPushing(a._id);
    try {
      const { data } = await notificationApi.broadcast({ title: a.title, body: a.content, type: 'announcement' });
      toast.success(`Sent to ${data.data.sent} devices`);
    } catch { toast.error('Push failed'); } finally { setPushing(null); }
  };

  const fetch = async () => {
    setLoading(true);
    announcementApi.getAll().then(({ data }) => setItems(data.data || [])).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { fetch(); }, []);

  const handleToggleStatus = async (a: Announcement) => {
    const next = !a.isActive;
    setItems((prev) => prev.map((x) => (x._id === a._id ? { ...x, isActive: next } : x)));
    try {
      await announcementApi.update(a._id, { isActive: next });
      toast.success(next ? 'Activated' : 'Deactivated');
    } catch {
      setItems((prev) => prev.map((x) => (x._id === a._id ? { ...x, isActive: !next } : x)));
      toast.error('Failed to update status');
    }
  };

  const openEdit = (a: Announcement) => {
    setEditing(a);
    setForm({ title: a.title, content: a.content, type: a.type, image: a.image || '', ctaText: a.ctaText || '', ctaLink: a.ctaLink || '', startDate: a.startDate?.slice(0, 10) || '', expiryDate: a.expiryDate?.slice(0, 10) || '', isActive: a.isActive });
    setModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Normalise the window: start at 00:00, expire at end-of-day. A bare date is
      // midnight, so a same-day expiry would be "already passed" and never show.
      const payload = {
        ...form,
        startDate: form.startDate ? new Date(`${form.startDate}T00:00:00`).toISOString() : form.startDate,
        expiryDate: form.expiryDate ? new Date(`${form.expiryDate}T23:59:59`).toISOString() : form.expiryDate,
      };
      if (editing) { await announcementApi.update(editing._id, payload); toast.success('Updated'); }
      else { await announcementApi.create(payload); toast.success('Created'); }
      setModal(false); fetch();
    } catch {} finally { setSaving(false); }
  };

  return (
    <>
      <div className="space-y-5">
      <div className="flex justify-end">
        <button onClick={() => { setEditing(null); setForm(empty); setModal(true); }} className="btn-primary"><Plus size={16} /> Add Announcement</button>
      </div>
      <div className="card p-0 overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead><tr className="border-b border-brand-border bg-brand-bg">
            {['Title', 'Type', 'Views / Clicks', 'Start', 'Expires', 'Status', 'Actions'].map((h) => <th key={h} className="th">{h}</th>)}

          </tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={7} className="text-center py-8 text-sm text-brand-muted">Loading...</td></tr>
              : items.map((a) => (
                <tr key={a._id} className="border-b border-brand-border hover:bg-brand-bg/50">
                  <td className="px-4 py-3 font-body text-[11px] font-medium">{a.title}</td>
                  <td className="px-3 py-2.5"><Badge value={a.type} /></td>
                  <td className="px-3 py-2.5 font-body text-[11px] text-brand-muted">{a.views} / {a.clicks}</td>
                  <td className="px-3 py-2.5 font-body text-[10px] text-brand-muted">{formatDate(a.startDate)}</td>
                  <td className="px-3 py-2.5 font-body text-[10px] text-brand-muted">{formatDate(a.expiryDate)}</td>
                  <td className="px-4 py-3">
                    <StatusToggle isActive={a.isActive} onToggle={() => void handleToggleStatus(a)} />
                    {a.isActive && new Date(a.expiryDate) <= new Date() && (
                      <span className="block text-[9px] text-amber-500 mt-0.5">expired</span>
                    )}
                  </td>
                  <td className="px-4 py-3"><div className="flex gap-1">
                    <button onClick={() => sendPush(a)} disabled={pushing === a._id} title="Send push to all devices"
                      className="w-7 h-7 flex items-center justify-center text-brand-muted hover:text-primary disabled:opacity-40">
                      {pushing === a._id ? <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" /> : <BellRing size={14} />}
                    </button>
                    <button onClick={() => openEdit(a)} className="w-7 h-7 flex items-center justify-center text-brand-muted hover:text-primary"><Edit size={14} /></button>
                    <button onClick={() => announcementApi.delete(a._id).then(() => { toast.success('Deleted'); fetch(); })} className="w-7 h-7 flex items-center justify-center text-brand-muted hover:text-red-500"><Trash2 size={14} /></button>
                  </div></td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Announcement' : 'New Announcement'} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="input-label">Title *</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input-field" required /></div>
          <div><label className="input-label">Content *</label><textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={2} className="input-field resize-none" required /></div>
          <div><label className="input-label">Type</label>
            <Select value={form.type} onChange={(v) => setForm({ ...form, type: v })} options={TYPES} />
          </div>

          {/* Banner — every type except the thin top bar */}
          {form.type !== 'top_bar' && (
            <div>
              <label className="input-label">Banner Image</label>
              <div className="flex items-center gap-3">
                <div className="w-32 h-20 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0" style={{ background: 'var(--c-bg)', border: '1px solid var(--c-border)' }}>
                  {form.image ? <img src={form.image} alt="" className="w-full h-full object-cover" /> : <ImageIcon size={20} className="text-brand-border" />}
                </div>
                <label className="btn-outline text-[12px] cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { uploadBanner(e.target.files); e.currentTarget.value = ''; }} />
                  {bannerUploading ? 'Uploading…' : <><Upload size={13} /> {form.image ? 'Replace' : 'Upload'}</>}
                </label>
                {form.image && <button type="button" onClick={() => setForm({ ...form, image: '' })} className="text-brand-muted hover:text-red-500"><X size={16} /></button>}
              </div>
              <p className="text-[10px] text-brand-muted mt-1">Shown at the top of the popup / banner. Wide landscape image works best.</p>
            </div>
          )}
          <div>
            <label className="input-label">CTA Preset (pick a destination)</label>
            <Select
              value={ctaLinks.some((l) => l.url === form.ctaLink) ? form.ctaLink : ''}
              onChange={(url) => {
                const l = ctaLinks.find((x) => x.url === url);
                setForm((f) => ({ ...f, ctaLink: url, ctaText: f.ctaText || (l ? l.label : '') }));
              }}
              placeholder="Choose a link…"
              options={ctaLinks.map((l) => ({ value: l.url, label: `${l.group} · ${l.label}` }))}
            />
            <p className="text-[10px] text-brand-muted mt-1">Product types auto-appear here. Or type a custom link below.</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="input-label">CTA Text</label><input value={form.ctaText} onChange={(e) => setForm({ ...form, ctaText: e.target.value })} className="input-field" placeholder="Shop Now" /></div>
            <div><label className="input-label">CTA Link</label><input value={form.ctaLink} onChange={(e) => setForm({ ...form, ctaLink: e.target.value })} className="input-field" placeholder="/products" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="input-label">Start Date *</label><input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="input-field" required /></div>
            <div><label className="input-label">Expiry Date *</label><input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} className="input-field" required /></div>
          </div>
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="accent-primary" /><span className="font-body text-sm">Active</span></label>
          <button type="submit" disabled={saving} className="btn-primary w-full justify-center">{saving ? 'Saving...' : editing ? 'Update' : 'Create'}</button>
        </form>
      </Modal>
    </>
  );
}
