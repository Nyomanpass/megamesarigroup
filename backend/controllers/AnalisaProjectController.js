import { ProjectAnalisa } from "../models/ProjekAnalisa.js";
import { generateBobotInternal } from "./BoqController.js";

// CREATE
export const createProjectAnalisa = async (req, res) => {
  try {
    const { project_id, kode, nama, satuan, overhead_persen } = req.body;

    if (!project_id || !kode || !nama || !satuan) {
      return res.status(400).json({ message: "Field wajib diisi!" });
    }

    const data = await ProjectAnalisa.create({
      project_id,
      kode,
      nama,
      satuan,
      overhead_persen
    });

    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getProjectAnalisa = async (req, res) => {
  try {
    const { project_id } = req.query;

    const where = {};

    if (project_id) {
      where.project_id = Number(project_id);
    }

    const data = await ProjectAnalisa.findAll({
      where,
      order: [["id", "DESC"]]
    });

    res.json(data);
  } catch (error) {
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
    const { kode, nama, satuan, overhead_persen } = req.body;

    const data = await ProjectAnalisa.findByPk(req.params.id);

    if (!data) {
      return res.status(404).json({ message: "Data tidak ditemukan" });
    }

    await data.update({
      kode,
      nama,
      satuan,
      overhead_persen
    });

    // =========================
    // 🔥 AUTO UPDATE BOBOT
    // =========================

    const boqList = await Boq.findAll({
      where: { 
        analisa_id: data.id,
        tipe: "item" // 🔥 FIX PENTING
      }
    });

    console.log("BOQ LIST:", boqList.length);

    const projectIds = [...new Set(
      boqList.map(b => b.project_id)
    )];

    console.log("PROJECT IDS:", projectIds);

    for (let pid of projectIds) {
      console.log("🔥 GENERATE BOBOT:", pid);
      await generateBobotInternal(pid);
    }

    res.json({
      message: "Berhasil update + bobot otomatis",
      data
    });

  } catch (error) {
    console.error("ERROR updateProjectAnalisa:", error);
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

    await data.destroy();

    res.json({ message: "Berhasil hapus" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};