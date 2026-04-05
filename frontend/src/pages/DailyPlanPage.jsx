import { useEffect, useState } from "react";
import api from "../api";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, CalendarDays, BarChart as BarChartIcon, Zap, Calendar as CalIcon, CalendarPlus, Clock } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line
} from 'recharts';

export default function DailyPlanPage() {
  const { id } = useParams();
  const projectId = id;
  const navigate = useNavigate();

  const [data, setData] = useState([]);
  const [weekly, setWeekly] = useState([]);
  const [monthly, setMonthly] = useState([]);
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    fetchAll();
  }, [projectId]);

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
        
        {/* HEADER & TOMBOL GENERATE */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(`/project/${id}`)} 
              className="p-2.5 rounded-xl bg-white shadow flex items-center justify-center border border-gray-100 hover:bg-gray-50 transition-colors active:scale-95"
            >
              <ArrowLeft size={24} className="text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <CalendarPlus className="text-emerald-500"/> Daily Plan
              </h1>
              <p className="text-sm text-gray-500">Rincian target bobot pekerjaan secara harian, mingguan, & bulanan.</p>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className={`${
              loading ? "bg-gray-200 text-gray-500" : "bg-emerald-600 hover:bg-emerald-700 text-white"
            } px-5 py-2.5 rounded-xl font-bold border-2 border-transparent shadow flex items-center gap-2 transition-all active:scale-95`}
          >
            <Zap size={18} /> {loading ? "Memproses..." : "Generate Plan Otomatis"}
          </button>
        </div>

        {/* --- CHARTS OVERVIEW --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
           <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
              <div className="flex justify-between items-start mb-6">
                 <div>
                   <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><BarChartIcon size={20} className="text-emerald-500"/> Rencana Bobot per Minggu</h3>
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

           <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col justify-center">
              <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2"><Clock size={20} className="text-indigo-500"/> Ringkasan Durasi</h3>
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
           <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
             <div className="p-5 border-b border-gray-100 bg-blue-50/50">
               <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><CalIcon size={18} className="text-blue-500"/> Rencana Bobot Bulanan</h2>
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
                       <td className="py-3 px-3 text-xs text-gray-500 whitespace-nowrap">{new Date(item.tgl_awal).toLocaleDateString('id-ID',{day:'2-digit', month:'short'})} - {new Date(item.tgl_akhir).toLocaleDateString('id-ID',{day:'2-digit', month:'short'})}</td>
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
           <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden max-h-[400px] flex flex-col">
             <div className="p-5 border-b border-gray-100 bg-emerald-50/50 shrink-0">
               <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><CalendarDays size={18} className="text-emerald-500"/> Rencana Bobot Mingguan</h2>
             </div>
             <div className="overflow-y-auto overflow-x-auto p-4 custom-scrollbar flex-1">
               <table className="w-full text-sm relative">
                 <thead className="sticky top-0 bg-white/90 backdrop-blur-sm z-10 shadow-sm">
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
                       <td className="py-3 px-3 text-xs text-gray-500 whitespace-nowrap">{new Date(item.tgl_awal).toLocaleDateString('id-ID',{day:'2-digit', month:'short'})} s/d {new Date(item.tgl_akhir).toLocaleDateString('id-ID',{day:'2-digit', month:'short'})}</td>
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
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-12">
          <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
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
                      <div className="font-medium text-gray-800">{new Date(item.tanggal).toLocaleDateString('id-ID',{day:'numeric', month:'long', year:'numeric'})}</div>
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