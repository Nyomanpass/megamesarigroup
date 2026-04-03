import { jwtDecode } from "jwt-decode";
import { useEffect, useState } from "react";
import api from "../api";
import Layout from "../components/layout/Layout";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("accessToken");

    if (token) {
      const decoded = jwtDecode(token);
      setUser(decoded);
    }

    // 🔥 GET PROJECT
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await api.get("/projects");
      setProjects(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem("refreshToken");

      await api.post("/auth/logout", { refreshToken });

      localStorage.clear();
      window.location.href = "/";
    } catch (err) {
      localStorage.clear();
      window.location.href = "/";
    }
  };

  return (
    <Layout user={user} onLogout={handleLogout}>
      
      <div className="text-xl font-semibold mb-4">
        📊 Dashboard Project
      </div>

      {/* LIST PROJECT */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((proj) => (
          <div
            key={proj.id}
            onClick={() => navigate(`/project/${proj.id}`)}
            className="bg-white p-4 rounded-xl shadow hover:shadow-lg cursor-pointer transition"
          >
            <div className="font-bold text-lg">
              {proj.pekerjaan}
            </div>
            <div className="text-sm text-gray-500">
              {proj.lokasi}
            </div>
            <div className="mt-2 text-xs text-gray-400">
              Tahun: {proj.tahun}
            </div>
          </div>
        ))}
      </div>

    </Layout>
  );
}