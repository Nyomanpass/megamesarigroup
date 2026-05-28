import express from "express";
import {
  createBoq,
  getBoqByProject,
  getBoqById,
  updateBoq,
  deleteBoq,
  createBulkBoq,
  linkAnalisaBoq,

  createBoqVersionChange,
  getBoqVersionChanges,
  getBoqVersionChangeById,
  updateBoqVersionChange,
  deleteBoqVersionChange,
  createBoqAddendumItem,

  getBoqWithBobot

 
} from "../controllers/BoqController.js";

const router = express.Router();

// 🔥 CREATE
router.post("/boq", createBoq);

// 🔥 GET BY PROJECT
router.get(
  "/boq/project/:project_id/:version_id",
  getBoqByProject
);

// 🔥 GET DETAIL
router.get("/boq/:id", getBoqById);

// 🔥 UPDATE
router.patch("/boq/:id", updateBoq);

// 🔥 DELETE
router.delete("/boq/:id", deleteBoq);

router.post('/boq/bulk', createBulkBoq);

router.patch("/boq/:id/link-analisa", linkAnalisaBoq);


// BOQ VERSION CHANGES
router.post("/boq-version-changes", createBoqVersionChange);

// GET ALL
router.get(
  "/boq-version-changes/version/:version_id",
  getBoqVersionChanges
);

// GET DETAIL
router.get(
  "/boq-version-changes/:id",
  getBoqVersionChangeById
);

// UPDATE
router.put(
  "/boq-version-changes/:id",
  updateBoqVersionChange
);

// DELETE
router.delete(
  "/boq-version-changes/:id",
  deleteBoqVersionChange
);

router.post(
"/boq/addendum/new-item",
createBoqAddendumItem
);

router.get(
  "/boq-bobot/:project_id/:version_id",
  getBoqWithBobot
);

export default router;