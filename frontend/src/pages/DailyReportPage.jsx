import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useProject } from "../context/ProjectContext";
import api from "../api";
import { buildDownloadFilename } from "../utils/downloadFilename";
import { ArrowLeft, CalendarDays, Search, Package, Users, Wrench, FileCheck, Info } from "lucide-react";

export default function DailyReportPage() {
  const { id: paramId } = useParams();
  const { selectedProject } = useProject();
  const id = selectedProject?.id || paramId;
  const navigate = useNavigate();
  const [hariKe, setHariKe] = useState("");
  const [showHariModal, setShowHariModal] = useState(false);
  const [data, setData] = useState([]);
  const [plans, setPlans] = useState([]);
  const [error, setError] = useState("");
  const [totalBobot, setTotalBobot] = useState(0);
  const [totalMaterial, setTotalMaterial] = useState([]);
  const [totalPekerja, setTotalPekerja] = useState([]);
  const [totalPeralatan, setTotalPeralatan] = useState([]);
  const [boqList, setBoqList] = useState([]);
  

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
      setBoqList(res.data.boq || []); 
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
      buildDownloadFilename(`laporan_harian_hari_${hariKe}`, selectedProject, "xlsx")
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

  const boqMap = {};
  boqList.forEach(b => {
    boqMap[b.id] = b;
  });

  const getBoqHierarchy = (boqId) => {
  let result = [];
  let current = boqMap[boqId];

  while (current) {
    result.unshift({
      tipe: current.tipe,
      label: `${current.kode ? current.kode + " - " : ""}${current.uraian}`
    });

    current = boqMap[current.parent_id];
  }

  return result;
};

const buildRows = () => {

  if (!data.length) return [];

  // =========================
  // MAP BOQ
  // =========================
  const map = {};

  boqList.forEach((b) => {
    map[Number(b.id)] = b;
  });

  // =========================
  // GET PARENT
  // =========================
  const getParent = (boq) => {

    let header = null;
    let sub = null;

    let current = boq;

    while (current) {

      if (current.tipe === "header") {
        header = current;
      }

      if (current.tipe === "subheader") {
        sub = current;
      }

      current =
        map[Number(current.parent_id)];

    }

    return {
      header,
      sub
    };

  };

  // =========================
  // SORT BERDASARKAN KODE
  // =========================
  const sortedData = [...data].sort((a, b) => {

    const aKode =
      map[Number(a.boq_id)]?.kode || "";

    const bKode =
      map[Number(b.boq_id)]?.kode || "";

    return aKode.localeCompare(
      bKode,
      undefined,
      {
        numeric: true,
        sensitivity: "base"
      }
    );

  });

  // =========================
  // GROUPING
  // =========================
  const grouped = {};

  sortedData.forEach((item) => {

    const boq =
      map[Number(item.boq_id)];

    if (!boq) return;

    const {
      header,
      sub
    } = getParent(boq);

    const headerKey =
      header?.id || "no-header";

    const subKey =
      sub?.id || "no-sub";

    // HEADER
    if (!grouped[headerKey]) {

      grouped[headerKey] = {
        header,
        subs: {}
      };

    }

    // SUBHEADER
    if (
      !grouped[headerKey]
        .subs[subKey]
    ) {

      grouped[headerKey]
        .subs[subKey] = {
          sub,
          items: []
        };

    }

    // ITEM
    grouped[headerKey]
      .subs[subKey]
      .items
      .push(item);

  });

  // =========================
  // BUILD ROWS
  // =========================
  const rows = [];

  Object.values(grouped)
    .forEach((headerGroup) => {

    // HEADER
    if (headerGroup.header) {

      rows.push({
        type: "header",
        label: headerGroup.header.uraian,
        kode: headerGroup.header.kode
      });

    }

    // SUBHEADER
    Object.values(headerGroup.subs)
      .forEach((subGroup) => {

      if (subGroup.sub) {

        rows.push({
          type: "subheader",
          label: subGroup.sub.uraian,
          kode: subGroup.sub.kode
        });

      }

      // ITEMS
      subGroup.items.forEach((item) => {

        rows.push({
          type: "item",
          data: item
        });

      });

    });

  });

  return rows;

};

const groupedByWeek = plans.reduce((acc, item) => {

  const minggu = item.minggu_ke || 1;

  if (!acc[minggu]) {
    acc[minggu] = [];
  }

  acc[minggu].push(item);

  return acc;

}, {});


const handleExportPDF = async () => {

  try {

    if (!hariKe) {

      setError(
        "Pilih hari dulu sebelum export PDF!"
      );

      return;

    }

    const response = await api.get(

      `/daily-report-pdf/${id}?day=${hariKe}`,

      {
        responseType: "blob"
      }

    );

    const url =
      window.URL.createObjectURL(
        new Blob([response.data])
      );

    const link =
      document.createElement("a");

    link.href = url;

    link.setAttribute(
      "download",
      buildDownloadFilename(`laporan_harian_${hariKe}`, selectedProject, "pdf")
    );

    document.body.appendChild(link);

    link.click();

    link.remove();

  } catch (error) {

    console.log(error);

    setError("Gagal export PDF");

  }

};

  return (
    <>
      <div className="p-6 mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">

        {/* HEADER */}
        <div className="flex items-center gap-4 mb-8">
            <button 
              onClick={() => navigate("/dashboard")} 
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
            

          {/* BUTTON PILIH HARI */}
          <div className="flex-1 w-full relative">

            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
              Pilih Berdasarkan Hari Ke-
            </label>

            <button
              type="button"
              onClick={() => setShowHariModal(true)}
              className="w-full border-2 border-gray-200 p-3 rounded-xl bg-gray-50 flex justify-between items-center hover:border-blue-400 transition"
            >
              <span className={`${hariKe ? "text-gray-800" : "text-gray-400"}`}>
                {hariKe
                  ? `Hari ke-${hariKe}`
                  : "Pilih Hari"}
              </span>

              <CalendarDays size={18} className="text-blue-500" />
            </button>

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

        <div className="flex items-center gap-3 mb-4">

          <button
            onClick={handleExportExcel}
            className="px-5 py-3 rounded-xl bg-green-600 hover:bg-green-700 hover:shadow-md text-white font-semibold transition-all active:scale-95"
          >
            Export Excel
          </button>

          <button
            onClick={handleExportPDF}
            className="px-5 py-3 rounded-xl bg-red-600 hover:bg-red-700 hover:shadow-md text-white font-semibold transition-all active:scale-95"
          >
            Export PDF
          </button>

        </div>

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

  <div className="space-y-6">

  {/* ================= HEADER ================= */}
  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-3xl p-6 shadow-lg">
    <h2 className="text-xl font-bold">Progress Fisik Harian</h2>
    <p className="text-sm opacity-80 mt-1">
      Monitoring aktivitas pekerjaan proyek
    </p>

    <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">

      <div>
        <p className="text-xs opacity-70">Total Item</p>
        <p className="text-lg font-bold">{data.length}</p>
      </div>

      <div>
        <p className="text-xs opacity-70">Cuaca</p>
        <p className="text-lg font-bold">
          {data[0]?.cuaca || "-"}
        </p>
      </div>

      <div>
        <p className="text-xs opacity-70">Jam Kerja</p>
        <p className="text-lg font-bold">
          {data[0]?.jam_mulai && data[0]?.jam_selesai
            ? `${data[0].jam_mulai} - ${data[0].jam_selesai}`
            : "-"}
        </p>
      </div>

    </div>
  </div>

  {/* ================= DETAIL PEKERJAAN ================= */}
  <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">

    <div className="p-5 border-b flex justify-between items-center">
      <h3 className="font-bold text-gray-800">Detail Pekerjaan</h3>
      <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-bold">
        {data.length} item
      </span>
    </div>

    <div className="w-full">
      <table className="w-full text-sm">

        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan="4" className="text-center p-12 text-gray-400">
                Tidak ada data hari ini
              </td>
            </tr>
          ) : (
            buildRows().map((row, i) => {

  // ================= HEADER =================
  if (row.type === "header") {
    return (
      <tr key={i}>
        <td colSpan="4" className="px-5 pt-8 pb-3">
          <div className="flex items-center gap-3">

              {/* KODE */}
              <div className="bg-blue-600 text-white text-xs font-black px-3 py-1 rounded-lg shadow">
                {row.kode || "A"}
              </div>

              {/* LABEL */}
              <h2 className="text-base font-bold text-slate-900 tracking-wide uppercase">
                {row.label}
              </h2>

            </div>

          {/* garis tegas */}
          <div className="mt-3 h-[2px] bg-gradient-to-r from-blue-400 via-blue-200 to-transparent rounded-full"></div>

        </td>
      </tr>
    );
  }

  // ================= SUBHEADER =================
  if (row.type === "subheader") {
    return (
      <tr key={i}>
        <td colSpan="4" className="px-8 py-2">

          <div className="flex items-center gap-2">

            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>

            <span className="text-xs font-semibold text-gray-600 tracking-wide uppercase">
              {row.label}
            </span>

          </div>

        </td>
      </tr>
    );
  }

  // ================= ITEM =================
  const item = row.data;

  return (
    <tr key={i}>
      <td colSpan="4" className="px-10 py-2">

        <div className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm hover:shadow-md hover:border-blue-200 transition-all">

          {/* LEFT */}
          <div className="flex flex-col">

            <span className="text-[11px] text-gray-400">
              {new Date(item.tanggal).toLocaleDateString("id-ID")}
            </span>

            <span className="text-sm font-semibold text-gray-800">
               {item.uraian}
            </span>

          </div>

          {/* RIGHT */}
          <div className="flex items-center gap-4">

            <span className="text-[11px] bg-gray-100 px-2 py-1 rounded text-gray-600">
              {item.satuan}
            </span>

            <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-xs font-mono font-bold">
              {Number(item.volume).toFixed(3)}
            </span>

          </div>

        </div>

      </td>
    </tr>
  );
})
          )}
        </tbody>
            

      </table>
    </div>
  </div>

  {/* ================= REKAP ================= */}
  <div className="bg-white rounded-3xl border shadow-sm p-6">
    <h2 className="font-bold text-gray-800 mb-4">
      Rekap Harian
    </h2>

    <div className="grid md:grid-cols-3 gap-6">

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
              <div
                key={idx}
                className="flex justify-between items-center bg-gray-50 p-3 rounded-xl mb-2 hover:bg-gray-100 transition"
              >
                <span className="text-sm">{x.nama}</span>
                <span className="font-bold text-sm text-gray-700">
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

  {/* ================= SUMBER DAYA ================= */}
  <div className="bg-white rounded-3xl border shadow-sm p-6">
  <h2 className="font-bold text-gray-800 text-lg mb-6">
    Rincian Sumber Daya
  </h2>

  <div className="space-y-5">

    {data.map((item, idx) => {

      const materials = item.materials || [];
      const pekerja = item.pekerja || [];
      const peralatan = item.peralatan || [];

      return (
        <div key={idx} className="bg-white border rounded-2xl shadow-sm">

          {/* HEADER */}
          <div className="px-5 py-4 border-b">

            <div className="text-xs text-gray-400 mb-1">
              {new Date(item.tanggal).toLocaleDateString("id-ID")}
            </div>

            <h3 className="text-base font-bold text-gray-800">
              {item.uraian}
            </h3>

          </div>

          {/* CONTENT */}
          <div className="p-4 grid md:grid-cols-3 gap-4">

            {/* MATERIAL */}
            <div className="bg-amber-50 rounded-xl p-4">

              <h4 className="text-sm font-bold text-amber-700 mb-3 uppercase">
                Material
              </h4>

              {materials.length > 0 ? (
                <div className="space-y-2">
                  {materials.map((m, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span>{m.nama}</span>
                      <span className="font-semibold text-amber-800">
                        {Number(m.hasil).toFixed(2)} {m.satuan}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-400 italic">-</div>
              )}

            </div>

            {/* PEKERJA */}
            <div className="bg-blue-50 rounded-xl p-4">

              <h4 className="text-sm font-bold text-blue-700 mb-3 uppercase">
                Pekerja
              </h4>

              {pekerja.length > 0 ? (
                <div className="space-y-2">
                  {pekerja.map((p, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span>{p.nama}</span>
                      <span className="font-semibold text-blue-800">
                        {Number(p.hasil).toFixed(2)} {p.satuan}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-400 italic">-</div>
              )}

            </div>

            {/* PERALATAN */}
            <div className="bg-emerald-50 rounded-xl p-4">

              <h4 className="text-sm font-bold text-emerald-700 mb-3 uppercase">
                Peralatan
              </h4>

              {peralatan.length > 0 ? (
                <div className="space-y-2">
                  {peralatan.map((p, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span>{p.nama}</span>
                      <span className="font-semibold text-emerald-800">
                        {Number(p.hasil).toFixed(2)} {p.satuan}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-400 italic">-</div>
              )}

            </div>

          </div>

        </div>
      );
    })}

  </div>
</div>
</div>
      </div>
      {/* MODAL PILIH HARI */}
{showHariModal && (
  <div className="fixed inset-0 z-50 bg-black/40 flex justify-center items-center p-4">

    <div className="bg-white w-full max-w-2xl max-h-[80vh] rounded-2xl shadow-xl flex flex-col overflow-hidden">

      {/* HEADER */}
      <div className="p-4 border-b flex justify-between items-center">
        <h2 className="font-bold text-gray-800">
          Pilih Hari
        </h2>

        <button
          onClick={() => setShowHariModal(false)}
          className="text-gray-500 hover:text-red-500"
        >
          ✖
        </button>
      </div>

      {/* CONTENT */}
      <div className="overflow-y-auto p-4 space-y-5">

        {Object.keys(groupedByWeek).map((week) => (

          <div key={week}>

            {/* HEADER MINGGU */}
            <div className="flex items-center gap-2 mb-3">

              <div className="h-[2px] flex-1 bg-blue-100"></div>

              <div className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                Minggu ke-{week}
              </div>

              <div className="h-[2px] flex-1 bg-blue-100"></div>

            </div>

            {/* HARI */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">

              {groupedByWeek[week].map((d) => (

                <div
                  key={d.hari_ke}
                  onClick={() => {
                    setHariKe(d.hari_ke);
                    setShowHariModal(false);
                  }}
                  className={`
                    border rounded-2xl p-4 cursor-pointer transition-all
                    hover:shadow-md hover:border-blue-400
                    ${hariKe == d.hari_ke
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white"}
                  `}
                >

                  <div className="font-bold text-sm">
                    Hari ke-{d.hari_ke}
                  </div>

                  <div className={`text-xs mt-1 ${
                    hariKe == d.hari_ke
                      ? "text-blue-100"
                      : "text-gray-400"
                  }`}>
                    {new Date(d.tanggal).toLocaleDateString(
                      "id-ID",
                      {
                        day: "2-digit",
                        month: "long",
                        year: "numeric"
                      }
                    )}
                  </div>

                </div>

              ))}

            </div>

          </div>

        ))}

      </div>

    </div>

  </div>
)}
    </>
  );
}
