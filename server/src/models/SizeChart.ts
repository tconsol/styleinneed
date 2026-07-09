import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISizeChart extends Document {
  _id: Types.ObjectId;
  name: string;
  productTypes: string[];
  columns: string[];
  unit: 'cm' | 'inches';
  rows: { size: string; values: string[] }[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const sizeChartSchema = new Schema<ISizeChart>(
  {
    name: { type: String, required: true, trim: true },
    productTypes: [{ type: String }],
    columns: [{ type: String, required: true }],
    unit: { type: String, enum: ['cm', 'inches'], default: 'cm' },
    rows: [
      {
        size: { type: String, required: true },
        values: [{ type: String }],
        _id: false,
      },
    ],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model<ISizeChart>('SizeChart', sizeChartSchema);
