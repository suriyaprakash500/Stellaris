import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key';

export const BRANCH_RESTRICTED_ROLES = ['MANAGER', 'KITCHEN_STAFF', 'DELIVERY', 'BILLER', 'HELPER', 'COOK', 'SHOP_CAPTAIN'];

const ROLE_HIERARCHY: Record<string, string[]> = {
  OWNER: ['OWNER', 'ADMIN', 'MANAGER', 'SHOP_CAPTAIN', 'BILLER', 'HELPER', 'COOK', 'KITCHEN_STAFF', 'DELIVERY', 'CUSTOMER'],
  ADMIN: ['ADMIN', 'MANAGER', 'SHOP_CAPTAIN', 'BILLER', 'HELPER', 'COOK', 'KITCHEN_STAFF', 'DELIVERY', 'CUSTOMER'],
  MANAGER: ['MANAGER', 'SHOP_CAPTAIN', 'BILLER', 'HELPER', 'COOK', 'KITCHEN_STAFF', 'DELIVERY', 'CUSTOMER'],
  SHOP_CAPTAIN: ['SHOP_CAPTAIN', 'BILLER', 'HELPER', 'COOK', 'KITCHEN_STAFF', 'DELIVERY', 'CUSTOMER'],
  BILLER: ['BILLER', 'HELPER', 'COOK', 'CUSTOMER'],
  HELPER: ['HELPER', 'CUSTOMER'],
  COOK: ['COOK', 'CUSTOMER'],
  CUSTOMER: ['CUSTOMER'],
  KITCHEN_STAFF: ['KITCHEN_STAFF', 'COOK', 'CUSTOMER'],
  DELIVERY: ['DELIVERY', 'HELPER', 'CUSTOMER'],
};

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // @ts-ignore
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const authorizeRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // @ts-ignore
    const userRole = req.user?.role;
    if (!userRole) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const userAssignableRoles = ROLE_HIERARCHY[userRole] || [userRole];
    const hasAccess = roles.some(role => userAssignableRoles.includes(role));

    if (!hasAccess) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
};
