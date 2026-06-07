import { Router } from 'express';
import { register, login, getProfile, forgotPassword, resetPassword, logout, changePassword } from '../controllers/authController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/profile', authenticate, getProfile);
router.post('/logout', authenticate, logout);
router.post('/change-password', authenticate, changePassword);

export default router;


