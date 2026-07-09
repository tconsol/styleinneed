import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICmsPage extends Document {
  _id: Types.ObjectId;
  key: string;
  title: string;
  content: Record<string, unknown>;
  lastUpdatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const cmsPageSchema = new Schema<ICmsPage>(
  {
    key: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    content: { type: Schema.Types.Mixed, default: {} },
    lastUpdatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);


export default mongoose.model<ICmsPage>('CmsPage', cmsPageSchema);
