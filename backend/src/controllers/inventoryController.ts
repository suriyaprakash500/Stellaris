import { Request, Response } from 'express';
import prisma from '../db/prisma';
import { BUSINESS_RESTRICTED_ROLES } from '../middleware/authMiddleware';

// 1. Ingredients CRUD & Stock Monitoring
export const getIngredients = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const { role, businessId: userBusinessId, branchId: userBranchId } = req.user;
    const { businessId: queryBusinessId, branchId: queryBranchId } = req.query;
    const where: any = {};

    if (role === 'MANAGER' || role === 'STAFF') {
      if (userBranchId) {
        where.branch_id = userBranchId;
      }
    } else {
      if (queryBranchId && typeof queryBranchId === 'string' && queryBranchId !== '') {
        where.branch_id = queryBranchId;
      } else if (queryBusinessId && typeof queryBusinessId === 'string' && queryBusinessId !== '') {
        where.business_id = queryBusinessId;
      }
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
    const { name, current_stock, unit, min_stock_alert, vendor_id, branch_id } = req.body;
    // @ts-ignore
    const { role: actorRole, businessId: actorBusinessId, branchId: actorBranchId } = req.user;

    let finalBranchId = branch_id;
    let finalBusinessId = undefined;

    if (actorRole === 'MANAGER' || actorRole === 'STAFF') {
      finalBranchId = actorBranchId;
      finalBusinessId = actorBusinessId;
    } else {
      if (finalBranchId) {
        const br = await prisma.branch.findUnique({ where: { id: finalBranchId } });
        if (br) {
          finalBusinessId = br.business_id;
        }
      }
    }

    if (!name || current_stock === undefined || !unit || min_stock_alert === undefined) {
      return res.status(400).json({ error: 'Name, current_stock, unit, and min_stock_alert are required' });
    }

    if (!finalBranchId) {
      return res.status(400).json({ error: 'Assigned branch is required' });
    }

    const ingredient = await prisma.ingredient.create({
      data: {
        name,
        current_stock: parseFloat(current_stock),
        unit,
        min_stock_alert: parseFloat(min_stock_alert),
        vendor_id,
        branch_id: finalBranchId,
        business_id: finalBusinessId || null,
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
    const { name, current_stock, unit, min_stock_alert, vendor_id, branch_id } = req.body;
    // @ts-ignore
    const { role, branchId: userBranchId } = req.user;

    const existing = await prisma.ingredient.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Ingredient not found' });
    }

    if (role !== 'OWNER' && role !== 'ADMIN' && existing.branch_id !== userBranchId) {
      return res.status(403).json({ error: 'Forbidden: You cannot modify ingredients of another branch' });
    }

    let finalBranchId = undefined;
    let finalBusinessId = undefined;
    if (role === 'OWNER' || role === 'ADMIN') {
      if (branch_id) {
        finalBranchId = branch_id;
        const br = await prisma.branch.findUnique({ where: { id: finalBranchId } });
        if (br) {
          finalBusinessId = br.business_id;
        }
      }
    }

    const ingredient = await prisma.ingredient.update({
      where: { id },
      data: {
        name,
        current_stock: current_stock !== undefined ? parseFloat(current_stock) : undefined,
        unit,
        min_stock_alert: min_stock_alert !== undefined ? parseFloat(min_stock_alert) : undefined,
        vendor_id,
        branch_id: finalBranchId || undefined,
        business_id: finalBusinessId || undefined,
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
    const { ingredient_id, quantity, type, reason } = req.body;

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
    const { role, businessId: userBusinessId } = req.user;

    const menuItem = await prisma.menuItem.findUnique({ where: { id: menuItemId } });
    if (!menuItem) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    if (role !== 'OWNER' && role !== 'ADMIN' && menuItem.business_id !== userBusinessId) {
      return res.status(403).json({ error: 'Forbidden: You cannot view recipes of another business' });
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
    const { menu_item_id, ingredients } = req.body;
    // @ts-ignore
    const { role, businessId: userBusinessId } = req.user;

    if (!menu_item_id || !ingredients || !Array.isArray(ingredients)) {
      return res.status(400).json({ error: 'menu_item_id and ingredients array are required' });
    }

    const menuItem = await prisma.menuItem.findUnique({ where: { id: menu_item_id } });
    if (!menuItem) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    if (role !== 'OWNER' && role !== 'ADMIN' && menuItem.business_id !== userBusinessId) {
      return res.status(403).json({ error: 'Forbidden: You cannot modify recipes of another business' });
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.recipeIngredient.deleteMany({
        where: { menu_item_id },
      });

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

        if (role !== 'OWNER' && role !== 'ADMIN' && dbIng.business_id !== userBusinessId) {
          throw new Error(`Forbidden: Ingredient "${dbIng.name}" belongs to another business`);
        }

        if (menuItem.business_id !== dbIng.business_id) {
          throw new Error(`Ingredient "${dbIng.name}" belongs to a different business than the menu item`);
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
