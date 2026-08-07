import { Link } from 'react-router-dom';
import { PackageCheck, RotateCcw, Wallet, Clock, ArrowRight, ShieldCheck } from 'lucide-react';
import AccountHeader from '../components/account/AccountHeader';

const STEPS = [
  {
    icon: PackageCheck,
    title: 'Receive your order',
    text: 'Check the items in your delivery and keep the original packaging.',
  },
  {
    icon: RotateCcw,
    title: 'Request a return',
    text: 'Open the order from My Orders and pick the items you want to return.',
  },
  {
    icon: Wallet,
    title: 'Get refunded',
    text: 'Money is refunded to your original payment method within 5–7 working days.',
  },
];

const PERKS = [
  { icon: Clock, title: '7-day window', text: 'Raise a return within 7 days of delivery' },
  { icon: ShieldCheck, title: 'No questions asked', text: 'Fast approvals, free pickup in metro cities' },
  { icon: Wallet, title: 'Instant refunds', text: 'Refunds to original payment method' },
];

export default function ReturnsPage() {
  return (
    <div className="min-h-screen bg-brand-bg" style={{ paddingTop: 'var(--topbar-height)' }}>
      <div className="container-custom py-8 md:py-12 max-w-4xl">
        <AccountHeader
          eyebrow="Account"
          title="Returns & Refunds"
          subtitle="Changed your mind? Returning is easy — here's how it works."
        />

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <div key={title} className="relative bg-white border border-brand-border rounded-2xl p-6 shadow-[0_8px_30px_rgba(28,28,28,0.04)]">
              <span className="absolute top-5 right-5 font-heading text-4xl font-bold text-brand-border/60">{i + 1}</span>
              <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                <Icon size={18} className="text-primary" />
              </div>
              <p className="font-heading text-[15px] font-semibold text-brand-text mb-1.5">{title}</p>
              <p className="font-body text-[13px] text-brand-muted leading-relaxed">{text}</p>
            </div>
          ))}
        </div>

        {/* Perks + CTA */}
        <div className="bg-brand-text rounded-2xl p-6 md:p-9 overflow-hidden relative mb-4">
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute -bottom-24 -left-10 w-56 h-56 rounded-full bg-secondary/15 blur-3xl" />
          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-6">
            {PERKS.map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon size={15} className="text-primary" />
                </div>
                <div>
                  <p className="font-body text-[13px] font-semibold text-white">{title}</p>
                  <p className="font-body text-xs text-white/50 leading-relaxed mt-0.5">{text}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="relative mt-7 pt-6 border-t border-white/10 flex flex-col sm:flex-row sm:items-center gap-4">
            <p className="font-body text-sm text-white/70">Have an order you'd like to return?</p>
            <Link
              to="/orders"
              className="inline-flex items-center justify-center gap-2 bg-primary text-white font-body text-xs font-semibold uppercase tracking-widest px-7 py-3.5 rounded-xl hover:bg-primary-dark transition-colors sm:ml-auto"
            >
              View My Orders <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* Help note */}
        <p className="font-body text-xs text-brand-muted text-center">
          Need help with a return?{' '}
          <Link to="/support" className="text-primary hover:underline font-medium">Contact support</Link> — we usually reply within 24 hours.
        </p>
      </div>
    </div>
  );
}
