import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { AlertCircle, ArrowLeft, CheckCircle } from 'lucide-react';

type AuthView = 'login' | 'register' | 'forgot' | 'reset';

export const LoginRegister: React.FC = () => {
  const [view, setView] = useState<AuthView>('login');
  const [email, setEmail] = useState('');
  const [mobileNo, setMobileNo] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('CUSTOMER');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [phone, setPhone] = useState('');

  // Forgot/Reset password states
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const { login, register } = useAuth();

  const clearState = () => {
    setError('');
    setSuccessMessage('');
    setSubmitting(false);
  };

  const switchView = (newView: AuthView) => {
    clearState();
    setView(newView);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (view === 'register') {
        await register(email, mobileNo, password, name, role);
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      setError('Please enter your registered phone number');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await api.forgotPassword(phone);
      setSuccessMessage('If an account exists with that phone number, a password reset code has been generated. Check with your system administrator for the reset code.');
      setView('reset');
    } catch (err: any) {
      setError(err.message || 'Failed to process request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetToken.trim()) {
      setError('Please enter the reset code');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await api.resetPassword(resetToken, newPassword);
      setSuccessMessage('Password reset successfully! You can now log in with your new password.');
      setResetToken('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => switchView('login'), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. The code may be invalid or expired.');
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
          <h2 className="auth-title" id="auth-title-header">
            {view === 'login' && 'Welcome Back'}
            {view === 'register' && 'Create Account'}
            {view === 'forgot' && 'Forgot Password'}
            {view === 'reset' && 'Reset Password'}
          </h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            {view === 'login' && 'Log in to manage operations'}
            {view === 'register' && 'Sign up to order and track shipments'}
            {view === 'forgot' && 'Enter your phone number to receive a reset code'}
            {view === 'reset' && 'Enter the reset code and your new password'}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div id="auth-error-message" style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '12px 16px', borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#ef4444', fontSize: '14px', marginBottom: '16px',
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div id="auth-success-message" style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '12px 16px', borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)',
            color: '#22c55e', fontSize: '14px', marginBottom: '16px',
          }}>
            <CheckCircle size={18} style={{ flexShrink: 0 }} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Login / Register Form */}
        {(view === 'login' || view === 'register') && (
          <form onSubmit={handleLoginSubmit} id="auth-form">
            {view === 'register' && (
              <>
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
                <div className="form-group">
                  <label className="form-label" htmlFor="mobile-input">Phone Number</label>
                  <input
                    id="mobile-input"
                    type="tel"
                    className="input-control"
                    placeholder="e.g., +91 9876543210"
                    value={mobileNo}
                    onChange={(e) => setMobileNo(e.target.value)}
                    required
                  />
                </div>
              </>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="email-input">Email Address</label>
              <input
                id="email-input"
                type="email"
                className="input-control"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
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
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                required
              />
            </div>

            {view === 'register' && (
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
                  <option value="OWNER">Owner</option>
                  <option value="ADMIN">CEO / System Admin</option>
                  <option value="MANAGER">Manager</option>
                  <option value="SHOP_CAPTAIN">Shop Captain</option>
                  <option value="BILLER">Biller</option>
                  <option value="COOK">Cook</option>
                  <option value="HELPER">Helper</option>
                  <option value="KITCHEN_STAFF">Kitchen Staff (Legacy)</option>
                  <option value="DELIVERY">Delivery Rider (Legacy)</option>
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
              {submitting ? 'Please wait...' : view === 'register' ? 'Register Account' : 'Log In'}
            </button>

            {view === 'login' && (
              <div style={{ textAlign: 'center', marginTop: '12px' }}>
                <button
                  id="forgot-password-btn"
                  type="button"
                  style={{
                    background: 'none', border: 'none',
                    color: 'var(--text-secondary)', cursor: 'pointer',
                    fontSize: '13px', textDecoration: 'underline',
                  }}
                  onClick={() => switchView('forgot')}
                >
                  Forgot Password?
                </button>
              </div>
            )}
          </form>
        )}

        {/* Forgot Password Form */}
        {view === 'forgot' && (
          <form onSubmit={handleForgotSubmit} id="forgot-form">
            <div className="form-group">
              <label className="form-label" htmlFor="forgot-phone-input">Phone Number</label>
              <input
                id="forgot-phone-input"
                type="tel"
                className="input-control"
                placeholder="e.g., +91 9876543210"
                value={phone}
                onChange={(e) => { setPhone(e.target.value); setError(''); }}
                required
              />
            </div>

            <button
              id="forgot-submit-btn"
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '10px' }}
              disabled={submitting}
            >
              {submitting ? 'Sending...' : 'Send Reset Code'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <button
                type="button"
                style={{
                  background: 'none', border: 'none',
                  color: 'var(--primary)', cursor: 'pointer',
                  fontSize: '14px', fontWeight: 600, display: 'inline-flex',
                  alignItems: 'center', gap: '6px',
                }}
                onClick={() => switchView('login')}
              >
                <ArrowLeft size={16} /> Back to Login
              </button>
            </div>
          </form>
        )}

        {/* Reset Password Form */}
        {view === 'reset' && (
          <form onSubmit={handleResetSubmit} id="reset-form">
            <div className="form-group">
              <label className="form-label" htmlFor="reset-token-input">Reset Code</label>
              <input
                id="reset-token-input"
                type="text"
                className="input-control"
                placeholder="Paste the reset code here"
                value={resetToken}
                onChange={(e) => { setResetToken(e.target.value); setError(''); }}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="new-password-input">New Password</label>
              <input
                id="new-password-input"
                type="password"
                className="input-control"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
                required
                minLength={6}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="confirm-password-input">Confirm New Password</label>
              <input
                id="confirm-password-input"
                type="password"
                className="input-control"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                required
                minLength={6}
              />
            </div>

            <button
              id="reset-submit-btn"
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '10px' }}
              disabled={submitting}
            >
              {submitting ? 'Resetting...' : 'Reset Password'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <button
                type="button"
                style={{
                  background: 'none', border: 'none',
                  color: 'var(--primary)', cursor: 'pointer',
                  fontSize: '14px', fontWeight: 600, display: 'inline-flex',
                  alignItems: 'center', gap: '6px',
                }}
                onClick={() => switchView('login')}
              >
                <ArrowLeft size={16} /> Back to Login
              </button>
            </div>
          </form>
        )}

        {/* Toggle Login/Register */}
        {(view === 'login' || view === 'register') && (
          <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '14px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>
              {view === 'register' ? 'Already have an account? ' : "Don't have an account? "}
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
              onClick={() => switchView(view === 'register' ? 'login' : 'register')}
            >
              {view === 'register' ? 'Log In' : 'Sign Up'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
