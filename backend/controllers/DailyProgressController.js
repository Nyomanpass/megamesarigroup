import { DailyProgress, Boq, Project } from "../models/index.js";

export const createDailyProgress = async (req, res) => {
  try {
    const { project_id, boq_id, tanggal, volume } = req.body;

    const data = await DailyProgress.create({
      project_id,
      boq_id,
      tanggal,
      volume
    });

    res.status(201).json({
      message: "Progress berhasil ditambahkan",
      data
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getProgressSummary = async (req, res) => {
  try {
    const { boq_id } = req.params;

    // 🔥 total target dari BOQ
    const boq = await Boq.findByPk(boq_id);

    // 🔥 total progress (sum volume)
    const totalProgress = await DailyProgress.sum("volume", {
      where: { boq_id }
    });

    const total = boq.volume || 0;
    const sudah = totalProgress || 0;
    const sisa = total - sudah;

    res.json({
      total,
      sudah,
      sisa
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ GET ALL + RELASI
export const getDailyProgress = async (req, res) => {
  try {
    const data = await DailyProgress.findAll({
      include: [
        { model: Boq, as: "boq" },
        { model: Project, as: "project" }
      ],
      order: [["tanggal", "ASC"]]
    });

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};