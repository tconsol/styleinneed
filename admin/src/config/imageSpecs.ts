/**
 * Recommended upload sizes, derived from the actual aspect-ratio containers the
 * storefront renders each image into. Uploading at these ratios means nothing
 * gets cropped or letterboxed by `object-cover`.
 *
 * Keep in sync with the client:
 *   product   -> .aspect-product (3/4) in client globals.css + PDP gallery
 *   category  -> ShopByCategory circle (1/1)
 *   collection-> CollectionBanner (4/3)
 *   hero      -> HeroSection full-bleed slide
 *   story     -> FashionStory (4/5)
 *   banner    -> announcement popup / promotion banner
 *   blog      -> BlogDetailPage cover (16/9)
 */
export interface ImageSpec {
  /** Ideal pixel width. */
  width: number;
  /** Ideal pixel height. */
  height: number;
  /** Human label for the ratio, e.g. "3:4". */
  ratio: string;
  /** Where it shows up on the storefront. */
  usedFor: string;
}

export const IMAGE_SPECS = {
  product:    { width: 1200, height: 1600, ratio: '3:4',   usedFor: 'Product cards & detail gallery' },
  category:   { width: 800,  height: 800,  ratio: '1:1',   usedFor: 'Category circles on the homepage' },
  collection: { width: 1600, height: 1200, ratio: '4:3',   usedFor: 'Collection banner sections' },
  hero:       { width: 1920, height: 1080, ratio: '16:9',  usedFor: 'Homepage hero slider' },
  story:      { width: 1000, height: 1250, ratio: '4:5',   usedFor: 'Fashion story section' },
  banner:     { width: 1200, height: 675,  ratio: '16:9',  usedFor: 'Announcement popup & sale banners' },
  blog:       { width: 1600, height: 900,  ratio: '16:9',  usedFor: 'Blog cover image' },
  feature:    { width: 1200, height: 1500, ratio: '4:5',   usedFor: 'Featured category tiles' },
} as const satisfies Record<string, ImageSpec>;

export type ImageSpecKey = keyof typeof IMAGE_SPECS;

/** How far a measured ratio may drift before we warn (≈5%). */
const RATIO_TOLERANCE = 0.05;

export interface RatioCheck {
  ok: boolean;
  width: number;
  height: number;
  message?: string;
}

/** Compare a real image's dimensions against a spec. */
export function checkRatio(spec: ImageSpec, width: number, height: number): RatioCheck {
  if (!width || !height) return { ok: true, width, height };
  const want = spec.width / spec.height;
  const got = width / height;
  const drift = Math.abs(got - want) / want;
  if (drift <= RATIO_TOLERANCE) {
    return width < spec.width * 0.75
      ? { ok: false, width, height, message: `Low resolution — ${spec.width}×${spec.height}px recommended for a sharp result.` }
      : { ok: true, width, height };
  }
  return {
    ok: false,
    width,
    height,
    message: `This is ${width}×${height}px (${got > want ? 'wider' : 'taller'} than ${spec.ratio}). It will be cropped to fit — ${spec.width}×${spec.height}px fits exactly.`,
  };
}

/** Read a picked file's pixel dimensions (before upload). */
export function readImageSize(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    // A file we can't decode shouldn't block the upload — report "unknown".
    img.onerror = () => { resolve({ width: 0, height: 0 }); URL.revokeObjectURL(url); };
    img.src = url;
  });
}
