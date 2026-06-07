import { Request, Response } from 'express';
import prisma from '../db/prisma';

export const getBusinessSettings = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const { id: userId, role, businessId } = req.user;

    let ownerName = 'Stellaris POS';
    if (role === 'OWNER') {
      const owner = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true }
      });
      ownerName = owner?.name || 'Stellaris POS';
    } else if (businessId) {
      const business = await prisma.business.findUnique({
        where: { id: businessId },
        include: { owner: { select: { name: true } } }
      });
      ownerName = business?.owner?.name || 'Stellaris POS';
    } else {
      const owner = await prisma.user.findFirst({
        where: { role: 'OWNER' },
        orderBy: { created_at: 'asc' },
        select: { name: true }
      });
      ownerName = owner?.name || 'Stellaris POS';
    }

    const settings = await prisma.businessSettings.findFirst();

    if (!settings) {
      // Return default placeholders if no settings have been saved yet
      return res.json({
        shop_name: 'Stellaris POS',
        fssai_no: 'Not Configured',
        mobile_no: '9876543210',
        location: 'Main Business',
        business_id: 'BUS-01',
        owner_name: ownerName
      });
    }
    res.json({
      ...settings,
      owner_name: ownerName,
      branch_id: settings.business_id // map to branch_id for backwards compatibility in frontend if needed
    });
  } catch (error) {
    console.error('Error fetching business settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateBusinessSettings = async (req: Request, res: Response) => {
  try {
    const { shop_name, fssai_no, mobile_no, location, business_id, branch_id } = req.body;
    const targetBusinessId = business_id || branch_id;

    if (!shop_name || typeof shop_name !== 'string' || shop_name.trim() === '') {
      return res.status(400).json({ error: 'Shop name is required' });
    }

    const trimmedShopName = shop_name.trim();

    // Check if configuration already exists
    const existing = await prisma.businessSettings.findFirst();

    let settings;
    if (existing) {
      settings = await prisma.businessSettings.update({
        where: { id: existing.id },
        data: {
          shop_name: trimmedShopName,
          fssai_no: fssai_no ? fssai_no.trim() : null,
          mobile_no: mobile_no ? mobile_no.trim() : null,
          location: location ? location.trim() : null,
          business_id: targetBusinessId ? targetBusinessId.trim() : null,
        },
      });
    } else {
      settings = await prisma.businessSettings.create({
        data: {
          shop_name: trimmedShopName,
          fssai_no: fssai_no ? fssai_no.trim() : null,
          mobile_no: mobile_no ? mobile_no.trim() : null,
          location: location ? location.trim() : null,
          business_id: targetBusinessId ? targetBusinessId.trim() : null,
        },
      });
    }

    res.json(settings);
  } catch (error) {
    console.error('Error updating business settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
