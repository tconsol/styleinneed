import axios, { AxiosError } from 'axios';
import logger from '../utils/logger';

/**
 * WhatsApp Business Cloud API (Meta), called directly — no BSP in between.
 *
 * Marketing messages must use a template Meta has approved; free-form text is
 * only allowed inside a 24-hour customer service window, which a broadcast
 * never is. So every send here is a template send.
 *
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
 */

const API_VERSION = (): string => process.env.WHATSAPP_API_VERSION || 'v21.0';
const GRAPH = (): string => `https://graph.facebook.com/${API_VERSION()}`;

const accessToken = (): string => process.env.WHATSAPP_ACCESS_TOKEN || '';
const phoneNumberId = (): string => process.env.WHATSAPP_PHONE_NUMBER_ID || '';
const wabaId = (): string => process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '';
const defaultLanguage = (): string => process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en_US';

/** Sending needs a token and a phone number id; listing templates also needs the WABA id. */
export const isWhatsAppConfigured = (): boolean => Boolean(accessToken() && phoneNumberId());
export const canListTemplates = (): boolean => Boolean(accessToken() && wabaId());

export type WhatsAppHeaderKind = 'none' | 'image' | 'video' | 'document';

export interface WhatsAppSendInput {
  /** E.164 digits, no "+" — e.g. "919876543210". */
  destination: string;
  /** Name of the approved template, exactly as it appears in Meta. */
  templateName: string;
  /** Template language, e.g. "en_US" or "en". Must match the approved one. */
  languageCode?: string;
  /** Ordered values for the body's {{1}}, {{2}} … placeholders. */
  templateParams?: string[];
  /** Header media, when the template declares a media header. */
  headerKind?: WhatsAppHeaderKind;
  media?: { url: string; filename?: string };
  /** Dynamic URL-button suffixes, positional. */
  buttons?: { index: number; type: 'url' | 'quick_reply'; urlSuffix?: string }[];
}

export type WhatsAppFailureKind =
  | 'unreachable' | 'config' | 'auth' | 'rate_limit' | 'window' | 'unknown';

export interface WhatsAppSendResult {
  ok: boolean;
  /** Meta's message id (wamid…), which delivery webhooks later reference. */
  reference?: string;
  error?: string;
  code?: number;
  kind?: WhatsAppFailureKind;
}

/**
 * Meta's documented error codes. Mapping the codes beats matching the strings:
 * the messages are localised and get reworded, the codes do not.
 */
const KIND_BY_CODE: Record<number, WhatsAppFailureKind> = {
  131026: 'unreachable',   // undeliverable — number has no WhatsApp account
  131052: 'unreachable',   // media/recipient could not be resolved
  131030: 'config',        // recipient not in the app's allowed list (dev mode)
  132000: 'config',        // template parameter count mismatch
  132001: 'config',        // template does not exist in this language
  132005: 'config',        // hydrated text too long
  132007: 'config',        // template format policy violation
  132012: 'config',        // parameter format mismatch
  132015: 'config',        // template paused
  132016: 'config',        // template disabled
  133010: 'config',        // phone number not registered
  131051: 'config',        // unsupported message type
  100: 'config',           // invalid parameter
  190: 'auth',             // access token expired or invalid
  102: 'auth',             // session invalid
  10: 'auth',              // permission denied
  200: 'auth',             // permission error
  130429: 'rate_limit',    // throughput limit
  131056: 'rate_limit',    // pair rate limit
  80007: 'rate_limit',     // business rate limit
  131047: 'window',        // re-engagement required (outside the 24h window)
};

export const classifyFailure = (code?: number, message?: string): WhatsAppFailureKind => {
  if (code && KIND_BY_CODE[code]) return KIND_BY_CODE[code];
  const m = (message || '').toLowerCase();
  if (!m) return 'unknown';
  if (m.includes('not exist') || m.includes('template')) return 'config';
  if (m.includes('undeliverable') || m.includes('not a valid whatsapp') || m.includes('invalid number')) return 'unreachable';
  if (m.includes('access token') || m.includes('oauth') || m.includes('unauthorized')) return 'auth';
  if (m.includes('rate limit') || m.includes('too many')) return 'rate_limit';
  return 'unknown';
};

/** Wording an admin or customer can act on. */
export const describeFailure = (kind: WhatsAppFailureKind, raw?: string): string => {
  switch (kind) {
    case 'unreachable': return 'This number is not on WhatsApp';
    case 'config': return `Template problem — ${raw || 'check the name, language and placeholder count'}`;
    case 'auth': return 'Meta rejected the access token — it may have expired';
    case 'rate_limit': return 'WhatsApp rate limit reached — try again shortly';
    case 'window': return 'Outside the 24-hour window — only approved templates can be sent';
    default: return raw || 'Unknown error';
  }
};

/** Pull Meta's error out of whatever shape came back. */
const readError = (err: unknown): { message: string; code?: number } => {
  const ax = err as AxiosError<{ error?: { message?: string; code?: number; error_data?: { details?: string } } }>;
  const e = ax.response?.data?.error;

  if (e) {
    // `error_data.details` carries the specific reason; `message` is generic.
    const detail = e.error_data?.details;
    return {
      message: String(detail || e.message || 'WhatsApp API error').slice(0, 300),
      code: typeof e.code === 'number' ? e.code : undefined,
    };
  }
  if (ax.code === 'ECONNABORTED') return { message: 'WhatsApp API timed out' };
  return { message: (ax.message || 'Unknown error').slice(0, 300) };
};

/**
 * Build the `components` array.
 *
 * Meta requires the parts in template order and rejects a header component the
 * approved template does not declare, so an empty component is never appended.
 */
const buildComponents = (input: WhatsAppSendInput): Record<string, unknown>[] => {
  const components: Record<string, unknown>[] = [];

  if (input.headerKind && input.headerKind !== 'none' && input.media?.url) {
    const media: Record<string, unknown> = { link: input.media.url };
    // Only documents carry a filename; sending one elsewhere is rejected.
    if (input.headerKind === 'document' && input.media.filename) {
      media.filename = input.media.filename;
    }
    components.push({
      type: 'header',
      parameters: [{ type: input.headerKind, [input.headerKind]: media }],
    });
  }

  const params = (input.templateParams || []).filter((p) => p !== undefined && p !== null);
  if (params.length) {
    components.push({
      type: 'body',
      parameters: params.map((text) => ({ type: 'text', text: String(text) })),
    });
  }

  // Each dynamic URL button is its own component, addressed by index.
  (input.buttons || [])
    .filter((b) => b.type === 'url' && b.urlSuffix)
    .forEach((b) => {
      components.push({
        type: 'button',
        sub_type: 'url',
        index: String(b.index),
        parameters: [{ type: 'text', text: b.urlSuffix }],
      });
    });

  return components;
};

export const sendWhatsAppTemplate = async (input: WhatsAppSendInput): Promise<WhatsAppSendResult> => {
  if (!accessToken()) return { ok: false, error: 'WHATSAPP_ACCESS_TOKEN is not set', kind: 'auth' };
  if (!phoneNumberId()) return { ok: false, error: 'WHATSAPP_PHONE_NUMBER_ID is not set', kind: 'config' };
  if (!input.destination) return { ok: false, error: 'No destination number', kind: 'unreachable' };
  if (!input.templateName) return { ok: false, error: 'No template name', kind: 'config' };

  const components = buildComponents(input);

  const payload: Record<string, unknown> = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: input.destination,
    type: 'template',
    template: {
      name: input.templateName,
      language: { code: input.languageCode || defaultLanguage() },
      ...(components.length ? { components } : {}),
    },
  };

  try {
    const { data } = await axios.post(
      `${GRAPH()}/${phoneNumberId()}/messages`,
      payload,
      {
        headers: { Authorization: `Bearer ${accessToken()}`, 'Content-Type': 'application/json' },
        timeout: 20_000,
      }
    );

    const body = (data || {}) as { messages?: { id?: string }[] };
    return { ok: true, reference: body.messages?.[0]?.id };
  } catch (err) {
    const { message, code } = readError(err);
    const kind = classifyFailure(code, message);
    logger.warn(`WhatsApp send failed for ${input.destination} [${code ?? '-'}]: ${message}`);
    return { ok: false, error: describeFailure(kind, message), code, kind };
  }
};

/**
 * The approved templates on this WhatsApp Business Account.
 *
 * Lets the console offer a real list instead of asking someone to type a name
 * that has to match Meta exactly — the commonest cause of a failed send.
 */
export interface MetaTemplate {
  name: string;
  language: string;
  status: string;
  category: string;
  /** How many {{n}} placeholders the body declares. */
  bodyParams: number;
  bodyText?: string;
  headerKind: WhatsAppHeaderKind;
  footerText?: string;
  buttons: { type: string; text: string }[];
}

export const listMetaTemplates = async (): Promise<{ ok: boolean; templates: MetaTemplate[]; error?: string }> => {
  if (!canListTemplates()) {
    return {
      ok: false,
      templates: [],
      error: 'WHATSAPP_ACCESS_TOKEN and WHATSAPP_BUSINESS_ACCOUNT_ID must both be set',
    };
  }

  try {
    const { data } = await axios.get(`${GRAPH()}/${wabaId()}/message_templates`, {
      params: { limit: 200, fields: 'name,status,category,language,components' },
      headers: { Authorization: `Bearer ${accessToken()}` },
      timeout: 20_000,
    });

    const rows = ((data?.data || []) as Record<string, unknown>[]).map((t): MetaTemplate => {
      const components = (t.components || []) as Record<string, unknown>[];
      const body = components.find((c) => c.type === 'BODY');
      const header = components.find((c) => c.type === 'HEADER');
      const footer = components.find((c) => c.type === 'FOOTER');
      const buttonsComp = components.find((c) => c.type === 'BUTTONS');

      const bodyText = String(body?.text || '');
      const format = String(header?.format || 'NONE').toLowerCase();

      return {
        name: String(t.name || ''),
        language: String(t.language || ''),
        status: String(t.status || ''),
        category: String(t.category || ''),
        // How many values a send must supply — a mismatch is error 132000.
        bodyParams: new Set([...bodyText.matchAll(/\{\{(\d+)\}\}/g)].map((m) => m[1])).size,
        bodyText,
        headerKind: (['image', 'video', 'document'].includes(format) ? format : 'none') as WhatsAppHeaderKind,
        footerText: footer?.text ? String(footer.text) : undefined,
        buttons: ((buttonsComp?.buttons || []) as Record<string, unknown>[])
          .map((b) => ({ type: String(b.type || ''), text: String(b.text || '') })),
      };
    });

    return { ok: true, templates: rows };
  } catch (err) {
    const { message } = readError(err);
    return { ok: false, templates: [], error: message };
  }
};

/**
 * Deliver to many numbers without tripping Meta's throughput limits.
 *
 * Cloud API allows a high default rate, but bursting still earns 130429, so
 * sends go in small concurrent batches with a pause between them. Every result
 * is reported individually so a campaign log can explain each failure.
 */
export const sendWhatsAppBulk = async (
  recipients: { destination: string; templateParams?: string[] }[],
  base: Omit<WhatsAppSendInput, 'destination'>,
  opts: {
    batchSize?: number;
    pauseMs?: number;
    onProgress?: (done: number, total: number) => void | Promise<void>;
  } = {}
): Promise<{ destination: string; ok: boolean; error?: string; reference?: string; kind?: WhatsAppFailureKind }[]> => {
  const batchSize = Math.max(1, opts.batchSize ?? (Number(process.env.WHATSAPP_BATCH_SIZE) || 10));
  const pauseMs = Math.max(0, opts.pauseMs ?? (Number(process.env.WHATSAPP_BATCH_PAUSE_MS) || 1000));

  const out: { destination: string; ok: boolean; error?: string; reference?: string; kind?: WhatsAppFailureKind }[] = [];

  for (let i = 0; i < recipients.length; i += batchSize) {
    const chunk = recipients.slice(i, i + batchSize);
    const results = await Promise.all(
      chunk.map(async (r) => {
        const res = await sendWhatsAppTemplate({
          ...base,
          destination: r.destination,
          templateParams: r.templateParams ?? base.templateParams ?? [],
        });
        return { destination: r.destination, ...res };
      })
    );
    out.push(...results);
    if (opts.onProgress) await opts.onProgress(out.length, recipients.length);

    if (pauseMs && i + batchSize < recipients.length) {
      await new Promise((r) => setTimeout(r, pauseMs));
    }
  }

  return out;
};

/**
 * Send a verification OTP over WhatsApp.
 *
 * Needs an approved template named by WHATSAPP_OTP_TEMPLATE. Meta's
 * AUTHENTICATION-category templates take the code as the body parameter and
 * again as the copy-button suffix. Returns ok:false when unconfigured or
 * rejected, so the caller falls back to email rather than stranding a signup.
 */
export const sendWhatsAppOtp = async (
  destination: string,
  otp: string,
  _name?: string
): Promise<WhatsAppSendResult> => {
  const templateName = process.env.WHATSAPP_OTP_TEMPLATE || '';
  if (!templateName) return { ok: false, error: 'WHATSAPP_OTP_TEMPLATE is not set', kind: 'config' };

  return sendWhatsAppTemplate({
    destination,
    templateName,
    languageCode: process.env.WHATSAPP_OTP_TEMPLATE_LANGUAGE || defaultLanguage(),
    templateParams: [otp],
    buttons: [{ index: 0, type: 'url', urlSuffix: otp }],
  });
};
