import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Check, Gift, Mail, MailCheck, Sparkles } from 'lucide-react';
import { newsletterApi } from '../../api/misc.api';
import toast from 'react-hot-toast';
import type { NewsletterCms } from '../../hooks/useHomepageCms';

interface Props { data: NewsletterCms; }

const FLOATING_SPARKLES: { size: number; delay: number; className: string }[] = [
  { size: 20, delay: 0, className: 'top-[10%] left-[5%]' },
  { size: 26, delay: 1.4, className: 'top-[18%] right-[7%]' },
  { size: 14, delay: 0.7, className: 'bottom-[16%] left-[10%]' },
  { size: 18, delay: 2.1, className: 'top-[40%] right-[3%]' },
  { size: 22, delay: 1.0, className: 'bottom-[32%] left-[3%]' },
];

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
      // Keep the pre-subscribe state; the form remains usable.
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="relative overflow-hidden bg-brand-text py-20 md:py-28">
      {/* Aurora orbs */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-32 h-[26rem] w-[26rem] rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute top-1/4 -right-40 h-[30rem] w-[30rem] rounded-full bg-secondary/15 blur-3xl" />
        <div className="absolute -bottom-48 left-1/4 h-[26rem] w-[26rem] rounded-full bg-primary/15 blur-3xl" />
      </div>

      {/* Floating sparkles */}
      {FLOATING_SPARKLES.map((s, i) => (
        <motion.span
          key={i}
          aria-hidden
          className={`pointer-events-none absolute hidden text-primary/40 md:block ${s.className}`}
          animate={{ y: [0, -16, 0], rotate: [0, 90, 0], opacity: [0.25, 0.65, 0.25] }}
          transition={{ duration: 7, delay: s.delay, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Sparkles size={s.size} strokeWidth={1.25} />
        </motion.span>
      ))}

      <div className="relative container-custom">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-20">
          {/* Copy */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <span className="inline-flex items-center gap-2.5 rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.3em] text-primary">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
              {data.label}
            </span>

            <h2 className="heading-lg mt-6 text-white text-balance">{data.heading}</h2>
            <p className="mt-5 max-w-md font-body leading-relaxed text-white/60">{data.body}</p>

            <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3">
              {PERKS.map(({ icon: Icon, label }) => (
                <span key={label} className="flex items-center gap-2 font-body text-xs text-white/55">
                  <Icon size={14} className="text-primary" />
                  {label}
                </span>
              ))}
            </div>
          </motion.div>

          {/* Glass card */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="relative"
          >
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] p-8 backdrop-blur-xl shadow-[0_24px_80px_rgba(0,0,0,0.35)] md:p-10">
              {/* Top glow line */}
              <div aria-hidden className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

              {subscribed ? (
                <motion.div
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="flex flex-col items-center py-6 text-center"
                >
                  <div className="relative mb-6">
                    <motion.span
                      aria-hidden
                      className="absolute inset-0 rounded-full bg-primary/30"
                      animate={{ scale: [1, 1.9], opacity: [0.6, 0] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
                    />
                    <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary-light to-primary-dark shadow-[0_10px_36px_rgba(200,169,126,0.45)]">
                      <Check size={28} strokeWidth={3} className="text-white" />
                    </div>
                  </div>
                  <h3 className="font-heading text-2xl font-semibold text-white">{data.thankYou}</h3>
                  <p className="mt-2 font-body text-sm text-white/50">{data.note}</p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col">
                  <label
                    htmlFor="newsletter-email"
                    className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.25em] text-white/45"
                  >
                    Email address
                  </label>
                  <div className="relative">
                    <Mail aria-hidden size={16} className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-white/35" />
                    <input
                      id="newsletter-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={data.placeholder}
                      required
                      className="w-full rounded-full border border-white/15 bg-white/[0.07] py-4 pl-12 pr-6 font-body text-sm text-white outline-none transition-all duration-300 placeholder:text-white/30 focus:border-primary/70 focus:bg-white/[0.1] focus:shadow-[0_0_0_4px_rgba(200,169,126,0.18)]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="group relative mt-4 flex w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-gradient-to-r from-primary-light via-primary to-primary-dark py-4 font-body text-xs font-semibold uppercase tracking-[0.25em] text-white transition-all duration-300 hover:shadow-[0_12px_44px_rgba(200,169,126,0.45)] active:scale-[0.98] disabled:opacity-70"
                  >
                    {/* Shine sweep */}
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full"
                    />
                    {loading ? (
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    ) : (
                      <>
                        Subscribe
                        <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
                      </>
                    )}
                  </button>

                  <p className="mt-5 flex items-center justify-center gap-1.5 font-body text-xs text-white/40">
                    <MailCheck size={14} className="text-primary/70" />
                    {data.note}
                  </p>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
