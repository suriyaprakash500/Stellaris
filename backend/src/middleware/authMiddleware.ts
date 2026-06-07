import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../db/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key';

export const BUSINESS_RESTRICTED_ROLES = ['MANAGER', 'STAFF'];

const ROLE_HIERARCHY: Record<string, string[]> = {
  OWNER: ['OWNER', 'ADMIN', 'MANAGER', 'STAFF', 'CUSTOMER'],
  ADMIN: ['ADMIN', 'MANAGER', 'STAFF', 'CUSTOMER'],
  MANAGER: ['MANAGER', 'STAFF', 'CUSTOMER'],
  STAFF: ['STAFF', 'CUSTOMER'],
  CUSTOMER: ['CUSTOMER'],
};

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Look up user to ensure they exist and check must_change_password
    const user = await prisma.user.findUnique({
      where: { id: decoded.id }
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Block user if must_change_password is true, unless changing password or logging out
    const isAuthPath = req.originalUrl.endsWith('/auth/change-password') || req.originalUrl.endsWith('/auth/logout');
    if (user.must_change_password && !isAuthPath) {
      return res.status(403).json({ error: 'Password change required', mustChangePassword: true });
    }

    // Attach decoded user info along with fresh database record
    // @ts-ignore
    req.user = {
      id: user.id,
      role: user.role,
      businessId: user.business_id,
      branchId: user.branch_id,
      user
    };
    
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

export const authorizePermission = (permissionKey: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // @ts-ignore
    const userRole = req.user?.role;
    // @ts-ignore
    const userObj = req.user?.user;

    if (!userRole) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // OWNER and ADMIN bypass all permission checks
    if (userRole === 'OWNER' || userRole === 'ADMIN') {
      return next();
    }

    // MANAGER has full permissions within their assigned business
    if (userRole === 'MANAGER') {
      return next();
    }

    // STAFF role checks individual boolean flag
    if (userRole === 'STAFF') {
      if (userObj && (userObj as any)[permissionKey] === true) {
        return next();
      }
    }

    return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
  };
};

