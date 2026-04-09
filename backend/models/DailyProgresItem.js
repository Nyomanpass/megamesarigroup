import { DataTypes } from "sequelize";
import { sequelize } from "../config/Database.js";

export const DailyProgressItem = sequelize.define("daily_progress_items", {
  daily_progress_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "daily_progress",
      key: "id"
    }
  },

    item_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
        model: "project_items",
        key: "id"
    }
    },

  nama: DataTypes.STRING,
  tipe: DataTypes.STRING,
  satuan: DataTypes.STRING,

  koef: DataTypes.FLOAT,
  volume: DataTypes.FLOAT,
  hasil: DataTypes.FLOAT

}, {
  freezeTableName: true
});