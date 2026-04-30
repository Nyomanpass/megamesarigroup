import express from "express";
import { exportMonthlyReportExcel } from "../controllers/ExportMonthlyController.js";

const router = express.Router();

// 🔥 ROUTE EXPORT BULANAN
router.get("/export-monthly/:project_id", exportMonthlyReportExcel);

export default router;