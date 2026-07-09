import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export const useScrollReveal = (options?: { y?: number; duration?: number; stagger?: number; delay?: number }) => {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const targets = el.querySelectorAll('[data-reveal]');
    if (targets.length === 0) {
      gsap.fromTo(el,
        { opacity: 0, y: options?.y ?? 40 },
        {
          opacity: 1, y: 0,
          duration: options?.duration ?? 0.8,
          delay: options?.delay ?? 0,
          ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none none' },
        }
      );
    } else {
      gsap.fromTo(targets,
        { opacity: 0, y: options?.y ?? 32 },
        {
          opacity: 1, y: 0,
          duration: options?.duration ?? 0.7,
          stagger: options?.stagger ?? 0.1,
          ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none none' },
        }
      );
    }

    return () => { ScrollTrigger.getAll().forEach((t) => t.kill()); };
  }, []);

  return ref;
};

export const useParallax = (speed = 0.3) => {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const tl = gsap.to(el, {
      yPercent: speed * 100,
      ease: 'none',
      scrollTrigger: {
        trigger: el.parentElement,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
      },
    });

    return () => { tl.kill(); };
  }, [speed]);

  return ref;
};

export const useTextReveal = () => {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const words = el.textContent?.split(' ') || [];
    el.innerHTML = words.map((w) => `<span style="display:inline-block;overflow:hidden"><span style="display:inline-block">${w}&nbsp;</span></span>`).join('');

    const spans = el.querySelectorAll('span > span');
    gsap.fromTo(spans,
      { y: '100%', opacity: 0 },
      {
        y: 0, opacity: 1,
        duration: 0.7,
        stagger: 0.04,
        ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 90%', toggleActions: 'play none none none' },
      }
    );

    return () => { ScrollTrigger.getAll().forEach((t) => t.kill()); };
  }, []);

  return ref;
};
