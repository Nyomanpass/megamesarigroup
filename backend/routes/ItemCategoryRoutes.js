import express from "express";
import {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory
} from "../controllers/ItemCategory.js";

const router = express.Router();

router.post("/items/category", createCategory);
router.get("/items/category", getCategories);
router.get("/items/category/:id", getCategoryById);
router.put("/items/category/:id", updateCategory);
router.delete("/items/category/:id", deleteCategory);

export default router;