import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api";
export default function BoqPage() {
  const { id } = useParams();
  

  // Tambahkan state untuk menampung banyak item
const [bulkItems, setBulkItems] = useState([
  { uraian: "", satuan: "", volume: "", harga_satuan: "", ppn: 11 }
]);

// Fungsi tambah baris baru di modal
const addBulkRow = () => {
  setBulkItems([...bulkItems, { uraian: "", satuan: "", volume: "", harga_satuan: "", ppn: 11 }]);
};

// Fungsi update value per baris
const handleBulkChange = (index, field, value) => {
  const newItems = [...bulkItems];
  newItems[index][field] = value;
  setBulkItems(newItems);
};

// Fungsi simpan sekaligus
const handleBulkSubmit = async () => {
  try {
    if (!form.parent_id) return alert("Wajib pilih Parent terlebih dahulu!");
    
    // Filter item yang uraiannya kosong agar tidak ikut tersimpan
    const itemsToSubmit = bulkItems.filter(item => item.uraian.trim() !== "");
    
    if (itemsToSubmit.length === 0) return alert("Isi minimal satu uraian pekerjaan!");

    await api.post("/boq/bulk", {
      project_id: id,
      parent_id: form.parent_id,
      items: itemsToSubmit.map(item => ({
        ...item,
        volume: Number(item.volume) || 0,
        harga_satuan: Number(item.harga_satuan) || 0,
        ppn: Number(item.ppn) || 0
      }))
    });

    setShowModal(false);
    // Reset ke satu baris kosong lagi
    setBulkItems([{ uraian: "", satuan: "", volume: "", harga_satuan: "", ppn: 11 }]); 
    fetchBoq();
  } catch (err) {
    console.error(err);
    alert("Gagal simpan: " + (err.response?.data?.message || err.message));
  }
};

  const [boq, setBoq] = useState([]);
  const [project, setProject] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    parent_id: "",
    kode: "",
    uraian: "",
    satuan: "",
    volume: "",
    harga_satuan: "",
    ppn: 11, // 🔥 sekarang bisa diubah user
    tipe: "item"
});

const handleGenerateBobot = async () => {
  if (totalJumlah === 0) {
    return alert("Total seluruh pekerjaan masih 0. Isi harga item dulu!");
  }

  const confirmAction = window.confirm(
    `Hitung ulang bobot untuk ${itemOnly.length} item?`
  );

  if (!confirmAction) return;

  try {
    const updatePromises = itemOnly.map((item) => {
      // 1. Hitung bobot (Harga Item / Total) * 100
      const hasilBobotRaw = (Number(item.jumlah) / totalJumlah) * 100;
      
      // 2. 🔥 PAKSA pembulatan ke 3 desimal di sini!
      // Ini akan mengubah 0.0435 menjadi 0.044 secara permanen di database
      const bobotFix = Number(hasilBobotRaw.toFixed(3));

      return api.patch(`/boq/${item.id}`, {
        bobot: bobotFix
      });
    });

    await Promise.all(updatePromises);
    alert("✅ Bobot berhasil diperbarui (Pembulatan 3 Desimal)!");
    fetchBoq(); 
  } catch (err) {
    console.error(err);
    alert("Gagal update bobot: " + (err.response?.data?.message || err.message));
  }
};


const handleSubmit = async () => {
  try {
    if (!form.uraian) return alert("Uraian wajib diisi");

    // Persiapkan data sebelum dikirim
    const payload = {
      ...form,
      project_id: id,
      // 🔥 JIKA parent_id kosong (""), ubah jadi null agar DB tidak error
      parent_id: form.parent_id === "" ? null : form.parent_id,
      // Pastikan angka terkirim sebagai Number atau null
      volume: form.tipe === "item" ? Number(form.volume) : null,
      harga_satuan: form.tipe === "item" ? Number(form.harga_satuan) : null,
      ppn: form.tipe === "item" ? Number(form.ppn) : null,
    };

    await api.post("/boq", payload);

    setShowModal(false);
    // Reset form ke awal
    setForm({ 
      parent_id: "", 
      kode: "", 
      uraian: "", 
      satuan: "", 
      volume: "", 
      harga_satuan: "", 
      ppn: 11, 
      tipe: "item" 
    });
    fetchBoq();
  } catch (err) {
    console.error(err);
    alert(err.response?.data?.message || "Gagal menyimpan data");
  }
};


  useEffect(() => {
    fetchProject();
    fetchBoq();
  }, [id]);

  const fetchProject = async () => {
    const res = await api.get(`/projects/${id}`);
    setProject(res.data);
  };

  const fetchBoq = async () => {
    const res = await api.get(`/boq/project/${id}`);
    setBoq(res.data);
  };

  // 1. Hitung Subtotal (Volume * Harga) dan langsung bulatkan ke 2 desimal
  const rawJumlah = form.volume && form.harga_satuan
    ? form.volume * form.harga_satuan
    : 0;
  const jumlah = Number(rawJumlah.toFixed(2));

  // 2. Hitung PPN dari hasil yang SUDAH dibulatkan tadi
  const rawPajak = (jumlah * (form.ppn || 0)) / 100;
  const pajak = Number(rawPajak.toFixed(2));

  const jumlah_ppn = jumlah + pajak;

  const itemOnly = boq.filter(item => item.tipe === "item");

  const totalHargaSatuan = itemOnly.reduce((acc, curr) => acc + Number(curr.harga_satuan || 0), 0);

  const totalJumlah = itemOnly.reduce((acc, curr) => acc + Number(curr.jumlah || 0), 0);

  const totalGrandTotal = itemOnly.reduce((acc, curr) => acc + Number(curr.jumlah_ppn || 0), 0);

  const totalBobot = boq
    .filter(item => item.tipe === "item")
    .reduce((sum, item) => sum + Number(item.bobot || 0), 0);

  return (
    <>
      <div className="p-6">

        {/* 🔥 HEADER */}
        <h1 className="text-2xl font-bold mb-2">
          📊 BOQ - {project?.pekerjaan}
        </h1>

        <button
            onClick={() => setShowModal(true)}
            className="bg-green-500 text-white px-4 py-2 rounded mb-4"
            >
            Tambah BOQ
        </button>

        <button
            onClick={handleGenerateBobot}
            className="bg-orange-500 text-white px-4 py-2 rounded shadow hover:bg-orange-600 font-bold flex items-center gap-2"
        >
            Generate Bobot
        </button>

        <p className="text-gray-500 mb-6">
          {project?.lokasi}
        </p>

        {/* 🔥 TABLE BOQ */}
        <table className="w-full border text-sm">
          <thead className="bg-blue-500 text-white">
            <tr>
              {/* <th className="p-2">Kode</th> */}
              <th>Uraian Pekerjaan</th>
              <th>Satuan</th>
              <th>Volume</th>
              <th>Harga</th>
              <th>Jumlah</th>
              <th>PPN (%)</th> 
              <th>Jumlah + PPN</th>
              <th>Bobot (%)</th>
            </tr>
          </thead>


            <tbody>
                {boq.map((item) => (
                    <tr 
                    key={item.id} 
                    className={`border-b transition-colors ${
                        item.tipe === "header" 
                        ? "bg-gray-100/80" // Header Utama: Abu-abu lebih tegas
                        : item.tipe === "subheader"
                        ? "bg-gray-50/50"   // Subheader: Abu-abu sangat tipis
                        : "hover:bg-blue-50/30" // Item: Putih, hover biru tipis
                    }`}
                    >
                    {/* 1. URAIAN PEKERJAAN */}
                    <td
                        className={`p-3 text-sm ${
                        item.tipe === "header"
                            ? "font-bold text-gray-900 uppercase tracking-wide" 
                            : item.tipe === "subheader"
                            ? "font-semibold text-gray-800 pl-6" 
                            : "text-gray-600 pl-12 italic" // Item lebih masuk ke dalam
                        }`}
                    >
                        {item.uraian}
                    </td>

                    {/* 2. SATUAN */}
                    <td className="p-3 text-center text-gray-500">{item.satuan || "-"}</td>

                    {/* 3. VOLUME - Rata Kanan agar angka sejajar */}
                    <td className="p-3 text-right font-mono">
                        {item.volume ? Number(item.volume).toLocaleString("id-ID") : "-"}
                    </td>

                    {/* 4. HARGA SATUAN */}
                    <td className="p-3 text-right font-mono">
                        {item.harga_satuan ? Number(item.harga_satuan).toLocaleString("id-ID") : "-"}
                    </td>

                    {/* 5. JUMLAH (SUBTOTAL) */}
                    <td className={`p-3 text-right font-mono ${item.tipe !== 'item' ? 'font-bold' : ''}`}>
                        {item.jumlah ? Number(item.jumlah).toLocaleString("id-ID") : "-"}
                    </td>

                    {/* 6. PPN */}
                    <td className="p-3 text-center">
                        {item.tipe === "item" ? (
                        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                            {item.ppn || 0}%
                        </span>
                        ) : "-"}
                    </td>

                    {/* 7. TOTAL + PPN - Dibuat menonjol */}
                    <td className={`p-3 text-right font-bold ${item.tipe === 'item' ? 'text-blue-600' : 'text-gray-900'}`}>
                        {item.jumlah_ppn ? Number(item.jumlah_ppn).toLocaleString("id-ID") : "-"}
                    </td>
                    <td className="p-3 text-right font-mono text-orange-600 font-bold border">
                    {item.tipe === "item" && item.bobot 
                        ? `${Number(item.bobot).toLocaleString("id-ID", { minimumFractionDigits: 3 })}%` 
                        : "-"}
                    </td>
                    </tr>
                ))}
                <tr className="bg-blue-600 text-white font-bold">
                    <td colSpan={3} className="p-3 text-center uppercase">Total Seluruh Pekerjaan</td>
                    <td className="p-3 text-right font-mono">
                    {totalHargaSatuan.toLocaleString("id-ID")}
                    </td>
                    <td className="p-3 text-right font-mono">
                    {totalJumlah.toLocaleString("id-ID")}
                    </td>
                    <td className="p-3 text-center">-</td>
                    <td className="p-3 text-right font-mono">
                    {totalGrandTotal.toLocaleString("id-ID")}
                    </td>
                   
                    <td className="p-3 text-right">
                        {totalBobot.toFixed(2)}%
                    </td>
                </tr>
            </tbody>

        </table>

       {showModal && (
  <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
    <div className="bg-white p-6 rounded-lg w-[420px] shadow-lg">
      <h2 className="text-lg font-bold mb-4">Tambah BOQ</h2>

      {/* 1. PILIH TIPE DULU (Pindahkan ke atas agar input di bawahnya menyesuaikan) */}
      <label className="text-xs font-semibold text-gray-500">Tipe Baris:</label>
      <select
        className="w-full border p-2 mb-3 bg-blue-50"
        value={form.tipe}
        onChange={(e) => setForm({ ...form, tipe: e.target.value, parent_id: "", volume: "", harga_satuan: "" })}
      >
        <option value="item">Item Pekerjaan (A.1.1)</option>
        <option value="subheader">Sub-Header (A.1)</option>
        <option value="header">Header Utama (A, B, C)</option>
      </select>

      {/* 2. DROPDOWN PARENT (Hanya muncul jika BUKAN Header Utama) */}
      {form.tipe !== "header" && (
        <>
          <label className="text-xs font-semibold text-gray-500">Pilih Parent:</label>
          <select
            className="w-full border p-2 mb-3"
            value={form.parent_id}
            onChange={(e) => setForm({ ...form, parent_id: e.target.value })}
          >
            <option value="">-- Pilih Parent --</option>
            {boq
              .filter((item) => item.tipe === "header" || item.tipe === "subheader")
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.kode} - {item.uraian}
                </option>
              ))}
          </select>
        </>
      )}

      {/* 3. KODE (Hanya untuk Header/Sub-Header karena Item generate otomatis di backend) */}
      {(form.tipe === "header" || form.tipe === "subheader") && (
        <>
        <input
          className="w-full border p-2 mb-2 font-bold"
          placeholder="Kode (Contoh: A atau A.1)"
          value={form.kode}
          onChange={(e) => setForm({ ...form, kode: e.target.value })}
        />
         <input
        className="w-full border p-2 mb-2"
        placeholder="Nama Pekerjaan / Judul Header"
        value={form.uraian}
        onChange={(e) => setForm({ ...form, uraian: e.target.value })}
      />
      </>
      )}

      {/* 4. URAIAN (Wajib ada untuk semua) */}
     

{/* 5. INPUT TEKNIS (Bulk Entry untuk Item) */}
{form.tipe === "item" && (
  <div className="mt-2">
    <label className="text-xs font-bold text-blue-600 mb-1 block">Entry Item (Multi-Row):</label>
    <div className="max-h-[350px] overflow-y-auto border rounded p-2 bg-gray-50 mb-2">
      {bulkItems.map((item, index) => (
        <div key={index} className="bg-white p-2 rounded border mb-3 relative shadow-sm">
          {/* Tombol Hapus Baris */}
          <button 
            type="button"
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shadow-md"
            onClick={() => setBulkItems(bulkItems.filter((_, i) => i !== index))}
          >
            ×
          </button>

          {/* Baris 1: Uraian */}
          <input 
            className="w-full border p-2 text-xs rounded mb-2" 
            placeholder="Uraian Pekerjaan" 
            value={item.uraian}
            onChange={(e) => handleBulkChange(index, "uraian", e.target.value)}
          />

          {/* Baris 2: Grid Teknis (Sesuai keinginanmu) */}
          <div className="grid grid-cols-4 gap-1">
            <input 
              className="border p-2 text-xs rounded" 
              placeholder="Satuan" 
              value={item.satuan}
              onChange={(e) => handleBulkChange(index, "satuan", e.target.value)}
            />
            <input 
              type="number" 
              className="border p-2 text-xs rounded" 
              placeholder="PPN %" 
              value={item.ppn}
              onChange={(e) => handleBulkChange(index, "ppn", e.target.value)}
            />
            <input 
              type="number" 
              className="border p-2 text-xs rounded" 
              placeholder="Vol" 
              value={item.volume}
              onChange={(e) => handleBulkChange(index, "volume", e.target.value)}
            />
            <input 
              type="number" 
              className="border p-2 text-xs rounded" 
              placeholder="Harga" 
              value={item.harga_satuan}
              onChange={(e) => handleBulkChange(index, "harga_satuan", e.target.value)}
            />
          </div>
        </div>
      ))}

      <button 
        type="button"
        onClick={addBulkRow}
        className="w-full py-2 border-2 border-dashed border-blue-400 text-blue-600 text-xs font-bold rounded hover:bg-blue-50 bg-white"
      >
        + TAMBAH BARIS PEKERJAAN
      </button>
    </div>
  </div>
)}

      {/* 6. PREVIEW HITUNGAN (Hanya untuk ITEM) */}
      {form.tipe === "item" && (form.volume > 0 || form.harga_satuan > 0) && (
        <div className="bg-blue-50 p-3 rounded mb-4 text-sm border border-blue-100">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <b>Rp {jumlah.toLocaleString("id-ID")}</b>
          </div>
          <div className="flex justify-between text-blue-700">
            <span>Total + PPN:</span>
            <b>Rp {jumlah_ppn.toLocaleString("id-ID")}</b>
          </div>
        </div>
      )}

      {/* 7. TOMBOL AKSI */}
      <div className="flex justify-end gap-2 mt-4">
        <button
          onClick={() => setShowModal(false)}
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          Batal
        </button>
       <button
  onClick={form.tipe === "item" ? handleBulkSubmit : handleSubmit}
  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
>
  {form.tipe === "item" ? `Simpan ${bulkItems.length} Item` : "Simpan Data"}
</button>
      </div>
    </div>
  </div>
)}
      </div>
    </>
  );
}