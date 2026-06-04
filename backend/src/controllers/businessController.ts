import { Request, Response } from 'express';
import prisma from '../db/prisma';

export const getBusinessSettings = async (req: Request, res: Response) => {
  try {
    const settings = await prisma.businessSettings.findFirst();
    if (!settings) {
      // Return default placeholders if no settings have been saved yet
      return res.json({
        shop_name: 'Stellaris POS',
        fssai_no: 'Not Configured',
        mobile_no: '9876543210',
        location: 'Main Branch',
        branch_id: 'BR-01'
      });
    }
    res.json(settings);
  } catch (error) {
    console.error('Error fetching business settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateBusinessSettings = async (req: Request, res: Response) => {
  try {
    const { shop_name, fssai_no, mobile_no, location, branch_id } = req.body;

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
          branch_id: branch_id ? branch_id.trim() : null,
        },
      });
    } else {
      settings = await prisma.businessSettings.create({
        data: {
          shop_name: trimmedShopName,
          fssai_no: fssai_no ? fssai_no.trim() : null,
          mobile_no: mobile_no ? mobile_no.trim() : null,
          location: location ? location.trim() : null,
          branch_id: branch_id ? branch_id.trim() : null,
        },
      });
    }

    res.json(settings);
  } catch (error) {
    console.error('Error updating business settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
