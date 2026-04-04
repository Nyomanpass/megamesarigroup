import { DataTypes } from "sequelize";
import { sequelize } from "../config/Database.js";

export const Material = sequelize.define("Material", {
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
    allowNull: false
  }

}, {
  tableName: "materials", // 🔥 WAJIB TAMBAH INI
  timestamps: true
});