import { DataTypes } from "sequelize";
import { sequelize } from "../config/Database.js";

export const AnalisaMaster = sequelize.define("AnalisaMaster", {
  id: { 
    type: DataTypes.INTEGER, 
    autoIncrement: true, 
    primaryKey: true 
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
  tableName: "analisa_master",
  timestamps: true
});