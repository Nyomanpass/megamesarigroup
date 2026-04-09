import { useEffect, useState } from "react";
import api from "../api";
import { useParams, useNavigate } from "react-router-dom";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Hammer, 
  ArrowLeft, 
  Settings2, 
  Search 
} from 'lucide-react';

export default function PeralatanPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState([]);
  const [form, setForm] = useState({
    nama: "",
    satuan: "",
    harga: "",
    terbilang: 0
  });

  const [editId, setEditId] = useState(null);

  // 🔥 GET DATA ALAT
  const fetchData = async () => {
    const res = await api.get(
      `/project-items?project_id=${id}&tipe=ALAT`
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
        tipe: "ALAT"
      });
    } else {
      await api.post("/project-items", {
        ...form,
        tipe: "ALAT",
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
    if (window.confirm("Yakin hapus alat ini?")) {
      await api.delete(`/project-items/${itemId}`);
      fetchData();
    }
  };

  return (
   <div className="p-8 bg-slate-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-600 p-3 rounded-2xl shadow-lg shadow-emerald-200">
              <Hammer className="text-white" size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
                Katalog Peralatan
              </h1>
              <p className="text-sm text-slate-500 font-medium">Project ID: <span className="text-emerald-600">#{id}</span></p>
            </div>
          </div>

          <button
            onClick={() => navigate(`/project/${id}`)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm font-medium"
          >
            <ArrowLeft size={18} />
            Kembali
          </button>
        </div>

        {/* FORM CARD */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-8">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Settings2 size={16} />
            {editId ? "Mode Edit Alat" : "Tambah Alat Baru"}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <input
                name="nama"
                placeholder="Nama Alat (ex: Excavator)"
                value={form.nama}
                onChange={handleChange}
                className="w-full border border-slate-200 rounded-xl p-3 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all bg-slate-50/50"
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

            <div className="space-y-1">
              <input
                name="satuan"
                placeholder="Satuan (unit/jam)"
                value={form.satuan}
                onChange={handleChange}
                className="w-full border border-slate-200 rounded-xl p-3 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all bg-slate-50/50"
              />
            </div>

            <div className="space-y-1">
              <input
                name="harga"
                type="number"
                placeholder="Biaya Sewa"
                value={form.harga}
                onChange={handleChange}
                className="w-full border border-slate-200 rounded-xl p-3 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all bg-slate-50/50"
              />
            </div>

            <button
              onClick={handleSubmit}
              className={`w-full font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-100 active:scale-95 ${
                editId 
                ? "bg-amber-500 hover:bg-amber-600 text-white" 
                : "bg-emerald-600 hover:bg-emerald-700 text-white"
              }`}
            >
              {editId ? <Pencil size={18} /> : <Plus size={18} />}
              {editId ? "Update Alat" : "Tambah ke Katalog"}
            </button>
          </div>
        </div>

        {/* TABLE CARD */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-5 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
            <h3 className="font-bold text-slate-700">Daftar Inventaris Alat</h3>
            <div className="text-xs font-bold px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full">
              {data.length} Item Terdaftar
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-slate-400 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">Nama Alat</th>
                  <th className="px-6 py-4 font-semibold">Satuan</th>
                  <th className="px-6 py-4 font-semibold text-right">Biaya / Sewa</th>
                   <th className="px-6 py-4 font-semibold text-right">Terbilang</th>
                  <th className="px-6 py-4 font-semibold text-center">Aksi</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-50">
                {data.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="p-4 bg-slate-100 rounded-full text-slate-300">
                          <Search size={32} />
                        </div>
                        <p className="text-slate-400 font-medium">Belum ada alat yang ditambahkan</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  data.map((item) => (
                    <tr key={item.id} className="hover:bg-emerald-50/40 transition-colors group">
                      <td className="px-6 py-4 font-bold text-slate-700 uppercase text-sm italic">
                        {item.nama}
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-xs font-bold border border-slate-200">
                          {item.satuan}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-emerald-700">
                        Rp {Number(item.harga || 0).toLocaleString("id-ID")}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-emerald-700">
                        {item.terbilang}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center gap-2">
                          <button 
                            onClick={() => handleEdit(item)}
                            className="p-2 text-sky-600 hover:bg-sky-50 rounded-lg transition-all"
                          >
                            <Pencil size={18} />
                          </button>
                          <button 
                            onClick={() => handleDelete(item.id)}
                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
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
        </div>
        
      </div>
    </div>
  );
}