import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api";
import { ArrowLeft, BarChart3, Calendar, TrendingUp, TrendingDown, CheckCircle, AlertTriangle } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LabelList, Cell
} from 'recharts';

export default function MonthlyReportPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(null);

  const fetchReport = async () => {
    try {
      const res = await api.get(`/monthly-report/${id}`);
      setData(res.data);

      if (res.data.length > 0) {
        setSelectedMonth(res.data[0].bulan_ke);
      }
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [id]);

  const bulan = data.find((b) => b.bulan_ke === selectedMonth);

  // Formatting helpers
  const format = (val) => Number(val || 0).toFixed(3);
  const getDeviasiColor = (deviasi) => {
    if (Math.abs(deviasi) < 0.001) return "text-blue-600"; // 🔥 sesuai
    if (deviasi > 0) return "text-emerald-600"; // lebih cepat
    return "text-red-500"; // terlambat
  };

  const getDeviasiBgColor = (deviasi) => {
    if (Math.abs(deviasi) < 0.001) return "bg-blue-50 border-blue-200";
    if (deviasi > 0) return "bg-emerald-50 border-emerald-200";
    return "bg-red-50 border-red-200";
  };

  let DeviasiIcon;

  if (Math.abs(bulan?.deviasi) < 0.001) {
    DeviasiIcon = CheckCircle; // 🔥 sesuai target
  } else if (bulan?.deviasi > 0) {
    DeviasiIcon = TrendingUp;
  } else {
    DeviasiIcon = TrendingDown;
  }

  const persenTarget = bulan?.rencana ? ((bulan.real / bulan.rencana) * 100) : 0;

  // Chart Data preparation
  const chartData = bulan ? [
    { name: 'Rencana', Bobot: Number(bulan.rencana), fillColor: '#CBD5E1' }, // gray
    { name: 'Realisasi', Bobot: Number(bulan.real), fillColor: bulan.deviasi >= 0 ? '#10B981' : '#EF4444' } // green/red
  ] : [];

  return (
    <>
      <div className="p-6 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(`/project/${id}`)} 
              className="p-2.5 rounded-xl bg-white shadow flex items-center justify-center border border-gray-100 hover:bg-gray-50 transition-colors active:scale-95"
            >
              <ArrowLeft size={24} className="text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <BarChart3 className="text-pink-500"/> Laporan Analisa Bulanan
              </h1>
              <p className="text-sm text-gray-500">Evaluasi performa komprehensif proyek tingkat bulanan</p>
            </div>
          </div>
          
          <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
             <label className="text-xs font-bold text-gray-500 pl-2 uppercase tracking-wider">Pilih Bulan :</label>
             <select
                value={selectedMonth || ""}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="border-none bg-pink-50 text-pink-700 font-bold p-2.5 rounded-lg focus:ring-0 outline-none cursor-pointer"
            >
                {data.map((b) => (
                <option key={b.bulan_ke} value={b.bulan_ke}>
                    Ke-{b.bulan_ke}  ({b.tgl_awal})
                </option>
                ))}
            </select>
          </div>
        </div>

        {/* CONTENT */}
        {bulan ? (
          <div className="space-y-6">
            
            {/* 🔥 DASHBOARD KINERJA BULAN INI */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               
               {/* INFO BULAN */}
               <div className="bg-gradient-to-br from-pink-500 to-rose-600 text-white p-6 rounded-3xl shadow-sm relative overflow-hidden flex flex-col justify-center h-full">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl pointer-events-none"></div>
                  
                  <div className="bg-white/20 w-12 h-12 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-sm">
                    <Calendar size={24} className="text-white" />
                  </div>
                  <p className="text-pink-100 text-xs font-bold uppercase tracking-widest mb-1">Tinjauan Eksekutif</p>
                  <h2 className="text-3xl font-black mb-2 shadow-sm">
                    Bulan ke-{bulan.bulan_ke}
                  </h2>
                  <p className="text-sm font-medium bg-black/20 self-start px-3 py-1.5 rounded-lg backdrop-blur-md border border-white/10">
                    {new Date(bulan.tgl_awal).toLocaleDateString('id-ID', {day:'2-digit', month:'long', year:'numeric'})} <span className="opacity-75 mx-1">s/d</span> {new Date(bulan.tgl_akhir).toLocaleDateString('id-ID', {day:'2-digit', month:'long', year:'numeric'})}
                  </p>
               </div>

               {/* KESIMPULAN DEVIASI */}
               <div className={`p-6 rounded-3xl shadow-sm border col-span-1 lg:col-span-2 flex flex-col md:flex-row items-center justify-between gap-6 ${getDeviasiBgColor(bulan.deviasi)}`}>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2">Pencapaian Makro vs Target</h3>
                    <div className="flex items-end gap-3 mb-1">
                       <span className={`text-4xl lg:text-5xl font-black ${getDeviasiColor(bulan.deviasi)}`}>
                          {format(bulan.deviasi)}<span className="text-2xl">%</span>
                       </span>
                       <DeviasiIcon size={32} className={`mb-1 ${getDeviasiColor(bulan.deviasi)}`} strokeWidth={3}/>
                    </div>
                    <p className={`text-sm font-bold mt-2 flex items-center gap-1.5 ${getDeviasiColor(bulan.deviasi)}`}>
                       {bulan.deviasi > 0 ? <><CheckCircle size={16}/> Proyek berjalan LEBIH CEPAT dari rencana (Kinerja Sangat Baik)</> : bulan.deviasi < 0 ? <><AlertTriangle size={16}/> Proyek berjalan LEBIH LAMBAT dari rencana (Kinerja Terlambat)</> : <><CheckCircle size={16}/> Proyek berjalan SESUAI dengan rencana (Tepat Waktu)</>}
                    </p>
                  </div>
                  
                  {/* MINI CHART */}
                  <div className="w-full md:w-48 h-32 shrink-0 bg-white/60 rounded-2xl p-2 border border-white/50 shadow-inner">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} layout="vertical" margin={{top: 5, right: 30, left: -20, bottom: 5}}>
                           <XAxis type="number" hide />
                           <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} />
                           <Bar dataKey="Bobot" radius={[0, 4, 4, 0]} barSize={20}>
                             {chartData.map((entry, index) => (
                               <Cell key={`cell-${index}`} fill={entry.fillColor} />
                             ))}
                             <LabelList dataKey="Bobot" position="right" formatter={(v) => `${v}%`} style={{fontSize: '10px', fontWeight: 'bold', fill: '#475569'}} />
                           </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                  </div>
               </div>

               {/* REKAP DETAIL */}
               <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6 bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
                  <div className="bg-gray-50 p-4 rounded-2xl text-center border border-gray-100">
                    <p className="text-xs font-bold text-gray-500 uppercase mb-1">Rencana Bulan Ini</p>
                    <p className="text-2xl font-black text-gray-800">{format(bulan.rencana)}<span className="text-sm">%</span></p>
                  </div>
                  <div className="bg-pink-50 p-4 rounded-2xl text-center border border-pink-100">
                    <p className="text-xs font-bold text-pink-500 uppercase mb-1">Realisasi Bulan Ini</p>
                    <p className="text-2xl font-black text-pink-700">{format(bulan.real)}<span className="text-sm">%</span></p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-2xl text-center border border-blue-100">
                    <p className="text-xs font-bold text-blue-500 uppercase mb-1">Rasio Ketercapaian</p>
                    <p className="text-2xl font-black text-blue-700">{persenTarget.toFixed(2)}<span className="text-sm">%</span></p>
                  </div>
               </div>
               
            </div>

            {/* 🔥 MAIN TABLE */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mt-8">
              <div className="p-4 bg-gray-50/50 border-b border-gray-100">
                <h3 className="font-bold text-gray-800">Rincian Progress Item Pekerjaan (Bulanan)</h3>
              </div>
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-sm text-left">
                  <thead className="bg-white text-gray-500 uppercase text-[10px] sm:text-xs font-bold tracking-wider border-b border-gray-100">
                    <tr>
                      <th className="p-4" rowSpan={2}>Uraian Pekerjaan</th>
                      <th className="p-4 text-center" rowSpan={2}>Sat</th>
                      <th className="p-4 text-center border-l border-gray-100" colSpan={2}>Informasi BOQ</th>
                      <th className="p-4 text-center border-l bg-gray-50/50 border-gray-100" colSpan={3}>Realisasi Progress Fisik Kumulatif (%)</th>
                      <th className="p-4 text-right" rowSpan={2}>Progres Proyek</th>
                       <th className="p-4 text-right" rowSpan={2}>Progress Item</th>
                       
                    </tr>
                    <tr className="border-b border-gray-100">
                       <th className="p-2 text-center text-orange-600 border-l border-gray-100 bg-orange-50/30">Total Vol</th>
                       <th className="p-2 text-center text-pink-600 bg-pink-50/30">Bobot</th>
                       
                       <th className="p-2 text-center text-gray-500 border-l border-gray-100 bg-gray-50/50">s/d Lalu</th>
                       <th className="p-2 text-center text-blue-600 font-black bg-blue-50">BL INI</th>
                       <th className="p-2 text-center text-emerald-600 font-black bg-emerald-50">s/d Ini</th>
                    </tr>
                  </thead>
                  
                  <tbody className="divide-y divide-gray-50">
                    {bulan.data.map((item, i) => {

                      // HEADER GROUP
                      if (item.tipe !== "item") {
                        return (
                          <tr key={i} className="bg-gray-100/70 border-b border-gray-200">
                            <td colSpan="8" className="p-3 px-4 font-black text-gray-800 uppercase text-xs">
                              <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div>
                                {item.uraian}
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      // ITEM ROW
                      return (
                        <tr key={i} className="hover:bg-pink-50/30 transition-colors">
                          <td className="p-3 px-4 text-gray-700 font-semibold max-w-[200px] sm:max-w-xs">{item.uraian}</td>
                          <td className="p-3 text-center text-gray-400 text-xs">{item.satuan}</td>
                          
                          <td className="p-3 text-center bg-orange-50/10 font-bold text-gray-700">{item.total}</td>
                          <td className="p-3 text-center bg-pink-50/10 font-bold text-pink-600">{Number(item.bobot).toFixed(3)}</td>

                          <td className="p-3 text-center text-gray-500 font-mono text-xs bg-gray-50/20">{Number(item.sd_lalu).toFixed(3)}</td>
                          <td className="p-3 text-center font-black text-blue-600 font-mono text-xs bg-blue-50/30">{Number(item.bulan_ini).toFixed(3)}</td>
                          <td className="p-3 text-center font-black text-emerald-600 font-mono text-xs bg-emerald-50/30">{Number(item.sd_ini).toFixed(3)}</td>

                          <td className="p-3 text-right">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${item.progres_proyek > 0 ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                              {item.progres_proyek}%
                            </span>
                          </td>
                          {/* 🔥 PROGRESS ITEM */}
                        <td className="p-3 text-right">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                            item.progress_item >= 80
                              ? "bg-green-100 text-green-700 border-green-200"
                              : item.progress_item >= 50
                              ? "bg-yellow-100 text-yellow-700 border-yellow-200"
                              : "bg-red-100 text-red-700 border-red-200"
                          }`}>
                            {Number(item.progress_item).toFixed(2)}%
                          </span>
                        </td>

                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        ) : (
          <div className="bg-white p-12 rounded-3xl border border-gray-100 flex flex-col items-center justify-center text-center text-gray-400 font-medium">
             <BarChart3 size={48} className="opacity-20 mb-4"/>
             <p>Belum ada data laporan bulanan yang tersedia.<br/>Pastikan schedule bulanan dan progress harian sudah terisi.</p>
          </div>
        )}

      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f8fafc; 
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1; 
          border-radius: 4px;
        }
      `}} />
    </>
  );
}