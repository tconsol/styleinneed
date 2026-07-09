import { useEffect, useState } from 'react';
import { Send, Smartphone, Bell, Megaphone, Zap, Info } from 'lucide-react';
import { notificationApi } from '../../api';
import toast from 'react-hot-toast';

const TYPES = [
  { value: 'announcement', label: 'Announcement', icon: Megaphone, color: 'text-blue-500', desc: 'Store news, events, updates' },
  { value: 'promotion', label: 'Promotion', icon: Zap, color: 'text-amber-500', desc: 'Sales, discounts, offers' },
  { value: 'general', label: 'General', icon: Bell, color: 'text-brand-muted', desc: 'Other messages' },
];

interface Stats { totalUsers: number; registeredDevices: number; }

export default function PushNotificationsPage() {
  const [form, setForm] = useState({ title: '', body: '', type: 'announcement', deepLink: '' });
  const [sending, setSending] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);

  useEffect(() => {
    notificationApi.getStats()
      .then(({ data }) => setStats(data.data))
      .catch(() => {});
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) return;
    setSending(true);
    setResult(null);
    try {
      const { data } = await notificationApi.broadcast(form);
      setResult(data.data);
      toast.success(`Sent to ${data.data.sent} devices`);
      setForm({ title: '', body: '', type: 'announcement', deepLink: '' });
    } catch {
      toast.error('Broadcast failed');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Stats bar */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card py-4 text-center">
          <Smartphone size={20} className="text-primary mx-auto mb-2" />
          <p className="font-body text-2xl font-bold text-brand-text">{stats?.registeredDevices ?? '—'}</p>
          <p className="font-body text-xs text-brand-muted mt-0.5">Registered Devices</p>
        </div>
        <div className="card py-4 text-center">
          <Bell size={20} className="text-brand-muted mx-auto mb-2" />
          <p className="font-body text-2xl font-bold text-brand-text">{stats?.totalUsers ?? '—'}</p>
          <p className="font-body text-xs text-brand-muted mt-0.5">Total Users</p>
        </div>
      </div>

      {/* Compose */}
      <div className="card">
        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-brand-border">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Send size={16} className="text-primary" />
          </div>
          <div>
            <h2 className="font-body text-sm font-semibold text-brand-text">Broadcast Push Notification</h2>
            <p className="font-body text-xs text-brand-muted">Sends to all users with notifications enabled</p>
          </div>
        </div>

        <form onSubmit={handleSend} className="space-y-4">
          {/* Type selector */}
          <div>
            <label className="input-label">Type</label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {TYPES.map(({ value, label, icon: Icon, color, desc }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setForm({ ...form, type: value })}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-center transition-all ${
                    form.type === value
                      ? 'border-primary bg-primary/5'
                      : 'border-brand-border hover:border-primary/40'
                  }`}
                >
                  <Icon size={16} className={form.type === value ? 'text-primary' : color} />
                  <span className="font-body text-[11px] font-semibold text-brand-text">{label}</span>
                  <span className="font-body text-[10px] text-brand-muted leading-tight">{desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="input-label">Title *</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="input-field"
              placeholder="e.g. Flash Sale — 30% Off!"
              maxLength={60}
              required
            />
            <p className="font-body text-[10px] text-brand-muted mt-0.5 text-right">{form.title.length}/60</p>
          </div>

          <div>
            <label className="input-label">Message *</label>
            <textarea
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              className="input-field resize-none"
              rows={3}
              placeholder="e.g. Shop the biggest sale of the season. Use code SAVE30 at checkout!"
              maxLength={200}
              required
            />
            <p className="font-body text-[10px] text-brand-muted mt-0.5 text-right">{form.body.length}/200</p>
          </div>

          <div>
            <label className="input-label">Deep Link <span className="text-brand-muted font-normal">(optional)</span></label>
            <input
              value={form.deepLink}
              onChange={(e) => setForm({ ...form, deepLink: e.target.value })}
              className="input-field"
              placeholder="e.g. /products?collection=flash-sale"
            />
            <p className="font-body text-[10px] text-brand-muted mt-0.5 flex items-center gap-1">
              <Info size={10} /> App screen to open when user taps the notification
            </p>
          </div>

          {/* Preview */}
          {(form.title || form.body) && (
            <div className="rounded-xl border border-brand-border bg-brand-bg p-4">
              <p className="font-body text-[9px] font-bold uppercase tracking-wider text-brand-muted mb-2">Preview</p>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Bell size={16} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-body text-[12px] font-semibold text-brand-text truncate">
                    {form.title || 'Notification Title'}
                  </p>
                  <p className="font-body text-[11px] text-brand-muted mt-0.5 line-clamp-2">
                    {form.body || 'Your message will appear here.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={sending || !form.title.trim() || !form.body.trim()}
            className="btn-primary w-full justify-center gap-2"
          >
            {sending ? (
              <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending...</>
            ) : (
              <><Send size={14} /> Send to All Devices {stats ? `(${stats.registeredDevices})` : ''}</>
            )}
          </button>
        </form>

        {/* Result */}
        {result && (
          <div className="mt-4 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <p className="font-body text-[12px] text-green-700 dark:text-green-400 font-semibold">
              ✓ Broadcast complete — {result.sent} delivered
              {result.failed > 0 && <span className="text-amber-600 dark:text-amber-400 ml-2">· {result.failed} failed (stale tokens removed)</span>}
            </p>
          </div>
        )}
      </div>

      {/* Info card */}
      <div className="card bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30">
        <div className="flex items-start gap-3">
          <Info size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="font-body text-[11px] text-blue-700 dark:text-blue-300 space-y-1">
            <p className="font-semibold">How push notifications work</p>
            <p>Order updates (confirmed, shipped, delivered, cancelled) are sent automatically — no action needed here.</p>
            <p>Use this page for promotions, flash sales, announcements, or any custom message to all users.</p>
            <p>You can also click <strong>Push</strong> on any Announcement or Promotion row to broadcast it directly.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
