import { Request, Response } from 'express';
import prisma from '../db/prisma';
import { logAudit } from '../utils/auditLogger';

const validateAndGetCategory = async (categoryName: string, userId: string): Promise<string> => {
  const trimmed = categoryName.trim();
  if (trimmed.length === 0) {
    throw new Error('Category name cannot be empty or contain only spaces.');
  }
  if (trimmed.length > 50) {
    throw new Error('Category name cannot exceed 50 characters.');
  }
  const alphanumericRegex = /[a-zA-Z0-9]/;
  if (!alphanumericRegex.test(trimmed)) {
    throw new Error('Category name must contain at least one letter or number.');
  }

  // Find existing category case-insensitively
  const existing = await prisma.category.findFirst({
    where: {
      name: {
        equals: trimmed,
        mode: 'insensitive'
      }
    }
  });

  if (!existing) {
    // Automatically create it
    const created = await prisma.category.create({
      data: { name: trimmed }
    });
    // Log audit
    const actor = await prisma.user.findUnique({ where: { id: userId } });
    await logAudit(userId, actor?.name || 'Unknown', 'CATEGORY_CREATED', `Created category "${created.name}" automatically on menu item save`, actor?.branch_id);
    return created.name;
  }
  return existing.name;
};

export const getMenuItems = async (req: Request, res: Response) => {
  try {
    const { branchId } = req.query;
    const where: any = {};
    if (branchId && typeof branchId === 'string' && branchId !== '') {
      where.branch_id = branchId;
    }

    const items = await prisma.menuItem.findMany({
      where,
      orderBy: { category: 'asc' },
    });
    res.json(items);
  } catch (error) {
    console.error('Error fetching menu items:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createMenuItem = async (req: Request, res: Response) => {
  try {
    const { name, description, price, image_url, category, is_available } = req.body;
    // @ts-ignore
    const userRole = req.user.role;
    // @ts-ignore
    const userBranchId = req.user.branchId;
    // @ts-ignore
    const userId = req.user.id;

    const branch_id = userRole === 'OWNER' || userRole === 'ADMIN' ? req.body.branch_id : userBranchId;

    if (!name || price === undefined || !category) {
      return res.status(400).json({ error: 'Name, price, and category are required' });
    }

    let finalCategory: string;
    try {
      finalCategory = await validateAndGetCategory(category, userId);
    } catch (validationError: any) {
      return res.status(400).json({ error: validationError.message });
    }

    const item = await prisma.menuItem.create({
      data: {
        name,
        description,
        price: parseFloat(price),
        image_url,
        category: finalCategory,
        is_available: is_available !== undefined ? is_available : true,
        branch_id: branch_id || null,
      },
    });

    res.status(201).json(item);
  } catch (error) {
    console.error('Error creating menu item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateMenuItem = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { name, description, price, image_url, category, is_available } = req.body;
    // @ts-ignore
    const userRole = req.user.role;
    // @ts-ignore
    const userBranchId = req.user.branchId;
    // @ts-ignore
    const userId = req.user.id;

    const existingItem = await prisma.menuItem.findUnique({ where: { id } });
    if (!existingItem) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    if (userRole !== 'OWNER' && userRole !== 'ADMIN' && existingItem.branch_id !== userBranchId) {
      return res.status(403).json({ error: 'Forbidden: You cannot modify items of another branch' });
    }

    const branch_id = userRole === 'OWNER' || userRole === 'ADMIN' ? req.body.branch_id : undefined;

    let finalCategory: string | undefined;
    if (category) {
      try {
        finalCategory = await validateAndGetCategory(category, userId);
      } catch (validationError: any) {
        return res.status(400).json({ error: validationError.message });
      }
    }

    const item = await prisma.menuItem.update({
      where: { id },
      data: {
        name,
        description,
        price: price !== undefined ? parseFloat(price) : undefined,
        image_url,
        category: finalCategory,
        is_available: is_available !== undefined ? is_available : undefined,
        branch_id: branch_id !== undefined ? (branch_id || null) : undefined,
      },
    });

    res.json(item);
  } catch (error) {
    console.error('Error updating menu item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteMenuItem = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    // @ts-ignore
    const userRole = req.user.role;
    // @ts-ignore
    const userBranchId = req.user.branchId;

    const existingItem = await prisma.menuItem.findUnique({ where: { id } });
    if (!existingItem) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    if (userRole !== 'OWNER' && userRole !== 'ADMIN' && existingItem.branch_id !== userBranchId) {
      return res.status(403).json({ error: 'Forbidden: You cannot delete items of another branch' });
    }

    await prisma.menuItem.delete({ where: { id } });
    res.json({ message: 'Menu item deleted successfully' });
  } catch (error) {
    console.error('Error deleting menu item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
