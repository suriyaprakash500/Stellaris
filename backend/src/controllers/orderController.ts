import { Request, Response } from 'express';
import prisma from '../db/prisma';
import { OrderStatus } from '@prisma/client';
import { BUSINESS_RESTRICTED_ROLES } from '../middleware/authMiddleware';
import { logAudit } from '../utils/auditLogger';

export const createOrder = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const { id: userId, role, businessId: actorBusinessId, branchId: actorBranchId } = req.user;
    const { items, business_id, branch_id } = req.body; // Array of { menu_item_id, quantity, customizations }

    let finalBranchId = branch_id;
    let finalBusinessId = business_id;

    if (role === 'MANAGER' || role === 'STAFF') {
      finalBranchId = actorBranchId;
      finalBusinessId = actorBusinessId;
    } else {
      if (finalBranchId && (!finalBusinessId || finalBusinessId === '')) {
        const br = await prisma.branch.findUnique({ where: { id: finalBranchId } });
        if (br) {
          finalBusinessId = br.business_id;
        }
      }
    }

    if (role === 'STAFF') {
      // @ts-ignore
      const userObj = req.user.user;
      if (!userObj?.can_process_billing) {
        return res.status(403).json({ error: 'Forbidden: Insufficient permissions to process billing' });
      }
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one item' });
    }

    // Process order creation inside a transaction to ensure database consistency and atomicity
    const result = await prisma.$transaction(async (tx) => {
      let totalAmount = 0;
      const orderItemsData = [];

      for (const item of items) {
        const { menu_item_id, quantity, customizations } = item;

        if (!menu_item_id || !quantity || quantity <= 0) {
          throw new Error('Invalid item parameters');
        }

        const menuItem = await tx.menuItem.findUnique({
          where: { id: menu_item_id },
          include: { recipe_ingredients: { include: { ingredient: true } } },
        });

        if (!menuItem) {
          throw new Error(`Menu item not found: ${menu_item_id}`);
        }

        if (!menuItem.is_available) {
          throw new Error(`Menu item "${menuItem.name}" is currently unavailable`);
        }

        // 1. Recipe-based Inventory Tracking & Check
        for (const recipeIngredient of menuItem.recipe_ingredients) {
          const qtyNeeded = recipeIngredient.quantity * quantity;
          const ingredient = recipeIngredient.ingredient;

          if (ingredient.current_stock < qtyNeeded) {
            throw new Error(`Insufficient stock for ingredient "${ingredient.name}". Needed: ${qtyNeeded}${ingredient.unit}, Available: ${ingredient.current_stock}${ingredient.unit}`);
          }

          // Deduct from inventory
          await tx.ingredient.update({
            where: { id: ingredient.id },
            data: {
              current_stock: {
                decrement: qtyNeeded,
              },
            },
          });

          // Create an automatic inventory adjustment record for audit
          await tx.inventoryAdjustment.create({
            data: {
              ingredient_id: ingredient.id,
              quantity: -qtyNeeded,
              type: 'WASTE', // Log as ingredient consumption for order
              reason: `Consumed by order creation`,
              user_id: userId,
            },
          });
        }

        const itemTotal = menuItem.price * quantity;
        totalAmount += itemTotal;

        orderItemsData.push({
          menu_item_id,
          quantity,
          price: menuItem.price,
          customizations,
        });
      }

      const newOrder = await tx.order.create({
        data: {
          user_id: userId,
          total_amount: totalAmount,
          status: 'PENDING',
          business_id: finalBusinessId || null,
          branch_id: finalBranchId || null,
          order_items: {
            create: orderItemsData,
          },
        },
        include: {
          order_items: {
            include: {
              menu_item: true,
            },
          },
          user: { select: { name: true } },
        },
      });

      return newOrder;
    });

    // @ts-ignore
    const userObj = result.user;
    await logAudit(userId, userObj?.name || 'Customer', 'ORDER_CREATED', `Created order ${result.id.slice(0, 8)} totaling ₹${result.total_amount.toFixed(2)}`, result.business_id);

    res.status(201).json(result);
  } catch (error: any) {
    console.error('Order creation error:', error);
    res.status(400).json({ error: error.message || 'Failed to create order' });
  }
};

export const getOrders = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const { id: userId, role, businessId: userBusinessId, branchId: userBranchId } = req.user;

    let orders;
    if (role !== 'CUSTOMER') {
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

      orders = await prisma.order.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          order_items: { include: { menu_item: true } },
          payments: true,
        },
        orderBy: { created_at: 'desc' },
      });
    } else {
      orders = await prisma.order.findMany({
        where: { user_id: userId },
        include: {
          order_items: { include: { menu_item: true } },
          payments: true,
        },
        orderBy: { created_at: 'desc' },
      });
    }

    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateOrderStatus = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { status } = req.body;
    // @ts-ignore
    const { role, id: userId } = req.user;

    const validStatuses = Object.keys(OrderStatus);
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Role-based status transition checks
    if (role === 'CUSTOMER') {
      if (order.user_id !== userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      if (status !== 'CANCELLED') {
        return res.status(400).json({ error: 'Customers can only cancel their own orders' });
      }
      if (order.status !== 'PENDING') {
        return res.status(400).json({ error: 'Orders can only be cancelled while PENDING' });
      }
    } else {
      // Authorized staff roles can transition orders through the workflow
      const validStaffStatuses = ['PREPARING', 'READY', 'DELIVERED', 'CANCELLED'];
      if (!validStaffStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status transition for staff' });
      }

      // Check permission if STAFF role
      if (role === 'STAFF') {
        // @ts-ignore
        const userObj = req.user.user;
        if (status === 'PREPARING' || status === 'READY') {
          if (!userObj?.can_prepare_food) {
            return res.status(403).json({ error: 'Forbidden: Insufficient permissions to prepare food' });
          }
        } else if (status === 'DELIVERED') {
          if (!userObj?.can_manage_delivery) {
            return res.status(403).json({ error: 'Forbidden: Insufficient permissions to manage delivery' });
          }
        } else if (status === 'CANCELLED') {
          if (!userObj?.can_process_billing) {
            return res.status(403).json({ error: 'Forbidden: Insufficient permissions to cancel orders' });
          }
        }
      }
    }

    const updateData: any = { status };
    if (status === 'PREPARING') {
      updateData.accepted_at = new Date();
      updateData.prep_started_at = new Date();
    } else if (status === 'READY') {
      updateData.ready_at = new Date();
    } else if (status === 'DELIVERED') {
      updateData.delivered_at = new Date();
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: updateData,
      include: { order_items: { include: { menu_item: true } } },
    });

    const actor = await prisma.user.findUnique({ where: { id: userId } });
    await logAudit(actor?.id, actor?.name, 'ORDER_UPDATED', `Updated order ${updatedOrder.id.slice(0, 8)} status to ${status}`, updatedOrder.business_id);

    res.json(updatedOrder);
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const recordPayment = async (req: Request, res: Response) => {
  try {
    const order_id = req.params.id as string;
    const { amount, payment_method, status, tip_amount } = req.body;
    // @ts-ignore
    const userId = req.user.id;

    if (!amount || !payment_method) {
      return res.status(400).json({ error: 'Amount and payment_method are required' });
    }

    const order = (await prisma.order.findUnique({
      where: { id: order_id },
      include: { payments: true },
    })) as any;
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Record the payment
    const payment = await prisma.payment.create({
      data: {
        order_id,
        amount: parseFloat(amount),
        payment_method,
        status: status || 'COMPLETED',
        tip_amount: tip_amount ? parseFloat(tip_amount) : 0,
      },
    });

    const totalPaid = order.payments.reduce((acc: number, p: any) => p.status === 'COMPLETED' ? acc + p.amount : acc, 0) + (status === 'COMPLETED' ? parseFloat(amount) : 0);

    res.status(201).json({ payment, totalPaid, total_amount: order.total_amount });
  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
