import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";

import Register from "./pages/Register";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import ProjectDetail from "./pages/ProjectDetail";
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

// Error boundary component
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

// Loading component
const LoadingPage = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-100">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
      <p className="text-gray-600">Loading...</p>
    </div>
  </div>
);

// Auth check loader
const authLoader = async () => {
  const token = localStorage.getItem("accessToken");
  if (!token) {
    return { authenticated: false };
  }
  return { authenticated: true };
};

// Protected route wrapper for router config
const ProtectedElement = ({ element }) => (
  <ProtectedRoute>
    {element}
  </ProtectedRoute>
);

// Route configuration
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
    path: "/dashboard",
    element: <ProtectedElement element={<Dashboard />} />,
    loader: authLoader,
    errorElement: <ErrorPage />,
  },
  {
    path: "/project/:id",
    element: <ProtectedElement element={<ProjectDetail />} />,
    loader: authLoader,
    errorElement: <ErrorPage />,
  },
  {
    path: "/project/:id/boq",
    element: <ProtectedElement element={<BoqPage />} />,
    loader: authLoader,
    errorElement: <ErrorPage />,
  },
  {
    path: "/project/:id/schedule",
    element: <ProtectedElement element={<SchedulePage />} />,
    loader: authLoader,
    errorElement: <ErrorPage />,
  },
  {
    path: "/project/:id/daily-plan",
    element: <ProtectedElement element={<DailyPlanPage />} />,
    loader: authLoader,
    errorElement: <ErrorPage />,
  },
  {
    path: "/project/:id/progress",
    element: <ProtectedElement element={<DailyProgressPage />} />,
    loader: authLoader,
    errorElement: <ErrorPage />,
  },
  {
    path: "/project/:id/laporan-mingguan",
    element: <ProtectedElement element={<WeeklyReportPage />} />,
    loader: authLoader,
    errorElement: <ErrorPage />,
  },
  {
    path: "/project/:id/laporan-bulanan",
    element: <ProtectedElement element={<MonthlyReportPage />} />,
    loader: authLoader,
    errorElement: <ErrorPage />,
  },
  {
    path: "/project/:id/laporan-harian",
    element: <ProtectedElement element={<DailyReportPage />} />,
    loader: authLoader,
    errorElement: <ErrorPage />,
  },
  {
    path: "/project/:id/material",
    element: <ProtectedElement element={<MaterialPage />} />,
    loader: authLoader,
    errorElement: <ErrorPage />,
  },
  {
    path: "/project/:id/tenaga",
    element: <ProtectedElement element={<PekerjaPage />} />,
    loader: authLoader,
    errorElement: <ErrorPage />,
  },
  {
    path: "/project/:id/peralatan",
    element: <ProtectedElement element={<PeralatanPage />} />,
    loader: authLoader,
    errorElement: <ErrorPage />,
  },
  // Catch all route - redirect to dashboard if authenticated, otherwise to login
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