import { Project } from "../models/ProjectModel.js";
import fs from "fs";
import path from "path";
// 🔥 GET ALL PROJECT (Dashboard)

export const getProjects = async (req, res) => {
  try {
    const data = await Project.findAll({
      order: [["createdAt", "DESC"]]
    });

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🔥 GET DETAIL PROJECT
export const getProjectById = async (req, res) => {
  try {
    const data = await Project.findByPk(req.params.id);

    if (!data) {
      return res.status(404).json({ message: "Project tidak ditemukan" });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🔥 CREATE PROJECT
export const createProject = async (req, res) => {
  try {
    const data = {
      ...req.body,

      // 🔥 ambil file dari multer
      logo_kontraktor: req.files?.logo_kontraktor?.[0]?.filename || null,
      logo_konsultan: req.files?.logo_konsultan?.[0]?.filename || null,
      logo_client: req.files?.logo_client?.[0]?.filename || null
    };

    const project = await Project.create(data);

    res.status(201).json({
      message: "Project berhasil dibuat + upload logo",
      project
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};



// 🔥 UPDATE PROJECT
export const updateProject = async (req, res) => {
  try {
    const { id } = req.params;

    const project = await Project.findByPk(id);

    if (!project) {
      return res.status(404).json({ message: "Project tidak ditemukan" });
    }

    const data = { ...req.body };

    // 🔥 HANDLE LOGO KONTRAKTOR
    if (req.files?.logo_kontraktor) {
      // hapus file lama
      if (project.logo_kontraktor) {
        const oldPath = path.join("uploads", project.logo_kontraktor);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }

      data.logo_kontraktor = req.files.logo_kontraktor[0].filename;
    } else {
      data.logo_kontraktor = project.logo_kontraktor;
    }

    // 🔥 LOGO KONSULTAN
    if (req.files?.logo_konsultan) {
      if (project.logo_konsultan) {
        const oldPath = path.join("uploads", project.logo_konsultan);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }

      data.logo_konsultan = req.files.logo_konsultan[0].filename;
    } else {
      data.logo_konsultan = project.logo_konsultan;
    }

    // 🔥 LOGO CLIENT
    if (req.files?.logo_client) {
      if (project.logo_client) {
        const oldPath = path.join("uploads", project.logo_client);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }

      data.logo_client = req.files.logo_client[0].filename;
    } else {
      data.logo_client = project.logo_client;
    }

    await project.update(data);

    res.json({ message: "Project berhasil diupdate", project });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// 🔥 DELETE PROJECT
export const deleteProject = async (req, res) => {
  try {
    const id = req.params.id;

    const project = await Project.findByPk(id);

    if (!project) {
      return res.status(404).json({ message: "Project tidak ditemukan" });
    }

    // 🔥 PATH FOLDER UPLOAD
    const uploadPath = path.join(process.cwd(), "uploads");

    // 🔥 HAPUS FILE (JIKA ADA)
    const files = [
      project.logo_kontraktor,
      project.logo_konsultan,
      project.logo_client
    ];

    files.forEach((file) => {
      if (file) {
        const filePath = path.join(uploadPath, file);

        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    });

    // 🔥 DELETE PROJECT (CASCADE)
    await Project.destroy({
      where: { id }
    });

    res.json({ message: "Project + file berhasil dihapus" });

  } catch (error) {
    console.error("DELETE PROJECT ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};