import express from "express";

import {

  getPhotos,
  uploadPhotos,
  deletePhoto,
  updatePhoto

}
from "../controllers/DailyProgressPhotoController.js";

import {
  upload
}
from "../middleware/upload.js";


const router =
  express.Router();


// =========================
// GET PHOTO
// =========================
router.get(

  "/daily-progress/photos/:id",

  getPhotos
);


// =========================
// UPLOAD PHOTO
// =========================
router.post(

  "/daily-progress/photos",

  upload.array(
    "photos",
    20
  ),

  uploadPhotos
);


// =========================
// UPDATE PHOTO
// =========================
router.put(

  "/daily-progress/photos/:id",

  upload.single(
    "photo"
  ),

  updatePhoto
);


// =========================
// DELETE PHOTO
// =========================
router.delete(
  "/daily-progress/photos/:id",
  deletePhoto
);

export default router;