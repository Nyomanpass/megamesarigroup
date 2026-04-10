import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api";
import { ArrowLeft, BarChart as BarChartIcon, Calendar, TrendingUp, TrendingDown, CheckCircle, AlertTriangle } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LabelList, Cell
} from 'recharts';

export default function WeeklyReportPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState(null);

  const fetchReport = async () => {
    try {
      const res = await api.get(`/weekly-report/${id}`);
      setData(res.data);

      if (res.data.length > 0) {
        setSelectedWeek(res.data[0].minggu_ke);
      }
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [id]);

  const minggu = data.find((m) => m.minggu_ke === selectedWeek);

  // Formatting helpers
  const format = (val) => Number(val || 0).toFixed(3);
  const getDeviasiColor = (deviasi) => deviasi >= 0 ? "text-emerald-600" : "text-red-500";
  const getDeviasiBgColor = (deviasi) => deviasi >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200";
  const DeviasiIcon = minggu?.deviasi >= 0 ? TrendingUp : TrendingDown;

  const persenTarget = minggu?.rencana ? ((minggu.real / minggu.rencana) * 100) : 0;

  // Chart Data preparation
  const chartData = minggu ? [
    { name: 'Rencana', Bobot: Number(minggu.rencana), fillColor: '#CBD5E1' }, // gray
    { name: 'Realisasi', Bobot: Number(minggu.real), fillColor: minggu.deviasi >= 0 ? '#10B981' : '#EF4444' } // green/red
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
                <BarChartIcon className="text-indigo-500"/> Laporan Analisa Mingguan
              </h1>
              <p className="text-sm text-gray-500">Evaluasi performa proyek mingguan berdasarkan target BOQ</p>
            </div>
          </div>
          
          <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
             <label className="text-xs font-bold text-gray-500 pl-2 uppercase tracking-wider">Pilih Minggu :</label>
             <select
                value={selectedWeek || ""}
                onChange={(e) => setSelectedWeek(Number(e.target.value))}
                className="border-none bg-indigo-50 text-indigo-700 font-bold p-2.5 rounded-lg focus:ring-0 outline-none cursor-pointer"
            >
                {data.map((m) => (
                <option key={m.minggu_ke} value={m.minggu_ke}>
                    Mg ke-{m.minggu_ke}  ({m.tgl_awal})
                </option>
                ))}
            </select>
          </div>
        </div>

        {/* CONTENT */}
        {minggu ? (
          <div className="space-y-6">
            
            {/* 🔥 DASHBOARD KINERJA MINGGU INI */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               
               {/* INFO MINGGU */}
               <div className="bg-gradient-to-br from-indigo-500 to-blue-600 text-white p-6 rounded-3xl shadow-sm relative overflow-hidden flex flex-col justify-center h-full">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl pointer-events-none"></div>
                  
                  <div className="bg-white/20 w-12 h-12 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-sm">
                    <Calendar size={24} className="text-white" />
                  </div>
                  <p className="text-indigo-100 text-xs font-bold uppercase tracking-widest mb-1">Periode Laporan</p>
                  <h2 className="text-3xl font-black mb-2 shadow-sm">
                    Minggu ke-{minggu.minggu_ke}
                  </h2>
                  <p className="text-sm font-medium bg-black/20 self-start px-3 py-1.5 rounded-lg backdrop-blur-md border border-white/10">
                    {new Date(minggu.tgl_awal).toLocaleDateString('id-ID', {day:'2-digit', month:'long', year:'numeric'})} <span className="opacity-75 mx-1">s/d</span> {new Date(minggu.tgl_akhir).toLocaleDateString('id-ID', {day:'2-digit', month:'long', year:'numeric'})}
                  </p>
               </div>

               {/* KESIMPULAN DEVIASI */}
               <div className={`p-6 rounded-3xl shadow-sm border col-span-1 lg:col-span-2 flex flex-col md:flex-row items-center justify-between gap-6 ${getDeviasiBgColor(minggu.deviasi)}`}>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2">Pencapaian vs Target</h3>
                    <div className="flex items-end gap-3 mb-1">
                       <span className={`text-4xl lg:text-5xl font-black ${getDeviasiColor(minggu.deviasi)}`}>
                          {format(minggu.deviasi)}<span className="text-2xl">%</span>
                       </span>
                       <DeviasiIcon size={32} className={`mb-1 ${getDeviasiColor(minggu.deviasi)}`} strokeWidth={3}/>
                    </div>
                    <p className={`text-sm font-bold mt-2 flex items-center gap-1.5 ${getDeviasiColor(minggu.deviasi)}`}>
                       {minggu.deviasi > 0 ? <><CheckCircle size={16}/> Proyek berjalan LEBIH CEPAT dari rencana (Kinerja Sangat Baik)</> : minggu.deviasi < 0 ? <><AlertTriangle size={16}/> Proyek berjalan LEBIH LAMBAT dari rencana (Kinerja Terlambat)</> : <><CheckCircle size={16}/> Proyek berjalan SESUAI dengan rencana (Tepat Waktu)</>}
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
                    <p className="text-xs font-bold text-gray-500 uppercase mb-1">Rencana Minggu Ini</p>
                    <p className="text-2xl font-black text-gray-800">{format(minggu.rencana)}<span className="text-sm">%</span></p>
                  </div>
                  <div className="bg-indigo-50 p-4 rounded-2xl text-center border border-indigo-100">
                    <p className="text-xs font-bold text-indigo-500 uppercase mb-1">Realisasi Minggu Ini</p>
                    <p className="text-2xl font-black text-indigo-700">{format(minggu.real)}<span className="text-sm">%</span></p>
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
                <h3 className="font-bold text-gray-800">Rincian Progress Item Pekerjaan</h3>
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
                    </tr>
                    <tr className="border-b border-gray-100">
                       <th className="p-2 text-center text-orange-600 border-l border-gray-100 bg-orange-50/30">Total Vol</th>
                       <th className="p-2 text-center text-indigo-600 bg-indigo-50/30">Bobot</th>
                       
                       <th className="p-2 text-center text-gray-500 border-l border-gray-100 bg-gray-50/50">s/d Lalu</th>
                       <th className="p-2 text-center text-blue-600 font-black bg-blue-50">MI INI</th>
                       <th className="p-2 text-center text-emerald-600 font-black bg-emerald-50">s/d Ini</th>
                    </tr>
                  </thead>
                  
                  <tbody className="divide-y divide-gray-50">
                    {minggu.data.map((item, i) => {

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
                        <tr key={i} className="hover:bg-blue-50/30 transition-colors">
                          <td className="p-3 px-4 text-gray-700 font-semibold max-w-[200px] sm:max-w-xs">{item.uraian}</td>
                          <td className="p-3 text-center text-gray-400 text-xs">{item.satuan}</td>
                          
                          <td className="p-3 text-center bg-orange-50/10 font-bold text-gray-700">{item.total}</td>
                          <td className="p-3 text-center bg-indigo-50/10 font-bold text-indigo-600">{Number(item.bobot).toFixed(3)}</td>

                          <td className="p-3 text-center text-gray-500 font-mono text-xs bg-gray-50/20">{Number(item.sd_lalu).toFixed(3)}</td>
                          <td className="p-3 text-center font-black text-blue-600 font-mono text-xs bg-blue-50/30">{Number(item.minggu_ini).toFixed(3)}</td>
                          <td className="p-3 text-center font-black text-emerald-600 font-mono text-xs bg-emerald-50/30">{Number(item.sd_ini).toFixed(3)}</td>

                         <td className="p-3 text-right">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                              item.progres_proyek > 0
                                ? 'bg-green-100 text-green-700 border-green-200'
                                : 'bg-gray-100 text-gray-500 border-gray-200'
                            }`}>
                              {Number(item.progres_proyek).toFixed(3)}%
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
             <BarChartIcon size={48} className="opacity-20 mb-4"/>
             <p>Belum ada data laporan mingguan yang tersedia.<br/>Pastikan schedule mingguan dan progress harian sudah terisi.</p>
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