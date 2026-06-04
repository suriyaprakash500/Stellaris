import { Router } from 'express';
import { getBusinessSettings, updateBusinessSettings } from '../controllers/businessController';
import { authenticate, authorizeRole } from '../middleware/authMiddleware';

const router = Router();

router.get('/', authenticate, getBusinessSettings);
router.put('/', authenticate, authorizeRole(['ADMIN', 'MANAGER']), updateBusinessSettings);

export default router;
