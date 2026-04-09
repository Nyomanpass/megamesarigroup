import { useEffect, useState } from "react";
import api from "../../api";

const AnalisaMasterPage = () => {
  const [data, setData] = useState([]);
  const [items, setItems] = useState([]);

  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editDetailId, setEditDetailId] = useState(null);
  const [isEditDetail, setIsEditDetail] = useState(false);

  const [selectedAnalisa, setSelectedAnalisa] = useState(null);
  const [detail, setDetail] = useState(null);

  const [formMaster, setFormMaster] = useState({
    kode: "",
    nama: "",
    satuan: "",
    overhead_persen: 0
});

  const [formDetail, setFormDetail] = useState({
    item_id: "",
    koefisien: ""
  });

  const handleChangeMaster = (e) => {
  setFormMaster({
    ...formMaster,
    [e.target.name]: e.target.value
  });
};

const handleSubmitMaster = async (e) => {
  e.preventDefault();

  try {
    if (isEdit) {
      // 🔥 UPDATE
      await api.put(`/master/analisa/${editId}`, formMaster);
      alert("Data berhasil diupdate");
    } else {
      // 🔥 CREATE
      await api.post("/master/analisa", formMaster);
      alert("Data berhasil ditambah");
    }

    // reset
    setFormMaster({
      kode: "",
      nama: "",
      satuan: "",
      overhead_persen: 10
    });

    setIsEdit(false);
    setEditId(null);

    fetchData();

  } catch (err) {
    console.error(err);
  }
};

const handleDelete = async (id) => {
  const confirmDelete = window.confirm("Yakin mau hapus?");

  if (!confirmDelete) return;

  try {
    await api.delete(`/master/analisa/${id}`);
    alert("Data berhasil dihapus");

    fetchData();
  } catch (err) {
    console.error(err);
  }
};

const handleEditDetail = (d) => {
  setFormDetail({
    item_id: d.item_id, // 🔥 ambil dari backend
    koefisien: d.koefisien
  });

  setEditDetailId(d.id);
  setIsEditDetail(true);
};

const handleEdit = (data) => {
  setFormMaster({
    kode: data.kode,
    nama: data.nama,
    satuan: data.satuan,
    overhead_persen: data.overhead_persen
  });

  setEditId(data.id);
  setIsEdit(true);
};

  // 🔹 GET ANALISA
  const fetchData = async () => {
    const res = await api.get("/master/analisa");
    setData(res.data);
  };

  // 🔹 GET ITEM
  const fetchItems = async () => {
    const res = await api.get("/masteritem");
    setItems(res.data);
  };

  // 🔹 GET DETAIL
  const fetchDetail = async (id) => {
    const res = await api.get(`/master/analisa-detail/${id}`);
    setDetail(res.data);
  };

  useEffect(() => {
    fetchData();
    fetchItems();
  }, []);

  // 🔹 BUKA MODAL
  const openDetail = async (analisa) => {
    setSelectedAnalisa(analisa);
    await fetchDetail(analisa.id);
  };

  // 🔹 TAMBAH DETAIL
const handleSubmitDetail = async (e) => {
  e.preventDefault();

  if (!selectedAnalisa) {
    alert("Pilih analisa dulu!");
    return;
  }

  try {
    if (isEditDetail) {
      // 🔥 UPDATE
      await api.put(`/master/analisa-detail/${editDetailId}`, {
        koefisien: formDetail.koefisien,
        item_id: formDetail.item_id
      });

      alert("Detail berhasil diupdate");
    } else {
      // 🔥 CREATE
      await api.post("/master/analisa-detail", {
        analisa_id: selectedAnalisa.id,
        item_id: formDetail.item_id,
        koefisien: formDetail.koefisien
      });

      alert("Detail berhasil ditambah");
    }

    // reset
    setFormDetail({ item_id: "", koefisien: "" });
    setIsEditDetail(false);
    setEditDetailId(null);

    fetchDetail(selectedAnalisa.id);

  } catch (err) {
    console.error(err);
  }
};

const handleDeleteDetail = async (id) => {
  const confirmDelete = window.confirm("Yakin hapus item ini?");

  if (!confirmDelete) return;

  try {
    await api.delete(`/master/analisa-detail/${id}`);

    alert("Berhasil dihapus");

    fetchDetail(selectedAnalisa.id);
  } catch (err) {
    console.error(err);
  }
};

  return (
    <div className="p-6">
        <div className="bg-white p-4 rounded mb-6">
  <h2 className="font-bold mb-3">Tambah Analisa</h2>

  <form onSubmit={handleSubmitMaster} className="grid grid-cols-2 gap-3">

    <input
      name="kode"
      placeholder="Kode (A.1)"
      value={formMaster.kode}
      onChange={handleChangeMaster}
      className="border p-2"
    />

    <input
      name="nama"
      placeholder="Nama Pekerjaan"
      value={formMaster.nama}
      onChange={handleChangeMaster}
      className="border p-2"
    />

    <input
      name="satuan"
      placeholder="Satuan (m3, m2)"
      value={formMaster.satuan}
      onChange={handleChangeMaster}
      className="border p-2"
    />

    <input
      name="overhead_persen"
      type="number"
      value={formMaster.overhead_persen}
      onChange={handleChangeMaster}
      className="border p-2"
    />

   <button className="col-span-2 bg-blue-600 text-white p-2">
  {isEdit ? "Update Analisa" : "Simpan Analisa"}
</button>

  </form>
</div>

      <h1 className="text-xl font-bold mb-4">Analisa Master</h1>

      <table className="w-full border">
        <thead>
          <tr>
            <th>Kode</th>
            <th>Nama</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {data.map((a) => (
            <tr key={a.id}>
              <td>{a.kode}</td>
              <td>{a.nama}</td>
              <td>
                <button
                  onClick={() => openDetail(a)}
                  className="bg-blue-500 text-white px-2 mr-2"
                >
                  Detail
                </button>

                <button
                  onClick={() => handleEdit(a)}
                  className="bg-yellow-500 text-white px-2 mr-2"
                >
                  Edit
                </button>

                <button
                  onClick={() => handleDelete(a.id)}
                  className="bg-red-500 text-white px-2"
                >
                  Hapus
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 🔥 MODAL */}
{selectedAnalisa && (
  <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">

    <div className="bg-white w-full max-w-4xl rounded-xl shadow-lg overflow-hidden">

      {/* HEADER */}
      <div className="flex justify-between items-center px-6 py-4 border-b">
        <h2 className="font-bold text-lg">
          Detail Analisa: {selectedAnalisa?.nama}
        </h2>

        <button
          onClick={() => setSelectedAnalisa(null)}
          className="text-gray-500 hover:text-red-500 text-xl"
        >
          ✕
        </button>
      </div>

      <div className="p-6">

        {/* FORM TAMBAH */}
        <form onSubmit={handleSubmitDetail} className="flex gap-2 mb-6">

          <select
            value={formDetail.item_id}
            onChange={(e) =>
              setFormDetail({ ...formDetail, item_id: e.target.value })
            }
            className="border p-2 rounded w-1/2"
          >
            <option value="">Pilih Item</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.nama} ({i.tipe})
              </option>
            ))}
          </select>

          <input
            type="number"
            placeholder="Koefisien"
            value={formDetail.koefisien}
            onChange={(e) =>
              setFormDetail({ ...formDetail, koefisien: e.target.value })
            }
            className="border p-2 rounded w-1/4"
          />

         <button className="bg-green-600 text-white px-4 rounded">
            {isEditDetail ? "Update" : "+ Tambah"}
          </button>
        </form>

        {/* TABLE */}
        {detail && (
          <div className="overflow-x-auto">

            <table className="w-full text-sm border">

              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 border">Uraian</th>
                  <th className="p-2 border">Koef</th>
                  <th className="p-2 border">Harga</th>
                  <th className="p-2 border">Jumlah</th>
                  <th className="p-2 border">aksi</th>
                </tr>
              </thead>

              <tbody>

                {/* ================= TENAGA ================= */}
                <tr className="bg-gray-200 font-bold">
                  <td colSpan="4" className="p-2">A. TENAGA</td>
                </tr>

                {detail.tenaga?.length > 0 ? (
                  detail.tenaga.map((d) => (
                  <tr key={d.id}>
                  <td className="p-2 border">{d.nama}</td>
                  <td className="p-2 border text-center">{d.koefisien}</td>
                  <td className="p-2 border text-right">
                    {d.harga.toLocaleString("id-ID")}
                  </td>
                  <td className="p-2 border text-right">
                    {d.jumlah.toLocaleString("id-ID")}
                  </td>

                  {/* 🔥 AKSI */}
                  <td className="p-2 border text-center">
                    <button
                      onClick={() => handleEditDetail(d)}
                      className="bg-yellow-500 text-white px-2 mr-1"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => handleDeleteDetail(d.id)}
                      className="bg-red-500 text-white px-2"
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="text-center text-gray-400 p-2">
                      Tidak ada data tenaga
                    </td>
                  </tr>
                )}

                <tr className="font-bold bg-gray-50">
                  <td colSpan="3" className="p-2 text-right">Jumlah Tenaga</td>
                  <td className="p-2 text-right">
                    {detail.totalTenaga?.toLocaleString("id-ID") || 0}
                  </td>
                </tr>

                {/* ================= BAHAN ================= */}
                <tr className="bg-gray-200 font-bold">
                  <td colSpan="4" className="p-2">B. BAHAN</td>
                </tr>

                {detail.bahan?.length > 0 ? (
                  detail.bahan.map((d) => (
                                     <tr key={d.id}>
                  <td className="p-2 border">{d.nama}</td>
                  <td className="p-2 border text-center">{d.koefisien}</td>
                  <td className="p-2 border text-right">
                    {d.harga.toLocaleString("id-ID")}
                  </td>
                  <td className="p-2 border text-right">
                    {d.jumlah.toLocaleString("id-ID")}
                  </td>

                  {/* 🔥 AKSI */}
                  <td className="p-2 border text-center">
                    <button
                      onClick={() => handleEditDetail(d)}
                      className="bg-yellow-500 text-white px-2 mr-1"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => handleDeleteDetail(d.id)}
                      className="bg-red-500 text-white px-2"
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="text-center text-gray-400 p-2">
                      Tidak ada data bahan
                    </td>
                  </tr>
                )}

                <tr className="font-bold bg-gray-50">
                  <td colSpan="3" className="p-2 text-right">Jumlah Bahan</td>
                  <td className="p-2 text-right">
                    {detail.totalBahan?.toLocaleString("id-ID") || 0}
                  </td>
                </tr>

                {/* ================= ALAT ================= */}
                <tr className="bg-gray-200 font-bold">
                  <td colSpan="4" className="p-2">C. ALAT</td>
                </tr>

                {detail.alat?.length > 0 ? (
                  detail.alat.map((d) => (
                                    <tr key={d.id}>
                  <td className="p-2 border">{d.nama}</td>
                  <td className="p-2 border text-center">{d.koefisien}</td>
                  <td className="p-2 border text-right">
                    {d.harga.toLocaleString("id-ID")}
                  </td>
                  <td className="p-2 border text-right">
                    {d.jumlah.toLocaleString("id-ID")}
                  </td>

                  {/* 🔥 AKSI */}
                  <td className="p-2 border text-center">
                    <button
                      onClick={() => handleEditDetail(d)}
                      className="bg-yellow-500 text-white px-2 mr-1"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => handleDeleteDetail(d.id)}
                      className="bg-red-500 text-white px-2"
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="text-center text-gray-400 p-2">
                      Tidak ada data alat
                    </td>
                  </tr>
                )}

                <tr className="font-bold bg-gray-50">
                  <td colSpan="3" className="p-2 text-right">Jumlah Alat</td>
                  <td className="p-2 text-right">
                    {detail.totalAlat?.toLocaleString("id-ID") || 0}
                  </td>
                </tr>

                {/* ================= TOTAL ================= */}
                <tr className="bg-yellow-100 font-bold">
                  <td colSpan="3" className="p-2 text-right">
                    D. TOTAL (A+B+C)
                  </td>
                  <td className="p-2 text-right">
                    {detail.total?.toLocaleString("id-ID") || 0}
                  </td>
                </tr>

                {/* OVERHEAD */}
                <tr className="bg-yellow-50 font-bold">
                <td colSpan="3" className="p-2 text-right">
                    E. Overhead ({selectedAnalisa?.overhead_persen || 0}%)
                </td>
                <td className="p-2 text-right">
                    {detail.overhead?.toLocaleString("id-ID") || 0}
                </td>
                </tr>

                <tr className="bg-green-200 font-bold text-lg">
                  <td colSpan="3" className="p-2 text-right">
                    F. GRAND TOTAL
                  </td>
                  <td className="p-2 text-right">
                    {detail.grandTotal?.toLocaleString("id-ID") || 0}
                  </td>
                </tr>

              </tbody>
            </table>

          </div>
        )}

        {/* FOOTER */}
        <div className="flex justify-end mt-6">
          <button
            onClick={() => setSelectedAnalisa(null)}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  </div>
)}

    </div>
  );
};

export default AnalisaMasterPage;