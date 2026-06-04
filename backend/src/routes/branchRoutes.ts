import { Router } from 'express';
import { getBranches, createBranch } from '../controllers/branchController';
import { authenticate, authorizeRole } from '../middleware/authMiddleware';

const router = Router();

router.get('/', authenticate, getBranches);
router.post('/', authenticate, authorizeRole(['OWNER', 'ADMIN']), createBranch);

export default router;
