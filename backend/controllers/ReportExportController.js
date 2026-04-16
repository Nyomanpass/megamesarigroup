import ExcelJS from "exceljs";
import { getDailyReport } from "./ReportController.js";
import { Project } from "../models/ProjectModel.js";
import path from "path";

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
  project.kegiatan,
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

  // 🔥 gabung ke samping biar lebar
  sheet.mergeCells(`C${r}:G${r}`);

  sheet.getCell(`A${r}`).value = label;
  sheet.getCell(`B${r}`).value = ":";
  sheet.getCell(`C${r}`).value = values[i];

  sheet.getCell(`A${r}`).font = { bold: true };

  sheet.getCell(`A${r}`).alignment = { horizontal: "left" };
  sheet.getCell(`C${r}`).alignment = { horizontal: "left" };
});

// =========================
// 🔥 HEADER KANAN (FULL U)
// =========================

// JUDUL ATAS
sheet.mergeCells("H1:L1");
sheet.mergeCells("M1:U1");

sheet.getCell("H1").value = "KONSULTAN PENGAWAS";
sheet.getCell("M1").value = "KONTRAKTOR PELAKSANA";

sheet.getCell("H1").alignment = { horizontal: "center", vertical: "middle" };
sheet.getCell("M1").alignment = { horizontal: "center", vertical: "middle" };

sheet.getCell("H1").font = { bold: true };
sheet.getCell("M1").font = { bold: true };

// BOX LOGO
sheet.mergeCells("H2:L8"); // kiri
sheet.mergeCells("M2:U8"); // kanan (FULL)

// =========================
// 🔥 LOGO
// =========================
try {

  // 🔵 LOGO KONSULTAN
  if (project.logo_konsultan) {
    const img = workbook.addImage({
      filename: path.join("uploads", project.logo_konsultan),
      extension: "png"
    });

    sheet.addImage(img, {
      tl: { col: 7.5, row: 2 },
      br: { col: 11.5, row: 7 }
    });
  }

  // 🔵 LOGO KONTRAKTOR
  if (project.logo_kontraktor) {
    const img = workbook.addImage({
      filename: path.join("uploads", project.logo_kontraktor),
      extension: "png"
    });

    sheet.addImage(img, {
      tl: { col: 13, row: 2 },
      br: { col: 20, row: 7 }
    });
  }

} catch (error) {
  console.log("Logo error:", error.message);
}

// =========================
// 🔥 BORDER HEADER LOGO
// =========================
for (let i = 1; i <= 8; i++) {
  for (let j = 8; j <= 21; j++) {
    sheet.getRow(i).getCell(j).border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" }
    };
  }
}

// =========================
// 🔥 MERGE DULU
// =========================
sheet.mergeCells("H9:U9");
sheet.mergeCells("H10:U10");
sheet.mergeCells("H14:U14");

// =========================
// 🔥 ISI
// =========================
sheet.getCell("H9").value = " ";
sheet.getCell("H10").value = "LAPORAN HARIAN";

// MINGGU
sheet.getCell("H11").value = "MINGGU";
sheet.getCell("I11").value = ":";
sheet.mergeCells("J11:U11");
sheet.getCell("J11").value = day;

// HARI
sheet.getCell("H12").value = "HARI";
sheet.getCell("I12").value = ":";
sheet.mergeCells("J12:U12");
sheet.getCell("J12").value =
  new Date(info.tanggal || new Date())
    .toLocaleDateString("id-ID", { weekday: "long" });

// TANGGAL
sheet.getCell("H13").value = "TANGGAL";
sheet.getCell("I13").value = ":";
sheet.mergeCells("J13:U13");
sheet.getCell("J13").value = formatDate(info.tanggal);

sheet.getCell("H14").value = " ";

// =========================
// 🔥 STYLE TEXT
// =========================
sheet.getCell("H10").font = { bold: true };

for (let i = 10; i <= 13; i++) {
  sheet.getCell(`H${i}`).alignment = {
    horizontal: "left",
    vertical: "middle"
  };
}

// =========================
// 🔥 BORDER SAMPING (ROW 9 & 14)
// =========================
[9, 14].forEach(i => {
  for (let j = 8; j <= 21; j++) {
    const cell = sheet.getRow(i).getCell(j);

    cell.border = {
      left: { style: "thin" },
      right: { style: "thin" }
    };
  }
});


for (let j = 8; j <= 21; j++) {
  const cell = sheet.getRow(10).getCell(j);

  cell.border = {
    left: { style: "thin" },
    right: { style: "thin" }
  };
}

// =========================
for (let i = 11; i <= 13; i++) {

  // 🔥 H (kiri saja)
  const cellH = sheet.getRow(i).getCell(8);
  cellH.border = {
    left: { style: "thin" },
    right: undefined
  };

  // 🔥 I (kosong)
  const cellI = sheet.getRow(i).getCell(9);
  cellI.border = {};

  // 🔥 J (hapus kiri)
  const cellJ = sheet.getRow(i).getCell(10);
  cellJ.border = {
    left: undefined,
    right: { style: "thin" }
  };

  // 🔥 K–U
  for (let j = 11; j <= 21; j++) {
    const cell = sheet.getRow(i).getCell(j);

    cell.border = {
      left: undefined,
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
        wrapText: true
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
    sheet.getRow(startRow).height = 25;       // header utama
    sheet.getRow(startRow + 1).height = 22;   // sub header
    sheet.mergeCells(`A${startRow}:A${startRow + 1}`);
    sheet.mergeCells(`B${startRow}:F${startRow}`);
    sheet.mergeCells(`G${startRow}:I${startRow}`);
    sheet.mergeCells(`J${startRow}:N${startRow}`);
    sheet.mergeCells(`O${startRow}:U${startRow}`);

    sheet.getCell(`A${startRow}`).value = "NO";
    sheet.getCell(`B${startRow}`).value = "TENAGA KERJA";
    sheet.getCell(`G${startRow}`).value = "PERALATAN";
    sheet.getCell(`J${startRow}`).value = "MATERIAL";
    sheet.getCell(`O${startRow}`).value = "PEKERJAAN";

    // SUB HEADER
    // 🔥 JABATAN FULL LEBAR
    sheet.mergeCells(`B${startRow + 1}:D${startRow + 1}`);
    sheet.getCell(`B${startRow + 1}`).value = "JABATAN";
    sheet.getCell(`E${startRow + 1}`).value = "JUMLAH";
    sheet.getCell(`F${startRow + 1}`).value = "SAT";

    sheet.getCell(`G${startRow + 1}`).value = "ALAT";
    sheet.getCell(`H${startRow + 1}`).value = "JUMLAH";
    sheet.getCell(`I${startRow + 1}`).value = "SAT";

    sheet.getCell(`J${startRow + 1}`).value = "MATERIAL";
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
    sheet.getColumn("C").width = 17;
    sheet.getColumn("D").width = 17;

    sheet.getColumn("E").width = 10;
    sheet.getColumn("F").width = 8;

    sheet.getColumn("G").width = 38;
    sheet.getColumn("H").width = 10;
    sheet.getColumn("I").width = 10;
    sheet.getColumn("J").width = 38;
    sheet.getColumn("K").width = 10;
    sheet.getColumn("L").width = 10;

    sheet.getColumn("M").width = 10; 
    sheet.getColumn("N").width = 10; 
    sheet.getColumn("O").width = 5;  
    sheet.getColumn("P").width = 10; 
    sheet.getColumn("Q").width = 4;  
    sheet.getColumn("R").width = 15;  
    sheet.getColumn("S").width = 15;  
    sheet.getColumn("T").width = 10;  
    sheet.getColumn("U").width = 10;   

    


    // =========================
    // 🔥 ISI DATA
    // =========================
    let rowIndex = startRow + 2;
    const maxRows = 30;

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
        sheet.getCell(`E${rowIndex}`).value = pekerja.total;
        sheet.getCell(`F${rowIndex}`).value = pekerja.satuan;
      }

      // ALAT
      if (alat) {
        sheet.getCell(`G${rowIndex}`).value = alat.nama;
        sheet.getCell(`H${rowIndex}`).value = alat.total;
        sheet.getCell(`I${rowIndex}`).value = alat.satuan;
      }

      // MATERIAL
      if (material) {
        sheet.getCell(`J${rowIndex}`).value = material.nama;
        sheet.getCell(`K${rowIndex}`).value = material.total;
        sheet.getCell(`L${rowIndex}`).value = material.satuan;
      }

      // PEKERJAAN
      if (pekerjaan) {
        sheet.getCell(`O${rowIndex}`).value = pekerjaan.uraian;
        sheet.getCell(`T${rowIndex}`).value = pekerjaan.volume;
        sheet.getCell(`U${rowIndex}`).value = pekerjaan.satuan;
      }

      rowIndex++;
    }

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
    // 🔥 FOOTER FINAL
    // =========================
   const startFooter = rowIndex ;
    const row2 = startFooter + 1;

    // HEADER
    sheet.mergeCells(`A${startFooter}:D${startFooter}`);
    sheet.mergeCells(`E${startFooter}:H${startFooter}`);
    sheet.mergeCells(`I${startFooter}:U${startFooter}`);

    sheet.getCell(`A${startFooter}`).value = "KEADAAN CUACA";
    sheet.getCell(`E${startFooter}`).value = "JAM KERJA";
    sheet.getCell(`I${startFooter}`).value = "CATATAN";

    // ISI
    sheet.mergeCells(`A${row2}:D${row2}`);
    sheet.mergeCells(`E${row2}:H${row2}`);
    sheet.mergeCells(`I${row2}:U${row2}`);

    sheet.getCell(`A${row2}`).value = info.cuaca || "-";
    sheet.getCell(`E${row2}`).value = `${info.jam_mulai || "-"} s/d ${info.jam_selesai || "-"}`;
    sheet.getCell(`I${row2}`).value = "-";

    // STYLE
    for (let i = startFooter; i <= row2; i++) {
      for (let j = 1; j <= 21; j++) {
        const cell = sheet.getRow(i).getCell(j);

        cell.border = {
          top: { style: "medium" },
          left: { style: "thin" },
          bottom: { style: "medium" },
          right: { style: "thin" }
        };

        cell.alignment = {
          horizontal: i === startFooter ? "center" : "left",
          vertical: "middle",
          wrapText: true
        };
      }
    }

    // HEADER STYLE
    ["A","E","I"].forEach(col => {
      const cell = sheet.getCell(`${col}${startFooter}`);
      cell.font = { bold: true };
    });

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