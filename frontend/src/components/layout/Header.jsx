// components/layout/Header.jsx
import { Search, Settings, LogOut } from "lucide-react";

export default function Header({ user, onLogout }) {
  return (
    <div className="flex justify-center items-center bg-white p-4 shadow-sm">

      {/* Title */}
      <h2 className="text-xl font-semibold">Demo Sistem Monitoring Project - PT Mega Mesari Group</h2>


    </div>
  );
}