import express from "express";
import { getWeeklyReport, getMonthlyReport, getDailyReport } from "../controllers/ReportController.js";

const router = express.Router();

router.get("/weekly-report/:project_id", getWeeklyReport);
router.get("/monthly-report/:project_id", getMonthlyReport);
router.get("/daily-report/:project_id", getDailyReport);

export default router;