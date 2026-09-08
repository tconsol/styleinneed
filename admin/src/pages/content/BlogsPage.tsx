import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, FileText, Eye, Upload, ImageIcon, X } from 'lucide-react';
import Modal from '../../components/common/Modal';
import Select from '../../components/common/Select';
import { blogApi, cmsApi } from '../../api';
import ImageSpecHint from '../../components/common/ImageSpecHint';
import { IMAGE_SPECS, checkRatio, readImageSize, type RatioCheck } from '../../config/imageSpecs';
import type { Blog } from '../../types';
import { formatDate } from '../../utils/format';
import toast from 'react-hot-toast';

const CATEGORIES = ['Style Guide', 'Festival Fashion', 'Fashion Education', 'Wedding Fashion', 'How-To', 'Trend Report'];
const empty = { title: '', excerpt: '', content: '', category: 'Style Guide', tags: '', coverImage: '', isPublished: false };

export default function BlogsPage() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Blog | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imgCheck, setImgCheck] = useState<RatioCheck | null>(null);

  const uploadCover = async (files: FileList | null) => {
    if (!files?.[0]) return;
    const size = await readImageSize(files[0]);
    setImgCheck(checkRatio(IMAGE_SPECS.blog, size.width, size.height));
    setUploading(true);
    try {
      const fd = new FormData(); fd.append('image', files[0]);
      const { data } = await cmsApi.uploadImage(fd);
      setForm((f) => ({ ...f, coverImage: data.data.url }));
    } catch { /* interceptor */ } finally { setUploading(false); }
  };

  const load = async () => {
    setLoading(true);
    blogApi.getAll({ includeUnpublished: true }).then(({ data }) => setBlogs(data.data || [])).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const openEdit = (b: Blog) => {
    setEditing(b);
    setForm({ title: b.title, excerpt: b.excerpt, content: b.content, category: b.category, tags: b.tags?.join(', ') || '', coverImage: b.coverImage || '', isPublished: b.isPublished });
    setImgCheck(null);
    setModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const payload = { ...form, tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean) };
    try {
      if (editing) { await blogApi.update(editing._id, payload); toast.success('Post updated'); }
      else { await blogApi.create(payload); toast.success('Post created'); }
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
          <button onClick={() => { setEditing(null); setForm(empty); setImgCheck(null); setModal(true); }} className="btn-primary"><Plus size={14} /> New Post</button>
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
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, var(--c-primary-soft), var(--c-info-soft))' }}>
                        <FileText size={13} style={{ color: 'var(--c-primary)' }} />
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
                      <button onClick={() => openEdit(b)} className="w-8 h-8 rounded-lg flex items-center justify-center transition-all" style={{ color: 'var(--c-muted)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--c-primary-soft)'; e.currentTarget.style.color = 'var(--c-primary)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--c-muted)'; }}>
                        <Edit2 size={13} />
                      </button>
                      <button onClick={() => blogApi.delete(b._id).then(() => { toast.success('Deleted'); load(); })} className="w-8 h-8 rounded-lg flex items-center justify-center transition-all" style={{ color: 'var(--c-muted)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--c-danger-soft)'; e.currentTarget.style.color = 'var(--c-danger)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--c-muted)'; }}>
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
          <div>
            <label className="input-label">Cover Image *</label>
            <div className="flex items-center gap-3">
              <div className="w-32 h-20 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0" style={{ background: 'var(--c-bg)', border: '1px solid var(--c-border)' }}>
                {form.coverImage ? <img src={form.coverImage} alt="" className="w-full h-full object-cover" /> : <ImageIcon size={20} className="text-brand-border" />}
              </div>
              <label className="btn-outline text-[12px] cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { uploadCover(e.target.files); e.currentTarget.value = ''; }} />
                {uploading ? 'Uploading…' : <><Upload size={13} /> {form.coverImage ? 'Replace' : 'Upload'}</>}
              </label>
              {form.coverImage && <button type="button" onClick={() => { setForm({ ...form, coverImage: '' }); setImgCheck(null); }} className="text-brand-muted hover:text-red-500"><X size={16} /></button>}
            </div>
            <ImageSpecHint spec="blog" check={imgCheck} />
          </div>
          <div><label className="input-label">Tags (comma separated)</label><input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} className="input-field" placeholder="fashion, saree, style" /></div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} className="accent-primary w-4 h-4" />
            <span className="text-[12px] font-medium">Publish immediately</span>
          </label>
          <div className="flex gap-2">
            <button type="button" onClick={() => setModal(false)} className="btn-outline flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={saving || !form.coverImage} className="btn-primary flex-1 justify-center disabled:opacity-50">
              {saving ? 'Saving...' : editing ? 'Update Post' : 'Create Post'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
