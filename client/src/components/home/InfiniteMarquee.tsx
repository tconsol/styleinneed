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

  // Soft fade at both edges so words emerge/vanish smoothly.
  const fade = 'linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent)';

  return (
    <div
      className={`group relative overflow-hidden py-4 ${className}`}
      style={{
        background: 'linear-gradient(90deg, rgb(var(--color-primary-dark)), rgb(var(--color-primary)) 50%, rgb(var(--color-primary-dark)))',
        maskImage: fade,
        WebkitMaskImage: fade,
      }}
    >
      <div
        className={`flex w-max items-center whitespace-nowrap will-change-transform group-hover:[animation-play-state:paused] ${
          reverse ? 'animate-marquee-reverse' : 'animate-marquee'
        }`}
        style={{ animationDuration: DURATIONS[speed] }}
      >
        {doubled.map((word, i) => (
          <span key={i} className="flex select-none items-center">
            <span className="px-6 font-heading text-sm font-bold uppercase tracking-[0.2em] text-white md:px-8 md:text-base">
              {word}
            </span>
            <Sparkle
              aria-hidden
              strokeWidth={1.75}
              className="h-3.5 w-3.5 flex-shrink-0 text-white/45 md:h-4 md:w-4"
            />
          </span>
        ))}
      </div>
    </div>
  );
}
