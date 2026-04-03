import express from "express";
import {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject
} from "../controllers/ProjectController.js";

const router = express.Router();

// 🔥 GET ALL (dashboard)
router.get("/projects", getProjects);

// 🔥 GET DETAIL
router.get("/projects/:id", getProjectById);

// 🔥 CREATE
router.post("/projects", createProject);

// 🔥 UPDATE
router.put("/projects/:id", updateProject);

// 🔥 DELETE
router.delete("/projects/:id", deleteProject);

export default router;