import { DailyPlan, DailyProgress, Boq } from "../models/index.js";
import { DailyProgressItem } from "../models/index.js";
import { ProjectItem } from "../models/index.js";
import { getBoqStructured } from "./BoqController.js";
import { ProjectVersionModel } from "../models/ProjectVersionModel.js";
import { BoqVersionChange } from "../models/BoqVersionChangeModel.js";
import { getBoqWithBobot } from "./BoqController.js";
import { Schedule } from "../models/ScheduleModel.js";
import { ProjectWeek } from "../models/ProjectWeekModel.js";
import { Op } from "sequelize";

const round3 = value =>
  Number(Number(value || 0).toFixed(3));

const getScheduleChainByProject = async (project_id) => {
  const versions =
    await ProjectVersionModel.findAll({
      where: { project_id },
      order: [["revision", "ASC"]]
    });

  if (versions.length === 0) {
    return Schedule.findAll({
      where: { project_id },
      order: [["minggu_ke", "ASC"]]
    });
  }

  const result = [];

  for (let i = 0; i < versions.length; i++) {
    const version = versions[i];
    const nextVersion = versions[i + 1];
    const weekWhere = {};

    if (Number(version.revision || 0) > 0) {
      weekWhere[Op.gte] =
        Number(version.effective_week || 1);
    }

    if (nextVersion) {
      weekWhere[Op.lt] =
        Number(nextVersion.effective_week || 1);
    }

    const where = {
      project_id,
      version_id: version.id
    };

    if (Reflect.ownKeys(weekWhere).length > 0) {
      where.minggu_ke = weekWhere;
    }

    const schedules =
      await Schedule.findAll({ where });

    result.push(...schedules);
  }

  return result.sort((a, b) => {
    if (a.minggu_ke !== b.minggu_ke) {
      return a.minggu_ke - b.minggu_ke;
    }

    return a.boq_id - b.boq_id;
  });
};

const getRealCumulativeAtWeek = async (
  project_id,
  minggu_ke,
  forcedVersionId = null
) => {
  if (Number(minggu_ke) <= 0) {
    return 0;
  }

  const week =
    await ProjectWeek.findOne({
      where: {
        project_id,
        minggu_ke
      }
    });

  if (!week) {
    return 0;
  }

  let activeVersion = null;

  if (forcedVersionId) {
    activeVersion =
      await ProjectVersionModel.findByPk(
        forcedVersionId
      );
  } else {
    const versions =
      await ProjectVersionModel.findAll({
        where: { project_id },
        order: [["effective_week", "ASC"]]
      });

    for (const version of versions) {
      if (
        Number(minggu_ke) >=
        Number(version.effective_week || 1)
      ) {
        activeVersion = version;
      }
    }
  }

  const boqs =
    (
      await getBoqWithBobot(
        Number(project_id),
        activeVersion?.id
      )
    ).filter(item => item.tipe === "item");

  const progress =
    await DailyProgress.findAll({
      where: {
        project_id: Number(project_id),
        tanggal: {
          [Op.lte]: week.end_date
        }
      }
    });

  const total =
    boqs.reduce((sum, boq) => {
      const boqId =
        boq.boq_item_id || boq.id;
      const volume =
        Number(boq.volume || 0);
      const bobot =
        Number(boq.bobot || 0);

      if (volume <= 0 || bobot <= 0) {
        return sum;
      }

      const volumeTerpasang =
        progress
          .filter(
            item =>
              Number(item.boq_id) ===
              Number(boqId)
          )
          .reduce(
            (progressSum, item) =>
              progressSum +
              Number(item.volume || 0),
            0
          );

      return sum +
        Math.min(volumeTerpasang / volume, 1) *
        bobot;
    }, 0);

  return round3(total);
};

const buildAddendumPlanTimeline = async (
  project_id,
  weekNumbers
) => {
  const schedules =
    await getScheduleChainByProject(project_id);

  const versions =
    await ProjectVersionModel.findAll({
      where: { project_id },
      order: [["revision", "ASC"]]
    });

  const rawByWeek = {};

  schedules.forEach((schedule) => {
    const week =
      Number(schedule.minggu_ke);

    rawByWeek[week] =
      round3(
        Number(rawByWeek[week] || 0) +
        Number(schedule.bobot || 0)
      );
  });

  const perWeek = { ...rawByWeek };
  const cumulative = {};
  const sortedWeeks =
    [...weekNumbers]
      .map(Number)
      .sort((a, b) => a - b);

  const addendumVersions =
    versions
      .filter(
        version =>
          Number(version.revision || 0) > 0
      )
      .sort(
        (a, b) =>
          Number(a.revision || 0) -
          Number(b.revision || 0)
      );

  for (let i = 0; i < addendumVersions.length; i++) {
    const version = addendumVersions[i];
    const nextVersion = addendumVersions[i + 1];
    const startWeek =
      Number(version.effective_week || 1);
    const endWeek =
      nextVersion
        ? Number(nextVersion.effective_week || 1) - 1
        : Math.max(...sortedWeeks, startWeek);
    const periodWeeks =
      sortedWeeks.filter(
        week =>
          week >= startWeek &&
          week <= endWeek
      );
    const totalRaw =
      periodWeeks.reduce(
        (sum, week) =>
          sum + Number(rawByWeek[week] || 0),
        0
      );

    if (totalRaw <= 0) {
      continue;
    }

    const seed =
      await getRealCumulativeAtWeek(
        project_id,
        startWeek - 1,
        version.id
      );
    let running = 0;

    periodWeeks.forEach((week) => {
      running =
        round3(
          running +
          Number(perWeek[week] || 0)
        );

      cumulative[week] =
        round3(
          Math.min(
            seed + running,
            100
          )
        );
    });
  }

  let normalRunning = 0;

  sortedWeeks.forEach((week) => {
    const inAddendum =
      addendumVersions.some((version, index) => {
        const nextVersion =
          addendumVersions[index + 1];
        const startWeek =
          Number(version.effective_week || 1);
        const endWeek =
          nextVersion
            ? Number(nextVersion.effective_week || 1) - 1
            : Infinity;

        return week >= startWeek && week <= endWeek;
      });

    if (!inAddendum) {
      normalRunning =
        round3(
          normalRunning +
          Number(perWeek[week] || 0)
        );

      cumulative[week] =
        normalRunning;
    }
  });

  return {
    perWeek,
    cumulative
  };
};

export const buildWeeklyReport = async (project_id) => {
    // =========================
    // 🔥 DATA
    // =========================
    const plans = await DailyPlan.findAll({
      where: { project_id: Number(project_id) },
      order: [["tanggal", "ASC"]]
    });

    const progress = await DailyProgress.findAll({
      where: { project_id: Number(project_id) }
    });

    if (plans.length === 0) {
      return [];
    }

    const versions = await ProjectVersionModel.findAll({
      where: {
        project_id: Number(project_id)
      },
      order: [["effective_week", "ASC"]]
    });

    // =========================
    // 🔥 GROUP MINGGU
    // =========================
    const group = {};

    plans.forEach((p)=>{

      if(!group[p.minggu_ke]){
        group[p.minggu_ke]=[];
      }

      group[p.minggu_ke].push(p);

    });

    const planTimeline =
      await buildAddendumPlanTimeline(
        Number(project_id),
        Object.keys(group).map(Number)
      );

    const result=[];

    const totalHari =
    plans.length;

    const projectStart =
    new Date(
      plans[0].tanggal
    );

    const kumulatifPerBoq={};

    let kumulatifProject=0;

    // =========================
    // 🔥 LOOP MINGGU
    // =========================
    for (const minggu in group) {
    // ==========================================
    // 1. VERSI AKTIF BERDASARKAN MINGGU
    // ==========================================
    let activeVersion = null;
    for (const version of versions) {
        if (Number(minggu) >= Number(version.effective_week)) {
            activeVersion = version;
        }
    }

    const sortedBoqs = (await getBoqWithBobot(Number(project_id), activeVersion?.id))
        .filter(item => item.tipe === "item");

    // ==========================================
    // 2. TIMELINE & WAKTU MINGGUAN
    // ==========================================
    const items = group[minggu];
    const tglAwal = items[0].tanggal;
    const tglAkhir = items[items.length - 1].tanggal;

    const startTime = new Date(tglAwal).getTime();
    const endTime = new Date(tglAkhir).getTime();

    const waktu_berjalan =
    (
        new Date(tglAkhir).getTime() -
        projectStart.getTime()
      ) / (1000 * 60 * 60 * 24) + 1;

    const sisa_waktu = totalHari - waktu_berjalan;
    const rencanaMingguan =
      round3(
        planTimeline.perWeek[Number(minggu)] ??
        Number(items[0]?.bobot_mingguan || 0)
      );

    let totalKumulatif = 0;
    let totalMingguan = 0;
    const laporan = [];

    // ==========================================
    // 3. LOOPING & KALKULASI PROGRES BOQ
    // ==========================================
    for (const boq of sortedBoqs) {
        const boqId = boq.boq_item_id || boq.id;
        const total = Number(boq.volume || 0);
        const bobot = Number(boq.bobot || 0);

        // Pre-filter progress berdasarkan BOQ ID agar tidak memindai array besar berkali-kali
        const boqProgress = progress.filter(p => Number(p.boq_id) === Number(boqId));

        // Hitung progres khusus minggu ini
        const mingguIni = boqProgress
            .filter(p => {
                const pTime = new Date(p.tanggal).getTime();
                return pTime >= startTime && pTime <= endTime;
            })
            .reduce((sum, p) => sum + Number(p.volume || 0), 0);

        // Hitung progres s/d minggu ini
        const sdIni = boqProgress
            .filter(p => new Date(p.tanggal).getTime() <= endTime)
            .reduce((sum, p) => sum + Number(p.volume || 0), 0);

        const sdLalu = kumulatifPerBoq[boqId] || 0;
        kumulatifPerBoq[boqId] = sdIni;

        const persenKumulatif = total > 0 ? Math.min(sdIni / total, 1) : 0;
        const progresProyek = persenKumulatif * bobot;
        const sdSebelumMingguIni =
          Math.max(
            sdIni - mingguIni,
            0
          );
        const persenSebelumMingguIni =
          total > 0
            ? Math.min(sdSebelumMingguIni / total, 1)
            : 0;
        const progresSebelumMingguIni =
          persenSebelumMingguIni * bobot;
        const progresMingguan =
          Math.max(
            progresProyek -
            progresSebelumMingguIni,
            0
          );

        totalKumulatif += progresProyek;
        totalMingguan += progresMingguan;

        laporan.push({
            boq_id: boqId,
            parent_id: boq.parent_id,
            tipe: boq.tipe,
            kode: boq.kode,
            uraian: boq.uraian,
            level: boq.level,
            bobot,
            satuan: boq.satuan,
            total,
            minggu_ini: mingguIni,
            sd_lalu: sdLalu,
            sd_ini: sdIni,
            progress_item: Number((persenKumulatif * 100).toFixed(3)),
            progres_proyek: Number(progresProyek.toFixed(3))
        });
    }

    // ==========================================
    // 4. SUMMARY AKUMULASI & DEVIASI MINGGUAN
    // ==========================================
    const realMingguan =
      Number(
        totalMingguan.toFixed(3)
      );

    const rawKumulatif =
      Number(
        totalKumulatif.toFixed(3)
      );

    const penyesuaianAdendum =
      Number(
        (
          rawKumulatif -
          kumulatifProject -
          totalMingguan
        ).toFixed(3)
      );

    kumulatifProject =
      Number(
        Math.min(
          rawKumulatif,
          100
        ).toFixed(3)
      );

    const rencanaKumulatif =
      round3(
        planTimeline.cumulative[Number(minggu)] ??
        rencanaMingguan
      );

    result.push({
        minggu_ke: Number(minggu),
        tgl_awal: tglAwal,
        tgl_akhir: tglAkhir,
        waktu_pelaksanaan: totalHari,
        waktu_berjalan,
        sisa_waktu,
        rencana_mingguan: rencanaMingguan,
        real_mingguan: realMingguan,
        penyesuaian_adendum: penyesuaianAdendum,
        rencana_kumulatif: rencanaKumulatif,
        real_kumulatif: kumulatifProject,
        deviasi: round3(
          kumulatifProject - rencanaKumulatif
        ),
        deviasiMingguan: round3(
          realMingguan - rencanaMingguan
        ),
        data: laporan
    });
}

    return result;
};

export const getWeeklyReport = async (req, res) => {
  try {

    const { project_id } = req.params;

    const result =
      await buildWeeklyReport(project_id);

    res.json(result);

  } catch(error){

    console.log(
      "ERROR WEEKLY:",
      error
    );

    res.status(500).json({
      message:error.message
    });

  }
};

export const getMonthlyReport = async (req, res) => {
  try {

    const { project_id } = req.params;

    const plans = await DailyPlan.findAll({
      where: {
        project_id: Number(project_id)
      },
      order: [["tanggal", "ASC"]]
    });

    if (plans.length === 0) {
      return res.json([]);
    }

    const progress = await DailyProgress.findAll({
      where: {
        project_id: Number(project_id)
      }
    });

    const versions =
      await ProjectVersionModel.findAll({
        where: {
          project_id: Number(project_id)
        },
        order: [
          ["effective_week", "ASC"]
        ]
      });

    const totalHari = plans.length;

    const projectStart =
      new Date(plans[0].tanggal);

    // =========================
    // GROUP BULAN
    // =========================

    const group = {};

    plans.forEach((p) => {

      if (!group[p.bulan_ke]) {
        group[p.bulan_ke] = [];
      }

      group[p.bulan_ke].push(p);

    });

    const result = [];

    let kumulatifProject = 0;
    let kumulatifRencanaSebelumnya = 0;

    const kumulatifPerBoq = {};

    // =========================
    // LOOP BULAN
    // =========================

    for (const bulan in group) {

      const items =
        group[bulan];

      const mingguAwal =
        Math.min(
          ...items.map(
            i => Number(i.minggu_ke)
          )
        );

      const mingguAkhir =
        Math.max(
          ...items.map(
            i => Number(i.minggu_ke)
          )
        );

      // =========================
      // CARI VERSION AKTIF
      // =========================

      let activeVersion = null;

      for (const version of versions) {

        if (
          mingguAwal >=
          Number(version.effective_week)
        ) {

          activeVersion =
            version;

        }

      }

      // =========================
      // BOQ SESUAI VERSION
      // =========================

      const sortedBoqs =
        (
          await getBoqWithBobot(
            Number(project_id),
            activeVersion?.id
          )
        )
          .filter(
            item =>
              item.tipe === "item"
          );

      const tglAwal =
        items[0].tanggal;

      const tglAkhir =
        items[
          items.length - 1
        ].tanggal;

      const startTime =
        new Date(
          tglAwal
        ).getTime();

      const endTime =
        new Date(
          tglAkhir
        ).getTime();

      const waktuBerjalan =
        (
          endTime -
          projectStart.getTime()
        ) /
        (1000 * 60 * 60 * 24)
        + 1;

      const sisaWaktu =
        totalHari -
        waktuBerjalan;

      // =========================
      // RENCANA BULAN
      // =========================
      // Ambil dari Daily Plan, bukan penjumlahan bobot_mingguan unik.
      // Jika bulan memotong minggu, bobot rencana tetap mengikuti kumulatif harian.
      const rencanaKumulatif =
        round3(
          items[
            items.length - 1
          ]?.rencana_kumulatif || 0
        );

      const rencanaBulanan =
        round3(
          Math.max(
            rencanaKumulatif -
            kumulatifRencanaSebelumnya,
            0
          )
        );

      let totalKumulatif = 0;
      let totalBulanan = 0;

      const laporan = [];

      // =========================
      // LOOP BOQ
      // =========================

      for (const boq of sortedBoqs) {

        const boqId =
          boq.boq_item_id ||
          boq.id;

        const total =
          Number(
            boq.volume || 0
          );

        const bobot =
          Number(
            boq.bobot || 0
          );

        const boqProgress =
          progress.filter(
            p =>
              Number(
                p.boq_id
              ) ===
              Number(
                boqId
              )
          );

        const bulanIni =
          boqProgress
            .filter(
              p => {

                const t =
                  new Date(
                    p.tanggal
                  ).getTime();

                return (
                  t >=
                  startTime &&
                  t <=
                  endTime
                );

              }
            )
            .reduce(
              (
                sum,
                p
              ) =>
                sum +
                Number(
                  p.volume || 0
                ),
              0
            );

        const sdLalu =
          kumulatifPerBoq[
            boqId
          ] || 0;

        const sdIni =
          boqProgress
            .filter(
              p =>
                new Date(
                  p.tanggal
                ).getTime()
                <= endTime
            )
            .reduce(
              (
                sum,
                p
              ) =>
                sum +
                Number(
                  p.volume || 0
                ),
              0
            );

        kumulatifPerBoq[
          boqId
        ] = sdIni;

        const persenKumulatif =
          total > 0
            ? Math.min(
                sdIni / total,
                1
              )
            : 0;

        const progresProyek =
          persenKumulatif *
          bobot;

        const sdSebelumBulanIni =
          Math.max(
            sdIni - bulanIni,
            0
          );

        const persenSebelumBulanIni =
          total > 0
            ? Math.min(
                sdSebelumBulanIni / total,
                1
              )
            : 0;

        const progresSebelumBulanIni =
          persenSebelumBulanIni *
          bobot;

        const progresBulanan =
          Math.max(
            progresProyek -
            progresSebelumBulanIni,
            0
          );

        totalKumulatif +=
          progresProyek;

        totalBulanan +=
          progresBulanan;

        laporan.push({
          boq_id:
            boqId,

          parent_id:
            boq.parent_id,

          tipe:
            boq.tipe,

          kode:
            boq.kode,

          uraian:
            boq.uraian,

          level:
            boq.level,

          bobot,

          satuan:
            boq.satuan,

          total,

          bulan_ini:
            Number(
              bulanIni.toFixed(3)
            ),

          sd_lalu:
            Number(
              sdLalu.toFixed(3)
            ),

          sd_ini:
            Number(
              sdIni.toFixed(3)
            ),

          progress_item:
            Number(
              (
                persenKumulatif * 100
              ).toFixed(3)
            ),

          progres_proyek:
            Number(
              progresProyek.toFixed(3)
            )

        });

      }

      const rawKumulatif =
        Number(
          totalKumulatif.toFixed(3)
        );

      const realBulanan =
        Number(
          totalBulanan.toFixed(3)
        );

      kumulatifProject =
        Number(
          Math.min(
            rawKumulatif,
            100
          ).toFixed(3)
        );

      const deviasi =
        round3(
          kumulatifProject -
          rencanaKumulatif
        );

      result.push({

        bulan_ke:
          Number(bulan),

        minggu_awal:
          mingguAwal,

        minggu_akhir:
          mingguAkhir,

        version_id:
          activeVersion?.id || null,

        revision:
          activeVersion?.revision || 0,

        effective_week:
          activeVersion?.effective_week || 1,

        tgl_awal:
          tglAwal,

        tgl_akhir:
          tglAkhir,

        waktu_pelaksanaan:
          totalHari,

        waktu_berjalan:
          Number(
            waktuBerjalan.toFixed(0)
          ),

        sisa_waktu:
          Number(
            Math.max(
              0,
              sisaWaktu
            ).toFixed(0)
          ),

        rencana_bulanan:
          rencanaBulanan,

        real_bulanan:
          realBulanan,

        rencana_kumulatif:
          rencanaKumulatif,

        real_kumulatif:
          kumulatifProject,

        deviasi,

        data:
          laporan

      });

      kumulatifRencanaSebelumnya =
        rencanaKumulatif;

    }

    res.json(result);

  } catch (error) {

    console.log(
      "ERROR MONTHLY:",
      error
    );

    res.status(500).json({
      message:
        error.message
    });

  }
};

export const getDailyReport = async (req, res) => {
  try {

    const { project_id } = req.params;
    const { day } = req.query;

    // =========================
    // VALIDASI
    // =========================

    if (!day) {
      return res.status(400).json({
        message: "Hari ke wajib diisi"
      });
    }

    const dayNumber = Number(day);

    if (isNaN(dayNumber)) {
      return res.status(400).json({
        message: "Hari ke harus angka"
      });
    }

    // =========================
    // AMBIL PLAN
    // =========================

    const plans = await DailyPlan.findAll({
      where: {
        project_id,
        hari_ke: dayNumber
      }
    });

    if (plans.length === 0) {

      return res.json({
        data: [],
        boq: [],
        total_bobot_harian: 0,
        total_material: [],
        total_pekerja: [],
        total_peralatan: []
      });

    }

    const tanggalList =
      plans.map(
        p => p.tanggal
      );

    // =========================
    // VERSI AKTIF
    // =========================

    const versions =
      await ProjectVersionModel.findAll({

        where: {
          project_id:
          Number(project_id)
        },

        order: [
          ["effective_week","ASC"]
        ]

      });

    const mingguKe =
      plans[0].minggu_ke;

    let activeVersion = null;

    for(const version of versions){

      if(
        Number(mingguKe)
        >=
        Number(
          version.effective_week
        )
      ){

        activeVersion =
          version;

      }

    }

    // =========================
    // BOQ + BOBOT ADDENDUM
    // =========================

    const boqData =
      await getBoqWithBobot(

        Number(project_id),

        activeVersion?.id

      );

    const boqMap={};

    boqData.forEach((b)=>{

      boqMap[
        b.boq_item_id ||
        b.id
      ]=b;

    });

    // =========================
    // HIRARKI BOQ
    // =========================

    const boqList =
      await Boq.findAll({

        where:{
          project_id
        },

        attributes:[

          "id",
          "parent_id",
          "tipe",
          "uraian",
          "kode"

        ]

      });

    // =========================
    // PROGRESS
    // =========================

    const progress =
      await DailyProgress.findAll({

        where:{

          project_id,

          tanggal:
          tanggalList

        },

        include:[

          {

            model:Boq,

            as:"boq",

            attributes:[

              "id",
              "parent_id",
              "tipe",
              "uraian",
              "satuan",
              "volume"

            ]

          },

          {

            model:
            DailyProgressItem,

            as:
            "items",

            include:[

              {

                model:
                ProjectItem,

                as:
                "item",

                attributes:[
                  "terbilang"
                ]

              }

            ]

          }

        ]

      });

    // =========================
    // MAPPING
    // =========================

    const result =
      progress.map((p)=>{

      const items =
      p.items || [];

      const boqInfo =
      boqMap[
        p.boq?.id
      ];

      const totalVolume =
      Number(
        boqInfo?.volume ||0
      );

      const bobotBoq =
      Number(
        boqInfo?.bobot ||0
      );

      const volumeHariIni =
      Number(
        p.volume ||0
      );

      const persen =
      totalVolume>0
      ?
      volumeHariIni/
      totalVolume
      :
      0;

      const bobotTercapai =
      persen *
      bobotBoq;

      return{

        tanggal:
        p.tanggal,

        boq_id:
        p.boq?.id,

        uraian:
        p.boq?.uraian,

        satuan:
        p.boq?.satuan,

        volume:
        volumeHariIni,

        cuaca:
        p.cuaca,

        catatan:
        p.catatan,

        jam_mulai:
        p.jam_mulai,

        jam_selesai:
        p.jam_selesai,

        bobot:
        Number(
          bobotBoq.toFixed(3)
        ),

        bobot_tercapai:
        Number(
          bobotTercapai.toFixed(3)
        ),

        materials:
        items.filter(
          i=>
          i.tipe==="BAHAN"
        ),

        pekerja:
        items.filter(
          i=>
          i.tipe==="TENAGA"
        ),

        peralatan:
        items.filter(
          i=>
          i.tipe==="ALAT"
        )

      };

    });

    // =========================
    // TOTAL BOBOT
    // =========================

    const total_bobot_harian =
    result.reduce(

      (sum,r)=>

      sum +
      Number(
        r.bobot_tercapai ||0
      ),

      0

    );

    const buildResourceTotal = (tipe) => {

      const totals = {};

      result.forEach((reportItem) => {

        const resources = [
          ...reportItem.materials,
          ...reportItem.pekerja,
          ...reportItem.peralatan
        ];

        resources
          .filter(item => item.tipe === tipe)
          .forEach((item) => {

            const itemId =
              item.item_id ||
              item.item?.id ||
              item.nama;

            const key =
              `${itemId}-${item.satuan || ""}`;

            if (!totals[key]) {
              totals[key] = {
                item_id:
                item.item_id ||
                item.item?.id ||
                null,

                nama:
                item.nama,

                satuan:
                item.satuan,

                total:
                0
              };
            }

            totals[key].total +=
              Number(item.hasil || 0);

          });

      });

      return Object.values(totals)
        .map(item => ({
          ...item,
          total:
          Number(
            item.total.toFixed(7)
          )
        }))
        .sort((a, b) =>
          String(a.nama || "")
            .localeCompare(
              String(b.nama || ""),
              "id",
              {
                numeric: true,
                sensitivity: "base"
              }
            )
        );

    };

    const total_material =
      buildResourceTotal("BAHAN");

    const total_pekerja =
      buildResourceTotal("TENAGA");

    const total_peralatan =
      buildResourceTotal("ALAT");

    // =========================
    // RESPONSE
    // =========================

    res.json({

      revision:
      activeVersion?.revision ||0,

      version_id:
      activeVersion?.id ||null,

      effective_week:
      activeVersion?.effective_week ||1,

      boq:
      boqList,

      data:
      result,

      total_bobot_harian:
      Number(
        total_bobot_harian
        .toFixed(3)
      ),

      total_material,
      total_pekerja,
      total_peralatan

    });

  }

  catch(error){

    console.log(
      "ERROR DAILY:",
      error
    );

    res.status(500).json({

      message:
      error.message

    });

  }

};
