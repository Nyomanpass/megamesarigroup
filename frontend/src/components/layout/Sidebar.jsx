import { useState } from "react";
import { Home, Box, Folder, Settings, ClipboardList } from "lucide-react"; // Tambah Box untuk icon Master Item
import { NavLink } from "react-router-dom";

export default function Sidebar() {
  return (
    <div className="w-64 h-screen bg-primary text-white flex flex-col p-5">

      {/* Logo */}
      <div className="mb-8 w-full flex items-center justify-center">
        <img src="/logo.webp" alt="logo megamesari" className="w-72" />
      </div>

      {/* Menu */}
      <div className="space-y-4">

        {/* Dashboard */}
        <NavLink to="/dashboard" className={({ isActive }) =>
          `flex items-center gap-3 tracking-wide ${
            isActive ? "text-secondary" : "hover:text-secondary"
          }`
        }>
          <Home size={18} />
          <span>Dashboard</span>
        </NavLink>

        {/* Project */}
        <NavLink to="/project" className={({ isActive }) =>
          `flex items-center gap-3 tracking-wide ${
            isActive ? "text-secondary" : "hover:text-secondary"
          }`
        }>
          <Folder size={18} />
          <span>Projects</span>
        </NavLink>

        <hr className="border-white/10 my-2" />

        {/* Section Settings */}
        <div className="pt-2">
          <p className="text-xs uppercase text-gray-400 font-semibold mb-3 tracking-widest">
            Settings
          </p>
          
          <NavLink to="/settings/masteritem" className={({ isActive }) =>
            `flex items-center gap-3 tracking-wide ${
              isActive ? "text-secondary" : "hover:text-secondary"
            }`
          }>
            <Box size={18} />
            <span>Master Item</span>
          </NavLink>

          {/* Analisa Master */}
          <NavLink to="/settings/analisa" className={({ isActive }) =>
            `flex items-center gap-3 tracking-wide ${
              isActive ? "text-secondary" : "hover:text-secondary"
            }`
          }>
            <ClipboardList size={18} />
            <span>Analisa Master</span>
          </NavLink>
        </div>

      </div>
    </div>
  );
}