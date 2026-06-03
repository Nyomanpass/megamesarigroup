import { DataTypes } from "sequelize";
import { sequelize } from "../config/Database.js";

export const Boq = sequelize.define(
  "Boq",
  {

    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },

    project_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "projects",
        key: "id"
      }
    },

    // 🔥 relasi analisa
    analisa_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "project_analisa",
        key: "id"
      }
    },

    parent_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "boq_items",
        key: "id"
      }
    },

    kode: {
      type: DataTypes.STRING,
      allowNull: true
    },

    uraian: {
      type: DataTypes.TEXT,
      allowNull: false
    },

    satuan: {
      type: DataTypes.STRING,
      allowNull: true
    },

    // 🔥 BASELINE MC0
    volume: {
      type: DataTypes.DECIMAL(20,7),
      allowNull: true
    },

    // 🔥 dari analisa awal
    harga_satuan: {
      type: DataTypes.DECIMAL(20,2),
      allowNull: true
    },

    ppn: {
      type: DataTypes.DECIMAL(5,2),
      defaultValue: 11
    },


    tipe: {
      type: DataTypes.ENUM(
        "header",
        "item",
        "total",
        "ppn",
        "grand_total",
        "pembulatan",
        "subheader"
      ),
      defaultValue: "item"
    }

  },
  {
    tableName: "boq_items",
    timestamps: true
  }
);