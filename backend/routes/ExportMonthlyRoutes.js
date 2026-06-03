import express from "express";
import { exportMonthlyReportExcel, exportMonthlyReportPDF } from "../controllers/ExportMonthlyController.js";

const router = express.Router();

// 🔥 ROUTE EXPORT BULANAN
router.get("/export-monthly/:project_id", exportMonthlyReportExcel);
router.get("/monthly-report-pdf/:project_id", exportMonthlyReportPDF);

export default router;