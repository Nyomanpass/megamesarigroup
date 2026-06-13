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
      type: DataTypes.DECIMAL(20,8),
      allowNull: true
    },

    harga_satuan: {
      type: DataTypes.DECIMAL(20,2),
      allowNull: true
    },

    jumlah: {
      type: DataTypes.DECIMAL(20,6),
      allowNull: true
    },

    jumlah_ppn: {
      type: DataTypes.DECIMAL(20,6),
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
