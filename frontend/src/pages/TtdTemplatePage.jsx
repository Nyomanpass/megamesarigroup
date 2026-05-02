import { useEffect, useState } from "react";
import api from "../api";
import { useParams, useNavigate } from "react-router-dom";
import { useProject } from "../context/ProjectContext";

export default function TtdTemplatePage() {
  const [tipe, setTipe] = useState("harian");
  const [layout, setLayout] = useState("");
  const { id: paramId } = useParams();
  const { selectedProject } = useProject();
  const projectId = selectedProject?.id || Number(paramId);
  const navigate = useNavigate();

  const fetchData = async () => {
  try {
    const res = await api.get(
      `/ttd?project_id=${projectId}&tipe=${tipe}`
    );

    if (res.data && res.data.layout) {
      setLayout(JSON.stringify(res.data.layout, null, 2));
    } else {
      setLayout("");
    }

  } catch (err) {
    console.log("Belum ada template");
    setLayout("");
  }
};

  useEffect(() => {
    fetchData();
  }, [projectId, tipe]);

const handleSave = async () => {
  try {
    const parsed = JSON.parse(layout);

    await api.post("/ttd/save", {
      project_id: Number(projectId),
      tipe_laporan: tipe,
      layout: parsed
    });

    alert("✅ Berhasil disimpan!");

  } catch (err) {
    console.log("ERROR SAVE:", err.response?.data || err.message); // 🔥 INI PENTING

    if (err instanceof SyntaxError) {
      alert("❌ JSON tidak valid!");
    } else {
      alert("❌ Gagal simpan ke server!");
    }
  }
};

  const handleDelete = async () => {
    if (!window.confirm("Yakin hapus?")) return;

    try {
      const res = await api.get(
        `/ttd?project_id=${projectId}&tipe=${tipe}`
      );

      await api.delete(`/ttd/${res.data.id}`);
      setLayout("");
      alert("Berhasil dihapus!");
    } catch {
      alert("Data tidak ditemukan");
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-xl font-bold mb-4">TTD Template Manager</h1>

      <div className="flex gap-4 mb-4">
        <select
          value={tipe}
          onChange={(e) => setTipe(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="harian">Harian</option>
          <option value="mingguan">Mingguan</option>
          <option value="bulanan">Bulanan</option>
           <option value="schedule">Schedule</option>
        </select>

        <button
          onClick={fetchData}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Load
        </button>
      </div>

      <textarea
        value={layout}
        onChange={(e) => setLayout(e.target.value)}
        rows={20}
        className="w-full border p-3 font-mono text-sm rounded"
      />

      <div className="flex gap-3 mt-4">
        <button
          onClick={handleSave}
          className="bg-green-500 text-white px-4 py-2 rounded"
        >
          Save
        </button>

        <button
          onClick={handleDelete}
          className="bg-red-500 text-white px-4 py-2 rounded"
        >
          Delete
        </button>

        <button 
          onClick={() => navigate("/dashboard")} 
          className="p-2.5 rounded bg-gray-500 text-white px-4 py-2 rounded"
        >
          Back
        </button>
      </div>
    </div>
  );
}