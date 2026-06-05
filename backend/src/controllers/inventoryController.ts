import { Request, Response } from 'express';
import prisma from '../db/prisma';
import { BRANCH_RESTRICTED_ROLES } from '../middleware/authMiddleware';

// 1. Ingredients CRUD & Stock Monitoring
export const getIngredients = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const { role, branchId: userBranchId } = req.user;
    const { branchId: queryBranchId } = req.query;
    const where: any = {};

    if (BRANCH_RESTRICTED_ROLES.includes(role)) {
      if (userBranchId) {
        where.branch_id = userBranchId;
      }
    } else if (queryBranchId && typeof queryBranchId === 'string' && queryBranchId !== '') {
      where.branch_id = queryBranchId;
    }

    const ingredients = await prisma.ingredient.findMany({
      where,
      include: { vendor: true },
      orderBy: { name: 'asc' },
    });

    // Mark as low stock if current_stock is less than min_stock_alert
    const processed = ingredients.map(ing => ({
      ...ing,
      is_low_stock: ing.current_stock <= ing.min_stock_alert,
    }));

    res.json(processed);
  } catch (error) {
    console.error('Error fetching ingredients:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createIngredient = async (req: Request, res: Response) => {
  try {
    const { name, current_stock, unit, min_stock_alert, vendor_id } = req.body;
    // @ts-ignore
    const { role, branchId: userBranchId } = req.user;
    const branch_id = role === 'OWNER' || role === 'ADMIN' ? req.body.branch_id : userBranchId;

    if (!name || current_stock === undefined || !unit || min_stock_alert === undefined) {
      return res.status(400).json({ error: 'Name, current_stock, unit, and min_stock_alert are required' });
    }

    const ingredient = await prisma.ingredient.create({
      data: {
        name,
        current_stock: parseFloat(current_stock),
        unit,
        min_stock_alert: parseFloat(min_stock_alert),
        vendor_id,
        branch_id: branch_id || null,
      },
    });

    res.status(201).json(ingredient);
  } catch (error: any) {
    console.error('Error creating ingredient:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Ingredient with this name already exists in this branch' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateIngredient = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { name, current_stock, unit, min_stock_alert, vendor_id } = req.body;
    // @ts-ignore
    const { role, branchId: userBranchId } = req.user;

    const existing = await prisma.ingredient.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Ingredient not found' });
    }

    if (role !== 'OWNER' && role !== 'ADMIN' && existing.branch_id !== userBranchId) {
      return res.status(403).json({ error: 'Forbidden: You cannot modify ingredients of another branch' });
    }

    const branch_id = role === 'OWNER' || role === 'ADMIN' ? req.body.branch_id : undefined;

    const ingredient = await prisma.ingredient.update({
      where: { id },
      data: {
        name,
        current_stock: current_stock !== undefined ? parseFloat(current_stock) : undefined,
        unit,
        min_stock_alert: min_stock_alert !== undefined ? parseFloat(min_stock_alert) : undefined,
        vendor_id,
        branch_id: branch_id !== undefined ? (branch_id || null) : undefined,
      },
    });

    res.json(ingredient);
  } catch (error) {
    console.error('Error updating ingredient:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteIngredient = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    // @ts-ignore
    const { role, branchId: userBranchId } = req.user;

    const existing = await prisma.ingredient.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Ingredient not found' });
    }

    if (role !== 'OWNER' && role !== 'ADMIN' && existing.branch_id !== userBranchId) {
      return res.status(403).json({ error: 'Forbidden: You cannot delete ingredients of another branch' });
    }

    await prisma.ingredient.delete({ where: { id } });
    res.json({ message: 'Ingredient deleted successfully' });
  } catch (error) {
    console.error('Error deleting ingredient:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// 2. Inventory Manual Stock Adjustments (restock, waste, damage logs)
export const adjustStock = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const { id: userId, role, branchId: userBranchId } = req.user;
    const { ingredient_id, quantity, type, reason } = req.body; // quantity can be positive (restock) or negative (waste/damage)

    if (!ingredient_id || quantity === undefined || !type) {
      return res.status(400).json({ error: 'ingredient_id, quantity, and type are required' });
    }

    const ingredient = await prisma.ingredient.findUnique({ where: { id: ingredient_id } });
    if (!ingredient) {
      return res.status(404).json({ error: 'Ingredient not found' });
    }

    if (role !== 'OWNER' && role !== 'ADMIN' && ingredient.branch_id !== userBranchId) {
      return res.status(403).json({ error: 'Forbidden: You cannot adjust stock for ingredients of another branch' });
    }

    const qtyVal = parseFloat(quantity);

    // Make sure stock doesn't go below 0
    if (ingredient.current_stock + qtyVal < 0) {
      return res.status(400).json({ error: 'Adjustment would result in negative stock' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const adjustment = await tx.inventoryAdjustment.create({
        data: {
          ingredient_id,
          quantity: qtyVal,
          type,
          reason,
          user_id: userId,
        },
      });

      const updatedIngredient = await tx.ingredient.update({
        where: { id: ingredient_id },
        data: {
          current_stock: {
            increment: qtyVal,
          },
        },
      });

      return { adjustment, ingredient: updatedIngredient };
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Error adjusting stock:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// 3. Vendor CRUD
export const getVendors = async (req: Request, res: Response) => {
  try {
    const vendors = await prisma.vendor.findMany({
      include: { ingredients: true },
      orderBy: { name: 'asc' },
    });
    res.json(vendors);
  } catch (error) {
    console.error('Error fetching vendors:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createVendor = async (req: Request, res: Response) => {
  try {
    const { name, contact_info } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Vendor name is required' });
    }

    const vendor = await prisma.vendor.create({
      data: { name, contact_info },
    });

    res.status(201).json(vendor);
  } catch (error) {
    console.error('Error creating vendor:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateVendor = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { name, contact_info } = req.body;

    const existing = await prisma.vendor.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    const vendor = await prisma.vendor.update({
      where: { id },
      data: { name, contact_info },
    });

    res.json(vendor);
  } catch (error) {
    console.error('Error updating vendor:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteVendor = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const existing = await prisma.vendor.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    await prisma.vendor.delete({ where: { id } });
    res.json({ message: 'Vendor deleted successfully' });
  } catch (error) {
    console.error('Error deleting vendor:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// 4. Recipes (Link Menu Items to Ingredients)
export const getRecipe = async (req: Request, res: Response) => {
  try {
    const menuItemId = req.params.menuItemId as string;
    // @ts-ignore
    const { role, branchId: userBranchId } = req.user;

    const menuItem = await prisma.menuItem.findUnique({ where: { id: menuItemId } });
    if (!menuItem) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    if (role !== 'OWNER' && role !== 'ADMIN' && menuItem.branch_id !== userBranchId) {
      return res.status(403).json({ error: 'Forbidden: You cannot view recipes of another branch' });
    }

    const recipe = await prisma.recipeIngredient.findMany({
      where: { menu_item_id: menuItemId },
      include: { ingredient: true },
    });
    res.json(recipe);
  } catch (error) {
    console.error('Error fetching recipe:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const saveRecipe = async (req: Request, res: Response) => {
  try {
    const { menu_item_id, ingredients } = req.body; // ingredients is array of { ingredient_id, quantity }
    // @ts-ignore
    const { role, branchId: userBranchId } = req.user;

    if (!menu_item_id || !ingredients || !Array.isArray(ingredients)) {
      return res.status(400).json({ error: 'menu_item_id and ingredients array are required' });
    }

    const menuItem = await prisma.menuItem.findUnique({ where: { id: menu_item_id } });
    if (!menuItem) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    if (role !== 'OWNER' && role !== 'ADMIN' && menuItem.branch_id !== userBranchId) {
      return res.status(403).json({ error: 'Forbidden: You cannot modify recipes of another branch' });
    }

    // Save recipe inside transaction (delete existing, insert new)
    const result = await prisma.$transaction(async (tx) => {
      // Clear current recipe details
      await tx.recipeIngredient.deleteMany({
        where: { menu_item_id },
      });

      // Insert new recipe ingredients
      const created = [];
      for (const ing of ingredients) {
        const { ingredient_id, quantity } = ing;
        if (!ingredient_id || quantity === undefined || parseFloat(quantity) <= 0) {
          throw new Error(`Invalid ingredient details: ID ${ingredient_id}, Qty ${quantity}`);
        }

        const dbIng = await tx.ingredient.findUnique({ where: { id: ingredient_id } });
        if (!dbIng) {
          throw new Error(`Ingredient not found: ${ingredient_id}`);
        }

        if (role !== 'OWNER' && role !== 'ADMIN' && dbIng.branch_id !== userBranchId) {
          throw new Error(`Forbidden: Ingredient "${dbIng.name}" belongs to another branch`);
        }

        if (menuItem.branch_id !== dbIng.branch_id) {
          throw new Error(`Ingredient "${dbIng.name}" belongs to a different branch than the menu item`);
        }

        const relation = await tx.recipeIngredient.create({
          data: {
            menu_item_id,
            ingredient_id,
            quantity: parseFloat(quantity),
          },
          include: { ingredient: true },
        });
        created.push(relation);
      }

      return created;
    });

    res.json(result);
  } catch (error: any) {
    console.error('Error saving recipe:', error);
    res.status(400).json({ error: error.message || 'Failed to save recipe' });
  }
};
