// import { useState, useEffect } from "react";
// import axios from "../config/axios";
// import { useNavigate } from "react-router-dom";
// import Cookies from "js-cookie";
// import {
//     BarChart3,
//     TrendingUp,
//     Clock,
//     Award,
//     RefreshCw,
//     Calendar,
//     AlertCircle,
//     CheckCircle2,
// } from "lucide-react";
//
// const TZ = "Asia/Jakarta";
// const TZ_LABEL = "WIB";
//
// // YYYY-MM-DD di zona Asia/Jakarta (untuk <input type="date">)
// const todayYmdJakarta = (d = new Date()) =>
//     new Intl.DateTimeFormat("en-CA", {
//         timeZone: TZ,
//         year: "numeric",
//         month: "2-digit",
//         day: "2-digit",
//     }).format(d);
//
// // Tampilkan tanggal-only sesuai TZ.
// // Jika backend sudah kirim "YYYY-MM-DD", pakai apa adanya.
// const formatDateOnlyJakarta = (input) => {
//     if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
//         return input; // ini sudah tanggal di TZ bisnis (dari backend)
//     }
//     return new Intl.DateTimeFormat("id-ID", {
//         timeZone: TZ,
//         year: "numeric",
//         month: "long",
//         day: "numeric",
//     }).format(new Date(input));
// };
//
// export default function Dashboard() {
//     const [stats, setStats] = useState(null);
//     const [loading, setLoading] = useState(true);
//     const [error, setError] = useState(null);
//     // ⬇️ pakai tanggal hari ini versi Asia/Jakarta, bukan UTC
//     const [selectedDate, setSelectedDate] = useState(() => todayYmdJakarta());
//     const navigate = useNavigate();
//
//     useEffect(() => {
//         fetchStats(selectedDate);
//     }, [selectedDate]);
//
//     const fetchStats = async (date) => {
//         setLoading(true);
//         setError(null);
//         try {
//             // ⬇️ kirim timezone ke backend supaya konsisten
//             const { data } = await axios.get(
//                 `/api/cek-logs/my-stats`,
//                 { params: { date, timezone: TZ } }
//             );
//             setStats(data.stats);
//         } catch (err) {
//             console.error("Error fetching stats:", err);
//             if (err.response?.status === 401 || err.response?.status === 403) {
//                 Cookies.remove("tenant_access_token");
//                 Cookies.remove("tenant_refresh_token");
//                 Cookies.remove("device_id");
//                 window.location.reload();
//                 return;
//             }
//             setError(err.response?.data?.message || "Failed to fetch statistics");
//         } finally {
//             setLoading(false);
//         }
//     };
//
//     const handleRefresh = () => {
//         fetchStats(selectedDate);
//     };
//
//     const getUsageColor = (percentage) => {
//         if (percentage >= 80) return "text-red-400 bg-red-900/20 border-red-500/30";
//         if (percentage >= 60) return "text-yellow-400 bg-yellow-900/20 border-yellow-500/30";
//         return "text-emerald-400 bg-emerald-900/20 border-emerald-500/30";
//     };
//
//     const getTierColor = (tier) => {
//         switch (tier?.toLowerCase()) {
//             case "gold":
//                 return "text-yellow-400 bg-yellow-900/20";
//             case "silver":
//                 return "text-gray-400 bg-gray-800/20";
//             case "bronze":
//                 return "text-orange-400 bg-orange-900/20";
//             default:
//                 return "text-cyan-400 bg-cyan-900/20";
//         }
//     };
//
//     if (error) {
//         return (
//             <div className="flex items-center justify-center h-96">
//                 <div className="text-center">
//                     <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
//                     <h3 className="text-lg font-semibold text-white mb-2">Error Loading Data</h3>
//                     <p className="text-zinc-400 mb-4">{error}</p>
//                     <button
//                         onClick={handleRefresh}
//                         className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors"
//                     >
//                         Coba Lagi
//                     </button>
//                 </div>
//             </div>
//         );
//     }
//
//     return (
//         <div className="space-y-6">
//             {/* Header */}
//             <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
//                 <div>
//                     <h2 className="text-2xl font-bold text-white">Dashboard Overview</h2>
//                     <p className="text-zinc-400">Monitor statistik dan penggunaan harian anda</p>
//                 </div>
//
//                 <div className="flex items-center gap-3">
//                     <div className="flex items-center gap-2">
//                         <Calendar className="h-4 w-4 text-zinc-400" />
//                         <input
//                             type="date"
//                             value={selectedDate}
//                             onChange={(e) => setSelectedDate(e.target.value)}
//                             className="px-3 py-2 bg-zinc-800 border border-zinc-700 text-white rounded-lg text-sm focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none"
//                         />
//                     </div>
//                     <button
//                         onClick={handleRefresh}
//                         disabled={loading}
//                         className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors disabled:opacity-50"
//                     >
//                         <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
//                         Refresh
//                     </button>
//                 </div>
//             </div>
//
//             {loading ? (
//                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
//                     {[...Array(4)].map((_, i) => (
//                         <div key={i} className="animate-pulse">
//                             <div className="bg-zinc-800/50 rounded-xl p-6 h-32"></div>
//                         </div>
//                     ))}
//                 </div>
//             ) : stats ? (
//                 <>
//                     {/* Stats Cards */}
//                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
//                         {/* Usage Card */}
//                         <div className="bg-zinc-900/70 backdrop-blur-xl rounded-xl border border-zinc-700/50 p-6">
//                             <div className="flex items-center justify-between mb-4">
//                                 <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-cyan-600 to-indigo-700 flex items-center justify-center">
//                                     <BarChart3 className="h-6 w-6 text-white" />
//                                 </div>
//                                 <div className="text-right">
//                                     <p className="text-sm text-zinc-400">Penggunaan Harian</p>
//                                     <p className="text-2xl font-bold text-white">{stats.usage}</p>
//                                 </div>
//                             </div>
//                             <div className="flex items-center justify-between text-sm">
//                                 <span className="text-zinc-400">of {stats.limit} limit</span>
//                                 <span className="text-cyan-400">{stats.percentage}%</span>
//                             </div>
//                         </div>
//
//                         {/* Remaining Card */}
//                         <div className={`backdrop-blur-xl rounded-xl border p-6 ${getUsageColor(stats.percentage)}`}>
//                             <div className="flex items-center justify-between mb-4">
//                                 <div
//                                     className={`h-12 w-12 rounded-lg flex items-center justify-center ${
//                                         stats.percentage >= 80
//                                             ? "bg-red-600/20"
//                                             : stats.percentage >= 60
//                                                 ? "bg-yellow-600/20"
//                                                 : "bg-emerald-600/20"
//                                     }`}
//                                 >
//                                     <TrendingUp className="h-6 w-6" />
//                                 </div>
//                                 <div className="text-right">
//                                     <p className="text-sm opacity-80">Sisa</p>
//                                     <p className="text-2xl font-bold">{stats.remaining}</p>
//                                 </div>
//                             </div>
//                             <div className="flex items-center justify-between text-sm opacity-80">
//                                 <span>Tersisa Hari Ini</span>
//                                 {stats.remaining > 0 ? (
//                                     <CheckCircle2 className="h-4 w-4" />
//                                 ) : (
//                                     <AlertCircle className="h-4 w-4" />
//                                 )}
//                             </div>
//                         </div>
//
//                         {/* Activation Type Card */}
//                         <div className={`backdrop-blur-xl rounded-xl border border-zinc-700/50 p-6 ${getTierColor(stats.jenis_aktivasi)}`}>
//                             <div className="flex items-center justify-between mb-4">
//                                 <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${getTierColor(stats.jenis_aktivasi)}`}>
//                                     <Award className="h-6 w-6" />
//                                 </div>
//                                 <div className="text-right">
//                                     <p className="text-sm opacity-80">Jenis Aktivasi</p>
//                                     <p className="text-2xl font-bold capitalize">{stats.jenis_aktivasi}</p>
//                                 </div>
//                             </div>
//                             <div className="text-sm opacity-80">
//                                 <span>Active subscription</span>
//                             </div>
//                         </div>
//
//                         {/* Date Card */}
//                         <div className="bg-zinc-900/70 backdrop-blur-xl rounded-xl border border-zinc-700/50 p-6">
//                             <div className="flex items-center justify-between mb-4">
//                                 <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-purple-600 to-pink-700 flex items-center justify-center">
//                                     <Clock className="h-6 w-6 text-white" />
//                                 </div>
//                                 <div className="text-right">
//                                     <p className="text-sm text-zinc-400">Tanggal</p>
//                                     <p className="text-lg font-semibold text-white">
//                                         {formatDateOnlyJakarta(stats.date)} {TZ_LABEL}
//                                     </p>
//                                 </div>
//                             </div>
//                             <div className="text-sm text-zinc-400">
//                                 <span>Periode Statistik (timezone: {TZ_LABEL})</span>
//                             </div>
//                         </div>
//                     </div>
//
//                     {/* Usage Progress */}
//                     <div className="bg-zinc-900/70 backdrop-blur-xl rounded-xl border border-zinc-700/50 p-6">
//                         <div className="flex items-center justify-between mb-4">
//                             <h3 className="text-lg font-semibold text-white">Progres Penggunaan</h3>
//                             <span className="text-sm text-zinc-400">
//                 {stats.usage} / {stats.limit}
//               </span>
//                         </div>
//
//                         <div className="w-full bg-zinc-800 rounded-full h-3 mb-4">
//                             <div
//                                 className={`h-3 rounded-full transition-all duration-500 ${
//                                     stats.percentage >= 80
//                                         ? "bg-gradient-to-r from-red-500 to-red-600"
//                                         : stats.percentage >= 60
//                                             ? "bg-gradient-to-r from-yellow-500 to-yellow-600"
//                                             : "bg-gradient-to-r from-emerald-500 to-emerald-600"
//                                 }`}
//                                 style={{ width: `${Math.min(stats.percentage, 100)}%` }}
//                             ></div>
//                         </div>
//
//                         <div className="text-sm text-zinc-400 text-center">
//                             {stats.remaining > 0
//                                 ? `${stats.remaining} checks remaining today`
//                                 : "Daily limit reached"}
//                         </div>
//                     </div>
//                 </>
//             ) : (
//                 <div className="text-center py-12">
//                     <p className="text-zinc-400">No data available</p>
//                 </div>
//             )}
//         </div>
//     );
// }
import { useState, useEffect } from "react";
import axios from "../config/axios";
import { useNavigate } from "react-router-dom";
import Cookies from "js-cookie";
import {
    BarChart3,
    TrendingUp,
    Clock,
    Coins,
    RefreshCw,
    Calendar,
    AlertCircle,
    CheckCircle2,
    TimerReset,
} from "lucide-react";

const TZ = "Asia/Jakarta";
const TZ_LABEL = "WIB";

// YYYY-MM-DD di zona Asia/Jakarta (untuk <input type="date">)
const todayYmdJakarta = (d = new Date()) =>
    new Intl.DateTimeFormat("en-CA", {
        timeZone: TZ,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(d);

// Tanggal-only sesuai TZ (fallback kalau backend tidak sudah YYYY-MM-DD)
const formatDateOnlyJakarta = (input) => {
    if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
        return input;
    }
    return new Intl.DateTimeFormat("id-ID", {
        timeZone: TZ,
        year: "numeric",
        month: "long",
        day: "numeric",
    }).format(new Date(input));
};

// Tanggal+waktu singkat untuk expiry
const formatDateTimeJakarta = (input) => {
    if (!input) return "-";
    return new Intl.DateTimeFormat("id-ID", {
        timeZone: TZ,
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(input));
};

export default function Dashboard() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    // pakai tanggal hari ini versi Asia/Jakarta, bukan UTC
    const [selectedDate, setSelectedDate] = useState(() => todayYmdJakarta());
    const navigate = useNavigate();

    useEffect(() => {
        fetchStats(selectedDate);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedDate]);

    const fetchStats = async (date) => {
        setLoading(true);
        setError(null);
        try {
            // kirim timezone ke backend supaya konsisten
            const { data } = await axios.get(`/api/cek-logs/my-stats`, {
                params: { date, timezone: TZ },
            });
            setStats(data.stats);
        } catch (err) {
            console.error("Error fetching stats:", err);
            if (err.response?.status === 401 || err.response?.status === 403) {
                Cookies.remove("tenant_access_token");
                Cookies.remove("tenant_refresh_token");
                Cookies.remove("device_id");
                window.location.reload();
                return;
            }
            setError(err.response?.data?.message || "Failed to fetch statistics");
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = () => {
        fetchStats(selectedDate);
    };

    // warna kartu “kesehatan” berdasarkan checks_possible
    const getBalanceColor = (checksPossible) => {
        if (checksPossible == null) return "text-zinc-300 bg-zinc-800/30 border-zinc-700/50";
        if (checksPossible <= 5) return "text-red-400 bg-red-900/20 border-red-500/30";
        if (checksPossible <= 20) return "text-yellow-400 bg-yellow-900/20 border-yellow-500/30";
        return "text-emerald-400 bg-emerald-900/20 border-emerald-500/30";
    };

    if (error) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">Error Loading Data</h3>
                    <p className="text-zinc-400 mb-4">{error}</p>
                    <button
                        onClick={handleRefresh}
                        className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors"
                    >
                        Coba Lagi
                    </button>
                </div>
            </div>
        );
    }

    // derived
    const usageToday = stats?.usage_today ?? 0;
    const costPerCheck = stats?.cost_per_check ?? 1;
    const coin = stats?.coin || {};
    const balance = coin.balance ?? 0;
    const checksPossible = coin.checks_possible ?? 0;
    const isExpired = !!coin.is_expired;
    const expiresAtLabel = formatDateTimeJakarta(coin.expires_at);
    const daysLeft = coin.days_left ?? null;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white">Dashboard Overview</h2>
                    <p className="text-zinc-400">Monitor statistik penggunaan & saldo koin</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-zinc-400" />
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="px-3 py-2 bg-zinc-800 border border-zinc-700 text-white rounded-lg text-sm focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none"
                        />
                    </div>
                    <button
                        onClick={handleRefresh}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                        Refresh
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="animate-pulse">
                            <div className="bg-zinc-800/50 rounded-xl p-6 h-32"></div>
                        </div>
                    ))}
                </div>
            ) : stats ? (
                <>
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Usage Today */}
                        <div className="bg-zinc-900/70 backdrop-blur-xl rounded-xl border border-zinc-700/50 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-cyan-600 to-indigo-700 flex items-center justify-center">
                                    <BarChart3 className="h-6 w-6 text-white" />
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-zinc-400">Penggunaan Hari Ini</p>
                                    <p className="text-2xl font-bold text-white">{usageToday}</p>
                                </div>
                            </div>
                            <div className="flex items-center justify-between text-sm text-zinc-400">
                                <span>Biaya per cek</span>
                                <span className="text-cyan-400">{costPerCheck} koin</span>
                            </div>
                        </div>

                        {/* Coin Balance */}
                        <div
                            className={`backdrop-blur-xl rounded-xl border p-6 ${getBalanceColor(
                                checksPossible
                            )}`}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className="h-12 w-12 rounded-lg flex items-center justify-center bg-emerald-600/20">
                                    <Coins className="h-6 w-6" />
                                </div>
                                <div className="text-right">
                                    <p className="text-sm opacity-80">Saldo Koin</p>
                                    <p className="text-2xl font-bold">{balance}</p>
                                </div>
                            </div>
                            <div className="flex items-center justify-between text-sm opacity-80">
                                <span>Estimasi cek bisa dilakukan</span>
                                <span className="font-medium">{checksPossible}x</span>
                            </div>
                        </div>

                        {/* Expiry */}
                        <div
                            className={`backdrop-blur-xl rounded-xl border p-6 ${
                                isExpired
                                    ? "text-red-400 bg-red-900/20 border-red-500/30"
                                    : "text-purple-300 bg-purple-900/20 border-purple-500/30"
                            }`}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className="h-12 w-12 rounded-lg flex items-center justify-center bg-purple-600/20">
                                    <TimerReset className="h-6 w-6" />
                                </div>
                                <div className="text-right">
                                    <p className="text-sm opacity-80">Masa Berlaku Koin</p>
                                    <p className="text-lg font-semibold">{expiresAtLabel}</p>
                                </div>
                            </div>
                            <div className="flex items-center justify-between text-sm opacity-80">
                                <span>{isExpired ? "Status" : "Sisa hari"}</span>
                                {isExpired ? (
                                    <span className="flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" /> Kedaluwarsa
                  </span>
                                ) : (
                                    <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" />
                                        {daysLeft ?? "-"} hari
                  </span>
                                )}
                            </div>
                        </div>

                        {/* Date (window statistik) */}
                        <div className="bg-zinc-900/70 backdrop-blur-xl rounded-xl border border-zinc-700/50 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-purple-600 to-pink-700 flex items-center justify-center">
                                    <Clock className="h-6 w-6 text-white" />
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-zinc-400">Tanggal</p>
                                    <p className="text-lg font-semibold text-white">
                                        {formatDateOnlyJakarta(stats.date)} {TZ_LABEL}
                                    </p>
                                </div>
                            </div>
                            <div className="text-sm text-zinc-400">
                                <span>Periode statistik (timezone: {TZ_LABEL})</span>
                            </div>
                        </div>
                    </div>

                    {/* Usage Highlight */}
                    <div className="bg-zinc-900/70 backdrop-blur-xl rounded-xl border border-zinc-700/50 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-white">Ringkasan Penggunaan</h3>
                            <span className="text-sm text-zinc-400">
                {usageToday} cek • {costPerCheck} koin/cek • butuh{" "}
                                <span className="text-cyan-400">{usageToday * costPerCheck}</span> koin hari ini
              </span>
                        </div>

                        {isExpired ? (
                            <div className="text-sm text-red-300 bg-red-900/20 border border-red-700/40 rounded-md p-3">
                                Koin Anda sudah kedaluwarsa. Lakukan top up untuk mengaktifkan kembali masa berlaku.
                            </div>
                        ) : checksPossible <= 0 ? (
                            <div className="text-sm text-yellow-300 bg-yellow-900/20 border border-yellow-700/40 rounded-md p-3">
                                Saldo koin habis. Silakan top up agar bisa melakukan cek lagi.
                            </div>
                        ) : (
                            <div className="text-sm text-zinc-300 text-center py-2">
                                Anda masih bisa melakukan <span className="font-semibold">{checksPossible}</span>{" "}
                                cek dengan saldo saat ini.
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <div className="text-center py-12">
                    <p className="text-zinc-400">No data available</p>
                </div>
            )}
        </div>
    );
}


