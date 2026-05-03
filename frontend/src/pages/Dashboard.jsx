

import { useEffect, useState } from "react";
import { useProject } from "../context/ProjectContext";
import { m, AnimatePresence, spring, scale } from "motion/react";
import api from "../api";
import {
   Building2, Briefcase, Wallet, TrendingUp, CheckCircle, Clock, PieChart as PieChartIcon, Target, Activity, HardHat, Calendar, Search, Plus, Edit, ChevronDown, Calculator, ClipboardList, X,
   Signature,
   Cuboid,
   Hammer,
   ClipboardCheck
} from "lucide-react";
import {
   AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Cell, LineChart, Line, BarChart as BarChartIcon,
} from 'recharts';
import { useNavigate, useOutletContext } from "react-router-dom";

export default function Dashboard() {
   // get user context from layout
   const { user } = useOutletContext() || { user: {} };

   const [projects, setProjects] = useState([]);
   const { selectedProject, setSelectedProject } = useProject();
   const [projectData, setProjectData] = useState(null);
   const [chartData, setChartData] = useState([]);
   const [searchQuery, setSearchQuery] = useState("");
   const [showDropdown, setShowDropdown] = useState(false);
   const [weeklyChartData, setWeeklyChartData] = useState([]);
   const [showAccordion, setShowAccordion] = useState(false);

   // Modal states
   const [showModal, setShowModal] = useState(false);
   const [editId, setEditId] = useState(null);
   const [form, setForm] = useState({
      kegiatan: '',
      pekerjaan: '',
      lokasi: '',
      tahun: '',
      no_kontrak: '',
      tgl_kontrak: '',
      nilai_kontrak: '',
      no_spmk: '',
      tgl_spmk: '',
      end_date: '',
      waktu_pelaksanaan: '',
      kontraktor: '',
      konsultan: '',
      logo_kontraktor: null,
      logo_konsultan: null,
      logo_client: null
   });
   const navigate = useNavigate();

   useEffect(() => { fetchProjects(); }, []);

   // Load project details when selection changes
   useEffect(() => {
      if (selectedProject) {
         fetchProjectData(selectedProject.id);
      }
   }, [selectedProject]);

   const fetchProjects = async () => {
      try {
         const res = await api.get("/projects");
         setProjects(res.data);
         if (res.data.length > 0 && !selectedProject) {
            setSelectedProject(res.data[0]);
         }
      } catch (err) {
         console.error(err);
      }
   };

   const fetchProjectData = async (id) => {
      try {
         const res = await api.get(`/projects/${id}`);
         setProjectData(res.data);
         // Fetch chart data
         const chartRes = await api.get(`/daily-plan/weekly-chart/${id}`);
         setChartData(chartRes.data);

         const weeklyRes = await api.get(`/daily-plan/weekly-report/${id}`);
         setWeeklyChartData(weeklyRes.data.map(w => ({
            name: `Mg-${w.minggu_ke}`,
            Bobot: Number(w.bobot_mingguan).toFixed(2),
            Kumulatif: Number(w.kumulatif).toFixed(2)
         })));
      } catch (err) {
         console.error(err);
      }
   };

   const handleProjectSelect = (project) => {
      setSelectedProject(project);
      fetchProjectData(project.id);
      setShowDropdown(false);
   };

   // Modal handlers
   const handleAddProject = () => {
      setEditId(null);
      resetForm();
      setShowModal(true);
   };

   const handleEditProject = () => {
      if (!selectedProject) return;
      setEditId(selectedProject.id);
      setForm({
         kegiatan: selectedProject.kegiatan || '',
         pekerjaan: selectedProject.pekerjaan || '',
         lokasi: selectedProject.lokasi || '',
         tahun: selectedProject.tahun || '',
         no_kontrak: selectedProject.no_kontrak || '',
         tgl_kontrak: selectedProject.tgl_kontrak || '',
         nilai_kontrak: selectedProject.nilai_kontrak || '',
         no_spmk: selectedProject.no_spmk || '',
         tgl_spmk: selectedProject.tgl_spmk || '',
         end_date: selectedProject.end_date || '',
         waktu_pelaksanaan: selectedProject.waktu_pelaksanaan || '',
         kontraktor: selectedProject.kontraktor || '',
         konsultan: selectedProject.konsultan || '',
         logo_kontraktor: null,
         logo_konsultan: null,
         logo_client: null
      });
      setShowModal(true);
   };

   const resetForm = () => {
      setForm({
         kegiatan: '',
         pekerjaan: '',
         lokasi: '',
         tahun: '',
         no_kontrak: '',
         tgl_kontrak: '',
         nilai_kontrak: '',
         no_spmk: '',
         tgl_spmk: '',
         end_date: '',
         waktu_pelaksanaan: '',
         kontraktor: '',
         konsultan: '',
         logo_kontraktor: null,
         logo_konsultan: null,
         logo_client: null
      });
   };

   const handleChange = (e) => {
      const { name, value } = e.target;
      const nextForm = { ...form, [name]: value };
      setForm(nextForm);

      if (name === 'tgl_spmk' || name === 'end_date') {
         calculateWaktuPelaksanaan(nextForm);
      }
   };

   const calculateWaktuPelaksanaan = (currentForm) => {
      if (currentForm.tgl_spmk && currentForm.end_date) {
         const start = new Date(currentForm.tgl_spmk);
         const end = new Date(currentForm.end_date);
         const diffTime = Math.abs(end - start);
         const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
         setForm({ ...currentForm, waktu_pelaksanaan: diffDays });
      }
   };

   const handleFileChange = (e) => {
      const { name, files } = e.target;
      setForm({ ...form, [name]: files[0] });
   };

   const handleSubmit = async (e) => {
      e.preventDefault();
      const formData = new FormData();
      Object.keys(form).forEach(key => {
         if (form[key] !== null && form[key] !== '') {
            formData.append(key, form[key]);
         }
      });

      try {
         if (editId) {
            await api.put(`/projects/${editId}`, formData);
         } else {
            await api.post('/projects', formData);
         }
         fetchProjects();
         setShowModal(false);
      } catch (err) {
         console.error(err);
      }
   };

   // ----- Kalkulasi Statistik -----
   const totalProjects = projects.length;
   const totalNilaiKontrak = projects.reduce((acc, curr) => acc + Number(curr.nilai_kontrak || 0), 0);

   // Project-specific data
   const activeProject = projectData || selectedProject;
   const projectValue = activeProject ? Number(activeProject.nilai_kontrak || 0) : 0;
   const projectDuration = activeProject ? activeProject.waktu_pelaksanaan || 0 : 0;

   const navigateToProject = (path) => {
      if (!selectedProject) return;
      navigate(`/${path}`);
   };

   const navigateToProjectDetail = () => {
      if (!activeProject) return;
      navigate(`/project/${activeProject.id}`);
   };

   // Format mata uang rupiah
   const formatRupiah = (number) => {
      return new Intl.NumberFormat("id-ID", {
         style: "currency",
         currency: "IDR",
         minimumFractionDigits: 0,
         maximumFractionDigits: 0,
      }).format(number);
   };

   // Filtered projects for dropdown
   const filteredProjects = projects.filter(project =>
      project.kegiatan?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.pekerjaan?.toLowerCase().includes(searchQuery.toLowerCase())
   );

   // Dummy data for project charts (replace with real data when available)
   const projectProgressData = chartData.length > 0 ? chartData.map(d => ({
      name: `Minggu ${d.minggu_ke}`,
      rencana: d.kum_rencana,
      real: d.kum_real
   })) : [
      { name: 'Minggu 1', rencana: 10, real: 8 },
      { name: 'Minggu 2', rencana: 25, real: 22 },
      { name: 'Minggu 3', rencana: 40, real: 35 },
      { name: 'Minggu 4', rencana: 60, real: 55 },
   ];

   return (
      <div className="p-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-screen">

         {/* HEADER DASHBOARD CAKUPAN SISTEM */}
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div className="flex-1">
               <div className="flex items-center gap-3 mb-2">
                  <span className="bg-accent text-secondary font-bold px-3 py-1 rounded-full text-xs tracking-wider">
                     {user?.role === "admin" ? "ADMIN VIEW" : "STAFF VIEW"}
                  </span>
               </div>
               <h1 className="text-3xl font-black text-primary flex items-center gap-3">
                  <Activity className="text-secondary" size={32} /> Monitoring Proyek
               </h1>
               <p className="text-gray-500 mt-2 font-medium">Pantau kemajuan dan performa proyek konstruksi secara real-time.</p>
            </div>

            {/* Add/Edit Buttons */}
            <div className="flex gap-2">
               <m.button whileTap={{ scale: 0.9, }}
                  onClick={handleAddProject}
                  className="bg-secondary text-white px-4 py-3 hover:bg-transparent hover:text-secondary hover:border-secondary border-2 border-transparent transition-all duration-300 flex items-center gap-2 cursor-pointer font-semibold uppercase tracking-wide"
               >
                  <Plus size={24} />
                  <span className="hidden md:inline">TAMBAH PROYEK</span>
               </m.button>
               {selectedProject && (
                  <button
                     onClick={handleEditProject}
                     className="bg-primary text-white px-4 py-3 hover:bg-transparent hover:text-primary hover:border-primary border-2 border-transparent transition-all duration-300 flex items-center gap-2 cursor-pointer font-semibold uppercase tracking-wide"
                  >
                     <Edit size={24} />
                     <span className="hidden md:inline">Edit Proyek</span>
                  </button>
               )}
            </div>
         </div>

         <div className="w-full mb-4">
            {/* Project Selector */}
            <div className="relative">
               <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="bg-neutral border border-muted-gray px-4 py-3 flex items-center gap-4 hover:border-secondary transition-colors w-full cursor-pointer"
               >
                  <Search size={22} className="text-secondary" />
                  <div className="flex-1 text-left">
                     <p className="font-semibold text-lg text-primary">
                        {selectedProject ? selectedProject.kegiatan : "Pilih Proyek"}
                     </p>
                     <p className="text-sm text-gray-500 line-clamp-2">
                        {selectedProject ? selectedProject.pekerjaan : "Cari berdasarkan nama kegiatan"}
                     </p>
                  </div>
                  <ChevronDown className={`text-secondary transition-all ${showDropdown ? 'rotate-180' : ''}`} size={20} strokeWidth={3} />
               </button>
               <AnimatePresence>
                  {showDropdown && (
                     <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />

                        <m.div initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -50 }} transition={{ duration: 0.35, type: spring, bounce: 0.3 }} className="absolute top-full mt-2 w-full bg-white border border-muted-gray rounded-xl shadow-xl z-20 max-h-64 overflow-y-auto">
                           <div className="p-3 border-b border-muted-gray">
                              <input
                                 type="text"
                                 placeholder="Cari proyek..."
                                 value={searchQuery}
                                 onChange={(e) => setSearchQuery(e.target.value)}
                                 className="w-full px-3 py-2 border border-muted-gray rounded-lg focus:border-secondary focus:outline-none"
                              />
                           </div>
                           {filteredProjects.length > 0 ? (
                              filteredProjects.map(project => (
                                 <button
                                    key={project.id}
                                    onClick={() => handleProjectSelect(project)}
                                    className="w-full px-4 py-3 text-left hover:bg-accent/20 transition-colors border-b border-muted-gray last:border-b-0 cursor-pointer"
                                 >
                                    <p className="font-bold text-primary">{project.kegiatan}</p>
                                    <p className="text-sm text-gray-600">{project.pekerjaan}</p>
                                    <div class="mt-2.5 flex items-center gap-2">
                                       <p className="text-xs text-gray-400">{project.lokasi}</p>
                                       <p className="text-xs text-gray-400">|</p>
                                       <p className="text-xs text-gray-400">{project.tahun}</p>
                                    </div>
                                 </button>
                              ))
                           ) : (
                              <div className="p-4 text-sm text-gray-500">Tidak ada proyek yang cocok.</div>
                           )}
                        </m.div>

                     </>
                  )}
               </AnimatePresence>
            </div>

         </div>


         {/* 🚀 QUICK STATS CARDS */}
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-neutral p-6 shadow-sm border rounded-3xl border-muted-gray hover:border-secondary transition-colors group relative overflow-hidden">
               <div className="absolute top-0 right-0 w-24 h-24 bg-secondary/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500"></div>
               <div className="bg-accent text-secondary w-12 h-12 rounded-xl flex items-center justify-center mb-6 relative z-10">
                  <Briefcase size={24} />
               </div>
               <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2 relative z-10">Nilai Kontrak</p>
               <h3 className="text-2xl font-black text-primary relative z-10 leading-tight">
                  {selectedProject ? formatRupiah(projectValue) : "Rp 0"}
               </h3>
               <p className="text-xs text-secondary mt-2 font-bold relative z-10 flex items-center gap-1"><TrendingUp size={14} /> Kontrak aktif</p>
            </div>

            <div className="bg-neutral p-6 rounded-3xl shadow-sm border border-muted-gray hover:border-primary transition-colors group relative overflow-hidden">
               <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500"></div>
               <div className="bg-primary/10 text-primary w-12 h-12 rounded-xl flex items-center justify-center mb-6 relative z-10">
                  <Calendar size={24} />
               </div>
               <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2 relative z-10">Durasi Proyek</p>
               <h3 className="text-3xl font-black text-primary relative z-10">{projectDuration} <span className="text-lg text-gray-400 font-medium">Hari</span></h3>
               <p className="text-xs text-gray-400 mt-2 font-medium relative z-10">Waktu pelaksanaan</p>
            </div>

            <div className="bg-neutral p-6 rounded-3xl shadow-sm border border-muted-gray hover:border-success transition-colors group relative overflow-hidden">
               <div className="absolute top-0 right-0 w-24 h-24 bg-success/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500"></div>
               <div className="bg-success/20 text-success w-12 h-12 rounded-xl flex items-center justify-center mb-6 relative z-10">
                  <CheckCircle size={24} />
               </div>
               <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2 relative z-10">Progress Saat Ini</p>
               <h3 className="text-3xl font-black text-primary relative z-10">
                  {chartData.length > 0 ? Math.round(chartData[chartData.length - 1]?.kum_real || 0) : 0}%
               </h3>
               <p className="text-xs text-gray-400 mt-2 font-medium relative z-10">Berdasarkan realisasi</p>
            </div>

            <div className="bg-neutral p-6 rounded-3xl shadow-sm border border-muted-gray hover:border-warning transition-colors group relative overflow-hidden">
               <div className="absolute top-0 right-0 w-24 h-24 bg-warning/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500"></div>
               <div className="bg-warning/20 text-warning w-12 h-12 rounded-xl flex items-center justify-center mb-6 relative z-10">
                  <Clock size={24} />
               </div>
               <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2 relative z-10">Deviasi Progress</p>
               <h3 className="text-3xl font-black text-primary relative z-10">
                  {chartData.length > 0 ? Math.round((chartData[chartData.length - 1]?.kum_real || 0) - (chartData[chartData.length - 1]?.kum_rencana || 0)) : 0}%
               </h3>
               <p className="text-xs text-warning mt-2 font-bold relative z-10">Real vs Rencana</p>
            </div>
         </div>

         {/* PROJECT INFO (accordion using framer m) */}


         <m.button className="bg-white py-5 w-full rounded-xl flex items-center justify-between cursor-pointer group shadow-sm border border-muted-gray" onClick={() => setShowAccordion(prev => !prev)}>
            <h3 className="text-xl font-bold text-primary ml-4 group-hover:text-secondary transition-all duration-300">Detail Informasi Proyek</h3>
            <ChevronDown size={24} className={`mr-4 ${showAccordion ? "rotate-180" : ""} transition-transform duration-300 group-hover:text-secondary transition-all duration-300`} />
         </m.button>

         <AnimatePresence initial={false}>
            <m.div
               initial={{ opacity: 0, height: 0 }}
               animate={{ opacity: showAccordion ? 1 : 0, height: showAccordion ? "auto" : 0 }}
               exit={{ opacity: 0, height: 0 }}
               transition={{ duration: 0.3, ease: "easeInOut" }}
               style={{ overflow: "hidden" }}
               className="bg-white shadow border-muted-gray rounded-lg mb-4 mt-2"
            >
               {activeProject ? (
                  <div className="p-6">
                     <div className="w-full grid grid-cols-3 gap-2">
                        <div className="w-full h-full">
                           <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Logo Kontraktor</p>
                           <img src={activeProject.logo_kontraktor ? `http://localhost:3000/uploads/${activeProject.logo_kontraktor}` : "/placeholder.png"} alt="" className="w-[70%]" />
                           <p className="text-base font-semibold text-gray-700">{activeProject.kontraktor || "TBA"}</p>
                        </div>
                        <div className="w-full h-full">
                           <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Logo Konsultan</p>
                           <img src={activeProject.logo_konsultan ? `http://localhost:3000/uploads/${activeProject.logo_konsultan}` : "/placeholder.png"} alt="" className="w-[70%]" />
                           <p className="text-base font-semibold text-gray-700">{activeProject.konsultan || "TBA"}</p>
                        </div>
                        <div className="w-full h-full">
                           <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Logo Client</p>
                           <img src={activeProject.logo_client ? `http://localhost:3000/uploads/${activeProject.logo_client}` : "/placeholder.png"} alt="" className="w-[70%]" />
                           <p className="text-base font-semibold text-gray-700">{activeProject.client || "TBA"}</p>
                        </div>
                     </div>

                     <div className="w-full h-[2px] bg-muted-gray my-8"></div>
                     <div className="my-6">
                        <div className="space-y-4">
                           <div>
                              <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">{activeProject.no_kontrak}</p>
                              <p className="text-lg font-black text-primary">{activeProject.kegiatan}</p>
                           </div>
                           <div>
                              <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Pekerjaan</p>
                              <p className="text-base font-semibold text-gray-700">{activeProject.pekerjaan}</p>
                           </div>

                           <div className="grid grid-cols-2 gap-6">
                              <div>
                                 <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Lokasi</p>
                                 <p className="text-base font-semibold text-gray-700">{activeProject.lokasi}</p>
                              </div>
                              <div>
                                 <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Waktu Pelaksanaan</p>
                                 <p className="text-base font-semibold text-gray-700">{activeProject.waktu_pelaksanaan} Hari</p>
                              </div>
                           </div>
                           <div className="grid grid-cols-2 gap-6">
                              <div>
                                 <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Nilai Kontrak</p>
                                 <p className="text-base font-semibold text-gray-700">{formatRupiah(activeProject.nilai_kontrak)}</p>
                              </div>
                              <div>
                                 <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Tahun Anggaran</p>
                                 <p className="text-base font-semibold text-gray-700">{activeProject.tahun}</p>
                              </div>
                           </div>

                        </div>
                     </div>
                  </div>
               ) : (
                  <div className="text-center py-12 text-gray-500">
                     <p>Pilih proyek terlebih dahulu</p>
                  </div>
               )}
            </m.div>
         </AnimatePresence>



         {/* 🚀 ANALYTICS SECTIONS */}
         <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">

            {/* CHART PROGRESS KUMULATIF */}
            <div className="bg-neutral p-8 rounded-3xl shadow-sm border border-muted-gray flex flex-col justify-between">
               <div className="flex justify-between items-start mb-6">
                  <div>
                     <h3 className="text-xl font-bold text-primary flex items-center gap-2"> Progress Kumulatif Proyek</h3>
                     <p className="text-sm text-gray-500 mt-1">Perbandingan Realisasi vs Rencana Mingguan (%)</p>
                  </div>
                  <div className="flex gap-4 text-xs font-bold bg-background px-4 py-2 rounded-xl border border-muted-gray">
                     <span className="flex items-center gap-2"><div className="w-3 h-3 bg-secondary rounded-full shadow-sm"></div> Realisasi</span>
                     <span className="flex items-center gap-2"><div className="w-3 h-3 bg-gray-300 rounded-full shadow-sm"></div> Rencana</span>
                  </div>
               </div>

               <div className="h-64 sm:h-80 w-full relative -ml-4">
                  <ResponsiveContainer width="100%" height="100%">
                     <LineChart data={projectProgressData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dx={-5} domain={[0, 100]} />
                        <RechartsTooltip
                           cursor={{ stroke: '#94A3B8', strokeWidth: 1, strokeDasharray: '4 4' }}
                           contentStyle={{ borderRadius: '16px', border: '1px solid #E2E8F0', padding: '12px', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)' }}
                        />
                        <Line type="monotone" dataKey="rencana" stroke="#94A3B8" strokeWidth={3} dot={{ fill: '#94A3B8', strokeWidth: 2, r: 4 }} />
                        <Line type="monotone" dataKey="real" stroke="var(--color-secondary, #ff5511)" strokeWidth={4} dot={{ fill: 'var(--color-secondary, #ff5511)', strokeWidth: 2, r: 4 }} />
                     </LineChart>
                  </ResponsiveContainer>
               </div>
            </div>

            {/* CHART RENCANA BOBOT PER MINGGU */}
            <div className="bg-neutral p-8 rounded-3xl shadow-sm border border-muted-gray flex flex-col">
               <h3 className="text-xl font-bold text-primary flex items-center gap-2 mb-2"><BarChartIcon className="text-secondary" size={20} /> Rencana Bobot per Minggu</h3>
               <p className="text-sm text-gray-500 mb-6">Distribusi beban kerja mingguan.</p>

               <div className="flex-1 min-h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={weeklyChartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} dy={10} />
                        <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                        <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                        <RechartsTooltip
                           cursor={{ fill: '#f1f5f9' }}
                           contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar yAxisId="left" dataKey="Bobot" fill="#34D399" radius={[4, 4, 0, 0]} maxBarSize={30} />
                        <Line yAxisId="right" type="monotone" dataKey="Kumulatif" stroke="#3B82F6" strokeWidth={2} dot={{ strokeWidth: 1, r: 3, fill: '#fff' }} />
                     </BarChart>
                  </ResponsiveContainer>
               </div>

               <div className="pt-4 border-t border-muted-gray mt-2 flex justify-between gap-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-600">
                     <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full"></div> Per Minggu
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-600">
                     <div className="w-2.5 h-2.5 bg-blue-500 rounded-full"></div> Kumulatif
                  </div>
               </div>
            </div>
         </div>

         {/* 🚀 QUICK ACTIONS */}
         <div className="bg-neutral rounded-3xl shadow-sm border border-muted-gray p-8 mb-8">
            <h3 className="text-xl font-bold text-primary mb-6 flex items-center gap-2">
               Modul & Pelaporan Proyek
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
               <button disabled={!activeProject} onClick={() => navigateToProject('boq')} className={`bg-accent/20 hover:bg-accent/30 border border-accent/30 hover:border-accent/50 rounded-xl p-4 cursor-pointer transition-colors group ${!activeProject ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <ClipboardList size={32} strokeWidth={2} className="text-secondary mx-auto mb-2 group-hover:scale-110 transition-transform" />
                  <p className="text-sm font-bold text-primary">BOQ</p>
                  <p className="text-xs text-gray-500">Bill of Quantity</p>
               </button>
               <button disabled={!activeProject} onClick={() => navigateToProject('schedule')} className={`bg-accent/20 hover:bg-accent/30 border border-accent/30 hover:border-accent/50 rounded-xl p-4 cursor-pointer transition-colors group ${!activeProject ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <Calendar size={32} strokeWidth={2} className="text-secondary mx-auto mb-2 group-hover:scale-110 transition-transform" />
                  <p className="text-sm font-bold text-primary">Schedule</p>
                  <p className="text-xs text-gray-500">Jadwal Pelaksanaan</p>
               </button>
               <button disabled={!activeProject} onClick={() => navigateToProject('daily-plan')} className={`bg-accent/20 hover:bg-accent/30 border border-accent/30 hover:border-accent/50 rounded-xl p-4 cursor-pointer transition-colors group ${!activeProject ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <Clock size={32} strokeWidth={2} className="text-secondary mx-auto mb-2 group-hover:scale-110 transition-transform" />
                  <p className="text-sm font-bold text-primary">Daily Plan</p>
                  <p className="text-xs text-gray-500">Rencana Harian</p>
               </button>
               <button disabled={!activeProject} onClick={() => navigateToProject('progress')} className={`bg-accent/20 hover:bg-accent/30 border border-accent/30 hover:border-accent/50 rounded-xl p-4 cursor-pointer transition-colors group ${!activeProject ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <ClipboardCheck size={32} strokeWidth={2} className="text-secondary mx-auto mb-2 group-hover:scale-110 transition-transform" />
                  <p className="text-sm font-bold text-primary">Progress</p>
                  <p className="text-xs text-gray-500">Laporan Kemajuan</p>
               </button>
               <button disabled={!activeProject} onClick={() => navigateToProject('material')} className={`bg-accent/20 hover:bg-accent/30 border border-accent/30 hover:border-accent/50 rounded-xl p-4 cursor-pointer transition-colors group ${!activeProject ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <Cuboid size={32} strokeWidth={2} className="text-secondary mx-auto mb-2 group-hover:scale-110 transition-transform" />
                  <p className="text-sm font-bold text-primary">Material</p>
                  <p className="text-xs text-gray-500">Kontrol Bahan</p>
               </button>
               <button disabled={!activeProject} onClick={() => navigateToProject('tenaga')} className={`bg-accent/20 hover:bg-accent/30 border border-accent/30 hover:border-accent/50 rounded-xl p-4 cursor-pointer transition-colors group ${!activeProject ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <HardHat size={32} strokeWidth={2} className="text-secondary mx-auto mb-2 group-hover:scale-110 transition-transform" />
                  <p className="text-sm font-bold text-primary">Pekerja</p>
                  <p className="text-xs text-gray-500">Manajemen Tenaga</p>
               </button>
               <button disabled={!activeProject} onClick={() => navigateToProject('peralatan')} className={`bg-accent/20 hover:bg-accent/30 border border-accent/30 hover:border-accent/50 rounded-xl p-4 cursor-pointer transition-colors group ${!activeProject ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <Hammer size={32} strokeWidth={2} className="text-secondary mx-auto mb-2 group-hover:scale-110 transition-transform" />
                  <p className="text-sm font-bold text-primary">Peralatan</p>
                  <p className="text-xs text-gray-500">Manajemen Alat</p>
               </button>
               <button disabled={!activeProject} onClick={() => navigateToProject('analisa')} className={`bg-accent/20 hover:bg-accent/30 border border-accent/30 hover:border-accent/50 rounded-xl p-4 cursor-pointer transition-colors group ${!activeProject ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <Calculator size={32} strokeWidth={2} className="text-secondary mx-auto mb-2 group-hover:scale-110 transition-transform" />
                  <p className="text-sm font-bold text-primary">AHSP Proyek</p>
                  <p className="text-xs text-gray-500">Analisa Pekerjaan</p>
               </button>
               <button disabled={!activeProject} onClick={() => navigateToProject('laporan-harian')} className={`bg-accent/20 hover:bg-accent/30 border border-accent/30 hover:border-accent/50 rounded-xl p-4 cursor-pointer transition-colors group ${!activeProject ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <Calendar size={32} strokeWidth={2} className="text-secondary mx-auto mb-2 group-hover:scale-110 transition-transform" />
                  <p className="text-sm font-bold text-primary">Laporan Harian</p>
                  <p className="text-xs text-gray-500">Log Harian Proyek</p>
               </button>
               <button disabled={!activeProject} onClick={() => navigateToProject('laporan-mingguan')} className={`bg-accent/20 hover:bg-accent/30 border border-accent/30 hover:border-accent/50 rounded-xl p-4 cursor-pointer transition-colors group ${!activeProject ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <PieChartIcon size={32} strokeWidth={2} className="text-secondary mx-auto mb-2 group-hover:scale-110 transition-transform" />
                  <p className="text-sm font-bold text-primary">Laporan Mingguan</p>
                  <p className="text-xs text-gray-500">Laporan & Export</p>
               </button>
               <button disabled={!activeProject} onClick={() => navigateToProject('laporan-bulanan')} className={`bg-accent/20 hover:bg-accent/30 border border-accent/30 hover:border-accent/50 rounded-xl p-4 cursor-pointer transition-colors group ${!activeProject ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <ClipboardList size={32} strokeWidth={2} className="text-secondary mx-auto mb-2 group-hover:scale-110 transition-transform" />
                  <p className="text-sm font-bold text-primary">Laporan Bulanan</p>
                  <p className="text-xs text-gray-500">Rekapitulasi Bulanan</p>
               </button>
               <button disabled={!activeProject} onClick={() => navigateToProject('ttd-template')} className={`bg-accent/20 hover:bg-accent/30 border border-accent/30 hover:border-accent/50 rounded-xl p-4 cursor-pointer transition-colors group ${!activeProject ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <Signature size={32} strokeWidth={2} className="text-secondary mx-auto mb-2 group-hover:scale-110 transition-transform" />
                  <p className="text-sm font-bold text-primary">TTD Template</p>
                  <p className="text-xs text-gray-500">Tanda Tangan</p>
               </button>
            </div>
         </div>



         {/* MODAL ADD/EDIT PROJECT */}
         <AnimatePresence>
            {showModal && (
               <>
                  <m.div
                     initial={{ opacity: 0 }}
                     animate={{ opacity: 1 }}
                     exit={{ opacity: 0 }}
                     onClick={() => setShowModal(false)}
                     className="fixed inset-0 bg-black/50 z-40"
                  />
                  <m.div
                     initial={{ opacity: 0, scale: 0.8, y: 20 }}
                     animate={{ opacity: 1, scale: 1, y: 0 }}
                     exit={{ opacity: 0, scale: 0.8 }}
                     transition={{ duration: 0.35, type: spring }}
                     className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 p-6 bg-white rounded-lg shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]"
                  >
                     <div className="px-6 py-4 border-b-2 border-muted-gray flex items-center justify-between">

                        <div className="">
                        </div>
                        <h2 className="text-2xl font-bold text-primary text-center">
                           {editId ? "Edit Proyek" : "Tambah Proyek Baru"}
                        </h2>
                        <m.button
                           whileHover={{ scale: 1.1 }}
                           whileTap={{ scale: 0.9 }}
                           onClick={() => setShowModal(false)}
                           className="text-gray-500 hover:text-gray-700"
                        >
                           <X size={24} />
                        </m.button>
                     </div>

                     <div className="p-6 overflow-y-auto">
                        <form id="project-form" onSubmit={handleSubmit} className="space-y-6">
                           {/* Project Info */}
                           <div>
                              <h3 className="text-sm font-semibold text-secondary uppercase mb-3 border-b pb-2">Informasi Proyek</h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Kegiatan *</label>
                                    <input
                                       type="text"
                                       name="kegiatan"
                                       value={form.kegiatan}
                                       onChange={handleChange}
                                       className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-secondary focus:outline-none"
                                       required
                                    />
                                 </div>
                                 <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tahun Anggaran</label>
                                    <input
                                       type="number"
                                       name="tahun"
                                       value={form.tahun}
                                       onChange={handleChange}
                                       className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-secondary focus:outline-none"
                                    />
                                 </div>
                              </div>
                              <div className="mt-4">
                                 <label className="block text-sm font-medium text-gray-700 mb-1">Pekerjaan *</label>
                                 <textarea
                                    name="pekerjaan"
                                    value={form.pekerjaan}
                                    onChange={handleChange}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-secondary focus:outline-none"
                                    required
                                 />
                              </div>
                              <div className="mt-4">
                                 <label className="block text-sm font-medium text-gray-700 mb-1">Lokasi</label>
                                 <input
                                    type="text"
                                    name="lokasi"
                                    value={form.lokasi}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-secondary focus:outline-none"
                                 />
                              </div>
                           </div>

                           {/* Contract Info */}
                           <div>
                              <h3 className="text-sm font-semibold text-secondary uppercase mb-3 border-b pb-2">Informasi Kontrak</h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">No. Kontrak</label>
                                    <input
                                       type="text"
                                       name="no_kontrak"
                                       value={form.no_kontrak}
                                       onChange={handleChange}
                                       className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-secondary focus:outline-none"
                                    />
                                 </div>
                                 <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nilai Kontrak</label>
                                    <input
                                       type="number"
                                       name="nilai_kontrak"
                                       value={form.nilai_kontrak}
                                       onChange={handleChange}
                                       className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-secondary focus:outline-none"
                                    />
                                 </div>
                                 <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Kontrak</label>
                                    <input
                                       type="date"
                                       name="tgl_kontrak"
                                       value={form.tgl_kontrak}
                                       onChange={handleChange}
                                       className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-secondary focus:outline-none"
                                    />
                                 </div>
                                 <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">No. SPMK</label>
                                    <input
                                       type="text"
                                       name="no_spmk"
                                       value={form.no_spmk}
                                       onChange={handleChange}
                                       className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-secondary focus:outline-none"
                                    />
                                 </div>
                                 <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal SPMK</label>
                                    <input
                                       type="date"
                                       name="tgl_spmk"
                                       value={form.tgl_spmk}
                                       onChange={handleChange}
                                       className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-secondary focus:outline-none"
                                    />
                                 </div>
                                 <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Selesai</label>
                                    <input
                                       type="date"
                                       name="end_date"
                                       value={form.end_date}
                                       onChange={handleChange}
                                       className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-secondary focus:outline-none"
                                    />
                                 </div>
                              </div>
                              <div className="mt-4">
                                 <label className="block text-sm font-medium text-gray-700 mb-1">Waktu Pelaksanaan (Hari)</label>
                                 <input
                                    type="number"
                                    name="waktu_pelaksanaan"
                                    value={form.waktu_pelaksanaan}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-secondary focus:outline-none"
                                    readOnly
                                 />
                              </div>
                           </div>

                           {/* Parties */}
                           <div>
                              <h3 className="text-sm font-semibold text-secondary uppercase mb-3 border-b pb-2">Pihak Terlibat</h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Kontraktor</label>
                                    <input
                                       type="text"
                                       name="kontraktor"
                                       value={form.kontraktor}
                                       onChange={handleChange}
                                       className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-secondary focus:outline-none"
                                    />
                                 </div>
                                 <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Konsultan</label>
                                    <input
                                       type="text"
                                       name="konsultan"
                                       value={form.konsultan}
                                       onChange={handleChange}
                                       className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-secondary focus:outline-none"
                                    />
                                 </div>
                              </div>
                           </div>

                           {/* Logos */}
                           <div>
                              <h3 className="text-sm font-semibold text-secondary uppercase mb-3 border-b pb-2">Logo & Dokumen</h3>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                 <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Logo Kontraktor</label>
                                    <input
                                       type="file"
                                       name="logo_kontraktor"
                                       onChange={handleFileChange}
                                       accept="image/*"
                                       className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-secondary focus:outline-none"
                                    />
                                    {form.logo_kontraktor && (
                                       <img
                                          src={typeof form.logo_kontraktor === "string" ? `http://localhost:3000/uploads/${form.logo_kontraktor}` : URL.createObjectURL(form.logo_kontraktor)}
                                          className="h-12 mt-2 object-contain"
                                          alt="Logo Kontraktor"
                                       />
                                    )}
                                 </div>
                                 <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Logo Konsultan</label>
                                    <input
                                       type="file"
                                       name="logo_konsultan"
                                       onChange={handleFileChange}
                                       accept="image/*"
                                       className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-secondary focus:outline-none"
                                    />
                                    {form.logo_konsultan && (
                                       <img
                                          src={typeof form.logo_konsultan === "string" ? `http://localhost:3000/uploads/${form.logo_konsultan}` : URL.createObjectURL(form.logo_konsultan)}
                                          className="h-12 mt-2 object-contain"
                                          alt="Logo Konsultan"
                                       />
                                    )}
                                 </div>
                                 <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Logo Client</label>
                                    <input
                                       type="file"
                                       name="logo_client"
                                       onChange={handleFileChange}
                                       accept="image/*"
                                       className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-secondary focus:outline-none"
                                    />
                                    {form.logo_client && (
                                       <img
                                          src={typeof form.logo_client === "string" ? `http://localhost:3000/uploads/${form.logo_client}` : URL.createObjectURL(form.logo_client)}
                                          className="h-12 mt-2 object-contain"
                                          alt="Logo Client"
                                       />
                                    )}
                                 </div>
                              </div>
                           </div>
                        </form>
                     </div>

                     <div className="px-6 py-6">
                        <m.button
                           whileHover={{ scale: 1.02, transition: { duration: 0.3, type: "spring" } }}
                           whileTap={{ scale: 0.9 }}
                           type="submit"
                           form="project-form"
                           className="w-full py-4 font-semibold bg-secondary text-white hover:bg-secondary/90 transition-colors tracking-wide"
                        >
                           {editId ? "UPDATE" : "SIMPAN"}
                        </m.button>
                     </div>
                  </m.div>
               </>
            )}
         </AnimatePresence>

      </div>
   );
}