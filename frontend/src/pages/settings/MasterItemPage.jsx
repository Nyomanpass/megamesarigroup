import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2, Search, Package, X, Settings2, AlertTriangle, Blocks, Users, Wrench } from "lucide-react";
import api from "../../api";

const MasterItemPage = () => {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Tab State: TENAGA, BAHAN, ALAT
  const [activeTab, setActiveTab] = useState("TENAGA");

  const [categories, setCategories] = useState([]);

  const [importFile, setImportFile] = useState(null);

  // Modals state
  const [showItemModal, setShowItemModal] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, type: "", itemName: "" });

  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    nama: "",
    tipe: "TENAGA",
    satuan: "",
    harga: "",
    category: "",
    terbilang: 0
  });

  const [editCatId, setEditCatId] = useState(null);
  const [catForm, setCatForm] = useState({ nama: "" });

  const fetchData = async () => {
    try {
      const res = await api.get(`/masteritem`);
      setData(res.data);
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

  const handleImportExcel = async () => {
  try {
    if (!importFile) {
      alert("Pilih file dulu!");
      return;
    }

    const formData = new FormData();
    formData.append("file", importFile);
    formData.append("tipe", activeTab); // 🔥 otomatis dari tab

    const res = await api.post("/import-master", formData);

    alert(res.data.message);
    fetchData();
    setImportFile(null);

  } catch (err) {
    console.error(err);
    alert(err.response?.data?.message || "Import gagal!");
  }
};

  useEffect(() => {
    fetchData();
    fetchCategories();
  }, []);

  // Filter effect based strictly on Active Tab
  useEffect(() => {
    let filtered = data.filter(item => item.tipe === activeTab);

    if (searchTerm) {
      filtered = filtered.filter(item => item.nama.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    setFilteredData(filtered);
  }, [searchTerm, activeTab, data]);

  // ITEM HANDLERS
  const handleItemChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value,
      ...(name === "tipe" && value !== "BAHAN" && { category: "" })
    }));
  };

  const openItemModal = (item = null) => {
    if (item) {
      setForm({
        nama: item.nama,
        tipe: item.tipe,
        satuan: item.satuan,
        harga: item.harga,
        category: item.category || "",
        terbilang: item.terbilang || 0
      });
      setEditId(item.id);
    } else {
      setForm({
        nama: "",
        tipe: activeTab, // Otomatis sesuai tab yang aktif
        satuan: "",
        harga: "",
        category: "",
        terbilang: 0
      });
      setEditId(null);
    }
    setShowItemModal(true);
  };

  const closeItemModal = () => {
    setShowItemModal(false);
    setTimeout(() => setEditId(null), 300);
  };

  const validateItemForm = () => {
    if (!form.nama || !form.satuan || form.harga === "") return "Semua field wajib diisi!";
    if (form.tipe === "BAHAN" && !form.category) return "Kategori wajib dipilih untuk tipe BAHAN!";
    return null;
  };

  const submitItemForm = async (e) => {
    e.preventDefault();
    const error = validateItemForm();
    if (error) {
      alert(error);
      return;
    }

    try {
      const payload = {
        nama: form.nama,
        tipe: form.tipe,
        satuan: form.satuan,
        harga: Number(form.harga),
        category: form.tipe === "BAHAN" ? (form.category || "") : "",
        terbilang: form.tipe !== "BAHAN" ? Number(form.terbilang || 0) : 0
      };
      if (editId) {
        await api.put(`/masteritem/${editId}`, payload);
      } else {
        await api.post("/masteritem", payload);
      }
      closeItemModal();
      fetchData();
    } catch (err) {
      console.error(err);
      alert("Gagal menyimpan data barang.");
    }
  };

  // CATEGORY HANDLERS


  const submitCategory = async (e) => {
    e.preventDefault();
    if (!catForm.nama) {
      alert("Nama kategori wajib diisi!");
      return;
    }
    try {
      if (editCatId) {
        await api.put(`/items/category/${editCatId}`, catForm);
      } else {
        await api.post("/items/category", catForm);
      }
      setCatForm({ nama: "" });
      setEditCatId(null);
      fetchCategories();
    } catch (err) {
      console.error(err);
    }
  };

  // DELETE MODAL HANDLERS
  const confirmDelete = (id, type, itemName) => {
    setDeleteModal({ isOpen: true, id, type, itemName });
  };

  const executeDelete = async () => {
    try {
      if (deleteModal.type === 'item') {
        await api.delete(`/masteritem/${deleteModal.id}`);
        fetchData();
      } else if (deleteModal.type === 'category') {
        await api.delete(`/items/category/${deleteModal.id}`);
        fetchCategories();
      }
      setDeleteModal({ isOpen: false, id: null, type: "", itemName: "" });
    } catch (err) {
      console.error(err);
      alert("Gagal menghapus data.");
    }
  }

  const getTabDetails = () => {
    if (activeTab === "TENAGA") return { label: "Tenaga Kerja", icon: Users, btnColor: "bg-secondary hover:bg-transparent border-2 border-secondary hover:text-secondary", textColor: "text-[#0d202d]" };
    if (activeTab === "BAHAN") return { label: "Bahan Material", icon: Blocks, btnColor: "bg-[#ff5511] hover:bg-transparent border-2 border-[#ff5511] hover:text-[#ff5511]", textColor: "text-[#ff5511]" };
    return { label: "Peralatan", icon: Wrench, btnColor: "bg-secondary hover:bg-transparent border-2 border-secondary hover:text-secondary", textColor: "text-blue-600" };
  };

  const tabDetails = getTabDetails();

  return (
    <div className="p-6 bg-background min-h-screen text-text-primary">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-3">
            <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100">
              <Package className="w-7 h-7 text-secondary" />
            </div>
            Master Item
          </h1>
          <p className="text-sm text-gray-500 mt-2 max-w-xl">
            Sistem Master Data terpadu untuk pengelompokkan Tenaga Kerja, Material, dan Peralatan.
          </p>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex border-b border-gray-200 mb-6 gap-8 overflow-x-auto no-scrollbar">
        <button
          onClick={() => { setActiveTab("TENAGA"); setSearchTerm(""); }}
          className={`pb-4 text-[15px] font-bold flex items-center gap-2.5 transition-colors relative whitespace-nowrap ${activeTab === 'TENAGA' ? 'text-[#0d202d]' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <Users className={`w-5 h-5 ${activeTab === 'TENAGA' ? 'text-secondary' : ''}`} />
          Master Tenaga Kerja
          {activeTab === 'TENAGA' && <span className="absolute bottom-0 left-0 w-full h-1 bg-secondary rounded-t-full"></span>}
        </button>
        <button
          onClick={() => { setActiveTab("BAHAN"); setSearchTerm(""); }}
          className={`pb-4 text-[15px] font-bold flex items-center gap-2.5 transition-colors relative whitespace-nowrap ${activeTab === 'BAHAN' ? 'text-[#0d202d]' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <Blocks className={`w-5 h-5 ${activeTab === 'BAHAN' ? 'text-secondary' : ''}`} />
          Master Bahan Material
          {activeTab === 'BAHAN' && <span className="absolute bottom-0 left-0 w-full h-1 bg-secondary rounded-t-full"></span>}
        </button>
        <button
          onClick={() => { setActiveTab("ALAT"); setSearchTerm(""); }}
          className={`pb-4 text-[15px] font-bold flex items-center gap-2.5 transition-colors relative whitespace-nowrap ${activeTab === 'ALAT' ? 'text-[#0d202d]' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <Wrench className={`w-5 h-5 ${activeTab === 'ALAT' ? 'text-secondary' : ''}`} />
          Master Peralatan
          {activeTab === 'ALAT' && <span className="absolute bottom-0 left-0 w-full h-1 bg-secondary rounded-t-full"></span>}
        </button>
      </div>

      {/* Toolbar */}
      <div className="mt-4  flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
        <div className="relative w-full md:max-w-[50%]">
          <Search size={24} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-secondary" />
          <input
            type="text"
            placeholder={`Cari nama ${tabDetails.label.toLowerCase()}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 px-2.5 py-3.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary transition-all"
          />
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <div className="flex flex-col gap-2">
          <input 
            type="file" 
            onChange={(e) => setImportFile(e.target.files[0])}
            className="text-sm"
          />

          <button
            onClick={handleImportExcel}
            className="bg-green-500 text-white px-4 py-2 rounded-xl font-bold"
          >
            Import Excel
          </button>
        </div>
          <button
            onClick={() => openItemModal()}
            className={`flex items-center gap-2 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm active:scale-95 w-full md:w-auto justify-center ${tabDetails.btnColor}`}
          >
            <Plus className="w-5 h-5" />
            Tambah {tabDetails.label}
          </button>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100 text-gray-500 text-xs uppercase tracking-wider">
                <th className="p-5 font-bold">Nama Item</th>
                {activeTab === "BAHAN" && <th className="p-5 font-bold">Kategori</th>}
                <th className="p-5 font-bold">Satuan</th>
                {activeTab !== "BAHAN" && <th className="p-5 font-bold">Terbilang Kuota</th>}
                <th className="p-5 font-bold text-right">Harga Default</th>
                <th className="p-5 font-bold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {filteredData.map((item) => (
                <tr key={item.id} className="hover:bg-accent/40 transition-colors group">
                  <td className="p-5 font-bold text-text-primary">
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-lg opacity-70 ${activeTab === 'TENAGA' ? 'bg-info/10 text-info' :
                        activeTab === 'BAHAN' ? 'bg-success/10 text-success' : 'bg-warning/10 text-yellow-700'
                        }`}>
                        <tabDetails.icon className="w-4 h-4" />
                      </div>
                      {item.nama}
                    </div>
                  </td>

                  {activeTab === "BAHAN" && (
                    <td className="p-5">
                      <span className="text-xs text-gray-600 font-medium bg-gray-50 px-2.5 py-1 rounded-md border border-gray-200">
                        {item.category || "Uncategorized"}
                      </span>
                    </td>
                  )}

                  <td className="p-5 text-gray-600 font-medium">{item.satuan}</td>

                  {activeTab !== "BAHAN" && (
                    <td className="p-5 text-gray-600 font-medium">
                      <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded font-bold text-xs">
                        {item.terbilang || "-"}
                      </span>
                    </td>
                  )}

                  <td className="p-5 text-right font-bold text-text-primary text-[15px]">
                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(item.harga)}
                  </td>

                  <td className="p-5 text-center">
                    <div className="flex justify-center gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openItemModal(item)}
                        className="p-2 text-info bg-info/5 hover:bg-info/15 hover:scale-105 rounded-lg transition-all border border-info/10"
                        title="Edit Item"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => confirmDelete(item.id, 'item', item.nama)}
                        className="p-2 text-danger bg-danger/5 hover:bg-danger/15 hover:scale-105 rounded-lg transition-all border border-danger/10"
                        title="Hapus Item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={activeTab === "BAHAN" ? "5" : "5"} className="p-16 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <div className="bg-gray-50 p-4 rounded-full mb-3">
                        <tabDetails.icon className="w-10 h-10 text-gray-300" />
                      </div>
                      <p className="text-base font-semibold text-gray-600">Data {tabDetails.label} Kosong</p>
                      <p className="text-sm mt-1 text-gray-500">Silahkan tambah data baru atau sesuaikan filter pencarian.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODALS --- */}

      {/* Item Modal */}
      {showItemModal && (
        <div className="fixed inset-0 bg-primary/40 flex justify-center items-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-primary flex items-center gap-3">
                <div className={`p-2 rounded-lg ${editId ? 'bg-info/10 text-info' : 'bg-secondary/10 text-secondary'}`}>
                  {editId ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                </div>
                {editId ? `Edit Data ${tabDetails.label}` : `Tambah ${tabDetails.label}`}
              </h2>
              <button onClick={closeItemModal} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-xl transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={submitItemForm} className="p-6">
              <div className="space-y-5">

                {/* Hidden Tipe Input, forced bound to activeTab */}
                <input type="hidden" name="tipe" value={form.tipe} />

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Nama Item</label>
                  <input
                    type="text"
                    name="nama"
                    placeholder={`Contoh: ${activeTab === 'TENAGA' ? 'Tukang Kayu' : activeTab === 'BAHAN' ? 'Semen 50kg' : 'Excavator'}`}
                    value={form.nama}
                    onChange={handleItemChange}
                    className="w-full border border-gray-200 bg-gray-50 p-3.5 rounded-xl focus:ring-2 focus:ring-secondary/30 focus:border-secondary focus:bg-white outline-none transition-all text-sm font-medium"
                  />
                </div>

              {activeTab === "BAHAN" && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Kategori Bahan
                  </label>
                  <input
                    type="text"
                    name="category"
                    value={form.category}
                    onChange={handleItemChange}
                    placeholder="Contoh: Material"
                    className="w-full border border-gray-200 bg-gray-50 p-3.5 rounded-xl focus:ring-2 focus:ring-secondary/30 focus:border-secondary focus:bg-white outline-none transition-all text-sm font-medium"
                  />
                </div>
              )}

                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Satuan</label>
                    <input
                      type="text"
                      name="satuan"
                      placeholder={`Contoh: ${activeTab === 'TENAGA' ? 'Org/Hr' : activeTab === 'BAHAN' ? 'Sak' : 'Hari'}`}
                      value={form.satuan}
                      onChange={handleItemChange}
                      className="w-full border border-gray-200 bg-gray-50 p-3.5 rounded-xl focus:ring-2 focus:ring-secondary/30 focus:border-secondary focus:bg-white outline-none transition-all text-sm font-medium"
                    />
                  </div>

                  {activeTab !== "BAHAN" ? (
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Terbilang (Kuota)</label>
                      <input
                        name="terbilang"
                        type="number"
                        min="0"
                        placeholder="0"
                        value={form.terbilang}
                        onChange={handleItemChange}
                        className="w-full border border-gray-200 bg-gray-50 p-3.5 rounded-xl focus:ring-2 focus:ring-secondary/30 focus:border-secondary focus:bg-white outline-none transition-all text-sm font-medium"
                      />
                    </div>
                  ) : <div></div> /* Empty div to preserve grid layout if needed */}
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Harga Satuan Default (Rp)</label>
                  <input
                    type="number"
                    step="1"
                    name="harga"
                    placeholder="0"
                    value={form.harga}
                    onChange={handleItemChange}
                    className="w-full border border-gray-200 bg-gray-50 p-3.5 rounded-xl focus:ring-2 focus:ring-secondary/30 focus:border-secondary focus:bg-white outline-none transition-all text-right font-bold text-lg text-primary"
                  />
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3 pt-5 border-t border-gray-100">
                <button type="button" onClick={closeItemModal} className="px-6 py-3 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold transition-colors">
                  Batal
                </button>
                <button type="submit" className={`px-6 py-3 text-white rounded-xl font-bold transition-all shadow-sm active:scale-95 ${tabDetails.btnColor}`}>
                  {editId ? "Simpan Perbaikan" : "Simpan Data"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Modal - ONLY FOR BAHAN */}
      {showCatModal && activeTab === "BAHAN" && (
        <div className="fixed inset-0 bg-primary/40 flex justify-center items-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex justify-between items-center p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-primary flex items-center gap-2">
                <div className="bg-gray-100 p-2 rounded-lg">
                  <Settings2 className="w-5 h-5 text-gray-700" />
                </div>
                Kelola Kategori Bahan
              </h2>
              <button onClick={closeCatModal} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-xl transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1">
              <form onSubmit={submitCategory} className="mb-6 flex gap-2">
                <input
                  type="text"
                  placeholder="Ketik nama kategori..."
                  value={catForm.nama}
                  onChange={(e) => setCatForm({ nama: e.target.value })}
                  className="flex-1 border border-gray-200 bg-gray-50 p-3 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white outline-none transition-all text-sm font-medium"
                />
                <button type="submit" className="bg-primary hover:bg-gray-800 text-white px-5 py-3 rounded-xl font-bold transition-colors whitespace-nowrap shadow-sm">
                  {editCatId ? "Update" : "Tambah"}
                </button>
                {editCatId && (
                  <button type="button" onClick={() => { setEditCatId(null); setCatForm({ nama: "" }); }} className="bg-white border border-gray-200 text-gray-700 px-4 py-3 rounded-xl hover:bg-gray-50 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </form>

              <h3 className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider pl-1">Daftar Kategori Tersedia</h3>
              <div className="space-y-2">
                {categories.map((cat) => (
                  <div key={cat.id} className="flex justify-between items-center p-3.5 border border-gray-100 rounded-xl hover:bg-gray-50 hover:border-gray-200 transition-all group/cat">
                    <span className="font-bold text-gray-700 text-sm">{cat.nama}</span>
                    <div className="flex gap-1.5 opacity-0 group-hover/cat:opacity-100 transition-opacity">
                      <button onClick={() => { setCatForm({ nama: cat.nama }); setEditCatId(cat.id); }} className="p-1.5 text-info bg-info/5 hover:bg-info/15 rounded-lg border border-info/10">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => confirmDelete(cat.id, 'category', cat.nama)} className="p-1.5 text-danger bg-danger/5 hover:bg-danger/15 rounded-lg border border-danger/10">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                {categories.length === 0 && (
                  <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-100 rounded-xl bg-gray-50/50">
                    Belum ada data kategori
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-primary/60 flex justify-center items-center z-[60] p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-danger/10 text-danger rounded-full flex items-center justify-center mx-auto mb-4 border-8 border-danger/5">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Hapus Data?</h2>
              <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                Apakah Anda yakin ingin menghapus<br />
                <span className="font-bold text-gray-800 text-base"> "{deleteModal.itemName}"</span>?
                <br />Tindakan ini tidak dapat dikembalikan.
              </p>

              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setDeleteModal({ isOpen: false, id: null, type: "", itemName: "" })}
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
};

export default MasterItemPage;