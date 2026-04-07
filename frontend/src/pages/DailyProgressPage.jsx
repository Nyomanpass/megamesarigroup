import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api";
import { ArrowLeft, TrendingUp, Save, X, Edit, Trash2, PlusCircle, CheckCircle, Search, AlertCircle } from "lucide-react";
import { useRef } from "react";

export default function DailyProgressPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  // --- States ---
  const [boqList, setBoqList] = useState([]);
  const [data, setData] = useState([]);
  const [materialList, setMaterialList] = useState([]);
  const [pekerjaList, setPekerjaList] = useState([]);
  const [peralatanList, setPeralatanList] = useState([]);
  const formRef = useRef(null);

  const [isCopy, setIsCopy] = useState(false);

  // --- Edit Mode State ---
  const [editId, setEditId] = useState(null);

  const [form, setForm] = useState({
    boq_id: "",
    tanggal: "",
    volume: ""
  });

  // --- Detail States ---
  const [materials, setMaterials] = useState([]);
  const [pekerja, setPekerja] = useState([]);
  const [peralatan, setPeralatan] = useState([]);

  // ================= FETCH DATA =================
  const fetchData = async () => {
    try {
      const res = await api.get(`/daily-progress?project_id=${id}`);
      setData(res.data.filter((d) => d.project_id == id));
    } catch (err) {
      console.error("Gagal fetch progress", err);
    }
  };

  const fetchBoq = async () => {
    const res = await api.get(`/boq/project/${id}`);
    setBoqList(res.data);
  };

  const fetchMaster = async () => {
    try {
      const m = await api.get(`/materials/${id}`);
      const p = await api.get(`/pekerja/${id}`);
      const a = await api.get(`/peralatan/${id}`);
      setMaterialList(m.data);
      setPekerjaList(p.data);
      setPeralatanList(a.data);
    } catch (e) {
      console.log(e);
    }
  };

  useEffect(() => {
    fetchData();
    fetchBoq();
    fetchMaster();
  }, [id]);

  // ================= LOGIKA EDIT =================
  const handleEdit = async (item) => {
    try {
      setEditId(item.id);

      setTimeout(() => {
        formRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }, 100);

      const res = await api.get(`/daily-progress/${item.id}`);
      const d = res.data;

      setEditId(item.id);

      setForm({
        boq_id: d.boq_id,
        tanggal: d.tanggal,
        volume: d.volume
      });

      setMaterials((d.materials || []).map(m => ({
        material_id: m.material_id,
        koef: m.koef
      })));

      setPekerja((d.workers || []).map(w => ({
        worker_id: w.worker_id,
        koef: w.koef
      })));

      setPeralatan((d.tools || []).map(t => ({
        tool_id: t.tool_id,
        jumlah: t.jumlah
      })));

    } catch (error) {
      console.error(error);
      alert("Gagal load data edit");
    }
  };

  const handleCopy = async (item) => {
  try {
    setIsCopy(true);     // ✅ ini beda dari edit
    setEditId(null);     // ❌ jangan pakai edit

    setTimeout(() => {
      formRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }, 100);

    const res = await api.get(`/daily-progress/${item.id}`);
    const d = res.data;

    setForm({
      boq_id: d.boq_id,
      tanggal: d.tanggal, // 🔥 kosongkan biar user isi baru
      volume: d.volume
    });

    setMaterials((d.materials || []).map(m => ({
      material_id: m.material_id,
      koef: m.koef
    })));

    setPekerja((d.workers || []).map(w => ({
      worker_id: w.worker_id,
      koef: w.koef
    })));

    setPeralatan((d.tools || []).map(t => ({
      tool_id: t.tool_id,
      jumlah: t.jumlah
    })));

  } catch (error) {
    alert("Gagal copy data");
  }
};

  const cancelEdit = () => {
    setEditId(null);
    setIsCopy(false);
    setForm({ boq_id: "", tanggal: "", volume: "" });
    setMaterials([]);
    setPekerja([]);
    setPeralatan([]);
  };

  const removeItem = (type, index) => {
    if (type === 'm') setMaterials(materials.filter((_, i) => i !== index));
    if (type === 'p') setPekerja(pekerja.filter((_, i) => i !== index));
    if (type === 'a') setPeralatan(peralatan.filter((_, i) => i !== index));
  };

  // ================= SUBMIT =================
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        project_id: id,
        materials,
        pekerja,
        peralatan
      };

      if (editId && !isCopy) {
        await api.put(`/daily-progress/${editId}`, payload);
        alert("✅ Berhasil Update!");
      } else {
        await api.post("/daily-progress", payload);
        alert("✅ Berhasil Simpan!");
      }

      cancelEdit();
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || "Terjadi kesalahan");
    }
  };

  // ================= SUMMARY LOGIC =================
  const getSummary = () => {
    if (!form.boq_id) return null;

    const selectedBoq = boqList.find((b) => b.id == form.boq_id);
    if (!selectedBoq) return null;

    const volumeLalu = data
      .filter((d) => d.boq_id == form.boq_id && d.id !== editId)
      .reduce((sum, item) => sum + parseFloat(item.volume || 0), 0);

    const volumeInputSekarang = parseFloat(form.volume || 0);
    const totalAkumulasi = volumeLalu + volumeInputSekarang;
    const target = parseFloat(selectedBoq.volume || 0);
    const sisa = target - totalAkumulasi;
    const persen = target > 0 ? (totalAkumulasi / target) * 100 : 0;

    return {
      uraian: selectedBoq.uraian,
      satuan: selectedBoq.satuan,
      target: target,
      lalu: volumeLalu,
      totalSekarang: totalAkumulasi,
      sisa: sisa,
      persen: persen
    };
  };

  const summary = getSummary();

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
                <TrendingUp className="text-yellow-500"/> Daily Progress Laporan
              </h1>
              <p className="text-sm text-gray-500">Laporkan capaian volume harian di lapangan</p>
            </div>
          </div>
          {editId && (
            <div className="bg-amber-100 text-amber-700 px-4 py-2 rounded-xl flex items-center gap-2 font-bold shadow-sm border border-amber-200">
              <AlertCircle size={18} /> Mode Edit Data: {editId}
            </div>
          )}
        </div>

        {/* ================= FORM ================= */}
        <form onSubmit={handleSubmit} className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 mb-8 relative overflow-hidden">
          {/* Deco background */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/50 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl pointer-events-none"></div>

          <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2 relative z-10"><Edit size={20} className="text-blue-500"/> Entri Data Progres Fisik</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
            <div className="flex flex-col">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block">Pekerjaan (Dari BOQ)</label>
              <select
                value={form.boq_id}
                onChange={(e) => setForm({ ...form, boq_id: e.target.value })}
                className="w-full border-2 border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium outline-none transition-all" 
                required
              >
                <option value="">-- Pilih Pekerjaan BOQ --</option>
                {boqList.filter(b => b.tipe === 'item').map(b => (
                  <option key={b.id} value={b.id}>{b.kode ? `${b.kode} - ` : ''}{b.uraian}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block">Tanggal</label>
              <input
                type="date"
                value={form.tanggal}
                onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
                className="w-full border-2 border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium outline-none transition-all" 
                required
              />
            </div>

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
          </div>

          {/* ================= SUMMARY CARD ================= */}
          {summary && (
            <div className="mt-8 bg-blue-50/80 p-6 rounded-2xl border border-blue-200 relative z-10 transition-all duration-500 animate-in fade-in slide-in-from-top-4">
              <h2 className="text-blue-800 font-bold text-sm mb-4 uppercase tracking-wider flex items-center gap-2">
                <Search size={16}/> Informasi Target BOQ: <span className="text-blue-900 border-b border-blue-300 pb-0.5">{summary.uraian}</span>
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
                <p className="text-xs font-bold text-red-500 mt-2 flex items-center gap-1"><AlertCircle size={14}/> Peringatan: Volume lapangan melebihi RAB (Over-progress)!</p>
              )}
            </div>
          )}

          {/* ================= DETAIL SECTION (RESOURCE USAGE) ================= */}
          <div className="mt-8 border-t border-gray-100 pt-8 relative z-10">
            <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">Catatan Penggunaan Sumber Daya <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">(Opsional)</span></h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* --- MATERIAL --- */}
              <div className="bg-orange-50/30 rounded-2xl border border-orange-100 p-5 flex flex-col">
                <h3 className="font-bold text-orange-800 mb-4 text-sm flex items-center justify-between">
                  <span>📦 Material (Bahan)</span>
                  <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-[10px]">{materials.length} item</span>
                </h3>
                <div className="space-y-3 flex-1">
                  {materials.map((m, i) => (
                    <div key={i} className="flex gap-2 items-start bg-white p-2 rounded-xl border border-orange-50 shadow-sm relative group transition-colors hover:border-orange-200">
                      <div className="flex-1 w-full space-y-2">
                        <select
                          value={m.material_id}
                          onChange={(e) => {
                            const newData = [...materials];
                            newData[i].material_id = e.target.value;
                            setMaterials(newData);
                          }}
                          className="w-full border-none bg-orange-50/50 p-2 text-xs rounded-lg font-medium text-gray-700 outline-none focus:ring-1 focus:ring-orange-300"
                        >
                          <option value="">Pilih Material</option>
                          {materialList.map(mat => (
                            <option key={mat.id} value={mat.id}>{mat.nama}</option>
                          ))}
                        </select>
                        <input
                          placeholder="Jumlah Koef/Volume"
                          value={m.koef}
                          onChange={(e) => {
                            const newData = [...materials];
                            newData[i].koef = e.target.value;
                            setMaterials(newData);
                          }}
                          className="w-full border-none bg-gray-50 p-2 text-xs rounded-lg font-medium text-gray-700 outline-none focus:ring-1 focus:ring-orange-300"
                        />
                      </div>
                      <button type="button" onClick={() => removeItem('m', i)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setMaterials([...materials, { material_id: "", koef: "" }])}
                  className="mt-4 w-full py-2 border border-dashed border-orange-300 text-orange-600 rounded-xl text-xs font-bold hover:bg-orange-50 transition-colors flex items-center justify-center gap-1"
                >
                  <PlusCircle size={14} /> Tambah Material
                </button>
              </div>

              {/* --- PEKERJA --- */}
              <div className="bg-purple-50/30 rounded-2xl border border-purple-100 p-5 flex flex-col">
                <h3 className="font-bold text-purple-800 mb-4 text-sm flex items-center justify-between">
                  <span>👷 Tenaga Kerja (Mandor/Tukang)</span>
                  <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-[10px]">{pekerja.length} item</span>
                </h3>
                <div className="space-y-3 flex-1">
                  {pekerja.map((p, i) => (
                    <div key={i} className="flex gap-2 items-start bg-white p-2 rounded-xl border border-purple-50 shadow-sm relative group transition-colors hover:border-purple-200">
                      <div className="flex-1 w-full space-y-2">
                        <select
                          value={p.worker_id}
                          onChange={(e) => {
                            const newData = [...pekerja];
                            newData[i].worker_id = e.target.value;
                            setPekerja(newData);
                          }}
                          className="w-full border-none bg-purple-50/50 p-2 text-xs rounded-lg font-medium text-gray-700 outline-none focus:ring-1 focus:ring-purple-300"
                        >
                          <option value="">Pilih Pekerja</option>
                          {pekerjaList.map(w => (
                            <option key={w.id} value={w.id}>{w.nama} ({w.tipe})</option>
                          ))}
                        </select>
                        <input
                          placeholder="Jumlah Koef/HK"
                          value={p.koef}
                          onChange={(e) => {
                            const newData = [...pekerja];
                            newData[i].koef = e.target.value;
                            setPekerja(newData);
                          }}
                          className="w-full border-none bg-gray-50 p-2 text-xs rounded-lg font-medium text-gray-700 outline-none focus:ring-1 focus:ring-purple-300"
                        />
                      </div>
                      <button type="button" onClick={() => removeItem('p', i)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setPekerja([...pekerja, { worker_id: "", koef: "" }])}
                  className="mt-4 w-full py-2 border border-dashed border-purple-300 text-purple-600 rounded-xl text-xs font-bold hover:bg-purple-50 transition-colors flex items-center justify-center gap-1"
                >
                  <PlusCircle size={14} /> Tambah Pekerja
                </button>
              </div>

              {/* --- PERALATAN --- */}
              <div className="bg-teal-50/30 rounded-2xl border border-teal-100 p-5 flex flex-col">
                <h3 className="font-bold text-teal-800 mb-4 text-sm flex items-center justify-between">
                  <span>🚜 Alat Berat / Alat Bantu</span>
                  <span className="bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full text-[10px]">{peralatan.length} item</span>
                </h3>
                <div className="space-y-3 flex-1">
                  {peralatan.map((a, i) => (
                    <div key={i} className="flex gap-2 items-start bg-white p-2 rounded-xl border border-teal-50 shadow-sm relative group transition-colors hover:border-teal-200">
                      <div className="flex-1 w-full space-y-2">
                        <select
                          value={a.tool_id}
                          onChange={(e) => {
                            const newData = [...peralatan];
                            newData[i].tool_id = e.target.value;
                            setPeralatan(newData);
                          }}
                          className="w-full border-none bg-teal-50/50 p-2 text-xs rounded-lg font-medium text-gray-700 outline-none focus:ring-1 focus:ring-teal-300"
                        >
                          <option value="">Pilih Peralatan</option>
                          {peralatanList.map(t => (
                            <option key={t.id} value={t.id}>{t.nama}</option>
                          ))}
                        </select>
                        <input
                          placeholder="Jumlah Alat/Durasi"
                          value={a.jumlah}
                          onChange={(e) => {
                            const newData = [...peralatan];
                            newData[i].jumlah = e.target.value;
                            setPeralatan(newData);
                          }}
                          className="w-full border-none bg-gray-50 p-2 text-xs rounded-lg font-medium text-gray-700 outline-none focus:ring-1 focus:ring-teal-300"
                        />
                      </div>
                      <button type="button" onClick={() => removeItem('a', i)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setPeralatan([...peralatan, { tool_id: "", jumlah: form.volume || 0 }])}
                  className="mt-4 w-full py-2 border border-dashed border-teal-300 text-teal-600 rounded-xl text-xs font-bold hover:bg-teal-50 transition-colors flex items-center justify-center gap-1"
                >
                  <PlusCircle size={14} /> Tambah Peralatan
                </button>
              </div>

            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-100 relative z-10">
            {editId && (
              <button type="button" onClick={cancelEdit} className="px-6 py-3 rounded-xl font-bold bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-2 shadow-sm">
                <X size={18} /> Batal Edit
              </button>
            )}
            <button className={`px-8 py-3 rounded-xl font-bold text-white transition-all shadow-md hover:shadow-lg active:scale-95 flex items-center gap-2 ${editId ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-600 hover:bg-blue-700'}`}>
              <Save size={18} /> {editId ? "Update Data Progres" : "Post Data Progres"}
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
                  <th className="p-4 text-center">Resources Tersimpan</th>
                  <th className="p-4 text-right">Volume</th>
                  <th className="p-4 text-center pr-6">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.map((item, i) => (
                  <tr key={i} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="p-4 pl-6 text-gray-700 font-medium">
                       {new Date(item.tanggal).toLocaleDateString("id-ID", {day: "2-digit", month: "short", year: "numeric"})}
                    </td>
                    <td className="p-4 text-gray-800 font-bold max-w-[300px] truncate" title={item.boq?.uraian}>
                       <span className="text-blue-500 mr-2 opacity-50">•</span>{item.boq?.uraian}
                    </td>
                    <td className="p-4 text-center">
                       <div className="flex items-center justify-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                         {item.materials?.length > 0 && <span className="bg-orange-100 text-orange-600 text-[10px] font-bold px-1.5 py-0.5 rounded" title="Material">M:{item.materials.length}</span>}
                         {item.workers?.length > 0 && <span className="bg-purple-100 text-purple-600 text-[10px] font-bold px-1.5 py-0.5 rounded" title="Tenaga Kerja">W:{item.workers.length}</span>}
                         {item.tools?.length > 0 && <span className="bg-teal-100 text-teal-600 text-[10px] font-bold px-1.5 py-0.5 rounded" title="Peralatan">T:{item.tools.length}</span>}
                         {(!item.materials?.length && !item.workers?.length && !item.tools?.length) && <span className="text-xs text-gray-300">-</span>}
                       </div>
                    </td>
                    <td className="p-4 text-right">
                       <span className="bg-green-50 text-green-700 font-mono font-bold px-2.5 py-1 rounded-lg border border-green-100">{Number(item.volume).toFixed(3)}</span>
                    </td>
                    <td className="p-4 text-center pr-6">
                      <button 
                          onClick={() => handleCopy(item)}
                          className="bg-white border border-gray-200 hover:border-blue-300 hover:bg-blue-50 text-gray-600 hover:text-blue-600 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 justify-center mx-auto mt-1"
                        >
                          <PlusCircle size={12} /> Copy
                        </button>
                      <button 
                        onClick={() => handleEdit(item)}
                        className="bg-white border border-gray-200 hover:border-amber-300 hover:bg-amber-50 text-gray-600 hover:text-amber-600 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 justify-center mx-auto"
                      >
                        <Edit size={12} /> Edit ReKAM
                      </button>
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
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
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