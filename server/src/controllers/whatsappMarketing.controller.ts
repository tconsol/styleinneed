import { Request, Response, NextFunction } from 'express';
import User from '../models/User';
import Order from '../models/Order';
import WhatsAppCampaign from '../models/WhatsAppCampaign';
import WhatsAppOptOut from '../models/WhatsAppOptOut';
import WhatsAppTemplate from '../models/WhatsAppTemplate';
import MarketingContact from '../models/MarketingContact';
import AuditLog from '../models/AuditLog';
import { AuthRequest } from '../types';
import { sendSuccess, sendError, getPagination } from '../utils/apiResponse';
import { normalisePhone, formatPhone, isDefaultCountry } from '../utils/phone';
import { sendWhatsAppTemplate, sendWhatsAppBulk, isWhatsAppConfigured, listMetaTemplates, canListTemplates } from '../services/whatsapp.service';
import { toCsv, sendCsv, dateStamp } from '../utils/csv';
import { parseContactSheet, buildImportTemplate } from '../utils/contactImport';
import { uploadMediaToGCS } from '../config/gcs';
import logger from '../utils/logger';

export type PhoneSource = 'registrations' | 'orders' | 'imported';

interface AudienceEntry {
  phone: string;
  display: string;
  name?: string;
  sources: PhoneSource[];
  orders: number;
}

/**
 * Every WhatsApp-reachable number we hold, tagged with where it came from.
 *
 * Numbers are normalised to E.164 first (see utils/phone), so "9876543210",
 * "+91 98765 43210" and "919876543210" collapse to a single contact rather than
 * three. A customer who registered *and* ordered appears once, carrying both
 * sources.
 *
 * Opted-out numbers are removed entirely, whichever source they appear in.
 */
const buildAudience = async () => {
  const [registered, orders, imported, optedOut] = await Promise.all([
    User.find({ role: 'customer', isGuest: { $ne: true } }).select('name phone').lean(),
    Order.find().select('shippingAddress.phone shippingAddress.fullName user').limit(50_000).lean(),
    MarketingContact.find({ phone: { $type: 'string' } }).select('name phone').lean(),
    WhatsAppOptOut.find().select('phone').lean(),
  ]);

  const suppressed = new Set(
    optedOut.map((o) => normalisePhone(o.phone)).filter(Boolean) as string[]
  );

  const map = new Map<string, { sources: Set<PhoneSource>; name?: string; orders: number }>();

  const add = (raw: string | null | undefined, source: PhoneSource, name?: string | null) => {
    const phone = normalisePhone(raw);
    if (!phone || suppressed.has(phone)) return;

    const existing = map.get(phone) || { sources: new Set<PhoneSource>(), orders: 0 };
    existing.sources.add(source);
    // Keep the first real name we see rather than overwriting with a blank.
    if (!existing.name && name) existing.name = String(name).trim() || undefined;
    if (source === 'orders') existing.orders += 1;
    map.set(phone, existing);
  };

  registered.forEach((u) => add(u.phone, 'registrations', u.name));
  orders.forEach((o) => add(o.shippingAddress?.phone, 'orders', o.shippingAddress?.fullName));
  imported.forEach((c) => add(c.phone, 'imported', c.name));

  const entries: AudienceEntry[] = [...map.entries()]
    .map(([phone, v]) => ({
      phone,
      display: formatPhone(phone),
      name: v.name,
      sources: [...v.sources],
      orders: v.orders,
    }))
    .sort((a, b) => (b.orders - a.orders) || a.phone.localeCompare(b.phone));

  const countBy = (s: PhoneSource) => entries.filter((e) => e.sources.includes(s)).length;

  return {
    entries,
    stats: {
      registrations: countBy('registrations'),
      orders: countBy('orders'),
      imported: countBy('imported'),
      /** Unique numbers after merging every source. */
      total: entries.length,
      /** In more than one source — the overlap the raw counts hide. */
      inMultipleSources: entries.filter((e) => e.sources.length > 1).length,
      /** Held but excluded because they opted out. */
      optedOut: suppressed.size,
      /** Outside the default country — useful before a India-only campaign. */
      international: entries.filter((e) => !isDefaultCountry(e.phone)).length,
    },
  };
};

/** Filter the audience down to the sources the admin ticked. */
const selectEntries = (entries: AudienceEntry[], sourcesParam?: string): AudienceEntry[] => {
  const wanted = String(sourcesParam || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean) as PhoneSource[];
  if (wanted.length === 0) return entries;
  return entries.filter((e) => e.sources.some((s) => wanted.includes(s)));
};

/** GET /whatsapp/audience — the deduplicated contact list plus source counts. */
export const getAudience = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { sources, search, page, limit } = req.query as Record<string, string>;
    const { page: p, limit: l, skip } = getPagination(page, limit);

    const { entries, stats } = await buildAudience();
    let selected = selectEntries(entries, sources);

    if (search) {
      const term = search.replace(/\s/g, '').toLowerCase();
      selected = selected.filter((e) =>
        e.phone.includes(term) || (e.name || '').toLowerCase().includes(search.toLowerCase()));
    }

    sendSuccess(
      res,
      'WhatsApp audience',
      {
        entries: selected.slice(skip, skip + l),
        stats,
        /** How many the current source/search selection would actually reach. */
        selected: selected.length,
        configured: isWhatsAppConfigured(),
      },
      200,
      { page: p, limit: l, total: selected.length, pages: Math.ceil(selected.length / l) || 1 }
    );
  } catch (err) {
    next(err);
  }
};

/** GET /whatsapp/audience/export — the selection as CSV. */
export const exportAudience = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { entries } = await buildAudience();
    const selected = selectEntries(entries, (req.query.sources as string) || undefined);

    const csv = toCsv(selected, [
      { header: 'Phone', value: (e) => e.phone },
      { header: 'Display', value: (e) => e.display },
      { header: 'Name', value: (e) => e.name || '' },
      { header: 'Sources', value: (e) => e.sources.join(' | ') },
      { header: 'Orders', value: (e) => e.orders },
    ]);

    sendCsv(res, `whatsapp-audience-${dateStamp()}.csv`, csv);
  } catch (err) {
    next(err);
  }
};

/**
 * Merge a saved preset with whatever the request overrode. The request always
 * wins, so the composer can tweak a preset without saving the change first.
 */
const resolveMessage = async (body: Record<string, unknown>) => {
  const templateId = body.templateId ? String(body.templateId) : '';
  const preset = templateId ? await WhatsAppTemplate.findById(templateId) : null;

  const templateName = String(body.templateName || preset?.templateName || '').trim();
  const languageCode = String(body.languageCode || preset?.languageCode || '').trim();
  const headerType = String(body.headerType || preset?.headerType || 'none') as
    'none' | 'image' | 'video' | 'document';
  const mediaUrl = String(body.mediaUrl ?? preset?.mediaUrl ?? '').trim();
  const mediaFilename = String(body.mediaFilename ?? preset?.mediaFilename ?? '').trim();

  const params = Array.isArray(body.templateParams)
    ? body.templateParams.map((p) => String(p ?? ''))
    : (preset?.params || []);

  const rawButtons = Array.isArray(body.buttons) ? body.buttons : (preset?.buttons || []);
  const buttons = (rawButtons as Record<string, unknown>[]).map((b, i) => ({
    index: Number.isFinite(Number(b?.index)) ? Number(b?.index) : i,
    type: b?.type === 'quick_reply' ? 'quick_reply' as const : 'url' as const,
    urlSuffix: b?.urlSuffix ? String(b.urlSuffix) : undefined,
  }));

  return {
    preset,
    templateName,
    languageCode: languageCode || undefined,
    headerKind: headerType,
    params,
    buttons,
    media: headerType !== 'none' && mediaUrl
      ? { url: mediaUrl, filename: mediaFilename || undefined }
      : undefined,
  };
};

/**
 * POST /whatsapp/test — one message to one number, so a template can be checked
 * before it goes to thousands of people.
 */
export const sendTestMessage = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!isWhatsAppConfigured()) {
      sendError(res, 'WhatsApp is not configured — set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID', 400);
      return;
    }

    const destination = normalisePhone(req.body.phone);
    if (!destination) { sendError(res, 'Enter a valid phone number', 400); return; }

    const msg = await resolveMessage(req.body);
    if (!msg.templateName) { sendError(res, 'Choose an approved WhatsApp template', 400); return; }

    const result = await sendWhatsAppTemplate({
      destination,
      templateName: msg.templateName,
      languageCode: msg.languageCode,
      templateParams: msg.params,
      headerKind: msg.headerKind,
      media: msg.media,
      buttons: msg.buttons,
    });

    if (!result.ok) { sendError(res, result.error || 'Send failed', 400); return; }
    sendSuccess(res, `Test message sent to ${formatPhone(destination)}`, result);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /whatsapp/send — broadcast to the selected audience.
 *
 * Recipients are resolved server-side from the same deduplicated audience the
 * console shows, so a stale browser list can't cause duplicate sends. An
 * explicit `phones` list is still intersected with the audience, which keeps
 * opted-out numbers unreachable even if one is posted directly.
 */
export const sendCampaign = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, sources, phones } = req.body as { name?: string; sources?: string; phones?: string[] };

    if (!isWhatsAppConfigured()) {
      sendError(res, 'WhatsApp is not configured — set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID', 400);
      return;
    }

    const msg = await resolveMessage(req.body);
    if (!msg.templateName) { sendError(res, 'Choose an approved WhatsApp template', 400); return; }

    const { entries } = await buildAudience();
    let targets = selectEntries(entries, sources);

    if (Array.isArray(phones) && phones.length) {
      const wanted = new Set(phones.map((p) => normalisePhone(p)).filter(Boolean) as string[]);
      targets = targets.filter((e) => wanted.has(e.phone));
    }

    if (targets.length === 0) { sendError(res, 'No reachable numbers in that selection', 400); return; }

    const params = msg.params;

    const campaign = await WhatsAppCampaign.create({
      name: name?.trim() || msg.preset?.name || msg.templateName,
      templateName: msg.templateName,
      languageCode: msg.languageCode,
      templateParams: params,
      mediaUrl: msg.media?.url,
      sources: String(sources || '').split(',').map((s) => s.trim()).filter(Boolean),
      status: 'sending',
      total: targets.length,
      sentBy: req.user!._id,
    });

    // Answer immediately — a few thousand messages take minutes, and holding the
    // request open would time out the browser long before the run finished.
    sendSuccess(res, `Sending to ${targets.length} number(s)…`, {
      campaignId: campaign._id,
      total: targets.length,
    }, 202);

    void (async () => {
      try {
        const results = await sendWhatsAppBulk(
          targets.map((t) => ({
            destination: t.phone,
            // {{1}} defaults to the contact's name when the admin left it blank.
            templateParams: params.map((v, i) => (i === 0 && !v ? (t.name || 'there') : v)),
            attributes: t.name ? { name: t.name } : undefined,
          })),
          {
            templateName: msg.templateName,
            languageCode: msg.languageCode,
            headerKind: msg.headerKind,
            media: msg.media,
            buttons: msg.buttons,
          },
          {
            onProgress: async (done) => {
              await WhatsAppCampaign.updateOne({ _id: campaign._id }, { $set: { sent: done } }).catch(() => {});
            },
          }
        );

        const byPhone = new Map(targets.map((t) => [t.phone, t.name]));
        const sent = results.filter((r) => r.ok).length;
        const failed = results.length - sent;

        // The commonest failure reason, surfaced on the row so the admin can
        // see *why* without opening the per-number log.
        const reasons = new Map<string, number>();
        results.filter((r) => !r.ok && r.error).forEach((r) => {
          reasons.set(r.error!, (reasons.get(r.error!) || 0) + 1);
        });
        const topReason = [...reasons.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

        await WhatsAppCampaign.updateOne({ _id: campaign._id }, {
          $set: {
            status: sent === 0 ? 'failed' : (failed > 0 ? 'partial' : 'completed'),
            error: failed > 0 ? topReason : undefined,
            sent,
            failed,
            recipients: results.map((r) => ({
              phone: r.destination,
              name: byPhone.get(r.destination),
              ok: r.ok,
              error: r.error,
              reference: r.reference,
              kind: r.kind,
            })),
          },
        });

        // Popularity ordering in the template gallery reflects real use.
        if (msg.preset) {
          await WhatsAppTemplate.updateOne(
            { _id: msg.preset._id },
            { $inc: { useCount: 1 }, $set: { lastUsedAt: new Date() } }
          ).catch(() => {});
        }

        logger.info(`WhatsApp campaign ${campaign._id}: ${sent} sent, ${results.length - sent} failed`);
      } catch (err) {
        logger.error(`WhatsApp campaign ${campaign._id} crashed:`, err);
        await WhatsAppCampaign.updateOne({ _id: campaign._id }, {
          $set: { status: 'failed', error: (err as Error).message?.slice(0, 300) },
        }).catch(() => {});
      }
    })();

    await AuditLog.create({
      user: req.user!._id,
      action: 'SEND_WHATSAPP_CAMPAIGN',
      resource: 'whatsapp',
      resourceId: String(campaign._id),
      changes: { templateName: msg.templateName, total: targets.length },
    }).catch(() => {});
  } catch (err) {
    next(err);
  }
};

/** GET /whatsapp/campaigns — history, newest first. */
export const listCampaigns = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit } = req.query as Record<string, string>;
    const { page: p, limit: l, skip } = getPagination(page, limit);

    const [campaigns, total] = await Promise.all([
      WhatsAppCampaign.find()
        .select('-recipients') // the per-number log can be thousands of rows
        .populate('sentBy', 'name')
        .sort('-createdAt').skip(skip).limit(l).lean(),
      WhatsAppCampaign.countDocuments(),
    ]);

    sendSuccess(res, 'Campaigns', campaigns, 200, { page: p, limit: l, total, pages: Math.ceil(total / l) });
  } catch (err) {
    next(err);
  }
};

/** GET /whatsapp/campaigns/:id — one run with its per-number delivery log. */
export const getCampaign = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const campaign = await WhatsAppCampaign.findById(req.params.id).populate('sentBy', 'name').lean();
    if (!campaign) { sendError(res, 'Campaign not found', 404); return; }

    sendSuccess(res, 'Campaign', {
      ...campaign,
      recipients: (campaign.recipients || []).map((r) => ({ ...r, display: formatPhone(r.phone) })),
    });
  } catch (err) {
    next(err);
  }
};

/** GET /whatsapp/opt-outs */
export const listOptOuts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit, search } = req.query as Record<string, string>;
    const { page: p, limit: l, skip } = getPagination(page, limit);

    const filter: Record<string, unknown> = {};
    if (search) filter.phone = { $regex: search.replace(/\D/g, ''), $options: 'i' };

    const [rows, total] = await Promise.all([
      WhatsAppOptOut.find(filter).sort('-createdAt').skip(skip).limit(l).lean(),
      WhatsAppOptOut.countDocuments(filter),
    ]);

    sendSuccess(res, 'Opt-outs', rows.map((r) => ({ ...r, display: formatPhone(r.phone) })), 200,
      { page: p, limit: l, total, pages: Math.ceil(total / l) });
  } catch (err) {
    next(err);
  }
};

/** POST /whatsapp/opt-outs — block one or many numbers. */
export const addOptOuts = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const raw: unknown[] = Array.isArray(req.body.phones) ? req.body.phones : [req.body.phone];
    const reason = typeof req.body.reason === 'string' ? req.body.reason : undefined;

    const numbers = [...new Set(raw.map((p) => normalisePhone(String(p || ''))).filter(Boolean) as string[])];
    if (numbers.length === 0) { sendError(res, 'No valid phone numbers given', 400); return; }

    await WhatsAppOptOut.bulkWrite(numbers.map((phone) => ({
      updateOne: {
        filter: { phone },
        update: { $setOnInsert: { phone, reason, source: 'admin' } },
        upsert: true,
      },
    })));

    sendSuccess(res, `${numbers.length} number(s) will no longer receive marketing`, { blocked: numbers.length });
  } catch (err) {
    next(err);
  }
};

/** DELETE /whatsapp/opt-outs — let numbers back into the audience. */
export const removeOptOuts = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const ids: string[] = Array.isArray(req.body.ids) ? req.body.ids : [];
    if (ids.length === 0) { sendError(res, 'Nothing selected', 400); return; }

    const { deletedCount } = await WhatsAppOptOut.deleteMany({ _id: { $in: ids } });
    sendSuccess(res, `${deletedCount} number(s) removed from the block list`, { deleted: deletedCount });
  } catch (err) {
    next(err);
  }
};

/* ───────────────────── Campaign templates ───────────────────── */

/**
 * A saved preset is a convenience wrapper, not a WhatsApp template: the real
 * template still lives in Meta and must be approved there. What we store is
 * which approved campaign to fire and the values to fire it with.
 */

const HEADER_TYPES = ['none', 'image', 'video', 'document'];

/** Trust nothing from the form — the shape reaches the Meta API verbatim. */
const cleanTemplateBody = (body: Record<string, unknown>) => {
  const headerType = HEADER_TYPES.includes(String(body.headerType))
    ? String(body.headerType) as 'none' | 'image' | 'video' | 'document'
    : 'none';

  const buttons = (Array.isArray(body.buttons) ? body.buttons : [])
    .slice(0, 3) // Meta allows at most 3 buttons on a template
    .map((b, i) => {
      const btn = (b || {}) as Record<string, unknown>;
      return {
        index: Number.isFinite(Number(btn.index)) ? Number(btn.index) : i,
        type: btn.type === 'quick_reply' ? 'quick_reply' as const : 'url' as const,
        text: String(btn.text || '').slice(0, 40),
        urlSuffix: btn.urlSuffix ? String(btn.urlSuffix).slice(0, 300) : undefined,
      };
    });

  return {
    name: String(body.name || '').trim(),
    description: body.description ? String(body.description).slice(0, 500) : undefined,
    category: String(body.category || 'General').trim() || 'General',
    templateName: String(body.templateName || '').trim(),
    languageCode: String(body.languageCode || 'en_US').trim() || 'en_US',
    headerType,
    mediaUrl: headerType === 'none' ? undefined : String(body.mediaUrl || '').trim() || undefined,
    mediaFilename: body.mediaFilename ? String(body.mediaFilename).slice(0, 200) : undefined,
    bodyPreview: body.bodyPreview ? String(body.bodyPreview).slice(0, 2000) : undefined,
    footerPreview: body.footerPreview ? String(body.footerPreview).slice(0, 200) : undefined,
    params: (Array.isArray(body.params) ? body.params : []).map((p) => String(p ?? '')).slice(0, 10),
    buttons,
    tags: (Array.isArray(body.tags) ? body.tags : []).map((t) => String(t)).slice(0, 10),
  };
};

/** GET /whatsapp/templates */
export const listTemplates = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { category, search } = req.query as Record<string, string>;
    const filter: Record<string, unknown> = {};
    if (category && category !== 'all') filter.category = category;
    if (search) {
      const safe = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { name: { $regex: safe, $options: 'i' } },
        { description: { $regex: safe, $options: 'i' } },
        { templateName: { $regex: safe, $options: 'i' } },
      ];
    }

    const templates = await WhatsAppTemplate.find(filter).sort({ useCount: -1, name: 1 }).lean();
    const categories = await WhatsAppTemplate.distinct('category');

    sendSuccess(res, 'Templates', { templates, categories: categories.sort() });
  } catch (err) {
    next(err);
  }
};

/** POST /whatsapp/templates */
export const createTemplate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = cleanTemplateBody(req.body);
    if (!data.name) { sendError(res, 'Give the template a name', 400); return; }
    if (!data.templateName) { sendError(res, 'Choose the approved Meta template', 400); return; }
    if (data.headerType !== 'none' && !data.mediaUrl) {
      sendError(res, `A ${data.headerType} header needs a media URL`, 400); return;
    }

    const template = await WhatsAppTemplate.create({ ...data, createdBy: req.user!._id });
    sendSuccess(res, 'Template saved', template, 201);
  } catch (err) {
    next(err);
  }
};

/** PATCH /whatsapp/templates/:id */
export const updateTemplate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = cleanTemplateBody(req.body);
    if (!data.name) { sendError(res, 'Give the template a name', 400); return; }
    if (!data.templateName) { sendError(res, 'Choose the approved Meta template', 400); return; }

    const template = await WhatsAppTemplate.findByIdAndUpdate(
      req.params.id,
      // `isPreset` is deliberately not settable from the form — editing a
      // shipped preset keeps it flagged as one.
      { ...data },
      { new: true }
    );
    if (!template) { sendError(res, 'Template not found', 404); return; }

    sendSuccess(res, 'Template updated', template);
  } catch (err) {
    next(err);
  }
};

/** DELETE /whatsapp/templates/:id */
export const deleteTemplate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const template = await WhatsAppTemplate.findByIdAndDelete(req.params.id);
    if (!template) { sendError(res, 'Template not found', 404); return; }
    sendSuccess(res, 'Template deleted');
  } catch (err) {
    next(err);
  }
};

/** POST /whatsapp/templates/:id/duplicate — start a variant without retyping. */
export const duplicateTemplate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const source = await WhatsAppTemplate.findById(req.params.id).lean();
    if (!source) { sendError(res, 'Template not found', 404); return; }

    const { _id, createdAt, updatedAt, ...rest } = source;
    const copy = await WhatsAppTemplate.create({
      ...rest,
      name: `${source.name} (copy)`,
      isPreset: false,
      useCount: 0,
      lastUsedAt: undefined,
      createdBy: req.user!._id,
    });

    sendSuccess(res, 'Template duplicated', copy, 201);
  } catch (err) {
    next(err);
  }
};

/* ───────────────────── Spreadsheet import ───────────────────── */

/** GET /whatsapp/import/template — the blank sheet to fill in. */
export const downloadImportTemplate = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const buffer = await buildImportTemplate('phone');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="whatsapp-numbers-template.xlsx"');
    res.send(buffer);
  } catch (err) {
    next(err);
  }
};

/** POST /whatsapp/import — upload numbers from a spreadsheet. */
export const importContacts = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.file?.buffer) { sendError(res, 'Attach an .xlsx, .xls or .csv file', 400); return; }

    const listName = String(req.body.listName || '').trim() || `Import ${new Date().toLocaleDateString('en-IN')}`;
    const result = await parseContactSheet(req.file.buffer, 'phone', listName, req.user!._id);

    await AuditLog.create({
      user: req.user!._id,
      action: 'IMPORT_WHATSAPP_CONTACTS',
      resource: 'whatsapp',
      changes: { imported: result.imported, duplicates: result.duplicates, invalid: result.invalid },
    }).catch(() => {});

    sendSuccess(res, `${result.imported} number(s) imported`, result);
  } catch (err) {
    next(err);
  }
};

/** GET /whatsapp/imported — what has been uploaded, newest first. */
export const listImported = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit, search } = req.query as Record<string, string>;
    const { page: p, limit: l, skip } = getPagination(page, limit);

    const filter: Record<string, unknown> = { phone: { $type: 'string' } };
    if (search) {
      const digits = search.replace(/\D/g, '');
      filter.$or = [
        ...(digits ? [{ phone: { $regex: digits } }] : []),
        { name: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
      ];
    }

    const [rows, total, lists] = await Promise.all([
      MarketingContact.find(filter).sort('-createdAt').skip(skip).limit(l).lean(),
      MarketingContact.countDocuments(filter),
      MarketingContact.distinct('listName', { phone: { $type: 'string' } }),
    ]);

    sendSuccess(res, 'Imported numbers',
      { rows: rows.map((r) => ({ ...r, display: formatPhone(r.phone) })), lists },
      200, { page: p, limit: l, total, pages: Math.ceil(total / l) || 1 });
  } catch (err) {
    next(err);
  }
};

/** DELETE /whatsapp/imported — remove selected rows, or a whole upload batch. */
export const deleteImported = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const ids: string[] = Array.isArray(req.body.ids) ? req.body.ids : [];
    const listName = req.body.listName ? String(req.body.listName) : '';

    if (!ids.length && !listName) { sendError(res, 'Nothing selected', 400); return; }

    const filter = ids.length
      ? { _id: { $in: ids }, phone: { $type: 'string' } }
      : { listName, phone: { $type: 'string' } };

    const { deletedCount } = await MarketingContact.deleteMany(filter);
    sendSuccess(res, `${deletedCount} number(s) removed`, { deleted: deletedCount });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /whatsapp/media — upload template header media and get a public URL.
 *
 * WhatsApp fetches the header from a public URL, so the file has to live
 * somewhere reachable before a template can reference it. Uploading here beats
 * asking the admin to find a URL for their own banner.
 */
export const uploadCampaignMedia = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.file) { sendError(res, 'Attach a file', 400); return; }

    const { url, contentType, filename } = await uploadMediaToGCS(req.file, 'whatsapp');

    // Tell the console which header type this file is, so the form can set it.
    const headerType = contentType.startsWith('image/') ? 'image'
      : contentType.startsWith('video/') ? 'video'
        : 'document';

    sendSuccess(res, 'Media uploaded', { url, contentType, filename, headerType });
  } catch (err) {
    next(err);
  }
};

/** DELETE /whatsapp/campaigns/:id — remove one run from the history. */
export const deleteCampaign = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const campaign = await WhatsAppCampaign.findById(req.params.id);
    if (!campaign) { sendError(res, 'Campaign not found', 404); return; }
    if (campaign.status === 'sending') {
      sendError(res, 'This campaign is still sending — wait for it to finish', 400);
      return;
    }

    await campaign.deleteOne();
    sendSuccess(res, 'Campaign removed from history');
  } catch (err) {
    next(err);
  }
};

/** DELETE /whatsapp/campaigns — bulk clear, by ids or everything finished. */
export const deleteCampaigns = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const ids: string[] = Array.isArray(req.body.ids) ? req.body.ids : [];
    const all = req.body.all === true;

    if (!ids.length && !all) { sendError(res, 'Nothing selected', 400); return; }

    // A run still in flight is never deleted — its background task would carry
    // on writing to a row that no longer exists.
    const filter: Record<string, unknown> = ids.length
      ? { _id: { $in: ids }, status: { $ne: 'sending' } }
      : { status: { $ne: 'sending' } };

    const { deletedCount } = await WhatsAppCampaign.deleteMany(filter);
    sendSuccess(res, `${deletedCount} campaign(s) removed`, { deleted: deletedCount });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /whatsapp/meta-templates — the approved templates on the WABA.
 *
 * Typing a template name by hand is the commonest cause of a failed send, so
 * the console offers Meta's own list instead. Each row carries the placeholder
 * count and header kind, which the editor uses to pre-shape the preset.
 */
export const getMetaTemplates = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!canListTemplates()) {
      sendSuccess(res, 'Template listing not configured', {
        configured: false,
        templates: [],
        hint: 'Set WHATSAPP_BUSINESS_ACCOUNT_ID to list approved templates automatically.',
      });
      return;
    }

    const result = await listMetaTemplates();
    if (!result.ok) { sendError(res, result.error || 'Could not reach Meta', 400); return; }

    sendSuccess(res, 'Approved templates', {
      configured: true,
      // Only APPROVED templates can actually be sent; the rest are shown so a
      // pending one doesn't look like it went missing.
      templates: result.templates,
      approved: result.templates.filter((t) => t.status === 'APPROVED').length,
    });
  } catch (err) {
    next(err);
  }
};
