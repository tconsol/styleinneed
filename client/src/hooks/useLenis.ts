import { useEffect } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

let lenisInstance: Lenis | null = null;

export const getLenis = () => lenisInstance;

export const useLenis = () => {
  useEffect(() => {
    // Mobile-first: use NATIVE scroll on touch / small screens. Lenis smooth
    // wheel is a desktop enhancement; on phones it fights touch scrolling and
    // can make pages feel stuck. Desktop only.
    const isTouch =
      window.matchMedia('(hover: none), (pointer: coarse)').matches ||
      window.innerWidth < 1024;
    if (isTouch) return;

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      smoothWheel: true,
      // Let native scroll take over inside any element marked data-lenis-prevent
      // (filter sidebars, modals, dropdowns, etc.)
      prevent: (node) => node.closest('[data-lenis-prevent]') !== null,
    });

    lenisInstance = lenis;

    const onScroll = () => ScrollTrigger.update();
    lenis.on('scroll', onScroll);

    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(raf);
      lenis.off('scroll', onScroll);
      lenis.destroy();
      lenisInstance = null;
    };
  }, []);
};
