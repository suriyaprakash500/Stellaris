import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';
import { api } from '../../api';

vi.mock('../../api', () => ({
  api: {
    login: vi.fn(),
    register: vi.fn(),
    getProfile: vi.fn(),
  },
}));

// Test helper component to consume useAuth context
const TestConsumer: React.FC = () => {
  const { user, token, loading, login, register, logout, toasts, showToast } = useAuth();

  return (
    <div>
      <div data-testid="loading">{loading ? 'true' : 'false'}</div>
      <div data-testid="token">{token || 'null'}</div>
      <div data-testid="user">{user ? user.name : 'null'}</div>
      <button data-testid="login-btn" onClick={() => login('test@gmail.com', 'Password123').catch(() => {})}>Login</button>
      <button data-testid="register-btn" onClick={() => register('test@gmail.com', '9876543210', 'Password123', 'Test User').catch(() => {})}>Register</button>
      <button data-testid="logout-btn" onClick={() => logout()}>Logout</button>
      <button data-testid="toast-btn" onClick={() => showToast('Test Message', 'success')}>Toast</button>
      <div data-testid="toasts">
        {toasts.map(t => (
          <span key={t.id}>{t.message}</span>
        ))}
      </div>
    </div>
  );
};

describe('AuthContext & AuthProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    // Default mock behavior for restoring profile to prevent unhandled rejection loop
    (api.getProfile as any).mockResolvedValue({ id: 'default-id', email: 'test@gmail.com', name: 'Default User', role: 'CUSTOMER' });
  });

  it('should initialize with loading: true and restore session if token exists in localStorage', async () => {
    localStorage.setItem('stellaris_token', 'stored-token-123');
    const mockProfile = { id: '1', email: 'test@gmail.com', name: 'Mathan', role: 'OWNER' as const };
    (api.getProfile as any).mockResolvedValueOnce(mockProfile);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    // Should initially show loading
    expect(screen.getByTestId('loading')).toHaveTextContent('true');

    // Wait for auth to complete
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    expect(api.getProfile).toHaveBeenCalled();
    expect(screen.getByTestId('user')).toHaveTextContent('Mathan');
    expect(screen.getByTestId('token')).toHaveTextContent('stored-token-123');
  });

  it('should handle login successfully', async () => {
    const mockUser = { id: '2', email: 'test@gmail.com', name: 'Alice', role: 'MANAGER' as const };
    const mockResponse = {
      token: 'new-token-999',
      user: mockUser
    };
    (api.login as any).mockResolvedValueOnce(mockResponse);
    // When getProfile is called on token update, resolve to Alice
    (api.getProfile as any).mockResolvedValue(mockUser);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    await act(async () => {
      screen.getByTestId('login-btn').click();
    });

    expect(api.login).toHaveBeenCalledWith({ email: 'test@gmail.com', password: 'Password123' });
    expect(localStorage.getItem('stellaris_token')).toBe('new-token-999');
    
    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('Alice');
      expect(screen.getByTestId('token')).toHaveTextContent('new-token-999');
    });
    expect(screen.getByTestId('toasts')).toHaveTextContent('Logged in successfully');
  });

  it('should handle login failure and display exception message', async () => {
    (api.login as any).mockRejectedValueOnce(new Error('Invalid email or password'));

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    await act(async () => {
      screen.getByTestId('login-btn').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('toasts')).toHaveTextContent('Invalid email or password');
    });
    expect(screen.getByTestId('user')).toHaveTextContent('null');
  });

  it('should handle registration successfully', async () => {
    const mockUser = { id: '3', email: 'test@gmail.com', name: 'Test User', role: 'CUSTOMER' as const };
    const mockResponse = {
      token: 'reg-token-888',
      user: mockUser
    };
    (api.register as any).mockResolvedValueOnce(mockResponse);
    (api.getProfile as any).mockResolvedValue(mockUser);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    await act(async () => {
      screen.getByTestId('register-btn').click();
    });

    expect(api.register).toHaveBeenCalledWith({
      email: 'test@gmail.com',
      mobile_no: '9876543210',
      password: 'Password123',
      name: 'Test User'
    });
    expect(localStorage.getItem('stellaris_token')).toBe('reg-token-888');
    
    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('Test User');
    });
    expect(screen.getByTestId('toasts')).toHaveTextContent('Account registered successfully');
  });

  it('should handle logout correctly', async () => {
    localStorage.setItem('stellaris_token', 'token-to-delete');

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    await act(async () => {
      screen.getByTestId('logout-btn').click();
    });

    expect(localStorage.getItem('stellaris_token')).toBeNull();
    expect(screen.getByTestId('user')).toHaveTextContent('null');
    expect(screen.getByTestId('token')).toHaveTextContent('null');
    expect(screen.getByTestId('toasts')).toHaveTextContent('Logged out successfully');
  });
});
