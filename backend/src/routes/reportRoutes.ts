import { Router } from 'express';
import { getSalesReport, getInventoryReport, getEmployeePerformanceReport, getOrderTimingReport } from '../controllers/reportController';
import { authenticate, authorizeRole } from '../middleware/authMiddleware';

const router = Router();

// Reports are sensitive business data
router.use(authenticate);

// Order timing tracking is restricted strictly to OWNER & ADMIN (CEO/System Admin)
router.get('/order-timing', authorizeRole(['ADMIN']), getOrderTimingReport);

// Other reports accessible to OWNER, ADMIN, and MANAGER roles
router.use(authorizeRole(['ADMIN', 'MANAGER']));
router.get('/sales', getSalesReport);
router.get('/inventory', getInventoryReport);
router.get('/performance', getEmployeePerformanceReport);

export default router;
