import { ProjectAnalisa } from "../models/ProjekAnalisa.js";
import { generateBobotInternal } from "./BoqController.js";
import { Boq } from "../models/BoqModel.js";
import { ProjectAnalisaDetail } from "../models/ProjekAnalisaDetail.js";
import { ProjectItem } from "../models/ProjekItem.js";

const round2 = (num) => Number(num.toFixed(2));

// CREATE
export const createProjectAnalisa = async (req, res) => {
  try {
    const { project_id, kode, nama, satuan, overhead_persen } = req.body;

    if (!project_id || !kode || !nama || !satuan) {
      return res.status(400).json({ message: "Field wajib diisi!" });
    }

    const data = await ProjectAnalisa.create({
      project_id,
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


const formatRupiah = (angka) => {
  const tanpaDesimal = Math.floor(angka);
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(tanpaDesimal);
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

      let total = 0;

      // 🔥 hitung total dari detail
      for (let d of details) {
        const item = await ProjectItem.findByPk(d.item_id);

        if (!item) continue;

        const harga = Number(item.harga) || 0;
        const koef = Number(d.koefisien) || 0;

        total += koef * harga; // ❌ jangan round di sini
      }

      total = round2(total); // 🔥 round di akhir

      // 🔥 ambil overhead dari ANALISA (INI YANG PENTING)
      const persen = Number(analisa.overhead_persen) || 0;

      const overhead = round2((persen / 100) * total);

      const grandTotal = round2(total + overhead);

      result.push({
        id: analisa.id,
        nama: analisa.nama,
        kode: analisa.kode,
        satuan: analisa.satuan,

        total,
        overhead_persen: persen,
        overhead,
        grandTotal_rp: formatRupiah(grandTotal),
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
    const { kode, nama, satuan, overhead_persen } = req.body;

    const data = await ProjectAnalisa.findByPk(req.params.id);

    if (!data) {
      return res.status(404).json({ message: "Data tidak ditemukan" });
    }

    await data.update({
      kode,
      nama,
      satuan,
      overhead_persen
    });

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