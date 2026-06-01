import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useProject } from "../context/ProjectContext";
import api from "../api";
import { ArrowLeft, TrendingUp, Save, X, Edit, Trash2, PlusCircle, CheckCircle, Search, AlertCircle, ChevronLeft, ChevronRight, Calendar, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useRef } from "react";
import { m } from "framer-motion";
import {
  Upload,
  Pencil,
  ImagePlus
} from "lucide-react";


export default function DailyProgressPage() {
  const { id: paramId } = useParams();
  const { selectedProject } = useProject();
  const id = selectedProject?.id || paramId;
  const navigate = useNavigate();
  const [dailyPlan, setDailyPlan] = useState([]);
  const [editId, setEditId] = useState(null);

  const [searchBoqQuery, setSearchBoqQuery] = useState("");
  const [isBoqDropdownOpen, setIsBoqDropdownOpen] = useState(false);

  const [showPreview, setShowPreview] = useState(false);

  const [expanded, setExpanded] = useState({});

  //upload foto
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedProgress, setSelectedProgress] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [uploadFiles, setUploadFiles] = useState([]);
  const [editPhotoId, setEditPhotoId] = useState(null);


  // --- States ---
  const [boqList, setBoqList] = useState([]);
  const [versions, setVersions] = useState([]);
  const [data, setData] = useState([]);
  const formRef = useRef(null);

  const [previewItems, setPreviewItems] = useState([]);

  const [showHariModal, setShowHariModal] = useState(false);
  const [modeInput, setModeInput] = useState("manual");

  const [form, setForm] = useState({
    boq_id: "",
    hari_ke: "",
    minggu_ke: "",
    persentase: "",
    volume: "",
    cuaca: "Cerah",
    jam_mulai: "08:00",
    jam_selesai: "17:00"
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const itemsPerPage = 10;
  const filteredBoq = boqList.filter(
    b => b.tipe === "item"
  );
  const boqMap = {};
  boqList.forEach(b => {
    boqMap[b.id] = b;
  });


  // ================= FETCH DATA =================
  const fetchData = async () => {
    try {
      const res = await api.get(`/daily-progress?project_id=${id}`);
      setData(res.data.filter((d) => d.project_id == id));
      setCurrentPage(1); // Reset to page 1 on new fetch
    } catch (err) {
      console.error("Gagal fetch progress", err);
    }
  };

  const getFormWeek = () => {
    if (modeInput === "weekly" && form.minggu_ke) {
      return Number(form.minggu_ke);
    }

    if (form.hari_ke) {
      const plan =
        dailyPlan.find(
          item =>
            Number(item.hari_ke) ===
            Number(form.hari_ke)
        );

      return Number(plan?.minggu_ke || 0);
    }

    return 0;
  };

  const getActiveVersionIdByWeek = (weekNumber) => {
    if (!weekNumber || versions.length === 0) {
      return 0;
    }

    const activeVersion =
      [...versions]
        .sort(
          (a, b) =>
            Number(a.effective_week || 1) -
            Number(b.effective_week || 1)
        )
        .filter(
          version =>
            Number(weekNumber) >=
            Number(version.effective_week || 1)
        )
        .at(-1);

    return activeVersion?.id || 0;
  };

  const fetchVersions = async () => {
    try {
      const res =
        await api.get(
          `/project-versions/project/${id}`
        );

      setVersions(res.data.data || []);
    } catch (err) {
      console.log("Gagal fetch versi", err);
    }
  };

  const fetchBoq = async (versionId = 0) => {
  try {

    const res = await api.get(
      `/boq/project/${id}/${versionId}`
    );

    setBoqList(
      res.data.data || []
    );

  } catch (err) {

    console.log(
      "Gagal fetch BOQ",
      err
    );

  }
};

  const fetchDailyPlan = async () => {
    try {
      const res = await api.get(`/daily-plan/${id}`);
      setDailyPlan(res.data);
    } catch (err) {
      console.error("Gagal ambil daily plan", err);
    }
  };



  useEffect(() => {
    fetchData();
    fetchVersions();
    fetchDailyPlan();
  }, [id]);

  useEffect(() => {
    const weekNumber =
      getFormWeek();
    const versionId =
      getActiveVersionIdByWeek(weekNumber);

    fetchBoq(versionId);
  }, [
    id,
    versions,
    dailyPlan,
    form.hari_ke,
    form.minggu_ke,
    modeInput
  ]);

  useEffect(() => {
    if (!form.boq_id) {
      return;
    }

    const boq =
      boqList.find(
        b =>
          Number(b.id) === Number(form.boq_id) ||
          Number(b.boq_item_id) === Number(form.boq_id)
      );

    if (boq) {
      setSearchBoqQuery(
        `${boq.kode ? boq.kode + " - " : ""}${boq.uraian}`
      );
    }
  }, [boqList, form.boq_id]);



  const loadPreviewAnalisa = async (boq_id, volume) => {
    try {
      if (!boq_id) return;

      const boq = boqList.find(b => b.id == boq_id);
      if (!boq || !boq.analisa_id) return;

      const res = await api.get(`/project-analisa-detail/${boq.analisa_id}`);
      const analisa = res.data;

      const allItems = [
        ...(analisa.tenaga || []),
        ...(analisa.bahan || []),
        ...(analisa.alat || [])
      ];

      const result = allItems.map(item => {
        let rawKoef = item.koefisien;
        if (!rawKoef) rawKoef = item.koef;
        const koef = parseFloat(String(rawKoef).replace(",", ".")) || 0;
        const volNum = parseFloat(volume) || 0;

        const hasil = koef * volNum;

        return {
          nama: item.nama,
          tipe: item.tipe,
          satuan: item.satuan,
          koef,
          hasil: hasil.toFixed(3)
        };
      });

      setPreviewItems(result);

    } catch (err) {
      console.log("Preview error", err);
    }
  };


  useEffect(() => {
    if (form.boq_id) {
      loadPreviewAnalisa(form.boq_id, form.volume);
    }
  }, [form.boq_id, form.volume]);

  const handleCopy = (item) => {
    
    const plan = dailyPlan.find(
      (d) => d.tanggal === item.tanggal
    );

    setForm({
      boq_id: item.boq_id,
      hari_ke: plan?.hari_ke || "",
      volume: item.volume,

      cuaca: item.cuaca || "",
      jam_mulai: item.jam_mulai || "",
      jam_selesai: item.jam_selesai || ""
    });
    
    setEditId(null);

    const boq = boqList.find(b => b.id === item.boq_id);

    if (boq) {
      setSearchBoqQuery(
        `${boq.kode ? boq.kode + " - " : ""}${boq.uraian}`
      );
    }

    formRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  };

  const handleEdit = (item) => {
    setEditId(item.id);

    // cari hari_ke dari dailyPlan berdasarkan tanggal
    const plan = dailyPlan.find(
      (d) => d.tanggal === item.tanggal
    );

      const boq = boqList.find(b => b.id == item.boq_id);

    setForm({
      boq_id: item.boq_id,
      hari_ke: plan?.hari_ke || "",
      volume: item.volume,

      cuaca: item.cuaca || "",
      jam_mulai: item.jam_mulai || "",
      jam_selesai: item.jam_selesai || ""
    });

      if (boq) {
      setSearchBoqQuery(
        `${boq.kode ? boq.kode + " - " : ""}${boq.uraian}`
      );
    }


   formRef.current?.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
  };

  const handleDelete = async (id) => {
    const confirm = window.confirm("Yakin mau hapus data ini?");
    if (!confirm) return;

    try {
      await api.delete(`/daily-progress/${id}`);
      alert("✅ Berhasil dihapus");

      fetchData(); // refresh data
    } catch (err) {
      alert("❌ Gagal hapus");
    }
  };

  // ================= SUBMIT =================
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {

      // WEEKLY
      if (modeInput === "weekly") {

        const payload = {
          project_id: id,
          boq_id: form.boq_id,
          minggu_ke: form.minggu_ke,
          ...(isIntegerWeeklyBoq
            ? { volume: form.volume }
            : { persentase: form.persentase }),
          cuaca: form.cuaca,
          jam_mulai: form.jam_mulai,
          jam_selesai: form.jam_selesai
        };

        await api.post(
          "/daily-progress/weekly",
          payload
        );

        alert("✅ Generate Weekly berhasil!");
      }

      // MANUAL
      else {

        const payload = {
          project_id: id,
          boq_id: form.boq_id,
          hari_ke: form.hari_ke,
          volume: form.volume,
          cuaca: form.cuaca,
          jam_mulai: form.jam_mulai,
          jam_selesai: form.jam_selesai
        };

        // EDIT
        if (editId) {

          await api.put(
            `/daily-progress/${editId}`,
            payload
          );

          alert("✅ Berhasil Update!");

          setEditId(null);
        }

        // CREATE
        else {

          await api.post(
            "/daily-progress",
            payload
          );

          alert("✅ Berhasil Simpan!");
        }
      }

      // REFRESH
      fetchData();

      // RESET
      setForm({
        boq_id: "",
        hari_ke: "",
        minggu_ke: "",
        persentase: "",
        volume: "",
        cuaca: "Cerah",
        jam_mulai: "08:00",
        jam_selesai: "17:00"
      });

      setPreviewItems([]);

      setSearchBoqQuery("");

    } catch (err) {

      alert(
        err.response?.data?.message ||
        "Terjadi kesalahan"
      );
    }
  };

  // ================= SUMMARY LOGIC =================
  const getSummary = () => {

    const boqIdFix =
      form.boq_id ||
      data.find(
        d => d.id === editId
      )?.boq_id;

    if (!boqIdFix) return null;

      const selectedBoq =
        boqList.find(
        b =>
          Number(b.id) === Number(boqIdFix) ||
          Number(b.boq_item_id) === Number(boqIdFix)
        );

    if (!selectedBoq) return null;

    const volumeInput =
      parseFloat(form.volume || 0);

    const currentItem =
      data.find(
        d => d.id === editId
      );

    const volumeLama =
      parseFloat(
        currentItem?.volume || 0
      );

    // 🔥 total progress existing
   const totalSemua =
      data
      .filter(
      d =>
      Number(d.boq_id) === Number(boqIdFix) ||
      Number(d.boq?.id) === Number(boqIdFix)
      )
      .reduce(
      (sum,item)=>
      sum + Number(item.volume || 0),
      0
      );

    // 🔥 edit atau create
    let totalAkumulasi;

    if(editId){

      totalAkumulasi =
        totalSemua -
        volumeLama +
        volumeInput;

    }else{

      totalAkumulasi =
        totalSemua +
        volumeInput;

    }

    // 🔥 target dari BOQ
    const target =
      Number(
        selectedBoq.volume || 0
      );

    const sisa =
      target - totalAkumulasi;

    const persen =
      target > 0
      ? (totalAkumulasi/target)*100
      : 0;

    return {

      uraian:
        selectedBoq.uraian,

      satuan:
        selectedBoq.satuan,

      target,

      lalu:
        totalSemua,

      totalSekarang:
        totalAkumulasi,

      sisa,

      persen

    };

  };

  const summary = getSummary();

  const selectedFormBoq =
    boqList.find(
      b =>
        Number(b.id) === Number(form.boq_id) ||
        Number(b.boq_item_id) === Number(form.boq_id)
    );

  const isWholeNumber = (value) =>
    Math.abs(Number(value) - Math.round(Number(value))) < 0.0000001;

  const isIntegerWeeklyBoq =
    Boolean(selectedFormBoq) &&
    isWholeNumber(selectedFormBoq.volume || 0);

  const formatVolumeValue = (value) => {
    const num = Number(value || 0);

    if (isWholeNumber(num)) {
      return String(Math.round(num));
    }

    return num
      .toFixed(7)
      .replace(/\.?0+$/, "");
  };

  const getRemainingToFull = () => {
    if (!selectedFormBoq) return 0;

    const boqIdFix = form.boq_id;
    const target = Number(selectedFormBoq.volume || 0);

    const totalSemua =
      data
        .filter(
          d =>
            Number(d.boq_id) === Number(boqIdFix) ||
            Number(d.boq?.id) === Number(boqIdFix)
        )
        .reduce(
          (sum, item) =>
            sum + Number(item.volume || 0),
          0
        );

    const currentItem =
      data.find(
        d => d.id === editId
      );

    const volumeLama =
      Number(currentItem?.volume || 0);

    const totalSebelumInput =
      editId
        ? totalSemua - volumeLama
        : totalSemua;

    return Math.max(target - totalSebelumInput, 0);
  };

  const remainingToFull =
    getRemainingToFull();

  const fillRemainingToFull = () => {
    if (!selectedFormBoq) return;

    if (
      modeInput === "weekly" &&
      !isIntegerWeeklyBoq
    ) {
      const target =
        Number(selectedFormBoq.volume || 0);

      const percent =
        target > 0
          ? (remainingToFull / target) * 100
          : 0;

      setForm({
        ...form,
        persentase:
          percent
            .toFixed(7)
            .replace(/\.?0+$/, "")
      });

      return;
    }

    setForm({
      ...form,
      volume:
        formatVolumeValue(remainingToFull)
    });
  };

// ================= GROUP BY TANGGAL =================
const groupedByTanggal = {};

data.forEach(item => {
  const key = new Date(item.tanggal).toDateString(); // 🔥 fix pakai tanggal

  if (!groupedByTanggal[key]) {
    groupedByTanggal[key] = [];
  }

  groupedByTanggal[key].push(item);
});

// 🔥 urut terbaru di atas
const tanggalKeys = Object.keys(groupedByTanggal).sort(
  (a, b) => new Date(b) - new Date(a)
);

// 🔥 ambil current
const currentTanggal = tanggalKeys[currentPage - 1] || null;

const currentItems = currentTanggal
  ? groupedByTanggal[currentTanggal]
  : [];

const totalPages = tanggalKeys.length;



  const paginate = (pageNumber) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  useEffect(() => {
  if (isBoqDropdownOpen) {
    const allOpen = {};
    boqList.forEach(b => {
      if (b.tipe !== "item") {
        allOpen[b.id] = true;
      }
    });
    setExpanded(allOpen);
  }
}, [isBoqDropdownOpen]);

  const buildTree = (boqList) => {
  const map = {};
  boqList.forEach(b => {
    map[b.id] = { ...b, children: [] };
  });

  const tree = [];

  boqList.forEach(b => {
    if (b.parent_id) {
      map[b.parent_id]?.children.push(map[b.id]);
    } else {
      tree.push(map[b.id]);
    }
  });

  return tree;
};

const filterTree = (nodes, query) => {
  if (!query) return nodes;

  return nodes
    .map(node => {
      const text = `${node.kode || ""} ${node.uraian || ""}`.toLowerCase();
      const match = text.includes(query.toLowerCase());

      // 🔥 cek children
      let children = [];
      if (node.children && node.children.length > 0) {
        children = filterTree(node.children, query);
      }

      // 🔥 tampilkan kalau:
      // 1. dia match
      // 2. atau ada child yang match
      if (match || children.length > 0) {
        return {
          ...node,
          children
        };
      }

      return null;
    })
    .filter(Boolean);
};

  const boqTree = buildTree(boqList);

  // 🔥 TARUH DI SINI
  const filteredTree = filterTree(boqTree, searchBoqQuery);

const renderTree = (nodes, level = 0) => {
  return nodes.map(node => {
    const isOpen = expanded[node.id];

    // 🔷 HEADER
    if (node.tipe === "header") {
      return (
        <div key={node.id}>
          <div
            onClick={() =>
              setExpanded(prev => ({
                ...prev,
                [node.id]: !prev[node.id]
              }))
            }
            className="px-4 py-2 text-white bg-slate-800 rounded-md my-1 cursor-pointer text-sm font-semibold"
          >
            {isOpen ? "▼" : "▶"} {node.kode} - {node.uraian}
          </div>

          {isOpen && renderTree(node.children, level + 1)}
        </div>
      );
    }

    // 🔹 SUBHEADER
    if (node.tipe === "subheader") {
      return (
        <div key={node.id}>
          <div
            onClick={() =>
              setExpanded(prev => ({
                ...prev,
                [node.id]: !prev[node.id]
              }))
            }
            className="px-4 py-2 bg-gray-100 rounded-md my-1 cursor-pointer text-sm font-medium"
            style={{ paddingLeft: `${level * 16 + 16}px` }}
          >
            {isOpen ? "▼" : "▶"} {node.kode} - {node.uraian}
          </div>

          {isOpen && renderTree(node.children, level + 1)}
        </div>
      );
    }


    return (
      <div
        key={node.id}
        onClick={() => {
          setForm({
            ...form,
            boq_id: node.id,
            volume: "",
            persentase: ""
          });
          setSearchBoqQuery(`${node.kode} - ${node.uraian}`);
          setIsBoqDropdownOpen(false);
        }}
        className="px-4 py-2 rounded-md hover:bg-blue-50 cursor-pointer text-sm transition"
        style={{ paddingLeft: `${level * 16 + 32}px` }}
      >
        {node.kode} - {node.uraian}
      </div>
    );
  });
};


const groupedByWeek = {};

dailyPlan.forEach((d) => {
  // 🔥 hitung minggu (1 minggu = 7 hari)
  const week = Math.ceil(d.hari_ke / 7);

  if (!groupedByWeek[week]) {
    groupedByWeek[week] = [];
  }

  groupedByWeek[week].push(d);
});

const buildRows = () => {

  // 🔥 PAKAI currentItems
  if (!currentItems.length) return [];

  const map = {};

  boqList.forEach((b) => {
    map[Number(b.id)] = b;
  });

  const getParent = (boq) => {

    let header = null;
    let sub = null;

    let current = boq;

    while (current) {

      if (current.tipe === "header") {
        header = current;
      }

      if (current.tipe === "subheader") {
        sub = current;
      }

      current =
        map[Number(current.parent_id)];

    }

    return {
      header,
      sub
    };

  };

  // 🔥 currentItems
  const sortedData = [...currentItems].sort((a, b) => {

    const aKode =
      map[Number(a.boq_id)]?.kode || "";

    const bKode =
      map[Number(b.boq_id)]?.kode || "";

    return aKode.localeCompare(
      bKode,
      undefined,
      {
        numeric: true,
        sensitivity: "base"
      }
    );

  });

  const grouped = {};

  sortedData.forEach((item) => {

    const boq =
      map[Number(item.boq_id)];

    if (!boq) return;

    const {
      header,
      sub
    } = getParent(boq);

    const headerKey =
      header?.id || "no-header";

    const subKey =
      sub?.id || "no-sub";

    // HEADER
    if (!grouped[headerKey]) {

      grouped[headerKey] = {
        header,
        subs: {}
      };

    }

    // SUBHEADER
    if (
      !grouped[headerKey]
        .subs[subKey]
    ) {

      grouped[headerKey]
        .subs[subKey] = {
          sub,
          items: []
        };

    }

    // ITEM
    grouped[headerKey]
      .subs[subKey]
      .items
      .push(item);

  });

  const rows = [];

  Object.values(grouped)
    .forEach((headerGroup) => {

    // HEADER
    if (headerGroup.header) {

      rows.push({
        type: "header",
        label: headerGroup.header.uraian,
        kode: headerGroup.header.kode
      });

    }

    // SUBHEADER
    Object.values(headerGroup.subs)
      .forEach((subGroup) => {

      if (subGroup.sub) {

        rows.push({
          type: "subheader",
          label: subGroup.sub.uraian,
          kode: subGroup.sub.kode
        });

      }

      // ITEMS
      subGroup.items.forEach((item) => {

        rows.push({
          type: "item",
          data: item
        });

      });

    });

  });

  return rows;

};


  const handleOpenPhotos =
  async (item) => {

    try {

      setSelectedProgress(item);

      const res =
        await api.get(
          `/daily-progress/photos/${item.id}`
        );

      setPhotos(res.data);

      setShowPhotoModal(true);

    } catch (err) {

      console.log(err);
    }
  };


  const handleUploadPhotos =
  async () => {

    try {

      const formData =
        new FormData();

            // 🔥 WAJIB
      formData.append(
        "type",
        "project_photo"
      );

      formData.append(
        "daily_progress_id",
        selectedProgress.id
      );

      formData.append(
        "project_id",
        selectedProgress.project_id
      );

      formData.append(
        "boq_id",
        selectedProgress.boq_id
      );

      formData.append(
        "tanggal",
        selectedProgress.tanggal
      );

      uploadFiles.forEach(file => {

        formData.append(
          "photos",
          file
        );

      });

      await api.post(

        "/daily-progress/photos",

        formData,

        {
          headers: {
            "Content-Type":
            "multipart/form-data"
          }
        }
      );

      alert("Upload berhasil");

      handleOpenPhotos(
        selectedProgress
      );

      setUploadFiles([]);

    } catch (err) {

      console.log(err);
    }
  };

  const handleDeletePhoto =
  async (id) => {

    const confirm =
      window.confirm(
        "Hapus foto?"
      );

    if (!confirm) return;

    try {

      await api.delete(
        `/daily-progress/photos/${id}`
      );

      setPhotos(prev =>
        prev.filter(
          p => p.id !== id
        )
      );

    } catch (err) {

      console.log(err);
    }
  };

  const handleEditPhoto =
  async (photoId, file) => {

    try {

      const formData =
        new FormData();

      // 🔥 WAJIB
      formData.append(
        "type",
        "project_photo"
      );

      formData.append(
        "project_id",
        selectedProgress.project_id
      );

      formData.append(
        "boq_id",
        selectedProgress.boq_id
      );

      formData.append(
        "tanggal",
        selectedProgress.tanggal
      );

      formData.append(
        "photo",
        file
      );

      await api.put(

        `/daily-progress/photos/${photoId}`,

        formData,

        {
          headers: {
            "Content-Type":
            "multipart/form-data"
          }
        }
      );

      handleOpenPhotos(
        selectedProgress
      );

      alert(
        "Foto berhasil diupdate"
      );

    } catch (err) {

      console.log(err);
    }
  };



  return (
    <>
      <div className="p-6  mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">

        {/* HEADER */}
        <div ref={formRef} className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/dashboard")}
              className="p-2.5 rounded-xl bg-white shadow flex items-center justify-center border border-gray-100 hover:bg-gray-50 transition-colors active:scale-95"
            >
              <ArrowLeft size={24} className="text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <TrendingUp className="text-yellow-500" /> Daily Progress Laporan
              </h1>
              <p className="text-sm text-gray-500">Laporkan capaian volume harian di lapangan</p>
            </div>
          </div>


        </div>

        {/* ================= FORM ================= */}
        <form onSubmit={handleSubmit} className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 mb-8 relative overflow-hidden">
          {/* Deco background */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/50 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl pointer-events-none"></div>

          <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2 relative z-10"><Edit size={20} className="text-blue-500" /> Entri Data Progres Fisik</h2>
          <div className="flex gap-2 mb-6">
            <button
              type="button"
              onClick={() =>
                setModeInput("manual")
              }
              className={`
                px-4 py-2 rounded-xl text-sm font-bold
                ${
                  modeInput === "manual"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100"
                }
              `}
            >
              Manual
            </button>

            <button
              type="button"
              onClick={() =>
                setModeInput("weekly")
              }
              className={`
                px-4 py-2 rounded-xl text-sm font-bold
                ${
                  modeInput === "weekly"
                    ? "bg-green-600 text-white"
                    : "bg-gray-100"
                }
              `}
            >
              Generate Mingguan
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">

            {/* =========================
                BOQ
            ========================= */}
            <button
              type="button"
              onClick={() => setIsBoqDropdownOpen(true)}
              className="w-full text-left border border-gray-200 bg-gray-50 p-3.5 rounded-xl"
            >
              {form.boq_id
                ? searchBoqQuery
                : "Pilih Pekerjaan BOQ"}
            </button>

            {/* =========================
                MODE MANUAL
            ========================= */}
            {modeInput === "manual" && (
              <>
                {/* HARI */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Pilih Hari
                  </label>

                  <div
                    onClick={() => setShowHariModal(true)}
                    className="border border-gray-200 bg-gray-50 p-3 rounded-xl cursor-pointer hover:bg-white transition"
                  >
                    {form.hari_ke ? (
                      <span>
                        Hari ke-{form.hari_ke}
                      </span>
                    ) : (
                      <span className="text-gray-400">
                        -- Pilih Hari --
                      </span>
                    )}
                  </div>
                </div>

                {/* VOLUME */}
                <div className="flex flex-col">

                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block">
                    Volume Dikerjakan (Output)
                  </label>

                  <div className="relative">

                    <input
                      type="number"
                      step="any"
                      placeholder="0.00"

                      value={form.volume}

                      onChange={(e) =>
                        setForm({
                          ...form,
                          volume: e.target.value
                        })
                      }

                      className="
                        w-full
                        border-2
                        border-green-200
                        rounded-xl
                        p-3
                        pl-4
                        pr-16
                        bg-green-50/30
                        focus:bg-white
                        focus:border-green-500
                        font-bold
                        text-green-700
                        outline-none
                        transition-all
                      "

                      required
                    />

                    <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-green-600 font-bold text-sm">
                      {summary
                        ? summary.satuan
                        : "Vol"}
                    </div>

                  </div>

                  {summary && (
                    <button
                      type="button"
                      onClick={fillRemainingToFull}
                      disabled={remainingToFull <= 0}
                      className="
                        mt-2
                        w-full
                        rounded-xl
                        border
                        border-green-200
                        bg-green-50
                        px-3
                        py-2
                        text-xs
                        font-bold
                        text-green-700
                        hover:bg-green-100
                        disabled:cursor-not-allowed
                        disabled:opacity-50
                      "
                    >
                      Isi Sisa 100%: {formatVolumeValue(remainingToFull)} {summary.satuan}
                    </button>
                  )}
                </div>
              </>
            )}

            {/* =========================
                MODE WEEKLY
            ========================= */}
            {modeInput === "weekly" && (
              <>
                {/* MINGGU */}
                <div>

                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Pilih Minggu
                  </label>

                  <select

                    value={form.minggu_ke}

                    onChange={(e) =>
                      setForm({
                        ...form,
                        minggu_ke:
                          e.target.value
                      })
                    }

                    className="
                      w-full
                      border-2
                      border-blue-200
                      rounded-xl
                      p-3
                    "
                  >

                    <option value="">
                      -- Pilih Minggu --
                    </option>

                    {Object.keys(groupedByWeek).map((w) => (
                      <option key={w} value={w}>
                        Minggu ke-{w}
                      </option>
                    ))}

                  </select>
                </div>

                {/* PROGRESS MINGGUAN */}
                <div>

                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    {isIntegerWeeklyBoq
                      ? "Jumlah Volume Minggu Ini"
                      : "Persentase Progress"}
                  </label>

                  <div className="relative">

                    <input
                      type="number"
                      step={isIntegerWeeklyBoq ? "1" : "any"}
                      min="0"

                      placeholder={isIntegerWeeklyBoq ? "4" : "50"}

                      value={
                        isIntegerWeeklyBoq
                          ? form.volume
                          : form.persentase
                      }

                      onChange={(e) =>
                        setForm({
                          ...form,
                          volume:
                            isIntegerWeeklyBoq
                              ? e.target.value
                              : form.volume,
                          persentase:
                            isIntegerWeeklyBoq
                              ? form.persentase
                              : e.target.value
                        })
                      }

                      className="
                        w-full
                        border-2
                        border-blue-200
                        rounded-xl
                        p-3
                        pr-10
                      "
                    />

                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-500 font-bold">
                      {isIntegerWeeklyBoq
                        ? selectedFormBoq?.satuan || "Vol"
                        : "%"}
                    </div>

                  </div>

                  {summary && (
                    <button
                      type="button"
                      onClick={fillRemainingToFull}
                      disabled={remainingToFull <= 0}
                      className="
                        mt-2
                        w-full
                        rounded-xl
                        border
                        border-blue-200
                        bg-blue-50
                        px-3
                        py-2
                        text-xs
                        font-bold
                        text-blue-700
                        hover:bg-blue-100
                        disabled:cursor-not-allowed
                        disabled:opacity-50
                      "
                    >
                      {isIntegerWeeklyBoq
                        ? `Isi Sisa 100%: ${formatVolumeValue(remainingToFull)} ${summary.satuan}`
                        : `Isi Persen Sisa 100%: ${
                            selectedFormBoq?.volume
                              ? ((remainingToFull / Number(selectedFormBoq.volume || 1)) * 100)
                                  .toFixed(3)
                              : "0.000"
                          }%`}
                    </button>
                  )}
                </div>
              </>
            )}

            {/* =========================
                CUACA
            ========================= */}
            <div className="flex flex-col">

              <label className="text-xs font-bold text-gray-500 mb-2">
                Cuaca
              </label>

              <select

                value={form.cuaca}

                onChange={(e) =>
                  setForm({
                    ...form,
                    cuaca:
                      e.target.value
                  })
                }

                className="
                  border-2
                  border-gray-200
                  rounded-xl
                  p-3
                "
              >

                <option value="">
                  -- Pilih Cuaca --
                </option>

                <option value="Cerah">
                  Cerah
                </option>

                <option value="Mendung">
                  Mendung
                </option>

                <option value="Hujan">
                  Hujan
                </option>

              </select>
            </div>

            {/* JAM MULAI */}
            <div className="flex flex-col">

              <label className="text-xs font-bold text-gray-500 mb-2">
                Jam Mulai
              </label>

              <input
                type="time"

                value={form.jam_mulai}

                onChange={(e) =>
                  setForm({
                    ...form,
                    jam_mulai:
                      e.target.value
                  })
                }

                className="
                  border-2
                  border-gray-200
                  rounded-xl
                  p-3
                "
              />
            </div>

            {/* JAM SELESAI */}
            <div className="flex flex-col">

              <label className="text-xs font-bold text-gray-500 mb-2">
                Jam Selesai
              </label>

              <input
                type="time"

                value={form.jam_selesai}

                onChange={(e) =>
                  setForm({
                    ...form,
                    jam_selesai:
                      e.target.value
                  })
                }

                className="
                  border-2
                  border-gray-200
                  rounded-xl
                  p-3
                "
              />
            </div>

          </div>

          {/* ================= SUMMARY CARD ================= */}
          {summary && (
            <div className="mt-8 bg-blue-50/80 p-6 rounded-2xl border border-blue-200 relative z-10 transition-all duration-500 animate-in fade-in slide-in-from-top-4">
              <h2 className="text-blue-800 font-bold text-sm mb-4 uppercase tracking-wider flex items-center gap-2">
                <Search size={16} /> Informasi Target BOQ: <span className="text-blue-900 border-b border-blue-300 pb-0.5">{summary.uraian}</span>
              </h2>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-xs text-blue-500 font-bold uppercase tracking-wide mb-1">Rencana/Target BOQ</p>
                  <p className="font-black text-2xl text-blue-900">
                    {summary.target} <span className="text-sm font-bold text-blue-500">{summary.satuan}</span>
                  </p>
                </div>

                <div>
                  <p className="text-xs text-blue-500 font-bold uppercase tracking-wide mb-1">Total Termasuk Hari Ini</p>
                  <p className="font-black text-2xl text-blue-600">
                    {summary.totalSekarang.toFixed(3)} <span className="text-sm font-bold text-blue-400">{summary.satuan}</span>
                  </p>
                  <p className="text-xs text-blue-400/80 font-medium mt-1">Stok S/d Kemarin: {summary.lalu.toFixed(3)}</p>
                </div>

                <div>
                  <p className="text-xs text-blue-500 font-bold uppercase tracking-wide mb-1">Sisa Pekerjaan Belum Dikerjakan</p>
                  <p className={`font-black text-2xl ${summary.sisa <= 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                    {summary.sisa.toFixed(3)} <span className={`text-sm font-bold ${summary.sisa <= 0 ? 'text-red-400' : 'text-emerald-400'}`}>{summary.satuan}</span>
                  </p>
                </div>

                <div>
                  <p className="text-xs text-blue-500 font-bold uppercase tracking-wide mb-1">Capaian Progres Realisasi</p>
                  <p className="font-black text-2xl text-blue-700">{summary.persen.toFixed(2)}%</p>
                </div>
              </div>

              {/* Progress Bar Visual */}
              <div className="w-full bg-white/60 rounded-full h-3 mt-5 overflow-hidden border border-blue-100 shadow-inner">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out flex items-center justify-end px-2 ${summary.persen > 100 ? 'bg-red-500' : 'bg-gradient-to-r from-blue-400 to-blue-600'}`}
                  style={{ width: `${Math.min(summary.persen, 100)}%` }}
                >
                  {summary.persen > 10 && <span className="text-[9px] text-white font-bold">{summary.persen.toFixed(0)}%</span>}
                </div>
              </div>
              {summary.persen > 100 && (
                <p className="text-xs font-bold text-red-500 mt-2 flex items-center gap-1"><AlertCircle size={14} /> Peringatan: Volume lapangan melebihi RAB (Over-progress)!</p>
              )}
            </div>
          )}

         <AnimatePresence>
          {isBoqDropdownOpen && (
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 bg-black/40 flex justify-center items-center z-50 p-4"
            >

              <m.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="bg-white w-full max-w-3xl h-[80vh] rounded-xl overflow-hidden flex flex-col shadow-xl"
              >

                {/* HEADER */}
                <div className="flex justify-between items-center p-5 border-b border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-800">
                    Pilih Pekerjaan BOQ
                  </h2>

                  <button
                    type="button"
                    onClick={() => setIsBoqDropdownOpen(false)}
                    className="text-gray-400 hover:text-red-500 hover:bg-gray-100 p-2 rounded-lg transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* SEARCH */}
                <div className="p-4 border-b border-gray-100">
                  <input
                    type="text"
                    placeholder="Cari pekerjaan..."
                    value={searchBoqQuery}
                    onChange={(e) => setSearchBoqQuery(e.target.value)}
                    className="w-full border border-gray-200 bg-gray-50 p-3 rounded-lg 
                      focus:ring-2 focus:ring-blue-300 focus:border-blue-400 
                      outline-none text-sm"
                  />
                </div>

                {/* TREE */}
                <div className="flex-1 overflow-y-auto px-2 py-2">
                  {renderTree(filteredTree)}
                </div>

              </m.div>
            </m.div>
          )}
        </AnimatePresence>

          {showHariModal && (
            <div className="fixed inset-0 z-50 bg-black/40 flex justify-center items-center p-4">

              <div className="bg-white w-full max-w-2xl max-h-[80vh] rounded-2xl shadow-xl flex flex-col overflow-hidden">

                {/* HEADER */}
                <div className="p-4 border-b flex justify-between items-center">
                  <h2 className="font-bold text-gray-800">Pilih Hari</h2>
                  <button onClick={() => setShowHariModal(false)}>✖</button>
                </div>

                {/* LIST */}
                <div className="overflow-y-auto p-4 space-y-4">

                  {Object.keys(groupedByWeek).map((week) => (
                    <div key={week}>

                      {/* HEADER MINGGU */}
                      <div className="font-bold text-sm text-blue-600 mb-2">
                        Minggu ke-{week}
                      </div>

                      {/* LIST HARI */}
                      <div className="grid grid-cols-2 gap-2">

                        {groupedByWeek[week].map((d) => (
                          <div
                            key={d.hari_ke}
                            onClick={() => {
                              setForm({ ...form, hari_ke: d.hari_ke });
                              setShowHariModal(false);
                            }}
                            className="p-3 border rounded-xl cursor-pointer hover:bg-blue-50 transition"
                          >
                            <div className="text-sm font-semibold">
                              Hari ke-{d.hari_ke}
                            </div>

                            <div className="text-xs text-gray-400">
                              {new Date(d.tanggal).toLocaleDateString("id-ID")}
                            </div>
                          </div>
                        ))}

                      </div>

                    </div>
                  ))}

                </div>

              </div>
            </div>
          )}

          {/* ================= DETAIL SECTION (RESOURCE USAGE) ================= */}
           <div className="flex justify-between items-center mt-6">
            <h3 className="text-sm font-semibold text-gray-600">
              Preview Analisa
            </h3>

            <button
              type="button"
              onClick={() => setShowPreview(prev => !prev)}
              className="text-xs px-3 py-1.5 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-600 hover:text-white transition"
            >
              {showPreview ? "Sembunyikan" : "Lihat Preview"}
            </button>
          </div>


          {showPreview && previewItems.length > 0 && (
            <div className="mt-8 bg-white border border-blue-100 rounded-2xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">

              {/* HEADER PREVIEW */}
              <div className="bg-blue-50/50 px-5 py-3 border-b border-blue-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <h3 className="font-bold text-slate-700 tracking-tight">Preview Analisa Kebutuhan</h3>
                </div>
                <span className="text-[10px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full uppercase">
                  Auto Calculation
                </span>
              </div>

              <div className="p-0 overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="text-slate-400 text-[11px] uppercase tracking-widest bg-slate-50/30">
                      <th className="px-5 py-3 font-semibold text-center w-12">No</th>
                      <th className="px-5 py-3 font-semibold">Item Material / Tenaga</th>
                      <th className="px-5 py-3 font-semibold text-center">Tipe</th>
                      <th className="px-5 py-3 font-semibold text-right">Koefisien</th>
                      <th className="px-5 py-3 font-semibold text-center">Volume</th>
                      <th className="px-5 py-3 font-semibold text-right text-blue-600">Total Kebutuhan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {previewItems.map((item, i) => (
                      <tr key={i} className="hover:bg-blue-50/20 transition-colors group">
                        <td className="px-5 py-3 text-center text-slate-400 font-mono text-xs">{i + 1}</td>
                        <td className="px-5 py-3">
                          <span className="font-bold text-slate-700 group-hover:text-blue-700 transition-colors">
                            {item.nama}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${item.tipe === 'BAHAN' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                            item.tipe === 'TENAGA' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                              'bg-emerald-50 text-emerald-600 border-emerald-100'
                            }`}>
                            {item.tipe}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right font-mono text-slate-500 italic">{item.koef}</td>
                        <td className="px-5 py-3 text-center">
                          <span className="bg-slate-100 px-2 py-0.5 rounded font-medium text-slate-600">
                            {form.volume}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex flex-col items-end">
                            <span className="font-black text-blue-600 text-base">
                              {parseFloat(item.hasil || 0).toFixed(2)}
                            </span>
                            <span className="text-[9px] text-slate-400 font-medium uppercase tracking-tighter -mt-1">
                              Estimasi Satuan
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* FOOTER PREVIEW */}
              <div className="px-5 py-3 bg-slate-50 border-t border-slate-100">
                <p className="text-[10px] text-slate-400 italic">
                  *Hasil di atas adalah estimasi murni berdasarkan perkalian Volume x Koefisien AHSP.
                </p>
              </div>
            </div>
          )}

          {/* ACTION BUTTONS */}
          <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-100 relative z-10">
            {editId && (
              <button
                type="button"
                onClick={() => {
                  setEditId(null);
                  setForm({ boq_id: "", hari_ke: "", volume: "" });
                }}
                className="px-6 py-3 rounded-xl bg-gray-200 hover:bg-gray-300"
              >
                <X size={16} /> Batal Edit
              </button>
            )}
            <button className={`px-8 py-3 rounded-xl font-bold text-white transition-all shadow-md hover:shadow-lg active:scale-95 flex items-center gap-2  bg-blue-600 hover:bg-blue-700`}>
              <Save size={18} /> Post Data Progres
            </button>
          </div>
        </form>

       

        {/* ================= TABLE LIST ================= */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-12">
          <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">Riwayat Pelaporan Daily Progress</h2>
            <span className="text-xs font-bold text-gray-500 bg-white border border-gray-200 px-3 py-1 rounded-full">{data.length} Entri</span>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
                <div className="p-4 bg-blue-50 border-b text-sm font-bold text-blue-700">
                
                    {currentTanggal
                      ? new Date(currentTanggal).toLocaleDateString("id-ID", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric"
                        })
                      : "Tidak ada data"}
              
                {currentItems[0]?.tanggal && (
                  <span className="ml-2 text-gray-500 font-normal">
                    ({new Date(currentItems[0].tanggal).toLocaleDateString("id-ID")})
                  </span>
                )}
              </div>
            <table className="w-full text-left text-sm">
              <thead className="bg-white">
                <tr className="text-xs uppercase tracking-wider text-gray-500 border-b border-gray-100">
                  <th className="p-4 pl-6">Tanggal</th>
                  <th className="p-4">Item Pekerjaan BOQ</th>
                  <th className="p-4">Volume</th>
                  <th className="p-4">Foto</th>
                  <th className="p-4 text-center pr-6">Aksi</th>
                </tr>
              </thead>
             <tbody className="divide-y divide-gray-50">
                {buildRows().map((row, i) => {

                    // ================= HEADER =================
                    if (row.type === "header") {
                      return (
                        <tr key={i}>
                          <td colSpan="4" className="px-6 pt-6 pb-2">
                          <div className="flex items-center gap-3">

                              {/* KODE */}
                              <div className="bg-blue-600 text-white text-xs font-black px-3 py-1 rounded-lg shadow">
                                {row.kode || "A"}
                              </div>

                              {/* JUDUL */}
                              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                                {row.label}
                              </h3>

                            </div>

                            <div className="mt-2 h-[2px] bg-gradient-to-r from-blue-300 to-transparent"></div>
                          </td>
                        </tr>
                      );
                    }

                    // ================= SUBHEADER =================
                    if (row.type === "subheader") {
                      return (
                        <tr key={i}>
                          <td colSpan="4" className="px-10 py-2">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>

                              <span className="text-xs font-semibold text-gray-600 uppercase">
                                {row.label}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    // ================= ITEM =================
                    const item = row.data;

                    return (
                      <tr key={i} className="group hover:bg-blue-50/30 transition">

                        {/* TANGGAL */}
                        <td className="p-4 pl-6 text-gray-600 text-sm">
                          {new Date(item.tanggal).toLocaleDateString("id-ID", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric"
                          })}
                        </td>

                        {/* PEKERJAAN */}
                        <td className="p-4 pl-12 text-gray-800 font-semibold">
                          {item.boq?.uraian}
                        </td>

                        {/* VOLUME */}
                        <td className="p-4 text-right">
                          <span className="bg-green-50 text-green-700 font-mono font-bold px-3 py-1 rounded-lg">
                            {Number(item.volume).toFixed(3)}
                          </span>
                        </td>

                        {/* FOTO */}
                        <td className="p-4">
                          <div
                            onClick={() => handleOpenPhotos(item)}
                            className="cursor-pointer group/photo"
                          >
                            {item.photos && item.photos.length > 0 ? (
                              <div className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-white shadow-md">
                                
                                <img
                                  src={`http://localhost:3000/${item.photos[0].photo_url}`}
                                  className="w-full h-full object-cover group-hover/photo:scale-110 transition"
                                />

                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/photo:opacity-100 transition flex items-center justify-center text-white text-xs font-bold">
                                  {item.photos.length} Foto
                                </div>

                              </div>
                            ) : (
                              <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 hover:border-blue-300 hover:text-blue-500 transition">
                                
                                <ImagePlus size={24} />

                                <div className="text-[10px] font-bold">
                                  Upload
                                </div>

                              </div>
                            )}
                          </div>
                        </td>

                        {/* AKSI */}
                        <td className="p-4 text-center pr-6">
                          <div className="flex justify-center gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition">

                            <button
                              onClick={() => handleCopy(item)}
                              className="p-2 rounded-lg bg-green-50 hover:bg-green-100 text-green-600"
                            >
                              <PlusCircle size={18} />
                            </button>

                            <button
                              onClick={() => handleEdit(item)}
                              className="p-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600"
                            >
                              <Edit size={18} />
                            </button>

                            <button
                              onClick={() => handleDelete(item.id)}
                              className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600"
                            >
                              <Trash2 size={18} />
                            </button>


                          </div>
                        </td>

                      </tr>
                    );
                  })}
                {data.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-400 italic font-medium">Belum ada riwayat progres. Coba input data progres yang pertama!</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col md:flex-row items-center justify-between p-5 bg-white border-t border-gray-100 gap-4">
              <div className="text-sm text-gray-500">
                Menampilkan <span className="font-bold text-gray-800">{currentItems.length}</span> data dari total <span className="font-bold text-gray-800">{data.length}</span> entri
              </div>
              <div className="flex items-center gap-2">
                {/* Prev button */}
                <button
                  onClick={() => paginate(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95 bg-white"
                >
                  <ChevronLeft size={16} strokeWidth={2.5} />
                </button>

                {/* Animated Date Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowDateDropdown(prev => !prev)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm shadow-sm hover:bg-blue-700 transition-colors min-w-[180px] justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Calendar size={15} />
                      <span>
                        {currentTanggal
                          ? new Date(currentTanggal).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })
                          : "Pilih Tanggal"}
                      </span>
                    </div>
                    <motion.div animate={{ rotate: showDateDropdown ? 180 : 0 }} transition={{ duration: 0.2 }}>
                      <ChevronDown size={15} />
                    </motion.div>
                  </button>

                  <AnimatePresence>
                    {showDateDropdown && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowDateDropdown(false)} />
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.97 }}
                          transition={{ duration: 0.18, ease: "easeOut" }}
                          className="absolute bottom-full mb-2 left-0 bg-white rounded-xl shadow-2xl border border-gray-100 z-20 overflow-hidden min-w-[220px] max-h-56 overflow-y-auto"
                        >
                          <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pilih Tanggal</p>
                          </div>
                          {tanggalKeys.map((tgl, index) => (
                            <button
                              key={index}
                              onClick={() => { setCurrentPage(index + 1); setShowDateDropdown(false); }}
                              className={`w-full px-4 py-2.5 text-left text-sm transition-colors flex items-center gap-2 ${
                                currentPage === index + 1
                                  ? "bg-blue-600 text-white font-bold"
                                  : "hover:bg-blue-50 text-gray-700"
                              }`}
                            >
                              <Calendar size={13} className={currentPage === index + 1 ? "text-white/70" : "text-gray-400"} />
                              {new Date(tgl).toLocaleDateString("id-ID", { weekday: "short", day: "2-digit", month: "long", year: "numeric" })}
                            </button>
                          ))}
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>

                {/* Next button */}
                <button
                  onClick={() => paginate(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95 bg-white"
                >
                  <ChevronRight size={16} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .custom-scrollbar::-webkit-scrollbar {
          height: 6px;
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f8fafc; 
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1; 
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8; 
        }
      `}} />

      {showPhotoModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex justify-center items-center p-4">
          
          <div className="bg-white w-full max-w-6xl rounded-3xl overflow-hidden shadow-2xl">

            {/* HEADER */}
            <div className="p-5 border-b flex justify-between items-center">
              
              <div>
                <h2 className="text-xl font-bold">
                  Gallery Progress
                </h2>

                <p className="text-sm text-gray-500">
                  Upload dokumentasi proyek
                </p>
              </div>

              <button
                onClick={() => setShowPhotoModal(false)}
                className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center"
              >
                <X size={20} />
              </button>

            </div>


            {/* UPLOAD */}
            <div className="p-5 border-b flex flex-col gap-4">

              <input
                type="file"
                multiple
                onChange={(e) =>
                  setUploadFiles(
                    Array.from(e.target.files)
                  )
                }
              />

              <button
                onClick={handleUploadPhotos}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-bold flex items-center justify-center gap-2"
              >
                <Upload size={18} />
                Upload Foto
              </button>

            </div>


            {/* GALLERY */}
            <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-5 max-h-[70vh] overflow-y-auto">

              {photos.map(photo => (

                <div
                  key={photo.id}
                  className="border rounded-2xl overflow-hidden bg-white shadow-sm"
                >

                  <img
                    src={`http://localhost:3000/${photo.photo_url}`}
                    className="w-full h-52 object-cover"
                  />

                  <div className="p-3 flex gap-2">

                    {/* EDIT */}
                    <label className="flex-1 text-center bg-blue-50 text-blue-600 py-2 rounded-lg cursor-pointer text-sm font-bold flex items-center justify-center gap-2">
                      
                      <Pencil size={16} />

                      Edit

                      <input
                        type="file"
                        hidden
                        onChange={(e) =>
                          handleEditPhoto(
                            photo.id,
                            e.target.files[0]
                          )
                        }
                      />

                    </label>


                    {/* DELETE */}
                    <button
                      onClick={() =>
                        handleDeletePhoto(photo.id)
                      }
                      className="flex-1 bg-red-50 text-red-600 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2"
                    >
                      <Trash2 size={16} />
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
}
