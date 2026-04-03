import { DataTypes } from "sequelize";
import { sequelize } from "../config/Database.js";

export const Schedule = sequelize.define("Schedule", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },

  project_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "projects", 
      key: "id"
    }
  },

  boq_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "boq_items", 
      key: "id"
    }
  },

  minggu_ke: {
    type: DataTypes.INTEGER,
    allowNull: false
  },

  bobot: {
    type: DataTypes.DECIMAL(10, 4),
    allowNull: true
  }

}, {
  tableName: "schedule_items",
  timestamps: true
});