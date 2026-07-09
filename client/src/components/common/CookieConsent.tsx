import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie } from 'lucide-react';

const KEY = 'cookie-consent';

export default function CookieConsent() {
  // Only show until the user makes a choice — never again afterwards.
  const [show, setShow] = useState(() => !localStorage.getItem(KEY));

  const decide = (value: 'accepted' | 'declined') => {
    localStorage.setItem(KEY, value);
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'tween', duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="fixed bottom-4 inset-x-4 md:inset-x-auto md:right-6 md:max-w-md z-[80]"
        >
          <div className="bg-white border border-brand-border rounded-2xl shadow-luxury p-5">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Cookie size={18} className="text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-heading text-sm font-semibold text-brand-text">We use cookies</p>
                <p className="font-body text-[12px] text-brand-muted mt-1 leading-relaxed">
                  We use cookies and local caching to keep you signed in, remember your cart,
                  and make the store faster. By accepting you agree to this.
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => decide('declined')} className="btn-outline flex-1 justify-center text-xs py-2.5 rounded-full">
                Decline
              </button>
              <button onClick={() => decide('accepted')} className="btn-primary flex-1 justify-center text-xs py-2.5 rounded-full">
                Accept
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
