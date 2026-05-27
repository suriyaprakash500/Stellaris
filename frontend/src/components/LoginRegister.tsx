import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export const LoginRegister: React.FC = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('CUSTOMER');
  const [submitting, setSubmitting] = useState(false);

  const { login, register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isRegister) {
        await register(email, password, name, role);
      } else {
        await login(email, password);
      }
    } catch (err) {
      // Error handled by AuthContext toast
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="card auth-card">
        <div className="auth-header">
          <div className="logo-container" style={{ justifyContent: 'center' }}>
            <div className="logo-icon">S</div>
            <div className="logo-text">Stellaris</div>
          </div>
          <h2 className="auth-title" id="auth-title-header">{isRegister ? 'Create Account' : 'Welcome Back'}</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            {isRegister ? 'Sign up to order and track shipments' : 'Log in to manage operations'}
          </p>
        </div>

        <form onSubmit={handleSubmit} id="auth-form">
          {isRegister && (
            <div className="form-group">
              <label className="form-label" htmlFor="name-input">Full Name</label>
              <input
                id="name-input"
                type="text"
                className="input-control"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="email-input">Email Address</label>
            <input
              id="email-input"
              type="email"
              className="input-control"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password-input">Password</label>
            <input
              id="password-input"
              type="password"
              className="input-control"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {isRegister && (
            <div className="form-group">
              <label className="form-label" htmlFor="role-select">Select System Role (for testing)</label>
              <select
                id="role-select"
                className="input-control"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                required
              >
                <option value="CUSTOMER">Customer</option>
                <option value="KITCHEN_STAFF">Kitchen Staff</option>
                <option value="DELIVERY">Delivery Rider</option>
                <option value="MANAGER">Manager</option>
                <option value="ADMIN">System Admin</option>
              </select>
            </div>
          )}

          <button
            id="auth-submit-btn"
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '10px' }}
            disabled={submitting}
          >
            {submitting ? 'Please wait...' : isRegister ? 'Register Account' : 'Log In'}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '14px' }}>
          <span style={{ color: 'var(--text-secondary)' }}>
            {isRegister ? 'Already have an account? ' : "Don't have an account? "}
          </span>
          <button
            id="toggle-auth-mode-btn"
            type="button"
            className="btn-secondary"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--primary)',
              cursor: 'pointer',
              fontWeight: 600,
              padding: 0,
            }}
            onClick={() => setIsRegister(!isRegister)}
          >
            {isRegister ? 'Log In' : 'Sign Up'}
          </button>
        </div>
      </div>
    </div>
  );
};
