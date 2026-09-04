import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MailX, CheckCircle2, ArrowLeft } from 'lucide-react';
import { newsletterApi } from '../api/misc.api';

type Status = 'idle' | 'loading' | 'done' | 'error';

// Lands here from the "Unsubscribe" link in promotional emails. Requires an
// explicit click (never auto-fires on load) so a link preview/scanner
// visiting the URL can't silently unsubscribe someone.
export default function UnsubscribePage() {
  const [params] = useSearchParams();
  const email = params.get('email') || '';
  const [status, setStatus] = useState<Status>('idle');

  const handleUnsubscribe = async () => {
    setStatus('loading');
    try {
      await newsletterApi.unsubscribe(email);
      setStatus('done');
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-3xl bg-brand-surface p-10 text-center shadow-luxury">
        {status === 'done' ? (
          <>
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={26} />
            </span>
            <h1 className="mt-5 font-heading text-2xl font-semibold text-brand-text">You're unsubscribed</h1>
            <p className="mt-2 font-body text-sm text-brand-muted">
              {email ? <>We won't send further emails to <span className="font-medium text-brand-text">{email}</span>.</> : "You won't receive further promotional emails."}
            </p>
          </>
        ) : (
          <>
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
              <MailX size={26} />
            </span>
            <h1 className="mt-5 font-heading text-2xl font-semibold text-brand-text">Unsubscribe from emails</h1>
            {email ? (
              <p className="mt-2 font-body text-sm text-brand-muted">
                Stop receiving promotional emails at <span className="font-medium text-brand-text">{email}</span>?
              </p>
            ) : (
              <p className="mt-2 font-body text-sm text-brand-muted">No email address was found in this link.</p>
            )}

            {status === 'error' && (
              <p className="mt-3 font-body text-xs text-red-500">Something went wrong. Please try again.</p>
            )}

            {email && (
              <button
                onClick={handleUnsubscribe}
                disabled={status === 'loading'}
                className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-3.5 font-body text-sm font-semibold uppercase tracking-wide text-white shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5 disabled:opacity-60"
              >
                {status === 'loading' ? 'Unsubscribing…' : 'Confirm Unsubscribe'}
              </button>
            )}
          </>
        )}

        <Link to="/" className="mt-6 inline-flex items-center gap-1.5 font-body text-xs text-brand-muted transition-colors hover:text-brand-text">
          <ArrowLeft size={13} /> Back to Style In Need
        </Link>
      </div>
    </div>
  );
}
