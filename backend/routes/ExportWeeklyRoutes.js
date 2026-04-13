import express from "express";
import { exportWeeklyReportExcel } from "../controllers/ExportWeeklyController.js";

const router = express.Router();

router.get("/export-weekly/:project_id", exportWeeklyReportExcel);

export default router;