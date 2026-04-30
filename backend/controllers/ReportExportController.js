import ExcelJS from "exceljs";
import { getDailyReport } from "./ReportController.js";
import { Project } from "../models/ProjectModel.js";
import path from "path";
import { ProjectItem } from "../models/ProjekItem.js";
import { Boq } from "../models/BoqModel.js";
import { DailyPlan } from "../models/DailyPlanModel.js";
import { TtdTemplate } from "../models/TtdTemplate.js";


export const exportDailyReportExcel = async (req, res) => {
  try {
    const { day } = req.query;
    const project = await Project.findByPk(req.params.project_id);

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

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Laporan Harian");
// =========================
// 🔥 HEADER ATAS
// =========================

const info = report.data[0] || {};
let row = 2;

// =========================
// 🔥 KIRI (PROJECT - DIGABUNG KE SAMPING)
// =========================
const labels = [
  "Kegiatan","Sub Kegiatan","Pekerjaan","Nomor Kontrak",
  "Tanggal Kontrak","Nomor SPMK","Tanggal SPMK",
  "Kontraktor","Konsultan","Waktu Pelaksanaan",
  "Nilai Kontrak","Lokasi","Tahun"
];

const values = [
  project.kegiatan,
  project.sub_kegiatan,
  project.pekerjaan,
  project.no_kontrak,
  formatDate(project.tgl_kontrak),
  project.no_spmk,
  formatDate(project.tgl_spmk),
  project.kontraktor,
  project.konsultan,
  `${project.waktu_pelaksanaan} Hari`,
  `Rp. ${Number(project.nilai_kontrak).toLocaleString("id-ID")}`,
  project.lokasi,
  project.tahun
];

labels.forEach((label, i) => {
  const r = row + i;

  sheet.getCell(`A${r}`).value = label;
  sheet.getCell(`B${r}`).value = ":";
  sheet.getCell(`C${r}`).value = values[i];

  sheet.getCell(`A${r}`).font = { bold: true };

  sheet.getCell(`A${r}`).alignment = { horizontal: "left" };
  sheet.getCell(`C${r}`).alignment = { horizontal: "left" };
  sheet.getCell(`C${r}`).alignment = { 
    horizontal: "left",
    wrapText: false
  };
});

// =========================
// 🔥 HEADER KANAN (FULL U)
// =========================
// =========================
// 🔥 JUDUL ATAS
// =========================
sheet.mergeCells("J1:M1"); // kiri (J-M)
sheet.mergeCells("N1:U1"); // kanan (N-U)

sheet.getCell("J1").value = "KONSULTAN PENGAWAS";
sheet.getCell("N1").value = "KONTRAKTOR PELAKSANA";

["J1", "N1"].forEach(cell => {
  sheet.getCell(cell).alignment = {
    horizontal: "center",
    vertical: "middle"
  };
  sheet.getCell(cell).font = { bold: true };
});

// =========================
// 🔥 BOX LOGO
// =========================
sheet.mergeCells("J2:M8"); // kiri FULL
sheet.mergeCells("N2:U8"); // kanan FULL

// =========================
// 🔥 LOGO
// =========================
try {

// helper: konversi column width → pixel (perkiraan Excel)
const colWidthToPx = (w) => Math.floor((w || 8.43) * 7 + 5);
// helper: konversi row height → pixel
const rowHeightToPx = (h) => Math.floor((h || 15) * 96 / 72);

// hitung lebar box J–M dalam pixel
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

// =========================
// 🔵 LOGO KONSULTAN (CENTER J–M)
// =========================
if (project.logo_konsultan) {
  const logoKonsultan = workbook.addImage({
    filename: path.join("uploads", project.logo_konsultan),
    extension: "png"
  });

  const startCol = 9; // J
  const endCol   = 13; // M
  const startRow = 2;
  const endRow   = 8;

  const boxW = getBoxWidthPx(sheet, startCol, endCol);
  const boxH = getBoxHeightPx(sheet, startRow, endRow);

  const imgW = 500; // ukuran kamu (sudah pas)
  const imgH = 80;

  // offset supaya tepat di tengah
  const offsetX = Math.max(0, (boxW - imgW) / 2 + 50);
  const offsetY = Math.max(0, (boxH - imgH) / 2 + 10);

sheet.addImage(logoKonsultan, {
  tl: {
    col: startCol + 0.9, 
    row: startRow,
    nativeColOff: Math.round((offsetX + 20) * 9525),
    nativeRowOff: Math.round(offsetY * 9525)
  },
  ext: { width: imgW, height: imgH }
});
}

// =========================
// 🔵 LOGO KONTRAKTOR (CENTER N–U)
// =========================
if (project.logo_kontraktor) {
  const logoKontraktor = workbook.addImage({
    filename: path.join("uploads", project.logo_kontraktor),
    extension: "png"
  });

  const startCol = 14; // N
  const endCol   = 21; // U
  const startRow = 2;
  const endRow   = 8;

  const boxW = getBoxWidthPx(sheet, startCol, endCol);
  const boxH = getBoxHeightPx(sheet, startRow, endRow);

  const imgW = 550;
  const imgH = 80;

  const offsetX = Math.max(0, (boxW - imgW) / 2 + 50);
  const offsetY = Math.max(0, (boxH - imgH) / 2 + 10);

sheet.addImage(logoKontraktor, {
  tl: {
    col: startCol,
    row: startRow,
    nativeColOff: Math.round((offsetX + 10) * 9525),
    nativeRowOff: Math.round(offsetY * 9525)
  },
  ext: { width: imgW, height: imgH }
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
sheet.mergeCells("J9:U9");
sheet.mergeCells("J10:U10");
sheet.mergeCells("J14:U14");

// =========================
// 🔥 ISI
// =========================
sheet.getCell("J9").value = " ";
sheet.getCell("J10").value = "LAPORAN HARIAN";

// MINGGU
sheet.getCell("J11").value = "MINGGU";
sheet.getCell("K11").value = ":";
sheet.mergeCells("L11:U11");
sheet.getCell("L11").value = dailyPlan?.minggu_ke
  ? `${dailyPlan.minggu_ke}`
  : "-";

// HARI
sheet.getCell("J12").value = "HARI";
sheet.getCell("K12").value = ":";
sheet.mergeCells("L12:U12");
sheet.getCell("L12").value =
  new Date(info.tanggal || new Date())
    .toLocaleDateString("id-ID", { weekday: "long" });

// TANGGAL
sheet.getCell("J13").value = "TANGGAL";
sheet.getCell("K13").value = ":";
sheet.mergeCells("L13:U13");
sheet.getCell("L13").value = formatDate(info.tanggal);

sheet.getCell("J14").value = " ";

// =========================
// 🔥 STYLE
// =========================
sheet.getCell("J10").font = { bold: true };

for (let i = 10; i <= 13; i++) {
  sheet.getCell(`J${i}`).alignment = {
    horizontal: "left",
    vertical: "middle"
  };
}

// =========================
// 🔥 BORDER SAMPING
// =========================
[9, 14].forEach(i => {
  for (let j = 10; j <= 21; j++) {
    sheet.getRow(i).getCell(j).border = {
      left: { style: "thin" },
      right: { style: "thin" }
    };
  }
});

// ROW 10
for (let j = 10; j <= 21; j++) {
  sheet.getRow(10).getCell(j).border = {
    left: { style: "thin" },
    right: { style: "thin" }
  };
}

// DETAIL 11–13
for (let i = 11; i <= 13; i++) {

  sheet.getRow(i).getCell(10).border = {
    left: { style: "thin" }
  };

  sheet.getRow(i).getCell(11).border = {};

  for (let j = 12; j <= 21; j++) {
    sheet.getRow(i).getCell(j).border = {
      right: { style: "thin" }
    };
  }
}


    // =========================
    // 🔥 HEADER TABEL
    // =========================
    let startRow = 15;

    const headerFill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFD9D9D9" } // abu-abu
    };

    ["A","B","G","J","O"].forEach(col => {
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
    sheet.mergeCells(`J${startRow}:N${startRow}`);
    sheet.mergeCells(`O${startRow}:U${startRow}`);

    sheet.getCell(`A${startRow}`).value = "NO";
    sheet.getCell(`B${startRow}`).value = "TENAGA KERJA";
    sheet.getCell(`G${startRow}`).value = "PERALATAN";
    sheet.getCell(`J${startRow}`).value = "PENGGUNAAN MATERIAL";
    sheet.getCell(`O${startRow}`).value = "PEKERJAAN";

    // SUB HEADER
    // 🔥 JABATAN FULL LEBAR
    sheet.mergeCells(`B${startRow + 1}:D${startRow + 1}`);
    sheet.getCell(`B${startRow + 1}`).value = "JABATAN";
    sheet.getCell(`E${startRow + 1}`).value = "JUMLAH";
    sheet.getCell(`F${startRow + 1}`).value = "SAT";

    sheet.getCell(`G${startRow + 1}`).value = "JENIS ALAT";
    sheet.getCell(`H${startRow + 1}`).value = "JUMLAH";
    sheet.getCell(`I${startRow + 1}`).value = "SAT";
    
    sheet.getCell(`J${startRow + 1}`).value = "JENIS MATERIAL";
    sheet.getCell(`K${startRow + 1}`).value = "VOL";
    sheet.getCell(`L${startRow + 1}`).value = "SAT";
    sheet.getCell(`M${startRow + 1}`).value = "DITERIMA";
    sheet.getCell(`N${startRow + 1}`).value = "DITOLAK";

    sheet.mergeCells(`O${startRow + 1}:S${startRow + 1}`);
    sheet.getCell(`O${startRow + 1}`).value = "URAIAN";
    sheet.getCell(`T${startRow + 1}`).value = "VOL";
    sheet.getCell(`U${startRow + 1}`).value = "SAT";
    


    sheet.getColumn("A").width = 18;

    sheet.getColumn("B").width = 4;
    sheet.getColumn("C").width = 35;
    sheet.getColumn("D").width = 5;

    sheet.getColumn("E").width = 10;
    sheet.getColumn("F").width = 10;

    sheet.getColumn("G").width = 40;
    sheet.getColumn("H").width = 10;
    sheet.getColumn("I").width = 10;
    sheet.getColumn("J").width = 75;
    sheet.getColumn("K").width = 10;
    sheet.getColumn("L").width = 10;

    sheet.getColumn("M").width = 10; 
    sheet.getColumn("N").width = 10; 
    sheet.getColumn("O").width = 5;  
    sheet.getColumn("P").width = 5; 
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
      report.total_pekerja.length,
      report.total_peralatan.length,
      report.total_material.length,
      report.data.length
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
      const pekerja = report.total_pekerja[i];
      const alat = report.total_peralatan[i];
      const material = report.total_material[i];
      const pekerjaan = report.data[i];

      sheet.getCell(`A${rowIndex}`).value = i + 1;
      sheet.mergeCells(`B${rowIndex}:D${rowIndex}`);
      sheet.mergeCells(`O${rowIndex}:S${rowIndex}`);

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
        sheet.getCell(`K${rowIndex}`).value = material.total;
        sheet.getCell(`K${rowIndex}`).numFmt = "0.00";
        sheet.getCell(`L${rowIndex}`).value = material.satuan;
      }

      // PEKERJAAN
       if (pekerjaan) {

  if (!pekerjaan.boq_id) continue;

  const boqItem = boqMap[pekerjaan.boq_id];
  if (!boqItem) continue;

  const { parent, sub } = getHierarchy(boqMap, boqItem);

  // HEADER
  if (parent && parent !== lastParent) {

    // 🔥 kasih jarak sebelum header baru (kecuali pertama)
    if (!isFirstGroup) {
      pekerjaanRow++; // ⬅️ ini baris kosong
    }

    sheet.getCell(`O${pekerjaanRow}`).value = parent;
    sheet.getCell(`O${pekerjaanRow}`).font = { bold: true };

    pekerjaanRow++;

    lastParent = parent;
    lastSubParent = null;
    isFirstGroup = false;
  }

  // SUBHEADER
  if (sub && sub !== lastSubParent) {
    sheet.getCell(`O${pekerjaanRow}`).value = "  " + sub;
    sheet.getCell(`O${pekerjaanRow}`).font = { bold: true };

    pekerjaanRow++;
    lastSubParent = sub;
  }

  // ITEM
  sheet.getCell(`O${pekerjaanRow}`).value = "    " + pekerjaan.uraian;

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
for (let i = startRow + 2; i <= rowIndex; i++) {
  sheet.getRow(i).height = 20;
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
    for (let i = startRow; i <= rowIndex; i++) {
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

sheet.getCell(`A${startFooter}`).value = "JUMLAH";

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
sheet.getCell(`A${row2}`).value = "KEADAAN CUACA";

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
`Hari ini : Dapat Bekerja
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
    sheet.getCell(`${startCol}${ttdTop + i}`).value = text;
  });

  // nama
  sheet.mergeCells(`${startCol}${namaRow}:${endCol}${namaRow}`);
  sheet.getCell(`${startCol}${namaRow}`).value = col.nama;

  // jabatan
  sheet.mergeCells(`${startCol}${namaRow + 1}:${endCol}${namaRow + 1}`);
  sheet.getCell(`${startCol}${namaRow + 1}`).value = col.jabatan;
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
      `attachment; filename=laporan_harian_${day}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};