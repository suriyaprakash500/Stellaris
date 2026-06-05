import { Request, Response } from 'express';
import { logAudit } from '../utils/auditLogger';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../db/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key';

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name, role, branch_id } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password_hash,
        name,
        role: role || 'CUSTOMER',
        branch_id: branch_id || null,
      },
    });

    const payload = { id: user.id, role: user.role, branchId: user.branch_id };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });

    await logAudit(user.id, user.name, 'USER_REGISTERED', `User registered with role ${user.role}`, user.branch_id);
    res.status(201).json({ token, user: { id: user.id, email: user.email, role: user.role, branchId: user.branch_id } });
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

    const payload = { id: user.id, role: user.role, branchId: user.branch_id };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });

    await logAudit(user.id, user.name, 'USER_LOGIN', `User logged in successfully`, user.branch_id);
    res.json({ token, user: { id: user.id, email: user.email, role: user.role, branchId: user.branch_id } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getProfile = async (req: Request, res: Response) => {
  try {
    // @ts-ignore - set by authenticate middleware
    const userId = req.user.id;
    
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ id: user.id, email: user.email, name: user.name, role: user.role, branchId: user.branch_id });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // Always return success to prevent email enumeration attacks
    if (!user) {
      return res.json({ message: 'If an account exists with that email, a reset code has been generated.' });
    }

    // Generate a short-lived reset token (15 minutes)
    const resetToken = jwt.sign({ id: user.id, purpose: 'password_reset' }, JWT_SECRET, { expiresIn: '15m' });

    // Log the reset token to server console (replace with email service in production)
    console.log(`\n========== PASSWORD RESET ==========`);
    console.log(`User: ${user.email}`);
    console.log(`Reset Code: ${resetToken}`);
    console.log(`Expires: 15 minutes`);
    console.log(`====================================\n`);

    res.json({ message: 'If an account exists with that email, a reset code has been generated.' });
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

    await logAudit(user.id, user.name, 'USER_PASSWORD_RESET', `User password was reset`, user.branch_id);
    console.log(`Password reset successful for user: ${user.email}`);
    res.json({ message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const { id, role, branchId } = req.user;
    const user = await prisma.user.findUnique({ where: { id } });
    await logAudit(id, user?.name || 'Unknown', 'USER_LOGOUT', `User logged out successfully`, branchId);
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout logging error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

