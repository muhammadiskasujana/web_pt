import { useState } from "react";
import axios from "../config/axios";
import { Link, useNavigate } from "react-router-dom";
import { Shield, User, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import Cookies from "js-cookie";
import { v4 as uuidv4 } from "uuid";
import { jwtDecode } from "jwt-decode";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Function to get device ID from cookies or generate new one
  const getDeviceId = () => {
    let deviceId = Cookies.get("device_id");

    if (!deviceId) {
      // Generate new device ID if not exists
      deviceId = uuidv4();
      // Set cookie with 365 days expiration
      Cookies.set("device_id", deviceId, { expires: 365 });
      console.log("Generated new device ID:", deviceId);
    } else {
      console.log("Using existing device ID from cookies:", deviceId);
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
    const device_id = getDeviceId(); // Get device ID from cookies

    try {
      // Call the auth/login endpoint
      const { data } = await axios.post("/api/auth/tenant/login", {
        email: cleanEmail,
        password: cleanPassword,
        device_id,
      });

      if (data.success !== false && data.user) {
        console.log("Login successful, cookies should be set by server");

        // Decode JWT token to get user role
        let userRole = 'user'; // default role
        try {
          const token = Cookies.get("tenant_access_token");
          if (token) {
            const decodedToken = jwtDecode(token);
            userRole = decodedToken.userRole || 'user';
            console.log("Decoded user role:", userRole);
          }
        } catch (jwtError) {
          console.error("JWT decode error:", jwtError);
          // Continue with default role if JWT decode fails
        }

        // Create user object for state management
        const userObj = {
          authenticated: true,
          userRole: userRole,
          ...data.user
        };

        onLogin?.(userObj);
        navigate("/dashboard");
      } else {
        alert(data.message || "Login failed");
      }
    } catch (err) {
      console.error("Login error:", err);
      if (err.response?.data?.error) {
        alert(err.response.data.error);
      } else if (err.response?.data?.message) {
        alert(err.response.data.message);
      } else {
        alert("An error occurred: " + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
      <div className="min-h-screen relative overflow-hidden bg-[#0b0c10] flex items-center justify-center px-4">
        {/* Background: gritty radial + angled sheen */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(27,31,45,0.85),rgba(8,9,12,1))]" />
          {/* Metallic diagonal lines */}
          <div
              className="absolute inset-0 opacity-25"
              style={{
                backgroundImage:
                    "repeating-linear-gradient(135deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, transparent 1px, transparent 10px)",
              }}
          />
          {/* Vignette */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60" />
        </div>

        <div className="relative w-full max-w-md">
          {/* Animated border frame */}
          <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 rounded-2xl blur opacity-60 animate-pulse" />

          <div className="relative rounded-2xl border border-zinc-700/70 bg-zinc-900/70 backdrop-blur-xl shadow-2xl">
            {/* Header */}
            <div className="px-8 pt-8 pb-6 text-center">
              <div className="mx-auto mb-4 h-16 w-16 rounded-2xl flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700 shadow-inner">
                <Shield className="h-8 w-8 text-cyan-400" />
              </div>
              <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-zinc-400 text-sm tracking-widest uppercase">
                Secure Access
              </span>
              </div>
              <h1 className="text-2xl font-extrabold tracking-wide text-white">
                Masuk Akun
              </h1>
              <p className="text-zinc-400 text-sm mt-1">
                Tunjukkan kredensialmu. Tetap{" "}
                <span className="text-cyan-400">tangguh</span>.
              </p>
            </div>

            {/* Form */}
            <div className="px-8 pb-6 space-y-4" onKeyDown={onKeyDown}>
              <label className="block">
              <span className="mb-1.5 block text-zinc-300 text-sm tracking-wide">
                Email
              </span>
                <div className="group relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                    <User className="h-5 w-5 text-zinc-500 group-focus-within:text-cyan-400 transition-colors" />
                  </div>
                  <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="user@example.com"
                      className="w-full pl-10 pr-4 py-3 text-white placeholder-zinc-500 bg-zinc-800/50 border border-zinc-700/50 rounded-lg focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none transition-all"
                  />
                </div>
              </label>

              <label className="block">
              <span className="mb-1.5 block text-zinc-300 text-sm tracking-wide">
                Password
              </span>
                <div className="group relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                    <Lock className="h-5 w-5 text-zinc-500 group-focus-within:text-cyan-400 transition-colors" />
                  </div>
                  <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full pl-10 pr-10 py-3 text-white placeholder-zinc-500 bg-zinc-800/50 border border-zinc-700/50 rounded-lg focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none transition-all"
                  />
                  <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-500 hover:text-cyan-400 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </label>

              <div className="pt-2">
                <button
                    onClick={handleLogin}
                    disabled={loading}
                    className="w-full py-3.5 px-6 text-white font-semibold bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 rounded-lg transition-all duration-300 shadow-lg hover:shadow-cyan-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                      <>
                        <Loader2 className="animate-spin h-5 w-5" />
                        Masuk...
                      </>
                  ) : (
                      "Masuk"
                  )}
                </button>
              </div>

              <div className="text-center pt-4 space-y-2">
                <Link
                    to="/forgot-password"
                    className="text-sm text-zinc-400 hover:text-cyan-400 transition-colors"
                >
                  Lupa password?
                </Link>

                <div className="text-zinc-500 text-sm">
                  Belum punya akun?{" "}
                  <Link
                      to="/register"
                      className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
                  >
                    Daftar sekarang
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}