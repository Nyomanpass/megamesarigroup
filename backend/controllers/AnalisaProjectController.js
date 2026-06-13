import { ProjectAnalisa } from "../models/ProjekAnalisa.js";
import { ProjectAnalisaDetail } from "../models/ProjekAnalisaDetail.js";
import { Op } from "sequelize";

const getUsedProjectAnalisaIds = async (ids = []) => {
  return [];
};

const sendUsedAnalisaError = async (res, usedIds = []) => {
  const usedAnalisa = await ProjectAnalisa.findAll({
    where: { id: usedIds },
    attributes: ["id", "nama"]
  });

  return res.status(409).json({
    message: `Data analisa tidak bisa dihapus karena sudah digunakan di data lain: ${usedAnalisa.map(item => item.nama).join(", ")}`,
    used_ids: usedIds
  });
};

// CREATE
export const createProjectAnalisa = async (req, res) => {
  try {
    const { project_id, kode, nama, satuan } = req.body;

    if (!project_id || !kode || !nama || !satuan) {
      return res.status(400).json({ message: "Field wajib diisi!" });
    }

    const data = await ProjectAnalisa.create({
      project_id,
      kode,
      nama,
      satuan
    });

    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getProjectAnalisa = async (req, res) => {
  try {
    const { project_id } = req.query;

    if (!project_id) {
      return res.status(400).json({
        message: "project_id wajib dikirim!"
      });
    }

    const analisaList = await ProjectAnalisa.findAll({
      where: { project_id: Number(project_id) },
      order: [["id", "DESC"]]
    });

    const result = [];

    for (let analisa of analisaList) {

      result.push({
        id: analisa.id,
        nama: analisa.nama,
        kode: analisa.kode,
        satuan: analisa.satuan
      });
    }

    res.json(result);

  } catch (error) {
    console.error("ERROR getProjectAnalisa:", error);
    res.status(500).json({ message: error.message });
  }
};


export const getProjectAnalisaById = async (req, res) => {
  try {
    const data = await ProjectAnalisa.findOne({
      where: { id: req.params.id }
    });

    if (!data) {
      return res.status(404).json({ message: "Data tidak ditemukan" });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const updateProjectAnalisa = async (req, res) => {
  try {
    const { kode, nama, satuan } = req.body;

    const data = await ProjectAnalisa.findByPk(req.params.id);

    if (!data) {
      return res.status(404).json({ message: "Data tidak ditemukan" });
    }

    const updatePayload = {};
    if (kode !== undefined) updatePayload.kode = kode;
    if (nama !== undefined) updatePayload.nama = nama;
    if (satuan !== undefined) updatePayload.satuan = satuan;

    await data.update(updatePayload);

    res.json({
      message: "Analisa berhasil diupdate",
      data
    });

  } catch (error) {
    console.error("❌ ERROR FULL:", error);
    res.status(500).json({ message: error.message });
  }
};

export const deleteProjectAnalisa = async (req, res) => {
  try {
    const data = await ProjectAnalisa.findOne({
      where: { id: req.params.id }
    });

    if (!data) {
      return res.status(404).json({ message: "Data tidak ditemukan" });
    }

    const usedIds = await getUsedProjectAnalisaIds([data.id]);
    if (usedIds.length > 0) {
      return sendUsedAnalisaError(res, usedIds);
    }

    // 🔥 hapus detail dulu
    await ProjectAnalisaDetail.destroy({
      where: { project_analisa_id: data.id }
    });

    // 🔥 baru hapus parent
    await data.destroy();

    res.json({ message: "Berhasil hapus" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const bulkDeleteProjectAnalisa = async (req, res) => {
  try {
    const { project_id, ids = [], delete_all = false } = req.body;

    if (!project_id) {
      return res.status(400).json({
        message: "Project wajib dikirim"
      });
    }

    const where = {
      project_id: Number(project_id)
    };

    if (!delete_all) {
      const normalizedIds = [...new Set(ids.map(id => Number(id)).filter(Boolean))];

      if (normalizedIds.length === 0) {
        return res.status(400).json({
          message: "Pilih minimal 1 analisa untuk dihapus"
        });
      }

      where.id = { [Op.in]: normalizedIds };
    }

    const analisaList = await ProjectAnalisa.findAll({
      where,
      attributes: ["id", "nama"]
    });

    if (analisaList.length === 0) {
      return res.status(404).json({
        message: "Data analisa tidak ditemukan"
      });
    }

    const analisaIds = analisaList.map(item => Number(item.id));
    const usedIds = await getUsedProjectAnalisaIds(analisaIds);

    if (usedIds.length > 0) {
      return sendUsedAnalisaError(res, usedIds);
    }

    await ProjectAnalisaDetail.destroy({
      where: { project_analisa_id: { [Op.in]: analisaIds } }
    });

    await ProjectAnalisa.destroy({
      where: { id: { [Op.in]: analisaIds } }
    });

    res.json({
      message: `${analisaList.length} analisa berhasil dihapus`,
      deleted_count: analisaList.length
    });

  } catch (error) {
    console.error("BULK DELETE PROJECT ANALISA ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};
