import mongoose, { Schema, Document, Types } from 'mongoose';

export type NotificationType =
  | 'order_confirmed'
  | 'order_cancelled'
  | 'order_shipped'
  | 'order_delivered'
  | 'order_status_changed'
  | 'promotion'
  | 'announcement'
  | 'general';

export interface INotification extends Document {
  user: Types.ObjectId;
  title: string;
  body: string;
  type: NotificationType;
  orderId?: string;
  orderNumber?: string;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    type: {
      type: String,
      enum: ['order_confirmed', 'order_cancelled', 'order_shipped', 'order_delivered', 'order_status_changed', 'promotion', 'announcement', 'general'],
      default: 'general',
    },
    orderId: String,
    orderNumber: String,
    isRead: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, isRead: 1 });

export default mongoose.model<INotification>('Notification', notificationSchema);
