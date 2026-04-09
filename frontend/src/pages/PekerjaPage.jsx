import { useEffect, useState } from "react";
import api from "../api";
import { useParams, useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, HardHat } from 'lucide-react'; // Opsional: Tambahkan library lucide-react untuk ikon

export default function PekerjaPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState([]);
  const [form, setForm] = useState({
    nama: "",
    satuan: "",
    harga: "",
    terbilang:0,
  });

  const [editId, setEditId] = useState(null);

  // 🔥 GET DATA TENAGA
  const fetchData = async () => {
    const res = await api.get(
      `/project-items?project_id=${id}&tipe=TENAGA`
    );
    setData(res.data);
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  // 🔥 SUBMIT
  const handleSubmit = async () => {
    if (!form.nama) return;

    if (editId) {
      await api.put(`/project-items/${editId}`, {
        ...form,
        tipe: "TENAGA"
      });
    } else {
      await api.post("/project-items", {
        ...form,
        tipe: "TENAGA",
        project_id: id
      });
    }

    setForm({ nama: "", satuan: "", harga: "", terbilang:0 });
    setEditId(null);
    fetchData();
  };

  // 🔥 EDIT
  const handleEdit = (item) => {
    setForm({
      nama: item.nama,
      satuan: item.satuan,
      harga: item.harga,
      terbilang: item.terbilang
    });

    setEditId(item.id);
  };

  // 🔥 DELETE
  const handleDelete = async (itemId) => {
    if (window.confirm("Yakin hapus?")) {
      await api.delete(`/project-items/${itemId}`);
      fetchData();
    }
  };

  return (
  <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-5xl mx-auto">
        
        {/* HEADER SECTION */}
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-blue-600 p-2 rounded-lg">
            <HardHat className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Katalog Tenaga Kerja</h1>
            <p className="text-sm text-gray-500">Kelola daftar upah dan satuan tenaga kerja proyek</p>
          </div>
        </div>

        {/* FORM SECTION (Card Style) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-600 uppercase">Nama Tenaga</label>
              <input
                name="nama"
                placeholder="Contoh: Tukang Kayu"
                value={form.nama}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-600 uppercase">
                Terbilang (Kebutuhan)
              </label>
              <input
                name="terbilang"
                type="number"
                min="1"
                placeholder="Contoh: 1 / 2 / 3"
                value={form.terbilang}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-600 uppercase">Satuan</label>
              <input
                name="satuan"
                placeholder="Hari / Jam"
                value={form.satuan}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-600 uppercase">Upah (Rp)</label>
              <input
                name="harga"
                type="number"
                placeholder="0"
                value={form.harga}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={handleSubmit}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                {editId ? <Pencil size={18} /> : <Plus size={18} />}
                {editId ? "Update Data" : "Tambah Tenaga"}
              </button>
            </div>
          </div>
        </div>

        {/* TABLE SECTION */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold text-gray-600 uppercase">Nama Tenaga</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-600 uppercase">Satuan</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-600 uppercase">Upah Kerja</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-600 uppercase">Terbilang</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-600 uppercase text-center">Aksi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-50">
              {data.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-10 text-center text-gray-400 italic">
                    Belum ada data tenaga kerja tersedia.
                  </td>
                </tr>
              ) : (
                data.map((item) => (
                  <tr key={item.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-6 py-4 font-medium text-gray-700">{item.nama}</td>
                    <td className="px-6 py-4">
                      <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-semibold">
                        {item.satuan}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-700 font-semibold">
                      Rp {Number(item.harga || 0).toLocaleString("id-ID")}
                    </td>
                    <td className="px-6 py-4 text-gray-700 font-semibold">
                      {item.terbilang}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        <button 
                          onClick={() => handleEdit(item)}
                          className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Pencil size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(item.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Hapus"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* FOOTER INFO */}
        <p className="mt-4 text-xs text-center text-gray-400">
          Total Tenaga Kerja Terdaftar: <span className="font-bold text-gray-600">{data.length}</span>
        </p>
      </div>
    </div>
  );
}