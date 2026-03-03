import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ToastProvider } from "./components/ToastContext";
import { ConfirmProvider } from "./components/ConfirmContext";

import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ResetPassword from "./pages/ResetPassword";

import AdminDashboard from "./pages/dashboards/AdminDashboard";
import StaffDashboard from "./pages/staff/StaffDashboard";
import ManagerDashboard from "./pages/manager/ManagerDashboard";

import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";

import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <BrowserRouter>
          <Routes>

            {/* PUBLIC */}
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />

            {/* STAFF */}
            <Route
              path="/staff"
              element={
                <ProtectedRoute role="staff">
                  <StaffDashboard />
                </ProtectedRoute>
              }
            />

            {/* MANAGER */}
            <Route
              path="/manager"
              element={
                <ProtectedRoute role="manager">
                  <ManagerDashboard />
                </ProtectedRoute>
              }
            />

            {/* ADMIN */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute role="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

          </Routes>
        </BrowserRouter>
      </ConfirmProvider>
    </ToastProvider>
  );
}

export default App;
