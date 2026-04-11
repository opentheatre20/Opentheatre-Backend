import mongoose, { Document, Schema } from 'mongoose';
import { IAuditable, auditPlugin } from '../plugins/auditPlugin';

export interface INotification extends Document, IAuditable {
  user: mongoose.Types.ObjectId;
  title: string;
  message: string;
  targetUrl?: string; // e.g. /movie/some-slug
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    targetUrl: {
      type: String,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.plugin(auditPlugin);

// Optional: Automatically delete notifications older than 30 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

const Notification = mongoose.model<INotification>('Notification', notificationSchema);

export default Notification;
