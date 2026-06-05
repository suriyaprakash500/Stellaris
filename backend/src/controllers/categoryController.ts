import { Request, Response } from 'express';
import prisma from '../db/prisma';
import { logAudit } from '../utils/auditLogger';

export const getCategories = async (req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createCategory = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    // @ts-ignore
    const { id: userId } = req.user;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const trimmedName = name.trim();

    if (trimmedName.length === 0) {
      return res.status(400).json({ error: 'Category name cannot be empty or contain only spaces.' });
    }

    if (trimmedName.length > 50) {
      return res.status(400).json({ error: 'Category name cannot exceed 50 characters.' });
    }

    // Special characters only check
    const alphanumericRegex = /[a-zA-Z0-9]/;
    if (!alphanumericRegex.test(trimmedName)) {
      return res.status(400).json({ error: 'Category name must contain at least one letter or number.' });
    }

    // Check duplicate case-insensitively
    const existing = await prisma.category.findFirst({
      where: {
        name: {
          equals: trimmedName,
          mode: 'insensitive'
        }
      }
    });

    if (existing) {
      return res.status(400).json({ error: 'Category already exists. Please use the existing category or enter a different name.' });
    }

    const category = await prisma.category.create({
      data: {
        name: trimmedName,
      },
    });

    const actor = await prisma.user.findUnique({ where: { id: userId } });
    await logAudit(userId, actor?.name || 'Unknown', 'CATEGORY_CREATED', `Created category "${category.name}"`, actor?.branch_id);

    res.status(201).json(category);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    // @ts-ignore
    const { id: userId } = req.user;

    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Category not found' });
    }

    await prisma.category.delete({ where: { id } });

    const actor = await prisma.user.findUnique({ where: { id: userId } });
    await logAudit(userId, actor?.name || 'Unknown', 'CATEGORY_DELETED', `Deleted category "${existing.name}"`, actor?.branch_id);

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
