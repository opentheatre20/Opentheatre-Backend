import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

import Notification from './models/Notification';
import User from './models/User';
import Movie from './models/Movie';

const seedLatestMovieNotification = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI as string);
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Fetch the single most recent active movie
    const latestMovie = await Movie.findOne({ isActive: true }).sort({ createdAt: -1 });

    if (!latestMovie) {
      console.log('No active movies found in the database. Exiting.');
      process.exit(0);
    }

    console.log(`Found latest movie: ${latestMovie.title}. Seeding notifications for it...`);

    // Fetch all users
    const users = await User.find({}, '_id');

    // Filter out users who already have a notification for this exact movie to prevent duplicates if script crashes and reruns
    let skippedCount = 0;
    let seededCount = 0;

    const notifications = [];

    for (const user of users) {
      const existingNotif = await Notification.findOne({
        user: user._id,
        targetUrl: `/movie/${latestMovie.slug}`
      });

      if (existingNotif) {
        skippedCount++;
      } else {
        notifications.push({
          user: user._id,
          title: 'New Arrival 🍿',
          message: `Watch our newest addition: ${latestMovie.title}`,
          targetUrl: `/movie/${latestMovie.slug}`,
          createdAt: new Date(), // Use current time so it floats to the top for them today
        });
        seededCount++;
      }
    }

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    console.log(`Seeded notifications to ${seededCount} users.`);
    console.log(`Skipped ${skippedCount} users who already had this notification.`);
    
    process.exit();
  } catch (error) {
    console.error(`Error: ${error}`);
    process.exit(1);
  }
};

seedLatestMovieNotification();
