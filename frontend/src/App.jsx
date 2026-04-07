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
import Project from "./pages/Project";

import MasterItemPage from "./pages/settings/MasterItemPage";
import AnalisaMasterPage from "./pages/settings/AnalisaMasterPage";
import AnalisaDetailPage from "./pages/settings/AnalisaDetailPage";


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

import Layout from "./components/layout/Layout";

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
    element: <ProtectedElement element={<Layout />} />,
    loader: authLoader,
    errorElement: <ErrorPage />,
    children: [
      {
        path: "/dashboard",
        element: <Dashboard />,
      },
      {
        path: "/project",
        element: <Project />,
      },
      {
        path: "/project/:id",
        element: <ProjectDetail />,
      },
      {
        path: "/project/:id/boq",
        element: <BoqPage />,
      },
      {
        path: "/project/:id/schedule",
        element: <SchedulePage />,
      },
      {
        path: "/project/:id/daily-plan",
        element: <DailyPlanPage />,
      },
      {
        path: "/project/:id/progress",
        element: <DailyProgressPage />,
      },
      {
        path: "/project/:id/laporan-mingguan",
        element: <WeeklyReportPage />,
      },
      {
        path: "/project/:id/laporan-bulanan",
        element: <MonthlyReportPage />,
      },
      {
        path: "/project/:id/laporan-harian",
        element: <DailyReportPage />,
      },
      {
        path: "/project/:id/material",
        element: <MaterialPage />,
      },
      {
        path: "/project/:id/tenaga",
        element: <PekerjaPage />,
      },
      {
        path: "/project/:id/peralatan",
        element: <PeralatanPage />,
      },
      {
        path: "/settings/masteritem",
        element: <MasterItemPage />,
      },
        {
          path: "/settings/analisa",
          element: <AnalisaMasterPage />,
        },
        {
          path: "/settings/analisa/:id",
          element: <AnalisaDetailPage />,
        }
      ]
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