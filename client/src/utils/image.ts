const API_BASE = import.meta.env.VITE_API_URL;

/**
 * Bumped whenever the thumbnail response changes in a way a cached copy would
 * get wrong.
 *
 * Responses are `immutable, max-age=30d`, so a browser that cached a broken one
 * would keep serving it for a month — that is exactly what happened when the
 * proxy first shipped without a cross-origin resource policy: the bytes cached
 * fine but the browser refused to render them. Changing this changes the cache
 * key, so those copies are abandoned rather than waited out.
 */
const THUMB_VERSION = 2;

/** Widths the server will actually render — anything else is snapped to one. */
export type ThumbWidth = 80 | 160 | 240 | 320 | 480 | 640 | 960;

/**
 * A resized version of a stored product image.
 *
 * Originals are up to 1600px and ~200 KB each, which is far more than a tile
 * or a card needs — four of them in a mega menu was ~840 KB per hover. The
 * server resizes and caches, so this costs nothing after the first request.
 *
 * Anything that isn't one of our own stored images (a placeholder, a data URI,
 * a remote URL) is returned untouched — the proxy would refuse it anyway.
 */
export const thumb = (url: string | undefined, width: ThumbWidth): string => {
  if (!url) return '/placeholder.jpg';
  if (!url.startsWith('https://storage.googleapis.com/')) return url;
  return `${API_BASE}/images/thumb?v=${THUMB_VERSION}&w=${width}&url=${encodeURIComponent(url)}`;
};

/**
 * A `srcset` for retina screens: the same image at 1× and 2×.
 * Pair with a `sizes` hint so the browser picks before layout.
 */
export const thumbSrcSet = (url: string | undefined, width: ThumbWidth, retina: ThumbWidth): string => {
  if (!url || !url.startsWith('https://storage.googleapis.com/')) return '';
  return `${thumb(url, width)} 1x, ${thumb(url, retina)} 2x`;
};
