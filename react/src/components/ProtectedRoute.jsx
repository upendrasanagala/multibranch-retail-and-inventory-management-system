import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children, role }) {
  const user = JSON.parse(localStorage.getItem("loggedInUser"));

  // Not logged in
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Role not allowed
  if (role && user.role !== role) {
    return <Navigate to="/login" replace />;
  }

  // Access granted
  return children;
}
