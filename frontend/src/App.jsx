import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import { ProjectProvider } from "./context/ProjectContext";

import Register from "./pages/Register";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/layout/Layout";
// import ProjectDetail removed; functionality moved to Dashboard
import BoqPage from "./pages/BoqPage";
import SchedulePage from "./pages/SchedulePage";
import DailyPlanPage from "./pages/DailyPlanPage";
import DailyProgressPage from "./pages/DailyProgressPage";
import WeeklyReportPage from "./pages/WeeklyReportPage";
import MonthlyReportPage from "./pages/MonthlyReportPage";
import DailyReportPage from "./pages/DailyReportPage";
import MaterialPage from "./pages/MaterialPage";
import PekerjaPage from "./pages/PekerjaPage";
import PeralatanPage from "./pages/PeralatanPage";
import ProjectAnalisaPage from "./pages/ProjekAnalisaPage";
import ProjectAnalisaDetailPage from "./pages/ProjectAnalisaDetailPage";
import MasterItemPage from "./pages/settings/MasterItemPage";
import AnalisaMasterPage from "./pages/settings/AnalisaMasterPage";
import AnalisaDetailPage from "./pages/settings/AnalisaDetailPage";
import TtdTemplatePage from "./pages/TtdTemplatePage";
import { getAccessToken } from "./utils/auth";

const ErrorPage = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-100">
    <div className="bg-white p-8 rounded-lg shadow-md text-center">
      <h1 className="text-2xl font-bold text-red-600 mb-4">Oops!</h1>
      <p className="text-gray-600 mb-4">Something went wrong.</p>
      <button
        onClick={() => window.location.href = '/'}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        Go Home
      </button>
    </div>
  </div>
);

const LoadingPage = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-100">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
      <p className="text-gray-600">Loading...</p>
    </div>
  </div>
);

const authLoader = async () => {
  return { authenticated: Boolean(getAccessToken()) };
};

const ProtectedElement = ({ element }) => (
  <ProtectedRoute>
    {element}
  </ProtectedRoute>
);

const protectedPageRoutes = [
  { path: "/dashboard", element: <Dashboard /> },
  { path: "/project", element: <Navigate to="/dashboard" replace /> },
  { path: "/boq", element: <BoqPage /> },
  { path: "/schedule", element: <SchedulePage /> },
  { path: "/daily-plan", element: <DailyPlanPage /> },
  { path: "/progress", element: <DailyProgressPage /> },
  { path: "/laporan-mingguan", element: <WeeklyReportPage /> },
  { path: "/laporan-bulanan", element: <MonthlyReportPage /> },
  { path: "/laporan-harian", element: <DailyReportPage /> },
  { path: "/material", element: <MaterialPage /> },
  { path: "/tenaga", element: <PekerjaPage /> },
  { path: "/peralatan", element: <PeralatanPage /> },
  { path: "/analisa", element: <ProjectAnalisaPage /> },
  { path: "/analisa/:analisaId", element: <ProjectAnalisaDetailPage /> },
  { path: "/settings/masteritem", element: <MasterItemPage /> },
  { path: "/settings/analisa", element: <AnalisaMasterPage /> },
  { path: "/settings/analisa/:id", element: <AnalisaDetailPage /> },
  { path: "/ttd-template", element: <TtdTemplatePage /> },
];

const router = createBrowserRouter([
  {
    path: "/",
    element: <Login />,
    errorElement: <ErrorPage />,
  },
  {
    path: "/register",
    element: <Register />,
    errorElement: <ErrorPage />,
  },
  {
    element: <ProtectedElement element={<ProjectProvider><Layout /></ProjectProvider>} />,
    loader: authLoader,
    errorElement: <ErrorPage />,
    children: protectedPageRoutes,
  },
  {
    path: "*",
    element: <Navigate to="/dashboard" replace />,
    loader: authLoader,
  },
]);

function App() {
  return <RouterProvider router={router} fallbackElement={<LoadingPage />} />;
}

export default App;
