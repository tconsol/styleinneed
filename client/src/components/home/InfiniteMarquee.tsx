import { Sparkle } from 'lucide-react';

interface Props {
  items: string[];
  speed?: 'slow' | 'normal' | 'fast';
  reverse?: boolean;
  className?: string;
}

const DURATIONS: Record<'slow' | 'normal' | 'fast', string> = {
  slow: '45s',
  normal: '32s',
  fast: '22s',
};

export default function InfiniteMarquee({ items, speed = 'normal', reverse = false, className = '' }: Props) {
  if (items.length === 0) return null;
  const doubled = [...items, ...items];

  return (
    <div className={`group relative overflow-hidden bg-brand-bg py-5 md:py-8 ${className}`}>
      {/* Edge fades so the strip never feels clipped */}
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-brand-bg to-transparent sm:w-28" />
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-brand-bg to-transparent sm:w-28" />

      <div
        className={`flex w-max items-center whitespace-nowrap will-change-transform group-hover:[animation-play-state:paused] ${
          reverse ? 'animate-marquee-reverse' : 'animate-marquee'
        }`}
        style={{ animationDuration: DURATIONS[speed] }}
      >
        {doubled.map((word, i) => {
          // Alternating solid / outlined words, consistent across the loop seam.
          const outlined = (i % items.length) % 2 === 1;
          return (
            <span key={i} className="flex select-none items-center">
              <span
                className={`font-heading text-5xl font-bold uppercase leading-none tracking-tight sm:text-6xl md:text-7xl xl:text-8xl ${
                  outlined ? 'text-transparent' : 'text-brand-text'
                }`}
                style={outlined ? { WebkitTextStroke: '1.5px rgb(var(--color-text) / 0.55)' } : undefined}
              >
                {word}
              </span>
              <Sparkle
                aria-hidden
                strokeWidth={1.25}
                className="mx-5 h-6 w-6 flex-shrink-0 text-primary md:mx-9 md:h-8 md:w-8"
              />
            </span>
          );
        })}
      </div>
    </div>
  );
}
