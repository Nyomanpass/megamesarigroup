import { useEffect, useState } from "react";
import api from "../api";
import { useParams } from "react-router-dom";

const ProjectAnalisaPage = () => {
  const { id } = useParams(); // 🔥 project_id

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
    overhead_persen: 10
  });

  const [formDetail, setFormDetail] = useState({
    item_id: "",
    koefisien: ""
  });

  // ================= MASTER =================

  const fetchData = async () => {
    const res = await api.get(`/project-analisa?project_id=${id}`);
    setData(res.data);
  };

  const fetchItems = async () => {
    const res = await api.get(`/project-items?project_id=${id}`);
    setItems(res.data);
  };

  const handleSubmitMaster = async (e) => {
    e.preventDefault();

    if (isEdit) {
      await api.put(`/project-analisa/${editId}`, formMaster);
    } else {
      await api.post("/project-analisa", {
        ...formMaster,
        project_id: id // 🔥 WAJIB
      });
    }

    setFormMaster({
      kode: "",
      nama: "",
      satuan: "",
      overhead_persen: 10
    });

    setIsEdit(false);
    setEditId(null);

    fetchData();
  };

  const handleEdit = (a) => {
    setFormMaster(a);
    setEditId(a.id);
    setIsEdit(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Yakin hapus?")) return;
    await api.delete(`/project-analisa/${id}`);
    fetchData();
  };

  // ================= DETAIL =================

  const fetchDetail = async (id) => {
    const res = await api.get(`/project-analisa-detail/${id}`);
    setDetail(res.data);
  };

  const openDetail = async (analisa) => {
    setSelectedAnalisa(analisa);
    await fetchDetail(analisa.id);
  };


    const handleSubmitDetail = async (e) => {
    e.preventDefault();

    if (!selectedAnalisa) return;

    if (isEditDetail) {
        // 🔥 UPDATE
        await api.put(`/project-analisa-detail/${editDetailId}`, {
        item_id: formDetail.item_id,
        koefisien: formDetail.koefisien
        });
    } else {
        // 🔥 CREATE
        await api.post("/project-analisa-detail", {
        project_analisa_id: selectedAnalisa.id,
        item_id: formDetail.item_id,
        koefisien: formDetail.koefisien
        });
    }

    // 🔥 RESET
    setFormDetail({ item_id: "", koefisien: "" });
    setIsEditDetail(false);
    setEditDetailId(null);

    // 🔥 REFRESH (WAJIB)
    await fetchDetail(selectedAnalisa.id);
    };

  const handleEditDetail = (d) => {
    setFormDetail({
      item_id: d.item_id,
      koefisien: d.koefisien
    });

    setEditDetailId(d.id);
    setIsEditDetail(true);
  };

  const handleDeleteDetail = async (id) => {
    if (!confirm("Hapus item?")) return;
    await api.delete(`/project-analisa-detail/${id}`);
    fetchDetail(selectedAnalisa.id);
  };

  useEffect(() => {
    fetchData();
    fetchItems();
  }, [id]);

  const formatRupiah = (num) => {
  return Number(num).toLocaleString("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

  return (
    <div className="p-6">

    <div className="p-8 bg-gray-100 min-h-screen">
    <div className="max-w-5xl mx-auto">
        
        {/* HEADER */}
        <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Analisa Project</h1>
        <p className="text-gray-500 text-sm">Kelola daftar analisa dan overhead project</p>
        </div>

        {/* 🔥 FORM MASTER */}
        <div className="bg-white p-6 rounded-lg shadow-sm mb-8 border border-gray-200">
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">
            {isEdit ? "Edit Data Analisa" : "Tambah Analisa Baru"}
        </h2>

        <form onSubmit={handleSubmitMaster} className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600">Kode Analisa</label>
            <input 
                name="kode" 
                placeholder="Contoh: A.2.1" 
                value={formMaster.kode}
                onChange={(e)=>setFormMaster({...formMaster, kode:e.target.value})}
                className="border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
            </div>

            <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600">Nama Analisa</label>
            <input 
                name="nama" 
                placeholder="Masukkan nama pekerjaan"
                value={formMaster.nama}
                onChange={(e)=>setFormMaster({...formMaster, nama:e.target.value})}
                className="border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
            </div>

            <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600">Satuan</label>
            <input 
                name="satuan" 
                placeholder="m2, m3, atau ls"
                value={formMaster.satuan}
                onChange={(e)=>setFormMaster({...formMaster, satuan:e.target.value})}
                className="border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
            </div>

            <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600">Overhead (%)</label>
            <input 
                type="number" 
                name="overhead_persen"
                placeholder="0"
                value={formMaster.overhead_persen}
                onChange={(e)=>setFormMaster({...formMaster, overhead_persen:e.target.value})}
                className="border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
            </div>

            <button className={`col-span-2 mt-2 p-3 rounded font-bold text-white transition-colors ${isEdit ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-600 hover:bg-blue-700'}`}>
            {isEdit ? "Update Analisa" : "Simpan Analisa"}
            </button>
        </form>
        </div>

        {/* 🔥 TABLE */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
            <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Kode</th>
                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Nama Analisa</th>
                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase text-center">Aksi</th>
            </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
            {data.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 font-mono font-bold text-blue-600">{a.kode}</td>
                <td className="px-6 py-4 text-gray-700 font-medium">{a.nama}</td>
                <td className="px-6 py-4">
                    <div className="flex justify-center gap-2">
                    <button 
                        onClick={()=>openDetail(a)}
                        className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded text-sm font-bold border border-emerald-200 hover:bg-emerald-600 hover:text-white transition-all"
                    >
                        Detail
                    </button>
                    <button 
                        onClick={()=>handleEdit(a)}
                        className="text-gray-400 hover:text-blue-600 px-2 transition-colors text-sm font-semibold"
                    >
                        Edit
                    </button>
                    <button 
                        onClick={()=>handleDelete(a.id)}
                        className="text-gray-400 hover:text-red-600 px-2 transition-colors text-sm font-semibold"
                    >
                        Hapus
                    </button>
                    </div>
                </td>
                </tr>
            ))}
            {data.length === 0 && (
                <tr>
                <td colSpan="3" className="px-6 py-10 text-center text-gray-400 italic">Belum ada data analisa.</td>
                </tr>
            )}
            </tbody>
        </table>
        </div>

    </div>
    </div>

      {/* 🔥 MODAL */}
      {selectedAnalisa && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center">

          <div className="bg-white w-[900px] p-6 rounded">

            <h2 className="font-bold mb-4">
              {selectedAnalisa.nama}
            </h2>
            <button onClick={()=>setSelectedAnalisa(null)}>
                Tutup
                </button>
            {/* FORM DETAIL */}
            <form onSubmit={handleSubmitDetail} className="flex gap-2 mb-4">

              <select
                value={formDetail.item_id}
                onChange={(e)=>setFormDetail({...formDetail,item_id:e.target.value})}
              >
                <option value="">Pilih Item</option>
                {items.map(i=>(
                  <option key={i.id} value={i.id}>
                    {i.nama} ({i.tipe})
                  </option>
                ))}
              </select>

              <input
                placeholder="Koefisien"
                value={formDetail.koefisien}
                onChange={(e)=>setFormDetail({...formDetail,koefisien:e.target.value})}
              />

             <button className="bg-green-600 text-white px-4 rounded">
                {isEditDetail ? "Update" : "+ Tambah"}
                </button>
            </form>

            {detail && (
            <div className="mt-4">
                 

                <table className="w-full border text-sm">
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
                    {/* TENAGA */}
                    <tr className="bg-gray-200 font-bold">
                    <td colSpan="4" className="p-2">A. TENAGA</td>
                    </tr>

                    {detail.tenaga?.map((d) => (
                    <tr key={d.id}>
                        <td className="p-2 border">{d.nama}</td>
                        <td className="p-2 border text-center">{d.koefisien}</td>
                        <td className="p-2 border text-right">
                        {Number(d.harga).toLocaleString("id-ID")}
                        </td>
                        <td className="p-2 border text-right">
                        {Number(d.jumlah).toLocaleString("id-ID")}
                        </td>
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
                    ))}

                    <tr className="font-bold">
                    <td colSpan="3" className="p-2 text-right">Total Tenaga</td>
                    <td className="p-2 text-right">
                        {detail.totalTenaga?.toLocaleString("id-ID")}
                    </td>
                    </tr>

                    {/* BAHAN */}
                    <tr className="bg-gray-200 font-bold">
                    <td colSpan="4" className="p-2">B. BAHAN</td>
                    </tr>

                    {detail.bahan?.map((d) => (
                    <tr key={d.id}>
                        <td className="p-2 border">{d.nama}</td>
                        <td className="p-2 border text-center">{d.koefisien}</td>
                        <td className="p-2 border text-right">
                        {Number(d.harga).toLocaleString("id-ID")}
                        </td>
                        <td className="p-2 border text-right">
                        {Number(d.jumlah).toLocaleString("id-ID")}
                        </td>

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
                    ))}

                    <tr className="font-bold">
                    <td colSpan="3" className="p-2 text-right">Total Bahan</td>
                    <td className="p-2 text-right">
                        {detail.totalBahan?.toLocaleString("id-ID")}
                    </td>
                    </tr>

                    {/* ALAT */}
                    <tr className="bg-gray-200 font-bold">
                    <td colSpan="4" className="p-2">C. ALAT</td>
                    </tr>

                    {detail.alat?.map((d) => (
                    <tr key={d.id}>
                        <td className="p-2 border">{d.nama}</td>
                        <td className="p-2 border text-center">{d.koefisien}</td>
                        <td className="p-2 border text-right">
                        {Number(d.harga).toLocaleString("id-ID")}
                        </td>
                        <td className="p-2 border text-right">
                        {Number(d.jumlah).toLocaleString("id-ID")}
                        </td>

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
                    ))}

                    <tr className="font-bold">
                    <td colSpan="3" className="p-2 text-right">Total Alat</td>
                    <td className="p-2 text-right">
                        {detail.totalAlat?.toLocaleString("id-ID")}
                    </td>
                    </tr>

                    {/* TOTAL */}
                    <tr className="bg-yellow-100 font-bold">
                    <td colSpan="3" className="p-2 text-right">TOTAL</td>
                    <td className="p-2 text-right">
                        {detail.total?.toLocaleString("id-ID")}
                    </td>
                    </tr>

                    <tr className="bg-yellow-50 font-bold">
                    <td colSpan="3" className="p-2 text-right">
                        Overhead ({selectedAnalisa?.overhead_persen}%)
                    </td>
                    <td className="p-2 text-right">
                        {detail.overhead?.toLocaleString("id-ID")}
                    </td>
                    </tr>

                    <tr className="bg-green-200 font-bold text-lg">
                    <td colSpan="3" className="p-2 text-right">GRAND TOTAL</td>
                    <td className="p-2 text-right">
                        {detail.grandTotal?.toLocaleString("id-ID")}
                    </td>
                    </tr>



                </tbody>
                </table>

            </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default ProjectAnalisaPage;