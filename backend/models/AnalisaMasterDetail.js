import { DataTypes } from "sequelize";
import { sequelize } from "../config/Database.js";

export const AnalisaMasterDetail = sequelize.define("AnalisaMasterDetail", {
  id: { 
    type: DataTypes.INTEGER, 
    autoIncrement: true, 
    primaryKey: true 
  },

  analisa_id: { 
    type: DataTypes.INTEGER, 
    allowNull: false,
    references: {
      model: "analisa_master",
      key: "id"
    }
  },

  item_id: { 
    type: DataTypes.INTEGER, 
    allowNull: false,
    references: {
      model: "master_items",
      key: "id"
    }
  },

  koefisien: { 
    type: DataTypes.FLOAT, 
    allowNull: false 
  }

}, {
  tableName: "analisa_master_detail",
  timestamps: true
});