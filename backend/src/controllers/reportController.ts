import { Request, Response } from 'express';
import prisma from '../db/prisma';

// 1. Sales Report
export const getSalesReport = async (req: Request, res: Response) => {
  try {
    // 1a. Total Revenue and completed order count
    const completedOrders = await prisma.order.findMany({
      where: { status: 'DELIVERED' },
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
    // Low stock warnings list
    const ingredients = await prisma.ingredient.findMany();
    const lowStockItems = ingredients.filter(ing => ing.current_stock <= ing.min_stock_alert);

    // Wastage details
    const wastageLogs = await prisma.inventoryAdjustment.findMany({
      where: { type: 'WASTE' },
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
    const timesheets = await prisma.timesheet.findMany({
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
