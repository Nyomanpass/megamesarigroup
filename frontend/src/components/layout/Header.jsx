// components/layout/Header.jsx
import { Search, Settings, LogOut } from "lucide-react";

export default function Header({ user, onLogout }) {
  return (
    <div className="flex justify-between items-center bg-white p-4 shadow-sm">
      
      {/* Title */}
      <h2 className="text-xl font-semibold">Viewer Demographics</h2>

      {/* Right Side */}
      <div className="flex items-center gap-4">

        {/* Search */}
        <div className="flex items-center border rounded px-3 py-2">
          <Search size={16} className="text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            className="ml-2 outline-none text-sm"
          />
        </div>

        {/* User Info */}
        <div className="text-sm text-right">
          <p className="font-semibold">ID: {user?.id}</p>
          <p className="text-gray-400">{user?.role}</p>
        </div>

        {/* Settings */}
        <button className="bg-purple-600 text-white p-2 rounded-lg">
          <Settings size={18} />
        </button>

        {/* Logout */}
        <button
          onClick={onLogout}
          className="bg-red-500 text-white p-2 rounded-lg"
        >
          <LogOut size={18} />
        </button>

      </div>
    </div>
  );
}