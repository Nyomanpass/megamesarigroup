import express from "express";
import {
  createDailyProgress,
  getDailyProgress,
  getProgressSummary,
  updateDailyProgress,
  getDailyProgressById
} from "../controllers/DailyProgressController.js";

const router = express.Router();

router.post("/daily-progress", createDailyProgress);
router.get("/daily-progress", getDailyProgress);
router.get("/progress-summary/:boq_id", getProgressSummary);
router.put("/daily-progress/:id", updateDailyProgress);
router.get("/daily-progress/:id", getDailyProgressById);

export default router;