import { Outlet } from "react-router-dom";
import { useMemo } from "react";
import api from "../../api";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { getCurrentUser, getRefreshToken, logoutToLogin } from "../../utils/auth";

export default function Layout() {
  const user = useMemo(() => getCurrentUser(), []);

  const handleLogout = async () => {
    try {
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        await api.post("/auth/logout", { refreshToken });
      }
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      logoutToLogin();
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
          <Outlet context={{ user }} />
        </div>

      </div>
    </div>
  );
}
