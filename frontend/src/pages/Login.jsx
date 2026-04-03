import { useState } from "react";
import api from "../api";
import { useEffect } from "react";


export default function Login() {
  const [step, setStep] = useState(1);
  const [userId, setUserId] = useState(null);
  const [timer, setTimer] = useState(0);

  const [form, setForm] = useState({
    email: "",
    password: "",
    code: ""
  });

  useEffect(() => {
  if (timer > 0) {
    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }
}, [timer]);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  // 🔹 STEP 1 → LOGIN (KIRIM OTP)
const handleLogin = async (e) => {
  e.preventDefault();

  try {
    const res = await api.post("/auth/login", {
      email: form.email,
      password: form.password
    });

    // ✅ LOGIKA BARU: Cek apakah backend langsung kasih token (Device Dikenali)
    if (res.data.accessToken) {
      // Simpan token ke localStorage
      localStorage.setItem("accessToken", res.data.accessToken);
      localStorage.setItem("refreshToken", res.data.refreshToken);
      
      alert("Login Berhasil (Device Dikenali)");
      
      // Langsung pindah ke dashboard, jangan ke step 2 (OTP)
      window.location.href = "/dashboard";
      return; 
    }

    // 📩 Jika TIDAK ADA accessToken, berarti device baru & butuh OTP
    setUserId(res.data.user_id);
    setStep(2); // Pindah ke form OTP
    setForm((prev) => ({ ...prev, code: "" }));
    setTimer(60);

  } catch (err) {
    const msg = err.response?.data?.message || "Login gagal";
    if (err.response?.data?.wait) {
      setTimer(err.response.data.wait);
    }
    alert(msg);
  }
};

const handleResendOtp = async () => {
  try {
    const res = await api.post("/auth/resend-otp", {
      user_id: userId
    });

    setTimer(60);

  } catch (err) {
    if (err.response?.data?.wait) {
      setTimer(err.response.data.wait);
    }

    alert(err.response?.data?.message);
  }
};

  // 🔹 STEP 2 → VERIFY OTP
  const handleVerify = async (e) => {
    e.preventDefault();

    try {
      const res = await api.post("/auth/verify-otp", {
        user_id: userId,
        code: form.code
      });

      // 🔐 simpan token
      localStorage.setItem("accessToken", res.data.accessToken);
      localStorage.setItem("refreshToken", res.data.refreshToken);

      alert("Login berhasil!");

      // redirect (optional)
      window.location.href = "/dashboard";

    } catch (err) {
      alert(err.response?.data?.message || "OTP salah");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        
        <h2 className="text-2xl font-bold mb-6 text-center">
          Login
        </h2>

        {/* STEP 1 */}
        {step === 1 && (
          <form onSubmit={handleLogin} className="space-y-4">

            <input
              type="email"
              name="email"
              placeholder="Email"
              onChange={handleChange}
              className="w-full border p-2 rounded"
              required
            />

            <input
              type="password"
              name="password"
              placeholder="Password"
              onChange={handleChange}
              className="w-full border p-2 rounded"
              required
            />

            <button
                type="submit"
                disabled={timer > 0}
                className="w-full bg-blue-500 text-white p-2 rounded disabled:bg-gray-400"
            >
                Login
            </button>
          </form>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <form onSubmit={handleVerify} className="space-y-4">

            <input
              type="text"
              name="code"
              placeholder="Masukkan OTP"
              onChange={handleChange}
              className="w-full border p-2 rounded"
              required
            />

            {timer > 0 && (
                <p className="text-sm text-red-500 text-center">
                    Tunggu {timer} detik untuk kirim ulang OTP
                </p>
                )}

            <button type="submit" className="w-full bg-green-500 text-white p-2 rounded">
              Verify OTP
            </button>
          <button
            type="button"
            disabled={timer > 0}
            onClick={handleResendOtp}
            className="w-full bg-gray-500 text-white p-2 rounded"
            >
            {timer > 0 ? `Kirim ulang (${timer}s)` : "Kirim Ulang OTP"}
          </button>
          </form>
        )}

      </div>

    </div>
  );
}