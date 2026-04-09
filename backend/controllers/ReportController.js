import { DailyPlan, DailyProgress, Boq } from "../models/index.js";
import { DailyProgressItem } from "../models/index.js";
import { ProjectItem } from "../models/index.js";

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

    const sortedBoqs = boqs.sort((a, b) => {
      const kodeA = (a.kode || "").trim();
      const kodeB = (b.kode || "").trim();

      return kodeA.localeCompare(kodeB, undefined, {
        numeric: true,
        sensitivity: "base",
      });
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

      for (const boq of sortedBoqs) {
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

    const sortedBoqs = boqs.sort((a, b) => {
      const kodeA = (a.kode || "").trim();
      const kodeB = (b.kode || "").trim();

      return kodeA.localeCompare(kodeB, undefined, {
        numeric: true,
        sensitivity: "base",
      });
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

      for (const boq of sortedBoqs) {
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
    const { day } = req.query; // 🔥 pakai hari_ke

    if (!day) {
      return res.status(400).json({ message: "Hari ke wajib diisi" });
    }

    // 🔥 1. ambil tanggal dari DailyPlan
    const plans = await DailyPlan.findAll({
      where: {
        project_id,
        hari_ke: day
      },
      attributes: ["tanggal"]
    });

    const tanggalList = plans.map(p => p.tanggal);

    if (tanggalList.length === 0) {
      return res.json({
        data: [],
        total_material: [],
        total_pekerja: [],
        total_peralatan: []
      });
    }

    // 🔥 2. ambil progress berdasarkan tanggal
    const progress = await DailyProgress.findAll({
      where: {
        project_id,
        tanggal: tanggalList
      },
      include: [
        {
          model: Boq,
          as: "boq",
          attributes: ["uraian", "satuan"]
        },
        {
          model: DailyProgressItem,
          as: "items",
          include: [
            {
              model: ProjectItem,
              as: "item",
              attributes: ["terbilang"]
            }
          ]
        }
      ]
    });

    // 🔥 3. mapping
    const result = progress.map(p => {
      const items = p.items || [];

      return {
        tanggal: p.tanggal,
        uraian: p.boq?.uraian,
        satuan: p.boq?.satuan,
        volume: p.volume,

        materials: items.filter(i => i.tipe === "BAHAN"),
        pekerja: items.filter(i => i.tipe === "TENAGA"),
        peralatan: items.filter(i => i.tipe === "ALAT")
      };
    });

    const total_material = {};
    const total_pekerja = {};
    const total_peralatan = {};

    result.forEach(r => {

      // MATERIAL
      r.materials.forEach(m => {
        if (!total_material[m.nama]) {
          total_material[m.nama] = { nama: m.nama, total: 0, satuan: m.satuan };
        }
        total_material[m.nama].total += m.hasil;
      });

      // PEKERJA
      r.pekerja.forEach(p => {
        if (!total_pekerja[p.nama]) {
          total_pekerja[p.nama] = {
            nama: p.nama,
            total: 0,
            satuan: p.satuan,
            terbilang: 0
          };
        }

        total_pekerja[p.nama].total += p.hasil;

        if (p.hasil > 0 && total_pekerja[p.nama].terbilang === 0) {
          total_pekerja[p.nama].terbilang = p.item?.terbilang || 0;
        }
      });

      // PERALATAN
      r.peralatan.forEach(a => {
        if (!total_peralatan[a.nama]) {
          total_peralatan[a.nama] = {
            nama: a.nama,
            total: 0,
            satuan: a.satuan,
            terbilang: 0
          };
        }

        total_peralatan[a.nama].total += a.hasil;

        if (a.hasil > 0 && total_peralatan[a.nama].terbilang === 0) {
          total_peralatan[a.nama].terbilang = a.item?.terbilang || 0;
        }
      });

    });

    res.json({
      data: result,
      total_material: Object.values(total_material),
      total_pekerja: Object.values(total_pekerja),
      total_peralatan: Object.values(total_peralatan)
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};