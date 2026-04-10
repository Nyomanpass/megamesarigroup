import { sequelize } from "../config/Database.js";
import { DailyProgress } from "../models/DailyProgressModel.js";

import { Boq } from "../models/BoqModel.js";
import { DailyProgressItem } from "../models/DailyProgresItem.js";
import { Project } from "../models/ProjectModel.js";

import { ProjectAnalisaDetail } from "../models/ProjekAnalisaDetail.js";
import { ProjectItem } from "../models/ProjekItem.js";
import { DailyPlan } from "../models/DailyPlanModel.js";

export const createDailyProgress = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { project_id, boq_id, hari_ke, volume } = req.body;

    const inputVolume = Number(volume);

    const fix = (num) => Number(parseFloat(num).toFixed(6));

    // =========================
    // ✅ VALIDASI
    // =========================
    if (!boq_id) throw new Error("BOQ wajib dipilih");
    if (!inputVolume || inputVolume <= 0) throw new Error("Volume harus > 0");

    const boq = await Boq.findByPk(boq_id);
    if (!boq) throw new Error("BOQ tidak ditemukan");

    if (!boq.analisa_id) {
      throw new Error("BOQ belum punya analisa!");
    }

    const plan = await DailyPlan.findOne({
        where: {
          project_id,
          hari_ke
        }
      });

      if (!plan) {
        throw new Error(`Hari ke-${hari_ke} tidak ada di schedule`);
      }

      const tanggal = plan.tanggal;

    // =========================
    // 🔥 AMBIL ANALISA DETAIL
    // =========================
    const analisaDetails = await ProjectAnalisaDetail.findAll({
      where: { project_analisa_id: boq.analisa_id },
      include: {
        model: ProjectItem,
        as: "item"
      }
    });

    // =========================
    // ✅ SIMPAN HEADER
    // =========================
    const progress = await DailyProgress.create({
      project_id,
      boq_id,
      tanggal,
      volume: inputVolume
    }, { transaction: t });

    // =========================
    // 🔥 GENERATE ITEM (SINGLE TABLE)
    // =========================
    const items = [];

    for (let d of analisaDetails) {
      if (!d.item) continue;

      const koef = Number(d.koefisien) || 0;
      const hasil = fix(koef * inputVolume);

      items.push({
        daily_progress_id: progress.id,
        item_id: d.item.id,

        // 🔥 SNAPSHOT (PENTING)
        nama: d.item.nama,
        tipe: d.item.tipe,
        satuan: d.item.satuan,

        koef: koef,
        volume: inputVolume,
        hasil: hasil
      });
    }

    // =========================
    // 🔥 INSERT SEKALI
    // =========================
    await DailyProgressItem.bulkCreate(items, { transaction: t });

    await t.commit();

    res.status(201).json({
      message: "✅ Daily Progress + Items berhasil (AUTO ANALISA)",
      progress,
      total_item: items.length
    });

  } catch (error) {
    await t.rollback();
    res.status(500).json({ message: error.message });
  }
};

export const updateDailyProgress = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { project_id, boq_id, hari_ke, volume } = req.body;

    const inputVolume = Number(volume);
    const fix = (num) => Number(parseFloat(num).toFixed(6));

    // =========================
    // VALIDASI
    // =========================
    const progress = await DailyProgress.findByPk(id);
    if (!progress) throw new Error("Data progress tidak ditemukan");

    if (!boq_id) throw new Error("BOQ wajib dipilih");
    if (!inputVolume || inputVolume <= 0) throw new Error("Volume harus > 0");

    const boq = await Boq.findByPk(boq_id);
    if (!boq) throw new Error("BOQ tidak ditemukan");

    if (!boq.analisa_id) {
      throw new Error("BOQ belum punya analisa!");
    }

    // =========================
    // 🔥 AMBIL TANGGAL DARI PLAN
    // =========================
    const plan = await DailyPlan.findOne({
      where: { project_id, hari_ke }
    });

    if (!plan) {
      throw new Error(`Hari ke-${hari_ke} tidak ada di schedule`);
    }

    const tanggal = plan.tanggal;

    // =========================
    // 🔥 AMBIL ANALISA DETAIL
    // =========================
    const analisaDetails = await ProjectAnalisaDetail.findAll({
      where: { project_analisa_id: boq.analisa_id },
      include: {
        model: ProjectItem,
        as: "item"
      }
    });

    // =========================
    // 🔥 UPDATE HEADER
    // =========================
    await progress.update({
      boq_id,
      tanggal,
      volume: inputVolume
    }, { transaction: t });

    // =========================
    // 🔥 HAPUS ITEM LAMA
    // =========================
    await DailyProgressItem.destroy({
      where: { daily_progress_id: progress.id },
      transaction: t
    });

    // =========================
    // 🔥 GENERATE ITEM BARU
    // =========================
    const items = [];

    for (let d of analisaDetails) {
      if (!d.item) continue;

      const koef = Number(d.koefisien) || 0;
      const hasil = fix(koef * inputVolume);

      items.push({
        daily_progress_id: progress.id,
        item_id: d.item.id,
        nama: d.item.nama,
        tipe: d.item.tipe,
        satuan: d.item.satuan,
        koef: koef,
        volume: inputVolume,
        hasil: hasil
      });
    }

    await DailyProgressItem.bulkCreate(items, { transaction: t });

    await t.commit();

    res.status(200).json({
      message: "✅ Update berhasil + recalculation analisa",
      progress,
      total_item: items.length
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

    const data = await DailyProgress.findByPk(id,);

    res.json(data);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteDailyProgress = async (req, res) => {
  try {
    const { id } = req.params;

    // 🔥 cek data
    const progress = await DailyProgress.findByPk(id);
    if (!progress) {
      return res.status(404).json({ message: "Data tidak ditemukan" });
    }

    // 🔥 hapus item analisa dulu
    await DailyProgressItem.destroy({
      where: { daily_progress_id: id }
    });

    // 🔥 hapus progress
    await progress.destroy();

    res.status(200).json({
      message: "✅ Data progress berhasil dihapus"
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

