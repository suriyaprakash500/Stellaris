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
  ChefHat,
  Settings
} from 'lucide-react';

export const ManagerDashboard: React.FC = () => {
  const { showToast, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'sales' | 'menu' | 'categories' | 'inventory' | 'recipes' | 'staff' | 'business' | 'branches' | 'orderTiming' | 'users'>('sales');

  // Sales and reports state
  const [salesReport, setSalesReport] = useState<any>(null);
  const [inventoryReport, setInventoryReport] = useState<any>(null);
  const [performanceReport, setPerformanceReport] = useState<any[]>([]);
  const [orderTimingReport, setOrderTimingReport] = useState<any>(null);
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
    is_available: true,
    branch_id: ''
  });

  // Business settings state
  const [businessForm, setBusinessForm] = useState({
    shop_name: '',
    fssai_no: '',
    mobile_no: '',
    location: '',
    branch_id: ''
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Category state
  const [categories, setCategories] = useState<any[]>([]);
  const [categoryForm, setCategoryForm] = useState({ name: '' });

  // Inventory state
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [editingIngredient, setEditingIngredient] = useState<any | null>(null);
  const [ingForm, setIngForm] = useState({
    name: '',
    current_stock: 0,
    unit: '',
    min_stock_alert: 0,
    vendor_id: '',
    branch_id: ''
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
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Businesses admin state
  // Businesses and Branches state
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  
  // Forms
  const [businessesBrandForm, setBusinessesBrandForm] = useState({
    name: ''
  });
  const [branchLocationForm, setBranchLocationForm] = useState({
    name: '',
    location: '',
    mobile_no: '',
    business_id: ''
  });

  // User Management state
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    email: '',
    mobile_no: '',
    role: 'STAFF', // STAFF or MANAGER
    role_title: '', // Custom Designation (Cook, Cashier, Tea Boy, Helper, etc.)
    password: '',
    business_id: '',
    branch_id: '', // physical location scoping
    can_manage_menu: false,
    can_prepare_food: false,
    can_manage_delivery: false,
    can_process_billing: false,
    can_view_reports: false,
    can_manage_inventory: false,
    can_manage_recipes: false,
    can_manage_shifts: false,
    can_clock_in_out: true,
  });

  const handleBusinessBrandSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createBusiness(businessesBrandForm);
      showToast('Business Brand created successfully', 'success');
      setBusinessesBrandForm({ name: '' });
      const bizList = await api.getBusinesses();
      setBusinesses(bizList);
    } catch (err: any) {
      showToast(err.message || 'Action failed', 'error');
    }
  };

  const handleBranchLocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createBranch(branchLocationForm);
      showToast('Branch Location created successfully', 'success');
      setBranchLocationForm({ name: '', location: '', mobile_no: '', business_id: '' });
      const brList = await api.getBranches();
      setBranches(brList);
    } catch (err: any) {
      showToast(err.message || 'Action failed', 'error');
    }
  };

  const handleDesignationChange = (designation: string) => {
    let perms = {
      can_manage_menu: false,
      can_prepare_food: false,
      can_manage_delivery: false,
      can_process_billing: false,
      can_view_reports: false,
      can_manage_inventory: false,
      can_manage_recipes: false,
      can_manage_shifts: false,
      can_clock_in_out: true,
    };

    const lower = designation.toLowerCase().trim();
    if (lower === 'cook') {
      perms.can_prepare_food = true;
    } else if (lower === 'cashier') {
      perms.can_process_billing = true;
    } else if (lower === 'helper' || lower === 'tea boy') {
      // helper and tea boy only have clock in/out enabled by default
    }

    setNewUserForm(prev => ({
      ...prev,
      role_title: designation === 'Custom' ? '' : designation,
      ...perms
    }));
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const targetBusinessId = (user?.role === 'OWNER' || user?.role === 'ADMIN') ? newUserForm.business_id : user?.businessId;
      const targetBranchId = (user?.role === 'OWNER' || user?.role === 'ADMIN') ? newUserForm.branch_id : user?.branchId;
      
      if (!targetBusinessId) {
        showToast('Please select a business brand to assign the employee to', 'error');
        return;
      }
      if (!targetBranchId) {
        showToast('Please select a physical branch location to assign the employee to', 'error');
        return;
      }

      await api.createEmployee({
        ...newUserForm,
        business_id: targetBusinessId,
        branch_id: targetBranchId
      });

      showToast('Employee account created successfully!', 'success');
      setNewUserForm({
        name: '',
        email: '',
        mobile_no: '',
        role: 'STAFF',
        role_title: '',
        password: '',
        business_id: '',
        branch_id: '',
        can_manage_menu: false,
        can_prepare_food: false,
        can_manage_delivery: false,
        can_process_billing: false,
        can_view_reports: false,
        can_manage_inventory: false,
        can_manage_recipes: false,
        can_manage_shifts: false,
        can_clock_in_out: true,
      });

      const branchParam = (user?.role === 'OWNER' || user?.role === 'ADMIN') ? selectedBranchId : undefined;
      const list = await api.getEmployeesList(branchParam);
      setEmployees(list);
    } catch (err: any) {
      showToast(err.message || 'Failed to create user account', 'error');
    }
  };

  useEffect(() => {
    const loadInitialData = async () => {
      if (user?.role === 'OWNER' || user?.role === 'ADMIN') {
        try {
          const bizList = await api.getBusinesses();
          setBusinesses(bizList);
          const brList = await api.getBranches();
          setBranches(brList);
        } catch (err) {
          console.error('Failed to load initial businesses/branches:', err);
        }
      }
    };
    loadInitialData();
  }, [user?.role]);

  const fetchReportsAndData = async () => {
    try {
      const branchParam = (user?.role === 'OWNER' || user?.role === 'ADMIN') ? selectedBranchId : undefined;

      if (activeTab === 'sales') {
        const sales = await api.getSalesReport(branchParam ? { branchId: branchParam } : undefined);
        setSalesReport(sales);
        const fb = await api.getAllFeedback();
        setFeedbacks(fb);
      } else if (activeTab === 'menu') {
        const items = await api.getMenuItems(branchParam);
        setMenuItems(items);
        const cats = await api.getCategories();
        setCategories(cats);
      } else if (activeTab === 'categories') {
        const cats = await api.getCategories();
        setCategories(cats);
      } else if (activeTab === 'business') {
        const settings = await api.getBusinessSettings();
        setBusinessForm({
          shop_name: settings.shop_name || '',
          fssai_no: settings.fssai_no || '',
          mobile_no: settings.mobile_no || '',
          location: settings.location || '',
          branch_id: settings.branch_id || ''
        });
      } else if (activeTab === 'inventory') {
        const ings = await api.getIngredients(branchParam);
        setIngredients(ings);
        const vens = await api.getVendors();
        setVendors(vens);
        const reports = await api.getInventoryReport(branchParam);
        setInventoryReport(reports);
      } else if (activeTab === 'recipes') {
        const items = await api.getMenuItems(branchParam);
        setMenuItems(items);
        const ings = await api.getIngredients(branchParam);
        setIngredients(ings);
      } else if (activeTab === 'staff') {
        const list = await api.getEmployeesList();
        setEmployees(list);
        const s = await api.getShifts();
        setShifts(s);
        const t = await api.getTimesheets();
        setTimesheets(t);
        const perf = await api.getEmployeePerformanceReport(branchParam);
        setPerformanceReport(perf);

        // check if currently clocked in
        const userT = t.find((ts: any) => ts.user_id === user?.id && ts.clock_out === null);
        setActiveTimesheet(userT || null);
      } else if (activeTab === 'users') {
        const list = await api.getEmployeesList(branchParam);
        setEmployees(list);
        if (user?.role === 'OWNER' || user?.role === 'ADMIN') {
          const listB = await api.getBusinesses();
          setBusinesses(listB);
          const listBr = await api.getBranches();
          setBranches(listBr);
        }
      } else if (activeTab === 'branches') {
        if (user?.role === 'OWNER' || user?.role === 'ADMIN') {
          const listB = await api.getBusinesses();
          setBusinesses(listB);
          const listBr = await api.getBranches();
          setBranches(listBr);
        }
      } else if (activeTab === 'orderTiming') {
        if (user?.role === 'OWNER' || user?.role === 'ADMIN') {
          const report = await api.getOrderTimingReport(branchParam);
          setOrderTimingReport(report);
        }
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchReportsAndData();
  }, [activeTab, selectedBranchId]);

  // Menu Form Handlers
  const handleMenuSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingMenuItem) {
        await api.updateMenuItem(editingMenuItem.id, {
          ...menuForm,
          price: Number(menuForm.price),
          branch_id: menuForm.branch_id || undefined
        });
        showToast('Menu item updated', 'success');
      } else {
        await api.createMenuItem({
          ...menuForm,
          price: Number(menuForm.price),
          branch_id: menuForm.branch_id || undefined
        });
        showToast('Menu item created', 'success');
      }
      setEditingMenuItem(null);
      setMenuForm({ name: '', description: '', price: 0, category: '', image_url: '', is_available: true, branch_id: '' });
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
      is_available: item.is_available,
      branch_id: item.branch_id || ''
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

  // Category Form Handlers
  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = categoryForm.name;
    if (!name) return;
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      showToast('Category name cannot be empty or contain only spaces.', 'error');
      return;
    }
    if (trimmed.length > 50) {
      showToast('Category name cannot exceed 50 characters.', 'error');
      return;
    }
    const alphanumericRegex = /[a-zA-Z0-9]/;
    if (!alphanumericRegex.test(trimmed)) {
      showToast('Category name must contain at least one letter or number.', 'error');
      return;
    }

    const isDuplicate = categories.some(
      (cat) => cat.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) {
      showToast('Category already exists. Please use the existing category or enter a different name.', 'error');
      return;
    }

    try {
      await api.createCategory({ name: trimmed });
      showToast('Category created successfully', 'success');
      setCategoryForm({ name: '' });
      fetchReportsAndData();
    } catch (err: any) {
      showToast(err.message || 'Action failed', 'error');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    try {
      await api.deleteCategory(id);
      showToast('Category deleted', 'success');
      fetchReportsAndData();
    } catch (err: any) {
      showToast(err.message || 'Action failed', 'error');
    }
  };

  // Business Form Handlers
  const handleBusinessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      await api.updateBusinessSettings(businessForm);
      showToast('Business settings saved successfully', 'success');
      fetchReportsAndData();
    } catch (err: any) {
      showToast(err.message || 'Failed to save settings', 'error');
    } finally {
      setIsSavingSettings(false);
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
        vendor_id: ingForm.vendor_id || undefined,
        branch_id: ingForm.branch_id || undefined
      };

      if (editingIngredient) {
        await api.updateIngredient(editingIngredient.id, payload);
        showToast('Ingredient updated', 'success');
      } else {
        await api.createIngredient(payload);
        showToast('Ingredient created', 'success');
      }
      setEditingIngredient(null);
      setIngForm({ name: '', current_stock: 0, unit: '', min_stock_alert: 0, vendor_id: '', branch_id: '' });
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
      vendor_id: ing.vendor_id || '',
      branch_id: ing.branch_id || ''
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
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {(user?.role === 'OWNER' || user?.role === 'ADMIN') && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '12px' }}>
              <label htmlFor="dashboard-branch-select" style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Branch:</label>
              <select
                id="dashboard-branch-select"
                className="input-control"
                style={{ width: '220px', margin: 0, padding: '8px 12px', height: 'auto' }}
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
              >
                <option value="">All Branches</option>
                {branches.map((b) => {
                  const parentBiz = businesses.find((biz) => biz.id === b.business_id);
                  const displayName = parentBiz ? `${parentBiz.name} - ${b.name}` : b.name;
                  return (
                    <option key={b.id} value={b.id}>{displayName}</option>
                  );
                })}
              </select>
            </div>
          )}
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
        <button className={`chip ${activeTab === 'categories' ? 'active' : ''}`} onClick={() => setActiveTab('categories')}>
          <BookOpen size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Category Setup
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
        <button className={`chip ${activeTab === 'business' ? 'active' : ''}`} onClick={() => setActiveTab('business')}>
          <Settings size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Business Settings
        </button>
        {(user?.role === 'OWNER' || user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
          <button className={`chip ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
            <Users size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> User Management
          </button>
        )}
        {(user?.role === 'OWNER' || user?.role === 'ADMIN') && (
          <button className={`chip ${activeTab === 'branches' ? 'active' : ''}`} onClick={() => setActiveTab('branches')}>
            <Settings size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Manage Businesses
          </button>
        )}
        {(user?.role === 'OWNER' || user?.role === 'ADMIN') && (
          <button className={`chip ${activeTab === 'orderTiming' ? 'active' : ''}`} onClick={() => setActiveTab('orderTiming')}>
            <Clock size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Order Performance
          </button>
        )}
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
              <div className="form-group" style={{ position: 'relative' }}>
                <label className="form-label" htmlFor="menu-cat-input">Category</label>
                <input
                  id="menu-cat-input"
                  type="text"
                  className="input-control"
                  placeholder="Type category name..."
                  value={menuForm.category}
                  onChange={(e) => {
                    setMenuForm({ ...menuForm, category: e.target.value });
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  required
                  autoComplete="off"
                />
                
                {/* Auto-suggestions dropdown */}
                {showSuggestions && menuForm.category && (
                  <div className="card" style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    zIndex: 1000,
                    maxHeight: '180px',
                    overflowY: 'auto',
                    marginTop: '4px',
                    padding: '8px 0',
                    boxShadow: 'var(--shadow-lg)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-secondary)'
                  }}>
                    {categories
                      .filter(cat => cat.name.toLowerCase().includes(menuForm.category.toLowerCase()) && cat.name.toLowerCase() !== menuForm.category.toLowerCase())
                      .map(cat => (
                        <div
                          key={cat.id}
                          style={{
                            padding: '8px 16px',
                            cursor: 'pointer',
                            transition: 'background 0.2s',
                          }}
                          onMouseDown={() => {
                            setMenuForm({ ...menuForm, category: cat.name });
                            setShowSuggestions(false);
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          {cat.name}
                        </div>
                      ))}
                    {categories.filter(cat => cat.name.toLowerCase().includes(menuForm.category.toLowerCase())).length === 0 && (
                      <div style={{ padding: '8px 16px', color: 'var(--text-muted)', fontSize: '13px' }}>
                        No match. Creates new category on save.
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="menu-img-file">Upload Image</label>
                <input
                  id="menu-img-file"
                  type="file"
                  accept="image/*"
                  className="input-control"
                  style={{ padding: '8px' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setMenuForm({ ...menuForm, image_url: reader.result as string });
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
                {menuForm.image_url && (
                  <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Selected Image Preview:</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <img 
                        src={menuForm.image_url} 
                        alt="Preview" 
                        style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }} 
                      />
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        style={{ padding: '6px 12px', fontSize: '12px', height: 'auto' }}
                        onClick={() => {
                          setMenuForm({ ...menuForm, image_url: '' });
                          const fileInput = document.getElementById('menu-img-file') as HTMLInputElement;
                          if (fileInput) fileInput.value = '';
                        }}
                      >
                        Remove Image
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {(user?.role === 'OWNER' || user?.role === 'ADMIN') && (
                <div className="form-group">
                  <label className="form-label" htmlFor="menu-branch-select">Business Brand Scope</label>
                  <select
                    id="menu-branch-select"
                    className="input-control"
                    value={menuForm.branch_id || ''}
                    onChange={(e) => setMenuForm({ ...menuForm, branch_id: e.target.value })}
                  >
                    <option value="">-- None (Global) --</option>
                    {businesses.map((biz) => (
                      <option key={biz.id} value={biz.id}>{biz.name}</option>
                    ))}
                  </select>
                </div>
              )}
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
                      setMenuForm({ name: '', description: '', price: 0, category: '', image_url: '', is_available: true, branch_id: '' });
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

      {/* 2B. CATEGORY SETUP */}
      {activeTab === 'categories' && (
        <div className="grid-cols-3" style={{ alignItems: 'flex-start' }}>
          {/* List of current categories */}
          <div className="card" style={{ gridColumn: 'span 2' }}>
            <h3>Categories Setup</h3>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Category Name</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((cat) => (
                    <tr key={cat.id}>
                      <td>
                        <strong>{cat.name}</strong>
                      </td>
                      <td>
                        <button className="btn btn-danger" style={{ padding: '6px 10px' }} onClick={() => handleDeleteCategory(cat.id)}>
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {categories.length === 0 && (
                    <tr>
                      <td colSpan={2} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
                        No categories configured. Create one on the right!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add Category Form */}
          <div className="card">
            <h3>Add Category</h3>
            <form onSubmit={handleCategorySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="cat-name-input">Category Name</label>
                <input
                  id="cat-name-input"
                  type="text"
                  className="input-control"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ name: e.target.value })}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ marginTop: '8px' }}>
                Create Category
              </button>
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
              {(user?.role === 'OWNER' || user?.role === 'ADMIN') && (
                <div className="form-group">
                  <label className="form-label" htmlFor="ing-branch-select">Branch Scope</label>
                  <select
                    id="ing-branch-select"
                    className="input-control"
                    value={ingForm.branch_id || ''}
                    onChange={(e) => setIngForm({ ...ingForm, branch_id: e.target.value })}
                  >
                    <option value="">-- None (Global) --</option>
                    {branches.map((b) => {
                      const parentBiz = businesses.find((biz) => biz.id === b.business_id);
                      return (
                        <option key={b.id} value={b.id}>
                          {parentBiz ? `${parentBiz.name} - ${b.name}` : b.name}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}
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
                        setIngForm({ name: '', current_stock: 0, unit: '', min_stock_alert: 0, vendor_id: '', branch_id: '' });
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

      {/* 6. BUSINESS SETTINGS */}
      {activeTab === 'business' && (
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div className="card">
            <h3>Business Settings</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
              Configure your restaurant identity, contact details, food license, and branch metadata.
            </p>
            
            <form onSubmit={handleBusinessSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="business-name-input">Shop / Restaurant Name</label>
                <input
                  id="business-name-input"
                  type="text"
                  className="input-control"
                  value={businessForm.shop_name}
                  onChange={(e) => setBusinessForm({ ...businessForm, shop_name: e.target.value })}
                  placeholder="e.g. Stellaris POS"
                  required
                />
              </div>
              
              <div className="form-group">
                <label className="form-label" htmlFor="business-fssai-input">FSSAI Registration Number (FSSAI No)</label>
                <input
                  id="business-fssai-input"
                  type="text"
                  className="input-control"
                  value={businessForm.fssai_no}
                  onChange={(e) => setBusinessForm({ ...businessForm, fssai_no: e.target.value })}
                  placeholder="14-digit FSSAI License No."
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="business-phone-input">Mobile / Contact Number</label>
                <input
                  id="business-phone-input"
                  type="text"
                  className="input-control"
                  value={businessForm.mobile_no}
                  onChange={(e) => setBusinessForm({ ...businessForm, mobile_no: e.target.value })}
                  placeholder="e.g. +91 98765 43210"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="business-location-input">Location / Address</label>
                <input
                  id="business-location-input"
                  type="text"
                  className="input-control"
                  value={businessForm.location}
                  onChange={(e) => setBusinessForm({ ...businessForm, location: e.target.value })}
                  placeholder="e.g. Chennai, India"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="business-branch-input">Branch ID</label>
                <input
                  id="business-branch-input"
                  type="text"
                  className="input-control"
                  value={businessForm.branch_id}
                  onChange={(e) => setBusinessForm({ ...businessForm, branch_id: e.target.value })}
                  placeholder="e.g. BR-CHENNAI-01"
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ marginTop: '12px' }}
                disabled={isSavingSettings}
              >
                {isSavingSettings ? 'Saving Settings...' : 'Save Settings'}
              </button>
            </form>
          </div>
        </div>
      )}
      {/* 9. USER MANAGEMENT */}
      {activeTab === 'users' && (user?.role === 'OWNER' || user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
        <div className="grid-cols-3" style={{ alignItems: 'flex-start' }}>
          {/* List of current employees */}
          <div className="card" style={{ gridColumn: 'span 2' }}>
            <h3>User Management</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Directory of managers and operational staff accounts.
            </p>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>User Details</th>
                    <th>System Role & Title</th>
                    <th>Assigned Branch & Brand</th>
                    <th>Permissions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => {
                    const empBusiness = businesses.find((b) => b.id === emp.business_id);
                    const empBranch = branches.find((b) => b.id === emp.branch_id);
                    return (
                      <tr key={emp.id}>
                        <td>
                          <strong>{emp.name}</strong>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{emp.email}</div>
                          {emp.mobile_no && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{emp.mobile_no}</div>}
                        </td>
                        <td>
                          <span className={`badge ${emp.role === 'OWNER' ? 'badge-delivered' : emp.role === 'MANAGER' ? 'badge-preparing' : 'badge-pending'}`} style={{ marginRight: '6px' }}>
                            {emp.role}
                          </span>
                          {emp.role_title && (
                            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                              ({emp.role_title})
                            </span>
                          )}
                        </td>
                        <td>
                          {emp.role === 'OWNER' ? (
                            <span style={{ color: 'var(--text-muted)' }}>All Locations</span>
                          ) : (
                            <div>
                              <div><strong>{empBranch?.name || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Unassigned Branch</span>}</strong></div>
                              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Brand: {empBusiness?.name || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Unassigned Brand</span>}</div>
                            </div>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '300px' }}>
                            {emp.can_manage_menu && <span className="badge" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: '10px', padding: '2px 6px' }}>Menu</span>}
                            {emp.can_prepare_food && <span className="badge" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: '10px', padding: '2px 6px' }}>Kitchen</span>}
                            {emp.can_manage_delivery && <span className="badge" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: '10px', padding: '2px 6px' }}>Delivery</span>}
                            {emp.can_process_billing && <span className="badge" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: '10px', padding: '2px 6px' }}>POS</span>}
                            {emp.can_view_reports && <span className="badge" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: '10px', padding: '2px 6px' }}>Reports</span>}
                            {emp.can_manage_inventory && <span className="badge" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: '10px', padding: '2px 6px' }}>Inventory</span>}
                            {emp.can_manage_recipes && <span className="badge" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: '10px', padding: '2px 6px' }}>Recipes</span>}
                            {emp.can_manage_shifts && <span className="badge" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: '10px', padding: '2px 6px' }}>Shifts</span>}
                            {emp.can_clock_in_out && <span className="badge" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: '10px', padding: '2px 6px' }}>Clock</span>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {employees.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
                        No staff accounts created yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add Employee Form */}
          <div className="card">
            <h3>Add Employee / Manager</h3>
            <form onSubmit={handleUserSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="user-name-input">Full Name</label>
                <input
                  id="user-name-input"
                  type="text"
                  className="input-control"
                  value={newUserForm.name}
                  onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                  placeholder="e.g. Jane Doe"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="user-email-input">Email Address</label>
                <input
                  id="user-email-input"
                  type="email"
                  className="input-control"
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                  placeholder="e.g. jane@example.com"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="user-phone-input">Phone Number</label>
                <input
                  id="user-phone-input"
                  type="tel"
                  className="input-control"
                  value={newUserForm.mobile_no}
                  onChange={(e) => setNewUserForm({ ...newUserForm, mobile_no: e.target.value })}
                  placeholder="e.g. 9876543210"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="user-role-select">System Role</label>
                <select
                  id="user-role-select"
                  className="input-control"
                  value={newUserForm.role}
                  onChange={(e) => {
                    const newRole = e.target.value;
                    setNewUserForm(prev => ({
                      ...prev,
                      role: newRole,
                      role_title: newRole === 'MANAGER' ? 'Manager' : prev.role_title
                    }));
                  }}
                  required
                >
                  <option value="STAFF">STAFF (Operational Staff)</option>
                  <option value="MANAGER">MANAGER (Business Manager)</option>
                </select>
              </div>

              {newUserForm.role === 'STAFF' && (
                <div className="form-group">
                  <label className="form-label" htmlFor="user-designation-select">Job Designation</label>
                  <select
                    id="user-designation-select"
                    className="input-control"
                    value={
                      ['Cook', 'Cashier', 'Helper', 'Tea Boy'].includes(newUserForm.role_title)
                        ? newUserForm.role_title
                        : newUserForm.role_title === ''
                        ? ''
                        : 'Custom'
                    }
                    onChange={(e) => handleDesignationChange(e.target.value)}
                  >
                    <option value="">-- Select Designation --</option>
                    <option value="Cook">Cook (Kitchen Prep)</option>
                    <option value="Cashier">Cashier (POS Checkout)</option>
                    <option value="Helper">Helper (Shift Clock-in only)</option>
                    <option value="Tea Boy">Tea Boy (Shift Clock-in only)</option>
                    <option value="Custom">Custom Role Title...</option>
                  </select>
                </div>
              )}

              {newUserForm.role === 'STAFF' && !['Cook', 'Cashier', 'Helper', 'Tea Boy'].includes(newUserForm.role_title) && (
                <div className="form-group">
                  <label className="form-label" htmlFor="user-custom-designation-input">Custom Designation Title</label>
                  <input
                    id="user-custom-designation-input"
                    type="text"
                    className="input-control"
                    value={newUserForm.role_title}
                    onChange={(e) => setNewUserForm({ ...newUserForm, role_title: e.target.value })}
                    placeholder="e.g. Barista"
                    required
                  />
                </div>
              )}

              {(user?.role === 'OWNER' || user?.role === 'ADMIN') && (
                <>
                  <div className="form-group">
                    <label className="form-label" htmlFor="user-business-select">Assign Business Brand</label>
                    <select
                      id="user-business-select"
                      className="input-control"
                      value={newUserForm.business_id}
                      onChange={(e) => {
                        const newBizId = e.target.value;
                        setNewUserForm(prev => ({
                          ...prev,
                          business_id: newBizId,
                          branch_id: '' // reset branch when business changes
                        }));
                      }}
                      required
                    >
                      <option value="">-- Choose Business Brand --</option>
                      {businesses.map((biz) => (
                        <option key={biz.id} value={biz.id}>{biz.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="user-branch-select">Assign Branch Location</label>
                    <select
                      id="user-branch-select"
                      className="input-control"
                      value={newUserForm.branch_id}
                      onChange={(e) => setNewUserForm(prev => ({ ...prev, branch_id: e.target.value }))}
                      required
                      disabled={!newUserForm.business_id}
                    >
                      <option value="">-- Choose Branch Location --</option>
                      {branches
                        .filter((b) => b.business_id === newUserForm.business_id)
                        .map((b) => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))
                      }
                    </select>
                  </div>
                </>
              )}

              <div className="form-group">
                <label className="form-label" htmlFor="user-temp-password-input">Temporary Password</label>
                <input
                  id="user-temp-password-input"
                  type="text"
                  className="input-control"
                  value={newUserForm.password}
                  onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                  placeholder="Minimum 6 characters"
                  required
                />
              </div>

              {newUserForm.role === 'STAFF' && (
                <div style={{ marginTop: '10px' }}>
                  <h4 style={{ marginBottom: '10px', fontSize: '14px' }}>Operational Permissions</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <input
                        id="perm-menu"
                        type="checkbox"
                        checked={newUserForm.can_manage_menu}
                        onChange={(e) => setNewUserForm({ ...newUserForm, can_manage_menu: e.target.checked })}
                        style={{ marginTop: '4px' }}
                      />
                      <div>
                        <label htmlFor="perm-menu" style={{ fontWeight: 'bold', fontSize: '13px' }}>Menu Setup</label>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Configure catalog items & pricing</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <input
                        id="perm-prep"
                        type="checkbox"
                        checked={newUserForm.can_prepare_food}
                        onChange={(e) => setNewUserForm({ ...newUserForm, can_prepare_food: e.target.checked })}
                        style={{ marginTop: '4px' }}
                      />
                      <div>
                        <label htmlFor="perm-prep" style={{ fontWeight: 'bold', fontSize: '13px' }}>Kitchen Queue</label>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Accept orders & progress preparing queue</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <input
                        id="perm-delivery"
                        type="checkbox"
                        checked={newUserForm.can_manage_delivery}
                        onChange={(e) => setNewUserForm({ ...newUserForm, can_manage_delivery: e.target.checked })}
                        style={{ marginTop: '4px' }}
                      />
                      <div>
                        <label htmlFor="perm-delivery" style={{ fontWeight: 'bold', fontSize: '13px' }}>Delivery Dispatch</label>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Manage order assignments & driver routes</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <input
                        id="perm-pos"
                        type="checkbox"
                        checked={newUserForm.can_process_billing}
                        onChange={(e) => setNewUserForm({ ...newUserForm, can_process_billing: e.target.checked })}
                        style={{ marginTop: '4px' }}
                      />
                      <div>
                        <label htmlFor="perm-pos" style={{ fontWeight: 'bold', fontSize: '13px' }}>Order Billing / POS</label>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Punch custom bills and checkout order payments</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <input
                        id="perm-reports"
                        type="checkbox"
                        checked={newUserForm.can_view_reports}
                        onChange={(e) => setNewUserForm({ ...newUserForm, can_view_reports: e.target.checked })}
                        style={{ marginTop: '4px' }}
                      />
                      <div>
                        <label htmlFor="perm-reports" style={{ fontWeight: 'bold', fontSize: '13px' }}>Reports & Analytics</label>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>View sales figures & operational feedback logs</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <input
                        id="perm-inventory"
                        type="checkbox"
                        checked={newUserForm.can_manage_inventory}
                        onChange={(e) => setNewUserForm({ ...newUserForm, can_manage_inventory: e.target.checked })}
                        style={{ marginTop: '4px' }}
                      />
                      <div>
                        <label htmlFor="perm-inventory" style={{ fontWeight: 'bold', fontSize: '13px' }}>Inventory Setup</label>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Create ingredients & adjust stock audit quantities</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <input
                        id="perm-recipes"
                        type="checkbox"
                        checked={newUserForm.can_manage_recipes}
                        onChange={(e) => setNewUserForm({ ...newUserForm, can_manage_recipes: e.target.checked })}
                        style={{ marginTop: '4px' }}
                      />
                      <div>
                        <label htmlFor="perm-recipes" style={{ fontWeight: 'bold', fontSize: '13px' }}>Recipe Association</label>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Link menu items to ingredient usage deductions</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <input
                        id="perm-shifts"
                        type="checkbox"
                        checked={newUserForm.can_manage_shifts}
                        onChange={(e) => setNewUserForm({ ...newUserForm, can_manage_shifts: e.target.checked })}
                        style={{ marginTop: '4px' }}
                      />
                      <div>
                        <label htmlFor="perm-shifts" style={{ fontWeight: 'bold', fontSize: '13px' }}>Staff Schedules</label>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Schedule shifts & view staff worked hour timesheets</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <input
                        id="perm-clock"
                        type="checkbox"
                        checked={newUserForm.can_clock_in_out}
                        onChange={(e) => setNewUserForm({ ...newUserForm, can_clock_in_out: e.target.checked })}
                        style={{ marginTop: '4px' }}
                      />
                      <div>
                        <label htmlFor="perm-clock" style={{ fontWeight: 'bold', fontSize: '13px' }}>Shift Clock In/Out</label>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Allow punching shift attendance timer</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <button type="submit" className="btn btn-primary" style={{ marginTop: '10px' }}>
                Create User Account
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 7. DUAL SPLIT BUSINESS & BRANCH ADMIN SETUP */}
      {activeTab === 'branches' && (user?.role === 'OWNER' || user?.role === 'ADMIN') && (
        <div className="grid-cols-2" style={{ alignItems: 'flex-start' }}>
          
          {/* Left Section: Business Brands */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="card">
              <h3>Business Brands</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Create and manage the parent business brand entities.
              </p>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Brand Name</th>
                      <th>Created At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {businesses.map((b) => (
                      <tr key={b.id}>
                        <td><strong>{b.name}</strong></td>
                        <td>{new Date(b.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                    {businesses.length === 0 && (
                      <tr>
                        <td colSpan={2} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
                          No business brands defined yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card">
              <h3>Add Business Brand</h3>
              <form onSubmit={handleBusinessBrandSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="brand-name-input">Brand Name</label>
                  <input
                    id="brand-name-input"
                    type="text"
                    className="input-control"
                    value={businessesBrandForm.name}
                    onChange={(e) => setBusinessesBrandForm({ name: e.target.value })}
                    placeholder="e.g. Chaat 2.0"
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary" style={{ marginTop: '8px' }}>
                  Create Brand
                </button>
              </form>
            </div>
          </div>

          {/* Right Section: Branch Locations */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="card">
              <h3>Branch Locations</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Physical branch outlets mapped to parent brands.
              </p>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Branch</th>
                      <th>Parent Brand</th>
                      <th>Location Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {branches.map((b) => {
                      const parentBiz = businesses.find((biz) => biz.id === b.business_id);
                      return (
                        <tr key={b.id}>
                          <td><strong>{b.name}</strong></td>
                          <td>{parentBiz?.name || <span style={{ color: 'var(--text-muted)' }}>None</span>}</td>
                          <td>
                            <div>{b.location || <span style={{ color: 'var(--text-muted)' }}>No location</span>}</div>
                            {b.mobile_no && <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{b.mobile_no}</div>}
                          </td>
                        </tr>
                      );
                    })}
                    {branches.length === 0 && (
                      <tr>
                        <td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
                          No branches defined yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card">
              <h3>Add Branch Location</h3>
              <form onSubmit={handleBranchLocationSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="location-brand-select">Parent Brand</label>
                  <select
                    id="location-brand-select"
                    className="input-control"
                    value={branchLocationForm.business_id}
                    onChange={(e) => setBranchLocationForm({ ...branchLocationForm, business_id: e.target.value })}
                    required
                  >
                    <option value="">-- Select Parent Brand --</option>
                    {businesses.map((biz) => (
                      <option key={biz.id} value={biz.id}>{biz.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="location-name-input">Branch Name</label>
                  <input
                    id="location-name-input"
                    type="text"
                    className="input-control"
                    value={branchLocationForm.name}
                    onChange={(e) => setBranchLocationForm({ ...branchLocationForm, name: e.target.value })}
                    placeholder="e.g. Velachery"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="location-address-input">Location Address</label>
                  <input
                    id="location-address-input"
                    type="text"
                    className="input-control"
                    value={branchLocationForm.location}
                    onChange={(e) => setBranchLocationForm({ ...branchLocationForm, location: e.target.value })}
                    placeholder="e.g. 123 Main Road, Chennai"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="location-phone-input">Mobile No</label>
                  <input
                    id="location-phone-input"
                    type="text"
                    className="input-control"
                    value={branchLocationForm.mobile_no}
                    onChange={(e) => setBranchLocationForm({ ...branchLocationForm, mobile_no: e.target.value })}
                    placeholder="e.g. +91 98765 43210"
                  />
                </div>
                <button type="submit" className="btn btn-primary" style={{ marginTop: '8px' }}>
                  Create Branch
                </button>
              </form>
            </div>
          </div>

        </div>
      )}

      {/* 8. ORDER TIMING PERFORMANCE */}
      {activeTab === 'orderTiming' && (user?.role === 'OWNER' || user?.role === 'ADMIN') && orderTimingReport && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px' }}>
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px' }}>Avg Prep Duration</div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--success)' }}>
                {orderTimingReport.summary.avgPrepTimeMin.toFixed(1)} mins
              </div>
            </div>
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px' }}>Avg Delivery Duration</div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--info)' }}>
                {orderTimingReport.summary.avgDeliveryTimeMin.toFixed(1)} mins
              </div>
            </div>
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px' }}>Avg Fulfillment Duration</div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--primary-hover)' }}>
                {orderTimingReport.summary.avgFulfillmentTimeMin.toFixed(1)} mins
              </div>
            </div>
            <div className="card" style={{ textAlign: 'center', borderColor: orderTimingReport.summary.delayedOrdersCount > 0 ? 'var(--danger)' : 'var(--border-color)', boxShadow: orderTimingReport.summary.delayedOrdersCount > 0 ? '0 0 10px rgba(239, 68, 68, 0.15)' : 'none' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px' }}>Delayed Orders (&gt;10m)</div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--danger)' }}>
                {orderTimingReport.summary.delayedOrdersCount} ({orderTimingReport.summary.delayedPercentage}%)
              </div>
            </div>
          </div>

          {/* Orders Timing Table */}
          <div className="card">
            <h3>Detailed Order Milestones & Timing</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '16px' }}>
              Timing is tracked from order creation (intake) to final delivery. Late orders (over 10 mins) are highlighted in red.
            </p>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Order Ref</th>
                    <th>Branch</th>
                    <th>Customer</th>
                    <th>Intake Time</th>
                    <th>Prep Started</th>
                    <th>Ready Time</th>
                    <th>Delivered Time</th>
                    <th>Prep (min)</th>
                    <th>Delivery (min)</th>
                    <th>Total (min)</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orderTimingReport.orders.map((o: any) => {
                    return (
                      <tr
                        key={o.id}
                        style={{
                          backgroundColor: o.isDelayed ? 'rgba(239, 68, 68, 0.08)' : 'inherit',
                          borderLeft: o.isDelayed ? '4px solid var(--danger)' : 'none'
                        }}
                      >
                        <td>
                          <strong>#{o.id.slice(0, 8)}</strong>
                          {o.isDelayed && (
                            <div style={{ fontSize: '10px', color: 'var(--danger)', fontWeight: 'bold', marginTop: '2px' }}>
                              ⚠️ LATE (&gt;10m)
                            </div>
                          )}
                        </td>
                        <td>{o.branchName}</td>
                        <td>{o.customerName}</td>
                        <td>{new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</td>
                        <td>{o.prep_started_at ? new Date(o.prep_started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : <span style={{ color: 'var(--text-muted)' }}>-</span>}</td>
                        <td>{o.ready_at ? new Date(o.ready_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : <span style={{ color: 'var(--text-muted)' }}>-</span>}</td>
                        <td>{o.delivered_at ? new Date(o.delivered_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : <span style={{ color: 'var(--text-muted)' }}>-</span>}</td>
                        <td style={{ fontWeight: 'bold' }}>{o.prepDurationMin !== null ? `${o.prepDurationMin} m` : '-'}</td>
                        <td style={{ fontWeight: 'bold' }}>{o.deliveryDurationMin !== null ? `${o.deliveryDurationMin} m` : '-'}</td>
                        <td style={{ fontWeight: 'bold', color: o.isDelayed ? 'var(--danger)' : 'inherit' }}>
                          {o.totalDurationMin !== null ? `${o.totalDurationMin} m` : '-'}
                        </td>
                        <td>
                          <span className={`badge badge-${o.status.toLowerCase()}`}>{o.status}</span>
                        </td>
                      </tr>
                    );
                  })}
                  {orderTimingReport.orders.length === 0 && (
                    <tr>
                      <td colSpan={11} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
                        No orders recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
