import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import {
  TrendingUp,
  Package,
  BookOpen,
  Users,
  AlertTriangle,
  Plus,
  Trash2,
  Edit2,
  Clock,
  Star,
  ChefHat
} from 'lucide-react';

export const ManagerDashboard: React.FC = () => {
  const { showToast, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'sales' | 'menu' | 'inventory' | 'recipes' | 'staff'>('sales');

  // Sales and reports state
  const [salesReport, setSalesReport] = useState<any>(null);
  const [inventoryReport, setInventoryReport] = useState<any>(null);
  const [performanceReport, setPerformanceReport] = useState<any[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);

  // Menu items state
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [editingMenuItem, setEditingMenuItem] = useState<any | null>(null);
  const [menuForm, setMenuForm] = useState({
    name: '',
    description: '',
    price: 0,
    category: '',
    image_url: '',
    is_available: true
  });

  // Inventory state
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [editingIngredient, setEditingIngredient] = useState<any | null>(null);
  const [ingForm, setIngForm] = useState({
    name: '',
    current_stock: 0,
    unit: '',
    min_stock_alert: 0,
    vendor_id: ''
  });
  const [adjustForm, setAdjustForm] = useState({
    ingredient_id: '',
    quantity: 0,
    type: 'RESTOCK',
    reason: ''
  });

  // Vendors state
  const [vendors, setVendors] = useState<any[]>([]);
  const [vendorForm, setVendorForm] = useState({
    name: '',
    contact_info: ''
  });

  // Recipe state
  const [selectedRecipeMenuItem, setSelectedRecipeMenuItem] = useState<string>('');
  const [recipeIngredients, setRecipeIngredients] = useState<any[]>([]); // Current recipe links
  const [newRecipeRow, setNewRecipeRow] = useState({
    ingredient_id: '',
    quantity: 0
  });

  // Staff and scheduling state
  const [employees, setEmployees] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [timesheets, setTimesheets] = useState<any[]>([]);
  const [shiftForm, setShiftForm] = useState({
    user_id: '',
    start_time: '',
    end_time: ''
  });

  // For manager clock in/out simulation
  const [activeTimesheet, setActiveTimesheet] = useState<any>(null);

  const fetchReportsAndData = async () => {
    try {
      if (activeTab === 'sales') {
        const sales = await api.getSalesReport();
        setSalesReport(sales);
        const fb = await api.getAllFeedback();
        setFeedbacks(fb);
      } else if (activeTab === 'menu') {
        const items = await api.getMenuItems();
        setMenuItems(items);
      } else if (activeTab === 'inventory') {
        const ings = await api.getIngredients();
        setIngredients(ings);
        const vens = await api.getVendors();
        setVendors(vens);
        const reports = await api.getInventoryReport();
        setInventoryReport(reports);
      } else if (activeTab === 'recipes') {
        const items = await api.getMenuItems();
        setMenuItems(items);
        const ings = await api.getIngredients();
        setIngredients(ings);
      } else if (activeTab === 'staff') {
        const list = await api.getEmployeesList();
        setEmployees(list);
        const s = await api.getShifts();
        setShifts(s);
        const t = await api.getTimesheets();
        setTimesheets(t);
        const perf = await api.getEmployeePerformanceReport();
        setPerformanceReport(perf);

        // check if currently clocked in
        const userT = t.find((ts: any) => ts.user_id === user?.id && ts.clock_out === null);
        setActiveTimesheet(userT || null);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchReportsAndData();
  }, [activeTab]);

  // Menu Form Handlers
  const handleMenuSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingMenuItem) {
        await api.updateMenuItem(editingMenuItem.id, {
          ...menuForm,
          price: Number(menuForm.price)
        });
        showToast('Menu item updated', 'success');
      } else {
        await api.createMenuItem({
          ...menuForm,
          price: Number(menuForm.price)
        });
        showToast('Menu item created', 'success');
      }
      setEditingMenuItem(null);
      setMenuForm({ name: '', description: '', price: 0, category: '', image_url: '', is_available: true });
      fetchReportsAndData();
    } catch (err: any) {
      showToast(err.message || 'Action failed', 'error');
    }
  };

  const handleEditMenuItem = (item: any) => {
    setEditingMenuItem(item);
    setMenuForm({
      name: item.name,
      description: item.description || '',
      price: item.price,
      category: item.category,
      image_url: item.image_url || '',
      is_available: item.is_available
    });
  };

  const handleDeleteMenuItem = async (id: string) => {
    if (!confirm('Are you sure you want to delete this menu item?')) return;
    try {
      await api.deleteMenuItem(id);
      showToast('Menu item deleted', 'success');
      fetchReportsAndData();
    } catch (err: any) {
      showToast(err.message || 'Action failed', 'error');
    }
  };

  // Inventory Form Handlers
  const handleIngredientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: ingForm.name,
        current_stock: Number(ingForm.current_stock),
        unit: ingForm.unit,
        min_stock_alert: Number(ingForm.min_stock_alert),
        vendor_id: ingForm.vendor_id || undefined
      };

      if (editingIngredient) {
        await api.updateIngredient(editingIngredient.id, payload);
        showToast('Ingredient updated', 'success');
      } else {
        await api.createIngredient(payload);
        showToast('Ingredient created', 'success');
      }
      setEditingIngredient(null);
      setIngForm({ name: '', current_stock: 0, unit: '', min_stock_alert: 0, vendor_id: '' });
      fetchReportsAndData();
    } catch (err: any) {
      showToast(err.message || 'Action failed', 'error');
    }
  };

  const handleEditIngredient = (ing: any) => {
    setEditingIngredient(ing);
    setIngForm({
      name: ing.name,
      current_stock: ing.current_stock,
      unit: ing.unit,
      min_stock_alert: ing.min_stock_alert,
      vendor_id: ing.vendor_id || ''
    });
  };

  const handleDeleteIngredient = async (id: string) => {
    if (!confirm('Are you sure you want to delete this ingredient?')) return;
    try {
      await api.deleteIngredient(id);
      showToast('Ingredient deleted', 'success');
      fetchReportsAndData();
    } catch (err: any) {
      showToast(err.message || 'Action failed', 'error');
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.adjustStock({
        ingredientId: adjustForm.ingredient_id,
        quantity: Number(adjustForm.quantity),
        type: adjustForm.type,
        reason: adjustForm.reason
      });
      showToast('Stock adjusted successfully', 'success');
      setAdjustForm({ ingredient_id: '', quantity: 0, type: 'RESTOCK', reason: '' });
      fetchReportsAndData();
    } catch (err: any) {
      showToast(err.message || 'Stock adjustment failed', 'error');
    }
  };

  // Vendor Handlers
  const handleVendorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createVendor(vendorForm);
      showToast('Vendor added', 'success');
      setVendorForm({ name: '', contact_info: '' });
      fetchReportsAndData();
    } catch (err: any) {
      showToast(err.message || 'Action failed', 'error');
    }
  };

  // Recipe Handlers
  useEffect(() => {
    const loadRecipesForMenuItem = async () => {
      if (!selectedRecipeMenuItem) {
        setRecipeIngredients([]);
        return;
      }
      try {
        const recipe = await api.getRecipe(selectedRecipeMenuItem);
        setRecipeIngredients(recipe.recipe_ingredients || []);
      } catch (err) {
        console.error(err);
      }
    };
    loadRecipesForMenuItem();
  }, [selectedRecipeMenuItem]);

  const handleAddRecipeIngredient = () => {
    if (!newRecipeRow.ingredient_id || newRecipeRow.quantity <= 0) return;
    
    // Check if ingredient already in list
    const exists = recipeIngredients.some((ri) => ri.ingredient_id === newRecipeRow.ingredient_id);
    if (exists) {
      showToast('Ingredient already exists in this recipe', 'error');
      return;
    }

    const ing = ingredients.find((i) => i.id === newRecipeRow.ingredient_id);
    const updated = [
      ...recipeIngredients,
      {
        ingredient_id: newRecipeRow.ingredient_id,
        quantity: Number(newRecipeRow.quantity),
        ingredient: { name: ing?.name, unit: ing?.unit }
      }
    ];
    setRecipeIngredients(updated);
    setNewRecipeRow({ ingredient_id: '', quantity: 0 });
  };

  const handleRemoveRecipeIngredient = (index: number) => {
    const updated = [...recipeIngredients];
    updated.splice(index, 1);
    setRecipeIngredients(updated);
  };

  const handleSaveRecipe = async () => {
    if (!selectedRecipeMenuItem) return;
    try {
      const payload = {
        menuItemId: selectedRecipeMenuItem,
        ingredients: recipeIngredients.map((ri) => ({
          ingredientId: ri.ingredient_id,
          quantity: ri.quantity
        }))
      };
      await api.saveRecipe(payload);
      showToast('Recipe recipe links saved successfully', 'success');
      fetchReportsAndData();
    } catch (err: any) {
      showToast(err.message || 'Failed to save recipe', 'error');
    }
  };

  // Shift & Staff Scheduling Handlers
  const handleShiftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createShift({
        user_id: shiftForm.user_id,
        start_time: shiftForm.start_time,
        end_time: shiftForm.end_time
      });
      showToast('Shift assigned successfully', 'success');
      setShiftForm({ user_id: '', start_time: '', end_time: '' });
      fetchReportsAndData();
    } catch (err: any) {
      showToast(err.message || 'Failed to create shift', 'error');
    }
  };

  const handleShiftStatusChange = async (shiftId: string, status: string) => {
    try {
      await api.updateShift(shiftId, { status });
      showToast(`Shift status updated to ${status}`, 'success');
      fetchReportsAndData();
    } catch (err: any) {
      showToast(err.message || 'Action failed', 'error');
    }
  };

  const handleClockIn = async () => {
    try {
      await api.clockIn();
      showToast('Clocked in successfully', 'success');
      fetchReportsAndData();
    } catch (err: any) {
      showToast(err.message || 'Clock-in failed', 'error');
    }
  };

  const handleClockOut = async () => {
    try {
      await api.clockOut();
      showToast('Clocked out successfully', 'success');
      fetchReportsAndData();
    } catch (err: any) {
      showToast(err.message || 'Clock-out failed', 'error');
    }
  };

  return (
    <div style={{ width: '100%' }}>
      {/* Title Header */}
      <div className="card" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2>Operations Dashboard</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Manage restaurant inventory, scheduling, menus, and view reports.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {activeTimesheet ? (
            <button className="btn btn-danger" onClick={handleClockOut} style={{ gap: '8px' }}>
              <Clock size={16} /> Clock Out (Active: {activeTimesheet.clock_in ? new Date(activeTimesheet.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''})
            </button>
          ) : (
            <button className="btn btn-success" onClick={handleClockIn} style={{ gap: '8px' }}>
              <Clock size={16} /> Shift Clock In
            </button>
          )}
        </div>
      </div>

      {/* Tabs list */}
      <div className="chips-container" style={{ marginBottom: '24px' }}>
        <button className={`chip ${activeTab === 'sales' ? 'active' : ''}`} onClick={() => setActiveTab('sales')}>
          <TrendingUp size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Reports & Feedback
        </button>
        <button className={`chip ${activeTab === 'menu' ? 'active' : ''}`} onClick={() => setActiveTab('menu')}>
          <BookOpen size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Menu Setup
        </button>
        <button className={`chip ${activeTab === 'inventory' ? 'active' : ''}`} onClick={() => setActiveTab('inventory')}>
          <Package size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Inventory & Vendors
        </button>
        <button className={`chip ${activeTab === 'recipes' ? 'active' : ''}`} onClick={() => setActiveTab('recipes')}>
          <ChefHat size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Recipe Planner
        </button>
        <button className={`chip ${activeTab === 'staff' ? 'active' : ''}`} onClick={() => setActiveTab('staff')}>
          <Users size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Staff Schedules
        </button>
      </div>

      {/* TAB CONTENTS */}

      {/* 1. REPORTS & FEEDBACK */}
      {activeTab === 'sales' && salesReport && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* Upper quick stats grid */}
          <div className="grid-cols-3">
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px' }}>Total Revenue</div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--success)' }}>₹{salesReport.totalRevenue?.toFixed(2)}</div>
            </div>
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px' }}>Orders Fulfilled</div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--primary-hover)' }}>{salesReport.orderCount} Orders</div>
            </div>
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px' }}>Average Ticket</div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--warning)' }}>
                ₹{salesReport.orderCount > 0 ? (salesReport.totalRevenue / salesReport.orderCount).toFixed(2) : '0.00'}
              </div>
            </div>
          </div>

          <div className="grid-cols-2">
            {/* Popular Items list */}
            <div className="card">
              <h3>Top Popular Selling Items</h3>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Item Name</th>
                      <th>Quantity Sold</th>
                      <th>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesReport.popularItems?.map((item: any) => (
                      <tr key={item.id}>
                        <td>{item.name}</td>
                        <td>{item.quantity} units</td>
                        <td>₹{item.revenue.toFixed(2)}</td>
                      </tr>
                    ))}
                    {(!salesReport.popularItems || salesReport.popularItems.length === 0) && (
                      <tr>
                        <td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No completed sales recorded</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sales by category list */}
            <div className="card">
              <h3>Sales Breakdown by Category</h3>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Total Sales</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesReport.categorySales?.map((item: any) => (
                      <tr key={item.category}>
                        <td>{item.category}</td>
                        <td>₹{item.sales.toFixed(2)}</td>
                      </tr>
                    ))}
                    {(!salesReport.categorySales || salesReport.categorySales.length === 0) && (
                      <tr>
                        <td colSpan={2} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No completed sales recorded</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* CRM Feedback logs */}
          <div className="card">
            <h3>Customer Reviews & Ratings Feedback</h3>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Order Ref</th>
                    <th>Rating</th>
                    <th>Comment</th>
                  </tr>
                </thead>
                <tbody>
                  {feedbacks.map((fb) => (
                    <tr key={fb.id}>
                      <td>{new Date(fb.created_at).toLocaleDateString()}</td>
                      <td>#{fb.order_id.slice(0, 8)}...</td>
                      <td>
                        <div style={{ display: 'flex', gap: '2px' }}>
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star key={s} size={14} fill={fb.rating >= s ? 'var(--warning)' : 'none'} stroke="var(--warning)" />
                          ))}
                        </div>
                      </td>
                      <td>{fb.comment || <span style={{ color: 'var(--text-muted)' }}>No comment</span>}</td>
                    </tr>
                  ))}
                  {feedbacks.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
                        No reviews or ratings received.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. MENU SETUP */}
      {activeTab === 'menu' && (
        <div className="grid-cols-3" style={{ alignItems: 'flex-start' }}>
          {/* List of current menu items */}
          <div className="card" style={{ gridColumn: 'span 2' }}>
            <h3>Menu Items Setup</h3>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Availability</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {menuItems.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.name}</strong>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{item.description || 'No desc'}</div>
                      </td>
                      <td>{item.category}</td>
                      <td>₹{item.price.toFixed(2)}</td>
                      <td>
                        <span className={`badge ${item.is_available ? 'badge-delivered' : 'badge-cancelled'}`}>
                          {item.is_available ? 'Available' : 'Out of Stock'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn btn-secondary" style={{ padding: '6px 10px' }} onClick={() => handleEditMenuItem(item)}>
                            <Edit2 size={14} />
                          </button>
                          <button className="btn btn-danger" style={{ padding: '6px 10px' }} onClick={() => handleDeleteMenuItem(item.id)}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Edit/Add Menu Item Form */}
          <div className="card">
            <h3>{editingMenuItem ? 'Edit Menu Item' : 'Add Menu Item'}</h3>
            <form onSubmit={handleMenuSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="menu-name-input">Item Name</label>
                <input
                  id="menu-name-input"
                  type="text"
                  className="input-control"
                  value={menuForm.name}
                  onChange={(e) => setMenuForm({ ...menuForm, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="menu-desc-input">Description</label>
                <textarea
                  id="menu-desc-input"
                  className="input-control"
                  value={menuForm.description}
                  onChange={(e) => setMenuForm({ ...menuForm, description: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="menu-price-input">Price (₹)</label>
                <input
                  id="menu-price-input"
                  type="number"
                  step="0.01"
                  className="input-control"
                  value={menuForm.price || ''}
                  onChange={(e) => setMenuForm({ ...menuForm, price: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="menu-cat-input">Category</label>
                <input
                  id="menu-cat-input"
                  type="text"
                  className="input-control"
                  value={menuForm.category}
                  onChange={(e) => setMenuForm({ ...menuForm, category: e.target.value })}
                  placeholder="e.g. Burgers, Pizzas, Desserts"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="menu-img-input">Image URL</label>
                <input
                  id="menu-img-input"
                  type="text"
                  className="input-control"
                  value={menuForm.image_url}
                  onChange={(e) => setMenuForm({ ...menuForm, image_url: e.target.value })}
                  placeholder="Leave blank for placeholder"
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  id="menu-avail-checkbox"
                  type="checkbox"
                  checked={menuForm.is_available}
                  onChange={(e) => setMenuForm({ ...menuForm, is_available: e.target.checked })}
                />
                <label htmlFor="menu-avail-checkbox">Is Item Available?</label>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" className="btn btn-primary" style={{ flexGrow: 1 }}>
                  {editingMenuItem ? 'Update Item' : 'Add Item'}
                </button>
                {editingMenuItem && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setEditingMenuItem(null);
                      setMenuForm({ name: '', description: '', price: 0, category: '', image_url: '', is_available: true });
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. INVENTORY & VENDORS */}
      {activeTab === 'inventory' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* Warning banner for low stocks */}
          {inventoryReport && inventoryReport.lowStockCount > 0 && (
            <div className="card" style={{ borderLeft: '4px solid var(--danger)', backgroundColor: 'var(--danger-bg)', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <AlertTriangle size={24} style={{ color: 'var(--danger)' }} />
              <div>
                <strong style={{ color: 'var(--danger)' }}>Low Stock Warning!</strong>
                <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: 'var(--text-secondary)' }}>
                  The following ingredients are below their minimum threshold alert: {inventoryReport.lowStockItems.map((i: any) => `${i.name} (${i.current_stock}${i.unit})`).join(', ')}.
                </p>
              </div>
            </div>
          )}

          {/* Upper row: ingredients + add/edit ingredients form */}
          <div className="grid-cols-3" style={{ alignItems: 'flex-start' }}>
            <div className="card" style={{ gridColumn: 'span 2' }}>
              <h3>Ingredient Stock Levels</h3>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Ingredient</th>
                      <th>Current Stock</th>
                      <th>Min Alert Level</th>
                      <th>Primary Vendor</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ingredients.map((ing) => {
                      const isLow = ing.current_stock <= ing.min_stock_alert;
                      return (
                        <tr key={ing.id} style={isLow ? { backgroundColor: 'rgba(239, 68, 68, 0.03)' } : {}}>
                          <td><strong>{ing.name}</strong></td>
                          <td style={isLow ? { color: 'var(--danger)', fontWeight: 'bold' } : {}}>{ing.current_stock} {ing.unit}</td>
                          <td>{ing.min_stock_alert} {ing.unit}</td>
                          <td>{ing.vendor?.name || <span style={{ color: 'var(--text-muted)' }}>None</span>}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button className="btn btn-secondary" style={{ padding: '6px 10px' }} onClick={() => handleEditIngredient(ing)}>
                                <Edit2 size={14} />
                              </button>
                              <button className="btn btn-danger" style={{ padding: '6px 10px' }} onClick={() => handleDeleteIngredient(ing.id)}>
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Ingredient Form */}
            <div className="card">
              <h3>{editingIngredient ? 'Edit Ingredient' : 'New Ingredient'}</h3>
              <form onSubmit={handleIngredientSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="ing-name-input">Ingredient Name</label>
                  <input
                    id="ing-name-input"
                    type="text"
                    className="input-control"
                    value={ingForm.name}
                    onChange={(e) => setIngForm({ ...ingForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="ing-stock-input">Current Stock Level</label>
                  <input
                    id="ing-stock-input"
                    type="number"
                    step="0.01"
                    className="input-control"
                    value={ingForm.current_stock || ''}
                    onChange={(e) => setIngForm({ ...ingForm, current_stock: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="ing-unit-input">Unit (e.g. kg, L, units)</label>
                  <input
                    id="ing-unit-input"
                    type="text"
                    className="input-control"
                    value={ingForm.unit}
                    onChange={(e) => setIngForm({ ...ingForm, unit: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="ing-min-input">Min Warning Threshold</label>
                  <input
                    id="ing-min-input"
                    type="number"
                    step="0.01"
                    className="input-control"
                    value={ingForm.min_stock_alert || ''}
                    onChange={(e) => setIngForm({ ...ingForm, min_stock_alert: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="ing-vendor-select">Vendor (Optional)</label>
                  <select
                    id="ing-vendor-select"
                    className="input-control"
                    value={ingForm.vendor_id}
                    onChange={(e) => setIngForm({ ...ingForm, vendor_id: e.target.value })}
                  >
                    <option value="">-- None --</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button type="submit" className="btn btn-primary" style={{ flexGrow: 1 }}>
                    {editingIngredient ? 'Update' : 'Create'}
                  </button>
                  {editingIngredient && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        setEditingIngredient(null);
                        setIngForm({ name: '', current_stock: 0, unit: '', min_stock_alert: 0, vendor_id: '' });
                      }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* Lower row: manual adjustments + vendors directory */}
          <div className="grid-cols-2">
            {/* Manual stock audit adjustments */}
            <div className="card">
              <h3>Manual Stock Audit & Restock</h3>
              <form onSubmit={handleAdjustStock} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="adjust-ing-select">Select Ingredient</label>
                  <select
                    id="adjust-ing-select"
                    className="input-control"
                    value={adjustForm.ingredient_id}
                    onChange={(e) => setAdjustForm({ ...adjustForm, ingredient_id: e.target.value })}
                    required
                  >
                    <option value="">-- Select --</option>
                    {ingredients.map((i) => (
                      <option key={i.id} value={i.id}>{i.name} ({i.current_stock} {i.unit})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="adjust-qty-input">Quantity (Positive for restock, negative for wastage)</label>
                  <input
                    id="adjust-qty-input"
                    type="number"
                    step="0.01"
                    className="input-control"
                    value={adjustForm.quantity || ''}
                    onChange={(e) => setAdjustForm({ ...adjustForm, quantity: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="adjust-type-select">Adjustment Type</label>
                  <select
                    id="adjust-type-select"
                    className="input-control"
                    value={adjustForm.type}
                    onChange={(e) => setAdjustForm({ ...adjustForm, type: e.target.value })}
                    required
                  >
                    <option value="RESTOCK">RESTOCK (Stock replenishment)</option>
                    <option value="DAMAGE">DAMAGE (Damaged goods)</option>
                    <option value="WASTE">WASTE (Ingredient wastage)</option>
                    <option value="AUDIT">AUDIT (Manual physical count audit)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="adjust-reason-input">Reason/Comments</label>
                  <input
                    id="adjust-reason-input"
                    type="text"
                    className="input-control"
                    value={adjustForm.reason}
                    onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                    placeholder="e.g. Weekly vendor order replenishment"
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ marginTop: '10px' }}>Apply Stock Adjustment</button>
              </form>
            </div>

            {/* Vendor List */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h3>Suppliers / Vendors</h3>
                <div className="table-container" style={{ maxHeight: '260px', overflowY: 'auto' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Vendor Name</th>
                        <th>Contact Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vendors.map((v) => (
                        <tr key={v.id}>
                          <td><strong>{v.name}</strong></td>
                          <td>{v.contact_info || <span style={{ color: 'var(--text-muted)' }}>None</span>}</td>
                        </tr>
                      ))}
                      {vendors.length === 0 && (
                        <tr>
                          <td colSpan={2} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No suppliers defined</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Add Supplier form */}
              <form onSubmit={handleVendorSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <h4>Add New Supplier</h4>
                <div className="form-group" style={{ marginBottom: '10px' }}>
                  <input
                    type="text"
                    className="input-control"
                    placeholder="Vendor Name"
                    value={vendorForm.name}
                    onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '10px' }}>
                  <input
                    type="text"
                    className="input-control"
                    placeholder="Contact Info (Email, Phone)"
                    value={vendorForm.contact_info}
                    onChange={(e) => setVendorForm({ ...vendorForm, contact_info: e.target.value })}
                  />
                </div>
                <button type="submit" className="btn btn-secondary">Add Supplier</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 4. RECIPE PLANNER */}
      {activeTab === 'recipes' && (
        <div className="grid-cols-3" style={{ alignItems: 'flex-start' }}>
          {/* Menu Selection Column */}
          <div className="card">
            <h3>1. Select Menu Item</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>Configure recipe deductions for when this item is ordered.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '450px', overflowY: 'auto' }}>
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`btn ${selectedRecipeMenuItem === item.id ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ justifyContent: 'flex-start', textAlign: 'left' }}
                  onClick={() => setSelectedRecipeMenuItem(item.id)}
                >
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{item.name}</div>
                    <div style={{ fontSize: '11px', opacity: 0.8 }}>Category: {item.category}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Recipe Editor Column */}
          <div className="card" style={{ gridColumn: 'span 2' }}>
            <h3>2. Ingredient Deductions List</h3>
            {selectedRecipeMenuItem ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Ingredient</th>
                        <th>Required Quantity per Serving</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recipeIngredients.map((row, index) => (
                        <tr key={row.ingredient_id || index}>
                          <td><strong>{row.ingredient.name}</strong></td>
                          <td>{row.quantity} {row.ingredient.unit}</td>
                          <td>
                            <button className="btn btn-danger" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => handleRemoveRecipeIngredient(index)}>
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                      {recipeIngredients.length === 0 && (
                        <tr>
                          <td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                            No recipe ingredients mapped. This menu item consumes no inventory.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Add Row form */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                  <div className="form-group" style={{ flexGrow: 1, margin: 0 }}>
                    <label className="form-label" htmlFor="recipe-ing-select">Add Ingredient</label>
                    <select
                      id="recipe-ing-select"
                      className="input-control"
                      value={newRecipeRow.ingredient_id}
                      onChange={(e) => setNewRecipeRow({ ...newRecipeRow, ingredient_id: e.target.value })}
                    >
                      <option value="">-- Choose Ingredient --</option>
                      {ingredients.map((ing) => (
                        <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ width: '150px', margin: 0 }}>
                    <label className="form-label" htmlFor="recipe-qty-input">Quantity</label>
                    <input
                      id="recipe-qty-input"
                      type="number"
                      step="0.001"
                      className="input-control"
                      value={newRecipeRow.quantity || ''}
                      onChange={(e) => setNewRecipeRow({ ...newRecipeRow, quantity: parseFloat(e.target.value) || 0 })}
                      placeholder="e.g. 0.15"
                    />
                  </div>
                  <button className="btn btn-secondary" style={{ height: '45px' }} onClick={handleAddRecipeIngredient}>
                    <Plus size={16} /> Add to Recipe
                  </button>
                </div>

                <button className="btn btn-primary" onClick={handleSaveRecipe} style={{ marginTop: '10px' }}>
                  Save Recipe Association
                </button>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                Please select a menu item from the left column to view or map its recipe ingredients.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. STAFF SCHEDULES & TIMESHEETS */}
      {activeTab === 'staff' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* Upper row: Schedule form + shift assignment list */}
          <div className="grid-cols-3" style={{ alignItems: 'flex-start' }}>
            {/* Shifts calendar list */}
            <div className="card" style={{ gridColumn: 'span 2' }}>
              <h3>Assigned Work Shifts</h3>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Role</th>
                      <th>Time Frame</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shifts.map((shift) => (
                      <tr key={shift.id}>
                        <td><strong>{shift.user.name}</strong></td>
                        <td><span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{shift.user.role}</span></td>
                        <td>
                          <div style={{ fontSize: '14px' }}>
                            {new Date(shift.start_time).toLocaleDateString()}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
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
                          {shift.status === 'SWAP_REQUESTED' && (
                            <button
                              className="btn btn-success animate-pulse"
                              style={{ padding: '6px 12px', fontSize: '12px' }}
                              onClick={() => handleShiftStatusChange(shift.id, 'ASSIGNED')}
                            >
                              Approve Swap
                            </button>
                          )}
                          {shift.status === 'ASSIGNED' && (
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '6px 12px', fontSize: '12px' }}
                              onClick={() => handleShiftStatusChange(shift.id, 'COMPLETED')}
                            >
                              Complete Shift
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {shifts.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No shifts scheduled</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Shift Assignment Form */}
            <div className="card">
              <h3>Schedule Shift</h3>
              <form onSubmit={handleShiftSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="shift-user-select">Select Employee</label>
                  <select
                    id="shift-user-select"
                    className="input-control"
                    value={shiftForm.user_id}
                    onChange={(e) => setShiftForm({ ...shiftForm, user_id: e.target.value })}
                    required
                  >
                    <option value="">-- Choose Employee --</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="shift-start-input">Shift Start Date & Time</label>
                  <input
                    id="shift-start-input"
                    type="datetime-local"
                    className="input-control"
                    value={shiftForm.start_time}
                    onChange={(e) => setShiftForm({ ...shiftForm, start_time: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="shift-end-input">Shift End Date & Time</label>
                  <input
                    id="shift-end-input"
                    type="datetime-local"
                    className="input-control"
                    value={shiftForm.end_time}
                    onChange={(e) => setShiftForm({ ...shiftForm, end_time: e.target.value })}
                    required
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ marginTop: '10px' }}>Schedule Assignment</button>
              </form>
            </div>
          </div>

          {/* Lower row: timesheets logs & performance report */}
          <div className="grid-cols-2">
            {/* Clocking history timesheets */}
            <div className="card">
              <h3>Timesheet Clock-In logs</h3>
              <div className="table-container" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Clock In</th>
                      <th>Clock Out</th>
                      <th>Total Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timesheets.map((ts) => (
                      <tr key={ts.id}>
                        <td>
                          <strong>{ts.user.name}</strong>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{ts.user.role}</div>
                        </td>
                        <td>{new Date(ts.clock_in).toLocaleString()}</td>
                        <td>{ts.clock_out ? new Date(ts.clock_out).toLocaleString() : <span style={{ color: 'var(--success)' }}>Clocked In</span>}</td>
                        <td>{ts.total_hours !== null ? `${ts.total_hours} hrs` : '--'}</td>
                      </tr>
                    ))}
                    {timesheets.length === 0 && (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No clock-in events recorded</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Staff Hours performance aggregation table */}
            <div className="card">
              <h3>Employee Total Logged Hours Summary</h3>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Role</th>
                      <th>Shift Count</th>
                      <th>Hours Worked</th>
                    </tr>
                  </thead>
                  <tbody>
                    {performanceReport.map((p) => (
                      <tr key={p.userId}>
                        <td><strong>{p.name}</strong></td>
                        <td>{p.role}</td>
                        <td>{p.shiftCount} shifts</td>
                        <td style={{ color: 'var(--primary-hover)', fontWeight: 'bold' }}>{p.totalHours} hrs</td>
                      </tr>
                    ))}
                    {performanceReport.length === 0 && (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No work hours aggregated yet</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
