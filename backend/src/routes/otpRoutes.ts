import express from 'express';
import { sendOTP, verifyOTP } from '../controllers/otpController';

const router = express.Router();

router.post('/send', sendOTP);
router.post('/verify', verifyOTP);

export default router;
