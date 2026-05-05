import mongoose, { Schema, Document } from 'mongoose';
import { IAuditable, auditPlugin } from '../plugins/auditPlugin';

export interface IEmailTemplate extends Document, IAuditable {
  name: string;
  subject: string;
  htmlContent: string;
  variables: string[]; // e.g. ['userName', 'resetUrl', 'movieTitle']
  description?: string;
}

const emailTemplateSchema = new Schema<IEmailTemplate>(
  {
    name: { 
      type: String, 
      required: true, 
      unique: true, 
      trim: true 
    },
    subject: { 
      type: String, 
      required: true 
    },
    htmlContent: { 
      type: String, 
      required: true 
    },
    variables: [{ 
      type: String 
    }],
    description: { 
      type: String 
    }
  },
  { timestamps: true }
);

emailTemplateSchema.plugin(auditPlugin);

export default mongoose.model<IEmailTemplate>('EmailTemplate', emailTemplateSchema);
