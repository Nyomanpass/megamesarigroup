import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useProject } from "../context/ProjectContext";
import api from "../api";
import { ArrowLeft, CalendarDays, Zap, Save, AlertCircle, FileText } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import React from "react";
import { m, AnimatePresence } from "motion/react";
import Decimal from "decimal.js";

export default function SchedulePage() {
  const { id: paramId } = useParams();
  const { selectedProject } = useProject();
  const id = selectedProject?.id || paramId;
  const navigate = useNavigate();
  const [statusMap, setStatusMap] = useState({});
  const [boq, setBoq] = useState([]);
  const [weeks, setWeeks] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [loadingGenerate, setLoadingGenerate] = useState(false);
  const [realData, setRealData] = useState([]);
  const [inputMap, setInputMap] = useState({});
  const [mode, setMode] = useState("manual");

  const [showBagiRataModal, setShowBagiRataModal] = useState(false);

  const [selectedItem, setSelectedItem] = useState(null);

  const [bagiRataForm, setBagiRataForm] = useState({
    start: 1,
    end: 1
  });



  const handleExportTimeSchedule = async () => {
    try {
      const response = await api.get(
        `/export-time-schedule/${id}`,
        {
          responseType: "blob", // 🔥 wajib
        }
      );

      // 🔥 download file
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");

      link.href = url;
      link.setAttribute("download", "time_schedule.xlsx");

      document.body.appendChild(link);
      link.click();
      link.remove();

    } catch (error) {
      console.log(error);
      setError("Gagal export Time Schedule");
    }
  };

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

      setBoq(boqRes.data.data);
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

const submitBagiRata = () => {

   if (!selectedItem) return;

   const start = parseInt(bagiRataForm.start);
   const end = parseInt(bagiRataForm.end);

   const durasi = end - start + 1;

   if (durasi <= 0) {
      alert("Rentang minggu salah!");
      return;
   }

   const totalBobot =
   new Decimal(
      selectedItem.bobot || 0
   );

    const base =
      totalBobot.dividedBy(durasi);

   let newSchedule = [
      ...schedule.filter(
         s => s.boq_id !== selectedItem.id
      )
   ];

   let totalSementara =
   new Decimal(0);

   for (let i = start; i <= end; i++) {

      let bobot = base;

      // 🔥 WEEK TERAKHIR
      // MENANGGUNG SELISIH KECIL
      if (i === end) {
        bobot =
        totalBobot.minus(
            totalSementara
        );
      }

      totalSementara =
      totalSementara.plus(
          bobot
      );

      newSchedule.push({

         project_id: id,

         boq_id: selectedItem.id,

         minggu_ke: i,

         // 🔥 SIMPAN 8 DECIMAL
        bobot:
        bobot
            .toDecimalPlaces(8)
            .toNumber()
      });
   }

   setSchedule(newSchedule);

   setShowBagiRataModal(false);
};


  const handleBagiRata = (item) => {

    setSelectedItem(item);

    setBagiRataForm({
        start: 1,
        end: weeks.length
    });

    setShowBagiRataModal(true);
  };


const handleSingleCellChange = (
  boqId,
  mingguKe,
  value
) => {

  // =========================
  // TARGET
  // =========================
  const totalTarget =
    new Decimal(
      boq.find(
        b => b.id === boqId
      )?.bobot || 0
    );

  // =========================
  // TOTAL EXISTING
  // =========================
  const totalExisting =
    schedule
      .filter(
        s =>
          Number(s.boq_id) === Number(boqId) &&
          Number(s.minggu_ke) !== Number(mingguKe)
      )
      .reduce(

        (sum, s) =>

          sum.plus(
            new Decimal(
              s.bobot || 0
            )
          ),

        new Decimal(0)

      );

  // =========================
  // SISA
  // =========================
  const sisa =
    totalTarget.minus(
      totalExisting
    );

    if (
    typeof value === "string" &&
    value.trim().toLowerCase() === "s"
  ) {

   value =
    sisa
      .toDecimalPlaces(8)
      .toNumber();
    }

    if (
  typeof value === "string" &&
  value.trim().toLowerCase().startsWith("s/")
) {

  const pembagi =
    Number(
      value
        .toLowerCase()
        .replace("s/", "")
    );

  if (
    !isNaN(pembagi) &&
    pembagi > 0
  ) {

    value =
      sisa
        .dividedBy(pembagi)
        .toDecimalPlaces(8)
        .toNumber();
  }
}

  // =========================
  // SUPPORT =1 =2 =3
  // COPY DARI MINGGU
  // =========================
  if (
    typeof value === "string" &&
    value.startsWith("=")
  ) {

    const mingguSource =
      Number(
        value.replace("=", "")
      );

    if (!isNaN(mingguSource)) {

      const sourceData =
        schedule.find(
          s =>
            Number(s.boq_id) === Number(boqId) &&
            Number(s.minggu_ke) === Number(mingguSource)
        );

      if (sourceData) {

        value =
          Number(
            Number(
              sourceData.bobot || 0
            ).toFixed(8)
          );
      }
    }
  }

  // =========================
  // SUPPORT /2 /3 /4
  // BAGI SISA
  // =========================
  if (
    typeof value === "string" &&
    value.startsWith("/")
  ) {

    const pembagi =
      Number(
        value.replace("/", "")
      );

    if (
      !isNaN(pembagi) &&
      pembagi > 0
    ) {

    value =
    totalTarget
      .dividedBy(pembagi)
      .toDecimalPlaces(8)
      .toNumber();
    }
  }

  // =========================
  // INPUT VALUE
  // =========================
  const inputValue =
    parseFloat(value);

  if (
    isNaN(inputValue) ||
    inputValue < 0
  ) return;

  let newSchedule = [...schedule];

  const index =
    newSchedule.findIndex(
      s =>
        Number(s.boq_id) === Number(boqId) &&
        Number(s.minggu_ke) === Number(mingguKe)
    );

  // =========================
  // UPDATE / INSERT
  // =========================
  if (index >= 0) {

    newSchedule[index].bobot =
      Number(
        inputValue.toFixed(8)
      );

  } else {

    newSchedule.push({

      project_id: id,

      boq_id: boqId,

      minggu_ke: mingguKe,

      bobot: Number(
        inputValue.toFixed(8)
      )
    });
  }

  // =========================
  // HAPUS JIKA 0
  // =========================
  newSchedule = newSchedule.filter(
    s =>
      !(
        s.boq_id === boqId &&
        Number(s.bobot) === 0
      )
  );

  // =========================
  // 🔵 MODE AUTO
  // =========================
  if (mode === "auto") {

    let itemWeeks =
      newSchedule.filter(
        s => s.boq_id === boqId
      );

    let total =
      itemWeeks.reduce(
        (sum, s) =>
          sum + Number(s.bobot),
        0
      );

    let selisih =
      Number(
        (
          total - totalTarget
        ).toFixed(8)
      );

    if (selisih !== 0) {

      const others =
        itemWeeks.filter(
          s =>
            s.minggu_ke !== mingguKe
        );

      if (others.length > 0) {

        const totalOthers =
          others.reduce(
            (sum, s) =>
              sum + Number(s.bobot),
            0
          );

        for (let w of others) {

          if (totalOthers === 0)
            break;

          const proporsi =
            w.bobot / totalOthers;

          const adjust =
            selisih * proporsi;

          w.bobot = Number(
            (
              w.bobot - adjust
            ).toFixed(8)
          );

          if (w.bobot < 0)
            w.bobot = 0;
        }
      }
    }

    // =========================
    // FIX TOTAL
    // =========================
    let fixTotal =
      itemWeeks.reduce(
        (sum, s) =>
          sum + Number(s.bobot),
        0
      );

    let diff =
      Number(
        (
          fixTotal - totalTarget
        ).toFixed(8)
      );

    if (
      diff !== 0 &&
      itemWeeks.length > 0
    ) {

      let last =
        itemWeeks[
          itemWeeks.length - 1
        ];

      last.bobot = Number(
        (
          last.bobot - diff
        ).toFixed(8)
      );
    }
  }

  // =========================
  // STATUS
  // =========================
  const itemWeeksFinal =
    newSchedule.filter(
      s => s.boq_id === boqId
    );

  const totalFinal =
  itemWeeksFinal.reduce(

    (sum, s) =>

      sum.plus(
        new Decimal(
          s.bobot || 0
        )
      ),

    new Decimal(0)

  );

 const totalRounded =
  totalFinal
    .toDecimalPlaces(8)
    .toNumber();

  const tolerance =
  new Decimal("0.00000001");

    const diff =
      totalFinal
        .minus(totalTarget)
        .abs();

    const status =
      diff.lte(tolerance)
        ? "pas"
        : totalFinal.gt(totalTarget)
          ? "lebih"
          : "kurang";

  // =========================
  // STATUS MAP
  // =========================
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

  const rencanaPerMinggu = weeks.map(w => {

    return schedule
      .filter(
        s =>
          Number(s.minggu_ke) ===
          Number(w.minggu_ke)
      )
    .reduce(

        (sum, s) =>

          sum.plus(
            new Decimal(
              s.bobot || 0
            )
          ),

        new Decimal(0)

      )
      .toNumber();
  });

  let akumulasi = new Decimal(0);
  const rencanaKomulatif =
    rencanaPerMinggu.map(nilai => {

      akumulasi =
        akumulasi.plus(nilai);

      return akumulasi.toNumber();
    });

  // Chart Data Preparation
  const chartData = weeks.map((w, idx) => {

    const real =
      realData.find(
        r => r.minggu_ke === w.minggu_ke
      );

    return {

      name: `M${w.minggu_ke}`,

      // 🔥 FIX TARGET
      target: Number(
        rencanaKomulatif[idx] || 0
      ),

      // 🔥 FIX REAL
      real: Number(
        real?.kum_real || 0
      )
    };
  });

  const isComplete = akumulasi > 99.9 && akumulasi < 100.1;

  const boqMap = {};
  boq.forEach(item => {
    boqMap[item.id] = { ...item, children: [] };
  });

  const tree = [];

  boq.forEach(item => {
      if (item.parent_id) {
        boqMap[item.parent_id]?.children.push(boqMap[item.id]);
      } else {
        tree.push(boqMap[item.id]);
      }
  });

 const renderRows = (items, level = 0) => {
  return items.map(item => {

    // 🔷 HEADER
    if (item.tipe === "header") {
      return (
        <React.Fragment key={item.id}>
          <tr className="bg-gradient-to-r from-slate-800 to-slate-700 text-white">
            <td colSpan={weeks.length + 2} className="p-4 font-bold tracking-wide text-sm">
              🔷 {item.kode} - {item.uraian}
            </td>
          </tr>
          {renderRows(item.children, level + 1)}
        </React.Fragment>
      );
    }

    // 🔹 SUBHEADER
    if (item.tipe === "subheader") {
      return (
        <React.Fragment key={item.id}>
          <tr className="bg-slate-100">
            <td colSpan={weeks.length + 2} className="p-3 pl-6 font-semibold text-gray-700 text-xs">
              🔹 {item.kode} - {item.uraian}
            </td>
          </tr>
          {renderRows(item.children, level + 1)}
        </React.Fragment>
      );
    }

    // 📌 ITEM
    const bobotResmi = Number(Number(item.bobot || 0).toFixed(3));

    return (
      <tr key={item.id} className="group hover:bg-blue-50/40 transition-all">

        {/* URAIAN */}
        <td
          className="p-3 border-b border-r border-gray-100 sticky left-0 bg-white z-10"
          style={{ paddingLeft: `${level * 20 + 16}px` }}
        >
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-gray-700">
              {item.uraian}
            </span>

            <button
              onClick={() => handleBagiRata(item)}
              className="opacity-0 group-hover:opacity-100 text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-600 hover:text-white transition-all"
            >
              AUTO
            </button>
          </div>

 
         {/* STATUS */}
<div className="text-[10px] mt-1">
  {(() => {
    const statusData = statusMap[item.id];
    if (!statusData) return null;

    const selisih = Number(
      Math.abs(statusData.target - statusData.total).toFixed(3)
    );

    if (statusData.status === "kurang") {
      return (
        <span className="text-orange-500 font-semibold">
          Kurang {selisih}
        </span>
      );
    }

    if (statusData.status === "lebih") {
      return (
        <span className="text-red-500 font-semibold">
          Lebih {selisih}
        </span>
      );
    }

    return (
      <span className="text-green-600 font-semibold">
        ✔ Pas
      </span>
    );
  })()}
</div>
        </td>

        {/* BOBOT */}
        <td className="p-2 border-b border-r border-gray-100 text-center bg-amber-50 text-amber-700 font-mono text-xs font-bold">
          {bobotResmi.toFixed(3)}
        </td>

        {/* WEEK */}
        {weeks.map((w) => {
          const cellData = schedule.find(
            s =>
              Number(s.boq_id) === Number(item.id) &&
              Number(s.minggu_ke) === Number(w.minggu_ke)
          );

          const val = cellData ? cellData.bobot : "";
          const isActive = val !== "";

          return (

  <td
    key={w.id}
    className="
      border-b border-r
      border-gray-100
      p-1 relative
    "
  >

    {/* BACKGROUND */}
    <div
      className={`
        absolute inset-1 rounded-md
        transition-all

        ${
          isActive
            ? "bg-blue-200/30 border border-blue-300 shadow-sm"
            : "bg-transparent"
        }
      `}
    ></div>
      <input

        type="text"

        value={
          inputMap[
            `${item.id}-${w.minggu_ke}`
          ] ??

          (
            val !== ""
              ? Number(val).toFixed(3)
              : ""
          )
        }

        onChange={(e) => {

          const v = e.target.value;

          // simpan tampilan input asli
          setInputMap(prev => ({
            ...prev,
            [`${item.id}-${w.minggu_ke}`]: v
          }));

          handleSingleCellChange(
            item.id,
            w.minggu_ke,
            v
          );
        }}

        onBlur={() => {

          // reset tampilan ke format angka
          setInputMap(prev => {

            const copy = { ...prev };

            delete copy[
              `${item.id}-${w.minggu_ke}`
            ];

            return copy;
          });
        }}

        className={`
          w-full
          text-center
          h-[34px]
          rounded-md
          outline-none
          font-mono
          text-[11px]
          relative
          bg-transparent

          ${
            isActive
              ? "font-bold text-blue-900"
              : "text-gray-500"
          }
        `}

        placeholder="0.000"
      />

        </td>
      );
        })}
      </tr>
    );
  });
};

  return (
    <>
      <div className="p-6 max-w-[100vw] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-x-hidden">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate("/dashboard")}
            className="p-2.5 rounded-xl bg-white shadow-sm border border-gray-100 text-gray-600 hover:text-secondary hover:border-secondary transition-all active:scale-95 cursor-pointer"
          >
            <ArrowLeft size={24} />
          </button>

          <div className="flex gap-2">
            <button
              onClick={handleGenerateWeeks}
              disabled={loadingGenerate}
              className={`${loadingGenerate ? "bg-gray-200 text-gray-500" : "bg-white border-2 border-indigo-500 text-indigo-600 hover:bg-indigo-50"
                } flex items-center gap-2 px-5 py-2.5 rounded font-semibold transition-all active:scale-95 cursor-pointer text-sm`}
            >
              <Zap size={18} /> {loadingGenerate ? "Memproses..." : "Generate Kolom Minggu"}
            </button>

            <button
              onClick={handleSaveSchedule}
              className="flex items-center gap-2 bg-success hover:bg-transparent border-2 border-transparent hover:border-success hover:text-success active:scale-95 text-white px-5 py-2.5 rounded font-semibold transition-all active:scale-95 cursor-pointer text-sm"
            >
              <Save size={18} /> Simpan Jadwal Permanen
            </button>
          </div>
        </div>

        {/* HEADER & ACTION BUTTONS */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <div className="flex items-center gap-4">

            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                Schedule Proyek (Time Schedule)
              </h1>
              <p className="text-gray-500">Buat Kurva S Rencana dan jadwalkan bobot bobot pekerjaan</p>
            </div>
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
                  <AlertCircle size={14} /> Total Belum 100% ({akumulasi.toFixed(2)}%)
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
                        <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorReal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fontSize: 12,
                        fill: '#64748b'
                      }}

                      tickFormatter={(value) =>
                        Number(value).toFixed(3)
                      }
                    />

                    <RechartsTooltip

                      cursor={{
                        stroke: '#94A3B8',
                        strokeWidth: 1,
                        strokeDasharray: '4 4'
                      }}

                      contentStyle={{
                        borderRadius: '12px',
                        border: '1px solid #E2E8F0',
                        boxShadow:
                          '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                      }}

                      formatter={(value) => [

                        Number(value).toFixed(3),

                        ""

                      ]}
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

        <button
          onClick={handleExportTimeSchedule}
          className="flex items-center gap-2 bg-secondary hover:bg-transparent border-2 border-secondary/50 hover:border-secondary hover:text-secondary text-white px-5 py-2.5 rounded font-bold transition-all active:scale-95 whitespace-nowrap mb-4 ml-auto cursor-pointer active:scale-95"
        >
          <FileText size={18} /> Export Time Schedule
        </button>

        {/* TABLE SECTION / GANTT CHART ALIAS */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-12">
          <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-bold text-gray-700">Tabel Rancangan Barchart (Interactive)</h3>
            <span className="text-xs text-gray-500 font-medium">Auto-save tidak diaktifkan, pastikan klik Simpan.</span>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <div className="flex flex-col mt-3 px-5 md:flex-row md:items-center justify-between gap-3 mb-4">

              {/* 🔥 MODE SWITCH (SEGMENT STYLE) */}
              <div className="flex items-center bg-gray-100 rounded-xl p-1 shadow-inner w-fit">

                <button
                  onClick={() => setMode("manual")}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200
                    ${mode === "manual"
                      ? "bg-blue-600 text-white shadow"
                      : "text-gray-500 hover:text-blue-600"}
                  `}
                >
                  Manual
                </button>

                <button
                  onClick={() => setMode("auto")}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200
                    ${mode === "auto"
                      ? "bg-green-600 text-white shadow"
                      : "text-gray-500 hover:text-green-600"}
                  `}
                >
                  Auto
                </button>
              </div>

              {/* 🔥 INFO MODE (BADGE STYLE) */}
              <div className="flex items-center gap-2 text-xs">

                <span className="text-gray-400 font-medium">Mode:</span>

                <span
                  className={`px-3 py-1 rounded-full font-bold tracking-wide
                    ${mode === "manual"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-green-100 text-green-700"}
                  `}
                >
                  {mode === "manual" ? "Manual Mode" : "Auto Balance"}
                </span>

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
                {renderRows(tree)}
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


      <AnimatePresence>
   {showBagiRataModal && (
      <>
         <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowBagiRataModal(false)}
            className="fixed inset-0 bg-black/50 z-40"
         />

         <m.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-2xl shadow-xl z-50 w-full max-w-md"
         >

            <h2 className="text-2xl font-bold mb-6 text-primary">
               Bagi Rata Bobot
            </h2>

            <div className="space-y-4">

               <div>
                  <label className="block mb-2 text-sm font-semibold">
                     Minggu Mulai
                  </label>

                  <input
                     type="number"
                     min="1"
                     max={weeks.length}
                     value={bagiRataForm.start}
                     onChange={(e) =>
                        setBagiRataForm({
                           ...bagiRataForm,
                           start: e.target.value
                        })
                     }
                     className="w-full border rounded-lg px-4 py-3"
                  />
               </div>

               <div>
                  <label className="block mb-2 text-sm font-semibold">
                     Minggu Selesai
                  </label>

                  <input
                     type="number"
                     min="1"
                     max={weeks.length}
                     value={bagiRataForm.end}
                     onChange={(e) =>
                        setBagiRataForm({
                           ...bagiRataForm,
                           end: e.target.value
                        })
                     }
                     className="w-full border rounded-lg px-4 py-3"
                  />
               </div>

               <div className="flex gap-3 pt-4">

                  <button
                     onClick={() => setShowBagiRataModal(false)}
                     className="flex-1 py-3 border rounded-lg"
                  >
                     Batal
                  </button>

                  <button
                     onClick={submitBagiRata}
                     className="flex-1 py-3 bg-secondary text-white rounded-lg"
                  >
                     Simpan
                  </button>

               </div>

            </div>
         </m.div>
      </>
   )}
</AnimatePresence>

      <style dangerouslySetInnerHTML={{
        __html: `
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