import mongoose, { Schema, Document } from 'mongoose';
import { IAuditable, auditPlugin } from '../plugins/auditPlugin';

export interface IMovie extends Document, IAuditable {
  title: string;
  slug: string;
  description: string;
  price: number;
  rentalDuration: number; // in hours
  thumbnailUrl: string;
  mobileThumbnailUrl?: string;
  trailerUrl: string;
  videoLibraryId: string;
  genre: string;
  director: string;
  writers: string[];
  stars: string[];
  imdbRating: number;
  language: string;
  releaseYear: number;
  duration?: string;
  ageRating?: string;
  isActive: boolean;
  displayLocations: string[];
  inviteReferralsCampaignId: number | null;
  promoBox1Title?: string;
  promoBox1Text?: string;
  promoBox2Title?: string;
  promoBox2Text?: string;
  tagline?: string;
  tags?: string[];
  castDetails?: { name: string; role: string; imageUrl: string }[];
  userScore?: number;
  ratingCount?: string;
  trailerDuration?: string;
  additionalClips?: { title: string; duration: string; thumbnailUrl: string; videoUrl: string }[];
  bannerPosition?: number;
  trendingPosition?: number;
  newReleasesPosition?: number;
  createdAt: Date;
}

const movieSchema = new Schema<IMovie>(
  {
    title: { type: String, required: true },
    slug: { type: String, unique: true, sparse: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    rentalDuration: { type: Number, required: true, default: 48 },
    thumbnailUrl: { type: String, required: true },
    mobileThumbnailUrl: { type: String },
    trailerUrl: { type: String },
    videoLibraryId: { type: String, required: true }, // Bunny.net mapping
    genre: { type: String, required: true },
    director: { type: String },
    writers: [{ type: String }],
    stars: [{ type: String }],
    imdbRating: { type: Number, default: 0 },
    language: { type: String },
    releaseYear: { type: Number },
    duration: { type: String, default: null },
    ageRating: { type: String, default: 'U/A 16+' },
    isActive: { type: Boolean, default: true },
    bannerPosition: { type: Number, default: 0 },
    trendingPosition: { type: Number, default: 0 },
    newReleasesPosition: { type: Number, default: 0 },
    displayLocations: [{ type: String, enum: ['home_banner', 'trending', 'new_releases'] }],
    inviteReferralsCampaignId: { type: Number, default: null },
    promoBox1Title: { type: String, default: null },
    promoBox1Text: { type: String, default: null },
    promoBox2Title: { type: String, default: null },
    promoBox2Text: { type: String, default: null },
    tagline: { type: String, default: null },
    tags: [{ type: String }],
    castDetails: [{ 
      name: { type: String }, 
      role: { type: String }, 
      imageUrl: { type: String } 
    }],
    userScore: { type: Number, default: 0 },
    ratingCount: { type: String, default: null },
    trailerDuration: { type: String, default: null },
    additionalClips: [{
      title: { type: String },
      duration: { type: String },
      thumbnailUrl: { type: String },
      videoUrl: { type: String }
    }],
  },
  { timestamps: true }
);

movieSchema.plugin(auditPlugin);

export default mongoose.model<IMovie>('Movie', movieSchema);
