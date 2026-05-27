import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { Bike, Navigation, MapPin } from 'lucide-react';

export const DeliveryPortal: React.FC = () => {
  const { showToast } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDeliveryOrders = async () => {
    try {
      const allOrders = await api.getOrders();
      // Delivery riders can see orders that are READY (to be delivered) or DELIVERED (their history)
      const filtered = allOrders.filter(
        (o: any) => o.status === 'READY' || o.status === 'DELIVERED'
      );
      setOrders(filtered);
    } catch (err: any) {
      console.error('Error fetching delivery orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveryOrders();
    const interval = setInterval(fetchDeliveryOrders, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const handleMarkDelivered = async (orderId: string) => {
    try {
      await api.updateOrderStatus(orderId, 'DELIVERED');
      showToast('Order successfully marked as DELIVERED!', 'success');
      fetchDeliveryOrders();
    } catch (err: any) {
      showToast(err.message || 'Failed to update order status', 'error');
    }
  };

  const readyToDeliver = orders.filter((o) => o.status === 'READY');
  const pastDeliveries = orders.filter((o) => o.status === 'DELIVERED');

  if (loading) {
    return <div className="spinner"></div>;
  }

  return (
    <div style={{ width: '100%' }}>
      <div className="card" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Bike size={32} style={{ color: 'var(--primary)' }} />
        <div>
          <h2>Delivery Dispatch Portal</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Assign and complete deliveries for active customer orders.</p>
        </div>
      </div>

      <div className="grid-cols-2" style={{ alignItems: 'flex-start' }}>
        {/* Active Deliveries */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3>Ready for Delivery ({readyToDeliver.length})</h3>
          {readyToDeliver.map((order) => (
            <div key={order.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderLeft: '4px solid var(--warning)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 'bold', fontFamily: 'var(--font-display)', fontSize: '16px' }}>Order #{order.id.slice(0, 8)}</span>
                <span className="badge badge-ready">{order.status}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                  <MapPin size={16} style={{ color: 'var(--primary-hover)' }} />
                  <span>Customer: <strong>{order.user?.name || 'Guest'}</strong> ({order.user?.email || 'N/A'})</span>
                </div>
                <div style={{ padding: '10px', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                  <strong>Items:</strong>
                  <ul style={{ margin: '6px 0 0 0', paddingLeft: '20px' }}>
                    {order.order_items?.map((item: any) => (
                      <li key={item.id}>
                        {item.quantity}x {item.menu_item.name} {item.customizations && <span style={{ color: 'var(--warning)', fontSize: '12px' }}>({item.customizations})</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <button
                className="btn btn-success"
                style={{ gap: '8px' }}
                onClick={() => handleMarkDelivered(order.id)}
              >
                <Navigation size={16} /> Mark as Delivered
              </button>
            </div>
          ))}
          {readyToDeliver.length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <Bike size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
              <p>No orders ready for delivery right now.</p>
            </div>
          )}
        </div>

        {/* History of Completed Deliveries */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3>My Completed Deliveries ({pastDeliveries.length})</h3>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Total Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {pastDeliveries.map((order) => (
                  <tr key={order.id}>
                    <td>#{order.id.slice(0, 8)}</td>
                    <td>{order.user?.name || 'Guest'}</td>
                    <td>₹{order.total_amount.toFixed(2)}</td>
                    <td>
                      <span className="badge badge-delivered">{order.status}</span>
                    </td>
                  </tr>
                ))}
                {pastDeliveries.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
                      No completed deliveries found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
