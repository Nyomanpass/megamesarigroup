import { DailyPlan, DailyProgress, Boq } from "../models/index.js";
import { DailyProgressItem } from "../models/index.js";
import { ProjectItem } from "../models/index.js";


export const getWeeklyReport = async (req, res) => {
  try {
    const { project_id } = req.params;

    // =========================
    // 🔥 AMBIL DATA
    // =========================
    const plans = await DailyPlan.findAll({
      where: { project_id: Number(project_id) },
      order: [["tanggal", "ASC"]],
    });

    const boqs = await Boq.findAll({
      where: { project_id: Number(project_id) },
    });

    const progress = await DailyProgress.findAll({
      where: { project_id: Number(project_id) },
    });

    // =========================
    // 🔥 SORT BOQ
    // =========================
    const sortedBoqs = boqs.sort((a, b) => {
      const kodeA = (a.kode || "").trim();
      const kodeB = (b.kode || "").trim();

      return kodeA.localeCompare(kodeB, undefined, {
        numeric: true,
        sensitivity: "base",
      });
    });

    // =========================
    // 🔥 GROUP PER MINGGU
    // =========================
    const group = {};
    plans.forEach((p) => {
      if (!group[p.minggu_ke]) group[p.minggu_ke] = [];
      group[p.minggu_ke].push(p);
    });

    const result = [];

    // 🔥 KUMULATIF PER ITEM
    const kumulatifPerBoq = {};

    // 🔥 KUMULATIF PROJECT
    let kumulatifProject = 0;

    // 🔥 KUMULATIF RENCANA
    let kumulatifRencana = 0;

    // =========================
    // 🔥 LOOP TIAP MINGGU
    // =========================
    for (const minggu in group) {
      const items = group[minggu];

      const tglAwal = items[0].tanggal;
      const tglAkhir = items[items.length - 1].tanggal;

      const rencanaMingguan = Number(items[0].bobot_mingguan || 0);

      let totalKumulatif = 0;
      const laporan = [];

      for (const boq of sortedBoqs) {
        const total = Number(boq.volume || 0);
        const bobot = Number(boq.bobot || 0);

        // =========================
        // 🔥 PROGRESS MINGGU INI
        // =========================
        const mingguIni = progress
          .filter(
            (p) =>
              p.boq_id === boq.id &&
              new Date(p.tanggal) >= new Date(tglAwal) &&
              new Date(p.tanggal) <= new Date(tglAkhir)
          )
          .reduce((sum, p) => sum + Number(p.volume || 0), 0);

        // =========================
        // 🔥 KUMULATIF ITEM
        // =========================
        const sdLalu = kumulatifPerBoq[boq.id] || 0;
        const sdIni = sdLalu + mingguIni;

        kumulatifPerBoq[boq.id] = sdIni;

        // =========================
        // 🔥 PROGRESS PROYEK (KUMULATIF)
        // =========================
        let progresProyek = 0;

        if (boq.tipe === "item") {
          const persenKumulatif = total ? (sdIni / total) : 0;
          progresProyek = persenKumulatif * bobot;

          totalKumulatif += progresProyek;
        }

        let progressItem = 0;

        if (boq.tipe === "item") {
          progressItem = total ? (sdIni / total) * 100 : 0;
        }

        laporan.push({
          uraian: boq.uraian,
          bobot: Number(bobot.toFixed(3)),
          satuan: boq.satuan,
          total: Number(total.toFixed(3)),

          tipe: boq.tipe,

          minggu_ini: Number(mingguIni.toFixed(3)),
          sd_lalu: Number(sdLalu.toFixed(3)),
          sd_ini: Number(sdIni.toFixed(3)),

          progress_item: Number(progressItem.toFixed(3)),
          progres_proyek: Number(progresProyek.toFixed(3)),
        });
      }

      // =========================
      // 🔥 REAL MINGGUAN
      // =========================
      const realMingguan = totalKumulatif - kumulatifProject;

      // update kumulatif project
      kumulatifProject = totalKumulatif;

      // =========================
      // 🔥 RENCANA KUMULATIF
      // =========================
      kumulatifRencana += rencanaMingguan;

      // =========================
      // 🔥 DEViasi (FIXED ✅)
      // =========================
      const deviasi = kumulatifProject - kumulatifRencana;
            // 🔥 DEViasi minggu ini (tambahan)
      const deviasiMingguan = realMingguan - rencanaMingguan;

      // =========================
      // 🔥 PUSH RESULT
      // =========================
      result.push({
        minggu_ke: Number(minggu),
        tgl_awal: tglAwal,
        tgl_akhir: tglAkhir,

        // 🔥 mingguan
        rencana_mingguan: Number(rencanaMingguan.toFixed(3)),
        real_mingguan: Number(realMingguan.toFixed(3)),
        deviasiMingguan: Number(deviasiMingguan.toFixed(3)),

        // 🔥 kumulatif
        rencana_kumulatif: Number(kumulatifRencana.toFixed(3)),
        real_kumulatif: Number(kumulatifProject.toFixed(3)),

        // 🔥 deviasi benar
        deviasi: Number(deviasi.toFixed(3)),

        data: laporan,
      });
    }

    res.json(result);
  } catch (error) {
    console.error("ERROR WEEKLY:", error);
    res.status(500).json({ message: error.message });
  }
};

export const getMonthlyReport = async (req, res) => {
  try {
    const { project_id } = req.params;

    const plans = await DailyPlan.findAll({
      where: { project_id: Number(project_id) },
      order: [["tanggal", "ASC"]],
    });

    const boqs = await Boq.findAll({
      where: { project_id: Number(project_id) },
    });

    const progress = await DailyProgress.findAll({
      where: { project_id: Number(project_id) },
    });

    const sortedBoqs = boqs.sort((a, b) => {
      const kodeA = (a.kode || "").trim();
      const kodeB = (b.kode || "").trim();
      return kodeA.localeCompare(kodeB, undefined, {
        numeric: true,
        sensitivity: "base",
      });
    });

    // 🔥 GROUP PER BULAN
    const group = {};
    plans.forEach((p) => {
      if (!group[p.bulan_ke]) group[p.bulan_ke] = [];
      group[p.bulan_ke].push(p);
    });

    const result = [];

    const kumulatifPerBoq = {};
    let kumulatifProject = 0;
    let kumulatifRencana = 0; // 🔥 TAMBAHAN

    for (const bulan in group) {
      const items = group[bulan];

      const tglAwal = items[0].tanggal;
      const tglAkhir = items[items.length - 1].tanggal;

      // 🔥 RENCANA BULANAN
      const mingguMap = {};
      items.forEach((p) => {
        if (!mingguMap[p.minggu_ke]) {
          mingguMap[p.minggu_ke] = Number(p.bobot_mingguan || 0);
        }
      });

      const rencanaBulanan = Object.values(mingguMap)
        .reduce((sum, val) => sum + val, 0);

      let totalKumulatif = 0;
      const laporan = [];

      for (const boq of sortedBoqs) {
        const total = Number(boq.volume || 0);
        const bobot = Number(boq.bobot || 0);

        const bulanIni = progress
          .filter(
            (p) =>
              p.boq_id === boq.id &&
              new Date(p.tanggal) >= new Date(tglAwal) &&
              new Date(p.tanggal) <= new Date(tglAkhir)
          )
          .reduce((sum, p) => sum + Number(p.volume || 0), 0);

        const sdLalu = kumulatifPerBoq[boq.id] || 0;
        const sdIni = sdLalu + bulanIni;

        kumulatifPerBoq[boq.id] = sdIni;

        let progresProyek = 0;
        let progressItem = 0;

        if (boq.tipe === "item") {
          const persenKumulatif = total ? (sdIni / total) : 0;

          progresProyek = persenKumulatif * bobot;
          progressItem = persenKumulatif * 100;

          totalKumulatif += progresProyek;
        }

        laporan.push({
          uraian: boq.uraian,
          bobot: Number(bobot.toFixed(3)),
          satuan: boq.satuan,
          total: Number(total.toFixed(3)),

          tipe: boq.tipe,

          bulan_ini: Number(bulanIni.toFixed(3)),
          sd_lalu: Number(sdLalu.toFixed(3)),
          sd_ini: Number(sdIni.toFixed(3)),

          progress_item: Number(progressItem.toFixed(2)),
          progres_proyek: Number(progresProyek.toFixed(3)),
        });
      }

      // 🔥 REAL BULANAN
      const realBulanan = totalKumulatif - kumulatifProject;

      // update kumulatif project
      kumulatifProject = totalKumulatif;

      // 🔥 KUMULATIF RENCANA
      kumulatifRencana += rencanaBulanan;

      // 🔥 DEViasi
      const deviasi = kumulatifProject - kumulatifRencana;

      // 🔥 DEViasi BULANAN
      const deviasiBulanan = realBulanan - rencanaBulanan;

      result.push({
        bulan_ke: Number(bulan),
        tgl_awal: tglAwal,
        tgl_akhir: tglAkhir,

        // 🔥 BULAN INI
        rencana_bulanan: Number(rencanaBulanan.toFixed(3)),
        real_bulanan: Number(realBulanan.toFixed(3)),
        deviasi_bulanan: Number(deviasiBulanan.toFixed(3)),

        // 🔥 KUMULATIF
        rencana_kumulatif: Number(kumulatifRencana.toFixed(3)),
        real_kumulatif: Number(kumulatifProject.toFixed(3)),

        // 🔥 DEViasi UTAMA
        deviasi: Number(deviasi.toFixed(3)),

        data: laporan,
      });
    }

    res.json(result);

  } catch (error) {
    console.error("ERROR MONTHLY:", error);
    res.status(500).json({ message: error.message });
  }
};

export const getDailyReport = async (req, res) => {
  try {
    const { project_id } = req.params;
    const { day } = req.query;

    // =========================
    // 🔥 VALIDASI
    // =========================
    if (!day) {
      return res.status(400).json({ message: "Hari ke wajib diisi" });
    }

    const dayNumber = Number(day);
    if (isNaN(dayNumber)) {
      return res.status(400).json({ message: "Hari ke harus angka" });
    }

    // =========================
    // 🔥 AMBIL TANGGAL DARI PLAN
    // =========================
    const plans = await DailyPlan.findAll({
      where: {
        project_id,
        hari_ke: dayNumber
      },
      attributes: ["tanggal"]
    });

    const tanggalList = plans.map(p => p.tanggal);

    if (tanggalList.length === 0) {
      return res.json({
        data: [],
        total_bobot_harian: 0,
        total_material: [],
        total_pekerja: [],
        total_peralatan: []
      });
    }

    // =========================
    // 🔥 AMBIL PROGRESS
    // =========================
    const progress = await DailyProgress.findAll({
      where: {
        project_id,
        tanggal: tanggalList
      },
      include: [
        {
          model: Boq,
          as: "boq",
          attributes: ["uraian", "satuan", "volume", "bobot"] // 🔥 penting
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

    // =========================
    // 🔥 MAPPING DATA
    // =========================
    const result = progress.map(p => {
      const items = p.items || [];

      const totalVolume = Number(p.boq?.volume || 0);
      const bobotBoq = Number(p.boq?.bobot || 0);
      const volumeHariIni = Number(p.volume || 0);

      // 🔥 persen progress item
      const persen = totalVolume
        ? (volumeHariIni / totalVolume)
        : 0;

      // 🔥 bobot tercapai
      const bobotTercapai = persen * bobotBoq;

      return {
        tanggal: p.tanggal,
        uraian: p.boq?.uraian,
        satuan: p.boq?.satuan,
        volume: volumeHariIni,

        cuaca: p.cuaca,
        catatan: p.catatan,
        jam_mulai: p.jam_mulai,
        jam_selesai: p.jam_selesai,

        // 🔥 TAMBAHAN BARU
        bobot: Number(bobotBoq.toFixed(3)),
        bobot_tercapai: Number(bobotTercapai.toFixed(3)),

        materials: items.filter(i => i.tipe === "BAHAN"),
        pekerja: items.filter(i => i.tipe === "TENAGA"),
        peralatan: items.filter(i => i.tipe === "ALAT")
      };
    });

    // =========================
    // 🔥 TOTAL BOBOT HARIAN
    // =========================
    let total_bobot_harian = 0;
    result.forEach(r => {
      total_bobot_harian += Number(r.bobot_tercapai || 0);
    });

    // =========================
    // 🔥 REKAP MATERIAL / PEKERJA / ALAT
    // =========================
    const total_material = {};
    const total_pekerja = {};
    const total_peralatan = {};

    result.forEach(r => {

      // MATERIAL
      r.materials.forEach(m => {
        if (!total_material[m.nama]) {
          total_material[m.nama] = {
            nama: m.nama,
            total: 0,
            satuan: m.satuan
          };
        }
        total_material[m.nama].total += Number(m.hasil || 0);
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

        total_pekerja[p.nama].total += Number(p.hasil || 0);

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

        total_peralatan[a.nama].total += Number(a.hasil || 0);

        if (a.hasil > 0 && total_peralatan[a.nama].terbilang === 0) {
          total_peralatan[a.nama].terbilang = a.item?.terbilang || 0;
        }
      });

    });

    // =========================
    // 🔥 FINAL RESPONSE
    // =========================
    res.json({
      data: result,
      total_bobot_harian: Number(total_bobot_harian.toFixed(3)),

      total_material: Object.values(total_material),
      total_pekerja: Object.values(total_pekerja),
      total_peralatan: Object.values(total_peralatan)
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};