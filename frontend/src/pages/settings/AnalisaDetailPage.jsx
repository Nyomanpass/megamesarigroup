import { useEffect, useState } from "react";
import api from "../../api";
import { useParams } from "react-router-dom";

const AnalisaDetailPage = () => {
  const { id } = useParams(); // analisa_id

  const [data, setData] = useState(null);
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({
    item_id: "",
    koefisien: ""
  });

  // 🔹 GET ANALISA DETAIL
  const fetchDetail = async () => {
    const res = await api.get(`/master/analisa-detail/${id}`);
    setData(res.data);
  };

  // 🔹 GET MASTER ITEM
  const fetchItems = async () => {
    const res = await api.get("/masteritem");
    setItems(res.data);
  };

  useEffect(() => {
    fetchDetail();
    fetchItems();
  }, []);

  // 🔹 HANDLE INPUT
  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  // 🔹 SUBMIT DETAIL
  const handleSubmit = async (e) => {
    e.preventDefault();

    await api.post("/master/analisa-detail", {
      analisa_id: id,
      item_id: form.item_id,
      koefisien: form.koefisien
    });

    setForm({ item_id: "", koefisien: "" });
    fetchDetail();
  };

  if (!data) return <div>Loading...</div>;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">

      <h1 className="text-xl font-bold mb-4">Detail Analisa</h1>

      {/* 🔥 FORM INPUT */}
      <form onSubmit={handleSubmit} className="bg-white p-4 rounded mb-6 flex gap-2">
        <select
          name="item_id"
          value={form.item_id}
          onChange={handleChange}
          className="border p-2 rounded"
        >
          <option value="">Pilih Item</option>
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.nama} ({item.tipe})
            </option>
          ))}
        </select>

        <input
          type="number"
          name="koefisien"
          placeholder="Koefisien"
          value={form.koefisien}
          onChange={handleChange}
          className="border p-2 rounded"
        />

        <button className="bg-blue-600 text-white px-4 rounded">
          Tambah
        </button>
      </form>

      {/* 🔥 TABLE */}
      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2">Uraian</th>
              <th className="p-2">Satuan</th>
              <th className="p-2">Koef</th>
              <th className="p-2">Harga</th>
              <th className="p-2">Jumlah</th>
            </tr>
          </thead>

          <tbody>

            {/* 🔥 TENAGA */}
            <tr className="bg-gray-200 font-bold">
              <td colSpan="5">A. TENAGA</td>
            </tr>

            {data.tenaga.map((item) => (
              <tr key={item.id}>
                <td className="p-2">{item.nama}</td>
                <td className="p-2">{item.satuan}</td>
                <td className="p-2">{item.koefisien}</td>
                <td className="p-2">{item.harga.toLocaleString()}</td>
                <td className="p-2">{item.jumlah.toLocaleString()}</td>
              </tr>
            ))}

            <tr className="font-bold bg-gray-50">
              <td colSpan="4">Jumlah Tenaga</td>
              <td>{data.totalTenaga.toLocaleString()}</td>
            </tr>

            {/* 🔥 BAHAN */}
            <tr className="bg-gray-200 font-bold">
              <td colSpan="5">B. BAHAN</td>
            </tr>

            {data.bahan.map((item) => (
              <tr key={item.id}>
                <td className="p-2">{item.nama}</td>
                <td className="p-2">{item.satuan}</td>
                <td className="p-2">{item.koefisien}</td>
                <td className="p-2">{item.harga.toLocaleString()}</td>
                <td className="p-2">{item.jumlah.toLocaleString()}</td>
              </tr>
            ))}

            <tr className="font-bold bg-gray-50">
              <td colSpan="4">Jumlah Bahan</td>
              <td>{data.totalBahan.toLocaleString()}</td>
            </tr>

            {/* 🔥 ALAT */}
            <tr className="bg-gray-200 font-bold">
              <td colSpan="5">C. ALAT</td>
            </tr>

            {data.alat.map((item) => (
              <tr key={item.id}>
                <td className="p-2">{item.nama}</td>
                <td className="p-2">{item.satuan}</td>
                <td className="p-2">{item.koefisien}</td>
                <td className="p-2">{item.harga.toLocaleString()}</td>
                <td className="p-2">{item.jumlah.toLocaleString()}</td>
              </tr>
            ))}

            <tr className="font-bold bg-gray-50">
              <td colSpan="4">Jumlah Alat</td>
              <td>{data.totalAlat.toLocaleString()}</td>
            </tr>

            {/* 🔥 TOTAL */}
            <tr className="bg-yellow-100 font-bold">
              <td colSpan="4">D. Total (A+B+C)</td>
              <td>{data.total.toLocaleString()}</td>
            </tr>

            <tr className="bg-yellow-100 font-bold">
              <td colSpan="4">E. Overhead</td>
              <td>{data.overhead.toLocaleString()}</td>
            </tr>

            <tr className="bg-green-200 font-bold text-lg">
              <td colSpan="4">F. Grand Total</td>
              <td>{data.grandTotal.toLocaleString()}</td>
            </tr>

          </tbody>
        </table>
      </div>

    </div>
  );
};

export default AnalisaDetailPage;