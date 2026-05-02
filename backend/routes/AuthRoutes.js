import { Router } from "express";
import { register, login, refresh, logout, verifyOtp, resendOtp} from "../controllers/AuthController.js";
import { loginLimiter } from "../middleware/rateLimiter.js";
import { requireAuth } from "../middleware/Auth.js";

const router = Router();

router.post("/auth/register", register);
router.post("/auth/login", login);
router.post("/auth/refresh", refresh);
router.post("/auth/logout", requireAuth, logout);
router.post("/auth/verify-otp", verifyOtp);
router.post("/auth/resend-otp", resendOtp);


export default router;
