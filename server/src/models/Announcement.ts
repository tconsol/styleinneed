import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAnnouncement extends Document {
  _id: Types.ObjectId;
  title: string;
  content: string;
  type: 'top_bar' | 'popup' | 'promotional_banner' | 'flash_sale' | 'festival';
  image?: string;
  ctaText?: string;
  ctaLink?: string;
  startDate: Date;
  expiryDate: Date;
  isActive: boolean;
  views: number;
  clicks: number;
  bgColor?: string;
  textColor?: string;
  createdAt: Date;
  updatedAt: Date;
}

const announcementSchema = new Schema<IAnnouncement>(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    type: {
      type: String,
      enum: ['top_bar', 'popup', 'promotional_banner', 'flash_sale', 'festival'],
      required: true,
    },
    image: String,
    ctaText: String,
    ctaLink: String,
    startDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
    views: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    bgColor: String,
    textColor: String,
  },
  { timestamps: true }
);

announcementSchema.index({ type: 1, isActive: 1 });
announcementSchema.index({ expiryDate: 1 });

export default mongoose.model<IAnnouncement>('Announcement', announcementSchema);
