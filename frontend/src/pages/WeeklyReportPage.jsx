import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api";

export default function WeeklyReportPage() {
  const { id } = useParams();

  const [data, setData] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState(null);

  const fetchReport = async () => {
    try {
      const res = await api.get(`/weekly-report/${id}`);
      setData(res.data);

      // 🔥 default minggu pertama
      if (res.data.length > 0) {
        setSelectedWeek(res.data[0].minggu_ke);
      }

    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  // 🔥 ambil minggu terpilih
  const minggu = data.find(
    (m) => m.minggu_ke === selectedWeek
  );

  return (
    <>
        <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">
            Laporan Mingguan Project #{id}
        </h1>

        {/* 🔥 DROPDOWN */}
        <select
            value={selectedWeek || ""}
            onChange={(e) => setSelectedWeek(Number(e.target.value))}
            className="border p-2 rounded mb-4"
        >
            {data.map((m) => (
            <option key={m.minggu_ke} value={m.minggu_ke}>
                Minggu {m.minggu_ke}
            </option>
            ))}
        </select>

        {/* 🔥 TAMPILKAN 1 MINGGU */}
     {minggu && (
  <div className="space-y-4">

    {/* HEADER CARD */}
    <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-4 rounded-xl shadow">
      <h2 className="text-lg font-semibold">
        Minggu {minggu.minggu_ke}
      </h2>
      <p className="text-sm opacity-90">
        {minggu.tgl_awal} - {minggu.tgl_akhir}
      </p>
    </div>

    {/* TABLE */}
    <div className="bg-white shadow-lg rounded-xl overflow-hidden border">

      <table className="w-full text-sm">
        
        {/* HEADER */}
        <thead className="bg-gray-100 text-gray-700 uppercase text-xs tracking-wide">
          <tr>
            <th className="p-3 text-left">Uraian</th>
            <th className="p-3 text-left">Satuan</th>
            <th className="p-3 text-right">Bobot</th>
            <th className="p-3 text-right">Total</th>
            <th className="p-3 text-right">s/d Lalu</th>
            <th className="p-3 text-right">Minggu Ini</th>
            <th className="p-3 text-right">s/d Ini</th>
            <th className="p-3 text-right">%</th>
          </tr>
        </thead>

        {/* BODY */}
        <tbody>
          {minggu.data.map((item, i) => {

            // 🔥 HEADER GROUP
            if (item.tipe !== "item") {
              return (
                <tr key={i} className="bg-gray-200">
                  <td colSpan="8" className="p-3 font-semibold text-gray-800">
                    {item.uraian}
                  </td>
                </tr>
              );
            }

            // 🔥 ITEM ROW
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

                {/* 🔥 Highlight Minggu Ini */}
                <td className="p-3 text-right font-semibold text-blue-600">
                  {item.minggu_ini}
                </td>

                {/* 🔥 Highlight Kumulatif */}
                <td className="p-3 text-right font-semibold text-indigo-600">
                  {item.sd_ini}
                </td>

                {/* 🔥 Persen Badge */}
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

  {/* FORMAT HELPER */}
  {(() => {
    const format = (val) => Number(val || 0).toFixed(3);

    const persenTarget = minggu.rencana
      ? ((minggu.real / minggu.rencana) * 100)
      : 0;

    return (
      <>
        {/* 🔹 KIRI */}
        <div className="text-sm space-y-1">

          <div>
            <b>Rencana Minggu Ini:</b> {format(minggu.rencana)}
          </div>

          <div>
            <b>Realisasi Minggu Ini:</b> {format(minggu.real)}
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
                minggu.deviasi >= 0
                  ? "text-green-600 font-semibold"
                  : "text-red-600 font-semibold"
              }
            >
              {format(minggu.deviasi)}
            </span>
          </div>

          <div className="text-xs text-gray-500 mt-1">
            {minggu.deviasi > 0
              ? "Lebih cepat dari rencana 🚀"
              : minggu.deviasi < 0
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