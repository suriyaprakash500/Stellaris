import { Request, Response } from 'express';
import prisma from '../db/prisma';
import { BRANCH_RESTRICTED_ROLES } from '../middleware/authMiddleware';

// 1. Sales Report
export const getSalesReport = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const { role, branchId: userBranchId } = req.user;
    const { branchId: queryBranchId } = req.query;

    const where: any = { status: 'DELIVERED' };
    if (BRANCH_RESTRICTED_ROLES.includes(role)) {
      if (userBranchId) {
        where.branch_id = userBranchId;
      }
    } else if (queryBranchId && typeof queryBranchId === 'string' && queryBranchId !== '') {
      where.branch_id = queryBranchId;
    }

    // 1a. Total Revenue and completed order count
    const completedOrders = await prisma.order.findMany({
      where,
      include: { order_items: { include: { menu_item: true } } },
    });

    const totalRevenue = completedOrders.reduce((sum, order) => sum + order.total_amount, 0);
    const orderCount = completedOrders.length;

    // 1b. Sales by category
    const categorySalesMap: Record<string, number> = {};
    const menuItemPopularityMap: Record<string, { name: string, quantity: number, revenue: number }> = {};

    completedOrders.forEach(order => {
      order.order_items.forEach(item => {
        const cat = item.menu_item.category;
        const totalVal = item.price * item.quantity;
        
        categorySalesMap[cat] = (categorySalesMap[cat] || 0) + totalVal;

        if (!menuItemPopularityMap[item.menu_item_id]) {
          menuItemPopularityMap[item.menu_item_id] = {
            name: item.menu_item.name,
            quantity: 0,
            revenue: 0,
          };
        }
        menuItemPopularityMap[item.menu_item_id].quantity += item.quantity;
        menuItemPopularityMap[item.menu_item_id].revenue += totalVal;
      });
    });

    const categorySales = Object.keys(categorySalesMap).map(category => ({
      category,
      sales: categorySalesMap[category],
    }));

    const popularItems = Object.keys(menuItemPopularityMap)
      .map(id => ({
        id,
        name: menuItemPopularityMap[id].name,
        quantity: menuItemPopularityMap[id].quantity,
        revenue: menuItemPopularityMap[id].revenue,
      }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5); // top 5 items

    res.json({
      totalRevenue,
      orderCount,
      categorySales,
      popularItems,
    });
  } catch (error) {
    console.error('Error compiling sales report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// 2. Inventory Usage & Wastage Report
export const getInventoryReport = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const { role, branchId: userBranchId } = req.user;
    const { branchId: queryBranchId } = req.query;

    const ingredientWhere: any = {};
    const wastageWhere: any = { type: 'WASTE' };

    if (BRANCH_RESTRICTED_ROLES.includes(role)) {
      if (userBranchId) {
        ingredientWhere.branch_id = userBranchId;
        wastageWhere.ingredient = { branch_id: userBranchId };
      }
    } else if (queryBranchId && typeof queryBranchId === 'string' && queryBranchId !== '') {
      ingredientWhere.branch_id = queryBranchId;
      wastageWhere.ingredient = { branch_id: queryBranchId };
    }

    // Low stock warnings list
    const ingredients = await prisma.ingredient.findMany({
      where: ingredientWhere,
    });
    const lowStockItems = ingredients.filter(ing => ing.current_stock <= ing.min_stock_alert);

    // Wastage details
    const wastageLogs = await prisma.inventoryAdjustment.findMany({
      where: wastageWhere,
      include: { ingredient: true },
      orderBy: { created_at: 'desc' },
    });

    const totalWastageQuantityMap: Record<string, { name: string, quantity: number, unit: string }> = {};
    wastageLogs.forEach(log => {
      if (!totalWastageQuantityMap[log.ingredient_id]) {
        totalWastageQuantityMap[log.ingredient_id] = {
          name: log.ingredient.name,
          quantity: 0,
          unit: log.ingredient.unit,
        };
      }
      totalWastageQuantityMap[log.ingredient_id].quantity += Math.abs(log.quantity);
    });

    const wastageSummary = Object.keys(totalWastageQuantityMap).map(id => ({
      id,
      name: totalWastageQuantityMap[id].name,
      quantity: totalWastageQuantityMap[id].quantity,
      unit: totalWastageQuantityMap[id].unit,
    }));

    res.json({
      lowStockCount: lowStockItems.length,
      lowStockItems: lowStockItems.map(ing => ({ id: ing.id, name: ing.name, current_stock: ing.current_stock, unit: ing.unit, min_stock_alert: ing.min_stock_alert })),
      wastageSummary,
    });
  } catch (error) {
    console.error('Error compiling inventory report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// 3. Employee Performance Metrics
export const getEmployeePerformanceReport = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const { role, branchId: userBranchId } = req.user;
    const { branchId: queryBranchId } = req.query;

    const timesheetWhere: any = {};

    if (BRANCH_RESTRICTED_ROLES.includes(role)) {
      if (userBranchId) {
        timesheetWhere.user = { branch_id: userBranchId };
      }
    } else if (queryBranchId && typeof queryBranchId === 'string' && queryBranchId !== '') {
      timesheetWhere.user = { branch_id: queryBranchId };
    }

    const timesheets = await prisma.timesheet.findMany({
      where: timesheetWhere,
      include: { user: { select: { name: true, role: true } } },
    });

    const performanceMap: Record<string, { name: string, role: string, totalHours: number, shiftCount: number }> = {};

    timesheets.forEach(ts => {
      if (ts.total_hours) {
        if (!performanceMap[ts.user_id]) {
          performanceMap[ts.user_id] = {
            name: ts.user.name,
            role: ts.user.role,
            totalHours: 0,
            shiftCount: 0,
          };
        }
        performanceMap[ts.user_id].totalHours += ts.total_hours;
        performanceMap[ts.user_id].shiftCount += 1;
      }
    });

    const performance = Object.keys(performanceMap).map(userId => ({
      userId,
      name: performanceMap[userId].name,
      role: performanceMap[userId].role,
      totalHours: parseFloat(performanceMap[userId].totalHours.toFixed(2)),
      shiftCount: performanceMap[userId].shiftCount,
    }));

    res.json(performance);
  } catch (error) {
    console.error('Error compiling employee performance report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// 4. Order Timing Report
export const getOrderTimingReport = async (req: Request, res: Response) => {
  try {
    const { branchId: queryBranchId } = req.query;
    const where: any = {};
    if (queryBranchId && typeof queryBranchId === 'string' && queryBranchId !== '') {
      where.branch_id = queryBranchId;
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        user: { select: { name: true } },
        branch: { select: { name: true } }
      },
      orderBy: { created_at: 'desc' }
    });

    let totalPrepTime = 0;
    let prepCount = 0;
    let totalDeliveryTime = 0;
    let deliveryCount = 0;
    let totalFulfillmentTime = 0;
    let fulfillmentCount = 0;
    let delayedCount = 0;

    const trackedOrders = orders.map(order => {
      const created = new Date(order.created_at).getTime();
      const prepStart = order.prep_started_at ? new Date(order.prep_started_at).getTime() : null;
      const ready = order.ready_at ? new Date(order.ready_at).getTime() : null;
      const delivered = order.delivered_at ? new Date(order.delivered_at).getTime() : null;

      let prepDurationMin = null;
      let deliveryDurationMin = null;
      let totalDurationMin = null;

      if (prepStart && ready) {
        prepDurationMin = parseFloat(((ready - prepStart) / 60000).toFixed(2));
        totalPrepTime += (ready - prepStart);
        prepCount++;
      }

      if (ready && delivered) {
        deliveryDurationMin = parseFloat(((delivered - ready) / 60000).toFixed(2));
        totalDeliveryTime += (delivered - ready);
        deliveryCount++;
      }

      if (delivered) {
        totalDurationMin = parseFloat(((delivered - created) / 60000).toFixed(2));
        totalFulfillmentTime += (delivered - created);
        fulfillmentCount++;
      } else if (order.status !== 'CANCELLED') {
        totalDurationMin = parseFloat(((Date.now() - created) / 60000).toFixed(2));
      }

      // 10 minutes limit (600,000 milliseconds)
      const limitMs = 10 * 60 * 1000;
      let isDelayed = false;
      if (delivered) {
        isDelayed = (delivered - created) > limitMs;
      } else if (order.status !== 'CANCELLED') {
        isDelayed = (Date.now() - created) > limitMs;
      }

      if (isDelayed) {
        delayedCount++;
      }

      return {
        id: order.id,
        status: order.status,
        customerName: order.user?.name || 'Guest',
        branchName: order.branch?.name || 'Global',
        created_at: order.created_at,
        accepted_at: order.accepted_at,
        prep_started_at: order.prep_started_at,
        ready_at: order.ready_at,
        delivered_at: order.delivered_at,
        prepDurationMin,
        deliveryDurationMin,
        totalDurationMin,
        isDelayed
      };
    });

    const avgPrepTimeMin = prepCount > 0 ? parseFloat(((totalPrepTime / prepCount) / 60000).toFixed(2)) : 0;
    const avgDeliveryTimeMin = deliveryCount > 0 ? parseFloat(((totalDeliveryTime / deliveryCount) / 60000).toFixed(2)) : 0;
    const avgFulfillmentTimeMin = fulfillmentCount > 0 ? parseFloat(((totalFulfillmentTime / fulfillmentCount) / 60000).toFixed(2)) : 0;

    res.json({
      summary: {
        totalOrdersCount: orders.length,
        avgPrepTimeMin,
        avgDeliveryTimeMin,
        avgFulfillmentTimeMin,
        delayedOrdersCount: delayedCount,
        delayedPercentage: orders.length > 0 ? parseFloat(((delayedCount / orders.length) * 100).toFixed(1)) : 0
      },
      orders: trackedOrders
    });
  } catch (error) {
    console.error('Error fetching order timing report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
