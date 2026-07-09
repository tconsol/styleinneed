import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Circle, Send, Mail, Phone, User, Lock } from 'lucide-react';
import { PageSpinner } from '../../components/common/Spinner';
import { supportApi } from '../../api';
import type { SupportTicket } from '../../types';
import { formatDateTime } from '../../utils/format';
import toast from 'react-hot-toast';

const STATUSES = ['open', 'pending', 'resolved', 'closed'];

const STATUS_STYLE: Record<string, { bg: string; text: string; dot: string }> = {
  open:     { bg: '#DBEAFE', text: '#1E40AF', dot: '#3B82F6' },
  pending:  { bg: '#FEF9C3', text: '#854D0E', dot: '#EAB308' },
  resolved: { bg: '#DCFCE7', text: '#166534', dot: '#22C55E' },
  closed:   { bg: '#F1F5F9', text: '#475569', dot: '#94A3B8' },
};

const PRIORITY_STYLE: Record<string, { bg: string; text: string }> = {
  high:   { bg: '#FEE2E2', text: '#991B1B' },
  medium: { bg: '#FEF9C3', text: '#854D0E' },
  low:    { bg: '#DCFCE7', text: '#166534' },
};

export default function SupportTicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const { data } = await supportApi.getById(id);
      setTicket(data.data);
    } catch {
      navigate('/support');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !reply.trim()) return;
    setSending(true);
    try {
      await supportApi.addMessage(id, reply.trim(), isInternal);
      setReply('');
      setIsInternal(false);
      toast.success('Message sent');
      await load();
    } catch { toast.error('Failed to send message'); } finally { setSending(false); }
  };

  const handleStatusChange = async (status: string) => {
    if (!id || !ticket || status === ticket.status) return;
    setStatusSaving(true);
    try {
      await supportApi.update(id, { status });
      setTicket((prev) => (prev ? { ...prev, status: status as SupportTicket['status'] } : prev));
      toast.success('Status updated');
    } catch { toast.error('Failed to update status'); } finally { setStatusSaving(false); }
  };

  if (loading) return <PageSpinner />;
  if (!ticket) return null;

  const ss = STATUS_STYLE[ticket.status] || STATUS_STYLE.closed;
  const ps = PRIORITY_STYLE[ticket.priority] || PRIORITY_STYLE.low;
  const messages = ticket.messages || [];

  return (
    <div className="max-w-5xl space-y-5">
      <button onClick={() => navigate('/support')}
        className="flex items-center gap-1.5 text-[12px] font-medium text-brand-muted hover:text-primary transition-colors">
        <ArrowLeft size={14} /> Back to Tickets
      </button>

      {/* Ticket header */}
      <div className="bg-white rounded-2xl p-5" style={{ border: '1px solid var(--c-border)' }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-[13px] font-black" style={{ color: '#4F46E5' }}>{ticket.ticketId}</span>
              <span className="px-2 py-0.5 rounded-md text-[9px] font-semibold capitalize" style={{ background: ps.bg, color: ps.text }}>{ticket.priority}</span>
            </div>
            <p className="text-[13px] font-semibold text-brand-text">{ticket.subject}</p>
            <p className="text-[10px] text-brand-muted mt-0.5 capitalize">{ticket.category} · Opened {formatDateTime(ticket.createdAt)}</p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold capitalize"
            style={{ background: ss.bg, color: ss.text }}>
            <Circle size={6} fill={ss.dot} style={{ color: ss.dot }} />
            {ticket.status}
          </span>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100">
          <label className="input-label">Change Status</label>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            {STATUSES.map((s) => {
              const sm = STATUS_STYLE[s];
              const isSelected = ticket.status === s;
              return (
                <button key={s} type="button" disabled={statusSaving} onClick={() => handleStatusChange(s)}
                  className="px-2.5 py-1.5 rounded-lg text-[10px] font-semibold capitalize transition-all flex items-center gap-1 disabled:opacity-50">
                  <span style={isSelected
                    ? { background: sm.bg, color: sm.text, boxShadow: `0 0 0 1.5px ${sm.dot}`, borderRadius: 8, padding: '6px 10px', display: 'inline-flex', alignItems: 'center', gap: 4 }
                    : { background: 'var(--c-bg)', color: 'var(--c-muted)', borderRadius: 8, padding: '6px 10px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Circle size={5} fill={isSelected ? sm.dot : '#CBD5E1'} style={{ color: isSelected ? sm.dot : '#CBD5E1' }} />
                    {s}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* LEFT: Message thread */}
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid var(--c-border)' }}>
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-[13px] font-bold text-brand-text">Conversation</h2>
            </div>
            <div className="divide-y divide-slate-100 max-h-[520px] overflow-y-auto">
              {messages.length === 0 ? (
                <p className="text-[11px] text-brand-muted text-center py-8">No messages yet</p>
              ) : messages.map((m, i) => {
                const senderObj = typeof m.sender === 'object' ? m.sender : null;
                const isCustomer = m.senderRole === 'customer';
                return (
                  <div key={m._id || i} className="px-5 py-4">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[11px] font-semibold text-brand-text">{senderObj?.name || (isCustomer ? ticket.user?.name : 'Staff')}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold capitalize"
                        style={{ background: isCustomer ? '#F1F5F9' : '#EEF2FF', color: isCustomer ? '#475569' : '#4F46E5' }}>
                        {m.senderRole}
                      </span>
                      {m.isInternal && (
                        <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full font-semibold bg-amber-50 text-amber-700">
                          <Lock size={9} /> Internal
                        </span>
                      )}
                      <span className="text-[9px] text-brand-muted ml-auto">{formatDateTime(m.createdAt)}</span>
                    </div>
                    <p className="text-[11.5px] text-brand-text whitespace-pre-wrap leading-relaxed">{m.content}</p>
                  </div>
                );
              })}
            </div>

            {/* Reply box */}
            <form onSubmit={handleReply} className="px-5 py-4 border-t border-slate-100 space-y-2" style={{ background: 'var(--c-th-bg)' }}>
              <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={3}
                placeholder="Type a reply to the customer..." className="input-field resize-none" />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} className="accent-primary w-3.5 h-3.5" />
                  <span className="text-[10px] font-medium text-brand-muted">Internal note (not visible to customer)</span>
                </label>
                <button type="submit" disabled={sending || !reply.trim()} className="btn-primary text-[11px] gap-1.5">
                  <Send size={12} /> {sending ? 'Sending...' : 'Send'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* RIGHT: Sidebar */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5" style={{ border: '1px solid var(--c-border)' }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#EEF2FF' }}>
                <User size={14} style={{ color: '#4F46E5' }} />
              </div>
              <h2 className="text-[13px] font-bold text-brand-text">Customer</h2>
            </div>
            <p className="text-[12px] font-semibold text-brand-text">{ticket.user?.name}</p>
            <div className="flex items-center gap-1.5 text-[10px] text-brand-muted mt-1">
              <Mail size={11} /> {ticket.user?.email}
            </div>
            {ticket.user?.phone && (
              <div className="flex items-center gap-1.5 text-[10px] text-brand-muted mt-1">
                <Phone size={11} /> {ticket.user.phone}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl p-5" style={{ border: '1px solid var(--c-border)' }}>
            <h2 className="text-[13px] font-bold text-brand-text mb-3">Original Request</h2>
            <p className="text-[11px] text-brand-text whitespace-pre-wrap leading-relaxed">{ticket.description}</p>
            {ticket.images && ticket.images.length > 0 && (
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {ticket.images.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="w-14 h-14 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {ticket.assignedTo?.name && (
            <div className="bg-white rounded-2xl p-5" style={{ border: '1px solid var(--c-border)' }}>
              <h2 className="text-[13px] font-bold text-brand-text mb-2">Assigned To</h2>
              <p className="text-[11px] text-brand-text">{ticket.assignedTo.name}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
