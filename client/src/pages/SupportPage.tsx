import { useState } from 'react';
import { Headphones, Mail, Clock, Send, Sparkles } from 'lucide-react';
import { supportApi } from '../api/misc.api';
import toast from 'react-hot-toast';
import AccountHeader from '../components/account/AccountHeader';

const CATEGORIES = ['General', 'Order Issue', 'Return/Refund', 'Product Query', 'Payment Issue', 'Delivery Issue'];

export default function SupportPage() {
  const [form, setForm] = useState({ subject: '', category: 'General', description: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await supportApi.createTicket(form);
      toast.success("Ticket submitted! We'll respond within 24 hours.");
      setForm({ subject: '', category: 'General', description: '' });
    } catch { /* error toast shown by api interceptor */ } finally {
      setLoading(false);
    }
  };

  const inputCls =
    'w-full px-4 py-3 bg-brand-surface border border-brand-border rounded-xl text-brand-text text-sm outline-none focus:border-primary focus:bg-white transition-all duration-200 placeholder:text-brand-muted/60';

  return (
    <div className="min-h-screen bg-brand-bg" style={{ paddingTop: 'var(--topbar-height)' }}>
      <div className="container-custom py-8 md:py-12 max-w-5xl">
        <AccountHeader
          eyebrow="Account"
          title="Contact Support"
          subtitle="Tell us what's going on and our team will get back to you within 24 hours."
        />

        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
          {/* Contact card */}
          <div className="bg-brand-text rounded-2xl p-7 relative overflow-hidden h-fit lg:sticky lg:top-[calc(var(--topbar-height)+1.5rem)]">
            <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-primary/20 blur-3xl" />
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center mb-5">
                <Headphones size={20} className="text-primary" />
              </div>
              <p className="font-heading text-lg font-bold text-white mb-1">We're here to help</p>
              <p className="font-body text-[13px] text-white/50 leading-relaxed mb-7">
                For anything related to your orders, payments or the products themselves.
              </p>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                    <Mail size={14} className="text-primary" />
                  </div>
                  <div>
                    <p className="font-body text-[9px] uppercase tracking-[0.25em] text-white/35">Email</p>
                    <p className="font-body text-xs text-white/85">support@styleinneed.com</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                    <Clock size={14} className="text-primary" />
                  </div>
                  <div>
                    <p className="font-body text-[9px] uppercase tracking-[0.25em] text-white/35">Response time</p>
                    <p className="font-body text-xs text-white/85">Within 24 hours, 7 days a week</p>
                  </div>
                </div>
              </div>
              <div className="mt-7 pt-6 border-t border-white/10">
                <p className="font-body text-[12px] text-white/60 leading-relaxed flex items-start gap-2">
                  <Sparkles size={13} className="text-primary flex-shrink-0 mt-0.5" />
                  Include your order ID in the message for the fastest resolution.
                </p>
              </div>
            </div>
          </div>

          {/* Ticket form */}
          <div className="bg-white border border-brand-border rounded-2xl p-6 md:p-8 shadow-[0_8px_30px_rgba(28,28,28,0.04)] h-fit">
            <div className="flex items-center gap-3 mb-6">
              <span className="w-1 h-5 bg-primary rounded-full" />
              <h3 className="font-heading text-lg font-semibold text-brand-text">Open a Ticket</h3>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="input-label">Category</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm({ ...form, category: c })}
                      className={`font-body text-[11px] font-medium px-3.5 py-2 rounded-full border transition-all duration-200 ${
                        form.category === c
                          ? 'bg-primary text-white border-primary shadow-[0_4px_14px_rgba(200,169,126,0.35)]'
                          : 'border-brand-border text-brand-muted hover:border-primary hover:text-primary'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="input-label">Subject</label>
                <input
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className={inputCls}
                  placeholder="Brief description of your issue"
                  required
                />
              </div>
              <div>
                <label className="input-label">Message</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={6}
                  className={`${inputCls} resize-none leading-relaxed`}
                  placeholder="Tell us more — include your order ID if you have one..."
                  required
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 bg-primary text-white font-body font-medium px-7 py-3.5 text-xs tracking-widest uppercase rounded-xl hover:bg-primary-dark transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={14} />}
                  {loading ? 'Submitting...' : 'Submit Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
