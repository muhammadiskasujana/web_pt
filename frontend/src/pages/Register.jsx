import { useState, useEffect } from "react";
import axios from "../config/axios";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  UserPlus,
  Lock,
  Badge,
  Eye,
  EyeOff,
  Loader2,
  Phone,
  User,
  Shield,
  ShieldCheck,
  Receipt,
} from "lucide-react";

// POS Register — Flat, bold, 3‑color theme (White • Slate‑900 • Sky‑600)
export default function Register() {
  const location = useLocation();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    phone: "",
    referral_code: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Prefill referral_code from ?ref
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ref = params.get("ref");
    if (ref && !form.referral_code) {
      setForm((f) => ({ ...f, referral_code: ref.toUpperCase() }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const handleChange = (e) =>
      setForm((f) => ({
        ...f,
        [e.target.name]:
            e.target.name === "referral_code" ? e.target.value.toUpperCase() : e.target.value,
      }));

  const handleRegister = async () => {
    const cleanForm = {
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password.trim(),
      first_name: form.first_name.trim() || undefined,
      last_name: form.last_name.trim() || undefined,
      phone: form.phone.trim() || undefined,
      referral_code: form.referral_code.trim() || undefined,
    };

    if (!cleanForm.name || !cleanForm.email || !cleanForm.password) {
      alert("Name, email, and password are required");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanForm.email)) {
      alert("Please enter a valid email address");
      return;
    }

    if (cleanForm.password.length < 6) {
      alert("Password must be at least 6 characters long");
      return;
    }

    setLoading(true);
    try {
      const { data } = await axios.post("/api/users/register", cleanForm);
      alert(
          data.message ||
          "Registration successful! Please wait for activation by owner/manager."
      );
      navigate("/login");
    } catch (err) {
      const api = err.response?.data;
      if (api?.error) {
        switch (api.code) {
          case "EMAIL_EXISTS":
            alert("Email already exists");
            break;
          case "MISSING_REQUIRED_FIELDS":
            alert("Name, email, and password are required");
            break;
          case "WEAK_PASSWORD":
            alert("Password must be at least 6 characters long");
            break;
          case "TENANT_REQUIRED":
            alert("Tenant context missing");
            break;
          default:
            alert(api.error);
        }
      } else if (api?.message) {
        alert(api.message);
      } else {
        alert("An error occurred during registration.");
      }
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter") handleRegister();
  };

  return (
      <div className="min-h-screen bg-white text-slate-900 flex items-center justify-center px-4 py-10">
        {/* Brand header — matches Login flat style */}
        <div className="w-full max-w-md">
          <div className="mb-5 flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-slate-900 flex items-center justify-center">
              <Receipt className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black leading-tight">Buat Akun POS</h1>
              <p className="text-sm text-slate-900/60">Daftar untuk mulai mengelola penjualan</p>
            </div>
          </div>

          {/* Card — flat, no gradients, 3-color palette */}
          <div className="rounded-2xl border border-slate-900/15 bg-white shadow-[0_8px_20px_rgba(0,0,0,0.06)]">
            <div className="p-6 sm:p-8" onKeyDown={onKeyDown}>
              <div className="grid grid-cols-1 gap-5">
                {/* Name */}
                <label className="block">
                  <span className="mb-2 block text-sm font-medium">Nama Lengkap *</span>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-900/60" />
                    <input
                        type="text"
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        placeholder="John Doe"
                        className="w-full pl-11 pr-4 py-3 rounded-xl bg-white border border-slate-900/20 text-slate-900 placeholder:text-slate-900/40 outline-none focus:ring-4 focus:ring-sky-600/30 focus:border-sky-600 transition"
                        autoComplete="name"
                    />
                  </div>
                </label>

                {/* Email */}
                <label className="block">
                  <span className="mb-2 block text-sm font-medium">Email *</span>
                  <div className="relative">
                    <Badge className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-900/60" />
                    <input
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        placeholder="user@example.com"
                        className="w-full pl-11 pr-4 py-3 rounded-xl bg-white border border-slate-900/20 text-slate-900 placeholder:text-slate-900/40 outline-none focus:ring-4 focus:ring-sky-600/30 focus:border-sky-600 transition"
                        autoComplete="email"
                    />
                  </div>
                </label>

                {/* Password */}
                <label className="block">
                  <span className="mb-2 block text-sm font-medium">Password *</span>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-900/60" />
                    <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={form.password}
                        onChange={handleChange}
                        placeholder="••••••••"
                        className="w-full pl-11 pr-12 py-3 rounded-xl bg-white border border-slate-900/20 text-slate-900 placeholder:text-slate-900/40 outline-none focus:ring-4 focus:ring-sky-600/30 focus:border-sky-600 transition"
                        autoComplete="new-password"
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

                {/* Names split */}
                <div className="grid grid-cols-2 gap-4">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium">Nama Depan</span>
                    <input
                        type="text"
                        name="first_name"
                        value={form.first_name}
                        onChange={handleChange}
                        placeholder="John"
                        className="w-full px-3 py-3 rounded-xl bg-white border border-slate-900/20 text-slate-900 placeholder:text-slate-900/40 outline-none focus:ring-4 focus:ring-sky-600/30 focus:border-sky-600 transition"
                        autoComplete="given-name"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium">Nama Belakang</span>
                    <input
                        type="text"
                        name="last_name"
                        value={form.last_name}
                        onChange={handleChange}
                        placeholder="Doe"
                        className="w-full px-3 py-3 rounded-xl bg-white border border-slate-900/20 text-slate-900 placeholder:text-slate-900/40 outline-none focus:ring-4 focus:ring-sky-600/30 focus:border-sky-600 transition"
                        autoComplete="family-name"
                    />
                  </label>
                </div>

                {/* Phone */}
                <label className="block">
                  <span className="mb-2 block text-sm font-medium">Nomor WA</span>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-900/60" />
                    <input
                        type="tel"
                        name="phone"
                        value={form.phone}
                        onChange={handleChange}
                        placeholder="628123456789"
                        className="w-full pl-11 pr-4 py-3 rounded-xl bg-white border border-slate-900/20 text-slate-900 placeholder:text-slate-900/40 outline-none focus:ring-4 focus:ring-sky-600/30 focus:border-sky-600 transition"
                        autoComplete="tel"
                    />
                  </div>
                </label>

                {/*/!* Referral *!/*/}
                {/*<label className="block">*/}
                {/*  <span className="mb-2 block text-sm font-medium">Kode Referral (opsional)</span>*/}
                {/*  <div className="relative">*/}
                {/*    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-900/60" />*/}
                {/*    <input*/}
                {/*        type="text"*/}
                {/*        name="referral_code"*/}
                {/*        value={form.referral_code}*/}
                {/*        onChange={handleChange}*/}
                {/*        placeholder="contoh: ABC123"*/}
                {/*        className="w-full pl-11 pr-4 py-3 rounded-xl bg-white border border-slate-900/20 text-slate-900 placeholder:text-slate-900/40 outline-none focus:ring-4 focus:ring-sky-600/30 focus:border-sky-600 transition uppercase"*/}
                {/*    />*/}
                {/*  </div>*/}
                {/*  <p className="text-[11px] text-slate-900/60 mt-1">*/}
                {/*    Jika valid dan dipakai saat pendaftaran, bonus koin akan diterapkan pada aktivasi pertama.*/}
                {/*  </p>*/}
                {/*</label>*/}

                {/* CTA */}
                <button
                    onClick={handleRegister}
                    disabled={loading}
                    className="w-full py-3 rounded-xl font-semibold text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-4 focus:ring-sky-600/30 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" /> Memproses...
                      </>
                  ) : (
                      <>Daftar</>
                  )}
                </button>

                <div className="text-xs pt-1 flex items-center justify-center gap-2 text-slate-900/80">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Pendaftaran akan menunggu aktivasi admin</span>
                </div>
              </div>

              {/* Divider */}
              <div className="my-6 h-px bg-slate-900/10" />

              {/* Footer */}
              <div className="text-center">
                <p className="text-sm">
                  Sudah punya akun?{" "}
                  <Link to="/login" className="text-sky-600 hover:underline font-semibold">Masuk</Link>
                </p>
                <p className="text-[10px] mt-3 tracking-widest text-slate-900/60">
                  © {new Date().getFullYear()} POS — Simple • Fast • Reliable
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}
