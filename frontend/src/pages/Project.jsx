import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import {
  Check,
  CheckCircle,
  ChevronDown,
  Edit,
  Filter,
  Folder,
  FolderCheck,
  FolderClock,
  Plus,
  Search,
  Trash2,
  X
} from "lucide-react";
import api, { UPLOADS_BASE_URL } from "../api";
import { useProject } from "../context/ProjectContext";

const initialForm = {
  kegiatan: "",
  sub_kegiatan: "",
  pekerjaan: "",
  nama_import: "",
  no_kontrak: "",
  tgl_kontrak: "",
  no_spmk: "",
  tgl_spmk: "",
  end_date: "",
  kontraktor: "",
  konsultan: "",
  waktu_pelaksanaan: "",
  nilai_kontrak: "",
  lokasi: "",
  tahun: "",
  status: "progress",
  status_pengerjaan: "berjalan",
  logo_kontraktor: null,
  logo_konsultan: null,
  logo_client: null
};

const filterOptions = [
  { label: "Semua", value: "all" },
  { label: "Berjalan", value: "progress" },
  { label: "Selesai", value: "completed" }
];

export default function Project() {
  const { user } = useOutletContext() || { user: {} };
  const navigate = useNavigate();
  const { selectedProject, setSelectedProject } = useProject();

  const [projects, setProjects] = useState([]);
  const [progressMap, setProgressMap] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteProject, setDeleteProject] = useState(null);
  const [confirmText, setConfirmText] = useState("");

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (form.tgl_spmk && form.end_date) {
      const start = new Date(form.tgl_spmk);
      const end = new Date(form.end_date);
      const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

      setForm((prev) => ({
        ...prev,
        waktu_pelaksanaan: diffDays > 0 ? diffDays : 0
      }));
    }
  }, [form.tgl_spmk, form.end_date]);

  const fetchProjects = async () => {
    try {
      const res = await api.get("/projects");
      const data = res.data || [];
      setProjects(data);
      fetchProjectProgress(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProjectProgress = async (projectList) => {
    const entries = await Promise.all(
      projectList.map(async (project) => {
        try {
          const res = await api.get(`/daily-plan/weekly-chart/${project.id}`);
          const rows = Array.isArray(res.data) ? res.data : [];
          const latest = [...rows].sort((a, b) => {
            const idDiff = Number(b.id || 0) - Number(a.id || 0);
            if (idDiff !== 0) return idDiff;
            return Number(b.minggu_ke || 0) - Number(a.minggu_ke || 0);
          })[0];

          return [
            project.id,
            {
              progress: Number(latest?.kum_real || 0),
              week: latest?.minggu_ke || null
            }
          ];
        } catch (err) {
          console.error(err);
          return [project.id, { progress: 0, week: null }];
        }
      })
    );

    setProgressMap(Object.fromEntries(entries));
  };

  const formatDate = (date) => {
    if (!date) return "";
    return String(date).split("T")[0];
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditId(null);
  };

  const isCompleted = (project) => {
    const progress = Number(progressMap[project.id]?.progress || 0);
    return (
      project.status === "completed" ||
      project.status_pengerjaan === "selesai" ||
      progress >= 100
    );
  };

  const normalizedProjects = useMemo(() => {
    return projects
      .map((project) => ({
        ...project,
        progress: Number(progressMap[project.id]?.progress || 0),
        latestWeek: progressMap[project.id]?.week,
        completed: isCompleted(project)
      }))
      .sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return Number(b.id || 0) - Number(a.id || 0);
      });
  }, [projects, progressMap]);

  const filteredProjects = normalizedProjects.filter((project) => {
    const keyword = searchQuery.toLowerCase();
    const matchesSearch =
      project.kegiatan?.toLowerCase().includes(keyword) ||
      project.sub_kegiatan?.toLowerCase().includes(keyword) ||
      project.pekerjaan?.toLowerCase().includes(keyword) ||
      project.no_kontrak?.toLowerCase().includes(keyword);
    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "completed" ? project.completed : !project.completed);

    return matchesSearch && matchesStatus;
  });

  const activeProjects = filteredProjects.filter((project) => !project.completed);
  const completedProjects = filteredProjects.filter((project) => project.completed);
  const totalValue = projects.reduce((sum, project) => sum + Number(project.nilai_kontrak || 0), 0);

  const formatRupiah = (number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Number(number || 0));

  const formatRupiahInput = (value) => {
    const rawValue = String(value || "").replace(/[^\d.,]/g, "");
    const hasCommaDecimal = rawValue.includes(",");
    const hasDotDecimal = /^\d+\.\d{1,2}$/.test(rawValue);
    const [rawIntegerPart, decimalPart] = hasCommaDecimal
      ? rawValue.split(",")
      : hasDotDecimal
        ? rawValue.split(".")
        : [rawValue, undefined];
    const integerPart = rawIntegerPart.replace(/\D/g, "");
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    const shouldShowDecimal =
      decimalPart !== undefined &&
      (hasCommaDecimal || Number(decimalPart) !== 0);

    return shouldShowDecimal
      ? `${formattedInteger},${decimalPart.slice(0, 2)}`
      : formattedInteger;
  };

  const normalizeRupiahInput = (value) =>
    String(value || "").replace(/\./g, "").replace(",", ".");

  const handleFile = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.files[0]
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({
      ...form,
      [name]: name === "nilai_kontrak" ? formatRupiahInput(value) : value
    });
  };

  const handleAdd = () => {
    resetForm();
    setShowModal(true);
  };

  const handleEdit = (project) => {
    setForm({
      ...initialForm,
      ...project,
      tgl_kontrak: formatDate(project.tgl_kontrak),
      tgl_spmk: formatDate(project.tgl_spmk),
      end_date: formatDate(project.end_date),
      nilai_kontrak: formatRupiahInput(project.nilai_kontrak),
      status: project.status || "progress",
      status_pengerjaan: project.status_pengerjaan || "berjalan"
    });
    setEditId(project.id);
    setShowModal(true);
  };

  const handleSelectProject = (project) => {
    setSelectedProject(project);
    navigate("/dashboard");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const formData = new FormData();

      Object.keys(form).forEach((key) => {
        const value = key === "nilai_kontrak"
          ? normalizeRupiahInput(form[key])
          : form[key];
        if (value === null || value === "") return;
        formData.append(key, value);
      });

      formData.append("type", "logo");

      let savedProject = null;

      if (editId) {
        const res = await api.put(`/projects/${editId}`, formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        savedProject = res.data?.project;
      } else {
        await api.post("/projects", formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
      }

      if (savedProject && selectedProject?.id === savedProject.id) {
        setSelectedProject(savedProject);
      }

      setShowModal(false);
      resetForm();
      fetchProjects();
    } catch (err) {
      console.error(err);
      alert("Gagal simpan project");
    }
  };

  const handleDeleteProject = async () => {
    if (!deleteProject) return;

    try {
      await api.delete(`/projects/${deleteProject.id}`);

      if (selectedProject?.id === deleteProject.id) {
        setSelectedProject(null);
      }

      setShowDeleteModal(false);
      setDeleteProject(null);
      setConfirmText("");
      fetchProjects();
    } catch (err) {
      console.error(err);
      alert("Gagal hapus project");
    }
  };

  const renderProjectCard = (project) => {
    const selected = selectedProject?.id === project.id;

    return (
      <div
        key={project.id}
        className={`bg-neutral border shadow-sm rounded-xl p-5 flex flex-col gap-5 ${
          selected ? "border-secondary" : "border-muted-gray"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              {project.no_kontrak || `Project #${project.id}`}
            </p>
            <h3 className="text-lg font-black text-primary mt-1 line-clamp-2">
              {project.pekerjaan}
            </h3>
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{project.kegiatan}</p>
          </div>
          <span
            className={`text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap ${
              project.completed
                ? "bg-success/15 text-success"
                : "bg-secondary/10 text-secondary"
            }`}
          >
            {project.completed ? "Completed" : "Progress"}
          </span>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs font-bold text-gray-500 mb-2">
            <span>Progress terbaru</span>
            <span>{project.progress.toFixed(1)}%</span>
          </div>
          <div className="h-2.5 bg-muted-gray rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${project.completed ? "bg-success" : "bg-secondary"}`}
              style={{ width: `${Math.min(project.progress, 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {project.latestWeek ? `Update minggu ${project.latestWeek}` : "Belum ada data progress"}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase">Kontraktor</p>
            <p className="font-semibold text-primary line-clamp-1">{project.kontraktor || "-"}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-gray-400 uppercase">Konsultan</p>
            <p className="font-semibold text-primary line-clamp-1">{project.konsultan || "-"}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase">Lokasi</p>
            <p className="font-semibold text-primary line-clamp-1">{project.lokasi || "-"}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-gray-400 uppercase">Nilai</p>
            <p className="font-semibold text-primary line-clamp-1">{formatRupiah(project.nilai_kontrak)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-auto">
          <button
            onClick={() => handleSelectProject(project)}
            className="flex-1 bg-secondary text-white font-bold px-4 py-2.5 rounded-lg border-2 border-secondary hover:bg-transparent hover:text-secondary transition-all"
          >
            {selected ? "Buka Dashboard" : "Pilih Project"}
          </button>
          <button
            onClick={() => handleEdit(project)}
            className="p-2.5 rounded-lg border border-muted-gray hover:border-secondary hover:text-secondary transition-colors"
            aria-label="Edit project"
          >
            <Edit size={18} />
          </button>
          <button
            onClick={() => {
              setDeleteProject(project);
              setShowDeleteModal(true);
            }}
            className="p-2.5 rounded-lg border border-muted-gray hover:border-red-500 hover:text-red-500 transition-colors"
            aria-label="Hapus project"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="p-8  mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="bg-accent text-secondary font-bold px-3 py-1 rounded-full text-xs tracking-wider">
              {user?.role === "admin" ? "ADMIN VIEW" : "STAFF VIEW"}
            </span>
          </div>
          <h1 className="text-3xl font-black text-primary flex items-center gap-3">
            <Folder className="text-secondary" size={32} /> Project Management
          </h1>
          <p className="text-gray-500 mt-2 font-medium">
            Pilih project yang sedang di-handle, tambah data baru, atau kelola project yang sudah selesai.
          </p>
        </div>

        <button
          onClick={handleAdd}
          className="bg-secondary text-white px-5 py-3 rounded-lg border-2 border-secondary hover:bg-transparent hover:text-secondary transition-all flex items-center gap-2 font-bold"
        >
          <Plus size={20} /> Tambah Project
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-neutral p-6 rounded-xl shadow-sm border border-muted-gray">
          <div className="bg-accent text-secondary w-12 h-12 rounded-xl flex items-center justify-center mb-5">
            <Folder size={24} />
          </div>
          <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Total Proyek</p>
          <h3 className="text-3xl font-black text-primary mt-2">{projects.length}</h3>
          <p className="text-xs text-gray-400 mt-2 font-medium">{formatRupiah(totalValue)}</p>
        </div>
        <div className="bg-neutral p-6 rounded-xl shadow-sm border border-muted-gray">
          <div className="bg-secondary/10 text-secondary w-12 h-12 rounded-xl flex items-center justify-center mb-5">
            <FolderClock size={24} />
          </div>
          <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Project Progress</p>
          <h3 className="text-3xl font-black text-primary mt-2">
            {normalizedProjects.filter((project) => !project.completed).length}
          </h3>
          <p className="text-xs text-gray-400 mt-2 font-medium">Ditampilkan di list utama</p>
        </div>
        <div className="bg-neutral p-6 rounded-xl shadow-sm border border-muted-gray">
          <div className="bg-success/15 text-success w-12 h-12 rounded-xl flex items-center justify-center mb-5">
            <FolderCheck size={24} />
          </div>
          <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Completed</p>
          <h3 className="text-3xl font-black text-primary mt-2">
            {normalizedProjects.filter((project) => project.completed).length}
          </h3>
          <p className="text-xs text-gray-400 mt-2 font-medium">Dipisah di bagian bawah</p>
        </div>
      </div>

      <div className="flex w-full mt-8 gap-3 items-stretch relative z-10">
        <div className="relative flex-1 px-3 py-1.5 rounded-xl shadow bg-neutral has-[input:focus-within]:outline-2 has-[input:focus-within]:-outline-offset-2 has-[input:focus-within]:outline-secondary transition-all">
          <Search size={22} className="absolute top-3.5 left-5 text-secondary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama proyek, kontrak, kegiatan..."
            className="w-full ml-10 px-3 py-2 bg-transparent focus:outline-none"
          />
        </div>

        <div className="relative">
          <button
            onClick={() => setShowFilter(!showFilter)}
            className="h-full px-5 rounded-xl bg-white shadow flex items-center justify-center gap-2 cursor-pointer hover:bg-gray-50 transition-all"
          >
            <Filter size={20} className={filterStatus !== "all" ? "text-secondary" : "text-gray-500"} />
            <span className={`font-medium hidden sm:block ${filterStatus !== "all" ? "text-secondary" : "text-gray-700"}`}>
              {filterOptions.find((item) => item.value === filterStatus)?.label || "Filter"}
            </span>
            <ChevronDown size={16} className={`text-gray-400 transition-transform duration-300 ${showFilter ? "rotate-180" : ""}`} />
          </button>

          {showFilter && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowFilter(false)} />
              <div className="absolute right-0 top-[calc(100%+0.5rem)] w-48 bg-white flex flex-col rounded-xl shadow-xl border border-gray-100 z-20 py-2">
                {filterOptions.map((status) => (
                  <button
                    key={status.value}
                    onClick={() => {
                      setFilterStatus(status.value);
                      setShowFilter(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm flex items-center justify-between hover:bg-blue-50/50 transition-colors"
                  >
                    <span className={`${filterStatus === status.value ? "text-secondary font-bold" : "text-gray-600 font-medium"}`}>
                      {status.label}
                    </span>
                    {filterStatus === status.value && <Check size={16} className="text-secondary" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <section className="mt-8">
        <div className="flex items-center gap-2 mb-4">
          <FolderClock size={20} className="text-secondary" />
          <h2 className="text-xl font-black text-primary">Project Berjalan</h2>
        </div>
        {activeProjects.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {activeProjects.map(renderProjectCard)}
          </div>
        ) : (
          <div className="bg-neutral border border-muted-gray rounded-xl p-8 text-center text-gray-500">
            Belum ada project berjalan yang cocok.
          </div>
        )}
      </section>

      <section className="mt-10">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle size={20} className="text-success" />
          <h2 className="text-xl font-black text-primary">Project Completed</h2>
        </div>
        {completedProjects.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 opacity-90">
            {completedProjects.map(renderProjectCard)}
          </div>
        ) : (
          <div className="bg-neutral border border-muted-gray rounded-xl p-8 text-center text-gray-500">
            Belum ada project completed.
          </div>
        )}
      </section>

      {showDeleteModal && deleteProject && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-6">
            <h2 className="text-lg font-bold mb-3 text-red-600">Konfirmasi Hapus Project</h2>
            <p className="text-sm text-gray-600 mb-4">
              Ketik nama pekerjaan berikut untuk konfirmasi:
            </p>
            <div className="bg-gray-100 p-3 rounded-lg mb-3 font-semibold">
              {deleteProject.pekerjaan}
            </div>
            <input
              type="text"
              placeholder="Ketik nama pekerjaan..."
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 mb-4"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteProject(null);
                  setConfirmText("");
                }}
                className="px-4 py-2 bg-gray-200 rounded-lg"
              >
                Batal
              </button>
              <button
                disabled={confirmText !== deleteProject.pekerjaan}
                onClick={handleDeleteProject}
                className={`px-4 py-2 rounded-lg text-white ${
                  confirmText === deleteProject.pekerjaan ? "bg-red-500" : "bg-gray-300 cursor-not-allowed"
                }`}
              >
                Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b-2 border-muted-gray flex items-center justify-between bg-neutral">
              <div className="size-11" />
              <h2 className="text-xl font-bold text-gray-800">{editId ? "Edit Project" : "Tambah Project"}</h2>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="text-gray-400 hover:text-red-500 p-2 rounded-lg transition-all">
                <X size={20} strokeWidth={3} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <form id="project-form" onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-secondary uppercase tracking-wider mb-3 border-b pb-2">Logo Proyek</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      ["logo_kontraktor", "Logo Kontraktor"],
                      ["logo_konsultan", "Logo Konsultan"],
                      ["logo_client", "Logo Client"]
                    ].map(([name, label]) => (
                      <div key={name}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                        <input type="file" name={name} onChange={handleFile} accept="image/*" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-secondary uppercase tracking-wider mb-3 border-b pb-2">Informasi Utama</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nama Pekerjaan</label>
                      <textarea name="pekerjaan" value={form.pekerjaan} onChange={handleChange} required rows={3} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Kegiatan</label>
                      <input type="text" name="kegiatan" value={form.kegiatan} onChange={handleChange} required className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Sub Kegiatan</label>
                      <input type="text" name="sub_kegiatan" value={form.sub_kegiatan || ""} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Lokasi</label>
                      <input type="text" name="lokasi" value={form.lokasi} onChange={handleChange} required className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nama File Import/Export</label>
                      <input type="text" name="nama_import" value={form.nama_import || ""} onChange={handleChange} placeholder="Contoh: projek kuta selatan" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status Project</label>
                      <select name="status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value, status_pengerjaan: e.target.value === "completed" ? "selesai" : "berjalan" })} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all">
                        <option value="progress">Progress</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-secondary uppercase tracking-wider mb-3 border-b pb-2">Detail Kontrak & SPMK</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nomor Kontrak</label>
                      <input type="text" name="no_kontrak" value={form.no_kontrak} onChange={handleChange} required className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Kontrak</label>
                      <input type="date" name="tgl_kontrak" value={form.tgl_kontrak} onChange={handleChange} required className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nomor SPMK</label>
                      <input type="text" name="no_spmk" value={form.no_spmk} onChange={handleChange} required className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal SPMK</label>
                      <input type="date" name="tgl_spmk" value={form.tgl_spmk} onChange={handleChange} required className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nilai Kontrak (Rp)</label>
                      <input type="text" inputMode="decimal" name="nilai_kontrak" value={form.nilai_kontrak} onChange={handleChange} required className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tahun Anggaran</label>
                      <input type="number" name="tahun" value={form.tahun} onChange={handleChange} required className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all" />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-secondary uppercase tracking-wider mb-3 border-b pb-2">Pihak Terlibat & Waktu</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Kontraktor / Pelaksana</label>
                      <input type="text" name="kontraktor" value={form.kontraktor} onChange={handleChange} required className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Konsultan Pengawas</label>
                      <input type="text" name="konsultan" value={form.konsultan} onChange={handleChange} required className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Selesai</label>
                      <input type="date" name="end_date" value={form.end_date} onChange={handleChange} required className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Lama Pelaksanaan (Hari)</label>
                      <input type="number" name="waktu_pelaksanaan" value={form.waktu_pelaksanaan} readOnly className="w-full border border-gray-300 rounded-lg px-4 py-2.5 bg-muted-gray/50 cursor-not-allowed" />
                    </div>
                  </div>
                </div>
              </form>
            </div>

            <div className="px-6 py-4 border-t-2 border-muted-gray bg-neutral flex justify-end gap-3 rounded-b-2xl">
              <button onClick={() => { setShowModal(false); resetForm(); }} type="button" className="px-6 py-2.5 rounded-lg text-gray-700 font-semibold hover:bg-gray-200 transition-colors">Batal</button>
              <button type="submit" form="project-form" className="px-6 py-2.5 rounded-lg bg-secondary text-white font-semibold border-2 border-secondary hover:bg-transparent transition-all shadow-md hover:shadow-lg active:scale-95 flex items-center gap-2 hover:text-secondary">
                <Check size={18} /> Simpan Proyek
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
