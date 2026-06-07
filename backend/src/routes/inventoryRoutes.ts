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
import { authenticate, authorizePermission } from '../middleware/authMiddleware';

const router = Router();

// All inventory endpoints require authentication
router.use(authenticate);

// 1. Ingredients
router.get('/', getIngredients);
router.post('/', authorizePermission('can_manage_inventory'), createIngredient);
router.put('/:id', authorizePermission('can_manage_inventory'), updateIngredient);
router.delete('/:id', authorizePermission('can_manage_inventory'), deleteIngredient);

// Stock adjustment (Audit restocks / waste logs)
router.post('/adjust', authorizePermission('can_manage_inventory'), adjustStock);

// 2. Vendors
router.get('/vendors', getVendors);
router.post('/vendors', authorizePermission('can_manage_inventory'), createVendor);
router.put('/vendors/:id', authorizePermission('can_manage_inventory'), updateVendor);
router.delete('/vendors/:id', authorizePermission('can_manage_inventory'), deleteVendor);

// 3. Recipes
router.get('/recipes/:menuItemId', getRecipe);
router.post('/recipes', authorizePermission('can_manage_recipes'), saveRecipe);

export default router;

