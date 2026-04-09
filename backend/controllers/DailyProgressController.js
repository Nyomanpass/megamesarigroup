import { sequelize } from "../config/Database.js";
import { DailyProgress } from "../models/DailyProgressModel.js";

import { Boq } from "../models/BoqModel.js";
import { DailyProgressItem } from "../models/DailyProgresItem.js";
import { Project } from "../models/ProjectModel.js";

import { ProjectAnalisaDetail } from "../models/ProjekAnalisaDetail.js";
import { ProjectItem } from "../models/ProjekItem.js";

export const createDailyProgress = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { project_id, boq_id, tanggal, volume } = req.body;

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

