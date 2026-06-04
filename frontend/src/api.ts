const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const REQUEST_TIMEOUT_MS = 15000;

function getHeaders() {
  const token = localStorage.getItem('stellaris_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function request(path: string, options: RequestInit = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        ...getHeaders(),
        ...options.headers,
      },
    });
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection and try again.');
    }
    throw new Error('Unable to reach the server. Please check your internet connection.');
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    let errorMsg = 'An unexpected error occurred';
    try {
      const data = await response.json();
      errorMsg = data.error || errorMsg;
    } catch {
      if (response.status === 401) errorMsg = 'Invalid email or password';
      else if (response.status === 403) errorMsg = 'You do not have permission to perform this action';
      else if (response.status === 404) errorMsg = 'The requested resource was not found';
      else if (response.status >= 500) errorMsg = 'Server error. Please try again later.';
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

export const api = {
  // Auth
  login: (credentials: any) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  register: (data: any) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  getProfile: () => request('/auth/profile'),
  forgotPassword: (email: string) => request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (token: string, newPassword: string) => request('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, newPassword }) }),

  // Menu
  getMenuItems: () => request('/menu'),
  createMenuItem: (data: any) => request('/menu', { method: 'POST', body: JSON.stringify(data) }),
  updateMenuItem: (id: string, data: any) => request(`/menu/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMenuItem: (id: string) => request(`/menu/${id}`, { method: 'DELETE' }),

  // Categories
  getCategories: () => request('/categories'),
  createCategory: (data: any) => request('/categories', { method: 'POST', body: JSON.stringify(data) }),
  deleteCategory: (id: string) => request(`/categories/${id}`, { method: 'DELETE' }),

  // Business Settings
  getBusinessSettings: () => request('/business'),
  updateBusinessSettings: (data: any) => request('/business', { method: 'PUT', body: JSON.stringify(data) }),

  // Orders
  getOrders: () => request('/orders'),
  createOrder: (items: any[]) => request('/orders', { method: 'POST', body: JSON.stringify({ items }) }),
  updateOrderStatus: (id: string, status: string) => request(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  recordPayment: (id: string, paymentData: any) => request(`/orders/${id}/pay`, { method: 'POST', body: JSON.stringify(paymentData) }),

  // Inventory
  getIngredients: () => request('/inventory'),
  createIngredient: (data: any) => request('/inventory', { method: 'POST', body: JSON.stringify(data) }),
  updateIngredient: (id: string, data: any) => request(`/inventory/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteIngredient: (id: string) => request(`/inventory/${id}`, { method: 'DELETE' }),
  adjustStock: (data: any) => request('/inventory/adjust', { method: 'POST', body: JSON.stringify(data) }),

  // Vendors
  getVendors: () => request('/inventory/vendors'),
  createVendor: (data: any) => request('/inventory/vendors', { method: 'POST', body: JSON.stringify(data) }),
  updateVendor: (id: string, data: any) => request(`/inventory/vendors/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteVendor: (id: string) => request(`/inventory/vendors/${id}`, { method: 'DELETE' }),

  // Recipes
  getRecipe: (menuItemId: string) => request(`/inventory/recipes/${menuItemId}`),
  saveRecipe: (data: any) => request('/inventory/recipes', { method: 'POST', body: JSON.stringify(data) }),

  // Employees
  getEmployeesList: () => request('/employees/list'),
  getShifts: () => request('/employees/shifts'),
  createShift: (data: any) => request('/employees/shifts', { method: 'POST', body: JSON.stringify(data) }),
  updateShift: (id: string, data: any) => request(`/employees/shifts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  clockIn: () => request('/employees/timesheet/clock-in', { method: 'POST' }),
  clockOut: () => request('/employees/timesheet/clock-out', { method: 'POST' }),
  getTimesheets: () => request('/employees/timesheets'),

  // CRM & Loyalty
  getCustomerProfile: () => request('/crm/profile'),
  submitFeedback: (data: any) => request('/crm/feedback', { method: 'POST', body: JSON.stringify(data) }),
  getAllFeedback: () => request('/crm/feedback'),

  // Reports
  getSalesReport: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request(`/reports/sales${qs}`);
  },
  getInventoryReport: () => request('/reports/inventory'),
  getEmployeePerformanceReport: () => request('/reports/performance'),
};

