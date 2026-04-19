import { Boq } from "../models/BoqModel.js";
import { ProjectAnalisa } from "../models/ProjekAnalisa.js";
import { ProjectAnalisaDetail } from "../models/ProjekAnalisaDetail.js";
import { ProjectItem } from "../models/ProjekItem.js";


// 🔥 ROMAWI → TEXT
const toRoman = (num) => {
  const romanMap = [
    { value: 1000, numeral: "M" },
    { value: 900, numeral: "CM" },
    { value: 500, numeral: "D" },
    { value: 400, numeral: "CD" },
    { value: 100, numeral: "C" },
    { value: 90, numeral: "XC" },
    { value: 50, numeral: "L" },
    { value: 40, numeral: "XL" },
    { value: 10, numeral: "X" },
    { value: 9, numeral: "IX" },
    { value: 5, numeral: "V" },
    { value: 4, numeral: "IV" },
    { value: 1, numeral: "I" }
  ];

  let result = "";
  for (let i = 0; i < romanMap.length; i++) {
    while (num >= romanMap[i].value) {
      result += romanMap[i].numeral;
      num -= romanMap[i].value;
    }
  }
  return result;
};

const formatRupiah = (num) => {
  return "Rp " + Number(Math.floor(num || 0)).toLocaleString("id-ID") + ",00";
};

// 🔥 ROMAWI → ANGKA
const romanToNumber = (roman) => {
  const map = { I:1, V:5, X:10, L:50, C:100 };
  let num = 0;

  for (let i = 0; i < roman.length; i++) {
    const curr = map[roman[i]];
    const next = map[roman[i + 1]];
    if (next > curr) num -= curr;
    else num += curr;
  }

  return num;
};


// 🚀 🔥 GENERATE KODE FINAL
const generateKode = async (parent_id, tipe) => {

  // ========================
  // 🔥 HEADER (A, B, C)
  // ========================
  if (!parent_id && tipe === "header") {
    const headers = await Boq.findAll({
      where: { parent_id: null }
    });

    if (headers.length === 0) return "A";

    const chars = headers.map(h => h.kode.charCodeAt(0));
    const max = Math.max(...chars);

    return String.fromCharCode(max + 1);
  }

  // ========================
  // 🔥 SUBHEADER (I, II, III)
  // ========================
  if (tipe === "subheader") {
    const subs = await Boq.findAll({
      where: { parent_id }
    });

    if (subs.length === 0) return "I";

    const numbers = subs
      .map(s => romanToNumber(s.kode))
      .filter(n => !isNaN(n));

    const max = Math.max(...numbers);

    return toRoman(max + 1);
  }

  // ========================
  // 🔥 ITEM (1, 2, 3)
  // ========================
  if (tipe === "item") {
    const items = await Boq.findAll({
      where: { parent_id }
    });

    const numbers = items
      .map(i => parseInt(i.kode))
      .filter(n => !isNaN(n));

    // 🔥 kalau belum ada data
    if (numbers.length === 0) return "1";

    // 🔥 cari angka yang kosong (GAP)
    const sorted = numbers.sort((a, b) => a - b);

    let next = sorted.length + 1;

    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i] !== i + 1) {
        next = i + 1;
        break;
      }
    }

    return String(next);
  }

  return "1";
};


const buildFlatTree = (data, parentId = null, level = 0) => {
  let result = [];

  const children = data
    .filter(item => item.parent_id === parentId)
    .sort((a, b) => {
      const kodeA = (a.kode || "").toString();
      const kodeB = (b.kode || "").toString();

      return kodeA.localeCompare(kodeB, undefined, {
        numeric: true,
        sensitivity: "base"
      });
    });

  for (const child of children) {
    result.push({
      ...child,
      level // 🔥 optional buat indent UI
    });

    const sub = buildFlatTree(data, child.id, level + 1);
    result = result.concat(sub);
  }

  return result;
};

// 🔥 TANPA req/res
export const generateBobotInternal = async (project_id) => {
  try {
    const data = await Boq.findAll({
      where: { project_id }
    });

    let totalSemua = 0;
    const temp = [];

    // 🔥 hitung jumlah semua item
    for (let boq of data) {
      if (boq.tipe === "item" && boq.analisa_id) {
        const analisaResult = await hitungAnalisa(boq.analisa_id);
        const harga_satuan = analisaResult.grandTotal;

        const volume = Number(boq.volume) || 0;
        const jumlah = harga_satuan * volume;

        temp.push({
          id: boq.id,
          jumlah
        });

        totalSemua += jumlah;
      }
    }

    if (totalSemua === 0) return;

    let runningTotalBobot = 0;

   const updates = temp.map((item, index) => {
    let bobotFinal;

    if (index === temp.length - 1) {
      // Item terakhir menanggung sisa selisih pembulatan
      // Gunakan .toFixed(3) lagi agar hasilnya konsisten 3 desimal
      bobotFinal = (100 - runningTotalBobot).toFixed(3);
    } else {
      // Hitung bobot normal
      const hitungBobot = (item.jumlah / totalSemua) * 100;
      bobotFinal = hitungBobot.toFixed(3);
      runningTotalBobot += Number(bobotFinal);
    }

    return Boq.update(
      { bobot: Number(bobotFinal) },
      { where: { id: item.id } }
    );
  });

    await Promise.all(updates);

  } catch (error) {
    console.error("ERROR generate:", error);
  }
};


const round2 = (num) => Math.round(num * 100) / 100;


const hitungAnalisa = async (analisa_id) => {
  const analisa = await ProjectAnalisa.findByPk(analisa_id);

  const details = await ProjectAnalisaDetail.findAll({
    where: { project_analisa_id: analisa_id },
    include: [
      {
        model: ProjectItem,
        as: "item"
      }
    ]
  });

  let total = 0;

  details.forEach((d) => {
    const harga = round2(Number(d.item?.harga || 0));
    const koef = Number(d.koefisien) || 0;

    const subtotal = round2(koef * harga);
    total = round2(total + subtotal);
  });

  const totalFix = round2(total);

  const persen = Number(analisa.overhead_persen) || 0;
  const overhead = round2((persen / 100) * totalFix);

  const grandTotal = Math.floor(totalFix + overhead);

  return {
    total: totalFix,
    overhead,
    grandTotal
  };
};

export const createBulkBoq = async (req, res) => {
  try {
    const { project_id, parent_id, items } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "Data kosong" });
    }

    const results = [];
    let counter = 0;

    for (const item of items) {
      let { uraian, satuan, volume, analisa_id, ppn } = item;

      if (!analisa_id) {
        return res.status(400).json({ message: "Analisa wajib dipilih untuk item!" });
      }

      // 🔥 generate kode
      const baseKode = await generateKode(parent_id, "item");
      const kode = String(Number(baseKode) + counter);
      counter++;

      // 🔥 AMBIL HASIL ANALISA
      const analisaResult = await hitungAnalisa(analisa_id);

      const harga_satuan = analisaResult.grandTotal; // 🔥 INI KUNCI

      const vol = Number(volume) || 0;
      const persenPPN = Number(ppn) || 11;

      const jumlah = harga_satuan * vol;
      const jumlah_ppn = jumlah + (jumlah * persenPPN / 100);

      const newItem = await Boq.create({
        project_id,
        parent_id,
        analisa_id,
        kode: kode.trim(),
        uraian,
        satuan,
        volume: vol,
        ppn: persenPPN,
        harga_satuan,   // ✅ sekarang ada
        jumlah,         // ✅ sekarang ada
        jumlah_ppn,     // ✅ sekarang ada
        tipe: "item"
      });

      results.push(newItem);
    }

    // 🔥 hitung bobot
    await generateBobotInternal(project_id);

    res.status(201).json({
      message: `${results.length} Item berhasil ditambahkan`,
      data: results
    });

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

export const getBoqByProject = async (req, res) => {
  try {
    const { project_id } = req.params;

    const data = await Boq.findAll({
      where: { project_id }
    });

    // 🔥 HITUNG DINAMIS
    const calculated = await Promise.all(
      data.map(async (boq) => {

        let harga_satuan = 0;
        let jumlah = 0;
        let jumlah_ppn = 0;

        if (boq.tipe === "item" && boq.analisa_id) {
         const analisaResult = await hitungAnalisa(boq.analisa_id);
          harga_satuan = analisaResult.grandTotal;

          const volume = Number(boq.volume) || 0;
          jumlah = harga_satuan * volume;

          const ppn = Number(boq.ppn) || 0;
          jumlah_ppn = jumlah + (jumlah * ppn / 100);
        }

        return {
          ...boq.toJSON(),

          harga_satuan,
          jumlah,
          jumlah_ppn,

          harga_satuan_rp: formatRupiah(harga_satuan),
          jumlah_rp: formatRupiah(jumlah),
          jumlah_ppn_rp: formatRupiah(jumlah_ppn)
        };
      })
    );

    // 🔥 INI KUNCINYA
    const result = buildFlatTree(calculated);

    res.json(result);

  } catch (error) {
    console.error("ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

export const getBoqStructured = async (project_id) => {
  const data = await Boq.findAll({
    where: { project_id }
  });

  const calculated = await Promise.all(
    data.map(async (boq) => {

      let harga_satuan = 0;
      let jumlah = 0;
      let jumlah_ppn = 0;

      if (boq.tipe === "item" && boq.analisa_id) {
        const analisaResult = await hitungAnalisa(boq.analisa_id);

        harga_satuan = analisaResult.grandTotal;

        const volume = Number(boq.volume) || 0;
        jumlah = harga_satuan * volume;

        const ppn = Number(boq.ppn) || 0;
        jumlah_ppn = jumlah + (jumlah * ppn / 100);
      }

      return {
        ...boq.toJSON(),
        harga_satuan,
        jumlah,
        jumlah_ppn
      };
    })
  );

  return buildFlatTree(calculated); // 🔥 PAKAI YANG SUDAH ADA
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

export const updateBoq = async (req, res) => {
  try {
    const { id } = req.params;

    const item = await Boq.findByPk(id);
    if (!item) {
      return res.status(404).json({ message: "Data tidak ditemukan" });
    }

    const project_id = item.project_id;

    let {
      tipe,
      parent_id,
      kode,
      uraian,
      satuan,
      volume,
      harga_satuan,
      analisa_id,
      ppn
    } = req.body;

    let jumlah = null;
    let jumlah_ppn = null;

    // =========================
    // 🔥 HEADER / SUBHEADER
    // =========================
    if (tipe === "header" || tipe === "subheader") {

      if (!kode) {
        return res.status(400).json({ message: "Kode wajib diisi untuk Header/Subheader" });
      }

      // reset semua angka
      volume = null;
      harga_satuan = null;
      jumlah = null;
      jumlah_ppn = null;
      analisa_id = null;
    }

    // =========================
    // 🔥 ITEM
    // =========================
    else if (tipe === "item") {

      if (!parent_id) {
        return res.status(400).json({ message: "Item wajib punya parent!" });
      }

      // 🔥 jika parent berubah → generate ulang kode
      if (parent_id !== item.parent_id) {
        kode = await generateKode(parent_id, "item");
      } else {
        kode = item.kode; // tetap
      }

      if (analisa_id) {
          const analisaResult = await hitungAnalisa(analisa_id);

          harga_satuan = analisaResult.grandTotal; // 🔥 ambil dari analisa
        }

        if (volume && harga_satuan) {
          jumlah = Math.floor(parseFloat(volume) * parseFloat(harga_satuan));
          jumlah_ppn = Math.floor(jumlah + (jumlah * (ppn || 11) / 100));
        }
    }

    // =========================
    // 🔥 UPDATE DATA
    // =========================
    await item.update({
      kode: kode?.trim() ?? item.kode,
      parent_id: parent_id ?? item.parent_id,
      uraian: uraian ?? item.uraian,
      satuan: satuan ?? item.satuan,
      volume,
      harga_satuan,
      jumlah,
      jumlah_ppn,
      analisa_id: analisa_id ?? item.analisa_id,
      ppn: ppn ?? item.ppn,
      tipe: tipe ?? item.tipe
    });

    // 🔥 UPDATE BOBOT
    await generateBobotInternal(project_id);

    res.status(200).json({
      message: "Berhasil update BOQ",
      data: item
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// 🔥 DELETE
export const deleteBoq = async (req, res) => {
  try {
    const { id } = req.params;

    const item = await Boq.findByPk(id);
    if (!item) {
      return res.status(404).json({ message: "Data tidak ditemukan" });
    }

    const project_id = item.project_id;

    await item.destroy();

    // 🔥 regenerate bobot setelah delete
    await generateBobotInternal(project_id);

    res.status(200).json({
      message: "Berhasil hapus BOQ"
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const linkAnalisaBoq = async (req, res) => {
  try {
    const { id } = req.params;
    const { analisa_id } = req.body;

    const item = await Boq.findByPk(id);

    if (!item) {
      return res.status(404).json({ message: "BOQ tidak ditemukan" });
    }

    if (!analisa_id) {
      return res.status(400).json({ message: "Analisa wajib dipilih!" });
    }

    // 🔥 pakai 1 sumber perhitungan
    const analisaResult = await hitungAnalisa(analisa_id);

    const harga_satuan = analisaResult.grandTotal;

    const volume = Number(item.volume) || 0;
    const ppn = Number(item.ppn) || 11;

    const jumlah = harga_satuan * volume;
    const jumlah_ppn = jumlah + (jumlah * ppn / 100);

    await item.update({
      analisa_id,
      harga_satuan,
      jumlah,
      jumlah_ppn
    });

    await generateBobotInternal(item.project_id);

    res.json({
      message: "Berhasil link analisa",
      data: item
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};