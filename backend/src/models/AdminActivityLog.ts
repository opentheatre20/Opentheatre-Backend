import mongoose, { Schema, Document } from 'mongoose';

export interface IAdminActivityLog extends Document {
  actionType: 'UPDATE' | 'DELETE' | 'CLEAR' | 'REVERT';
  targetModel: string;
  targetId: mongoose.Types.ObjectId;
  oldData?: any;
  newData?: any;
  performedBy: mongoose.Types.ObjectId;
  timestamp: Date;
}

const adminActivityLogSchema = new Schema<IAdminActivityLog>(
  {
    actionType: { type: String, enum: ['UPDATE', 'DELETE', 'CLEAR', 'REVERT'], required: true },
    targetModel: { type: String, required: true },
    targetId: { type: Schema.Types.ObjectId, required: true },
    oldData: { type: Schema.Types.Mixed },
    newData: { type: Schema.Types.Mixed },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    timestamp: { type: Date, default: Date.now },
  }
);

export default mongoose.model<IAdminActivityLog>('AdminActivityLog', adminActivityLogSchema);
