import { useState } from "react";
import api from "../api";
import { useEffect } from "react";
import ErrorAlert from "../components/ErrorAlert";
import SuccessAlert from "../components/SuccessAlert";


export default function Login() {
  const [step, setStep] = useState(1);
  const [userId, setUserId] = useState(null);
  const [timer, setTimer] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

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
    setError(""); // Clear error saat user mulai typing
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  // 🔹 STEP 1 → LOGIN (KIRIM OTP)
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    // Validasi input
    if (!form.email || !form.password) {
      setError("Email dan Password harus diisi");
      setLoading(false);
      return;
    }

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

        setSuccess("Login Berhasil (Device Dikenali)");

        // Langsung pindah ke dashboard, jangan ke step 2 (OTP)
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 1500);
        return;
      }

      // 📩 Jika TIDAK ADA accessToken, berarti device baru & butuh OTP
      setUserId(res.data.user_id);
      setSuccess("OTP telah dikirim ke email Anda");
      setStep(2); // Pindah ke form OTP
      setForm((prev) => ({ ...prev, code: "" }));
      setTimer(60);

    } catch (err) {
      const msg = err.response?.data?.message || "Login gagal, silahkan coba lagi";
      setError(msg);

      if (err.response?.data?.wait) {
        setTimer(err.response.data.wait);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError("");
    setLoading(true);

    try {
      await api.post("/auth/resend-otp", {
        user_id: userId
      });

      setSuccess("OTP telah dikirim ulang ke email Anda");
      setTimer(60);

    } catch (err) {
      const msg = err.response?.data?.message || "Gagal mengirim ulang OTP";
      setError(msg);

      if (err.response?.data?.wait) {
        setTimer(err.response.data.wait);
      }
    } finally {
      setLoading(false);
    }
  };

  // 🔹 STEP 2 → VERIFY OTP
  const handleVerify = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    // Validasi input
    if (!form.code) {
      setError("OTP harus diisi");
      setLoading(false);
      return;
    }

    if (form.code.length !== 6) {
      setError("OTP harus 6 digit");
      setLoading(false);
      return;
    }

    try {
      const res = await api.post("/auth/verify-otp", {
        user_id: userId,
        code: form.code
      });

      // 🔐 simpan token
      localStorage.setItem("accessToken", res.data.accessToken);
      localStorage.setItem("refreshToken", res.data.refreshToken);

      setSuccess("Login berhasil! Mengalihkan ke dashboard...");

      // redirect (optional)
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1500);

    } catch (err) {
      const msg = err.response?.data?.message || "OTP salah atau expired";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">

      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">

        <h2 className="text-2xl font-bold mb-6 text-center">
          Login
        </h2>

        <ErrorAlert message={error} onClose={() => setError("")} />
        <SuccessAlert message={success} onClose={() => setSuccess("")} />

        {/* STEP 1 */}
        {step === 1 && (
          <form onSubmit={handleLogin} className="space-y-4">

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                name="email"
                placeholder="Masukkan email Anda"
                value={form.email}
                onChange={handleChange}
                className="w-full border border-gray-300 p-2 rounded focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                name="password"
                placeholder="Masukkan password Anda"
                value={form.password}
                onChange={handleChange}
                className="w-full border border-gray-300 p-2 rounded focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? "Memproses..." : "Login"}
            </button>

            <p className="text-center text-sm text-gray-600 mt-4">
              Belum punya akun? <a href="/register" className="text-blue-500 hover:text-blue-600 font-medium">Daftar di sini</a>
            </p>
          </form>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <form onSubmit={handleVerify} className="space-y-4">

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kode OTP</label>
              <p className="text-xs text-gray-500 mb-2">Kami telah mengirimkan 6 digit kode OTP ke email Anda</p>
              <input
                type="text"
                name="code"
                placeholder="Masukkan 6 digit OTP"
                value={form.code}
                onChange={(e) => {
                  if (e.target.value.length <= 6 && /^\d*$/.test(e.target.value)) {
                    handleChange(e);
                  }
                }}
                maxLength="6"
                className="w-full border border-gray-300 p-2 rounded text-center text-2xl tracking-widest focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            {timer > 0 && (
              <p className="text-sm text-amber-600 text-center bg-amber-50 p-2 rounded">
                ⏱️ Tunggu {timer} detik untuk mengirim ulang OTP
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-500 text-white p-2 rounded hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? "Memverifikasi..." : "Verifikasi OTP"}
            </button>

            <button
              type="button"
              disabled={timer > 0 || loading}
              onClick={handleResendOtp}
              className="w-full bg-gray-500 text-white p-2 rounded hover:bg-gray-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {timer > 0 ? `Kirim Ulang (${timer}s)` : "Kirim Ulang OTP"}
            </button>

            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full text-blue-500 hover:text-blue-600 font-medium p-2"
            >
              Kembali ke Login
            </button>
          </form>
        )}

      </div>

    </div>
  );
}