import "dotenv/config";
import { sequelize } from "./config/Database.js";
import { AnalisaMasterDetail } from "./models/AnalisaMasterDetail.js";

const MigrateAnalisaDetail = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync();

    await AnalisaMasterDetail.bulkCreate([
        // 🔹 Analisa ID = 2
        { analisa_id: 2, item_id: 22, koefisien: 0.78 },
        { analisa_id: 2, item_id: 23, koefisien: 0.39 },
        { analisa_id: 2, item_id: 28, koefisien: 0.039 },
        { analisa_id: 2, item_id: 29, koefisien: 0.013 },
        { analisa_id: 2, item_id: 1, koefisien: 1.2 },
        { analisa_id: 2, item_id: 5, koefisien: 0.432 },

        // 🔹 Analisa ID = 1
        { analisa_id: 1, item_id: 22, koefisien: 0.24 },
        { analisa_id: 1, item_id: 29, koefisien: 0.024 },
        { analisa_id: 1, item_id: 46, koefisien: 0.06 },
        { analisa_id: 1, item_id: 45, koefisien: 0.06 }
    ]);

    console.log("✅ Seeder Analisa Detail berhasil");
    process.exit();
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
};

MigrateAnalisaDetail();