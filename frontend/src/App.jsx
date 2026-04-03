import { BrowserRouter, Routes, Route } from "react-router-dom";

import Register from "./pages/Register";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard"; // ✅ tambahkan
import ProtectedRoute from "./components/ProtectedRoute"; // ✅ tambahkan
import ProjectDetail from "./pages/ProjectDetail";
import BoqPage from "./pages/BoqPage";
import SchedulePage from "./pages/SchedulePage";
import DailyPlanPage from "./pages/DailyPlanPage";
import DailyProgressPage from "./pages/DailyProgressPage";


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

      </Routes>
    </BrowserRouter>
  );
}

export default App;