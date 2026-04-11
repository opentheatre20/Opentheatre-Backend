import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import User from '../models/User';
import Movie from '../models/Movie';
import AppConfig from '../models/AppConfig';
import path from 'path';

// Load env from one level up (backend folder)
dotenv.config({ path: path.join(__dirname, '../../.env') });

const moviesData = [
  {
    title: 'The Eternal Echo',
    slug: 'the-eternal-echo',
    description: 'A psychological thriller exploring the boundaries of memory and identity. A young scientist discovers a way to replay memories, but soon finds out they can be altered by an external force.',
    price: 149,
    rentalDuration: 48,
    thumbnailUrl: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=800',
    trailerUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    videoLibraryId: 'ee-101',
    genre: 'Sci-Fi, Thriller',
    director: 'Aria Sterling',
    writers: ['Leo Croft'],
    stars: ['Mia Jensen', 'David Thorne'],
    imdbRating: 8.2,
    language: 'English',
    releaseYear: 2024,
    isActive: true
  },
  {
    title: 'Shadows of Silk Road',
    slug: 'shadows-of-silk-road',
    description: 'An epic historical drama set in the 14th century, following a merchant\'s dangerous journey through Central Asia. Hidden secrets and ancient rivalries threaten his mission to save his family.',
    price: 199,
    rentalDuration: 72,
    thumbnailUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=800',
    trailerUrl: '',
    videoLibraryId: 'ssr-202',
    genre: 'Drama, History',
    director: 'Chen Wei',
    writers: ['Elena Petrova'],
    stars: ['Rajesh Kumar', 'Sofia Rossi'],
    imdbRating: 7.9,
    language: 'English',
    releaseYear: 2023,
    isActive: true
  },
  {
    title: 'Midnight in Mumbai',
    slug: 'midnight-in-mumbai',
    description: 'A vibrant noir story set in the bustling streets of Mumbai. A retired detective is pulled back for one last case that connects the city\'s elite with its dark underbelly.',
    price: 129,
    rentalDuration: 24,
    thumbnailUrl: 'https://images.unsplash.com/photo-1566552881560-0be862a7c445?auto=format&fit=crop&q=80&w=800',
    trailerUrl: '',
    videoLibraryId: 'mim-303',
    genre: 'Crime, Noir',
    director: 'Vikram Sahai',
    writers: ['Aditi Rao'],
    stars: ['Anjali Gupta', 'Omar Qureshi'],
    imdbRating: 8.5,
    language: 'Hindi',
    releaseYear: 2024,
    isActive: true
  }
];

const seedDB = async () => {
  try {
    const dbUri = process.env.MONGODB_URI;
    if (!dbUri) throw new Error('MONGODB_URI not found in environment');

    console.log('Connecting to MongoDB...');
    await mongoose.connect(dbUri);
    console.log('✅ Connection Successful');

    // Clear existing data
    console.log('Checking for existing data...');
    const userCount = await User.countDocuments();
    const movieCount = await Movie.countDocuments();
    
    if (userCount > 0 || movieCount > 0) {
      console.log('Data already exists. Skipping seed to prevent duplicates.');
      console.log(`Found: ${userCount} users, ${movieCount} movies.`);
      process.exit(0);
    }

    // 1. AppConfig
    console.log('Seeding AppConfig...');
    await AppConfig.create({
      chromecastEnabled: true,
      chromecastRestrictions: false
    });

    // 2. Default Admin
    console.log('Seeding Admin User...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);
    
    await User.create({
      name: 'Open Theatre Admin',
      email: 'admin@opentheatre.com',
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      provider: 'local'
    });

    // 3. Seed Movies
    console.log('Seeding Movies...');
    await Movie.insertMany(moviesData);

    console.log('🎉 Database Initialized and Seeded Successfully!');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  }
};

seedDB();
