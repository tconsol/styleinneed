import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Check } from 'lucide-react';
import { newsletterApi } from '../../api/misc.api';
import toast from 'react-hot-toast';
import type { NewsletterCms } from '../../hooks/useHomepageCms';

interface Props { data: NewsletterCms; }

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
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="relative py-20 md:py-28 overflow-hidden bg-brand-text">
      {/* Decorative */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-10 left-10 w-64 h-64 rounded-full bg-primary blur-3xl" />
        <div className="absolute bottom-10 right-10 w-64 h-64 rounded-full bg-secondary blur-3xl" />
      </div>

      <div className="relative container-custom max-w-2xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="section-label text-primary mb-4">{data.label}</p>
          <h2 className="heading-md text-white mb-4">{data.heading}</h2>
          <p className="font-body text-white/60 mb-8 leading-relaxed">{data.body}</p>

          {subscribed ? (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center gap-3"
            >
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                <Check size={28} className="text-primary" />
              </div>
              <p className="font-body text-white/80">{data.thankYou}</p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="flex gap-0 max-w-md mx-auto">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={data.placeholder}
                required
                className="flex-1 px-5 py-4 bg-white/10 border border-white/20 text-white placeholder:text-white/40 font-body text-sm outline-none focus:border-primary transition-colors"
              />
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-4 bg-primary text-white font-body text-sm tracking-wider uppercase hover:bg-primary-dark transition-colors duration-200 disabled:opacity-70 flex-shrink-0"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                ) : (
                  <ArrowRight size={20} />
                )}
              </button>
            </form>
          )}

          <p className="font-body text-xs text-white/30 mt-4">{data.note}</p>
        </motion.div>
      </div>
    </section>
  );
}
