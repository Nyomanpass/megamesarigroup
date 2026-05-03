import { useState } from "react";
import { Home, Box, Folder, Settings, ClipboardList, Calendar, Clock, TrendingUp, HardHat, Package, Briefcase, FileText, ClipboardCheck, ChevronDown, Cuboid, Hammer } from "lucide-react";
import { NavLink } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useProject } from "../../context/ProjectContext";

export default function Sidebar() {
  const { selectedProject } = useProject();
  const [isExpanded, setIsExpanded] = useState(false);

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
          `flex items-center gap-3  ${isActive ? "font-semibold text-secondary" : "hover:text-secondary"
          }`
        }>
          <Home size={18} />
          <span>Dashboard</span>
        </NavLink>

        {/* Project */}
        <NavLink to="/progress" className={({ isActive }) =>
          `flex items-center gap-3  ${isActive ? "font-semibold text-secondary" : "hover:text-secondary"
          }`
        }>
          <ClipboardCheck size={18} />
          <span>Daily Progress</span>
        </NavLink>

        <hr className="border-white/10 my-2" />

        {/* Project Modules (Visible if project selected) */}
        {selectedProject && (
          <div className="pt-2">
            <p className="text-xs uppercase text-gray-400 font-semibold mb-3 tracking-widest">
              Project Modules
            </p>
            <div className="space-y-4.5">
              <NavLink to="/boq" className={({ isActive }) => `flex items-center gap-3 tracking-wide ${isActive ? "text-secondary font-bold" : " hover:text-secondary"}`}>
                <ClipboardList size={16} /> <span>BOQ</span>
              </NavLink>
              <NavLink to="/schedule" className={({ isActive }) => `flex items-center gap-3 tracking-wide ${isActive ? "text-secondary font-bold" : " hover:text-secondary"}`}>
                <Calendar size={16} /> <span>Schedule</span>
              </NavLink>
              <NavLink to="/daily-plan" className={({ isActive }) => `flex items-center gap-3 tracking-wide ${isActive ? "text-secondary font-bold" : " hover:text-secondary"}`}>
                <Clock size={16} /> <span>Daily Plan</span>
              </NavLink>
              <NavLink to="/material" className={({ isActive }) => `flex items-center gap-3 tracking-wide ${isActive ? "text-secondary font-bold" : " hover:text-secondary"}`}>
                <Cuboid size={16} /> <span>Material</span>
              </NavLink>
              <NavLink to="/tenaga" className={({ isActive }) => `flex items-center gap-3 tracking-wide ${isActive ? "text-secondary font-bold" : " hover:text-secondary"}`}>
                <HardHat size={16} /> <span>Pekerja</span>
              </NavLink>
              <NavLink to="/peralatan" className={({ isActive }) => `flex items-center gap-3 tracking-wide ${isActive ? "text-secondary font-bold" : " hover:text-secondary"}`}>
                <Hammer size={16} /> <span>Peralatan</span>
              </NavLink>
              <NavLink to="/analisa" className={({ isActive }) => `flex items-center gap-3 tracking-wide ${isActive ? "text-secondary font-bold" : " hover:text-secondary"}`}>
                <FileText size={16} /> <span>AHSP Proyek</span>
              </NavLink>
            </div>
          </div>
        )}

        <hr className="border-white/10 my-2" />
        <p className="text-xs uppercase text-gray-400 font-semibold mb-3 tracking-widest pt-2">
          Laporan Proyek
        </p>
        <motion.button onClick={() => setIsExpanded(!isExpanded)} className="w-full flex items-center justify-between gap-3 hover:text-secondary cursor-pointer">
          <div className="flex items-center gap-3">
            <FileText size={16} />
            <p>Laporan Proyek</p>
          </div>
          <ChevronDown size={16} className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />

        </motion.button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-2 space-y-3 pl-7"
            >
              <NavLink to="/laporan-harian" className={({ isActive }) => `flex items-center gap-3 tracking-wide ${isActive ? "text-secondary" : "hover:text-secondary"}`}>
                <span>Laporan Harian</span>
              </NavLink>
              <NavLink to="/laporan-mingguan" className={({ isActive }) => `flex items-center gap-3 tracking-wide ${isActive ? "text-secondary" : "hover:text-secondary"}`}>
                <span>Laporan Mingguan</span>
              </NavLink>
              <NavLink to="/laporan-bulanan" className={({ isActive }) => `flex items-center gap-3 tracking-wide ${isActive ? "text-secondary" : "hover:text-secondary"}`}>
                <span>Laporan Bulanan</span>
              </NavLink>
            </motion.div>
          )}
        </AnimatePresence>

        <hr className="border-white/10 my-2" />

        {/* Section Settings */}
        <div className="pt-2">
          <p className="text-xs uppercase text-gray-400 font-semibold mb-3 tracking-widest">
            Global Settings
          </p>

          <NavLink to="/settings/masteritem" className={({ isActive }) =>
            `flex items-center gap-3 tracking-wide py-2 ${isActive ? "text-secondary" : "hover:text-secondary"
            }`
          }>
            <Box size={18} />
            <span>Master Item</span>
          </NavLink>

          {/* Analisa Master */}
          <NavLink to="/settings/analisa" className={({ isActive }) =>
            `flex items-center gap-3 tracking-wide py-2 ${isActive ? "text-secondary" : "hover:text-secondary"
            }`
          }>
            <ClipboardList size={18} />
            <span>Master AHSP</span>
          </NavLink>
        </div>

      </div>
    </div>
  );
}