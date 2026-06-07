import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginRegister } from './components/LoginRegister';
import { CustomerPortal } from './components/CustomerPortal';
import { KitchenScreen } from './components/KitchenScreen';
import { DeliveryPortal } from './components/DeliveryPortal';
import { ManagerDashboard } from './components/ManagerDashboard';
import { api } from './api';
import {
  LogOut,
  ChefHat,
  Bike,
  TrendingUp,
  ShoppingBag,
  Clock,
  Calendar,
  User as UserIcon
} from 'lucide-react';

const DashboardContent: React.FC = () => {
  const { user, logout, showToast } = useAuth();
  const [activeView, setActiveView] = useState<string>('');
  const [businessName, setBusinessName] = useState<string>('Loading...');

  const fetchBusinessName = async () => {
    try {
      const settings = await api.getBusinessSettings();
      setBusinessName(settings.owner_name || 'Stellaris POS');
    } catch (err) {
      console.error('Failed to load business settings:', err);
      setBusinessName('Stellaris POS');
    }
  };
  
  // Shifts modal for staff
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [myShifts, setMyShifts] = useState<any[]>([]);
  const [activeTimesheet, setActiveTimesheet] = useState<any>(null);

  const fetchStaffStatus = async () => {
    if (!user || user.role === 'CUSTOMER') return;
    try {
      const shifts = await api.getShifts();
      setMyShifts(shifts);
      const timesheets = await api.getTimesheets();
      const active = timesheets.find((ts: any) => ts.user_id === user.id && ts.clock_out === null);
      setActiveTimesheet(active || null);
    } catch (err) {
      console.error('Error loading staff status:', err);
    }
  };

  useEffect(() => {
    // Set default active view based on role and permissions
    if (user) {
      if (['OWNER', 'ADMIN', 'MANAGER'].includes(user.role)) {
        setActiveView('manager');
      } else if (user.role === 'STAFF' && user.permissions?.can_prepare_food) {
        setActiveView('kitchen');
      } else if (user.role === 'STAFF' && user.permissions?.can_manage_delivery) {
        setActiveView('delivery');
      } else if (user.role === 'STAFF' && user.permissions?.can_process_billing) {
        setActiveView('customer');
      } else if (user.role === 'CUSTOMER') {
        setActiveView('customer');
      } else {
        setActiveView('tracking');
      }
      fetchStaffStatus();
      fetchBusinessName();
    }
  }, [user]);

  const handleClockIn = async () => {
    try {
      await api.clockIn();
      showToast('Clocked in successfully', 'success');
      fetchStaffStatus();
    } catch (err: any) {
      showToast(err.message || 'Clock-in failed', 'error');
    }
  };

  const handleClockOut = async () => {
    try {
      await api.clockOut();
      showToast('Clocked out successfully', 'success');
      fetchStaffStatus();
    } catch (err: any) {
      showToast(err.message || 'Clock-out failed', 'error');
    }
  };

  const handleRequestSwap = async (shiftId: string) => {
    try {
      await api.updateShift(shiftId, { status: 'SWAP_REQUESTED' });
      showToast('Shift swap requested', 'success');
      fetchStaffStatus();
    } catch (err: any) {
      showToast(err.message || 'Failed to request shift swap', 'error');
    }
  };

  if (!user) return null;

  const showClockInOptions = user.role !== 'CUSTOMER' && (['OWNER', 'ADMIN', 'MANAGER'].includes(user.role) || user.permissions?.can_clock_in_out);

  return (
    <div className="app-container">
      {/* Sidebar navigation */}
      <aside className="sidebar">
        <div className="logo-container" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px', height: 'auto', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="logo-icon">S</div>
            <div className="logo-text">Stellaris</div>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500, paddingLeft: '4px' }}>
            Business Owner: {businessName}
          </div>
        </div>

        <nav style={{ flexGrow: 1 }}>
          <ul className="nav-list">
             {/* Admin / Manager Navigation */}
            {['OWNER', 'ADMIN', 'MANAGER'].includes(user.role) && (
              <>
                <li
                  className={`nav-item ${activeView === 'manager' ? 'active' : ''}`}
                  onClick={() => setActiveView('manager')}
                >
                  <TrendingUp size={18} />
                  <span>Operations</span>
                </li>
              </>
            )}

            {/* Kitchen Navigation */}
            {((['OWNER', 'ADMIN', 'MANAGER'].includes(user.role)) || (user.role === 'STAFF' && user.permissions?.can_prepare_food)) && (
              <li
                className={`nav-item ${activeView === 'kitchen' ? 'active' : ''}`}
                onClick={() => setActiveView('kitchen')}
              >
                <ChefHat size={18} />
                <span>Kitchen Queue</span>
              </li>
            )}

            {/* Delivery Navigation */}
            {((['OWNER', 'ADMIN', 'MANAGER'].includes(user.role)) || (user.role === 'STAFF' && user.permissions?.can_manage_delivery)) && (
              <li
                className={`nav-item ${activeView === 'delivery' ? 'active' : ''}`}
                onClick={() => setActiveView('delivery')}
              >
                <Bike size={18} />
                <span>Delivery Dispatch</span>
              </li>
            )}

            {/* Customer Navigation */}
            {((['OWNER', 'ADMIN', 'MANAGER', 'CUSTOMER'].includes(user.role)) || (user.role === 'STAFF' && user.permissions?.can_process_billing)) && (
              <li
                className={`nav-item ${activeView === 'customer' ? 'active' : ''}`}
                onClick={() => setActiveView('customer')}
              >
                <ShoppingBag size={18} />
                <span>Order Food</span>
              </li>
            )}
            <li
              className={`nav-item ${activeView === 'tracking' ? 'active' : ''}`}
              onClick={() => setActiveView('tracking')}
            >
              <Clock size={18} />
              <span>Track Orders</span>
            </li>
          </ul>
        </nav>

        {/* Sidebar Footer containing user profile, clock-in, and logout */}
        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ background: 'var(--bg-tertiary)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UserIcon size={18} style={{ color: 'var(--primary-hover)' }} />
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontWeight: 600, fontSize: '14px', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{user.name}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{user.role}</div>
            </div>
          </div>

          {showClockInOptions && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {activeTimesheet ? (
                <button className="btn btn-danger" style={{ padding: '8px 12px', fontSize: '13px', width: '100%', gap: '6px' }} onClick={handleClockOut}>
                  <Clock size={14} /> Clock Out
                </button>
              ) : (
                <button className="btn btn-success" style={{ padding: '8px 12px', fontSize: '13px', width: '100%', gap: '6px' }} onClick={handleClockIn}>
                  <Clock size={14} /> Clock In
                </button>
              )}
              <button
                className="btn btn-secondary"
                style={{ padding: '8px 12px', fontSize: '13px', width: '100%', gap: '6px' }}
                onClick={() => {
                  fetchStaffStatus();
                  setIsShiftModalOpen(true);
                }}
              >
                <Calendar size={14} /> My Scheduled Shifts
              </button>
            </div>
          )}

          <button className="btn btn-secondary" style={{ width: '100%', gap: '8px', color: 'var(--danger)' }} onClick={logout}>
            <LogOut size={16} /> Log Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {activeView === 'manager' && ['OWNER', 'ADMIN', 'MANAGER'].includes(user.role) && <ManagerDashboard />}
        {activeView === 'kitchen' && (['OWNER', 'ADMIN', 'MANAGER'].includes(user.role) || (user.role === 'STAFF' && user.permissions?.can_prepare_food)) && <KitchenScreen />}
        {activeView === 'delivery' && (['OWNER', 'ADMIN', 'MANAGER'].includes(user.role) || (user.role === 'STAFF' && user.permissions?.can_manage_delivery)) && <DeliveryPortal />}
        {activeView === 'customer' && <CustomerPortal activeSubView="order" />}
        {activeView === 'tracking' && <CustomerPortal activeSubView="tracking" />}
      </main>

      {/* Shifts calendar and Swap Request modal for employees */}
      {isShiftModalOpen && (
        <div className="modal-overlay">
          <div className="modal" style={{ width: '600px' }}>
            <div className="modal-header">
              <h3>My Work Shifts & Schedule</h3>
              <button className="btn-secondary" style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }} onClick={() => setIsShiftModalOpen(false)}>&times;</button>
            </div>
            <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Shift Date</th>
                      <th>Hours</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myShifts.map((shift) => (
                      <tr key={shift.id}>
                        <td>
                          <strong>{new Date(shift.start_time).toLocaleDateString()}</strong>
                        </td>
                        <td>
                          <div style={{ fontSize: '13px' }}>
                            {new Date(shift.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(shift.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${
                            shift.status === 'ASSIGNED' ? 'badge-pending' :
                            shift.status === 'COMPLETED' ? 'badge-delivered' :
                            shift.status === 'SWAP_REQUESTED' ? 'badge-preparing' : 'badge-cancelled'
                          }`}>
                            {shift.status}
                          </span>
                        </td>
                        <td>
                          {shift.status === 'ASSIGNED' && (
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '4px 8px', fontSize: '12px' }}
                              onClick={() => handleRequestSwap(shift.id)}
                            >
                              Request Swap
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {myShifts.length === 0 && (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
                          No shifts scheduled.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setIsShiftModalOpen(false)}>Close Window</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ForceChangePassword: React.FC = () => {
  const { logout, showToast, setUser } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      await api.changePassword(newPassword);
      showToast('Password updated successfully! Welcome.', 'success');
      const profile = await api.getProfile();
      setUser(profile);
    } catch (err: any) {
      setError(err.message || 'Failed to change password. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <div className="card" style={{ width: '400px', padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: '8px' }}>Reset Temporary Password</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>This is your first login. You must configure a new, secure password to continue.</p>
        </div>

        {error && <div className="toast toast-error" style={{ position: 'static', width: '100%' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="new-pwd-input">New Password</label>
            <input
              id="new-pwd-input"
              type="password"
              className="input-control"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="confirm-pwd-input">Confirm New Password</label>
            <input
              id="confirm-pwd-input"
              type="password"
              className="input-control"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }} disabled={submitting}>
            {submitting ? 'Updating password...' : 'Update Password & Login'}
          </button>
        </form>

        <button className="btn btn-secondary" style={{ width: '100%' }} onClick={logout}>
          Log Out
        </button>
      </div>
    </div>
  );
};

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: '20px' }}>
        <div className="spinner"></div>
        <div style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-display)' }}>Initializing Stellaris System...</div>
      </div>
    );
  }

  if (user) {
    if (user.mustChangePassword) {
      return <ForceChangePassword />;
    }
    return <DashboardContent />;
  }

  return <LoginRegister />;
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;

