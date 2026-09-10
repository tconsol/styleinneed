import { useEffect, useState } from 'react';
import { Wallet, Gift, Users, Copy, Check, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import Spinner from '../components/common/Spinner';
import { walletApi } from '../api/misc.api';
import { formatPrice, formatDate } from '../utils/format';
import { useSeo } from '../hooks/useSeo';
import toast from 'react-hot-toast';

interface Txn {
  _id: string;
  amount: number;
  balanceAfter: number;
  type: string;
  description: string;
  createdAt: string;
}

interface Referral {
  enabled: boolean;
  code?: string;
  invited?: number;
  rewarded?: number;
  referrerReward?: number;
  refereeReward?: number;
}

const TYPE_LABEL: Record<string, string> = {
  loyalty: 'Cashback',
  referral: 'Referral',
  gift_card: 'Gift card',
  refund: 'Refund',
  spend: 'Spent',
  reversal: 'Returned',
  adjustment: 'Adjustment',
};

export default function WalletPage() {
  useSeo({ title: 'Wallet & Rewards', noIndex: true });

  const [balance, setBalance] = useState(0);
  const [earnPercent, setEarnPercent] = useState(0);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [referral, setReferral] = useState<Referral | null>(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  const [pin, setPin] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = () => {
    Promise.all([walletApi.getMine(), walletApi.getReferral().catch(() => null)])
      .then(([w, r]) => {
        setBalance(w.data.data.balance || 0);
        setEarnPercent(w.data.data.earnPercent || 0);
        setTxns(w.data.data.transactions || []);
        if (r) setReferral(r.data.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const redeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setRedeeming(true);
    try {
      const { data } = await walletApi.redeemGiftCard(code.trim(), pin.trim() || undefined);
      toast.success(data.message || 'Gift card redeemed');
      setCode(''); setPin('');
      load();
    } catch { /* interceptor toasts the reason */ } finally { setRedeeming(false); }
  };

  const copyCode = async () => {
    if (!referral?.code) return;
    try {
      await navigator.clipboard.writeText(referral.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { toast.error('Could not copy — select and copy manually'); }
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Spinner size="lg" /></div>;

  return (
    <div className="min-h-screen bg-brand-bg" style={{ paddingTop: 'var(--topbar-height)' }}>
      <div className="container-custom max-w-3xl py-10">
        <h1 className="heading-sm mb-6 text-brand-text">Wallet &amp; Rewards</h1>

        {/* Balance */}
        <div className="mb-5 rounded-2xl bg-gradient-to-br from-primary to-primary-dark p-6 text-white shadow-luxury">
          <p className="flex items-center gap-2 font-body text-xs uppercase tracking-[0.18em] opacity-80">
            <Wallet size={14} /> Store credit
          </p>
          <p className="mt-2 font-heading text-4xl font-bold">{formatPrice(balance)}</p>
          {earnPercent > 0 && (
            <p className="mt-2 font-body text-sm opacity-90">
              You earn {earnPercent}% back as credit on every order.
            </p>
          )}
        </div>

        {/* Gift card */}
        <form onSubmit={redeem} className="mb-5 rounded-2xl border border-brand-border bg-brand-surface p-5">
          <p className="mb-3 flex items-center gap-2 font-heading text-base font-semibold text-brand-text">
            <Gift size={16} className="text-primary" /> Redeem a gift card
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="GIFT-XXXX-XXXX-XXXX-XXXX"
              className="flex-1 rounded-lg border border-brand-border bg-brand-bg px-3.5 py-2.5 font-body font-mono text-sm uppercase tracking-wide outline-none transition-colors focus:border-primary"
            />
            <input
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="PIN"
              inputMode="numeric"
              autoComplete="off"
              className="w-full rounded-lg border border-brand-border bg-brand-bg px-3.5 py-2.5 text-center font-body font-mono text-sm tracking-[0.3em] outline-none transition-colors focus:border-primary sm:w-28"
            />
            <button type="submit" disabled={redeeming || !code.trim()} className="btn-primary whitespace-nowrap disabled:opacity-50">
              {redeeming ? 'Checking…' : 'Redeem'}
            </button>
          </div>
          <p className="mt-2 font-body text-xs text-brand-muted">
            Both are on the card in your gift card email. Each card can be redeemed once.
          </p>
        </form>

        {/* Referral */}
        {referral?.enabled && referral.code && (
          <div className="mb-5 rounded-2xl border border-brand-border bg-brand-surface p-5">
            <p className="mb-1 flex items-center gap-2 font-heading text-base font-semibold text-brand-text">
              <Users size={16} className="text-primary" /> Invite friends
            </p>
            <p className="mb-3 font-body text-sm text-brand-muted">
              They get {formatPrice(referral.refereeReward || 0)} off their first order, and you get{' '}
              {formatPrice(referral.referrerReward || 0)} credit once they buy.
            </p>
            <button
              onClick={copyCode}
              className="flex w-full items-center justify-between gap-3 rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 px-4 py-3 transition-colors hover:bg-primary/10"
            >
              <span className="font-mono text-lg font-bold tracking-widest text-brand-text">{referral.code}</span>
              <span className="flex items-center gap-1.5 font-body text-xs font-semibold text-primary">
                {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
              </span>
            </button>
            <p className="mt-3 font-body text-xs text-brand-muted">
              {referral.invited || 0} invited · {referral.rewarded || 0} rewarded
            </p>
          </div>
        )}

        {/* Ledger */}
        <div className="rounded-2xl border border-brand-border bg-brand-surface p-5">
          <p className="mb-4 font-heading text-base font-semibold text-brand-text">Activity</p>
          {txns.length === 0 ? (
            <p className="py-6 text-center font-body text-sm text-brand-muted">No credit activity yet.</p>
          ) : (
            <div className="divide-y divide-brand-border">
              {txns.map((t) => (
                <div key={t._id} className="flex items-center gap-3 py-3">
                  <span
                    className={`grid h-8 w-8 flex-shrink-0 place-items-center rounded-full ${
                      t.amount >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-brand-bg text-brand-muted'
                    }`}
                  >
                    {t.amount >= 0 ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-body text-sm text-brand-text">{t.description}</p>
                    <p className="font-body text-[11px] text-brand-muted">
                      {TYPE_LABEL[t.type] || t.type} · {formatDate(t.createdAt)}
                    </p>
                  </div>
                  <p className={`font-body text-sm font-semibold ${t.amount >= 0 ? 'text-emerald-600' : 'text-brand-text'}`}>
                    {t.amount >= 0 ? '+' : '−'}{formatPrice(Math.abs(t.amount))}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
