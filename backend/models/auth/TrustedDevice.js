// models/TrustedDevice.js
import { DataTypes } from "sequelize";
import { sequelize } from "../../config/Database.js";

export const TrustedDevice = sequelize.define("trusted_device", {
  user_id: {
    type: DataTypes.INTEGER,
  },
  device_id: {
    type: DataTypes.TEXT,
  },
  last_used: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
});