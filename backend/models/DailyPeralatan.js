import { DataTypes } from "sequelize";
import { sequelize } from "../config/Database.js";

export const DailyPeralatan = sequelize.define("DailyPeralatan", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },

  daily_progress_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "daily_progress",
      key: "id"
    }
  },

  tool_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "peralatan",
      key: "id"
    }
  },

  jumlah: {
    type: DataTypes.FLOAT,
    defaultValue: 1
  }

}, {
  tableName: "daily_peralatan",
  timestamps: true
});