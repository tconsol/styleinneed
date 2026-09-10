import mongoose, { Schema, Document, Types } from 'mongoose';

/**
 * `completed` means every message was accepted. A run where some or all were
 * rejected is `partial` / `failed` — reporting those as completed hides a
 * campaign that reached nobody.
 */
export type WhatsAppCampaignStatus = 'sending' | 'completed' | 'partial' | 'failed';

export interface IWhatsAppRecipient {
  phone: string;
  name?: string;
  ok: boolean;
  error?: string;
  reference?: string;
  /** Why it failed, so the log can group causes. */
  kind?: string;
}

export interface IWhatsAppCampaign extends Document {
  _id: Types.ObjectId;
  /** Our label for the run. */
  name: string;
  /** The approved Meta template this run sent. */
  templateName: string;
  languageCode?: string;
  templateParams: string[];
  mediaUrl?: string;
  /** Which audience sources were included when it was sent. */
  sources: string[];
  status: WhatsAppCampaignStatus;
  total: number;
  sent: number;
  failed: number;
  /** Per-number outcome, so a failure can be explained rather than guessed at. */
  recipients: IWhatsAppRecipient[];
  error?: string;
  sentBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const recipientSchema = new Schema<IWhatsAppRecipient>(
  {
    phone: { type: String, required: true },
    name: String,
    ok: { type: Boolean, default: false },
    error: String,
    reference: String,
    kind: String,
  },
  { _id: false }
);

const whatsAppCampaignSchema = new Schema<IWhatsAppCampaign>(
  {
    name: { type: String, required: true, trim: true },
    templateName: { type: String, required: true, trim: true },
    languageCode: String,
    templateParams: { type: [String], default: [] },
    mediaUrl: String,
    sources: { type: [String], default: [] },
    status: { type: String, enum: ['sending', 'completed', 'partial', 'failed'], default: 'sending' },
    total: { type: Number, default: 0 },
    sent: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    recipients: { type: [recipientSchema], default: [] },
    error: String,
    sentBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

whatsAppCampaignSchema.index({ createdAt: -1 });

export default mongoose.model<IWhatsAppCampaign>('WhatsAppCampaign', whatsAppCampaignSchema);
