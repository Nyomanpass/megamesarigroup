import { useState } from "react";
import api from "../api";
import ErrorAlert from "../components/ErrorAlert";
import SuccessAlert from "../components/SuccessAlert";

export default function Register() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: ""
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [passwordFeedback, setPasswordFeedback] = useState("");

  const handleChange = (e) => {
    setError(""); // Clear error saat user mulai typing
    const { name, value } = e.target;

    setForm({
      ...form,
      [name]: value
    });

    // Validasi password real-time
    if (name === "password") {
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
      if (value && !passwordRegex.test(value)) {
        setPasswordFeedback("Password harus minimal 8 karakter dengan huruf besar, huruf kecil, dan angka");
      } else if (value) {
        setPasswordFeedback("✓ Password kuat");
      } else {
        setPasswordFeedback("");
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validasi input
    if (!form.name || !form.email || !form.password || !form.confirmPassword) {
      setError("Semua field harus diisi");
      return;
    }

    // Validasi password sama
    if (form.password !== form.confirmPassword) {
      setError("Password dan Konfirmasi Password tidak cocok");
      return;
    }

    // Validasi password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(form.password)) {
      setError("Password harus minimal 8 karakter dengan huruf besar, huruf kecil, dan angka");
      return;
    }

    // Validasi email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      setError("Format email tidak valid");
      return;
    }

    try {
      setLoading(true);

      const res = await api.post("/auth/register", form);

      setSuccess(res.data.message || "Pendaftaran berhasil! Silahkan login.");

      // reset form
      setForm({
        name: "",
        email: "",
        password: "",
        confirmPassword: ""
      });
      setPasswordFeedback("");

      // Redirect ke login setelah 2 detik
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);

    } catch (err) {
      const msg = err.response?.data?.message || "Terjadi kesalahan saat mendaftar";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">

      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">

        <h2 className="text-2xl font-bold mb-6 text-center">
          Daftar Akun Baru
        </h2>

        <ErrorAlert message={error} onClose={() => setError("")} />
        <SuccessAlert message={success} onClose={() => setSuccess("")} />

        <form onSubmit={handleSubmit} className="space-y-4">

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
            <input
              type="text"
              name="name"
              placeholder="Masukkan nama lengkap Anda"
              value={form.name}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded focus:outline-none focus:border-blue-500"
              required
            />
          </div>

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
              placeholder="Minimal 8 karakter (besar, kecil, angka)"
              value={form.password}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded focus:outline-none focus:border-blue-500"
              required
            />
            {passwordFeedback && (
              <p className={`text-xs mt-1 ${passwordFeedback.includes("✓") ? "text-green-600" : "text-amber-600"}`}>
                {passwordFeedback}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Konfirmasi Password</label>
            <input
              type="password"
              name="confirmPassword"
              placeholder="Masukkan ulang password Anda"
              value={form.confirmPassword}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded focus:outline-none focus:border-blue-500"
              required
            />
            {form.confirmPassword && form.password === form.confirmPassword && (
              <p className="text-xs text-green-600 mt-1">✓ Password cocok</p>
            )}
            {form.confirmPassword && form.password !== form.confirmPassword && (
              <p className="text-xs text-red-600 mt-1">✗ Password tidak cocok</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
          >
            {loading ? "Mendaftar..." : "Daftar"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-6">
          Sudah punya akun? <a href="/" className="text-blue-500 hover:text-blue-600 font-medium">Login di sini</a>
        </p>

      </div>

    </div>
  );
}