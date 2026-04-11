import mongoose, { Document, Schema } from 'mongoose';

export interface ITrafficLog extends Document {
  userId?: mongoose.Types.ObjectId; // Optional: Guest users
  pageVisited: string;
  timestamp: Date;
  deviceType: string;
  browser: string;
  geoData: {
    ip: string;
    country: string;
    state?: string;
    city: string;
    latitude?: number;
    longitude?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const trafficLogSchema = new Schema<ITrafficLog>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false, // Optional if measuring guest visits
    },
    pageVisited: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    deviceType: {
      type: String,
      default: 'Unknown',
    },
    browser: {
      type: String,
      default: 'Unknown',
    },
    geoData: {
      ip: { type: String, required: true },
      country: { type: String, default: 'Unknown' },
      state: { type: String },
      city: { type: String, default: 'Unknown' },
      latitude: { type: Number },
      longitude: { type: Number },
    },
  },
  {
    timestamps: true,
  }
);

trafficLogSchema.index({ timestamp: -1 });

const TrafficLog = mongoose.model<ITrafficLog>('TrafficLog', trafficLogSchema);
export default TrafficLog;
