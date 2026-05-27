import { Request, Response } from 'express';
import prisma from '../db/prisma';
import { ShiftStatus } from '@prisma/client';

// 1. Fetch employee users list (users that are staff)
export const getEmployeesList = async (req: Request, res: Response) => {
  try {
    const staff = await prisma.user.findMany({
      where: {
        role: {
          in: ['ADMIN', 'MANAGER', 'KITCHEN_STAFF', 'DELIVERY'],
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: { name: 'asc' },
    });
    res.json(staff);
  } catch (error) {
    console.error('Error fetching employee list:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// 2. Shift Management
export const getShifts = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const { id: userId, role } = req.user;

    let shifts;
    if (role === 'ADMIN' || role === 'MANAGER') {
      shifts = await prisma.shift.findMany({
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

    if (!user_id || !start_time || !end_time) {
      return res.status(400).json({ error: 'user_id, start_time, and end_time are required' });
    }

    const employee = await prisma.user.findUnique({ where: { id: user_id } });
    if (!employee || employee.role === 'CUSTOMER') {
      return res.status(400).json({ error: 'Invalid employee ID' });
    }

    const shift = await prisma.shift.create({
      data: {
        user_id,
        start_time: new Date(start_time),
        end_time: new Date(end_time),
        status: 'ASSIGNED',
      },
    });

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
    const { id: userId, role } = req.user;

    const shift = await prisma.shift.findUnique({ where: { id } });
    if (!shift) {
      return res.status(404).json({ error: 'Shift not found' });
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

      if (role === 'ADMIN' || role === 'MANAGER') {
        updateData.status = status;
      } else {
        // Normal employee can only request swap or complete if authorized
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
    });

    res.json(updatedShift);
  } catch (error) {
    console.error('Error updating shift:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// 3. Timesheet management (Clock In / Clock Out)
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
    });

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
    });

    res.json(timesheet);
  } catch (error) {
    console.error('Error clocking out:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getTimesheets = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const { id: userId, role } = req.user;

    let timesheets;
    if (role === 'ADMIN' || role === 'MANAGER') {
      timesheets = await prisma.timesheet.findMany({
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
