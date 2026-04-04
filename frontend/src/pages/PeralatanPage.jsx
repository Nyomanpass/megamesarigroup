import { useEffect, useState } from "react";
import Layout from "../components/layout/Layout";
import api from "../api";
import { useParams } from "react-router-dom";

export default function PeralatanPage() {
  const { id } = useParams();

  const [data, setData] = useState([]);
  const [form, setForm] = useState({
    nama: "",
    satuan: "",
    di_bilang: 0
  });

  const [editId, setEditId] = useState(null);

  // GET
  const fetchData = async () => {
    const res = await api.get(`/peralatan/${id}`);
    setData(res.data);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // INPUT
  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  // SUBMIT
  const handleSubmit = async () => {
    if (!form.nama || !form.satuan) return;

    if (editId) {
      await api.put(`/peralatan/${editId}`, form);
    } else {
      await api.post("/peralatan", {
        ...form,
        project_id: id
      });
    }

    setForm({ nama: "", satuan: "", di_bilang: 0 });
    setEditId(null);
    fetchData();
  };

  // EDIT
  const handleEdit = (item) => {
    setForm({
      nama: item.nama,
      satuan: item.satuan,
      di_bilang: item.di_bilang
    });
    setEditId(item.id);
  };

  // DELETE
  const handleDelete = async (id) => {
    if (confirm("Hapus peralatan?")) {
      await api.delete(`/peralatan/${id}`);
      fetchData();
    }
  };

  return (
    <Layout>
      <div className="p-6">

        <h1 className="text-2xl font-bold mb-4">
          🛠️ Peralatan Project #{id}
        </h1>

        {/* FORM */}
        <div className="bg-white p-4 rounded shadow mb-4">
          <div className="flex gap-3">

            <input
              type="text"
              name="nama"
              placeholder="Nama Alat"
              value={form.nama}
              onChange={handleChange}
              className="border p-2 rounded w-full"
            />

            <input
              type="text"
              name="satuan"
              placeholder="Satuan"
              value={form.satuan}
              onChange={handleChange}
              className="border p-2 rounded w-32"
            />

            <input
              type="number"
              name="di_bilang"
              placeholder="Nilai / Biaya"
              value={form.di_bilang}
              onChange={handleChange}
              className="border p-2 rounded w-32"
            />

            <button
              onClick={handleSubmit}
              className="bg-blue-500 text-white px-4 rounded"
            >
              {editId ? "Update" : "Tambah"}
            </button>

          </div>
        </div>

        {/* TABLE */}
        <div className="bg-white shadow rounded overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2">Nama</th>
                <th className="p-2">Satuan</th>
                <th className="p-2">Nilai</th>
                <th className="p-2">Aksi</th>
              </tr>
            </thead>

            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center p-4">
                    Tidak ada data
                  </td>
                </tr>
              ) : (
                data.map((item) => (
                  <tr key={item.id} className="border-t">
                    <td className="p-2">{item.nama}</td>
                    <td className="p-2">{item.satuan}</td>
                    <td className="p-2">
                      {Number(item.di_bilang).toFixed(2)}
                    </td>
                    <td className="p-2 flex gap-2">
                      <button
                        onClick={() => handleEdit(item)}
                        className="bg-yellow-400 px-2 rounded"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="bg-red-500 text-white px-2 rounded"
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>
    </Layout>
  );
}