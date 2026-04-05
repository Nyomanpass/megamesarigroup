// components/layout/Sidebar.jsx
import { Home, BarChart2, FileText, Bell, Folder, LogOut } from "lucide-react";
import { NavLink } from "react-router-dom";

export default function Sidebar({ user, onLogout }) {
  return (
    <div className="w-64 h-screen bg-primary text-white flex flex-col p-5">

      {/* Logo */}
      <div className="mb-8 w-full flex items-center justify-center">
        <img src="/logo.webp" alt="logo megamesari" className="w-42" />
      </div>

      {/* Menu */}
      <div className="space-y-6">

        <NavLink to="/dashboard" className={({ isActive }) => `flex items-center gap-3 tracking-wide ${isActive ? 'text-secondary' : 'hover:text-secondary transition-all duration-300'} cursor-pointer`}>
          <Home size={18} />
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/project" className={({ isActive }) => `flex items-center gap-3 tracking-wide ${isActive ? 'text-secondary' : 'hover:text-secondary transition-all duration-300'} cursor-pointer`}>
          <Folder size={18} />
          <span>Projects</span>
        </NavLink>

        <NavLink to="/analytics" className={({ isActive }) => `flex items-center gap-3 tracking-wide ${isActive ? 'text-secondary' : 'hover:text-secondary transition-all duration-300'} cursor-pointer`}>
          <BarChart2 size={18} />
          <span>Analytics</span>
        </NavLink>

        <NavLink to="/documents" className={({ isActive }) => `flex items-center gap-3 tracking-wide ${isActive ? 'text-secondary' : 'hover:text-secondary transition-all duration-300'} cursor-pointer`}>
          <FileText size={18} />
          <span>Documents</span>
        </NavLink>

        <NavLink to="/notifications" className={({ isActive }) => `flex items-center gap-3 tracking-wide ${isActive ? 'text-secondary' : 'hover:text-secondary transition-all duration-300'} cursor-pointer`} >
          <Bell size={18} />
          <span>Notifications</span>
        </NavLink>

      </div>

      {/* User */}
      <div className="mt-auto bg-neutral text-text-primary p-4 rounded-lg flex justify-between items-center gap-3">
        <div>
          <p className="text-sm font-semibold">{user?.name}</p>
          <p className="text-xs">{user?.role}</p>
        </div>
        <button onClick={onLogout} className="size-10 bg-danger rounded-xl flex items-center justify-center cursor-pointer text-neutral hover:scale-95">
          <LogOut size={18} />
        </button>
      </div>

    </div>
  );
}