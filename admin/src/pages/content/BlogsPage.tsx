import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, FileText, Eye } from 'lucide-react';
import Modal from '../../components/common/Modal';
import Select from '../../components/common/Select';
import { blogApi } from '../../api';
import type { Blog } from '../../types';
import { formatDate } from '../../utils/format';
import toast from 'react-hot-toast';

const CATEGORIES = ['Style Guide', 'Festival Fashion', 'Fashion Education', 'Wedding Fashion', 'How-To', 'Trend Report'];
const empty = { title: '', excerpt: '', content: '', category: 'Style Guide', tags: '', isPublished: false };

export default function BlogsPage() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Blog | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    blogApi.getAll({ includeUnpublished: true }).then(({ data }) => setBlogs(data.data || [])).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const openEdit = (b: Blog) => {
    setEditing(b);
    setForm({ title: b.title, excerpt: b.excerpt, content: b.content, category: b.category, tags: b.tags?.join(', ') || '', isPublished: b.isPublished });
    setModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const payload = { ...form, tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean) };
    try {
      if (editing) { await blogApi.update(editing._id, payload); toast.success('Post updated'); }
      setModal(false); load();
    } catch {} finally { setSaving(false); }
  };

  return (
    <>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[15px] font-bold text-brand-text">Blog Posts</h1>
            <p className="text-[10px] text-brand-muted mt-0.5">{blogs.length} posts total</p>
          </div>
          <button onClick={() => { setEditing(null); setForm(empty); setModal(true); }} className="btn-primary"><Plus size={14} /> New Post</button>
        </div>

        <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid var(--c-border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <table className="w-full">
            <thead>
              <tr style={{ background: 'var(--c-th-bg)', borderBottom: '2px solid var(--c-border)' }}>
                <th className="th text-left pl-5" style={{ width: '44px' }}>#</th>
                <th className="th text-left">Title</th>
                <th className="th text-left" style={{ width: '130px' }}>Category</th>
                <th className="th text-center" style={{ width: '80px' }}>Views</th>
                <th className="th text-center" style={{ width: '100px' }}>Status</th>
                <th className="th text-left" style={{ width: '100px' }}>Date</th>
                <th className="th text-center" style={{ width: '110px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12"><span className="w-6 h-6 border-2 border-brand-border border-t-primary rounded-full animate-spin inline-block" /></td></tr>
              ) : blogs.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-16"><FileText size={32} className="mx-auto mb-2 text-brand-border" /><p className="text-[11px] text-brand-muted">No posts yet</p></td></tr>
              ) : blogs.map((b, idx) => (
                <tr key={b._id} className="group transition-colors" style={{ borderBottom: '1px solid var(--c-border)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--c-tr-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--c-surface)')}>
                  <td className="pl-5 py-3 text-[10px] font-bold text-brand-muted/60">{idx + 1}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #EEF2FF, #E0E7FF)' }}>
                        <FileText size={13} style={{ color: '#4F46E5' }} />
                      </div>
                      <span className="text-[11px] font-semibold text-brand-text line-clamp-1 max-w-[260px]">{b.title}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span className="px-2 py-0.5 rounded-md text-[9px] font-semibold bg-indigo-50 text-indigo-600">{b.category}</span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className="inline-flex items-center gap-1 text-[11px] text-brand-muted"><Eye size={11} />{b.views ?? 0}</span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-semibold ${b.isPublished ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${b.isPublished ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                      {b.isPublished ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-[10px] text-brand-muted">{b.publishedAt ? formatDate(b.publishedAt) : formatDate(b.createdAt)}</td>
                  <td className="px-3 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openEdit(b)} className="w-8 h-8 rounded-lg flex items-center justify-center transition-all" style={{ color: '#64748B' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#EEF2FF'; e.currentTarget.style.color = '#4F46E5'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748B'; }}>
                        <Edit2 size={13} />
                      </button>
                      <button onClick={() => blogApi.delete(b._id).then(() => { toast.success('Deleted'); load(); })} className="w-8 h-8 rounded-lg flex items-center justify-center transition-all" style={{ color: '#64748B' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#FEE2E2'; e.currentTarget.style.color = '#EF4444'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748B'; }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Post' : 'New Post'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="input-label">Title *</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input-field" required /></div>
          <div><label className="input-label">Category</label>
            <Select value={form.category} onChange={(v) => setForm({ ...form, category: v })} options={CATEGORIES} />
          </div>
          <div><label className="input-label">Excerpt *</label><textarea value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} rows={2} className="input-field resize-none" required /></div>
          <div><label className="input-label">Content (HTML) *</label><textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={8} className="input-field resize-y font-mono text-xs" required /></div>
          <div><label className="input-label">Tags (comma separated)</label><input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} className="input-field" placeholder="fashion, saree, style" /></div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} className="accent-primary w-4 h-4" />
            <span className="text-[12px] font-medium">Publish immediately</span>
          </label>
          <div className="flex gap-2">
            <button type="button" onClick={() => setModal(false)} className="btn-outline flex-1 justify-center">Cancel</button>
            {editing && <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">{saving ? 'Saving...' : 'Update Post'}</button>}
            {!editing && <span className="flex-1 text-[11px] text-brand-muted self-center">Full post creation requires image upload — edit existing posts here.</span>}
          </div>
        </form>
      </Modal>
    </>
  );
}
