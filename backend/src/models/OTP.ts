import mongoose, { Schema, Document } from "mongoose";

export interface IOTP extends Document {
  phoneNumber: string;
  otp: string;
  expiresAt: Date;
}

const otpSchema = new Schema<IOTP>(
  {
    phoneNumber: { type: String, required: true },
    otp: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: { expires: '5m' } }, // Automatically delete after 5 minutes
  },
  { timestamps: true },
);

export default mongoose.model<IOTP>("OTP", otpSchema);
