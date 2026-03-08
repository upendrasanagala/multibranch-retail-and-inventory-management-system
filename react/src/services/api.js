/**
 * API Configuration and Service
 * Connects React frontend to Flask backend
 */

const API_BASE_URL = "http://127.0.0.1:5001/api";


/* =====================================================
   GET STORED TOKEN
===================================================== */
const getToken = () => {
  try {
    const user = JSON.parse(localStorage.getItem("loggedInUser"));
    return user?.access_token || null;
  } catch {
    return null;
  }
};

/* =====================================================
   CORE API REQUEST HANDLER
===================================================== */
const apiRequest = async (endpoint, options = {}) => {
  const token = getToken();

  const headers = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers
  };

  // If sending FormData, let the browser set Content-Type with boundary
  if (options.body instanceof FormData) {
    delete headers["Content-Type"];
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    // 🔥 Handle Token Expiry / Unauthorized
    if (response.status === 401) {
      localStorage.removeItem("loggedInUser");
      // Only redirect if NOT already on login page to avoid refresh loop on failed login
      if (window.location.pathname !== "/login" && !endpoint.includes("/auth/login")) {
        window.location.href = "/login";
      }
    }

    const error = new Error(data.message || data.msg || `Request failed with status ${response.status}`);
    error.response = {
      status: response.status,
      data
    };
    throw error;
  }

  return data;
};

/* =====================================================
   API METHODS
===================================================== */
const api = {
  /* ===================== AUTH ===================== */
  auth: {
    // 🔥 FIXED: accept OBJECT, not separate params
    login: (data) =>
      apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify(data)
      }),

    register: (data) =>
      apiRequest("/auth/register", {
        method: "POST",
        body: JSON.stringify(data)
      }),

    getProfile: () =>
      apiRequest("/auth/profile"),

    updateProfile: (data) =>
      apiRequest("/auth/profile", {
        method: "PUT",
        body: JSON.stringify(data)
      }),

    forgotPassword: (data) =>
      apiRequest("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify(data)
      }),

    resetPassword: (data) =>
      apiRequest("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify(data)
      })
  },

  /* ===================== BRANCHES ===================== */
  branches: {
    getAll: () =>
      apiRequest("/branches"),

    getById: (id) =>
      apiRequest(`/branches/${id}`),

    create: (data) =>
      apiRequest("/branches", {
        method: "POST",
        body: JSON.stringify(data)
      }),

    update: (id, data) =>
      apiRequest(`/branches/${id}`, {
        method: "PUT",
        body: JSON.stringify(data)
      }),

    delete: (id) =>
      apiRequest(`/branches/${id}`, { method: "DELETE" }),

    getInventory: (id) =>
      apiRequest(`/branches/${id}/inventory`)
  },

  /* ===================== CATEGORIES ===================== */
  categories: {
    getAll: () =>
      apiRequest("/categories/"),

    getById: (id) =>
      apiRequest(`/categories/${id}`),

    create: (data) =>
      apiRequest("/categories/", {
        method: "POST",
        body: JSON.stringify(data)
      }),

    update: (id, data) =>
      apiRequest(`/categories/${id}`, {
        method: "PUT",
        body: JSON.stringify(data)
      }),

    delete: (id) =>
      apiRequest(`/categories/${id}`, { method: "DELETE" })
  },

  /* ===================== PRODUCTS ===================== */
  products: {
    getAll: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return apiRequest(`/products/${query ? `?${query}` : ""}`);
    },

    getById: (id) =>
      apiRequest(`/products/${id}`),

    create: (data) =>
      apiRequest("/products/", {
        method: "POST",
        body: JSON.stringify(data)
      }),

    update: (id, data) =>
      apiRequest(`/products/${id}`, {
        method: "PUT",
        body: JSON.stringify(data)
      }),

    delete: (id) =>
      apiRequest(`/products/${id}`, { method: "DELETE" }),

    import: (formData) =>
      apiRequest("/products/import", {
        method: "POST",
        body: formData,
        // Let browser set Content-Type for FormData
        headers: {}
      }),

    getImportHistory: () =>
      apiRequest("/products/imports"),

    deleteImport: (filename) =>
      apiRequest(`/products/imports/${encodeURIComponent(filename)}`, { method: "DELETE" }),

    downloadImport: (filename) =>
      `${API_BASE_URL}/products/imports/${encodeURIComponent(filename)}`,

    updateGST: () =>
      apiRequest("/products/update-gst", { method: "POST" })
  },

  /* ===================== INVENTORY ===================== */
  inventory: {
    getAll: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return apiRequest(`/inventory/${query ? `?${query}` : ""}`);
    },

    getByBranch: (branchId) =>
      apiRequest(`/inventory/branch/${branchId}`),

    update: (id, data) =>
      apiRequest(`/inventory/${id}`, {
        method: "PUT",
        body: JSON.stringify(data)
      }),

    adjust: (data) =>
      apiRequest("/inventory/adjust", {
        method: "POST",
        body: JSON.stringify(data)
      }),

    add: (data) =>
      apiRequest("/inventory/", {
        method: "POST",
        body: JSON.stringify(data)
      }),

    getLowStock: (branchId) => {
      const query = branchId ? `?branch_id=${branchId}` : "";
      return apiRequest(`/inventory/low-stock${query}`);
    },

    getAdjustments: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return apiRequest(`/inventory/adjustments${query ? `?${query}` : ""}`);
    }
  },

  /* ===================== SALES ===================== */
  sales: {
    getAll: (params = {}) => {
      const query = new URLSearchParams(
        Object.fromEntries(Object.entries(params).filter(([_, v]) => v))
      ).toString();
      return apiRequest(`/sales/${query ? `?${query}` : ""}`);
    },

    create: (data) =>
      apiRequest("/sales/", {
        method: "POST",
        body: JSON.stringify(data)
      }),

    getByBranch: (branchId, params = {}) => {
      const query = new URLSearchParams(params).toString();
      return apiRequest(`/sales/branch/${branchId}${query ? `?${query}` : ""}`);
    },

    getById: (id) =>
      apiRequest(`/sales/${id}`),

    refund: (id) =>
      apiRequest(`/sales/${id}/refund`, { method: "POST" }),

    returnItem: (itemId) =>
      apiRequest(`/sales/items/${itemId}/return`, { method: "POST" }),

    getDailySummary: (branchId, date) => {
      const params = new URLSearchParams();
      if (branchId) params.append("branch_id", branchId);
      if (date) params.append("date", date);
      return apiRequest(`/sales/daily-summary?${params.toString()}`);
    },

    getSummary: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return apiRequest(`/sales/summary${query ? `?${query}` : ""}`);
    }
  },

  /* ===================== TRANSFERS ===================== */
  transfers: {
    getAll: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return apiRequest(`/transfers/${query ? `?${query}` : ""}`);
    },

    getById: (id) =>
      apiRequest(`/transfers/${id}`),

    create: (data) =>
      apiRequest("/transfers/", {
        method: "POST",
        body: JSON.stringify(data)
      }),

    approve: (id) =>
      apiRequest(`/transfers/${id}/approve`, { method: "PUT" }),

    complete: (id) =>
      apiRequest(`/transfers/${id}/complete`, { method: "PUT" }),

    reject: (id, reason) =>
      apiRequest(`/transfers/${id}/reject`, {
        method: "PUT",
        body: JSON.stringify({ reason })
      })
  },

  /* ===================== ADMIN ===================== */
  admin: {
    getUsers: () =>
      apiRequest("/admin/users"),

    createUser: (data) =>
      apiRequest("/admin/users", {
        method: "POST",
        body: JSON.stringify(data)
      }),

    updateUser: (id, data) =>
      apiRequest(`/admin/users/${id}`, {
        method: "PUT",
        body: JSON.stringify(data)
      }),

    approveUser: (id) =>
      apiRequest(`/admin/users/${id}/approve`, { method: "PUT" }),

    deleteUser: (id) =>
      apiRequest(`/admin/users/${id}`, { method: "DELETE" }),

    reactivateUser: (id) =>
      apiRequest(`/admin/users/${id}/reactivate`, { method: "PUT" }),

    getStats: () =>
      apiRequest("/admin/stats"),

    getReports: (type, params = {}) => {
      const query = new URLSearchParams(
        Object.fromEntries(Object.entries(params).filter(([_, v]) => v))
      ).toString();
      return apiRequest(`/admin/reports/${type}${query ? `?${query}` : ""}`);
    },

    getRebalanceSuggestions: () =>
      apiRequest("/admin/inventory/rebalance-suggestions")
  },

  /* ===================== MANAGER ===================== */
  manager: {
    getStaff: () =>
      apiRequest("/manager/staff"),

    createStaff: (data) =>
      apiRequest("/manager/staff", {
        method: "POST",
        body: JSON.stringify(data)
      }),

    updateInterviewStatus: (id, status) =>
      apiRequest(`/manager/staff/${id}/interview`, {
        method: "PUT",
        body: JSON.stringify({ interview_status: status })
      }),

    updateStaffScore: (id, score) =>
      apiRequest(`/manager/staff/${id}/score`, {
        method: "PUT",
        body: JSON.stringify({ score: parseInt(score) })
      }),

    updateStaff: (id, data) =>
      apiRequest(`/manager/staff/${id}`, {
        method: "PUT",
        body: JSON.stringify(data)
      }),
  },

  /* ===================== SUPPLIERS ===================== */
  suppliers: {
    getAll: () =>
      apiRequest("/suppliers/"),

    getById: (id) =>
      apiRequest(`/suppliers/${id}`),

    create: (data) =>
      apiRequest("/suppliers/", {
        method: "POST",
        body: JSON.stringify(data)
      }),

    update: (id, data) =>
      apiRequest(`/suppliers/${id}`, {
        method: "PUT",
        body: JSON.stringify(data)
      }),

    delete: (id) =>
      apiRequest(`/suppliers/${id}`, { method: "DELETE" })
  }
};

export default api;
export { API_BASE_URL, getToken, apiRequest };
