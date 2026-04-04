import express from "express";
import {
  getPeralatan,
  createPeralatan,
  updatePeralatan,
  deletePeralatan
} from "../controllers/PeralatanController.js";

const router = express.Router();

router.get("/peralatan/:project_id", getPeralatan);
router.post("/peralatan", createPeralatan);
router.put("/peralatan/:id", updatePeralatan);
router.delete("/peralatan/:id", deletePeralatan);

export default router;