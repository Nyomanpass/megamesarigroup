import express from "express";
import { 
    getProjectAnalisaDetail,
    createProjectAnalisaDetail,
    updateProjectAnalisaDetail,
    deleteProjectAnalisaDetail

} from "../controllers/AnalisaProjectDetailController.js";

const router = express.Router();

router.get("/project-analisa-detail/:id", getProjectAnalisaDetail);
router.post("/project-analisa-detail", createProjectAnalisaDetail);
router.put("/project-analisa-detail/:id", updateProjectAnalisaDetail);
router.delete("/project-analisa-detail/:id", deleteProjectAnalisaDetail);

export default router;