import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'MANAGER' | 'KITCHEN_STAFF' | 'DELIVERY' | 'CUSTOMER';
}

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, role: string) => Promise<void>;
  logout: () => void;
  toasts: Toast[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('stellaris_token'));
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('stellaris_token');
      if (storedToken) {
        try {
          const profile = await api.getProfile();
          setUser(profile);
        } catch (err) {
          console.error('Session restore failed:', err);
          logout();
        }
      }
      setLoading(false);
    };
    initAuth();
  }, [token]);

  const login = async (email: string, password: string) => {
    try {
      const data = await api.login({ email, password });
      localStorage.setItem('stellaris_token', data.token);
      setToken(data.token);
      setUser(data.user);
      showToast('Logged in successfully', 'success');
    } catch (err: any) {
      showToast(err.message || 'Login failed', 'error');
      throw err;
    }
  };

  const register = async (email: string, password: string, name: string, role: string) => {
    try {
      const data = await api.register({ email, password, name, role });
      localStorage.setItem('stellaris_token', data.token);
      setToken(data.token);
      setUser(data.user);
      showToast('Account registered successfully', 'success');
    } catch (err: any) {
      showToast(err.message || 'Registration failed', 'error');
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('stellaris_token');
    setToken(null);
    setUser(null);
    showToast('Logged out successfully', 'success');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, toasts, showToast }}>
      {children}
      <div className="toast-container" style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.type === 'success' ? 'toast-success' : toast.type === 'error' ? 'toast-error' : ''}`}>
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
