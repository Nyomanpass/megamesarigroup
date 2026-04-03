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

  // 🔥 ambil user
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      setUser(jwtDecode(token));
    }
    fetchAll();
  }, []);

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


    const handleBagiRata = (item) => {
    // 1. Tentukan rentang minggu (misal minggu 1 sampai 10)
        const startMng = prompt(`Mulai minggu ke berapa? (1-${weeks.length})`, "1");
        const endMng = prompt(`Sampai minggu ke berapa?`, weeks.length.toString());

        if (!startMng || !endMng) return;

        const start = parseInt(startMng);
        const end = parseInt(endMng);
        const durasi = end - start + 1;

        if (durasi <= 0) return alert("Rentang minggu salah!");

        // 2. Hitung Bobot per Minggu
        const bobotPerMinggu = (Number(item.bobot) / durasi).toFixed(3);

        // 3. Update State Schedule
        let newSchedule = [...schedule.filter(s => s.boq_id !== item.id)]; // Hapus jadwal lama item ini
        
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
  // 1. Copy state schedule yang lama
  const newSchedule = [...schedule];

  // 2. Cari index data yang mau diubah
  const index = newSchedule.findIndex(
    (s) => Number(s.boq_id) === Number(boqId) && Number(s.minggu_ke) === Number(mingguKe)
  );

  if (index > -1) {
    // 3. Jika ketemu, update bobotnya
    newSchedule[index].bobot = value === "" ? 0 : value;
  } else {
    // 4. Jika tidak ketemu (data baru), push objek baru ke array
    newSchedule.push({
      project_id: id, // ID project dari useParams
      boq_id: boqId,
      minggu_ke: mingguKe,
      bobot: value === "" ? 0 : value
    });
  }

  // 5. Update state (ini akan otomatis update baris RENCANA & KOMULATIF di bawah)
  setSchedule(newSchedule);
};

    // Fungsi untuk kirim data ke Backend
const handleSaveSchedule = async () => {
  try {
    // 1. Validasi: Pastikan ada data yang mau disimpan
    if (schedule.length === 0) return alert("Jadwal masih kosong!");

    // 2. Kirim ke API yang sudah kita buat tadi
    await api.post(`/schedule/bulk-save/${id}`, { 
      items: schedule 
    });

    alert("✅ Jadwal Berhasil Disimpan Permanen!");
    fetchAll(); // Ambil ulang data dari DB agar sinkron
  } catch (err) {
    console.error(err);
    alert("Gagal simpan ke database: " + err.message);
  }
};



// 1. Ambil data rencana per minggu (Total per Kolom)
const rencanaPerMinggu = weeks.map(w => {
  const totalMingguIni = schedule
    .filter(s => Number(s.minggu_ke) === Number(w.minggu_ke))
    .reduce((sum, s) => sum + (Number(s.bobot) || 0), 0);
    
  // 🔥 PAKSA pembulatan ke 3 desimal per minggu
  return Number(totalMingguIni.toFixed(3));
});

// 2. Hitung Komulatif (Akumulasi dari minggu 1 sampai akhir)
let akumulasi = 0;
const rencanaKomulatif = rencanaPerMinggu.map(nilai => {
  akumulasi += nilai;
  
  // 🔥 PAKSA pembulatan setiap kali akumulasi bertambah
  // Ini memastikan di minggu terakhir hasilnya pas 100.000
  akumulasi = Number(akumulasi.toFixed(3));
  
  return akumulasi;
});

  return (
    <Layout user={user}>
      <div className="p-6">

        <h1 className="text-2xl font-bold mb-4">
          📅 Schedule Proyek
        </h1>

        <button 
    onClick={handleSaveSchedule}
    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-bold shadow-md flex items-center gap-2"
  >
    💾 Simpan Jadwal ke Database
  </button>

        {/* 🔥 TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full border text-sm">

            {/* HEADER */}
            <thead className="bg-blue-500 text-white">
              <tr>
                <th className="p-2">Kode</th>
                <th>Uraian Pekerjaan</th>
                <th>Bobot (%)</th>

                {weeks.map(w => (
                  <th key={w.id} className="text-center">
                    {new Date(w.start_date).toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "short"
                    })}
                    <br />
                    s/d
                    <br />
                    {new Date(w.end_date).toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "short"
                    })}
                  </th>
                ))}
              </tr>
            </thead>

            {/* BODY */}
            <tbody>
            {boq.map((item) => {
                // 🔥 KUNCI: Bulatkan bobot BOQ secara sistem sebelum digunakan untuk apa pun
                const bobotResmi = Number(Number(item.bobot || 0).toFixed(3));

                return (
                <tr key={item.id} className="odd:bg-white even:bg-gray-50/50 hover:bg-blue-50 transition-colors">
                    {/* KODE */}
                    <td className="p-2 border text-center font-mono text-xs text-gray-600">
                    {item.kode}
                    </td>

                    {/* URAIAN + TOMBOL AUTO */}
                    <td className="p-2 border min-w-[200px]">
                    <div className="flex justify-between items-start group">
                        <span className="text-sm leading-tight">{item.uraian}</span>
                        <button
                        onClick={() => handleBagiRata(item)}
                        title="Bagi rata bobot ke beberapa minggu"
                        className="ml-2 opacity-0 group-hover:opacity-100 text-[9px] bg-white border border-blue-300 text-blue-600 px-1.5 py-0.5 rounded shadow-sm hover:bg-blue-600 hover:text-white transition-all"
                        >
                        ⚡ AUTO
                        </button>
                    </div>
                    </td>

                    {/* BOBOT ASLI DARI BOQ (Sudah dibulatkan agar 0.0435 jadi 0.044) */}
                    <td className="p-2 text-center font-bold border bg-gray-100/50 text-sm text-orange-600 font-mono">
                    {bobotResmi.toLocaleString("id-ID", { 
                        minimumFractionDigits: 3, 
                        maximumFractionDigits: 3 
                    })}%
                    </td>

                    {/* CELL INPUT MINGGUAN */}
                    {weeks.map((w) => {
                    const cellData = schedule.find(
                        (s) =>
                        Number(s.boq_id) === Number(item.id) &&
                        Number(s.minggu_ke) === Number(w.minggu_ke)
                    );

                    // Gunakan toFixed(3) saat menampilkan nilai input
                    const val = cellData && Number(cellData.bobot) !== 0 
                                ? Number(cellData.bobot).toFixed(3) 
                                : "";

                    return (
                        <td key={w.id} className="border p-0 min-w-[70px] relative">
                        <input
                            type="number"
                            step="0.001"
                            value={val}
                            onChange={(e) =>
                            handleSingleCellChange(item.id, w.minggu_ke, e.target.value)
                            }
                            className={`w-full text-center p-2 outline-none font-mono text-xs bg-transparent focus:bg-yellow-50 focus:ring-1 focus:ring-blue-400
                            ${val ? "font-bold text-blue-700" : "text-transparent"}`}
                        />
                        </td>
                    );
                    })}
                </tr>
                );
            })}

    
            </tbody>
            <tfoot>
                {/* BARIS RENCANA (TOTAL MINGGUAN) */}
                <tr className="bg-gray-100 font-bold">
                    <td colSpan={3} className="p-2 border text-right uppercase">Rencana</td>
                    {rencanaPerMinggu.map((total, idx) => (
                    <td key={idx} className="p-2 border text-center font-mono text-blue-600">
                        {total.toFixed(3)}
                    </td>
                    ))}
                </tr>

                {/* BARIS RENCANA KOMULATIF (S-CURVE DATA) */}
                <tr className="bg-blue-50 font-bold">
                    <td colSpan={3} className="p-2 border text-right uppercase">Rencana Komulatif</td>
                    {rencanaKomulatif.map((total, idx) => (
                    <td key={idx} className={`p-2 border text-center font-mono ${total > 100 ? 'text-red-600' : 'text-green-700'}`}>
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