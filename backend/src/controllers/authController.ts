import { Request, Response } from 'express';
import { logAudit } from '../utils/auditLogger';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../db/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key';

export const register = async (req: Request, res: Response) => {
  try {
    const { email, mobile_no, password, name } = req.body;

    if (!mobile_no) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const existingPhone = await prisma.user.findUnique({ where: { mobile_no } });
    if (existingPhone) {
      return res.status(400).json({ error: 'Phone number already registered' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        mobile_no,
        password_hash,
        name,
        role: 'OWNER', // Public registration is strictly restricted to OWNER
        business_id: null,
      },
    });

    const payload = { id: user.id, role: user.role, businessId: user.business_id, branchId: user.branch_id };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });

    await logAudit(user.id, user.name, 'USER_REGISTERED', `User registered with role ${user.role}`, user.business_id);
    res.status(201).json({ token, user: { id: user.id, email: user.email, mobile_no: user.mobile_no, role: user.role, businessId: user.business_id, branchId: user.branch_id } });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const payload = { id: user.id, role: user.role, businessId: user.business_id, branchId: user.branch_id };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });

    await logAudit(user.id, user.name, 'USER_LOGIN', `User logged in successfully`, user.business_id);
    
    res.json({ 
      token, 
      user: { 
        id: user.id, 
        email: user.email, 
        role: user.role, 
        businessId: user.business_id,
        branchId: user.branch_id,
        mustChangePassword: user.must_change_password 
      } 
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getProfile = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.user.id;
    
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ 
      id: user.id, 
      email: user.email, 
      name: user.name, 
      role: user.role, 
      businessId: user.business_id,
      branchId: user.branch_id,
      mustChangePassword: user.must_change_password,
      permissions: {
        can_manage_menu: user.can_manage_menu,
        can_prepare_food: user.can_prepare_food,
        can_manage_delivery: user.can_manage_delivery,
        can_process_billing: user.can_process_billing,
        can_view_reports: user.can_view_reports,
        can_manage_inventory: user.can_manage_inventory,
        can_manage_recipes: user.can_manage_recipes,
        can_manage_shifts: user.can_manage_shifts,
        can_clock_in_out: user.can_clock_in_out
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const changePassword = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.user.id;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const password_hash = await bcrypt.hash(newPassword, 10);
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        password_hash,
        must_change_password: false
      }
    });

    await logAudit(updatedUser.id, updatedUser.name, 'USER_PASSWORD_CHANGED', `User changed temporary password`, updatedUser.business_id);
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const user = await prisma.user.findUnique({ where: { mobile_no: phone } });

    if (!user) {
      return res.json({ message: 'If an account exists with that phone number, a reset code has been generated.' });
    }

    const resetToken = jwt.sign({ id: user.id, purpose: 'password_reset' }, JWT_SECRET, { expiresIn: '15m' });

    console.log(`\n========== PASSWORD RESET ==========`);
    console.log(`User Phone: ${user.mobile_no} (${user.email})`);
    console.log(`Reset Code: ${resetToken}`);
    console.log(`Expires: 15 minutes`);
    console.log(`====================================\n`);

    res.json({ message: 'If an account exists with that phone number, a reset code has been generated.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Reset code and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        return res.status(400).json({ error: 'Reset code has expired. Please request a new one.' });
      }
      return res.status(400).json({ error: 'Invalid reset code' });
    }

    if (decoded.purpose !== 'password_reset') {
      return res.status(400).json({ error: 'Invalid reset code' });
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) {
      return res.status(400).json({ error: 'Invalid reset code' });
    }

    const password_hash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password_hash },
    });

    await logAudit(user.id, user.name, 'USER_PASSWORD_RESET', `User password was reset`, user.business_id);
    res.json({ message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const { id, role, businessId } = req.user;
    const user = await prisma.user.findUnique({ where: { id } });
    await logAudit(id, user?.name || 'Unknown', 'USER_LOGOUT', `User logged out successfully`, businessId);
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout logging error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
