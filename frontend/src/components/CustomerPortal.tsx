import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { ShoppingCart, MessageSquare, Star, Clock } from 'lucide-react';

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string;
  is_available: boolean;
}

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  customizations: string;
}

export const CustomerPortal: React.FC = () => {
  const { showToast, user } = useAuth();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Customization Modal states
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [customizations, setCustomizations] = useState('');
  
  // Cart/Checkout View state
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [tipAmount, setTipAmount] = useState(0);

  // Orders tracker
  const [orders, setOrders] = useState<any[]>([]);

  // Feedback Modal states
  const [feedbackOrder, setFeedbackOrder] = useState<any | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  // Fetch Menu and Orders
  const fetchData = async () => {
    try {
      const menu = await api.getMenuItems();
      setMenuItems(menu);
      
      const cats = ['All', ...Array.from(new Set(menu.map((item: MenuItem) => item.category))) as string[]];
      setCategories(cats);

      const customerOrders = await api.getOrders();
      setOrders(customerOrders);
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 8000); // Poll orders/menu updates
    return () => clearInterval(interval);
  }, []);

  const openCustomizer = (item: MenuItem) => {
    setCustomizingItem(item);
    setQuantity(1);
    setCustomizations('');
  };

  const addToCart = () => {
    if (!customizingItem) return;
    const existingIndex = cart.findIndex(
      (c) => c.menuItem.id === customizingItem.id && c.customizations === customizations
    );

    if (existingIndex > -1) {
      const updated = [...cart];
      updated[existingIndex].quantity += quantity;
      setCart(updated);
    } else {
      setCart([...cart, { menuItem: customizingItem, quantity, customizations }]);
    }

    showToast(`Added ${quantity}x ${customizingItem.name} to cart`, 'success');
    setCustomizingItem(null);
  };

  const removeFromCart = (index: number) => {
    const updated = [...cart];
    updated.splice(index, 1);
    setCart(updated);
  };

  const getCartTotal = () => {
    return cart.reduce((acc, item) => acc + item.menuItem.price * item.quantity, 0);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    try {
      const orderItems = cart.map((item) => ({
        menu_item_id: item.menuItem.id,
        quantity: item.quantity,
        customizations: item.customizations || undefined,
      }));

      // Create Order on Backend
      const order = await api.createOrder(orderItems);

      // Record Payment on Backend (Simulated client success)
      await api.recordPayment(order.id, {
        amount: order.total_amount,
        payment_method: paymentMethod,
        tip_amount: Number(tipAmount),
        status: 'COMPLETED',
      });

      showToast('Order placed & paid successfully!', 'success');
      setCart([]);
      setIsCartOpen(false);
      setTipAmount(0);
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Checkout failed due to insufficient ingredient stock', 'error');
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackOrder) return;
    try {
      await api.submitFeedback({
        orderId: feedbackOrder.id,
        rating,
        comment,
      });
      showToast('Thank you for your feedback!', 'success');
      setFeedbackOrder(null);
      setRating(5);
      setComment('');
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Failed to submit feedback', 'error');
    }
  };

  const filteredMenuItems = menuItems.filter(
    (item) => (activeCategory === 'All' || item.category === activeCategory) && item.is_available
  );

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Upper Welcome Header */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h2>Welcome, {user?.name}!</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Browse the stellar menu and order fresh delights</p>
      </div>

      {/* Menu Sections & Items */}
      <div className="action-header">
        <h3>Stellar Menu</h3>
        <div className="chips-container" style={{ margin: 0, paddingBottom: 0 }}>
          {categories.map((cat) => (
            <button
              key={cat}
              className={`chip ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid-cols-3" style={{ marginBottom: '40px' }}>
        {filteredMenuItems.map((item) => (
          <div key={item.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
            {item.image_url ? (
              <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: 'var(--radius-md)' }} />
            ) : (
              <div style={{ width: '100%', height: '150px', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No Image</div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <h4 style={{ margin: 0 }}>{item.name}</h4>
              <span style={{ fontWeight: 'bold', color: 'var(--primary-hover)', fontSize: '18px' }}>₹{item.price.toFixed(2)}</span>
            </div>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', flexGrow: 1, margin: 0 }}>{item.description || 'No description available'}</p>
            <button className="btn btn-primary" onClick={() => openCustomizer(item)}>Add to Order</button>
          </div>
        ))}
      </div>

      {/* Cart Float Button */}
      {cart.length > 0 && (
        <div className="cart-floating" onClick={() => setIsCartOpen(true)}>
          <ShoppingCart size={20} />
          <span>View Cart ({cart.reduce((s, c) => s + c.quantity, 0)})</span>
          <span>₹{getCartTotal().toFixed(2)}</span>
        </div>
      )}

      {/* Active & Historical Orders */}
      <div>
        <h3>My Orders & Tracking</h3>
        {orders.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            <Clock size={40} style={{ marginBottom: '12px' }} />
            <p>You haven't placed any orders yet.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {orders.map((order) => {
              const hasFeedback = order.feedbacks && order.feedbacks.length > 0;
              return (
                <div key={order.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <span style={{ fontWeight: 'bold', fontFamily: 'var(--font-display)' }}>Order ID: {order.id.slice(0, 8)}...</span>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{new Date(order.created_at).toLocaleString()}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <span className={`badge badge-${order.status.toLowerCase()}`}>{order.status}</span>
                      <span style={{ fontWeight: 'bold', fontSize: '18px' }}>₹{order.total_amount.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Order items list */}
                  <div style={{ padding: '12px', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', fontSize: '14px' }}>
                    {order.order_items?.map((item: any) => (
                      <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span>{item.quantity}x {item.menu_item.name} {item.customizations && <span style={{ color: 'var(--warning)', fontSize: '12px' }}>({item.customizations})</span>}</span>
                        <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Progress tracker bar */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      <span>Received</span>
                      <span>Preparing</span>
                      <span>Ready</span>
                      <span>Delivered</span>
                    </div>
                    <div style={{ height: '6px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '10px', overflow: 'hidden', display: 'flex' }}>
                      <div style={{
                        height: '100%',
                        backgroundColor: order.status === 'CANCELLED' ? 'var(--danger)' : 'var(--success)',
                        width: order.status === 'PENDING' ? '25%' :
                               order.status === 'PREPARING' ? '50%' :
                               order.status === 'READY' ? '75%' :
                               order.status === 'DELIVERED' ? '100%' : '0%',
                        transition: 'width 0.5s ease-in-out'
                      }} />
                    </div>
                  </div>

                  {/* Order Actions - Feedback */}
                  {order.status === 'DELIVERED' && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      {hasFeedback ? (
                        <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
                          <Star size={16} fill="var(--success)" /> Feedback Submitted
                        </span>
                      ) : (
                        <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '13px' }} onClick={() => setFeedbackOrder(order)}>
                          <MessageSquare size={16} /> Leave Feedback
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Customizer Modal */}
      {customizingItem && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Customize {customizingItem.name}</h3>
              <button className="btn-secondary" style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }} onClick={() => setCustomizingItem(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Quantity</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <button className="btn btn-secondary" type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))}>-</button>
                  <span style={{ fontSize: '20px', fontWeight: 'bold' }}>{quantity}</span>
                  <button className="btn btn-secondary" type="button" onClick={() => setQuantity(quantity + 1)}>+</button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="customizations-input">Special Instructions / Customizations</label>
                <textarea
                  id="customizations-input"
                  className="input-control"
                  placeholder="e.g., No onions, extra spicy, etc."
                  value={customizations}
                  onChange={(e) => setCustomizations(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setCustomizingItem(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={addToCart}>Add to Cart</button>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {isCartOpen && (
        <div className="modal-overlay">
          <div className="modal" style={{ width: '600px' }}>
            <div className="modal-header">
              <h3>Your Stellar Cart</h3>
              <button className="btn-secondary" style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }} onClick={() => setIsCartOpen(false)}>&times;</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {cart.map((item, index) => (
                  <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                    <div>
                      <div style={{ fontWeight: 'bold' }}>{item.menuItem.name}</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        Qty: {item.quantity} {item.customizations ? `| ${item.customizations}` : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <span style={{ fontWeight: 'bold' }}>₹{(item.menuItem.price * item.quantity).toFixed(2)}</span>
                      <button className="btn btn-danger" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => removeFromCart(index)}>Remove</button>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '18px', marginBottom: '16px' }}>
                  <span>Subtotal</span>
                  <span>₹{getCartTotal().toFixed(2)}</span>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="payment-method-select">Payment Method</label>
                  <select
                    id="payment-method-select"
                    className="input-control"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <option value="UPI">UPI / Digital Wallet</option>
                    <option value="CARD">Credit / Debit Card</option>
                    <option value="WALLET">Wallet Balance</option>
                    <option value="PAYPAL">PayPal</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="tip-amount-input">Add Tip (₹)</label>
                  <input
                    id="tip-amount-input"
                    type="number"
                    min="0"
                    step="5"
                    className="input-control"
                    value={tipAmount || ''}
                    onChange={(e) => setTipAmount(parseFloat(e.target.value) || 0)}
                    placeholder="E.g. ₹50"
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setIsCartOpen(false)}>Continue Shopping</button>
              <button className="btn btn-primary" onClick={handleCheckout}>Pay & Place Order (₹{(getCartTotal() + Number(tipAmount)).toFixed(2)})</button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {feedbackOrder && (
        <div className="modal-overlay">
          <form onSubmit={handleFeedbackSubmit} className="modal">
            <div className="modal-header">
              <h3>Submit Feedback</h3>
              <button className="btn-secondary" type="button" style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }} onClick={() => setFeedbackOrder(null)}>&times;</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="form-group">
                <label className="form-label">Rating</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      onClick={() => setRating(star)}
                    >
                      <Star size={32} fill={rating >= star ? 'var(--warning)' : 'none'} stroke="var(--warning)" />
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="comment-input">Comments</label>
                <textarea
                  id="comment-input"
                  className="input-control"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Tell us about your experience..."
                  rows={4}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" type="button" onClick={() => setFeedbackOrder(null)}>Cancel</button>
              <button className="btn btn-primary" type="submit">Submit Rating</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
