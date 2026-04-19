import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api";
import { ArrowLeft, CalendarDays, Zap, Save, AlertCircle } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';

export default function SchedulePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [statusMap, setStatusMap] = useState({});
  const [boq, setBoq] = useState([]);
  const [weeks, setWeeks] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [loadingGenerate, setLoadingGenerate] = useState(false);
  const [realData, setRealData] = useState([]);
  const [mode, setMode] = useState("manual"); 


  const fetchChart = async () => {
  try {
    const res = await api.get(`/daily-plan/weekly-chart/${id}`);
    setRealData(res.data);
  } catch (err) {
    console.error(err);
  }
};

  useEffect(() => {
    fetchAll();
    fetchChart();
  }, [id]);

  const fetchAll = async () => {
    try {
      const boqRes = await api.get(`/boq/project/${id}`);
      const weekRes = await api.get(`/schedule/weeks/${id}`);
      const schRes = await api.get(`/schedule/${id}`);

      setBoq(boqRes.data.filter(i => i.tipe === "item"));
      setWeeks(weekRes.data);
      setSchedule(schRes.data);

    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerateWeeks = async () => {
    const confirm = window.confirm("Sistem akan membuat daftar minggu otomatis berdasarkan tanggal mulai dan selesai proyek. Lanjutkan?");
    if (!confirm) return;

    setLoadingGenerate(true);
    try {
      await api.post(`/schedule/generate-weeks/${id}`);
      alert("✅ Daftar Minggu Berhasil Dibuat!");
      fetchAll();
    } catch (err) {
      alert(err.response?.data?.message || "Gagal Generate Weeks");
    } finally {
      setLoadingGenerate(false);
    }
  };


  const handleBagiRata = (item) => {
  const startMng = prompt(`Mulai minggu ke berapa? (1-${weeks.length})`, "1");
  const endMng = prompt(`Sampai minggu ke berapa?`, weeks.length.toString());

  if (!startMng || !endMng) return;

  const start = parseInt(startMng);
  const end = parseInt(endMng);
  const durasi = end - start + 1;

  if (durasi <= 0) return alert("Rentang minggu salah!");

  const totalBobot = Number(item.bobot);

  // 🔥 STEP 1: bagi rata (round 3 angka)
  const base = Number((totalBobot / durasi).toFixed(3));

  let newSchedule = [...schedule.filter(s => s.boq_id !== item.id)];

  let totalSementara = 0;

  for (let i = start; i <= end; i++) {
    let bobot = base;

    // 🔥 minggu terakhir = sisa (biar pas 100%)
    if (i === end) {
      bobot = Number((totalBobot - totalSementara).toFixed(3));
    }

    totalSementara += bobot;

    newSchedule.push({
      project_id: id,
      boq_id: item.id,
      minggu_ke: i,
      bobot: bobot
    });
  }

  setSchedule(newSchedule);
};


const handleSingleCellChange = (boqId, mingguKe, value) => {
  const inputValue = value === "" ? 0 : parseFloat(value);
  if (isNaN(inputValue) || inputValue < 0) return;

  const totalTarget = boq.find(b => b.id === boqId)?.bobot || 0;

  let newSchedule = [...schedule];

  const index = newSchedule.findIndex(
    s =>
      Number(s.boq_id) === Number(boqId) &&
      Number(s.minggu_ke) === Number(mingguKe)
  );

  if (index >= 0) {
    newSchedule[index].bobot = Number(inputValue.toFixed(3));
  } else {
    newSchedule.push({
      project_id: id,
      boq_id: boqId,
      minggu_ke: mingguKe,
      bobot: Number(inputValue.toFixed(3))
    });
  }

  // 🔥 HAPUS kalau 0
  newSchedule = newSchedule.filter(
    s => !(s.boq_id === boqId && Number(s.bobot) === 0)
  );

  // =========================
  // 🔵 MODE AUTO
  // =========================
  if (mode === "auto") {
    let itemWeeks = newSchedule.filter(s => s.boq_id === boqId);

    let total = itemWeeks.reduce((sum, s) => sum + Number(s.bobot), 0);
    let selisih = Number((total - totalTarget).toFixed(3));

    if (selisih !== 0) {
      const others = itemWeeks.filter(s => s.minggu_ke !== mingguKe);

      if (others.length > 0) {
        const totalOthers = others.reduce((sum, s) => sum + Number(s.bobot), 0);

        for (let w of others) {
          if (totalOthers === 0) break;

          const proporsi = w.bobot / totalOthers;
          const adjust = selisih * proporsi;

          w.bobot = Number((w.bobot - adjust).toFixed(3));
          if (w.bobot < 0) w.bobot = 0;
        }
      }
    }

    // 🔥 FIX rounding akhir
    let fixTotal = itemWeeks.reduce((sum, s) => sum + Number(s.bobot), 0);
    let diff = Number((fixTotal - totalTarget).toFixed(3));

    if (diff !== 0 && itemWeeks.length > 0) {
      let last = itemWeeks[itemWeeks.length - 1];
      last.bobot = Number((last.bobot - diff).toFixed(3));
    }
  }

  // =========================
  // 🟢 MODE MANUAL
  // =========================
  // tidak ada auto apapun

  // 🔥 HITUNG TOTAL UNTUK STATUS
const itemWeeksFinal = newSchedule.filter(s => s.boq_id === boqId);

const totalFinal = itemWeeksFinal.reduce(
  (sum, s) => sum + Number(s.bobot),
  0
);

const totalRounded = Number(totalFinal.toFixed(3));

const status =
  totalRounded > totalTarget
    ? "lebih"
    : totalRounded < totalTarget
    ? "kurang"
    : "pas";

// 🔥 SIMPAN KE STATUS MAP
setStatusMap(prev => ({
  ...prev,
  [boqId]: {
    total: totalRounded,
    target: totalTarget,
    status
  }
}));

  setSchedule([...newSchedule]);
};


  const handleSaveSchedule = async () => {
    try {
      if (schedule.length === 0) return alert("Jadwal masih kosong!");
      await api.post(`/schedule/bulk-save/${id}`, { 
        items: schedule 
      });
      alert("✅ Jadwal Berhasil Disimpan Permanen!");
      fetchAll();
    } catch (err) {
      console.error(err);
      alert("Gagal simpan ke database: " + err.message);
    }
  };

  // Logika Rencana & Komulatif
  const rencanaPerMinggu = weeks.map(w => {
    const totalMingguIni = schedule
      .filter(s => Number(s.minggu_ke) === Number(w.minggu_ke))
      .reduce((sum, s) => sum + (Number(s.bobot) || 0), 0);
    return Number(totalMingguIni.toFixed(3));
  });

  let akumulasi = 0;
  const rencanaKomulatif = rencanaPerMinggu.map(nilai => {
    akumulasi += nilai;
    akumulasi = Number(akumulasi.toFixed(3));
    return akumulasi;
  });

  // Chart Data Preparation
  const chartData = weeks.map((w, idx) => {
    const real = realData.find(r => r.minggu_ke === w.minggu_ke);

    return {
      name: `M${w.minggu_ke}`,
      target: rencanaKomulatif[idx] || 0,
      real: real?.kum_real || 0 // 🔥 ini realisasi
    };
  });

  const isComplete = akumulasi > 99.9 && akumulasi < 100.1;

  return (
    <>
      <div className="p-6 max-w-[100vw] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-x-hidden">
        
        {/* HEADER & ACTION BUTTONS */}
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
                <CalendarDays className="text-red-500"/> Schedule Proyek (Time Schedule)
              </h1>
              <p className="text-sm text-gray-500">Buat Kurva S Rencana dan jadwalkan bobot bobot pekerjaan</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button 
              onClick={handleGenerateWeeks}
              disabled={loadingGenerate}
              className={`${
                loadingGenerate ? "bg-gray-200 text-gray-500" : "bg-white border-2 border-indigo-500 text-indigo-600 hover:bg-indigo-50"
              } px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm active:scale-95 flex items-center gap-2 text-sm`}
            >
              <Zap size={18} /> {loadingGenerate ? "Memproses..." : "Generate Kolom Minggu"}
            </button>

            <button 
              onClick={handleSaveSchedule}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-md transition-all active:scale-95 flex items-center gap-2 text-sm"
            >
              <Save size={18} /> Simpan Jadwal Permanen
            </button>
          </div>
        </div>

        {/* OVERVIEW CHARTS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
             <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Kurva S Rencana Kumulatif (%)</h3>
                  <p className="text-sm text-gray-500">Visualisasi bobot pekerjaan yang harus diselesaikan tiap minggu</p>
                </div>
                {!isComplete && akumulasi > 0 && (
                   <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                     <AlertCircle size={14}/> Total Belum 100% ({akumulasi.toFixed(2)}%)
                   </span>
                )}
                {isComplete && (
                   <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                     Kurva S Lengkap (100%)
                   </span>
                )}
             </div>
             
             <div className="w-full h-[250px]">
               {chartData.length > 0 ? (
                 <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorTarget" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                      </linearGradient>
                       <linearGradient id="colorReal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <RechartsTooltip 
                      cursor={{ stroke: '#94A3B8', strokeWidth: 1, strokeDasharray: '4 4' }} 
                      contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                    />
                      <Area 
                        type="monotone" 
                        dataKey="target" 
                        name="Komulatif Target (%)" 
                        stroke="#4F46E5" 
                        strokeWidth={3} 
                        fill="url(#colorTarget)" 
                      />

                      <Area 
                        type="monotone" 
                        dataKey="real" 
                        name="Komulatif Real (%)" 
                        stroke="#10B981" 
                        strokeWidth={3} 
                        fill="url(#colorReal)" 
                      />

                  </AreaChart>
                 </ResponsiveContainer>
               ) : (
                 <div className="flex h-full items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 font-medium bg-gray-50">
                    Klik 'Generate Kolom Minggu' lalu isi bobot di tabel
                 </div>
               )}
             </div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Review Kinerja Bobot</h3>
            <p className="text-sm text-gray-500 mb-6">Ringkasan hasil plot rancangan kurva.</p>
            
            <div className="flex-1 flex flex-col justify-center space-y-6">
              <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 flex items-center justify-between">
                <span className="text-sm font-bold text-gray-600">Total Durasi</span>
                <span className="text-2xl font-black text-blue-600">{weeks.length} <span className="text-sm font-bold opacity-70">Minggu</span></span>
              </div>
              
              <div className={`p-4 rounded-2xl border flex items-center justify-between ${isComplete ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                <span className="text-sm font-bold text-gray-600">Total Komulatif</span>
                <span className={`text-2xl font-black ${isComplete ? 'text-emerald-600' : 'text-red-500'}`}>{akumulasi.toFixed(3)} <span className="text-sm font-bold opacity-70">%</span></span>
              </div>
            </div>
          </div>

        </div>

        {/* TABLE SECTION / GANTT CHART ALIAS */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-12">
          <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-bold text-gray-700">Tabel Rancangan Barchart (Interactive)</h3>
            <span className="text-xs text-gray-500 font-medium">Auto-save tidak diaktifkan, pastikan klik Simpan.</span>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
             <div className="flex justify-between items-center mb-3">

    <div className="flex gap-2">
      <button
        onClick={() => setMode("manual")}
        className={`px-3 py-1 rounded ${
          mode === "manual"
            ? "bg-blue-600 text-white"
            : "bg-gray-200"
        }`}
      >
        Manual
      </button>

      <button
        onClick={() => setMode("auto")}
        className={`px-3 py-1 rounded ${
          mode === "auto"
            ? "bg-green-600 text-white"
            : "bg-gray-200"
        }`}
      >
        Auto Balance
      </button>
    </div>

    {/* 🔥 INFO MODE */}
    <div className="text-xs text-gray-500">
      Mode: {mode === "manual"
        ? "Manual (bebas edit)"
        : "Auto (otomatis balance)"}
    </div>

  </div>
            <table className="w-full text-sm border-collapse min-w-[800px]">
              <thead className="bg-white text-gray-600 shadow-sm relative z-10">
                <tr>
                  <th className="p-4 border-b border-r border-gray-200 sticky left-0 bg-white z-20 w-[300px]">
                    <div className="text-left uppercase font-black text-xs tracking-wider">Uraian Pekerjaan</div>
                  </th>
                  <th className="p-4 border-b border-r border-gray-200 text-center uppercase font-black text-xs tracking-wider w-[80px]">Bobot</th>

                  {weeks.length > 0 ? weeks.map(w => (
                    <th key={w.id} className="p-3 border-b border-r border-gray-100 text-center min-w-[70px] font-medium text-xs bg-gray-50/50">
                      <div className="font-bold text-blue-600">W{w.minggu_ke}</div>
                      <div className="text-[10px] text-gray-400 mt-1 whitespace-nowrap">
                        {new Date(w.start_date).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}
                      </div>
                    </th>
                  )) : (
                    <th className="p-4 border-b border-gray-200 text-center italic text-gray-400 font-normal">Buat kolom minggu terlebih dahulu.</th>
                  )}

                </tr>
              </thead>

              <tbody>
                {boq.map((item) => {
                  const bobotResmi = Number(Number(item.bobot || 0).toFixed(3));
                  return (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="p-3 border-b border-r border-gray-100 sticky left-0 bg-white group-hover:bg-gray-50 transition-colors z-10 flex flex-col justify-center min-h-[52px]">
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-xs font-semibold text-gray-700 truncate" title={item.uraian}>{item.uraian}</span>
                          <button
                            onClick={() => handleBagiRata(item)}
                            className="shrink-0 opacity-0 group-hover:opacity-100 text-[10px] bg-blue-100 border border-transparent text-blue-700 px-2 py-1 rounded-md hover:bg-blue-600 hover:text-white transition-all font-bold"
                            title="Bagi rata bobot ke beberapa minggu"
                          >
                             AUTO
                          </button>
                        </div>
                          <div className="text-xs mt-1">
                        {statusMap[item.id]?.status === "kurang" && (
                          <span className="text-orange-500">
                            Kurang ({statusMap[item.id].total} / {statusMap[item.id].target})
                          </span>
                        )}

                        {statusMap[item.id]?.status === "lebih" && (
                          <span className="text-red-500">
                            Lebih ({statusMap[item.id].total})
                          </span>
                        )}

                        {statusMap[item.id]?.status === "pas" && (
                          <span className="text-green-600">
                            ✔ Pas
                          </span>
                        )}
                      </div>
                      </td>
                      <td className="p-2 border-b border-r border-gray-100 text-center font-bold bg-amber-50/50 text-amber-700 font-mono text-[11px]">
                        {bobotResmi.toFixed(3)}
                      </td>

                      {weeks.map((w) => {
                        const cellData = schedule.find(s => Number(s.boq_id) === Number(item.id) && Number(s.minggu_ke) === Number(w.minggu_ke));
                        const val = cellData ? cellData.bobot : "";
                        const isActive = val !== "";
                        
                        return (
                          <td key={w.id} className="border-b border-r border-gray-100 p-1 relative min-w-[70px]">
                            {/* Gantt Bar Style Background */}
                            <div className={`absolute inset-1 rounded-md transition-all -z-10 ${isActive ? 'bg-blue-200 shadow-sm border border-blue-300' : 'bg-transparent'}`}></div>
                            
                            <input
                              type="number" step="0.001" value={val ?? ""}
                              onChange={(e) => handleSingleCellChange(item.id, w.minggu_ke, e.target.value)}
                              className={`w-full text-center h-[34px] rounded-md outline-none font-mono text-[11px] bg-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 relative z-0 transition-colors
                                ${isActive ? "font-bold text-blue-900" : "text-gray-400 placeholder:text-gray-300"}
                              `}
                              placeholder="0.000"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="sticky bottom-0 bg-white z-20 shadow-[0_-5px_15px_-5px_rgba(0,0,0,0.1)]">
                <tr className="border-t border-gray-200">
                  <td className="p-4 border-r border-gray-200 text-right uppercase text-xs font-bold text-gray-600 sticky left-0 bg-white">Target Rencana per Bulan (%)</td>
                  <td className="border-r border-gray-200 bg-gray-50"></td>
                  {rencanaPerMinggu.map((total, idx) => (
                    <td key={idx} className="p-3 border-r border-gray-200 text-center font-mono font-bold text-indigo-600 text-xs bg-indigo-50/50">
                      {total.toFixed(3)}
                    </td>
                  ))}
                </tr>
                <tr className="bg-indigo-600">
                  <td className="p-4 border-r border-indigo-700 text-right uppercase text-xs font-black text-white sticky left-0 bg-indigo-600">Komulatif Rencana (%)</td>
                   <td className="border-r border-indigo-700 bg-indigo-600"></td>
                  {rencanaKomulatif.map((total, idx) => (
                    <td key={idx} className={`p-3 border-r border-indigo-700 text-center font-mono font-black text-xs ${total > 100.001 ? 'text-red-300' : 'text-white'}`}>
                      {total.toFixed(3)}
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          height: 8px;
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9; 
          border-radius: 4px;
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