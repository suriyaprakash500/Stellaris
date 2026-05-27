import { Router } from 'express';
import {
  getEmployeesList,
  getShifts,
  createShift,
  updateShift,
  clockIn,
  clockOut,
  getTimesheets,
} from '../controllers/employeeController';
import { authenticate, authorizeRole } from '../middleware/authMiddleware';

const router = Router();

// All employee routes require authentication
router.use(authenticate);

// Employees list and shifts
router.get('/list', authorizeRole(['ADMIN', 'MANAGER']), getEmployeesList);
router.get('/shifts', getShifts);
router.post('/shifts', authorizeRole(['ADMIN', 'MANAGER']), createShift);
router.put('/shifts/:id', updateShift);

// Clock in / out & timesheets
router.post('/timesheet/clock-in', clockIn);
router.post('/timesheet/clock-out', clockOut);
router.get('/timesheets', getTimesheets);

export default router;
