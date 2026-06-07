import { Router } from 'express';
import { getBranches, createBranch, getBusinesses, createBusiness } from '../controllers/branchController';
import { authenticate, authorizeRole } from '../middleware/authMiddleware';

const router = Router();

router.get('/businesses', authenticate, getBusinesses);
router.post('/businesses', authenticate, authorizeRole(['OWNER', 'ADMIN']), createBusiness);

router.get('/', authenticate, getBranches);
router.post('/', authenticate, authorizeRole(['OWNER', 'ADMIN']), createBranch);

export default router;
