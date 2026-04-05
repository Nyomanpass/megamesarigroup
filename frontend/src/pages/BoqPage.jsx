import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api";
import { 
  ArrowLeft, FileText, CheckCircle, Calculator, PackageCheck, Wallet, Plus, RefreshCw, X, Trash2
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend
} from 'recharts';

export default function BoqPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [bulkItems, setBulkItems] = useState([
    { uraian: "", satuan: "", volume: "", harga_satuan: "", ppn: 11 }
  ]);

  const addBulkRow = () => {
    setBulkItems([...bulkItems, { uraian: "", satuan: "", volume: "", harga_satuan: "", ppn: 11 }]);
  };

  const handleBulkChange = (index, field, value) => {
    const newItems = [...bulkItems];
    newItems[index][field] = value;
    setBulkItems(newItems);
  };

  const handleBulkSubmit = async () => {
    try {
      if (!form.parent_id) return alert("Wajib pilih Parent terlebih dahulu!");
      
      const itemsToSubmit = bulkItems.filter(item => item.uraian.trim() !== "");
      
      if (itemsToSubmit.length === 0) return alert("Isi minimal satu uraian pekerjaan!");

      await api.post("/boq/bulk", {
        project_id: id,
        parent_id: form.parent_id,
        items: itemsToSubmit.map(item => ({
          ...item,
          volume: Number(item.volume) || 0,
          harga_satuan: Number(item.harga_satuan) || 0,
          ppn: Number(item.ppn) || 0
        }))
      });

      setShowModal(false);
      setBulkItems([{ uraian: "", satuan: "", volume: "", harga_satuan: "", ppn: 11 }]); 
      fetchBoq();
    } catch (err) {
      console.error(err);
      alert("Gagal simpan: " + (err.response?.data?.message || err.message));
    }
  };

  const [boq, setBoq] = useState([]);
  const [project, setProject] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    parent_id: "",
    kode: "",
    uraian: "",
    satuan: "",
    volume: "",
    harga_satuan: "",
    ppn: 11,
    tipe: "item"
  });

  const handleGenerateBobot = async () => {
    if (totalJumlah === 0) {
      return alert("Total seluruh pekerjaan masih 0. Isi harga item dulu!");
    }

    const confirmAction = window.confirm(
      `Hitung ulang bobot untuk ${itemOnly.length} item?`
    );

    if (!confirmAction) return;

    try {
      const updatePromises = itemOnly.map((item) => {
        const hasilBobotRaw = (Number(item.jumlah) / totalJumlah) * 100;
        const bobotFix = Number(hasilBobotRaw.toFixed(3));

        return api.patch(`/boq/${item.id}`, {
          bobot: bobotFix
        });
      });

      await Promise.all(updatePromises);
      alert("✅ Bobot berhasil diperbarui (Pembulatan 3 Desimal)!");
      fetchBoq(); 
    } catch (err) {
      console.error(err);
      alert("Gagal update bobot: " + (err.response?.data?.message || err.message));
    }
  };


  const handleSubmit = async () => {
    try {
      if (!form.uraian) return alert("Uraian wajib diisi");

      const payload = {
        ...form,
        project_id: id,
        parent_id: form.parent_id === "" ? null : form.parent_id,
        volume: form.tipe === "item" ? Number(form.volume) : null,
        harga_satuan: form.tipe === "item" ? Number(form.harga_satuan) : null,
        ppn: form.tipe === "item" ? Number(form.ppn) : null,
      };

      await api.post("/boq", payload);

      setShowModal(false);
      setForm({ 
        parent_id: "", 
        kode: "", 
        uraian: "", 
        satuan: "", 
        volume: "", 
        harga_satuan: "", 
        ppn: 11, 
        tipe: "item" 
      });
      fetchBoq();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Gagal menyimpan data");
    }
  };

  useEffect(() => {
    fetchProject();
    fetchBoq();
  }, [id]);

  const fetchProject = async () => {
    const res = await api.get(`/projects/${id}`);
    setProject(res.data);
  };

  const fetchBoq = async () => {
    const res = await api.get(`/boq/project/${id}`);
    setBoq(res.data);
  };

  // Kalkulasi form preview
  const rawJumlah = form.volume && form.harga_satuan ? form.volume * form.harga_satuan : 0;
  const jumlah = Number(rawJumlah.toFixed(2));
  const rawPajak = (jumlah * (form.ppn || 0)) / 100;
  const pajak = Number(rawPajak.toFixed(2));
  const jumlah_ppn = jumlah + pajak;

  // Header Analytics Data
  const itemOnly = boq.filter(item => item.tipe === "item");
  const totalHargaSatuan = itemOnly.reduce((acc, curr) => acc + Number(curr.harga_satuan || 0), 0);
  const totalJumlah = itemOnly.reduce((acc, curr) => acc + Number(curr.jumlah || 0), 0);
  const totalGrandTotal = itemOnly.reduce((acc, curr) => acc + Number(curr.jumlah_ppn || 0), 0);
  const totalBobot = itemOnly.reduce((sum, item) => sum + Number(item.bobot || 0), 0);

  // Pie Chart Data: Top 5 Items by Bobot
  const pieChartData = useMemo(() => {
    if (!itemOnly.length) return [];
    const sorted = [...itemOnly].sort((a, b) => Number(b.bobot) - Number(a.bobot));
    const top5 = sorted.slice(0, 5).map(i => ({ name: i.uraian.substring(0, 15) + "...", value: Number(i.bobot) }));
    const others = sorted.slice(5).reduce((acc, curr) => acc + Number(curr.bobot), 0);
    if (others > 0) {
      top5.push({ name: "Lainnya", value: Number(others.toFixed(2)) });
    }
    return top5;
  }, [itemOnly]);

  const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#94A3B8'];

  // Jika data belum load
  if (!project) {
    return (
      <div className="p-6 flex justify-center items-center h-[80vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-secondary"></div>
      </div>
    );
  }

  return (
    <>
      <div className="p-6 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">

        {/* 🔥 Header & Navigation */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(`/project/${id}`)} 
              className="p-2.5 rounded-xl bg-white shadow flex items-center justify-center border border-gray-100 hover:bg-gray-50 transition-colors active:scale-95"
            >
              <ArrowLeft size={24} className="text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <FileText className="text-blue-500"/> Bill of Quantities (BOQ)
              </h1>
              <p className="text-sm text-gray-500">Detail rincian kuantitas dan harga satuan — {project?.pekerjaan}</p>
            </div>
          </div>
          <div className="flex gap-2">
             <button
              onClick={() => setShowModal(true)}
              className="bg-blue-600 text-white px-4 py-2.5 rounded-xl transition shadow-sm hover:shadow-md hover:bg-blue-700 font-semibold flex items-center gap-2"
            >
              <Plus size={18} /> Tambah BOQ
            </button>
            <button
              onClick={handleGenerateBobot}
              className="bg-orange-500 text-white px-4 py-2.5 rounded-xl transition shadow-sm hover:shadow-md hover:bg-orange-600 font-semibold flex items-center gap-2"
            >
              <RefreshCw size={18} /> Generate Bobot
            </button>
          </div>
        </div>

        {/* 🔥 Analytics / Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Card 1: Total Anggaran */}
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl p-6 shadow-md text-white relative overflow-hidden md:col-span-2">
            <div className="absolute -right-6 -top-6 text-white/10">
              <Wallet size={120} />
            </div>
            <p className="text-blue-100 uppercase tracking-widest text-xs font-bold mb-2">Total Estimasi Harga (+PPN)</p>
            <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight mb-2">
               Rp {totalGrandTotal.toLocaleString("id-ID")}
            </h2>
            <div className="flex items-center gap-2 mt-4 text-sm bg-black/20 w-max px-3 py-1.5 rounded-full backdrop-blur-sm">
              <Calculator size={16} /> Base: Rp {totalJumlah.toLocaleString("id-ID")}
            </div>
          </div>

          {/* Card 2: Jumlah Item */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col justify-center">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-4">
              <PackageCheck size={24} />
            </div>
            <p className="text-gray-500 text-sm font-semibold mb-1">Item Pekerjaan Aktif</p>
            <h3 className="text-3xl font-black text-gray-800">{itemOnly.length}</h3>
          </div>

          {/* Card 3: Distribusi Bobot Chart */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col justify-center relative">
             <p className="text-gray-500 text-sm font-semibold mb-2 absolute top-6 left-6 z-10">Top Bobot Item</p>
             <div className="h-28 w-full mt-4">
               {pieChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <RechartsTooltip cursor={false} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Pie data={pieChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={45} stroke="none">
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
               ) : (
                 <div className="flex items-center justify-center h-full text-xs text-gray-400">Belum ada bobot</div>
               )}
             </div>
          </div>
        </div>

        {/* 🔥 TABLE BOQ */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200">
                <tr>
                  <th className="p-4 px-6 uppercase tracking-wider text-xs">Uraian Pekerjaan</th>
                  <th className="p-4 text-center uppercase tracking-wider text-xs">Satuan</th>
                  <th className="p-4 text-right uppercase tracking-wider text-xs">Volume</th>
                  <th className="p-4 text-right uppercase tracking-wider text-xs">Harga Satuan</th>
                  <th className="p-4 text-right uppercase tracking-wider text-xs">Jumlah</th>
                  <th className="p-4 text-center uppercase tracking-wider text-xs">PPN</th> 
                  <th className="p-4 text-right uppercase tracking-wider text-xs">Grand Total</th>
                  <th className="p-4 text-right px-6 uppercase tracking-wider text-xs">Bobot</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                  {boq.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-gray-400">
                        Belum ada rincian Bill of Quantities untuk proyek ini.
                      </td>
                    </tr>
                  )}
                  {boq.map((item) => (
                      <tr 
                      key={item.id} 
                      className={`transition-colors ${
                          item.tipe === "header" 
                          ? "bg-slate-100/80" 
                          : item.tipe === "subheader"
                          ? "bg-slate-50/50"   
                          : "hover:bg-blue-50/40 bg-white" 
                      }`}
                      >
                      {/* 1. URAIAN PEKERJAAN */}
                      <td
                          className={`p-4 px-6 text-sm ${
                          item.tipe === "header"
                              ? "font-bold text-gray-900 uppercase tracking-wide" 
                              : item.tipe === "subheader"
                              ? "font-semibold text-gray-800 pl-8" 
                              : "text-gray-600 pl-14" 
                          }`}
                      >
                          <div className="flex items-center gap-2">
                             {item.tipe !== "item" && <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>}
                             {item.uraian}
                          </div>
                      </td>

                      {/* 2. SATUAN */}
                      <td className="p-4 text-center text-gray-500">{item.satuan || "-"}</td>

                      {/* 3. VOLUME */}
                      <td className="p-4 text-right font-medium text-gray-700">
                          {item.volume ? Number(item.volume).toLocaleString("id-ID") : "-"}
                      </td>

                      {/* 4. HARGA SATUAN */}
                      <td className="p-4 text-right font-medium text-gray-700">
                          {item.harga_satuan ? Number(item.harga_satuan).toLocaleString("id-ID") : "-"}
                      </td>

                      {/* 5. JUMLAH */}
                      <td className={`p-4 text-right ${item.tipe !== 'item' ? 'font-bold text-gray-800' : 'text-gray-600'}`}>
                          {item.jumlah ? Number(item.jumlah).toLocaleString("id-ID") : "-"}
                      </td>

                      {/* 6. PPN */}
                      <td className="p-4 text-center">
                          {item.tipe === "item" ? (
                          <span className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg text-xs font-bold border border-indigo-100">
                              {item.ppn || 0}%
                          </span>
                          ) : "-"}
                      </td>

                      {/* 7. GRAND TOTAL */}
                      <td className={`p-4 text-right font-bold ${item.tipe === 'item' ? 'text-blue-600' : 'text-gray-900'}`}>
                          {item.jumlah_ppn ? Number(item.jumlah_ppn).toLocaleString("id-ID") : "-"}
                      </td>
                      
                      {/* 8. BOBOT */}
                      <td className="p-4 text-right px-6">
                        {item.tipe === "item" && item.bobot 
                            ? <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-1 rounded-md text-xs font-bold border border-amber-200">
                                {Number(item.bobot).toLocaleString("id-ID", { minimumFractionDigits: 3 })}%
                              </span>
                            : "-"}
                      </td>
                      </tr>
                  ))}
                  <tr className="bg-gray-800 text-white font-bold">
                      <td colSpan={3} className="p-4 px-6 text-center uppercase tracking-wider text-xs text-gray-300">Total Seluruh Pekerjaan</td>
                      <td className="p-4 text-right">
                        {totalHargaSatuan.toLocaleString("id-ID")}
                      </td>
                      <td className="p-4 text-right text-green-400">
                        {totalJumlah.toLocaleString("id-ID")}
                      </td>
                      <td className="p-4 text-center">-</td>
                      <td className="p-4 text-right text-blue-400">
                        {totalGrandTotal.toLocaleString("id-ID")}
                      </td>
                      <td className="p-4 text-right px-6 text-amber-400">
                          {totalBobot.toFixed(2)}%
                      </td>
                  </tr>
              </tbody>
            </table>
          </div>
        </div>

       {/* 🔥 MODALS */}
       {showModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
              
              <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Plus className="text-blue-500" /> Tambah Data BOQ</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-xl transition-colors">
                  <X size={20} strokeWidth={3} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto">
                <div className="bg-blue-50 text-blue-800 p-4 rounded-xl mb-6 text-sm border border-blue-100">
                  <p className="font-semibold mb-1">Mekanisme Pengisian:</p>
                  <ul className="list-disc pl-5 opacity-90 space-y-1 text-xs">
                    <li><b>Header/Sub-Header</b>: Sebagai pengelompok utama pekerjaan (Cth: Pekerjaan Persiapan).</li>
                    <li><b>Item Pekerjaan</b>: Pekerjaan spesifik yang memiliki nilai, volume, dan harga.</li>
                  </ul>
                </div>

                <div className="grid gap-4 mb-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Tipe Baris</label>
                    <select
                      className="w-full border-2 border-gray-200 rounded-xl p-3 bg-gray-50 text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium"
                      value={form.tipe}
                      onChange={(e) => setForm({ ...form, tipe: e.target.value, parent_id: "", volume: "", harga_satuan: "" })}
                    >
                      <option value="item">Item Pekerjaan (Detail)</option>
                      <option value="subheader">Sub-Header (Sub Kategori)</option>
                      <option value="header">Header Utama (Kategori Utama)</option>
                    </select>
                  </div>

                  {form.tipe !== "header" && (
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Induk Pekerjaan (Parent)</label>
                      <select
                        className="w-full border-2 border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        value={form.parent_id}
                        onChange={(e) => setForm({ ...form, parent_id: e.target.value })}
                      >
                        <option value="">-- Pilih Induk Pekerjaan --</option>
                        {boq
                          .filter((item) => item.tipe === "header" || item.tipe === "subheader")
                          .map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.kode} - {item.uraian}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}

                  {(form.tipe === "header" || form.tipe === "subheader") && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-1">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Kode</label>
                        <input
                          className="w-full border-2 border-gray-200 rounded-xl p-3 font-mono font-bold focus:ring-2 outline-none"
                          placeholder="Ex: A atau A.1"
                          value={form.kode}
                          onChange={(e) => setForm({ ...form, kode: e.target.value })}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Nama / Uraian</label>
                        <input
                          className="w-full border-2 border-gray-200 rounded-xl p-3 font-medium focus:ring-2 outline-none"
                          placeholder="Nama Pekerjaan / Judul Header"
                          value={form.uraian}
                          onChange={(e) => setForm({ ...form, uraian: e.target.value })}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 5. INPUT TEKNIS (Bulk Entry untuk Item) */}
                {form.tipe === "item" && (
                  <div className="mt-6 border-t border-gray-100 pt-6">
                    <div className="flex justify-between items-center mb-3">
                      <label className="text-sm font-bold text-gray-800 flex items-center gap-2"><FileText size={18} className="text-blue-500"/> Input Item Multiple</label>
                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">{bulkItems.length} Baris</span>
                    </div>
                    
                    <div className="space-y-4">
                      {bulkItems.map((item, index) => (
                        <div key={index} className="bg-gray-50/50 p-4 rounded-2xl border border-gray-200 relative group transition-all hover:border-blue-300 hover:shadow-md">
                          <button 
                            type="button"
                            className="absolute -top-3 -right-3 bg-red-100 text-red-600 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white"
                            onClick={() => setBulkItems(bulkItems.filter((_, i) => i !== index))}
                            title="Hapus Baris"
                          >
                            <Trash2 size={16} />
                          </button>

                          <div className="mb-3">
                            <input 
                              className="w-full border-2 border-gray-200 p-2.5 rounded-xl font-medium focus:border-blue-500 outline-none" 
                              placeholder="Uraian Rinci Pekerjaan" 
                              value={item.uraian}
                              onChange={(e) => handleBulkChange(index, "uraian", e.target.value)}
                            />
                          </div>

                          <div className="grid grid-cols-4 gap-3">
                            <div>
                              <label className="text-[10px] uppercase text-gray-500 font-bold mb-1 block">Satuan</label>
                              <input 
                                className="w-full border-2 border-gray-200 p-2 text-sm rounded-lg outline-none focus:border-blue-500" 
                                placeholder="m2, ls" 
                                value={item.satuan}
                                onChange={(e) => handleBulkChange(index, "satuan", e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="text-[10px] uppercase text-gray-500 font-bold mb-1 block">PPN (%)</label>
                              <input 
                                type="number" 
                                className="w-full border-2 border-gray-200 p-2 text-sm rounded-lg outline-none focus:border-blue-500" 
                                placeholder="11" 
                                value={item.ppn}
                                onChange={(e) => handleBulkChange(index, "ppn", e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="text-[10px] uppercase text-gray-500 font-bold mb-1 block">Volume</label>
                              <input 
                                type="number" 
                                className="w-full border-2 border-gray-200 p-2 text-sm rounded-lg outline-none focus:border-blue-500" 
                                placeholder="10.5" 
                                value={item.volume}
                                onChange={(e) => handleBulkChange(index, "volume", e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="text-[10px] uppercase text-gray-500 font-bold mb-1 block">Harga Satuan</label>
                              <input 
                                type="number" 
                                className="w-full border-2 border-gray-200 p-2 text-sm rounded-lg outline-none focus:border-blue-500" 
                                placeholder="50000" 
                                value={item.harga_satuan}
                                onChange={(e) => handleBulkChange(index, "harga_satuan", e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                      ))}

                      <button 
                        type="button"
                        onClick={addBulkRow}
                        className="w-full py-3 border-2 border-dashed border-blue-300 text-blue-600 text-sm font-bold rounded-2xl hover:bg-blue-50 bg-white transition-colors"
                      >
                        + TAMBAH BARIS PEKERJAAN
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 7. TOMBOL AKSI */}
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-3xl mt-auto">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={form.tipe === "item" ? handleBulkSubmit : handleSubmit}
                  className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-md transition-colors flex items-center gap-2"
                >
                  <CheckCircle size={18} /> {form.tipe === "item" ? `Simpan ${bulkItems.length} Item` : "Simpan Data"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}