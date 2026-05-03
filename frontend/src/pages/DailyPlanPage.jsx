import { useEffect, useState } from "react";
import api from "../api";
import { useParams, useNavigate } from "react-router-dom";
import { useProject } from "../context/ProjectContext";
import { ArrowLeft, CalendarDays, BarChart as BarChartIcon, Zap, Calendar as CalIcon, CalendarPlus, Clock, CalendarRange } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line
} from 'recharts';
import { m, AnimatePresence, spring } from 'framer-motion';

export default function DailyPlanPage() {
  const { id: paramId } = useParams();
  const { selectedProject } = useProject();
  const id = selectedProject?.id || paramId;
  const projectId = id;
  const navigate = useNavigate();

  const [data, setData] = useState([]);
  const [weekly, setWeekly] = useState([]);
  const [monthly, setMonthly] = useState([]);
  const [loading, setLoading] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [periods, setPeriods] = useState([]);
  const [editId, setEditId] = useState(null);

  const [form, setForm] = useState({
    bulan_ke: "",
    nama: "",
    start_date: "",
    end_date: ""
  });

  const fetchAll = async () => {
    try {
      const dailyRes = await api.get(`/daily-plan/${projectId}`);
      const weeklyRes = await api.get(`/daily-plan/weekly-report/${projectId}`);
      const monthlyRes = await api.get(`/daily-plan/monthly-report/${projectId}`);

      setData(dailyRes.data);
      setWeekly(weeklyRes.data);
      setMonthly(monthlyRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPeriods = async () => {
    try {
      const res = await api.get(`/project-periods?project_id=${projectId}`);
      setPeriods(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAll();
    fetchPeriods();
  }, [projectId]);


  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async () => {
    try {
      if (editId) {
        // UPDATE
        await api.put(`/project-periods/${editId}`, {
          ...form,
          project_id: projectId
        });
      } else {
        // CREATE
        await api.post("/project-periods", {
          ...form,
          project_id: projectId
        });
      }

      // reset
      setForm({
        bulan_ke: "",
        nama: "",
        start_date: "",
        end_date: ""
      });
      setEditId(null);

      fetchPeriods();
    } catch (err) {
      alert("Gagal simpan");
    }
  };

  const handleDelete = async (id) => {
    const confirm = window.confirm("Hapus termin?");
    if (!confirm) return;

    try {
      await api.delete(`/project-periods/${id}`);
      fetchPeriods();
    } catch (err) {
      alert("Gagal hapus");
    }
  };

  const handleGenerate = async () => {
    const confirm = window.confirm("Generate ulang rencana harian? Data lama akan diperbarui.");
    if (!confirm) return;

    setLoading(true);
    try {
      await api.post(`/daily-plan/generate/${projectId}`);
      alert("✅ Daily Plan Berhasil Di-generate!");
      fetchAll();
    } catch (err) {
      alert(err.response?.data?.message || "Gagal Generate Plan");
    } finally {
      setLoading(false);
    }
  };

  // Prepare chart data format
  const chartDataWeekly = weekly.map(w => ({
    name: `M-${w.minggu_ke}`,
    Bobot: Number(w.bobot_mingguan).toFixed(2),
    Kumulatif: Number(w.kumulatif).toFixed(2)
  }));

  return (
    <>
      <div className="p-6 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate("/dashboard")}
            className="p-2.5 rounded-xl bg-white shadow-sm border border-gray-100 text-gray-600 hover:text-secondary hover:border-secondary transition-all active:scale-95 cursor-pointer"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="flex flex-wrap gap-3">

            {/* Periode Termin */}
            <button
              onClick={() => {
                setShowModal(true);
                fetchPeriods();
              }}
              disabled={loading}
              className={`
                flex items-center gap-2 px-5 py-2.5 rounded font-semibold bg-transparent border border-success text-success hover:bg-success/10 transition-all active:scale-95 cursor-pointer
                ${loading ? "opacity-50 cursor-not-allowed" : ""}
              `}
            >
              <CalendarRange size={18} />
              Periode Termin
            </button>

            {/* Generate Plan */}
            <button
              onClick={handleGenerate}
              disabled={loading}
              className={`
                flex items-center gap-2 px-5 py-2.5 rounded font-semibold bg-success hover:bg-transparent text-white hover:text-success border-2 border-transparent hover:border-success transition-all active:scale-95 cursor-pointer
                ${loading ? "opacity-50 cursor-not-allowed" : ""}
              `}
            >
              <Zap size={18} className={loading ? "animate-pulse" : ""} />
              {loading ? "Memproses..." : "Generate Plan"}
            </button>

          </div>
        </div>
        {/* HEADER & TOMBOL GENERATE */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <div className="flex items-center gap-4">

            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                Daily Plan
              </h1>
              <p className=" text-gray-500">Rincian target bobot pekerjaan secara harian, mingguan, & bulanan.</p>
            </div>
          </div>


        </div>

        {/* --- CHARTS OVERVIEW --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-white rounded-md p-6 shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"> Rencana Bobot per Minggu</h3>
                <p className="text-sm text-gray-500">Distribusi beban kerja mingguan</p>
              </div>
              <div className="flex gap-4 text-xs font-bold bg-gray-50 px-3 py-1.5 rounded-full">
                <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-emerald-400 rounded-full"></div> Per Minggu</span>
                <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-blue-500 rounded-full"></div> Kumulatif</span>
              </div>
            </div>
            <div className="h-64 w-full">
              {chartDataWeekly.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartDataWeekly} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                    <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <RechartsTooltip
                      cursor={{ fill: '#f1f5f9' }}
                      contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar yAxisId="left" dataKey="Bobot" fill="#34D399" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    <Line yAxisId="right" type="monotone" dataKey="Kumulatif" stroke="#3B82F6" strokeWidth={3} dot={{ strokeWidth: 2, r: 4, fill: '#fff' }} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400 text-sm border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50">Belum ada data mingguan direkam.</div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-md p-6 shadow-sm border border-gray-100 flex flex-col">
            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">Ringkasan Durasi</h3>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-2xl flex justify-between items-center border border-gray-100">
                <span className="text-sm font-bold text-gray-600">Total Hari Kerja</span>
                <span className="text-2xl font-black text-gray-800">{data.length} <span className="text-sm font-bold text-gray-400">Hari</span></span>
              </div>
              <div className="p-4 bg-emerald-50 rounded-2xl flex justify-between items-center border border-emerald-100">
                <span className="text-sm font-bold text-emerald-700">Total Minggu</span>
                <span className="text-2xl font-black text-emerald-600">{weekly.length} <span className="text-sm font-bold text-emerald-400">Pekan</span></span>
              </div>
              <div className="p-4 bg-blue-50 rounded-2xl flex justify-between items-center border border-blue-100">
                <span className="text-sm font-bold text-blue-700">Total Bulan</span>
                <span className="text-2xl font-black text-blue-600">{monthly.length} <span className="text-sm font-bold text-blue-400">Bulan</span></span>
              </div>
            </div>
          </div>
        </div>

        {/* --- TABEL BULANAN & MINGGUAN ROW --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* TABEL BULANAN */}
          <div className="bg-white rounded-md shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-muted-gray">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">Rencana Bobot Bulanan</h2>
            </div>
            <div className="overflow-x-auto p-4 custom-scrollbar">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-gray-500 border-b border-gray-200">
                    <th className="pb-3 px-3">Bulan</th>
                    <th className="pb-3 px-3">Tgl Awal - Akhir</th>
                    <th className="pb-3 px-3 text-right">Bobot</th>
                    <th className="pb-3 px-3 text-right">Kumulatif</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {monthly.map((item, i) => (
                    <tr key={i} className="hover:bg-blue-50/50 transition-colors">
                      <td className="py-3 px-3 font-bold text-gray-800">Bl-{item.bulan_ke}</td>
                      <td className="py-3 px-3 text-xs text-gray-500 whitespace-nowrap">{new Date(item.tgl_awal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })} - {new Date(item.tgl_akhir).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</td>
                      <td className="py-3 px-3 text-right font-mono text-gray-600">{Number(item.bobot_bulanan).toFixed(3)}%</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-blue-600">{Number(item.kumulatif).toFixed(3)}%</td>
                    </tr>
                  ))}
                  {monthly.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-gray-400 italic">Belum ada data bulanan tergenerate.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          {/* TABEL MINGGUAN */}
          <div className="bg-white rounded-md shadow-sm border border-gray-100 overflow-hidden max-h-[400px] flex flex-col">
            <div className="p-5 border-b border-muted-gray shrink-0">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">Rencana Bobot Mingguan</h2>
            </div>
            <div className="overflow-y-auto overflow-x-auto p-4 custom-scrollbar flex-1">
              <table className="w-full text-sm relative">
                <thead className="sticky top-0 bg-white/90 z-10 shadow-sm py-2">
                  <tr className="text-left text-xs uppercase tracking-wider text-gray-500 border-b border-gray-200">
                    <th className="pb-3 px-3">Minggu</th>
                    <th className="pb-3 px-3">Periode</th>
                    <th className="pb-3 px-3 text-right">Bobot</th>
                    <th className="pb-3 px-3 text-right">Kumulatif</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {weekly.map((item, i) => (
                    <tr key={i} className="hover:bg-emerald-50/50 transition-colors">
                      <td className="py-3 px-3 font-bold text-gray-800">Mg-{item.minggu_ke}</td>
                      <td className="py-3 px-3 text-xs text-gray-500 whitespace-nowrap">{new Date(item.tgl_awal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })} s/d {new Date(item.tgl_akhir).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</td>
                      <td className="py-3 px-3 text-right font-mono text-gray-600">{Number(item.bobot_mingguan).toFixed(3)}%</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600">{Number(item.kumulatif).toFixed(3)}%</td>
                    </tr>
                  ))}
                  {weekly.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-gray-400 italic">Belum ada data mingguan tergenerate.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* --- TABEL DAILY --- */}
        <div className="bg-white rounded-md shadow-sm border border-gray-100 overflow-hidden mb-12">
          <div className="p-5 border-b border-muted-gray flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-800">Rencana Bobot Harian (Detail)</h2>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-100 px-3 py-1 rounded-full">{data.length} Hari Aktif</span>
          </div>
          <div className="overflow-x-auto p-2 custom-scrollbar max-h-[500px]">
            <table className="w-full text-sm relative">
              <thead className="sticky top-0 bg-white/95 backdrop-blur-md z-10 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)]">
                <tr className="text-left text-xs uppercase tracking-wider text-gray-500">
                  <th className="py-4 px-4 w-[80px]">Hari Ke</th>
                  <th className="py-4 px-4">Tanggal / Hari</th>
                  <th className="py-4 px-4 text-center">Minggu</th>
                  <th className="py-4 px-4 text-center">Bulan</th>
                  <th className="py-4 px-4 text-right">Bobot Mingguan</th>
                  <th className="py-4 px-4 text-right text-indigo-600 font-bold">Bobot Harian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-gray-800 text-center bg-gray-50/50">{item.hari_ke}</td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-800">{new Date(item.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                      <div className="text-xs text-gray-400 capitalize">{item.nama_hari}</div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-xs font-bold border border-emerald-100">Mg-{item.minggu_ke}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-bold border border-blue-100">Bl-{item.bulan_ke}</span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-gray-500">{Number(item.bobot_mingguan).toFixed(3)}%</td>
                    <td className="py-3 px-4 text-right font-mono font-black text-indigo-600 bg-indigo-50/30">{Number(item.bobot_harian).toFixed(3)}%</td>
                  </tr>
                ))}
                {data.length === 0 && <tr><td colSpan={6} className="py-12 text-center text-gray-400 italic font-medium">Klik tombol Generate Plan untuk membuat jadwal tabel harian.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      <AnimatePresence>
        {showModal && (
          <m.div transition={{ duration: 0.1 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40  flex items-center justify-center z-50">

            <m.div transition={{ duration: 0.3 }} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} className="bg-white w-full max-w-3xl rounded-md p-6 shadow-xl border border-gray-100 animate-in zoom-in-95">

              {/* HEADER */}
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Periode Termin</h2>
                  <p className="text-sm text-gray-500">Kelola periode pekerjaan proyek</p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-secondary transition-all text-lg"
                >
                  ✕
                </button>
              </div>

              {/* LIST */}
              <div className=" mb-4 rounded overflow-hidden border-b-2 border-muted-gray pb-4">
                {periods.map((p) => (
                  <div
                    key={p.id}
                    className="flex justify-between items-center py-3.5 border-b border-muted-gray last:border-none  transition"
                  >
                    <div>
                      <div className="font-semibold text-gray-800">
                        {p.nama}
                        <span className="ml-2 text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded">
                          Bulan {p.bulan_ke}
                        </span>
                      </div>

                      <div className="text-xs text-gray-500">
                        {new Date(p.start_date).toLocaleDateString("id-ID")} -{" "}
                        {new Date(p.end_date).toLocaleDateString("id-ID")}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditId(p.id);
                          setForm({
                            bulan_ke: p.bulan_ke,
                            nama: p.nama,
                            start_date: p.start_date?.slice(0, 10),
                            end_date: p.end_date?.slice(0, 10),
                          });
                        }}
                        className="px-3 py-1 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => handleDelete(p.id)}
                        className="px-3 py-1 text-xs bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                ))}

                {periods.length === 0 && (
                  <div className="text-center text-gray-400 p-6">
                    Belum ada termin
                  </div>
                )}
              </div>

              {/* FORM */}
              <div className="grid grid-cols-2 gap-4 mb-5">
                <div>
                  <label className="text-xs text-gray-500">Bulan ke</label>
                  <input
                    type="number"
                    name="bulan_ke"
                    value={form.bulan_ke}
                    onChange={handleChange}
                    className="w-full border border-gray-200 p-2 rounded-xl focus:ring-2 focus:ring-emerald-400 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-500">Nama Termin</label>
                  <input
                    type="text"
                    name="nama"
                    placeholder="Termin 1"
                    value={form.nama}
                    onChange={handleChange}
                    className="w-full border border-gray-200 p-2 rounded-xl focus:ring-2 focus:ring-emerald-400 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-500">Tanggal Mulai</label>
                  <input
                    type="date"
                    name="start_date"
                    value={form.start_date}
                    onChange={handleChange}
                    className="w-full border border-gray-200 p-2 rounded-xl"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-500">Tanggal Selesai</label>
                  <input
                    type="date"
                    name="end_date"
                    value={form.end_date}
                    onChange={handleChange}
                    className="w-full border border-gray-200 p-2 rounded-xl"
                  />
                </div>
              </div>

              {/* ACTION BUTTON */}
              <div className="flex items-center justify-end gap-3 mb-5 mt-4">
                {editId && (
                  <button
                    onClick={() => {
                      setEditId(null);
                      setForm({
                        bulan_ke: "",
                        nama: "",
                        start_date: "",
                        end_date: ""
                      });
                    }}
                    className="px-5 py-2.5 rounded bg-white border border-gray-300 hover:bg-gray-100 transition-all cursor-pointer active:scale-95"
                  >
                    Batal Edit
                  </button>
                )}

                <button
                  onClick={handleSubmit}
                  className={`px-5 py-2.5 rounded text-white font-semibold transition-all cursor-pointer active:scale-95 ${editId
                    ? "bg-info hover:bg-info/90"
                    : "bg-success hover:bg-success/90"
                    }`}
                >
                  {editId ? "Update Termin" : "+ Tambah Termin"}
                </button>
              </div>

            </m.div>
          </m.div>
        )}
      </AnimatePresence>

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