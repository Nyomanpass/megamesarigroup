import ExcelJS from "exceljs";
import libre from "libreoffice-convert";
import fs from "fs";
import path from "path";
import { getWeeklyReport } from "./ReportController.js";
import { Project } from "../models/ProjectModel.js";
import { TtdTemplate } from "../models/TtdTemplate.js";
import { Op } from "sequelize";
import { DailyProgressPhoto } from "../models/DailyProgressPhotos.js";
import { DailyProgress } from "../models/DailyProgressModel.js";
import { Boq } from "../models/BoqModel.js";
import { buildExportFilename } from "../utils/exportFilename.js";
import { applyTtdCellText } from "../utils/ttdStyle.js";

const CM_TO_POINTS = 28.3464567;
const TABLE_DATA_ROW_HEIGHT = 0.5 * CM_TO_POINTS;
const LOGO_ROW_HEIGHT = 16;
const LOGO_WIDTH_PX = Math.round(5.57 * 96);
const LOGO_KONSULTAN_WIDTH_PX = Math.round(5.20 * 96);
const LOGO_HEIGHT_PX = Math.round(1.05 * 96);

const getProjectExportName = (project) =>
  project?.projeknama_import ||
  project?.nama_import ||
  project?.pekerjaan ||
  "-";

const buildWeeklyGroupedRows = (reportRows = [], boqRows = []) => {
  const boqMap = new Map();
  const printedHeaders = new Set();
  const printedSubheaders = new Set();
  const groupedRows = [];

  boqRows.forEach((boq) => {
    boqMap.set(Number(boq.id), boq);
  });

  const getParents = (boq) => {
    let header = null;
    let subheader = null;
    let current = boq;

    while (current?.parent_id) {
      current = boqMap.get(Number(current.parent_id));

      if (current?.tipe === "subheader") {
        subheader = current;
      }

      if (current?.tipe === "header") {
        header = current;
      }
    }

    return { header, subheader };
  };

  reportRows.forEach((reportRow) => {
    const boq = boqMap.get(Number(reportRow.boq_id));
    if (!boq) {
      groupedRows.push(reportRow);
      return;
    }

    const { header, subheader } = getParents(boq);

    if (header && !printedHeaders.has(Number(header.id))) {
      groupedRows.push({
        boq_id: header.id,
        tipe: "header",
        uraian: header.uraian
      });
      printedHeaders.add(Number(header.id));
    }

    if (subheader && !printedSubheaders.has(Number(subheader.id))) {
      groupedRows.push({
        boq_id: subheader.id,
        tipe: "subheader",
        uraian: subheader.uraian
      });
      printedSubheaders.add(Number(subheader.id));
    }

    groupedRows.push({
      ...reportRow,
      tipe: "item"
    });
  });

  return groupedRows.length ? groupedRows : reportRows;
};

const getWeeklyTotalBobot = (rows = []) =>
  rows.reduce((total, row) => {
    if (row?.tipe === "header" || row?.tipe === "subheader") {
      return total;
    }

    return total + (Number(row?.bobot) || 0);
  }, 0);


export const exportWeeklyReportExcel = async (req, res) => {
  try {
    const { minggu } = req.query;
    const { project_id } = req.params;

    // =========================
    // 🔥 AMBIL DATA
    // =========================
    const project = await Project.findByPk(project_id);

    let fakeRes = {
      jsonData: null,
      json(data) {
        this.jsonData = data;
      }
    };

    await getWeeklyReport(req, fakeRes);
    const weekly = fakeRes.jsonData;

    const dataMinggu = weekly.find(w => w.minggu_ke == minggu);

    if (!dataMinggu) {
      return res.status(404).json({ message: "Data minggu tidak ditemukan" });
    }

    const boqRows = await Boq.findAll({
      where: { project_id },
      order: [["id", "ASC"]]
    });
    const groupedWeeklyData = buildWeeklyGroupedRows(dataMinggu.data, boqRows);

    const workbook = new ExcelJS.Workbook();
    workbook.calcProperties.fullCalcOnLoad = true;
    workbook.calcProperties.forceFullCalc = true;
    const sheet = workbook.addWorksheet("Laporan Mingguan");
    sheet.properties.defaultRowHeight = TABLE_DATA_ROW_HEIGHT;

    // =========================
    // 🔥 SET COLUMN (A-N)
    // =========================
    sheet.getColumn("A").width = 5;   // spasi kiri
    sheet.getColumn("B").width = 15;
    sheet.getColumn("C").width = 3;
    sheet.getColumn("D").width = 32;
    sheet.getColumn("E").width = 32;   // padding kanan client

    sheet.getColumn("F").width = 10;   // padding kiri konsultan
    sheet.getColumn("G").width = 17;
    sheet.getColumn("H").width = 15;
    sheet.getColumn("I").width = 15;
    sheet.getColumn("J").width = 15;

    sheet.getColumn("K").width = 15;   // padding kiri kontraktor
    sheet.getColumn("L").width = 20;
    sheet.getColumn("M").width = 20;
    sheet.getColumn("N").width = 35;

    // =========================
    // 🔥 HEADER TITLE
    // =========================
    sheet.mergeCells("A1:E1");
    sheet.mergeCells("F1:J1");
    sheet.mergeCells("K1:N1");

    sheet.getCell("A1").value = "CLIENT";
    sheet.getCell("F1").value = "KONSULTAN PENGAWAS";
    sheet.getCell("K1").value = "KONTRAKTOR PELAKSANA";

    ["A1","F1","K1"].forEach(c => {
      sheet.getCell(c).alignment = { horizontal: "center", vertical: "middle" };
      sheet.getCell(c).font = { bold: true };
    });

    // =========================
    // 🔥 BOX LOGO
    // =========================
    sheet.mergeCells("A2:E6");
    sheet.mergeCells("F2:J6");
    sheet.mergeCells("K2:N6");

    for (let r = 2; r <= 6; r++) {
      sheet.getRow(r).height = LOGO_ROW_HEIGHT;
      sheet.getRow(r).customHeight = true;
    }

    // =========================
    // 🔥 HELPER
    // =========================
    const colWidthToPx = (w) => Math.floor((w || 8.43) * 7 + 5);
    const rowHeightToPx = (h) => Math.floor((h || 15) * 96 / 72);

    const getBoxWidthPx = (startCol, endCol) => {
      let total = 0;
      for (let c = startCol; c <= endCol; c++) {
        total += colWidthToPx(sheet.getColumn(c).width);
      }
      return total;
    };

    const getBoxHeightPx = (startRow, endRow) => {
      let total = 0;
      for (let r = startRow; r <= endRow; r++) {
        total += rowHeightToPx(sheet.getRow(r).height);
      }
      return total;
    };

  const placeLogo = (logoPath, startCol, endCol, widthPx = LOGO_WIDTH_PX) => {
    if (!logoPath) return;

    const resolvedLogoPath =
      path.join(process.cwd(), "uploads", "logos", logoPath);

    if (!fs.existsSync(resolvedLogoPath)) {
      console.warn(`Logo tidak ditemukan, dilewati: ${resolvedLogoPath}`);
      return;
    }

    const imageId = workbook.addImage({
      filename: resolvedLogoPath,
      extension: "png"
    });

    const startRow = 2;
    const endRow = 6;
    const boxW = getBoxWidthPx(startCol, endCol);
    const boxH = getBoxHeightPx(startRow, endRow);
    const offsetX = Math.max(0, (boxW - widthPx) / 2);
    const offsetY = Math.max(0, (boxH - LOGO_HEIGHT_PX) / 2);

    sheet.addImage(imageId, {
      tl: {
        col: startCol - 1,
        row: startRow - 1,
        nativeColOff: Math.round(offsetX * 9525),
        nativeRowOff: Math.round(offsetY * 9525)
      },
      ext: {
        width: widthPx,
        height: LOGO_HEIGHT_PX
      }
    });
  };

    // =========================
    // 🔥 PASANG LOGO
    // =========================
  placeLogo(project.logo_client, 2, 5);
  placeLogo(project.logo_konsultan, 7, 10, LOGO_KONSULTAN_WIDTH_PX);
  placeLogo(project.logo_kontraktor, 12, 14);

    // =========================
    // 🔥 BORDER HEADER
    // =========================
    for (let r = 1; r <= 6; r++) {
      for (let c = 1; c <= 14; c++) {
        sheet.getRow(r).getCell(c).border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" }
        };
      }
    }

    // =========================
    // 🔥 INFO PROJECT
    // =========================
    let row = 8;

    const formatTanggal = (date) => {
      if (!date) return "-";

      const d = new Date(date);

      return d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "Asia/Makassar" // 🔥 penting (Bali/WITA)
      });
    };

const addLabel = (label, value, isMultiLine = false) => {
  // LABEL
  sheet.getCell(`A${row}`).value = label;
  sheet.getCell(`A${row}`).font = { bold: true };
  sheet.getCell(`A${row}`).alignment = { vertical: "top" };

  // TITIK DUA
  sheet.getCell(`C${row}`).value = ":";

  const val = value ? String(value).toUpperCase() : "-";

  if (isMultiLine) {
    const words = val.split(" ");
    let line = "";
    let lines = [];

    // 🔥 susun kalimat berdasarkan lebar (bukan potong paksa)
    words.forEach(word => {
      if ((line + word).length > 80) { // 🔥 ini sesuaikan lebar D–G
        lines.push(line.trim());
        line = word + " ";
      } else {
        line += word + " ";
      }
    });

    if (line) lines.push(line.trim());

    // 🔥 tulis ke beberapa row
    lines.forEach((text, i) => {
      if (i > 0) row++;

      sheet.mergeCells(`D${row}:I${row}`);
      const cell = sheet.getCell(`D${row}`);

      cell.value = text;
      cell.alignment = {
        horizontal: "left",
        vertical: "top"
      };
    });

  } else {
    const cell = sheet.getCell(`D${row}`);
    cell.value = val;
    cell.alignment = {
      horizontal: "left",
      vertical: "middle"
    };
  }

  row++;
};


    addLabel("KEGIATAN", project.kegiatan);
    addLabel("SUB KEGIATAN", project.sub_kegiatan);
    addLabel("PEKERJAAN", getProjectExportName(project), true);
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

  // =========================
  // 🔥 INFO KANAN (ANTI ERROR)
  // =========================


  for (let r = 7; r <= row; r++) {

  const cell = sheet.getRow(r).getCell(1);

  cell.border = {
    ...cell.border,

    left: {
      style: "thin"
    }
  };

}

const titleStartRow = 7;
const titleEndRow = 10;

// 🔥 merge
try {
  sheet.mergeCells(`J${titleStartRow}:N${titleEndRow}`);
} catch (e) {}

const cell = sheet.getCell(`J${titleStartRow}`);
cell.value = "LAPORAN MINGGUAN";

// 🔥 style text
cell.font = {
  bold: true,
  size: 14
};

cell.alignment = {
  horizontal: "center",
  vertical: "middle"
};

// =========================
// 🔥 BORDER FULL KOTAK
// =========================

// 🔥 atas & bawah
for (let c = 10; c <= 14; c++) {

  // atas (row 7)
  sheet.getRow(titleStartRow).getCell(c).border = {
    top: { style: "thin" }
  };

  // bawah (row 10)
  sheet.getRow(titleEndRow).getCell(c).border = {
    bottom: { style: "thin" }
  };
}

// 🔥 kiri & kanan
for (let r = titleStartRow; r <= titleEndRow; r++) {

  // kiri (J)
  sheet.getRow(r).getCell(10).border = {
    ...sheet.getRow(r).getCell(10).border,
    left: { style: "thin" }
  };

  // kanan (N)
  sheet.getRow(r).getCell(14).border = {
    ...sheet.getRow(r).getCell(14).border,
    right: { style: "thin" }
  };

}

let rowRight = 10 + 2;


const angkaKeHuruf = (n) => {
  const map = {
    1:"Satu",2:"Dua",3:"Tiga",4:"Empat",5:"Lima",
    6:"Enam",7:"Tujuh",8:"Delapan",9:"Sembilan",10:"Sepuluh"
  };
  return map[n] || n;
};

// 🔥 DATA DUMMY
const dataRight = [
  [
    "    MINGGU",
    `${dataMinggu.minggu_ke} (${angkaKeHuruf(dataMinggu.minggu_ke)})`
  ],
  [
    "    TANGGAL",
    `${formatTanggal(dataMinggu.tgl_awal)} s/d ${formatTanggal(dataMinggu.tgl_akhir)}`
  ],
  [
    "    WAKTU PELAKSANAAN",
    `${dataMinggu.waktu_pelaksanaan} Hari`
  ],
  [
    "    WAKTU BERJALAN",
    `${dataMinggu.waktu_berjalan} Hari`
  ],
  [
    "    SISA WAKTU",
    `${dataMinggu.sisa_waktu} Hari`
  ],
];

const startBox = rowRight;

// 🔥 LOOP
dataRight.forEach((item, index) => {

  // 🔥 LABEL (J)
  sheet.getCell(`J${rowRight}`).value = item[0];
  sheet.getCell(`J${rowRight}`).font = { bold: true };

  // 🔥 TITIK DUA (L)
  sheet.getCell(`L${rowRight}`).value = ":";
  sheet.getCell(`L${rowRight}`).alignment = {
    horizontal: "center",
    vertical: "middle"
  };

  // 🔥 VALUE (M–N)
  sheet.getCell(`M${rowRight}`).value = item[1];
  sheet.mergeCells(`M${rowRight}:N${rowRight}`);

  sheet.getCell(`M${rowRight}`).alignment = {
    horizontal: "left",
    vertical: "middle",
    wrapText: false,
    shrinkToFit: true
  };

  rowRight++;

  // 🔥 JARAK 1 BARIS (KECUALI TERAKHIR)
  if (index !== dataRight.length - 1) {
    rowRight++; // kosong
  }

});

const endBox = rowRight - 1;


// =========================
// 🔥 BORDER LUAR SAJA
// =========================

const startVertical = 7;
const endVertical = 22;

for (let r = startVertical; r <= endVertical; r++) {

  const leftCell = sheet.getRow(r).getCell(10);
  leftCell.border = {
    ...leftCell.border,
    left: { style: "thin" }
  };

  const rightCell = sheet.getRow(r).getCell(14);
  rightCell.border = {
    ...rightCell.border,
    right: { style: "thin" }
  };

}

    // =========================
    // 🔥 HEADER TABLE
    // =========================
const startRow = row + 1;

// 🔥 BARIS 1
sheet.getRow(startRow).values = [
  "NO",
  "URAIAN PEKERJAAN", "", "", "",
  "SATUAN",
  "VOLUME",
  "BOBOT (%)",
  "VOLUME YANG TELAH DIKERJAKAN", "", "",
  "PERSENTASE PENYELESAIAN TERHADAP TARGET (%)",
  "PERSENTASE BOBOT KEMAJUAN PEKERJAAN",
  "KETERANGAN"
];

// 🔥 BARIS 2 (SUB HEADER)
sheet.getRow(startRow + 1).values = [
  "",
  "", "", "", "",
  "",
  "",
  "",
  "S/D MINGGU LALU",
  "DALAM MINGGU INI",
  "S/D MINGGU INI",
  "",
  "",
  ""
];

// =========================
// 🔥 MERGE HEADER
// =========================

// NO
sheet.mergeCells(`A${startRow}:A${startRow+1}`);

// URAIAN (B–E)
sheet.mergeCells(`B${startRow}:E${startRow+1}`);

// SATUAN
sheet.mergeCells(`F${startRow}:F${startRow+1}`);

// VOLUME
sheet.mergeCells(`G${startRow}:G${startRow+1}`);

// BOBOT
sheet.mergeCells(`H${startRow}:H${startRow+1}`);

// VOLUME DIKERJAKAN (I–K)
sheet.mergeCells(`I${startRow}:K${startRow}`);

// PERSENTASE TARGET
sheet.mergeCells(`L${startRow}:L${startRow+1}`);

// PERSENTASE BOBOT
sheet.mergeCells(`M${startRow}:M${startRow+1}`);

// KETERANGAN
sheet.mergeCells(`N${startRow}:N${startRow+1}`);

[startRow, startRow + 1].forEach(r => {
  sheet.getRow(r).font = { bold: true };
  sheet.getRow(r).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true
  };
});

// =========================
// 🔥 STYLE HEADER TABLE
// =========================
const headerFill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFD9D9D9" } // abu-abu
};

const numberFill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFF2F2F2" } // 🔥 lebih pudar
};


for (let r = startRow; r <= startRow + 1; r++) {
  for (let c = 1; c <= 14; c++) {
    const cell = sheet.getRow(r).getCell(c);

    cell.fill = headerFill;
    cell.font = { bold: true, size: 10 };

    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true
    };

    cell.border = {
      // 🔥 WAJIB: semua kolom di baris atas punya garis atas
      top: r === startRow ? { style: "thin" } : undefined,

      // 🔥 bawah hanya di baris kedua
      bottom: r === startRow + 1 ? { style: "thin" } : undefined,

      // 🔥 kiri hanya kolom pertama
      left: c === 1 ? { style: "thin" } : undefined,

      // 🔥 kanan selalu ada (biar tidak double)
      right: { style: "thin" }
    };
  }
}

// 🔥 FIX GARIS ATAS HILANG
for (let c = 1; c <= 14; c++) {
  sheet.getRow(startRow).getCell(c).border.top = { style: "thin" };
}

// 🔥 FIX BORDER BAWAH KHUSUS I–K (ROW HEADER ATAS)
for (let c = 9; c <= 11; c++) { // I=9, J=10, K=11
  sheet.getRow(startRow).getCell(c).border = {
    ...sheet.getRow(startRow).getCell(c).border,
    bottom: { style: "thin" }
  };
}

// ✅ 🔥 TARUH DI SINI
sheet.getRow(startRow).height = 40;
sheet.getRow(startRow + 1).height = 40;

// =========================
// 🔥 BARIS NOMOR KOLOM
// =========================

const numberRow = startRow + 2;

// 🔥 isi manual per cell (BIAR CENTER SEMPURNA)
sheet.getRow(numberRow).getCell(1).value = 1;  // A
sheet.getRow(numberRow).getCell(2).value = 2;  // B (merge nanti)

// C D E kosong (karena merge B–E)

sheet.getRow(numberRow).getCell(6).value = 3;  // F
sheet.getRow(numberRow).getCell(7).value = 4;  // G
sheet.getRow(numberRow).getCell(8).value = 5;  // H
sheet.getRow(numberRow).getCell(9).value = 6;  // I
sheet.getRow(numberRow).getCell(10).value = 7; // J

// 🔥 WAJIB pakai ' biar tidak jadi rumus Excel
sheet.getRow(numberRow).getCell(11).value = {
  richText: [{ text: "8 = 6 + 7" }]
};

sheet.getRow(numberRow).getCell(12).value = {
  richText: [{ text: "9 = 8 / 4 x 100" }]
};

sheet.getRow(numberRow).getCell(13).value = {
  richText: [{ text: "10 = 5 x 9 / 100" }]
};

sheet.getRow(numberRow).getCell(14).value = 11; // N

// 🔥 MERGE URAIAN (B–E)
sheet.mergeCells(`B${numberRow}:E${numberRow}`);

// =========================
// 🔥 STYLE
// =========================
for (let c = 1; c <= 14; c++) {
  const cell = sheet.getRow(numberRow).getCell(c);
  cell.fill = numberFill; 


  cell.font = { bold: true, size: 9 };

  cell.alignment = {
    horizontal: "center",
    vertical: "middle"
  };

  // 🔥 FIX BORDER MERGE
  if (c >= 2 && c <= 5) {
    cell.border = {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: c === 2 ? { style: "thin" } : undefined,
      right: c === 5 ? { style: "thin" } : undefined
    };
  } else {
    cell.border = {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: c === 1 ? { style: "thin" } : undefined,
      right: { style: "thin" }
    };
  }
}

// 🔥 HEIGHT
sheet.getRow(numberRow).height = 18;


// 🔥 TRACK ROW YANG SUDAH DI-MERGE
const mergedRows = new Set();

const mergeBE = (row) => {
  if (mergedRows.has(row)) return;

  sheet.mergeCells(`B${row}:E${row}`);
  mergedRows.add(row);
};

let rowIndex = startRow + 3;
// 🔥 TAMBAHKAN DI SINI (JARAK ATAS)
sheet.getCell(`B${rowIndex}`).value = " ";
mergeBE(rowIndex);
sheet.getRow(rowIndex).height = 15;

rowIndex++; // 🔥 baru mulai data

let nomorHeader = 0;
let nomorSub = 0;
let nomorItem = 0;
let lastTipe = null;

const roman = ["I","II","III","IV","V","VI","VII","VIII","IX","X"];

groupedWeeklyData.forEach((item) => {

  // =========================
  // 🔥 HEADER
  // =========================
  if (item.tipe === "header") {

    nomorHeader++;
    nomorSub = 0;
    nomorItem = 0;

    if (nomorHeader > 1) {
      rowIndex++;
      sheet.getCell(`B${rowIndex}`).value = " ";
      mergeBE(rowIndex);
      sheet.getRow(rowIndex).height = 15;
    }

    const huruf = String.fromCharCode(64 + nomorHeader);

    sheet.getCell(`A${rowIndex}`).value = huruf;
    sheet.getCell(`B${rowIndex}`).value = item.uraian || "-";

    mergeBE(rowIndex);
    sheet.getRow(rowIndex).font = { bold: true };

    rowIndex++;
  }

  // =========================
  // 🔥 SUBHEADER
  // =========================
  else if (item.tipe === "subheader") {

    nomorSub++;
    nomorItem = 0;

    if (nomorSub > 1) {
      rowIndex++;
      sheet.getCell(`B${rowIndex}`).value = " ";
      mergeBE(rowIndex);
      sheet.getRow(rowIndex).height = 15;
    }

    sheet.getCell(`A${rowIndex}`).value = roman[nomorSub - 1] || nomorSub;
    sheet.getCell(`B${rowIndex}`).value = item.uraian || "-";

    mergeBE(rowIndex);
    sheet.getRow(rowIndex).font = { bold: true };

    rowIndex++;
  }

  // =========================
  // 🔥 ITEM
  // =========================
  else {

    if (lastTipe !== "item") {
      nomorItem = 0;
    }

    nomorItem++;

    sheet.getCell(`A${rowIndex}`).value = nomorItem;
    sheet.getCell(`B${rowIndex}`).value = item.uraian || "-";

    mergeBE(rowIndex);

    sheet.getCell(`F${rowIndex}`).value = item.satuan || "-";
    sheet.getCell(`G${rowIndex}`).value = item.total || 0;
    sheet.getCell(`H${rowIndex}`).value = item.bobot || 0;
    sheet.getCell(`I${rowIndex}`).value = item.sd_lalu || 0;
    sheet.getCell(`J${rowIndex}`).value = item.minggu_ini || 0;
    sheet.getCell(`K${rowIndex}`).value = item.sd_ini || 0;
    sheet.getCell(`L${rowIndex}`).value = item.progress_item || 0;
    sheet.getCell(`M${rowIndex}`).value = item.progres_proyek || 0;

    rowIndex++;
  }

  // 🔥 WAJIB TARUH DI SINI
  lastTipe = item.tipe;

});

// 🔥 TAMBAHKAN DI SINI (JARAK BAWAH)
sheet.getCell(`B${rowIndex}`).value = " ";
mergeBE(rowIndex);
sheet.getRow(rowIndex).height = 15;

rowIndex++;

// =========================
// 🔥 STYLE + BORDER (FIX MERGE B–E)
// =========================
for (let r = startRow + 3; r < rowIndex; r++) {
  const styledRow = sheet.getRow(r);
  styledRow.height = styledRow.height || TABLE_DATA_ROW_HEIGHT;
  styledRow.customHeight = true;

  for (let c = 1; c <= 14; c++) {

    const cell = styledRow.getCell(c);

    // =========================
    // 🔥 FIX MERGE B–E
    // =========================
    if (c >= 2 && c <= 5) {
      // 🔥 hanya border luar saja (B sampai E)
      cell.border = {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: c === 2 ? { style: "thin" } : undefined,  // hanya B
        right: c === 5 ? { style: "thin" } : undefined  // hanya E
      };
    } else {
      // 🔥 kolom lain normal
      cell.border = {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: c === 1 ? { style: "thin" } : undefined,
        right: { style: "thin" }
      };
    }

    // =========================
    // 🔥 ALIGNMENT
    // =========================
    if (c >= 2 && c <= 5) {
      cell.alignment = {
        horizontal: "left",
        vertical: "middle"
      };
    } else {
      cell.alignment = {
        horizontal: "center",
        vertical: "middle"
      };
    }
  }
}


for (let r = startRow + 3; r < rowIndex; r++) {

  const row = sheet.getRow(r);

  // 🔥 helper angka biasa
  const setNumber = (cell, val) => {

    if (!val || val === 0) {

      cell.value = null;

    } else {

      // 🔥 VALUE ASLI FULL
      cell.value = Number(val);

      // 🔥 HANYA FORMAT TAMPILAN
      cell.numFmt =
      '_-* #,##0.000_-;-* #,##0.000_-;_-* "-"??_-;_-@_-';
    }
  };

  // 🔥 helper persen (khusus progress_item)
  const setPercent = (cell, val) => {

  if (!val || Number(val) === 0) {

    cell.value = null;

  } else {

    // 🔥 bulatkan 3 digit
    cell.value = Number(Number(val).toFixed(3));

    // 🔥 format tampil
    cell.numFmt = '0.000';
  }
};

  const setCenteredNumber = (cell, val) => {
    setNumber(cell, val);
    cell.numFmt = '#,##0.000;-#,##0.000;"-"';
    cell.alignment = {
      ...(cell.alignment || {}),
      horizontal: "center",
      vertical: "middle"
    };
  };

  // =========================
  // 🔥 APPLY FORMAT
  // =========================

  setCenteredNumber(row.getCell(7), row.getCell(7).value);   // volume
  setCenteredNumber(row.getCell(8), row.getCell(8).value);   // bobot
  setCenteredNumber(row.getCell(9), row.getCell(9).value);   // sd lalu
  setCenteredNumber(row.getCell(10), row.getCell(10).value); // minggu ini
  setCenteredNumber(row.getCell(11), row.getCell(11).value); // sd ini

  setPercent(row.getCell(12), row.getCell(12).value); // progress_item
  setCenteredNumber(row.getCell(13), row.getCell(13).value);  // progres_proyek (bukan persen!)
}


// =========================
// 🔥 TOTAL BOBOT
// =========================

const totalRow = rowIndex;

// 🔥 MERGE A–G
sheet.mergeCells(`A${totalRow}:G${totalRow}`);

// 🔥 TEXT
const labelCell = sheet.getCell(`A${totalRow}`);
labelCell.value = "TOTAL BOBOT";
labelCell.font = { bold: true };
labelCell.alignment = {
  horizontal: "center",
  vertical: "middle"
};

// 🔥 SUM KOLOM H (BOBOT)
const totalCell = sheet.getCell(`H${totalRow}`);
const totalBobot = getWeeklyTotalBobot(groupedWeeklyData);

totalCell.value = {
  formula: `SUM(H${startRow + 3}:H${rowIndex - 1})`,
  result: totalBobot
};

totalCell.font = { bold: true };
totalCell.numFmt =
'_-* #,##0.000_-;-* #,##0.000_-;_-* "-"??_-;_-@_-';
totalCell.alignment = {
  horizontal: "center",
  vertical: "middle"
};

// =========================
// 🔥 BORDER
// =========================

for (let c = 1; c <= 8; c++) {
  const cell = sheet.getRow(totalRow).getCell(c);

  cell.border = {
    ...cell.border, // 🔥 PENTING (biar tidak hapus border lama)

    top: { style: "thin" },
    bottom: { style: "thin" },

    left: c === 1 ? { style: "thin" } : cell.border?.left,
    right: { style: "thin" }
  };
}


// =========================
// 🔥 BOX PERSENTASE
// =========================

const startPersenRow = totalRow;

// 🔥 DATA
const persenData = [
  ["Persentase Minggu Ini", dataMinggu.real_kumulatif],
  ["Rencana", dataMinggu.rencana_kumulatif],
  ["Deviasi", dataMinggu.deviasi],
];

// 🔥 LOOP
persenData.forEach((item, i) => {
  const r = startPersenRow + i;

  // 🔥 LABEL (K–L merge)
  sheet.mergeCells(`K${r}:L${r}`);
  const labelCell = sheet.getCell(`K${r}`);
  labelCell.value = item[0];
  labelCell.font = { bold: true };
  labelCell.alignment = {
    horizontal: "center",
    vertical: "middle"
  };

  // 🔥 VALUE (M)
  const valCell = sheet.getCell(`M${r}`);
  valCell.value = item[1] / 100; // 🔥 karena persen
  valCell.numFmt = "0.000%";
  valCell.font = { bold: true };
  valCell.alignment = {
    horizontal: "center",
    vertical: "middle"
  };

  // 🔥 KOLOM N (%)
  const persenCell = sheet.getCell(`N${r}`);
  persenCell.value = "%";
  persenCell.alignment = {
    horizontal: "center",
    vertical: "middle"
  };
});


for (let r = startPersenRow; r < startPersenRow + 3; r++) {
  for (let c = 11; c <= 14; c++) {

    const cell = sheet.getRow(r).getCell(c);

    cell.border = {
      ...cell.border, // 🔥 INI KUNCI

      top:
        r === startPersenRow
          ? { style: "thin" }
          : cell.border?.top,

      bottom:
        r === startPersenRow + 2
          ? { style: "thin" }
          : cell.border?.bottom,

      left:
        c === 11
          ? { style: "thin" }
          : cell.border?.left,

      right:
        c === 14
          ? { style: "thin" }
          : cell.border?.right
    };
  }
}

// =========================
// 🔥 FOTO MINGGUAN
// =========================

const photos =
await DailyProgress.findAll({

  where: {
    project_id,

    tanggal: {

      [Op.between]: [

        dataMinggu.tgl_awal,
        dataMinggu.tgl_akhir

      ]
    }
  },

  include: [

    {
      model: DailyProgressPhoto,
      as: "photos"
    },

    {
      model: Boq,
      as: "boq"
    }
  ]
});


// =========================
// 🔥 AMBIL TEMPLATE
// =========================
const ttdData = await TtdTemplate.findOne({
  where: {
    project_id: project.id,
    tipe_laporan: "mingguan"
  }
});

const template = ttdData?.layout;
const safeTemplate =
  template &&
  Array.isArray(template.top) &&
  Array.isArray(template.bottom)
    ? template
    : { top: [], bottom: [] };

// =========================
// 🔥 VALIDASI
// =========================
if (!template || !Array.isArray(template.top) || !Array.isArray(template.bottom)) {
  console.warn(
    `Template TTD mingguan project ${project.id} tidak ditemukan / tidak lengkap, export dilanjutkan tanpa TTD.`
  );
}

// =========================
// 🔥 POSISI
// =========================
let ttdStart = rowIndex + 5;


// =========================
// 🔥 TOP
// =========================
const maxHeaderTop = Math.max(
  0,
  ...safeTemplate.top.map(col => col.header?.length || 0)
);

const namaTopRow = ttdStart + maxHeaderTop + 4;

safeTemplate.top.forEach((col) => {

  const colCenter = col.range; // 🔥 langsung pakai dari DB

  if (!colCenter) return; // safety

  // HEADER
  (col.header || []).forEach((text, i) => {
    const cell = sheet.getCell(`${colCenter}${ttdStart + i}`);
    applyTtdCellText(cell, text);
    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: false
    };
  });

  // NAMA
  const namaCell = sheet.getCell(`${colCenter}${namaTopRow}`);
  applyTtdCellText(namaCell, col.nama, { bold: true, underline: true });
  namaCell.alignment = { horizontal: "center" };
  // JABATAN
  const jabCell = sheet.getCell(`${colCenter}${namaTopRow + 1}`);
  applyTtdCellText(jabCell, col.jabatan);
  jabCell.alignment = { horizontal: "center" };
});

// =========================
// 🔥 BOTTOM
// =========================
const bottomStart = namaTopRow + 4;

const maxHeaderBottom = Math.max(
  0,
  ...safeTemplate.bottom.map(col => col.header?.length || 0)
);

const namaBottomRow = bottomStart + maxHeaderBottom + 5;

safeTemplate.bottom.forEach((col) => {

  const colCenter = col.range;

  if (!colCenter) return;

  // HEADER
  (col.header || []).forEach((text, i) => {
    const cell = sheet.getCell(`${colCenter}${bottomStart + i}`);
    applyTtdCellText(cell, text);
    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: false
    };
  });

  // NAMA
  const namaCell = sheet.getCell(`${colCenter}${namaBottomRow}`);
  applyTtdCellText(namaCell, col.nama, { bold: true, underline: true });
  namaCell.alignment = { horizontal: "center" };

  // JABATAN
  const jabCell = sheet.getCell(`${colCenter}${namaBottomRow + 1}`);
  applyTtdCellText(jabCell, col.jabatan);
  jabCell.alignment = { horizontal: "center" };
});


// =========================
// 🔥 BORDER KOTAK TTD
// =========================
const endRow = namaBottomRow + 2;

// =========================
// 🔥 SAMBUNG BORDER KIRI
// =========================
for (let r = totalRow; r <= endRow; r++) {

  const cell = sheet.getRow(r).getCell(1);

  cell.border = {
    ...cell.border,

    left: {
      style: "thin"
    }
  };

}

// 🔥 KIRI (A) & KANAN (N)
for (let i = ttdStart - 2; i <= endRow; i++) {

  // kiri A (kolom 1)
  const leftCell = sheet.getRow(i).getCell(1);
  leftCell.border = {
    ...leftCell.border,
    left: { style: "thin" }
  };

  // kanan N (kolom 14)
  const rightCell = sheet.getRow(i).getCell(14);
  rightCell.border = {
    ...rightCell.border,
    right: { style: "thin" }
  };
}

// 🔥 GARIS ATAS (A–N)
for (let col = 1; col <= 14; col++) {
  const cell = sheet.getRow(startRow).getCell(col);

  cell.border = {
    ...cell.border,
    top: { style: "thin" }
  };
}

// 🔥 GARIS BAWAH (A–N)
for (let col = 1; col <= 14; col++) {
  const cell = sheet.getRow(endRow).getCell(col);

  cell.border = {
    ...cell.border,
    bottom: { style: "thin" }
  };
}

// =========================
// 🔥 DOKUMENTASI FOTO
// =========================

// 🔥 START POSISI
rowIndex = endRow + 4;


// =========================
// 🔥 JUDUL
// =========================
sheet.mergeCells(`A${rowIndex}:N${rowIndex}`);

const titleCell =
  sheet.getCell(`A${rowIndex}`);

titleCell.value =
  "DOKUMENTASI";

titleCell.font = {
  bold: true,
  size: 14
};

titleCell.alignment = {
  horizontal: "center",
  vertical: "middle"
};

titleCell.border = {
  top: { style: "thin" },
  bottom: { style: "thin" },
  left: { style: "thin" },
  right: { style: "thin" }
};

sheet.getRow(rowIndex).height = 25;

rowIndex += 2;


// =========================
// 🔥 FOTO
// =========================

// =========================
// 🔥 FOTO DOKUMENTASI
// =========================

// 🔥 GABUNG SEMUA FOTO
const allPhotos = [];

for (const progress of photos) {

  if (
    !progress.photos ||
    progress.photos.length === 0
  ) continue;

  for (const p of progress.photos) {

    allPhotos.push({

      photo: p,

      itemName:
        progress.boq?.uraian || "-"

    });

  }
}

// =========================
// 🔥 LOOP FOTO
// =========================
for (
  let i = 0;
  i < allPhotos.length;
  i++
) {

  const data =
    allPhotos[i];

  const imagePath =
    data.photo.photo_url;

  if (
    !fs.existsSync(imagePath)
  ) continue;

  const ext =
    path.extname(imagePath)
    .replace(".", "");

  const imageId =
    workbook.addImage({

      filename: imagePath,
      extension: ext

    });

  // =====================
  // 🔥 KIRI / KANAN
  // =====================
  const isLeft =
    i % 2 === 0;

  // =====================
  // 🔥 SETIAP 2 FOTO TURUN
  // =====================
  const rowGroup =
    Math.floor(i / 2);

  // =====================
  // 🔥 ROW
  // =====================
  const imageRow =
    rowIndex + (rowGroup * 24);

  // =====================
  // 🔥 IMAGE
  // =====================
  sheet.addImage(
    imageId,
    {

      // =================
      // 🔥 POSISI
      // =================

      // KIRI  = A
      // KANAN = I
      tl: {

        col:
          isLeft
            ? 0
            : 8,

        row: imageRow
      },

      // =================
      // 🔥 SIZE GRID
      // =================

      // KIRI  = A:G
      // KANAN = I:N
      br: {

        col:
          isLeft
            ? 7
            : 14,

        row:
          imageRow + 18
      },

      editAs: "oneCell"
    }
  );

  // =====================
  // 🔥 CAPTION
  // =====================
  const captionRow =
    imageRow + 19;

  // =====================
  // 🔥 MERGE CAPTION
  // =====================

  // KIRI  = A:G
  // KANAN = I:N
  const startLetter =
    isLeft
      ? "A"
      : "I";

  const endLetter =
    isLeft
      ? "G"
      : "N";

  sheet.mergeCells(
    `${startLetter}${captionRow}:${endLetter}${captionRow}`
  );

  const capCell =
    sheet.getCell(
      `${startLetter}${captionRow}`
    );

  capCell.value =
    data.itemName.toUpperCase();

  capCell.font = {
    bold: true,
    size: 10
  };

  capCell.alignment = {
    horizontal: "center",
    vertical: "middle"
  };
}

// =========================
// 🔥 NEXT ROW
// =========================
rowIndex =
  rowIndex +
  (
    Math.ceil(
      allPhotos.length / 2
    ) * 24
  ) + 5;

    // =========================
    // 🔥 EXPORT
    // =========================
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${buildExportFilename(`Laporan_Mingguan_${minggu}`, project, "xlsx")}`
    );

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

export const exportWeeklyReportPDF = async (req, res) => {
  try {
    const { minggu } = req.query;
    const { project_id } = req.params;

    // =========================
    // 🔥 AMBIL DATA
    // =========================
    const project = await Project.findByPk(project_id);

    let fakeRes = {
      jsonData: null,
      json(data) {
        this.jsonData = data;
      }
    };

    await getWeeklyReport(req, fakeRes);
    const weekly = fakeRes.jsonData;

    const dataMinggu = weekly.find(w => w.minggu_ke == minggu);

    if (!dataMinggu) {
      return res.status(404).json({ message: "Data minggu tidak ditemukan" });
    }

    const boqRows = await Boq.findAll({
      where: { project_id },
      order: [["id", "ASC"]]
    });
    const groupedWeeklyData = buildWeeklyGroupedRows(dataMinggu.data, boqRows);

    const workbook = new ExcelJS.Workbook();
    workbook.calcProperties.fullCalcOnLoad = true;
    workbook.calcProperties.forceFullCalc = true;
    const sheet = workbook.addWorksheet("Laporan Mingguan");
    sheet.properties.defaultRowHeight = TABLE_DATA_ROW_HEIGHT;

    sheet.pageSetup = {
      paperSize: 9,
      orientation: "landscape",

      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,

      horizontalCentered: true,
            // 🔥 CENTER VERTICAL
      verticalCentered: true,

      margins: {
        left: 0.15,
        right: 0.15,
        top: 0.2,
        bottom: 0.2,
        header: 0.1,
        footer: 0.1
      }
    };
    

    // =========================
    // 🔥 SET COLUMN (A-N)
    // =========================
    sheet.getColumn("A").width = 5;   // spasi kiri
    sheet.getColumn("B").width = 15;
    sheet.getColumn("C").width = 3;
    sheet.getColumn("D").width = 32;
    sheet.getColumn("E").width = 32;   // padding kanan client

    sheet.getColumn("F").width = 10;   // padding kiri konsultan
    sheet.getColumn("G").width = 17;
    sheet.getColumn("H").width = 15;
    sheet.getColumn("I").width = 15;
    sheet.getColumn("J").width = 15;

    sheet.getColumn("K").width = 15;   // padding kiri kontraktor
    sheet.getColumn("L").width = 20;
    sheet.getColumn("M").width = 20;
    sheet.getColumn("N").width = 35;

    // =========================
    // 🔥 HEADER TITLE
    // =========================
    sheet.mergeCells("A1:E1");
    sheet.mergeCells("F1:J1");
    sheet.mergeCells("K1:N1");

    sheet.getCell("A1").value = "CLIENT";
    sheet.getCell("F1").value = "KONSULTAN PENGAWAS";
    sheet.getCell("K1").value = "KONTRAKTOR PELAKSANA";

    ["A1","F1","K1"].forEach(c => {
      sheet.getCell(c).alignment = { horizontal: "center", vertical: "middle" };
      sheet.getCell(c).font = { bold: true };
    });

    // =========================
    // 🔥 BOX LOGO
    // =========================
    sheet.mergeCells("A2:E6");
    sheet.mergeCells("F2:J6");
    sheet.mergeCells("K2:N6");

    for (let r = 2; r <= 6; r++) {
      sheet.getRow(r).height = LOGO_ROW_HEIGHT;
      sheet.getRow(r).customHeight = true;
    }

    // =========================
    // 🔥 HELPER
    // =========================
    const colWidthToPx = (w) => Math.floor((w || 8.43) * 7 + 5);
    const rowHeightToPx = (h) => Math.floor((h || 15) * 96 / 72);

    const getBoxWidthPx = (startCol, endCol) => {
      let total = 0;
      for (let c = startCol; c <= endCol; c++) {
        total += colWidthToPx(sheet.getColumn(c).width);
      }
      return total;
    };

    const getBoxHeightPx = (startRow, endRow) => {
      let total = 0;
      for (let r = startRow; r <= endRow; r++) {
        total += rowHeightToPx(sheet.getRow(r).height);
      }
      return total;
    };

  const placeLogo = (logoPath, startCol, endCol, widthPx = LOGO_WIDTH_PX) => {
    if (!logoPath) return;

    const resolvedLogoPath =
      path.join(process.cwd(), "uploads", "logos", logoPath);

    if (!fs.existsSync(resolvedLogoPath)) {
      console.warn(`Logo tidak ditemukan, dilewati: ${resolvedLogoPath}`);
      return;
    }

    const imageId = workbook.addImage({
      filename: resolvedLogoPath,
      extension: "png"
    });

    const startRow = 2;
    const endRow = 6;
    const boxW = getBoxWidthPx(startCol, endCol);
    const boxH = getBoxHeightPx(startRow, endRow);
    const offsetX = Math.max(0, (boxW - widthPx) / 2);
    const offsetY = Math.max(0, (boxH - LOGO_HEIGHT_PX) / 2);

    sheet.addImage(imageId, {
      tl: {
        col: startCol - 1,
        row: startRow - 1,
        nativeColOff: Math.round(offsetX * 9525),
        nativeRowOff: Math.round(offsetY * 9525)
      },
      ext: {
        width: widthPx,
        height: LOGO_HEIGHT_PX
      }
    });
  };

    // =========================
    // 🔥 PASANG LOGO
    // =========================
  placeLogo(project.logo_client, 2, 5);
  placeLogo(project.logo_konsultan, 7, 10, LOGO_KONSULTAN_WIDTH_PX);
  placeLogo(project.logo_kontraktor, 12, 14);

    // =========================
    // 🔥 BORDER HEADER
    // =========================
    for (let r = 1; r <= 6; r++) {
      for (let c = 1; c <= 14; c++) {
        sheet.getRow(r).getCell(c).border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" }
        };
      }
    }

    // =========================
    // 🔥 INFO PROJECT
    // =========================
    let row = 8;

    const formatTanggal = (date) => {
      if (!date) return "-";

      const d = new Date(date);

      return d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "Asia/Makassar" // 🔥 penting (Bali/WITA)
      });
    };

  const addLabel = (label, value, isMultiLine = false) => {
  // LABEL
  sheet.getCell(`A${row}`).value = label;
  sheet.getCell(`A${row}`).font = { bold: true };
  sheet.getCell(`A${row}`).alignment = { vertical: "top" };

  // TITIK DUA
  sheet.getCell(`C${row}`).value = ":";

  const val = value ? String(value).toUpperCase() : "-";

  if (isMultiLine) {
    const words = val.split(" ");
    let line = "";
    let lines = [];

    // 🔥 susun kalimat berdasarkan lebar (bukan potong paksa)
    words.forEach(word => {
      if ((line + word).length > 80) { // 🔥 ini sesuaikan lebar D–G
        lines.push(line.trim());
        line = word + " ";
      } else {
        line += word + " ";
      }
    });

    if (line) lines.push(line.trim());

    // 🔥 tulis ke beberapa row
    lines.forEach((text, i) => {
      if (i > 0) row++;

      sheet.mergeCells(`D${row}:I${row}`);
      const cell = sheet.getCell(`D${row}`);

      cell.value = text;
      cell.alignment = {
        horizontal: "left",
        vertical: "top"
      };
    });

  } else {
    const cell = sheet.getCell(`D${row}`);
    cell.value = val;
    cell.alignment = {
      horizontal: "left",
      vertical: "middle"
    };
  }

  
  row++;
};


    addLabel(" KEGIATAN", project.kegiatan);
    addLabel(" SUB KEGIATAN", project.sub_kegiatan);
    addLabel(" PEKERJAAN", getProjectExportName(project), true);
    addLabel(" NO KONTRAK", project.no_kontrak);
    addLabel(" TANGGAL KONTRAK", formatTanggal(project.tgl_kontrak));
    addLabel(" NO SPMK", project.no_spmk);
    addLabel(" TANGGAL SPMK", formatTanggal(project.tgl_spmk));
    addLabel(" KONTRAKTOR", project.kontraktor);
    addLabel(" KONSULTAN", project.konsultan);
    addLabel(" WAKTU", `${project.waktu_pelaksanaan} Hari`);
    addLabel(
      " NILAI",
      `Rp ${Number(project.nilai_kontrak || 0).toLocaleString("id-ID")}`
    );
    addLabel(" LOKASI", project.lokasi);
    addLabel(" TAHUN", project.tahun);


for (let r = 7; r <= row; r++) {

  const cell = sheet.getRow(r).getCell(1);

  cell.border = {
    ...cell.border,

    left: {
      style: "thin"
    }
  };

}

  // =========================
  // 🔥 INFO KANAN (ANTI ERROR)
  // =========================

const titleStartRow = 7;
const titleEndRow = 10;

// 🔥 merge
try {
  sheet.mergeCells(`J${titleStartRow}:N${titleEndRow}`);
} catch (e) {}

const cell = sheet.getCell(`J${titleStartRow}`);
cell.value = "LAPORAN MINGGUAN";

// 🔥 style text
cell.font = {
  bold: true,
  size: 14
};

cell.alignment = {
  horizontal: "center",
  vertical: "middle"
};

// =========================
// 🔥 BORDER FULL KOTAK
// =========================

// 🔥 atas & bawah
for (let c = 10; c <= 14; c++) {

  // atas (row 7)
  sheet.getRow(titleStartRow).getCell(c).border = {
    top: { style: "thin" }
  };

  // bawah (row 10)
  sheet.getRow(titleEndRow).getCell(c).border = {
    bottom: { style: "thin" }
  };
}

// 🔥 kiri & kanan
for (let r = titleStartRow; r <= titleEndRow; r++) {

  // kiri (J)
  sheet.getRow(r).getCell(10).border = {
    ...sheet.getRow(r).getCell(10).border,
    left: { style: "thin" }
  };

  // kanan (N)
  sheet.getRow(r).getCell(14).border = {
    ...sheet.getRow(r).getCell(14).border,
    right: { style: "thin" }
  };

}

let rowRight = 10 + 2;


const angkaKeHuruf = (n) => {
  const map = {
    1:"Satu",2:"Dua",3:"Tiga",4:"Empat",5:"Lima",
    6:"Enam",7:"Tujuh",8:"Delapan",9:"Sembilan",10:"Sepuluh"
  };
  return map[n] || n;
};

// 🔥 DATA DUMMY
const dataRight = [
  [
    "    MINGGU",
    `${dataMinggu.minggu_ke} (${angkaKeHuruf(dataMinggu.minggu_ke)})`
  ],
  [
    "    TANGGAL",
    `${formatTanggal(dataMinggu.tgl_awal)} s/d ${formatTanggal(dataMinggu.tgl_akhir)}`
  ],
  [
    "    WAKTU PELAKSANAAN",
    `${dataMinggu.waktu_pelaksanaan} Hari`
  ],
  [
    "    WAKTU BERJALAN",
    `${dataMinggu.waktu_berjalan} Hari`
  ],
  [
    "    SISA WAKTU",
    `${dataMinggu.sisa_waktu} Hari`
  ],
];

const startBox = rowRight;

// 🔥 LOOP
dataRight.forEach((item, index) => {

  // 🔥 LABEL (J)
  sheet.getCell(`J${rowRight}`).value = item[0];
  sheet.getCell(`J${rowRight}`).font = { bold: true };

  // 🔥 TITIK DUA (L)
  sheet.getCell(`L${rowRight}`).value = ":";
  sheet.getCell(`L${rowRight}`).alignment = {
    horizontal: "center",
    vertical: "middle"
  };

  // 🔥 VALUE (M–N)
  sheet.getCell(`M${rowRight}`).value = item[1];
  sheet.mergeCells(`M${rowRight}:N${rowRight}`);

  sheet.getCell(`M${rowRight}`).alignment = {
    horizontal: "left",
    vertical: "middle",
    wrapText: false,
    shrinkToFit: true
  };

  rowRight++;

  // 🔥 JARAK 1 BARIS (KECUALI TERAKHIR)
  if (index !== dataRight.length - 1) {
    rowRight++; // kosong
  }

});

const endBox = rowRight - 1;


// =========================
// 🔥 BORDER LUAR SAJA
// =========================

const startVertical = 7;
const endVertical = 22;

for (let r = startVertical; r <= endVertical; r++) {

  const leftCell = sheet.getRow(r).getCell(10);
  leftCell.border = {
    ...leftCell.border,
    left: { style: "thin" }
  };

  const rightCell = sheet.getRow(r).getCell(14);
  rightCell.border = {
    ...rightCell.border,
    right: { style: "thin" }
  };

}

    // =========================
    // 🔥 HEADER TABLE
    // =========================
const startRow = row + 1;

// 🔥 BARIS 1
sheet.getRow(startRow).values = [
  "NO",
  "URAIAN PEKERJAAN", "", "", "",
  "SATUAN",
  "VOLUME",
  "BOBOT (%)",
  "VOLUME YANG TELAH DIKERJAKAN", "", "",
  "PERSENTASE PENYELESAIAN TERHADAP TARGET (%)",
  "PERSENTASE BOBOT KEMAJUAN PEKERJAAN",
  "KETERANGAN"
];

// 🔥 BARIS 2 (SUB HEADER)
sheet.getRow(startRow + 1).values = [
  "",
  "", "", "", "",
  "",
  "",
  "",
  "S/D MINGGU LALU",
  "DALAM MINGGU INI",
  "S/D MINGGU INI",
  "",
  "",
  ""
];

// =========================
// 🔥 MERGE HEADER
// =========================

// NO
sheet.mergeCells(`A${startRow}:A${startRow+1}`);

// URAIAN (B–E)
sheet.mergeCells(`B${startRow}:E${startRow+1}`);

// SATUAN
sheet.mergeCells(`F${startRow}:F${startRow+1}`);

// VOLUME
sheet.mergeCells(`G${startRow}:G${startRow+1}`);

// BOBOT
sheet.mergeCells(`H${startRow}:H${startRow+1}`);

// VOLUME DIKERJAKAN (I–K)
sheet.mergeCells(`I${startRow}:K${startRow}`);

// PERSENTASE TARGET
sheet.mergeCells(`L${startRow}:L${startRow+1}`);

// PERSENTASE BOBOT
sheet.mergeCells(`M${startRow}:M${startRow+1}`);

// KETERANGAN
sheet.mergeCells(`N${startRow}:N${startRow+1}`);

[startRow, startRow + 1].forEach(r => {
  sheet.getRow(r).font = { bold: true };
  sheet.getRow(r).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true
  };
});

// =========================
// 🔥 STYLE HEADER TABLE
// =========================
const headerFill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFD9D9D9" } // abu-abu
};

const numberFill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFF2F2F2" } // 🔥 lebih pudar
};


for (let r = startRow; r <= startRow + 1; r++) {
  for (let c = 1; c <= 14; c++) {
    const cell = sheet.getRow(r).getCell(c);

    cell.fill = headerFill;
    cell.font = { bold: true, size: 10 };

    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true
    };

    cell.border = {
      // 🔥 WAJIB: semua kolom di baris atas punya garis atas
      top: r === startRow ? { style: "thin" } : undefined,

      // 🔥 bawah hanya di baris kedua
      bottom: r === startRow + 1 ? { style: "thin" } : undefined,

      // 🔥 kiri hanya kolom pertama
      left: c === 1 ? { style: "thin" } : undefined,

      // 🔥 kanan selalu ada (biar tidak double)
      right: { style: "thin" }
    };
  }
}

// 🔥 FIX GARIS ATAS HILANG
for (let c = 1; c <= 14; c++) {
  sheet.getRow(startRow).getCell(c).border.top = { style: "thin" };
}

// 🔥 FIX BORDER BAWAH KHUSUS I–K (ROW HEADER ATAS)
for (let c = 9; c <= 11; c++) { // I=9, J=10, K=11
  sheet.getRow(startRow).getCell(c).border = {
    ...sheet.getRow(startRow).getCell(c).border,
    bottom: { style: "thin" }
  };
}

// ✅ 🔥 TARUH DI SINI
sheet.getRow(startRow).height = 40;
sheet.getRow(startRow + 1).height = 40;

// =========================
// 🔥 BARIS NOMOR KOLOM
// =========================

const numberRow = startRow + 2;

// 🔥 isi manual per cell (BIAR CENTER SEMPURNA)
sheet.getRow(numberRow).getCell(1).value = 1;  // A
sheet.getRow(numberRow).getCell(2).value = 2;  // B (merge nanti)

// C D E kosong (karena merge B–E)

sheet.getRow(numberRow).getCell(6).value = 3;  // F
sheet.getRow(numberRow).getCell(7).value = 4;  // G
sheet.getRow(numberRow).getCell(8).value = 5;  // H
sheet.getRow(numberRow).getCell(9).value = 6;  // I
sheet.getRow(numberRow).getCell(10).value = 7; // J

// 🔥 WAJIB pakai ' biar tidak jadi rumus Excel
sheet.getRow(numberRow).getCell(11).value = {
  richText: [{ text: "8 = 6 + 7" }]
};

sheet.getRow(numberRow).getCell(12).value = {
  richText: [{ text: "9 = 8 / 4 x 100" }]
};

sheet.getRow(numberRow).getCell(13).value = {
  richText: [{ text: "10 = 5 x 9 / 100" }]
};

sheet.getRow(numberRow).getCell(14).value = 11; // N

// 🔥 MERGE URAIAN (B–E)
sheet.mergeCells(`B${numberRow}:E${numberRow}`);

// =========================
// 🔥 STYLE
// =========================
for (let c = 1; c <= 14; c++) {
  const cell = sheet.getRow(numberRow).getCell(c);
  cell.fill = numberFill; 


  cell.font = { bold: true, size: 9 };

  cell.alignment = {
    horizontal: "center",
    vertical: "middle"
  };

  // 🔥 FIX BORDER MERGE
  if (c >= 2 && c <= 5) {
    cell.border = {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: c === 2 ? { style: "thin" } : undefined,
      right: c === 5 ? { style: "thin" } : undefined
    };
  } else {
    cell.border = {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: c === 1 ? { style: "thin" } : undefined,
      right: { style: "thin" }
    };
  }
}

// 🔥 HEIGHT
sheet.getRow(numberRow).height = 18;


// 🔥 TRACK ROW YANG SUDAH DI-MERGE
const mergedRows = new Set();

const mergeBE = (row) => {
  if (mergedRows.has(row)) return;

  sheet.mergeCells(`B${row}:E${row}`);
  mergedRows.add(row);
};

let rowIndex = startRow + 3;
// 🔥 TAMBAHKAN DI SINI (JARAK ATAS)
sheet.getCell(`B${rowIndex}`).value = " ";
mergeBE(rowIndex);
sheet.getRow(rowIndex).height = 15;

rowIndex++; // 🔥 baru mulai data

let nomorHeader = 0;
let nomorSub = 0;
let nomorItem = 0;
let lastTipe = null;

const roman = ["I","II","III","IV","V","VI","VII","VIII","IX","X"];

groupedWeeklyData.forEach((item) => {

  // =========================
  // 🔥 HEADER
  // =========================
  if (item.tipe === "header") {

    nomorHeader++;
    nomorSub = 0;
    nomorItem = 0;

    if (nomorHeader > 1) {
      rowIndex++;
      sheet.getCell(`B${rowIndex}`).value = " ";
      mergeBE(rowIndex);
      sheet.getRow(rowIndex).height = 15;
    }

    const huruf = String.fromCharCode(64 + nomorHeader);

    sheet.getCell(`A${rowIndex}`).value = huruf;
    sheet.getCell(`B${rowIndex}`).value = item.uraian || "-";

    mergeBE(rowIndex);
    sheet.getRow(rowIndex).font = { bold: true };

    rowIndex++;
  }

  // =========================
  // 🔥 SUBHEADER
  // =========================
  else if (item.tipe === "subheader") {

    nomorSub++;
    nomorItem = 0;

    if (nomorSub > 1) {
      rowIndex++;
      sheet.getCell(`B${rowIndex}`).value = " ";
      mergeBE(rowIndex);
      sheet.getRow(rowIndex).height = 15;
    }

    sheet.getCell(`A${rowIndex}`).value = roman[nomorSub - 1] || nomorSub;
    sheet.getCell(`B${rowIndex}`).value = item.uraian || "-";

    mergeBE(rowIndex);
    sheet.getRow(rowIndex).font = { bold: true };

    rowIndex++;
  }

  // =========================
  // 🔥 ITEM
  // =========================
  else {

    if (lastTipe !== "item") {
      nomorItem = 0;
    }

    nomorItem++;

    sheet.getCell(`A${rowIndex}`).value = nomorItem;
    sheet.getCell(`B${rowIndex}`).value = item.uraian || "-";

    mergeBE(rowIndex);

    sheet.getCell(`F${rowIndex}`).value = item.satuan || "-";
    sheet.getCell(`G${rowIndex}`).value = item.total || 0;
    sheet.getCell(`H${rowIndex}`).value = item.bobot || 0;
    sheet.getCell(`I${rowIndex}`).value = item.sd_lalu || 0;
    sheet.getCell(`J${rowIndex}`).value = item.minggu_ini || 0;
    sheet.getCell(`K${rowIndex}`).value = item.sd_ini || 0;
    sheet.getCell(`L${rowIndex}`).value = item.progress_item || 0;
    sheet.getCell(`M${rowIndex}`).value = item.progres_proyek || 0;

    rowIndex++;
  }

  // 🔥 WAJIB TARUH DI SINI
  lastTipe = item.tipe;

});

// 🔥 TAMBAHKAN DI SINI (JARAK BAWAH)
sheet.getCell(`B${rowIndex}`).value = " ";
mergeBE(rowIndex);
sheet.getRow(rowIndex).height = 15;

rowIndex++;

// =========================
// 🔥 STYLE + BORDER (FIX MERGE B–E)
// =========================
for (let r = startRow + 3; r < rowIndex; r++) {
  const styledRow = sheet.getRow(r);
  styledRow.height = styledRow.height || TABLE_DATA_ROW_HEIGHT;
  styledRow.customHeight = true;

  for (let c = 1; c <= 14; c++) {

    const cell = styledRow.getCell(c);

    // =========================
    // 🔥 FIX MERGE B–E
    // =========================
    if (c >= 2 && c <= 5) {
      // 🔥 hanya border luar saja (B sampai E)
      cell.border = {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: c === 2 ? { style: "thin" } : undefined,  // hanya B
        right: c === 5 ? { style: "thin" } : undefined  // hanya E
      };
    } else {
      // 🔥 kolom lain normal
      cell.border = {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: c === 1 ? { style: "thin" } : undefined,
        right: { style: "thin" }
      };
    }

    // =========================
    // 🔥 ALIGNMENT
    // =========================
    if (c >= 2 && c <= 5) {
      cell.alignment = {
        horizontal: "left",
        vertical: "middle"
      };
    } else {
      cell.alignment = {
        horizontal: "center",
        vertical: "middle"
      };
    }
  }
}


for (let r = startRow + 3; r < rowIndex; r++) {

  const row = sheet.getRow(r);

  // 🔥 helper angka biasa
  const setNumber = (cell, val) => {

    if (!val || val === 0) {

      cell.value = null;

    } else {

      // 🔥 VALUE ASLI FULL
      cell.value = Number(val);

      // 🔥 HANYA FORMAT TAMPILAN
      cell.numFmt =
      '_-* #,##0.000_-;-* #,##0.000_-;_-* "-"??_-;_-@_-';
    }
  };

  // 🔥 helper persen (khusus progress_item)
  const setPercent = (cell, val) => {

  if (!val || Number(val) === 0) {

    cell.value = null;

  } else {

    // 🔥 bulatkan 3 digit
    cell.value = Number(Number(val).toFixed(3));

    // 🔥 format tampil
    cell.numFmt = '0.000';
  }
};

  const setCenteredNumber = (cell, val) => {
    setNumber(cell, val);
    cell.numFmt = '#,##0.000;-#,##0.000;"-"';
    cell.alignment = {
      ...(cell.alignment || {}),
      horizontal: "center",
      vertical: "middle"
    };
  };

  // =========================
  // 🔥 APPLY FORMAT
  // =========================

  setCenteredNumber(row.getCell(7), row.getCell(7).value);   // volume
  setCenteredNumber(row.getCell(8), row.getCell(8).value);   // bobot
  setCenteredNumber(row.getCell(9), row.getCell(9).value);   // sd lalu
  setCenteredNumber(row.getCell(10), row.getCell(10).value); // minggu ini
  setCenteredNumber(row.getCell(11), row.getCell(11).value); // sd ini

  setPercent(row.getCell(12), row.getCell(12).value); // progress_item
  setCenteredNumber(row.getCell(13), row.getCell(13).value);  // progres_proyek (bukan persen!)
}


// =========================
// 🔥 TOTAL BOBOT
// =========================

const totalRow = rowIndex;

// 🔥 MERGE A–G
sheet.mergeCells(`A${totalRow}:G${totalRow}`);

// 🔥 TEXT
const labelCell = sheet.getCell(`A${totalRow}`);
labelCell.value = "TOTAL BOBOT";
labelCell.font = { bold: true };
labelCell.alignment = {
  horizontal: "center",
  vertical: "middle"
};

// 🔥 SUM KOLOM H (BOBOT)
const totalCell = sheet.getCell(`H${totalRow}`);
const totalBobot = getWeeklyTotalBobot(groupedWeeklyData);

totalCell.value = {
  formula: `SUM(H${startRow + 3}:H${rowIndex - 1})`,
  result: totalBobot
};

totalCell.font = { bold: true };
totalCell.numFmt =
'_-* #,##0.000_-;-* #,##0.000_-;_-* "-"??_-;_-@_-';
totalCell.alignment = {
  horizontal: "center",
  vertical: "middle"
};

// =========================
// 🔥 BORDER
// =========================

for (let c = 1; c <= 8; c++) {
  const cell = sheet.getRow(totalRow).getCell(c);

  cell.border = {
    ...cell.border, // 🔥 PENTING (biar tidak hapus border lama)

    top: { style: "thin" },
    bottom: { style: "thin" },

    left: c === 1 ? { style: "thin" } : cell.border?.left,
    right: { style: "thin" }
  };
}


// =========================
// 🔥 BOX PERSENTASE
// =========================

const startPersenRow = totalRow;

// 🔥 DATA
const persenData = [
  ["Persentase Minggu Ini", dataMinggu.real_kumulatif],
  ["Rencana", dataMinggu.rencana_kumulatif],
  ["Deviasi", dataMinggu.deviasi],
];

// 🔥 LOOP
persenData.forEach((item, i) => {
  const r = startPersenRow + i;

  // 🔥 LABEL (K–L merge)
  sheet.mergeCells(`K${r}:L${r}`);
  const labelCell = sheet.getCell(`K${r}`);
  labelCell.value = item[0];
  labelCell.font = { bold: true };
  labelCell.alignment = {
    horizontal: "center",
    vertical: "middle"
  };

  // 🔥 VALUE (M)
  const valCell = sheet.getCell(`M${r}`);
  valCell.value = item[1] / 100; // 🔥 karena persen
  valCell.numFmt = "0.000%";
  valCell.font = { bold: true };
  valCell.alignment = {
    horizontal: "center",
    vertical: "middle"
  };

  // 🔥 KOLOM N (%)
  const persenCell = sheet.getCell(`N${r}`);
  persenCell.value = "%";
  persenCell.alignment = {
    horizontal: "center",
    vertical: "middle"
  };
});


for (let r = startPersenRow; r < startPersenRow + 3; r++) {
  for (let c = 11; c <= 14; c++) {

    const cell = sheet.getRow(r).getCell(c);

    cell.border = {
      ...cell.border, // 🔥 INI KUNCI

      top:
        r === startPersenRow
          ? { style: "thin" }
          : cell.border?.top,

      bottom:
        r === startPersenRow + 2
          ? { style: "thin" }
          : cell.border?.bottom,

      left:
        c === 11
          ? { style: "thin" }
          : cell.border?.left,

      right:
        c === 14
          ? { style: "thin" }
          : cell.border?.right
    };
  }
}




// =========================
// 🔥 AMBIL TEMPLATE
// =========================
const ttdData = await TtdTemplate.findOne({
  where: {
    project_id: project.id,
    tipe_laporan: "mingguan"
  }
});

const template = ttdData?.layout;
const safeTemplate =
  template &&
  Array.isArray(template.top) &&
  Array.isArray(template.bottom)
    ? template
    : { top: [], bottom: [] };

// =========================
// 🔥 VALIDASI
// =========================
if (!template || !Array.isArray(template.top) || !Array.isArray(template.bottom)) {
  console.warn(
    `Template TTD mingguan project ${project.id} tidak ditemukan / tidak lengkap, export PDF dilanjutkan tanpa TTD.`
  );
}

// =========================
// 🔥 POSISI
// =========================
let ttdStart = rowIndex + 5;


// =========================
// 🔥 TOP
// =========================
const maxHeaderTop = Math.max(
  0,
  ...safeTemplate.top.map(col => col.header?.length || 0)
);

const namaTopRow = ttdStart + maxHeaderTop + 4;

safeTemplate.top.forEach((col) => {

  const colCenter = col.range; // 🔥 langsung pakai dari DB

  if (!colCenter) return; // safety

  // HEADER
  (col.header || []).forEach((text, i) => {
    const cell = sheet.getCell(`${colCenter}${ttdStart + i}`);
    applyTtdCellText(cell, text);
    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: false
    };
  });

  // NAMA
  const namaCell = sheet.getCell(`${colCenter}${namaTopRow}`);
  applyTtdCellText(namaCell, col.nama, { bold: true, underline: true });
  namaCell.alignment = { horizontal: "center" };
  // JABATAN
  const jabCell = sheet.getCell(`${colCenter}${namaTopRow + 1}`);
  applyTtdCellText(jabCell, col.jabatan);
  jabCell.alignment = { horizontal: "center" };
});

// =========================
// 🔥 BOTTOM
// =========================
const bottomStart = namaTopRow + 4;

const maxHeaderBottom = Math.max(
  0,
  ...safeTemplate.bottom.map(col => col.header?.length || 0)
);

const namaBottomRow = bottomStart + maxHeaderBottom + 5;

safeTemplate.bottom.forEach((col) => {

  const colCenter = col.range;

  if (!colCenter) return;

  // HEADER
  (col.header || []).forEach((text, i) => {
    const cell = sheet.getCell(`${colCenter}${bottomStart + i}`);
    applyTtdCellText(cell, text);
    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: false
    };
  });

  // NAMA
  const namaCell = sheet.getCell(`${colCenter}${namaBottomRow}`);
  applyTtdCellText(namaCell, col.nama, { bold: true, underline: true });
  namaCell.alignment = { horizontal: "center" };

  // JABATAN
  const jabCell = sheet.getCell(`${colCenter}${namaBottomRow + 1}`);
  applyTtdCellText(jabCell, col.jabatan);
  jabCell.alignment = { horizontal: "center" };
});


// =========================
// 🔥 BORDER KOTAK TTD
// =========================
const endRow = namaBottomRow + 2;

// =========================
// 🔥 SAMBUNG BORDER KIRI
// =========================
for (let r = totalRow; r <= endRow; r++) {

  const cell = sheet.getRow(r).getCell(1);

  cell.border = {
    ...cell.border,

    left: {
      style: "thin"
    }
  };

}

// 🔥 KIRI (A) & KANAN (N)
for (let i = ttdStart - 2; i <= endRow; i++) {

  // kiri A (kolom 1)
  const leftCell = sheet.getRow(i).getCell(1);
  leftCell.border = {
    ...leftCell.border,
    left: { style: "thin" }
  };

  // kanan N (kolom 14)
  const rightCell = sheet.getRow(i).getCell(14);
  rightCell.border = {
    ...rightCell.border,
    right: { style: "thin" }
  };
}

// 🔥 GARIS ATAS (A–N)
for (let col = 1; col <= 14; col++) {
  const cell = sheet.getRow(startRow).getCell(col);

  cell.border = {
    ...cell.border,
    top: { style: "thin" }
  };
}

// 🔥 GARIS BAWAH (A–N)
for (let col = 1; col <= 14; col++) {
  const cell = sheet.getRow(endRow).getCell(col);

  cell.border = {
    ...cell.border,
    bottom: { style: "thin" }
  };
}

// =========================
// 🔥 TEMP PATH
// =========================
const tempDir = path.join(
  process.cwd(),
  "temp"
);

// 🔥 buat folder temp otomatis
if (!fs.existsSync(tempDir)) {

  fs.mkdirSync(tempDir, {
    recursive: true
  });

}

// =========================
// 🔥 FILE PATH
// =========================
const excelPath = path.join(
  tempDir,
  buildExportFilename(`Laporan_Mingguan_${minggu}`, project, "xlsx")
);

const pdfPath = path.join(
  tempDir,
  buildExportFilename(`Laporan_Mingguan_${minggu}`, project, "pdf")
);

sheet.pageSetup = {

paperSize: 9,

  orientation: "portrait",

  fitToPage: true,

  fitToWidth: 1,

  fitToHeight: 1,

  scale: 55,

  horizontalCentered: true,

  verticalCentered: true,

  margins: {
    left: 0.1,
    right: 0.1,
    top: 0.1,
    bottom: 0.1,
    header: 0,
    footer: 0
  }

};

// =========================
// 🔥 SHEET LAMPIRAN
// =========================
const lampiranSheet =
  workbook.addWorksheet(
    "Lampiran Dokumentasi"
  );

// 🔥 SETUP PAGE
lampiranSheet.pageSetup = {

  paperSize: 9,

  orientation: "portrait",

  fitToPage: true,

  fitToWidth: 1,

  fitToHeight: 0,

  horizontalCentered: true,

  verticalCentered: false,

  margins: {
    left: 0.1,
    right: 0.1,
    top: 0.1,
    bottom: 0.1,
    header: 0,
    footer: 0
  }

};

// 🔥 COLUMN FOTO
for (let i = 1; i <= 14; i++) {

  lampiranSheet.getColumn(i).width = 15;

}


// =========================
// 🔥 FOTO MINGGUAN
// =========================
const photos =
await DailyProgress.findAll({

  where: {
    project_id,

    tanggal: {
      [Op.between]: [
        dataMinggu.tgl_awal,
        dataMinggu.tgl_akhir
      ]
    }
  },

  include: [
    {
      model: DailyProgressPhoto,
      as: "photos"
    },
    {
      model: Boq,
      as: "boq"
    }
  ]
});

rowIndex = 1;


// =========================
// 🔥 JUDUL
// =========================
lampiranSheet.mergeCells(`A${rowIndex}:N${rowIndex}`);

const titleCell =
    lampiranSheet.getCell(`A${rowIndex}`);

titleCell.value =
  "LAMPIRAN II - DOKUMENTASI";

titleCell.font = {
  bold: true,
  size: 14
};

titleCell.alignment = {
  horizontal: "center",
  vertical: "middle"
};

titleCell.border = {
  top: { style: "thin" },
  bottom: { style: "thin" },
  left: { style: "thin" },
  right: { style: "thin" }
};

lampiranSheet.getRow(rowIndex).height = 25;

rowIndex += 2;

// =========================
// 🔥 GABUNG FOTO
// =========================
const allPhotos = [];

for (const progress of photos) {

  if (
    !progress.photos ||
    progress.photos.length === 0
  ) continue;

  for (const p of progress.photos) {

    allPhotos.push({

      photo: p,

      itemName:
        progress.boq?.uraian || "-"

    });

  }
}

// =========================
// 🔥 LOOP FOTO
// =========================
for (
  let i = 0;
  i < allPhotos.length;
  i++
) {

  const data =
    allPhotos[i];

  const imagePath =
    data.photo.photo_url;

  if (
    !fs.existsSync(imagePath)
  ) continue;

  const ext =
    path.extname(imagePath)
    .replace(".", "");

  const imageId =
    workbook.addImage({

      filename: imagePath,
      extension: ext

    });

  // =====================
  // 🔥 KIRI / KANAN
  // =====================
  const isLeft =
    i % 2 === 0;

  const rowGroup =
    Math.floor(i / 2);

  const imageRow =
    rowIndex + (rowGroup * 24);

  // =====================
  // 🔥 FOTO
  // =====================
  lampiranSheet.addImage(
    imageId,
    {

      tl: {
        col:
          isLeft
            ? 0
            : 8,

        row: imageRow
      },

      br: {

        col:
          isLeft
            ? 7
            : 14,

        row:
          imageRow + 18
      },

      editAs: "oneCell"
    }
  );

  // =====================
  // 🔥 CAPTION
  // =====================
  const captionRow =
    imageRow + 19;

  const startLetter =
    isLeft
      ? "A"
      : "I";

  const endLetter =
    isLeft
      ? "G"
      : "N";

  lampiranSheet.mergeCells(
    `${startLetter}${captionRow}:${endLetter}${captionRow}`
  );

  const capCell =
    lampiranSheet.getCell(
      `${startLetter}${captionRow}`
    );

  capCell.value =
    data.itemName.toUpperCase();

  capCell.font = {
    bold: true,
    size: 10
  };

  capCell.alignment = {
    horizontal: "center",
    vertical: "middle"
  };
}

// =========================
// 🔥 ROW TERAKHIR FOTO
// =========================
const finalPhotoRow =
  rowIndex +
  (
    Math.ceil(
      allPhotos.length / 2
    ) * 24
  ) + 5;

  lampiranSheet.pageSetup.printArea =
  `A1:N${finalPhotoRow}`;
// =========================
// 🔥 SAVE EXCEL
// =========================
await workbook.xlsx.writeFile(excelPath);

// =========================
// 🔥 READ EXCEL
// =========================
const excelBuffer = fs.readFileSync(
  excelPath
);

// =========================
// 🔥 CONVERT PDF
// =========================
libre.convert(
  excelBuffer,
  ".pdf",
  undefined,

  (err, pdfBuffer) => {

    if (err) {

      console.log(err);

      return res.status(500).json({
        message: "Gagal convert PDF"
      });

    }

    // =========================
    // 🔥 SAVE PDF
    // =========================
    fs.writeFileSync(
      pdfPath,
      pdfBuffer
    );

    // =========================
    // 🔥 DOWNLOAD
    // =========================
    res.download(
      pdfPath,
      buildExportFilename(`Laporan_Mingguan_${minggu}`, project, "pdf"),
      () => {

        // 🔥 HAPUS TEMP
        if (fs.existsSync(excelPath)) {
          fs.unlinkSync(excelPath);
        }

        if (fs.existsSync(pdfPath)) {
          fs.unlinkSync(pdfPath);
        }

      }
    );

  }
);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};
