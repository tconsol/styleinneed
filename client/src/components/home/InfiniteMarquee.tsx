interface Props {
  items: string[];
  speed?: 'slow' | 'normal' | 'fast';
  reverse?: boolean;
  className?: string;
}

export default function InfiniteMarquee({ items, reverse = false, className = '' }: Props) {
  const doubled = [...items, ...items];
  return (
    <div className={`overflow-hidden py-4 border-y border-brand-border ${className}`}>
      <div className={`flex whitespace-nowrap gap-8 ${reverse ? 'animate-marquee-reverse' : 'animate-marquee'}`}>
        {doubled.map((item, i) => (
          <span key={i} className="font-heading text-lg md:text-xl italic text-brand-muted/50 select-none flex-shrink-0">
            {item} &nbsp;<span style={{fontSize:'0.6em',verticalAlign:'middle',opacity:0.6}}>&#9670;</span>
          </span>
        ))}
      </div>
    </div>
  );
}
