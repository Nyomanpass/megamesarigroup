import { sequelize } from "../config/Database.js";
import { DailyProgress } from "../models/DailyProgressModel.js";
import { DailyMaterial } from "../models/DailyMaterial.js";
import { DailyPekerja } from "../models/DailyPekerja.js";
import { DailyPeralatan } from "../models/DailyPeralatan.js";
import { Boq } from "../models/BoqModel.js";
import { DailyPlan } from "../models/DailyPlanModel.js";
import { Project } from "../models/ProjectModel.js";

export const createDailyProgress = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const {
      project_id,
      boq_id,
      tanggal,
      volume,
      materials = [],
      pekerja = [],
      peralatan = []
    } = req.body;

    const inputVolume = Number(volume);

    // 🔥 FIX FLOAT
    const fix = (num) => Number(parseFloat(num).toFixed(6));

    // =========================
    // ✅ VALIDASI
    // =========================
    if (!boq_id) {
      throw new Error("BOQ wajib dipilih");
    }

    if (!inputVolume || inputVolume <= 0) {
      throw new Error("Volume harus lebih dari 0");
    }

    const boq = await Boq.findByPk(boq_id);
    if (!boq) {
      throw new Error("BOQ tidak ditemukan");
    }

    const totalProgress = await DailyProgress.sum("volume", {
      where: { boq_id }
    });

    // 🔥 FIX ANGKA
    const total = fix(boq.volume || 0);
    const sudah = fix(totalProgress || 0);
    const input = fix(inputVolume);

    // =========================
    // ✅ VALIDASI VOLUME
    // =========================
    if (sudah >= total) {
      throw new Error("Pekerjaan sudah selesai (100%)");
    }

    if (fix(sudah + input) > total) {
      throw new Error("Volume melebihi sisa pekerjaan!");
    }

    // =========================
    // ✅ VALIDASI PLAN
    // =========================
    const plan = await DailyPlan.findOne({
      where: { project_id, tanggal }
    });

    if (!plan) {
      throw new Error("Tanggal tidak tersedia di Daily Plan!");
    }

    // =========================
    // ✅ 1. SIMPAN HEADER
    // =========================
    const progress = await DailyProgress.create({
      project_id,
      boq_id,
      tanggal,
      volume: input
    }, { transaction: t });

    // =========================
    // ✅ 2. MATERIAL
    // =========================
    if (materials.length > 0) {
      const dataMaterial = materials.map(m => ({
        daily_progress_id: progress.id,
        material_id: m.material_id,
        koef: m.koef,
        hasil: fix((m.koef || 0) * input)
      }));

      await DailyMaterial.bulkCreate(dataMaterial, { transaction: t });
    }

    // =========================
    // ✅ 3. PEKERJA
    // =========================
    if (pekerja.length > 0) {
      const dataPekerja = pekerja.map(p => ({
        daily_progress_id: progress.id,
        worker_id: p.worker_id,
        koef: p.koef,
        jumlah: fix((p.koef || 0) * input)
      }));

      await DailyPekerja.bulkCreate(dataPekerja, { transaction: t });
    }

    // =========================
    // ✅ 4. PERALATAN
    // =========================
    if (peralatan.length > 0) {
      const dataPeralatan = peralatan.map(a => ({
        daily_progress_id: progress.id,
        tool_id: a.tool_id,
        jumlah: a.jumlah || 1
      }));

      await DailyPeralatan.bulkCreate(dataPeralatan, { transaction: t });
    }

    await t.commit();

    res.status(201).json({
      message: "✅ Progress + detail berhasil disimpan",
      data: progress
    });

  } catch (error) {
    await t.rollback();
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

export const getDailyProgressById = async (req, res) => {
  try {
    const { id } = req.params;

    const data = await DailyProgress.findByPk(id, {
      include: [
        {
          model: DailyMaterial,
          as: "materials"
        },
        {
          model: DailyPekerja,
          as: "workers"
        },
        {
          model: DailyPeralatan,
          as: "tools"
        }
      ]
    });

    res.json(data);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateDailyProgress = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { id } = req.params;

    const {
      project_id,
      boq_id,
      tanggal,
      volume,
      materials = [],
      pekerja = [],
      peralatan = []
    } = req.body;

    const inputVolume = Number(volume);

    if (!inputVolume || inputVolume <= 0) {
      throw new Error("Volume harus lebih dari 0");
    }

    // =========================
    // 🔥 1. UPDATE HEADER
    // =========================
    await DailyProgress.update(
      {
        project_id,
        boq_id,
        tanggal,
        volume: inputVolume
      },
      {
        where: { id },
        transaction: t
      }
    );

    // =========================
    // 🔥 2. HAPUS DATA LAMA
    // =========================
    await DailyMaterial.destroy({
      where: { daily_progress_id: id },
      transaction: t
    });

    await DailyPekerja.destroy({
      where: { daily_progress_id: id },
      transaction: t
    });

    await DailyPeralatan.destroy({
      where: { daily_progress_id: id },
      transaction: t
    });

    // =========================
    // 🔥 3. INSERT ULANG MATERIAL
    // =========================
    if (materials.length > 0) {
      const dataMaterial = materials.map((m) => ({
        daily_progress_id: id,
        material_id: m.material_id,
        koef: m.koef,
        hasil: (m.koef || 0) * inputVolume
      }));

      await DailyMaterial.bulkCreate(dataMaterial, { transaction: t });
    }

    // =========================
    // 🔥 4. INSERT ULANG PEKERJA
    // =========================
    if (pekerja.length > 0) {
      const dataPekerja = pekerja.map((p) => ({
        daily_progress_id: id,
        worker_id: p.worker_id,
        koef: p.koef,
        jumlah: (p.koef || 0) * inputVolume
      }));

      await DailyPekerja.bulkCreate(dataPekerja, { transaction: t });
    }

    // =========================
    // 🔥 5. INSERT ULANG PERALATAN
    // =========================
    if (peralatan.length > 0) {
      const dataPeralatan = peralatan.map((a) => ({
        daily_progress_id: id,
        tool_id: a.tool_id,
        jumlah: Number(a.jumlah || inputVolume) // 🔥 fallback ke volume
      }));

      await DailyPeralatan.bulkCreate(dataPeralatan, { transaction: t });
    }

    await t.commit();

    res.json({
      message: "✅ Daily Progress berhasil diupdate"
    });

  } catch (error) {
    await t.rollback();
    res.status(500).json({ message: error.message });
  }
};