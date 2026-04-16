import "dotenv/config"; // 1. WAJIB di paling atas supaya .env terbaca sebelum Database.js
import express from "express";
import cors from "cors";
import cron from "node-cron";
import { Op } from "sequelize";
import { sequelize } from "./config/Database.js";
import authRoutes from "./routes/AuthRoutes.js";
import BoqRoutes from "./routes/BoqRoutes.js";
import ProjectRoutes from "./routes/ProjectRoutes.js";

import { LoginLog } from "./models/auth/LoginLogModel.js";
import "./models/auth/OtpModel.js";
import "./models/ProjectModel.js";
import "./models/BoqModel.js";
import "./models/DailyPlanModel.js";
import "./models/DailyProgressModel.js";
import "./models/ProjectWeekModel.js";
import "./models/ProjectPeriodModel.js";
import "./models/MaterialModel.js";
import "./models/Pekerja.js";
import "./models/PeralatanModel.js";
import "./models/MasterItem.js";
import "./models/AnalisaMaster.js";
import "./models/AnalisaMasterDetail.js";
import "./models/ProjekItem.js";
import "./models/ProjekAnalisa.js";
import "./models/ProjekAnalisaDetail.js";
import "./models/DailyProgresItem.js";


import ScheduleRoutes from "./routes/ScheduleRoutes.js";
import DailyPlanRoute from "./routes/DailyPlanRoute.js";
import DailyProgressRoutes from "./routes/DailyProgressRoutes.js";
import ReportRoutes from "./routes/ReportRoutes.js";
import MaterialRoutes from "./routes/MaterialRoutes.js";
import PekerjaRoutes from "./routes/PekerjaRoutes.js";
import PeralatanRoutes from "./routes/PeralatanRoutes.js";
import ProjectPeriodRoute from "./routes/ProjectPeriodRoute.js";  
import MasterItemRoutes from "./routes/MasterItemRoutes.js";
import ItemCategoryRoutes from "./routes/ItemCategoryRoutes.js";
import AnalisaMasterRoutes from "./routes/AnalisaMasterRoutes.js";
import AnalisaMasterDetailRoutes from "./routes/AnalisaMasterDetailRoutes.js";
import ProjectItemRoutes from './routes/ProjectItemRoutes.js';
import ProjekAnalisaRoutes from './routes/ProjekAnalisaRoutes.js';
import ProjekAnalisaDetailRoutes from './routes/ProjekAnalisaDetailRoutes.js';
import ReportExelRoutes from './routes/ReportExelRoutes.js';
import ExportWeeklyRoutes from "./routes/ExportWeeklyRoutes.js";
import importRoutes from "./routes/Import.js";

const app = express();
const PORT = process.env.PORT || 5004; // Mengambil dari .env (5004)

// middleware
app.use(
   cors({
      origin: function (origin, callback) {
         // List origins yang diizinkan
         const allowedOrigins = ["http://localhost", "http://localhost:3000", "http://localhost:5173", "http://localhost:80", process.env.CLIENT_ORIGIN];

         // Jika tidak ada origin (request dari mobile app atau server-to-server), izinkan
         if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
         } else {
            callback(new Error("Not allowed by CORS"));
         }
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
      allowedHeaders: ["Content-Type", "Authorization"],
   }),
);
app.use(express.json());

// test route
app.get("/", (req, res) => {
   res.send("Mega Mesari API Running 🚀");
});

app.use("/uploads", express.static("uploads"));

// routes
app.use("/api", authRoutes);
app.use("/api", ScheduleRoutes);
app.use("/api", BoqRoutes);
app.use("/api", ProjectRoutes);
app.use("/api", DailyPlanRoute);
app.use("/api", DailyProgressRoutes);
app.use("/api", ReportRoutes);
app.use("/api", MaterialRoutes);
app.use("/api", PekerjaRoutes);
app.use("/api", PeralatanRoutes);
app.use("/api", ProjectPeriodRoute);
app.use("/api", MasterItemRoutes);
app.use("/api", ItemCategoryRoutes);
app.use("/api", AnalisaMasterRoutes);
app.use("/api", AnalisaMasterDetailRoutes);
app.use("/api", ProjectItemRoutes);
app.use("/api", ProjekAnalisaRoutes);
app.use("/api", ProjekAnalisaDetailRoutes);
app.use("/api", ReportExelRoutes);
app.use("/api", ExportWeeklyRoutes);

app.use("/api", importRoutes);

// koneksi database
const startServer = async () => {
   try {
      // 2. Pastikan koneksi ke DB sukses
      await sequelize.authenticate();
      console.log("Database connected ✅");

      // 3. Sync tabel (Gunakan { alter: true } jika ingin update kolom otomatis tanpa hapus data)
      //await sequelize.sync();
      await sequelize.sync({ alter: true });
      // await sequelize.sync({ force: true });
      console.log("Database synced 🔄");

      cron.schedule("0 0 * * *", async () => {
         try {
            const deleted = await LoginLog.destroy({
               where: {
                  createdAt: {
                     [Op.lt]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                  },
               },
            });
         } catch (err) {
            console.error("❌ Gagal hapus log:", err);
         }
      });

      // 4. Jalankan server
      app.listen(PORT, () => {
         console.log(`Server running on port ${PORT} 🚀`);
      });
   } catch (error) {
      console.error("DB Error:", error);
   }
};

startServer();
