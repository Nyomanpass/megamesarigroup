import express from "express";
import { exportDailyReportExcel } from "../controllers/ReportExportController.js";

const router = express.Router();

router.get("/export-daily/:project_id", exportDailyReportExcel);

export default router;