import { DataTypes } from "sequelize";
import { sequelize } from "../config/Database.js";

export const DailyMaterial = sequelize.define("DailyMaterial", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },

  daily_progress_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "daily_progress",
      key: "id"
    }
  },

  material_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "materials",
      key: "id"
    }
  },

  koef: {
    type: DataTypes.FLOAT
  },

  hasil: {
    type: DataTypes.FLOAT
  }

}, {
  tableName: "daily_material",
  timestamps: true
});