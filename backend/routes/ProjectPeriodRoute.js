import express from "express";
import {
  getProjectPeriods,
  getProjectPeriodById,
  createProjectPeriod,
  updateProjectPeriod,
  deleteProjectPeriod
} from "../controllers/ProjectPeriodController.js";

const router = express.Router();

router.get("/project-periods", getProjectPeriods);
router.get("/project-periods/:id", getProjectPeriodById);
router.post("/project-periods", createProjectPeriod);
router.put("/project-periods/:id", updateProjectPeriod);
router.delete("/project-periods/:id", deleteProjectPeriod);

export default router;