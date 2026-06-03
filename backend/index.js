import "dotenv/config"; // 1. WAJIB di paling atas supaya .env terbaca sebelum Database.js
import express from "express";
import cors from "cors";
import cron from "node-cron";
import { Op } from "sequelize";
import { sequelize } from "./config/Database.js";
import authRoutes from "./routes/AuthRoutes.js";
import BoqRoutes from "./routes/BoqRoutes.js";
import ProjectRoutes from "./routes/ProjectRoutes.js";
import path from "path";

import { LoginLog } from "./models/auth/LoginLogModel.js";
import "./models/auth/OtpModel.js";
import "./models/ProjectModel.js";
import "./models/BoqModel.js";
import "./models/DailyPlanModel.js";
import "./models/DailyProgressModel.js";
import "./models/ProjectWeekModel.js";
import "./models/ProjectPeriodModel.js";
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
import ProjectPeriodRoute from "./routes/ProjectPeriodRoute.js";
import MasterItemRoutes from "./routes/MasterItemRoutes.js";
import ItemCategoryRoutes from "./routes/ItemCategoryRoutes.js";
import AnalisaMasterRoutes from "./routes/AnalisaMasterRoutes.js";
import AnalisaMasterDetailRoutes from "./routes/AnalisaMasterDetailRoutes.js";
import ProjectItemRoutes from "./routes/ProjectItemRoutes.js";
import ProjekAnalisaRoutes from "./routes/ProjekAnalisaRoutes.js";
import ProjekAnalisaDetailRoutes from "./routes/ProjekAnalisaDetailRoutes.js";
import ReportExelRoutes from "./routes/ReportExelRoutes.js";
import ExportWeeklyRoutes from "./routes/ExportWeeklyRoutes.js";
import importRoutes from "./routes/Import.js";
import TtdRoutes from "./routes/TtdRoutes.js";
import exportMounthlyRoutes from "./routes/ExportMonthlyRoutes.js";
import DailyProgressPhotoRoutes from "./routes/DailyProgressPhotoRoutes.js";

const app = express();
const PORT = process.env.PORT || 5004; // Mengambil dari .env (5004)

const allowedOrigins = [
   "http://localhost",
   "http://localhost:3000",
   "http://localhost:5173",
   "http://localhost:5174",
   "http://localhost:80",
   process.env.CLIENT_ORIGIN,
].filter(Boolean);

const apiRoutes = [
   authRoutes,
   ScheduleRoutes,
   BoqRoutes,
   ProjectRoutes,
   DailyPlanRoute,
   DailyProgressRoutes,
   ReportRoutes,
   ProjectPeriodRoute,
   MasterItemRoutes,
   ItemCategoryRoutes,
   AnalisaMasterRoutes,
   AnalisaMasterDetailRoutes,
   ProjectItemRoutes,
   ProjekAnalisaRoutes,
   ProjekAnalisaDetailRoutes,
   ReportExelRoutes,
   ExportWeeklyRoutes,
   importRoutes,
   TtdRoutes,
   exportMounthlyRoutes,
   DailyProgressPhotoRoutes,
];

app.use(
   cors({
      origin: function (origin, callback) {
         if (!origin || allowedOrigins.includes(origin)) {
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

app.get("/", (req, res) => {
   res.send("Mega Mesari API Running 🚀");
});

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

apiRoutes.forEach((route) => app.use("/api", route));

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
            console.log(`Deleted ${deleted} old login logs`);
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
