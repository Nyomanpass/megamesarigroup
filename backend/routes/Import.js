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
import { parseNumber } from "../utils/parseNumber.js";
import { generateBobotInternal } from "../controllers/BoqController.js";

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
  let filePath = null;

  try {
    const file = req.file;
    const projectId = Number(req.body.project_id);

    if (!file) {
      return res.status(400).json({ message: "File tidak ada!" });
    }

    if (!projectId) {
      return res.status(400).json({ message: "project_id wajib diisi!" });
    }

    filePath = file.path;

    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    // 🔥 ambil semua analisa project
    const analisaList = await ProjectAnalisa.findAll({
      where: { project_id: projectId }
    });

    // 🔥 mapping kode → analisa_id
    const analisaMap = {};
    analisaList.forEach(a => {
      if (a.kode) {
        analisaMap[a.kode.trim()] = a.id;
      }
    });

    let currentHeaderId = null;
    let currentSubHeaderId = null;

    const missingKode = [];

 for (let i = 0; i < data.length; i++) {
  const row = normalizeKey(data[i]);

  const no = String(row.no || "").trim(); // 🔥 struktur
  const kodeAnalisa = String(row.kode || "").trim(); // 🔥 analisa

  const uraian = row["uraian pekerjaan"];
  const satuan = row.sat || row["sat."] || "";
  const volume = Number(row.vol || row["vol."] || 0);

  if (!uraian) continue;

  const tipe = getTipe(no);

  let parent_id = null;

  if (tipe === "header") {
    parent_id = null;
  } else if (tipe === "subheader") {
    parent_id = currentHeaderId;
  } else {
    parent_id = currentSubHeaderId || currentHeaderId;
  }

  // 🔥 LINK ANALISA DARI KOLOM "Kode"
  let analisa_id = null;

  if (kodeAnalisa && tipe === "item") {
    if (analisaMap[kodeAnalisa]) {
      analisa_id = analisaMap[kodeAnalisa];
    } else {
      missingKode.push(kodeAnalisa);
    }
  }

  const boq = await Boq.create({
    project_id: projectId,
    kode: no, // 🔥 struktur tetap dari No
    uraian,
    satuan: tipe === "item" ? satuan : null,
    volume: tipe === "item" ? volume : null,
    tipe,
    parent_id,
    analisa_id
  });

  if (tipe === "header") {
    currentHeaderId = boq.id;
    currentSubHeaderId = null;
  }

  if (tipe === "subheader") {
    currentSubHeaderId = boq.id;
  }
}

    // 🔥 hitung ulang BOQ
    await generateBobotInternal(projectId);

    // 🔥 kalau ada kode tidak ditemukan
    if (missingKode.length > 0) {
      return res.json({
        message: "Import selesai dengan warning",
        warning: true,
        missingKode: [...new Set(missingKode)]
      });
    }

    res.json({
      message: "Import BOQ berhasil!",
      warning: false
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });

  } finally {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
});




router.post("/import", upload.single("file"), async (req, res) => {
    let filePath = null; // ✅ di dalam
  try {
    const file = req.file;
    filePath = file?.path; // aman

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
    const workbook = XLSX.readFile(filePath);
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
      const harga = parseNumber(hargaRaw);

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


// 🔥 NORMALIZE TEXT (BIAR MATCH NAMA)
const normalizeText = (text) => {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
};

router.post("/import-master", upload.single("file"), async (req, res) => {
    let filePath = null; // ✅ WAJIB ADA
  try {
    const file = req.file;
    const { tipe } = req.body;

    if (!file) {
      return res.status(400).json({ message: "File tidak ada!" });
    }

    filePath = file.path;

    const workbook = XLSX.readFile(filePath);
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




router.post("/import-analisa-multi", upload.single("file"), async (req, res) => {
  let filePath = req.file?.path;

  try {
    const { project_id } = req.body;

    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    // 🔥 baca excel sebagai array
    const data = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: "",
      blankrows: false
    });

    let currentAnalisa = null;
    let currentTipe = null;

    const analisaList = {};
    const detailBuffer = [];
    const errors = [];

    const normalizeText = (text) =>
      String(text || "").toLowerCase().trim();

    // 🔥 ambil semua item
    const allItems = await ProjectItem.findAll();
    const itemMap = {};

    allItems.forEach(item => {
      const key = `${item.tipe}_${normalizeText(item.nama)}`;
      itemMap[key] = item;
    });

    // =========================
    // 🔥 LOOP EXCEL
    // =========================
    for (const row of data) {

      // 🔥 skip kosong
      if (!row || row.length === 0 || row.every(v => v === "")) continue;

      const colA = row[0] || "";
      const colB = row[1] || "";
      const colC = row[2] || "";
      const colE = row[4] || "";

      console.log("ROW:", colA, colB, colC);

      // =========================
      // 🔥 DETEKSI ANALISA (A.1 / B.1)
      // =========================
      const textAnalisa = [colA, colB, colC]
        .map(v => String(v).trim())
        .find(v => /^[A-Z]\.\d/.test(v));

      if (textAnalisa) {
        const kode = textAnalisa.split(" ")[0];
        const nama = textAnalisa.replace(kode, "").trim();

        currentAnalisa = {
          project_id,
          kode,
          nama,
          satuan: colE || "",
          overhead_persen: 10
        };

        analisaList[kode] = { ...currentAnalisa };
        currentTipe = null;

        console.log("SET ANALISA:", kode);
        continue;
      }

      // =========================
      // 🔥 DETEKSI TIPE
      // =========================
      if (String(colB).toUpperCase().includes("TENAGA")) {
        currentTipe = "TENAGA";
        console.log("SET TIPE: TENAGA");
        continue;
      }

      if (String(colB).toUpperCase().includes("BAHAN")) {
        currentTipe = "BAHAN";
        console.log("SET TIPE: BAHAN");
        continue;
      }

      if (String(colB).toUpperCase().includes("ALAT")) {
        currentTipe = "ALAT";
        console.log("SET TIPE: ALAT");
        continue;
      }

      // =========================
      // 🔥 ITEM
      // =========================
      if (!currentAnalisa || !currentTipe) continue;

      const itemName = colB;
      const koef = Number(colC || 0);

      if (!itemName) continue;

      const key = `${currentTipe}_${normalizeText(itemName)}`;
      const item = itemMap[key];

      if (!item) {
        console.log("❌ ITEM TIDAK KETEMU:", itemName);
        errors.push(`${itemName} tidak ditemukan (${currentTipe})`);
        continue;
      }

      console.log("✅ ITEM:", item.nama);

      detailBuffer.push({
        kode: currentAnalisa.kode,
        item_id: item.id,
        koefisien: koef
      });
    }

    console.log("ANALISA:", Object.keys(analisaList));
    console.log("TOTAL DETAIL:", detailBuffer.length);

    // =========================
    // ❌ VALIDASI ERROR
    // =========================
    if (errors.length > 0) {
      return res.status(400).json({
        message: "Import gagal",
        errors
      });
    }

    // =========================
    // 🔥 INSERT ANALISA DULU
    // =========================
    let analisaMap = {};

    for (const kode in analisaList) {
      const newAnalisa = await ProjectAnalisa.create(analisaList[kode]);
      analisaMap[kode] = newAnalisa.id;

      console.log("INSERT ANALISA:", kode);
    }

    // =========================
    // 🔥 INSERT DETAIL
    // =========================
    for (const row of detailBuffer) {
      await ProjectAnalisaDetail.create({
        project_analisa_id: analisaMap[row.kode],
        item_id: row.item_id,
        koefisien: row.koefisien
      });
    }

    // =========================
    // ✅ RESPONSE
    // =========================
    res.json({
      message: "Import berhasil!",
      total_analisa: Object.keys(analisaList).length,
      total_detail: detailBuffer.length
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  } finally {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
});


export default router;