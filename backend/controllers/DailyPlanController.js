import { DailyPlan } from "../models/DailyPlanModel.js";
import { Schedule } from "../models/ScheduleModel.js";
import { Project } from "../models/ProjectModel.js";
import { ProjectPeriod } from "../models/ProjectPeriodModel.js";
import moment from "moment";
import "moment/locale/id.js";

export const generateDailyPlan = async (req, res) => {
  try {
    const { project_id } = req.params;

    const project = await Project.findByPk(project_id);

    if (!project) {
      return res.status(404).json({ message: "Project tidak ditemukan" });
    }

    if (!project.tgl_spmk || !project.end_date) {
      return res.status(400).json({
        message: "Tanggal project belum lengkap"
      });
    }

    // 🔥 SAMA PERSIS SEPERTI generateWeeks
    let start = new Date(project.tgl_spmk.toISOString().split("T")[0]);
    let end = new Date(project.end_date.toISOString().split("T")[0]);

    start.setHours(0,0,0,0);
    end.setHours(0,0,0,0);

    console.log("START:", start);
    console.log("END:", end);

    const schedules = await Schedule.findAll({
      where: { project_id },
      order: [["minggu_ke", "ASC"]],
    });

    const periods = await ProjectPeriod.findAll({
      where: { project_id },
    });

    await DailyPlan.destroy({ where: { project_id } });

    let bulkData = [];
    let currentDate = new Date(start);
    let hariKe = 1;

    // 🔥 hitung total bobot per minggu
    const bobotPerMinggu = {};

    schedules.forEach((s) => {
    const minggu = Number(s.minggu_ke);

    if (!bobotPerMinggu[minggu]) {
        bobotPerMinggu[minggu] = 0;
    }

    bobotPerMinggu[minggu] += Number(s.bobot || 0);

    // 🔥 pembulatan 3 desimal
    bobotPerMinggu[minggu] = Number(
        bobotPerMinggu[minggu].toFixed(3)
    );
    });

    console.log("BOBOT PER MINGGU:", bobotPerMinggu);

    const hariPerMinggu = {};

    let tempDate = new Date(start);
    let tempHariKe = 1;

    while (tempDate <= end) {
    let mingguKe = Math.ceil(tempHariKe / 7);

    if (!hariPerMinggu[mingguKe]) {
        hariPerMinggu[mingguKe] = 0;
    }

    hariPerMinggu[mingguKe]++;

    tempDate.setDate(tempDate.getDate() + 1);
    tempHariKe++;
    }

    console.log("HARI PER MINGGU:", hariPerMinggu);

    let totalMinggu = 0;
    let mingguSebelumnya = null;


    while (currentDate <= end) {

    let mingguKe = Math.ceil(hariKe / 7);
    const bobotMingguan = bobotPerMinggu[mingguKe] || 0;
    const jumlahHariMinggu = hariPerMinggu[mingguKe] || 7;

    // reset tiap minggu
    if (mingguKe !== mingguSebelumnya) {
        totalMinggu = 0;
        mingguSebelumnya = mingguKe;
    }

    let nilaiHarian;

    // hari terakhir minggu
    if (totalMinggu + (bobotMingguan / jumlahHariMinggu) > bobotMingguan) {
        nilaiHarian = bobotMingguan - totalMinggu;
    } else {
        nilaiHarian = bobotMingguan / jumlahHariMinggu;
        totalMinggu += nilaiHarian;
    }

    const yyyy = currentDate.getFullYear();
    const mm = String(currentDate.getMonth() + 1).padStart(2, "0");
    const dd = String(currentDate.getDate()).padStart(2, "0");
    const dateStr = `${yyyy}-${mm}-${dd}`;

    const periodMatch = periods.find((p) => {
    let pStart = new Date(p.start_date);
    let pEnd = new Date(p.end_date);

    pStart.setHours(0,0,0,0);
    pEnd.setHours(0,0,0,0);

    return currentDate >= pStart && currentDate <= pEnd;
    });

    bulkData.push({
        project_id,
        tanggal: dateStr,
        nama_hari: moment(dateStr).locale("id").format("dddd"),
        hari_ke: hariKe,
        minggu_ke: mingguKe,
        bulan_ke: periodMatch ? periodMatch.bulan_ke : null,

        bobot_mingguan: Number(bobotMingguan.toFixed(3)),
        bobot_harian: Number(nilaiHarian.toFixed(2)),
    });

    currentDate.setDate(currentDate.getDate() + 1);
    hariKe++;
    }


    await DailyPlan.bulkCreate(bulkData);

    res.json({
      message: "Daily Plan FIX (SAMA SEPERTI WEEKS) ✅",
      total_data: bulkData.length,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: error.message,
    });
  }
};

export const getDailyPlan = async (req, res) => {
  try {
    const { project_id } = req.params;

    const data = await DailyPlan.findAll({
      where: { project_id },
      order: [["hari_ke", "ASC"]],
    });

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getWeeklyReport = async (req, res) => {
  try {
    const { project_id } = req.params;

    const data = await DailyPlan.findAll({
      where: { project_id },
      order: [["tanggal", "ASC"]],
    });

    const result = [];
    let kumulatif = 0;

    const group = {};

    // grouping per minggu
    data.forEach((item) => {
      const minggu = item.minggu_ke;

      if (!group[minggu]) {
        group[minggu] = [];
      }

      group[minggu].push(item);
    });

    Object.keys(group).forEach((minggu) => {
      const items = group[minggu];

      const tglAwal = items[0].tanggal;
      const tglAkhir = items[items.length - 1].tanggal;

      // 🔥 FIX: ambil langsung bobot_mingguan
      const total = Number(items[0].bobot_mingguan);

      kumulatif += total;
      kumulatif = Number(kumulatif.toFixed(2));

      result.push({
        minggu_ke: Number(minggu),
        tgl_awal: tglAwal,
        tgl_akhir: tglAkhir,
        bobot_mingguan: Number(total.toFixed(2)),
        kumulatif,
      });
    });

    // 🔥 paksa 100% di akhir
    if (result.length > 0) {
      result[result.length - 1].kumulatif = 100;
    }

    res.json(result);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMonthlyReport = async (req, res) => {
  try {
    const { project_id } = req.params;

    const data = await DailyPlan.findAll({
      where: { project_id },
      order: [["tanggal", "ASC"]],
    });

    const group = {};

    // 🔥 grouping per bulan
    data.forEach((item) => {
      const bulan = item.bulan_ke;

      if (!group[bulan]) {
        group[bulan] = {
          items: [],
          minggu: {}
        };
      }

      group[bulan].items.push(item);

      // 🔥 ambil bobot unik per minggu
      if (!group[bulan].minggu[item.minggu_ke]) {
        group[bulan].minggu[item.minggu_ke] = Number(item.bobot_mingguan);
      }
    });

    const result = [];

    Object.keys(group).forEach((bulan) => {
      const dataBulan = group[bulan];

      const items = dataBulan.items;

      // 🔥 tanggal awal & akhir
      const tglAwal = items[0].tanggal;
      const tglAkhir = items[items.length - 1].tanggal;

      // 🔥 total bobot (unik per minggu)
      const mingguValues = Object.values(dataBulan.minggu);
      const total = mingguValues.reduce((a, b) => a + b, 0);

      result.push({
        bulan_ke: Number(bulan),
        tgl_awal: tglAwal,
        tgl_akhir: tglAkhir,
        bobot_bulanan: Number(total.toFixed(2)),
      });
    });

    // 🔥 kumulatif
    result.forEach((item, index) => {
      let total = 0;

      for (let i = 0; i <= index; i++) {
        total += result[i].bobot_bulanan;
      }

      item.kumulatif = Number(total.toFixed(2));
    });

    // 🔥 paksa 100
    result[result.length - 1].kumulatif = 100.00;

    res.json(result);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};