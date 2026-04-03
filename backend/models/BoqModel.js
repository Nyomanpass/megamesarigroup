import { DataTypes } from "sequelize";
import { sequelize } from "../config/Database.js";

export const Boq = sequelize.define("Boq", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },

  project_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: "projects", key: "id" }
  },

  parent_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: "boq_items", key: "id" }
  },

  kode: {
    type: DataTypes.STRING,
    allowNull: true
  },

  uraian: {
    type: DataTypes.TEXT,
    allowNull: false
  },

  satuan: {
    type: DataTypes.STRING,
    allowNull: true
  },

  volume: {
    type: DataTypes.DECIMAL(15, 4),
    allowNull: true
  },

  harga_satuan: {
    type: DataTypes.DECIMAL(20, 2),
    allowNull: true
  },

  // 🔥 AUTO HITUNG
  jumlah: {
    type: DataTypes.DECIMAL(20, 2),
    allowNull: true
  },

  ppn: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 11
  },

  jumlah_ppn: {
    type: DataTypes.DECIMAL(20, 2),
    allowNull: true
  },

  bobot: {
    type: DataTypes.DECIMAL(10, 4),
    allowNull: true
  },

  tipe: {
    type: DataTypes.ENUM(
      "header",
      "item",
      "total",
      "ppn",
      "grand_total",
      "pembulatan",
      "subheader"
    ),
    defaultValue: "item" // 🔥 FIX TYPO
  }

}, {
  tableName: "boq_items",
  timestamps: true
});