import { DataTypes } from "sequelize";
import { sequelize } from "../config/Database.js";

export const DailyPlan = sequelize.define("DailyPlan", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  project_id: { type: DataTypes.INTEGER, allowNull: false, references: {
    model: "projects", // 🔥 harus sama dengan nama tabel
    key: "id"
  } },
 
  tanggal: { type: DataTypes.DATEONLY, allowNull: false },
  nama_hari: { type: DataTypes.STRING }, // Senin, Selasa, dst.
  hari_ke: { type: DataTypes.INTEGER }, // Hari ke-1, ke-2, dst. dalam periode
  minggu_ke: { type: DataTypes.INTEGER },
  bulan_ke: { type: DataTypes.INTEGER }, // Relasi ke ProjectPeriod.bulan_ke
  
  bobot_mingguan: { 
    type: DataTypes.DECIMAL(10, 4) // Angka dari Schedule (misal: 2.617)
  },
  bobot_harian: { 
    type: DataTypes.DECIMAL(10, 4) // bobot_mingguan / 7 (misal: 0.3739)
  },
  rencana_kumulatif: { 
    type: DataTypes.DECIMAL(10, 4) // S-Curve harian
  }
}, {
  tableName: "daily_plans",
  timestamps: true
});