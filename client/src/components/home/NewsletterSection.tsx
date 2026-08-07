import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Check, Gift, Mail, MailCheck, Sparkles } from 'lucide-react';
import { newsletterApi } from '../../api/misc.api';
import toast from 'react-hot-toast';
import type { NewsletterCms } from '../../hooks/useHomepageCms';

interface Props { data: NewsletterCms; }

const PERKS = [
  { icon: Sparkles, label: 'Early access to drops' },
  { icon: Gift, label: 'Member-only offers' },
  { icon: MailCheck, label: '100% spam-free' },
];

export default function NewsletterSection({ data }: Props) {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      await newsletterApi.subscribe(email);
      setSubscribed(true);
      toast.success('Successfully subscribed!');
    } catch {
      /* keep the form usable */
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="page-section bg-brand-surface">
      <div className="container-custom">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="relative overflow-hidden rounded-[1.75rem] px-6 py-14 text-center md:px-16 md:py-20"
          style={{
            background: 'linear-gradient(135deg, rgb(var(--color-primary-dark)), rgb(var(--color-primary)) 55%, rgb(var(--color-secondary)))',
            boxShadow: '0 30px 80px -20px rgb(var(--color-primary-dark) / 0.5)',
          }}
        >
          {/* Decorative blurred orbs */}
          <div aria-hidden className="pointer-events-none absolute -top-24 -left-16 h-72 w-72 rounded-full bg-white/15 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -bottom-28 -right-10 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
          {/* Fine dot grid */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.12]"
            style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '22px 22px' }}
          />

          <div className="relative mx-auto max-w-xl">
            {subscribed ? (
              <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col items-center py-4"
              >
                <div className="relative mb-6">
                  <motion.span
                    aria-hidden
                    className="absolute inset-0 rounded-full bg-white/40"
                    animate={{ scale: [1, 1.9], opacity: [0.6, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
                  />
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white">
                    <Check size={30} strokeWidth={3} style={{ color: 'rgb(var(--color-primary))' }} />
                  </div>
                </div>
                <h3 className="font-heading text-2xl font-bold text-white md:text-3xl">{data.thankYou}</h3>
                <p className="mt-2 font-body text-sm text-white/70">{data.note}</p>
              </motion.div>
            ) : (
              <>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.3em] text-white backdrop-blur-sm">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                  {data.label}
                </span>

                <h2 className="mt-6 font-heading text-3xl font-bold leading-tight text-white text-balance md:text-4xl xl:text-5xl">
                  {data.heading}
                </h2>
                <p className="mx-auto mt-4 max-w-md font-body leading-relaxed text-white/75">{data.body}</p>

                <form onSubmit={handleSubmit} className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row">
                  <div className="relative flex-1">
                    <Mail aria-hidden size={17} className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-white/50" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={data.placeholder}
                      required
                      className="w-full rounded-full border border-white/25 bg-white/15 py-3.5 pl-12 pr-5 font-body text-sm text-white outline-none backdrop-blur-sm transition-all duration-300 placeholder:text-white/50 focus:border-white/60 focus:bg-white/20"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="group flex items-center justify-center gap-2 rounded-full bg-white px-7 py-3.5 font-body text-xs font-bold uppercase tracking-[0.2em] transition-all duration-300 hover:shadow-[0_10px_30px_rgba(0,0,0,0.25)] active:scale-[0.98] disabled:opacity-70"
                    style={{ color: 'rgb(var(--color-primary-dark))' }}
                  >
                    {loading ? (
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-current/30 border-t-current" />
                    ) : (
                      <>
                        Subscribe
                        <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2.5">
                  {PERKS.map(({ icon: Icon, label }) => (
                    <span key={label} className="flex items-center gap-1.5 font-body text-xs text-white/70">
                      <Icon size={14} className="text-white" />
                      {label}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
