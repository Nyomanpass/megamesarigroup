import { upload } from "../middleware/upload.js";
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
router.post(
  "/projects",
  upload.fields([
    { name: "logo_kontraktor" },
    { name: "logo_konsultan" },
    { name: "logo_client" }
  ]),
  createProject
);

// 🔥 UPDATE
router.put(
  "/projects/:id",
  upload.fields([
    { name: "logo_kontraktor" },
    { name: "logo_konsultan" },
    { name: "logo_client" }
  ]),
  updateProject
);

// 🔥 DELETE
router.delete("/projects/:id", deleteProject);

export default router;