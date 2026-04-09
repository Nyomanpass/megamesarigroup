import { DataTypes } from "sequelize";
import { sequelize } from "../config/Database.js";

export const ProjectAnalisa = sequelize.define("ProjectAnalisa", {
  id: { 
    type: DataTypes.INTEGER, 
    autoIncrement: true, 
    primaryKey: true 
  },

  project_id: { 
    type: DataTypes.INTEGER, 
    allowNull: false 
  },

  kode: { 
    type: DataTypes.STRING, 
    allowNull: false 
  },

  nama: { 
    type: DataTypes.STRING, 
    allowNull: false 
  },

  satuan: { 
    type: DataTypes.STRING, 
    allowNull: false 
  },

  overhead_persen: { 
    type: DataTypes.FLOAT, 
    defaultValue: 10 
  }

}, {
  tableName: "project_analisa",
  timestamps: true
});