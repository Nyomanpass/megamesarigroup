import { Search, Filter, ChevronDown, Check } from "lucide-react";
import { Folder, FolderCheck, FolderClock, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import api from "../api";
import { useNavigate, useOutletContext } from "react-router-dom";

export default function Project() {
      // get user context from layout
      const { user } = useOutletContext() || { user: {} };
      //filters
      const [showFilter, setShowFilter] = useState(false);
      const [filterStatus, setFilterStatus] = useState("Semua");

      //projects
      const [projects, setProjects] = useState([]);
      const navigate = useNavigate();
      const [showModal, setShowModal] = useState(false);
      const [form, setForm] = useState({
            kegiatan: '',
            pekerjaan: '',
            no_kontrak: '',
            tgl_kontrak: '',
            no_spmk: '',
            tgl_spmk: '',
            end_date: '',
            kontraktor: '',
            konsultan: '',
            waktu_pelaksanaan: '',
            nilai_kontrak: '',
            lokasi: '',
            tahun: ''
      });

      //filters
      const filterOptions = ["Semua", "Berjalan", "Selesai", "Tertunda"];

      //porjects
      useEffect(() => {
            fetchProjects();
      }, []);

      const fetchProjects = async () => {
            try {
                  const res = await api.get("/projects");
                  setProjects(res.data);
            } catch (err) {
                  console.error(err);
            }
      };

      const handleSubmit = async (e) => {
            e.preventDefault();

            try {
                  const payload = {
                        ...form,

                        // 🔥 FIX NUMBER
                        waktu_pelaksanaan: Number(form.waktu_pelaksanaan || 0),
                        nilai_kontrak: Number(form.nilai_kontrak || 0),
                        tahun: Number(form.tahun || 0),

                        // 🔥 FIX DATE (biar tidak error)
                        tgl_kontrak: form.tgl_kontrak || null,
                        tgl_spmk: form.tgl_spmk || null,
                        end_date: form.end_date || null
                  };

                  console.log("SEND:", payload); // 🔥 DEBUG

                  await api.post("/projects", payload);

                  setShowModal(false);
                  fetchProjects();

                  // reset form
                  setForm({
                        kegiatan: "",
                        pekerjaan: "",
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
                        tahun: ""
                  });

            } catch (err) {
                  console.error("ERROR:", err.response?.data || err.message);
                  alert("Gagal tambah project");
            }
      };

      const handleChange = (e) => {
            setForm({ ...form, [e.target.name]: e.target.value });
      };

      return (
            <div className="p-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-screen ">
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
                              <p className="text-gray-500 mt-2 font-medium">Pantau Keseluruhan Proyek konstruksi.</p>
                        </div>
                  </div>

                  <div className="w-full grid grid-cols-3 gap-4 mt-10">
                        <div className="bg-neutral p-6 rounded-3xl shadow-sm border border-muted-gray hover:border-secondary transition-colors group relative overflow-hidden">
                              <div className="absolute top-0 right-0 w-24 h-24 bg-secondary/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500"></div>
                              <div className="bg-accent text-secondary w-12 h-12 rounded-xl flex items-center justify-center mb-6 relative z-10">
                                    <Folder size={24} />
                              </div>
                              <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2 relative z-10">Total Proyek</p>
                              <h3 className="text-3xl font-black text-primary relative z-10">12</h3>
                              <p className="text-xs text-gray-400 mt-2 font-medium relative z-10">lorem ipsum</p>
                        </div>
                        <div className="bg-neutral p-6 rounded-3xl shadow-sm border border-muted-gray hover:border-secondary transition-colors group relative overflow-hidden">
                              <div className="absolute top-0 right-0 w-24 h-24 bg-secondary/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500"></div>
                              <div className="bg-accent text-secondary w-12 h-12 rounded-xl flex items-center justify-center mb-6 relative z-10">
                                    <FolderClock size={24} />
                              </div>
                              <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2 relative z-10">Ongoing Projects</p>
                              <h3 className="text-3xl font-black text-primary relative z-10">12</h3>
                              <p className="text-xs text-gray-400 mt-2 font-medium relative z-10">lorem ipsum</p>
                        </div>
                        <div className="bg-neutral p-6 rounded-3xl shadow-sm border border-muted-gray hover:border-secondary transition-colors group relative overflow-hidden">
                              <div className="absolute top-0 right-0 w-24 h-24 bg-secondary/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500"></div>
                              <div className="bg-accent text-secondary w-12 h-12 rounded-xl flex items-center justify-center mb-6 relative z-10">
                                    <FolderCheck size={24} />
                              </div>
                              <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2 relative z-10">Completed Projects</p>
                              <h3 className="text-3xl font-black text-primary relative z-10">12</h3>
                              <p className="text-xs text-gray-400 mt-2 font-medium relative z-10">lorem ipsum</p>
                        </div>




                  </div >

                  <div className="flex w-full mt-10 space-x-3 items-stretch relative z-10">
                        {/* Search Input */}
                        <div className="relative flex-1 px-3 py-1.5 rounded-xl shadow bg-neutral has-[input:focus-within]:outline-2 has-[input:focus-within]:-outline-offset-2 has-[input:focus-within]:outline-secondary transition-all">
                              <Search size={24} className="absolute top-3.5 left-5 text-secondary" />
                              <input type="text" placeholder="Nama Proyek, Client.." className="w-full ml-10 px-3 py-2 bg-transparent focus:outline-none" />
                        </div>

                        {/* Dropdown Filter */}
                        <div className="relative">
                              <button
                                    onClick={() => setShowFilter(!showFilter)}
                                    className="h-full px-5 rounded-xl bg-white shadow flex items-center justify-center gap-2 cursor-pointer hover:bg-gray-50 transition-all duration-100 focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary"
                              >
                                    <Filter size={20} className={filterStatus !== "Semua" ? "text-secondary" : "text-gray-500"} />
                                    <span className={`font-medium hidden sm:block ${filterStatus !== "Semua" ? "text-secondary" : "text-gray-700"}`}>
                                          {filterStatus === "Semua" ? "Filter" : filterStatus}
                                    </span>
                                    <ChevronDown size={16} className={`text-gray-400 transition-transform duration-300 ${showFilter ? 'rotate-180' : ''}`} />
                              </button>

                              {/* Menu Dropdown - Absolute Positioned */}
                              {showFilter && (
                                    <>
                                          {/* Invisible overlay for closing dropdown when clicking outside */}
                                          <div className="fixed inset-0 z-10" onClick={() => setShowFilter(false)}></div>

                                          <div className="absolute right-0 top-[calc(100%+0.5rem)] w-48 bg-white flex flex-col rounded-xl shadow-xl shadow-gray-200/50 border border-gray-100 z-20 py-2 animate-in fade-in slide-in-from-top-2 origin-top-right">
                                                <div className="px-4 py-2 border-b border-gray-100 mb-1">
                                                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Status Proyek</p>
                                                </div>

                                                {filterOptions.map((status) => (
                                                      <button
                                                            key={status}
                                                            onClick={() => {
                                                                  setFilterStatus(status);
                                                                  setShowFilter(false);
                                                            }}
                                                            className="w-full text-left px-4 py-2.5 text-sm flex items-center justify-between hover:bg-blue-50/50 transition-colors"
                                                      >
                                                            <span className={`${filterStatus === status ? 'text-secondary font-bold' : 'text-gray-600 font-medium'}`}>
                                                                  {status}
                                                            </span>
                                                            {filterStatus === status && (
                                                                  <Check size={16} className="text-secondary" />
                                                            )}
                                                      </button>
                                                ))}
                                          </div>
                                    </>
                              )}
                        </div>
                  </div>

                  {/* list project */}
                  <div className="grid grid-cols-3 gap-4 mt-6">
                        {projects.map((project) => (
                              <div key={project.id} className="bg-neutral shadow rounded-xl p-4 gap-3">
                                    <div className="mb-16">
                                          <div className="flex justify-between items-center">
                                                <p className="text-xs">{project.no_kontrak}</p>
                                                <div className="text-sm px-3 py-1 bg-success rounded-full w-max text-neutral">Ongoing</div>
                                          </div>
                                          <p className="text-xl font-bold">{project.pekerjaan}</p>
                                          <p className="text-sm">{project.kegiatan}</p>

                                    </div>

                                    <div className="flex justify-between">
                                          <div>
                                                <p>Pengawas</p>
                                                <p>CV. Ardicon</p>
                                          </div>
                                          <div className="text-right">
                                                <p>Pelaksana</p>
                                                <p>PT Mega Mesari Group</p>
                                          </div>
                                    </div>
                                    <button onClick={() => navigate(`/project/${project.id}`)} className="w-full bg-secondary text-neutral text-lg rounded-md py-3 mt-5 hover:bg-transparent hover:border-secondary border-2 hover:text-secondary transition-all duration-300 active:scale-95">Lihat Detail</button>
                              </div>
                        ))}

                        <button onClick={() => setShowModal(true)} className="group bg-neutral shadow rounded-xl py-16 gap-3 flex flex-col justify-center items-center cursor-pointer active:scale-95 transition-all border-2 border-neutral hover:border-secondary">
                              <div className="p-3 rounded-lg flex justify-center items-center bg-muted-gray text-neutral group-hover:bg-secondary transition-all duration-300">
                                    <Plus size={32} strokeWidth={4} />
                              </div>
                              <div className="text-center">
                                    <p className="text-lg font-bold">Tambah Proyek</p>
                                    <p className="text-sm">Klik card ini untuk menambah proyek baru!</p>
                              </div>
                        </button>
                  </div>

                  {showModal && (
                        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                              <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
                                    {/* Header */}
                                    <div className="px-6 py-4 border-b-2 border-muted-gray flex items-center justify-between bg-gray-50 bg-neutral">
                                          <div className="size-11"></div>
                                          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">Tambah Proyek Baru</h2>
                                          <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-all duration-200"><X size={20} strokeWidth={3} /></button>
                                    </div>

                                    {/* Form Body */}
                                    <div className="p-6 overflow-y-auto">
                                          <form id="add-project-form" onSubmit={handleSubmit} className="space-y-6">

                                                {/* Informasi Utama */}
                                                <div>
                                                      <h3 className="text-sm font-semibold text-secondary uppercase tracking-wider mb-3 border-b pb-2">Informasi Utama</h3>
                                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <div className="col-span-1 md:col-span-2">
                                                                  <label className="block text-sm font-medium text-gray-700 mb-1">Nama Pekerjaan</label>
                                                                  <input type="text" name="pekerjaan" value={form.pekerjaan} onChange={handleChange} required placeholder="Contoh: Pembangunan Jembatan Area A" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all" />
                                                            </div>
                                                            <div>
                                                                  <label className="block text-sm font-medium text-gray-700 mb-1">Kegiatan</label>
                                                                  <input type="text" name="kegiatan" value={form.kegiatan} onChange={handleChange} required placeholder="Contoh: Infrastruktur" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all" />
                                                            </div>
                                                            <div>
                                                                  <label className="block text-sm font-medium text-gray-700 mb-1">Lokasi</label>
                                                                  <input type="text" name="lokasi" value={form.lokasi} onChange={handleChange} required placeholder="Contoh: Jakarta Selatan" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all" />
                                                            </div>
                                                      </div>
                                                </div>

                                                {/* Kontrak & SPMK */}
                                                <div>
                                                      <h3 className="text-sm font-semibold text-secondary uppercase tracking-wider mb-3 border-b pb-2">Detail Kontrak & SPMK</h3>
                                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <div>
                                                                  <label className="block text-sm font-medium text-gray-700 mb-1">Nomor Kontrak</label>
                                                                  <input type="text" name="no_kontrak" value={form.no_kontrak} onChange={handleChange} required placeholder="SPS/KONTRAK/2026" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all" />
                                                            </div>
                                                            <div>
                                                                  <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Kontrak</label>
                                                                  <input type="date" name="tgl_kontrak" value={form.tgl_kontrak} onChange={handleChange} required className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all" />
                                                            </div>
                                                            <div>
                                                                  <label className="block text-sm font-medium text-gray-700 mb-1">Nomor SPMK</label>
                                                                  <input type="text" name="no_spmk" value={form.no_spmk} onChange={handleChange} required placeholder="SPS/SPMK/2026" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all" />
                                                            </div>
                                                            <div>
                                                                  <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal SPMK</label>
                                                                  <input type="date" name="tgl_spmk" value={form.tgl_spmk} onChange={handleChange} required className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all" />
                                                            </div>
                                                            <div>
                                                                  <label className="block text-sm font-medium text-gray-700 mb-1">Nilai Kontrak (Rp)</label>
                                                                  <input type="number" name="nilai_kontrak" value={form.nilai_kontrak} onChange={handleChange} required placeholder="Contoh: 150000000" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all" />
                                                            </div>
                                                            <div>
                                                                  <label className="block text-sm font-medium text-gray-700 mb-1">Tahun Anggaran</label>
                                                                  <input type="number" name="tahun" value={form.tahun} onChange={handleChange} required placeholder="Contoh: 2026" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all" />
                                                            </div>
                                                      </div>
                                                </div>

                                                {/* Pihak Terlibat & Waktu */}
                                                <div>
                                                      <h3 className="text-sm font-semibold text-secondary uppercase tracking-wider mb-3 border-b pb-2">Pihak Terlibat & Waktu</h3>
                                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <div>
                                                                  <label className="block text-sm font-medium text-gray-700 mb-1">Kontraktor / Pelaksana</label>
                                                                  <input type="text" name="kontraktor" value={form.kontraktor} onChange={handleChange} required placeholder="PT Mega Mesari Group" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all" />
                                                            </div>
                                                            <div>
                                                                  <label className="block text-sm font-medium text-gray-700 mb-1">Konsultan Pengawas</label>
                                                                  <input type="text" name="konsultan" value={form.konsultan} onChange={handleChange} required placeholder="CV. Ardicon" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all" />
                                                            </div>
                                                            <div>
                                                                  <label className="block text-sm font-medium text-gray-700 mb-1">Lama Pelaksanaan (Hari)</label>
                                                                  <input type="number" name="waktu_pelaksanaan" value={form.waktu_pelaksanaan} onChange={handleChange} required placeholder="Contoh: 90" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all" />
                                                            </div>
                                                            <div>
                                                                  <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Selesai (End Date)</label>
                                                                  <input type="date" name="end_date" value={form.end_date} onChange={handleChange} required className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all" />
                                                            </div>
                                                      </div>
                                                </div>

                                          </form>
                                    </div>

                                    {/* Footer / Actions */}
                                    <div className="px-6 py-4 border-t-2 border-muted-gray bg-neutral flex justify-end gap-3 rounded-b-2xl">
                                          <button onClick={() => setShowModal(false)} type="button" className="px-6 py-2.5 rounded-lg text-gray-700 font-semibold hover:bg-gray-200 transition-colors">Batal</button>
                                          <button type="submit" form="add-project-form" className="px-6 py-2.5 rounded-lg bg-secondary text-white font-semibold border-2 border-secondary hover:bg-transparent transition-all shadow-md hover:shadow-lg active:scale-95 flex items-center gap-2 hover:text-secondary">
                                                <Check size={18} /> Simpan Proyek
                                          </button>
                                    </div>

                              </div>
                        </div>
                  )}

            </div>
      )
}