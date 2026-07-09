// Keyword → Unsplash image for category cards (used when a category has no
// admin-uploaded image). Falls back to a rotating set of fashion shots.
const Q = '?w=600&q=80&auto=format&fit=crop';

const MAP: { kw: string[]; url: string }[] = [
  { kw: ['silk saree'], url: `https://images.unsplash.com/photo-1610030469983-98e550d6193c${Q}` },
  { kw: ['cotton saree'], url: `https://images.unsplash.com/photo-1614093302611-8efc4c438a87${Q}` },
  { kw: ['designer saree'], url: `https://images.unsplash.com/photo-1583391733956-6c78276477e1${Q}` },
  { kw: ['saree'], url: `https://images.unsplash.com/photo-1610030469983-98e550d6193c${Q}` },
  { kw: ['kurti', 'kurta'], url: `https://images.unsplash.com/photo-1595777457583-95e059d581b8${Q}` },
  { kw: ['lehenga'], url: `https://images.unsplash.com/photo-1610189000936-7c1b3b3a4f6b${Q}` },
  { kw: ['salwar', 'suit'], url: `https://images.unsplash.com/photo-1591130901921-3f0652bb3915${Q}` },
  { kw: ['dress', 'top', 'western', 'co-ord', 'jeans'], url: `https://images.unsplash.com/photo-1515372039744-b8f02a3ae446${Q}` },
  { kw: ['necklace'], url: `https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f${Q}` },
  { kw: ['earring'], url: `https://images.unsplash.com/photo-1635767798638-3e25273a8236${Q}` },
  { kw: ['bangle', 'bracelet'], url: `https://images.unsplash.com/photo-1611591437281-460bfbe1220a${Q}` },
  { kw: ['jewel'], url: `https://images.unsplash.com/photo-1535632066927-ab7c9ab60908${Q}` },
  { kw: ['gift', 'return'], url: `https://images.unsplash.com/photo-1513885535751-8b9238bd345a${Q}` },
];

const FALLBACK = [
  `https://images.unsplash.com/photo-1490481651871-ab68de25d43d${Q}`,
  `https://images.unsplash.com/photo-1483985988355-763728e1935b${Q}`,
  `https://images.unsplash.com/photo-1469334031218-e382a71b716b${Q}`,
];

export const categoryImage = (name: string, index = 0): string => {
  const n = name.toLowerCase();
  const hit = MAP.find((m) => m.kw.some((k) => n.includes(k)));
  return hit ? hit.url : FALLBACK[index % FALLBACK.length];
};
