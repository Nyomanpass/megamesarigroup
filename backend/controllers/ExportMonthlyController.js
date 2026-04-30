import ExcelJS from "exceljs";
import path from "path";
import { getMonthlyReport } from "./ReportController.js";
import { Project } from "../models/ProjectModel.js";
import { TtdTemplate } from "../models/TtdTemplate.js";

export const exportMonthlyReportExcel = async (req, res) => {
  try {
    const { bulan } = req.query;
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

    await getMonthlyReport(req, fakeRes);
    const monthly = fakeRes.jsonData;

    const dataBulan = monthly.find(b => b.bulan_ke == bulan);

    if (!dataBulan) {
      return res.status(404).json({ message: "Data bulan tidak ditemukan" });
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Laporan Bulanan");

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

  const placeLogo = (logoPath, startCol, endCol) => {
    if (!logoPath) return;

    const imageId = workbook.addImage({
      filename: path.join("uploads", logoPath),
      extension: "png"
    });

    const startRow = 2;
    const endRow = 6;

    const boxW = getBoxWidthPx(startCol, endCol);
    const boxH = getBoxHeightPx(startRow, endRow);

    // 🔥 SAMAKAN SEMUA LOGO
    const imgW = boxW * 1;  // 100% lebar
    const imgH = boxH * 0.8;  // 80% tinggi

    // 🔥 CENTER
    const offsetX = (boxW - imgW) / 2;
    const offsetY = (boxH - imgH) / 2 + 50;

    sheet.addImage(imageId, {
      tl: {
        col: startCol - 1 + 0.9, // sedikit geser biar tidak nempel kiri
        row: startRow - 1 + 0.6, // sedikit geser biar tidak nempel atas
        nativeColOff: Math.round(offsetX * 9525),
        nativeRowOff: Math.round(offsetY * 9525)
      },
      ext: { width: imgW, height: imgH }
    });
  };

    // =========================
    // 🔥 PASANG LOGO
    // =========================
  placeLogo(project.logo_client, 2, 5);
  placeLogo(project.logo_konsultan, 7, 10);
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
cell.value = "LAPORAN BULANAN";

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
  return map[n] || `${n}`;
};

// 🔥 DATA DUMMY
const dataRight = [
  [
    "    BULAN",
    `${dataBulan.bulan_ke} (${angkaKeHuruf(dataBulan.bulan_ke)})`
  ],
  [
    "    TANGGAL",
    `${formatTanggal(dataBulan.tgl_awal)} s/d ${formatTanggal(dataBulan.tgl_akhir)}`
  ],
  [
    "    WAKTU PELAKSANAAN",
    `${dataBulan.waktu_pelaksanaan} Hari`
  ],
  [
    "    WAKTU BERJALAN",
    `${dataBulan.waktu_berjalan} Hari`
  ],
  [
    "    SISA WAKTU",
    `${dataBulan.sisa_waktu} Hari`
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
  "S/D BULAN LALU",
  "DALAM BULAN INI",
  "S/D BULAN INI",
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
// 🔥 BARIS NOMOR KOLOM (FINAL FIX)
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

dataBulan.data.forEach((item) => {

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

    sheet.getCell(`A${rowIndex}`).value = roman[nomorSub - 1];
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
    sheet.getCell(`J${rowIndex}`).value = item.bulan_ini || 0;
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
  for (let c = 1; c <= 14; c++) {

    const cell = sheet.getRow(r).getCell(c);

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
      cell.value = val;
      cell.numFmt = "0.000"; // 🔥 3 angka belakang
    }
  };

  // 🔥 helper persen (khusus progress_item)
  const setPercent = (cell, val) => {
    if (!val || val === 0) {
      cell.value = null;
    } else {
      cell.value = val / 100; // 🔥 penting!
      cell.numFmt = "0.000%";
    }
  };

  // =========================
  // 🔥 APPLY FORMAT
  // =========================

  setNumber(row.getCell(8), row.getCell(8).value);   // bobot
  setNumber(row.getCell(9), row.getCell(9).value);   // sd lalu
  setNumber(row.getCell(10), row.getCell(10).value); // bulan ini
  setNumber(row.getCell(11), row.getCell(11).value); // sd ini

  setPercent(row.getCell(12), row.getCell(12).value); // progress_item
  setNumber(row.getCell(13), row.getCell(13).value);  // progres_proyek (bukan persen!)
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

totalCell.value = {
  formula: `SUM(H${startRow + 3}:H${rowIndex - 1})`
};

totalCell.font = { bold: true };
totalCell.numFmt = "0.000";
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
  ["Persentase Bulan Ini", dataBulan.real_kumulatif],
  ["Rencana", dataBulan.rencana_kumulatif],
  ["Deviasi", dataBulan.deviasi],
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
    tipe_laporan: "bulanan"
  }
});

const template = ttdData?.layout;

// =========================
// 🔥 VALIDASI
// =========================
if (!template || !template.top || !template.bottom) {
  throw new Error("Template TTD tidak ditemukan / tidak lengkap");
}

// =========================
// 🔥 POSISI
// =========================
let ttdStart = rowIndex + 5;


// =========================
// 🔥 TOP
// =========================
const maxHeaderTop = Math.max(
  ...template.top.map(col => col.header?.length || 0)
);

const namaTopRow = ttdStart + maxHeaderTop + 4;

template.top.forEach((col) => {

  const colCenter = col.range; // 🔥 langsung pakai dari DB

  if (!colCenter) return; // safety

  // HEADER
  (col.header || []).forEach((text, i) => {
    const cell = sheet.getCell(`${colCenter}${ttdStart + i}`);
    cell.value = text || "";
    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: false
    };
  });

  // NAMA
  const namaCell = sheet.getCell(`${colCenter}${namaTopRow}`);
  namaCell.value = col.nama || "";
  namaCell.font = { bold: true };
  namaCell.alignment = { horizontal: "center" };
  // JABATAN
  const jabCell = sheet.getCell(`${colCenter}${namaTopRow + 1}`);
  jabCell.value = col.jabatan || "";
  jabCell.alignment = { horizontal: "center" };
});

// =========================
// 🔥 BOTTOM
// =========================
const bottomStart = namaTopRow + 4;

const maxHeaderBottom = Math.max(
  ...template.bottom.map(col => col.header?.length || 0)
);

const namaBottomRow = bottomStart + maxHeaderBottom + 5;

template.bottom.forEach((col) => {

  const colCenter = col.range;

  if (!colCenter) return;

  // HEADER
  (col.header || []).forEach((text, i) => {
    const cell = sheet.getCell(`${colCenter}${bottomStart + i}`);
    cell.value = text || "";
    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: false
    };
  });

  // NAMA
  const namaCell = sheet.getCell(`${colCenter}${namaBottomRow}`);
  namaCell.value = col.nama || "";
  namaCell.font = { bold: true };
  namaCell.alignment = { horizontal: "center" };

  // JABATAN
  const jabCell = sheet.getCell(`${colCenter}${namaBottomRow + 1}`);
  jabCell.value = col.jabatan || "";
  jabCell.alignment = { horizontal: "center" };
});


// =========================
// 🔥 BORDER KOTAK TTD
// =========================
const endRow = namaBottomRow + 2;

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
    // 🔥 EXPORT
    // =========================
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Laporan_Bulanan_${bulan}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};