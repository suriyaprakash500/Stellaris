import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authenticate, authorizeRole, authorizePermission } from '../authMiddleware';
import jwt from 'jsonwebtoken';
import prisma from '../../db/prisma';

vi.mock('jsonwebtoken');
vi.mock('../../db/prisma', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

describe('authMiddleware - authenticate', () => {
  let mockRequest: any;
  let mockResponse: any;
  let nextFunction: any;

  beforeEach(() => {
    mockRequest = {
      headers: {},
      originalUrl: '/api/menu',
    };
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    nextFunction = vi.fn();
    vi.clearAllMocks();
  });

  it('should return 401 if Authorization header is missing', async () => {
    await authenticate(mockRequest, mockResponse, nextFunction);
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should return 401 if token is not Bearer type', async () => {
    mockRequest.headers.authorization = 'Basic credentialshere';
    await authenticate(mockRequest, mockResponse, nextFunction);
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should return 401 if token verification fails (jwt error)', async () => {
    mockRequest.headers.authorization = 'Bearer invalid_token';
    vi.spyOn(jwt, 'verify').mockImplementationOnce(() => {
      throw new Error('Invalid signature');
    });

    await authenticate(mockRequest, mockResponse, nextFunction);
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Invalid token' });
  });

  it('should return 401 if decoded user does not exist in db', async () => {
    mockRequest.headers.authorization = 'Bearer valid_token';
    vi.spyOn(jwt, 'verify').mockReturnValueOnce({ id: 'nonexistent-id' } as any);
    (prisma.user.findUnique as any).mockResolvedValueOnce(null);

    await authenticate(mockRequest, mockResponse, nextFunction);
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'User not found' });
  });

  it('should return 403 if user must change password and tries accessing general route', async () => {
    mockRequest.headers.authorization = 'Bearer valid_token';
    vi.spyOn(jwt, 'verify').mockReturnValueOnce({ id: 'user-123' } as any);
    (prisma.user.findUnique as any).mockResolvedValueOnce({
      id: 'user-123',
      must_change_password: true,
      role: 'STAFF',
      business_id: 'biz-123',
      branch_id: 'branch-123',
    });

    await authenticate(mockRequest, mockResponse, nextFunction);
    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Password change required',
      mustChangePassword: true,
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should allow must_change_password user if route is change-password', async () => {
    mockRequest.headers.authorization = 'Bearer valid_token';
    mockRequest.originalUrl = '/api/auth/change-password';
    vi.spyOn(jwt, 'verify').mockReturnValueOnce({ id: 'user-123' } as any);
    (prisma.user.findUnique as any).mockResolvedValueOnce({
      id: 'user-123',
      must_change_password: true,
      role: 'STAFF',
      business_id: 'biz-123',
      branch_id: 'branch-123',
    });

    await authenticate(mockRequest, mockResponse, nextFunction);
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should allow must_change_password user if route is logout', async () => {
    mockRequest.headers.authorization = 'Bearer valid_token';
    mockRequest.originalUrl = '/api/auth/logout';
    vi.spyOn(jwt, 'verify').mockReturnValueOnce({ id: 'user-123' } as any);
    (prisma.user.findUnique as any).mockResolvedValueOnce({
      id: 'user-123',
      must_change_password: true,
      role: 'STAFF',
      business_id: 'biz-123',
      branch_id: 'branch-123',
    });

    await authenticate(mockRequest, mockResponse, nextFunction);
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should attach user details to request and call next() on happy path', async () => {
    mockRequest.headers.authorization = 'Bearer valid_token';
    vi.spyOn(jwt, 'verify').mockReturnValueOnce({ id: 'user-123' } as any);
    const mockUserRecord = {
      id: 'user-123',
      must_change_password: false,
      role: 'MANAGER',
      business_id: 'biz-123',
      branch_id: 'branch-123',
    };
    (prisma.user.findUnique as any).mockResolvedValueOnce(mockUserRecord);

    await authenticate(mockRequest, mockResponse, nextFunction);
    expect(nextFunction).toHaveBeenCalled();
    expect(mockRequest.user).toEqual({
      id: 'user-123',
      role: 'MANAGER',
      businessId: 'biz-123',
      branchId: 'branch-123',
      user: mockUserRecord,
    });
  });
});

describe('authMiddleware - authorizeRole', () => {
  let mockRequest: any;
  let mockResponse: any;
  let nextFunction: any;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    nextFunction = vi.fn();
  });

  it('should return 403 Forbidden if user role is not attached to request', () => {
    const middleware = authorizeRole(['MANAGER']);
    middleware(mockRequest, mockResponse, nextFunction);
    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Forbidden' });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should call next() if user role matches exactly', () => {
    mockRequest.user = { role: 'MANAGER' };
    const middleware = authorizeRole(['MANAGER']);
    middleware(mockRequest, mockResponse, nextFunction);
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should call next() if user role is higher in hierarchy', () => {
    mockRequest.user = { role: 'OWNER' };
    const middleware = authorizeRole(['MANAGER']);
    middleware(mockRequest, mockResponse, nextFunction);
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should return 403 Forbidden if user role is lower in hierarchy', () => {
    mockRequest.user = { role: 'CUSTOMER' };
    const middleware = authorizeRole(['MANAGER']);
    middleware(mockRequest, mockResponse, nextFunction);
    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Forbidden' });
    expect(nextFunction).not.toHaveBeenCalled();
  });
});

describe('authMiddleware - authorizePermission', () => {
  let mockRequest: any;
  let mockResponse: any;
  let nextFunction: any;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    nextFunction = vi.fn();
  });

  it('should return 403 Forbidden if user role is missing', () => {
    const middleware = authorizePermission('can_manage_menu');
    middleware(mockRequest, mockResponse, nextFunction);
    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Forbidden' });
  });

  it('should allow OWNER and ADMIN to bypass checks', () => {
    mockRequest.user = { role: 'OWNER' };
    let middleware = authorizePermission('can_manage_menu');
    middleware(mockRequest, mockResponse, nextFunction);
    expect(nextFunction).toHaveBeenCalledTimes(1);

    mockRequest.user = { role: 'ADMIN' };
    middleware = authorizePermission('can_manage_menu');
    middleware(mockRequest, mockResponse, nextFunction);
    expect(nextFunction).toHaveBeenCalledTimes(2);
  });

  it('should allow MANAGER to bypass checks', () => {
    mockRequest.user = { role: 'MANAGER' };
    const middleware = authorizePermission('can_manage_menu');
    middleware(mockRequest, mockResponse, nextFunction);
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should allow STAFF if the required permission flag is true', () => {
    mockRequest.user = {
      role: 'STAFF',
      user: { can_manage_menu: true }
    };
    const middleware = authorizePermission('can_manage_menu');
    middleware(mockRequest, mockResponse, nextFunction);
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should reject STAFF if the required permission flag is false or missing', () => {
    mockRequest.user = {
      role: 'STAFF',
      user: { can_manage_menu: false }
    };
    const middleware = authorizePermission('can_manage_menu');
    middleware(mockRequest, mockResponse, nextFunction);
    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Forbidden: Insufficient permissions' });
  });
});
