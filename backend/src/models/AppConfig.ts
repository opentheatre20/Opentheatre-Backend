import mongoose, { Schema, Document } from 'mongoose';
import { IAuditable, auditPlugin } from '../plugins/auditPlugin';

export interface IAppConfig extends Document, IAuditable {
  chromecastEnabled: boolean;
  chromecastRestrictions: boolean;
}

const appConfigSchema = new Schema<IAppConfig>(
  {
    chromecastEnabled: { type: Boolean, default: true },
    chromecastRestrictions: { type: Boolean, default: false },
  },
  { timestamps: true }
);

appConfigSchema.plugin(auditPlugin);

export default mongoose.model<IAppConfig>('AppConfig', appConfigSchema);
