import { useEffect, useState } from "react";
import api from "../api";
import { useParams, useNavigate } from "react-router-dom";
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Blocks, 
  ArrowLeft, 
  Search,
  AlertTriangle,
  X
} from 'lucide-react';

export default function MaterialPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const tipe = "BAHAN";

  const [categories, setCategories] = useState([]);
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [masterItems, setMasterItems] = useState([]);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);

  const [form, setForm] = useState({
    nama: "",
    satuan: "",
    harga: "",
    category_id: ""
  });

  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState(null);
  
  const [showModal, setShowModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, itemName: "" });

  const fetchMasterItems = async () => {
    try {
      const res = await api.get(`/masteritem?tipe=${tipe}`);
      setMasterItems(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchData = async () => {
    try {
        const res = await api.get(`/project-items?project_id=${id}&tipe=${tipe}`);
        setData(res.data);
        setFilteredData(res.data);
    } catch (err) {
        console.error(err);
    }
  };

  const fetchCategories = async () => {
    try {
        const res = await api.get("/items/category");
        setCategories(res.data);
    } catch (err) {
        console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
    fetchCategories();
    fetchMasterItems();
  }, [id]);

  useEffect(() => {
      let filtered = data;
      if (searchTerm) {
          filtered = filtered.filter(item => 
              item.nama.toLowerCase().includes(searchTerm.toLowerCase())
          );
      }
      setFilteredData(filtered);
  }, [searchTerm, data]);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const openFormModal = (item = null) => {
      if (item) {
          setForm({
              nama: item.nama,
              satuan: item.satuan,
              harga: item.harga || "",
              category_id: item.category_id || ""
          });
          setEditId(item.id);
          setIsEdit(true);
      } else {
          setForm({ nama: "", satuan: "", harga: "", category_id: "" });
          setEditId(null);
          setIsEdit(false);
      }
      setShowModal(true);
  };

  const closeFormModal = () => {
      setShowModal(false);
      setTimeout(() => {
         setIsEdit(false);
         setEditId(null);
      }, 300);
  };

  const handleBulkCreate = async () => {
    try {
      await api.post("/project-items/bulk", {
        project_id: id,
        items: selectedItems
      });

      fetchData();
      setSelectedItems([]);
      setShowModal(false);

    } catch (err) {
      console.error(err);
      alert("Gagal bulk insert");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nama || !form.satuan) {
         alert("Nama material dan satuan wajib diisi!");
         return;
    }

    try {
        if (isEdit) {
            await api.put(`/project-items/${editId}`, form);
        } else {
            await api.post("/project-items", {
                ...form,
                tipe: tipe,
                project_id: id
            });
        }
        closeFormModal();
        fetchData();
    } catch (err) {
        console.error(err);
        alert("Gagal menyimpan data material.");
    }
  };

  const confirmDelete = (itemId, itemName) => {
      setDeleteModal({ isOpen: true, id: itemId, itemName });
  };

  const executeDelete = async () => {
      try {
          await api.delete(`/project-items/${deleteModal.id}`);
          fetchData();
          setDeleteModal({ isOpen: false, id: null, itemName: "" });
      } catch (err) {
          console.error(err);
          alert("Gagal menghapus data material.");
      }
  };

  const filteredMasterItems = masterItems.filter((master) => {
    return !data.some((item) => item.nama === master.nama);
  });

  return (
    <div className="p-6 bg-background min-h-screen text-text-primary">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div className="flex items-center gap-4">
          <button 
              onClick={() => navigate(`/project/${id}`)}
              className="p-2.5 bg-white border border-gray-200 text-gray-500 hover:text-primary hover:bg-gray-50 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
          >
              <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-primary flex items-center gap-3">
              <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100">
                  <Blocks className="w-7 h-7 text-secondary" />
              </div>
              Katalog Material (BAHAN)
            </h1>
            <p className="text-sm text-gray-500 mt-2 max-w-xl">
              Kelola data bahan khusus yang diestimasi dan dialokasikan pada project ini.
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => setShowBulkModal(true)}
            className="flex items-center gap-2 bg-blue-500 text-white px-5 py-2.5 rounded-xl font-bold"
          >
            Import dari Master
          </button>
            
        <button
            onClick={() => openFormModal()}
            className="flex items-center gap-2 bg-secondary hover:bg-[#e64a0f] text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm shadow-[#ff5511]/20 active:scale-95 whitespace-nowrap"
        >
            <Plus className="w-5 h-5" />
            Tambah Material
        </button>
        </div>
      </div>

      {/* TOOLBAR */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center mb-6">
        <div className="relative w-full md:max-w-lg">
            <Search size={20} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
                type="text" 
                placeholder="Cari nama material..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 px-2.5 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary transition-all text-sm"
            />
        </div>
        <div className="hidden md:block text-xs font-bold px-4 py-2 bg-gray-100 text-gray-600 rounded-lg border border-gray-200">
             {data.length} Item Terdaftar
        </div>
      </div>

      {/* TABLE SECTION */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100 text-gray-500 text-xs uppercase tracking-wider">
                <th className="p-5 font-bold">Nama Material</th>
                <th className="p-5 font-bold w-48 border-l border-gray-100">Kategori</th>
                <th className="p-5 font-bold w-32 border-l border-gray-100">Satuan</th>
                <th className="p-5 font-bold w-48 text-right border-l border-gray-100">Harga Jual (Rp)</th>
                <th className="p-5 font-bold text-center w-32 border-l border-gray-100">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {filteredData.map((item) => (
                <tr key={item.id} className="hover:bg-accent/40 transition-colors group">
                  <td className="p-5 font-medium text-text-primary">
                    <div className="flex items-center gap-2">
                        <Blocks className="w-4 h-4 text-gray-400" />
                        {item.nama}
                    </div>
                  </td>
                  <td className="p-5 text-gray-500 font-medium text-xs uppercase">
                      {item.category?.nama || "-"}
                  </td>
                  <td className="p-5 text-gray-600 font-medium">
                      <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md border border-gray-200 text-xs text-center w-full block">
                          {item.satuan}
                      </span>
                  </td>
                  <td className="p-5 text-right font-medium text-gray-700">
                      {Number(item.harga || 0).toLocaleString("id-ID")}
                  </td>
                  <td className="p-5">
                    <div className="flex justify-center items-center gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={() => openFormModal(item)}
                            className="p-2 text-info bg-info/5 hover:bg-info/15 hover:scale-105 rounded-lg transition-all border border-info/10"
                            title="Edit Material"
                        >
                            <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => confirmDelete(item.id, item.nama)}
                            className="p-2 text-danger bg-danger/5 hover:bg-danger/15 hover:scale-105 rounded-lg transition-all border border-danger/10"
                            title="Hapus Material"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-16 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-400">
                          <div className="bg-gray-50 p-4 rounded-full mb-3">
                            <Search className="w-10 h-10 text-gray-300" />
                          </div>
                          <p className="text-base font-semibold text-gray-600">Material Kosong</p>
                          <p className="text-sm mt-1 text-gray-500">Belum ada material yang ditambahkan atau ditemukan.</p>
                      </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    {showBulkModal && (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
        <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl">

          {/* HEADER */}
          <div className="p-5 border-b flex justify-between">
            <h2 className="text-lg font-bold">Import Material dari Master</h2>
            <button onClick={() => setShowBulkModal(false)}>✕</button>
          </div>

          {/* BODY */}
          <div className="p-5">
            <div className="max-h-60 overflow-y-auto border rounded-xl">

              {/* HEADER */}
              <div className="grid grid-cols-5 gap-2 bg-gray-100 p-2 text-xs font-bold text-gray-600">
                <div></div>
                <div>Nama</div>
                <div>Kategori</div>
                <div>Satuan</div>
                <div className="text-right">Harga</div>
              </div>

              {/* DATA */}
              {filteredMasterItems.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-5 gap-2 p-2 border-t items-center text-sm hover:bg-gray-50"
                >
                  {/* CHECKBOX */}
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedItems([...selectedItems, item]);
                      } else {
                        setSelectedItems(
                          selectedItems.filter((i) => i.id !== item.id)
                        );
                      }
                    }}
                  />

                  {/* NAMA */}
                  <div className="font-medium">{item.nama}</div>

                  {/* KATEGORI */}
                  <div className="text-gray-500 text-xs">
                    {item.ItemCategory?.nama || "-"}
                  </div>

                  {/* SATUAN */}
                  <div>{item.satuan}</div>

                  {/* HARGA */}
                  <div className="text-right font-medium">
                    Rp {Number(item.harga_default || 0).toLocaleString("id-ID")}
                  </div>
                </div>
              ))}

            </div>

            <p className="text-sm text-gray-500 mt-2">
              {selectedItems.length} item dipilih
            </p>
          </div>

          {/* FOOTER */}
          <div className="p-5 border-t flex justify-end gap-3">
            <button
              onClick={() => setShowBulkModal(false)}
              className="px-4 py-2 bg-gray-200 rounded-lg"
            >
              Batal
            </button>

            <button
              onClick={handleBulkCreate}
              className="px-4 py-2 bg-secondary text-white rounded-lg"
            >
              Import
            </button>
          </div>

        </div>
      </div>
    )}

      {/* --- FORM MODAL --- */}
      {showModal && (
        <div className="fixed inset-0 bg-primary/40 flex justify-center items-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-primary flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isEdit ? 'bg-info/10 text-info' : 'bg-secondary/10 text-secondary'}`}>
                  {isEdit ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                </div>
                {isEdit ? "Edit Material" : "Tambah Material"}
              </h2>
              <button onClick={closeFormModal} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-xl transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-4">
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Nama Material</label>
                  <input
                    type="text"
                    name="nama"
                    placeholder="Contoh: Semen Portland 50kg"
                    value={form.nama}
                    onChange={handleChange}
                    className="w-full border border-gray-200 bg-gray-50 p-3 rounded-xl focus:ring-2 focus:ring-secondary/30 focus:border-secondary focus:bg-white outline-none transition-all text-sm font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Kategori</label>
                    <select
                      name="category_id"
                      value={form.category_id}
                      onChange={handleChange}
                      className="w-full border border-gray-200 bg-gray-50 p-3 rounded-xl focus:ring-2 focus:ring-secondary/30 focus:border-secondary focus:bg-white outline-none transition-all text-sm font-medium cursor-pointer"
                    >
                      <option value="">-- Pilih Kategori --</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nama}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Satuan</label>
                    <input
                      type="text"
                      name="satuan"
                      placeholder="Contoh: Sak / M3"
                      value={form.satuan}
                      onChange={handleChange}
                      className="w-full border border-gray-200 bg-gray-50 p-3 rounded-xl focus:ring-2 focus:ring-secondary/30 focus:border-secondary focus:bg-white outline-none transition-all text-sm font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Harga Material / Dasar</label>
                  <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">Rp</span>
                      <input
                        type="number"
                        name="harga"
                        placeholder="0"
                        value={form.harga}
                        onChange={handleChange}
                        className="w-full border border-gray-200 bg-gray-50 p-3 pl-12 rounded-xl focus:ring-2 focus:ring-secondary/30 focus:border-secondary focus:bg-white outline-none transition-all text-sm font-medium"
                      />
                  </div>
                </div>

              </div>

              <div className="mt-8 flex justify-end gap-3 pt-5 border-t border-gray-100">
                <button type="button" onClick={closeFormModal} className="px-6 py-3 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold transition-colors">
                  Batal
                </button>
                <button type="submit" className="px-6 py-3 text-white bg-secondary hover:bg-[#e64a0f] rounded-xl font-bold transition-all shadow-sm active:scale-95">
                  {isEdit ? "Simpan Perbaikan" : "Simpan Data"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- DELETE CONFIRM MODAL --- */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-primary/60 flex justify-center items-center z-[60] p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-danger/10 text-danger rounded-full flex items-center justify-center mx-auto mb-4 border-8 border-danger/5">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Hapus Data?</h2>
              <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                Apakah Anda yakin ingin menghapus material<br />
                <span className="font-bold text-gray-800 text-base"> "{deleteModal.itemName}"</span>?
              </p>

              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setDeleteModal({ isOpen: false, id: null, itemName: "" })}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={executeDelete}
                  className="flex-1 py-3 bg-danger hover:bg-[#dc2626] text-white font-bold rounded-xl transition-all shadow-sm shadow-red-200 active:scale-95"
                >
                  Ya, Hapus
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}