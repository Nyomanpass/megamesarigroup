import { DataTypes } from "sequelize";
import { sequelize } from "../config/Database.js";

export const BoqVersionChange = sequelize.define(
  "BoqVersionChange",
  {

    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },

    version_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "project_versions",
        key: "id"
      }
    },

    boq_item_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "boq_items",
        key: "id"
      }
    },

    // 🔥 override volume
    volume: {
      type: DataTypes.DECIMAL(20,7),
      allowNull: true
    },

    // 🔥 override harga
    harga_satuan: {
      type: DataTypes.DECIMAL(20,2),
      allowNull: true
    },

    action: {
      type: DataTypes.ENUM(
        "update",
        "new",
        "delete"
      ),
      defaultValue: "update"
    }

  },
  {
    tableName: "boq_version_changes",
    timestamps: true
  }
);