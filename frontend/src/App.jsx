import { BrowserRouter, Routes, Route } from "react-router-dom";

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


function App() {
  return (  
    <BrowserRouter>
      <Routes>

        <Route path="/register" element={<Register />} />
        <Route path="/" element={<Login />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/project/:id"
          element={
            <ProtectedRoute>
              <ProjectDetail />
            </ProtectedRoute>
          }
        />

        <Route
          path="/project/:id/boq"
          element={
            <ProtectedRoute>
              <BoqPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/project/:id/schedule"
          element={
            <ProtectedRoute>
              <SchedulePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/project/:id/daily-plan"
          element={
            <ProtectedRoute>
              <DailyPlanPage />
            </ProtectedRoute>
          }
        />  

        <Route
          path="/project/:id/progress"
          element={
            <ProtectedRoute>
              <DailyProgressPage />
            </ProtectedRoute>
          }
        />  

        <Route
          path="/project/:id/laporan-mingguan"
          element={
            <ProtectedRoute>
              <WeeklyReportPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/project/:id/laporan-bulanan"
          element={
            <ProtectedRoute>
              <MonthlyReportPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/project/:id/laporan-harian"
          element={
            <ProtectedRoute>
              <DailyReportPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/project/:id/material"
          element={
            <ProtectedRoute>
              <MaterialPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/project/:id/tenaga"
          element={
            <ProtectedRoute>
              <PekerjaPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/project/:id/peralatan"
          element={
            <ProtectedRoute>
              <PeralatanPage />
            </ProtectedRoute>
          }
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;