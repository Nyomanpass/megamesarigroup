import path from "path";
import fs from "fs";
import sharp from "sharp";

import {
  DailyProgressPhoto
} from "../models/DailyProgressPhotos.js";


export const getPhotos =
  async (req, res) => {

    try {

      const data =
        await DailyProgressPhoto.findAll({

          where: {
            daily_progress_id:
              req.params.id
          },

          order: [
            ["id", "DESC"]
          ]
        });

      res.json(data);

    } catch (error) {

      res.status(500).json({
        message:
          error.message
      });
    }
  };



export const uploadPhotos =
  async (req, res) => {

    try {

      const files =
        req.files;

      const {
        daily_progress_id
      } = req.body;

      const data = [];

      for (const file of files) {

        const outputPath =
          file.path.replace(
            path.extname(file.path),
            ".webp"
          );

        await sharp(file.path)

        
          .webp({
            quality: 70
          })

          .toFile(outputPath);

        fs.unlinkSync(file.path);

        data.push({

          daily_progress_id,

          photo_url:
            outputPath
        });
      }

      await DailyProgressPhoto
        .bulkCreate(data);

      res.json({
        message:
          "Upload berhasil"
      });

    } catch (error) {

      res.status(500).json({
        message:
          error.message
      });
    }
  };



export const deletePhoto =
  async (req, res) => {

    try {

      const data =
        await DailyProgressPhoto.findByPk(
          req.params.id
        );

      if (!data) {

        return res.status(404)
        .json({
          message:
            "Foto tidak ditemukan"
        });
      }

      // hapus file
      if (
        fs.existsSync(
          data.photo_url
        )
      ) {

        fs.unlinkSync(
          data.photo_url
        );
      }

      // hapus db
      await data.destroy();

      res.json({
        message:
          "Foto berhasil dihapus"
      });

    } catch (error) {

      res.status(500).json({
        message:
          error.message
      });
    }
  };

 
  export const updatePhoto = async (req, res) => {
  try {

    const data = await DailyProgressPhoto.findByPk(
      req.params.id
    );

    if (!data) {
      return res.status(404).json({
        message: "Foto tidak ditemukan"
      });
    }

    // hapus file lama
    if (fs.existsSync(data.photo_url)) {
      fs.unlinkSync(data.photo_url);
    }

    // convert webp
    const outputPath = req.file.path.replace(
      path.extname(req.file.path),
      ".webp"
    );

    await sharp(req.file.path)
      .webp({ quality: 70 })
      .toFile(outputPath);

    // hapus file original
    fs.unlinkSync(req.file.path);

    // update db
    await data.update({
      photo_url: outputPath
    });

    res.json({
      message: "Foto berhasil diupdate"
    });

  } catch (error) {

    res.status(500).json({
      message: error.message
    });

  }
};