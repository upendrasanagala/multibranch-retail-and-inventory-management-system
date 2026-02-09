/**
 * API Configuration and Service
 * Connects React frontend to Flask backend
 */

const API_BASE_URL = "http://127.0.0.1:5000/api";

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
    const error = {
      response: {
        status: response.status,
        data
      }
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

    getInventory: (id) =>
      apiRequest(`/branches/${id}/inventory`)
  },

  /* ===================== PRODUCTS ===================== */
  products: {
    getAll: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return apiRequest(`/products${query ? `?${query}` : ""}`);
    },

    getById: (id) =>
      apiRequest(`/products/${id}`),

    create: (data) =>
      apiRequest("/products", {
        method: "POST",
        body: JSON.stringify(data)
      }),

    update: (id, data) =>
      apiRequest(`/products/${id}`, {
        method: "PUT",
        body: JSON.stringify(data)
      }),

    delete: (id) =>
      apiRequest(`/products/${id}`, { method: "DELETE" })
  },

  /* ===================== INVENTORY ===================== */
  inventory: {
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

    getLowStock: (branchId) => {
      const query = branchId ? `?branch_id=${branchId}` : "";
      return apiRequest(`/inventory/low-stock${query}`);
    }
  },

  /* ===================== SALES ===================== */
  sales: {
    create: (data) =>
      apiRequest("/sales", {
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

    getDailySummary: (branchId, date) => {
      const params = new URLSearchParams();
      if (branchId) params.append("branch_id", branchId);
      if (date) params.append("date", date);
      return apiRequest(`/sales/daily-summary?${params.toString()}`);
    }
  },

  /* ===================== TRANSFERS ===================== */
  transfers: {
    getAll: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return apiRequest(`/transfers${query ? `?${query}` : ""}`);
    },

    getById: (id) =>
      apiRequest(`/transfers/${id}`),

    create: (data) =>
      apiRequest("/transfers", {
        method: "POST",
        body: JSON.stringify(data)
      }),

    approve: (id) =>
      apiRequest(`/transfers/${id}/approve`, { method: "PUT" }),

    complete: (id) =>
      apiRequest(`/transfers/${id}/complete`, { method: "PUT" })
  },

  /* ===================== ADMIN ===================== */
  admin: {
    getUsers: () =>
      apiRequest("/admin/users"),

    updateUser: (id, data) =>
      apiRequest(`/admin/users/${id}`, {
        method: "PUT",
        body: JSON.stringify(data)
      }),

    approveUser: (id) =>
      apiRequest(`/admin/users/${id}/approve`, { method: "PUT" }),

    getStats: () =>
      apiRequest("/admin/stats")
  }
};

export default api;
export { API_BASE_URL, getToken, apiRequest };
