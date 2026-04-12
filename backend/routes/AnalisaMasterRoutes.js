import express from "express";
import {
  createAnalisa,
  getAnalisa,
  getAnalisaById,
  updateAnalisa,
  deleteAnalisa,
  importAnalisaToProject
} from "../controllers/AnalisaMasterController.js";

const router = express.Router();

router.post("/master/analisa", createAnalisa);
router.get("/master/analisa", getAnalisa);
router.get("/master/analisa/:id", getAnalisaById);
router.put("/master/analisa/:id", updateAnalisa);
router.delete("/master/analisa/:id", deleteAnalisa);
router.post("/project-analisa/import", importAnalisaToProject);

export default router;