import { Router } from 'express';
import { getMenuItems, createMenuItem, updateMenuItem, deleteMenuItem } from '../controllers/menuController';
import { authenticate, authorizeRole } from '../middleware/authMiddleware';

const router = Router();

router.get('/', getMenuItems);
router.post('/', authenticate, authorizeRole(['ADMIN', 'MANAGER']), createMenuItem);
router.put('/:id', authenticate, authorizeRole(['ADMIN', 'MANAGER']), updateMenuItem);
router.delete('/:id', authenticate, authorizeRole(['ADMIN', 'MANAGER']), deleteMenuItem);

export default router;
