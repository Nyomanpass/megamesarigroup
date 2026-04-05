import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api";

export default function MonthlyReportPage() {
  const { id } = useParams();

  const [data, setData] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(null);

  const fetchReport = async () => {
    try {
      const res = await api.get(`/monthly-report/${id}`);
      setData(res.data);

      // 🔥 default bulan pertama
      if (res.data.length > 0) {
        setSelectedMonth(res.data[0].bulan_ke);
      }

    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  // 🔥 ambil bulan terpilih
  const bulan = data.find(
    (b) => b.bulan_ke === selectedMonth
  );

  return (
    <>
      <div className="p-6">

        <h1 className="text-2xl font-bold mb-4">
          Laporan Bulanan Project #{id}
        </h1>

        {/* 🔥 DROPDOWN BULAN */}
        <select
          value={selectedMonth || ""}
          onChange={(e) => setSelectedMonth(Number(e.target.value))}
          className="border p-2 rounded mb-4"
        >
          {data.map((b) => (
            <option key={b.bulan_ke} value={b.bulan_ke}>
              Bulan {b.bulan_ke}
            </option>
          ))}
        </select>

        {/* 🔥 TAMPILKAN 1 BULAN */}
        {bulan && (
          <div className="space-y-4">

            {/* HEADER */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-4 rounded-xl shadow">
              <h2 className="text-lg font-semibold">
                Bulan {bulan.bulan_ke}
              </h2>
              <p className="text-sm opacity-90">
                {bulan.tgl_awal} - {bulan.tgl_akhir}
              </p>
            </div>

            {/* TABLE */}
            <div className="bg-white shadow-lg rounded-xl overflow-hidden border">

              <table className="w-full text-sm">
                
                <thead className="bg-gray-100 text-gray-700 uppercase text-xs tracking-wide">
                  <tr>
                    <th className="p-3 text-left">Uraian</th>
                    <th className="p-3 text-left">Satuan</th>
                    <th className="p-3 text-right">Bobot</th>
                    <th className="p-3 text-right">Total</th>
                    <th className="p-3 text-right">s/d Lalu</th>
                    <th className="p-3 text-right">Bulan Ini</th>
                    <th className="p-3 text-right">s/d Ini</th>
                    <th className="p-3 text-right">%</th>
                  </tr>
                </thead>

                <tbody>
                  {bulan.data.map((item, i) => {

                    // 🔥 GROUP HEADER
                    if (item.tipe !== "item") {
                      return (
                        <tr key={i} className="bg-gray-200">
                          <td colSpan="8" className="p-3 font-semibold text-gray-800">
                            {item.uraian}
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr 
                        key={i} 
                        className="border-t hover:bg-gray-50 transition"
                      >
                        <td className="p-3 pl-6 text-gray-800">
                          {item.uraian}
                        </td>

                        <td className="p-3 text-gray-600">
                          {item.satuan}
                        </td>

                        <td className="p-3 text-right font-medium">
                          {item.bobot}
                        </td>

                        <td className="p-3 text-right">
                          {item.total}
                        </td>

                        <td className="p-3 text-right text-gray-500">
                          {item.sd_lalu}
                        </td>

                        {/* 🔥 BULAN INI */}
                        <td className="p-3 text-right font-semibold text-green-600">
                          {item.bulan_ini}
                        </td>

                        {/* 🔥 KUMULATIF */}
                        <td className="p-3 text-right font-semibold text-emerald-600">
                          {item.sd_ini}
                        </td>

                        {/* 🔥 PERSEN */}
                        <td className="p-3 text-right">
                          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                            {item.persen}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

              </table>

              <div className="p-4 border-t bg-gray-50 flex justify-between items-center">

  {(() => {
    const format = (val) => Number(val || 0).toFixed(3);

    const persenTarget = bulan.rencana
      ? (bulan.real / bulan.rencana) * 100
      : 0;

    return (
      <>
        {/* 🔹 KIRI */}
        <div className="text-sm space-y-1">

          <div>
            <b>Rencana Bulan Ini:</b> {format(bulan.rencana)}
          </div>

          <div>
            <b>Realisasi Bulan Ini:</b> {format(bulan.real)}
          </div>

          <div>
            <b>% terhadap target:</b>{" "}
            <span className="font-semibold">
              {persenTarget.toFixed(1)}%
            </span>
          </div>

        </div>

        {/* 🔹 KANAN */}
        <div className="text-right">

          <div>
            <b>Deviasi:</b>{" "}
            <span
              className={
                bulan.deviasi >= 0
                  ? "text-green-600 font-semibold"
                  : "text-red-600 font-semibold"
              }
            >
              {format(bulan.deviasi)}
            </span>
          </div>

          <div className="text-xs text-gray-500 mt-1">
            {bulan.deviasi > 0
              ? "Lebih cepat dari rencana 🚀"
              : bulan.deviasi < 0
              ? "Terlambat dari rencana ⚠️"
              : "Sesuai rencana"}
          </div>

        </div>
      </>
    );
  })()}

</div>

            </div>
          </div>
        )}

      </div>
    </>
  );
}