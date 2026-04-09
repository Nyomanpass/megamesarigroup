import { DataTypes } from "sequelize";
import { sequelize } from "../config/Database.js";

export const ProjectItem = sequelize.define("ProjectItem", {
  id: { 
    type: DataTypes.INTEGER, 
    autoIncrement: true, 
    primaryKey: true 
  },

  project_id: { 
    type: DataTypes.INTEGER, 
    allowNull: false 
  },

  nama: { 
    type: DataTypes.STRING, 
    allowNull: false 
  },

  tipe: { 
    type: DataTypes.ENUM("TENAGA", "BAHAN", "ALAT"), 
    allowNull: false 
  },

  satuan: { 
    type: DataTypes.STRING, 
    allowNull: false 
  },

  harga: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },

  category_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },

  terbilang: {
    type: DataTypes.INTEGER,
    allowNull: true
  }

}, {
  tableName: "project_items",
  timestamps: true
});