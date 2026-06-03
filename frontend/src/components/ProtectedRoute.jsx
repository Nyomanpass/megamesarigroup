import { Navigate } from "react-router-dom";
import { getAccessToken, getCurrentUser } from "../utils/auth";

export default function ProtectedRoute({ children, allowedRoles }) {
  const token = getAccessToken();

  // ❌ belum login
  if (!token) {
    return <Navigate to="/" />;
  }

  // 🔥 decode token
  const decoded = getCurrentUser();

  if (!decoded) {
    return <Navigate to="/" />;
  }

  // 🔥 kalau ada role restriction
  if (allowedRoles && !allowedRoles.includes(decoded.role)) {
    return <Navigate to="/dashboard" />;
  }

  return children;
}
