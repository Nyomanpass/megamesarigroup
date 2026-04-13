import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api";
import { ArrowLeft, CalendarDays, Search, Package, Users, Wrench, FileCheck, Info } from "lucide-react";

export default function DailyReportPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [hariKe, setHariKe] = useState("");
  const [data, setData] = useState([]);
  const [plans, setPlans] = useState([]);
  const [error, setError] = useState("");
  const [totalBobot, setTotalBobot] = useState(0);
  const [totalMaterial, setTotalMaterial] = useState([]);
  const [totalPekerja, setTotalPekerja] = useState([]);
  const [totalPeralatan, setTotalPeralatan] = useState([]);

  // ambil daily plan (buat dropdown hari)
  const fetchPlans = async () => {
    try {
      const res = await api.get(`/daily-plan/${id}`);
      setPlans(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  // ambil laporan harian
  const fetchReport = async () => {
    setError("");
    console.log("hariKe:", hariKe);

    if (!hariKe) {
      setError("Pilih tanggal atau hari ke- untuk menampilkan laporan!");
      return;
    }

    try {
      let url = `/daily-report/${id}?`;

      if (hariKe) url += `day=${hariKe}`;

      const res = await api.get(url);
      
      setData(res.data.data);
      setTotalBobot(res.data.total_bobot_harian || 0);
      setTotalMaterial(res.data.total_material || []);
      setTotalPekerja(res.data.total_pekerja || []);
      setTotalPeralatan(res.data.total_peralatan || []);

    } catch (err) {
      const msg = err.response?.data?.message || "Terjadi kesalahan memuat laporan";
      setError(msg);
    }
  };

const handleExportExcel = async () => {
  try {
    if (!hariKe) {
      setError("Pilih hari ke dulu sebelum export!");
      return;
    }

    const response = await api.get(
      `/export-daily/${id}?day=${hariKe}`,
      {
        responseType: "blob", // 🔥 penting
      }
    );

    // 🔥 buat file download
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;

    link.setAttribute(
      "download",
      `laporan_harian_hari_${hariKe}.xlsx`
    );

    document.body.appendChild(link);
    link.click();
    link.remove();

  } catch (error) {
    console.log(error);
    setError("Gagal export Excel");
  }
};

  useEffect(() => {
    fetchPlans();
  }, [id]);

  return (
    <>
      <div className="p-6 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">

        {/* HEADER */}
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => navigate(`/project/${id}`)} 
            className="p-2.5 rounded-xl bg-white shadow flex items-center justify-center border border-gray-100 hover:bg-gray-50 transition-colors active:scale-95"
          >
            <ArrowLeft size={24} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <FileCheck className="text-blue-500"/> Laporan Harian Proyek
            </h1>
            <p className="text-sm text-gray-500">Tracking pengeluaran bobot fisik dan sumber daya harian</p>
          </div>
        </div>

        {/* 🔥 FILTER SECTION */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 mb-8">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Search size={16} className="text-blue-500"/> Filter Pencarian
          </h2>
          <div className="flex flex-col md:flex-row gap-4 items-end">
            

            <div className="flex-1 w-full relative">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                Pilih Berdasarkan Hari Ke-
              </label>
              <select
                value={hariKe}
                onChange={(e) => {
                  setHariKe(e.target.value);
                }}
                className="w-full border-2 border-gray-200 p-3 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all font-medium text-gray-700 bg-gray-50/50"
              >
                <option value="">-- Dropdown Hari Ke- --</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.hari_ke}>
                    Hari ke-{p.hari_ke} ({new Date(p.tanggal).toLocaleDateString('id-ID', {day:'2-digit', month:'short'})})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={fetchReport}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-xl font-bold transition-all shadow-md active:scale-95 flex items-center gap-2 w-full md:w-auto justify-center"
            >
              <Search size={18} /> Tampilkan Laporan
            </button>
          </div>
          
          {error && (
            <div className="mt-4 bg-red-50 text-red-600 p-3 px-4 rounded-xl text-sm font-bold border border-red-100 flex items-center gap-2">
              <Info size={16}/> {error}
            </div>
          )}
        </div>

        <button
  onClick={handleExportExcel}
  className="bg-green-600 hover:bg-green-700 text-white px-6 py-3.5 rounded-xl font-bold shadow-md flex items-center gap-2"
>
  📊 Export Excel
</button>

<div className="mb-6">
  <h3 className="text-xs font-bold text-emerald-800 uppercase mb-3">
    Progress Proyek Hari Ini
  </h3>

  <div className="bg-white p-4 rounded-xl shadow border border-emerald-200 text-center">
    <div className="text-3xl font-black text-emerald-600">
      {Number(totalBobot).toFixed(3)}%
    </div>
    <div className="text-xs text-gray-500 mt-1">
      Total Bobot Tercapai
    </div>
  </div>
</div>
        {/* REPORT CONTENT */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* KOLOM KIRI: MAIN TABLE (2/3 width) */}
          <div className="lg:col-span-2 space-y-6">
             
            {/* 🔥 TABLE: OUTPUT PROGRES FISIK */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-5 bg-blue-50/50 border-b border-gray-100 flex items-center gap-2">
                 <h2 className="text-lg font-bold text-gray-800">Tabel Progress Fisik Harian</h2>
                 <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">{data.length} Pekerjaan</span>
              </div>
            <div className="p-5 bg-white border-b border-gray-100">

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                {/* CUACA */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                  <p className="text-xs text-yellow-600 font-bold uppercase">Cuaca</p>
                  <p className="text-lg font-black text-yellow-700">
                    {data[0]?.cuaca || "-"}
                  </p>
                </div>

                {/* JAM KERJA */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                  <p className="text-xs text-blue-600 font-bold uppercase">Jam Kerja</p>
                  <p className="text-lg font-black text-blue-700">
                    {data[0]?.jam_mulai && data[0]?.jam_selesai
                      ? `${data[0].jam_mulai} - ${data[0].jam_selesai}`
                      : "-"}
                  </p>
                </div>

                {/* CATATAN */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 md:col-span-3">
                  <p className="text-xs text-gray-500 font-bold uppercase">Catatan Lapangan</p>
                  <p className="text-sm text-gray-700 mt-1">
                    {data[0]?.catatan || "-"}
                  </p>
                </div>

              </div>

            </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white text-gray-500 uppercase text-xs tracking-wider border-b border-gray-100">
                    <tr>
                      <th className="p-4 font-bold">Tanggal</th>
                      <th className="p-4 font-bold">Uraian Pekerjaan (BOQ)</th>
                      <th className="p-4 font-bold text-center">Satuan</th>
                      <th className="p-4 font-bold text-right pr-6">Volume Output</th>
                      <th className="p-4 font-bold text-right">Bobot (%)</th>
                      <th className="p-4 font-bold text-right pr-6">Progress (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="text-center p-12 text-gray-400 italic">
                          <div className="flex flex-col items-center gap-2">
                             <CalendarDays size={32} className="opacity-20" />
                             <p>Tidak ada aktivitas proyek terekam pada hari ini.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      data.map((item, i) => (
                        <tr key={i} className="hover:bg-blue-50/30 transition-colors">
                          <td className="p-4 text-gray-600 whitespace-nowrap">
                             {new Date(item.tanggal).toLocaleDateString('id-ID', {day: '2-digit', month: 'short', year: 'numeric'})}
                          </td>
                          <td className="p-4 font-bold text-gray-800">{item.uraian}</td>
                          <td className="p-4 text-center text-gray-500">{item.satuan}</td>
                          <td className="p-4 text-right pr-6">
                             <span className="bg-green-50 text-green-700 font-bold px-3 py-1 rounded-lg border border-green-100 text-sm font-mono">
                               {Number(item.volume).toFixed(3)}
                             </span>
                          </td>
                          <td className="p-4 text-right text-gray-600">
                            {Number(item.bobot).toFixed(2)}
                          </td>

                          <td className="p-4 text-right pr-6">
                            <span className="bg-blue-50 text-blue-700 font-bold px-3 py-1 rounded-lg border border-blue-100 text-sm font-mono">
                              {Number(item.bobot_tercapai).toFixed(3)}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 🔥 DETAIL HARIAN RESOURCES (RAW) */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden p-6">
               <h2 className="text-lg font-bold text-gray-800 mb-6 border-b border-gray-100 pb-4">Rincian Penggunaan Sumber Daya per Item</h2>
               
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 
                 <div>
                    <h3 className="font-bold text-orange-700 bg-orange-50 px-3 py-2 rounded-lg flex items-center justify-between mb-3 text-sm">
                       <span className="flex items-center gap-2"><Package size={16}/> Material</span>
                    </h3>
                    <div className="space-y-2 text-sm text-gray-600">
                      {data.flatMap(d => d.materials || []).length > 0 ? (
                        data.flatMap(d => d.materials).map((m, i) => (
                          <div key={i} className="flex justify-between items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
                            <span className="font-medium">{m.nama}</span>
                            <span className="font-mono bg-white px-2 rounded text-xs border shadow-sm">
                              {Number(m.hasil).toFixed(2)} {m.satuan}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="text-center text-gray-400 text-xs italic py-2">Kosong</div>
                      )}
                    </div>
                 </div>

                 <div>
                    <h3 className="font-bold text-purple-700 bg-purple-50 px-3 py-2 rounded-lg flex items-center justify-between mb-3 text-sm">
                       <span className="flex items-center gap-2"><Users size={16}/> Pekerja</span>
                    </h3>
                    <div className="space-y-2 text-sm text-gray-600">
                      {data.flatMap(d => d.pekerja || []).length > 0 ? (
                        data.flatMap(d => d.pekerja).map((p, i) => (
                          <div key={i} className="flex justify-between items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
                            <span className="font-medium">{p.nama}</span>
                            <span className="font-mono bg-white px-2 rounded text-xs border shadow-sm">
                              {Number(p.hasil).toFixed(2)} {p.satuan}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="text-center text-gray-400 text-xs italic py-2">Kosong</div>
                      )}
                    </div>
                 </div>

                 <div>
                    <h3 className="font-bold text-teal-700 bg-teal-50 px-3 py-2 rounded-lg flex items-center justify-between mb-3 text-sm">
                       <span className="flex items-center gap-2"><Wrench size={16}/> Alat Berat</span>
                    </h3>
                    <div className="space-y-2 text-sm text-gray-600">
                      {data.flatMap(d => d.peralatan || []).length > 0 ? (
                        data.flatMap(d => d.peralatan).map((a, i) => (
                          <div key={i} className="flex justify-between items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
                            <span className="font-medium">{a.nama}</span>
                            <span className="font-mono bg-white px-2 rounded text-xs border shadow-sm">
                              {Number(a.hasil).toFixed(2)} {a.satuan}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="text-center text-gray-400 text-xs italic py-2">Kosong</div>
                      )}
                    </div>
                 </div>

               </div>
            </div>

          </div>

          {/* KOLOM KANAN: TOTAL REKAP (1/3 width) */}
          <div className="lg:col-span-1">
             <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-3xl p-6 shadow-sm border border-emerald-200/50 h-full">
               <h2 className="text-lg font-black text-emerald-900 mb-6 border-b border-emerald-200/50 pb-4">
                 Total Harian (Rekap Gabungan)
               </h2>

               {/* --- MATERIAL REKAP --- */}
                <div className="mb-6">
                  <h3 className="font-bold text-gray-800 tracking-wide text-xs uppercase mb-3 text-emerald-800">Total Kebutuhan Material</h3>
                  {totalMaterial.length > 0 ? (
                    <div className="space-y-2">
                      {totalMaterial.map((m, i) => (
                        <div key={i} className="bg-white p-3 rounded-xl shadow-sm border border-emerald-100 flex justify-between items-center break-inside-avoid">
                          <span className="font-semibold text-gray-700">{m.nama}</span>
                          <span className="font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg text-sm">{Number(m.total).toFixed(2)} {m.satuan}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-emerald-600/50 text-sm italic bg-emerald-50/50 p-3 rounded-xl border border-dashed border-emerald-200 text-center">Tidak ada rekap material.</div>
                  )}
                </div>

                {/* --- PEKERJA REKAP --- */}
                <div className="mb-6">
                  <h3 className="font-bold text-gray-800 tracking-wide text-xs uppercase mb-3 text-emerald-800">Total Kebutuhan Pekerja</h3>
                  {totalPekerja.length > 0 ? (
                    <div className="space-y-2">
                       {totalPekerja.map((p, i) => (
                        <div key={i} className="bg-white p-3 rounded-xl shadow-sm border border-blue-100 flex flex-col gap-1.5 break-inside-avoid">
                          <div className="font-bold text-blue-800">{p.nama}</div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-gray-500">Sistem: {Number(p.total).toFixed(2)}</span>
                            <span className="font-black text-white bg-blue-500 px-2 py-0.5 rounded-md shadow-sm">
                              Dibutuhkan: {p.terbilang}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-emerald-600/50 text-sm italic bg-emerald-50/50 p-3 rounded-xl border border-dashed border-emerald-200 text-center">Tidak ada rekap pekerja.</div>
                  )}
                </div>

                {/* --- PERALATAN REKAP --- */}
                <div>
                  <h3 className="font-bold text-gray-800 tracking-wide text-xs uppercase mb-3 text-emerald-800">Total Kebutuhan Peralatan</h3>
                   {totalPeralatan.length > 0 ? (
                    <div className="space-y-2">
                       {totalPeralatan.map((a, i) => (
                        <div key={i} className="bg-white p-3 rounded-xl shadow-sm border border-orange-100 flex flex-col gap-1.5 break-inside-avoid">
                          <div className="font-bold text-orange-800">{a.nama}</div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-gray-500">Sistem: {Number(a.total).toFixed(2)}</span>
                            <span className="font-black text-white bg-orange-500 px-2 py-0.5 rounded-md shadow-sm">
                              Dibutuhkan: {a.terbilang} 
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-emerald-600/50 text-sm italic bg-emerald-50/50 p-3 rounded-xl border border-dashed border-emerald-200 text-center">Tidak ada rekap peralatan.</div>
                  )}
                </div>
             </div>
          </div>

        </div>
      </div>
    </>
  );
}