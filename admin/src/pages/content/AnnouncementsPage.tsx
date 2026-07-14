import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, BellRing } from 'lucide-react';
import Modal from '../../components/common/Modal';
import Select from '../../components/common/Select';
import Badge from '../../components/common/Badge';
import StatusToggle from '../../components/common/StatusToggle';
import { announcementApi, notificationApi } from '../../api';
import type { Announcement } from '../../types';
import { formatDate } from '../../utils/format';
import toast from 'react-hot-toast';

const empty = { title: '', content: '', type: 'top_bar', ctaText: '', ctaLink: '', startDate: '', expiryDate: '', isActive: true, bgColor: '#C8A97E', textColor: '#FFFFFF' };
const TYPES = ['top_bar', 'popup', 'promotional_banner', 'flash_sale', 'festival'];

export default function AnnouncementsPage() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [pushing, setPushing] = useState<string | null>(null);

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
    setForm({ title: a.title, content: a.content, type: a.type, ctaText: a.ctaText || '', ctaLink: a.ctaLink || '', startDate: a.startDate?.slice(0, 10) || '', expiryDate: a.expiryDate?.slice(0, 10) || '', isActive: a.isActive, bgColor: a.bgColor || '#C8A97E', textColor: a.textColor || '#FFFFFF' });
    setModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) { await announcementApi.update(editing._id, form); toast.success('Updated'); }
      else { await announcementApi.create(form); toast.success('Created'); }
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
          <div className="grid grid-cols-2 gap-4">
            <div><label className="input-label">Type</label>
              <Select value={form.type} onChange={(v) => setForm({ ...form, type: v })} options={TYPES} />
            </div>
            <div><label className="input-label">BG Color</label><input type="color" value={form.bgColor} onChange={(e) => setForm({ ...form, bgColor: e.target.value })} className="input-field h-10 p-1 cursor-pointer" /></div>
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
