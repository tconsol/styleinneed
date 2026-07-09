import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISupportTicket extends Document {
  _id: Types.ObjectId;
  ticketId: string;
  user: Types.ObjectId;
  subject: string;
  category: string;
  description: string;
  images?: string[];
  status: 'open' | 'pending' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  assignedTo?: Types.ObjectId;
  messages: {
    sender: Types.ObjectId;
    senderRole: string;
    content: string;
    isInternal: boolean;
    createdAt: Date;
  }[];
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ticketSchema = new Schema<ISupportTicket>(
  {
    ticketId: { type: String, unique: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    subject: { type: String, required: true },
    category: { type: String, required: true },
    description: { type: String, required: true },
    images: [String],
    status: {
      type: String,
      enum: ['open', 'pending', 'resolved', 'closed'],
      default: 'open',
    },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    messages: [
      {
        sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        senderRole: { type: String, required: true },
        content: { type: String, required: true },
        isInternal: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    resolvedAt: Date,
  },
  { timestamps: true }
);

ticketSchema.pre('save', function (next) {
  if (!this.ticketId) {
    this.ticketId = `TKT-${Date.now()}`;
  }
  next();
});

ticketSchema.index({ user: 1 });
ticketSchema.index({ status: 1 });
ticketSchema.index({ assignedTo: 1 });

export default mongoose.model<ISupportTicket>('SupportTicket', ticketSchema);
