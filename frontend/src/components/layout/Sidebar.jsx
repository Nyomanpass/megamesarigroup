// components/layout/Sidebar.jsx
import { Home, BarChart2, FileText, Bell } from "lucide-react";

export default function Sidebar() {
  return (
    <div className="w-64 h-screen bg-[#1F1D2B] text-white flex flex-col p-5">
      
      {/* Logo */}
      <h1 className="text-2xl font-bold mb-8">Droitdash</h1>

      {/* Menu */}
      <div className="space-y-6">
        
        <div className="flex items-center gap-3 opacity-70 hover:opacity-100 cursor-pointer">
          <Home size={18} />
          <span>Dashboard</span>
        </div>

        <div className="flex items-center gap-3 opacity-70 hover:opacity-100 cursor-pointer">
          <BarChart2 size={18} />
          <span>Analytics</span>
        </div>

        <div className="flex items-center gap-3 opacity-70 hover:opacity-100 cursor-pointer">
          <FileText size={18} />
          <span>Documents</span>
        </div>

        <div className="flex items-center gap-3 opacity-70 hover:opacity-100 cursor-pointer">
          <Bell size={18} />
          <span>Notifications</span>
        </div>

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