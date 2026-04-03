import { DataTypes } from "sequelize";
import { sequelize } from "../config/Database.js";

export const ProjectWeek = sequelize.define("ProjectWeek", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },

  project_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
    model: "projects", // 🔥 harus sama dengan nama tabel
    key: "id"
  }
  },

  minggu_ke: {
    type: DataTypes.INTEGER,
    allowNull: false
  },

  start_date: {
    type: DataTypes.DATEONLY
  },

  end_date: {
    type: DataTypes.DATEONLY
  }

}, {
  tableName: "project_weeks",
  timestamps: true
});