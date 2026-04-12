import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2, Search, ArrowRight, X, AlertTriangle, Calculator, FileSpreadsheet, ArrowLeft } from "lucide-react";
import api from "../api";
import { useParams, useNavigate } from "react-router-dom";

const ProjectAnalisaPage = () => {
  const { id } = useParams(); // project_id
  const navigate = useNavigate();

  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, itemName: "" });

  const [formMaster, setFormMaster] = useState({
    kode: "",
    nama: "",
    satuan: "",
    overhead_persen: 10
  });

  const [showAnalisaModal, setShowAnalisaModal] = useState(false);
  const [selectedAnalisa, setSelectedAnalisa] = useState([]);
  const [masterAnalisa, setMasterAnalisa] = useState([]);

  const fetchMasterAnalisa = async () => {
   const res = await api.get("/master/analisa");
    setMasterAnalisa(res.data);
  };

  const fetchData = async () => {
    try {
      const res = await api.get(`/project-analisa?project_id=${id}`);
      setData(res.data);
      setFilteredData(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
    fetchMasterAnalisa();
  }, [id]);

  useEffect(() => {
    let filtered = data;
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.kode.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    setFilteredData(filtered);
  }, [searchTerm, data]);

  const handleChangeMaster = (e) => {
    setFormMaster({
      ...formMaster,
      [e.target.name]: e.target.value
    });
  };

  const openFormModal = (item = null) => {
    if (item) {
      setFormMaster({
        kode: item.kode,
        nama: item.nama,
        satuan: item.satuan,
        overhead_persen: item.overhead_persen
      });
      setEditId(item.id);
      setIsEdit(true);
    } else {
      setFormMaster({
        kode: "",
        nama: "",
        satuan: "",
        overhead_persen: 10
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

  const handleSubmitMaster = async (e) => {
    e.preventDefault();
    if (!formMaster.kode || !formMaster.nama || !formMaster.satuan) {
      alert("Kode, Nama, dan Satuan wajib diisi!");
      return;
    }

    try {
      if (isEdit) {
        await api.put(`/project-analisa/${editId}`, formMaster);
      } else {
        await api.post("/project-analisa", {
          ...formMaster,
          project_id: id
        });
      }
      closeFormModal();
      fetchData();
    } catch (err) {
      console.error(err);
      alert("Gagal menyimpan data analisa project.");
    }
  };

  const confirmDelete = (analisaId, itemName) => {
    setDeleteModal({ isOpen: true, id: analisaId, itemName });
  };

  const executeDelete = async () => {
    try {
      await api.delete(`/project-analisa/${deleteModal.id}`);
      fetchData();
      setDeleteModal({ isOpen: false, id: null, itemName: "" });
    } catch (err) {
      console.error(err);
      alert("Gagal menghapus data analisa.");
    }
  };

  const openDetail = (analisaId) => {
    navigate(`/project/${id}/analisa/${analisaId}`);
  };

  const handleImportAnalisa = async () => {
  try {
    await api.post("/project-analisa/import", {
      project_id: id,
      analisa_ids: selectedAnalisa
    });

    alert("Analisa berhasil di import");
    fetchData();

  } catch (err) {
    alert(err.response?.data?.message || "Gagal import");
  }
};

const filteredMasterAnalisa = masterAnalisa.filter((master) => {
  return !data.some(
    (item) => item.nama.toLowerCase() === master.nama.toLowerCase()
  );
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
                <Calculator className="w-7 h-7 text-secondary" />
              </div>
              AHSP Proyek
            </h1>
            <p className="text-sm text-gray-500 mt-2 max-w-xl">
              Kelola data standar Analisa Harga Satuan Pekerjaan khusus untuk project ini.
            </p>
          </div>
        </div>

        <div className="flex gap-4">
            <button className="flex items-center gap-2 bg-secondary hover:bg-[#e64a0f] text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm shadow-[#ff5511]/20 active:scale-95 whitespace-nowrap" onClick={() => setShowAnalisaModal(true)}>
          Import Analisa
        </button>
        <button
          onClick={() => openFormModal()}
          className="flex items-center gap-2 bg-secondary hover:bg-[#e64a0f] text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm shadow-[#ff5511]/20 active:scale-95 whitespace-nowrap"
        >
          <Plus className="w-5 h-5" />
          Tambah Analisa Project
        </button>
        </div>
      </div>

      {/* TOOLBAR */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
        <div className="relative w-full md:max-w-lg">
          <Search size={20} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Cari berdasarkan kode atau nama pekerjaan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 px-2.5 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary transition-all text-sm"
          />
        </div>
      </div>

      {/* TABLE SECTION */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100 text-gray-500 text-xs uppercase tracking-wider">
                <th className="p-5 font-bold w-32">Kode</th>
                <th className="p-5 font-bold">Nama Pekerjaan</th>
                <th className="p-5 font-bold w-32">Satuan</th>
                <th className="p-5 font-bold w-32 text-center">Overhead (%)</th>
                <th className="p-5 font-bold text-center w-64">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {filteredData.map((a) => (
                <tr key={a.id} className="hover:bg-accent/40 transition-colors group">
                  <td className="p-5 font-bold text-text-primary">
                    <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md border border-gray-200 text-xs">
                      {a.kode}
                    </span>
                  </td>
                  <td className="p-5 font-medium text-text-primary">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-gray-400" />
                      {a.nama}
                    </div>
                  </td>
                  <td className="p-5 text-gray-600 font-medium">{a.satuan}</td>
                  <td className="p-5 text-center text-gray-600 font-medium">
                    <span className="bg-blue-50 text-info px-2.5 py-1 rounded-md font-bold border border-blue-100">
                      {a.overhead_persen}%
                    </span>
                  </td>
                  <td className="p-5">
                    <div className="flex justify-center items-center gap-2">
                      <button
                        onClick={() => openDetail(a.id)}
                        className="flex items-center gap-1.5 text-xs font-bold bg-secondary text-white hover:bg-secondary/80 px-3 py-2 rounded-lg transition-all shadow-sm active:scale-95"
                      >
                        Kelola Detail <ArrowRight className="w-3.5 h-3.5" />
                      </button>

                      <div className="flex gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openFormModal(a)}
                          className="p-2 text-info bg-info/5 hover:bg-info/15 hover:scale-105 rounded-lg transition-all border border-info/10"
                          title="Edit Analisa Project"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => confirmDelete(a.id, a.nama)}
                          className="p-2 text-danger bg-danger/5 hover:bg-danger/15 hover:scale-105 rounded-lg transition-all border border-danger/10"
                          title="Hapus Analisa Project"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-16 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <div className="bg-gray-50 p-4 rounded-full mb-3">
                        <Calculator className="w-10 h-10 text-gray-300" />
                      </div>
                      <p className="text-base font-semibold text-gray-600">Analisa Project Kosong</p>
                      <p className="text-sm mt-1 text-gray-500">Silakan tambahkan data analisa project baru.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODALS --- */}

  {showAnalisaModal && (
  <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50 p-4">
    <div className="bg-white w-full max-w-3xl rounded-2xl shadow-xl">

      {/* HEADER */}
      <div className="p-5 border-b flex justify-between items-center">
        <h2 className="text-lg font-bold text-primary">
          Import Analisa dari Master
        </h2>
        <button
          onClick={() => setShowAnalisaModal(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>

      {/* BODY */}
      <div className="p-5">

        {/* TABLE HEADER */}
        <div className="grid grid-cols-4 gap-2 bg-gray-100 p-2 text-xs font-bold text-gray-600 rounded-t-xl">
          <div></div>
          <div>Kode</div>
          <div>Nama Analisa</div>
          <div>Satuan</div>
        </div>

        {/* TABLE DATA */}
        <div className="max-h-64 overflow-y-auto border border-t-0 rounded-b-xl">

          {filteredMasterAnalisa.map((a) => {
            const checked = selectedAnalisa.includes(a.id);

            return (
              <div
                key={a.id}
                className={`grid grid-cols-4 gap-2 p-2 border-t items-center cursor-pointer hover:bg-gray-50
                  ${checked ? "bg-orange-50" : ""}
                `}
                onClick={() => {
                  if (checked) {
                    setSelectedAnalisa(selectedAnalisa.filter(id => id !== a.id));
                  } else {
                    setSelectedAnalisa([...selectedAnalisa, a.id]);
                  }
                }}
              >
                {/* CHECKBOX */}
                <input
                  type="checkbox"
                  checked={checked}
                  readOnly
                />

                {/* KODE */}
                <div className="font-medium">{a.kode}</div>

                {/* NAMA */}
                <div>{a.nama}</div>

                {/* SATUAN */}
                <div className="text-gray-500 text-sm">{a.satuan}</div>
              </div>
            );
          })}

          {masterAnalisa.length === 0 && (
            <p className="text-center text-gray-400 py-6">
              Tidak ada data analisa
            </p>
          )}

        </div>

        {/* INFO */}
        <p className="text-sm text-gray-500 mt-3">
          {selectedAnalisa.length} analisa dipilih
        </p>

      </div>

      {/* FOOTER */}
      <div className="p-5 border-t flex justify-end gap-3">
        <button
          onClick={() => setShowAnalisaModal(false)}
          className="px-4 py-2 bg-gray-200 rounded-lg"
        >
          Batal
        </button>

        <button
          onClick={() => {
            handleImportAnalisa();
            setShowAnalisaModal(false);
          }}
          className="px-4 py-2 bg-secondary text-white rounded-lg"
        >
          Import Analisa
        </button>
      </div>

    </div>
  </div>
)}

      {/* Form Master Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-primary/40 flex justify-center items-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-primary flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isEdit ? 'bg-info/10 text-info' : 'bg-secondary/10 text-secondary'}`}>
                  {isEdit ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                </div>
                {isEdit ? "Edit Analisa Project" : "Tambah Analisa Project"}
              </h2>
              <button onClick={closeFormModal} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-xl transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitMaster} className="p-6">
              <div className="space-y-5">

                <div className="grid grid-cols-3 gap-5">
                  <div className="col-span-1">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Kode Analisa</label>
                    <input
                      type="text"
                      name="kode"
                      placeholder="Contoh: A.1"
                      value={formMaster.kode}
                      onChange={handleChangeMaster}
                      className="w-full border border-gray-200 bg-gray-50 p-3.5 rounded-xl focus:ring-2 focus:ring-secondary/30 focus:border-secondary focus:bg-white outline-none transition-all text-sm font-bold uppercase"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Satuan Analisa</label>
                    <input
                      type="text"
                      name="satuan"
                      placeholder="Contoh: M3, M2, Ls"
                      value={formMaster.satuan}
                      onChange={handleChangeMaster}
                      className="w-full border border-gray-200 bg-gray-50 p-3.5 rounded-xl focus:ring-2 focus:ring-secondary/30 focus:border-secondary focus:bg-white outline-none transition-all text-sm font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Nama Pekerjaan (Uraian)</label>
                  <input
                    type="text"
                    name="nama"
                    placeholder="Contoh: Galian Tanah Biasa Sedalam 1m"
                    value={formMaster.nama}
                    onChange={handleChangeMaster}
                    className="w-full border border-gray-200 bg-gray-50 p-3.5 rounded-xl focus:ring-2 focus:ring-secondary/30 focus:border-secondary focus:bg-white outline-none transition-all text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Persentase Overhead (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    name="overhead_persen"
                    placeholder="Contoh: 10 atau 15"
                    value={formMaster.overhead_persen}
                    onChange={handleChangeMaster}
                    className="w-full border border-gray-200 bg-gray-50 p-3.5 rounded-xl focus:ring-2 focus:ring-secondary/30 focus:border-secondary focus:bg-white outline-none transition-all text-sm font-medium"
                  />
                  <p className="text-xs text-gray-500 mt-2">Masukan persentase tambahan (Overhead, Jasa, Profit, dll) yang dibebankan pada master analisa ini.</p>
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
                Apakah Anda yakin ingin menghapus analisa<br />
                <span className="font-bold text-gray-800 text-base"> "{deleteModal.itemName}"</span>?
                <br />Seluruh detail didalamnya juga kemungkinan akan terhapus.
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
};

export default ProjectAnalisaPage;