import { Router } from 'express';
import { getCustomerProfile, submitFeedback, getAllFeedback } from '../controllers/crmController';
import { authenticate, authorizeRole } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticate);

router.get('/profile', getCustomerProfile);
router.post('/feedback', submitFeedback);
router.get('/feedback', authorizeRole(['ADMIN', 'MANAGER']), getAllFeedback);

export default router;
