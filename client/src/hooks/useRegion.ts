import { useCurrencyStore } from '../stores/currencyStore';

export type Region = 'IN' | 'US';

/**
 * Region derived from the active display currency (which is auto-detected and
 * user-overridable via the header toggle). Kept as a thin wrapper so existing
 * callers (checkout, etc.) keep working while there's one source of truth.
 */
export function useRegion() {
  const currency = useCurrencyStore((s) => s.currency);
  const region: Region = currency === 'USD' ? 'US' : 'IN';
  return { region, isIndia: region === 'IN', isUSA: region === 'US' };
}
