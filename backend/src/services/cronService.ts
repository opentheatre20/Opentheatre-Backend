import cron from 'node-cron';
import User from '../models/User';
import Order from '../models/Order';
import AnalyticsSnapshot from '../models/AnalyticsSnapshot';
import Movie from '../models/Movie';

export const initCronJobs = () => {
  // Run Daily at Midnight "0 0 * * *"
  cron.schedule('0 0 * * *', async () => {
    try {
      console.log('Running Daily Analytics Snapshot CRON Job...');
      await generateSnapshot('DAILY');
    } catch (err) {
      console.error('Failed to run Daily Snapshot', err);
    }
  });

  // Run Weekly on Sunday at Midnight "0 0 * * 0"
  cron.schedule('0 0 * * 0', async () => {
    try {
      console.log('Running Weekly Analytics Snapshot CRON Job...');
      await generateSnapshot('WEEKLY');
    } catch (err) {
      console.error('Failed to run Weekly Snapshot', err);
    }
  });

  // Run Monthly on the 1st of the month at Midnight "0 0 1 * *"
  cron.schedule('0 0 1 * *', async () => {
    try {
      console.log('Running Monthly Analytics Snapshot CRON Job...');
      await generateSnapshot('MONTHLY');
    } catch (err) {
      console.error('Failed to run Monthly Snapshot', err);
    }
  });

  console.log('CRON Services Initialized.');
};

const generateSnapshot = async (type: 'DAILY' | 'WEEKLY' | 'MONTHLY') => {
  const endDate = new Date();
  const startDate = new Date();
  
  if (type === 'DAILY') startDate.setDate(endDate.getDate() - 1);
  if (type === 'WEEKLY') startDate.setDate(endDate.getDate() - 7);
  if (type === 'MONTHLY') startDate.setMonth(endDate.getMonth() - 1);

  // Measure orders in timescale
  const orders = await Order.find({ 
    createdAt: { $gte: startDate, $lt: endDate },
    isDeleted: { $ne: true } 
  });

  const totalRevenue = orders.reduce((acc, order: any) => acc + order.amountPaid, 0);
  const totalRentals = orders.length;

  // Measure users in timescale
  const activeUsers = await User.countDocuments({ updatedAt: { $gte: startDate, $lt: endDate }, isDeleted: { $ne: true } });
  const newUsers = await User.countDocuments({ createdAt: { $gte: startDate, $lt: endDate }, isDeleted: { $ne: true } });

  // Top Movie measurement
  const movieCounts: Record<string, number> = {};
  orders.forEach(o => {
    const mId = o.movieId.toString();
    movieCounts[mId] = (movieCounts[mId] || 0) + 1;
  });

  let topMovieId = null;
  let maxCount = 0;
  for (const [mId, count] of Object.entries(movieCounts)) {
    if (count > maxCount) { maxCount = count; topMovieId = mId; }
  }

  // Determine topCity / topCountry placeholder logic - would source from TrafficLog normally
  const topCity = 'Global'; 
  const topCountry = 'Global';

  await AnalyticsSnapshot.findOneAndUpdate(
    { date: endDate.toISOString().split('T')[0], snapshotType: type },
    {
      date: new Date(endDate.toISOString().split('T')[0]),
      totalRevenue,
      totalRentals,
      activeUsers,
      newUsers,
      averageWatchTime: 45, // Placeholder for future feature
      topMovie: topMovieId,
      topCity,
      topCountry,
      conversionRate: activeUsers > 0 ? (totalRentals / activeUsers) * 100 : 0,
      snapshotType: type
    },
    { upsert: true, new: true }
  );
  
  console.log(`[${type}] Snapshot Cached.`);
};
