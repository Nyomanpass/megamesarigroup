import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../api";
import {
  MapPin, Calendar, Building2, Briefcase, FileText,
  CalendarDays, CalendarPlus, TrendingUp, FileCheck, BarChart as BarChartIcon,
  BarChart3, Package, Users, Wrench, Wallet, Folder, Calculator
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [progres, seProgres] = useState([]);
  const lastProgress = progres.length
    ? progres[progres.length - 1].kum_real
    : 0;

  const safeProgress = Math.min(lastProgress, 100);

  const [project, setProject] = useState(null);



  const fetchChart = async () => {
    try {
      const res = await api.get(`/daily-plan/weekly-chart/${id}`);
      seProgres(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProject();
    fetchChart();
  }, [id]);

  const fetchProject = async () => {
    try {
      const res = await api.get(`/projects/${id}`);
      setProject(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const formatRupiah = (angka) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(angka || 0);
  };

  const menus = [
    { title: "AHSP Proyek", path: "analisa", icon: Calculator, color: "emerald" },
    { title: "BOQ", path: "boq", icon: FileText, color: "blue" },
    { title: "Schedule", path: "schedule", icon: CalendarDays, color: "red" },
    { title: "Daily Plan", path: "daily-plan", icon: CalendarPlus, color: "green" },
    // { title: "Daily Progress", path: "progress", icon: TrendingUp, color: "yellow" },
    { title: "Laporan Harian", path: "laporan-harian", icon: FileCheck, color: "purple" },
    { title: "Laporan Mingguan", path: "laporan-mingguan", icon: BarChartIcon, color: "indigo" },
    { title: "Laporan Bulanan", path: "laporan-bulanan", icon: BarChart3, color: "pink" },
    { title: "Material", path: "material", icon: Package, color: "gray" },
    { title: "Tenaga Kerja", path: "tenaga", icon: Users, color: "orange" },
    { title: "Peralatan", path: "peralatan", icon: Wrench, color: "teal" },
  ];

  const getColorClasses = (color) => {
    const classes = {
      blue: "bg-blue-100 text-blue-600 border-blue-200",
      red: "bg-red-100 text-red-600 border-red-200",
      green: "bg-green-100 text-green-600 border-green-200",
      yellow: "bg-yellow-100 text-yellow-600 border-yellow-200",
      purple: "bg-purple-100 text-purple-600 border-purple-200",
      indigo: "bg-indigo-100 text-indigo-600 border-indigo-200",
      pink: "bg-pink-100 text-pink-600 border-pink-200",
      gray: "bg-gray-100 text-gray-700 border-gray-300",
      orange: "bg-orange-100 text-orange-600 border-orange-200",
      teal: "bg-teal-100 text-teal-600 border-teal-200",
    };
    return classes[color] || classes.gray;
  };

  // ✅ Dummy Data for Charts
  const chartData = progres.map(d => ({
    name: `Minggu ${d.minggu_ke}`,
    rencana: d.kum_rencana,
    real: d.kum_real
  }));

  const pieData = [
    { name: 'Selesai', value: lastProgress, color: '#10B981' },
    { name: 'Sisa', value: 100 - lastProgress, color: '#E2E8F0' }
  ];

  if (!project) {
    return (
      <div className="p-6 flex justify-center items-center h-[80vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-secondary"></div>
      </div>
    );
  }

  return (
    <>
      {/* breadcrumb */}
      <div className="mb-4 max-w-7xl mx-auto font-medium pt-6">
        <Link to="/project" className="text-gray-500 hover:text-secondary font-medium transition-colors">
          Project
        </Link> <span className="text-gray-400 mx-1">/</span>
        <span className="text-gray-800">{project.pekerjaan}</span>
      </div>

      {/* 🔥 Header & Navigation */}


      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary flex items-center gap-3">
            <Folder className="text-secondary" size={32} /> Detail Project
          </h1>
          <p className="text-gray-500 mt-2 font-medium">Pantau progres, realisasi, dan kelola semua modul kegiatan.</p>
        </div>
      </div>

      <div className="p-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 bg-neutral">

        {/* 🔥 INFO PROJECT CARD */}
        <div className=" mb-8 relative overflow-hidden">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-gray-100 pb-6 mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-sm font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">{project.no_kontrak || "No_KONTRAK"}</span>
                <span className="text-gray-500">|</span>
                <span className="text-sm font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">{project.no_spmk || "No_KONTRAK"}</span>
              </div>
              <h2 className="text-3xl font-extrabold text-gray-800 leading-tight">
                {project.pekerjaan}
              </h2>
              <p className="text-gray-500 mt-2 text-lg">{project.kegiatan}</p>
            </div>

            <div className="flex flex-col items-end space-y-3">
              <div className="flex items-center gap-2">
                <p className="">Status : </p>
                <p className="w-max px-3 py-1 bg-success text-white text-xs font-bold rounded-full tracking-wide shadow-sm">ONGOING</p>
              </div>
              <div className="text-left md:text-right bg-success/15 p-5 rounded-lg w-full md:w-auto relative z-10 shadow-inner">
                <p className="text-sm text-success/85 mb-1 font-bold tracking-wide uppercase flex items-center gap-2 justify-start md:justify-end"><Wallet size={16} /> Nilai Kontrak</p>
                <p className="text-2xl font-black text-success">{formatRupiah(project.nilai_kontrak)}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
            <div className="flex items-start gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors">
              <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl shrink-0"><MapPin size={24} /></div>
              <div>
                <p className="text-xs text-blue-600/70 uppercase font-bold tracking-wider mb-1">Lokasi</p>
                <p className="font-bold text-gray-800 leading-snug">{project.lokasi || "-"}</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors">
              <div className="p-3 bg-purple-100 text-purple-600 rounded-2xl shrink-0"><Calendar size={24} /></div>
              <div>
                <p className="text-xs text-purple-600/70 uppercase font-bold tracking-wider mb-1">Pelaksanaan</p>
                <p className="font-bold text-gray-800 leading-snug">
                  {project.waktu_pelaksanaan || "0"} Hari <span className="text-gray-400 font-medium">({project.tahun || "-"})</span>
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors">
              <div className="p-3 bg-orange-100 text-orange-600 rounded-2xl shrink-0"><Building2 size={24} /></div>
              <div>
                <p className="text-xs text-orange-600/70 uppercase font-bold tracking-wider mb-1">Kontraktor</p>
                <p className="font-bold text-gray-800 leading-snug">{project.kontraktor || "-"}</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors">
              <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl shrink-0"><Briefcase size={24} /></div>
              <div>
                <p className="text-xs text-emerald-600/70 uppercase font-bold tracking-wider mb-1">Pengawas</p>
                <p className="font-bold text-gray-800 leading-snug">{project.konsultan || "-"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 🔥 PROGRESS OVERVIEW WIDGETS (DUMMY) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">

          {/* Progress Keseluruhan */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col items-center justify-center relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-emerald-100 transition-colors"></div>

            <div className="relative w-32 h-32 mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    innerRadius={45}
                    outerRadius={60}
                    startAngle={90}
                    endAngle={-270}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center flex-col">
                <span className="text-3xl font-black text-gray-800 leading-none"> {safeProgress.toFixed(2)}
                  <span className="text-lg">%</span></span>
              </div>
            </div>
            <div className="text-center relative z-10">
              <h3 className="text-lg font-bold text-gray-800">Progress Pengerjaan</h3>

            </div>
          </div>

          {/* S-Curve Chart Mini */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:col-span-2 flex flex-col justify-between relative overflow-hidden">
            {/* Decorative */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl"></div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 relative z-10">
              <div>
                <p className="text-sm text-indigo-500 font-bold uppercase tracking-wider mb-1">Kurva S (Dummy)</p>
                <h3 className="text-xl font-bold text-gray-800">Rencana vs Realisasi Kumulatif</h3>
              </div>
              <div className="flex gap-4 text-xs font-bold bg-gray-50 px-3 py-1.5 rounded-full mt-3 sm:mt-0">
                <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-gray-300 rounded-full"></div> Rencana</span>
                <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-indigo-500 rounded-full shadow-sm"></div> Realisasi</span>
              </div>
            </div>

            <div className="h-40 w-full relative z-10 -ml-5">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>

                  <defs>
                    <linearGradient id="colorRencana" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#94A3B8" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#94A3B8" stopOpacity={0} />
                    </linearGradient>

                    <linearGradient id="colorReal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ff5511" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#ff5511" stopOpacity={0} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />

                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#64748b' }}
                  />

                  <YAxis
                    domain={[0, 100]}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#64748b' }}
                  />

                  <RechartsTooltip />

                  <Area
                    type="natural"
                    dataKey="rencana"
                    stroke="#94A3B8"
                    strokeWidth={3}
                    fill="url(#colorRencana)"
                  />

                  <Area
                    type="natural"
                    dataKey="real"
                    stroke="#ff5511"
                    strokeWidth={4}
                    fill="url(#colorReal)"
                    dot={false}
                    activeDot={{ r: 5 }}
                  />

                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>



        {/* 🔥 MENU FITUR */}
        <h3 className="text-xl font-black text-gray-800 mb-6 flex items-center gap-3">
          Modul & Pelaporan Proyek
        </h3>

        <div className="grid grid-cols-1 mb-4 gap-4 md:gap-5 mt-4">

          <button
            onClick={() => navigate(`/project/${id}/progress`)}
            className="bg-white group cursor-pointer border border-gray-100 shadow-sm hover:shadow-xl rounded-[1.5rem] p-6 transition-all duration-300 flex flex-col items-center justify-center gap-4 active:scale-95 hover:bg-gray-50"
          >
            <div className="p-4 rounded-2xl bg-yellow-100 text-yellow-600 transition-all duration-500 group-hover:scale-110 group-hover:-rotate-3 shadow-sm">
              <TrendingUp size={32} strokeWidth={2.5} />
            </div>

            <span className="font-bold text-gray-600 text-sm md:text-base text-center group-hover:text-gray-900 transition-colors">
              Daily Progress
            </span>
          </button>

        </div>


        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {menus.map((menu, index) => {
            const Icon = menu.icon;
            const colorClass = getColorClasses(menu.color);

            return (
              <button
                key={index}
                onClick={() => navigate(`/project/${id}/${menu.path}`)}
                className={`bg-white group cursor-pointer focus:outline-none focus:ring-4 focus:ring-opacity-50 hover:bg-gray-50 outline-none border border-gray-100 shadow-sm hover:shadow-xl rounded-[1.5rem] p-6 transition-all duration-300 flex flex-col items-center justify-center gap-4 active:scale-95`}
              >
                <div className={`p-4 rounded-2xl transition-all duration-500 group-hover:scale-110 group-hover:-rotate-3 shadow-sm ${colorClass}`}>
                  <Icon size={32} strokeWidth={2.5} />
                </div>
                <span className="font-bold text-gray-600 text-sm md:text-base text-center leading-tight group-hover:text-gray-900 transition-colors">
                  {menu.title}
                </span>
              </button>
            );
          })}
        </div>

      </div>
    </>
  );
}