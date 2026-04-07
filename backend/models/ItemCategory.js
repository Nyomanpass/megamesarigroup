import { DataTypes } from "sequelize";
import { sequelize } from "../config/Database.js";

export const ItemCategory = sequelize.define("ItemCategory", {
  id: { 
    type: DataTypes.INTEGER, 
    autoIncrement: true, 
    primaryKey: true 
  },

  nama: { 
    type: DataTypes.STRING, 
    allowNull: false 
  }

}, {
  tableName: "item_categories",
  timestamps: true
});