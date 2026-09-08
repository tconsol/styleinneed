/**
 * Save a Blob response (CSV/XLSX export) as a file.
 *
 * The object URL is revoked after the click so the blob can be garbage
 * collected — without it a few large exports leak memory for the session.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** `prefix-YYYY-MM-DD.csv` */
export const stampedName = (prefix: string, ext = 'csv'): string =>
  `${prefix}-${new Date().toISOString().slice(0, 10)}.${ext}`;
