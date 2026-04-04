import { jwtDecode } from "jwt-decode";
import { useEffect, useState } from "react";
import api from "../api";
import Layout from "../components/layout/Layout";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);


  const [form, setForm] = useState({
    kegiatan: "",
    pekerjaan: "",
    no_kontrak: "",
    tgl_kontrak: "",
    no_spmk: "",
    tgl_spmk: "",
    end_date: "",
    kontraktor: "",
    konsultan: "",
    waktu_pelaksanaan: "",
    nilai_kontrak: "",
    lokasi: "",
    tahun: ""
  });


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

const handleSubmit = async (e) => {
  e.preventDefault();

  try {
    const payload = {
      ...form,

      // 🔥 FIX NUMBER
      waktu_pelaksanaan: Number(form.waktu_pelaksanaan || 0),
      nilai_kontrak: Number(form.nilai_kontrak || 0),
      tahun: Number(form.tahun || 0),

      // 🔥 FIX DATE (biar tidak error)
      tgl_kontrak: form.tgl_kontrak || null,
      tgl_spmk: form.tgl_spmk || null,
      end_date: form.end_date || null
    };

    console.log("SEND:", payload); // 🔥 DEBUG

    await api.post("/projects", payload);

    setShowModal(false);
    fetchProjects();

    // reset form
    setForm({
      kegiatan: "",
      pekerjaan: "",
      no_kontrak: "",
      tgl_kontrak: "",
      no_spmk: "",
      tgl_spmk: "",
      end_date: "",
      kontraktor: "",
      konsultan: "",
      waktu_pelaksanaan: "",
      nilai_kontrak: "",
      lokasi: "",
      tahun: ""
    });

  } catch (err) {
    console.error("ERROR:", err.response?.data || err.message);
    alert("Gagal tambah project");
  }
};

  return (
    <Layout user={user} onLogout={handleLogout}>
      
      <div className="text-xl font-semibold mb-4">
        📊 Dashboard Project
      </div>

      <button
        onClick={() => setShowModal(true)}
        className="mb-4 bg-blue-600 text-white px-4 py-2 rounded"
      >
        ➕ Tambah Project
      </button>

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

    {showModal && (
  <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">

    <div className="bg-white p-6 rounded-xl w-full max-w-2xl">

      <h2 className="text-xl font-bold mb-4">
        ➕ Tambah Project
      </h2>

      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4 text-sm">

        {/* KEGIATAN */}
        <div>
          <label className="block mb-1 font-medium">Kegiatan</label>
          <input
            value={form.kegiatan}
            onChange={e => setForm({...form, kegiatan: e.target.value})}
            className="border p-2 rounded w-full"
          />
        </div>

        {/* PEKERJAAN */}
        <div>
          <label className="block mb-1 font-medium">Pekerjaan</label>
          <input
            value={form.pekerjaan}
            onChange={e => setForm({...form, pekerjaan: e.target.value})}
            className="border p-2 rounded w-full"
          />
        </div>

        {/* NO KONTRAK */}
        <div>
          <label className="block mb-1 font-medium">No Kontrak</label>
          <input
            value={form.no_kontrak}
            onChange={e => setForm({...form, no_kontrak: e.target.value})}
            className="border p-2 rounded w-full"
          />
        </div>

        {/* TGL KONTRAK */}
        <div>
          <label className="block mb-1 font-medium">Tanggal Kontrak</label>
          <input
            type="date"
            value={form.tgl_kontrak}
            onChange={e => setForm({...form, tgl_kontrak: e.target.value})}
            className="border p-2 rounded w-full"
          />
        </div>

        {/* NO SPMK */}
        <div>
          <label className="block mb-1 font-medium">No SPMK</label>
          <input
            value={form.no_spmk}
            onChange={e => setForm({...form, no_spmk: e.target.value})}
            className="border p-2 rounded w-full"
          />
        </div>

        {/* TGL SPMK */}
        <div>
          <label className="block mb-1 font-medium">Tanggal SPMK</label>
          <input
            type="date"
            value={form.tgl_spmk}
            onChange={e => setForm({...form, tgl_spmk: e.target.value})}
            className="border p-2 rounded w-full"
          />
        </div>

        {/* END DATE */}
        <div>
          <label className="block mb-1 font-medium">Tanggal Selesai</label>
          <input
            type="date"
            value={form.end_date}
            onChange={e => setForm({...form, end_date: e.target.value})}
            className="border p-2 rounded w-full"
          />
        </div>

        {/* KONTRAKTOR */}
        <div>
          <label className="block mb-1 font-medium">Kontraktor</label>
          <input
            value={form.kontraktor}
            onChange={e => setForm({...form, kontraktor: e.target.value})}
            className="border p-2 rounded w-full"
          />
        </div>

        {/* KONSULTAN */}
        <div>
          <label className="block mb-1 font-medium">Konsultan</label>
          <input
            value={form.konsultan}
            onChange={e => setForm({...form, konsultan: e.target.value})}
            className="border p-2 rounded w-full"
          />
        </div>

        {/* WAKTU */}
        <div>
          <label className="block mb-1 font-medium">Waktu Pelaksanaan (Hari)</label>
          <input
            type="number"
            value={form.waktu_pelaksanaan}
            onChange={e => setForm({...form, waktu_pelaksanaan: e.target.value})}
            className="border p-2 rounded w-full"
          />
        </div>

        {/* NILAI */}
        <div>
          <label className="block mb-1 font-medium">Nilai Kontrak</label>
          <input
            type="number"
            value={form.nilai_kontrak}
            onChange={e => setForm({...form, nilai_kontrak: e.target.value})}
            className="border p-2 rounded w-full"
          />
        </div>

        {/* LOKASI */}
        <div className="col-span-2">
          <label className="block mb-1 font-medium">Lokasi</label>
          <input
            value={form.lokasi}
            onChange={e => setForm({...form, lokasi: e.target.value})}
            className="border p-2 rounded w-full"
          />
        </div>

        {/* TAHUN */}
        <div>
          <label className="block mb-1 font-medium">Tahun</label>
          <input
            type="number"
            value={form.tahun}
            onChange={e => setForm({...form, tahun: e.target.value})}
            className="border p-2 rounded w-full"
          />
        </div>

        {/* BUTTON */}
        <div className="col-span-2 flex justify-end gap-2 mt-3">
          <button
            type="button"
            onClick={() => setShowModal(false)}
            className="px-4 py-2 bg-gray-400 text-white rounded"
          >
            Batal
          </button>

          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            Simpan
          </button>
        </div>

      </form>
    </div>
  </div>
)}

    </Layout>
  );
}