import { DataTypes } from "sequelize";
import { sequelize } from "../../config/Database.js";

export const RefreshToken = sequelize.define("RefreshToken", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  token: { type: DataTypes.TEXT, allowNull: false },
  expired_at: { type: DataTypes.DATE, allowNull: false }
}, {
  tableName: "refresh_tokens",
  timestamps: true
});