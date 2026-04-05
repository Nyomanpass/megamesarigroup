import { Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import api from "../../api";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function Layout() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      const decoded = jwtDecode(token);
      setUser(decoded);
    }
  }, []);

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem("refreshToken");
      if (refreshToken) {
        await api.post("/auth/logout", { refreshToken });
      }
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      localStorage.clear();
      window.location.href = "/";
    }
  };

  return (
    <div className="flex h-screen overflow-hidden font-roboto">

      {/* SIDEBAR */}
      <Sidebar user={user} onLogout={handleLogout} />

      {/* MAIN CONTENT */}
      <div className="flex-1 bg-background overflow-y-auto">

        <Header />

        <div className="p-6 max-w-350 mx-auto">
          <Outlet />
        </div>

      </div>
    </div>
  );
}