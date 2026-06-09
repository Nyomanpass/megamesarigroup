import ExcelJS from "exceljs";
import { getDailyReport } from "./ReportController.js";
import { Project } from "../models/ProjectModel.js";
import libre from "libreoffice-convert";
import fs from "fs";
import path from "path";
import { buildExportFilename } from "../utils/exportFilename.js";
import { applyTtdCellText } from "../utils/ttdStyle.js";
import { ProjectItem } from "../models/ProjekItem.js";
import { Boq } from "../models/BoqModel.js";
import { DailyPlan } from "../models/DailyPlanModel.js";
import { TtdTemplate } from "../models/TtdTemplate.js";
import sharp from "sharp";

const CM_TO_POINTS = 28.3464567;
const TABLE_DATA_ROW_HEIGHT = 0.6 * CM_TO_POINTS;
const LOGO_ROW_HEIGHT = 16;
const LOGO_BOX_PADDING_PX = 4;
const LOGO_TARGET_HEIGHT_PX = Math.round(1.35 * 96);
const LOGO_KONSULTAN_TL_COL = 10.05; // K = 10
const LOGO_KONSULTAN_TL_ROW = 2; // row 3
const LOGO_KONSULTAN_WIDTH_PX = Math.round(4.89 * 96);
const LOGO_KONSULTAN_HEIGHT_PX = Math.round(1.24 * 96);
const LOGO_KONTRAKTOR_TL_COL = 16.05; // Q = 16
const LOGO_KONTRAKTOR_TL_ROW = 2; // row 3


const getProjectExportName = (project) =>
  project?.projeknama_import ||
  project?.nama_import ||
  project?.pekerjaan ||
  "-";

const getImageExtension = (filename) => {
  const ext = path.extname(filename || "").toLowerCase();

  if (ext === ".jpg" || ext === ".jpeg") {
    return "jpeg";
  }

  if (ext === ".gif") {
    return "gif";
  }

  return "png";
};

const getContainedImageSize = async (
  filename,
  maxWidth,
  maxHeight
) => {
  const metadata = await sharp(filename).metadata();
  const originalWidth = Number(metadata.width || maxWidth);
  const originalHeight = Number(metadata.height || maxHeight);
  const scale = Math.min(
    maxWidth / originalWidth,
    maxHeight / originalHeight
  );

  return {
    width: Math.round(originalWidth * scale),
    height: Math.round(originalHeight * scale)
  };
};

const applyDailyReportColumnWidths = (sheet) => {
  sheet.getColumn("A").width = 25;
  sheet.getColumn("B").width = 4;
  sheet.getColumn("C").width = 35;
  sheet.getColumn("D").width = 5;
  sheet.getColumn("E").width = 10;
  sheet.getColumn("F").width = 10;
  sheet.getColumn("G").width = 40;
  sheet.getColumn("H").width = 10;
  sheet.getColumn("I").width = 10;
  sheet.getColumn("J").width = 10;
  sheet.getColumn("K").width = 25;
  sheet.getColumn("L").width = 25;
  sheet.getColumn("M").width = 10;
  sheet.getColumn("N").width = 10;
  sheet.getColumn("O").width = 10;
  sheet.getColumn("P").width = 10;
  sheet.getColumn("Q").width = 20;
  sheet.getColumn("R").width = 20;
  sheet.getColumn("S").width = 20;
  sheet.getColumn("T").width = 10;
  sheet.getColumn("U").width = 10;
};

const getLogoOffsetX = (
  boxWidth,
  logoWidth,
  shiftX = 0
) => {
  const maxOffset = Math.max(
    0,
    boxWidth - logoWidth - LOGO_BOX_PADDING_PX
  );

  return Math.min(
    maxOffset,
    Math.max(
      LOGO_BOX_PADDING_PX,
      (boxWidth - logoWidth) / 2 + shiftX
    )
  );
};

const getLogoMaxWidth = (
  boxWidth,
  shiftX = 0
) => Math.max(
  80,
  boxWidth -
    LOGO_BOX_PADDING_PX * 2 -
    Math.abs(shiftX) * 2
);

const getLogoOffsetY = (
  boxHeight,
  logoHeight,
  shiftY = 0
) => {
  const maxOffset = Math.max(
    0,
    boxHeight - logoHeight - LOGO_BOX_PADDING_PX
  );

  return Math.min(
    maxOffset,
    Math.max(
      LOGO_BOX_PADDING_PX,
      (boxHeight - logoHeight) / 2 + shiftY
    )
  );
};

export const exportDailyReportExcel = async (req, res) => {
  try {
    const { day } = req.query;
    const project = await Project.findByPk(req.params.project_id);

    if (!project) {
      return res.status(404).json({ message: "Project tidak ditemukan" });
    }

    // =========================
    // 🔥 AMBIL DATA DARI API KAMU
    // =========================
    let fakeRes = {
      jsonData: null,
      json(data) {
        this.jsonData = data;
      }
    };

    const formatDate = (date) => {
      if (!date) return "-";
      return new Date(date).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric"
      });
    };


    await getDailyReport(req, fakeRes);
    const report = fakeRes.jsonData;
    const reportData = Array.isArray(report?.data) ? report.data : [];
    const totalPekerja = Array.isArray(report?.total_pekerja) ? report.total_pekerja : [];
    const totalPeralatan = Array.isArray(report?.total_peralatan) ? report.total_peralatan : [];
    const totalMaterial = Array.isArray(report?.total_material) ? report.total_material : [];

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Laporan Harian");
    sheet.properties.defaultRowHeight = TABLE_DATA_ROW_HEIGHT;
    applyDailyReportColumnWidths(sheet);
// =========================
// 🔥 HEADER ATAS
// =========================

const info = reportData[0] || {};
let row = 2;

// =========================
// 🔥 KIRI (PROJECT - DIGABUNG KE SAMPING)
// =========================
const addLabel = (
  label,
  value,
  isMultiLine = false
) => {

  // LABEL
  sheet.getCell(`A${row}`).value = label;

  sheet.getCell(`A${row}`).font = {
    bold: true
  };

  sheet.getCell(`A${row}`).alignment = {
    vertical: "top"
  };

  // TITIK DUA
  sheet.getCell(`B${row}`).value = ":";

  // VALUE
  const val =
    value
      ? String(value).toUpperCase()
      : "-";

  // =========================
  // 🔥 MULTILINE
  // =========================
  if (isMultiLine) {

    const words = val.split(" ");

    let line = "";

    let lines = [];

    words.forEach(word => {

      if ((line + word).length > 70) {

        lines.push(line.trim());

        line = word + " ";

      } else {

        line += word + " ";

      }

    });

    if (line) {
      lines.push(line.trim());
    }

    // 🔥 TULIS
    lines.forEach((text, i) => {

      if (i > 0) row++;

      // 🔥 JANGAN MERGE
      const cell =
        sheet.getCell(`C${row}`);

      cell.value = text;

      cell.alignment = {
        horizontal: "left",
        vertical: "top",
        wrapText: true
      };

    });

  }

  // =========================
  // 🔥 NORMAL
  // =========================
  else {

    const cell =
      sheet.getCell(`C${row}`);

    cell.value = val;

    cell.alignment = {
      horizontal: "left",
      vertical: "middle"
    };

  }

  row++;
};

addLabel("  KEGIATAN", project.kegiatan);
addLabel("  SUB KEGIATAN", project.sub_kegiatan);
addLabel("  PEKERJAAN", getProjectExportName(project), true);
addLabel("  NOMOR KONTRAK",project.no_kontrak);
addLabel("  TANGGAL KONTRAK",formatDate(project.tgl_kontrak));
addLabel("  NOMOR SPMK",project.no_spmk);
addLabel("  TANGGAL SPMK",formatDate(project.tgl_spmk));
addLabel("  KONTRAKTOR",project.kontraktor);
addLabel("  KONSULTAN",project.konsultan);
addLabel("  WAKTU PELAKSANAAN",`${project.waktu_pelaksanaan} Hari`);
addLabel("  NILAI KONTRAK",`Rp. ${Number(project.nilai_kontrak).toLocaleString("id-ID")}`);
addLabel("  LOKASI",project.lokasi);
addLabel("  TAHUN", project.tahun);


// =========================
// 🔥 BORDER ATAS KIRI
// =========================
for (let j = 1; j <= 9; j++) {

  const cell =
    sheet.getRow(1).getCell(j);

  cell.border = {

    ...cell.border,

    top: {
      style: "thin"
    }

  };

}


// =========================
// 🔥 HEADER KANAN (FULL U)
// =========================
// =========================
// 🔥 JUDUL ATAS
// =========================
sheet.mergeCells("J1:O1"); // kiri (J-O)
sheet.mergeCells("P1:U1"); // kanan (P-U)

sheet.getCell("J1").value = "KONSULTAN PENGAWAS";
sheet.getCell("P1").value = "KONTRAKTOR PELAKSANA";

["J1", "P1"].forEach(cell => {
  sheet.getCell(cell).alignment = {
    horizontal: "center",
    vertical: "middle"
  };
  sheet.getCell(cell).font = { bold: true };
});

// =========================
// 🔥 BOX LOGO
// =========================
sheet.mergeCells("J2:O8"); // kiri FULL
sheet.mergeCells("P2:U8"); // kanan FULL

for (let r = 2; r <= 8; r++) {
  sheet.getRow(r).height = LOGO_ROW_HEIGHT;
  sheet.getRow(r).customHeight = true;
}

// =========================
// 🔥 LOGO
// =========================
try {

// helper: konversi column width → pixel (perkiraan Excel)
const colWidthToPx = (w) => Math.floor((w || 8.43) * 7 + 5);
// helper: konversi row height → pixel
const rowHeightToPx = (h) => Math.floor((h || 15) * 96 / 72);

// hitung lebar box logo dalam pixel
const getBoxWidthPx = (sheet, startCol, endCol) => {
  let total = 0;
  for (let c = startCol; c <= endCol; c++) {
    total += colWidthToPx(sheet.getColumn(c).width);
  }
  return total;
};

// hitung tinggi box row 2–8
const getBoxHeightPx = (sheet, startRow, endRow) => {
  let total = 0;
  for (let r = startRow; r <= endRow; r++) {
    total += rowHeightToPx(sheet.getRow(r).height);
  }
  return total;
};

const getImageTopLeft = (
  sheet,
  startCol,
  startRow,
  offsetX,
  offsetY
) => {
  let col = startCol;
  let row = startRow;
  let remainingX = offsetX;
  let remainingY = offsetY;

  let colWidth = colWidthToPx(sheet.getColumn(col).width);
  let rowHeight = rowHeightToPx(sheet.getRow(row).height);

  while (remainingX > colWidth) {
    remainingX -= colWidth;
    col++;
    colWidth = colWidthToPx(sheet.getColumn(col).width);
  }

  while (remainingY > rowHeight) {
    remainingY -= rowHeight;
    row++;
    rowHeight = rowHeightToPx(sheet.getRow(row).height);
  }

  return {
    col: col - 1 + remainingX / colWidth,
    row: row - 1 + remainingY / rowHeight
  };
};

// =========================
// 🔵 LOGO KONSULTAN (CENTER J–N)
// =========================
if (project.logo_konsultan) {
  const logoPath = path.join(process.cwd(), "uploads", "logos", project.logo_konsultan);
  const logoKonsultan = workbook.addImage({
    filename: logoPath,
    extension: getImageExtension(logoPath)
  });

sheet.addImage(logoKonsultan, {
  tl: {
    col: LOGO_KONSULTAN_TL_COL,
    row: LOGO_KONSULTAN_TL_ROW
  },
  ext: {
    width: LOGO_KONSULTAN_WIDTH_PX,
    height: LOGO_KONSULTAN_HEIGHT_PX
  }
});
}

// =========================
// 🔵 LOGO KONTRAKTOR (CENTER P–U)
// =========================
if (project.logo_kontraktor) {
  const logoPath = path.join(process.cwd(), "uploads", "logos", project.logo_kontraktor);
  const logoKontraktor = workbook.addImage({
    filename: logoPath,
    extension: getImageExtension(logoPath)
  });

  const excelStartCol = 17; // Q
  const excelEndCol   = 21; // U
  const startRow = 2;
  const endRow   = 8;
  const boxW = getBoxWidthPx(sheet, excelStartCol, excelEndCol);
  const logoSize = await getContainedImageSize(
    logoPath,
    boxW - LOGO_BOX_PADDING_PX * 2,
    LOGO_TARGET_HEIGHT_PX
  );

sheet.addImage(logoKontraktor, {
  tl: {
    col: LOGO_KONTRAKTOR_TL_COL,
    row: LOGO_KONTRAKTOR_TL_ROW
  },
  ext: {
    width: logoSize.width,
    height: logoSize.height
  }
});
}

} catch (error) {
  console.log("❌ Logo error:", error.message);
}

// =========================
// 🔥 BORDER HEADER (FULL TANPA BOLONG)
// =========================
for (let i = 1; i <= 8; i++) {
  for (let j = 10; j <= 21; j++) {
    sheet.getRow(i).getCell(j).border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" }
    };
  }
}

const dailyPlan = await DailyPlan.findOne({
  where: {
    project_id: project.id,
    hari_ke: day
  }
});

// =========================
// 🔥 MERGE
// =========================
sheet.mergeCells("J9:U11");
sheet.mergeCells("J15:U15");
sheet.mergeCells("J16:U16");


// =========================
// 🔥 ISI
// =========================
const titleCell =
  sheet.getCell("J9");

titleCell.value =
  "LAPORAN HARIAN";

titleCell.font = {

  bold: true,

  size: 20

};

// 🔥 CENTER TENGAH
titleCell.alignment = {

  horizontal: "center",

  vertical: "middle"

};


// MINGGU
sheet.getCell("J12").value = "   MINGGU";
sheet.getCell("K12").value = ":";
sheet.mergeCells("L12:U12");
sheet.getCell("L12").value = dailyPlan?.minggu_ke
  ? `${dailyPlan.minggu_ke}`
  : "-";

// HARI
sheet.getCell("J13").value = "   HARI";
sheet.getCell("K13").value = ":";
sheet.mergeCells("L13:U13");
sheet.getCell("L13").value =
  new Date(info.tanggal || new Date())
    .toLocaleDateString("id-ID", { weekday: "long" });

// TANGGAL
sheet.getCell("J14").value = "   TANGGAL";
sheet.getCell("K14").value = ":";
sheet.mergeCells("L14:U14");
sheet.getCell("L14").value = formatDate(info.tanggal);

sheet.getCell("J15").value = " ";

// =========================
// 🔥 STYLE
// =========================
sheet.getCell("J10").font = { bold: true };

for (let i = 12; i <= 14; i++) {
  sheet.getCell(`J${i}`).alignment = {
    horizontal: "left",
    vertical: "middle"
  };
}

// =========================
// 🔥 BORDER LUAR FULL
// =========================

// 🔥 KIRI & KANAN
for (let i = 9; i <= 16; i++) {
  // =========================
  // 🔥 KIRI (J)
  // =========================
  const leftCell =
    sheet.getRow(i).getCell(10);

  leftCell.border = {

    ...leftCell.border,

    left: {
      style: "thin"
    }

  };

  // =========================
  // 🔥 KANAN (U)
  // =========================
  const rightCell =
    sheet.getRow(i).getCell(21);

  rightCell.border = {

    ...rightCell.border,

    right: {
      style: "thin"
    }

  };

}

// =========================
// 🔥 GARIS ATAS
// =========================
for (let j = 10; j <= 21; j++) {

  const cell =
    sheet.getRow(9).getCell(j);

  cell.border = {

    ...cell.border,

    top: {
      style: "thin"
    }

  };

}

// =========================
// 🔥 GARIS BAWAH
// =========================
for (let j = 10; j <= 21; j++) {

  const cell =
    sheet.getRow(16).getCell(j);

  cell.border = {

    ...cell.border,

    bottom: {
      style: "thin"
    }

  };

}




    // =========================
    // 🔥 HEADER TABEL
    // =========================
    let startRow = 17;

    const headerFill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFD9D9D9" } // abu-abu
    };

    ["A","B","G","J","Q"].forEach(col => {
      const cell = sheet.getCell(`${col}${startRow}`);

      cell.fill = headerFill;
      cell.font = { bold: true };

      cell.alignment = {
        horizontal: "center",
        vertical: "middle"
      };
    });

   for (let col = 2; col <= 21; col++) {
      const cell = sheet.getRow(startRow + 1).getCell(col);

      cell.fill = headerFill;
      cell.font = { bold: true, size: 10 };

      cell.alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: false
      };
    }

    for (let col = 1; col <= 21; col++) {
      const cell1 = sheet.getRow(startRow).getCell(col);
      const cell2 = sheet.getRow(startRow + 1).getCell(col);

      [cell1, cell2].forEach(cell => {
        cell.border = {
          top: { style: "medium" },
          left: { style: "thin" },
          bottom: { style: "medium" },
          right: { style: "thin" }
        };
      });
    }
    sheet.getRow(startRow).height = 25;       
    sheet.getRow(startRow + 1).height = 22;  
    sheet.mergeCells(`A${startRow}:A${startRow + 1}`);
    sheet.mergeCells(`B${startRow}:F${startRow}`);
    sheet.mergeCells(`G${startRow}:I${startRow}`);
    sheet.mergeCells(`J${startRow}:P${startRow}`);
    sheet.mergeCells(`Q${startRow}:U${startRow}`);

    sheet.getCell(`A${startRow}`).value = "NO";
    sheet.getCell(`B${startRow}`).value = "TENAGA KERJA";
    sheet.getCell(`G${startRow}`).value = "PERALATAN";
    sheet.getCell(`J${startRow}`).value = "PENGGUNAAN MATERIAL";
    sheet.getCell(`Q${startRow}`).value = "PEKERJAAN";

    // SUB HEADER
    // 🔥 JABATAN FULL LEBAR
    sheet.mergeCells(`B${startRow + 1}:D${startRow + 1}`);
    sheet.getCell(`B${startRow + 1}`).value = "JABATAN";
    sheet.getCell(`E${startRow + 1}`).value = "JUMLAH";
    sheet.getCell(`F${startRow + 1}`).value = "SAT";

    sheet.getCell(`G${startRow + 1}`).value = "JENIS ALAT";
    sheet.getCell(`H${startRow + 1}`).value = "JUMLAH";
    sheet.getCell(`I${startRow + 1}`).value = "SAT";
    
    sheet.mergeCells(`J${startRow + 1}:L${startRow + 1}`);
    sheet.getCell(`J${startRow + 1}`).value = "JENIS MATERIAL";
    sheet.getCell(`M${startRow + 1}`).value = "VOL";
    sheet.getCell(`N${startRow + 1}`).value = "SAT";
    sheet.getCell(`O${startRow + 1}`).value = "DITERIMA";
    sheet.getCell(`P${startRow + 1}`).value = "DITOLAK";

    sheet.mergeCells(`Q${startRow + 1}:S${startRow + 1}`);
    sheet.getCell(`Q${startRow + 1}`).value = "URAIAN";
    sheet.getCell(`T${startRow + 1}`).value = "VOL";
    sheet.getCell(`U${startRow + 1}`).value = "SAT";
    


    sheet.getColumn("A").width = 25;

    sheet.getColumn("B").width = 4;
    sheet.getColumn("C").width = 35;
    sheet.getColumn("D").width = 5;

    sheet.getColumn("E").width = 10;
    sheet.getColumn("F").width = 10;

    sheet.getColumn("G").width = 40;
    sheet.getColumn("H").width = 10;
    sheet.getColumn("I").width = 10;
    sheet.getColumn("J").width = 25;
    sheet.getColumn("K").width = 25;
    sheet.getColumn("L").width = 25;

    sheet.getColumn("M").width = 10; 
    sheet.getColumn("N").width = 10; 
    sheet.getColumn("O").width = 10;  
    sheet.getColumn("P").width = 10; 
    sheet.getColumn("Q").width = 20;  
    sheet.getColumn("R").width = 20;  
    sheet.getColumn("S").width = 20;  
    sheet.getColumn("T").width = 10;  
    sheet.getColumn("U").width = 10;   

    

    // =========================
    // 🔥 ISI DATA
    // =========================
    const items = await ProjectItem.findAll({
      where: {
        project_id: project.id,
        tipe: "TENAGA"
      }
    });
    const alatItems = await ProjectItem.findAll({
      where: {
        project_id: project.id,
        tipe: "ALAT"
      }
    });

    const boqItems = await Boq.findAll({
      where: { project_id: project.id }
    });

    const boqMap = {};
    boqItems.forEach(b => {
      boqMap[b.id] = b;
    });

    function getHierarchy(boqMap, boqItem) {
        let parent = null;
        let sub = null;

        let current = boqItem;

        while (current) {

          if (current.tipe === "subheader") {
            sub = current.uraian;
          }

          if (current.tipe === "header") {
            parent = current.uraian;
          }

          current = boqMap[current.parent_id];
        }

        return { parent, sub };
      }

    let rowIndex = startRow + 2;      // kiri
    let pekerjaanRow = startRow + 2;  // kanan

    // 🔥 hitung kebutuhan data real
    const totalRowsNeeded = Math.max(
      totalPekerja.length,
      totalPeralatan.length,
      totalMaterial.length,
      reportData.length
    );
    
  const minRows = 30;
  const bufferRows = 10;

  let maxRows;

  if (totalRowsNeeded <= minRows) {
    maxRows = minRows;
  } else {
    maxRows = totalRowsNeeded + bufferRows;
  }

    let lastParent = null;
    let lastSubParent = null;
    let isFirstGroup = true;

    for (let i = 0; i < maxRows; i++) {
      const pekerja = totalPekerja[i];
      const alat = totalPeralatan[i];
      const material = totalMaterial[i];
      const pekerjaan = reportData[i];

      sheet.getCell(`A${rowIndex}`).value = i + 1;
      sheet.mergeCells(`B${rowIndex}:D${rowIndex}`);
      sheet.mergeCells(`J${rowIndex}:L${rowIndex}`);

      // TENAGA
      if (pekerja) {
        sheet.getCell(`B${rowIndex}`).value = pekerja.nama;
        const item = items.find(i => i.nama === pekerja.nama);

        let value = pekerja.total;
        if (pekerja.total > 0 && item?.terbilang) {
          value = item.terbilang;
        }
        sheet.getCell(`E${rowIndex}`).value = value;
        sheet.getCell(`E${rowIndex}`).numFmt = "0.00";

        sheet.getCell(`F${rowIndex}`).value = pekerja.satuan;
      }

      // ALAT
      if (alat) {
        sheet.getCell(`G${rowIndex}`).value = alat.nama;

        // 🔥 cari dari ProjectItem
        const item = alatItems.find(i => i.nama === alat.nama);

        let value = alat.total;

        // 🔥 pakai terbilang kalau ada
        if (alat.total > 0 && item?.terbilang != null) {
          value = item.terbilang;
        }

        sheet.getCell(`H${rowIndex}`).value = value;

        // 🔥 format 2 angka
        sheet.getCell(`H${rowIndex}`).numFmt = "0.00";

        sheet.getCell(`I${rowIndex}`).value = alat.satuan;
      }

      // MATERIAL
      if (material) {
        sheet.getCell(`J${rowIndex}`).value = material.nama;
        sheet.getCell(`M${rowIndex}`).value = material.total;
        sheet.getCell(`M${rowIndex}`).numFmt = "0.00";
        sheet.getCell(`N${rowIndex}`).value = material.satuan;
      }

      // PEKERJAAN
       if (pekerjaan) {

  if (!pekerjaan.boq_id) {
    rowIndex++;
    continue;
  }

  const boqItem = boqMap[pekerjaan.boq_id];
  if (!boqItem) {
    rowIndex++;
    continue;
  }

  const { parent, sub } = getHierarchy(boqMap, boqItem);

  // HEADER
  if (parent && parent !== lastParent) {

    // 🔥 kasih jarak sebelum header baru (kecuali pertama)
    if (!isFirstGroup) {
      pekerjaanRow++; // ⬅️ ini baris kosong
    }

    sheet.getCell(`Q${pekerjaanRow}`).value = parent;
    sheet.getCell(`Q${pekerjaanRow}`).font = { bold: true };
    if (!sheet.getCell(`Q${pekerjaanRow}`).isMerged) {
      sheet.mergeCells(`Q${pekerjaanRow}:S${pekerjaanRow}`);
    }

    pekerjaanRow++;

    lastParent = parent;
    lastSubParent = null;
    isFirstGroup = false;
  }

  // SUBHEADER
  if (sub && sub !== lastSubParent) {
    sheet.getCell(`Q${pekerjaanRow}`).value = sub;
    sheet.getCell(`Q${pekerjaanRow}`).font = { bold: true };
    if (!sheet.getCell(`Q${pekerjaanRow}`).isMerged) {
      sheet.mergeCells(`Q${pekerjaanRow}:S${pekerjaanRow}`);
    }

    pekerjaanRow++;
    lastSubParent = sub;
  }

  // ITEM
  if (!sheet.getCell(`Q${pekerjaanRow}`).isMerged) {
    sheet.mergeCells(`Q${pekerjaanRow}:S${pekerjaanRow}`);
  }
  sheet.getCell(`Q${pekerjaanRow}`).value = pekerjaan.uraian;

  sheet.getCell(`T${pekerjaanRow}`).value = pekerjaan.volume;
  sheet.getCell(`T${pekerjaanRow}`).numFmt = "#,##0.000";

  sheet.getCell(`U${pekerjaanRow}`).value = pekerjaan.satuan;

  pekerjaanRow++;
}
      rowIndex++;
    }

    // header lebih tinggi
sheet.getRow(startRow).height = 30;
sheet.getRow(startRow + 1).height = 28;

// semua data row
const tableLastRow = Math.max(rowIndex, pekerjaanRow) - 1;
for (let i = startRow + 2; i <= tableLastRow; i++) {
  const isUraianPekerjaanMerged =
    ["Q", "R", "S"].some(
      col => sheet.getCell(`${col}${i}`).isMerged
    );

  if (!isUraianPekerjaanMerged) {
    sheet.mergeCells(`Q${i}:S${i}`);
  }
}

for (let i = startRow + 2; i <= tableLastRow; i++) {
  const dataRow = sheet.getRow(i);
  dataRow.height = TABLE_DATA_ROW_HEIGHT;
  dataRow.customHeight = true;
}

// =========================
// 🔥 WRAP TEXT (BIAR TIDAK KEPOTONG)
// =========================
sheet.eachRow((row) => {
  row.eachCell((cell) => {
    cell.alignment = {
      horizontal: cell.alignment?.horizontal || "left",
      vertical: "middle",
      wrapText: false
    };
  });
});

    // =========================
    // 🔥 BORDER FULL
    // =========================
    for (let i = startRow; i <= tableLastRow; i++) {
      for (let j = 1; j <= 21; j++) {
        const cell = sheet.getRow(i).getCell(j);

        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" }
        };
      }
    }

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber >= startRow + 2) {

        row.eachCell((cell, colNumber) => {

          cell.alignment = {
            horizontal: colNumber === 1 ? "center" : "left",
            vertical: "middle"
          };

          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" }
          };

        });

      }
    });


// =========================
// FOOTER
// =========================
const lastRowUsed = Math.max(rowIndex || 0, pekerjaanRow || 0);
const startFooter = lastRowUsed;

const row2 = startFooter + 1;
const row3 = startFooter + 2;
const row4 = startFooter + 3;

// =========================
// JUMLAH
// =========================
sheet.mergeCells(`A${startFooter}:D${startFooter}`);
sheet.mergeCells(`F${startFooter}:U${startFooter}`);

sheet.getCell(`A${startFooter}`).value = "   JUMLAH";

const startSum = startRow + 2;
const endSum = Math.max(startSum, startFooter - 1);

sheet.getCell(`E${startFooter}`).value = {
  formula: `SUM(E${startSum}:E${endSum})`,
  result: 0
};

// =========================
// 🔹 CUACA
// =========================
sheet.mergeCells(`A${row2}:D${row4}`);
sheet.getCell(`A${row2}`).value = "   KEADAAN CUACA";

// merge per baris (WAJIB, jangan dihapus)
sheet.mergeCells(`E${row2}:F${row2}`);
sheet.mergeCells(`E${row3}:F${row3}`);
sheet.mergeCells(`E${row4}:F${row4}`);

// label tetap
sheet.getCell(`E${row2}`).value = "CERAH";
sheet.getCell(`E${row3}`).value = "MENDUNG";
sheet.getCell(`E${row4}`).value = "HUJAN";

// =========================
// 🔹 JAM (PER BARIS)
// =========================

// =========================
// 🔹 NORMALISASI CUACA
// =========================
const cuaca = (info.cuaca || "").toString().trim().toUpperCase();

// jam kerja
const jam = `${info.jam_mulai || "08:00"} s/d ${info.jam_selesai || "17:00"}`;

// kosongkan dulu
sheet.getCell(`G${row2}`).value = "";
sheet.getCell(`G${row3}`).value = "";
sheet.getCell(`G${row4}`).value = "";

// isi sesuai cuaca
if (cuaca === "CERAH") {
  sheet.getCell(`G${row2}`).value = jam;
}
else if (cuaca === "MENDUNG") {
  sheet.getCell(`G${row3}`).value = jam;
}
else if (cuaca === "HUJAN") {
  sheet.getCell(`G${row4}`).value = jam;
}
// =========================
// 🔹 ALIGNMENT BIAR RAPI
// =========================

// tengah untuk label cuaca
[row2, row3, row4].forEach(r => {
  sheet.getCell(`E${r}`).alignment = {
    horizontal: "center",
    vertical: "middle"
  };
});

// tengah untuk jam
[row2, row3, row4].forEach(r => {
  sheet.getCell(`G${r}`).alignment = {
    horizontal: "center",
    vertical: "middle"
  };
});

// =========================
// CATATAN (FIX NO OVERLAP)
// =========================
// label (baris atas)
// label
sheet.mergeCells(`H${row2}:N${row2}`);
sheet.getCell(`H${row2}`).value = "CATATAN :";

// isi
sheet.mergeCells(`H${row3}:N${row4}`);
sheet.getCell(`H${row3}`).value = "";

// =========================
// INFO KANAN
// =========================
// =========================
// 🔹 INFO KANAN CENTER FULL
// =========================

// merge area
sheet.mergeCells(`O${row2}:U${row4}`);

// 🔥 pakai 1 cell saja (pojok kiri atas merge)
const cellInfo = sheet.getCell(`O${row2}`);

// isi text
cellInfo.value =
`  Hari ini : Dapat Bekerja
   Bekerja Mulai Pukul : ${info.jam_mulai || "08:00"} s/d ${info.jam_selesai || "17:00"}`;

// 🔥 CENTER TOTAL (INI KUNCI)
cellInfo.alignment = {
  horizontal: "center",   // tengah kiri-kanan
  vertical: "middle",     // tengah atas-bawah
  wrapText: true
};

// font
cellInfo.font = {
  name: "Times New Roman",
  size: 10
};



// =========================
// 🔹 FONT GLOBAL FOOTER
// =========================
for (let i = startFooter; i <= row4; i++) {
  for (let j = 1; j <= 21; j++) {
    const cell = sheet.getRow(i).getCell(j);

    cell.font = {
      name: "Times New Roman",
      size: 10
    };
  }
}


// =========================
// 🔹 BORDER FULL (RAPI)
// =========================
for (let i = startFooter; i <= row4; i++) {
  for (let j = 1; j <= 21; j++) {
    const cell = sheet.getRow(i).getCell(j);

    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" }
    };
  }
}

// 🔥 garis tebal atas (header footer)
for (let j = 1; j <= 21; j++) {
  sheet.getRow(startFooter).getCell(j).border = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" }
  };
}


// =========================
// 🔹 ALIGNMENT
// =========================

// JUMLAH (tengah)
sheet.getCell(`E${startFooter}`).alignment = {
  horizontal: "center",
  vertical: "middle"
};

// KEADAAN CUACA (label)
sheet.getCell(`A${row2}`).alignment = {
  horizontal: "left",
  vertical: "middle"
};

// LIST CUACA (center)
[row2, row3, row4].forEach(r => {
  sheet.getCell(`E${r}`).alignment = {
    horizontal: "center",
    vertical: "middle"
  };
});

// JAM KERJA
sheet.getCell(`F${row2}`).alignment = {
  horizontal: "center",
  vertical: "middle"
};

// CATATAN LABEL
sheet.getCell(`I${row2}`).alignment = {
  horizontal: "left",
  vertical: "middle"
};

// INFO KANAN
sheet.getCell(`P${row2}`).alignment = {
  horizontal: "left",
  vertical: "top",
  wrapText: true
};


// =========================
// 🔹 BOLD (HEADER)
// =========================
sheet.getCell(`A${startFooter}`).font = { bold: true, size: 10 };
sheet.getCell(`A${row2}`).font = { bold: true };
sheet.getCell(`I${row2}`).font = { bold: true };



// =========================
// 🔹 WRAP TEXT SEMUA
// =========================
for (let i = startFooter; i <= row4; i++) {
  sheet.getRow(i).eachCell(cell => {
    cell.alignment = {
      ...cell.alignment,
      wrapText: true,
      vertical: "middle"
    };
  });
}

const ttdData = await TtdTemplate.findOne({
  where: {
    project_id: project.id,
    tipe_laporan: "harian"
  }
});

const template = ttdData?.layout;

// =========================
// 🔥 DIREKSI FINAL FIX (MERGE BENAR)
// =========================
let direksiStart = row4 + 5;
const direksiTop = direksiStart;

// =========================
// JUDUL
// =========================
sheet.mergeCells(`B${direksiStart}:G${direksiStart}`);
sheet.getCell(`B${direksiStart}`).value = "DIREKSI";
sheet.getCell(`B${direksiStart}`).font = { bold: true };

// =========================
// BARIS 1
// =========================
direksiStart++;


template.direksi.forEach((d) => {

  const rowNama = direksiStart;

  // nama
  sheet.getCell(`B${rowNama}`).value = d.nama;

  // NIP
  sheet.getCell(`D${rowNama}`).value = `${d.label} : ${d.nip}`;

  // 🔥 BARIS KOSONG (SPASI)
  const rowSpace = rowNama + 1;

  sheet.mergeCells(`B${rowSpace}:F${rowSpace}`);
  sheet.getRow(rowSpace).height = 15;

  // 🔥 INI YANG PENTING (MERGE KOLOM G PER ORANG)
  sheet.mergeCells(`G${rowNama}:G${rowSpace}`);

  // lanjut ke baris berikutnya
  direksiStart += 2;
});



// =========================
// 🔥 STYLE
// =========================
const direksiBottom = direksiStart -1;

for (let i = direksiTop; i <= direksiBottom; i++) {
  const row = sheet.getRow(i);

  if (!row.height) row.height = 15;

  for (let j = 2; j <= 7; j++) {
    const cell = row.getCell(j);

    cell.alignment = {
      horizontal: "left",
      vertical: "middle",
      wrapText: false
    };

    cell.font = {
      name: "Times New Roman",
      size: 10
    };
  }
}

// =========================
// 🔥 BORDER (B–G)
// =========================
for (let i = direksiTop; i <= direksiBottom; i++) {
  for (let j = 2; j <= 7; j++) {
    const cell = sheet.getRow(i).getCell(j);

    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" }
    };
  }
}


// =========================
// 🔥 TTD
// =========================
let ttdTop = direksiStart + 2;
const maxHeader = Math.max(
  ...template.columns.map(col => col.header.length)
);

// 🔥 INI YANG KURANG
const namaRow = ttdTop + maxHeader + 5;

template.columns.forEach((col) => {

  const [startCol, endCol] = col.range.split(":");

  // header
  col.header.forEach((text, i) => {
    sheet.mergeCells(`${startCol}${ttdTop + i}:${endCol}${ttdTop + i}`);
    applyTtdCellText(sheet.getCell(`${startCol}${ttdTop + i}`), text);
  });

  // nama
  sheet.mergeCells(`${startCol}${namaRow}:${endCol}${namaRow}`);
  applyTtdCellText(sheet.getCell(`${startCol}${namaRow}`), col.nama, {
    bold: true,
    underline: true
  });

  // jabatan
  sheet.mergeCells(`${startCol}${namaRow + 1}:${endCol}${namaRow + 1}`);
  applyTtdCellText(sheet.getCell(`${startCol}${namaRow + 1}`), col.jabatan);
});


// =========================
// 🔥 STYLE (CENTER)
// =========================
for (let i = ttdTop; i <= namaRow + 1; i++) {
  for (let j = 1; j <= 21; j++) {
    const cell = sheet.getRow(i).getCell(j);

    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true
    };

    cell.font = {
      ...(cell.font || {}),
      name: "Times New Roman",
      size: 10
    };
  }
}

// =========================
// 🔥 TAMBAH 2 BARIS KOSONG
// =========================
const lastRow = namaRow + 1;

sheet.getRow(lastRow + 1).height = 15;
sheet.getRow(lastRow + 2).height = 15;

// =========================
// 🔥 BARIS PALING BAWAH
// =========================
const finalRow = lastRow + 2;


// =========================
// 🔥 BORDER KIRI & KANAN (A & U)
// =========================
for (let i = 1; i <= finalRow; i++) {

  // kiri (A)
  const cellA = sheet.getRow(i).getCell(1);
  cellA.border = {
    ...cellA.border,
    left: { style: "thin" }
  };

  // kanan (U)
  const cellU = sheet.getRow(i).getCell(21);
  cellU.border = {
    ...cellU.border,
    right: { style: "thin" }
  };
}


// =========================
// 🔥 BORDER BAWAH FULL (A–U)
// =========================
for (let j = 1; j <= 21; j++) {
  const cell = sheet.getRow(finalRow).getCell(j);

  cell.border = {
    ...cell.border,
    bottom: { style: "thin" }
  };
}

// =========================
// 🔥 DOWNLOAD
// =========================
res.setHeader(
  "Content-Type",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
);

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${buildExportFilename(`laporan_harian_${day}`, project, "xlsx")}`
    );

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

export const exportDailyReportPdf = async (req, res) => {
  try {
    const { day } = req.query;
    const project = await Project.findByPk(req.params.project_id);

    if (!project) {
      return res.status(404).json({ message: "Project tidak ditemukan" });
    }

    // =========================
    // 🔥 AMBIL DATA DARI API KAMU
    // =========================
    let fakeRes = {
      jsonData: null,
      json(data) {
        this.jsonData = data;
      }
    };

    const formatDate = (date) => {
      if (!date) return "-";
      return new Date(date).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric"
      });
    };


    await getDailyReport(req, fakeRes);
    const report = fakeRes.jsonData;
    const reportData = Array.isArray(report?.data) ? report.data : [];
    const totalPekerja = Array.isArray(report?.total_pekerja) ? report.total_pekerja : [];
    const totalPeralatan = Array.isArray(report?.total_peralatan) ? report.total_peralatan : [];
    const totalMaterial = Array.isArray(report?.total_material) ? report.total_material : [];

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Laporan Harian");
    sheet.properties.defaultRowHeight = TABLE_DATA_ROW_HEIGHT;
    applyDailyReportColumnWidths(sheet);
// =========================
// 🔥 HEADER ATAS
// =========================

const info = reportData[0] || {};
let row = 2;

// =========================
// 🔥 KIRI (PROJECT - DIGABUNG KE SAMPING)
// =========================
const addLabel = (
  label,
  value,
  isMultiLine = false
) => {

  // LABEL
  sheet.getCell(`A${row}`).value = label;

  sheet.getCell(`A${row}`).font = {
    bold: true
  };

  sheet.getCell(`A${row}`).alignment = {
    vertical: "top"
  };

  // TITIK DUA
  sheet.getCell(`B${row}`).value = ":";

  // VALUE
  const val =
    value
      ? String(value).toUpperCase()
      : "-";

  // =========================
  // 🔥 MULTILINE
  // =========================
  if (isMultiLine) {

    const words = val.split(" ");

    let line = "";

    let lines = [];

    words.forEach(word => {

      if ((line + word).length > 70) {

        lines.push(line.trim());

        line = word + " ";

      } else {

        line += word + " ";

      }

    });

    if (line) {
      lines.push(line.trim());
    }

    // 🔥 TULIS
    lines.forEach((text, i) => {

      if (i > 0) row++;

      // 🔥 JANGAN MERGE
      const cell =
        sheet.getCell(`C${row}`);

      cell.value = text;

      cell.alignment = {
        horizontal: "left",
        vertical: "top",
        wrapText: true
      };

    });

  }

  // =========================
  // 🔥 NORMAL
  // =========================
  else {

    const cell =
      sheet.getCell(`C${row}`);

    cell.value = val;

    cell.alignment = {
      horizontal: "left",
      vertical: "middle"
    };

  }

  row++;
};

addLabel("  KEGIATAN", project.kegiatan);
addLabel("  SUB KEGIATAN", project.sub_kegiatan);
addLabel("  PEKERJAAN", getProjectExportName(project), true);
addLabel("  NOMOR KONTRAK",project.no_kontrak);
addLabel("  TANGGAL KONTRAK",formatDate(project.tgl_kontrak));
addLabel("  NOMOR SPMK",project.no_spmk);
addLabel("  TANGGAL SPMK",formatDate(project.tgl_spmk));
addLabel("  KONTRAKTOR",project.kontraktor);
addLabel("  KONSULTAN",project.konsultan);
addLabel("  WAKTU PELAKSANAAN",`${project.waktu_pelaksanaan} Hari`);
addLabel("  NILAI KONTRAK",`Rp. ${Number(project.nilai_kontrak).toLocaleString("id-ID")}`);
addLabel("  LOKASI",project.lokasi);
addLabel("  TAHUN", project.tahun);

// =========================
// 🔥 BORDER ATAS KIRI
// =========================
for (let j = 1; j <= 9; j++) {

  const cell =
    sheet.getRow(1).getCell(j);

  cell.border = {

    ...cell.border,

    top: {
      style: "thin"
    }

  };

}


// =========================
// 🔥 JUDUL ATAS
// =========================
sheet.mergeCells("J1:O1"); // kiri (J-O)
sheet.mergeCells("P1:U1"); // kanan (P-U)

sheet.getCell("J1").value = "KONSULTAN PENGAWAS";
sheet.getCell("P1").value = "KONTRAKTOR PELAKSANA";

["J1", "P1"].forEach(cell => {
  sheet.getCell(cell).alignment = {
    horizontal: "center",
    vertical: "middle"
  };
  sheet.getCell(cell).font = { bold: true };
});

// =========================
// 🔥 BOX LOGO
// =========================
sheet.mergeCells("J2:O8"); // kiri FULL
sheet.mergeCells("P2:U8"); // kanan FULL

for (let r = 2; r <= 8; r++) {
  sheet.getRow(r).height = LOGO_ROW_HEIGHT;
  sheet.getRow(r).customHeight = true;
}

// =========================
// 🔥 LOGO
// =========================
try {

// helper: konversi column width → pixel (perkiraan Excel)
const colWidthToPx = (w) => Math.floor((w || 8.43) * 7 + 5);
// helper: konversi row height → pixel
const rowHeightToPx = (h) => Math.floor((h || 15) * 96 / 72);

// hitung lebar box logo dalam pixel
const getBoxWidthPx = (sheet, startCol, endCol) => {
  let total = 0;
  for (let c = startCol; c <= endCol; c++) {
    total += colWidthToPx(sheet.getColumn(c).width);
  }
  return total;
};

// hitung tinggi box row 2–8
const getBoxHeightPx = (sheet, startRow, endRow) => {
  let total = 0;
  for (let r = startRow; r <= endRow; r++) {
    total += rowHeightToPx(sheet.getRow(r).height);
  }
  return total;
};

const getImageTopLeft = (
  sheet,
  startCol,
  startRow,
  offsetX,
  offsetY
) => {
  let col = startCol;
  let row = startRow;
  let remainingX = offsetX;
  let remainingY = offsetY;

  let colWidth = colWidthToPx(sheet.getColumn(col).width);
  let rowHeight = rowHeightToPx(sheet.getRow(row).height);

  while (remainingX > colWidth) {
    remainingX -= colWidth;
    col++;
    colWidth = colWidthToPx(sheet.getColumn(col).width);
  }

  while (remainingY > rowHeight) {
    remainingY -= rowHeight;
    row++;
    rowHeight = rowHeightToPx(sheet.getRow(row).height);
  }

  return {
    col: col - 1 + remainingX / colWidth,
    row: row - 1 + remainingY / rowHeight
  };
};

// =========================
// 🔵 LOGO KONSULTAN (CENTER J–N)
// =========================
if (project.logo_konsultan) {
  const logoPath = path.join(process.cwd(), "uploads", "logos", project.logo_konsultan);
  const logoKonsultan = workbook.addImage({
    filename: logoPath,
    extension: getImageExtension(logoPath)
  });

sheet.addImage(logoKonsultan, {
  tl: {
    col: LOGO_KONSULTAN_TL_COL,
    row: LOGO_KONSULTAN_TL_ROW
  },
  ext: {
    width: LOGO_KONSULTAN_WIDTH_PX,
    height: LOGO_KONSULTAN_HEIGHT_PX
  }
});
}

// =========================
// 🔵 LOGO KONTRAKTOR (CENTER P–U)
// =========================
if (project.logo_kontraktor) {
  const logoPath = path.join(process.cwd(), "uploads", "logos", project.logo_kontraktor);
  const logoKontraktor = workbook.addImage({
    filename: logoPath,
    extension: getImageExtension(logoPath)
  });

  const excelStartCol = 17; // Q
  const excelEndCol   = 21; // U
  const startRow = 2;
  const endRow   = 8;
  const boxW = getBoxWidthPx(sheet, excelStartCol, excelEndCol);
  const logoSize = await getContainedImageSize(
    logoPath,
    boxW - LOGO_BOX_PADDING_PX * 2,
    LOGO_TARGET_HEIGHT_PX
  );

sheet.addImage(logoKontraktor, {
  tl: {
    col: LOGO_KONTRAKTOR_TL_COL,
    row: LOGO_KONTRAKTOR_TL_ROW
  },
  ext: {
    width: logoSize.width,
    height: logoSize.height
  }
});
}

} catch (error) {
  console.log("❌ Logo error:", error.message);
}

// =========================
// 🔥 BORDER HEADER (FULL TANPA BOLONG)
// =========================
for (let i = 1; i <= 8; i++) {
  for (let j = 10; j <= 21; j++) {
    sheet.getRow(i).getCell(j).border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" }
    };
  }
}

const dailyPlan = await DailyPlan.findOne({
  where: {
    project_id: project.id,
    hari_ke: day
  }
});


// =========================
// 🔥 MERGE
// =========================
sheet.mergeCells("J9:U11");
sheet.mergeCells("J15:U15");
sheet.mergeCells("J16:U16");


// =========================
// 🔥 ISI
// =========================
const titleCell =
  sheet.getCell("J9");

titleCell.value =
  "LAPORAN HARIAN";

titleCell.font = {

  bold: true,

  size: 20

};

// 🔥 CENTER TENGAH
titleCell.alignment = {

  horizontal: "center",

  vertical: "middle"

};


// MINGGU
sheet.getCell("J12").value = "   MINGGU";
sheet.getCell("K12").value = ":";
sheet.mergeCells("L12:U12");
sheet.getCell("L12").value = dailyPlan?.minggu_ke
  ? `${dailyPlan.minggu_ke}`
  : "-";

// HARI
sheet.getCell("J13").value = "   HARI";
sheet.getCell("K13").value = ":";
sheet.mergeCells("L13:U13");
sheet.getCell("L13").value =
  new Date(info.tanggal || new Date())
    .toLocaleDateString("id-ID", { weekday: "long" });

// TANGGAL
sheet.getCell("J14").value = "   TANGGAL";
sheet.getCell("K14").value = ":";
sheet.mergeCells("L14:U14");
sheet.getCell("L14").value = formatDate(info.tanggal);

sheet.getCell("J15").value = " ";

// =========================
// 🔥 STYLE
// =========================
sheet.getCell("J10").font = { bold: true };

for (let i = 12; i <= 14; i++) {
  sheet.getCell(`J${i}`).alignment = {
    horizontal: "left",
    vertical: "middle"
  };
}

// =========================
// 🔥 BORDER LUAR FULL
// =========================

// 🔥 KIRI & KANAN
for (let i = 9; i <= 16; i++) {
  // =========================
  // 🔥 KIRI (J)
  // =========================
  const leftCell =
    sheet.getRow(i).getCell(10);

  leftCell.border = {

    ...leftCell.border,

    left: {
      style: "thin"
    }

  };

  // =========================
  // 🔥 KANAN (U)
  // =========================
  const rightCell =
    sheet.getRow(i).getCell(21);

  rightCell.border = {

    ...rightCell.border,

    right: {
      style: "thin"
    }

  };

}

// =========================
// 🔥 GARIS ATAS
// =========================
for (let j = 10; j <= 21; j++) {

  const cell =
    sheet.getRow(9).getCell(j);

  cell.border = {

    ...cell.border,

    top: {
      style: "thin"
    }

  };

}

// =========================
// 🔥 GARIS BAWAH
// =========================
for (let j = 10; j <= 21; j++) {

  const cell =
    sheet.getRow(16).getCell(j);

  cell.border = {

    ...cell.border,

    bottom: {
      style: "thin"
    }

  };

}

    // =========================
    // 🔥 HEADER TABEL
    // =========================
    let startRow = 17;

    const headerFill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFD9D9D9" } // abu-abu
    };

    ["A","B","G","J","Q"].forEach(col => {
      const cell = sheet.getCell(`${col}${startRow}`);

      cell.fill = headerFill;
      cell.font = { bold: true };

      cell.alignment = {
        horizontal: "center",
        vertical: "middle"
      };
    });

   for (let col = 2; col <= 21; col++) {
      const cell = sheet.getRow(startRow + 1).getCell(col);

      cell.fill = headerFill;
      cell.font = { bold: true, size: 10 };

      cell.alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: false
      };
    }

    for (let col = 1; col <= 21; col++) {
      const cell1 = sheet.getRow(startRow).getCell(col);
      const cell2 = sheet.getRow(startRow + 1).getCell(col);

      [cell1, cell2].forEach(cell => {
        cell.border = {
          top: { style: "medium" },
          left: { style: "thin" },
          bottom: { style: "medium" },
          right: { style: "thin" }
        };
      });
    }
    sheet.getRow(startRow).height = 25;       
    sheet.getRow(startRow + 1).height = 22;  
    sheet.mergeCells(`A${startRow}:A${startRow + 1}`);
    sheet.mergeCells(`B${startRow}:F${startRow}`);
    sheet.mergeCells(`G${startRow}:I${startRow}`);
    sheet.mergeCells(`J${startRow}:P${startRow}`);
    sheet.mergeCells(`Q${startRow}:U${startRow}`);

    sheet.getCell(`A${startRow}`).value = "NO";
    sheet.getCell(`B${startRow}`).value = "TENAGA KERJA";
    sheet.getCell(`G${startRow}`).value = "PERALATAN";
    sheet.getCell(`J${startRow}`).value = "PENGGUNAAN MATERIAL";
    sheet.getCell(`Q${startRow}`).value = "PEKERJAAN";

    // SUB HEADER
    // 🔥 JABATAN FULL LEBAR
    sheet.mergeCells(`B${startRow + 1}:D${startRow + 1}`);
    sheet.getCell(`B${startRow + 1}`).value = "JABATAN";
    sheet.getCell(`E${startRow + 1}`).value = "JUMLAH";
    sheet.getCell(`F${startRow + 1}`).value = "SAT";

    sheet.getCell(`G${startRow + 1}`).value = "JENIS ALAT";
    sheet.getCell(`H${startRow + 1}`).value = "JUMLAH";
    sheet.getCell(`I${startRow + 1}`).value = "SAT";
    
    sheet.mergeCells(`J${startRow + 1}:L${startRow + 1}`);
    sheet.getCell(`J${startRow + 1}`).value = "JENIS MATERIAL";
    sheet.getCell(`M${startRow + 1}`).value = "VOL";
    sheet.getCell(`N${startRow + 1}`).value = "SAT";
    sheet.getCell(`O${startRow + 1}`).value = "DITERIMA";
    sheet.getCell(`P${startRow + 1}`).value = "DITOLAK";

    sheet.mergeCells(`Q${startRow + 1}:S${startRow + 1}`);
    sheet.getCell(`Q${startRow + 1}`).value = "URAIAN";
    sheet.getCell(`T${startRow + 1}`).value = "VOL";
    sheet.getCell(`U${startRow + 1}`).value = "SAT";
    


    sheet.getColumn("A").width = 25;

    sheet.getColumn("B").width = 4;
    sheet.getColumn("C").width = 35;
    sheet.getColumn("D").width = 5;

    sheet.getColumn("E").width = 10;
    sheet.getColumn("F").width = 10;

    sheet.getColumn("G").width = 40;
    sheet.getColumn("H").width = 10;
    sheet.getColumn("I").width = 10;
    sheet.getColumn("J").width = 5;
    sheet.getColumn("K").width = 45;
    sheet.getColumn("L").width = 25;

    sheet.getColumn("M").width = 10; 
    sheet.getColumn("N").width = 10; 
    sheet.getColumn("O").width = 10;  
    sheet.getColumn("P").width = 10; 
    sheet.getColumn("Q").width = 20;  
    sheet.getColumn("R").width = 20;  
    sheet.getColumn("S").width = 20;  
    sheet.getColumn("T").width = 10;  
    sheet.getColumn("U").width = 10;   

    

    // =========================
    // 🔥 ISI DATA
    // =========================
    const items = await ProjectItem.findAll({
      where: {
        project_id: project.id,
        tipe: "TENAGA"
      }
    });
    const alatItems = await ProjectItem.findAll({
      where: {
        project_id: project.id,
        tipe: "ALAT"
      }
    });

    const boqItems = await Boq.findAll({
      where: { project_id: project.id }
    });

    const boqMap = {};
    boqItems.forEach(b => {
      boqMap[b.id] = b;
    });

    function getHierarchy(boqMap, boqItem) {
        let parent = null;
        let sub = null;

        let current = boqItem;

        while (current) {

          if (current.tipe === "subheader") {
            sub = current.uraian;
          }

          if (current.tipe === "header") {
            parent = current.uraian;
          }

          current = boqMap[current.parent_id];
        }

        return { parent, sub };
      }

    let rowIndex = startRow + 2;      // kiri
    let pekerjaanRow = startRow + 2;  // kanan

    // 🔥 hitung kebutuhan data real
    const totalRowsNeeded = Math.max(
      totalPekerja.length,
      totalPeralatan.length,
      totalMaterial.length,
      reportData.length
    );
    
  const minRows = 30;
  const bufferRows = 10;

  let maxRows;

  if (totalRowsNeeded <= minRows) {
    maxRows = minRows;
  } else {
    maxRows = totalRowsNeeded + bufferRows;
  }

    let lastParent = null;
    let lastSubParent = null;
    let isFirstGroup = true;

    for (let i = 0; i < maxRows; i++) {
      const pekerja = totalPekerja[i];
      const alat = totalPeralatan[i];
      const material = totalMaterial[i];
      const pekerjaan = reportData[i];

      sheet.getCell(`A${rowIndex}`).value = i + 1;
      sheet.mergeCells(`B${rowIndex}:D${rowIndex}`);
      sheet.mergeCells(`J${rowIndex}:L${rowIndex}`);

      // TENAGA
      if (pekerja) {
        sheet.getCell(`B${rowIndex}`).value = pekerja.nama;
        const item = items.find(i => i.nama === pekerja.nama);

        let value = pekerja.total;
        if (pekerja.total > 0 && item?.terbilang) {
          value = item.terbilang;
        }
        sheet.getCell(`E${rowIndex}`).value = value;
        sheet.getCell(`E${rowIndex}`).numFmt = "0.00";

        sheet.getCell(`F${rowIndex}`).value = pekerja.satuan;
      }

      // ALAT
      if (alat) {
        sheet.getCell(`G${rowIndex}`).value = alat.nama;

        // 🔥 cari dari ProjectItem
        const item = alatItems.find(i => i.nama === alat.nama);

        let value = alat.total;

        // 🔥 pakai terbilang kalau ada
        if (alat.total > 0 && item?.terbilang != null) {
          value = item.terbilang;
        }

        sheet.getCell(`H${rowIndex}`).value = value;

        // 🔥 format 2 angka
        sheet.getCell(`H${rowIndex}`).numFmt = "0.00";

        sheet.getCell(`I${rowIndex}`).value = alat.satuan;
      }

      // MATERIAL
      if (material) {
        sheet.getCell(`J${rowIndex}`).value = material.nama;
        sheet.getCell(`M${rowIndex}`).value = material.total;
        sheet.getCell(`M${rowIndex}`).numFmt = "0.00";
        sheet.getCell(`N${rowIndex}`).value = material.satuan;
      }

      // PEKERJAAN
       if (pekerjaan) {

  if (!pekerjaan.boq_id) {
    rowIndex++;
    continue;
  }

  const boqItem = boqMap[pekerjaan.boq_id];
  if (!boqItem) {
    rowIndex++;
    continue;
  }

  const { parent, sub } = getHierarchy(boqMap, boqItem);

  // HEADER
  if (parent && parent !== lastParent) {

    // 🔥 kasih jarak sebelum header baru (kecuali pertama)
    if (!isFirstGroup) {
      pekerjaanRow++; // ⬅️ ini baris kosong
    }

    sheet.getCell(`Q${pekerjaanRow}`).value = parent;
    sheet.getCell(`Q${pekerjaanRow}`).font = { bold: true };
    if (!sheet.getCell(`Q${pekerjaanRow}`).isMerged) {
      sheet.mergeCells(`Q${pekerjaanRow}:S${pekerjaanRow}`);
    }

    pekerjaanRow++;

    lastParent = parent;
    lastSubParent = null;
    isFirstGroup = false;
  }

  // SUBHEADER
  if (sub && sub !== lastSubParent) {
    sheet.getCell(`Q${pekerjaanRow}`).value = sub;
    sheet.getCell(`Q${pekerjaanRow}`).font = { bold: true };
    if (!sheet.getCell(`Q${pekerjaanRow}`).isMerged) {
      sheet.mergeCells(`Q${pekerjaanRow}:S${pekerjaanRow}`);
    }

    pekerjaanRow++;
    lastSubParent = sub;
  }

  // ITEM
  if (!sheet.getCell(`Q${pekerjaanRow}`).isMerged) {
    sheet.mergeCells(`Q${pekerjaanRow}:S${pekerjaanRow}`);
  }
  sheet.getCell(`Q${pekerjaanRow}`).value = pekerjaan.uraian;

  sheet.getCell(`T${pekerjaanRow}`).value = pekerjaan.volume;
  sheet.getCell(`T${pekerjaanRow}`).numFmt = "#,##0.000";

  sheet.getCell(`U${pekerjaanRow}`).value = pekerjaan.satuan;

  pekerjaanRow++;
}
      rowIndex++;
    }

    // header lebih tinggi
sheet.getRow(startRow).height = 30;
sheet.getRow(startRow + 1).height = 28;

// semua data row
const tableLastRow = Math.max(rowIndex, pekerjaanRow) - 1;
for (let i = startRow + 2; i <= tableLastRow; i++) {
  const isUraianPekerjaanMerged =
    ["Q", "R", "S"].some(
      col => sheet.getCell(`${col}${i}`).isMerged
    );

  if (!isUraianPekerjaanMerged) {
    sheet.mergeCells(`Q${i}:S${i}`);
  }
}

for (let i = startRow + 2; i <= tableLastRow; i++) {
  const dataRow = sheet.getRow(i);
  dataRow.height = TABLE_DATA_ROW_HEIGHT;
  dataRow.customHeight = true;
}

// =========================
// 🔥 WRAP TEXT (BIAR TIDAK KEPOTONG)
// =========================
sheet.eachRow((row) => {
  row.eachCell((cell) => {
    cell.alignment = {
      horizontal: cell.alignment?.horizontal || "left",
      vertical: "middle",
      wrapText: false
    };
  });
});

    // =========================
    // 🔥 BORDER FULL
    // =========================
    for (let i = startRow; i <= tableLastRow; i++) {
      for (let j = 1; j <= 21; j++) {
        const cell = sheet.getRow(i).getCell(j);

        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" }
        };
      }
    }

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber >= startRow + 2) {

        row.eachCell((cell, colNumber) => {

          cell.alignment = {
            horizontal: colNumber === 1 ? "center" : "left",
            vertical: "middle"
          };

          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" }
          };

        });

      }
    });


// =========================
// FOOTER
// =========================
const lastRowUsed = Math.max(rowIndex || 0, pekerjaanRow || 0);
const startFooter = lastRowUsed;

const row2 = startFooter + 1;
const row3 = startFooter + 2;
const row4 = startFooter + 3;

// =========================
// JUMLAH
// =========================
sheet.mergeCells(`A${startFooter}:D${startFooter}`);
sheet.mergeCells(`F${startFooter}:U${startFooter}`);

sheet.getCell(`A${startFooter}`).value = "   JUMLAH";

const startSum = startRow + 2;
const endSum = Math.max(startSum, startFooter - 1);

sheet.getCell(`E${startFooter}`).value = {
  formula: `SUM(E${startSum}:E${endSum})`,
  result: 0
};

// =========================
// 🔹 CUACA
// =========================
sheet.mergeCells(`A${row2}:D${row4}`);
sheet.getCell(`A${row2}`).value = "   KEADAAN CUACA";

// merge per baris (WAJIB, jangan dihapus)
sheet.mergeCells(`E${row2}:F${row2}`);
sheet.mergeCells(`E${row3}:F${row3}`);
sheet.mergeCells(`E${row4}:F${row4}`);

// label tetap
sheet.getCell(`E${row2}`).value = "CERAH";
sheet.getCell(`E${row3}`).value = "MENDUNG";
sheet.getCell(`E${row4}`).value = "HUJAN";

// =========================
// 🔹 JAM (PER BARIS)
// =========================

// =========================
// 🔹 NORMALISASI CUACA
// =========================
const cuaca = (info.cuaca || "").toString().trim().toUpperCase();

// jam kerja
const jam = `${info.jam_mulai || "08:00"} s/d ${info.jam_selesai || "17:00"}`;

// kosongkan dulu
sheet.getCell(`G${row2}`).value = "";
sheet.getCell(`G${row3}`).value = "";
sheet.getCell(`G${row4}`).value = "";

// isi sesuai cuaca
if (cuaca === "CERAH") {
  sheet.getCell(`G${row2}`).value = jam;
}
else if (cuaca === "MENDUNG") {
  sheet.getCell(`G${row3}`).value = jam;
}
else if (cuaca === "HUJAN") {
  sheet.getCell(`G${row4}`).value = jam;
}
// =========================
// 🔹 ALIGNMENT BIAR RAPI
// =========================

// tengah untuk label cuaca
[row2, row3, row4].forEach(r => {
  sheet.getCell(`E${r}`).alignment = {
    horizontal: "center",
    vertical: "middle"
  };
});

// tengah untuk jam
[row2, row3, row4].forEach(r => {
  sheet.getCell(`G${r}`).alignment = {
    horizontal: "center",
    vertical: "middle"
  };
});

// =========================
// CATATAN (FIX NO OVERLAP)
// =========================
// label (baris atas)
// label
sheet.mergeCells(`H${row2}:N${row2}`);
sheet.getCell(`H${row2}`).value = "CATATAN :";

// isi
sheet.mergeCells(`H${row3}:N${row4}`);
sheet.getCell(`H${row3}`).value = "";

// =========================
// INFO KANAN
// =========================
// =========================
// 🔹 INFO KANAN CENTER FULL
// =========================

// merge area
sheet.mergeCells(`O${row2}:U${row4}`);

// 🔥 pakai 1 cell saja (pojok kiri atas merge)
const cellInfo = sheet.getCell(`O${row2}`);

// isi text
cellInfo.value =
`  Hari ini : Dapat Bekerja
   Bekerja Mulai Pukul : ${info.jam_mulai || "08:00"} s/d ${info.jam_selesai || "17:00"}`;

// 🔥 CENTER TOTAL (INI KUNCI)
cellInfo.alignment = {
  horizontal: "center",   // tengah kiri-kanan
  vertical: "middle",     // tengah atas-bawah
  wrapText: true
};

// font
cellInfo.font = {
  name: "Times New Roman",
  size: 10
};



// =========================
// 🔹 FONT GLOBAL FOOTER
// =========================
for (let i = startFooter; i <= row4; i++) {
  for (let j = 1; j <= 21; j++) {
    const cell = sheet.getRow(i).getCell(j);

    cell.font = {
      name: "Times New Roman",
      size: 10
    };
  }
}


// =========================
// 🔹 BORDER FULL (RAPI)
// =========================
for (let i = startFooter; i <= row4; i++) {
  for (let j = 1; j <= 21; j++) {
    const cell = sheet.getRow(i).getCell(j);

    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" }
    };
  }
}

// 🔥 garis tebal atas (header footer)
for (let j = 1; j <= 21; j++) {
  sheet.getRow(startFooter).getCell(j).border = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" }
  };
}


// =========================
// 🔹 ALIGNMENT
// =========================

// JUMLAH (tengah)
sheet.getCell(`E${startFooter}`).alignment = {
  horizontal: "center",
  vertical: "middle"
};

// KEADAAN CUACA (label)
sheet.getCell(`A${row2}`).alignment = {
  horizontal: "left",
  vertical: "middle"
};

// LIST CUACA (center)
[row2, row3, row4].forEach(r => {
  sheet.getCell(`E${r}`).alignment = {
    horizontal: "center",
    vertical: "middle"
  };
});

// JAM KERJA
sheet.getCell(`F${row2}`).alignment = {
  horizontal: "center",
  vertical: "middle"
};

// CATATAN LABEL
sheet.getCell(`I${row2}`).alignment = {
  horizontal: "left",
  vertical: "middle"
};

// INFO KANAN
sheet.getCell(`P${row2}`).alignment = {
  horizontal: "left",
  vertical: "top",
  wrapText: true
};


// =========================
// 🔹 BOLD (HEADER)
// =========================
sheet.getCell(`A${startFooter}`).font = { bold: true, size: 10 };
sheet.getCell(`A${row2}`).font = { bold: true };
sheet.getCell(`I${row2}`).font = { bold: true };



// =========================
// 🔹 WRAP TEXT SEMUA
// =========================
for (let i = startFooter; i <= row4; i++) {
  sheet.getRow(i).eachCell(cell => {
    cell.alignment = {
      ...cell.alignment,
      wrapText: true,
      vertical: "middle"
    };
  });
}

const ttdData = await TtdTemplate.findOne({
  where: {
    project_id: project.id,
    tipe_laporan: "harian"
  }
});

const template = ttdData?.layout;

// =========================
// 🔥 DIREKSI FINAL FIX (MERGE BENAR)
// =========================
let direksiStart = row4 + 5;
const direksiTop = direksiStart;

// =========================
// JUDUL
// =========================
sheet.mergeCells(`B${direksiStart}:G${direksiStart}`);
sheet.getCell(`B${direksiStart}`).value = "DIREKSI";
sheet.getCell(`B${direksiStart}`).font = { bold: true };

// =========================
// BARIS 1
// =========================
direksiStart++;


template.direksi.forEach((d) => {

  const rowNama = direksiStart;

  // nama
  sheet.getCell(`B${rowNama}`).value = d.nama;

  // NIP
  sheet.getCell(`D${rowNama}`).value = `${d.label} : ${d.nip}`;

  // 🔥 BARIS KOSONG (SPASI)
  const rowSpace = rowNama + 1;

  sheet.mergeCells(`B${rowSpace}:F${rowSpace}`);
  sheet.getRow(rowSpace).height = 15;

  // 🔥 INI YANG PENTING (MERGE KOLOM G PER ORANG)
  sheet.mergeCells(`G${rowNama}:G${rowSpace}`);

  // lanjut ke baris berikutnya
  direksiStart += 2;
});



// =========================
// 🔥 STYLE
// =========================
const direksiBottom = direksiStart -1;

for (let i = direksiTop; i <= direksiBottom; i++) {
  const row = sheet.getRow(i);

  if (!row.height) row.height = 15;

  for (let j = 2; j <= 7; j++) {
    const cell = row.getCell(j);

    cell.alignment = {
      horizontal: "left",
      vertical: "middle",
      wrapText: false
    };

    cell.font = {
      name: "Times New Roman",
      size: 10
    };
  }
}

// =========================
// 🔥 BORDER (B–G)
// =========================
for (let i = direksiTop; i <= direksiBottom; i++) {
  for (let j = 2; j <= 7; j++) {
    const cell = sheet.getRow(i).getCell(j);

    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" }
    };
  }
}


// =========================
// 🔥 TTD
// =========================
let ttdTop = direksiStart + 2;
const maxHeader = Math.max(
  ...template.columns.map(col => col.header.length)
);

// 🔥 INI YANG KURANG
const namaRow = ttdTop + maxHeader + 5;

template.columns.forEach((col) => {

  const [startCol, endCol] = col.range.split(":");

  // header
  col.header.forEach((text, i) => {
    sheet.mergeCells(`${startCol}${ttdTop + i}:${endCol}${ttdTop + i}`);
    applyTtdCellText(sheet.getCell(`${startCol}${ttdTop + i}`), text);
  });

  // nama
  sheet.mergeCells(`${startCol}${namaRow}:${endCol}${namaRow}`);
  applyTtdCellText(sheet.getCell(`${startCol}${namaRow}`), col.nama, {
    bold: true,
    underline: true
  });

  // jabatan
  sheet.mergeCells(`${startCol}${namaRow + 1}:${endCol}${namaRow + 1}`);
  applyTtdCellText(sheet.getCell(`${startCol}${namaRow + 1}`), col.jabatan);
});


// =========================
// 🔥 STYLE (CENTER)
// =========================
for (let i = ttdTop; i <= namaRow + 1; i++) {
  for (let j = 1; j <= 21; j++) {
    const cell = sheet.getRow(i).getCell(j);

    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true
    };

    cell.font = {
      ...(cell.font || {}),
      name: "Times New Roman",
      size: 10
    };
  }
}

// =========================
// 🔥 TAMBAH 2 BARIS KOSONG
// =========================
const lastRow = namaRow + 1;

sheet.getRow(lastRow + 1).height = 15;
sheet.getRow(lastRow + 2).height = 15;

// =========================
// 🔥 BARIS PALING BAWAH
// =========================
const finalRow = lastRow + 2;


// =========================
// 🔥 BORDER KIRI & KANAN (A & U)
// =========================
for (let i = 1; i <= finalRow; i++) {

  // kiri (A)
  const cellA = sheet.getRow(i).getCell(1);
  cellA.border = {
    ...cellA.border,
    left: { style: "thin" }
  };

  // kanan (U)
  const cellU = sheet.getRow(i).getCell(21);
  cellU.border = {
    ...cellU.border,
    right: { style: "thin" }
  };
}


// =========================
// 🔥 BORDER BAWAH FULL (A–U)
// =========================
for (let j = 1; j <= 21; j++) {
  const cell = sheet.getRow(finalRow).getCell(j);

  cell.border = {
    ...cell.border,
    bottom: { style: "thin" }
  };
}

// =========================
// 🔥 TEMP DIR
// =========================
const tempDir = path.join(
  process.cwd(),
  "temp"
);

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
  buildExportFilename(`laporan_harian_${day}`, project, "xlsx")
);

const pdfPath = path.join(
  tempDir,
  buildExportFilename(`laporan_harian_${day}`, project, "pdf")
);

// =========================
// 🔥 PAGE SETUP PDF
// =========================
sheet.pageSetup = {

  paperSize: 9,

  orientation: "landscape",

  fitToPage: true,

  fitToWidth: 1,

  fitToHeight: 0,

  horizontalCentered: true,

  verticalCentered: false,

  margins: {
    left: 0.2,
    right: 0.2,
    top: 0.2,
    bottom: 0.2,
    header: 0,
    footer: 0
  }

};

// =========================
// 🔥 PRINT AREA
// =========================
sheet.pageSetup.printArea =
  `A1:U${finalRow}`;

// =========================
// 🔥 SAVE EXCEL
// =========================
await workbook.xlsx.writeFile(
  excelPath
);

// =========================
// 🔥 READ EXCEL
// =========================
const excelBuffer =
  fs.readFileSync(excelPath);

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
    // 🔥 DOWNLOAD PDF
    // =========================
    res.download(

      pdfPath,

      buildExportFilename(`laporan_harian_${day}`, project, "pdf"),

      () => {

        // hapus temp
        if (
          fs.existsSync(excelPath)
        ) {
          fs.unlinkSync(excelPath);
        }

        if (
          fs.existsSync(pdfPath)
        ) {
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
