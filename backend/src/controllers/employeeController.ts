import { Request, Response } from 'express';
import prisma from '../db/prisma';
import { ShiftStatus } from '@prisma/client';
import { BUSINESS_RESTRICTED_ROLES } from '../middleware/authMiddleware';
import { logAudit } from '../utils/auditLogger';
import bcrypt from 'bcrypt';

// 1. Fetch employee users list (users that are staff/managers)
export const getEmployeesList = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const { role, businessId: userBusinessId, branchId: userBranchId } = req.user;
    const { businessId: queryBusinessId, branchId: queryBranchId } = req.query;

    const where: any = {
      role: {
        in: ['ADMIN', 'MANAGER', 'STAFF', 'OWNER'],
      },
    };

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

    const staff = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        mobile_no: true,
        role: true,
        role_title: true,
        business_id: true,
        branch_id: true,
        can_manage_menu: true,
        can_prepare_food: true,
        can_manage_delivery: true,
        can_process_billing: true,
        can_view_reports: true,
        can_manage_inventory: true,
        can_manage_recipes: true,
        can_manage_shifts: true,
        can_clock_in_out: true,
      },
      orderBy: { name: 'asc' },
    });
    res.json(staff);
  } catch (error) {
    console.error('Error fetching employee list:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// 2. Create employee account (restricted to OWNER, ADMIN, or MANAGER)
export const createEmployee = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const { role: actorRole, businessId: actorBusinessId, branchId: actorBranchId, id: actorId } = req.user;
    const { name, email, mobile_no, role, role_title, password, business_id, branch_id, ...permissions } = req.body;

    if (!name || !email || !mobile_no || !role || !password) {
      return res.status(400).json({ error: 'Name, email, mobile, role, and temporary password are required' });
    }

    // Role-based constraints
    let finalBusinessId = business_id;
    let finalBranchId = branch_id;

    if (actorRole === 'MANAGER') {
      // Managers can only create STAFF (not OWNER/ADMIN/MANAGER) for their own branch/business
      if (role !== 'STAFF') {
        return res.status(403).json({ error: 'Managers can only create employee accounts' });
      }
      finalBusinessId = actorBusinessId;
      finalBranchId = actorBranchId;
    } else if (actorRole !== 'OWNER' && actorRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden: Insufficient privileges' });
    }

    if (!finalBusinessId || !finalBranchId) {
      return res.status(400).json({ error: 'Assigned business and branch are required' });
    }

    // Check unique constraints
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    const existingPhone = await prisma.user.findUnique({ where: { mobile_no } });
    if (existingPhone) {
      return res.status(400).json({ error: 'Phone number already in use' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const newEmployee = await prisma.user.create({
      data: {
        name,
        email,
        mobile_no,
        role,
        role_title: role_title || 'Staff',
        password_hash,
        business_id: finalBusinessId,
        branch_id: finalBranchId,
        must_change_password: true, // Force change password on first login
        can_manage_menu: permissions.can_manage_menu === true,
        can_prepare_food: permissions.can_prepare_food === true,
        can_manage_delivery: permissions.can_manage_delivery === true,
        can_process_billing: permissions.can_process_billing === true,
        can_view_reports: permissions.can_view_reports === true,
        can_manage_inventory: permissions.can_manage_inventory === true,
        can_manage_recipes: permissions.can_manage_recipes === true,
        can_manage_shifts: permissions.can_manage_shifts === true,
        can_clock_in_out: permissions.can_clock_in_out !== false, // Defaults to true
      },
    });

    const actor = await prisma.user.findUnique({ where: { id: actorId } });
    await logAudit(actorId, actor?.name, 'EMPLOYEE_CREATED', `Created employee ${newEmployee.name} with title ${role_title || role}`, finalBusinessId);

    res.status(201).json({
      id: newEmployee.id,
      name: newEmployee.name,
      email: newEmployee.email,
      role: newEmployee.role,
      role_title: newEmployee.role_title,
      business_id: newEmployee.business_id,
      branch_id: newEmployee.branch_id,
    });
  } catch (error) {
    console.error('Error creating employee:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// 3. Shift Management
export const getShifts = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const { id: userId, role, businessId: userBusinessId, branchId: userBranchId } = req.user;
    const { businessId: queryBusinessId, branchId: queryBranchId } = req.query;

    let shifts;
    if (role === 'ADMIN' || role === 'MANAGER' || role === 'OWNER') {
      const where: any = {};
      if (role === 'MANAGER') {
        if (userBranchId) {
          where.user = { branch_id: userBranchId };
        }
      } else if (queryBranchId && typeof queryBranchId === 'string' && queryBranchId !== '') {
        where.user = { branch_id: queryBranchId };
      } else if (queryBusinessId && typeof queryBusinessId === 'string' && queryBusinessId !== '') {
        where.user = { business_id: queryBusinessId };
      }

      shifts = await prisma.shift.findMany({
        where,
        include: { user: { select: { id: true, name: true, role: true } } },
        orderBy: { start_time: 'asc' },
      });
    } else {
      shifts = await prisma.shift.findMany({
        where: { user_id: userId },
        include: { user: { select: { id: true, name: true, role: true } } },
        orderBy: { start_time: 'asc' },
      });
    }

    res.json(shifts);
  } catch (error) {
    console.error('Error fetching shifts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createShift = async (req: Request, res: Response) => {
  try {
    const { user_id, start_time, end_time } = req.body;
    // @ts-ignore
    const { role, id: activeUserId, businessId: userBusinessId, branchId: userBranchId } = req.user;

    if (!user_id || !start_time || !end_time) {
      return res.status(400).json({ error: 'user_id, start_time, and end_time are required' });
    }

    const employee = await prisma.user.findUnique({ where: { id: user_id } });
    if (!employee || employee.role === 'CUSTOMER') {
      return res.status(400).json({ error: 'Invalid employee ID' });
    }

    if (role !== 'OWNER' && role !== 'ADMIN' && employee.branch_id !== userBranchId) {
      return res.status(403).json({ error: 'Forbidden: You cannot schedule shifts for employees of another branch' });
    }

    const shift = await prisma.shift.create({
      data: {
        user_id,
        start_time: new Date(start_time),
        end_time: new Date(end_time),
        status: 'ASSIGNED',
      },
      include: { user: true }
    });

    const actor = await prisma.user.findUnique({ where: { id: activeUserId } });
    await logAudit(actor?.id, actor?.name, 'SHIFT_CREATED', `Created shift for ${shift.user.name}: ${shift.start_time.toISOString()} - ${shift.end_time.toISOString()}`, shift.user.business_id);

    res.status(201).json(shift);
  } catch (error) {
    console.error('Error creating shift:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateShift = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { start_time, end_time, status } = req.body;
    // @ts-ignore
    const { id: userId, role, businessId: userBusinessId, branchId: userBranchId } = req.user;

    const shift = await prisma.shift.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!shift) {
      return res.status(404).json({ error: 'Shift not found' });
    }

    if (role !== 'OWNER' && role !== 'ADMIN' && role !== 'MANAGER' && shift.user_id !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (role === 'MANAGER' && shift.user.branch_id !== userBranchId) {
      return res.status(403).json({ error: 'Forbidden: You cannot modify shifts of employees of another branch' });
    }

    const updateData: any = {};
    if (start_time) updateData.start_time = new Date(start_time);
    if (end_time) updateData.end_time = new Date(end_time);

    // Authorization checks for updating status
    if (status) {
      const validStatuses = Object.keys(ShiftStatus);
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid shift status' });
      }

      if (role === 'ADMIN' || role === 'MANAGER' || role === 'OWNER') {
        updateData.status = status;
      } else {
        if (shift.user_id !== userId) {
          return res.status(403).json({ error: 'Forbidden' });
        }
        if (status === 'SWAP_REQUESTED') {
          updateData.status = status;
        } else {
          return res.status(400).json({ error: 'Employees can only request swaps on their shifts' });
        }
      }
    }

    const updatedShift = await prisma.shift.update({
      where: { id },
      data: updateData,
      include: { user: true }
    });

    const actor = await prisma.user.findUnique({ where: { id: userId } });
    await logAudit(actor?.id, actor?.name, 'SHIFT_UPDATED', `Updated shift status/times for ${updatedShift.user.name} to ${status || 'modified times'}`, updatedShift.user.business_id);

    res.json(updatedShift);
  } catch (error) {
    console.error('Error updating shift:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// 4. Timesheet management (Clock In / Clock Out)
export const clockIn = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.user.id;

    // Check if employee is already clocked in
    const activeTimesheet = await prisma.timesheet.findFirst({
      where: {
        user_id: userId,
        clock_out: null,
      },
    });

    if (activeTimesheet) {
      return res.status(400).json({ error: 'You are already clocked in' });
    }

    const timesheet = await prisma.timesheet.create({
      data: {
        user_id: userId,
        clock_in: new Date(),
      },
      include: { user: true }
    });

    await logAudit(timesheet.user.id, timesheet.user.name, 'CLOCK_IN', `Employee clocked in`, timesheet.user.business_id);

    res.status(201).json(timesheet);
  } catch (error) {
    console.error('Error clocking in:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const clockOut = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.user.id;

    // Find the active timesheet
    const activeTimesheet = await prisma.timesheet.findFirst({
      where: {
        user_id: userId,
        clock_out: null,
      },
    });

    if (!activeTimesheet) {
      return res.status(400).json({ error: 'You are not clocked in' });
    }

    const clockOutTime = new Date();
    const durationMs = clockOutTime.getTime() - activeTimesheet.clock_in.getTime();
    const hours = parseFloat((durationMs / (1000 * 60 * 60)).toFixed(2));

    const timesheet = await prisma.timesheet.update({
      where: { id: activeTimesheet.id },
      data: {
        clock_out: clockOutTime,
        total_hours: hours,
      },
      include: { user: true }
    });

    await logAudit(timesheet.user.id, timesheet.user.name, 'CLOCK_OUT', `Employee clocked out. Hours worked: ${hours}`, timesheet.user.business_id);

    res.json(timesheet);
  } catch (error) {
    console.error('Error clocking out:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getTimesheets = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const { id: userId, role, businessId: userBusinessId, branchId: userBranchId } = req.user;
    const { businessId: queryBusinessId, branchId: queryBranchId } = req.query;

    let timesheets;
    if (role === 'ADMIN' || role === 'MANAGER' || role === 'OWNER') {
      const where: any = {};
      if (role === 'MANAGER') {
        if (userBranchId) {
          where.user = { branch_id: userBranchId };
        }
      } else if (queryBranchId && typeof queryBranchId === 'string' && queryBranchId !== '') {
        where.user = { branch_id: queryBranchId };
      } else if (queryBusinessId && typeof queryBusinessId === 'string' && queryBusinessId !== '') {
        where.user = { business_id: queryBusinessId };
      }

      timesheets = await prisma.timesheet.findMany({
        where,
        include: { user: { select: { id: true, name: true, role: true } } },
        orderBy: { clock_in: 'desc' },
      });
    } else {
      timesheets = await prisma.timesheet.findMany({
        where: { user_id: userId },
        include: { user: { select: { id: true, name: true, role: true } } },
        orderBy: { clock_in: 'desc' },
      });
    }

    res.json(timesheets);
  } catch (error) {
    console.error('Error fetching timesheets:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
