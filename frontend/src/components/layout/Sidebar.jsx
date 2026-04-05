// components/layout/Sidebar.jsx
import { Home, BarChart2, FileText, Bell } from "lucide-react";
import { NavLink } from "react-router-dom";

export default function Sidebar() {
  return (
    <div className="w-64 h-screen bg-primary text-white flex flex-col p-5">

      {/* Logo */}
      <div className="mb-8 w-full flex items-center justify-center">
        <img src="/logo.webp" alt="logo megamesari" className="w-42" />
      </div>

      {/* Menu */}
      <div className="space-y-6">

        <NavLink to="/dashboard" className="flex items-center gap-3 tracking-wide hover:text-secondary hover:opacity-100 cursor-pointer">
          <Home size={18} />
          <span>Dashboard</span>
        </NavLink>

        <NavLink to="/analytics" className="flex items-center gap-3 tracking-wide hover:text-secondary hover:opacity-100 cursor-pointer">
          <BarChart2 size={18} />
          <span>Analytics</span>
        </NavLink>

        <NavLink to="/documents" className="flex items-center gap-3 tracking-wide hover:text-secondary hover:opacity-100 cursor-pointer">
          <FileText size={18} />
          <span>Documents</span>
        </NavLink>

        <NavLink to="/notifications" className="flex items-center gap-3 tracking-wide hover:text-secondary hover:opacity-100 cursor-pointer">
          <Bell size={18} />
          <span>Notifications</span>
        </NavLink>

      </div>

      {/* User */}
      <div className="mt-auto bg-[#2A273F] p-4 rounded-lg flex items-center gap-3">
        <div className="w-10 h-10 bg-gray-400 rounded-full"></div>
        <div>
          <p className="text-sm font-semibold">WP.AR Pascal</p>
          <p className="text-xs text-gray-400">email@gmail.com</p>
        </div>
      </div>

    </div>
  );
}