import { DataTypes } from "sequelize";
import { sequelize } from "../config/Database.js";

export const Pekerja = sequelize.define("Pekerja", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },

  project_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },

  nama: {
    type: DataTypes.STRING,
    allowNull: false
  },

  satuan: {
    type: DataTypes.STRING,
    defaultValue: "org"
  },

  di_bilang: { 
    type: DataTypes.FLOAT, 
    allowNull: true,
    defaultValue: 0
  }
}, {
  tableName: "pekerja", // 🔥 WAJIB INI
  timestamps: true
});