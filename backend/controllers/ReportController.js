import { DailyPlan, DailyProgress, Boq } from "../models/index.js";
import { DailyProgressItem } from "../models/index.js";
import { ProjectItem } from "../models/index.js";
import { getBoqStructured } from "./BoqController.js";
import { ProjectVersionModel } from "../models/ProjectVersionModel.js";
import { BoqVersionChange } from "../models/BoqVersionChangeModel.js";
import { getBoqWithBobot } from "./BoqController.js";

export const getWeeklyReport = async (req, res) => {
  try {

    const { project_id } = req.params;

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

    const result=[];

    const totalHari =
    plans.length;

    const projectStart =
    new Date(
      plans[0].tanggal
    );

    const kumulatifPerBoq={};

    let kumulatifProject=0;
    let kumulatifRencana=0;

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
    const rencanaMingguan = Number(items[0]?.bobot_mingguan || 0);

    let totalKumulatif = 0;
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

        totalKumulatif += progresProyek;

        laporan.push({
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
    const realMingguan = Number(
   (totalKumulatif - kumulatifProject).toFixed(3)
    );

    kumulatifProject = Number(
      totalKumulatif.toFixed(3)
    );

    kumulatifRencana = Number(
      (kumulatifRencana + rencanaMingguan).toFixed(3)
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
        rencana_kumulatif: kumulatifRencana,
        real_kumulatif: kumulatifProject,
        deviasi: kumulatifProject - kumulatifRencana,
        data: laporan
    });
}

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
    let kumulatifRencana = 0;

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

      const mingguMap = {};

      items.forEach((p) => {

        if (
          !mingguMap[
            p.minggu_ke
          ]
        ) {

          mingguMap[
            p.minggu_ke
          ] =
            Number(
              p.bobot_mingguan || 0
            );

        }

      });

      const rencanaBulanan =
        Object.values(
          mingguMap
        )
          .reduce(
            (sum, val) =>
              sum + val,
            0
          );

      let totalKumulatif = 0;

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

        totalKumulatif +=
          progresProyek;

        laporan.push({

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

      const realBulanan =
        Number(
          (
            totalKumulatif -
            kumulatifProject
          ).toFixed(3)
        );

      kumulatifProject =
        Number(
          totalKumulatif.toFixed(3)
        );

      kumulatifRencana =
        Number(
          (
            kumulatifRencana +
            rencanaBulanan
          ).toFixed(3)
        );

      const deviasi =
        Number(
          (
            kumulatifProject -
            kumulatifRencana
          ).toFixed(3)
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
          Number(
            rencanaBulanan.toFixed(3)
          ),

        real_bulanan:
          realBulanan,

        rencana_kumulatif:
          kumulatifRencana,

        real_kumulatif:
          kumulatifProject,

        deviasi,

        data:
          laporan

      });

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

      total_material:[],
      total_pekerja:[],
      total_peralatan:[]

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