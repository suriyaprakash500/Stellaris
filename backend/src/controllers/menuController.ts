import { Request, Response } from 'express';
import prisma from '../db/prisma';

export const getMenuItems = async (req: Request, res: Response) => {
  try {
    const items = await prisma.menuItem.findMany({
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

    if (!name || price === undefined || !category) {
      return res.status(400).json({ error: 'Name, price, and category are required' });
    }

    const item = await prisma.menuItem.create({
      data: {
        name,
        description,
        price: parseFloat(price),
        image_url,
        category,
        is_available: is_available !== undefined ? is_available : true,
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

    const existingItem = await prisma.menuItem.findUnique({ where: { id } });
    if (!existingItem) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    const item = await prisma.menuItem.update({
      where: { id },
      data: {
        name,
        description,
        price: price !== undefined ? parseFloat(price) : undefined,
        image_url,
        category,
        is_available: is_available !== undefined ? is_available : undefined,
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

    const existingItem = await prisma.menuItem.findUnique({ where: { id } });
    if (!existingItem) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    await prisma.menuItem.delete({ where: { id } });
    res.json({ message: 'Menu item deleted successfully' });
  } catch (error) {
    console.error('Error deleting menu item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
