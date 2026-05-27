import { Router } from 'express';
import { getSalesReport, getInventoryReport, getEmployeePerformanceReport } from '../controllers/reportController';
import { authenticate, authorizeRole } from '../middleware/authMiddleware';

const router = Router();

// Reports are sensitive business data, restrict to ADMIN & MANAGER roles only
router.use(authenticate);
router.use(authorizeRole(['ADMIN', 'MANAGER']));

router.get('/sales', getSalesReport);
router.get('/inventory', getInventoryReport);
router.get('/performance', getEmployeePerformanceReport);

export default router;
