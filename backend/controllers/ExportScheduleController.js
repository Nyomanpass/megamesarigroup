import ExcelJS from "exceljs";
import { Project } from "../models/ProjectModel.js";
import { Schedule } from "../models/ScheduleModel.js";
import { ProjectWeek } from "../models/ProjectWeekModel.js";
import { TtdTemplate } from "../models/TtdTemplate.js";
import { ProjectVersionModel } from "../models/ProjectVersionModel.js";
import { getBoqWithBobot } from "./BoqController.js";
import { ChartJSNodeCanvas } from "chartjs-node-canvas";
import axios from "axios";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { PythonShell } from "python-shell";
import { Op } from "sequelize";
import fs from "fs/promises";
import os from "os";
import path from "path";

export const exportTimeSchedule = async (req, res) => {
  try {
    const { project_id } = req.params;
    const { version_id } = req.query;

    // =========================
    // 🔥 AMBIL DATA
    // =========================
    const project = await Project.findByPk(project_id);

    const boq = await getBoqWithBobot(project_id, version_id);

    const weeks = await ProjectWeek.findAll({
      where: { project_id },
      order: [["minggu_ke", "ASC"]],
    });

    let schedules = [];
    let currentVersion = null;

    if (version_id) {
      currentVersion = await ProjectVersionModel.findByPk(version_id);

      if (!currentVersion) {
        return res.status(404).json({
          message: "Version tidak ditemukan"
        });
      }

      if (currentVersion.revision === 0) {
        schedules = await Schedule.findAll({
          where: {
            project_id,
            version_id
          }
        });
      } else {
        const previousVersion = await ProjectVersionModel.findOne({
          where: {
            project_id,
            revision: currentVersion.revision - 1
          }
        });

        const oldSchedules = previousVersion
          ? await Schedule.findAll({
              where: {
                project_id,
                version_id: previousVersion.id,
                minggu_ke: {
                  [Op.lt]: currentVersion.effective_week
                }
              }
            })
          : [];

        const newSchedules = await Schedule.findAll({
          where: {
            project_id,
            version_id
          }
        });

        schedules = [
          ...oldSchedules,
          ...newSchedules
        ];
      }
    } else {
      schedules = await Schedule.findAll({
        where: { project_id }
      });
    }

    const isAddendumExport =
      currentVersion && Number(currentVersion.revision || 0) > 0;

    const activeVersionChain =
      isAddendumExport
        ? await ProjectVersionModel.findAll({
            where: {
              project_id,
              revision: {
                [Op.lte]: currentVersion.revision
              }
            },
            order: [["revision", "ASC"]]
          })
        : [];

    const activeAddendumVersions =
      activeVersionChain.filter(
        version => Number(version.revision || 0) > 0
      );

    const weeklyReports =
      isAddendumExport
        ? (
            await axios.get(
              `http://localhost:3000/api/weekly-report/${project_id}`
            )
          ).data || []
        : [];

    const boqMapByRevision = new Map();

    if (isAddendumExport) {
      const mc0Boq =
        await getBoqWithBobot(project_id, 0);

      boqMapByRevision.set(
        0,
        new Map(
          mc0Boq.map(item => [
            Number(item.id),
            item
          ])
        )
      );

      for (const version of activeAddendumVersions) {
        const versionBoq =
          await getBoqWithBobot(project_id, version.id);

        boqMapByRevision.set(
          Number(version.revision || 0),
          new Map(
            versionBoq.map(item => [
              Number(item.id),
              item
            ])
          )
        );
      }
    }

    const addendumTransitions =
      activeAddendumVersions.map(version => {
        const revision =
          Number(version.revision || 0);
        const previousVersion =
          activeVersionChain.find(
            item =>
              Number(item.revision || 0) ===
              revision - 1
          ) || null;
        const previousWeek =
          Number(version.effective_week || 1) - 1;

        return {
          version,
          previousVersion,
          revision,
          previousWeek,
          previousMap:
            boqMapByRevision.get(revision - 1) ||
            new Map(),
          currentMap:
            boqMapByRevision.get(revision) ||
            new Map(),
          report:
            weeklyReports.find(
              item =>
                Number(item.minggu_ke) ===
                Number(previousWeek)
            ) || null
        };
      });

    const getBeforeEffectiveProgress = (
      item,
      transition
    ) => {
      if (
        !isAddendumExport ||
        !transition.report
      ) {
        return {
          volume: 0,
          bobot: 0
        };
      }

      const progressItem =
        transition.report.data?.find(
          progress =>
            Number(progress.boq_id) ===
            Number(item.boq_item_id || item.id)
        );

      const progressVolume =
        Number(progressItem?.sd_ini || 0);
      const mcVolume =
        Number(item.volume || 0);
      const mcBobot =
        Number(item.bobot || 0);

      if (
        mcVolume <= 0 ||
        progressVolume <= 0
      ) {
        return {
          volume: 0,
          bobot: 0
        };
      }

      const ratio = Math.min(
        progressVolume / mcVolume,
        1
      );

      return {
        volume: progressVolume,
        bobot: ratio * mcBobot
      };
    };

    const getAddendumInfo = (
      item,
      transition
    ) => {
      const currentItem =
        transition.currentMap.get(Number(item.id)) || {};

      const mcBobot =
        Number(currentItem.bobot || 0);
      const mcVolume =
        Number(currentItem.volume || 0);
      const beforeProgress =
        getBeforeEffectiveProgress(
          currentItem,
          transition
        );

      return {
        mcVolume,
        mcHargaSatuan:
          Number(currentItem.harga_satuan || 0),
        mcJumlahHarga:
          Number(
            currentItem.jumlah ||
            mcVolume * Number(currentItem.harga_satuan || 0)
          ),
        mcBobot,
        progressVolume: beforeProgress.volume,
        progressBobot: beforeProgress.bobot,
        remainingVolume: Math.max(
          mcVolume - beforeProgress.volume,
          0
        ),
        remainingBobot: Math.max(
          mcBobot - beforeProgress.bobot,
          0
        )
      };
    };

    // =========================
    // 🔥 CREATE EXCEL
    // =========================
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("TIME SCHEDULE");
    sheet.properties.defaultRowHeight = 22;

    // =========================
    // 🔥 SET COLUMN (A-N)
    // =========================
    sheet.getColumn("A").width = 1;   // spasi kiri
    sheet.getColumn("B").width = 5;
    sheet.getColumn("C").width = 3;
    sheet.getColumn("D").width = 15;
    sheet.getColumn("E").width = 3;   // padding kanan client

    sheet.getColumn("F").width = 55;   // padding kiri konsultan
    sheet.getColumn("G").width = 10;
    sheet.getColumn("H").width = 12;
    sheet.getColumn("I").width = 20;
    sheet.getColumn("J").width = 25;

    sheet.getColumn("K").width = 8;   // padding kiri kontraktor
    sheet.getColumn("L").width = 5;



    let row = 2;

    // =========================
    // 🔥 JUDUL (B–W)
    // =========================
    sheet.mergeCells(`B${row}:W${row}`);

    const titleCell = sheet.getCell(`B${row}`);
    titleCell.value = "JADWAL PELAKSANAAN KONSTRUKSI (TIME SCHEDULE)";

    titleCell.font = {
    bold: true,
    size: 22
    };

    titleCell.alignment = {
    horizontal: "center",
    vertical: "middle"
    };

    sheet.getRow(row).height = 32;

    row += 2;

    // =========================
    // 🔥 INFO PROJECT
    // =========================

    const formatTanggal = (date) => {
    if (!date) return "-";

    const d = new Date(date);

    return d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "Asia/Makassar"
    });
    };

    const addLabel = (label, value, isMultiLine = false) => {

    // =========================
    // 🔥 LABEL (B)
    // =========================
    sheet.getCell(`B${row}`).value = label;
    sheet.getCell(`B${row}`).font = { bold: true };
    sheet.getCell(`B${row}`).alignment = { vertical: "top" };

    // =========================
    // 🔥 TITIK DUA (E)
    // =========================
    sheet.getCell(`E${row}`).value = ":";

    const val = value ? String(value).toUpperCase() : "-";

    // =========================
    // 🔥 VALUE (F)
    // =========================
    if (isMultiLine) {

        const words = val.split(" ");
        let line = "";
        let lines = [];

        words.forEach(word => {
        if ((line + word).length > 80) {
            lines.push(line.trim());
            line = word + " ";
        } else {
            line += word + " ";
        }
        });

        if (line) lines.push(line.trim());

        lines.forEach((text, i) => {
        if (i > 0) row++;

        // 🔥 VALUE mulai dari F sampai K
        sheet.mergeCells(`F${row}:K${row}`);

        const cell = sheet.getCell(`F${row}`);
        cell.value = text;
        cell.alignment = {
            horizontal: "left",
            vertical: "top",
            wrapText: false
        };
        });

    } else {

        const cell = sheet.getCell(`F${row}`);
        cell.value = val;
        cell.alignment = {
        horizontal: "left",
        vertical: "middle",
        wrapText: false
        };
    }

    row++;
    };

    addLabel("KEGIATAN", project.kegiatan);
    addLabel("SUB KEGIATAN", project.sub_kegiatan);
    addLabel("PEKERJAAN", project.pekerjaan, true);
    addLabel("NO KONTRAK", project.no_kontrak);
    addLabel("TANGGAL KONTRAK", formatTanggal(project.tgl_kontrak));
    addLabel("NO SPMK", project.no_spmk);
    addLabel("TANGGAL SPMK", formatTanggal(project.tgl_spmk));
    addLabel("KONTRAKTOR", project.kontraktor);
    addLabel("KONSULTAN", project.konsultan);
    addLabel("WAKTU", `${project.waktu_pelaksanaan} Hari`);
    addLabel(
    "NILAI",
    `Rp ${Number(project.nilai_kontrak || 0).toLocaleString("id-ID")}`
    );
    addLabel("LOKASI", project.lokasi);
    addLabel("TAHUN", project.tahun);

    row += 1;
const startRow = row;
// =========================
// 🔥 HEADER TABLE
// =========================
let startCol = 2; // B
// 🔹 NO
sheet.mergeCells(`B${row}:B${row + 5}`);
sheet.getCell(`B${row}`).value = "NO.";

// 🔹 URAIAN (C–F)
sheet.mergeCells(`C${row}:F${row + 4}`);
sheet.getCell(`C${row}`).value = "URAIAN";

const addendumDetailColumns =
  isAddendumExport
    ? addendumTransitions.flatMap(transition => [
        {
          group: `ADD ${transition.revision}`,
          label: "VOLUME",
          number: 3,
          type: "mcVolume",
          transition
        },
        {
          group: `ADD ${transition.revision}`,
          label: "HARGA SATUAN",
          number: 4,
          type: "mcHargaSatuan",
          transition,
          currency: true
        },
        {
          group: `ADD ${transition.revision}`,
          label: "JUMLAH HARGA",
          number: 5,
          type: "mcJumlahHarga",
          transition,
          currency: true
        },
        {
          group: `ADD ${transition.revision}`,
          label: "BOBOT",
          number: 6,
          type: "mcBobot",
          transition
        },
        {
          group: `PROGRES MINGGU ${transition.previousWeek}`,
          label: "VOLUME",
          number: 3,
          type: "progressVolume",
          transition
        },
        {
          group: `PROGRES MINGGU ${transition.previousWeek}`,
          label: "BOBOT",
          number: 6,
          type: "progressBobot",
          transition
        },
        {
          group: "SISA PROGRES",
          label: "VOLUME",
          number: 3,
          type: "remainingVolume",
          transition
        },
        {
          group: "SISA PROGRES",
          label: "BOBOT",
          number: 6,
          type: "remainingBobot",
          transition
        }
      ])
    : [];

const hiddenAddendumDetailTypes =
  new Set([
    "mcHargaSatuan",
    "mcJumlahHarga"
  ]);

const addendumDetailStartCol = 12;
const spacerCol =
  addendumDetailStartCol + addendumDetailColumns.length;
const footerLabelEndCol =
  isAddendumExport
    ? spacerCol - 1
    : 11;

if (isAddendumExport) {
  const mc0Columns = [
    { label: "SATUAN", number: 2 },
    { label: "VOLUME", number: 3 },
    { label: "HARGA SATUAN", number: 4 },
    { label: "JUMLAH HARGA", number: 5 },
    { label: "BOBOT", number: 6 }
  ];

  sheet.mergeCells(`G${row}:K${row}`);
  sheet.getCell(`G${row}`).value = "MC-0";

  mc0Columns.forEach((column, index) => {
    const col =
      7 + index;

    sheet.mergeCells(
      `${sheet.getColumn(col).letter}${row + 1}:` +
      `${sheet.getColumn(col).letter}${row + 4}`
    );

    sheet.getCell(row + 1, col).value =
      column.label;
  });

  let groupStartCol = addendumDetailStartCol;
  let currentGroup = null;

  addendumDetailColumns.forEach((column, index) => {
    const nextColumn =
      addendumDetailColumns[index + 1];

    if (currentGroup === null) {
      currentGroup = column.group;
      groupStartCol =
        addendumDetailStartCol + index;
    }

    const col =
      addendumDetailStartCol + index;

    sheet.mergeCells(
      `${sheet.getColumn(col).letter}${row + 1}:` +
      `${sheet.getColumn(col).letter}${row + 4}`
    );

    sheet.getCell(row + 1, col).value =
      column.label;

    if (
      !nextColumn ||
      nextColumn.group !== currentGroup
    ) {
      sheet.mergeCells(
        `${sheet.getColumn(groupStartCol).letter}${row}:` +
        `${sheet.getColumn(col).letter}${row}`
      );

      sheet.getCell(row, groupStartCol).value =
        currentGroup;

      currentGroup = null;
    }
  });
} else {
  // 🔹 SATUAN
  sheet.mergeCells(`G${row}:G${row + 4}`);
  sheet.getCell(`G${row}`).value = "SATUAN";

  // 🔹 VOLUME
  sheet.mergeCells(`H${row}:H${row + 4}`);
  sheet.getCell(`H${row}`).value = "VOLUME";

  // 🔹 HARGA SATUAN
  sheet.mergeCells(`I${row}:I${row + 4}`);
  sheet.getCell(`I${row}`).value = "HARGA SATUAN";

  // 🔹 JUMLAH HARGA
  sheet.mergeCells(`J${row}:J${row + 4}`);
  sheet.getCell(`J${row}`).value = "JUMLAH HARGA";

  // 🔹 BOBOT
  sheet.mergeCells(`K${row}:K${row + 4}`);
  sheet.getCell(`K${row}`).value = "BOBOT";
}

// 🔹 KOLOM KOSONG SEBELUM MINGGU
sheet.mergeCells(
  `${sheet.getColumn(spacerCol).letter}${row}:` +
  `${sheet.getColumn(spacerCol).letter}${row + 5}`
);


const nomorRow = row + 5;

// 🔹 C–F = 1
sheet.mergeCells(`C${nomorRow}:F${nomorRow}`);
sheet.getCell(`C${nomorRow}`).value = 1;

// 🔹 G = 2
sheet.getCell(`G${nomorRow}`).value = 2;

// 🔹 H = 3
sheet.getCell(`H${nomorRow}`).value = 3;

// 🔹 I = 4
sheet.getCell(`I${nomorRow}`).value = 4;

// 🔹 J = 5
sheet.getCell(`J${nomorRow}`).value = 5;

// 🔹 K = 6
sheet.getCell(`K${nomorRow}`).value = 6;

addendumDetailColumns.forEach((column, index) => {
  sheet.getCell(
    nomorRow,
    addendumDetailStartCol + index
  ).value = column.number;
});


// =========================
// 🔥 WEEK START (M)
// =========================
const weekStartCol = spacerCol + 1;
const scheduleColumns = [];

weeks.forEach(w => {
  if (isAddendumExport) {
    addendumTransitions
      .filter(
        transition =>
          Number(transition.version.effective_week) ===
          Number(w.minggu_ke)
      )
      .forEach(transition => {
        scheduleColumns.push({
          type: "marker",
          transition,
          label: `ADDENDUM ${transition.revision}`
        });
      });
  }

  scheduleColumns.push({
    type: "week",
    week: w
  });
});

const weekEndCol =
  weekStartCol + scheduleColumns.length - 1;

const weekColumnMap = new Map();
const markerScheduleColumns = [];

scheduleColumns.forEach((column, index) => {
  const colNumber =
    weekStartCol + index;

  if (column.type === "week") {
    weekColumnMap.set(
      Number(column.week.minggu_ke),
      colNumber
    );
  } else {
    markerScheduleColumns.push({
      ...column,
      colNumber
    });
  }
});

sheet.mergeCells(
  `${sheet.getColumn(weekStartCol).letter}${row}:` +
  `${sheet.getColumn(weekEndCol).letter}${row}`
);

sheet.getCell(`${sheet.getColumn(weekStartCol).letter}${row}`).value =
  `WAKTU PELAKSANAAN ${project.waktu_pelaksanaan} HARI KALENDER`;

// =========================
// 🔥 BULAN
// =========================
let bulanRow = row + 1;
let mingguPerBulan = 4;
let bulanIndex = 1;
const weekScheduleColumns =
  scheduleColumns
    .map((column, index) => ({
      ...column,
      colNumber: weekStartCol + index
    }))
    .filter(column => column.type === "week");

for (let i = 0; i < weekScheduleColumns.length; i += mingguPerBulan) {
  const start = weekScheduleColumns[i].colNumber;
  const end =
    weekScheduleColumns[
      Math.min(
        i + mingguPerBulan - 1,
        weekScheduleColumns.length - 1
      )
    ].colNumber;

  sheet.mergeCells(
    `${sheet.getColumn(start).letter}${bulanRow}:` +
    `${sheet.getColumn(end).letter}${bulanRow}`
  );

  sheet.getCell(`${sheet.getColumn(start).letter}${bulanRow}`).value =
    `BULAN ${bulanIndex}`;

  bulanIndex++;
}

// =========================
// 🔥 MINGGU (1,2,3)
// =========================
let tglMulaiRow = row + 2;
let sdRow = row + 3;
let tglAkhirRow = row + 4;
let mingguRow = row + 5;

const formatShortDate = (date) => {
  if (!date) return "";

  const d = new Date(date);

  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short"
  });
};

scheduleColumns.forEach((column, i) => {
  const colNumber =
    weekStartCol + i;
  const col =
    sheet.getColumn(colNumber).letter;

  if (column.type === "marker") {
    sheet.mergeCells(
      `${col}${bulanRow}:${col}${mingguRow}`
    );

    const markerHeaderCell =
      sheet.getCell(`${col}${bulanRow}`);

    markerHeaderCell.value = null;
    markerHeaderCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFD9D9D9" }
    };

    return;
  }

  const w = column.week;

  // 🔹 tanggal mulai
  sheet.getCell(`${col}${tglMulaiRow}`).value = formatShortDate(w.start_date);

  // 🔹 s/d
  sheet.getCell(`${col}${sdRow}`).value = "s/d";

  // 🔹 tanggal akhir
  sheet.getCell(`${col}${tglAkhirRow}`).value = formatShortDate(w.end_date);

  // 🔹 nomor minggu
  sheet.getCell(`${col}${mingguRow}`).value = w.minggu_ke;
});

// =========================
// 🔥 KOLOM KOSONG SETELAH MINGGU
// =========================
const kosongCol = weekEndCol + 1;

sheet.mergeCells(
  `${sheet.getColumn(kosongCol).letter}${row}:` +
  `${sheet.getColumn(kosongCol).letter}${row + 5}`
);

const ketCol = kosongCol + 1;

sheet.mergeCells(
  `${sheet.getColumn(ketCol).letter}${row}:` +
  `${sheet.getColumn(ketCol).letter}${row + 5}`
);

sheet.getCell(`${sheet.getColumn(ketCol).letter}${row}`).value = "KET.";

// =========================
// 🔥 STYLE HEADER
// =========================
for (let r = row; r <= row + 5; r++) {
  for (let c = 2; c <= ketCol; c++) {

    const cell = sheet.getRow(r).getCell(c);

    cell.font = { bold: true };

    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: false
    };

    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFD9D9D9" }
    };

    // =========================
    // 🔥 KHUSUS KOLOM SPASI (NO BOTTOM)
    // =========================
    if (c === spacerCol || c === kosongCol) {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" }
        // ❌ no bottom
      };
    } else {
      // =========================
      // 🔥 KOLOM NORMAL
      // =========================
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" }
      };
    }
  }
}




// =========================
// 🔥 TRACK MERGE (C–F)
// =========================
const mergedRows = new Set();

const mergeCF = (row) => {
  if (mergedRows.has(row)) return;
  sheet.mergeCells(`C${row}:F${row}`);
  mergedRows.add(row);
};


// =========================
// 🔥 INIT
// =========================
let nomorHeader = 0;
let nomorSub = 0;
let nomorItem = 0;
let lastTipe = null;

const roman = ["I","II","III","IV","V","VI","VII","VIII","IX","X"];

// =========================
// 🔥 START ROW
// =========================
row += 7;

// =========================
// 🔥 LOOP BOQ
// =========================
boq.forEach((item) => {

  if (item.tipe === "header") {

    nomorHeader++;
    nomorSub = 0;
    nomorItem = 0;

    if (nomorHeader > 1) {
      row++;
      sheet.getCell(`B${row}`).value = " ";
      mergeCF(row);
    }

    const huruf = String.fromCharCode(64 + nomorHeader);

    sheet.getCell(`B${row}`).value = huruf;
    sheet.getCell(`C${row}`).value = item.uraian || "-";

    sheet.getRow(row).font = { bold: true };

    mergeCF(row);

    row++;
  }

  else if (item.tipe === "subheader") {

    nomorSub++;

    if (nomorSub > 1) {
      row++;
      sheet.getCell(`B${row}`).value = " ";
     
      mergeCF(row);
    }

    sheet.getCell(`B${row}`).value = roman[nomorSub - 1];
    sheet.getCell(`C${row}`).value = item.uraian || "-";

    sheet.getRow(row).font = { bold: true };

    mergeCF(row);

    row++;
  }

  else if (item.tipe === "item") {

   if (lastTipe !== "item") nomorItem = 0;

      nomorItem++;

      let c = 2;

      sheet.getCell(row, c++).value =
        nomorItem;

      sheet.getCell(`C${row}`).value =
        item.uraian || "";

      c = 7;

      const writeNumberCell = (
        value,
        numFmt =
          '_-* #,##0.000_-;-* #,##0.000_-;_-* "-"??_-;_-@_-',
        fill = null
      ) => {
        const cell =
          sheet.getCell(row, c++);

        cell.value =
          Number(value || 0);
        cell.numFmt = numFmt;

        if (fill) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: {
              argb: fill
            }
          };
        }

        return cell;
      };

      if (isAddendumExport) {
        const mc0Item =
          boqMapByRevision
            .get(0)
            ?.get(Number(item.id)) || {};

        sheet.getCell(row, c++).value =
          mc0Item.satuan || item.satuan || "";

        writeNumberCell(mc0Item.volume);
        writeNumberCell(
          mc0Item.harga_satuan,
          '"Rp" * #,##0.00'
        );
        writeNumberCell(
          Number(mc0Item.jumlah || 0),
          '"Rp" * #,##0.00'
        );
        writeNumberCell(mc0Item.bobot);

        addendumDetailColumns.forEach(column => {
          const addendumInfo =
            getAddendumInfo(
              item,
              column.transition
            );

          writeNumberCell(
            addendumInfo[column.type],
            column.currency
              ? '"Rp" * #,##0.00'
              : '_-* #,##0.000_-;-* #,##0.000_-;_-* "-"??_-;_-@_-'
          );
        });
      } else {
        sheet.getCell(row, c++).value =
          item.satuan || "";

        writeNumberCell(item.volume);
        writeNumberCell(
          item.harga_satuan,
          '"Rp" * #,##0.00'
        );
        writeNumberCell(
          item.jumlah,
          '"Rp" * #,##0.00'
        );
        writeNumberCell(item.bobot);
      }

      c++;

      scheduleColumns.forEach(column => {
        if (column.type === "marker") {
          const cell = sheet.getCell(row, c++);

          cell.value = null;
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFD9D9D9" }
          };

          return;
        }

        const w = column.week;
        const found = schedules.find(
          (s) =>
            Number(s.boq_id) === Number(item.id) &&
            Number(s.minggu_ke) === Number(w.minggu_ke)
        );

        const val = found ? Number(found.bobot) : null;

        const cell = sheet.getCell(row, c++);
        cell.value = val;
        cell.numFmt =
          '_-* #,##0.000_-;-* #,##0.000_-;_-* "-"??_-;_-@_-';

        if (val > 0) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "00FF00" }
          };
        }
      });

      c++;
      sheet.getCell(row, c++).value = null;

      mergeCF(row);

      row++;
    }

  lastTipe = item.tipe;
});

const startDataRow = startRow + 6; // sesuaikan dengan punyamu
const endDataRow = row - 1;
row += 2;

for (let r = startDataRow; r <= endDataRow + 2; r++) {
  for (let c = 2; c <= ketCol; c++) {

    const cell = sheet.getRow(r).getCell(c);

    // kosongkan kalau tidak ada isi
    if (cell.value === undefined) cell.value = null;

    // =========================
    // 🔥 MERGE C–F
    // =========================
    if (c >= 3 && c <= 6) {
      cell.border = {
        top: { style: "thin" },

        // 🔥 BORDER PINDAH KE BAWAH 2 ROW
        bottom: r === (endDataRow + 2) ? { style: "thin" } : undefined,

        left: c === 3 ? { style: "thin" } : undefined,
        right: c === 6 ? { style: "thin" } : undefined
      };

      cell.alignment = {
        horizontal: "left",
        vertical: "middle"
      };
    } 
    else {
      // =========================
      // 🔥 KOLOM NORMAL
      // =========================
      cell.border = {
        top: { style: "thin" },

        // 🔥 INI KUNCI UTAMA
        bottom: r === (endDataRow + 2) ? { style: "thin" } : undefined,

        left: { style: "thin" },
        right: { style: "thin" }
      };

      cell.alignment = {
        horizontal: "center",
        vertical: "middle"
      };
    }
  }
}


scheduleColumns.forEach((column, index) => {
  const excelColumn =
    sheet.getColumn(weekStartCol + index);

  excelColumn.width =
    column.type === "marker" ? 12 : 15;
});

for (let i = 0; i < addendumDetailColumns.length; i++) {
  const detailColumn =
    addendumDetailColumns[i];
  const excelColumn =
    sheet.getColumn(addendumDetailStartCol + i);

  if (
    hiddenAddendumDetailTypes.has(detailColumn.type)
  ) {
    excelColumn.width = 0;
    excelColumn.hidden = true;
  } else {
    excelColumn.width = 12;
  }
}

if (isAddendumExport) {
  [9, 10].forEach(col => {
    const excelColumn =
      sheet.getColumn(col);

    excelColumn.width = 0;
    excelColumn.hidden = true;
  });
}

    sheet.getColumn(spacerCol).width = 6;   // padding setelah bobot/detail
    sheet.getColumn(kosongCol).width = 6;   // padding sebelum ket
    sheet.getColumn(ketCol).width = 15;

    const greyFill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFD9D9D9" }
    };

for (let r = startDataRow; r <= endDataRow + 11; r++) {

  // 🔹 KOLOM SPASI SEBELUM MINGGU
  const beforeWeekSpacerCell = sheet.getCell(r, spacerCol);
  beforeWeekSpacerCell.fill = greyFill;
  beforeWeekSpacerCell.border = {
    left: { style: "thin" },
    right: { style: "thin" },

    // 🔥 pindah ke bawah 2 row
    bottom: r === (endDataRow + 11) ? { style: "thin" } : undefined
  };

  // 🔹 KOLOM SPASI SETELAH MINGGU
  const afterWeekSpacerCell = sheet.getCell(r, kosongCol);
  afterWeekSpacerCell.fill = greyFill;
  afterWeekSpacerCell.border = {
    left: { style: "thin" },
    right: { style: "thin" },

    // 🔥 sama di sini
    bottom: r === (endDataRow + 11) ? { style: "thin" } : undefined
  };
}

// =========================
// 🔥 KOTAK KET TANPA MERGE
// =========================

const ketStartRow = startDataRow;
const ketEndRow = endDataRow + 11;

for (let r = ketStartRow; r <= ketEndRow; r++) {

  const cell = sheet.getCell(r, ketCol);
  cell.value = null;

  cell.border = {
    // 🔝 hanya di baris pertama
    top: r === ketStartRow ? { style: "thin" } : undefined,

    // 🔻 hanya di baris terakhir
    bottom: r === ketEndRow ? { style: "thin" } : undefined,

    // ⬅️ kiri selalu
    left: { style: "thin" },

    // ➡️ kanan selalu
    right: { style: "thin" }
  };
}

// =========================
// 🔥 FOOTER TOTAL + PPN + BOBOT
// =========================

const footerStart = endDataRow + 3;

// =========================
// 🔹 JUMLAH TOTAL
// =========================
sheet.mergeCells(`B${footerStart}:I${footerStart}`);
sheet.getCell(`B${footerStart}`).value = "JUMLAH TOTAL";

const totalCell = sheet.getCell(`J${footerStart}`);
totalCell.value = {
  formula: `SUM(J${startDataRow}:J${endDataRow})`
};
totalCell.numFmt = '"Rp" * #,##0.00';

// 🔹 BOBOT
const totalBobot = sheet.getCell(`K${footerStart}`);
totalBobot.value = {
  formula: `SUM(K${startDataRow}:K${endDataRow})`
};
totalBobot.numFmt = '0.000';


// =========================
// 🔹 PPN 11%
// =========================
sheet.mergeCells(`B${footerStart + 1}:I${footerStart + 1}`);
sheet.getCell(`B${footerStart + 1}`).value = "PPN 11%";

const ppnCell = sheet.getCell(`J${footerStart + 1}`);
ppnCell.value = {
  formula: `J${footerStart}*11%`
};
ppnCell.numFmt = '"Rp" * #,##0.00';

// bobot kosong
sheet.getCell(`K${footerStart + 1}`).value = null;


// =========================
// 🔹 TOTAL + PPN
// =========================
sheet.mergeCells(`B${footerStart + 2}:I${footerStart + 2}`);
sheet.getCell(`B${footerStart + 2}`).value = "JUMLAH TOTAL + PPN";

const grandCell = sheet.getCell(`J${footerStart + 2}`);
grandCell.value = {
  formula: `J${footerStart}+J${footerStart + 1}`
};
grandCell.numFmt = '"Rp" * #,##0.00';

// =========================
// 🔹 DIBULATKAN
// =========================
sheet.mergeCells(`B${footerStart + 3}:I${footerStart + 3}`);
sheet.getCell(`B${footerStart + 3}`).value = "DIBULATKAN";

// 🔥 pembulatan ke ribuan (1000)
const bulatCell = sheet.getCell(`J${footerStart + 3}`);
bulatCell.value = {
  formula: `ROUND(J${footerStart + 2},-3)`
};
bulatCell.numFmt = '"Rp" * #,##0.00';

const addendumFooterColumns =
  addendumDetailColumns
    .map((column, index) => ({
      ...column,
      colNumber: addendumDetailStartCol + index,
      colLetter:
        sheet.getColumn(addendumDetailStartCol + index).letter
    }))
    .filter(
      column =>
        column.type === "mcJumlahHarga" ||
        column.type === "mcBobot" ||
        column.type === "progressBobot" ||
        column.type === "remainingBobot"
    );

addendumFooterColumns.forEach(column => {
  const totalAddendumCell =
    sheet.getCell(footerStart, column.colNumber);

  totalAddendumCell.value = {
    formula: `SUM(${column.colLetter}${startDataRow}:${column.colLetter}${endDataRow})`
  };
  totalAddendumCell.numFmt =
    column.currency
      ? '"Rp" * #,##0.00'
      : '0.000';

  const ppnAddendumCell =
    sheet.getCell(footerStart + 1, column.colNumber);
  const grandAddendumCell =
    sheet.getCell(footerStart + 2, column.colNumber);
  const roundedAddendumCell =
    sheet.getCell(footerStart + 3, column.colNumber);

  if (column.currency) {
    ppnAddendumCell.value = {
      formula: `${column.colLetter}${footerStart}*11%`
    };
    ppnAddendumCell.numFmt = '"Rp" * #,##0.00';

    grandAddendumCell.value = {
      formula:
        `${column.colLetter}${footerStart}+` +
        `${column.colLetter}${footerStart + 1}`
    };
    grandAddendumCell.numFmt = '"Rp" * #,##0.00';

    roundedAddendumCell.value = {
      formula:
        `ROUND(${column.colLetter}${footerStart + 2},-3)`
    };
    roundedAddendumCell.numFmt = '"Rp" * #,##0.00';
  } else {
    ppnAddendumCell.value = null;
    grandAddendumCell.value = null;
    roundedAddendumCell.value = null;
  }
});



// =========================
// 🔥 STYLE FOOTER
// =========================
for (let r = footerStart; r <= footerStart + 3; r++) {

  const label = sheet.getCell(`B${r}`);
  const valJ = sheet.getCell(`J${r}`);
  const valK = sheet.getCell(`K${r}`);

  // font
  label.font = { bold: true };
  valJ.font = { bold: true };
  valK.font = { bold: true };

  // alignment
  label.alignment = { horizontal: "right", vertical: "middle" };
  valJ.alignment = { horizontal: "right", vertical: "middle" };
  valK.alignment = { horizontal: "right", vertical: "middle" };

  // border label (🔥 penting: kiri kanan ada)
  label.border = {
    top: { style: "thin" },
    bottom: { style: "thin" },
    left: { style: "thin" },
    right: { style: "thin" }
  };

  // border J
  valJ.border = {
    top: { style: "thin" },
    bottom: { style: "thin" },
    left: { style: "thin" },
    right: { style: "thin" }
  };

  // border K
  valK.border = {
    top: { style: "thin" },
    bottom: { style: "thin" },
    left: { style: "thin" },
    right: { style: "thin" }
  };

  addendumFooterColumns.forEach(column => {
    const cell =
      sheet.getCell(r, column.colNumber);

    cell.font = { bold: true };
    cell.alignment = {
      horizontal: "right",
      vertical: "middle"
    };
    cell.border = {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" }
    };
  });
}

// =========================
// 🔥 GARIS BAWAH AREA WEEK (DI TOTAL + PPN)
// =========================

// baris terakhir footer
const footerLastRow = footerStart + 3;

// garis hanya dari M sampai weekEnd
for (let c = weekStartCol; c <= weekEndCol; c++) {

  const cell = sheet.getCell(footerLastRow, c);

  cell.border = {
    bottom: { style: "thin" }
  };
}

// =========================
// 🔥 AMBIL REALISASI DARI API
// =========================
const includeProgressChart =
  !currentVersion || Number(currentVersion.revision) > 0;

let realData = [];

if (includeProgressChart) {
  const chartResponse = await axios.get(
    `http://localhost:3000/api/daily-plan/weekly-chart/${project_id}`
  );

  realData = chartResponse.data;
}

const firstAddendumWeek =
  activeAddendumVersions.length > 0
    ? Number(activeAddendumVersions[0].effective_week || 1)
    : null;

const getScheduleTotalByWeek = (
  mingguKe,
  versionId = null
) => {
  return schedules
    .filter(item => {
      if (Number(item.minggu_ke) !== Number(mingguKe)) {
        return false;
      }

      if (versionId) {
        return Number(item.version_id) === Number(versionId);
      }

      return true;
    })
    .reduce(
      (sum, item) =>
        sum + Number(item.bobot || 0),
      0
    );
};

const getRealDataByWeek = mingguKe =>
  realData.find(
    item =>
      Number(item.minggu_ke) === Number(mingguKe)
  ) || {};

const getAddendumPlanMeta = (transition, index) => {
  const startWeek =
    Number(transition.version.effective_week || 1);
  const nextTransition =
    addendumTransitions[index + 1];
  const endWeek =
    nextTransition
      ? Number(nextTransition.version.effective_week || 1) - 1
      : Infinity;
  const previousReal =
    Number(
      getRealDataByWeek(startWeek - 1).kum_real || 0
    );
  const startWeekReal =
    getRealDataByWeek(startWeek);
  const seed =
    Math.max(
      previousReal +
        Number(startWeekReal.penyesuaian_adendum || 0),
      0
    );

  return {
    transition,
    startWeek,
    endWeek,
    seed
  };
};

const activePlanCumulativeByWeek =
  new Map();


// =========================
// 🔥 RENCANA & KOMULATIF PER MINGGU
// =========================
const rencanaRow = footerStart + 4;
const komulatifRow = footerStart + 5;

// =========================
// 🔹 KIRI BESAR (MERGE 2 BARIS)
// =========================
sheet.mergeCells(`B${rencanaRow}:D${komulatifRow}`);
sheet.getCell(`B${rencanaRow}`).value = "RENCANA FISIK PEKERJAAN";

// style
sheet.getCell(`B${rencanaRow}`).font = { bold: true };
sheet.getCell(`B${rencanaRow}`).alignment = {
  horizontal: "center",
  vertical: "middle",
  wrapText: true
};

// =========================
// 🔹 LABEL KANAN (F)
// =========================
sheet.getCell(`E${rencanaRow}`).value = "JUMLAH PER-MINGGU";
sheet.getCell(`E${komulatifRow}`).value = "JUMLAH KOMULATIF PER-MINGGU";

// style
sheet.getCell(`E${rencanaRow}`).font = { bold: true };
sheet.getCell(`E${komulatifRow}`).font = { bold: true };

sheet.getCell(`E${rencanaRow}`).alignment = {
  horizontal: "left",
  vertical: "middle"
};

sheet.getCell(`E${komulatifRow}`).alignment = {
  horizontal: "left",
  vertical: "middle"
};


// =========================
// 🔥 BORDER FOOTER (KOTAK)
// =========================
for (let r = rencanaRow; r <= komulatifRow; r++) {
  for (let c = 2; c <= 4; c++) { // B(2) sampai D(4)

    const cell = sheet.getRow(r).getCell(c);

    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" }
    };
  }
}

// =========================
// 🔥 KOTAK BESAR E - AREA DETAIL (2 BARIS)
// =========================
for (let r = rencanaRow; r <= komulatifRow; r++) {
  for (let c = 5; c <= footerLabelEndCol; c++) {

    const cell = sheet.getRow(r).getCell(c);

    cell.border = {
      // atas hanya di baris pertama
      top: r === rencanaRow ? { style: "thin" } : undefined,

      // bawah hanya di baris terakhir
      bottom: r === komulatifRow ? { style: "thin" } : undefined,

      // kiri hanya di kolom E
      left: c === 5 ? { style: "thin" } : undefined,

      // kanan hanya di kolom terakhir area detail
      right: c === footerLabelEndCol ? { style: "thin" } : undefined
    };
  }
}

// =========================
// 🔹 RENCANA PER MINGGU (FINAL FIX)
// =========================
weeks.forEach(w => {
  const c =
    weekColumnMap.get(Number(w.minggu_ke));
  const weekNumber =
    Number(w.minggu_ke);

  const colLetter = sheet.getColumn(c).letter;
  const cell = sheet.getCell(`${colLetter}${rencanaRow}`);

  cell.value =
    firstAddendumWeek &&
    weekNumber >= firstAddendumWeek
      ? null
      : Number(
          getScheduleTotalByWeek(weekNumber)
            .toFixed(3)
        );

  // 🔥 FORMAT
  cell.numFmt = '0.000';

  // 🔥 ALIGNMENT
  cell.alignment = {
    horizontal: "center",
    vertical: "middle"
  };

  // 🔥 BORDER
  cell.border = {
    top: { style: "thin" },
    bottom: { style: "thin" },
    left: { style: "thin" },
    right: { style: "thin" }
  };
});

// =========================
// 🔹 KOMULATIF
// =========================
let baselineCumulative = 0;

weeks.forEach(w => {
  const c =
    weekColumnMap.get(Number(w.minggu_ke));
  const weekNumber =
    Number(w.minggu_ke);
  const colLetter = sheet.getColumn(c).letter;
  const cell = sheet.getCell(`${colLetter}${komulatifRow}`);

  if (
    firstAddendumWeek &&
    weekNumber >= firstAddendumWeek
  ) {
    cell.value = null;
  } else {
    baselineCumulative +=
      getScheduleTotalByWeek(weekNumber);
    cell.value =
      Number(baselineCumulative.toFixed(3));
    activePlanCumulativeByWeek.set(
      weekNumber,
      cell.value
    );
  }

  cell.numFmt = '0.000';

  cell.alignment = {
    horizontal: "center",
    vertical: "middle"
  };

  // 🔥 BORDER BIAR KOTAK
  cell.border = {
    top: { style: "thin" },
    bottom: { style: "thin" },
    left: { style: "thin" },
    right: { style: "thin" }
  };
});


// =========================
// 🔥 BORDER AREA WEEK (FIX FULL KOTAK)
// =========================
for (let r of [rencanaRow, komulatifRow]) {
  for (let c = weekStartCol; c <= weekEndCol; c++) {

    const cell = sheet.getRow(r).getCell(c);

    cell.border = {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },   // 🔥 sekarang full
      right: { style: "thin" }   // 🔥 sekarang full
    };
  }
}

let nextFooterPlanRow =
  komulatifRow + 1;

const stylePlanFooterBlock = (
  weeklyRow,
  cumulativeRow,
  fillColor = null
) => {
  for (let r = weeklyRow; r <= cumulativeRow; r++) {
    for (let c = 2; c <= 4; c++) {
      const cell = sheet.getRow(r).getCell(c);

      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" }
      };

      cell.fill = undefined;
    }

    for (let c = 5; c <= footerLabelEndCol; c++) {
      const cell = sheet.getRow(r).getCell(c);

      cell.border = {
        top: r === weeklyRow ? { style: "thin" } : undefined,
        bottom: r === cumulativeRow ? { style: "thin" } : undefined,
        left: c === 5 ? { style: "thin" } : undefined,
        right: c === footerLabelEndCol ? { style: "thin" } : undefined
      };

      cell.fill = undefined;
    }

    for (let c = weekStartCol; c <= weekEndCol; c++) {
      const cell = sheet.getRow(r).getCell(c);

      cell.border = {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" }
      };

      cell.fill = undefined;
    }
  }
};

addendumTransitions.forEach((transition, index) => {
  const addendumWeeklyRow =
    nextFooterPlanRow;
  const addendumCumulativeRow =
    nextFooterPlanRow + 1;
  const meta =
    getAddendumPlanMeta(transition, index);
  let addendumCumulative =
    meta.seed;

  sheet.mergeCells(
    `B${addendumWeeklyRow}:D${addendumCumulativeRow}`
  );
  sheet.getCell(`B${addendumWeeklyRow}`).value =
    `RENCANA FISIK PEKERJAAN ADD ${transition.revision}`;
  sheet.getCell(`B${addendumWeeklyRow}`).font = {
    bold: true
  };
  sheet.getCell(`B${addendumWeeklyRow}`).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true
  };

  sheet.getCell(`E${addendumWeeklyRow}`).value =
    "JUMLAH PER-MINGGU";
  sheet.getCell(`E${addendumCumulativeRow}`).value =
    "JUMLAH KOMULATIF PER-MINGGU";
  sheet.getCell(`E${addendumWeeklyRow}`).font = {
    bold: true
  };
  sheet.getCell(`E${addendumCumulativeRow}`).font = {
    bold: true
  };

  const marker =
    markerScheduleColumns.find(
      item =>
        Number(item.transition.revision) ===
        Number(transition.revision)
    );

  if (marker) {
    const markerLetter =
      sheet.getColumn(marker.colNumber).letter;
    const markerCell =
      sheet.getCell(
        `${markerLetter}${addendumCumulativeRow}`
      );

    markerCell.value =
      Number(meta.seed.toFixed(3));
    markerCell.numFmt = '0.000';
  }

  weeks.forEach(w => {
    const weekNumber =
      Number(w.minggu_ke);
    const colNumber =
      weekColumnMap.get(weekNumber);
    const colLetter =
      sheet.getColumn(colNumber).letter;
    const weeklyCell =
      sheet.getCell(
        `${colLetter}${addendumWeeklyRow}`
      );
    const cumulativeCell =
      sheet.getCell(
        `${colLetter}${addendumCumulativeRow}`
      );

    if (
      weekNumber < meta.startWeek ||
      weekNumber > meta.endWeek
    ) {
      weeklyCell.value = null;
      cumulativeCell.value = null;
    } else {
      const weeklyValue =
        getScheduleTotalByWeek(
          weekNumber,
          transition.version.id
        );

      addendumCumulative += weeklyValue;

      weeklyCell.value =
        Number(weeklyValue.toFixed(3));
      cumulativeCell.value =
        Number(
          Math.min(
            addendumCumulative,
            100
          ).toFixed(3)
        );
      activePlanCumulativeByWeek.set(
        weekNumber,
        cumulativeCell.value
      );
    }

    weeklyCell.numFmt = '0.000';
    cumulativeCell.numFmt = '0.000';
    weeklyCell.alignment = {
      horizontal: "center",
      vertical: "middle"
    };
    cumulativeCell.alignment = {
      horizontal: "center",
      vertical: "middle"
    };
  });

  stylePlanFooterBlock(
    addendumWeeklyRow,
    addendumCumulativeRow
  );

  nextFooterPlanRow += 2;
});


// =========================
// 🔥 REALISASI (KOSONG)
// =========================
const realisasiRow = nextFooterPlanRow;
const realisasiKomulatifRow = realisasiRow + 1;

// 🔹 KIRI BESAR
sheet.mergeCells(`B${realisasiRow}:D${realisasiKomulatifRow}`);
sheet.getCell(`B${realisasiRow}`).value = "REALISASI FISIK PEKERJAAN";
sheet.getCell(`B${realisasiRow}`).font = { bold: true };
sheet.getCell(`B${realisasiRow}`).alignment = {
  horizontal: "center",
  vertical: "middle",
  wrapText: true
};

// 🔹 LABEL
sheet.getCell(`E${realisasiRow}`).value = "REALISASI PER-MINGGU";
sheet.getCell(`E${realisasiKomulatifRow}`).value = "REALISASI KOMULATIF";

sheet.getCell(`E${realisasiRow}`).font = { bold: true };
sheet.getCell(`E${realisasiKomulatifRow}`).font = { bold: true };

// 🔹 BORDER B-D
for (let r = realisasiRow; r <= realisasiKomulatifRow; r++) {
  for (let c = 2; c <= 4; c++) {
    const cell = sheet.getRow(r).getCell(c);
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" }
    };
  }
}

// 🔹 BORDER E-K
for (let r = realisasiRow; r <= realisasiKomulatifRow; r++) {
  for (let c = 5; c <= footerLabelEndCol; c++) {
    const cell = sheet.getRow(r).getCell(c);
    cell.border = {
      top: r === realisasiRow ? { style: "thin" } : undefined,
      bottom: r === realisasiKomulatifRow ? { style: "thin" } : undefined,
      left: c === 5 ? { style: "thin" } : undefined,
      right: c === footerLabelEndCol ? { style: "thin" } : undefined
    };
  }
}

// 🔹 VALUE (KOSONG DULU)
weeks.forEach(w => {
  const c =
    weekColumnMap.get(Number(w.minggu_ke));

  const colLetter = sheet.getColumn(c).letter;

  const cell1 = sheet.getCell(`${colLetter}${realisasiRow}`);
  const cell2 = sheet.getCell(`${colLetter}${realisasiKomulatifRow}`);
  const real =
    getRealDataByWeek(w.minggu_ke);

  cell1.value =
    Number(real.real || 0);
  cell2.value =
    Number(real.kum_real || 0);

  cell1.numFmt = '0.000';
  cell2.numFmt = '0.000';

  cell1.alignment = { horizontal: "center", vertical: "middle" };
  cell2.alignment = { horizontal: "center", vertical: "middle" };

  cell1.border = {
    top: { style: "thin" },
    bottom: { style: "thin" },
    left: { style: "thin" },
    right: { style: "thin" }
  };

  cell2.border = {
    top: { style: "thin" },
    bottom: { style: "thin" },
    left: { style: "thin" },
    right: { style: "thin" }
  };
});


// =========================
// 🔥 DEVIASI (1 BARIS)
// =========================
const deviasiRow = realisasiKomulatifRow + 1;

// =========================
// 🔹 LABEL KIRI
// =========================
sheet.mergeCells(`B${deviasiRow}:D${deviasiRow}`);
sheet.getCell(`B${deviasiRow}`).value = "DEVIASI";

// style
sheet.getCell(`B${deviasiRow}`).font = { bold: true };
sheet.getCell(`B${deviasiRow}`).alignment = {
  horizontal: "center",
  vertical: "middle"
};

// =========================
// 🔹 LABEL E
// =========================
sheet.getCell(`E${deviasiRow}`).value = "JUMLAH KOMULATIF PER-MINGGU";
sheet.getCell(`E${deviasiRow}`).font = { bold: true };

// =========================
// 🔹 BORDER B-D
// =========================
for (let c = 2; c <= 4; c++) {
  const cell = sheet.getCell(deviasiRow, c);
  cell.border = {
    top: { style: "thin" },
    bottom: { style: "thin" },
    left: { style: "thin" },
    right: { style: "thin" }
  };
}

// =========================
// 🔹 BORDER E-K (kotak)
// =========================
for (let c = 5; c <= footerLabelEndCol; c++) {

  const cell = sheet.getCell(deviasiRow, c);

  cell.border = {
    top: { style: "thin" },
    bottom: { style: "thin" },
    left: c === 5 ? { style: "thin" } : undefined,
    right: c === footerLabelEndCol ? { style: "thin" } : undefined
  };
}

// =========================
// 🔹 VALUE DEVIASI PER WEEK
// =========================
for (let c = weekStartCol; c <= weekEndCol; c++) {

  const colLetter = sheet.getColumn(c).letter;
  const cell = sheet.getCell(`${colLetter}${deviasiRow}`);

  const week =
    weeks.find(
      item =>
        weekColumnMap.get(Number(item.minggu_ke)) === c
    );

  if (week) {
    const real =
      Number(
        getRealDataByWeek(week.minggu_ke).kum_real || 0
      );
    const plan =
      activePlanCumulativeByWeek.get(
        Number(week.minggu_ke)
      );

    cell.value =
      plan === undefined || plan === null
        ? null
        : Number((real - plan).toFixed(3));
  } else {
    cell.value = null;
  }

  cell.numFmt = '0.000';

  cell.alignment = {
    horizontal: "center",
    vertical: "middle"
  };

  // 🔥 border full kotak
  cell.border = {
    top: { style: "thin" },
    bottom: { style: "thin" },
    left: { style: "thin" },
    right: { style: "thin" }
  };
}

for (let r = rencanaRow; r <= deviasiRow; r++) {
  for (let c = 2; c <= footerLabelEndCol; c++) {
    const cell = sheet.getCell(r, c);

    cell.border = {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left:
        c >= 2 && c <= 4
          ? { style: "thin" }
          : undefined
    };
  }
}

if (isAddendumExport) {
  for (let r = footerStart; r <= deviasiRow; r++) {
    for (let c = addendumDetailStartCol; c < spacerCol; c++) {
      const cell = sheet.getCell(r, c);

      if (r > footerStart + 3) {
        cell.value = null;
      }
      cell.fill = undefined;
      cell.border =
        r >= rencanaRow
          ? {
              top: { style: "thin" },
              bottom: { style: "thin" }
            }
          : {
              top: { style: "thin" },
              bottom: { style: "thin" },
              left: { style: "thin" },
              right: { style: "thin" }
            };
    }
  }
}

for (let r = startDataRow; r <= deviasiRow; r++) {
  [spacerCol, kosongCol].forEach(col => {
    const cell = sheet.getCell(r, col);

    cell.fill = greyFill;
    cell.border = {
      left: { style: "thin" },
      right: { style: "thin" },
      bottom:
        r === deviasiRow
          ? { style: "thin" }
          : undefined
    };
  });

  const ketCell =
    sheet.getCell(r, ketCol);

  ketCell.value = null;
  ketCell.border = {
    top:
      r === startDataRow
        ? { style: "thin" }
        : undefined,
    bottom:
      r === deviasiRow
        ? { style: "thin" }
        : undefined,
    left: { style: "thin" },
    right: { style: "thin" }
  };
}

markerScheduleColumns.forEach(marker => {
  const colLetter =
    sheet.getColumn(marker.colNumber).letter;

  sheet.mergeCells(
    `${colLetter}${startDataRow}:` +
    `${colLetter}${endDataRow}`
  );

  const markerCell =
    sheet.getCell(`${colLetter}${startDataRow}`);

  markerCell.value =
    marker.label
      .split("")
      .join("\n");
  markerCell.font = {
    bold: true,
    size: 18
  };
  markerCell.alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true
  };
  markerCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFD9D9D9" }
  };
  markerCell.border = {
    top: { style: "thin" },
    bottom: { style: "thin" },
    left: { style: "thin" },
    right: { style: "thin" }
  };
});

// =========================
// 🔥 AMBIL TEMPLATE (SCHEDULE)
// =========================
const ttdData = await TtdTemplate.findOne({
  where: {
    project_id: project.id,
    tipe_laporan: "schedule"
  }
});

const template = ttdData?.layout;

// =========================
// 🔥 VALIDASI
// =========================
if (!template || !template.top) {
  throw new Error("Template TTD schedule tidak ditemukan");
}

// =========================
// 🔥 POSISI
// =========================
let ttdStart = deviasiRow + 3; // 🔥 cukup 1 jarak

// =========================
// 🔥 HEADER HEIGHT
// =========================
const maxHeader = Math.max(
  ...template.top.map(col => col.header?.length || 0)
);

const namaRow = ttdStart + maxHeader + 4;

// =========================
// 🔥 LOOP TTD (SINGLE BLOCK)
// =========================
const excelColumnToNumber = column => {
  return String(column)
    .toUpperCase()
    .split("")
    .reduce(
      (sum, char) =>
        sum * 26 + char.charCodeAt(0) - 64,
      0
    );
};

const getTtdColumn = column => {
  const colNumber =
    excelColumnToNumber(column);

  if (
    !isAddendumExport ||
    colNumber < 13
  ) {
    return column;
  }

  const oldWeekIndex =
    colNumber - 13;
  const markerCountBeforeColumn =
    markerScheduleColumns.filter(
      marker =>
        Number(marker.transition.version.effective_week || 1) <=
        oldWeekIndex + 1
    ).length;
  const shiftedColNumber =
    colNumber +
    (weekStartCol - 13) +
    markerCountBeforeColumn;

  return sheet.getColumn(shiftedColNumber).letter;
};

template.top.forEach((col) => {

  const colCenter = getTtdColumn(col.range);
  if (!colCenter) return;

  // 🔹 HEADER
  (col.header || []).forEach((text, i) => {
    const cell = sheet.getCell(`${colCenter}${ttdStart + i}`);
    cell.value = text || "";
    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: false // 🔥 penting biar turun baris
    };
  });

  // 🔹 NAMA
  const namaCell = sheet.getCell(`${colCenter}${namaRow}`);
  namaCell.value = col.nama || "";
  namaCell.font = { bold: true };
  namaCell.alignment = { horizontal: "center" };

  // 🔹 JABATAN
  const jabCell = sheet.getCell(`${colCenter}${namaRow + 1}`);
  jabCell.value = col.jabatan || "";
  jabCell.alignment = { horizontal: "center" };
});


// =========================
// 🔥 BORDER KOTAK (MULAI DARI B)
// ========================
const endCol = ketCol;
const endRow = namaRow + 2;

// 🔹 kiri & kanan
for (let i = ttdStart - 2; i <= endRow; i++) {

  // kiri di kolom B
  const leftCell = sheet.getRow(i).getCell(startCol);
  leftCell.border = {
    ...leftCell.border,
    left: { style: "thin" }
  };

  // kanan di kolom terakhir
  const rightCell = sheet.getRow(i).getCell(endCol);
  rightCell.border = {
    ...rightCell.border,
    right: { style: "thin" }
  };
}


// 🔹 garis bawah (B → ketCol)
for (let col = startCol; col <= endCol; col++) {
  const cell = sheet.getRow(endRow).getCell(col);
  cell.border = {
    ...cell.border,
    bottom: { style: "thin" }
  };
}


// =========================
// 🔥 RENCANA KOMULATIF
// =========================
const rencanaKomulatifChart = weeks.map(w => {
  const weekNumber =
    Number(w.minggu_ke);
  const activePlan =
    activePlanCumulativeByWeek.get(weekNumber);

  return activePlan === undefined ||
    activePlan === null
      ? null
      : Number(Number(activePlan).toFixed(3));
});

// =========================
// 🔥 REAL KOMULATIF
// =========================
const addendumProgressCutoffWeek =
  addendumTransitions.length > 0
    ? Math.max(
        ...addendumTransitions.map(
          transition =>
            Number(transition.previousWeek)
        )
      )
    : null;

const realKomulatif = weeks.map((w) => {

  if (
    isAddendumExport &&
    (
      !addendumProgressCutoffWeek ||
      Number(w.minggu_ke) > addendumProgressCutoffWeek
    )
  ) {
    return null;
  }

  const real = realData.find(
    r => Number(r.minggu_ke) === Number(w.minggu_ke)
  );

  return Number(real?.kum_real || 0);
});

// =========================
// 🔥 LABEL WEEK
// =========================
const labels = weeks.map(w => `M${w.minggu_ke}`);

// =========================
// 🔥 DATA CHART UNTUK PYTHON
// =========================// =========================
// 🔥 SHEET KHUSUS CHART
// =========================
const chartSheet = workbook.addWorksheet("CHART_DATA");

// hidden
chartSheet.state = "hidden";

chartSheet.getCell("F1").value = weekStartCol;

chartSheet.getCell("F2").value = weekEndCol;

chartSheet.getCell("F3").value = startDataRow;

chartSheet.getCell("F4").value = endDataRow;

chartSheet.getCell("F5").value = includeProgressChart ? 1 : 0;

// HEADER
chartSheet.getCell("A1").value = "Minggu";

chartSheet.getCell("B1").value = "Rencana";

chartSheet.getCell("C1").value = "Realisasi";

// DATA
weeks.forEach((w, idx) => {

  const r = idx + 2;

  // minggu
  chartSheet.getCell(`A${r}`).value =
    `M${w.minggu_ke}`;

// rencana
chartSheet.getCell(`B${r}`).value =
  rencanaKomulatifChart[idx] === null ||
  rencanaKomulatifChart[idx] === undefined
    ? null
    : parseFloat(rencanaKomulatifChart[idx]);

chartSheet.getCell(`B${r}`).numFmt =
  "0.000";

// realisasi
chartSheet.getCell(`C${r}`).value =
  realKomulatif[idx] === null ||
  realKomulatif[idx] === undefined
    ? null
    : parseFloat(realKomulatif[idx]);

chartSheet.getCell(`C${r}`).numFmt =
  "0.000";

});


    // =========================
    // 🔥 EXPORT
    // =========================

    const exportId =
      `${project_id}-${version_id || "all"}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`;
    const tempSchedulePath =
      path.join(os.tmpdir(), `temp_schedule_${exportId}.xlsx`);
    const finalSchedulePath =
      path.join(os.tmpdir(), `final_schedule_${exportId}.xlsx`);

    await workbook.xlsx.writeFile(tempSchedulePath);

    // =========================
    // 🔥 JALANKAN PYTHON
    // =========================
    await PythonShell.run(
      path.join(process.cwd(), "python", "generate_chart.py"),
      {
        args: [
          tempSchedulePath,
          finalSchedulePath
        ]
      }
    );

    // =========================
    // 🔥 DOWNLOAD FINAL FILE
    // =========================
    return res.download(
      finalSchedulePath,
      "Time_Schedule.xlsx",
      async () => {
        await Promise.allSettled([
          fs.unlink(tempSchedulePath),
          fs.unlink(finalSchedulePath)
        ]);
      }
    );
  } catch (error) {

  console.log("=================================");
  console.log("EXPORT ERROR");
  console.log("MESSAGE:", error.message);
  console.log("STACK:", error.stack);
  console.log("FULL ERROR:", error);
  console.log("=================================");

  res.status(500).json({
    message: error.message
  });
}
};
