import { Project } from "../models/ProjectModel.js";
import { ProjectWeek } from "../models/ProjectWeekModel.js";
import { Schedule } from "../models/ScheduleModel.js";
import { Op } from "sequelize";
import { ProjectVersionModel } from "../models/ProjectVersionModel.js";
import moment from "moment";
import "moment/locale/id.js";

const getNamaHari = (date) => {

  return moment(date)
    .locale("id")
    .format("dddd")
    .toLowerCase();

};

export const generateWeeks = async (req, res) => {
  try {
    console.log("API KE PANGGIL");

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

    let start = new Date(project.tgl_spmk.toISOString().split("T")[0]);
    let end = new Date(project.end_date.toISOString().split("T")[0]);

    start.setHours(0,0,0,0);
    end.setHours(0,0,0,0);
    


    await ProjectWeek.destroy({ where: { project_id } });

   let currentDate = new Date(start);

    let mingguKe = 1;

    let startWeek = new Date(currentDate);

    let firstDay = true;

    while (currentDate <= end) {

      // MODE STATIC
      if (
        !project.week_mode ||
        project.week_mode === "static"
      ) {

        let endWeek = new Date(startWeek);

        endWeek.setDate(
          endWeek.getDate() + 6
        );

        if (endWeek > end) {
          endWeek = new Date(end);
        }

        await ProjectWeek.create({
          project_id,
          minggu_ke: mingguKe,
          start_date: startWeek,
          end_date: endWeek
        });

        startWeek.setDate(
          startWeek.getDate() + 7
        );

        currentDate = new Date(startWeek);

        mingguKe++;

      }

      // MODE CALENDAR
      else {

        const namaHari =
          getNamaHari(currentDate);

        const isNextWeek =
          namaHari ===
          project.week_start_day.toLowerCase()
          &&
          !firstDay;

        // saat masuk minggu baru
        if (isNextWeek) {

          let endWeek = new Date(currentDate);

          endWeek.setDate(
            endWeek.getDate() - 1
          );

          await ProjectWeek.create({
            project_id,
            minggu_ke: mingguKe,
            start_date: startWeek,
            end_date: endWeek
          });

          mingguKe++;

          startWeek =
            new Date(currentDate);

        }

        firstDay = false;

        currentDate.setDate(
          currentDate.getDate() + 1
        );

      }

    }

    if (
      project.week_mode === "calendar"
    ) {

      await ProjectWeek.create({
        project_id,
        minggu_ke: mingguKe,
        start_date: startWeek,
        end_date: end
      });
    }

    res.json({ message: "Minggu berhasil dibuat" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

export const getWeeksByProject = async (req, res) => {
  try {
    const { project_id } = req.params;

    const data = await ProjectWeek.findAll({
      where: { project_id },
      order: [["minggu_ke", "ASC"]]
    });

    res.json(data);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getScheduleByProject = async (req, res) => {

  try {

    const {
      project_id,
      version_id
    } = req.params;

    // =========================
    // VERSION AKTIF
    // =========================
    const currentVersion =
      await ProjectVersionModel.findByPk(
        version_id
      );

    if (!currentVersion) {

      return res.status(404).json({
        message: "Version tidak ditemukan"
      });
    }

    // =========================
    // JIKA REVISION 0
    // =========================
    if (currentVersion.revision === 0) {

      const data =
        await Schedule.findAll({

          where: {
            project_id,
            version_id
          },

          order: [
            ["minggu_ke", "ASC"]
          ]
        });

      return res.json(data);
    }

    // =========================
    // AMBIL VERSION SEBELUMNYA
    // =========================
    const previousVersion =
      await ProjectVersionModel.findOne({

        where: {

          project_id,

          revision:
            currentVersion.revision - 1
        }
      });

    // =========================
    // AMBIL JADWAL LAMA
    // HANYA < EFFECTIVE WEEK
    // =========================
    const oldSchedules =
      await Schedule.findAll({

        where: {

          project_id,

          version_id:
            previousVersion.id,

          minggu_ke: {
            [Op.lt]:
              currentVersion.effective_week
          }
        }
      });

    // =========================
    // AMBIL JADWAL ADDENDUM
    // =========================
    const newSchedules =
      await Schedule.findAll({

        where: {

          project_id,

          version_id
        }
      });

    // =========================
    // GABUNGKAN
    // =========================
    const finalData = [

      ...oldSchedules,

      ...newSchedules
    ];

    // =========================
    // SORT
    // =========================
    finalData.sort((a, b) => {

      if (a.minggu_ke !== b.minggu_ke) {
        return a.minggu_ke - b.minggu_ke;
      }

      return a.boq_id - b.boq_id;
    });

    res.json(finalData);

  } catch (error) {

    console.error(
      "Error getScheduleByProject:",
      error
    );

    res.status(500).json({
      message: error.message
    });
  }
};

export const bulkSaveSchedule =
async (req, res) => {

  const { project_id } = req.params;

  const {

    items,

    version_id

  } = req.body;

  try {

    // ==========================
    // HAPUS SCHEDULE
    // VERSION INI SAJA
    // ==========================

    await Schedule.destroy({

      where: {

        project_id,

        version_id
      }
    });

    // ==========================
    // INSERT BARU
    // ==========================

    if (
      items &&
      items.length > 0
    ) {

      const formatted =
        items.map((item) => ({

          project_id,

          version_id,

          boq_id:
            item.boq_id,

          minggu_ke:
            item.minggu_ke,

          bobot:
            item.bobot
        }));

      await Schedule.bulkCreate(
        formatted
      );
    }

    res.status(200).json({

      message:
        "Jadwal berhasil diperbarui"
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: error.message
    });
  }
};

export const updateBulkSchedule = async (req, res) => {
  try {
    const { project_id } = req.params;
    const { items } = req.body; // Ini array data dari frontend yang sudah diedit

    // 1. Hapus jadwal lama agar tidak duplikat
    await Schedule.destroy({
      where: { project_id: project_id }
    });

    // 2. Simpan data baru (termasuk yang sudah dirubah bobotnya)
    if (items && items.length > 0) {
      await Schedule.bulkCreate(items);
    }

    res.json({ message: "Jadwal Berhasil Diperbarui!" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};