import express from "express";
import {
  getMaterials,
  createMaterial,
  updateMaterial,
  deleteMaterial
} from "../controllers/MaterialController.js";

const router = express.Router();

router.get("/materials/:project_id", getMaterials);
router.post("/materials", createMaterial);
router.put("/materials/:id", updateMaterial);
router.delete("/materials/:id", deleteMaterial);

export default router;