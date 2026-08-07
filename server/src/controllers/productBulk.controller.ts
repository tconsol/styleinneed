import { Request, Response, NextFunction } from 'express';
import ExcelJS from 'exceljs';
import slugify from 'slugify';
import Product from '../models/Product';
import Category from '../models/Category';
import Attribute from '../models/Attribute';
import ProductType from '../models/ProductType';
import { AuthRequest } from '../types';
import { emitEvent, SOCKET_EVENTS } from '../config/socket';
import { sendError, sendSuccess } from '../utils/apiResponse';

// A single spreadsheet column, tagged with how it maps onto the product model.
interface Col {
  header: string;
  kind: 'base' | 'pattr' | 'vbase' | 'vattr';
  field?: string; // for base / vbase
  slug?: string;  // for attribute columns
  example?: string;
}

const BASE_COLS: Col[] = [
  { header: 'Name', kind: 'base', field: 'name', example: 'Kanjeevaram Silk Saree' },
  { header: 'ShortDescription', kind: 'base', field: 'shortDescription', example: 'Handwoven pure silk saree' },
  { header: 'Description', kind: 'base', field: 'description', example: 'Traditional Kanjeevaram saree with gold zari border.' },
  { header: 'Category', kind: 'base', field: 'category', example: 'Sarees' },
  { header: 'Subcategory', kind: 'base', field: 'subcategory', example: '' },
  { header: 'MRP', kind: 'base', field: 'mrp', example: '4999' },
  { header: 'SalePrice', kind: 'base', field: 'salePrice', example: '3499' },
  { header: 'USD_MRP', kind: 'base', field: 'usdMrp', example: '' },
  { header: 'USD_SalePrice', kind: 'base', field: 'usdSalePrice', example: '' },
  { header: 'ReturnDays', kind: 'base', field: 'returnDays', example: '7' },
  { header: 'WeightGrams', kind: 'base', field: 'weightGrams', example: '650' },
  { header: 'Tags', kind: 'base', field: 'tags', example: 'silk, festive, bridal' },
  { header: 'Images', kind: 'base', field: 'images', example: 'https://img1.jpg, https://img2.jpg' },
  { header: 'Featured', kind: 'base', field: 'isFeatured', example: 'no' },
  { header: 'NewArrival', kind: 'base', field: 'isNewArrival', example: 'yes' },
  { header: 'BestSeller', kind: 'base', field: 'isBestSeller', example: 'no' },
  { header: 'Trending', kind: 'base', field: 'isTrending', example: 'no' },
];

const VARIANT_BASE: Col[] = [
  { header: 'SKU', kind: 'vbase', field: 'sku', example: 'KANJ-RED-M' },
  { header: 'Stock', kind: 'vbase', field: 'stock', example: '10' },
  { header: 'VariantImages', kind: 'vbase', field: 'images', example: '' },
];

// Resolve the columns for a product type: base + its product-level attrs +
// variant base + its variant-level attrs.
const columnsForType = async (typeSlug: string): Promise<Col[]> => {
  const attrs = await Attribute.find({
    isActive: true,
    $or: [{ productTypes: typeSlug }, { productTypes: { $size: 0 } }],
  }).sort({ sortOrder: 1 }).lean();

  const productAttrs: Col[] = attrs.filter((a) => a.level === 'product').map((a) => ({
    header: a.name, kind: 'pattr', slug: a.slug,
    example: a.options?.slice(0, 2).map((o) => o.value).join(', ') || '',
  }));
  const variantAttrs: Col[] = attrs.filter((a) => a.level === 'variant').map((a) => ({
    header: a.name, kind: 'vattr', slug: a.slug,
    example: a.options?.[0]?.value || '',
  }));

  return [...BASE_COLS, ...productAttrs, ...VARIANT_BASE, ...variantAttrs];
};

const toBool = (v: unknown): boolean => /^(yes|y|true|1)$/i.test(String(v ?? '').trim());
const toList = (v: unknown): string[] => String(v ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const cell = (v: unknown): string => {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object' && 'text' in (v as object)) return String((v as { text: string }).text).trim();
  if (typeof v === 'object' && 'result' in (v as object)) return String((v as { result: unknown }).result).trim();
  return String(v).trim();
};

// ── Template download ──
export const downloadTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const type = String(req.query.type || 'clothing');
    const ptype = await ProductType.findOne({ slug: type });
    const cols = await columnsForType(type);

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Products');
    ws.columns = cols.map((c) => ({ header: c.header, key: c.header, width: Math.max(14, Math.min(40, c.header.length + 6)) }));

    // Header styling
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
    ws.getRow(1).alignment = { vertical: 'middle' };
    ws.getRow(1).height = 22;

    // Two example rows: one product with two variants (same Name).
    const ex1: Record<string, string> = {};
    cols.forEach((c) => { ex1[c.header] = c.example || ''; });
    const ex2: Record<string, string> = { ...ex1 };
    // Second variant row: same product, only variant fields differ.
    cols.forEach((c) => { if (c.kind === 'base' || c.kind === 'pattr') ex2[c.header] = c.header === 'Name' ? ex1['Name'] : ''; });
    ex2['SKU'] = 'KANJ-RED-L'; ex2['Stock'] = '6';
    ws.addRow(ex1); ws.addRow(ex2);
    ws.getRow(2).font = { italic: true, color: { argb: 'FF64748B' } };
    ws.getRow(3).font = { italic: true, color: { argb: 'FF64748B' } };

    // Instructions sheet
    const info = wb.addWorksheet('Instructions');
    info.columns = [{ width: 30 }, { width: 80 }];
    const note = (a: string, b: string) => info.addRow([a, b]);
    info.addRow([`Bulk Product Import — ${ptype?.name || type}`]).font = { bold: true, size: 14 };
    info.addRow([]);
    note('One row = one variant', 'Rows sharing the same Name are combined into a single product with multiple variants.');
    note('Product fields', 'Name, prices, description, category, images, tags, flags — fill on the FIRST row of each product.');
    note('Variant fields', 'SKU, Stock, VariantImages and variant attributes (e.g. Size, Color) — fill on EVERY row.');
    note('Images', 'Comma-separated image URLs. Product Images are required (or provide VariantImages).');
    note('Category', 'Enter the category NAME or slug. It must already exist for this product type.');
    note('Flags', 'Featured / NewArrival / BestSeller / Trending — use yes / no.');
    note('List attributes', 'Product-level attributes accept comma-separated values. Variant attributes take a single value.');
    info.addRow([]);
    info.addRow(['Available categories']).font = { bold: true };
    const cats = await Category.find({ isActive: true, ...(type ? { productType: type } : {}) }).select('name slug').lean();
    cats.forEach((c) => info.addRow([c.name, c.slug]));

    const buffer = await wb.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="product-template-${type}.xlsx"`);
    res.send(Buffer.from(buffer));
  } catch (err) {
    next(err);
  }
};

// ── Bulk upload ──
export const bulkUpload = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const file = req.file as Express.Multer.File | undefined;
    if (!file) { sendError(res, 'No file uploaded', 400); return; }
    const type = String(req.body.type || 'clothing');

    const cols = await columnsForType(type);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(file.buffer as unknown as ArrayBuffer);
    const ws = wb.getWorksheet('Products') || wb.worksheets[0];
    if (!ws) { sendError(res, 'No worksheet found', 400); return; }

    // Map header text -> column meta (by the header row).
    const headerRow = ws.getRow(1);
    const idxToCol = new Map<number, Col>();
    headerRow.eachCell((c, colNumber) => {
      const h = cell(c.value);
      const meta = cols.find((cc) => cc.header.toLowerCase() === h.toLowerCase());
      if (meta) idxToCol.set(colNumber, meta);
    });
    if (![...idxToCol.values()].some((c) => c.field === 'name')) {
      sendError(res, 'Template headers not recognised. Download the template for this product type.', 400); return;
    }

    // Category lookup (name or slug, case-insensitive) for this type.
    const cats = await Category.find({ ...(type ? { productType: type } : {}) }).select('name slug').lean();
    const catByKey = new Map<string, string>();
    cats.forEach((c) => { catByKey.set(c.name.toLowerCase(), String(c._id)); catByKey.set(c.slug.toLowerCase(), String(c._id)); });

    // Read every data row into a flat record keyed by field/slug.
    interface RowData { rowNum: number; base: Record<string, string>; pattr: Record<string, string>; vbase: Record<string, string>; vattr: Record<string, string> }
    const rows: RowData[] = [];
    ws.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const base: Record<string, string> = {}, pattr: Record<string, string> = {}, vbase: Record<string, string> = {}, vattr: Record<string, string> = {};
      let any = false;
      row.eachCell((c, colNumber) => {
        const meta = idxToCol.get(colNumber);
        if (!meta) return;
        const val = cell(c.value);
        if (val) any = true;
        if (meta.kind === 'base') base[meta.field!] = val;
        else if (meta.kind === 'pattr') pattr[meta.slug!] = val;
        else if (meta.kind === 'vbase') vbase[meta.field!] = val;
        else if (meta.kind === 'vattr') vattr[meta.slug!] = val;
      });
      if (any) rows.push({ rowNum: rowNumber, base, pattr, vbase, vattr });
    });

    // Group rows by product Name (carry the last-seen product fields forward so
    // variant-only rows inherit the product they belong to).
    interface Group { rowNum: number; base: Record<string, string>; pattr: Record<string, string>; variants: { vbase: Record<string, string>; vattr: Record<string, string>; rowNum: number }[] }
    const groups: Group[] = [];
    let current: Group | null = null;
    for (const r of rows) {
      const name = r.base.name;
      if (name) {
        current = { rowNum: r.rowNum, base: r.base, pattr: r.pattr, variants: [] };
        groups.push(current);
      }
      if (!current) continue; // variant row before any product row — skip
      current.variants.push({ vbase: r.vbase, vattr: r.vattr, rowNum: r.rowNum });
    }

    const created: string[] = [];
    const failed: { row: number; name: string; error: string }[] = [];

    for (const g of groups) {
      const name = g.base.name;
      try {
        const categoryId = catByKey.get(String(g.base.category || '').toLowerCase());
        if (!categoryId) throw new Error(`Category "${g.base.category}" not found for this product type`);
        const mrp = Number(g.base.mrp); const salePrice = Number(g.base.salePrice);
        if (!mrp || !salePrice) throw new Error('MRP and SalePrice are required numbers');
        if (!g.base.description || !g.base.shortDescription) throw new Error('Description and ShortDescription are required');

        const slugBase = slugify(name, { lower: true, strict: true });
        const variantImgs = new Set<string>();
        const variants = g.variants
          .filter((v) => Object.values(v.vbase).some(Boolean) || Object.values(v.vattr).some(Boolean))
          .map((v, i) => {
            const imgs = toList(v.vbase.images); imgs.forEach((u) => variantImgs.add(u));
            const attrs: Record<string, string> = {};
            Object.entries(v.vattr).forEach(([k, val]) => { if (val) attrs[k] = val; });
            return { sku: v.vbase.sku || `${slugBase}-${i + 1}`.toUpperCase(), stock: Number(v.vbase.stock) || 0, images: imgs, attributes: attrs };
          });
        // No explicit variant rows → one default variant.
        if (variants.length === 0) variants.push({ sku: `${slugBase}-1`.toUpperCase(), stock: 0, images: [], attributes: {} });

        const images = toList(g.base.images);
        const allImages = images.length ? images : [...variantImgs];
        if (allImages.length === 0) throw new Error('At least one product image (Images) is required');

        const productAttrs: Record<string, string[]> = {};
        Object.entries(g.pattr).forEach(([k, val]) => { const list = toList(val); if (list.length) productAttrs[k] = list; });

        const doc = await Product.create({
          name,
          slug: `${slugBase}-${Date.now().toString(36)}`,
          description: g.base.description,
          shortDescription: g.base.shortDescription,
          productType: type,
          category: categoryId,
          subcategory: g.base.subcategory || undefined,
          attributes: productAttrs,
          mrp, salePrice,
          usdMrp: g.base.usdMrp ? Number(g.base.usdMrp) : undefined,
          usdSalePrice: g.base.usdSalePrice ? Number(g.base.usdSalePrice) : undefined,
          returnDays: g.base.returnDays ? Number(g.base.returnDays) : 7,
          weightGrams: g.base.weightGrams ? Number(g.base.weightGrams) : undefined,
          tags: toList(g.base.tags),
          images: allImages,
          variants,
          provider: req.user?.role === 'provider' ? req.user.providerRef : undefined,
          isFeatured: toBool(g.base.isFeatured),
          isNewArrival: toBool(g.base.isNewArrival),
          isBestSeller: toBool(g.base.isBestSeller),
          isTrending: toBool(g.base.isTrending),
        });
        created.push(doc.name);
      } catch (e) {
        failed.push({ row: g.rowNum, name: name || '(unnamed)', error: e instanceof Error ? e.message : 'Failed' });
      }
    }

    if (created.length) emitEvent(SOCKET_EVENTS.productCreated, { bulk: created.length });
    sendSuccess(res, `Imported ${created.length} product(s), ${failed.length} failed`, { created: created.length, failed });
  } catch (err) {
    next(err);
  }
};
