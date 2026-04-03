import { DataTypes } from "sequelize";
import { sequelize } from "../../config/Database.js";

export const OTP = sequelize.define("OTP", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },

  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },

  code: {
    type: DataTypes.STRING,
    allowNull: false
  },

  expired_at: {
    type: DataTypes.DATE,
    allowNull: false
  },
  request_count: {
  type: DataTypes.INTEGER,
  defaultValue: 0
},
last_request_at: {
  type: DataTypes.DATE
}

}, {
  tableName: "otps",
  timestamps: true
});