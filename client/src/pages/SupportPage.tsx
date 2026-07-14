import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { supportApi } from '../api/misc.api';
import toast from 'react-hot-toast';

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
    } catch {
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg" style={{ paddingTop: 'var(--topbar-height)' }}>
      <div className="container-custom py-10 max-w-4xl">
        <Link to="/account" className="lg:hidden inline-flex items-center gap-1 font-body text-sm text-brand-muted hover:text-primary mb-4">
          <ChevronLeft size={16} /> My Account
        </Link>
        <div className="bg-white border border-brand-border p-6">
          <h1 className="font-heading text-xl font-semibold mb-6">Contact Support</h1>
          <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
            <div>
              <label className="input-label">Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input-field">
                {['General', 'Order Issue', 'Return/Refund', 'Product Query', 'Payment Issue', 'Delivery Issue'].map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="input-label">Subject</label>
              <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="input-field" placeholder="Brief description" required />
            </div>
            <div>
              <label className="input-label">Message</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={5} className="input-field resize-none" placeholder="Describe your issue..." required />
            </div>
            <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Submitting...' : 'Submit Ticket'}</button>
          </form>
        </div>
      </div>
    </div>
  );
}
