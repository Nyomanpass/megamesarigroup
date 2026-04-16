import { DataTypes } from "sequelize";
import { sequelize } from "../config/Database.js";

export const MasterItem = sequelize.define("MasterItem", {
  id: { 
    type: DataTypes.INTEGER, 
    autoIncrement: true, 
    primaryKey: true 
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

    category: { // 🔥 opsional kalau mau samakan juga
      type: DataTypes.STRING,
      allowNull: true
    },


    terbilang: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: "master_items",
  timestamps: true
});