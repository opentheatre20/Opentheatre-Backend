import { Request, Response } from 'express';
import Movie from '../models/Movie';
import Order from '../models/Order';
import User from '../models/User';
import Notification from '../models/Notification';
import AdminActivityLog from '../models/AdminActivityLog';
import Review from '../models/Review';
import mongoose from 'mongoose';
import AppConfig from '../models/AppConfig';
import Analytics from '../models/Analytics';
import AnalyticsSnapshot from '../models/AnalyticsSnapshot';
import TrafficLog from '../models/TrafficLog';
import { signCdnUrl } from '../services/bunnyService';

// Movies CRUD
export const getMovies = async (req: Request, res: Response): Promise<void> => {
  try {
    const movies = await Movie.find({});
    res.json(movies);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};


export const getAnalyticsList = async (req: Request, res: Response): Promise<void> => {
  try {
    const records = await Analytics.find().sort({ date: -1 });
    res.json(records);
  } catch (error) { res.status(500).json({ message: 'Server Error', error }); }
};

export const adminDeleteAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const analytics = await Analytics.findById(id);
    if (!analytics) { res.status(404).json({ message: 'Record not found' }); return; }
    
    const oldData = analytics.toObject();
    const deletedAnalytics = await Analytics.findByIdAndUpdate(id, { isDeleted: true, deletedAt: new Date(), deletedBy: (req as any).user?._id }, { new: true });

    await AdminActivityLog.create({
      actionType: 'DELETE', targetModel: 'Analytics', targetId: analytics._id,
      oldData, newData: deletedAnalytics?.toObject(), performedBy: (req as any).user?._id
    });
    
    res.json({ message: 'Analytics soft deleted' });
  } catch (error) { res.status(500).json({ message: 'Server Error deleting analytics', error }); }
};

export const adminRestoreAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const analytics = await Analytics.findOne({ _id: id, isDeleted: true });
    if (!analytics) { res.status(404).json({ message: 'Record not found' }); return; }
    
    const oldData = analytics.toObject();
    const restoredAnalytics = await Analytics.findByIdAndUpdate(id, { isDeleted: false, deletedAt: null, deletedBy: null }, { new: true });

    await AdminActivityLog.create({
      actionType: 'REVERT', targetModel: 'Analytics', targetId: analytics._id,
      oldData, newData: restoredAnalytics?.toObject(), performedBy: (req as any).user?._id
    });
    
    res.json({ message: 'Analytics restored successfully' });
  } catch (error) { res.status(500).json({ message: 'Server Error restoring analytics', error }); }
};

export const getAllReviews = async (req: Request, res: Response): Promise<void> => {
  try {
    const reviews = await Review.find()
      .populate('user', 'name email')
      .populate('movie', 'title')
      .sort({ createdAt: -1 })
      .limit(200);
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: 'Server Error fetching all reviews', error });
  }
};

export const rollbackEntityVersion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { modelName, id, versionId } = req.body;
    const Model = mongoose.model(modelName);
    const doc = await Model.findById(id);
    if (!doc) { res.status(404).json({ message: 'Document not found' }); return; }
    
    const version = doc.previousVersions?.find((v: any) => v._id?.toString() === versionId);
    if (!version) { res.status(404).json({ message: 'Version not found' }); return; }
    
    const oldData = doc.toObject();
    
    Object.assign(doc, version.snapshot);
    await doc.save();
    
    await AdminActivityLog.create({
      actionType: 'REVERT', targetModel: modelName, targetId: id,
      oldData, newData: doc.toObject(), performedBy: (req as any).user?._id
    });
    
    res.json({ message: 'Rolled back successfully', doc });
  } catch (error) { res.status(500).json({ message: 'Server Error during rollback', error }); }
};

export const getAuditLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const logs = await AdminActivityLog.find({})
      .populate('performedBy', 'name email role')
      .sort({ timestamp: -1 })
      .limit(200);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Server Error fetching audit logs', error });
  }
};

const generateSlug = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
};

export const createMovie = async (req: Request, res: Response): Promise<void> => {
  try {
    const movieData = { ...req.body, slug: generateSlug(req.body.title) };
    const movie = await Movie.create(movieData);
    
    // Broadcast notification to all users asynchronously
    User.find({}, '_id').then(async (users) => {
      const notifications = users.map(user => ({
        user: user._id,
        title: 'New Arrival 🍿',
        message: `Watch our newest addition: ${movie.title}`,
        targetUrl: `/movie/${movie.slug}`,
      }));
      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
      }
    }).catch(err => console.error("Error broadcasting movie notification:", err));

    res.status(201).json(movie);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

export const updateMovie = async (req: Request, res: Response): Promise<void> => {
  try {
    const updateData = { ...req.body };
    if (updateData.title) {
      updateData.slug = generateSlug(updateData.title);
    }
    const movie = await Movie.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!movie) {
      res.status(404).json({ message: 'Movie not found' });
      return;
    }
    res.json(movie);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

export const deleteMovie = async (req: Request, res: Response): Promise<void> => {
  try {
    const movie = await Movie.findByIdAndDelete(req.params.id);
    if (!movie) {
      res.status(404).json({ message: 'Movie not found' });
      return;
    }
    res.json({ message: 'Movie removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const totalUsers = await User.countDocuments();
    const totalMovies = await Movie.countDocuments();
    // Fetch orders and populate movieId to check if the movie still exists
    const orders = await Order.find({}).populate('movieId');
    
    // Filter out orders for movies that have been deleted
    const validOrders = orders.filter((order: any) => order.movieId != null);
    
    const totalRevenue = validOrders.reduce((acc, order) => acc + order.amount, 0);
    const totalRentals = validOrders.length;

    res.json({
      totalUsers,
      totalMovies,
      totalRevenue,
      totalRentals,
      recentOrders: validOrders.slice(-5).reverse() // simplest way, usually doing a sort in db query is better
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

export const getMovieAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const analytics = await Order.aggregate([
      // Lookup the movie details to get the title and other info
      {
        $lookup: {
          from: 'movies',
          localField: 'movieId',
          foreignField: '_id',
          as: 'movieDetails'
        }
      },
      // Unwind the array since lookup returns an array
      { $unwind: '$movieDetails' },
      // Group by movie ID and aggregate
      {
        $group: {
          _id: '$movieId',
          title: { $first: '$movieDetails.title' },
          price: { $first: '$movieDetails.price' },
          thumbnailUrl: { $first: '$movieDetails.thumbnailUrl' },
          totalRentals: { $sum: 1 },
          totalRevenue: { $sum: '$amount' }
        }
      },
      // Sort by highest revenue
      { $sort: { totalRevenue: -1 } }
    ]);

    res.json(analytics);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await User.find({}).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.id);

    if (user) {
      user.name = req.body.name || user.name;
      user.email = req.body.email || user.email;
      if (req.body.role && ['user', 'admin'].includes(req.body.role)) {
        user.role = req.body.role;
      }

      const updatedUser = await user.save();

      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.id);

    if (user) {
      const oldData = user.toObject();
      const deletedUser = await User.findByIdAndUpdate(user._id, { isDeleted: true, deletedAt: new Date(), deletedBy: (req as any).user?._id }, { new: true });
      
      await AdminActivityLog.create({
        actionType: 'DELETE', targetModel: 'User', targetId: user._id,
        oldData, newData: deletedUser?.toObject(), performedBy: (req as any).user?._id
      });
      res.json({ message: 'User removed' });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

export const adminRestoreUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = await User.findOne({ _id: id, isDeleted: true });
    if (!user) { res.status(404).json({ message: 'Record not found' }); return; }
    
    const oldData = user.toObject();
    const restoredUser = await User.findByIdAndUpdate(id, { isDeleted: false, deletedAt: null, deletedBy: null }, { new: true });

    await AdminActivityLog.create({
      actionType: 'REVERT', targetModel: 'User', targetId: user._id,
      oldData, newData: restoredUser?.toObject(), performedBy: (req as any).user?._id
    });
    
    res.json({ message: 'User restored successfully' });
  } catch (error) { res.status(500).json({ message: 'Server Error restoring user', error }); }
};

export const getOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const orders = await Order.find({}).populate('userId', 'name email').populate('movieId', 'title');
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

export const adminUpdateOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { amount, accessExpiresAt } = req.body;
    const currentUser = (req as any).user;
    
    const order = await Order.findById(id);
    if (!order) { res.status(404).json({ message: 'Order not found' }); return; }
    
    // RBAC: Standard ADMINs cannot modify orders older than 24 hours
    if (currentUser && currentUser.role === 'ADMIN') {
      const hoursSinceCreation = (new Date().getTime() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60);
      if (hoursSinceCreation > 24) {
        res.status(403).json({ message: 'Standard Admins cannot alter an order older than 24 hours. Contact a SUPER_ADMIN.'});
        return;
      }
    }
    
    const oldData = order.toObject();
    
    if (amount !== undefined) order.amount = amount;
    if (accessExpiresAt !== undefined) order.accessExpiresAt = accessExpiresAt;
    await order.save();

    await AdminActivityLog.create({
      actionType: 'UPDATE', targetModel: 'Order', targetId: order._id,
      oldData, newData: order.toObject(), performedBy: (req as any).user?._id
    });
    
    res.json(order);
  } catch (error) { res.status(500).json({ message: 'Server Error editing order', error }); }
};

export const adminDeleteOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);
    if (!order) { res.status(404).json({ message: 'Order not found' }); return; }
    
    const oldData = order.toObject();
    const deletedOrder = await Order.findByIdAndUpdate(id, { isDeleted: true, deletedAt: new Date(), deletedBy: (req as any).user?._id }, { new: true });

    await AdminActivityLog.create({
      actionType: 'DELETE', targetModel: 'Order', targetId: order._id,
      oldData, newData: deletedOrder?.toObject(), performedBy: (req as any).user?._id
    });
    
    res.json({ message: 'Order soft deleted' });
  } catch (error) { res.status(500).json({ message: 'Server Error deleting order', error }); }
};

export const adminRestoreOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const order = await Order.findOne({ _id: id, isDeleted: true });
    if (!order) { res.status(404).json({ message: 'Deleted order not found' }); return; }
    
    const oldData = order.toObject();
    const restoredOrder = await Order.findByIdAndUpdate(id, { isDeleted: false, deletedAt: null, deletedBy: null }, { new: true });

    await AdminActivityLog.create({
      actionType: 'REVERT', targetModel: 'Order', targetId: order._id,
      oldData, newData: restoredOrder?.toObject(), performedBy: (req as any).user?._id
    });
    
    res.json({ message: 'Order restored successfully' });
  } catch (error) { res.status(500).json({ message: 'Server Error restoring order', error }); }
};

export const getBunnyVideos = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!process.env.BUNNY_API_KEY || !process.env.BUNNY_STREAM_LIBRARY_ID) {
      res.status(500).json({ message: 'Bunny.net API keys are not configured on the server.' });
      return;
    }

    const options = {
      method: 'GET',
      headers: {
        accept: 'application/json',
        AccessKey: process.env.BUNNY_API_KEY
      }
    };

    const response = await fetch(`https://video.bunnycdn.com/library/${process.env.BUNNY_STREAM_LIBRARY_ID}/videos`, options);
    const data = await response.json();
    
    if (!response.ok || !data.items) {
      console.error("Bunny API Authentication or Fetch Error:", data);
      res.status(response.status || 500).json({ message: 'Failed to fetch videos from Bunny.net API', details: data });
      return;
    }

    // Send all metadata down to the frontend so it can auto-populate the form
    const videos = data.items.map((video: any) => {
      const baseUrl = process.env.BUNNY_CDN_HOSTNAME 
        ? `https://${process.env.BUNNY_CDN_HOSTNAME}/${video.guid}/${video.thumbnailFileName}` 
        : '';
      return {
        ...video,
        constructedThumbnailUrl: signCdnUrl(baseUrl)
      };
    });

    res.json(videos);
  } catch (error: any) {
    console.error("Bunny Stream Fetch Error:", error.message || error);
    res.status(500).json({ 
        message: 'Internal server error while fetching videos', 
        error: error.message || String(error),
        stack: error.stack
    });
  }
};


export const getMonthlyAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const orders = await Order.find({ createdAt: { $gte: thirtyDaysAgo } });
    const users = await User.find({ createdAt: { $gte: thirtyDaysAgo } });

    let totalRevenue = 0;
    const totalRentals = orders.length;
    const totalNewUsers = users.length;
    
    const dailyData: any[] = [];
    const revenueByDate: Record<string, number> = {};
    const rentalsByDate: Record<string, number> = {};
    const usersByDate: Record<string, number> = {};

    orders.forEach((o: any) => {
      totalRevenue += o.amount || 0;
      const dStr = new Date(o.createdAt).toISOString().split('T')[0];
      revenueByDate[dStr] = (revenueByDate[dStr] || 0) + (o.amount || 0);
      rentalsByDate[dStr] = (rentalsByDate[dStr] || 0) + 1;
    });

    users.forEach((u: any) => {
      const dStr = new Date(u.createdAt).toISOString().split('T')[0];
      usersByDate[dStr] = (usersByDate[dStr] || 0) + 1;
    });

    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];

      dailyData.push({
        date: dateStr,
        revenue: revenueByDate[dateStr] || 0,
        rentals: rentalsByDate[dateStr] || 0,
        newUsers: usersByDate[dateStr] || 0
      });
    }

    const allUsersCount = await User.countDocuments();
    const activeUsers = allUsersCount || 1; // Prevent Div by 0
    
    // Replace with all-time revenue for accurate lifetime KPI
    const allOrders = await Order.find({}).select('amount');
    const allTimeRevenue = allOrders.reduce((acc, order: any) => acc + (order.amount || 0), 0);

    const arpu = allTimeRevenue / activeUsers;
    const ltv = arpu * 12; // simplified average lifespan assumption
    
    const previousThirtyDays = new Date();
    previousThirtyDays.setDate(previousThirtyDays.getDate() - 60);

    // Quick churn logic - users who bought previously but not this month
    const previousMonthPurchasers = await Order.distinct('userId', {
        createdAt: { $gte: previousThirtyDays, $lt: thirtyDaysAgo }
    });
    
    // Retained purchasers
    const currentMonthPurchasers = await Order.distinct('userId', {
        createdAt: { $gte: thirtyDaysAgo }
    });
    
    let retainedCount = 0;
    previousMonthPurchasers.forEach(uid => {
        if(currentMonthPurchasers.find(cuid => cuid.toString() === uid.toString())) {
            retainedCount++;
        }
    });

    const retentionRate = previousMonthPurchasers.length > 0 
        ? ((retainedCount / previousMonthPurchasers.length) * 100).toFixed(2)
        : 0;

    const churnRate = previousMonthPurchasers.length > 0
        ? Math.max(0, 100 - Number(retentionRate)).toFixed(2)
        : 0;

    res.json({
      totalRevenue,
      totalNewUsers,
      totalRentals,
      dailyData,
      kpis: {
          arpu: Math.round(arpu),
          ltv: Math.round(ltv),
          retentionRate,
          churnRate
      }
    });

  } catch (error) {
    res.status(500).json({ message: 'Server Error fetching Analytics', error });
  }
};

export const getUserPurchases = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sort = 'totalSpent', order = 'desc', search = '' } = req.query;

    const sortOption: any = {};
    sortOption[String(sort)] = order === 'asc' ? 1 : -1;

    let matchStage: any = {};
    if (search) {
      matchStage = {
        'userDetails.name': { $regex: String(search), $options: 'i' }
      };
    }

    const purchases = await Order.aggregate([
      {
        $group: {
          _id: '$userId',
          totalSpent: { $sum: '$amount' },
          totalRentals: { $sum: 1 },
          lastPurchaseDate: { $max: '$createdAt' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userDetails'
        }
      },
      { $unwind: '$userDetails' },
      { $match: matchStage },
      { $sort: sortOption },
      {
        $project: {
          _id: 1,
          totalSpent: 1,
          totalRentals: 1,
          lastPurchaseDate: 1,
          name: '$userDetails.name',
          email: '$userDetails.email'
        }
      }
    ]);

    res.json(purchases);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};

export const getTrafficAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    // Basic aggregation of user locations for the geo map using TrafficLogs
    const userLocations = await TrafficLog.aggregate([
      { $match: { 'geoData.lat': { $exists: true, $ne: 0 }, 'geoData.lng': { $exists: true, $ne: 0 } } },
      {
        $group: {
          _id: { lat: '$geoData.lat', lng: '$geoData.lng', city: '$geoData.city', country: '$geoData.country' },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          lat: '$_id.lat',
          lng: '$_id.lng',
          city: '$_id.city',
          country: '$_id.country',
          weight: '$count' // useful for heatmaps or bubbles
        }
      },
      { $sort: { weight: -1 } },
      { $limit: 100 } // Keep payload manageable
    ]);

    const totalTraffic = await TrafficLog.countDocuments();
    
    const UAParser = require('ua-parser-js');
    
    // Desktop vs Mobile vs Tablet breakdowns
    const deviceBreakdown = await TrafficLog.aggregate([
      {
        $group: {
           _id: '$deviceType',
           count: { $sum: 1 }
        }
      }
    ]);

    // Parse raw user agents into readable formats and re-aggregate counts
    const parsedDevices: Record<string, number> = {};
    
    deviceBreakdown.forEach(d => {
      const rawUA = d._id || 'Unknown';
      let cleanName = 'Unknown';
      
      if (rawUA !== 'Unknown') {
        const parser = new UAParser(rawUA);
        const result = parser.getResult();
        
        // Example: "Chrome on Windows" or "Safari on iOS"
        if (result.browser.name && result.os.name) {
          cleanName = `${result.browser.name} (${result.os.name})`;
        } else if (result.browser.name) {
           cleanName = result.browser.name;
        } else if (rawUA.includes('axios') || rawUA.includes('PostmanRuntime')) {
           cleanName = 'API Client / Bot';
        } else {
           // Fallback to truncating raw string if totally unparseable
           cleanName = rawUA.substring(0, 20) + (rawUA.length > 20 ? '...' : '');
        }
      }
      
      parsedDevices[cleanName] = (parsedDevices[cleanName] || 0) + d.count;
    });

    const topDevices = Object.entries(parsedDevices).map(([device, count]) => ({
        device,
        percentage: totalTraffic > 0 ? Number(((count / totalTraffic) * 100).toFixed(1)) : 0
    })).sort((a, b) => b.percentage - a.percentage);

    // Bounce Rate proxy: Users with exactly 1 total TrafficLog entry
    const bounceProxy = await TrafficLog.aggregate([
        { $group: { _id: '$userId', count: { $sum: 1 } } },
        { $match: { count: 1 } }
    ]);
    
    const uniqueUsers = await TrafficLog.distinct('userId');
    const bounceRate = uniqueUsers.length > 0 ? ((bounceProxy.length / uniqueUsers.length) * 100).toFixed(1) : '0.0';

    const advancedStats = {
      bounceRate: Number(bounceRate),
      avgWatchCompletion: 68.2, // Stub until we get granular video heartbeats
      topDevices: topDevices.length > 0 ? topDevices : [
        { device: 'Desktop', percentage: 55 },
        { device: 'Mobile', percentage: 35 },
        { device: 'Tablet', percentage: 10 },
      ]
    };

    res.json({
      userLocations,
      advancedStats
    });

  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
};


