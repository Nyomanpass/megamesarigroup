import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useProject } from "../context/ProjectContext";
import api from "../api";
import { m, AnimatePresence, spring } from "motion/react";
import { useRef } from 'react';
import {
  ArrowLeft, FileText, CheckCircle, Calculator, PackageCheck, Wallet, Plus, X, Trash2, ChevronDown, Upload
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend
} from 'recharts';

export default function BoqPage() {
  const { id: paramId } = useParams();
  const { selectedProject } = useProject();
  const id = selectedProject?.id || paramId;
  const navigate = useNavigate();
  const [analisaList, setAnalisaList] = useState([]);
  const [bulkItems, setBulkItems] = useState([
    { uraian: "", satuan: "", volume: "", analisa_id: "", ppn: 11 }
  ]);
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState(null);

  const [boq, setBoq] = useState([]);
  const [project, setProject] = useState(null);
  const [importFile, setImportFile] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [analytics, setAnalytics] =
  useState({
    totalHargaSatuan: 0,
    totalJumlah: 0,
    totalGrandTotal: 0,
    totalBobot: 0,

    totalHargaSatuan_rp: "",
    totalJumlah_rp: "",
    totalGrandTotal_rp: ""
  });
  const [form, setForm] = useState({
    parent_id: "",
    kode: "",
    uraian: "",
    satuan: "",
    volume: "",
    ppn: 11,
    tipe: "item"
  });

  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedBoq, setSelectedBoq] = useState(null);
  const [selectedAnalisa, setSelectedAnalisa] = useState("");
  const [searchAnalisa, setSearchAnalisa] = useState("");
  const [collapsedHeaders, setCollapsedHeaders] = useState(new Set());

  const [versions, setVersions] = useState([]);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [versionChanges, setVersionChanges] = useState([]);

  const [showVersionModal, setShowVersionModal] = useState(false);
  const [editingVersionChange, setEditingVersionChange] = useState(null);
  const [versionForm, setVersionForm] = useState({
    boq_item_id: "",
    volume: "",
    harga_satuan: "",
    action: "update",
  });

  const [isAddendumMode,setIsAddendumMode]= useState(false);

  //adendum
  const openVersionModal = (item) => {
    // Cari apakah item ini sudah ada perubahan sebelumnya
    const existing = versionChanges.find(v => v.boq_item_id === item.id);

    if (existing) {
      // JIKA SUDAH ADA PERUBAHAN
      setEditingVersionChange(existing);
      setVersionForm({
        boq_item_id: item.id,
        volume: existing.volume || item.volume,
        harga_satuan: existing.harga_satuan || item.harga_satuan,
        action: existing.action,
      });
    } else {
      // JIKA BELUM ADA PERUBAHAN
      setEditingVersionChange(null);
      setVersionForm({
        boq_item_id: item.id,
        volume: item.volume,
        harga_satuan: item.harga_satuan,
        action: "update",
      });
    }

    setShowVersionModal(true);
  };

  const saveVersionChange = async () => {
    try {
      // 1. Validasi
      if (!selectedVersion) {
        alert("Pilih version dulu");
        return;
      }

      // Prepare payload data
      const payload = {
        volume: versionForm.volume,
        harga_satuan: versionForm.harga_satuan,
        action: versionForm.action,
      };

      if (!editingVersionChange) {
        // 2. PROSES CREATE
        await api.post("/boq-version-changes", {
          version_id: selectedVersion.id,
          boq_item_id: versionForm.boq_item_id,
          ...payload,
        });
      } else {
        // 3. PROSES UPDATE
        await api.put(`/boq-version-changes/${editingVersionChange.id}`, payload);
      }

      alert("Addendum berhasil disimpan");
      setShowVersionModal(false);
      setEditingVersionChange(null);

      await Promise.all([
        fetchBoq(selectedVersion.id),
        fetchVersionChanges(selectedVersion.id)
      ]);

    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "Terjadi kesalahan saat menyimpan data");
    }
  };

  const deleteVersionChange = async (id) => {
    const confirmDelete = window.confirm("Hapus perubahan addendum?");
    if (!confirmDelete) return;

    try {
      await api.delete(`/boq-version-changes/${id}`);
      setShowVersionModal(false);
      setEditingVersionChange(null);

      await Promise.all([
        fetchBoq(selectedVersion.id),
        fetchVersionChanges(selectedVersion.id)
      ]);
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "Gagal menghapus data addendum");
    }
  };

  const fileInputRef = useRef(null);

  const handleUploadClick = () => {
    fileInputRef.current.click();
  };


  const toggleHeader = (headerId) => {
    setCollapsedHeaders(prev => {
      const next = new Set(prev);
      if (next.has(headerId)) next.delete(headerId);
      else next.add(headerId);
      return next;
    });
  };

  const openLinkAnalisa = (item) => {
    setSelectedBoq(item);
    setSelectedAnalisa(item.analisa_id || "");
    setShowLinkModal(true);
  };

  const handleLinkAnalisa = async () => {
    try {
      if (!selectedAnalisa) {
        alert("Pilih analisa dulu!");
        return;
      }

      await api.patch(`/boq/${selectedBoq.id}/link-analisa`, {
        analisa_id: selectedAnalisa
      });

      setShowLinkModal(false);
      setSelectedAnalisa("");
      setSelectedBoq(null);

      fetchBoq(selectedVersion?.id); // 🔥 refresh tabel

    } catch (err) {
      console.error(err);
      alert("Gagal link analisa");
    }
  };

  const addBulkRow = () => {
    setBulkItems([...bulkItems, { uraian: "", satuan: "", volume: "", analisa_id: "", ppn: 11 }]);
  };

  const handleBulkChange = (index, field, value) => {
    const newItems = [...bulkItems];
    newItems[index][field] = value;
    setBulkItems(newItems);
  };

  const handleBulkSubmit = async () => {
    try {
      if (!form.parent_id) {
        alert("Wajib pilih Parent terlebih dahulu!");
        return;
      }

      const itemsToSubmit = bulkItems.filter(
        item => item.uraian.trim() !== "" && item.analisa_id
      );

      if (itemsToSubmit.length === 0) {
        alert("Isi minimal satu uraian & pilih analisa!");
        return;
      }

      await api.post("/boq/bulk", {
        project_id: id,
        parent_id: form.parent_id,
        items: itemsToSubmit.map(item => ({
          uraian: item.uraian,
          satuan: item.satuan,
          volume: Number(item.volume) || 0,
          analisa_id: item.analisa_id, // 🔥 WAJIB
          ppn: Number(item.ppn) || 11
        }))
      });

      setShowModal(false);

      // 🔥 reset
      setBulkItems([
        { uraian: "", satuan: "", volume: "", analisa_id: "", ppn: 11 }
      ]);

      fetchBoq(selectedVersion?.id);

    } catch (err) {
      console.error(err);
      alert("Gagal simpan: " + (err.response?.data?.message || err.message));
    }
  };

  const handleImportBoq = async () => {
    try {
      if (!importFile) {
        alert("Pilih file Excel dulu!");
        return;
      }

      const formData = new FormData();
      formData.append("file", importFile);
      formData.append("project_id", id);

      const res = await api.post("/import-boq", formData);

      // 🔥 HANDLE WARNING DI SINI
      if (res.data.warning) {
        const lanjut = window.confirm(
          `Kode berikut tidak ditemukan:\n\n${res.data.missingKode.join(", ")}\n\nTetap lanjutkan?`
        );

        if (!lanjut) return;
      }

      alert(res.data.message);

      setImportFile(null);
      fetchBoq(selectedVersion?.id); // 🔥 reload tabel

    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Import gagal!");
    }
  };

  const handleEdit = async (id) => {
    try {
      const res = await api.get(`/boq/${id}`);
      const item = res.data;

      setIsEdit(true);
      setEditId(id);

      // 🔥 ambil harga dari analisa
      let harga_preview = null;

      if (item.analisa_id) {
        const analisaRes = await api.get(`/project-analisa-detail/${item.analisa_id}`);
        harga_preview = analisaRes.data.harga_satuan_pekerjaan ?? analisaRes.data.pembulatan ?? analisaRes.data.grandTotal;
      }

      setForm({
        parent_id: item.parent_id || "",
        kode: item.kode || "",
        uraian: item.uraian || "",
        satuan: item.satuan || "",
        volume: item.volume || "",
        ppn: item.ppn || 11,
        tipe: item.tipe || "item"
      });

      setBulkItems([
        {
          uraian: item.uraian || "",
          satuan: item.satuan || "",
          volume: item.volume || "",
          analisa_id: item.analisa_id || "",
          ppn: item.ppn || 11,
          harga_preview // 🔥 INI KUNCI
        }
      ]);

      setShowModal(true);

    } catch (err) {
      console.error(err);
      alert("Gagal ambil data");
    }
  };

  const handleDeleteBoq = async (id) => {
    try {
      const confirmDelete = window.confirm("Yakin hapus data ini?");
      if (!confirmDelete) return;

      await api.delete(`/boq/${id}`);

      alert("Berhasil hapus");
      fetchBoq(selectedVersion?.id); // 🔥 reload

    } catch (err) {
      console.error(err);
      alert("Gagal hapus");
    }
  };


  const handleSubmit = async () => {
    try {
      if (!form.uraian) return alert("Uraian wajib diisi");

      const payload = {
        ...form,
        project_id: id,
        parent_id: form.parent_id === "" ? null : form.parent_id,
        volume: form.tipe === "item" ? Number(form.volume) : null,
        ppn: form.tipe === "item" ? Number(form.ppn) : null,
      };

      if (isEdit) {
        const item = bulkItems[0];

        let payload = {};

        if (form.tipe === "item") {
          // 🔥 item lengkap
          payload = {
            uraian: item.uraian,
            satuan: item.satuan,
            volume: Number(item.volume) || 0,
            analisa_id: item.analisa_id || null,
            ppn: Number(item.ppn) || 11,
            parent_id: form.parent_id || null,
            tipe: "item"
          };
        } else {
          // 🔥 header / subheader
          payload = {
            uraian: form.uraian,
            kode: form.kode,
            tipe: form.tipe,
            parent_id: form.parent_id || null
          };
        }

        await api.patch(`/boq/${editId}`, payload);

        alert("Berhasil update");
      } else {
        // 🔥 CREATE
        await api.post("/boq", payload);
        alert("Berhasil tambah");
      }

      // 🔥 reset state
      setShowModal(false);
      setIsEdit(false);
      setEditId(null);

      setForm({
        parent_id: "",
        kode: "",
        uraian: "",
        satuan: "",
        volume: "",
        ppn: 11,
        tipe: "item"
      });

      fetchBoq(selectedVersion?.id);

    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Gagal menyimpan data");
    }
  };

  const fetchAnalisa = async () => {
    const res = await api.get(`/project-analisa?project_id=${id}`);
    setAnalisaList(res.data);
  };


  const fetchProject = async () => {
    const res = await api.get(`/projects/${id}`);
    setProject(res.data);
  };

const fetchBoq =
  async (versionId) => {

    const activeVersionId =
      versionId || selectedVersion?.id || 0;

    const res =
      await api.get(

        `/boq/project/${id}/${activeVersionId}`

      );

    setBoq(
      res.data.data
    );

    setAnalytics({

      totalHargaSatuan:
        res.data.totalHargaSatuan,

      totalJumlah:
        res.data.totalJumlah,

      totalGrandTotal:
        res.data.totalGrandTotal,

      totalBobot:
        res.data.totalBobot,

      totalHargaSatuan_rp:
        res.data.totalHargaSatuan_rp,

      totalJumlah_rp:
        res.data.totalJumlah_rp,

      totalGrandTotal_rp:
        res.data.totalGrandTotal_rp

    });

  };

  const handleSelectAnalisa = async (index, analisa_id) => {
    const res = await api.get(`/project-analisa-detail/${analisa_id}`);

    const updated = [...bulkItems];
    updated[index].analisa_id = analisa_id;
    updated[index].harga_preview = res.data.harga_satuan_pekerjaan ?? res.data.pembulatan ?? res.data.grandTotal; // 🔥 hanya preview

    setBulkItems(updated);
  };

  const round2 = (num) => Math.round(num * 100) / 100;
  const harga = Number(form.harga_satuan) || 0;
  const volume = Number(form.volume) || 0;
  const ppn = Number(form.ppn) || 0;
  const pajak_satuan = round2((harga * ppn) / 100);
  const harga_plus_pajak = round2(harga + pajak_satuan);
  const jumlah_ppn = round2(harga_plus_pajak * volume);


  // Header Analytics Data
  const itemOnly = boq.filter(item => item.tipe === "item");
  const totalHargaSatuan = itemOnly.reduce((acc, curr) => acc + Number(curr.harga_satuan || 0), 0);
  const totalJumlah = Number(
    (
      itemOnly.reduce(
        (acc, curr) => acc + Number(curr.jumlah || 0),
        0
      )
    ).toFixed(6)
  );
  const totalGrandTotal = itemOnly.reduce((acc, curr) => acc + Number(curr.jumlah_ppn || 0), 0);
  const totalBobot = itemOnly.reduce((sum, item) => sum + Number(item.bobot || 0), 0);

  const formatBoqMoney = (value) => Number(value || 0).toLocaleString("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  const getDisplayJumlah = (item) => Number(item.jumlah_raw ?? item.jumlah ?? 0);

  const getDisplayGrandTotal = (item) => Number(item.jumlah_ppn_raw ?? item.jumlah_ppn ?? 0);

  const totalJumlahTampil = itemOnly.reduce(
    (acc, curr) => acc + getDisplayJumlah(curr),
    0
  );

  const totalGrandTotalTampil = itemOnly.reduce(
    (acc, curr) => acc + getDisplayGrandTotal(curr),
    0
  );


  const totalBulat = totalGrandTotalTampil;
  const nilaiKontrak = Number(project?.nilai_kontrak || 0);
  const selisihKontrak = nilaiKontrak - totalBulat;
  const absSelisihKontrak = Math.abs(selisihKontrak);
  const candidateItems = itemOnly.filter(item => Number(item.jumlah_ppn_raw ?? item.jumlah_ppn ?? 0) > 0);
  const recommendedBySmallestBobot = [...candidateItems].sort((a, b) => {
    const bobotA = Number(a.bobot || 0);
    const bobotB = Number(b.bobot || 0);
    if (bobotA !== bobotB) return bobotA - bobotB;
    return getDisplayGrandTotal(a) - getDisplayGrandTotal(b);
  })[0];
  const recommendedByLargestValue = [...candidateItems].sort(
    (a, b) => getDisplayGrandTotal(b) - getDisplayGrandTotal(a)
  )[0];
  const getAdjustedGrandTotal = (item) => getDisplayGrandTotal(item) + selisihKontrak;

  // Pie Chart Data: Top 5 Items by Bobot
  const pieChartData = useMemo(() => {
    if (!itemOnly.length) return [];
    const sorted = [...itemOnly].sort((a, b) => Number(b.bobot) - Number(a.bobot));
    const top5 = sorted.slice(0, 5).map(i => ({ name: i.uraian.substring(0, 15) + "...", value: Number(i.bobot) }));
    const others = sorted.slice(5).reduce((acc, curr) => acc + Number(curr.bobot), 0);
    if (others > 0) {
      top5.push({ name: "Lainnya", value: Number(others.toFixed(2)) });
    }
    return top5;
  }, [itemOnly]);

  const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#94A3B8'];

  // === ACCORDION LOGIC ===
  const boqItemMap = useMemo(() => {
    const map = {};
    boq.forEach(item => { map[item.id] = item; });
    return map;
  }, [boq]);

  const getAncestorHeaderId = (item) => {
    if (item.tipe === 'header') return item.id;
    if (!item.parent_id) return null;
    const parent = boqItemMap[item.parent_id];
    if (!parent) return null;
    return getAncestorHeaderId(parent);
  };

  const isItemVisible = (item) => {
    if (item.tipe === 'header') return true;
    const headerId = getAncestorHeaderId(item);
    if (headerId === null) return true;
    return !collapsedHeaders.has(headerId);
  };

  // Jika data belum load

  const fetchVersions = async () => {
    try {
      const res =
        await api.get(
          `/project-versions/project/${id}`
        );
      setVersions(res.data.data);
      // 🔥 default MC0
      if (res.data.data.length > 0) {
        const currentVersion =
          selectedVersion
            ? res.data.data.find(
                version =>
                  Number(version.id) === Number(selectedVersion.id)
              )
            : null;

        setSelectedVersion(
          currentVersion || res.data.data[0]
        );
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchVersionChanges =
    async (versionId) => {
    try {
      const res =
        await api.get(
          `/boq-version-changes/version/${versionId}`
        );
      setVersionChanges(
        res.data.data
      );
    } catch (error) {
      console.error(error);
    }
  };


    useEffect(() => {
    fetchProject();
 
    fetchAnalisa();
    fetchVersions();
  }, [id]);

  useEffect(() => {

  if (selectedVersion) {
    setIsAddendumMode(
      selectedVersion.revision > 0
    );

    fetchBoq(
      selectedVersion.id
    );

    fetchVersionChanges(
      selectedVersion.id
    );

  }

}, [selectedVersion]);


  if (!project) {
    return (
      <div className="p-6 flex justify-center items-center h-[80vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-secondary"></div>
      </div>
    );
  }

  const selectedVersionLabel =
    selectedVersion?.revision > 0
      ? selectedVersion.code
      : "MC0";

  const selectedVersionDescription =
    selectedVersion?.revision > 0
      ? `Addendum aktif mulai minggu ke-${selectedVersion.effective_week || "-"}`
      : "Baseline / kontrak awal";

const handleAddendumItem = async () => {
    try {
        if (!selectedVersion) {
            alert("Pilih addendum");
            return;
        }

        if (!form.parent_id) {
            alert("Pilih parent");
            return;
        }
        const validItems = bulkItems.filter(x => x.uraian && x.analisa_id);

        if (validItems.length === 0) {
            alert("Tidak ada item valid untuk ditambahkan");
            return;
        }

        await Promise.all(
            validItems.map(item => 
                api.post("/boq/addendum/new-item", {
                    version_id: selectedVersion.id,
                    project_id: id,
                    parent_id: form.parent_id,
                    uraian: item.uraian,
                    satuan: item.satuan,
                    volume: Number(item.volume) || 0,
                    analisa_id: item.analisa_id,
                    ppn: Number(item.ppn) || 0
                })
            )
        );
        alert("Item addendum berhasil dibuat");
        setShowModal(false);
        
        // SINKRONISASI DATA TERBARU
        fetchBoq(selectedVersion.id);
        fetchVersionChanges(selectedVersion.id);

    } catch (error) {
        console.error("Error pada handleAddendumItem:", error);
        alert(error.response?.data?.message || "Gagal menambahkan item addendum");
    }
};


  return (
    <>
      <div className="p-6 mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate("/dashboard")}
            className="p-2.5 rounded-xl bg-white shadow-sm border border-gray-100 text-gray-600 hover:text-secondary hover:border-secondary transition-all active:scale-95 cursor-pointer"
          >
            <ArrowLeft size={24} />
          </button>

          <div className="flex items-center gap-3">

          <select
            value={selectedVersion?.id || ""}
            onChange={(e) => {

              const version =
                versions.find(
                  v =>
                    String(v.id) === e.target.value
                );

              setVersionChanges([]);
              setBoq([]);
              setIsAddendumMode(version?.revision > 0);
              setSelectedVersion(version);

            }}
            className="border px-4 py-2 rounded font-semibold">
            {versions.map((v) => (
              <option
                key={v.id}
                value={v.id}
              >
                {v.revision > 0
                  ? `${v.code} - Addendum minggu ${v.effective_week}`
                  : `${v.code} - Baseline`}
              </option>
            ))}
          </select>

          {selectedVersion && (
            <div
              className={`
                px-4 py-2 rounded-xl border text-sm font-bold
                ${
                  selectedVersion.revision > 0
                    ? "bg-orange-50 border-orange-200 text-orange-700"
                    : "bg-blue-50 border-blue-200 text-blue-700"
                }
              `}
            >
              Mode: {selectedVersionLabel}
            </div>
          )}

            {/* Import Excel section */}
            <div className="flex flex-col items-end relative">

              <input type="file" accept=".xlsx,.xls" hidden ref={fileInputRef} onChange={(e) => setImportFile(e.target.files[0])} />

              {importFile && <p className="absolute -top-6 w-max whitespace-nowrap text-sm text-gray-500 text-right">{importFile.name}</p>}

              {importFile ? (
                <button onClick={handleImportBoq} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded font-semibold transition-all active:scale-95">
                  <CheckCircle size={18} /> Simpan Data
                </button>
              ) : (
                <button onClick={handleUploadClick} className="flex items-center gap-2 bg-secondary text-white px-5 py-2.5 rounded font-semibold transition-all hover:bg-white hover:text-secondary border-2 border-transparent hover:border-secondary active:scale-95">
                  <Upload size={18} /> Upload Excel
                </button>
              )}

            </div>

            <button
                onClick={() => {
                    setIsAddendumMode(selectedVersion?.revision > 0);
                    setShowModal(true);
                }}
                className={`
                    flex items-center gap-2 text-white px-5 py-2.5 rounded font-semibold 
                    border-2 active:scale-95 transition-all
                    ${isAddendumMode 
                        ? "bg-orange-500 hover:bg-white hover:text-orange-500 hover:border-orange-500" 
                        : "bg-secondary hover:bg-white hover:text-secondary hover:border-secondary"
                    }
                `}
            >
                <Plus size={20} strokeWidth={2} />
                {selectedVersion?.revision > 0 
                    ? `Tambah Item ${selectedVersion.code}` 
                    : "Tambah BOQ"
                }
            </button>
          </div>
        </div>

        {/* 🔥 Header  */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">

            <div>
            <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-gray-800">
                  Bill of Quantities (BOQ)
                </h1>
                {selectedVersion && (
                  <span
                    className={`
                      px-3 py-1 rounded-full text-sm font-bold
                      ${
                        selectedVersion.revision > 0
                          ? "bg-orange-100 text-orange-700"
                          : "bg-blue-100 text-blue-700"
                      }
                    `}>
                    {selectedVersionLabel}
                  </span>
                )}
              </div>
              <p className="mt-1 text-gray-500">Detail rincian kuantitas dan harga satuan — {project?.pekerjaan}</p>
            </div>
          </div>

        </div>

        {selectedVersion && (
          <div
            className={`
              mb-6 rounded-2xl border p-4 flex flex-col md:flex-row
              md:items-center md:justify-between gap-2
              ${
                selectedVersion.revision > 0
                  ? "bg-orange-50 border-orange-200"
                  : "bg-blue-50 border-blue-200"
              }
            `}
          >
            <div>
              <p
                className={`
                  text-xs font-black uppercase tracking-widest
                  ${
                    selectedVersion.revision > 0
                      ? "text-orange-600"
                      : "text-blue-600"
                  }
                `}
              >
                Version BOQ Aktif
              </p>
              <h2 className="text-xl font-black text-gray-800">
                {selectedVersionLabel}
              </h2>
              <p className="text-sm text-gray-600">
                {selectedVersionDescription}
              </p>
            </div>
            {selectedVersion.description && (
              <div className="text-sm font-semibold text-gray-600">
                {selectedVersion.description}
              </div>
            )}
          </div>
        )}

        {/* 🔥 Analytics / Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Card 1: Total Anggaran */}
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl p-6 shadow-md text-white relative overflow-hidden md:col-span-2">
            <div className="absolute -right-6 -top-6 text-white/10">
              <Wallet size={120} />
            </div>
            <p className="text-blue-100 uppercase tracking-widest text-xs font-bold mb-2">Total Estimasi Harga (+PPN)</p>
            <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight mb-2">
              Rp {formatBoqMoney(totalBulat)}
            </h2>
            <div className="flex items-center gap-2 mt-4 text-sm bg-black/20 w-max px-3 py-1.5 rounded-full backdrop-blur-sm">
              <Calculator size={16} /> Base: Rp {formatBoqMoney(totalJumlahTampil)}
            </div>
            
            {nilaiKontrak > 0 && (
              <div className="mt-4 rounded-2xl bg-white/15 border border-white/20 p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-blue-100">Nilai Kontrak</span>
                  <span className="font-extrabold">Rp {formatBoqMoney(nilaiKontrak)}</span>
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-blue-100">Selisih</span>
                  <span className={`font-extrabold ${selisihKontrak === 0 ? "text-emerald-100" : "text-yellow-100"}`}>
                    {selisihKontrak > 0 ? "+" : selisihKontrak < 0 ? "-" : ""}
                    Rp {formatBoqMoney(absSelisihKontrak)}
                  </span>
                </div>

                {selisihKontrak === 0 ? (
                  <div className="mt-3 rounded-xl bg-emerald-400/20 px-3 py-2 text-xs font-bold text-emerald-50">
                    Total BOQ sudah pas dengan nilai kontrak.
                  </div>
                ) : recommendedBySmallestBobot ? (
                  <div className="mt-3 space-y-2 text-xs">
                    <div className="rounded-xl bg-black/15 px-3 py-2">
                      <div className="font-bold text-blue-100">Saran utama: item bobot terkecil</div>
                      <div className="mt-1 font-semibold">{recommendedBySmallestBobot.kode} - {recommendedBySmallestBobot.uraian}</div>
                      <div className="mt-1 text-blue-100">
                        Bobot {Number(recommendedBySmallestBobot.bobot || 0).toFixed(3)}%,
                        nilai menjadi Rp {formatBoqMoney(getAdjustedGrandTotal(recommendedBySmallestBobot))}
                      </div>
                      {getAdjustedGrandTotal(recommendedBySmallestBobot) <= 0 && (
                        <div className="mt-2 rounded-lg bg-red-500/20 px-2 py-1 font-bold text-red-50">
                          Selisih terlalu besar untuk item ini, gunakan alternatif nilai terbesar.
                        </div>
                      )}
                    </div>
                    {recommendedByLargestValue && recommendedByLargestValue.id !== recommendedBySmallestBobot.id && (
                      <div className="rounded-xl bg-black/10 px-3 py-2">
                        <div className="font-bold text-blue-100">Alternatif: item nilai terbesar</div>
                        <div className="mt-1 font-semibold">{recommendedByLargestValue.kode} - {recommendedByLargestValue.uraian}</div>
                        <div className="mt-1 text-blue-100">
                          Dampak persentase biasanya lebih kecil, nilai menjadi Rp {formatBoqMoney(getAdjustedGrandTotal(recommendedByLargestValue))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* Card 2: Jumlah Item */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col justify-center">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-4">
              <PackageCheck size={24} />
            </div>
            <p className="text-gray-500 text-sm font-semibold mb-1">Item Pekerjaan Aktif</p>
            <h3 className="text-3xl font-black text-gray-800">{itemOnly.length}</h3>
          </div>

          {/* Card 3: Distribusi Bobot Chart */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col">
            <p className="text-gray-500 text-sm font-semibold mb-3">Top Bobot Item</p>
            <div className="h-36 w-full">
              {pieChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <RechartsTooltip
                      cursor={false}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(value) => [`${Number(value).toFixed(2)}%`, 'Bobot']}
                    />
                    <Pie data={pieChartData} dataKey="value" nameKey="name" cx="40%" cy="50%" innerRadius={30} outerRadius={55} stroke="none">
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend
                      iconSize={7}
                      iconType="circle"
                      layout="vertical"
                      align="right"
                      verticalAlign="middle"
                      formatter={(value) => <span style={{ fontSize: '10px', color: '#6b7280' }}>{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-xs text-gray-400">Belum ada bobot</div>
              )}
            </div>
          </div>
        </div>



        {/* 🔥 TABLE BOQ */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200">
                <tr>
                  {/* <th className="p-4 text-center uppercase tracking-wider text-xs">No</th> */}
                  <th className="p-4 px-6 uppercase tracking-wider text-xs">Uraian Pekerjaan</th>
                  <th className="p-4 text-center uppercase tracking-wider text-xs">Satuan</th>
                  <th className="p-4 text-right uppercase tracking-wider text-xs">Volume</th>
                  <th className="p-4 text-right uppercase tracking-wider text-xs">Harga Satuan</th>
                  <th className="p-4 text-right uppercase tracking-wider text-xs">Jumlah</th>
                  <th className="p-4 text-center uppercase tracking-wider text-xs">PPN</th>
                  <th className="p-4 text-right uppercase tracking-wider text-xs">Grand Total</th>
                  <th className="p-4 text-right px-6 uppercase tracking-wider text-xs">Bobot</th>
                  <th className="p-4 text-right px-6 uppercase tracking-wider text-xs">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">

                {/* 🔥 EMPTY */}
                {boq.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-gray-400">
                      Belum ada rincian Bill of Quantities untuk proyek ini.
                    </td>
                  </tr>
                )}

                {boq.filter(isItemVisible).map((item) => {

                  // =========================
                  // 🔷 HEADER (Accordion)
                  // =========================
                  if (item.tipe === "header") {
                    const isCollapsed = collapsedHeaders.has(item.id);
                    return (

                      <tr
                        key={item.id}
                        className="bg-slate-800 border-b cursor-pointer hover:bg-slate-700 transition-colors select-none"
                        onClick={() => toggleHeader(item.id)}
                      >
                        <td colSpan={9} className="p-4 font-black text-white uppercase text-sm tracking-wide">

                          <div className="flex items-center gap-3">
                            <m.div
                              animate={{ rotate: isCollapsed ? -90 : 0 }}
                              transition={{ duration: 0.2, ease: "easeOut" }}
                              initial={{ rotate: 0 }}
                              exit={{ rotate: 0 }}
                            >
                              <ChevronDown size={18} className="text-slate-300" />
                            </m.div>
                            <span>🔷 {item.kode} - {item.uraian}</span>

                          </div>
                        </td>
                      </tr>
                    );
                  }

                  // =========================
                  // 🔹 SUBHEADER
                  // =========================
                  if (item.tipe === "subheader") {
                    return (
                      <tr key={item.id} className="bg-slate-100 border-b">
                        <td colSpan={9} className="p-3 pl-8 font-bold text-gray-700 text-xs">
                          🔹 {item.kode} - {item.uraian}
                        </td>
                      </tr>
                    );
                  }

                  // =========================
                  // 📌 ITEM
                  // =========================
                  return (
                    <tr key={item.id} className="hover:bg-blue-50/40 transition-colors group">

                      {/* URAIAN */}
                    <td
                      className="p-3 text-gray-700 font-semibold"
                      style={{ paddingLeft: `${item.level * 20 + 16}px` }}
                    >
                      <div className="flex items-center">
                        {item.uraian}

                        {/* Indikator jika ada perubahan (Addendum) */}
                        {versionChanges.some(v => v.boq_item_id === item.id) && (
                          <span className="ml-2 text-[10px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-medium tracking-wide">
                            ADD
                          </span>
                        )}
                      </div>
                    </td>

                      {/* SATUAN */}
                      <td className="p-3 text-center text-gray-400 text-xs">
                        {item.satuan || "-"}
                      </td>

                      {/* VOLUME */}
                      <td className="p-3 text-right font-medium text-gray-700">
                        {item.volume
                          ? Number(item.volume).toLocaleString("id-ID")
                          : "-"}
                      </td>

                      {/* HARGA SATUAN */}
                      <td className="p-3 text-right font-medium text-gray-700">
                        {item.harga_satuan
                          ? Number(item.harga_satuan).toLocaleString("id-ID")
                          : "-"}
                      </td>

                      {/* JUMLAH */}
                    <td className="p-3 text-right text-gray-600">
                      {Number(item.jumlah_raw ?? item.jumlah ?? 0)
                        ? formatBoqMoney(getDisplayJumlah(item))
                        : "-"}
                    </td>

                      {/* PPN */}
                      <td className="p-3 text-center">
                        <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs font-bold border">
                          {item.ppn || 0}%
                        </span>
                      </td>

                      {/* GRAND TOTAL */}
                      <td className="p-3 text-right font-bold text-blue-600">
                        {Number(item.jumlah_ppn_raw ?? item.jumlah_ppn ?? 0)
                          ? formatBoqMoney(getDisplayGrandTotal(item))
                          : "-"}
                      </td>

                      {/* BOBOT */}
                      <td className="p-3 text-right">
                        {item.bobot ? (
                          <span className="bg-amber-50 text-amber-700 px-2 py-1 rounded text-xs font-bold border">
                            {Number(item.bobot).toFixed(3)}%
                          </span>
                        ) : "-"}
                      </td>

                      {/* AKSI */}
                      <td className="p-3 text-center group-hover:opacity-100 opacity-0 transition-all">
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => openLinkAnalisa(item)}
                            className="bg-purple-100 text-purple-600 px-2 py-1 rounded text-xs cursor-pointer hover:bg-purple-200 transition-colors"
                          >
                            Link
                          </button>

                          {selectedVersion?.revision > 0 && !versionChanges.some(v => v.boq_item_id === item.id && v.action === "new") && (
                              <button
                                  onClick={() => openVersionModal(item)}
                                  className="bg-orange-100 text-orange-600 hover:bg-orange-200 px-3 py-1 rounded-lg text-xs font-semibold transition-colors"
                              >
                                  Addendum
                              </button>
                          )}

                          <button
                            onClick={() => handleEdit(item.id)}
                            className="bg-blue-100 text-blue-600 px-2 py-1 rounded text-xs cursor-pointer hover:bg-blue-200 transition-colors"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => handleDeleteBoq(item.id)}
                            className="bg-red-100 text-red-600 px-2 py-1 rounded text-xs cursor-pointer hover:bg-red-200 transition-colors"
                          >
                            Hapus
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })}

                {/* ========================= */}
                {/* 🔶 TOTAL PROJECT */}
                {/* ========================= */}
                <tr className=" text-black font-bold border-t-2 border-muted-gray pt-6">
                  <td colSpan={3} className="p-4 px-6 uppercase text-xs tracking-wider ">
                    🔶 Total Seluruh Pekerjaan
                  </td>

                  <td className="p-4 text-right">
                     {analytics.totalHargaSatuan.toLocaleString("id-ID")}
                  </td>

                    <td className="p-4 text-right text-green-600">
                    {formatBoqMoney(totalJumlahTampil)}
                  </td>

                  <td className="p-4 text-center">-</td>

                  <td className="p-4 text-right text-blue-600">
                     {formatBoqMoney(totalGrandTotalTampil)}
                  </td>

                  <td className="p-4 text-right text-amber-600">
                    {analytics.totalBobot.toLocaleString("id-ID")}%
                  </td>

                  <td></td>
                </tr>

                {/* ========================= */}
                {/* 🔸 PEMBULATAN */}
                {/* ========================= */}
                <tr className=" font-bold ">
                  <td colSpan={6} className="p-3 px-6 text-right uppercase text-xs">
                    Total Tidak Dibulatkan
                  </td>

                  <td className="p-3 text-right">
                    {formatBoqMoney(totalBulat)}
                  </td>

                  <td colSpan={2}></td>
                </tr>

              </tbody>
            </table>
          </div>
        </div>

        {showLinkModal && (
          <AnimatePresence>
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-neutral-600/40 flex items-center justify-center z-50 p-4">

              <m.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ type: "spring", duration: 0.3 }}
                className="bg-white rounded-md w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95">

                {/* HEADER */}
                <div className="px-5 py-4 border-b border-muted-gray flex justify-between items-center">
                  <div></div>
                  <h2 className="font-bold text-gray-800 text-lg">Link Analisa</h2>
                  <button
                    onClick={() => setShowLinkModal(false)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    ✕
                  </button>
                </div>

                {/* BODY */}
                <div className="p-5">

                  {/* 🔍 SEARCH */}
                  <input
                    type="text"
                    placeholder="Cari analisa..."
                    value={searchAnalisa || ""}
                    onChange={(e) => setSearchAnalisa(e.target.value)}
                    className="w-full border-2 border-gray-200 p-2.5 rounded-xl mb-4 focus:border-blue-500 outline-none"
                  />

                  {/* 📋 LIST ANALISA */}
                  <div className="max-h-60 overflow-y-auto space-y-2 pr-1">

                    {analisaList
                      .filter(a =>
                        a.nama.toLowerCase().includes((searchAnalisa || "").toLowerCase())
                      )
                      .map((a) => (
                        <div
                          key={a.id}
                          onClick={() => setSelectedAnalisa(a.id)}
                          className={`p-3 rounded border cursor-pointer transition-all
                  ${selectedAnalisa == a.id
                              ? "bg-blue-50 border-blue-400"
                              : "bg-white border-gray-200 hover:bg-gray-50"}
                `}
                        >
                          <div className="text-sm font-semibold text-gray-800">
                            {a.kode ? `${a.kode} - ` : ""}{a.nama}
                          </div>

                          <div className="text-xs text-gray-400">
                            ID: {a.id}
                          </div>
                          <span className="text-[10px] text-gray-400">
                            Harga Analisa
                          </span>

                          <div className="text-xs text-green-600 font-bold">
                            Rp {a.grandTotal_rp.toLocaleString("id-ID")}
                          </div>
                        </div>
                      ))}

                    {/* kosong */}
                    {analisaList.length === 0 && (
                      <div className="text-center text-gray-400 text-sm py-6">
                        Tidak ada analisa
                      </div>
                    )}

                  </div>

                </div>

                {/* FOOTER */}
                <div className="px-5 py-4 border-t border-muted-gray flex justify-end gap-2">

                  <button
                    onClick={() => setShowLinkModal(false)}
                    className="px-5 py-2.5 bg-gray-200 rounded-md font-semibold cursor-pointer hover:bg-gray-200/80 active:scale-95 "
                  >
                    Batal
                  </button>

                  <button
                    onClick={handleLinkAnalisa}
                    className="px-5 py-2.5 text-white rounded-md font-semibold cursor-pointer bg-secondary hover:bg-secondary/80 active:scale-95"
                  >
                    Simpan
                  </button>

                </div>

              </m.div>
            </m.div>
          </AnimatePresence>
        )}
        {/* 🔥 MODALS */}
        <AnimatePresence>
          {showModal && (
            <m.div
              initial={{ opacity: 0, y: 0 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }} className="fixed inset-0 bg-neutral-600/40 flex items-center justify-center z-50 p-4" onClick={() => {
                setShowModal(false);
                setIsEdit(false);
                setEditId(null);

                setForm({
                  parent_id: "",
                  kode: "",
                  uraian: "",
                  satuan: "",
                  volume: "",
                  ppn: 11,
                  tipe: "item"
                });

      setBulkItems([
        { uraian: "", satuan: "", volume: "", analisa_id: "", ppn: 11 }
      ]);
              }}>
              <m.div
                initial={{ opacity: 0, scale: 0.7, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.7, y: 20 }}
                transition={{ duration: 0.2, type: spring }}
                className="bg-white rounded-md w-full max-w-2xl shadow flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()} 
                >

                <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
                  <div></div>
                  <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">{isEdit
                    ? "Edit Data BOQ"
                    : isAddendumMode
                    ? "Tambah Item Addendum"
                    : "Tambah Data BOQ"}
                  </h2>
                  <button
                    onClick={() => {
                      setShowModal(false);
                      setIsEdit(false);
                      setEditId(null);

                      setForm({
                        parent_id: "",
                        kode: "",
                        uraian: "",
                        satuan: "",
                        volume: "",
                        ppn: 11,
                        tipe: "item"
                      });

                      setBulkItems([
                        { uraian: "", satuan: "", volume: "", analisa_id: "", ppn: 11 }
                      ]);
                    }}
                    className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-xl transition-colors"
                  >
                    <X size={20} strokeWidth={3} />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto">
                  <div className="bg-blue-50 text-blue-800 p-4 rounded-xl mb-6 text-sm border border-blue-100">
                    <p className="font-semibold mb-1">Mekanisme Pengisian:</p>
                    <ul className="list-disc pl-5 opacity-90 space-y-1 text-xs">
                      <li><b>Header/Sub-Header</b>: Sebagai pengelompok utama pekerjaan (Cth: Pekerjaan Persiapan).</li>
                      <li><b>Item Pekerjaan</b>: Pekerjaan spesifik yang memiliki nilai, volume, dan harga.</li>
                    </ul>
                  </div>

                  <div className="grid gap-4 mb-4">
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Tipe Baris</label>
                      <select
                        className="w-full border-2 border-gray-200 rounded-xl p-3 bg-gray-50 text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium"
                        value={form.tipe}
                        onChange={(e) => setForm({ ...form, tipe: e.target.value, parent_id: "", volume: "", harga_satuan: "" })}
                      >
                        <option value="item">Item Pekerjaan (Detail)</option>
                        <option value="subheader">Sub-Header (Sub Kategori)</option>
                        <option value="header">Header Utama (Kategori Utama)</option>
                      </select>
                    </div>

                    {form.tipe !== "header" && (
                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Induk Pekerjaan (Parent)</label>
                        <select
                          className="w-full border-2 border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                          value={form.parent_id}
                          onChange={(e) => setForm({ ...form, parent_id: e.target.value })}
                        >
                          <option value="">-- Pilih Induk Pekerjaan --</option>
                          {boq
                            .filter((item) => item.tipe === "header" || item.tipe === "subheader")
                            .map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.kode} - {item.uraian}
                              </option>
                            ))}
                        </select>
                      </div>
                    )}

                    {(form.tipe === "header" || form.tipe === "subheader") && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-1">
                          <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Kode</label>
                          <input
                            className="w-full border-2 border-gray-200 rounded-xl p-3 font-mono font-bold focus:ring-2 outline-none"
                            placeholder="Ex: A atau A.1"
                            value={form.kode}
                            onChange={(e) => setForm({ ...form, kode: e.target.value })}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Nama / Uraian</label>
                          <input
                            className="w-full border-2 border-gray-200 rounded-xl p-3 font-medium focus:ring-2 outline-none"
                            placeholder="Nama Pekerjaan / Judul Header"
                            value={form.uraian}
                            onChange={(e) => setForm({ ...form, uraian: e.target.value })}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 5. INPUT TEKNIS (Bulk Entry untuk Item) */}
                  {form.tipe === "item" && (
                    <div className="mt-6 border-t border-gray-100 pt-6">
                      <div className="flex justify-between items-center mb-3">
                        <label className="text-sm font-bold text-gray-800 flex items-center gap-2"><FileText size={18} className="text-blue-500" /> Input Item Multiple</label>
                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">{bulkItems.length} Baris</span>
                      </div>

                      <div className="space-y-4">
                        {bulkItems.map((item, index) => (
                          <div key={index} className="bg-gray-50/50 p-4 rounded-2xl border border-gray-200 relative group transition-all hover:border-blue-300 hover:shadow-md">
                            <button
                              type="button"
                              className="absolute -top-3 -right-3 bg-red-100 text-red-600 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white"
                              onClick={() => setBulkItems(bulkItems.filter((_, i) => i !== index))}
                              title="Hapus Baris"
                            >
                              <Trash2 size={16} />
                            </button>



                            <div className="mb-3">
                              <input
                                className="w-full border-2 border-gray-200 p-2.5 rounded-xl font-medium focus:border-blue-500 outline-none"
                                placeholder="Uraian Rinci Pekerjaan"
                                value={item.uraian}
                                onChange={(e) => handleBulkChange(index, "uraian", e.target.value)}
                              />
                            </div>

                            <div>
                              <label className="text-[10px] uppercase text-gray-500 font-bold mb- block">
                                Analisa
                              </label>

                              <div className="mb-3">
                                <select
                                  className="w-full border-2 border-gray-200 p-2.5 pr-10 text-sm rounded-xl 
                                        bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 
                                        font-medium text-gray-700 appearance-none transition-all"
                                  value={item.analisa_id}
                                  onChange={(e) => {
                                    const value = e.target.value;

                                    handleBulkChange(index, "analisa_id", value);
                                    handleSelectAnalisa(index, value);
                                  }}
                                >
                                  <option value="" className="text-gray-400">
                                    Pilih Analisa
                                  </option>

                                  {analisaList.map((a) => (
                                    <option key={a.id} value={a.id}>
                                      {a.kode ? `${a.kode} - ` : ""}{a.nama}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            <div className="grid grid-cols-4 gap-3">
                              <div>
                                <label className="text-[10px] uppercase text-gray-500 font-bold mb-1 block">Satuan</label>
                                <input
                                  className="w-full border-2 border-gray-200 p-2 text-sm rounded-lg outline-none focus:border-blue-500"
                                  placeholder="m2, ls"
                                  value={item.satuan}
                                  onChange={(e) => handleBulkChange(index, "satuan", e.target.value)}
                                />
                              </div>
                              <div>
                                <label className="text-[10px] uppercase text-gray-500 font-bold mb-1 block">PPN (%)</label>
                                <input
                                  type="number"
                                  className="w-full border-2 border-gray-200 p-2 text-sm rounded-lg outline-none focus:border-blue-500"
                                  placeholder="11"
                                  value={item.ppn}
                                  onChange={(e) => handleBulkChange(index, "ppn", e.target.value)}
                                />
                              </div>
                              <div>
                                <label className="text-[10px] uppercase text-gray-500 font-bold mb-1 block">Volume</label>
                                <input
                                  type="number"
                                  className="w-full border-2 border-gray-200 p-2 text-sm rounded-lg outline-none focus:border-blue-500"
                                  placeholder="10.5"
                                  value={item.volume}
                                  onChange={(e) => handleBulkChange(index, "volume", e.target.value)}
                                />
                              </div>
                              <div>
                                <label className="text-[10px] uppercase text-gray-500 font-bold mb-1 block">
                                  Harga Satuan
                                </label>

                                <div className="relative">
                                  <input
                                    value={
                                      item.harga_preview
                                        ? "Rp " + Number(item.harga_preview).toLocaleString("id-ID")
                                        : "-"
                                    }
                                    disabled
                                    className={`w-full border-2 p-2.5 text-sm rounded-xl font-bold tracking-wide
                                    ${item.harga_preview
                                        ? "bg-green-50 border-green-200 text-green-700"
                                        : "bg-gray-100 border-gray-200 text-gray-400"}
                                    cursor-not-allowed shadow-inner`}
                                  />

                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                                    Auto
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}

                        {!isEdit && (
                          <button
                            type="button"
                            onClick={addBulkRow}
                            className="w-full py-3 border-2 border-dashed border-blue-300 text-blue-600 text-sm font-bold rounded-2xl hover:bg-blue-50 bg-white transition-colors"
                          >
                            + TAMBAH BARIS PEKERJAAN
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* 7. TOMBOL AKSI */}
                <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-3xl mt-auto">
                  <button
                    onClick={() => {
                      setShowModal(false);
                      setIsEdit(false);
                      setEditId(null);

                      setForm({
                        parent_id: "",
                        kode: "",
                        uraian: "",
                        satuan: "",
                        volume: "",
                        ppn: 11,
                        tipe: "item"
                      });

                      // 🔥 reset bulk juga (opsional tapi bagus)
                      setBulkItems([
                        { uraian: "", satuan: "", volume: "", analisa_id: "", ppn: 11 }
                      ]);
                    }}
                    className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 font-semibold rounded hover:bg-gray-50 transition-all cursor-pointer active:scale-95"
                  >
                    Batal
                  </button>
                  <button
                    onClick={
                    isEdit
                      ? handleSubmit
                      : isAddendumMode
                      ? handleAddendumItem
                      : form.tipe==="item"
                      ? handleBulkSubmit
                      : handleSubmit
                    }
                    className={`px-6 py-2.5 text-white font-semibold rounded flex items-center gap-2 bg-secondary hover:bg-secondary/80 cursor-pointer active:scale-95 transition-all`}
                  >
                    <CheckCircle size={18} />
                    {form.tipe === "item"
                      ? `Simpan ${bulkItems.length} Item`
                      : isEdit
                        ? "Update Data"
                        : "Simpan Data"}
                  </button>
                </div>
              </m.div>
            </m.div>
          )}
        </AnimatePresence>

        {showVersionModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-fade-in">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
              <h2 className="text-xl font-bold mb-5 text-gray-800">Addendum BOQ</h2>

              <div className="space-y-4">
                {/* INPUT: VOLUME */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-gray-700">Volume</label>
                  <input
                    type="number"
                    value={versionForm.volume}
                    onChange={(e) => setVersionForm({ ...versionForm, volume: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    placeholder="Masukkan volume"
                  />
                </div>

                {/* INPUT: HARGA SATUAN */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-gray-700">Harga Satuan</label>
                  <input
                    type="number"
                    value={versionForm.harga_satuan}
                    onChange={(e) => setVersionForm({ ...versionForm, harga_satuan: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    placeholder="Masukkan harga satuan"
                  />
                </div>
              </div>

              {/* FOOTER ACTION BUTTONS */}
              <div className="flex justify-end gap-3 mt-6 border-t border-gray-100 pt-4">
                {editingVersionChange && (
                  <button
                    onClick={() => deleteVersionChange(editingVersionChange.id)}
                    className="mr-auto px-4 py-2 rounded-lg bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 transition-colors"
                  >
                    Hapus
                  </button>
                )}

                <button
                  onClick={() => setShowVersionModal(false)}
                  className="px-4 py-2 rounded-lg bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  Batal
                </button>

                <button
                  onClick={saveVersionChange}
                  className="px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 shadow-sm shadow-orange-500/20 transition-colors"
                >
                  Simpan
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
