import { Project } from "../models/ProjectModel.js";
import { ProjectWeek } from "../models/ProjectWeekModel.js";
import { Schedule } from "../models/ScheduleModel.js";
import { Op } from "sequelize";
import { ProjectVersionModel } from "../models/ProjectVersionModel.js";
import { DailyProgress } from "../models/DailyProgressModel.js";
import { getBoqWithBobot } from "./BoqController.js";
import moment from "moment";
import "moment/locale/id.js";

const getNamaHari = (date) => {

  return moment(date)
    .locale("id")
    .format("dddd")
    .toLowerCase();

};

const roundScheduleBobot = (value) =>
  Number(Number(value || 0).toFixed(4));

const isAddendumVersion = version =>
  Number(version?.revision || 0) > 0 ||
  Number(version?.effective_week || 1) > 1;

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

  return Number(total.toFixed(3));
};

const normalizeAddendumScheduleItems =
  async (
    project_id,
    currentVersion,
    items
  ) => {

  return items;
};

export const buildSchedulePlanTimeline = async (
  project_id,
  schedules,
  versions
) => {
  const perWeek = {};
  const weekStart = {};
  const cumulative = {};

  const sortedVersions = [...versions].sort(
    (a, b) =>
      Number(a.revision || 0) -
      Number(b.revision || 0)
  );

  const addendumVersions =
    sortedVersions.filter(
      v => isAddendumVersion(v)
    );

  schedules.forEach((item) => {
    const mingguKe = Number(item.minggu_ke);

    if (!perWeek[mingguKe]) {
      perWeek[mingguKe] = 0;
    }

    perWeek[mingguKe] += Number(item.bobot || 0);
  });

  Object.keys(perWeek).forEach((mingguKe) => {
    perWeek[mingguKe] = Number(
      perWeek[mingguKe].toFixed(3)
    );
  });

  // =========================
  // TANPA ADDENDUM
  // =========================
  if (addendumVersions.length === 0) {
    let running = 0;

    Object.keys(perWeek)
      .map(Number)
      .sort((a, b) => a - b)
      .forEach((mingguKe) => {
        weekStart[mingguKe] = Number(running.toFixed(3));

        running += Number(perWeek[mingguKe] || 0);
        running = Math.min(running, 100);

        cumulative[mingguKe] = Number(running.toFixed(3));
      });

    return {
      perWeek,
      weekStart,
      cumulative
    };
  }

  // =========================
  // SEBELUM ADDENDUM PERTAMA
  // =========================
  const firstAddendumWeek =
    Number(addendumVersions[0].effective_week || 1);

  let running = 0;

  Object.keys(perWeek)
    .map(Number)
    .filter(mingguKe => mingguKe < firstAddendumWeek)
    .sort((a, b) => a - b)
    .forEach((mingguKe) => {
      weekStart[mingguKe] = Number(running.toFixed(3));

      running += Number(perWeek[mingguKe] || 0);
      running = Math.min(running, 100);

      cumulative[mingguKe] = Number(running.toFixed(3));
    });

  // =========================
  // MULAI ADDENDUM
  // SEED HARUS DARI REAL SEBELUM ADDENDUM
  // =========================
  for (let i = 0; i < addendumVersions.length; i++) {
    const version = addendumVersions[i];
    const nextVersion = addendumVersions[i + 1];

    const startWeek = Number(version.effective_week || 1);
    const endWeek = nextVersion
      ? Number(nextVersion.effective_week || 1) - 1
      : Infinity;

    let seed = await getRealCumulativeAtWeek(
      project_id,
      startWeek - 1,
      version.id
    );

    if (!seed || seed <= 0) {
      seed = cumulative[startWeek - 1] || running || 0;
    }

    let addendumRunning = Number(seed);

    Object.keys(perWeek)
      .map(Number)
      .filter(
        mingguKe =>
          mingguKe >= startWeek &&
          mingguKe <= endWeek
      )
      .sort((a, b) => a - b)
      .forEach((mingguKe) => {
        weekStart[mingguKe] = Number(
          addendumRunning.toFixed(3)
        );

        addendumRunning += Number(perWeek[mingguKe] || 0);
        addendumRunning = Math.min(addendumRunning, 100);

        cumulative[mingguKe] = Number(
          addendumRunning.toFixed(3)
        );
      });
  }

  return {
    perWeek,
    weekStart,
    cumulative
  };
};


export const getScheduleChainByProject = async (project_id) => {
  const versions = await ProjectVersionModel.findAll({
    where: { project_id },
    order: [["revision", "ASC"]]
  });

  if (!versions.length) return [];

  const firstAddendumWeek =
    versions
      .filter(isAddendumVersion)
      .map(version =>
        Number(version.effective_week || 1)
      )
      .sort((a, b) => a - b)[0] || null;

  const finalData = [];

  for (let i = 0; i < versions.length; i++) {
    const version = versions[i];
    const nextVersion = versions[i + 1];

    const where = {
      project_id,
      version_id: version.id
    };

    const weekWhere = {};

    if (isAddendumVersion(version)) {
      weekWhere[Op.gte] = Number(version.effective_week || 1);
    } else if (firstAddendumWeek) {
      weekWhere[Op.lt] = firstAddendumWeek;
    }

    if (
      nextVersion &&
      isAddendumVersion(version)
    ) {
      weekWhere[Op.lt] = Number(nextVersion.effective_week || 1);
    }

    if (Reflect.ownKeys(weekWhere).length > 0) {
      where.minggu_ke = weekWhere;
    }

    const schedules = await Schedule.findAll({
      where,
      order: [
        ["minggu_ke", "ASC"],
        ["boq_id", "ASC"]
      ]
    });

    finalData.push(...schedules);
  }

  return finalData;
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

    const versionChain =
      await ProjectVersionModel.findAll({
        where: {
          project_id,
          revision: {
            [Op.lte]:
              currentVersion.revision
          }
        },
        order: [
          ["revision", "ASC"]
        ]
      });

    const finalData = [];

    for (
      let i = 0;
      i < versionChain.length;
      i++
    ) {

      const version =
        versionChain[i];

      const nextVersion =
        versionChain[i + 1];

      const weekWhere = {};

      if (isAddendumVersion(version)) {
        weekWhere[Op.gte] =
          Number(
            version.effective_week
          );
      } else {
        const firstAddendumWeek =
          versionChain
            .filter(isAddendumVersion)
            .map(item =>
              Number(item.effective_week || 1)
            )
            .sort((a, b) => a - b)[0] || null;

        if (firstAddendumWeek) {
          weekWhere[Op.lt] =
            firstAddendumWeek;
        }
      }

      if (
        nextVersion &&
        isAddendumVersion(version)
      ) {
        weekWhere[Op.lt] =
          Number(
            nextVersion.effective_week
          );
      }

      const where = {
        project_id,
        version_id:
          version.id
      };

      if (
        Reflect.ownKeys(weekWhere).length > 0
      ) {
        where.minggu_ke =
          weekWhere;
      }

      const schedules =
        await Schedule.findAll({
          where
        });

      finalData.push(
        ...schedules
      );
    }

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
    const currentVersion =
      await ProjectVersionModel.findByPk(
        version_id
      );

    if (!currentVersion) {
      return res.status(404).json({
        message: "Version tidak ditemukan"
      });
    }

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

      const itemsToSave =
        isAddendumVersion(currentVersion)
          ? items.filter(
              item =>
                Number(item.minggu_ke) >=
                Number(currentVersion.effective_week)
            )
          : items;

      const normalizedItems =
        await normalizeAddendumScheduleItems(
          Number(project_id),
          currentVersion,
          itemsToSave
        );

      const formatted =
        normalizedItems.map((item) => ({

          project_id,

          version_id,

          boq_id:
            item.boq_id,

          minggu_ke:
            item.minggu_ke,

          bobot:
            roundScheduleBobot(item.bobot)
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
      await Schedule.bulkCreate(
        items.map(item => ({
          ...item,
          bobot: roundScheduleBobot(item.bobot)
        }))
      );
    }

    res.json({ message: "Jadwal Berhasil Diperbarui!" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
