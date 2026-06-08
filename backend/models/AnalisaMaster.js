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
    type: DataTypes.DECIMAL(10, 8),
    defaultValue: 10 
  },

  use_pembulatan: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }

}, {
  tableName: "analisa_master",
  timestamps: true
});
