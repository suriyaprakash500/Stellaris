import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { ChefHat, Play, CheckCircle } from 'lucide-react';

export const KitchenScreen: React.FC = () => {
  const { showToast } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  const fetchOrders = async () => {
    try {
      const allOrders = await api.getOrders();
      // Keep only active kitchen orders (PENDING, PREPARING, READY)
      const active = allOrders.filter(
        (o: any) => o.status === 'PENDING' || o.status === 'PREPARING' || o.status === 'READY'
      );
      setOrders(active);
    } catch (err: any) {
      console.error('Error fetching kitchen queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000); // Quick refresh for kitchen operations
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getElapsedTimeInfo = (stageTime: string | null | undefined, intakeTime: string) => {
    const stageStartTime = new Date(stageTime || intakeTime).getTime();
    const intakeStartTime = new Date(intakeTime).getTime();
    
    const elapsedMs = now.getTime() - stageStartTime;
    const elapsedMin = Math.floor(elapsedMs / 60000);
    const elapsedSec = Math.floor((elapsedMs % 60000) / 1000);
    
    const totalMs = now.getTime() - intakeStartTime;
    const totalMin = Math.floor(totalMs / 60000);
    const isLate = totalMin >= 10;
    
    return {
      formatted: `${elapsedMin}m ${elapsedSec}s`,
      isLate
    };
  };

  const handleStatusTransition = async (orderId: string, nextStatus: string) => {
    try {
      await api.updateOrderStatus(orderId, nextStatus);
      showToast(`Order status updated to ${nextStatus}`, 'success');
      fetchOrders();
    } catch (err: any) {
      showToast(err.message || 'Failed to update order status', 'error');
    }
  };

  const pendingOrders = orders.filter((o) => o.status === 'PENDING');
  const preparingOrders = orders.filter((o) => o.status === 'PREPARING');
  const readyOrders = orders.filter((o) => o.status === 'READY');

  if (loading) {
    return <div className="spinner"></div>;
  }

  return (
    <div style={{ width: '100%' }}>
      <div className="card" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <ChefHat size={32} style={{ color: 'var(--primary)' }} />
        <div>
          <h2>Kitchen Display System</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Live orders dashboard for kitchen staff. Start cooking or complete items.</p>
        </div>
      </div>

      <div className="kitchen-queue-container">
        {/* PENDING COLUMN */}
        <div className="queue-column">
          <div className="queue-column-header">
            <h3>New Orders</h3>
            <span className="queue-count">{pendingOrders.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
            {pendingOrders.map((order) => {
              const elapsedInfo = getElapsedTimeInfo(order.created_at, order.created_at);
              return (
                <div
                  key={order.id}
                  className="order-card"
                  style={{
                    borderColor: elapsedInfo.isLate ? 'var(--danger)' : 'var(--border-color)',
                    boxShadow: elapsedInfo.isLate ? '0 0 10px rgba(239, 68, 68, 0.25)' : 'none',
                    backgroundColor: elapsedInfo.isLate ? 'rgba(239, 68, 68, 0.08)' : 'var(--bg-tertiary)',
                  }}
                >
                  {elapsedInfo.isLate && (
                    <div style={{
                      color: 'white',
                      backgroundColor: 'var(--danger)',
                      padding: '4px 8px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      textAlign: 'center',
                      marginBottom: '4px'
                    }}>
                      ⚠️ EXCEEDED 10 MINS LIMIT
                    </div>
                  )}
                  <div className="order-card-header">
                    <span className="order-id">#{order.id.slice(0, 8)}</span>
                    <span className="order-time">{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 0', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Pending Time:</span>
                    <span style={{ color: elapsedInfo.isLate ? 'var(--danger)' : 'var(--success)', fontWeight: 'bold' }}>
                      {elapsedInfo.formatted}
                    </span>
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                    Customer: <strong>{order.user?.name || 'Guest'}</strong>
                  </div>
                  <ul className="order-items-list">
                    {order.order_items?.map((item: any) => (
                      <li key={item.id} className="order-item-detail">
                        <span><span className="order-item-qty">{item.quantity}x</span> {item.menu_item.name}</span>
                        {item.customizations && <div className="order-item-cust">↳ {item.customizations}</div>}
                      </li>
                    ))}
                  </ul>
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%', gap: '8px' }}
                    onClick={() => handleStatusTransition(order.id, 'PREPARING')}
                  >
                    <Play size={16} /> Start Cooking
                  </button>
                </div>
              );
            })}
            {pendingOrders.length === 0 && (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', margin: '20px 0' }}>No pending orders</p>
            )}
          </div>
        </div>

        {/* PREPARING COLUMN */}
        <div className="queue-column">
          <div className="queue-column-header">
            <h3>Preparing</h3>
            <span className="queue-count">{preparingOrders.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
            {preparingOrders.map((order) => {
              const elapsedInfo = getElapsedTimeInfo(order.prep_started_at || order.accepted_at, order.created_at);
              return (
                <div
                  key={order.id}
                  className="order-card"
                  style={{
                    borderColor: elapsedInfo.isLate ? 'var(--danger)' : 'var(--info)',
                    boxShadow: elapsedInfo.isLate ? '0 0 10px rgba(239, 68, 68, 0.25)' : 'none',
                    backgroundColor: elapsedInfo.isLate ? 'rgba(239, 68, 68, 0.08)' : 'var(--bg-tertiary)',
                  }}
                >
                  {elapsedInfo.isLate && (
                    <div style={{
                      color: 'white',
                      backgroundColor: 'var(--danger)',
                      padding: '4px 8px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      textAlign: 'center',
                      marginBottom: '4px'
                    }}>
                      ⚠️ EXCEEDED 10 MINS LIMIT
                    </div>
                  )}
                  <div className="order-card-header">
                    <span className="order-id">#{order.id.slice(0, 8)}</span>
                    <span className="order-time">{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 0', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Preparing Time:</span>
                    <span style={{ color: elapsedInfo.isLate ? 'var(--danger)' : 'var(--success)', fontWeight: 'bold' }}>
                      {elapsedInfo.formatted}
                    </span>
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                    Customer: <strong>{order.user?.name || 'Guest'}</strong>
                  </div>
                  <ul className="order-items-list">
                    {order.order_items?.map((item: any) => (
                      <li key={item.id} className="order-item-detail">
                        <span><span className="order-item-qty">{item.quantity}x</span> {item.menu_item.name}</span>
                        {item.customizations && <div className="order-item-cust">↳ {item.customizations}</div>}
                      </li>
                    ))}
                  </ul>
                  <button
                    className="btn btn-success"
                    style={{ width: '100%', gap: '8px' }}
                    onClick={() => handleStatusTransition(order.id, 'READY')}
                  >
                    <CheckCircle size={16} /> Mark Ready
                  </button>
                </div>
              );
            })}
            {preparingOrders.length === 0 && (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', margin: '20px 0' }}>No orders preparing</p>
            )}
          </div>
        </div>

        {/* READY COLUMN */}
        <div className="queue-column">
          <div className="queue-column-header">
            <h3>Ready for Pickup / Delivery</h3>
            <span className="queue-count">{readyOrders.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
            {readyOrders.map((order) => {
              const elapsedInfo = getElapsedTimeInfo(order.ready_at, order.created_at);
              return (
                <div
                  key={order.id}
                  className="order-card"
                  style={{
                    borderColor: elapsedInfo.isLate ? 'var(--danger)' : 'var(--success)',
                    boxShadow: elapsedInfo.isLate ? '0 0 10px rgba(239, 68, 68, 0.25)' : 'none',
                    backgroundColor: elapsedInfo.isLate ? 'rgba(239, 68, 68, 0.08)' : 'var(--bg-tertiary)',
                  }}
                >
                  {elapsedInfo.isLate && (
                    <div style={{
                      color: 'white',
                      backgroundColor: 'var(--danger)',
                      padding: '4px 8px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      textAlign: 'center',
                      marginBottom: '4px'
                    }}>
                      ⚠️ EXCEEDED 10 MINS LIMIT
                    </div>
                  )}
                  <div className="order-card-header">
                    <span className="order-id">#{order.id.slice(0, 8)}</span>
                    <span className="order-time">{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 0', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Ready Time:</span>
                    <span style={{ color: elapsedInfo.isLate ? 'var(--danger)' : 'var(--success)', fontWeight: 'bold' }}>
                      {elapsedInfo.formatted}
                    </span>
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                    Customer: <strong>{order.user?.name || 'Guest'}</strong>
                  </div>
                  <ul className="order-items-list">
                    {order.order_items?.map((item: any) => (
                      <li key={item.id} className="order-item-detail">
                        <span><span className="order-item-qty">{item.quantity}x</span> {item.menu_item.name}</span>
                        {item.customizations && <div className="order-item-cust">↳ {item.customizations}</div>}
                      </li>
                    ))}
                  </ul>
                  <div style={{ textAlign: 'center', color: 'var(--success)', fontWeight: 'bold', fontSize: '13px', padding: '8px 0' }}>
                    Awaiting Delivery Rider / Pickup
                  </div>
                </div>
              );
            })}
            {readyOrders.length === 0 && (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', margin: '20px 0' }}>No ready orders</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
