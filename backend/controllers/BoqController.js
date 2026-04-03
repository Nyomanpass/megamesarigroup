import { Boq } from "../models/BoqModel.js";
import { Sequelize } from "sequelize";

const generateKode = async (parent_id) => {
  const parent = await Boq.findByPk(parent_id);
  if (!parent) throw new Error("Parent tidak ditemukan");

  // Cari semua anak dari parent ini untuk menentukan nomor urut berikutnya
  const children = await Boq.findAll({
    where: { parent_id },
    order: [['kode', 'DESC']] // Ambil yang kodenya paling terakhir
  });

  let nextNumber = 1;
  if (children.length > 0) {
    // Ambil angka terakhir dari kode anak paling bawah
    // Misal A.1.2 -> ambil "2", lalu tambah 1 jadi "3"
    const lastChildKode = children[0].kode;
    const parts = lastChildKode.split('.');
    const lastPart = parts[parts.length - 1];
    nextNumber = parseInt(lastPart) + 1;
  }

  // LOGIKA DINAMIS:
  // Jika parent adalah Header (A), dan kamu mau itemnya langsung A.1.1:
  if (!parent.kode.includes('.')) { 
     // Opsi 1: Jika Header (A) langsung punya Item -> A.1
     // return `${parent.kode}.${nextNumber}`; 
     
     // Opsi 2: Jika ingin standar 3 level (A.1.1) walaupun tanpa sub-header:
     return `${parent.kode}.1.${nextNumber}`;
  }

  // Jika parent adalah Sub-Header (A.1), maka anaknya A.1.1, A.1.2, dst.
  return `${parent.kode}.${nextNumber}`;
};

export const createBulkBoq = async (req, res) => {
  try {
    const { project_id, parent_id, items } = req.body;

    if (!items || items.length === 0) return res.status(400).json({ message: "Data kosong" });

    const results = [];

    // Kita pakai for-loop biasa (bukan map) agar prosesnya berurutan 
    // supaya generateKode tidak menghasilkan nomor yang sama
    for (const item of items) {
      let { uraian, satuan, volume, harga_satuan, ppn } = item;
      
      // Generate kode untuk item ini
      const kode = await generateKode(parent_id);

      const jumlah = parseFloat(volume || 0) * parseFloat(harga_satuan || 0);
      const jumlah_ppn = jumlah + (jumlah * (ppn || 11) / 100);

      const newItem = await Boq.create({
        project_id,
        parent_id,
        kode: kode.trim(),
        uraian,
        satuan,
        volume,
        harga_satuan,
        jumlah,
        ppn,
        jumlah_ppn,
        tipe: "item" // Khusus Bulk untuk Item
      });
      
      results.push(newItem);
    }

    res.status(201).json({ message: `${results.length} Item berhasil ditambahkan`, data: results });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// 🔥 CREATE (input data)
export const createBoq = async (req, res) => {
  try {
    let { tipe, parent_id, kode, uraian, project_id } = req.body;
    let volume = req.body.volume || null;
    let harga_satuan = req.body.harga_satuan || null;
    let jumlah = null;
    let jumlah_ppn = null;
    let ppn = req.body.ppn || 11;

    // 1. JIKA HEADER / SUB-HEADER: Pastikan angka-angka nol/null
    if (tipe === "header" || tipe === "subheader") {
      volume = null;
      harga_satuan = null;
      jumlah = null;
      jumlah_ppn = null;
      // Kode untuk Header biasanya diinput manual (A, B, C)
      if (!kode) return res.status(400).json({ message: "Kode Header/Sub wajib diisi manual" });
    } 
    
    // 2. JIKA ITEM: Generate kode otomatis & Hitung harga
    else if (tipe === "item") {
      if (!parent_id) return res.status(400).json({ message: "Item wajib punya Parent!" });
      
      // Generate kode otomatis berdasarkan parent
      kode = await generateKode(parent_id);
      
      // Hitung otomatis jumlah harga
      if (volume && harga_satuan) {
        jumlah = parseFloat(volume) * parseFloat(harga_satuan);
        jumlah_ppn = jumlah + (jumlah * ppn / 100);
      }
    }

    const data = await Boq.create({
      project_id,
      parent_id,
      kode: kode.trim(),
      uraian,
      satuan: req.body.satuan || null,
      volume,
      harga_satuan,
      jumlah,
      ppn,
      jumlah_ppn,
      tipe,
      bobot: req.body.bobot || 0
    });

    res.status(201).json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};



// 🔥 GET ALL BY PROJECT
export const getBoqByProject = async (req, res) => {
  try {
    const { project_id } = req.params;

    // 1. Ambil data mentah dari DB (jangan sort di DB dulu)
    const data = await Boq.findAll({
      where: { project_id }
    });

    // 2. Sorting Cerdas di Javascript
    const sortedData = data.sort((a, b) => {
      // Hilangkan spasi di depan/belakang kode sebelum dibanding
      const kodeA = (a.kode || "").trim();
      const kodeB = (b.kode || "").trim();

      // numeric: true membuat "B.1.10" di bawah "B.1.2"
      // sensitivity: 'base' membuat urutan tidak sensitif huruf besar/kecil
      return kodeA.localeCompare(kodeB, undefined, {
        numeric: true,
        sensitivity: 'base'
      });
    });

    res.json(sortedData);
  } catch (error) {
    console.error("DETEKSI ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

// 🔥 GET DETAIL
export const getBoqById = async (req, res) => {
  try {
    const data = await Boq.findByPk(req.params.id);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🔥 UPDATE
export const updateBoq = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Cari datanya dulu
    const item = await Boq.findByPk(id);
    if (!item) return res.status(404).json({ message: "Data tidak ditemukan" });

    // Update field yang dikirim (termasuk bobot)
    await Boq.update(req.body, {
      where: { id: id }
    });

    res.status(200).json({ message: "Berhasil update data" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🔥 DELETE
export const deleteBoq = async (req, res) => {
  try {
    await Boq.destroy({
      where: { id: req.params.id }
    });

    res.json({ message: "Boq deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};