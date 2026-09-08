import { Response } from 'express';

/**
 * Escape one CSV cell.
 *
 * Values starting with =, +, -, @ (or a leading tab/CR) are prefixed with a
 * quote so spreadsheet apps treat them as text — otherwise a crafted value
 * like `=cmd|...` becomes a live formula when the export is opened (CSV
 * injection). Quotes are doubled and the whole cell wrapped.
 */
const cell = (value: unknown): string => {
  if (value == null) return '';
  let s = String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => unknown;
}

/** Build a CSV string from rows + column definitions. */
export const toCsv = <T>(rows: T[], columns: CsvColumn<T>[]): string => {
  const head = columns.map((c) => cell(c.header)).join(',');
  const body = rows.map((r) => columns.map((c) => cell(c.value(r))).join(','));
  return [head, ...body].join('\r\n');
};

/** Send a CSV as a file download. BOM keeps Excel happy with UTF-8 (₹, é...). */
export const sendCsv = (res: Response, filename: string, csv: string): void => {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${safe}"`);
  res.send(`﻿${csv}`);
};

/** `YYYY-MM-DD` stamp for export filenames. */
export const dateStamp = (): string => new Date().toISOString().slice(0, 10);
