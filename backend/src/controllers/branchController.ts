import { Request, Response } from 'express';
import prisma from '../db/prisma';
import { logAudit } from '../utils/auditLogger';

// 1. Fetch businesses (brands)
export const getBusinesses = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const { id: userId, role, businessId } = req.user;

    let list;
    if (role === 'OWNER') {
      list = await prisma.business.findMany({
        where: { owner_id: userId },
        orderBy: { name: 'asc' },
      });
    } else if (role === 'ADMIN') {
      list = await prisma.business.findMany({
        orderBy: { name: 'asc' },
      });
    } else {
      list = await prisma.business.findMany({
        where: { id: businessId || '' },
        orderBy: { name: 'asc' },
      });
    }
    res.json(list);
  } catch (error) {
    console.error('Error fetching businesses:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// 2. Create business (brand)
export const createBusiness = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    // @ts-ignore
    const { id: ownerId, name: actorName } = req.user;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'Business name is required' });
    }

    const trimmedName = name.trim();

    const existing = await prisma.business.findUnique({
      where: { name: trimmedName }
    });

    if (existing) {
      return res.status(400).json({ error: 'Business brand already exists' });
    }

    const business = await prisma.business.create({
      data: {
        name: trimmedName,
        owner_id: ownerId,
      },
    });

    await logAudit(ownerId, actorName, 'BUSINESS_CREATED', `Created business brand ${business.name}`, business.id);

    res.status(201).json(business);
  } catch (error) {
    console.error('Error creating business:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// 3. Fetch branches (locations) under a business
export const getBranches = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const { id: userId, role, businessId, branchId } = req.user;
    const { businessId: queryBusinessId } = req.query;

    let list;
    if (role === 'OWNER') {
      if (queryBusinessId && typeof queryBusinessId === 'string' && queryBusinessId !== '') {
        list = await prisma.branch.findMany({
          where: {
            business_id: queryBusinessId,
            business: { owner_id: userId }
          },
          orderBy: { name: 'asc' },
        });
      } else {
        list = await prisma.branch.findMany({
          where: { business: { owner_id: userId } },
          orderBy: { name: 'asc' },
        });
      }
    } else if (role === 'ADMIN') {
      if (queryBusinessId && typeof queryBusinessId === 'string' && queryBusinessId !== '') {
        list = await prisma.branch.findMany({
          where: { business_id: queryBusinessId },
          orderBy: { name: 'asc' },
        });
      } else {
        list = await prisma.branch.findMany({
          orderBy: { name: 'asc' },
        });
      }
    } else {
      // Manager/Staff can only see their assigned branch
      list = await prisma.branch.findMany({
        where: { id: branchId || '' },
        orderBy: { name: 'asc' },
      });
    }
    res.json(list);
  } catch (error) {
    console.error('Error fetching branches:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// 4. Create branch (location)
export const createBranch = async (req: Request, res: Response) => {
  try {
    const { name, location, mobile_no, business_id } = req.body;
    // @ts-ignore
    const { id: actorId, name: actorName } = req.user;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'Branch name is required' });
    }
    if (!business_id || typeof business_id !== 'string') {
      return res.status(400).json({ error: 'Business Brand association is required' });
    }

    const trimmedName = name.trim();

    // Verify brand belongs to the owner or user is Admin
    // For simplicity, verify business exists
    const business = await prisma.business.findUnique({
      where: { id: business_id }
    });
    if (!business) {
      return res.status(400).json({ error: 'Invalid Business brand ID' });
    }

    // Check if branch name already exists under the same business
    const existing = await prisma.branch.findFirst({
      where: {
        name: trimmedName,
        business_id: business_id
      }
    });
    if (existing) {
      return res.status(400).json({ error: 'Branch name already exists under this business' });
    }

    const branch = await prisma.branch.create({
      data: {
        name: trimmedName,
        location: location ? location.trim() : null,
        mobile_no: mobile_no ? mobile_no.trim() : null,
        business_id: business_id,
      },
    });

    await logAudit(actorId, actorName, 'BRANCH_CREATED', `Created physical branch ${branch.name} for business ${business.name}`, business_id);

    res.status(201).json(branch);
  } catch (error) {
    console.error('Error creating branch:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
