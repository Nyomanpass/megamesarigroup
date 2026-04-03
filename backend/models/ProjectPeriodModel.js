import { DataTypes } from "sequelize";
import { sequelize } from "../config/Database.js";

export const ProjectPeriod = sequelize.define("ProjectPeriod", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },

  project_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "projects",
      key: "id"
    }
  },

  bulan_ke: {
    type: DataTypes.INTEGER,
    allowNull: false
  },

  nama: {
    type: DataTypes.STRING, // Termin 1, Termin 2
  },

  start_date: {
    type: DataTypes.DATE,
    allowNull: false
  },

  end_date: {
    type: DataTypes.DATE,
    allowNull: false
  }

}, {
  tableName: "project_periods",
  timestamps: true
});