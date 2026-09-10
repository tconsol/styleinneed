import ExcelJS from 'exceljs';
import MarketingContact from '../models/MarketingContact';
import { normalisePhone, formatPhone } from './phone';
import { Types } from 'mongoose';

/**
 * Spreadsheet import shared by the email and WhatsApp consoles.
 *
 * Both work the same way: read one column of contacts plus an optional name,
 * normalise, drop anything invalid, and skip what we already hold. Every
 * rejected row is reported with its row number and the reason — an import that
 * silently drops 200 rows is worse than one that fails loudly.
 */

export type ImportKind = 'email' | 'phone';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ImportRowError {
  row: number;
  value: string;
  reason: string;
}

export interface ImportResult {
  /** Rows with data, excluding the header. */
  read: number;
  imported: number;
  /** Valid, but already in the imported list. */
  duplicates: number;
  invalid: number;
  errors: ImportRowError[];
  listName: string;
}

const HEADER_ALIASES: Record<ImportKind, string[]> = {
  email: ['email', 'email address', 'e-mail', 'mail', 'email id'],
  phone: ['phone', 'phone number', 'mobile', 'mobile number', 'number', 'whatsapp', 'contact'],
};

const NAME_ALIASES = ['name', 'full name', 'customer name', 'first name'];

const headerIndex = (row: ExcelJS.Row, aliases: string[]): number => {
  let found = -1;
  row.eachCell((cell, col) => {
    if (found !== -1) return;
    const text = String(cell.value ?? '').trim().toLowerCase();
    if (aliases.includes(text)) found = col;
  });
  return found;
};

/** ExcelJS hands back hyperlink/rich-text objects for some cells, not strings. */
const cellText = (cell: ExcelJS.Cell | undefined): string => {
  const v = cell?.value;
  if (v == null) return '';
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'object') {
    const o = v as unknown as Record<string, unknown>;
    if (typeof o.text === 'string') return o.text.trim();
    if (typeof o.result === 'string') return o.result.trim();
    if (Array.isArray(o.richText)) {
      return (o.richText as { text: string }[]).map((r) => r.text).join('').trim();
    }
    return '';
  }
  return String(v).trim();
};

export const parseContactSheet = async (
  buffer: Buffer,
  kind: ImportKind,
  listName: string,
  importedBy?: Types.ObjectId
): Promise<ImportResult> => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as ArrayBuffer);

  const ws = wb.worksheets[0];
  if (!ws) throw new Error('The file has no sheets');

  const header = ws.getRow(1);
  let valueCol = headerIndex(header, HEADER_ALIASES[kind]);
  const nameCol = headerIndex(header, NAME_ALIASES);

  // No recognised header — assume the first column is the contact, so a plain
  // one-column paste still works.
  if (valueCol === -1) valueCol = 1;

  const errors: ImportRowError[] = [];
  const seen = new Set<string>();
  const candidates: { value: string; name?: string }[] = [];
  let read = 0;
  let invalid = 0;

  const headerLooksLikeHeader = HEADER_ALIASES[kind]
    .includes(cellText(header.getCell(valueCol)).toLowerCase());

  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1 && headerLooksLikeHeader) return;

    const raw = cellText(row.getCell(valueCol));
    if (!raw) return; // genuinely blank row — not an error
    read += 1;

    const name = nameCol > 0 ? cellText(row.getCell(nameCol)) : '';

    let value: string | null = null;
    if (kind === 'email') {
      const lower = raw.toLowerCase();
      value = EMAIL_RE.test(lower) ? lower : null;
    } else {
      value = normalisePhone(raw);
    }

    if (!value) {
      invalid += 1;
      if (errors.length < 100) {
        errors.push({
          row: rowNumber,
          value: raw.slice(0, 60),
          reason: kind === 'email' ? 'Not a valid email address' : 'Not a valid phone number',
        });
      }
      return;
    }

    // Duplicates inside the file itself never reach the database.
    if (seen.has(value)) return;
    seen.add(value);
    candidates.push({ value, name: name || undefined });
  });

  if (candidates.length === 0) {
    return { read, imported: 0, duplicates: 0, invalid, errors, listName };
  }

  const field = kind === 'email' ? 'email' : 'phone';
  const existing = await MarketingContact.find(
    { [field]: { $in: candidates.map((c) => c.value) } }
  ).select(field).lean();
  const already = new Set(existing.map((e) => String((e as Record<string, unknown>)[field])));

  const fresh = candidates.filter((c) => !already.has(c.value));

  if (fresh.length) {
    await MarketingContact.insertMany(
      fresh.map((c) => ({ [field]: c.value, name: c.name, listName, importedBy })),
      // A concurrent import of the same number shouldn't abort the whole batch.
      { ordered: false }
    ).catch(() => { /* unique-index races are duplicates, already counted */ });
  }

  return {
    read,
    imported: fresh.length,
    duplicates: candidates.length - fresh.length,
    invalid,
    errors,
    listName,
  };
};

/**
 * The blank sheet an admin downloads, fills in and uploads back.
 *
 * Ships with worked examples and an instructions sheet, because the commonest
 * import failure is a file shaped the wrong way rather than bad data.
 */
export const buildImportTemplate = async (kind: ImportKind): Promise<Buffer> => {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Style In Need';
  wb.created = new Date();

  const isEmail = kind === 'email';
  const label = isEmail ? 'Email' : 'Phone';

  const ws = wb.addWorksheet('Contacts');
  ws.columns = [
    { header: label, key: 'value', width: 34 },
    { header: 'Name', key: 'name', width: 26 },
  ];

  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF25D366' } };
  ws.getRow(1).height = 20;

  const examples = isEmail
    ? [['priya@example.com', 'Priya Sharma'], ['anitha.reddy@example.com', 'Anitha Reddy'], ['rahul@example.com', '']]
    : [['9876543210', 'Priya Sharma'], ['+91 98765 43211', 'Anitha Reddy'], ['919876543212', '']];

  examples.forEach((e) => {
    const row = ws.addRow(e);
    row.font = { italic: true, color: { argb: 'FF9AA0A6' } };
  });

  ws.addRow([]);
  const note = ws.addRow(['↑ Delete these three sample rows before uploading']);
  note.font = { bold: true, color: { argb: 'FFD93025' } };

  /* Instructions */
  const info = wb.addWorksheet('How to use');
  info.columns = [{ width: 26 }, { width: 86 }];

  const title = info.addRow([`${isEmail ? 'Email' : 'WhatsApp'} contact import`]);
  title.font = { bold: true, size: 14 };
  info.addRow([]);

  const rows: [string, string][] = [
    ['Sheet', 'Fill in the first sheet, "Contacts". Other sheets are ignored.'],
    [`${label} column`, `Required. One contact per row.`],
    ['Name column', 'Optional. Used to personalise the message where the template allows it.'],
    ['Duplicates', 'Handled for you — repeats inside the file, and contacts already stored, are skipped.'],
    ['Invalid rows', 'Skipped and listed back to you with their row numbers. The rest still import.'],
    ['File size', 'Up to 8 MB (.xlsx, .xls or .csv).'],
  ];

  if (isEmail) {
    rows.push(
      ['Format', 'Anything shaped name@domain.com. Case is ignored.'],
      ['Unsubscribes', 'Someone who has unsubscribed stays suppressed even if you import them again.']
    );
  } else {
    rows.push(
      ['Format', 'Any of these work — they are all stored as the same contact:'],
      ['', '9876543210    +91 98765 43210    919876543210    09876543210'],
      ['Country code', 'A bare 10-digit number is treated as +91 (India). Include + for other countries.'],
      ['Opt-outs', 'A number on the block list stays blocked even if you import it again.']
    );
  }

  rows.forEach(([a, b]) => {
    const r = info.addRow([a, b]);
    r.getCell(1).font = { bold: true };
    r.getCell(2).alignment = { wrapText: true };
  });

  info.addRow([]);
  const example = info.addRow(['Example', `${formatPhone('919876543210')} imports the same as 9876543210`]);
  example.getCell(1).font = { bold: true };
  if (isEmail) example.getCell(2).value = 'PRIYA@Example.com imports the same as priya@example.com';

  return Buffer.from(await wb.xlsx.writeBuffer());
};
