import { LogOut, User, FolderOpen } from "lucide-react";
import { useProject } from "../../context/ProjectContext";
import { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";

export default function Header() {
  const { selectedProject } = useProject();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      const decoded = jwtDecode(token);
      setUser(decoded);
    }
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  return (
    <div className="flex justify-between items-center bg-white p-4 px-6 shadow-sm border-b border-gray-100">

      {/* Title & Selected Project */}
      <div className="flex items-center gap-6">
        <div>
          <h2 className="text-lg font-bold text-primary leading-tight">
            Dashboard
          </h2>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
            Mega Mesari Group
          </p>
        </div>

        {selectedProject && (
          <div className="h-10 w-[1px] bg-gray-200"></div>
        )}

        {selectedProject && (
          <div className="flex items-center gap-3 bg-accent/30 px-4 py-2 rounded-xl border border-accent/50 animate-in fade-in slide-in-from-left-4">
             <div className="bg-accent p-1.5 rounded-lg text-secondary shadow-sm">
                <FolderOpen size={16} />
             </div>
             <div>
                <p className="text-[10px] font-black text-secondary uppercase tracking-tight -mb-1">Active Project</p>
                <p className="text-sm font-bold text-primary max-w-[300px] truncate">{selectedProject.pekerjaan}</p>
             </div>
          </div>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-4">

        {/* User Info */}
        <div className="text-right hidden sm:block">
          <p className="text-sm font-black text-primary leading-none mb-1">{user?.name || "User"}</p>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{user?.role || "Administrator"}</p>
        </div>

        {/* Icon User */}
        <div className="w-10 h-10 rounded-2xl bg-secondary/10 flex items-center justify-center border border-secondary/20 shadow-sm">
          <User size={20} className="text-secondary" />
        </div>

        {/* Logout */}
        <button 
          onClick={handleLogout}
          className="w-10 h-10 bg-white hover:bg-red-50 border border-gray-200 text-gray-400 hover:text-red-500 rounded-2xl flex items-center justify-center transition-all shadow-sm active:scale-90"
          title="Logout"
        >
          <LogOut size={18} />
        </button>

      </div>
    </div>
  );
}