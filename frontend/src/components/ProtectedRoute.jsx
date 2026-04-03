import { Navigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

export default function ProtectedRoute({ children, allowedRoles }) {
  const token = localStorage.getItem("accessToken");

  // ❌ belum login
  if (!token) {
    return <Navigate to="/" />;
  }

  // 🔥 decode token
  const decoded = jwtDecode(token);

  // 🔥 kalau ada role restriction
  if (allowedRoles && !allowedRoles.includes(decoded.role)) {
    return <Navigate to="/dashboard" />;
  }

  return children;
}