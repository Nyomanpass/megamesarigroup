import express from "express";
import {
  getPekerja,
  createPekerja,
  updatePekerja,
  deletePekerja
} from "../controllers/PekerjaController.js";

const router = express.Router();

router.get("/pekerja/:project_id", getPekerja);
router.post("/pekerja", createPekerja);
router.put("/pekerja/:id", updatePekerja);
router.delete("/pekerja/:id", deletePekerja);

export default router;