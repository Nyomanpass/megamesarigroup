import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useProject } from "../context/ProjectContext";
import { Plus, Trash2, Edit2, ArrowLeft, AlertTriangle, X, Users, Blocks, Wrench, Calculator } from "lucide-react";
import api from "../api";
import { m, AnimatePresence } from 'framer-motion';

const ProjectAnalisaDetailPage = () => {
  const { id: paramId, analisaId } = useParams();
  const { selectedProject } = useProject();
  const projectId = selectedProject?.id || paramId;
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [items, setItems] = useState([]);

  // Modals state
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(""); // "TENAGA", "BAHAN", "ALAT"
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState(null);

  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, itemName: "" });

  const [form, setForm] = useState({
    item_id: "",
    koefisien: ""
  });

  const [searchItemQuery, setSearchItemQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // 🔹 GET ANALISA DETAIL
  const fetchDetail = async () => {
    try {
      const res = await api.get(`/project-analisa-detail/${analisaId}`);
      setData(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // 🔹 GET PROJECT ITEM
  const fetchItems = async () => {
    try {
      const res = await api.get(`/project-items?project_id=${projectId}`);
      setItems(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDetail();
    fetchItems();
  }, [projectId, analisaId]);

  // 🔹 MODAL HANDLERS
  const openModal = (type, item = null) => {
    setModalType(type);
    if (item) {
      setForm({
        item_id: item.item_id || item.id, // Pastikan id item benar dari respons API
        koefisien: item.koefisien
      });
      setEditId(item.detail_id || item.id); // Tergantung struktur ID dari backend untuk row analisa-detail
      setSearchItemQuery(item.nama || "");
      setIsEdit(true);
    } else {
      setForm({ item_id: "", koefisien: "" });
      setEditId(null);
      setSearchItemQuery("");
      setIsEdit(false);
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setTimeout(() => {
      setIsEdit(false);
      setEditId(null);
      setModalType("");
      setIsDropdownOpen(false);
    }, 300);
  };

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.item_id || !form.koefisien) {
      alert("Pilih item dan masukan koefisien terlebih dahulu!");
      return;
    }

    try {
      if (isEdit) {
        // Update
        await api.put(`/project-analisa-detail/${editId}`, {
          item_id: form.item_id,
          koefisien: form.koefisien
        });
      } else {
        // Create
        await api.post("/project-analisa-detail", {
          project_analisa_id: analisaId,
          item_id: form.item_id,
          koefisien: form.koefisien
        });
      }

      closeModal();
      fetchDetail();
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan saat menyimpan detail.");
    }
  };

  const confirmDelete = (detailId, itemName) => {
    setDeleteModal({ isOpen: true, id: detailId, itemName });
  };

  const executeDelete = async () => {
    try {
      await api.delete(`/project-analisa-detail/${deleteModal.id}`);
      setDeleteModal({ isOpen: false, id: null, itemName: "" });
      fetchDetail();
    } catch (err) {
      console.error(err);
      alert("Gagal menghapus item dari analisa.");
    }
  };

  const filteredItems = items.filter(item => item.tipe === modalType);

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-secondary mb-4"></div>
        <p className="text-gray-500 font-medium">Memuat Data Analisa Project...</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-background min-h-screen text-text-primary">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/analisa")}
            className="p-2.5 bg-white border border-gray-200 text-gray-500 hover:text-primary hover:bg-gray-50 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-primary flex items-center gap-3">
              {data?.nama || "Detail Analisa"}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Atur koefisien Tenaga, Bahan, dan Alat khusus dalam lingkup Project ini.
            </p>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-md shadow-sm border border-gray-100 overflow-hidden mb-8">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-muted-gray">
                <th className="p-4 font-semibold">Uraian / Nama Item</th>
                <th className="p-4 font-semibold text-center w-24">Satuan</th>
                <th className="p-4 font-semibold text-center w-32">Koefisien</th>
                <th className="p-4 font-semibold text-right w-40">Harga Satuan (Rp)</th>
                <th className="p-4 font-semibold text-right w-48">Jumlah Harga (Rp)</th>
                <th className="p-4 font-semibold text-center w-28">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">

              {/* ================= TENAGA ================= */}
              <tr className="bg-gray-50/80 group">
                <td colSpan="5" className="p-4">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2 font-bold text-secondary text-base">
                      <Users className="w-5 h-5" />
                      A. TENAGA KERJA
                    </div>
                  </div>
                </td>
                <td className="p-3 text-center">
                  <button
                    onClick={() => openModal("TENAGA")}
                    className="bg-secondary/10 hover:bg-secondary text-secondary hover:text-white px-3 py-2 rounded-lg font-bold transition-colors flex items-center shadow-sm w-full justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Tambah
                  </button>
                </td>
              </tr>

              {data.tenaga?.map((item) => (
                <tr key={item.id} className="hover:bg-accent/20 transition-colors group">
                  <td className="p-4 pl-10 font-medium text-gray-800">{item.nama}</td>
                  <td className="p-4 text-center text-gray-500">{item.satuan}</td>
                  <td className="p-4 text-center font-bold text-gray-700">{item.koefisien}</td>
                  <td className="p-4 text-right">{item.harga?.toLocaleString('id-ID')}</td>
                  <td className="p-4 text-right font-medium">{item.jumlah?.toLocaleString('id-ID')}</td>
                  <td className="p-4 text-center">
                    <div className="flex gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openModal("TENAGA", item)} className="p-2 text-info bg-info/5 hover:bg-info/15 hover:scale-105 rounded-lg transition-all border border-info/10" title="Edit Tenaga"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => confirmDelete(item.id, item.nama)} className="p-2 text-danger bg-danger/5 hover:bg-danger/15 hover:scale-105 rounded-lg transition-all border border-danger/10" title="Hapus Tenaga"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {(!data.tenaga || data.tenaga.length === 0) && (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-gray-400 italic font-medium bg-white">Belum ada rincian tenaga kerja.</td>
                </tr>
              )}
              <tr className="bg-blue-50/50">
                <td colSpan="4" className="p-3 pr-4 text-right font-bold text-blue-900 border-t border-blue-100 uppercase text-xs">Jumlah Harga Tenaga (A)</td>
                <td className="p-3 text-right font-bold text-blue-700 border-t border-blue-100 text-[15px]">{data.totalTenaga?.toLocaleString('id-ID')}</td>
                <td className="border-t border-blue-100"></td>
              </tr>


              {/* ================= BAHAN ================= */}
              <tr className="bg-gray-50/80 group">
                <td colSpan="5" className="p-4 border-t border-gray-200">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2 font-bold text-secondary text-base">
                      <Blocks className="w-5 h-5" />
                      B. BAHAN MATERIAL
                    </div>
                  </div>
                </td>
                <td className="p-3 text-center border-t border-gray-200">
                  <button
                    onClick={() => openModal("BAHAN")}
                    className="bg-secondary/10 hover:bg-secondary text-secondary hover:text-white px-3 py-2 rounded-lg font-bold transition-colors flex items-center shadow-sm w-full justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Tambah
                  </button>
                </td>
              </tr>

              {data.bahan?.map((item) => (
                <tr key={item.id} className="hover:bg-accent/20 transition-colors group">
                  <td className="p-4 pl-10 font-medium text-gray-800">{item.nama}</td>
                  <td className="p-4 text-center text-gray-500">{item.satuan}</td>
                  <td className="p-4 text-center font-bold text-gray-700">{item.koefisien}</td>
                  <td className="p-4 text-right">{item.harga?.toLocaleString('id-ID')}</td>
                  <td className="p-4 text-right font-medium">{item.jumlah?.toLocaleString('id-ID')}</td>
                  <td className="p-4 text-center">
                    <div className="flex gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openModal("BAHAN", item)} className="p-2 text-info bg-info/5 hover:bg-info/15 hover:scale-105 rounded-lg transition-all border border-info/10" title="Edit Bahan"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => confirmDelete(item.id, item.nama)} className="p-2 text-danger bg-danger/5 hover:bg-danger/15 hover:scale-105 rounded-lg transition-all border border-danger/10" title="Hapus Bahan"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {(!data.bahan || data.bahan.length === 0) && (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-gray-400 italic font-medium bg-white">Belum ada rincian bahan material.</td>
                </tr>
              )}
              <tr className="bg-green-50/50">
                <td colSpan="4" className="p-3 pr-4 text-right font-bold text-green-900 border-t border-green-100 uppercase text-xs">Jumlah Harga Bahan (B)</td>
                <td className="p-3 text-right font-bold text-green-700 border-t border-green-100 text-[15px]">{data.totalBahan?.toLocaleString('id-ID')}</td>
                <td className="border-t border-green-100"></td>
              </tr>


              {/* ================= ALAT ================= */}
              <tr className="bg-gray-50/80 group">
                <td colSpan="5" className="p-4 border-t border-gray-200">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2 font-bold text-secondary text-base">
                      <Wrench className="w-5 h-5" />
                      C. PERALATAN
                    </div>
                  </div>
                </td>
                <td className="p-3 text-center border-t border-gray-200">
                  <button
                    onClick={() => openModal("ALAT")}
                    className="bg-secondary/10 hover:bg-secondary text-secondary hover:text-white px-3 py-2 rounded-lg font-bold transition-colors flex items-center shadow-sm w-full justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Tambah
                  </button>
                </td>
              </tr>

              {data.alat?.map((item) => (
                <tr key={item.id} className="hover:bg-accent/20 transition-colors group">
                  <td className="p-4 pl-10 font-medium text-gray-800">{item.nama}</td>
                  <td className="p-4 text-center text-gray-500">{item.satuan}</td>
                  <td className="p-4 text-center font-bold text-gray-700">{item.koefisien}</td>
                  <td className="p-4 text-right">{item.harga?.toLocaleString('id-ID')}</td>
                  <td className="p-4 text-right font-medium">{item.jumlah?.toLocaleString('id-ID')}</td>
                  <td className="p-4 text-center">
                    <div className="flex gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openModal("ALAT", item)} className="p-2 text-info bg-info/5 hover:bg-info/15 hover:scale-105 rounded-lg transition-all border border-info/10" title="Edit Alat"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => confirmDelete(item.id, item.nama)} className="p-2 text-danger bg-danger/5 hover:bg-danger/15 hover:scale-105 rounded-lg transition-all border border-danger/10" title="Hapus Alat"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {(!data.alat || data.alat.length === 0) && (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-gray-400 italic font-medium bg-white">Belum ada rincian peralatan.</td>
                </tr>
              )}
              <tr className="bg-yellow-50/50">
                <td colSpan="4" className="p-3 pr-4 text-right font-bold text-yellow-900 border-t border-yellow-200 uppercase text-xs">Jumlah Harga Alat (C)</td>
                <td className="p-3 text-right font-bold text-yellow-700 border-t border-yellow-200 text-[15px]">{data.totalAlat?.toLocaleString('id-ID')}</td>
                <td className="border-t border-yellow-200"></td>
              </tr>


              {/* ================= SUMMARY SECTION ================= */}
              <tr className="bg-white font-bold border-t-2 border-gray-300">
                <td colSpan="4" className="p-4 text-right uppercase text-xs text-gray-700">Jumlah Harga Tenaga, Bahan dan Alat (A + B + C)</td>
                <td className="p-4 text-right text-[15px] text-gray-800">{data.total?.toLocaleString('id-ID')}</td>
                <td></td>
              </tr>
              <tr className="bg-white font-bold border-t border-gray-200">
                <td colSpan="4" className="p-4 text-right uppercase text-xs text-gray-700">Overhead & Profit</td>
                <td className="p-4 text-right text-[15px] text-gray-800">{data.overhead?.toLocaleString('id-ID')}</td>
                {/* <td></td> */}
              </tr>
              <tr className="bg-secondary/70 text-white font-bold ">
                <td colSpan="4" className="p-4 text-right uppercase tracking-wider text-sm">F. Harga Satuan Pekerjaan (D + E)</td>
                <td className="p-4 text-right text-lg">{data.grandTotal?.toLocaleString('id-ID')}</td>
                <td></td>
              </tr>

            </tbody>
          </table>
        </div>
      </div>

      {/* --- ADD/EDIT MODAL --- */}
      <AnimatePresence>
        {showModal && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 flex justify-center items-center z-50 p-4">
            <m.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="bg-white w-full max-w-lg rounded-md overflow-hidden ">
              <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50">
                <div className="size-6"></div>
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-3">
                  {isEdit ? `Edit ${modalType}` : `Tambah ${modalType}`}
                </h2>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-xl transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6">
                <div className="space-y-5">

                  <div className="relative">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Item Project</label>

                    <div className="relative">
                      <input
                        type="text"
                        placeholder={`-- Ketik nama ${modalType.toLowerCase()} --`}
                        value={searchItemQuery}
                        onChange={(e) => {
                          setSearchItemQuery(e.target.value);
                          setIsDropdownOpen(true);
                          if (form.item_id) {
                            setForm({ ...form, item_id: "" });
                          }
                        }}
                        onFocus={() => setIsDropdownOpen(true)}
                        className="w-full border border-gray-200  p-3.5 rounded-md focus:ring-2 focus:ring-secondary/30 focus:border-secondary bg-white outline-none transition-all text-sm font-medium"
                      />
                      <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                      </div>
                    </div>

                    {/* Dropdown List */}
                    {isDropdownOpen && (
                      <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
                        {filteredItems.filter(i => i.nama.toLowerCase().includes(searchItemQuery.toLowerCase())).map((item) => (
                          <div
                            key={item.id}
                            className="px-4 py-3 hover:bg-accent/40 cursor-pointer border-b border-gray-50 last:border-0"
                            onMouseDown={(e) => {
                              // Mencegah input kehilangan fokus terlalu cepat
                              e.preventDefault();
                              setForm({ ...form, item_id: item.id });
                              setSearchItemQuery(item.nama);
                              setIsDropdownOpen(false);
                            }}
                          >
                            <div className="font-bold text-gray-800 text-sm">{item.nama}</div>
                            <div className="text-xs text-gray-500 mt-1 flex gap-2">
                              <span className="font-medium bg-gray-100 px-2 py-0.5 rounded">Satuan: {item.satuan}</span>
                              <span className="text-gray-400 font-medium">Rp {item.harga?.toLocaleString('id-ID')}</span>
                            </div>
                          </div>
                        ))}
                        {filteredItems.filter(i => i.nama.toLowerCase().includes(searchItemQuery.toLowerCase())).length === 0 && (
                          <div className="px-4 py-5 text-sm text-gray-500 text-center flex flex-col items-center">
                            <svg className="w-8 h-8 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            Data tidak ditemukan
                          </div>
                        )}
                      </div>
                    )}

                    {filteredItems.length === 0 && (
                      <p className="text-xs text-danger mt-2 flex items-center gap-1.5 p-2 bg-danger/5 rounded-lg border border-danger/10">
                        <AlertTriangle className="w-4 h-4" /> Data item {modalType.toLowerCase()} project benar-benar kosong. Silakan tambah data di Item Project.
                      </p>
                    )}


                    {isDropdownOpen && (
                      <div
                        className="fixed inset-0 z-[5]"
                        onClick={() => setIsDropdownOpen(false)}
                      ></div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Koefisien / Indeks Pekerjaan</label>
                    <input
                      type="number"
                      step="0.0001"
                      min="0"
                      name="koefisien"
                      placeholder="Contoh: 0.15"
                      value={form.koefisien}
                      onChange={handleChange}
                      className="w-full border border-gray-200  p-3.5 rounded focus:ring-2 focus:ring-secondary/30 focus:border-secondary bg-white outline-none transition-all font-medium"
                    />
                  </div>

                </div>

                <div className="mt-8 flex justify-end gap-3 pt-5 border-t border-gray-100">
                  <button type="button" onClick={closeModal} className="px-5 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md font-semibold transition-colors cursor-pointer">
                    Batal
                  </button>
                  <button type="submit" className={`px-5 py-2.5 text-white rounded-md font-semibold transition-all shadow-sm active:scale-95 bg-secondary hover:bg-[#e64a0f]`}>
                    {isEdit ? "Simpan Perbaikan" : `Tambah ${modalType}`}
                  </button>
                </div>
              </form>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>

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

    </div>
  );
};

export default ProjectAnalisaDetailPage;
