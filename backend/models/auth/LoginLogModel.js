import { DataTypes } from "sequelize";
import { sequelize } from "../../config/Database.js";

export const LoginLog = sequelize.define("LoginLog", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },

  user_id: { 
    type: DataTypes.INTEGER,
    allowNull: true
  },

  email: { 
    type: DataTypes.STRING,
    allowNull: false
  },

  ip_address: { 
    type: DataTypes.STRING
  },

  status: {
    type: DataTypes.ENUM("success", "failed"),
    allowNull: false
  }

}, {
  tableName: "login_logs",
  timestamps: true
});