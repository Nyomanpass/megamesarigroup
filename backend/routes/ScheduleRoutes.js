// routes/scheduleRoutes.js
import express from "express";
import { generateWeeks, getWeeksByProject, getScheduleByProject, bulkSaveSchedule} from "../controllers/ScheduleController.js";

const router = express.Router();

router.post("/schedule/generate-weeks/:project_id", generateWeeks);
router.get("/schedule/weeks/:project_id", getWeeksByProject);
router.get("/schedule/:project_id", getScheduleByProject);
router.post("/schedule/bulk-save/:project_id", bulkSaveSchedule);

export default router;