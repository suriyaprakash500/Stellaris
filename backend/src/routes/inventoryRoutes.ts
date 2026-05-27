import { Router } from 'express';
import {
  getIngredients,
  createIngredient,
  updateIngredient,
  deleteIngredient,
  adjustStock,
  getVendors,
  createVendor,
  updateVendor,
  deleteVendor,
  getRecipe,
  saveRecipe,
} from '../controllers/inventoryController';
import { authenticate, authorizeRole } from '../middleware/authMiddleware';

const router = Router();

// All inventory endpoints require authentication
router.use(authenticate);

// 1. Ingredients
router.get('/', authorizeRole(['ADMIN', 'MANAGER', 'KITCHEN_STAFF']), getIngredients);
router.post('/', authorizeRole(['ADMIN', 'MANAGER']), createIngredient);
router.put('/:id', authorizeRole(['ADMIN', 'MANAGER']), updateIngredient);
router.delete('/:id', authorizeRole(['ADMIN', 'MANAGER']), deleteIngredient);

// Stock adjustment (Audit restocks / waste logs)
router.post('/adjust', authorizeRole(['ADMIN', 'MANAGER']), adjustStock);

// 2. Vendors
router.get('/vendors', authorizeRole(['ADMIN', 'MANAGER']), getVendors);
router.post('/vendors', authorizeRole(['ADMIN', 'MANAGER']), createVendor);
router.put('/vendors/:id', authorizeRole(['ADMIN', 'MANAGER']), updateVendor);
router.delete('/vendors/:id', authorizeRole(['ADMIN', 'MANAGER']), deleteVendor);

// 3. Recipes
router.get('/recipes/:menuItemId', authorizeRole(['ADMIN', 'MANAGER', 'KITCHEN_STAFF']), getRecipe);
router.post('/recipes', authorizeRole(['ADMIN', 'MANAGER']), saveRecipe);

export default router;
