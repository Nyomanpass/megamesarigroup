import "dotenv/config"; 
import { sequelize } from "./config/Database.js";
import { MasterItem } from "./models/MasterItem.js";

const MigrateMasterItem = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync();

    await MasterItem.bulkCreate([
      // BAHAN
      { nama: "Batu Pecah Besar 15/30", tipe: "BAHAN", satuan: "m3", harga_default: 350000, category_id: 1, terbilang: null },
      { nama: "Kerikil", tipe: "BAHAN", satuan: "m3", harga_default: 350000, category_id: 1, terbilang: null },
      { nama: "Pasir Pasang", tipe: "BAHAN", satuan: "m3", harga_default: 330000, category_id: 1, terbilang: null },
      { nama: "Pasir Beton", tipe: "BAHAN", satuan: "m3", harga_default: 287500, category_id: 1, terbilang: null },
      { nama: "Pasir Urug", tipe: "BAHAN", satuan: "m3", harga_default: 273000, category_id: 1, terbilang: null },
      { nama: "Sirtu", tipe: "BAHAN", satuan: "m3", harga_default: 262500, category_id: 1, terbilang: null },
      { nama: "Tanah Urug", tipe: "BAHAN", satuan: "m3", harga_default: 150000, category_id: 1, terbilang: null },
      { nama: "Batako Buntu", tipe: "BAHAN", satuan: "bh", harga_default: 3500, category_id: 1, terbilang: null },
      { nama: "Bata Merah", tipe: "BAHAN", satuan: "bh", harga_default: 1500, category_id: 1, terbilang: null },
      { nama: "Batu Candi Hitam (20x40x1.5)", tipe: "BAHAN", satuan: "m2", harga_default: 100000, category_id: 1, terbilang: null },
      { nama: "Batu Candi Hitam (20x40x3)", tipe: "BAHAN", satuan: "m2", harga_default: 120000, category_id: 1, terbilang: null },
      { nama: "Tias / Ganggong Batu Candi", tipe: "BAHAN", satuan: "bh", harga_default: 15000, category_id: 1, terbilang: null },
      { nama: "Beton Ready Mix f'c 15 MPa", tipe: "BAHAN", satuan: "m3", harga_default: 1290000, category_id: 2, terbilang: null },
      { nama: "Beton Ready Mix f'c 20 MPa", tipe: "BAHAN", satuan: "m3", harga_default: 1350000, category_id: 2, terbilang: null },
      { nama: "Beton Ready Mix f'c 25 MPa", tipe: "BAHAN", satuan: "m3", harga_default: 1365000, category_id: 2, terbilang: null },
      { nama: "Beton Ready Mix f'c 30 MPa", tipe: "BAHAN", satuan: "m3", harga_default: 1402000, category_id: 2, terbilang: null },
      { nama: "Semen Gresik", tipe: "BAHAN", satuan: "kg", harga_default: 1525, category_id: 3, terbilang: null },
      { nama: "Semen Tiga Roda", tipe: "BAHAN", satuan: "kg", harga_default: 1575, category_id: 3, terbilang: null },
      { nama: "Semen Dynamix", tipe: "BAHAN", satuan: "kg", harga_default: 1400, category_id: 3, terbilang: null },
      { nama: "Mortar MU-408C 1Kg Putih", tipe: "BAHAN", satuan: "kg", harga_default: 20000, category_id: 3, terbilang: null },
      { nama: "Semen Sika Top", tipe: "BAHAN", satuan: "kg", harga_default: 25000, category_id: 3, terbilang: null },

      // TENAGA
      { nama: "Pekerja", tipe: "TENAGA", satuan: "Hari", harga_default: 141373.56, category_id: null, terbilang: 1 },
      { nama: "Tukang Batu/Tembok", tipe: "TENAGA", satuan: "Hari", harga_default: 141373.56, category_id: null, terbilang: 1 },
      { nama: "Tukang Kayu", tipe: "TENAGA", satuan: "Hari", harga_default: 141373.56, category_id: null, terbilang: 1 },
      { nama: "Tukang Besi / Beton", tipe: "TENAGA", satuan: "Hari", harga_default: 141373.56, category_id: null, terbilang: 1 },
      { nama: "Tukang Cat / Pelitur", tipe: "TENAGA", satuan: "Hari", harga_default: 141373.56, category_id: null, terbilang: 1 },
      { nama: "Tukang Las", tipe: "TENAGA", satuan: "Hari", harga_default: 141373.56, category_id: null, terbilang: 1 },
      { nama: "Kepala Tukang", tipe: "TENAGA", satuan: "Hari", harga_default: 141373.56, category_id: null, terbilang: 1 },
      { nama: "Mandor", tipe: "TENAGA", satuan: "Hari", harga_default: 141373.56, category_id: null, terbilang: 1 },
      { nama: "Serus Profile Kayu", tipe: "TENAGA", satuan: "Hari", harga_default: 141373.56, category_id: null, terbilang: 1 },

      //ALAT
      { nama: "Concrete Mixer 0.35 M3", tipe: "ALAT", satuan: "Hari", harga_default: 0, category_id: null, terbilang: 1 },
      { nama: "Alat Las Listrik", tipe: "ALAT", satuan: "Hari", harga_default: 0, category_id: null, terbilang: 1 },
      { nama: "Waterpass", tipe: "ALAT", satuan: "Hari", harga_default: 0, category_id: null, terbilang: 1 },
      { nama: "Vibrator", tipe: "ALAT", satuan: "Hari", harga_default: 0, category_id: null, terbilang: 1 },
      { nama: "Stamper Kodok 150 kg", tipe: "ALAT", satuan: "Hari", harga_default: 0, category_id: null, terbilang: 1 },
      { nama: "Hoist 1 Ton", tipe: "ALAT", satuan: "Hari", harga_default: 0, category_id: null, terbilang: 1 },
      { nama: "Tripod 7 Meter", tipe: "ALAT", satuan: "Hari", harga_default: 0, category_id: null, terbilang: 1 },
      { nama: "Jack Hammer + Genset", tipe: "ALAT", satuan: "Hari", harga_default: 0, category_id: null, terbilang: 1 },
      { nama: "Cutter Baja Beton", tipe: "ALAT", satuan: "Hari", harga_default: 20000, category_id: null, terbilang: 1 },
      { nama: "Bender Baja Beton", tipe: "ALAT", satuan: "Hari", harga_default: 20000, category_id: null, terbilang: 1 },
      { nama: "Palu / Godam", tipe: "ALAT", satuan: "Bh", harga_default: 0, category_id: null, terbilang: 1 },
      { nama: "Pahat Beton", tipe: "ALAT", satuan: "Bh", harga_default: 0, category_id: null, terbilang: 1 },
      { nama: "Linggis", tipe: "ALAT", satuan: "Bh", harga_default: 0, category_id: null, terbilang: 1 },
      { nama: "Scaffolding (1 Set)", tipe: "ALAT", satuan: "Hari", harga_default: 32000, category_id: null, terbilang: 1 },
      { nama: "Bor Auger Ø 30 cm", tipe: "ALAT", satuan: "Hari", harga_default: 399000, category_id: null, terbilang: 1 },
      { nama: "Stang Bor Diameter 1 1/4\"", tipe: "ALAT", satuan: "Hari", harga_default: 399000, category_id: null, terbilang: 1 },
      { nama: "Pompa Beton 1.5 inch", tipe: "ALAT", satuan: "Hari", harga_default: 4000000, category_id: null, terbilang: 1 }

    ]);

    console.log("✅ Seeder MasterItem berhasil (Auto ID)");
    process.exit();
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
};

MigrateMasterItem();