/**
 * Phone normalisation for WhatsApp.
 *
 * Every number we hold arrives in a different shape — "9876543210",
 * "+91 98765-43210", "09876543210", "919876543210" are all the same person.
 * De-duplicating an audience is only correct if they all collapse to one
 * canonical form first, so this is the single place that decides what that is.
 *
 * Canonical form is E.164 digits with no "+" (e.g. "919876543210"), which is
 * what Meta's Cloud API `to` field expects.
 */

const DEFAULT_CC = (): string => (process.env.WHATSAPP_DEFAULT_COUNTRY_CODE || '91').replace(/\D/g, '');

/** Longest national number anywhere is 15 digits (ITU E.164). */
const MAX_E164 = 15;
const MIN_E164 = 8;

export const normalisePhone = (raw?: string | null): string | null => {
  if (!raw) return null;

  const trimmed = String(raw).trim();
  const hadPlus = trimmed.startsWith('+') || trimmed.startsWith('00');
  let digits = trimmed.replace(/\D/g, '');
  if (!digits) return null;

  // "00" is the international prefix in much of the world — same meaning as "+".
  if (trimmed.startsWith('00')) digits = digits.slice(2);

  const cc = DEFAULT_CC();

  if (!hadPlus) {
    // A bare national number: strip a trunk "0" and attach the default country
    // code. Only done when the number is clearly national length, so a genuine
    // international number typed without "+" is left alone.
    if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
    if (digits.length === 10) digits = cc + digits;
  }

  if (digits.length < MIN_E164 || digits.length > MAX_E164) return null;
  // A number that is all one repeated digit is placeholder data, not a person.
  if (/^(\d)\1+$/.test(digits)) return null;

  return digits;
};

/** "919876543210" -> "+91 98765 43210" for display. */
export const formatPhone = (e164?: string | null): string => {
  const digits = String(e164 || '').replace(/\D/g, '');
  if (!digits) return '';
  const cc = DEFAULT_CC();
  if (digits.startsWith(cc) && digits.length === cc.length + 10) {
    const n = digits.slice(cc.length);
    return `+${cc} ${n.slice(0, 5)} ${n.slice(5)}`;
  }
  return `+${digits}`;
};

/** True when the number sits in the configured default country. */
export const isDefaultCountry = (e164?: string | null): boolean => {
  const digits = String(e164 || '').replace(/\D/g, '');
  const cc = DEFAULT_CC();
  return digits.startsWith(cc) && digits.length === cc.length + 10;
};
