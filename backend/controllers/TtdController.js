import { TtdTemplate } from "../models/TtdTemplate.js";

// =========================
// 🔥 CREATE / UPDATE (UPSERT)
// =========================
export const createTtd = async (req, res) => {
  try {
    const { project_id, tipe_laporan, layout } = req.body;

    if (!project_id || !tipe_laporan || !layout) {
      return res.status(400).json({ message: "Data tidak lengkap" });
    }

    const data = await TtdTemplate.create({
      project_id,
      tipe_laporan,
      layout
    });

    res.status(201).json({
      success: true,
      message: "Template berhasil dibuat",
      data
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// =========================
// 🔥 UPDATE BY ID
// =========================
export const updateTtd = async (req, res) => {
  try {
    const { id } = req.params;
    const { layout } = req.body;

    const data = await TtdTemplate.findByPk(id);

    if (!data) {
      return res.status(404).json({ message: "Data tidak ditemukan" });
    }

    await data.update({ layout });

    res.json({
      success: true,
      message: "Template berhasil diupdate",
      data
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// =========================
// 🔥 UPSERT (SAVE)
// =========================
export const saveTtd = async (req, res) => {
  try {
    const { project_id, tipe_laporan, layout } = req.body;

    let data = await TtdTemplate.findOne({
      where: { project_id, tipe_laporan }
    });

    if (data) {
      await data.update({ layout });
    } else {
      data = await TtdTemplate.create({
        project_id,
        tipe_laporan,
        layout
      });
    }

    res.json({
      success: true,
      message: "Template berhasil disimpan",
      data
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// =========================
// 🔥 GET BY ID
// =========================
export const getTtdById = async (req, res) => {
  try {
    const { id } = req.params;

    const data = await TtdTemplate.findByPk(id);

    if (!data) {
      return res.status(404).json({ message: "Data tidak ditemukan" });
    }

    res.json(data);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// =========================
// 🔥 GET BY PROJECT + TIPE
// =========================
export const getTtdByProject = async (req, res) => {
  try {
    const { project_id, tipe } = req.query;

    const data = await TtdTemplate.findOne({
      where: {
        project_id,
        tipe_laporan: tipe
      }
    });

    if (!data) {
      return res.status(404).json({ message: "Template tidak ditemukan" });
    }

    res.json(data);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// =========================
// 🔥 DELETE
// =========================
export const deleteTtd = async (req, res) => {
  try {
    const { id } = req.params;

    const data = await TtdTemplate.findByPk(id);

    if (!data) {
      return res.status(404).json({ message: "Data tidak ditemukan" });
    }

    await data.destroy();

    res.json({
      success: true,
      message: "Template berhasil dihapus"
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// =========================
// 🔥 GET ALL
// =========================
export const getAllTtd = async (req, res) => {
  try {
    const data = await TtdTemplate.findAll({
      order: [["createdAt", "DESC"]]
    });

    res.json(data);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};