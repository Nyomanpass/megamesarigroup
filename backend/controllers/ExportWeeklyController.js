import ExcelJS from "exceljs";
import { getWeeklyReport } from "./ReportController.js";

export const exportWeeklyReportExcel = async (req, res) => {
  try {
    const { minggu } = req.query;

    // =========================
    // 🔥 AMBIL DATA WEEKLY
    // =========================
    let fakeRes = {
      jsonData: null,
      json(data) {
        this.jsonData = data;
      }
    };

    await getWeeklyReport(req, fakeRes);
    const weekly = fakeRes.jsonData;

    // 🔥 ambil minggu yang dipilih
    const dataMinggu = weekly.find(w => w.minggu_ke == minggu);

    if (!dataMinggu) {
      return res.status(404).json({ message: "Data minggu tidak ditemukan" });
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Laporan Mingguan");

    // =========================
    // 🔥 HEADER
    // =========================
    sheet.mergeCells("A1:G1");
    sheet.getCell("A1").value = "LAPORAN MINGGUAN";
    sheet.getCell("A1").font = { bold: true, size: 16 };
    sheet.getCell("A1").alignment = { horizontal: "center" };

    sheet.addRow([]);
    sheet.addRow(["Minggu Ke", ":", dataMinggu.minggu_ke]);
    sheet.addRow(["Tanggal", ":", `${dataMinggu.tgl_awal} - ${dataMinggu.tgl_akhir}`]);
    sheet.addRow(["Rencana", ":", dataMinggu.rencana]);
    sheet.addRow(["Real", ":", dataMinggu.real]);
    sheet.addRow(["Deviasi", ":", dataMinggu.deviasi]);

    sheet.addRow([]);

    // =========================
    // 🔥 HEADER TABLE
    // =========================
    const startRow = sheet.lastRow.number + 1;

    sheet.getRow(startRow).values = [
      "NO",
      "URAIAN",
      "BOBOT (%)",
      "VOL TOTAL",
      "MINGGU INI",
      "S/D INI",
      "PROGRESS (%)"
    ];

    sheet.getRow(startRow).font = { bold: true };

    // =========================
    // 🔥 DATA
    // =========================
    let rowIndex = startRow + 1;

    dataMinggu.data.forEach((item, i) => {
      sheet.getRow(rowIndex).values = [
        i + 1,
        item.uraian,
        item.bobot,
        item.total,
        item.minggu_ini,
        item.sd_ini,
        item.progress_item
      ];

      rowIndex++;
    });

    // =========================
    // 🔥 STYLE BORDER
    // =========================
    for (let i = startRow; i < rowIndex; i++) {
      for (let j = 1; j <= 7; j++) {
        const cell = sheet.getRow(i).getCell(j);

        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" }
        };

        cell.alignment = {
          vertical: "middle",
          horizontal: j === 1 ? "center" : "left"
        };
      }
    }

    // =========================
    // 🔥 WIDTH
    // =========================
    sheet.getColumn(1).width = 6;
    sheet.getColumn(2).width = 40;
    sheet.getColumn(3).width = 12;
    sheet.getColumn(4).width = 15;
    sheet.getColumn(5).width = 15;
    sheet.getColumn(6).width = 15;
    sheet.getColumn(7).width = 15;

    // =========================
    // 🔥 EXPORT
    // =========================
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Laporan_Mingguan_${minggu}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error("EXPORT WEEKLY ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};