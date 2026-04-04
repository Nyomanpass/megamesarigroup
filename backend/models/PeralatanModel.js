import { DataTypes } from "sequelize";
import { sequelize } from "../config/Database.js";

export const Peralatan = sequelize.define("Peralatan", {
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
  },

  di_bilang: { 
    type: DataTypes.FLOAT, 
    allowNull: true,
    defaultValue: 0
  }

}, {
  tableName: "peralatan", // 🔥 WAJIB
  timestamps: true
});