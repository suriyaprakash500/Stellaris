import { Request, Response } from 'express';
import prisma from '../db/prisma';

export const getBranches = async (req: Request, res: Response) => {
  try {
    const branches = await prisma.branch.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(branches);
  } catch (error) {
    console.error('Error fetching branches:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createBranch = async (req: Request, res: Response) => {
  try {
    const { name, location, mobile_no } = req.body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'Branch name is required' });
    }

    const trimmedName = name.trim();

    // Check if duplicate exists
    const existing = await prisma.branch.findUnique({
      where: { name: trimmedName }
    });

    if (existing) {
      return res.status(400).json({ error: 'Branch already exists' });
    }

    const branch = await prisma.branch.create({
      data: {
        name: trimmedName,
        location: location ? location.trim() : null,
        mobile_no: mobile_no ? mobile_no.trim() : null,
      },
    });

    res.status(201).json(branch);
  } catch (error) {
    console.error('Error creating branch:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
