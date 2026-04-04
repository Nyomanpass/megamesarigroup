import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api";
import Layout from "../components/layout/Layout";
import { jwtDecode } from "jwt-decode";

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");

    if (token) {
      const decoded = jwtDecode(token);
      setUser(decoded);
    }

    fetchProject();
  }, [id]);

  const fetchProject = async () => {
    const res = await api.get(`/projects/${id}`);
    setProject(res.data);
  };

  const handleLogout = async () => {
    localStorage.clear();
    window.location.href = "/";
  };

  return (
    <Layout user={user} onLogout={handleLogout}>
      <div className="p-6">

        {/* 🔥 INFO PROJECT */}
        <h1 className="text-2xl font-bold mb-2">
          {project?.pekerjaan}
        </h1>

        <div className="text-gray-600 mb-6">
          📍 {project?.lokasi} <br />
          📅 Tahun: {project?.tahun} <br />
          🏗️ Kontraktor: {project?.kontraktor}
        </div>

        {/* 🔥 MENU FITUR */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">

          <button
            onClick={() => navigate(`/project/${id}/boq`)}
            className="bg-blue-500 text-white p-4 rounded-lg"
          >
            📊 BOQ
          </button>

          <button
            onClick={() => navigate(`/project/${id}/schedule`)}
            className="bg-red-500 text-white p-4 rounded-lg"
          >
            📅 Schedule
          </button>

          <button
            onClick={() => navigate(`/project/${id}/daily-plan`)}
            className="bg-green-500 text-white p-4 rounded-lg"
          >
            📅 Daily Plan
          </button>

          <button
            onClick={() => navigate(`/project/${id}/progress`)}
            className="bg-yellow-500 text-white p-4 rounded-lg"
          >
            📈 Daily Progress
          </button>

          <button
            onClick={() => navigate(`/project/${id}/laporan-harian`)}
            className="bg-purple-500 text-white p-4 rounded-lg"
          >
            📄 Laporan Harian
          </button>

          <button
            onClick={() => navigate(`/project/${id}/laporan-mingguan`)}
            className="bg-indigo-500 text-white p-4 rounded-lg"
          >
            📊 Laporan Mingguan
          </button>

          <button
            onClick={() => navigate(`/project/${id}/laporan-bulanan`)}
            className="bg-pink-500 text-white p-4 rounded-lg"
          >
            📅 Laporan Bulanan
          </button>

          <button
            onClick={() => navigate(`/project/${id}/material`)}
            className="bg-gray-700 text-white p-4 rounded-lg"
          >
            🧱 Material
          </button>

          <button
            onClick={() => navigate(`/project/${id}/tenaga`)}
            className="bg-black text-white p-4 rounded-lg"
          >
            👷 Tenaga Kerja
          </button>

          <button
            onClick={() => navigate(`/project/${id}/peralatan`)}
            className="bg-blue-500 text-white p-4 rounded-lg"
          >
            🛠️ Peralatan
          </button>

        </div>

      </div>
    </Layout>
  );
}