import mongoose, { Document, Schema } from 'mongoose';

export interface IAnalyticsSnapshot extends Document {
  date: Date;
  totalRevenue: number;
  totalRentals: number;
  activeUsers: number;
  newUsers: number;
  averageWatchTime: number; // in minutes
  topMovie: mongoose.Types.ObjectId;
  topCity: string;
  topCountry: string;
  conversionRate: number; // percentage
  snapshotType: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  createdAt: Date;
  updatedAt: Date;
}

const analyticsSnapshotSchema = new Schema<IAnalyticsSnapshot>(
  {
    date: {
      type: Date,
      required: true,
    },
    totalRevenue: {
      type: Number,
      default: 0,
    },
    totalRentals: {
      type: Number,
      default: 0,
    },
    activeUsers: {
      type: Number,
      default: 0,
    },
    newUsers: {
      type: Number,
      default: 0,
    },
    averageWatchTime: {
      type: Number,
      default: 0,
    },
    topMovie: {
      type: Schema.Types.ObjectId,
      ref: 'Movie',
    },
    topCity: {
      type: String,
      default: '',
    },
    topCountry: {
      type: String,
      default: '',
    },
    conversionRate: {
      type: Number,
      default: 0,
    },
    snapshotType: {
      type: String,
      enum: ['DAILY', 'WEEKLY', 'MONTHLY'],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Create compound index for fast lookups
analyticsSnapshotSchema.index({ date: 1, snapshotType: 1 }, { unique: true });

const AnalyticsSnapshot = mongoose.model<IAnalyticsSnapshot>('AnalyticsSnapshot', analyticsSnapshotSchema);
export default AnalyticsSnapshot;
