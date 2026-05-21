import express from "express";
import { exportDailyReportExcel, exportDailyReportPdf} from "../controllers/ReportExportController.js";
import { exportTimeSchedule } from "../controllers/ExportScheduleController.js";

const router = express.Router();

router.get("/export-daily/:project_id", exportDailyReportExcel);
router.get("/export-time-schedule/:project_id", exportTimeSchedule);
router.get("/daily-report-pdf/:project_id", exportDailyReportPdf);

export default router;

