import { useState } from "react";
import axios from "../config/axios";
import { Link, useNavigate } from "react-router-dom";
import {
    ShieldCheck,
    Mail,
    Lock,
    Eye,
    EyeOff,
    Loader2,
    ArrowLeft,
    Check,
    AlertCircle,
    Receipt,
} from "lucide-react";

// Forgot Password — Flat, bold, 3‑color theme (White • Slate‑900 • Sky‑600)
export default function ForgotPassword() {
    const [step, setStep] = useState(1); // 1: email, 2: otp & password
    const [form, setForm] = useState({ email: "", otp: "", new_password: "", confirm_password: "" });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [otpInfo, setOtpInfo] = useState(null);
    const navigate = useNavigate();

    const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

    const requestOTP = async () => {
        const cleanEmail = form.email.trim();
        if (!cleanEmail) return alert("Email is required");
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(cleanEmail)) return alert("Please enter a valid email address");

        setLoading(true);
        try {
            const { data } = await axios.post("/api/users/request-password-reset", { email: cleanEmail });
            setOtpInfo(data);
            setStep(2);
            alert(data.message || "OTP sent to your WhatsApp number");
        } catch (err) {
            if (err.response?.data?.error) alert(err.response.data.error);
            else if (err.response?.data?.message) alert(err.response.data.message);
            else alert("An error occurred while requesting OTP.");
        } finally {
            setLoading(false);
        }
    };

    const resetPassword = async () => {
        const { email, otp, new_password, confirm_password } = form;
        if (!email.trim() || !otp.trim() || !new_password.trim() || !confirm_password.trim()) return alert("All fields are required");
        if (new_password !== confirm_password) return alert("Passwords do not match");
        if (new_password.length < 6) return alert("Password must be at least 6 characters long");
        if (otp.length !== 6) return alert("OTP must be 6 digits");

        setLoading(true);
        try {
            const { data } = await axios.post("/api/users/reset-password", { email: email.trim(), otp: otp.trim(), new_password });
            alert(data.message || "Password reset successful!");
            navigate("/login");
        } catch (err) {
            if (err.response?.data?.error) alert(err.response.data.error);
            else if (err.response?.data?.message) alert(err.response.data.message);
            else alert("An error occurred while resetting password.");
        } finally {
            setLoading(false);
        }
    };

    const onKeyDown = (e) => {
        if (e.key === "Enter") (step === 1 ? requestOTP() : resetPassword());
    };

    return (
        <div className="min-h-screen bg-white text-slate-900 flex items-center justify-center px-4 py-10">
            <div className="w-full max-w-md">
                {/* Brand header — match Login/Register */}
                <div className="mb-5 flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-slate-900 flex items-center justify-center">
                        <Receipt className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black leading-tight">{step === 1 ? "Reset Password" : "Verifikasi & Reset"}</h1>
                        <p className="text-sm text-slate-900/60">{step === 1 ? "Masukkan email untuk menerima OTP" : "Masukkan OTP dan password baru"}</p>
                    </div>
                </div>

                {/* Card — flat */}
                <div className="rounded-2xl border border-slate-900/15 bg-white shadow-[0_8px_20px_rgba(0,0,0,0.06)]">
                    {/* Stepper */}
                    <div className="px-6 pt-6">
                        <div className="flex items-center justify-center gap-3 text-[11px]">
                            <div className="flex items-center gap-2">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step >= 1 ? 'bg-sky-600 text-white' : 'bg-slate-200 text-slate-500'}`}>{step > 1 ? <Check className="w-4 h-4" /> : '1'}</div>
                                <span className="text-slate-600">Email</span>
                            </div>
                            <div className={`h-0.5 w-10 ${step >= 2 ? 'bg-sky-600' : 'bg-slate-200'}`} />
                            <div className="flex items-center gap-2">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step >= 2 ? 'bg-sky-600 text-white' : 'bg-slate-200 text-slate-500'}`}>2</div>
                                <span className="text-slate-600">Reset</span>
                            </div>
                        </div>
                    </div>

                    {/* Form */}
                    <div className="p-6 sm:p-8 space-y-5" onKeyDown={onKeyDown}>
                        {step === 1 ? (
                            <>
                                <label className="block">
                                    <span className="mb-2 block text-sm font-medium">Alamat Email</span>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-900/60" />
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

                                <div className="flex items-start gap-3 p-4 rounded-xl border border-slate-900/15 bg-white">
                                    <AlertCircle className="h-5 w-5 text-sky-600 mt-0.5 flex-shrink-0" />
                                    <div className="text-sm text-slate-700">
                                        <p className="font-medium">Cara Kerja Sistem</p>
                                        <p className="mt-1 text-slate-600">Kami akan mengirimkan 6-digit OTP ke nomor WhatsApp Anda.</p>
                                    </div>
                                </div>

                                <button
                                    onClick={requestOTP}
                                    disabled={loading}
                                    className="w-full py-3 rounded-xl font-semibold text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-4 focus:ring-sky-600/30 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {loading ? (<><Loader2 className="h-5 w-5 animate-spin" /> Mengirim OTP...</>) : (<>Kirim OTP</>)}
                                </button>
                            </>
                        ) : (
                            <>
                                {otpInfo && (
                                    <div className="flex items-start gap-3 p-4 rounded-xl border border-slate-900/15 bg-white">
                                        <ShieldCheck className="h-5 w-5 text-sky-600 mt-0.5 flex-shrink-0" />
                                        <div className="text-sm text-slate-700">
                                            <p className="font-medium">OTP Terkirim</p>
                                            <p className="mt-1 text-slate-600">Cek WhatsApp Anda ({otpInfo.phone_masked}) untuk kode verifikasi.</p>
                                        </div>
                                    </div>
                                )}

                                <label className="block">
                                    <span className="mb-2 block text-sm font-medium">Kode Verifikasi</span>
                                    <input
                                        type="text"
                                        name="otp"
                                        value={form.otp}
                                        onChange={handleChange}
                                        placeholder="123456"
                                        maxLength={6}
                                        className="w-full px-4 py-3 text-center text-2xl font-mono tracking-widest rounded-xl bg-white border border-slate-900/20 text-slate-900 placeholder:text-slate-900/40 outline-none focus:ring-4 focus:ring-sky-600/30 focus:border-sky-600 transition"
                                    />
                                </label>

                                <label className="block">
                                    <span className="mb-2 block text-sm font-medium">Password Baru</span>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-900/60" />
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            name="new_password"
                                            value={form.new_password}
                                            onChange={handleChange}
                                            placeholder="••••••••"
                                            className="w-full pl-11 pr-12 py-3 rounded-xl bg-white border border-slate-900/20 text-slate-900 placeholder:text-slate-900/40 outline-none focus:ring-4 focus:ring-sky-600/30 focus:border-sky-600 transition"
                                            autoComplete="new-password"
                                        />
                                        <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-900/60 hover:text-slate-900">
                                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                        </button>
                                    </div>
                                </label>

                                <label className="block">
                                    <span className="mb-2 block text-sm font-medium">Konfirmasi Password Baru</span>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-900/60" />
                                        <input
                                            type={showConfirmPassword ? "text" : "password"}
                                            name="confirm_password"
                                            value={form.confirm_password}
                                            onChange={handleChange}
                                            placeholder="••••••••"
                                            className="w-full pl-11 pr-12 py-3 rounded-xl bg-white border border-slate-900/20 text-slate-900 placeholder:text-slate-900/40 outline-none focus:ring-4 focus:ring-sky-600/30 focus:border-sky-600 transition"
                                            autoComplete="new-password"
                                        />
                                        <button type="button" onClick={() => setShowConfirmPassword((s) => !s)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-900/60 hover:text-slate-900">
                                            {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                        </button>
                                    </div>
                                </label>

                                <div className="flex gap-3">
                                    <button onClick={() => setStep(1)} className="flex-1 py-3 rounded-xl font-semibold text-slate-900 bg-white border border-slate-900/20 hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-900/10 transition flex items-center justify-center gap-2">
                                        <ArrowLeft className="h-4 w-4" /> Kembali
                                    </button>
                                    <button onClick={resetPassword} disabled={loading} className="flex-1 py-3 rounded-xl font-semibold text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-4 focus:ring-sky-600/30 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                                        {loading ? (<><Loader2 className="h-5 w-5 animate-spin" /> Resetting...</>) : (<>Reset Password</>)}
                                    </button>
                                </div>
                            </>
                        )}

                        {/* Footer */}
                        <div className="pt-4 text-center">
                            <p className="text-sm">
                                Ingat password? {" "}
                                <Link to="/login" className="text-sky-600 hover:underline font-semibold">Kembali ke Login</Link>
                            </p>
                            <p className="text-[10px] mt-3 tracking-widest text-slate-900/60">© {new Date().getFullYear()} POS — Simple • Fast • Reliable</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
