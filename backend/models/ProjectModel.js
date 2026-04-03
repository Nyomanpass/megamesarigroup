import { DataTypes } from "sequelize";
import { sequelize } from "../config/Database.js";

export const Project = sequelize.define("Project", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },

  kegiatan: DataTypes.STRING,
  pekerjaan: DataTypes.STRING,
  no_kontrak: DataTypes.STRING,
  tgl_kontrak: DataTypes.DATE,
  no_spmk: DataTypes.STRING,
  tgl_spmk: DataTypes.DATE,
  end_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  kontraktor: DataTypes.STRING,
  konsultan: DataTypes.STRING,
  waktu_pelaksanaan: DataTypes.INTEGER,
  nilai_kontrak: DataTypes.FLOAT,
  lokasi: DataTypes.TEXT,
  tahun: DataTypes.INTEGER

}, {
  tableName: "projects",
  timestamps: true
});