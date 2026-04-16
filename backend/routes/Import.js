import express from "express";
import XLSX from "xlsx";
import fs from "fs";
import { Op } from "sequelize";
import { upload } from "../middleware/upload.js";
import { ProjectItem } from "../models/ProjekItem.js";
import { MasterItem } from "../models/MasterItem.js";
import { Boq } from "../models/BoqModel.js";
import { ProjectAnalisa } from "../models/ProjekAnalisa.js";
import { ProjectAnalisaDetail } from "../models/ProjekAnalisaDetail.js";


const router = express.Router();

const getTipe = (kode) => {
  if (!kode) return "item";

  const k = String(kode).trim().toUpperCase();

  // 🔥 SUBHEADER (ROMAWI KHUSUS)
  if (/^(I|II|III|IV|V|VI|VII|VIII|IX|X)$/i.test(k)) {
    return "subheader";
  }

  // 🔥 HEADER (A, B, C)
  if (/^[A-Z]$/.test(k)) {
    return "header";
  }

  // 🔥 ITEM
  if (/^\d+$/.test(k)) {
    return "item";
  }

  return "item";
};

const normalizeKey = (obj) => {
  const newObj = {};
  Object.keys(obj).forEach((key) => {
    newObj[key.trim().toLowerCase()] = obj[key];
  });
  return newObj;
};

router.post("/import-boq", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    const projectId = Number(req.body.project_id);

    if (!file) {
      return res.status(400).json({ message: "File tidak ada!" });
    }

    if (!projectId) {
      return res.status(400).json({ message: "project_id wajib diisi!" });
    }

    const workbook = XLSX.readFile(file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    // 🔥 pakai header sederhana
    const data = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    let currentHeaderId = null;
    let currentSubHeaderId = null;

    for (let i = 0; i < data.length; i++) {
    const row = normalizeKey(data[i]);

    const kode = String(row.no || "").trim();
    const uraian = row["uraian pekerjaan"];
    const satuan = row.sat || row["sat."] || "";
    const volume = Number(row.vol || row["vol."] || 0);

    if (!uraian) continue;

    const tipe = getTipe(kode);

    let parent_id = null;

    // 🔥 RULE UTAMA
    if (tipe === "header") {
        parent_id = null;
    } else if (tipe === "subheader") {
        parent_id = currentHeaderId; // 🔥 ikut header terdekat
    } else {
        parent_id = currentSubHeaderId || currentHeaderId;
    }

    const boq = await Boq.create({
        project_id: projectId,
        kode,
        uraian,
        satuan: tipe === "item" ? satuan : null,
        volume: tipe === "item" ? volume : null,
        tipe,
        parent_id
    });

    // 🔥 TRACKING
    if (tipe === "header") {
        currentHeaderId = boq.id;
        currentSubHeaderId = null;
    }

    if (tipe === "subheader") {
        currentSubHeaderId = boq.id;
    }

   
    }

    res.json({ message: "Import BOQ berhasil!" });

  } catch (err) {
   
    res.status(500).json({ message: err.message });
  }finally {
    // 🔥 INI KUNCI NYA
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
});

router.post("/import", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    const { tipe, project_id, terbilang } = req.body;

    // =========================
    // 🔥 VALIDASI AWAL
    // =========================
    if (!file) {
      return res.status(400).json({ message: "File tidak ada!" });
    }

    if (!tipe || !project_id) {
      return res.status(400).json({ message: "Tipe & Project wajib diisi!" });
    }

    // =========================
    // 🔥 NORMALIZE HEADER
    // =========================
    const normalizeKey = (obj) => {
      const newObj = {};
      Object.keys(obj).forEach((key) => {
        newObj[key.trim().toLowerCase()] = obj[key];
      });
      return newObj;
    };

    // =========================
    // 🔥 BACA EXCEL (FIX DI SINI ❗)
    // =========================
    const workbook = XLSX.readFile(file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    const data = XLSX.utils.sheet_to_json(sheet, {
      defval: "" // 🔥 cukup ini saja
      // ❌ range: 9 DIHAPUS
    });

    console.log("TOTAL DATA:", data.length); // 🔥 debug

    if (data.length === 0) {
      return res.status(400).json({
        message: "Data Excel kosong atau tidak terbaca!"
      });
    }

    // =========================
    // 🔥 MAPPING DATA
    // =========================
    const items = data.map((rawRow, index) => {
      const row = normalizeKey(rawRow);

      const nama = row.nama || row["nama material"];
      const satuan = row.satuan;
      const hargaRaw = row.harga;
      const kategori = row.kategori || row.category;

      // ❌ VALIDASI
      if (!nama || !satuan || !hargaRaw) {
        throw new Error(`Data tidak lengkap di baris ${index + 2}`);
      }

      if (tipe === "BAHAN" && !kategori) {
        throw new Error(`Kategori wajib di baris ${index + 2}`);
      }

      // 🔥 FORMAT HARGA
      const harga = Number(
        String(hargaRaw).replace(/[^0-9]/g, "")
      );

      if (isNaN(harga)) {
        throw new Error(`Harga tidak valid di baris ${index + 2}`);
      }

      return {
        project_id: Number(project_id),
        nama: nama.trim(),
        tipe: tipe.toUpperCase(),
        satuan: satuan.trim(),
        harga,
        category: tipe === "BAHAN" ? kategori : null,
        terbilang:
          tipe === "TENAGA" || tipe === "ALAT"
            ? Number(terbilang || 1)
            : null
      };
    });

    // =========================
    // 🔥 INSERT DATABASE
    // =========================
    await ProjectItem.bulkCreate(items);

    // =========================
    // ✅ RESPONSE
    // =========================
    res.json({
      message: "Import berhasil!",
      total: items.length
    });

  } catch (error) {
    console.error("ERROR IMPORT:", error);

    res.status(500).json({
      message: error.message
    });
  }finally {
    // 🔥 INI KUNCI NYA
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
});


router.post("/import-master", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    const { tipe } = req.body;

    if (!file) {
      return res.status(400).json({ message: "File tidak ada!" });
    }

    const workbook = XLSX.readFile(file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);

    // 🔥 NORMALIZE HEADER
    const normalizeKey = (obj) => {
      const newObj = {};
      Object.keys(obj).forEach((key) => {
        newObj[key.trim().toLowerCase()] = obj[key];
      });
      return newObj;
    };

    const items = data.map((rawRow, index) => {
      const row = normalizeKey(rawRow);

      // 🔥 ambil data fleksibel
      const nama = row.nama || row["nama material"];
      const satuan = row.satuan;
      const hargaRaw = row.harga;
      const kategori = row.kategori || row.category;

      // ❌ VALIDASI
      if (!nama || !satuan || !hargaRaw) {
        throw new Error(`Data tidak lengkap di baris ${index + 2}`);
      }

      // 🔥 bersihkan harga
      const harga = Number(
        String(hargaRaw).replace(/[^0-9]/g, "")
      );

      if (isNaN(harga)) {
        throw new Error(`Harga tidak valid di baris ${index + 2}`);
      }

      return {
        nama,
        tipe: tipe.toUpperCase(),
        satuan,
        harga,
        category: tipe === "BAHAN" ? kategori || null : null,
        terbilang:
          tipe === "TENAGA" || tipe === "ALAT" ? 1 : null
      };
    });

    await MasterItem.bulkCreate(items);

    res.json({
      message: "Import master berhasil!",
      total: items.length
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }finally {
    // 🔥 INI KUNCI NYA
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
});



// 🔥 NORMALIZE TEXT (BIAR MATCH NAMA)
const normalizeText = (text) => {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
};

router.post("/import-analisa-multi", upload.single("file"), async (req, res) => {
  try {
    const { project_id } = req.body;

    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    const errors = [];
    const detailBuffer = [];

    let currentAnalisa = null;

    // 🔥 CACHE ITEM (BIAR CEPAT ⚡)
    const allItems = await ProjectItem.findAll();
    const itemMap = {};

    allItems.forEach(item => {
      const key = `${item.tipe}_${normalizeText(item.nama)}`;
      itemMap[key] = item;
    });

    for (const rawRow of data) {
      const row = normalizeKey(rawRow);

      const kode = row.kode;
      const nama = row.nama;
      const satuan = row.satuan;
      const tipe = String(row.tipe || "").toUpperCase();
      const itemName = row.item;
      const koef = Number(row.koefisien || 0);

      // =========================
      // 🔥 HEADER ANALISA (1 BARIS)
      // =========================
      if (kode && nama) {
        currentAnalisa = {
          project_id,
          kode: kode.trim(),
          nama: nama.trim(),
          satuan: satuan || "",
          overhead_persen: 10
        };

       
        continue;
      }

      // =========================
      // 🔥 SKIP BARIS KOSONG
      // =========================
      if (!itemName && !tipe) continue;

      // =========================
      // ❌ VALIDASI ANALISA
      // =========================
      if (!currentAnalisa) {
        errors.push(`Item tanpa analisa: ${itemName}`);
        continue;
      }

      // =========================
      // ❌ VALIDASI TIPE
      // =========================
      if (!["TENAGA", "BAHAN", "ALAT"].includes(tipe)) {
        errors.push(`Tipe tidak valid: ${tipe}`);
        continue;
      }

      // =========================
      // 🔥 CARI ITEM (PAKAI CACHE)
      // =========================
      const key = `${tipe}_${normalizeText(itemName)}`;
      const item = itemMap[key];

      if (!item) {
        errors.push(`${itemName} tidak ditemukan (${tipe})`);
        continue;
      }

      // =========================
      // 🔥 SIMPAN BUFFER
      // =========================
      detailBuffer.push({
        analisa: currentAnalisa,
        item_id: item.id,
        koefisien: koef
      });
    }

    // =========================
    // ❌ STOP JIKA ADA ERROR
    // =========================
    if (errors.length > 0) {
      return res.status(400).json({
        message: "Import gagal",
        errors
      });
    }

    // =========================
    // ✅ INSERT DB
    // =========================
    let analisaMap = {};

    for (const row of detailBuffer) {
      const key = row.analisa.kode;

      if (!analisaMap[key]) {
        const newAnalisa = await ProjectAnalisa.create(row.analisa);
        analisaMap[key] = newAnalisa.id;
      }

      await ProjectAnalisaDetail.create({
        project_analisa_id: analisaMap[key],
        item_id: row.item_id,
        koefisien: row.koefisien
      });
    }


    res.json({
      message: "Import multi analisa berhasil!"
    });

  } catch (err) {
   
    res.status(500).json({ message: err.message });
  }finally {
    // 🔥 INI KUNCI NYA
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
});


export default router;