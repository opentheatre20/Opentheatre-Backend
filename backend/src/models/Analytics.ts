import mongoose, { Schema, Document } from 'mongoose';
import { IAuditable, auditPlugin } from '../plugins/auditPlugin';

export interface IAnalytics extends Document, IAuditable {
  date: string; // YYYY-MM-DD
  dailyRevenue: number;
  dailyActiveUsers: number;
  monthlyActiveUsers: number;
  newUsers: number;
  totalRentals: number;
  createdAt: Date;
  updatedAt: Date;
}

const analyticsSchema = new Schema<IAnalytics>(
  {
    date: { type: String, required: true, unique: true },
    dailyRevenue: { type: Number, default: 0 },
    dailyActiveUsers: { type: Number, default: 0 },
    monthlyActiveUsers: { type: Number, default: 0 },
    newUsers: { type: Number, default: 0 },
    totalRentals: { type: Number, default: 0 },
  },
  { timestamps: true }
);

analyticsSchema.plugin(auditPlugin);

export default mongoose.model<IAnalytics>('Analytics', analyticsSchema);
