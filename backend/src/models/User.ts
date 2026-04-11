import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcrypt";
import { IAuditable, auditPlugin } from '../plugins/auditPlugin';

export interface IUser extends Document, IAuditable {
  name: string;
  email?: string;
  phoneNumber?: string;
  password?: string;
  role: "user" | "admin" | "MODERATOR" | "ADMIN" | "SUPER_ADMIN";
  provider?: "local" | "google" | "facebook" | "phone";
  providerId?: string;
  location?: {
    ip: string;
    country: string;
    city: string;
    lat: number;
    lng: number;
  };
  geoData?: {
    ip: string;
    country: string;
    state?: string;
    city: string;
    latitude?: number;
    longitude?: number;
  };
  isDeleted: boolean;
  createdAt: Date;
  matchPassword(enteredPassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, unique: true, sparse: true },
    phoneNumber: { type: String, unique: true, sparse: true },
    password: { type: String },
    role: {
      type: String,
      enum: ['user', 'admin', 'MODERATOR', 'ADMIN', 'SUPER_ADMIN'],
      default: 'user',
    },
    provider: { type: String, default: "local" },
    providerId: { type: String },
    location: {
      country: { type: String },
      city: { type: String },
      lat: { type: Number },
      lng: { type: Number },
      ip: { type: String }
    },
  },
  { timestamps: true },
);

userSchema.plugin(auditPlugin);

userSchema.methods.matchPassword = async function (enteredPassword: string) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.pre("save", async function () {
  if (!this.isModified("password") || !this.password) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

export default mongoose.model<IUser>("User", userSchema);

declare global {
  namespace Express {
    interface User extends IUser {}
    interface Request {
      user?: IUser;
    }
  }
}

