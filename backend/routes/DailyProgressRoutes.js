import express from "express";
import {
  createDailyProgress,
  getDailyProgress,
  getProgressSummary,
  getDailyProgressById,
  updateDailyProgress,
  deleteDailyProgress
} from "../controllers/DailyProgressController.js";

const router = express.Router();

router.post("/daily-progress", createDailyProgress);
router.get("/daily-progress", getDailyProgress);
router.get("/progress-summary/:boq_id", getProgressSummary);
router.get("/daily-progress/:id", getDailyProgressById);
router.put("/daily-progress/:id", updateDailyProgress);
router.delete("/daily-progress/:id", deleteDailyProgress);

export default router;