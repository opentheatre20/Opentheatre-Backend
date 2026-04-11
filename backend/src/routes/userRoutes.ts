import express from 'express';
import { getProfile, updateProfile, deleteAccount } from '../controllers/userController';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

router.route('/profile')
  .get(protect, getProfile)
  .put(protect, updateProfile)
  .delete(protect, deleteAccount);

export default router;
