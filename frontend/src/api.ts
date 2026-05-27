const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...getHeaders(),
      ...options.headers,
    },
  });

  if (!response.ok) {
    let errorMsg = 'An error occurred';
    try {
      const data = await response.json();
      errorMsg = data.error || errorMsg;
    } catch {
      // Ignore JSON parse error
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

  // Menu
  getMenuItems: () => request('/menu'),
  createMenuItem: (data: any) => request('/menu', { method: 'POST', body: JSON.stringify(data) }),
  updateMenuItem: (id: string, data: any) => request(`/menu/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMenuItem: (id: string) => request(`/menu/${id}`, { method: 'DELETE' }),

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
