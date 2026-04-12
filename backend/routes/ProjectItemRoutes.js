import express from "express";
import {
  getProjectItems,
  getProjectItemById,
  createProjectItem,
  updateProjectItem,
  deleteProjectItem,
  bulkCreateProjectItems
} from "../controllers/ProjectItemController.js";

const router = express.Router();

router.get("/project-items", getProjectItems);
router.get("/project-items/:id", getProjectItemById);
router.post("/project-items", createProjectItem);
router.put("/project-items/:id", updateProjectItem);
router.delete("/project-items/:id", deleteProjectItem);
router.post("/project-items/bulk", bulkCreateProjectItems);

export default router;