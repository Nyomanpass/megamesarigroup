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
import "./models/ScheduleModel.js";
import "./models/DailyPlanModel.js";
import "./models/DailyProgressModel.js";
import "./models/ProjectWeekModel.js";



import ScheduleRoutes from "./routes/scheduleRoutes.js";
import DailyPlanRoute from "./routes/DailyPlanRoute.js";
import DailyProgressRoutes from "./routes/DailyProgressRoutes.js";


const app = express();
const PORT = process.env.PORT || 5004; // Mengambil dari .env (5004)

// middleware
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || "http://localhost:5173", // Menggunakan variabel dari .env kamu
  credentials: true
}));
app.use(express.json());

// test route
app.get("/", (req, res) => {
  res.send("Mega Mesari API Running 🚀");
});

// routes
app.use("/api", authRoutes);


app.use("/api", ScheduleRoutes);
app.use("/api", BoqRoutes);
app.use("/api", ProjectRoutes);
app.use("/api", DailyPlanRoute);
app.use("/api", DailyProgressRoutes);


// koneksi database
const startServer = async () => {
  try {
    // 2. Pastikan koneksi ke DB sukses
    await sequelize.authenticate();
    console.log("Database connected ✅");

    // 3. Sync tabel (Gunakan { alter: true } jika ingin update kolom otomatis tanpa hapus data)
    //await sequelize.sync(); 
    await sequelize.sync({ alter: true });
    console.log("Database synced 🔄");

    cron.schedule("0 0 * * *", async () => {
      try {
        const deleted = await LoginLog.destroy({
          where: {
            createdAt: {
              [Op.lt]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            }
          }
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