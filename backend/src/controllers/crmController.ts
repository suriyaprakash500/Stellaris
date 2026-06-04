import { Request, Response } from 'express';
import prisma from '../db/prisma';

// 1. Get current customer profile / loyalty points
export const getCustomerProfile = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.user.id;

    const profile = await prisma.customerProfile.findUnique({
      where: { user_id: userId },
    });

    if (!profile) {
      // Return a default profile if it doesn't exist yet
      return res.json({ preferences: '' });
    }

    res.json(profile);
  } catch (error) {
    console.error('Error fetching customer profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// 2. Submit feedback for an order
export const submitFeedback = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.user.id;
    const { order_id, rating, comment } = req.body;

    if (!order_id || rating === undefined || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'order_id and rating (1-5) are required' });
    }

    const order = await prisma.order.findUnique({ where: { id: order_id } });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Ensure the customer is rating their own order
    // @ts-ignore
    if (req.user.role === 'CUSTOMER' && order.user_id !== userId) {
      return res.status(403).json({ error: 'You can only leave feedback on your own orders' });
    }

    const feedback = await prisma.feedback.create({
      data: {
        order_id,
        rating: parseInt(rating),
        comment,
      },
    });

    res.status(201).json(feedback);
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// 3. Get all feedback (Admin/Manager only)
export const getAllFeedback = async (req: Request, res: Response) => {
  try {
    const feedback = await prisma.feedback.findMany({
      include: {
        order: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
    res.json(feedback);
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
