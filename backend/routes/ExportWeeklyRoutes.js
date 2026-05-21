import express from "express";
import { exportWeeklyReportExcel, exportWeeklyReportPDF } from "../controllers/ExportWeeklyController.js";

const router = express.Router();

router.get("/export-weekly/:project_id", exportWeeklyReportExcel);
router.get("/weekly-report-pdf/:project_id", exportWeeklyReportPDF);

export default router;