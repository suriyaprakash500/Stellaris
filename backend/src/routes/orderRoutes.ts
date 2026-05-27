import { Router } from 'express';
import { createOrder, getOrders, updateOrderStatus, recordPayment } from '../controllers/orderController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

// All order operations require a valid logged-in session
router.use(authenticate);

router.get('/', getOrders);
router.post('/', createOrder);
router.patch('/:id/status', updateOrderStatus);
router.post('/:id/pay', recordPayment);

export default router;
