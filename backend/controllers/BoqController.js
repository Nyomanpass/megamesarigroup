import { Boq } from "../models/BoqModel.js";
import { ProjectAnalisa } from "../models/ProjekAnalisa.js";
import { ProjectAnalisaDetail } from "../models/ProjekAnalisaDetail.js";
import { ProjectItem } from "../models/ProjekItem.js";

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
        const harga_satuan = await hitungAnalisa(boq.analisa_id);
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

const generateKode = async (parent_id) => {
  const parent = await Boq.findByPk(parent_id);
  if (!parent) throw new Error("Parent tidak ditemukan");

  const children = await Boq.findAll({
    where: { parent_id },
    order: [['kode', 'DESC']]
  });

  let nextNumber = 1;
  if (children.length > 0) {
    const lastChildKode = children[0].kode;
    const parts = lastChildKode.split('.');
    const lastPart = parts[parts.length - 1];
    nextNumber = parseInt(lastPart) + 1;
  }
  if (!parent.kode.includes('.')) { 
     return `${parent.kode}.1.${nextNumber}`;
  }
  return `${parent.kode}.${nextNumber}`;
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

    // 🔥 round tiap item
    const subtotal = round2(koef * harga);

    total = round2(total + subtotal);
  });

  // 🔥 round total sebelum overhead
  const totalFix = round2(total);

  // 🔥 overhead
  const overhead = round2((analisa.overhead_persen / 100) * totalFix);

  // 🔥 final
  return round2(totalFix + overhead);
};

export const createBulkBoq = async (req, res) => {
  try {
    const { project_id, parent_id, items } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "Data kosong" });
    }

    const results = [];

    for (const item of items) {
      let { uraian, satuan, volume, analisa_id, ppn } = item;

      if (!analisa_id) {
        return res.status(400).json({ message: "Analisa wajib dipilih untuk item!" });
      }

      // 🔥 generate kode
      const kode = await generateKode(parent_id);

      // ❗ TIDAK HITUNG HARGA DI SINI

      const newItem = await Boq.create({
        project_id,
        parent_id,
        analisa_id, // 🔥 kunci utama
        kode: kode.trim(),
        uraian,
        satuan,
        volume,
        ppn,
        tipe: "item"
      });


      results.push(newItem);
    }
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

    // 🔥 SORTING (tetap dipakai)
    const sortedData = data.sort((a, b) => {
      const kodeA = (a.kode || "").trim();
      const kodeB = (b.kode || "").trim();

      return kodeA.localeCompare(kodeB, undefined, {
        numeric: true,
        sensitivity: "base"
      });
    });

    // 🔥 HITUNG DINAMIS
    const result = await Promise.all(
      sortedData.map(async (boq) => {

        let harga_satuan = 0;
        let jumlah = 0;
        let jumlah_ppn = 0;

        if (boq.tipe === "item" && boq.analisa_id) {

          harga_satuan = await hitungAnalisa(boq.analisa_id);

          const volume = Number(boq.volume) || 0;
          jumlah = harga_satuan * volume;

          const ppn = Number(boq.ppn) || 0;
          jumlah_ppn = jumlah + (jumlah * ppn / 100);
        }

        return {
          ...boq.toJSON(),

          // 🔥 override nilai DB
          harga_satuan: Number(harga_satuan.toFixed(2)),
          jumlah: Number(jumlah.toFixed(2)),
          jumlah_ppn: Number(jumlah_ppn.toFixed(2))
        };
      })
    );

    res.json(result);

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

export const updateBoq = async (req, res) => {
  try {
    const { id } = req.params;

    // 🔥 cari data
    const item = await Boq.findByPk(id);
    if (!item) {
      return res.status(404).json({ message: "Data tidak ditemukan" });
    }

    // 🔥 ambil project_id untuk generate bobot nanti
    const project_id = item.project_id;

    // 🔥 ambil field yang mau diupdate
    const {
      uraian,
      satuan,
      volume,
      analisa_id,
      ppn,
      tipe,
      kode,
      parent_id
    } = req.body;

    // 🔥 update manual biar aman & fleksibel
    await item.update({
      kode: kode ?? item.kode,
      parent_id: parent_id ?? item.parent_id,
      uraian: uraian ?? item.uraian,
      satuan: satuan ?? item.satuan,
      volume: volume ?? item.volume,
      analisa_id: analisa_id ?? item.analisa_id,
      ppn: ppn ?? item.ppn,
      tipe: tipe ?? item.tipe
    });

    // 🔥 REGENERATE BOBOT
    await generateBobotInternal(project_id);

    res.status(200).json({
      message: "Berhasil update BOQ",
      data: item
    });

  } catch (error) {
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