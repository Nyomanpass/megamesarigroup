import multer from "multer";
import path from "path";
import fs from "fs";

const storage =
  multer.diskStorage({

    // =====================
    // DESTINATION
    // =====================
    destination:
      (req, file, cb) => {

        let dir = "uploads";

        // =====================
        // LOGO
        // =====================
        if (
          req.body.type === "logo"
        ) {

          dir =
            "uploads/logos";
        }

        // =====================
        // PROJECT PHOTO
        // =====================
        else if (
          req.body.type ===
          "project_photo"
        ) {

          const {
            project_id
          } = req.body;

          dir =
            `uploads/project-${project_id}`;
        }

        // =====================
        // DOCUMENT
        // =====================
        else if (
          req.body.type ===
          "document"
        ) {

          dir =
            "uploads/documents";
        }

        fs.mkdirSync(
          dir,
          {
            recursive: true
          }
        );

        cb(null, dir);
      },


    // =====================
    // FILE NAME
    // =====================
    filename:
      (req, file, cb) => {

        const ext =
          path.extname(
            file.originalname
          );

        const unique =
          Date.now();

        // =====================
        // LOGO
        // =====================
        if (
          req.body.type === "logo"
        ) {

          cb(
            null,
            `logo_${unique}${ext}`
          );

          return;
        }

        // =====================
        // PROJECT PHOTO
        // =====================
        if (
          req.body.type ===
          "project_photo"
        ) {

          const {
            boq_id,
            tanggal
          } = req.body;

          cb(
            null,

            `${boq_id}_${tanggal}_${unique}${ext}`
          );

          return;
        }

        // =====================
        // DEFAULT
        // =====================
        cb(
          null,
          `${unique}${ext}`
        );
      }

  });

export const upload =
  multer({
    storage
  });