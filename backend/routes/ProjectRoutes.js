import { upload } from "../middleware/upload.js";
import express from "express";
import {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  updateProjectWeekSetting,
  createProjectVersion,
  getProjectVersions,
  getProjectVersionById,
  updateProjectVersion,
  deleteProjectVersion

} from "../controllers/ProjectController.js";

const router = express.Router();

//  GET ALL (dashboard)
router.get("/projects", getProjects);

//  GET DETAIL
router.get("/projects/:id", getProjectById);

//  CREATE
router.post(
  "/projects",
  upload.fields([
    { name: "logo_kontraktor" },
    { name: "logo_konsultan" },
    { name: "logo_client" }
  ]),
  createProject
);

//  UPDATE
router.put(
  "/projects/:id",
  upload.fields([
    { name: "logo_kontraktor" },
    { name: "logo_konsultan" },
    { name: "logo_client" }
  ]),
  updateProject
);

//  DELETE
router.delete("/projects/:id", deleteProject);

//ettng projek dailiplan
router.put(
  "/project-week-setting/:project_id",
  updateProjectWeekSetting
);


router.post(
  "/project-versions",
  createProjectVersion
);

router.get(
  "/project-versions/project/:project_id",
  getProjectVersions
);

router.get(
  "/project-versions/:id",
  getProjectVersionById
);

router.put(
  "/project-versions/:id",
  updateProjectVersion
);

router.delete(
  "/project-versions/:id",
  deleteProjectVersion
);



export default router;