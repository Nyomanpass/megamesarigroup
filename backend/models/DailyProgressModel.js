import { DataTypes } from "sequelize";
import { sequelize } from "../config/Database.js";

export const DailyProgress = sequelize.define("DailyProgress", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },

  project_id: { type: DataTypes.INTEGER, allowNull: false, references: {
    model: "projects", // 🔥 harus sama dengan nama tabel
    key: "id"
  } },
  boq_id: { type: DataTypes.INTEGER, allowNull: false, references: {
      model: "boq_items", // nama tabel (bukan nama file)
      key: "id"
    }
  },

  tanggal: { type: DataTypes.DATEONLY, allowNull: false },
  volume: { type: DataTypes.FLOAT },
  cuaca: { 
    type: DataTypes.STRING, 
    allowNull: true 
  },

  catatan: { 
    type: DataTypes.TEXT, 
    allowNull: true 
  },

  jam_mulai: { 
    type: DataTypes.TIME, 
    allowNull: true 
  },

  jam_selesai: { 
    type: DataTypes.TIME, 
    allowNull: true 
  },
  
}, {
  tableName: "daily_progress",
  timestamps: true
});