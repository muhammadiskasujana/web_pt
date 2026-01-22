import { useState } from "react";
import axios from "../config/axios";
import { Link, useNavigate } from "react-router-dom";
import { Receipt, User, Lock, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import Cookies from "js-cookie";
import { v4 as uuidv4 } from "uuid";

// POS Login — Flat, bold, 3‑color theme (White • Slate‑900 • Sky‑600)
export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const getDeviceId = () => {
    let deviceId = Cookies.get("device_id");
    if (!deviceId) {
      deviceId = uuidv4();
      Cookies.set("device_id", deviceId, { expires: 365 });
    }
    return deviceId;
  };

  const handleLogin = async () => {
    const cleanEmail = email.trim();
    const cleanPassword = password.trim();
    if (!cleanEmail || !cleanPassword) {
      alert("Please fill in email and password");
      return;
    }
    setLoading(true);
    const device_id = getDeviceId();
    try {
      const { data } = await axios.post("/api/auth/tenant/login", {
        email: cleanEmail,
        password: cleanPassword,
        device_id,
      });
      if (data.success !== false && data.user) {
        const userObj = { authenticated: true, ...data.user };
        onLogin?.(userObj);
        navigate("/dashboard");
      } else {
        alert(data.message || "Login failed");
      }
    } catch (err) {
      const errorData = err.response?.data;
      if (errorData?.code === "INVALID_CREDENTIALS") alert("Akun belum diaktifkan");
      else if (errorData?.error) alert(errorData.error);
      else if (errorData?.message) alert(errorData.message);
      else alert("An error occurred: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
      <div className="min-h-screen bg-white text-slate-900 flex items-center justify-center px-4 py-10">
        {/* App frame */}
        <div className="w-full max-w-md">
          {/* Brand header — flat and bold */}
          <div className="mb-5 flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-slate-900 flex items-center justify-center">
              <Receipt className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black leading-tight">POS Login</h1>
              <p className="text-sm text-slate-900/60">Masuk untuk mengelola penjualan & stok</p>
            </div>
          </div>

          {/* Card — flat, no gradients */}
          <div className="rounded-2xl border border-slate-900/15 bg-white shadow-[0_8px_20px_rgba(0,0,0,0.06)]">
            <div className="p-6 sm:p-8" onKeyDown={onKeyDown}>
              <div className="space-y-5">
                {/* Email */}
                <label className="block">
                  <span className="mb-2 block text-sm font-medium">Email</span>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-900/60" />
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="user@yourstore.com"
                        className="w-full pl-11 pr-4 py-3 rounded-xl bg-white border border-slate-900/20 text-slate-900 placeholder:text-slate-900/40 outline-none focus:ring-4 focus:ring-sky-600/30 focus:border-sky-600 transition"
                        autoComplete="email"
                    />
                  </div>
                </label>

                {/* Password */}
                <label className="block">
                  <span className="mb-2 block text-sm font-medium">Password</span>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-900/60" />
                    <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-11 pr-12 py-3 rounded-xl bg-white border border-slate-900/20 text-slate-900 placeholder:text-slate-900/40 outline-none focus:ring-4 focus:ring-sky-600/30 focus:border-sky-600 transition"
                        autoComplete="current-password"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-900/60 hover:text-slate-900"
                        aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </label>

                {/* CTA — single accent color */}
                <button
                    onClick={handleLogin}
                    disabled={loading}
                    className="w-full py-3 rounded-xl font-semibold text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-4 focus:ring-sky-600/30 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" /> Memproses...
                      </>
                  ) : (
                      <>Masuk</>
                  )}
                </button>

                {/* Helper row */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <div className="flex items-center gap-1.5 text-slate-900/80">
                    <ShieldCheck className="h-4 w-4" />
                    <span>Koneksi aman</span>
                  </div>
                  <Link to="/forgot-password" className="text-sky-600 hover:underline">Lupa password?</Link>
                </div>
              </div>

              {/* Divider */}
              <div className="my-6 h-px bg-slate-900/10" />

              {/* Secondary actions */}
              <div className="text-center">
                <p className="text-sm">
                  Belum punya akun? {" "}
                  <Link to="/register" className="text-sky-600 hover:underline font-semibold">Daftar</Link>
                </p>
                <p className="text-[10px] mt-3 tracking-widest text-slate-900/60">
                  © {new Date().getFullYear()} POS — Simple • Fast • Reliable
                </p>
              </div>
            </div>
          </div>

          {/* Feature chips — flat, using only the 3 colors */}
          <div className="mt-4 grid grid-cols-3 gap-2 text-[11px]">
            <div className="rounded-xl border border-slate-900/15 bg-white px-3 py-2 text-center">Cepat</div>
            <div className="rounded-xl border border-slate-900/15 bg-white px-3 py-2 text-center">Multi‑Cabang</div>
            <div className="rounded-xl border border-slate-900/15 bg-white px-3 py-2 text-center">Real‑time</div>
          </div>
        </div>
      </div>
  );
}
