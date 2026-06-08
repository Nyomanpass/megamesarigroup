import { ProjectAnalisa } from "../models/ProjekAnalisa.js";
import { generateBobotInternal } from "./BoqController.js";
import { Boq } from "../models/BoqModel.js";
import { ProjectAnalisaDetail } from "../models/ProjekAnalisaDetail.js";
import { ProjectItem } from "../models/ProjekItem.js";
import { Op } from "sequelize";
import Decimal from "decimal.js";
import { applyPriceFormula } from "../utils/priceFormula.js";

const toDecimal = (value) => new Decimal(value || 0);
const toNumber = (value) => Number(value.toString());
const toPembulatan = (value) => Number(value.floor().toString());
const shouldUsePembulatan = (value) => value !== false && value !== 0 && value !== "0";

const getUsedProjectAnalisaIds = async (ids = []) => {
  if (!ids.length) return [];

  const boqRows = await Boq.findAll({
    where: {
      analisa_id: ids
    },
    attributes: ["analisa_id"]
  });

  return [
    ...new Set(
      boqRows
        .map(row => Number(row.analisa_id))
        .filter(Boolean)
    )
  ];
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
    const { project_id, kode, nama, satuan, overhead_persen, use_pembulatan } = req.body;

    if (!project_id || !kode || !nama || !satuan) {
      return res.status(400).json({ message: "Field wajib diisi!" });
    }

    const data = await ProjectAnalisa.create({
      project_id,
      kode,
      nama,
      satuan,
      overhead_persen,
      use_pembulatan: use_pembulatan ?? true
    });

    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


const formatRupiah = (angka) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(angka || 0));
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

      // 🔥 ambil detail
      const details = await ProjectAnalisaDetail.findAll({
        where: { project_analisa_id: analisa.id }
      });

      let total = new Decimal(0);

      // 🔥 hitung total dari detail
      for (let d of details) {
        const item = await ProjectItem.findByPk(d.item_id);

        if (!item) continue;

        const harga = applyPriceFormula(item.harga, d.rumus_harga);
        const koef = toDecimal(d.koefisien);

        total = total.plus(koef.mul(harga));
      }

      // 🔥 ambil overhead dari ANALISA (INI YANG PENTING)
      const persen = toDecimal(analisa.overhead_persen);

      const overhead = total.mul(persen).div(100);

      const grandTotal = total.plus(overhead);
      const pembulatan = toPembulatan(grandTotal);
      const usePembulatan = shouldUsePembulatan(analisa.use_pembulatan);
      const hargaSatuanPekerjaan = usePembulatan ? pembulatan : toNumber(grandTotal);

      result.push({
        id: analisa.id,
        nama: analisa.nama,
        kode: analisa.kode,
        satuan: analisa.satuan,

        total: toNumber(total),
        overhead_persen: toNumber(persen),
        overhead: toNumber(overhead),
        grandTotal: toNumber(grandTotal),
        pembulatan,
        use_pembulatan: usePembulatan,
        harga_satuan_pekerjaan: hargaSatuanPekerjaan,
        grandTotal_rp: formatRupiah(hargaSatuanPekerjaan),
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
    const { kode, nama, satuan, overhead_persen, use_pembulatan } = req.body;

    const data = await ProjectAnalisa.findByPk(req.params.id);

    if (!data) {
      return res.status(404).json({ message: "Data tidak ditemukan" });
    }

    const updatePayload = {};
    if (kode !== undefined) updatePayload.kode = kode;
    if (nama !== undefined) updatePayload.nama = nama;
    if (satuan !== undefined) updatePayload.satuan = satuan;
    if (overhead_persen !== undefined) updatePayload.overhead_persen = overhead_persen;
    if (use_pembulatan !== undefined) updatePayload.use_pembulatan = use_pembulatan;

    await data.update(updatePayload);

    console.log("✅ Analisa updated:", data.id);

    // =========================
    // 🔥 AMBIL BOQ TERKAIT
    // =========================
    const boqList = await Boq.findAll({
      where: { 
        analisa_id: data.id,
        tipe: "item"
      }
    });

    console.log("📦 BOQ ditemukan:", boqList.length);

    if (boqList.length === 0) {
      console.log("❗ Tidak ada BOQ terkait analisa ini");
      return res.json({
        message: "Analisa berhasil diupdate (tanpa BOQ terkait)",
        data
      });
    }

    const projectIds = [...new Set(
      boqList.map(b => b.project_id)
    )];

    console.log("📊 PROJECT IDS:", projectIds);

    // =========================
    // 🔥 GENERATE BOBOT
    // =========================
    for (let pid of projectIds) {
      try {
        console.log("🔥 GENERATE BOBOT PROJECT:", pid);
        await generateBobotInternal(pid);
      } catch (err) {
        console.error("❌ ERROR GENERATE:", err);
      }
    }

    res.json({
      message: "Berhasil update + bobot otomatis",
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
