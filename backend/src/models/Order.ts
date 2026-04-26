import mongoose, { Schema, Document } from 'mongoose';
import { IAuditable, auditPlugin } from '../plugins/auditPlugin';

export interface IOrder extends Document, IAuditable {
  userId: mongoose.Types.ObjectId;
  movieId: mongoose.Types.ObjectId;
  paymentId: string; // Razorpay payment ID
  amount: number;
  accessExpiresAt: Date;
  createdAt: Date;
}

const orderSchema = new Schema<IOrder>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    movieId: { type: Schema.Types.ObjectId, ref: 'Movie', required: true },
    paymentId: { type: String, required: true, unique: true },
    amount: { type: Number, required: true },
    accessExpiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

orderSchema.plugin(auditPlugin);

export default mongoose.model<IOrder>('Order', orderSchema);
