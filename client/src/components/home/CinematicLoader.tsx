import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { useUiStore } from '../../stores/uiStore';

export default function CinematicLoader() {
  const { isLoaderDone, setLoaderDone } = useUiStore();
  const counterRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (isLoaderDone) return;

    const tl = gsap.timeline({
      onComplete: () => {
        setTimeout(setLoaderDone, 400);
      },
    });

    tl.to(counterRef.current, {
      innerHTML: 100,
      duration: 1.8,
      ease: 'power2.inOut',
      snap: { innerHTML: 1 },
    }).to('.loader-bar', {
      scaleX: 1,
      duration: 1.8,
      ease: 'power2.inOut',
    }, '<');
  }, []);

  return (
    <AnimatePresence>
      {!isLoaderDone && (
        <motion.div
          exit={{ y: '-100%' }}
          transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1] }}
          className="fixed inset-0 z-[200] bg-brand-text flex flex-col items-center justify-center"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-center"
          >
            <h1 className="font-heading text-4xl md:text-6xl font-bold text-white tracking-widest mb-2">
              STYLE IN NEED
            </h1>
            <p className="font-body text-[10px] tracking-[0.5em] uppercase text-primary mb-12">
              FASHIONS
            </p>
          </motion.div>

          <div className="w-48 md:w-64 h-px bg-white/10 relative overflow-hidden">
            <div
              className="loader-bar absolute inset-0 bg-primary origin-left"
              style={{ transform: 'scaleX(0)' }}
            />
          </div>

          <div className="mt-6 flex items-end gap-1">
            <span ref={counterRef} className="font-body text-4xl font-light text-white/80 tabular-nums">
              0
            </span>
            <span className="font-body text-lg text-white/40 mb-1">%</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
