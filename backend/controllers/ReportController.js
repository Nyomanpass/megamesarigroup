import { DailyPlan, DailyProgress, Boq } from "../models/index.js";

import { DailyMaterial } from "../models/DailyMaterial.js";
import { DailyPekerja } from "../models/DailyPekerja.js";
import { DailyPeralatan } from "../models/DailyPeralatan.js";
import { Material } from "../models/MaterialModel.js";
import { Pekerja } from "../models/Pekerja.js";
import { Peralatan } from "../models/PeralatanModel.js";

export const getWeeklyReport = async (req, res) => {
  try {
    const { project_id } = req.params;

    // 🔥 ambil data
    const plans = await DailyPlan.findAll({
      where: { project_id },
      order: [["tanggal", "ASC"]],
    });

    const boqs = await Boq.findAll({
      where: { project_id }
    });

    const progress = await DailyProgress.findAll({
      where: { project_id }
    });

    // 🔥 grouping berdasarkan minggu
    const group = {};
    plans.forEach((p) => {
      if (!group[p.minggu_ke]) group[p.minggu_ke] = [];
      group[p.minggu_ke].push(p);
    });

    const result = [];

    // 🔥 loop tiap minggu
    for (const minggu in group) {
      const items = group[minggu];

      const tglAwal = items[0].tanggal;
      const tglAkhir = items[items.length - 1].tanggal;

      // =========================================
      // 🔥 RENCANA MINGGUAN (DARI DAILY PLAN)
      // =========================================
      const rencanaMingguan = Number(items[0].bobot_mingguan || 0);

      // =========================================
      // 🔥 REAL TOTAL MINGGU INI (SEMUA BOQ)
      // =========================================
      const realMingguan = progress
        .filter(
          (p) =>
            p.tanggal >= tglAwal &&
            p.tanggal <= tglAkhir
        )
        .reduce((sum, p) => sum + Number(p.volume), 0);

      // =========================================
      // 🔥 DEVIASI
      // =========================================
      const deviasi = realMingguan - rencanaMingguan;

      // =========================================
      // 🔥 DETAIL PER BOQ
      // =========================================
      const laporan = [];

      for (const boq of boqs) {
        const total = Number(boq.volume || 0);

        // 🔥 minggu ini (per BOQ)
        const mingguIni = progress
          .filter(
            (p) =>
              p.boq_id === boq.id &&
              p.tanggal >= tglAwal &&
              p.tanggal <= tglAkhir
          )
          .reduce((sum, p) => sum + Number(p.volume), 0);

        // 🔥 s/d minggu lalu
        const sdLalu = progress
          .filter(
            (p) =>
              p.boq_id === boq.id &&
              p.tanggal < tglAwal
          )
          .reduce((sum, p) => sum + Number(p.volume), 0);

        // 🔥 s/d minggu ini
        const sdIni = sdLalu + mingguIni;

        // 🔥 persen terhadap total BOQ
        const persen = total ? (sdIni / total) * 100 : 0;

        laporan.push({
          uraian: boq.uraian,
          bobot: boq.bobot,
          satuan: boq.satuan,
          total: Number(total.toFixed(3)),

          tipe: boq.tipe,

          minggu_ini: Number(mingguIni.toFixed(3)),
          sd_lalu: Number(sdLalu.toFixed(3)),
          sd_ini: Number(sdIni.toFixed(3)),

          persen: Number(persen.toFixed(1))
        });
      }

      // =========================================
      // 🔥 PUSH HASIL PER MINGGU
      // =========================================
      result.push({
        minggu_ke: Number(minggu),
        tgl_awal: tglAwal,
        tgl_akhir: tglAkhir,

        // 🔥 TAMBAHAN BARU
        rencana: Number(rencanaMingguan.toFixed(3)),
        real: Number(realMingguan.toFixed(3)),
        deviasi: Number(deviasi.toFixed(3)),

        data: laporan
      });
    }

    res.json(result);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const getMonthlyReport = async (req, res) => {
  try {
    const { project_id } = req.params;

    const plans = await DailyPlan.findAll({
      where: { project_id },
      order: [["tanggal", "ASC"]],
    });

    const boqs = await Boq.findAll({
      where: { project_id }
    });

    const progress = await DailyProgress.findAll({
      where: { project_id }
    });

    // 🔥 GROUP BY BULAN
    const group = {};
    plans.forEach((p) => {
      if (!group[p.bulan_ke]) group[p.bulan_ke] = [];
      group[p.bulan_ke].push(p);
    });

    const result = [];

    for (const bulan in group) {
      const items = group[bulan];

      const tglAwal = items[0].tanggal;
      const tglAkhir = items[items.length - 1].tanggal;

      // =========================================
      // ✅ RENCANA BULANAN (FIX - AMBIL PER MINGGU)
      // =========================================
      const mingguMap = {};

      items.forEach((p) => {
        if (!mingguMap[p.minggu_ke]) {
          mingguMap[p.minggu_ke] = Number(p.bobot_mingguan || 0);
        }
      });

      const rencanaBulanan = Object.values(mingguMap)
        .reduce((sum, val) => sum + val, 0);

      // =========================================
      // 🔥 REAL BULAN INI
      // =========================================
      const realBulanan = progress
        .filter(
          (p) =>
            p.tanggal >= tglAwal &&
            p.tanggal <= tglAkhir
        )
        .reduce((sum, p) => sum + Number(p.volume), 0);

      // =========================================
      // 🔥 DEVIASI
      // =========================================
      const deviasi = realBulanan - rencanaBulanan;

      // =========================================
      // 🔥 DETAIL PER BOQ
      // =========================================
      const laporan = [];

      for (const boq of boqs) {
        const total = Number(boq.volume || 0);

        const bulanIni = progress
          .filter(
            (p) =>
              p.boq_id === boq.id &&
              p.tanggal >= tglAwal &&
              p.tanggal <= tglAkhir
          )
          .reduce((sum, p) => sum + Number(p.volume), 0);

        const sdLalu = progress
          .filter(
            (p) =>
              p.boq_id === boq.id &&
              p.tanggal < tglAwal
          )
          .reduce((sum, p) => sum + Number(p.volume), 0);

        const sdIni = sdLalu + bulanIni;

        const persen = total ? (sdIni / total) * 100 : 0;

        laporan.push({
          uraian: boq.uraian,
          bobot: boq.bobot,
          satuan: boq.satuan,
          total: Number(total.toFixed(3)),

          tipe: boq.tipe,

          bulan_ini: Number(bulanIni.toFixed(3)),
          sd_lalu: Number(sdLalu.toFixed(3)),
          sd_ini: Number(sdIni.toFixed(3)),

          persen: Number(persen.toFixed(1))
        });
      }

      // =========================================
      // 🔥 FINAL RESULT
      // =========================================
      result.push({
        bulan_ke: Number(bulan),
        tgl_awal: tglAwal,
        tgl_akhir: tglAkhir,

        rencana: Number(rencanaBulanan.toFixed(3)), // ✅ FIX AKURAT
        real: Number(realBulanan.toFixed(3)),
        deviasi: Number(deviasi.toFixed(3)),

        data: laporan
      });
    }

    res.json(result);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



export const getDailyReport = async (req, res) => {
  try {
    const { project_id } = req.params;
    const { tanggal, hari_ke } = req.query;

    let targetTanggal = tanggal;

    // 1. Cari tanggal berdasarkan hari_ke jika inputnya hari_ke
    if (hari_ke) {
      const plan = await DailyPlan.findOne({ where: { project_id, hari_ke } });
      if (!plan) return res.status(404).json({ message: "Hari tidak ditemukan" });
      targetTanggal = plan.tanggal;
    }

    if (!targetTanggal) return res.status(400).json({ message: "Pilih tanggal atau hari_ke" });

    // 2. Ambil data Progress beserta relasi Material, Pekerja (Master), dan Peralatan (Master)
    const data = await DailyProgress.findAll({
      where: { project_id, tanggal: targetTanggal },
      include: [
        { model: Boq, as: "boq", attributes: ["uraian", "satuan"] },
        { 
          model: DailyMaterial, as: "materials", 
          include: [{ model: Material, as: "material", attributes: ["nama", "satuan"] }] 
        },
        { 
          model: DailyPekerja, as: "workers", 
          include: [{ model: Pekerja, as: "pekerja", attributes: ["nama", "satuan", "di_bilang"] }] 
        },
        { 
          model: DailyPeralatan, as: "tools", 
          include: [{ model: Peralatan, as: "tool", attributes: ["nama", "satuan", "di_bilang"] }] 
        }
      ]
    });

    // 3. Inisialisasi Penampung untuk Gabungan
    const total_material = {};
    const total_pekerja = {};
    const total_peralatan = {};

    const result = data.map((d) => {
      // --- PROSES MATERIAL (Akumulasi/Tambah terus) ---
      d.materials?.forEach(m => {
        const nama = m.material?.nama;
        const sat = m.material?.satuan || "";
        if (nama) {
          if (!total_material[nama]) total_material[nama] = { total: 0, satuan: sat };
          total_material[nama].total += Number(m.hasil);
        }
      });

    // --- PROSES PEKERJA (Akumulasi Sistem + Data Master) ---
      d.workers?.forEach(w => {
        const nama = w.pekerja?.nama;
        const sat = w.pekerja?.satuan || "";
        const dib = Number(w.pekerja?.di_bilang) || 0;
        
        if (nama) {
          if (!total_pekerja[nama]) {
            total_pekerja[nama] = { total: 0, satuan: sat, di_bilang: dib };
          }
          // 🔥 TAMBAHKAN TERUS (Akumulasi): agar 0.02 + 0.09 = 0.11
          total_pekerja[nama].total += Number(w.jumlah);
        }
      });

      // --- PROSES PERALATAN (Akumulasi Sistem + Data Master) ---
      d.tools?.forEach(t => {
        const nama = t.tool?.nama;
        const sat = t.tool?.satuan || "";
        const dib = Number(t.tool?.di_bilang) || 0;
        
        if (nama) {
          if (!total_peralatan[nama]) {
            total_peralatan[nama] = { total: 0, satuan: sat, di_bilang: dib };
          }
          // 🔥 TAMBAHKAN TERUS: agar hasil sistem akurat
          total_peralatan[nama].total += Number(t.jumlah);
        }
      });
      return {
        tanggal: d.tanggal,
        uraian: d.boq?.uraian,
        satuan: d.boq?.satuan,
        volume: Number(d.volume),
        materials: d.materials || [],
        pekerja: d.workers || [],
        peralatan: d.tools || []
      };
    });

    // 4. Format Akhir untuk dikirim ke Frontend
    const formatTotal = (obj) => Object.entries(obj).map(([nama, val]) => ({ 
      nama, 
      total: val.total, 
      di_bilang: val.di_bilang,
      satuan: val.satuan 
    }));

    res.json({
      tanggal: targetTanggal,
      data: result,
      total_material: formatTotal(total_material),
      total_pekerja: formatTotal(total_pekerja),
      total_peralatan: formatTotal(total_peralatan)
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};