import mongoose, { Schema, Document } from 'mongoose';
import { IAuditable, auditPlugin } from '../plugins/auditPlugin';

export interface IReview extends Document, IAuditable {
  user: any;
  movie: any;
  rating: number;
  title?: string;
  comment: string;
  verifiedPurchase: boolean;
  likes: mongoose.Types.ObjectId[];
  dislikes: mongoose.Types.ObjectId[];
  helpfulVotes: number;
  createdAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    movie: { type: mongoose.Schema.Types.ObjectId, ref: 'Movie', required: true },
    rating: { type: Number, required: true, min: 1, max: 10 },
    title: { type: String },
    comment: { type: String, required: true },
    verifiedPurchase: { type: Boolean, default: false },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    dislikes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

reviewSchema.plugin(auditPlugin);

// Virtual for helpfulVotes (likes - dislikes)
reviewSchema.virtual('helpfulVotes').get(function () {
  return this.likes.length - this.dislikes.length;
});

// Ensure virtuals are included in JSON/Object conversions
reviewSchema.set('toJSON', { virtuals: true });
reviewSchema.set('toObject', { virtuals: true });

export default mongoose.model<IReview>('Review', reviewSchema);
