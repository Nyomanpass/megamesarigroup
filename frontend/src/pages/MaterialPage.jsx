import { useEffect, useState } from "react";
import api from "../api";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Package, Plus, Save, Edit, Trash2 } from "lucide-react";

export default function MaterialPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState([]);
  const [form, setForm] = useState({
    nama: "",
    satuan: ""
  });

  const [editId, setEditId] = useState(null);

  const fetchData = async () => {
    const res = await api.get(`/materials/${id}`);
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

  const handleSubmit = async () => {
    if (!form.nama || !form.satuan) return;

    if (editId) {
      await api.put(`/materials/${editId}`, form);
    } else {
      await api.post("/materials", {
        ...form,
        project_id: id
      });
    }

    setForm({ nama: "", satuan: "" });
    setEditId(null);
    fetchData();
  };

  const handleEdit = (item) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setForm({
      nama: item.nama,
      satuan: item.satuan
    });
    setEditId(item.id);
  };

  const handleDelete = async (itemId) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus data material ini?")) {
      await api.delete(`/materials/${itemId}`);
      fetchData();
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* HEADER */}
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => navigate(`/project/${id}`)} 
          className="p-2.5 rounded-xl bg-white shadow flex items-center justify-center border border-gray-100 hover:bg-gray-50 transition-colors active:scale-95"
        >
          <ArrowLeft size={24} className="text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Package className="text-orange-500"/> Katalog Material
          </h1>
          <p className="text-sm text-gray-500">Kelola master data bahan yang akan dikonsumsi proyek</p>
        </div>
      </div>

      {/* FORM */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-orange-100 mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl pointer-events-none"></div>
        
        <h2 className="text-sm font-bold text-gray-800 uppercase tracking-widest mb-4 relative z-10 flex items-center gap-2">
          {editId ? <><Edit size={16} className="text-orange-500"/> Edit Material</> : <><Plus size={16} className="text-orange-500"/> Tambah Material Baru</>}
        </h2>
        
        <div className="flex flex-col md:flex-row gap-4 relative z-10 items-end">
          <div className="flex-1 w-full">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block">Nama Material / Bahan</label>
            <input
              type="text"
              name="nama"
              placeholder="Contoh: Semen Portland 50Kg"
              value={form.nama}
              onChange={handleChange}
              className="w-full border-2 border-gray-200 p-3 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all font-medium text-gray-800"
            />
          </div>

          <div className="md:w-1/3 w-full">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block">Satuan (UOM)</label>
            <input
              type="text"
              name="satuan"
              placeholder="ZAK, m3, bh"
              value={form.satuan}
              onChange={handleChange}
              className="w-full border-2 border-gray-200 p-3 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all font-medium text-gray-800"
            />
          </div>

          <button
            onClick={handleSubmit}
            className={`w-full md:w-auto px-8 py-3.5 rounded-xl font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 ${editId ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-gray-800 hover:bg-gray-900 text-white'}`}
          >
            {editId ? <Save size={18} /> : <Plus size={18} />}
            {editId ? "Update Data" : "Simpan"}
          </button>
          
          {editId && (
            <button
               onClick={() => { setEditId(null); setForm({nama: "", satuan: ""}); }}
               className="w-full md:w-auto px-6 py-3.5 rounded-xl font-bold transition-all border border-gray-200 text-gray-600 hover:bg-gray-50 active:scale-95 flex items-center justify-center"
            >
              Batal
            </button>
          )}
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
           <h3 className="font-bold text-gray-800">Daftar Material Proyek</h3>
           <span className="bg-orange-100 text-orange-700 text-xs font-bold px-3 py-1 rounded-full">{data.length} Item Tersimpan</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white text-gray-500 uppercase text-xs tracking-wider border-b border-gray-100">
              <tr>
                <th className="p-4 pl-6">Nama Material</th>
                <th className="p-4 text-center">Satuan UOM</th>
                <th className="p-4 text-right pr-6">Aksi Manage</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-50">
              {data.length === 0 ? (
                <tr>
                  <td colSpan="3" className="text-center p-12 text-gray-400 italic">
                    Belum ada material yang didaftarkan.
                  </td>
                </tr>
              ) : (
                data.map((item) => (
                  <tr key={item.id} className="hover:bg-orange-50/30 transition-colors group">
                    <td className="p-4 pl-6 font-bold text-gray-800">{item.nama}</td>
                    <td className="p-4 text-center">
                       <span className="bg-gray-100 text-gray-600 font-medium px-3 py-1 rounded-lg text-xs">{item.satuan}</span>
                    </td>
                    <td className="p-4 pr-6 flex justify-end gap-2">
                      <button
                        onClick={() => handleEdit(item)}
                        className="p-2 bg-white border border-gray-200 hover:border-orange-300 hover:bg-orange-50 text-gray-500 hover:text-orange-600 rounded-xl transition-colors shadow-sm"
                        title="Edit Data"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2 bg-white border border-gray-200 hover:border-red-300 hover:bg-red-50 text-gray-500 hover:text-red-600 rounded-xl transition-colors shadow-sm"
                        title="Hapus Data"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}