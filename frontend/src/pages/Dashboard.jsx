import { useEffect, useState } from "react";
import api from "../api";
import {
   Building2, Briefcase, Wallet, TrendingUp, CheckCircle, Clock, PieChart as PieChartIcon, Target, Activity, HardHat, Calendar
} from "lucide-react";
import {
   AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Cell
} from 'recharts';
import { useOutletContext } from "react-router-dom";

export default function Dashboard() {
   // get user context from layout
   const { user } = useOutletContext() || { user: {} };

   const [projects, setProjects] = useState([]);

   useEffect(() => {
      fetchProjects();
   }, []);

   const fetchProjects = async () => {
      try {
         const res = await api.get("/projects");
         setProjects(res.data);
      } catch (err) {
         console.error(err);
      }
   };

   // ----- Kalkulasi Statistik -----
   const totalProjects = projects.length;
   const totalNilaiKontrak = projects.reduce((acc, curr) => acc + Number(curr.nilai_kontrak || 0), 0);

   // Format mata uang rupiah
   const formatRupiah = (number) => {
      return new Intl.NumberFormat("id-ID", {
         style: "currency",
         currency: "IDR",
         minimumFractionDigits: 0,
         maximumFractionDigits: 0,
      }).format(number);
   };

   // ----- Data Dummy untuk Chart Keseluruhan Sistem -----
   const financialData = [
      { name: 'Jan', Pengeluaran: 400, Budget: 500 },
      { name: 'Feb', Pengeluaran: 600, Budget: 550 },
      { name: 'Mar', Pengeluaran: 750, Budget: 800 },
      { name: 'Apr', Pengeluaran: 1200, Budget: 1100 },
      { name: 'Mei', Pengeluaran: 900, Budget: 1200 },
      { name: 'Jun', Pengeluaran: 1400, Budget: 1500 },
   ];

   const overallProgressData = [
      { name: 'Selesai', value: 45, color: '#22c55e' }, // success
      { name: 'Berjalan', value: 35, color: '#ff5511' }, // secondary
      { name: 'Menunggu', value: 20, color: '#facc15' }, // warning
   ];

   return (
      <div className="p-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-screen">

         {/* HEADER DASHBOARD CAKUPAN SISTEM */}
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
               <div className="flex items-center gap-3 mb-2">
                  <span className="bg-accent text-secondary font-bold px-3 py-1 rounded-full text-xs tracking-wider">
                     {user?.role === "admin" ? "ADMIN VIEW" : "STAFF VIEW"}
                  </span>
               </div>
               <h1 className="text-3xl font-black text-primary flex items-center gap-3">
                  <Activity className="text-secondary" size={32} /> Monitoring Terpadu
               </h1>
               <p className="text-gray-500 mt-2 font-medium">Melacak kinerja finansial dan operasional seluruh portofolio proyek konstruksi.</p>
            </div>

            <div className="bg-neutral p-4 rounded-2xl shadow-sm border border-muted-gray flex items-center gap-4">
               <div className="bg-primary/5 p-3 rounded-xl border border-primary/10">
                  <HardHat className="text-primary" size={24} />
               </div>
               <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Aktivitas Sistem</p>
                  <p className="text-primary font-black">{totalProjects} Proyek Aktif</p>
               </div>
            </div>
         </div>

         {/* 🚀 QUICK STATS CARDS */}
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-neutral p-6 rounded-3xl shadow-sm border border-muted-gray hover:border-secondary transition-colors group relative overflow-hidden">
               <div className="absolute top-0 right-0 w-24 h-24 bg-secondary/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500"></div>
               <div className="bg-accent text-secondary w-12 h-12 rounded-xl flex items-center justify-center mb-6 relative z-10">
                  <Briefcase size={24} />
               </div>
               <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2 relative z-10">Total Proyek</p>
               <h3 className="text-3xl font-black text-primary relative z-10">{totalProjects}</h3>
               <p className="text-xs text-gray-400 mt-2 font-medium relative z-10">+2 dari bulan lalu</p>
            </div>

            <div className="bg-neutral p-6 rounded-3xl shadow-sm border border-muted-gray hover:border-primary transition-colors group relative overflow-hidden">
               <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500"></div>
               <div className="bg-primary/10 text-primary w-12 h-12 rounded-xl flex items-center justify-center mb-6 relative z-10">
                  <Wallet size={24} />
               </div>
               <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2 relative z-10">Nilai Portofolio (Aktif)</p>
               <h3 className="text-2xl font-black text-primary relative z-10 leading-tight">
                  {totalNilaiKontrak > 0 ? formatRupiah(totalNilaiKontrak) : "Rp 0"}
               </h3>
               <p className="text-xs text-secondary mt-2 font-bold relative z-10 flex items-center gap-1"><TrendingUp size={14} /> Potensi margin stabil</p>
            </div>

            <div className="bg-neutral p-6 rounded-3xl shadow-sm border border-muted-gray hover:border-success transition-colors group relative overflow-hidden">
               <div className="absolute top-0 right-0 w-24 h-24 bg-success/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500"></div>
               <div className="bg-success/20 text-success w-12 h-12 rounded-xl flex items-center justify-center mb-6 relative z-10">
                  <CheckCircle size={24} />
               </div>
               <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2 relative z-10">Proyek Selesai Tepat Waktu</p>
               <h3 className="text-3xl font-black text-primary relative z-10">8 <span className="text-lg text-gray-400 font-medium">/ 10</span></h3>
               <p className="text-xs text-gray-400 mt-2 font-medium relative z-10">Track record tahun ini (Dummy)</p>
            </div>

            <div className="bg-neutral p-6 rounded-3xl shadow-sm border border-muted-gray hover:border-warning transition-colors group relative overflow-hidden">
               <div className="absolute top-0 right-0 w-24 h-24 bg-warning/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500"></div>
               <div className="bg-warning/20 text-warning w-12 h-12 rounded-xl flex items-center justify-center mb-6 relative z-10">
                  <Clock size={24} />
               </div>
               <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2 relative z-10">Rata-rata Deviasi Kritis</p>
               <h3 className="text-3xl font-black text-primary relative z-10">-1.2<span className="text-lg text-gray-400 font-medium">%</span></h3>
               <p className="text-xs text-warning mt-2 font-bold relative z-10">Waspada: Memerlukan intervensi</p>
            </div>
         </div>

         {/* 🚀 ANALYTICS SECTIONS */}
         <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">

            {/* CHART PENGELUARAN VS BUDGET */}
            <div className="bg-neutral p-8 rounded-3xl shadow-sm border border-muted-gray xl:col-span-2 flex flex-col justify-between">
               <div className="flex justify-between items-start mb-6">
                  <div>
                     <h3 className="text-xl font-bold text-primary flex items-center gap-2"><TrendingUp className="text-secondary" size={20} /> Tinjauan Arus Kas Gabungan</h3>
                     <p className="text-sm text-gray-500 mt-1">Estimasi Pengeluaran Aktual vs Budget Perencanaan (Juta Rupiah)</p>
                  </div>
                  <div className="flex gap-4 text-xs font-bold bg-background px-4 py-2 rounded-xl border border-muted-gray">
                     <span className="flex items-center gap-2"><div className="w-3 h-3 bg-secondary rounded-full shadow-sm"></div> Aktual</span>
                     <span className="flex items-center gap-2"><div className="w-3 h-3 bg-gray-300 rounded-full shadow-sm"></div> Budget</span>
                  </div>
               </div>

               <div className="h-64 sm:h-80 w-full relative -ml-4">
                  <ResponsiveContainer width="100%" height="100%">
                     <AreaChart data={financialData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                           <linearGradient id="colorAktual" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="var(--color-secondary, #ff5511)" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="var(--color-secondary, #ff5511)" stopOpacity={0} />
                           </linearGradient>
                           <linearGradient id="colorBudget" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#CBD5E1" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#CBD5E1" stopOpacity={0} />
                           </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dx={-5} />
                        <RechartsTooltip
                           cursor={{ stroke: '#94A3B8', strokeWidth: 1, strokeDasharray: '4 4' }}
                           contentStyle={{ borderRadius: '16px', border: '1px solid #E2E8F0', padding: '12px', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)' }}
                        />
                        <Area type="monotone" dataKey="Budget" stroke="#94A3B8" strokeWidth={3} fill="url(#colorBudget)" />
                        <Area type="monotone" dataKey="Pengeluaran" stroke="var(--color-secondary, #ff5511)" strokeWidth={4} fill="url(#colorAktual)" />
                     </AreaChart>
                  </ResponsiveContainer>
               </div>
            </div>

            {/* CHART DISTRIBUSI PROGRESS */}
            <div className="bg-neutral p-8 rounded-3xl shadow-sm border border-muted-gray flex flex-col">
               <h3 className="text-xl font-bold text-primary flex items-center gap-2 mb-2"><Target className="text-primary" size={20} /> Status Konstruksi</h3>
               <p className="text-sm text-gray-500 mb-6">Konsolidasi kemajuan seluruh paket / cluster pekerjaan portofolio.</p>

               <div className="flex-1 min-h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={overallProgressData} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 'bold', fill: '#475569' }} />
                        <RechartsTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={32}>
                           {overallProgressData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                           ))}
                        </Bar>
                     </BarChart>
                  </ResponsiveContainer>
               </div>

               <div className="pt-4 border-t border-muted-gray mt-2 space-y-3">
                  <div className="flex justify-between items-center text-sm">
                     <span className="font-bold text-gray-600 flex items-center gap-2"><div className="w-2.5 h-2.5 bg-success rounded-full"></div> Pekerjaan Selesai</span>
                     <span className="font-black text-primary">45%</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                     <span className="font-bold text-gray-600 flex items-center gap-2"><div className="w-2.5 h-2.5 bg-secondary rounded-full"></div> Tahap Pelaksanaan</span>
                     <span className="font-black text-primary">35%</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                     <span className="font-bold text-gray-600 flex items-center gap-2"><div className="w-2.5 h-2.5 bg-warning rounded-full"></div> Persiapan / Menunggu</span>
                     <span className="font-black text-primary">20%</span>
                  </div>
               </div>
            </div>
         </div>

         {/* 🚀 QUICK LIST: TOP PEKERJAAN AKTIF */}
         <div className="bg-neutral rounded-3xl shadow-sm border border-muted-gray overflow-hidden">
            <div className="p-6 border-b border-muted-gray flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-background/50">
               <div>
                  <h3 className="text-lg font-bold text-primary flex items-center gap-2"><Building2 size={20} className="text-secondary" /> Daftar Proyek Kontraktor Aktif</h3>
                  <p className="text-xs text-gray-500 mt-1">Sistem menampilkan semua kegiatan proyek yang terdaftar di database manajemen.</p>
               </div>
            </div>

            <div className="overflow-x-auto">
               <table className="w-full text-left text-sm">
                  <thead className="bg-white">
                     <tr className="text-xs uppercase tracking-wider text-gray-500 border-b border-muted-gray">
                        <th className="p-4 pl-6 font-bold">Instansi / Kegiatan</th>
                        <th className="p-4 font-bold">Sub Pekerjaan</th>
                        <th className="p-4 font-bold text-center">Konsultan / Kontraktor</th>
                        <th className="p-4 font-bold text-right pr-6">Nilai Kontrak</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                     {projects.length === 0 ? (
                        <tr>
                           <td colSpan="4" className="p-12 text-center text-gray-400 font-medium italic">
                              Belum ada proyek yang terdaftar di sistem. Mulai tambahkan melalui menu "Project Manajemen".
                           </td>
                        </tr>
                     ) : (
                        projects.map((proj) => (
                           <tr key={proj.id} className="hover:bg-accent/20 transition-colors group">
                              <td className="p-4 pl-6">
                                 <p className="font-bold text-primary">{proj.kegiatan || "-"}</p>
                                 <p className="text-xs text-gray-400 mt-1 flex items-center gap-1"><Calendar size={12} /> T.A: {proj.tahun}</p>
                              </td>
                              <td className="p-4">
                                 <p className="font-semibold text-gray-700 max-w-sm truncate" title={proj.pekerjaan}>{proj.pekerjaan}</p>
                                 <span className="inline-block mt-1 bg-background border border-muted-gray text-gray-500 text-[10px] font-bold px-2 py-0.5 rounded-md">Lok: {proj.lokasi}</span>
                              </td>
                              <td className="p-4">
                                 <div className="flex flex-col gap-1 items-center">
                                    <span className="bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-bold px-2 py-0.5 rounded shadow-sm w-full text-center truncate max-w-[150px]" title={`Konsultan: ${proj.konsultan}`}>K: {proj.konsultan || "TBA"}</span>
                                    <span className="bg-orange-50 text-orange-700 border border-orange-100 text-[10px] font-bold px-2 py-0.5 rounded shadow-sm w-full text-center truncate max-w-[150px]" title={`Kontraktor: ${proj.kontraktor}`}>P: {proj.kontraktor || "TBA"}</span>
                                 </div>
                              </td>
                              <td className="p-4 pr-6 text-right">
                                 <p className="font-black text-primary font-mono text-base">{formatRupiah(proj.nilai_kontrak)}</p>
                                 <p className="text-xs text-gray-400 font-medium mt-1">Waktu: <span className="text-secondary font-bold">{proj.waktu_pelaksanaan} Hari</span></p>
                              </td>
                           </tr>
                        ))
                     )}
                  </tbody>
               </table>
            </div>
         </div>

      </div>
   );
}