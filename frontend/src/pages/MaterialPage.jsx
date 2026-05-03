import { useEffect, useState } from "react";
import api from "../api";
import { useParams, useNavigate } from "react-router-dom";
import { useProject } from "../context/ProjectContext";
import { motion } from "motion/react"
import {
  Plus,
  Edit2,
  Trash2,
  Blocks,
  ArrowLeft,
  Search,
  AlertTriangle,
  X,
  Upload,
  Database,
  CheckCircle,
} from 'lucide-react';
import { useRef } from 'react';
import { m, AnimatePresence } from 'framer-motion';

export default function MaterialPage() {
  const { id: paramId } = useParams();
  const { selectedProject } = useProject();
  const id = selectedProject?.id || paramId;
  const projectId = id;
  const navigate = useNavigate();
  const tipe = "BAHAN";

  const [categories, setCategories] = useState([]);
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [masterItems, setMasterItems] = useState([]);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [importFile, setImportFile] = useState(null);

  const fileInputRef = useRef(null);

  const handleUploadClick = () => {
    fileInputRef.current.click();
  };

  const [form, setForm] = useState({
    nama: "",
    satuan: "",
    harga: "",
    category: ""
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

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedItems(filteredMasterItems);
    } else {
      setSelectedItems([]);
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

  const handleImportExcel = async () => {
    try {
      if (!importFile) {
        alert("Pilih file dulu!");
        return;
      }

      const formData = new FormData();
      formData.append("file", importFile);
      formData.append("tipe", "BAHAN"); // 🔥 wajib BAHAN
      formData.append("project_id", id);

      const res = await api.post("/import", formData);

      alert(res.data.message);

      fetchData(); // refresh tabel
      setImportFile(null);

    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Import gagal!");
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
        category: item.category || "" // 🔥 ganti ini
      });
      setEditId(item.id);
      setIsEdit(true);
    } else {
      setForm({
        nama: "",
        satuan: "",
        harga: "",
        category: "" // 🔥 ganti ini juga
      });
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
      setShowBulkModal(false);

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
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="p-6 bg-background min-h-screen text-text-primary"
    >
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigate("/dashboard")}
          className="p-2.5 rounded-xl bg-white shadow-sm border border-gray-100 text-gray-600 hover:text-secondary hover:border-secondary transition-all active:scale-95 cursor-pointer"
        >
          <ArrowLeft size={24} />
        </button>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex flex-col items-end relative">

            <input type="file" accept=".xlsx,.xls" hidden ref={fileInputRef} onChange={(e) => setImportFile(e.target.files[0])} />

            {importFile && <p className="absolute -top-6 w-max whitespace-nowrap text-sm text-gray-500 text-right">{importFile.name}</p>}

            {importFile ? (
              <button onClick={handleImportExcel} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded font-semibold transition-all active:scale-95">
                <CheckCircle size={18} /> Simpan Data
              </button>
            ) : (
              <button onClick={handleUploadClick} className="flex items-center gap-2 bg-secondary text-white px-5 py-2.5 rounded font-semibold transition-all hover:bg-white hover:text-secondary border-2 border-transparent hover:border-secondary active:scale-95">
                <Upload size={18} /> Upload Excel
              </button>
            )}

          </div>

          {/* Import Excel */}



          <button
            onClick={() => setShowBulkModal(true)}
            className="flex items-center gap-2 bg-secondary text-white px-5 py-2.5 rounded font-semibold transition-all hover:bg-white hover:text-secondary border-2 border-transparent hover:border-secondary active:scale-95"
          >
            <Database size={18} /> Import Master
          </button>


        </div>
      </div>
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-primary flex items-center gap-3">
              Katalog Material (BAHAN)
            </h1>
            <p className="text-gray-500 mt-2 max-w-xl">
              Kelola data bahan khusus yang diestimasi dan dialokasikan pada project ini.
            </p>
          </div>
        </div>


      </div>

      <div className="hidden md:block ml-auto w-max mb-2 text-xs font-bold px-4 py-2 bg-gray-100 text-gray-600 rounded-lg border border-gray-200">
        {data.length} Item Terdaftar
      </div>
      {/* TOOLBAR */}
      <div className="bg-white p-4 rounded-md shadow-sm border border-gray-100 flex justify-between items-center gap-4 mb-6">
        <div className="relative w-full ">
          <Search size={20} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Cari nama material..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 px-2.5 py-3 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary transition-all text-sm"
          />
        </div>
        <button
          onClick={() => openFormModal()}
          className="flex items-center gap-2 cursor-pointer bg-secondary text-white border-2 border-tranpanret hover:bg-transparent hover:text-secondary transition-all bg-border-secondary px-5 py-2.5 rounded-md font-bold transition-all shadow-sm active:scale-95 whitespace-nowrap"
        >
          <Plus size={24} />
          Tambah Material
        </button>

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
                    {item.category || "-"}
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

      <AnimatePresence>
        {showBulkModal && (
          <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <m.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} className="bg-white w-full max-w-2xl rounded-md">

              {/* HEADER */}
              <div className="p-5 border-b border-muted-gray flex justify-between">
                <h2 className="text-lg font-semibold">Import Material dari Master</h2>
                <button className="hover:text-secondary cursor-pointer" onClick={() => setShowBulkModal(false)}>✕</button>
              </div>

              {/* BODY */}
              <div className="p-5">
                <div className="max-h-60 overflow-y-auto">
                  <div className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={
                        selectedItems.length === filteredMasterItems.length &&
                        filteredMasterItems.length > 0
                      }
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                    <span className="text-xs">All</span>
                  </div>
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
                        checked={selectedItems.some(i => i.id === item.id)}
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
                        {item.category || "-"}
                      </div>

                      {/* SATUAN */}
                      <div>{item.satuan}</div>

                      {/* HARGA */}
                      <div className="text-right font-medium">
                        Rp {Number(item.harga || 0).toLocaleString("id-ID")}
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
                  className="px-5 py-2.5 bg-white border border-gray-200 rounded-md hover:bg-gray-100 font-semibold cursor-pointer transition-all active:scale-95"
                >
                  Batal
                </button>

                <button
                  onClick={handleBulkCreate}
                  className="px-5 py-2.5 bg-secondary hover:bg-secondary/90 transition-all active:scale-95 text-white rounded-md font-semibold cursor-pointer"
                >
                  Import
                </button>
              </div>

            </m.div>
          </m.div>
        )}
      </AnimatePresence>

      {/* --- FORM MODAL --- */}
      <AnimatePresence>
        {showModal && (
          <m.div transition={{ duration: 0.1 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 flex justify-center items-center z-50 p-4">
            <m.div transition={{ duration: 0.3 }} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} className="bg-white w-full max-w-xl rounded-md overflow-hidden">
              <div className="flex justify-between items-center p-6 border-b border-gray-100">
                <div className="size-6"></div>
                <h2 className="text-xl font-semibold text-primary flex items-center gap-3">

                  {isEdit ? "Edit Material" : "Tambah Material"}
                </h2>
                <button onClick={closeFormModal} className="cursor-pointer text-gray-400 hover:text-secondary hover:bg-gray-100 p-2 rounded-xl transition-all">
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
                      className="w-full border border-gray-200 bg-gray-50 p-3 rounded focus:ring-2 focus:ring-secondary/30 focus:border-secondary bg-transparent outline-none transition-all text-sm font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        Kategori
                      </label>
                      <input
                        type="text"
                        name="category"
                        value={form.category}
                        onChange={handleChange}
                        placeholder="Contoh: Material"
                        className="w-full border border-gray-200 bg-gray-50 p-3 rounded focus:ring-2 focus:ring-secondary/30 focus:border-secondary bg-transparent outline-none transition-all text-sm font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Satuan</label>
                      <input
                        type="text"
                        name="satuan"
                        placeholder="Contoh: Sak / M3"
                        value={form.satuan}
                        onChange={handleChange}
                        className="w-full border border-gray-200 bg-gray-50 p-3 rounded focus:ring-2 focus:ring-secondary/30 focus:border-secondary bg-transparent outline-none transition-all text-sm font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Harga Material / Dasar</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-gray-400">Rp</span>
                      <input
                        type="number"
                        name="harga"
                        placeholder="0"
                        value={form.harga}
                        onChange={handleChange}
                        className="w-full border border-gray-200 bg-gray-50 p-3 pl-12 rounded focus:ring-2 focus:ring-secondary/30 focus:border-secondary focus:bg-white outline-none transition-all text-sm font-medium"
                      />
                    </div>
                  </div>

                </div>

                <div className="mt-8 flex justify-end gap-3 pt-5 border-t border-gray-100">
                  <button type="button" onClick={closeFormModal} className="px-5 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md font-semibold transition-colors cursor-pointer">
                    Batal
                  </button>
                  <button type="submit" className="px-5 py-2.5 text-white bg-secondary hover:bg-secondary/90 rounded-md font-semibold transition-all cursor-pointer">
                    {isEdit ? "Simpan Perbaikan" : "Simpan Data"}
                  </button>
                </div>
              </form>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>

      {/* --- DELETE CONFIRM MODAL --- */}

      <AnimatePresence>
        {/* --- DELETE CONFIRM MODAL --- */}
        {deleteModal.isOpen && (
          <m.div transition={{ duration: 0.1 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 flex justify-center items-center z-[60] p-4 ">
            <m.div transition={{ duration: 0.3 }} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} className="bg-white w-full max-w-lg rounded-md overflow-hidden ">
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-danger/10 text-danger rounded-md flex items-center justify-center mx-auto mb-4 border-8 border-danger/5">
                  <AlertTriangle className="w-7 h-7" />
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Hapus Data?</h2>
                <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                  Apakah Anda yakin ingin menghapus pekerja<br />
                  <span className="font-bold text-gray-800 text-base"> "{deleteModal.itemName}"</span>?
                </p>

                <div className="flex gap-3 w-full">
                  <button
                    onClick={() => setDeleteModal({ isOpen: false, id: null, itemName: "" })}
                    className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-md transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    onClick={executeDelete}
                    className="flex-1 py-3 bg-danger hover:bg-[#dc2626] text-white font-semibold rounded-md transition-all shadow-sm shadow-red-200 active:scale-95 cursor-pointer"
                  >
                    Ya, Hapus
                  </button>
                </div>
              </div>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}