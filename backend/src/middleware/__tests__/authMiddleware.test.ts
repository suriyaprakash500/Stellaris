import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authenticate } from '../authMiddleware';
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
