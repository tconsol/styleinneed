import mongoose, { Schema, Document, Types } from 'mongoose';

/**
 * A reusable campaign preset.
 *
 * NOT the WhatsApp template itself — those live in Meta and must be approved
 * there. This is the wrapper around one: which approved template to send, in
 * which language, what header media to attach, the body values to substitute
 * and the button links. Saving it means a recurring blast is two clicks
 * instead of retyping everything.
 */

export type WhatsAppHeaderType = 'none' | 'image' | 'video' | 'document';

export interface IWhatsAppButton {
  /** Matches the button position in the approved Meta template. */
  index: number;
  type: 'url' | 'quick_reply';
  text: string;
  /**
   * For a dynamic URL button, Meta stores the base (e.g. "shop.com/{{1}}") and
   * only the suffix is sent at call time. This is that suffix.
   */
  urlSuffix?: string;
}

export interface IWhatsAppTemplate extends Document {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  category: string;
  /** Name of the approved Meta template this preset sends. */
  templateName: string;
  /** Template language code, e.g. "en_US". Must match the approved template. */
  languageCode: string;
  headerType: WhatsAppHeaderType;
  mediaUrl?: string;
  mediaFilename?: string;
  /** Body copy, for the console preview only — Meta holds the real text. */
  bodyPreview?: string;
  footerPreview?: string;
  /** Values for the body's {{1}}, {{2}} … placeholders. */
  params: string[];
  buttons: IWhatsAppButton[];
  tags: string[];
  /** Shipped by the seed rather than authored by the store. */
  isPreset: boolean;
  useCount: number;
  lastUsedAt?: Date;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const buttonSchema = new Schema<IWhatsAppButton>(
  {
    index: { type: Number, default: 0 },
    type: { type: String, enum: ['url', 'quick_reply'], default: 'url' },
    text: { type: String, default: '' },
    urlSuffix: String,
  },
  { _id: false }
);

const whatsAppTemplateSchema = new Schema<IWhatsAppTemplate>(
  {
    name: { type: String, required: true, trim: true },
    description: String,
    category: { type: String, default: 'General', trim: true },
    templateName: { type: String, required: true, trim: true },
    languageCode: { type: String, default: 'en_US', trim: true },
    headerType: { type: String, enum: ['none', 'image', 'video', 'document'], default: 'none' },
    mediaUrl: String,
    mediaFilename: String,
    bodyPreview: String,
    footerPreview: String,
    params: { type: [String], default: [] },
    buttons: { type: [buttonSchema], default: [] },
    tags: { type: [String], default: [] },
    isPreset: { type: Boolean, default: false },
    useCount: { type: Number, default: 0 },
    lastUsedAt: Date,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

whatsAppTemplateSchema.index({ category: 1 });
whatsAppTemplateSchema.index({ name: 1 });

export default mongoose.model<IWhatsAppTemplate>('WhatsAppTemplate', whatsAppTemplateSchema);
