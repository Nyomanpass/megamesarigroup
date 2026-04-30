import express from "express";
import {
  createTtd,
  updateTtd,
  saveTtd,
  getTtdById,
  getTtdByProject,
  getAllTtd,
  deleteTtd
} from "../controllers/TtdController.js";

const router = express.Router();

// CREATE
router.post("/ttd/create", createTtd);

// UPSERT
router.post("/ttd/save", saveTtd);

// UPDATE
router.put("/ttd/:id", updateTtd);

// GET (⚠️ URUTAN PENTING)
router.get("/ttd", getTtdByProject); 
router.get("/ttd/:id", getTtdById);

// GET ALL
router.get("/ttd-all", getAllTtd);

// DELETE
router.delete("/ttd/:id", deleteTtd);

export default router;