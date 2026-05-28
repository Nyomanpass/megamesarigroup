import express from "express";

import {

  generateWeeks,

  getWeeksByProject,

  getScheduleByProject,

  bulkSaveSchedule

} from "../controllers/ScheduleController.js";

const router = express.Router();

// ==========================
// GENERATE PROJECT WEEKS
// ==========================

router.post(
  "/schedule/generate-weeks/:project_id",
  generateWeeks
);

// ==========================
// GET PROJECT WEEKS
// ==========================

router.get(
  "/schedule/weeks/:project_id",
  getWeeksByProject
);

// ==========================
// GET SCHEDULE BY VERSION
// ==========================

router.get(
  "/schedule/:project_id/:version_id",
  getScheduleByProject
);

// ==========================
// SAVE SCHEDULE
// ==========================

router.post(
  "/schedule/bulk-save/:project_id",
  bulkSaveSchedule
);

export default router;