import express from "express";
import {
  getAnalisaDetail,
  createAnalisaDetail,
  updateAnalisaDetail,
  deleteAnalisaDetail
} from "../controllers/AnalisaMasterDetailController.js";

const router = express.Router();

router.get("/master/analisa-detail/:id", getAnalisaDetail);
router.post("/master/analisa-detail", createAnalisaDetail);
router.put("/master/analisa-detail/:id", updateAnalisaDetail);
router.delete("/master/analisa-detail/:id", deleteAnalisaDetail);

export default router;