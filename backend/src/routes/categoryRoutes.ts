import { Router } from 'express';
import { getCategories, createCategory, deleteCategory } from '../controllers/categoryController';
import { authenticate, authorizeRole } from '../middleware/authMiddleware';

const router = Router();

router.get('/', getCategories);
router.post('/', authenticate, authorizeRole(['ADMIN', 'MANAGER']), createCategory);
router.delete('/:id', authenticate, authorizeRole(['ADMIN', 'MANAGER']), deleteCategory);

export default router;
