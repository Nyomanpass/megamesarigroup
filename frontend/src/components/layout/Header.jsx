import { LogOut, User } from "lucide-react";

export default function Header({ user, onLogout }) {
  return (
    <div className="flex justify-between items-center bg-white p-4 shadow-sm">

      {/* Title */}
      <div>
        <h2 className="text-xl font-semibold">
          Project Monitoring System
        </h2>
        <p className="text-xs text-gray-400">
          PT Mega Mesari Group • v1.0
        </p>
      </div>

      {/* Right */}
      <div className="flex items-center gap-4">

        {/* User Info */}
        <div className="text-right">
          <p className="text-sm font-semibold">{user?.name}</p>
          <p className="text-xs text-gray-400">{user?.role}</p>
        </div>

        {/* Icon User */}
        <div className="w-9 h-9 rounded-xl bg-secondary/20 flex items-center justify-center">
          <User size={18} className="text-secondary" />
        </div>

        {/* Logout */}
        <button 
          onClick={onLogout}
          className="w-9 h-9 bg-danger hover:bg-danger/90 rounded-xl flex items-center justify-center text-white transition hover:scale-95"
        >
          <LogOut size={16} />
        </button>

      </div>
    </div>
  );
}