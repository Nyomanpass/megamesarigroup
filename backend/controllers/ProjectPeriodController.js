import { ProjectPeriod } from "../models/ProjectPeriodModel.js";


// ✅ GET ALL (by project_id optional)
export const getProjectPeriods = async (req, res) => {
  try {
    const { project_id } = req.query;

    const where = project_id ? { project_id } : {};

    const data = await ProjectPeriod.findAll({
      where,
      order: [["bulan_ke", "ASC"]]
    });

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// ✅ GET BY ID
export const getProjectPeriodById = async (req, res) => {
  try {
    const data = await ProjectPeriod.findByPk(req.params.id);

    if (!data) {
      return res.status(404).json({ message: "Data tidak ditemukan" });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// ✅ CREATE
export const createProjectPeriod = async (req, res) => {
  try {
    const {
      project_id,
      bulan_ke,
      nama,
      start_date,
      end_date
    } = req.body;

    const data = await ProjectPeriod.create({
      project_id,
      bulan_ke,
      nama,
      start_date,
      end_date
    });

    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// ✅ UPDATE
export const updateProjectPeriod = async (req, res) => {
  try {
    const data = await ProjectPeriod.findByPk(req.params.id);

    if (!data) {
      return res.status(404).json({ message: "Data tidak ditemukan" });
    }

    await data.update(req.body);

    res.json({ message: "Berhasil diupdate", data });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// ✅ DELETE
export const deleteProjectPeriod = async (req, res) => {
  try {
    const data = await ProjectPeriod.findByPk(req.params.id);

    if (!data) {
      return res.status(404).json({ message: "Data tidak ditemukan" });
    }

    await data.destroy();

    res.json({ message: "Berhasil dihapus" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};