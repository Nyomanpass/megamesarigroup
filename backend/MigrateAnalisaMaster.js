import "dotenv/config"; 
import { sequelize } from "./config/Database.js";
import { AnalisaMaster } from "./models/AnalisaMaster.js";

const MigrateAnalisaMaster = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync();

    await AnalisaMaster.bulkCreate([
      {
        kode: "1.1",
        nama: "Pengeboran 1m lubang bored",
        satuan: "m"
      },
      {
        kode: "1.2",
        nama: "Pasang Batu kali",
        satuan: "m3"
      }
    ]);

    console.log("✅ Seeder AnalisaMaster berhasil");
    process.exit();
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
};

MigrateAnalisaMaster();