import { Project } from "../models/ProjectModel.js";
import { ProjectVersionModel } from "../models/ProjectVersionModel.js";
import { BoqVersionChange } from "../models/BoqVersionChangeModel.js";
import { Schedule } from "../models/ScheduleModel.js";
import { sequelize } from "../config/Database.js";
import fs from "fs";
import path from "path";
// 🔥 GET ALL PROJECT (Dashboard)

const normalizeRupiahValue = (value) => {
  if (value === undefined || value === null || value === "") return value;
  if (typeof value === "number") return value;

  const rawValue = String(value)
    .replace(/[^\d.,-]/g, "")
    .trim();

  if (!rawValue) return null;

  const dotCount = (rawValue.match(/\./g) || []).length;
  const normalized = rawValue.includes(",")
    ? rawValue.replace(/\./g, "").replace(",", ".")
    : dotCount > 1
      ? rawValue.replace(/\./g, "")
      : rawValue;

  const numberValue = Number(normalized);
  return Number.isNaN(numberValue) ? null : numberValue;
};

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
      nilai_kontrak: normalizeRupiahValue(req.body.nilai_kontrak),

      // 🔥 ambil file dari multer
      logo_kontraktor: req.files?.logo_kontraktor?.[0]?.filename || null,
      logo_konsultan: req.files?.logo_konsultan?.[0]?.filename || null,
      logo_client: req.files?.logo_client?.[0]?.filename || null
    };

    const project = await Project.create(data);

    const version =
      await ProjectVersionModel.create({

        project_id:
          project.id,

        code: "MC0",

        revision: 0,

        effective_week: 1,

        effective_date:
          new Date(),

        description:
          "Baseline awal project"

      });


    res.status(201).json({
      message: "Project berhasil dibuat",
      project,

      baseline_version:
        version

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

    const data = {
      ...req.body,
      nilai_kontrak: normalizeRupiahValue(req.body.nilai_kontrak)
    };

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

export const updateProjectWeekSetting = async (req, res) => {
  try {

    const { project_id } = req.params;

    const {
      week_mode,
      week_start_day
    } = req.body;

    const project = await Project.findByPk(project_id);

    if (!project) {
      return res.status(404).json({
        message: "Project tidak ditemukan"
      });
    }

    await project.update({
      week_mode,
      week_start_day:
        week_mode === "calendar"
          ? week_start_day
          : null
    });

    res.json({
      message: "Setting minggu project berhasil diupdate ✅",
      data: project
    });

  } catch (error) {

    res.status(500).json({
      message: error.message
    });

  }
};


// project version management (addendum)

export const createProjectVersion =
  async (req, res) => {

  try {

    const {
      project_id,
      effective_date,
      effective_week,
      description
    } = req.body;

    // =========================
    // CEK REVISION TERAKHIR
    // =========================
    const lastVersion =
      await ProjectVersionModel.findOne({

        where: {
          project_id
        },

        order: [
          ["revision", "DESC"]
        ]

      });

    // =========================
    // GENERATE REVISION
    // =========================
    const revision =
      lastVersion
        ? lastVersion.revision + 1
        : 0;

    const code =
      `MC${revision}`;

    // =========================
    // CREATE VERSION
    // =========================
    const version =
      await ProjectVersionModel.create({

        project_id,

        code,

        revision,

        effective_date,

        effective_week,

        description

      });

    res.status(201).json({

      message:
        "Addendum berhasil dibuat",

      data: version

    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message:
        error.message
    });

  }
};


export const getProjectVersions =
  async (req, res) => {

  try {

    const { project_id } =
      req.params;

    const versions =
      await ProjectVersionModel.findAll({

        where: {
          project_id
        },

        order: [
          ["revision", "ASC"]
        ]

      });

    res.json({
      data: versions
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message:
        error.message
    });

  }
};

export const getProjectVersionById =
  async (req, res) => {

  try {

    const { id } =
      req.params;

    const version =
      await ProjectVersionModel.findByPk(id);

    if (!version) {

      return res.status(404).json({
        message:
          "Version tidak ditemukan"
      });

    }

    res.json({
      data: version
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message:
        error.message
    });

  }
};


export const updateProjectVersion =
  async (req, res) => {

  try {

    const { id } =
      req.params;

    const version =
      await ProjectVersionModel.findByPk(id);

    if (!version) {

      return res.status(404).json({
        message:
          "Version tidak ditemukan"
      });

    }

    await version.update({

      effective_date:
        req.body.effective_date,

      effective_week:
        req.body.effective_week,

      description:
        req.body.description

    });

    res.json({

      message:
        "Version berhasil diupdate",

      data: version

    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message:
        error.message
    });

  }
};

export const deleteProjectVersion =
  async (req, res) => {

  try {

    const { id } =
      req.params;

    const result =
      await sequelize.transaction(async (transaction) => {

        const version =
          await ProjectVersionModel.findByPk(id, {
            transaction
          });

        if (!version) {

          return {
            status: 404,
            body: {
              message:
                "Version tidak ditemukan"
            }
          };

        }

        // 🔥 MC0 TIDAK BOLEH DIHAPUS
        if (Number(version.revision) === 0) {

          return {
            status: 400,
            body: {
              message:
                "MC0 tidak boleh dihapus"
            }
          };

        }

        const deletedBoqChanges =
          await BoqVersionChange.destroy({
            where: {
              version_id: id
            },
            transaction
          });

        const deletedSchedules =
          await Schedule.destroy({
            where: {
              version_id: id
            },
            transaction
          });

        await version.destroy({
          transaction
        });

        return {
          status: 200,
          body: {
            message:
              "Addendum berhasil dihapus",
            deleted: {
              boq_version_changes:
                deletedBoqChanges,
              schedules:
                deletedSchedules
            }
          }
        };

      });

    res.status(result.status).json(result.body);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message:
        error.message
    });

  }
};
