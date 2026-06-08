import { DataTypes } from "sequelize";
import { sequelize } from "../config/Database.js";

export const ProjectAnalisaDetail = sequelize.define("ProjectAnalisaDetail", {
  id: { 
    type: DataTypes.INTEGER, 
    autoIncrement: true, 
    primaryKey: true 
  },

  project_analisa_id: { 
    type: DataTypes.INTEGER, 
    allowNull: false,
    references: {
      model: "project_analisa", // 🔥 relasi ke project analisa
      key: "id"
    }
  },

  item_id: { 
    type: DataTypes.INTEGER, 
    allowNull: false,
    references: {
      model: "project_items", // 🔥 relasi ke project item
      key: "id"
    }
  },

  koefisien: { 
    type: DataTypes.DECIMAL(20, 8),
    allowNull: false 
  },

  rumus_harga: {
    type: DataTypes.STRING,
    allowNull: true
  },


}, {
  tableName: "project_analisa_detail",
  timestamps: true
});
