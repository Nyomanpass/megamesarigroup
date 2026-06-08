import express from "express";
import { 
    createProjectAnalisa,
    getProjectAnalisa,
    getProjectAnalisaById,
    updateProjectAnalisa, 
    deleteProjectAnalisa,
    bulkDeleteProjectAnalisa }
from "../controllers/AnalisaProjectController.js";

const router = express.Router();

router.post("/project-analisa", createProjectAnalisa);
router.get("/project-analisa", getProjectAnalisa);
router.get("/project-analisa/:id", getProjectAnalisaById);
router.put("/project-analisa/:id", updateProjectAnalisa);
router.delete("/project-analisa/bulk", bulkDeleteProjectAnalisa);
router.delete("/project-analisa/:id", deleteProjectAnalisa);

export default router;
