import { DataTypes } from "sequelize";
import { sequelize } from "../config/Database.js";

export const ProjectVersionModel = sequelize.define(
  "ProjectVersion",
  {

    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },

    project_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },

    code: {
      type: DataTypes.STRING
    },

    revision: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },

    // 🔥 addendum berlaku kapan
    effective_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },

    // 🔥 mulai minggu ke berapa
    effective_week: {
      type: DataTypes.INTEGER,
      allowNull: true
    },

    description: {
      type: DataTypes.TEXT,
      allowNull: true
    }

  },
  {
    tableName: "project_versions",
    timestamps: true
  }
);