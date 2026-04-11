import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import User from './models/User';
import Movie from './models/Movie';
import AppConfig from './models/AppConfig';
import Review from './models/Review';
import Order from './models/Order';
import WatchHistory from './models/WatchHistory';

dotenv.config();

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/open-theatre');
    console.log('Connected to MongoDB for seeding...');

    // 1. AppConfig
    const config = await AppConfig.create({
      chromecastEnabled: true,
      chromecastRestrictions: false
    });
    console.log('✅ AppConfig seeded');

    // 2. Super Admin User
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);
    
    const admin = await User.create({
      name: 'Super Admin',
      email: 'admin@opentheatre.com',
      password: hashedPassword,
      role: 'SUPER_ADMIN',
    });
    console.log('✅ Super Admin seeded (admin@opentheatre.com / admin123)');

    // 3. Sample Movie
    const movie = await Movie.create({
      title: 'The Great Ott Experience',
      slug: 'the-great-ott-experience',
      description: 'A sample movie to demonstrate the OTT platform capabilities.',
      price: 199,
      rentalDuration: 48,
      thumbnailUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80',
      trailerUrl: '',
      videoLibraryId: 'sample-lib-123',
      genre: 'Action, Drama',
      director: 'Open Theatre Team',
      writers: ['Admin', 'Creator'],
      stars: ['Dev Team'],
      imdbRating: 9.5,
      language: 'English',
      releaseYear: 2024,
      isActive: true
    });
    console.log('✅ Movie seeded');

    // 4. Sample Review
    await Review.create({
      user: admin._id,
      movie: movie._id,
      rating: 5,
      comment: 'This is an amazing sample movie on our platform!',
      verifiedPurchase: true
    });
    console.log('✅ Review seeded');

    // 5. Sample Order (Rental)
    const accessExpiresAt = new Date();
    accessExpiresAt.setHours(accessExpiresAt.getHours() + 48);
    await Order.create({
      userId: admin._id,
      movieId: movie._id,
      paymentId: 'pay_sample123',
      amount: 199,
      accessExpiresAt
    });
    console.log('✅ Order seeded');

    // 7. Sample Watch History
    await WatchHistory.create({
      userId: admin._id,
      movieId: movie._id,
      watchTime: 120, // 2 minutes in
      percentageCompleted: 3.3, // 1 hour total mapping
      lastPosition: 120
    });
    console.log('✅ WatchHistory seeded');

    console.log('🎉 Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
};

seedDB();
