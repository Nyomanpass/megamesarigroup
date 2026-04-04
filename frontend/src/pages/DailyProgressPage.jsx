import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/layout/Layout";
import api from "../api";

export default function DailyProgressPage() {
  const { id } = useParams();

  // --- States ---
  const [boqList, setBoqList] = useState([]);
  const [data, setData] = useState([]);
  const [materialList, setMaterialList] = useState([]);
  const [pekerjaList, setPekerjaList] = useState([]);
  const [peralatanList, setPeralatanList] = useState([]);

  // --- Edit Mode State ---
  const [editId, setEditId] = useState(null); // null = Simpan Baru, ID = Update

  const [form, setForm] = useState({
    boq_id: "",
    tanggal: "",
    volume: ""
  });

  // --- Detail States (List yang akan dikirim ke Backend) ---
  const [materials, setMaterials] = useState([]);
  const [pekerja, setPekerja] = useState([]);
  const [peralatan, setPeralatan] = useState([]);

  // --- Temp Input States (Untuk handle tombol +) ---
  const [tempMaterial, setTempMaterial] = useState({ material_id: "", koef: "" });
  const [tempPekerja, setTempPekerja] = useState({ worker_id: "", koef: "" });
  const [tempPeralatan, setTempPeralatan] = useState({ tool_id: "" });

  // ================= FETCH DATA =================
  const fetchData = async () => {
    try {
      // Pastikan backend mengembalikan data beserta include materials, workers, tools
      const res = await api.get(`/daily-progress?project_id=${id}`);
      setData(res.data.filter((d) => d.project_id == id));
    } catch (err) {
      console.error("Gagal fetch progress", err);
    }
  };

  const fetchBoq = async () => {
    const res = await api.get(`/boq/project/${id}`);
    setBoqList(res.data);
  };

  const fetchMaster = async () => {
    const m = await api.get(`/materials/${id}`);
    const p = await api.get(`/pekerja/${id}`);
    const a = await api.get(`/peralatan/${id}`);
    setMaterialList(m.data);
    setPekerjaList(p.data);
    setPeralatanList(a.data);
  };

  useEffect(() => {
    fetchData();
    fetchBoq();
    fetchMaster();
  }, []);

  // ================= LOGIKA EDIT =================
  const handleEdit = async (item) => {
  try {
    window.scrollTo(0, 0);

    // 🔥 ambil detail dari backend
    const res = await api.get(`/daily-progress/${item.id}`);
    const d = res.data;

    console.log("DETAIL:", d); // debug

    setEditId(item.id);

    // HEADER
    setForm({
      boq_id: d.boq_id,
      tanggal: d.tanggal,
      volume: d.volume
    });

    // MATERIAL
    setMaterials(
      (d.materials || []).map(m => ({
        material_id: m.material_id,
        koef: m.koef
      }))
    );

    // PEKERJA
    setPekerja(
      (d.workers || []).map(w => ({
        worker_id: w.worker_id,
        koef: w.koef
      }))
    );

    // PERALATAN
    setPeralatan(
      (d.tools || []).map(t => ({
        tool_id: t.tool_id,
        jumlah: t.jumlah
      }))
    );

  } catch (error) {
    console.error(error);
    alert("Gagal load data edit");
  }
};

  const cancelEdit = () => {
    setEditId(null);
    setForm({ boq_id: "", tanggal: "", volume: "" });
    setMaterials([]);
    setPekerja([]);
    setPeralatan([]);
  };

  // ================= ADD ITEM KE LIST =================
  const addMaterial = () => {
    if (!tempMaterial.material_id) return;
    setMaterials([...materials, tempMaterial]);
    setTempMaterial({ material_id: "", koef: "" });
  };

  const addPekerja = () => {
    if (!tempPekerja.worker_id) return;
    setPekerja([...pekerja, tempPekerja]);
    setTempPekerja({ worker_id: "", koef: "" });
  };

  const addPeralatan = () => {
    if (!tempPeralatan.tool_id) return;
    setPeralatan([...peralatan, { ...tempPeralatan, jumlah: Number(form.volume || 0) }]);
    setTempPeralatan({ tool_id: "" });
  };

  const removeItem = (type, index) => {
    if (type === 'm') setMaterials(materials.filter((_, i) => i !== index));
    if (type === 'p') setPekerja(pekerja.filter((_, i) => i !== index));
    if (type === 'a') setPeralatan(peralatan.filter((_, i) => i !== index));
  };

  // ================= SUBMIT (POST / PUT) =================
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        project_id: id,
        materials,
        pekerja,
        peralatan
      };

      if (editId) {
        await api.put(`/daily-progress/${editId}`, payload);
        alert("✅ Berhasil Update!");
      } else {
        await api.post("/daily-progress", payload);
        alert("✅ Berhasil Simpan!");
      }

      cancelEdit();
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || "Terjadi kesalahan");
    }
  };

  // ================= SUMMARY LOGIC =================
const getSummary = () => {
  if (!form.boq_id) return null;

  // 1. Cari data BoQ Master
  const selectedBoq = boqList.find((b) => b.id == form.boq_id);
  if (!selectedBoq) return null;

  // 2. Hitung volume dari hari-hari LAIN (Progress masa lalu)
  // Kita filter: BOQ sama, tapi ID progress tidak sama dengan yang sedang diedit
  const volumeLalu = data
    .filter((d) => d.boq_id == form.boq_id && d.id !== editId)
    .reduce((sum, item) => sum + parseFloat(item.volume || 0), 0);

  // 3. Ambil volume yang sedang diketik di input saat ini
  const volumeInputSekarang = parseFloat(form.volume || 0);

  // 4. Hitung Total Akumulasi (Lalu + Sekarang)
  const totalAkumulasi = volumeLalu + volumeInputSekarang;

  const target = parseFloat(selectedBoq.volume || 0);
  const sisa = target - totalAkumulasi;
  const persen = target > 0 ? (totalAkumulasi / target) * 100 : 0;

  return {
    uraian: selectedBoq.uraian,
    satuan: selectedBoq.satuan,
    target: target,
    lalu: volumeLalu,
    totalSekarang: totalAkumulasi,
    sisa: sisa,
    persen: persen
  };
};

const summary = getSummary();

  return (
    <Layout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold">Daily Progress #{id}</h1>
          {editId && <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-bold">Mode Edit: ID {editId}</span>}
        </div>

        {/* ================= FORM ================= */}
        <form onSubmit={handleSubmit} className="grid gap-4 bg-white p-6 rounded shadow-lg border-t-4 border-blue-500">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col">
              <label className="text-xs font-bold text-gray-500 mb-1">Pekerjaan (BOQ)</label>
              <select
                value={form.boq_id}
                onChange={(e) => setForm({ ...form, boq_id: e.target.value })}
                className="border p-2 rounded" required
              >
                <option value="">-- Pilih BOQ --</option>
                {boqList.filter(b => b.tipe === 'item').map(b => (
                  <option key={b.id} value={b.id}>{b.uraian}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col">
              <label className="text-xs font-bold text-gray-500 mb-1">Tanggal</label>
              <input
                type="date"
                value={form.tanggal}
                onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
                className="border p-2 rounded" required
              />
            </div>

            <div className="flex flex-col">
              <label className="text-xs font-bold text-gray-500 mb-1">Volume Progress</label>
              <input
                type="number" step="any"
                placeholder="0.00"
                value={form.volume}
                onChange={(e) => setForm({ ...form, volume: e.target.value })}
                className="border p-2 rounded" required
              />
            </div>
          </div>



        {summary && (
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 my-2">
            <h2 className="text-blue-800 font-bold text-sm mb-2 uppercase tracking-wide">
              Ringkasan Progres: {summary.uraian}
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-500">Total Target</p>
                <p className="font-bold text-lg">
                  {summary.target} <span className="text-sm font-normal">{summary.satuan}</span>
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">Total S/d Hari Ini</p>
                <p className="font-bold text-lg text-blue-600">
                  {/* Ini adalah gabungan volume lama + volume yang sedang diinput/edit */}
                  {summary.totalSekarang.toFixed(3)}
                </p>
                <p className="text-[10px] text-gray-400 italic">S/d Lalu: {summary.lalu.toFixed(3)}</p>
              </div>

              <div>
                <p className="text-xs text-gray-500">Sisa Volume</p>
                <p className={`font-bold text-lg ${summary.sisa <= 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {summary.sisa.toFixed(3)}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">Progres Fisik</p>
                <p className="font-bold text-lg italic">{summary.persen.toFixed(2)} %</p>
              </div>
            </div>

            {/* Progress Bar Visual */}
            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-3 overflow-hidden">
              <div
                className={`h-1.5 rounded-full transition-all duration-500 ${summary.persen > 100 ? 'bg-red-500' : 'bg-blue-600'}`}
                style={{ width: `${Math.min(summary.persen, 100)}%` }}
              ></div>
            </div>
          </div>
        )}

          {/* ================= DETAIL SECTION ================= */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">

            {/* ================= MATERIAL ================= */}
            <div className="border p-3 rounded bg-gray-50">
              <h3 className="font-bold mb-2 text-sm border-b pb-1">Material</h3>

              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="text-left">Material</th>
                    <th>Koef</th>
                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  {materials.map((m, i) => (
                    <tr key={i}>
                      <td>
                        <select
                          value={m.material_id}
                          onChange={(e) => {
                            const newData = [...materials];
                            newData[i].material_id = e.target.value;
                            setMaterials(newData);
                          }}
                          className="border p-1 w-full"
                        >
                          <option value="">Pilih</option>
                          {materialList.map(mat => (
                            <option key={mat.id} value={mat.id}>{mat.nama}</option>
                          ))}
                        </select>
                      </td>

                      <td>
                        <input
                          value={m.koef}
                          onChange={(e) => {
                            const newData = [...materials];
                            newData[i].koef = e.target.value;
                            setMaterials(newData);
                          }}
                          className="border p-1 w-full text-center"
                        />
                      </td>

                      <td>
                        <button onClick={() => removeItem('m', i)} className="text-red-500">❌</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <button
                type="button"
                onClick={() => setMaterials([...materials, { material_id: "", koef: "" }])}
                className="mt-2 bg-green-600 text-white px-2 py-1 rounded text-xs"
              >
                + Tambah Baris
              </button>
            </div>

            {/* ================= PEKERJA ================= */}
            <div className="border p-3 rounded bg-gray-50">
              <h3 className="font-bold mb-2 text-sm border-b pb-1">Pekerja</h3>

              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th>Pekerja</th>
                    <th>Koef</th>
                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  {pekerja.map((p, i) => (
                    <tr key={i}>
                      <td>
                        <select
                          value={p.worker_id}
                          onChange={(e) => {
                            const newData = [...pekerja];
                            newData[i].worker_id = e.target.value;
                            setPekerja(newData);
                          }}
                          className="border p-1 w-full"
                        >
                          <option value="">Pilih</option>
                          {pekerjaList.map(w => (
                            <option key={w.id} value={w.id}>{w.nama}</option>
                          ))}
                        </select>
                      </td>

                      <td>
                        <input
                          value={p.koef}
                          onChange={(e) => {
                            const newData = [...pekerja];
                            newData[i].koef = e.target.value;
                            setPekerja(newData);
                          }}
                          className="border p-1 w-full text-center"
                        />
                      </td>

                      <td>
                        <button onClick={() => removeItem('p', i)} className="text-red-500">❌</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <button
                type="button"
                onClick={() => setPekerja([...pekerja, { worker_id: "", koef: "" }])}
                className="mt-2 bg-green-600 text-white px-2 py-1 rounded text-xs"
              >
                + Tambah Baris
              </button>
            </div>

            {/* ================= PERALATAN ================= */}
            <div className="border p-3 rounded bg-gray-50">
              <h3 className="font-bold mb-2 text-sm border-b pb-1">Peralatan</h3>

              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th>Peralatan</th>
                    <th>Jumlah</th>
                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  {peralatan.map((a, i) => (
                    <tr key={i}>
                      <td>
                        <select
                          value={a.tool_id}
                          onChange={(e) => {
                            const newData = [...peralatan];
                            newData[i].tool_id = e.target.value;
                            setPeralatan(newData);
                          }}
                          className="border p-1 w-full"
                        >
                          <option value="">Pilih</option>
                          {peralatanList.map(t => (
                            <option key={t.id} value={t.id}>{t.nama}</option>
                          ))}
                        </select>
                      </td>

                      <td>
                        <input
                          value={a.jumlah}
                          onChange={(e) => {
                            const newData = [...peralatan];
                            newData[i].jumlah = e.target.value;
                            setPeralatan(newData);
                          }}
                          className="border p-1 w-full text-center"
                        />
                      </td>

                      <td>
                        <button onClick={() => removeItem('a', i)} className="text-red-500">❌</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <button
                type="button"
                onClick={() => setPeralatan([...peralatan, { tool_id: "", jumlah: form.volume || 0 }])}
                className="mt-2 bg-green-600 text-white px-2 py-1 rounded text-xs"
              >
                + Tambah Baris
              </button>
            </div>

          </div>

          {/* ACTION BUTTONS */}
          <div className="flex gap-2 mt-4">
            <button className={`flex-1 p-3 rounded font-bold text-white transition ${editId ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-600 hover:bg-blue-700'}`}>
              {editId ? "UPDATE PROGRESS" : "SIMPAN PROGRESS"}
            </button>
            {editId && (
              <button type="button" onClick={cancelEdit} className="bg-gray-500 text-white p-3 rounded font-bold">
                BATAL
              </button>
            )}
          </div>
        </form>

        {/* ================= TABLE LIST ================= */}
        <div className="mt-8 bg-white rounded shadow overflow-hidden">
          <div className="bg-gray-800 p-3">
            <h2 className="text-white font-bold">📋 Riwayat Daily Progress</h2>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 text-sm uppercase">
                <th className="p-3 border">Tanggal</th>
                <th className="p-3 border">Item Pekerjaan</th>
                <th className="p-3 border text-right">Volume</th>
                <th className="p-3 border text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, i) => (
                <tr key={i} className="border-t hover:bg-blue-50 transition">
                  <td className="p-3 text-sm">{item.tanggal}</td>
                  <td className="p-3 text-sm font-medium">{item.boq?.uraian}</td>
                  <td className="p-3 text-sm text-right font-mono">{Number(item.volume).toFixed(3)}</td>
                  <td className="p-3 text-center">
                    <button 
                      onClick={() => handleEdit(item)}
                      className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 text-[10px] font-black px-4 py-1 rounded"
                    >
                      EDIT
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}