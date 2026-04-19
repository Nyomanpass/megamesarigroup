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

  {/* ================= LEFT (TABLE) ================= */}
  <div className="lg:col-span-2 space-y-6">

    {/* HEADER CARD */}
    <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">

      <div className="p-5 border-b flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-gray-800">
            Progress Fisik Harian
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Monitoring aktivitas pekerjaan harian proyek
          </p>
        </div>

        <div className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full">
          {data.length} Item
        </div>
      </div>

      {/* INFO */}
      <div className="p-5 border-b">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          <div className="bg-gray-50 border rounded-xl p-4">
            <p className="text-xs text-gray-500">Cuaca</p>
            <p className="text-lg font-bold text-gray-800">
              {data[0]?.cuaca || "-"}
            </p>
          </div>

          <div className="bg-gray-50 border rounded-xl p-4">
            <p className="text-xs text-gray-500">Jam Kerja</p>
            <p className="text-lg font-bold text-gray-800">
              {data[0]?.jam_mulai && data[0]?.jam_selesai
                ? `${data[0].jam_mulai} - ${data[0].jam_selesai}`
                : "-"}
            </p>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">

          <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
            <tr>
              <th className="p-4 text-left">Tanggal</th>
              <th className="p-4 text-left">Pekerjaan</th>
              <th className="p-4 text-center">Sat</th>
              <th className="p-4 text-right">Output</th>       
            </tr>
          </thead>

          <tbody className="divide-y">

            {data.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center p-10 text-gray-400">
                  Tidak ada data hari ini
                </td>
              </tr>
            ) : (
              data.map((item, i) => (
                <tr key={i} className="hover:bg-gray-50">

                  <td className="p-4 text-gray-500">
                    {new Date(item.tanggal).toLocaleDateString("id-ID")}
                  </td>

                  <td className="p-4 font-semibold text-gray-800">
                    {item.uraian}
                  </td>

                  <td className="p-4 text-center text-gray-400">
                    {item.satuan}
                  </td>

                  <td className="p-4 text-right">
                    <span className="bg-gray-100 px-2 py-1 rounded font-mono">
                      {Number(item.volume).toFixed(3)}
                    </span>
                  </td>
                </tr>
              ))
            )}

          </tbody>
        </table>
      </div>

    </div>

    {/* RESOURCE */}
    <div className="bg-white rounded-3xl border shadow-sm p-6">
      <h2 className="font-bold text-gray-800 mb-4">
        Rincian Sumber Daya
      </h2>

      <div className="grid md:grid-cols-3 gap-6">

        {[
          { title: "Material", data: data.flatMap(d => d.materials || []), color: "emerald" },
          { title: "Pekerja", data: data.flatMap(d => d.pekerja || []), color: "blue" },
          { title: "Peralatan", data: data.flatMap(d => d.peralatan || []), color: "orange" }
        ].map((section, idx) => (
          <div key={idx}>
            <h3 className="text-sm font-bold mb-3 text-gray-700">
              {section.title}
            </h3>

            {section.data.length > 0 ? (
              <div className="space-y-2">
                {section.data.map((x, i) => (
                  <div key={i} className="bg-gray-50 p-3 rounded-xl flex justify-between">
                    <span>{x.nama}</span>
                    <span className="font-mono text-sm">
                      {Number(x.hasil).toFixed(2)} {x.satuan}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-gray-400 italic">Kosong</div>
            )}
          </div>
        ))}

      </div>
    </div>

  </div>

  {/* ================= RIGHT (SUMMARY) ================= */}
  <div>

    <div className="bg-white rounded-3xl border shadow-sm p-6 space-y-6">

      <h2 className="font-bold text-gray-800">
        Rekap Harian
      </h2>

      {[ 
        { title: "Material", data: totalMaterial },
        { title: "Pekerja", data: totalPekerja },
        { title: "Peralatan", data: totalPeralatan }
      ].map((section, i) => (
        <div key={i}>
          <h3 className="text-xs uppercase text-gray-400 mb-2">
            {section.title}
          </h3>

          {section.data.length > 0 ? (
            section.data.map((x, idx) => (
              <div key={idx} className="flex justify-between bg-gray-50 p-2 rounded-lg mb-2">
                <span>{x.nama}</span>
                <span className="font-bold text-sm">
                  {Number(x.total).toFixed(2)}
                </span>
              </div>
            ))
          ) : (
            <div className="text-xs text-gray-400 italic">
              Tidak ada data
            </div>
          )}

        </div>
      ))}

    </div>

  </div>

</div>
      </div>
    </>
  );
}