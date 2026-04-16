import { ProjectItem } from "../models/ProjekItem.js";
import { ItemCategory } from "../models/ItemCategory.js";
import { generateBobotInternal } from "./BoqController.js";
import { ProjectAnalisaDetail } from "../models/ProjekAnalisaDetail.js";
import { Boq } from "../models/BoqModel.js";

// 🔹 GET ALL (khusus BAHAN per project)
export const getProjectItems = async (req, res) => {
  try {
    const { project_id, tipe } = req.query;

    const where = {};

    if (project_id) where.project_id = Number(project_id);
    if (tipe) where.tipe = tipe;

    const data = await ProjectItem.findAll({
      where,
      order: [["id", "DESC"]]
    });

    res.json(data);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};
// 🔹 GET BY ID
export const getProjectItemById = async (req, res) => {
  try {
    const data = await ProjectItem.findByPk(req.params.id, {
      include: ItemCategory
    });

    if (!data) {
      return res.status(404).json({ message: "Data tidak ditemukan" });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🔹 CREATE (otomatis tipe BAHAN)
export const createProjectItem = async (req, res) => {
  try {
    let { 
      nama, 
      satuan, 
      harga, 
      category, 
      project_id, 
      tipe,
      terbilang 
    } = req.body;

    // 🔥 default tipe
    tipe = tipe || "BAHAN";

    // 🔥 validasi TERBILANG
    if (tipe === "TENAGA" || tipe === "ALAT") {
      if (!terbilang || terbilang <= 0) {
        return res.status(400).json({
          message: "Terbilang wajib diisi untuk TENAGA dan ALAT"
        });
      }
    } else {
      // 🔥 bahan tidak pakai terbilang
      terbilang = null;
    }

    // 🔥 logic category
    if (tipe !== "BAHAN") {
      category = null;
    }

    const data = await ProjectItem.create({
      nama,
      tipe,
      satuan,
      harga,
      project_id,
      category: category || null,
      terbilang // 🔥 masuk sini
    });

    res.status(201).json(data);

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

// 🔹 UPDATE
export const updateProjectItem = async (req, res) => {
  try {
    let { nama, satuan, harga, category, tipe, terbilang } = req.body;

    const data = await ProjectItem.findByPk(req.params.id);

    if (!data) {
      return res.status(404).json({ message: "Data tidak ditemukan" });
    }

    // 🔥 ambil tipe lama kalau tidak dikirim
    tipe = tipe || data.tipe;

    // 🔥 logic category
    if (tipe !== "BAHAN") {
      category = null;
    }

    await data.update({
      nama,
      satuan,
      harga,
      tipe,
      category: category || null,
      terbilang
    });

    // =========================
    // 🔥 AUTO UPDATE BOBOT
    // =========================

    // 1. cari analisa yang pakai item ini
    const analisaDetails = await ProjectAnalisaDetail.findAll({
      where: { item_id: data.id }
    });

    const analisaIds = [...new Set(
      analisaDetails.map(d => d.project_analisa_id)
    )];

    if (analisaIds.length > 0) {

      // 2. cari BOQ yang pakai analisa tersebut
      const boqList = await Boq.findAll({
        where: { analisa_id: analisaIds }
      });

      const projectIds = [...new Set(
        boqList.map(b => b.project_id)
      )];

      // 3. update bobot per project
      for (let pid of projectIds) {
        await generateBobotInternal(pid);
      }
    }

    res.json({
      message: "Berhasil update + bobot otomatis",
      data
    });

  } catch (error) {
    console.error("ERROR updateProjectItem:", error);
    res.status(500).json({ message: error.message });
  }
};

export const bulkCreateProjectItems = async (req, res) => {
  try {
    const { project_id, items } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "Tidak ada item dipilih" });
    }

    const data = items.map((item) => ({
      project_id,
      nama: item.nama,
      satuan: item.satuan,
      harga: item.harga || 0, // 🔥 INI KUNCINYA
      category: item.category,
      tipe: item.tipe,
      terbilang: item.terbilang 
    }));

    await ProjectItem.bulkCreate(data);

    res.json({ message: "Bulk insert berhasil" });

  } catch (error) {
    console.error("ERROR BULK:", error);
    res.status(500).json({ message: error.message });
  }
};


// 🔹 DELETE
export const deleteProjectItem = async (req, res) => {
  try {
    const data = await ProjectItem.findByPk(req.params.id);

    if (!data) {
      return res.status(404).json({ message: "Data tidak ditemukan" });
    }

    await data.destroy();

    res.json({ message: "Berhasil hapus" });
  } catch (error) {
  console.error("DELETE PROJECT ERROR:", error);
  res.status(500).json({ message: error.message });
}
};