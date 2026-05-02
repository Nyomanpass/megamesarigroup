import rateLimit from "express-rate-limit";

export const loginLimiter = rateLimit({
   windowMs: 15 * 60 * 1000, // 15 menit
   max: 10, // max 10 request
   message: {
      message: "Terlalu banyak percobaan login, coba lagi nanti",
   },
});
