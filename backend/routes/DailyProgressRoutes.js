import express from "express";
import {
  createDailyProgress,
  getDailyProgress,
  getProgressSummary
} from "../controllers/DailyProgressController.js";

const router = express.Router();

router.post("/daily-progress", createDailyProgress);
router.get("/daily-progress", getDailyProgress);
router.get("/progress-summary/:boq_id", getProgressSummary);

export default router;