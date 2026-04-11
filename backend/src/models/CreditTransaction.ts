import mongoose, { Schema, Document } from "mongoose";
import { IAuditable, auditPlugin } from '../plugins/auditPlugin';

export interface ICreditTransaction extends Document, IAuditable {
  userId: mongoose.Types.ObjectId;
  amount: number;
  type: "credit_usage" | "admin_adjustment";
  relatedUserId?: mongoose.Types.ObjectId;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const creditTransactionSchema = new Schema<ICreditTransaction>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true },
    type: {
      type: String,
      enum: ["credit_usage", "admin_adjustment"],
      required: true,
    },
    relatedUserId: { type: Schema.Types.ObjectId, ref: "User" },
    description: { type: String },
  },
  { timestamps: true }
);

creditTransactionSchema.plugin(auditPlugin);

export default mongoose.model<ICreditTransaction>("CreditTransaction", creditTransactionSchema);
