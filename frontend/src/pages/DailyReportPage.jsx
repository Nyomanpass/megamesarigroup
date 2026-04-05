import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api";

export default function DailyReportPage() {
  const { id } = useParams();

  const [tanggal, setTanggal] = useState("");
  const [hariKe, setHariKe] = useState("");
  const [data, setData] = useState([]);
  const [plans, setPlans] = useState([]);
  const [error, setError] = useState("");

  const [totalMaterial, setTotalMaterial] = useState([]);
  const [totalPekerja, setTotalPekerja] = useState([]);
  const [totalPeralatan, setTotalPeralatan] = useState([]);

  // 🔥 ambil daily plan (buat dropdown hari)
  const fetchPlans = async () => {
    try {
      const res = await api.get(`/daily-plan/${id}`);
      setPlans(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  // 🔥 ambil laporan harian
  const fetchReport = async () => {
    setError("");

    if (!tanggal && !hariKe) {
      setError("Pilih tanggal atau hari dulu!");
      return;
    }

    try {
      let url = `/daily-report/${id}?`;

      if (tanggal) url += `tanggal=${tanggal}&`;
      if (hariKe) url += `hari_ke=${hariKe}`;

      const res = await api.get(url);
      console.log("Full Response:", res.data); // <--- LIHAT INI DI INSPECT ELEMENT (CONSOLE)

      setData(res.data.data);

        setTotalMaterial(res.data.total_material || []);
        setTotalPekerja(res.data.total_pekerja || []);
        setTotalPeralatan(res.data.total_peralatan || []);

    } catch (err) {
      const msg =
        err.response?.data?.message ||
        "Terjadi kesalahan";
      setError(msg);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  return (
    <>
      <div className="p-6">

      <h1 className="text-2xl font-bold mb-4">
        📅 Laporan Harian Project #{id}
      </h1>

      {/* 🔥 FILTER */}
      <div className="bg-white p-4 rounded-lg shadow mb-4 flex flex-wrap gap-3 items-end">

        {/* TANGGAL */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Pilih Tanggal
          </label>
          <input
            type="date"
            value={tanggal}
            onChange={(e) => {
              setTanggal(e.target.value);
              setHariKe("");
            }}
            className="border p-2 rounded"
          />
        </div>

        {/* HARI KE */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Pilih Hari
          </label>
          <select
            value={hariKe}
            onChange={(e) => {
              setHariKe(e.target.value);
              setTanggal("");
            }}
            className="border p-2 rounded"
          >
            <option value="">-- Pilih Hari --</option>
            {plans.map((p) => (
              <option key={p.id} value={p.hari_ke}>
                Hari ke-{p.hari_ke} ({p.tanggal})
              </option>
            ))}
          </select>
        </div>

        {/* BUTTON */}
        <button
          onClick={fetchReport}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          🔍 Tampilkan
        </button>
      </div>

      {/* 🔥 ERROR */}
      {error && (
        <div className="bg-red-100 text-red-600 p-2 rounded mb-4">
          {error}
        </div>
      )}

      {/* 🔥 TABLE */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2">Tanggal</th>
              <th className="p-2">Uraian</th>
              <th className="p-2">Satuan</th>
              <th className="p-2">Volume</th>
            </tr>
          </thead>

          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan="4" className="text-center p-4">
                  Tidak ada pekerjaan
                </td>
              </tr>
            ) : (
              data.map((item, i) => (
                <tr key={i} className="border-t">
                  <td className="p-2">{item.tanggal}</td>
                  <td className="p-2">{item.uraian}</td>
                  <td className="p-2">{item.satuan}</td>
                  <td className="p-2 font-semibold">
                    {item.volume}
                  </td>
                </tr>
              ))
            )}

          </tbody>
        </table>
<div className="mt-6 bg-white p-4 rounded shadow">

  <h2 className="text-lg font-semibold mb-3">
    🔧 Detail Harian
  </h2>

  {/* MATERIAL */}
<div className="mb-4">
  <h3 className="font-semibold">Material</h3>
  {data.flatMap(d => d.materials || []).length > 0 ? (
    data.flatMap(d => d.materials).map((m, i) => (
      <div key={i}>
        - {m.material?.nama} ({Number(m.hasil).toFixed(2)})
      </div>
    ))
  ) : (
    <div>-</div>
  )}
</div>

  {/* PEKERJA */}
<div className="mb-4">
  <h3 className="font-semibold">Pekerja</h3>
  {data.flatMap(d => d.pekerja || []).length > 0 ? (
    data.flatMap(d => d.pekerja).map((p, i) => (
      <div key={i}>
        - {p.pekerja?.nama} ({Number(p.jumlah).toFixed(2)})
      </div>
    ))
  ) : (
    <div>-</div>
  )}
</div>

  {/* PERALATAN */}
  <div>
    <h3 className="font-semibold">Peralatan</h3>
    {data.flatMap(d => d.peralatan || []).length > 0 ? (
      data.flatMap(d => d.peralatan).map((a, i) => (
        <div key={i}>
          - {a.tool?.nama} ({a.jumlah})
        </div>
      ))
    ) : (
      <div>-</div>
    )}
  </div>

</div>
      </div>

<div className="mt-6 bg-green-50 p-4 rounded shadow border border-green-200">
  <h2 className="text-lg font-semibold mb-4 text-green-800">
    📊 Total Harian (Gabungan)
  </h2>

  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
    
    {/* --- MATERIAL --- */}
    <div className="mb-4">
      <h3 className="font-bold text-gray-700 border-b border-green-200 mb-2">Material</h3>
      {totalMaterial.length > 0 ? (
        totalMaterial.map((m, i) => (
          <div key={i} className="text-sm py-1">
            - {m.nama} (<strong>{Number(m.total).toFixed(2)} {m.satuan}</strong>)
          </div>
        ))
      ) : (
        <div className="text-gray-400">-</div>
      )}
    </div>

    {/* --- PEKERJA --- */}
    <div className="mb-4">
      <h3 className="font-bold text-gray-700 border-b border-green-200 mb-2">Pekerja</h3>
      {totalPekerja.length > 0 ? (
        totalPekerja.map((p, i) => (
          <div key={i} className="text-sm py-1 bg-white mb-1 p-2 rounded shadow-sm border border-green-100">
            <div className="font-semibold text-blue-700">{p.nama}</div>
            <div className="flex flex-col text-xs text-gray-600 mt-1">
              <span>Sistem: {Number(p.total).toFixed(2)}</span>
              <span className="text-blue-600 font-bold">
                Riil: {p.di_bilang} {p.satuan}
              </span>
            </div>
          </div>
        ))
      ) : (
        <div className="text-gray-400">-</div>
      )}
    </div>

    {/* --- PERALATAN --- */}
    <div>
      <h3 className="font-bold text-gray-700 border-b border-green-200 mb-2">Peralatan</h3>
      {totalPeralatan.length > 0 ? (
        totalPeralatan.map((a, i) => (
          <div key={i} className="text-sm py-1 bg-white mb-1 p-2 rounded shadow-sm border border-green-100">
            <div className="font-semibold text-orange-700">{a.nama}</div>
            <div className="flex flex-col text-xs text-gray-600 mt-1">
              <span>Sistem: {Number(a.total).toFixed(2)}</span>
              <span className="text-orange-600 font-bold">
                Alat: {a.di_bilang} {a.satuan}
              </span>
            </div>
          </div>
        ))
      ) : (
        <div className="text-gray-400">-</div>
      )}
    </div>

  </div>
</div>

    </div>
   </>
  );
}