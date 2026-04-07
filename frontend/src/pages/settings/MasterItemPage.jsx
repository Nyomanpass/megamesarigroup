import { useEffect, useState } from "react";
import { useRef } from "react";
import api from "../../api"; 

const MasterItemPage = () => {
  const [data, setData] = useState([]);
  const formRef = useRef(null);
  const [form, setForm] = useState({
    nama: "",
    tipe: "TENAGA",
    satuan: "",
    harga_default: "",
    category_id: "" 
  });
  const [editId, setEditId] = useState(null);

  const [categories, setCategories] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [catForm, setCatForm] = useState({ nama: "" });
  const [editCatId, setEditCatId] = useState(null);


  // 🔹 GET DATA
  const fetchData = async (tipe = "") => {
    try {
        const res = await api.get(`/masteritem?tipe=${tipe}`);
        setData(res.data);
    } catch (err) {
        console.error(err);
    }
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
  }, []);

  // 🔹 HANDLE INPUT
  const handleChange = (e) => {
  const { name, value } = e.target;

  setForm((prev) => ({
    ...prev,
    [name]: value,
    ...(name === "tipe" && value !== "BAHAN" && { category_id: "" })
  }));
};

const handleCatChange = (e) => {
  setCatForm({
    nama: e.target.value
  });
};


  const handleSubmitCategory = async (e) => {
  e.preventDefault();

  if (!catForm.nama) {
    alert("Nama kategori wajib diisi!");
    return;
  }

  try {
    if (editCatId) {
      await api.put(`/items/category/${editCatId}`, catForm);
    } else {
      await api.post("/items/category", catForm);
    }

    setCatForm({ nama: "" });
    setEditCatId(null);
    setShowModal(false);
    fetchCategories();

  } catch (err) {
    console.error(err);
  }
};

const handleDeleteCategory = async (id) => {
  if (!confirm("Yakin hapus kategori?")) return;

  try {
    await api.delete(`/items/category/${id}`);
    fetchCategories();
  } catch (err) {
    console.error(err);
  }
};



  // 🔹 SUBMIT (CREATE / UPDATE)
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.nama || !form.satuan || !form.harga_default) {
      alert("Semua field wajib diisi!");
      return;
    }

    if (form.tipe === "BAHAN" && !form.category_id) {
        alert("Kategori wajib dipilih untuk BAHAN!");
        return;
    }

    try {
     if (editId) {
        const payload = {
            ...form,
            category_id: form.category_id || null
        };

        await api.put(`/masteritem/${editId}`, payload);
        } else {
        await api.post("/masteritem", form);
      }

      setForm({
        nama: "",
        tipe: "TENAGA",
        satuan: "",
        harga_default: "",
        category_id: "" 
      });
      setEditId(null);
      fetchData();

    } catch (err) {
      console.error(err);
    }
  };

  // 🔹 DELETE
  const handleDelete = async (id) => {
    if (!confirm("Yakin hapus data?")) return;

    try {
      await api.delete(`/masteritem/${id}`);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditCategory = (cat) => {
    setCatForm({ nama: cat.nama });
    setEditCatId(cat.id);
    setShowModal(true);
  };

  // 🔹 EDIT
  const handleEdit = (item) => {
    setForm({
      nama: item.nama,
      tipe: item.tipe,
      satuan: item.satuan,
      harga_default: item.harga_default,
      category_id: item.category_id || ""
    });
    setEditId(item.id);
    formRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
  };

  return (
    <>
    <div ref={formRef} className="p-6 bg-gray-50 min-h-screen">
    {/* Header Halaman */}
    <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Master Item</h1>
        <p className="text-sm text-gray-600 mt-1">
        Kelola daftar sumber daya (Tenaga, Bahan, dan Alat) beserta harga satuannya di sini.
        </p>
    </div>

    <button
        onClick={() => setShowModal(true)}
        className="mb-4 bg-green-600 text-white px-4 py-2 rounded"
        >
        + Kelola Kategori
    </button>

    <select
        onChange={(e) => fetchData(e.target.value)}
        className="border p-2 rounded"
        >
        <option value="">Semua</option>
        <option value="TENAGA">TENAGA</option>
        <option value="BAHAN">BAHAN</option>
        <option value="ALAT">ALAT</option>
    </select>

    {/* SECTION FORM */}
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
        <div className="px-4 py-3 border-b border-gray-100">
        <h2 className="font-semibold text-gray-700">
            {editId ? "Edit Item" : "Tambah Item Baru"}
        </h2>
        <p className="text-xs text-gray-500">Isi formulir di bawah untuk memperbarui atau menambah data katalog.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-700 ml-1">Nama Item</label>
            <input
            type="text"
            name="nama"
            placeholder="Contoh: Semen Portland"
            value={form.nama}
            onChange={handleChange}
            className="border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
        </div>

        <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-700 ml-1">Kategori Tipe</label>
            <select
            name="tipe"
            value={form.tipe}
            onChange={handleChange}
            className="border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            >
            <option value="TENAGA">TENAGA</option>
            <option value="BAHAN">BAHAN</option>
            <option value="ALAT">ALAT</option>
            </select>
        </div>

        {form.tipe === "BAHAN" && (
        <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-700 ml-1">Kategori</label>
            <select
            name="category_id"
            value={form.category_id}
            onChange={handleChange}
            className="border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
            >
            <option value="">-- Pilih Kategori --</option>
            {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                {cat.nama}
                </option>
            ))}
            </select>
        </div>
        )}

        <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-700 ml-1">Satuan</label>
            <input
            type="text"
            name="satuan"
            placeholder="Contoh: Kg, M3, Org/Hr"
            value={form.satuan}
            onChange={handleChange}
            className="border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
        </div>

        <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-700 ml-1">Harga Satuan (Default)</label>
            <input
                type="number"
                step="0.01"
                name="harga_default"
                placeholder="0"
                value={form.harga_default}
                onChange={handleChange}
                className="border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
        </div>

        <button className={`col-span-1 md:col-span-2 mt-2 p-2 rounded text-white font-medium transition-colors ${
            editId ? "bg-yellow-500 hover:bg-yellow-600" : "bg-blue-600 hover:bg-blue-700"
        }`}>
            {editId ? "Simpan Perubahan" : "Simpan Item ke Database"}
        </button>
        </form>
    </div>

    {/* SECTION TABLE */}
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
        <div>
            <h2 className="font-semibold text-gray-700">Daftar Katalog Item</h2>
            <p className="text-xs text-gray-500">Menampilkan total {data.length} item terdaftar.</p>
        </div>
        </div>
        
        <div className="overflow-x-auto">
        <table className="w-full text-left">
            <thead>
            <tr className="bg-gray-50 text-gray-600 text-sm uppercase tracking-wider">
                <th className="p-4 font-semibold">Nama</th>
                <th className="p-4 font-semibold">Tipe</th>
                <th className="p-4 font-semibold">Kategori</th>
                <th className="p-4 font-semibold">Satuan</th>
                <th className="p-4 font-semibold text-right">Harga</th>
                <th className="p-4 font-semibold text-center">Aksi</th>
            </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
            {data.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                <td className="p-4 font-medium">{item.nama}</td>
                <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                    item.tipe === 'TENAGA' ? 'bg-purple-100 text-purple-600' :
                    item.tipe === 'BAHAN' ? 'bg-green-100 text-green-600' :
                    'bg-orange-100 text-orange-600'
                    }`}>
                    {item.tipe}
                    </span>
                </td>
                  <td className="p-4">
                        {item.tipe === "BAHAN"
                        ? item.ItemCategory?.nama || "-"
                        : "-"}
                    </td>
                <td className="p-4">{item.satuan}</td>
                <td className="p-4 text-right">
                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(item.harga_default)}
                </td>
                <td className="p-4 text-center">
                    <div className="flex justify-center gap-2">
                    <button
                        onClick={() => handleEdit(item)}
                        className="bg-yellow-100 text-yellow-700 hover:bg-yellow-200 px-3 py-1.5 rounded text-sm font-medium transition-colors"
                    >
                        Edit
                    </button>
                    <button
                        onClick={() => handleDelete(item.id)}
                        className="bg-red-100 text-red-700 hover:bg-red-200 px-3 py-1.5 rounded text-sm font-medium transition-colors"
                    >
                        Hapus
                    </button>
                    </div>
                </td>
                </tr>
            ))}
            {data.length === 0 && (
                <tr>
                <td colSpan="5" className="p-8 text-center text-gray-400 italic">
                    Belum ada data item tersedia.
                </td>
                </tr>
            )}
            </tbody>
        </table>
        </div>
    </div>
    </div>
        {showModal && (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
        <div className="bg-white w-full max-w-md rounded-lg shadow-lg p-4">
        
        <h2 className="text-lg font-semibold mb-3">
            {editCatId ? "Edit Kategori" : "Tambah Kategori"}
        </h2>

        <form onSubmit={handleSubmitCategory} className="flex flex-col gap-3">
            <input
            type="text"
            name="nama"   // 🔥 INI YANG KURANG
            placeholder="Nama kategori (contoh: Semen)"
            value={catForm.nama}
            onChange={handleCatChange}
            className="border p-2 rounded"
            />

            <div className="flex justify-end gap-2">
            <button
                type="button"
                onClick={() => {
                setShowModal(false);
                setEditCatId(null);
                setCatForm({ nama: "" });
                }}
                className="px-3 py-1 bg-gray-200 rounded"
            >
                Batal
            </button>

            <button className="px-3 py-1 bg-blue-600 text-white rounded">
                Simpan
            </button>
            </div>
        </form>

        {/* LIST KATEGORI */}
        <div className="mt-4 border-t pt-3">
            <h3 className="text-sm font-semibold mb-2">Daftar Kategori</h3>

            {categories.map((cat) => (
            <div key={cat.id} className="flex justify-between items-center mb-2">
                <span>{cat.nama}</span>
                <div className="flex gap-2">
                <button
                    onClick={() => handleEditCategory(cat)}
                    className="text-yellow-600 text-sm"
                >
                    Edit
                </button>
                <button
                    onClick={() => handleDeleteCategory(cat.id)}
                    className="text-red-600 text-sm"
                >
                    Hapus
                </button>
                </div>
            </div>
            ))}

        </div>
        </div>
    </div>
    )}
    </>
  );
};

export default MasterItemPage;