import { useEffect, useState } from 'react';
import { CheckCircle2, Trash2, Star, MessageSquare } from 'lucide-react';
import { reviewApi } from '../../api';
import { useConfirm } from '../../components/common/ConfirmDialog';
import type { Review } from '../../types';
import { formatDate } from '../../utils/format';
import toast from 'react-hot-toast';

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const confirm = useConfirm();

  const load = async () => {
    setLoading(true);
    try {
      const { data } = filter === 'pending' ? await reviewApi.getPending() : await reviewApi.getAll();
      setReviews(data.data || []);
    } catch {} finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [filter]);

  const handleApprove = async (id: string) => {
    await reviewApi.approve(id).then(() => { toast.success('Review approved'); load(); }).catch(() => {});
  };
  const handleDelete = async (id: string) => {
    if (!(await confirm({ title: 'Delete review?', message: 'This permanently removes the review.' }))) return;
    await reviewApi.delete(id).then(() => { toast.success('Deleted'); load(); }).catch(() => {});
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[15px] font-bold text-brand-text">Reviews</h1>
          <p className="text-[10px] text-brand-muted mt-0.5">Moderate customer reviews before they go live</p>
        </div>
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--c-bg)' }}>
          {(['pending', 'all'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className="px-4 py-1.5 text-[11px] font-semibold rounded-lg transition-all capitalize"
              style={filter === f ? { background: 'var(--c-surface)', color: 'var(--c-primary)', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' } : { color: '#64748B' }}>
              {f === 'pending' ? 'Pending Approval' : 'All Reviews'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid var(--c-border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: 'var(--c-th-bg)', borderBottom: '2px solid var(--c-border)' }}>
              <th className="th text-left pl-5">Product</th>
              <th className="th text-left">Customer</th>
              <th className="th text-center" style={{ width: '100px' }}>Rating</th>
              <th className="th text-left">Review</th>
              <th className="th text-center" style={{ width: '90px' }}>Verified</th>
              <th className="th text-center" style={{ width: '100px' }}>Status</th>
              <th className="th text-left" style={{ width: '90px' }}>Date</th>
              <th className="th text-center" style={{ width: '110px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-12"><span className="w-6 h-6 border-2 border-brand-border border-t-primary rounded-full animate-spin inline-block" /></td></tr>
            ) : reviews.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-16">
                <MessageSquare size={32} className="mx-auto mb-2 text-brand-border" />
                <p className="text-[11px] text-brand-muted">{filter === 'pending' ? 'No reviews pending approval' : 'No reviews yet'}</p>
              </td></tr>
            ) : reviews.map((r) => (
              <tr key={r._id} className="group transition-colors" style={{ borderBottom: '1px solid var(--c-border)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--c-tr-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--c-surface)')}>
                <td className="pl-5 px-3 py-3 text-[11px] font-semibold text-brand-text max-w-[140px]">
                  <span className="line-clamp-2">{r.product?.name || '—'}</span>
                </td>
                <td className="px-3 py-3">
                  <p className="text-[11px] font-semibold text-brand-text">{r.user?.name}</p>
                  <p className="text-[10px] text-brand-muted">{r.user?.email}</p>
                </td>
                <td className="px-3 py-3 text-center">
                  <div className="flex items-center justify-center gap-0.5">
                    {[1,2,3,4,5].map((s) => <Star key={s} size={10} className={s <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'} />)}
                  </div>
                  <p className="text-[9px] text-brand-muted mt-0.5">{r.rating}/5</p>
                </td>
                <td className="px-3 py-3">
                  <p className="text-[11px] text-brand-muted line-clamp-2 max-w-[220px]">{r.body}</p>
                </td>
                <td className="px-3 py-3 text-center">
                  <span className={`text-[10px] font-semibold ${r.isVerifiedPurchase ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {r.isVerifiedPurchase ? '✓ Yes' : '—'}
                  </span>
                </td>
                <td className="px-3 py-3 text-center">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-semibold ${r.isApproved ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${r.isApproved ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                    {r.isApproved ? 'Approved' : 'Pending'}
                  </span>
                </td>
                <td className="px-3 py-3 text-[10px] text-brand-muted">{formatDate(r.createdAt)}</td>
                <td className="px-3 py-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    {!r.isApproved && (
                      <button onClick={() => handleApprove(r._id)} title="Approve" className="w-8 h-8 rounded-lg flex items-center justify-center transition-all" style={{ color: '#64748B' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#DCFCE7'; e.currentTarget.style.color = '#16A34A'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748B'; }}>
                        <CheckCircle2 size={13} />
                      </button>
                    )}
                    <button onClick={() => handleDelete(r._id)} title="Delete" className="w-8 h-8 rounded-lg flex items-center justify-center transition-all" style={{ color: '#64748B' }}
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
  );
}
