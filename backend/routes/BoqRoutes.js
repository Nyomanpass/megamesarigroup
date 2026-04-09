import express from "express";
import {
  createBoq,
  getBoqByProject,
  getBoqById,
  updateBoq,
  deleteBoq,
  createBulkBoq,
 
} from "../controllers/BoqController.js";

const router = express.Router();

// 🔥 CREATE
router.post("/boq", createBoq);

// 🔥 GET BY PROJECT
router.get("/boq/project/:project_id", getBoqByProject);

// 🔥 GET DETAIL
router.get("/boq/:id", getBoqById);

// 🔥 UPDATE
router.patch("/boq/:id", updateBoq);

// 🔥 DELETE
router.delete("/boq/:id", deleteBoq);

router.post('/boq/bulk', createBulkBoq);


export default router;