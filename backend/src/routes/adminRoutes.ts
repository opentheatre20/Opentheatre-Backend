import express from 'express';
import mongoose from 'mongoose';
import { getMovies, createMovie, updateMovie, deleteMovie, getDashboardStats, getUsers, updateUser, deleteUser, adminRestoreUser, getOrders, getMovieAnalytics, getBunnyVideos, getMonthlyAnalytics, getUserPurchases, getTrafficAnalytics, getAuditLogs, getAllReviews, adminUpdateOrder, adminDeleteOrder, adminRestoreOrder, rollbackEntityVersion, getAnalyticsList, adminDeleteAnalytics, adminRestoreAnalytics } from '../controllers/adminController';
import { adminUpdateReview, adminDeleteReview, adminRestoreReview, adminClearReviews } from '../controllers/reviewController';
import { protect, admin, requireRole } from '../middlewares/authMiddleware';

const router = express.Router();

router.use(protect, admin);

router.route('/movies')
  .get(getMovies)
  .post(createMovie);

router.route('/movies/:id')
  .put(updateMovie)
  .delete(deleteMovie);

router.get('/stats', getDashboardStats);
router.get('/movie-analytics', getMovieAnalytics);
router.get('/analytics/monthly', getMonthlyAnalytics);
router.get('/analytics/traffic', getTrafficAnalytics);
router.get('/analytics/list', getAnalyticsList);
router.delete('/analytics/:id', adminDeleteAnalytics);
router.patch('/analytics/restore/:id', adminRestoreAnalytics);
router.get('/audit-logs', getAuditLogs);
router.post('/rollback', requireRole(['SUPER_ADMIN']), rollbackEntityVersion);
router.get('/purchases', getUserPurchases);
router.get('/users', getUsers);
router.route('/users/:id')
  .put(updateUser)
  .delete(deleteUser)
  .patch(adminRestoreUser);
router.get('/orders', getOrders);
router.put('/orders/:id', requireRole(['SUPER_ADMIN', 'ADMIN']), adminUpdateOrder);
router.delete('/orders/:id', requireRole(['SUPER_ADMIN']), adminDeleteOrder);
router.patch('/orders/restore/:id', requireRole(['SUPER_ADMIN']), adminRestoreOrder);

router.get('/bunny-videos', getBunnyVideos);

router.get('/reviews', getAllReviews);

router.put('/reviews/:id', requireRole(['SUPER_ADMIN', 'ADMIN', 'MODERATOR']), adminUpdateReview as any);
router.delete('/reviews/:id', requireRole(['SUPER_ADMIN', 'ADMIN', 'MODERATOR']), adminDeleteReview as any);
router.patch('/reviews/restore/:id', requireRole(['SUPER_ADMIN', 'ADMIN']), adminRestoreReview as any);
router.post('/reviews/clear', requireRole(['SUPER_ADMIN', 'ADMIN']), adminClearReviews as any);

export default router;
