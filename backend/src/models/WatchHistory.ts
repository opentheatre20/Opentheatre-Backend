import mongoose, { Schema, Document } from 'mongoose';

export interface IWatchHistory extends Document {
  userId: mongoose.Types.ObjectId;
  movieId: mongoose.Types.ObjectId;
  watchTime: number; // in seconds
  percentageCompleted: number;
  lastPosition: number; // in seconds
  updatedAt: Date;
}

const watchHistorySchema = new Schema<IWatchHistory>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    movieId: { type: Schema.Types.ObjectId, ref: 'Movie', required: true },
    watchTime: { type: Number, default: 0 },
    percentageCompleted: { type: Number, default: 0 },
    lastPosition: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Compound index to ensure uniqueness per user per movie
watchHistorySchema.index({ userId: 1, movieId: 1 }, { unique: true });

export default mongoose.model<IWatchHistory>('WatchHistory', watchHistorySchema);
