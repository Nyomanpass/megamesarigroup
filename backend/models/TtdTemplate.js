import { DataTypes } from "sequelize";
import { sequelize } from "../config/Database.js";

export const TtdTemplate = sequelize.define("TtdTemplate", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },

  project_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "projects", // 🔥 nama tabel project
      key: "id"
    }
  },

  tipe_laporan: {
    type: DataTypes.ENUM("harian", "mingguan", "bulanan", "schedule"),
    allowNull: false
  },

  layout: {
    type: DataTypes.JSON, // 🔥 simpan JSON layout kamu
    allowNull: false
  }

}, {
  tableName: "ttd_templates",
  timestamps: true
});