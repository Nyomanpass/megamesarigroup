import express from "express";
import {
  getMasterItems,
  getMasterItemById,
  createMasterItem,
  updateMasterItem,
  deleteMasterItem
} from "../controllers/MasterItemController.js";

const router = express.Router();

router.get("/masteritem", getMasterItems);
router.get("/masteritem/:id", getMasterItemById);
router.post("/masteritem", createMasterItem);
router.put("/masteritem/:id", updateMasterItem);
router.delete("/masteritem/:id", deleteMasterItem);

export default router;