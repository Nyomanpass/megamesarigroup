import { useEffect, useState } from "react";
import api from "../api";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Package, Plus, Save, Edit, Trash2 } from "lucide-react";

export default function MaterialPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tipe, setTipe] = useState("BAHAN"); // default
  const [categories, setCategories] = useState([]);

  const [data, setData] = useState([]);
  const [form, setForm] = useState({
    nama: "",
    satuan: "",
    harga: "",
    category_id: "",
  });

  const [editId, setEditId] = useState(null);

  // 🔥 GET DATA (PROJECT ITEM - BAHAN)
const fetchData = async () => {
  const res = await api.get(`/project-items?project_id=${id}&tipe=${tipe}`
  );
  setData(res.data);
};

const fetchCategories = async () => {
  try {
    const res = await api.get("/items/category");
    setCategories(res.data);
  } catch (err) {
    console.error(err);
  }
};

  useEffect(() => {
    fetchData();
    fetchCategories();
  }, [id]);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  // 🔥 SUBMIT (CREATE / UPDATE)
  const handleSubmit = async () => {
    if (!form.nama || !form.satuan) return;

    try {
      if (editId) {
        // UPDATE
        await api.put(`/project-items/${editId}`, form);
      } else {
        // CREATE
        await api.post("/project-items", {
          ...form,
          project_id: id
        });
      }

      setForm({ nama: "", satuan: "", harga: "" });
      setEditId(null);
      fetchData();

    } catch (err) {
      console.error(err);
    }
  };

  // 🔥 EDIT
 const handleEdit = (item) => {
  window.scrollTo({ top: 0, behavior: "smooth" });

  setForm({
    nama: item.nama,
    satuan: item.satuan,
    harga: item.harga || "",
    category_id: item.category_id || "" // ✅ fix
  });

  setEditId(item.id);
};

  // 🔥 DELETE
  const handleDelete = async (itemId) => {
    if (window.confirm("Yakin hapus material ini?")) {
      await api.delete(`/project-items/${itemId}`);
      fetchData();
    }
  };

  return (
    <div className="p-6 mx-auto">

      {/* HEADER */}
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => navigate(`/project/${id}`)} 
          className="p-2 rounded bg-white border"
        >
          <ArrowLeft />
        </button>

        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Package /> Katalog Material (BAHAN)
          </h1>
          <p className="text-sm text-gray-500">
            Data bahan khusus untuk project ini
          </p>
        </div>
      </div>

      {/* FORM */}
      <div className="bg-white p-4 rounded mb-6 border">
        <h2 className="font-bold mb-3">
          {editId ? "Edit Material" : "Tambah Material"}
        </h2>

        <div className="grid md:grid-cols-3 gap-3">

          <input
            type="text"
            name="nama"
            placeholder="Nama Material"
            value={form.nama}
            onChange={handleChange}
            className="border p-2"
          />

           <select
            name="category_id"
            value={form.category_id}
            onChange={handleChange}
            className="border p-2"
          >
            <option value="">Pilih Kategori</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nama}
              </option>
            ))}
          </select>

          <input
            type="text"
            name="satuan"
            placeholder="Satuan (m3, zak, dll)"
            value={form.satuan}
            onChange={handleChange}
            className="border p-2"
          />

          <input
            type="number"
            name="harga"
            placeholder="Harga"
            value={form.harga}
            onChange={handleChange}
            className="border p-2"
          />

        </div>

        <div className="flex gap-2 mt-3">
          <button
            onClick={handleSubmit}
            className="bg-blue-600 text-white px-4 py-2"
          >
            {editId ? "Update" : "Simpan"}
          </button>

          {editId && (
            <button
              onClick={() => {
                setEditId(null);
                setForm({ nama: "", satuan: "", harga: "", category_id: "" });
              }}
              className="bg-gray-400 text-white px-4 py-2"
            >
              Batal
            </button>
          )}
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white border rounded">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2">Nama</th>
              <th className="p-2">Satuan</th>
              <th className="p-2">Category</th>
              <th className="p-2">Harga</th>
              <th className="p-2">Aksi</th>
            </tr>
          </thead>

          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan="4" className="text-center p-4 text-gray-400">
                  Belum ada data
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <tr key={item.id}>
                  <td className="p-2">{item.nama}</td>
                  <td className="p-2">{item.satuan}</td>
                  <td className="p-2"> {item.category?.nama || "-"}</td>
                  <td className="p-2">
                    {Number(item.harga || 0).toLocaleString("id-ID")}
                  </td>

                  <td className="p-2 flex gap-2">
                    <button
                      onClick={() => handleEdit(item)}
                      className="bg-yellow-500 text-white px-2"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => handleDelete(item.id)}
                      className="bg-red-500 text-white px-2"
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
  );
}