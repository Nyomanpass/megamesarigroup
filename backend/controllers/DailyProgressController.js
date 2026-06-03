import { sequelize } from "../config/Database.js";
import { DailyProgress } from "../models/DailyProgressModel.js";

import { Boq } from "../models/BoqModel.js";
import { DailyProgressItem } from "../models/DailyProgresItem.js";
import { Project } from "../models/ProjectModel.js";

import { ProjectAnalisaDetail } from "../models/ProjekAnalisaDetail.js";
import { ProjectItem } from "../models/ProjekItem.js";
import { DailyPlan } from "../models/DailyPlanModel.js";
import { DailyProgressPhoto } from "../models/DailyProgressPhotos.js";
import { ProjectVersionModel } from "../models/ProjectVersionModel.js";
import { getBoqWithBobot } from "./BoqController.js";

const getActiveVersionByWeek = async (
  project_id,
  minggu_ke
) => {
  const versions =
    await ProjectVersionModel.findAll({
      where: { project_id },
      order: [["effective_week", "ASC"]]
    });

  let activeVersion = null;

  versions.forEach((version) => {
    if (
      Number(minggu_ke) >=
      Number(version.effective_week || 1)
    ) {
      activeVersion = version;
    }
  });

  return activeVersion;
};

const getActiveBoqForProgress = async (
  project_id,
  boq_id,
  minggu_ke
) => {
  const activeVersion =
    await getActiveVersionByWeek(
      Number(project_id),
      Number(minggu_ke)
    );

  const activeBoqs =
    await getBoqWithBobot(
      Number(project_id),
      activeVersion?.id
    );

  const activeBoq =
    activeBoqs.find(
      item =>
        Number(item.id) === Number(boq_id) ||
        Number(item.boq_item_id) === Number(boq_id)
    );

  if (!activeBoq) {
    throw new Error(
      "BOQ tidak aktif pada versi/adendum minggu ini"
    );
  }

  const masterBoq =
    await Boq.findByPk(
      activeBoq.boq_item_id || activeBoq.id
    );

  return {
    ...(
      typeof activeBoq.toJSON === "function"
        ? activeBoq.toJSON()
        : activeBoq
    ),
    id: activeBoq.boq_item_id || activeBoq.id,
    analisa_id:
      activeBoq.analisa_id ??
      masterBoq?.analisa_id,
    volume:
      activeBoq.volume ??
      masterBoq?.volume
  };
};

export const createDailyProgress = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { 
      project_id, 
      boq_id, 
      hari_ke, 
      volume,
      cuaca,
      jam_mulai,
      jam_selesai
    } = req.body;

    const inputVolume = Number(volume);
    const fix = (num) => Number(parseFloat(num).toFixed(6));

    // =========================
    // ✅ VALIDASI
    // =========================
    if (!boq_id) throw new Error("BOQ wajib dipilih");
    if (!inputVolume || inputVolume <= 0) throw new Error("Volume harus > 0");

    const plan = await DailyPlan.findOne({
      where: { project_id, hari_ke }
    });

    if (!plan) {
      throw new Error(`Hari ke-${hari_ke} tidak ada di schedule`);
    }

    const tanggal = plan.tanggal;
    const boq =
      await getActiveBoqForProgress(
        project_id,
        boq_id,
        plan.minggu_ke
      );

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
    // ✅ SIMPAN HEADER (UPDATED)
    // =========================
    const progress = await DailyProgress.create({
      project_id,
      boq_id: boq.id,
      tanggal,
      volume: inputVolume,

      // 🔥 FIELD BARU
      cuaca,
      jam_mulai,
      jam_selesai

    }, { transaction: t });

    // =========================
    // 🔥 GENERATE ITEM
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

    res.status(201).json({
      message: "✅ Daily Progress + Items berhasil",
      progress,
      total_item: items.length
    });

  } catch (error) {
    await t.rollback();
    res.status(500).json({ message: error.message });
  }
};

export const createDailyProgressWeekly =
  async (req, res) => {

  const t =
    await sequelize.transaction();

  try {

    const {

      project_id,
      boq_id,

      minggu_ke,

      persentase,
      volume,

      cuaca,
      jam_mulai,
      jam_selesai

    } = req.body;

    // =========================
    // VALIDASI
    // =========================
    if (!boq_id) {
      throw new Error(
        "BOQ wajib dipilih"
      );
    }

    // =========================
    // AMBIL DAILY PLAN
    // =========================
    const plans =
      await DailyPlan.findAll({

        where: {
          project_id,
          minggu_ke
        },

        order: [
          ["tanggal", "ASC"]
        ]

      });

    if (!plans.length) {
      throw new Error(
        "Daily Plan minggu tidak ditemukan"
      );
    }

    // =========================
    // AMBIL BOQ AKTIF VERSI MINGGU INI
    // =========================
    const boq =
      await getActiveBoqForProgress(
        project_id,
        boq_id,
        minggu_ke
      );

    // =========================
    // HITUNG TARGET
    // =========================
    const totalVolume =
      Number(
        boq.volume || 0
      );

    const isWholeNumber = (value) =>
      Math.abs(Number(value) - Math.round(Number(value))) < 0.0000001;

    const isIntegerVolume =
      isWholeNumber(totalVolume);

    if (
      isIntegerVolume &&
      volume !== undefined &&
      volume !== null &&
      volume !== ""
    ) {
      if (
        !Number(volume) ||
        Number(volume) <= 0
      ) {
        throw new Error(
          "Jumlah volume wajib > 0"
        );
      }

      if (!isWholeNumber(Number(volume))) {
        throw new Error(
          "Jumlah volume harus bilangan bulat"
        );
      }
    } else if (
      !persentase ||
      Number(persentase) <= 0
    ) {
      throw new Error(
        "Persentase wajib > 0"
      );
    }

    const targetVolume =
      isIntegerVolume &&
      volume !== undefined &&
      volume !== null &&
      volume !== ""
        ? Number(volume)
        : (
            totalVolume *
            Number(persentase)
          ) / 100;

    const targetPersentase =
      totalVolume > 0
        ? (targetVolume / totalVolume) * 100
        : 0;

    // =========================
    // BAGI HARI
    // =========================
    const targetInt =
      Math.round(targetVolume);

    const dailyVolumes =
      isIntegerVolume
        ? plans.map((plan, index) => {

            const baseVolume =
              Math.floor(
                targetInt / plans.length
              );

            const remainder =
              targetInt % plans.length;

            return {
              plan,
              volume:
                baseVolume +
                (
                  index < remainder
                    ? 1
                    : 0
                )
            };

          })
        : plans.map((plan) => ({
            plan,
            volume:
              Number(
                (
                  targetVolume /
                  plans.length
                ).toFixed(7)
              )
          }));

    const filledDailyVolumes =
      dailyVolumes.filter(
        item =>
          Number(item.volume) > 0
      );

    if (!filledDailyVolumes.length) {
      throw new Error(
        "Target volume terlalu kecil untuk dibuat laporan mingguan"
      );
    }

    // =========================
    // AMBIL ANALISA
    // =========================
    const analisaDetails =
      await ProjectAnalisaDetail.findAll({

        where: {
          project_analisa_id:
            boq.analisa_id
        },

        include: {
          model: ProjectItem,
          as: "item"
        }

      });

    // =========================
    // LOOP HARI
    // =========================
    for (const item of filledDailyVolumes) {

      const plan =
        item.plan;

      const volumeHari =
        Number(item.volume);

      // =========================
      // CREATE HEADER
      // =========================
      const progress =
        await DailyProgress.create({

          project_id,
          boq_id: boq.id,

          tanggal:
            plan.tanggal,

          volume:
            volumeHari,

          cuaca,
          jam_mulai,
          jam_selesai

        }, {
          transaction: t
        });

      // =========================
      // GENERATE ITEMS
      // =========================
      const items = [];

      for (const d of analisaDetails) {

        if (!d.item) continue;

        const koef =
          Number(
            d.koefisien || 0
          );

        const hasil =
          Number(
            (
              koef *
              volumeHari
            ).toFixed(7)
          );

        items.push({

          daily_progress_id:
            progress.id,

          item_id:
            d.item.id,

          nama:
            d.item.nama,

          tipe:
            d.item.tipe,

          satuan:
            d.item.satuan,

          koef,

          volume:
            volumeHari,

          hasil

        });
      }

      await DailyProgressItem.bulkCreate(
        items,
        {
          transaction: t
        }
      );
    }

    await t.commit();

    res.status(201).json({

      message:
        "✅ Generate Weekly Progress berhasil",

      total_hari:
        filledDailyVolumes.length,

      volume_per_hari:
        filledDailyVolumes.map(
          item => item.volume
        ),

      target_volume:
        Number(targetVolume.toFixed(7)),

      persentase:
        Number(targetPersentase.toFixed(3))

    });

  } catch (error) {

    await t.rollback();

    res.status(500).json({
      message:
        error.message
    });
  }
};

export const updateDailyProgress = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { id } = req.params;

    const { 
      project_id, 
      boq_id, 
      hari_ke, 
      volume,
      cuaca,
      jam_mulai,
      jam_selesai
    } = req.body;

    const inputVolume = Number(volume);
    const fix = (num) => Number(parseFloat(num).toFixed(6));

    // =========================
    // VALIDASI
    // =========================
    const progress = await DailyProgress.findByPk(id);
    if (!progress) throw new Error("Data progress tidak ditemukan");

    if (!boq_id) throw new Error("BOQ wajib dipilih");
    if (!inputVolume || inputVolume <= 0) throw new Error("Volume harus > 0");

    // =========================
    // 🔥 VALIDASI JAM (OPSIONAL TAPI BAGUS)
    // =========================
    if (jam_mulai && jam_selesai) {
      if (jam_selesai < jam_mulai) {
        throw new Error("Jam selesai tidak boleh lebih kecil dari jam mulai");
      }
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
    const boq =
      await getActiveBoqForProgress(
        project_id,
        boq_id,
        plan.minggu_ke
      );

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
    // 🔥 UPDATE HEADER (UPDATED)
    // =========================
    await progress.update({
      project_id,
      boq_id: boq.id,
      tanggal,
      volume: inputVolume,

      // 🔥 FIELD BARU
      cuaca,
      jam_mulai,
      jam_selesai

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
        { model: Project, as: "project" },
        { model: DailyProgressPhoto, as: "photos" }
      ],
      order: [
        ["tanggal", "DESC"],
        ["id", "ASC"]
      ]
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
