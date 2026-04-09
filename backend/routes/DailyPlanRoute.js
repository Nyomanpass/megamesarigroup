import express from "express";
import { generateDailyPlan, getDailyPlan, getWeeklyReport, getMonthlyReport, getWeeklyChart } from "../controllers/DailyPlanController.js";

const router = express.Router();

router.post('/daily-plan/generate/:project_id', generateDailyPlan);
router.get('/daily-plan/:project_id', getDailyPlan);
router.get('/daily-plan/weekly-report/:project_id', getWeeklyReport);
router.get('/daily-plan/monthly-report/:project_id', getMonthlyReport);
router.get("/daily-plan/weekly-chart/:project_id", getWeeklyChart);

export default router;