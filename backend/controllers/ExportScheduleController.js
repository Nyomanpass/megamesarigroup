import ExcelJS from "exceljs";
import { Project } from "../models/ProjectModel.js";
import { Boq } from "../models/BoqModel.js";
import { Schedule } from "../models/ScheduleModel.js";
import { ProjectWeek } from "../models/ProjectWeekModel.js";
import { TtdTemplate } from "../models/TtdTemplate.js";

export const exportTimeSchedule = async (req, res) => {
  try {
    const { project_id } = req.params;

    // =========================
    // 🔥 AMBIL DATA
    // =========================
    const project = await Project.findByPk(project_id);

    const boq = await Boq.findAll({
      where: { project_id },
      order: [["id", "ASC"]],
    });

    const weeks = await ProjectWeek.findAll({
      where: { project_id },
      order: [["minggu_ke", "ASC"]],
    });

    const schedules = await Schedule.findAll({
      where: { project_id },
    });

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

// 🔹 L kosong
sheet.mergeCells(`L${row}:L${row + 5}`);


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


// =========================
// 🔥 WEEK START (M)
// =========================
const weekStartCol = 13; // M
const weekEndCol = weekStartCol + weeks.length - 1;

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

for (let i = 0; i < weeks.length; i += mingguPerBulan) {
  const start = weekStartCol + i;
  const end = Math.min(start + mingguPerBulan - 1, weekEndCol);

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

weeks.forEach((w, i) => {
  const col = sheet.getColumn(weekStartCol + i).letter;

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
    // 🔥 KHUSUS L & V (NO BOTTOM)
    // =========================
    if (c === 12 || c === 22) {
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

    sheet.getCell(row, c++).value = nomorItem;
    sheet.getCell(`C${row}`).value = item.uraian || "";

    c = 7;

    sheet.getCell(row, c++).value = item.satuan || "";
    sheet.getCell(row, c++).value = Number(item.volume || 0);
    const hargaCell = sheet.getCell(row, c++);
    hargaCell.value = Number(item.harga_satuan || 0);
    hargaCell.numFmt = '"Rp" * #,##0.00';

    const jumlahCell = sheet.getCell(row, c++);
    jumlahCell.value = Number(item.jumlah || 0);
    jumlahCell.numFmt = '"Rp" * #,##0.00';
    sheet.getCell(row, c++).value = Number(item.bobot || 0);

    c++;

    weeks.forEach((w) => {
      const found = schedules.find(
        (s) =>
          Number(s.boq_id) === Number(item.id) &&
          Number(s.minggu_ke) === Number(w.minggu_ke)
      );

      const val = found ? Number(found.bobot) : null;

      const cell = sheet.getCell(row, c++);
      cell.value = val;

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


for (let i = 0; i < weeks.length; i++) {
  sheet.getColumn(weekStartCol + i).width = 15;
}

    sheet.getColumn("V").width = 6;   // padding kiri kontraktor
    sheet.getColumn("W").width = 15;

    const greyFill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFD9D9D9" }
    };

for (let r = startDataRow; r <= endDataRow + 11; r++) {

  // 🔹 KOLOM L (12)
  const cellL = sheet.getCell(r, 12);
  cellL.fill = greyFill;
  cellL.border = {
    left: { style: "thin" },
    right: { style: "thin" },

    // 🔥 pindah ke bawah 2 row
    bottom: r === (endDataRow + 11) ? { style: "thin" } : undefined
  };

  // 🔹 KOLOM V (22)
  const cellV = sheet.getCell(r, 22);
  cellV.fill = greyFill;
  cellV.border = {
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
// 🔥 KOTAK BESAR E - K (2 BARIS)
// =========================
for (let r = rencanaRow; r <= komulatifRow; r++) {
  for (let c = 5; c <= 11; c++) { // E(5) sampai K(11)

    const cell = sheet.getRow(r).getCell(c);

    cell.border = {
      // atas hanya di baris pertama
      top: r === rencanaRow ? { style: "thin" } : undefined,

      // bawah hanya di baris terakhir
      bottom: r === komulatifRow ? { style: "thin" } : undefined,

      // kiri hanya di kolom E
      left: c === 5 ? { style: "thin" } : undefined,

      // kanan hanya di kolom K
      right: c === 11 ? { style: "thin" } : undefined
    };
  }
}

// =========================
// 🔹 RENCANA PER MINGGU (FINAL FIX)
// =========================
for (let c = weekStartCol; c <= weekEndCol; c++) {

  const colLetter = sheet.getColumn(c).letter;
  const cell = sheet.getCell(`${colLetter}${rencanaRow}`);

  // 🔥 PAKAI SUBTOTAL (ANTI WARNING)
  cell.value = {
    formula: `SUBTOTAL(9,${colLetter}${startDataRow}:${colLetter}${endDataRow})`,
    result: 0
  };

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
}

// =========================
// 🔹 KOMULATIF
// =========================
for (let c = weekStartCol; c <= weekEndCol; c++) {

  const colLetter = sheet.getColumn(c).letter;
  const cell = sheet.getCell(`${colLetter}${komulatifRow}`);

  if (c === weekStartCol) {
    cell.value = {
      formula: `${colLetter}${rencanaRow}`,
      result: 0
    };
  } else {
    const prevCol = sheet.getColumn(c - 1).letter;

    cell.value = {
      formula: `${prevCol}${komulatifRow}+${colLetter}${rencanaRow}`,
      result: 0
    };
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
}


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


// =========================
// 🔥 REALISASI (KOSONG)
// =========================
const realisasiRow = komulatifRow + 1;
const realisasiKomulatifRow = komulatifRow + 2;

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
  for (let c = 5; c <= 11; c++) {
    const cell = sheet.getRow(r).getCell(c);
    cell.border = {
      top: r === realisasiRow ? { style: "thin" } : undefined,
      bottom: r === realisasiKomulatifRow ? { style: "thin" } : undefined,
      left: c === 5 ? { style: "thin" } : undefined,
      right: c === 11 ? { style: "thin" } : undefined
    };
  }
}

// 🔹 VALUE (KOSONG DULU)
for (let c = weekStartCol; c <= weekEndCol; c++) {

  const colLetter = sheet.getColumn(c).letter;

  const cell1 = sheet.getCell(`${colLetter}${realisasiRow}`);
  const cell2 = sheet.getCell(`${colLetter}${realisasiKomulatifRow}`);

  cell1.value = null;
  cell2.value = null;

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
}


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
for (let c = 5; c <= 11; c++) {

  const cell = sheet.getCell(deviasiRow, c);

  cell.border = {
    top: { style: "thin" },
    bottom: { style: "thin" },
    left: c === 5 ? { style: "thin" } : undefined,
    right: c === 11 ? { style: "thin" } : undefined
  };
}

// =========================
// 🔹 VALUE DEVIASI PER WEEK
// =========================
for (let c = weekStartCol; c <= weekEndCol; c++) {

  const colLetter = sheet.getColumn(c).letter;
  const cell = sheet.getCell(`${colLetter}${deviasiRow}`);

  cell.value = null; // 🔥 kosong semua

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
template.top.forEach((col) => {

  const colCenter = col.range;
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
    // 🔥 EXPORT
    // =========================
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=Time_Schedule.xlsx"
    );

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};