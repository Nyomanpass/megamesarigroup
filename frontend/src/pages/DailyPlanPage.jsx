import { useEffect, useState } from "react";
import Layout from "../components/layout/Layout";
import api from "../api";

export default function DailyPlanPage() {
  const [data, setData] = useState([]);
  const projectId = 1; 
  const [weekly, setWeekly] = useState([]);
  const [monthly, setMonthly] = useState([]);

  useEffect(() => {
    fetchAll();
  }, []);


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

  return (
    <Layout >
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Daily Plan Project</h1>

        <div className="overflow-x-auto bg-white rounded-xl shadow">
            <table className="min-w-full text-sm text-gray-700">
            <thead className="bg-gray-100 text-xs uppercase">
                <tr>
                <th className="px-4 py-3">Hari Ke</th>
                <th className="px-4 py-3">Tanggal</th>
                <th className="px-4 py-3">Hari</th>
                <th className="px-4 py-3">Minggu</th>
                <th className="px-4 py-3">Bulan</th>
                <th className="px-4 py-3">Bobot Mingguan</th>
                <th className="px-4 py-3">Bobot Harian</th>
                </tr>
            </thead>

            <tbody>
                {data.map((item) => (
                <tr key={item.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2">{item.hari_ke}</td>
                    <td className="px-4 py-2">{item.tanggal}</td>
                    <td className="px-4 py-2 capitalize">{item.nama_hari}</td>
                    <td className="px-4 py-2">{item.minggu_ke}</td>
                    <td className="px-4 py-2">{item.bulan_ke}</td>
                    <td className="px-4 py-2">
                    {Number(item.bobot_mingguan).toFixed(3)}
                    </td>
                    <td className="px-4 py-2">
                    {Number(item.bobot_harian).toFixed(2)}
                    </td>
                </tr>
                ))}
            </tbody>
            </table>
        </div>
        </div>
        <div className="mt-10">
        <h2 className="text-xl font-bold mb-4">Data Mingguan</h2>

        <div className="overflow-x-auto bg-white rounded-xl shadow">
            <table className="min-w-full text-sm">
            <thead className="bg-gray-100">
                <tr>
                <th className="px-4 py-2">Minggu</th>
                <th className="px-4 py-2">Tgl Awal</th>
                <th className="px-4 py-2">Tgl Akhir</th>
                <th className="px-4 py-2">Bobot</th>
                <th className="px-4 py-2">Kumulatif</th>
                </tr>
            </thead>

            <tbody>
                {weekly.map((item, i) => (
                <tr key={i} className="border-b">
                    <td className="px-4 py-2">{item.minggu_ke}</td>
                    <td className="px-4 py-2">{item.tgl_awal}</td>
                    <td className="px-4 py-2">{item.tgl_akhir}</td>
                    <td className="px-4 py-2">{item.bobot_mingguan}</td>
                    <td className="px-4 py-2"> {Number(item.kumulatif).toFixed(2)}</td>
                </tr>
                ))}
            </tbody>
            </table>
        </div>
        </div>

        <div className="mt-10">
  <h2 className="text-xl font-bold mb-4">Data Bulanan</h2>

  <div className="overflow-x-auto bg-white rounded-xl shadow">
    <table className="min-w-full text-sm">
      <thead className="bg-gray-100">
        <tr>
          <th className="px-4 py-2">Bulan</th>
          <th className="px-4 py-2">Tgl Awal</th>
          <th className="px-4 py-2">Tgl Akhir</th>
          <th className="px-4 py-2">Bobot</th>
          <th className="px-4 py-2">Kumulatif</th>
        </tr>
      </thead>

      <tbody>
        {monthly.map((item, i) => (
          <tr key={i} className="border-b">
            <td className="px-4 py-2">{item.bulan_ke}</td>
            <td className="px-4 py-2">{item.tgl_awal}</td>
            <td className="px-4 py-2">{item.tgl_akhir}</td>
            <td className="px-4 py-2">{item.bobot_bulanan}</td>
            <td className="px-4 py-2"> {Number(item.kumulatif).toFixed(2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div>
    </Layout>
  );
}