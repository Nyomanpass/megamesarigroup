import { DataTypes } from "sequelize";
import { sequelize } from "../config/Database.js";

export const DailyPekerja = sequelize.define("DailyPekerja", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },

  daily_progress_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "daily_progress",
      key: "id"
    }
  },

  worker_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "pekerja",
      key: "id"
    }
  },

  koef: {
    type: DataTypes.FLOAT
  },

  jumlah: {
    type: DataTypes.FLOAT
  },
  

}, {
  tableName: "daily_pekerja",
  timestamps: true
});