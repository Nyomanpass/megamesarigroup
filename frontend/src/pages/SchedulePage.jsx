import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api";
import Layout from "../components/layout/Layout";
import { jwtDecode } from "jwt-decode";

export default function SchedulePage() {
  const { id } = useParams();

  const [user, setUser] = useState(null);
  const [boq, setBoq] = useState([]);
  const [weeks, setWeeks] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [loadingGenerate, setLoadingGenerate] = useState(false); // State loading khusus generate

  // 🔥 ambil user
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      setUser(jwtDecode(token));
    }
    fetchAll();
  }, [id]);

  // 🔥 ambil semua data
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

  // 🔥 FUNGSI GENERATE WEEKS (Pengganti Postman)
  const handleGenerateWeeks = async () => {
    const confirm = window.confirm("Sistem akan membuat daftar minggu otomatis berdasarkan tanggal mulai dan selesai proyek. Lanjutkan?");
    if (!confirm) return;

    setLoadingGenerate(true);
    try {
      // Menembak endpoint: http://localhost:5004/api/schedule/generate-weeks/{id}
      await api.post(`/schedule/generate-weeks/${id}`);
      alert("✅ Daftar Minggu Berhasil Dibuat!");
      fetchAll(); // Refresh agar kolom minggu langsung muncul
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

    const bobotPerMinggu = (Number(item.bobot) / durasi).toFixed(3);

    let newSchedule = [...schedule.filter(s => s.boq_id !== item.id)]; 
    
    for (let i = start; i <= end; i++) {
        newSchedule.push({
          project_id: id,
          boq_id: item.id,
          minggu_ke: i,
          bobot: bobotPerMinggu
        });
    }

    setSchedule(newSchedule);
  };

  const handleSingleCellChange = (boqId, mingguKe, value) => {
    const newSchedule = [...schedule];
    const index = newSchedule.findIndex(
      (s) => Number(s.boq_id) === Number(boqId) && Number(s.minggu_ke) === Number(mingguKe)
    );

    if (index > -1) {
      newSchedule[index].bobot = value === "" ? 0 : value;
    } else {
      newSchedule.push({
        project_id: id,
        boq_id: boqId,
        minggu_ke: mingguKe,
        bobot: value === "" ? 0 : value
      });
    }
    setSchedule(newSchedule);
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

  return (
    <Layout user={user}>
      <div className="p-6">
        
        {/* HEADER & ACTION BUTTONS */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 bg-white p-4 rounded-xl shadow-sm border-l-4 border-blue-600 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">📅 Schedule Proyek</h1>
            <p className="text-sm text-gray-500 italic">Atur bobot rencana mingguan di sini.</p>
          </div>

          <div className="flex gap-2">
            {/* 🔥 TOMBOL GENERATE WEEKS */}
            <button 
              onClick={handleGenerateWeeks}
              disabled={loadingGenerate}
              className={`${
                loadingGenerate ? "bg-gray-400" : "bg-indigo-600 hover:bg-indigo-700"
              } text-white px-4 py-2 rounded-lg font-bold shadow-md flex items-center gap-2 transition-all active:scale-95 text-sm`}
            >
              {loadingGenerate ? "⏳ Memproses..." : "⚡ Generate Kolom Minggu"}
            </button>

            {/* TOMBOL SIMPAN */}
            <button 
              onClick={handleSaveSchedule}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold shadow-md flex items-center gap-2 transition-all active:scale-95 text-sm"
            >
              💾 Simpan Jadwal
            </button>
          </div>
        </div>

        {/* TABLE SECTION */}
        <div className="overflow-x-auto bg-white rounded-xl shadow border border-gray-200">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-blue-600 text-white">
              <tr>
                <th className="p-3 border border-blue-700">Kode</th>
                <th className="p-3 border border-blue-700 text-left">Uraian Pekerjaan</th>
                <th className="p-3 border border-blue-700">Bobot (%)</th>

                {weeks.length > 0 ? weeks.map(w => (
                  <th key={w.id} className="p-2 border border-blue-700 text-center min-w-[80px] font-normal text-[10px]">
                    M{w.minggu_ke}<br/>
                    {new Date(w.start_date).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}
                    <br />-<br />
                    {new Date(w.end_date).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}
                  </th>
                )) : (
                  <th className="p-3 border border-blue-700 italic text-blue-200">Klik 'Generate Kolom Minggu'</th>
                )}
              </tr>
            </thead>

            <tbody>
              {boq.map((item) => {
                const bobotResmi = Number(Number(item.bobot || 0).toFixed(3));
                return (
                  <tr key={item.id} className="odd:bg-white even:bg-gray-50/50 hover:bg-blue-50 transition-colors">
                    <td className="p-2 border text-center font-mono text-[10px] text-gray-500">{item.kode}</td>
                    <td className="p-2 border min-w-[250px]">
                      <div className="flex justify-between items-center group">
                        <span className="text-xs font-medium">{item.uraian}</span>
                        <button
                          onClick={() => handleBagiRata(item)}
                          className="opacity-0 group-hover:opacity-100 text-[9px] bg-blue-50 border border-blue-200 text-blue-600 px-1.5 py-0.5 rounded hover:bg-blue-600 hover:text-white transition-all font-bold"
                        >
                          ⚡ AUTO
                        </button>
                      </div>
                    </td>
                    <td className="p-2 text-center font-bold border bg-gray-50 text-orange-600 font-mono text-xs">
                      {bobotResmi.toFixed(3)}%
                    </td>

                    {weeks.map((w) => {
                      const cellData = schedule.find(s => Number(s.boq_id) === Number(item.id) && Number(s.minggu_ke) === Number(w.minggu_ke));
                      const val = cellData && Number(cellData.bobot) !== 0 ? Number(cellData.bobot).toFixed(3) : "";
                      return (
                        <td key={w.id} className="border p-0 relative">
                          <input
                            type="number" step="0.001" value={val}
                            onChange={(e) => handleSingleCellChange(item.id, w.minggu_ke, e.target.value)}
                            className={`w-full text-center p-2 outline-none font-mono text-[11px] bg-transparent focus:bg-yellow-50 focus:ring-1 focus:ring-blue-400 ${val ? "font-bold text-blue-700" : ""}`}
                            placeholder="0.000"
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="sticky bottom-0 bg-white">
              <tr className="bg-gray-100 font-bold">
                <td colSpan={3} className="p-2 border text-right uppercase text-xs">Rencana Mingguan (%)</td>
                {rencanaPerMinggu.map((total, idx) => (
                  <td key={idx} className="p-2 border text-center font-mono text-blue-600 text-xs">
                    {total.toFixed(3)}
                  </td>
                ))}
              </tr>
              <tr className="bg-blue-50 font-bold">
                <td colSpan={3} className="p-2 border text-right uppercase text-xs font-black">Komulatif (%)</td>
                {rencanaKomulatif.map((total, idx) => (
                  <td key={idx} className={`p-2 border text-center font-mono text-xs ${total > 100.001 ? 'text-red-600' : 'text-green-700'}`}>
                    {total.toFixed(3)}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>

      </div>
    </Layout>
  );
}