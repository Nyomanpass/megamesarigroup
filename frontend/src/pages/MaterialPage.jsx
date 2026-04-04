import { useEffect, useState } from "react";
import Layout from "../components/layout/Layout";
import api from "../api";
import { useParams } from "react-router-dom";

export default function MaterialPage() {
  const { id } = useParams(); // project_id

  const [data, setData] = useState([]);
  const [form, setForm] = useState({
    nama: "",
    satuan: ""
  });

  const [editId, setEditId] = useState(null);

  // GET DATA
  const fetchData = async () => {
    const res = await api.get(`/materials/${id}`);
    setData(res.data);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // HANDLE INPUT
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
      await api.put(`/materials/${editId}`, form);
    } else {
      await api.post("/materials", {
        ...form,
        project_id: id
      });
    }

    setForm({ nama: "", satuan: "" });
    setEditId(null);
    fetchData();
  };

  // EDIT
  const handleEdit = (item) => {
    setForm({
      nama: item.nama,
      satuan: item.satuan
    });
    setEditId(item.id);
  };

  // DELETE
  const handleDelete = async (id) => {
    if (confirm("Hapus data?")) {
      await api.delete(`/materials/${id}`);
      fetchData();
    }
  };

  return (
    <Layout>
      <div className="p-6">

        <h1 className="text-2xl font-bold mb-4">
          📦 Material Project #{id}
        </h1>

        {/* FORM */}
        <div className="bg-white p-4 rounded shadow mb-4">
          <div className="flex gap-3">
            <input
              type="text"
              name="nama"
              placeholder="Nama Material"
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
                <th className="p-2">Aksi</th>
              </tr>
            </thead>

            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan="3" className="text-center p-4">
                    Tidak ada data
                  </td>
                </tr>
              ) : (
                data.map((item) => (
                  <tr key={item.id} className="border-t">
                    <td className="p-2">{item.nama}</td>
                    <td className="p-2">{item.satuan}</td>
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