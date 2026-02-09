/**
 * Authentication Service
 * Handles login, logout, and user session management
 */

import api from "./api";

const AUTH_KEY = "loggedInUser";

/* =====================================================
   LOGIN USER
===================================================== */
export const login = async (email, password) => {
  try {
    const response = await api.auth.login({
      email,
      password
    });

    if (!response.access_token) {
      return {
        success: false,
        error: "Invalid email or password"
      };
    }

    const userData = {
      ...response.user,
      access_token: response.access_token
    };

    localStorage.setItem(AUTH_KEY, JSON.stringify(userData));

    return { success: true, user: userData };
  } catch (error) {
    return {
      success: false,
      error:
        error.response?.data?.message ||
        "Login failed"
    };
  }
};

/* =====================================================
   REGISTER USER
===================================================== */
export const register = async (payload) => {
  try {
    const response = await api.auth.register(payload);

    return {
      success: true,
      message:
        response.message ||
        "Registration successful. Please wait for admin approval."
    };
  } catch (error) {
    return {
      success: false,
      error:
        error.response?.data?.message ||
        "Registration failed"
    };
  }
};

/* =====================================================
   LOGOUT USER
===================================================== */
export const logout = () => {
  localStorage.removeItem(AUTH_KEY);
};

/* =====================================================
   GET CURRENT USER
===================================================== */
export const getCurrentUser = () => {
  try {
    const data = localStorage.getItem(AUTH_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

/* =====================================================
   AUTH CHECK
===================================================== */
export const isAuthenticated = () => {
  const user = getCurrentUser();
  return Boolean(user?.access_token);
};

/* =====================================================
   ROLE CHECKS
===================================================== */
export const hasRole = (role) => {
  const user = getCurrentUser();
  return user?.role === role;
};

export const isAdmin = () => hasRole("admin");

export const isManager = () =>
  hasRole("manager") || isAdmin();

export const isStaff = () =>
  hasRole("staff") || isManager();

/* =====================================================
   USER BRANCH
===================================================== */
export const getUserBranch = () => {
  const user = getCurrentUser();
  return user?.branch_id || null;
};

/* =====================================================
   UPDATE PROFILE
===================================================== */
export const updateProfile = async (data) => {
  try {
    const response = await api.auth.updateProfile(data);

    const currentUser = getCurrentUser();

    const updatedUser = {
      ...currentUser,
      ...response
    };

    localStorage.setItem(
      AUTH_KEY,
      JSON.stringify(updatedUser)
    );

    return { success: true, user: updatedUser };
  } catch (error) {
    return {
      success: false,
      error:
        error.response?.data?.message ||
        "Profile update failed"
    };
  }
};

export default {
  login,
  register,
  logout,
  getCurrentUser,
  isAuthenticated,
  hasRole,
  isAdmin,
  isManager,
  isStaff,
  getUserBranch,
  updateProfile
};
