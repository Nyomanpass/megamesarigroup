import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api";
import { ArrowLeft, TrendingUp, Save, X, Edit, Trash2, PlusCircle, CheckCircle, Search, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";

export default function DailyProgressPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [dailyPlan, setDailyPlan] = useState([]);
  const [editId, setEditId] = useState(null);

  // --- States ---
  const [boqList, setBoqList] = useState([]);
  const [data, setData] = useState([]);
  const formRef = useRef(null);

  const [previewItems, setPreviewItems] = useState([]);

  const [form, setForm] = useState({
    boq_id: "",
    hari_ke: "",
    volume: "",
    cuaca: "",
    jam_mulai: "",
    jam_selesai: ""
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;



  // ================= FETCH DATA =================
  const fetchData = async () => {
    try {
      const res = await api.get(`/daily-progress?project_id=${id}`);
      setData(res.data.filter((d) => d.project_id == id));
      setCurrentPage(1); // Reset to page 1 on new fetch
    } catch (err) {
      console.error("Gagal fetch progress", err);
    }
  };

  const fetchBoq = async () => {
    const res = await api.get(`/boq/project/${id}`);
    setBoqList(res.data);
  };

  const fetchDailyPlan = async () => {
    try {
      const res = await api.get(`/daily-plan/${id}`);
      setDailyPlan(res.data);
    } catch (err) {
      console.error("Gagal ambil daily plan", err);
    }
  };



  useEffect(() => {
    fetchData();
    fetchBoq();
    fetchDailyPlan();
  }, [id]);



  const loadPreviewAnalisa = async (boq_id, volume) => {
    try {
      if (!boq_id) return;

      const boq = boqList.find(b => b.id == boq_id);
      if (!boq || !boq.analisa_id) return;

      const res = await api.get(`/project-analisa-detail/${boq.analisa_id}`);
      const analisa = res.data;

      const allItems = [
        ...(analisa.tenaga || []),
        ...(analisa.bahan || []),
        ...(analisa.alat || [])
      ];

      const result = allItems.map(item => {
        let rawKoef = item.koefisien;
        if (!rawKoef) rawKoef = item.koef;
        const koef = parseFloat(String(rawKoef).replace(",", ".")) || 0;
        const volNum = parseFloat(volume) || 0;

        const hasil = koef * volNum;

        return {
          nama: item.nama,
          tipe: item.tipe,
          satuan: item.satuan,
          koef,
          hasil: hasil.toFixed(3)
        };
      });

      setPreviewItems(result);

    } catch (err) {
      console.log("Preview error", err);
    }
  };


  useEffect(() => {
    if (form.boq_id) {
      loadPreviewAnalisa(form.boq_id, form.volume);
    }
  }, [form.boq_id, form.volume]);

  const handleCopy = (item) => {
    
    const plan = dailyPlan.find(
      (d) => d.tanggal === item.tanggal
    );

    setForm({
      boq_id: item.boq_id,
      hari_ke: plan?.hari_ke || "",
      volume: item.volume,

      cuaca: item.cuaca || "",
      jam_mulai: item.jam_mulai || "",
      jam_selesai: item.jam_selesai || ""
    });
    
    setEditId(null);

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleEdit = (item) => {
    setEditId(item.id);

    // cari hari_ke dari dailyPlan berdasarkan tanggal
    const plan = dailyPlan.find(
      (d) => d.tanggal === item.tanggal
    );

    setForm({
      boq_id: item.boq_id,
      hari_ke: plan?.hari_ke || "",
      volume: item.volume,

      cuaca: item.cuaca || "",
      jam_mulai: item.jam_mulai || "",
      jam_selesai: item.jam_selesai || ""
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    const confirm = window.confirm("Yakin mau hapus data ini?");
    if (!confirm) return;

    try {
      await api.delete(`/daily-progress/${id}`);
      alert("✅ Berhasil dihapus");

      fetchData(); // refresh data
    } catch (err) {
      alert("❌ Gagal hapus");
    }
  };

  // ================= SUBMIT =================
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {

       const payload = {
          project_id: id,
          boq_id: form.boq_id,
          hari_ke: form.hari_ke,
          volume: form.volume,

          cuaca: form.cuaca,
          jam_mulai: form.jam_mulai,
          jam_selesai: form.jam_selesai
        };

      if (editId) {
        await api.put(`/daily-progress/${editId}`, payload);
        alert("✅ Berhasil Update!");
        setEditId(null);
      } else {
        await api.post("/daily-progress", payload);
        alert("✅ Berhasil Simpan!");
      }

      fetchData();

      setForm({
        boq_id: "",
        hari_ke: "",
        volume: "",
        cuaca: "",
        jam_mulai: "",
        jam_selesai: ""
      });

      setPreviewItems([]);

    } catch (err) {
      alert(err.response?.data?.message || "Terjadi kesalahan");
    }
  };

  // ================= SUMMARY LOGIC =================
  const getSummary = () => {
    // 🔥 ambil boq_id dari form ATAU dari data edit
    const boqIdFix = form.boq_id || data.find(d => d.id === editId)?.boq_id;

    if (!boqIdFix) return null;

    const selectedBoq = boqList.find((b) => b.id == boqIdFix);
    if (!selectedBoq) return null;

    const volumeInput = parseFloat(form.volume || 0);

    const currentItem = data.find(d => d.id === editId);
    const volumeLama = parseFloat(currentItem?.volume || 0);

    const totalSemua = data
      .filter((d) => d.boq_id == boqIdFix)
      .reduce((sum, item) => sum + parseFloat(item.volume || 0), 0);

    let totalAkumulasi;

    if (editId) {
      if (volumeInput === volumeLama) {
        totalAkumulasi = totalSemua;
      } else {
        totalAkumulasi = totalSemua - volumeLama + volumeInput;
      }
    } else {
      totalAkumulasi = totalSemua + volumeInput;
    }

    const target = parseFloat(selectedBoq.volume || 0);
    const sisa = target - totalAkumulasi;
    const persen = target > 0 ? (totalAkumulasi / target) * 100 : 0;

    return {
      uraian: selectedBoq.uraian,
      satuan: selectedBoq.satuan,
      target,
      lalu: totalSemua,
      totalSekarang: totalAkumulasi,
      sisa,
      persen
    };
  };

  const summary = getSummary();

  // ================= PAGINATION LOGIC =================
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = data.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(data.length / itemsPerPage);

  const paginate = (pageNumber) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  return (
    <>
      <div className="p-6 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">

        {/* HEADER */}
        <div ref={formRef} className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(`/project/${id}`)}
              className="p-2.5 rounded-xl bg-white shadow flex items-center justify-center border border-gray-100 hover:bg-gray-50 transition-colors active:scale-95"
            >
              <ArrowLeft size={24} className="text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <TrendingUp className="text-yellow-500" /> Daily Progress Laporan
              </h1>
              <p className="text-sm text-gray-500">Laporkan capaian volume harian di lapangan</p>
            </div>
          </div>


        </div>

        {/* ================= FORM ================= */}
        <form onSubmit={handleSubmit} className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 mb-8 relative overflow-hidden">
          {/* Deco background */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/50 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl pointer-events-none"></div>

          <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2 relative z-10"><Edit size={20} className="text-blue-500" /> Entri Data Progres Fisik</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
            <div className="flex flex-col">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block">Pekerjaan (Dari BOQ)</label>
              <select
                value={form.boq_id}
                onChange={(e) => {
                  const boq_id = e.target.value; // ✅ ini BOQ
                  const newForm = { ...form, boq_id };

                  setForm(newForm);


                }}
                className="w-full border-2 border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium outline-none transition-all"
                required
              >
                <option value="">-- Pilih Pekerjaan BOQ --</option>
                {boqList.filter(b => b.tipe === 'item').map(b => (
                  <option key={b.id} value={b.id}>
                    {b.kode ? `${b.kode} - ` : ''}{b.uraian}
                  </option>
                ))}
              </select>
            </div>

            <select
              value={form.hari_ke}
              onChange={(e) => setForm({ ...form, hari_ke: e.target.value })}
              required
            >
              <option value="">-- Pilih Hari --</option>

              {dailyPlan.map((d) => (
                <option key={d.hari_ke} value={d.hari_ke}>
                  Hari ke-{d.hari_ke} ({new Date(d.tanggal).toLocaleDateString("id-ID")})
                </option>
              ))}
            </select>

            <div className="flex flex-col">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block">Volume Dikerjakan (Output)</label>
              <div className="relative">
                <input
                  type="number" step="any"
                  placeholder="0.00"
                  value={form.volume}
                  onChange={(e) => setForm({ ...form, volume: e.target.value })}
                  className="w-full border-2 border-green-200 rounded-xl p-3 pl-4 pr-16 bg-green-50/30 focus:bg-white focus:border-green-500 font-bold text-green-700 outline-none transition-all"
                  required
                />
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-green-600 font-bold text-sm">
                  {summary ? summary.satuan : 'Vol'}
                </div>
              </div>
            </div>
            {/* CUACA */}
            <div className="flex flex-col">
              <label className="text-xs font-bold text-gray-500 mb-2">Cuaca</label>
              <select
                value={form.cuaca}
                onChange={(e) => setForm({ ...form, cuaca: e.target.value })}
                className="border-2 border-gray-200 rounded-xl p-3"
              >
                <option value="">-- Pilih Cuaca --</option>
                <option value="Cerah">Cerah</option>
                <option value="Mendung">Mendung</option>
                <option value="Hujan">Hujan</option>
              </select>
            </div>

            {/* JAM KERJA */}
            <div className="flex flex-col">
              <label className="text-xs font-bold text-gray-500 mb-2">Jam Mulai</label>
              <input
                type="time"
                value={form.jam_mulai}
                onChange={(e) => setForm({ ...form, jam_mulai: e.target.value })}
                className="border-2 border-gray-200 rounded-xl p-3"
              />
            </div>

            <div className="flex flex-col">
              <label className="text-xs font-bold text-gray-500 mb-2">Jam Selesai</label>
              <input
                type="time"
                value={form.jam_selesai}
                onChange={(e) => setForm({ ...form, jam_selesai: e.target.value })}
                className="border-2 border-gray-200 rounded-xl p-3"
              />
            </div>

            
          </div>

          {/* ================= SUMMARY CARD ================= */}
          {summary && (
            <div className="mt-8 bg-blue-50/80 p-6 rounded-2xl border border-blue-200 relative z-10 transition-all duration-500 animate-in fade-in slide-in-from-top-4">
              <h2 className="text-blue-800 font-bold text-sm mb-4 uppercase tracking-wider flex items-center gap-2">
                <Search size={16} /> Informasi Target BOQ: <span className="text-blue-900 border-b border-blue-300 pb-0.5">{summary.uraian}</span>
              </h2>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-xs text-blue-500 font-bold uppercase tracking-wide mb-1">Rencana/Target BOQ</p>
                  <p className="font-black text-2xl text-blue-900">
                    {summary.target} <span className="text-sm font-bold text-blue-500">{summary.satuan}</span>
                  </p>
                </div>

                <div>
                  <p className="text-xs text-blue-500 font-bold uppercase tracking-wide mb-1">Total Termasuk Hari Ini</p>
                  <p className="font-black text-2xl text-blue-600">
                    {summary.totalSekarang.toFixed(3)} <span className="text-sm font-bold text-blue-400">{summary.satuan}</span>
                  </p>
                  <p className="text-xs text-blue-400/80 font-medium mt-1">Stok S/d Kemarin: {summary.lalu.toFixed(3)}</p>
                </div>

                <div>
                  <p className="text-xs text-blue-500 font-bold uppercase tracking-wide mb-1">Sisa Pekerjaan Belum Dikerjakan</p>
                  <p className={`font-black text-2xl ${summary.sisa <= 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                    {summary.sisa.toFixed(3)} <span className={`text-sm font-bold ${summary.sisa <= 0 ? 'text-red-400' : 'text-emerald-400'}`}>{summary.satuan}</span>
                  </p>
                </div>

                <div>
                  <p className="text-xs text-blue-500 font-bold uppercase tracking-wide mb-1">Capaian Progres Realisasi</p>
                  <p className="font-black text-2xl text-blue-700">{summary.persen.toFixed(2)}%</p>
                </div>
              </div>

              {/* Progress Bar Visual */}
              <div className="w-full bg-white/60 rounded-full h-3 mt-5 overflow-hidden border border-blue-100 shadow-inner">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out flex items-center justify-end px-2 ${summary.persen > 100 ? 'bg-red-500' : 'bg-gradient-to-r from-blue-400 to-blue-600'}`}
                  style={{ width: `${Math.min(summary.persen, 100)}%` }}
                >
                  {summary.persen > 10 && <span className="text-[9px] text-white font-bold">{summary.persen.toFixed(0)}%</span>}
                </div>
              </div>
              {summary.persen > 100 && (
                <p className="text-xs font-bold text-red-500 mt-2 flex items-center gap-1"><AlertCircle size={14} /> Peringatan: Volume lapangan melebihi RAB (Over-progress)!</p>
              )}
            </div>
          )}

          {previewItems.length > 0 && (
            <div className="mt-8 bg-white border border-blue-100 rounded-2xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">

              {/* HEADER PREVIEW */}
              <div className="bg-blue-50/50 px-5 py-3 border-b border-blue-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <h3 className="font-bold text-slate-700 tracking-tight">🔍 Preview Analisa Kebutuhan</h3>
                </div>
                <span className="text-[10px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full uppercase">
                  Auto Calculation
                </span>
              </div>

              <div className="p-0 overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="text-slate-400 text-[11px] uppercase tracking-widest bg-slate-50/30">
                      <th className="px-5 py-3 font-semibold text-center w-12">No</th>
                      <th className="px-5 py-3 font-semibold">Item Material / Tenaga</th>
                      <th className="px-5 py-3 font-semibold text-center">Tipe</th>
                      <th className="px-5 py-3 font-semibold text-right">Koefisien</th>
                      <th className="px-5 py-3 font-semibold text-center">Volume</th>
                      <th className="px-5 py-3 font-semibold text-right text-blue-600">Total Kebutuhan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {previewItems.map((item, i) => (
                      <tr key={i} className="hover:bg-blue-50/20 transition-colors group">
                        <td className="px-5 py-3 text-center text-slate-400 font-mono text-xs">{i + 1}</td>
                        <td className="px-5 py-3">
                          <span className="font-bold text-slate-700 group-hover:text-blue-700 transition-colors">
                            {item.nama}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${item.tipe === 'BAHAN' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                            item.tipe === 'TENAGA' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                              'bg-emerald-50 text-emerald-600 border-emerald-100'
                            }`}>
                            {item.tipe}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right font-mono text-slate-500 italic">{item.koef}</td>
                        <td className="px-5 py-3 text-center">
                          <span className="bg-slate-100 px-2 py-0.5 rounded font-medium text-slate-600">
                            {form.volume}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex flex-col items-end">
                            <span className="font-black text-blue-600 text-base">
                              {parseFloat(item.hasil || 0).toFixed(2)}
                            </span>
                            <span className="text-[9px] text-slate-400 font-medium uppercase tracking-tighter -mt-1">
                              Estimasi Satuan
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* FOOTER PREVIEW */}
              <div className="px-5 py-3 bg-slate-50 border-t border-slate-100">
                <p className="text-[10px] text-slate-400 italic">
                  *Hasil di atas adalah estimasi murni berdasarkan perkalian Volume x Koefisien AHSP.
                </p>
              </div>
            </div>
          )}

          {/* ================= DETAIL SECTION (RESOURCE USAGE) ================= */}

          {/* ACTION BUTTONS */}
          <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-100 relative z-10">
            {editId && (
              <button
                type="button"
                onClick={() => {
                  setEditId(null);
                  setForm({ boq_id: "", hari_ke: "", volume: "" });
                }}
                className="px-6 py-3 rounded-xl bg-gray-200 hover:bg-gray-300"
              >
                <X size={16} /> Batal Edit
              </button>
            )}
            <button className={`px-8 py-3 rounded-xl font-bold text-white transition-all shadow-md hover:shadow-lg active:scale-95 flex items-center gap-2  bg-blue-600 hover:bg-blue-700`}>
              <Save size={18} /> Post Data Progres
            </button>
          </div>
        </form>

        {/* ================= TABLE LIST ================= */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-12">
          <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">📋 Riwayat Pelaporan Daily Progress</h2>
            <span className="text-xs font-bold text-gray-500 bg-white border border-gray-200 px-3 py-1 rounded-full">{data.length} Entri</span>
          </div>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-sm">
              <thead className="bg-white">
                <tr className="text-xs uppercase tracking-wider text-gray-500 border-b border-gray-100">
                  <th className="p-4 pl-6">Tanggal</th>
                  <th className="p-4">Item Pekerjaan BOQ</th>
                  <th className="p-4 text-right">Volume</th>
                  <th className="p-4 text-center pr-6">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {currentItems.map((item, i) => (
                  <tr key={i} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="p-4 pl-6 text-gray-700 font-medium">
                      {new Date(item.tanggal).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="p-4 text-gray-800 font-bold max-w-[300px] truncate" title={item.boq?.uraian}>
                      <span className="text-blue-500 mr-2 opacity-50">•</span>{item.boq?.uraian}
                    </td>

                    <td className="p-4 text-right">
                      <span className="bg-green-50 text-green-700 font-mono font-bold px-2.5 py-1 rounded-lg border border-green-100">{Number(item.volume).toFixed(3)}</span>
                    </td>
                    <td className="p-4 text-center pr-6">
                      <div className="flex justify-center gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleCopy(item)}
                          className="p-2 rounded-lg bg-green-50 hover:bg-green-100 text-green-600 transition"
                          title="copy data"
                        >
                          <PlusCircle size={18} />
                        </button>
                        {/* EDIT */}
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition"
                          title="edit"
                        >
                          <Edit size={18} />
                        </button>

                        {/* DELETE */}
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition"
                          title="hapus"
                        >
                          <Trash2 size={18} />
                        </button>

                      </div>
                    </td>
                  </tr>
                ))}
                {data.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-400 italic font-medium">Belum ada riwayat progres. Coba input data progres yang pertama!</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col md:flex-row items-center justify-between p-5 bg-white border-t border-gray-100 gap-4">
              <div className="text-sm text-gray-500">
                Menampilkan <span className="font-bold text-gray-800">{indexOfFirstItem + 1}</span> hingga <span className="font-bold text-gray-800">{Math.min(indexOfLastItem, data.length)}</span> dari <span className="font-bold text-gray-800">{data.length}</span> entri
              </div>
              <div className="flex items-center gap-1.5 flex-wrap justify-center">
                <button
                  onClick={() => paginate(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95 bg-white"
                >
                  <ChevronLeft size={16} strokeWidth={2.5} />
                </button>

                {[...Array(totalPages)].map((_, index) => {
                  const pageNumber = index + 1;
                  if (
                    pageNumber === 1 ||
                    pageNumber === totalPages ||
                    (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={pageNumber}
                        onClick={() => paginate(pageNumber)}
                        className={`w-10 h-10 rounded-xl text-sm font-bold transition-all shadow-sm active:scale-95 ${currentPage === pageNumber ? 'bg-blue-600 text-white border border-blue-700 shadow-blue-500/30' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:text-gray-800'}`}
                      >
                        {pageNumber}
                      </button>
                    );
                  } else if (
                    pageNumber === currentPage - 2 ||
                    pageNumber === currentPage + 2
                  ) {
                    return <span key={pageNumber} className="px-2 text-gray-400 font-bold tracking-widest">...</span>;
                  }
                  return null;
                })}

                <button
                  onClick={() => paginate(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95 bg-white"
                >
                  <ChevronRight size={16} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .custom-scrollbar::-webkit-scrollbar {
          height: 6px;
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f8fafc; 
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1; 
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8; 
        }
      `}} />
    </>
  );
}