import { Router } from 'express';
import { getMenuItems, createMenuItem, updateMenuItem, deleteMenuItem } from '../controllers/menuController';
import { authenticate, authorizePermission } from '../middleware/authMiddleware';

const router = Router();

router.get('/', getMenuItems);
router.post('/', authenticate, authorizePermission('can_manage_menu'), createMenuItem);
router.put('/:id', authenticate, authorizePermission('can_manage_menu'), updateMenuItem);
router.delete('/:id', authenticate, authorizePermission('can_manage_menu'), deleteMenuItem);

export default router;

