import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User } from "../models/auth/UserModel.js";
import { RefreshToken } from "../models/auth/RefreshTokenModel.js";
import { LoginLog } from "../models/auth/LoginLogModel.js";
import { OTP } from "../models/auth/OtpModel.js";
import { sendOTPEmail } from "../utils/sendEmail.js";
import { TrustedDevice } from "../models/auth/TrustedDevice.js";


export const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ message: "Token tidak ditemukan" });
    }

    const savedToken = await RefreshToken.findOne({
      where: { token: refreshToken }
    });

    if (!savedToken) {
      return res.status(403).json({ message: "Token tidak valid" });
    }

    // 🔥 cek expired DB
    if (new Date() > savedToken.expired_at) {
      return res.status(403).json({ message: "Refresh token expired" });
    }

    const payload = jwt.verify(refreshToken, process.env.JWT_SECRET);

    // 🔥 1. HAPUS TOKEN LAMA
    await RefreshToken.destroy({
      where: { token: refreshToken }
    });

    // 🔐 2. BUAT ACCESS TOKEN BARU
    const newAccessToken = jwt.sign(
      { id: payload.id, role: payload.role },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    // 🔄 3. BUAT REFRESH TOKEN BARU
    const newRefreshToken = jwt.sign(
      { id: payload.id, role: payload.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // 💾 4. SIMPAN KE DB
    await RefreshToken.create({
      user_id: payload.id,
      token: newRefreshToken,
      expired_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    // 🔥 5. RETURN KEDUANYA
    return res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    });

  } catch (e) {
    return res.status(403).json({ message: "Token expired / invalid" });
  }
};

export const resendOtp = async (req, res) => {
  try {
    const { user_id } = req.body;

    const user = await User.findByPk(user_id);
    if (!user) {
      return res.status(404).json({ message: "User tidak ditemukan" });
    }

    const existingOtp = await OTP.findOne({
      where: { user_id }
    });

    const now = new Date();

    if (existingOtp) {
      const lastRequest = existingOtp.last_request_at || existingOtp.createdAt;

      const diffSeconds = (now - new Date(lastRequest)) / 1000;
      const diffMinutes = diffSeconds / 60;

      // 🔄 RESET setelah 15 menit
      if (diffMinutes > 15) {
        await existingOtp.update({
          request_count: 0
        });
      }

      // ⏱️ cooldown 60 detik
      if (diffSeconds < 60) {
        return res.status(429).json({
          message: `Tunggu ${Math.ceil(60 - diffSeconds)} detik`,
          wait: Math.ceil(60 - diffSeconds)
        });
      }

      // 🔥 limit 5x
      if (existingOtp.request_count >= 5) {
        return res.status(429).json({
          message: "Terlalu banyak request OTP, coba lagi 15 menit",
          wait: 900
        });
      }

      const code = Math.floor(100000 + Math.random() * 900000);

      await existingOtp.update({
        code,
        expired_at: new Date(Date.now() + 60 * 1000),
        request_count: existingOtp.request_count + 1,
        last_request_at: now
      });

      await sendOTPEmail(user.email, code);

    } else {
      return res.status(400).json({ message: "OTP belum dibuat" });
    }

    return res.json({ message: "OTP dikirim ulang" });

  } catch (e) {
    return res.status(500).json({ message: "Server error" });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { user_id, code } = req.body;

    const otp = await OTP.findOne({
      where: { user_id, code }
    });

   if (!otp) {
      return res.status(400).json({ message: "OTP salah" });
    }

    // 🔥 cek expired + hapus
    if (new Date() > otp.expired_at) {
      await OTP.destroy({ where: { user_id } });
      return res.status(400).json({ message: "OTP expired" });
    }

    const user = await User.findByPk(user_id);

    if (!user) {
      return res.status(404).json({ message: "User tidak ditemukan" });
    }

    const deviceId = req.headers["user-agent"];

    const existingDevice = await TrustedDevice.findOne({
      where: {
        user_id: user.id,
        device_id: deviceId
      }
    });

   if (!existingDevice) {
      await TrustedDevice.create({
        user_id: user.id,
        device_id: deviceId,
        last_used: new Date()
      });
    } else {
      // 🔥 update terakhir dipakai
      await existingDevice.update({
        last_used: new Date()
      });
    }


    const accessToken = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    const refreshToken = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    await RefreshToken.destroy({
      where: { user_id: user.id }
    });

    await RefreshToken.create({
      user_id: user.id,
      token: refreshToken,
      expired_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    // 🔥 hapus OTP setelah dipakai
    await OTP.destroy({
      where: { user_id }
    });

    return res.json({
      message: "Login berhasil",
      accessToken,
      refreshToken
    });

  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Server error" });
  }
};


export const register = async (req, res) => {
  try {
    const { name, email, password, confirmPassword, role = "staf" } = req.body;

    // Cek konfirmasi password
    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Password dan konfirmasi password tidak sama" });
    }

    // Validasi password: minimal 8 karakter, ada huruf besar, huruf kecil, dan angka
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({ 
        message: "Password harus minimal 8 karakter dan mengandung huruf besar, huruf kecil, serta angka"
      });
    }

    // Cek apakah email sudah terdaftar
    const exists = await User.findOne({ where: { email } });
    if (exists) {
      return res.status(409).json({ message: "Email Sudah Terdaftar" });
    }

    // Enkripsi password dan simpan user baru
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hash, role });

    return res.status(201).json({ 
      message: "Pendaftaran berhasil",
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Terjadi kesalahan pada server" });
  }
};


export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const deviceId = req.headers["user-agent"];
    

    const user = await User.findOne({ where: { email } });

    // ❌ LOGIN GAGAL
    if (!user || !(await bcrypt.compare(password, user.password))) {

      await LoginLog.create({
        email,
        ip_address: req.ip,
        status: "failed"
      });

      return res.status(401).json({ message: "Email atau password salah" });
    }

    // ❌ BELUM VERIFIED
    if (user.status !== "verified") {

      await LoginLog.create({
        user_id: user.id,
        email: user.email,
        ip_address: req.ip,
        status: "failed"
      });

      return res.status(403).json({ message: "Akun belum diverifikasi" });
    }
    
    console.log("Mencari Device ID:", deviceId);
    console.log("Untuk User ID:", user.id);
    const trustedDevice = await TrustedDevice.findOne({
      where: {
        user_id: user.id,
        device_id: deviceId
      }
    });
    console.log("Hasil pencarian:", trustedDevice ? "Ditemukan" : "Tidak Ditemukan");

    let isTrusted = false;

    if (trustedDevice) {
      const now = new Date();
      const lastUsed = trustedDevice.last_used 
          ? new Date(trustedDevice.last_used) 
          : new Date(0);

      const diffDays = (now - lastUsed) / (1000 * 60 * 60 * 24);

      if (diffDays <= 3) {
        isTrusted = true;

        // update last_used biar extend
        await trustedDevice.update({
          last_used: new Date()
        });

      } else {
        // expired → hapus
        await TrustedDevice.destroy({
          where: { id: trustedDevice.id }
        });
      }
    }

    if (isTrusted) {
      // ✅ DEVICE SUDAH DIKENAL → LANGSUNG LOGIN

      const accessToken = jwt.sign(
        { id: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "15m" }
      );

      const refreshToken = jwt.sign(
        { id: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      await RefreshToken.destroy({
        where: { user_id: user.id }
      });

      await RefreshToken.create({
        user_id: user.id,
        token: refreshToken,
        expired_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      return res.json({
        message: "Login berhasil tanpa OTP",
        accessToken,
        refreshToken
      });
    }

    // 🔥 GENERATE OTP
    const code = Math.floor(100000 + Math.random() * 900000);

    const now = new Date();

    const existingOtp = await OTP.findOne({
      where: { user_id: user.id }
    });

    if (existingOtp) {
      await existingOtp.update({
        code,
        expired_at: new Date(Date.now() + 60 * 1000),
        request_count: existingOtp.request_count + 1,
        last_request_at: now
      });
    } else {
      await OTP.create({
        user_id: user.id,
        code,
        expired_at: new Date(Date.now() + 60 * 1000),
        request_count: 1,
        last_request_at: now
      });
    }


    try {
      await sendOTPEmail(user.email, code);
      console.log("EMAIL TERKIRIM ✅");
    } catch (err) {
      console.error("EMAIL GAGAL ❌:", err.message);
    }

    // ✅ LOG LOGIN (SUCCESS REQUEST OTP)
    await LoginLog.create({
      user_id: user.id,
      email: user.email,
      ip_address: req.ip,
      status: "success"
    });

    return res.json({
      message: "OTP dikirim ke email",
      user_id: user.id
    });

  } catch (e) {
    return res.status(500).json({ message: "Server error" });
  }
};

export const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: "Token tidak ada" });
    }

    await RefreshToken.destroy({
      where: {
        token: refreshToken,
        user_id: req.user.id
      }
    });

    return res.json({ message: "Logout berhasil" });

  } catch (e) {
    return res.status(500).json({ message: "Server error" });
  }
};