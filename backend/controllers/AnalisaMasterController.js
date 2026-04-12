import { AnalisaMaster } from "../models/AnalisaMaster.js";
import { ProjectAnalisaDetail } from "../models/ProjekAnalisaDetail.js";
import { ProjectItem } from "../models/ProjekItem.js";
import { MasterItem } from "../models/MasterItem.js";
import { ProjectAnalisa } from "../models/ProjekAnalisa.js";
import { AnalisaMasterDetail } from "../models/AnalisaMasterDetail.js";



// 🔹 CREATE
export const createAnalisa = async (req, res) => {
  try {
    const { kode, nama, satuan, overhead_persen } = req.body;

    if (!kode || !nama || !satuan) {
      return res.status(400).json({ message: "Field wajib diisi!" });
    }

    const data = await AnalisaMaster.create({
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

// 🔹 GET ALL
export const getAnalisa = async (req, res) => {
  try {
    const data = await AnalisaMaster.findAll({
      order: [["id", "DESC"]]
    });

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🔹 GET BY ID
export const getAnalisaById = async (req, res) => {
  try {
    const data = await AnalisaMaster.findOne({
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

// 🔹 UPDATE
export const updateAnalisa = async (req, res) => {
  try {
    const { kode, nama, satuan, overhead_persen } = req.body;

    const data = await AnalisaMaster.findOne({
      where: { id: req.params.id }
    });

    if (!data) {
      return res.status(404).json({ message: "Data tidak ditemukan" });
    }

    await data.update({
      kode,
      nama,
      satuan,
      overhead_persen
    });

    res.json({ message: "Berhasil update" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🔹 DELETE
export const deleteAnalisa = async (req, res) => {
  try {
    const data = await AnalisaMaster.findOne({
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

export const importAnalisaToProject = async (req, res) => {
  try {
    const { project_id, analisa_ids } = req.body;

    const projectItems = await ProjectItem.findAll({
      where: { project_id }
    });

    const masterItems = await MasterItem.findAll();

    const masterMap = {};
    masterItems.forEach((m) => {
      masterMap[m.id] = m.nama.toLowerCase();
    });

    const masterAnalisa = await AnalisaMaster.findAll({
      where: { id: analisa_ids }
    });

    // 🔥 VALIDASI DULU SEMUA DETAIL
    const missingItems = [];

    for (let analisa of masterAnalisa) {
      const details = await AnalisaMasterDetail.findAll({
        where: { analisa_id: analisa.id }
      });

      for (let d of details) {
        const masterNama = masterMap[d.item_id];

        const exists = projectItems.some(
          (p) => p.nama.toLowerCase() === masterNama
        );

        if (!exists) {
          missingItems.push(masterNama);
        }
      }
    }

    // ❌ kalau ada yang kurang → STOP TOTAL
    if (missingItems.length > 0) {
      return res.status(400).json({
        message: "Item belum ada: " + [...new Set(missingItems)].join(", ")
      });
    }

    // ============================
    // ✅ BARU INSERT (AMAN)
    // ============================

    const createdAnalisa = await ProjectAnalisa.bulkCreate(
      masterAnalisa.map((a) => ({
        project_id,
        kode: a.kode,
        nama: a.nama,
        satuan: a.satuan,
        overhead_persen: a.overhead_persen
      })),
      { returning: true }
    );

    for (let i = 0; i < masterAnalisa.length; i++) {
      const analisa = masterAnalisa[i];
      const projectAnalisa = createdAnalisa[i];

      const details = await AnalisaMasterDetail.findAll({
        where: { analisa_id: analisa.id }
      });

      const detailData = details.map((d) => {
        const masterNama = masterMap[d.item_id];

        const projectItem = projectItems.find(
          (p) => p.nama.toLowerCase() === masterNama
        );

        return {
          project_analisa_id: projectAnalisa.id,
          item_id: projectItem.id,
          koefisien: d.koefisien,
          harga: 0,
          jumlah: 0
        };
      });

      await ProjectAnalisaDetail.bulkCreate(detailData);
    }

    res.json({ message: "Analisa berhasil di import" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};