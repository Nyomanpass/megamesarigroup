import "dotenv/config";
import { sequelize } from "./config/Database.js";
import { ItemCategory } from "./models/ItemCategory.js";

const MigrateCategoryItem = async () => {
  try {
    // 🔥 koneksi DB
    await sequelize.authenticate();

    // 🔥 pastikan tabel ada
    await sequelize.sync();

    // 🔥 insert / update data
    await ItemCategory.bulkCreate([
      { id: 1, nama: "Batu Kali Dan Batu Alam" },
      { id: 2, nama: "Beton Ready Mixed" },
      { id: 3, nama: "Semen" },
      { id: 4, nama: "Peralatan bangunan" }
    ], {
      updateOnDuplicate: ["nama", "updatedAt"]
    });

    console.log("✅ Seeder berhasil");
    process.exit();
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
};

MigrateCategoryItem();