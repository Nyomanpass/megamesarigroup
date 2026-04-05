import { useEffect, useState } from "react";
import api from "../api";
import { useParams } from "react-router-dom";

export default function DailyPlanPage() {
  const { id } = useParams();
  const projectId = id;

  const [data, setData] = useState([]);
  const [weekly, setWeekly] = useState([]);
  const [monthly, setMonthly] = useState([]);
  const [loading, setLoading] = useState(false); // State untuk loading button

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

  // 🔥 FUNGSI GENERATE (Pengganti Postman)
  const handleGenerate = async () => {
    const confirm = window.confirm("Generate ulang rencana harian? Data lama akan diperbarui.");
    if (!confirm) return;

    setLoading(true);
    try {
      // Menjalankan API: http://localhost:5004/api/daily-plan/generate/{id}
      await api.post(`/daily-plan/generate/${projectId}`);
      alert("✅ Daily Plan Berhasil Di-generate!");
      fetchAll(); // Refresh semua tabel setelah sukses
    } catch (err) {
      alert(err.response?.data?.message || "Gagal Generate Plan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="p-6">
        {/* HEADER & TOMBOL GENERATE */}
        <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-xl shadow-sm border-l-4 border-indigo-600">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Daily Plan Project</h1>
            <p className="text-sm text-gray-500">ID Project: {projectId}</p>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className={`${
              loading ? "bg-gray-400" : "bg-indigo-600 hover:bg-indigo-700"
            } text-white px-5 py-2.5 rounded-lg font-bold shadow flex items-center gap-2 transition-all active:scale-95`}
          >
            {loading ? "⏳ Memproses..." : "⚡ Generate Plan Otomatis"}
          </button>
        </div>

        {/* --- TABEL DAILY --- */}
        <div className="overflow-x-auto bg-white rounded-xl shadow">
          <table className="min-w-full text-sm text-gray-700">
            <thead className="bg-gray-100 text-xs uppercase text-gray-600">
              <tr>
                <th className="px-4 py-3 text-left">Hari Ke</th>
                <th className="px-4 py-3 text-left">Tanggal</th>
                <th className="px-4 py-3 text-left">Hari</th>
                <th className="px-4 py-3 text-left">Minggu</th>
                <th className="px-4 py-3 text-left">Bulan</th>
                <th className="px-4 py-3 text-right">Bobot Mingguan</th>
                <th className="px-4 py-3 text-right">Bobot Harian</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium">{item.hari_ke}</td>
                  <td className="px-4 py-2">{item.tanggal}</td>
                  <td className="px-4 py-2 capitalize">{item.nama_hari}</td>
                  <td className="px-4 py-2">{item.minggu_ke}</td>
                  <td className="px-4 py-2">{item.bulan_ke}</td>
                  <td className="px-4 py-2 text-right">{Number(item.bobot_mingguan).toFixed(3)}</td>
                  <td className="px-4 py-2 text-right font-bold text-indigo-600">{Number(item.bobot_harian).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* --- TABEL MINGGUAN --- */}
        <div className="mt-10">
          <h2 className="text-xl font-bold mb-4 text-gray-800">📊 Data Mingguan</h2>
          <div className="overflow-x-auto bg-white rounded-xl shadow">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100 text-gray-600">
                <tr>
                  <th className="px-4 py-3 text-left">Minggu</th>
                  <th className="px-4 py-3 text-left">Tgl Awal</th>
                  <th className="px-4 py-3 text-left">Tgl Akhir</th>
                  <th className="px-4 py-3 text-right">Bobot</th>
                  <th className="px-4 py-3 text-right">Kumulatif</th>
                </tr>
              </thead>
              <tbody>
                {weekly.map((item, i) => (
                  <tr key={i} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2 font-bold">Minggu {item.minggu_ke}</td>
                    <td className="px-4 py-2">{item.tgl_awal}</td>
                    <td className="px-4 py-2">{item.tgl_akhir}</td>
                    <td className="px-4 py-2 text-right">{Number(item.bobot_mingguan).toFixed(3)}</td>
                    <td className="px-4 py-2 text-right font-bold text-blue-600">{Number(item.kumulatif).toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* --- TABEL BULANAN --- */}
        <div className="mt-10 mb-10">
          <h2 className="text-xl font-bold mb-4 text-gray-800">📅 Data Bulanan</h2>
          <div className="overflow-x-auto bg-white rounded-xl shadow">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100 text-gray-600">
                <tr>
                  <th className="px-4 py-3 text-left">Bulan</th>
                  <th className="px-4 py-3 text-left">Tgl Awal</th>
                  <th className="px-4 py-3 text-left">Tgl Akhir</th>
                  <th className="px-4 py-3 text-right">Bobot</th>
                  <th className="px-4 py-3 text-right">Kumulatif</th>
                </tr>
              </thead>
              <tbody>
                {monthly.map((item, i) => (
                  <tr key={i} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2 font-bold">Bulan {item.bulan_ke}</td>
                    <td className="px-4 py-2">{item.tgl_awal}</td>
                    <td className="px-4 py-2">{item.tgl_akhir}</td>
                    <td className="px-4 py-2 text-right">{Number(item.bobot_bulanan).toFixed(3)}</td>
                    <td className="px-4 py-2 text-right font-bold text-green-600">{Number(item.kumulatif).toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}