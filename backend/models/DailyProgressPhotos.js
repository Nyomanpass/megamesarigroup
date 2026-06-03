import { DataTypes } from "sequelize";
import { sequelize } from "../config/Database.js";

export const DailyProgressPhoto =
  sequelize.define(
    "DailyProgressPhoto",
    {

      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },

      daily_progress_id: {
        type: DataTypes.INTEGER,
        allowNull: false,

        references: {
          model: "daily_progress",
          key: "id"
        }
      },

      photo_url: {
        type: DataTypes.STRING,
        allowNull: false
      }

    },
    {
      tableName: "daily_progress_photos",
      timestamps: true
    }
  );