
import { useState, useRef } from "react";
import axios from "../config/axios";
import { useNavigate } from "react-router-dom";
import Cookies from "js-cookie";
import {
    Search,
    Loader2,
    Car,
    Calendar,
    Palette,
    User,
    Hash,
    Settings,
    CheckCircle2,
    AlertTriangle,
    Clock,
    Copy,
    Share2,
    Check,
    Camera,
    Image as ImageIcon,
    X as XIcon,
    Coins,
    TimerReset,
} from "lucide-react";

const TZ = "Asia/Jakarta";
const TZ_LABEL = "WIB";

function formatJakarta(ts, opts = {}) {
    try {
        return new Intl.DateTimeFormat("en-GB", {
            dateStyle: "medium",
            timeStyle: "medium",
            hour12: false,
            timeZone: TZ,
            ...opts,
        }).format(new Date(ts));
    } catch {
        return new Date(ts).toLocaleString("en-GB", { timeZone: TZ });
    }
}

/** -------- Parser skema LAMA (reply string WhatsApp) -------- */
function parseOldReplyText(replyText) {
    if (!replyText || typeof replyText !== "string") return {};

    const lines = replyText
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

    // Kumpulkan semua "Key: Value" (abaikan header yang tidak punya ':')
    const kv = {};
    for (const raw of lines) {
        // contoh cocok:
        // "• *Nopol*: DA-6087-ABD"
        // "• *Noka* : MH31KP00DEJ840002"
        // "• *Warna*: HITAM"
        const m = raw.match(/^\s*(?:[-•\u2022]\s*)?\*?\s*([A-Za-z]+)\*?\s*:\s*(.+)\s*$/i);
        if (!m) continue;
        const key = m[1].toLowerCase();
        const val = m[2].replace(/\*/g, "").trim();
        kv[key] = val;
    }

    const info = {
        nopol: kv["nopol"] ? kv["nopol"].toUpperCase() : undefined,
        noka:  kv["noka"]  ? kv["noka"].toUpperCase()  : undefined,
        nosin: kv["nosin"] ? kv["nosin"].toUpperCase() : undefined,
        jenis: kv["jenis"] || undefined,
        tahun: kv["tahun"] || undefined,
        warna: kv["warna"] || undefined,
        nama:  kv["nama"]  || undefined,
    };

    Object.keys(info).forEach((k) => !info[k] && delete info[k]);
    return info;
}

/** -------- Parser skema BARU (objek terstruktur) -------- */
function parseNewStructured(resultObj) {
    if (!resultObj || typeof resultObj !== "object") return {};

    const jenisParts = [resultObj.JenisKendaraan, resultObj.Merk, resultObj.Type].filter(Boolean);
    const jenis = jenisParts.join(" ").trim() || undefined;

    const info = {
        nopol: resultObj.PlatNomor || resultObj.Plat || resultObj.Nopol,
        noka: resultObj.NoRangka,
        nosin: resultObj.NoMesin,
        jenis,
        tahun: resultObj.TahunPembuatan || resultObj.Tahun,
        warna: resultObj.Warna,
        nama: resultObj.NamaPemilik || resultObj.Nama,
    };
    Object.keys(info).forEach((k) => !info[k] && delete info[k]);
    return info;
}

/** -------- Adapter: dukung skema lama & baru -------- */
function getVehicleInfoUnified(dataContainer) {
    const r = dataContainer?.result;

    if (r && typeof r === "object" && !("success" in r) && !("reply" in r)) {
        const parsed = parseNewStructured(r);
        if (Object.keys(parsed).length > 0) return parsed;
    }
    if (r?.success && typeof r?.reply === "string") {
        const parsed = parseOldReplyText(r.reply);
        if (Object.keys(parsed).length > 0) return parsed;
    }
    return {};
}

// Konversi file gambar apapun ke JPEG terukur (maxDim px), return File baru
async function normalizeImage(file, { maxDim = 1600, quality = 0.9 } = {}) {
    const blob = file instanceof Blob ? file : new Blob([file]);
    let bitmap;
    try {
        bitmap = await createImageBitmap(blob);
    } catch {
        const url = URL.createObjectURL(blob);
        try {
            bitmap = await new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = url;
            });
        } finally {
            URL.revokeObjectURL(url);
        }
    }

    const { width: w, height: h } = bitmap;
    const scale = Math.min(1, maxDim / Math.max(w, h));
    const outW = Math.round(w * scale);
    const outH = Math.round(h * scale);

    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bitmap, 0, 0, outW, outH);

    const outBlob = await new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/jpeg", quality)
    );

    const outFile = new File([outBlob], (file.name || "image").replace(/\.\w+$/i, "") + ".jpg", {
        type: "image/jpeg",
        lastModified: Date.now(),
    });

    return outFile;
}

export default function CheckNopol() {
    const [nopol, setNopol] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);    // data.data
    const [usage, setUsage] = useState(null);      // { coins_spent, balance, expires_at }
    const [error, setError] = useState(null);
    const [copied, setCopied] = useState(false);

    // VISION state (upload)
    const [showVision, setShowVision] = useState(false);
    const [visionTarget, setVisionTarget] = useState("nopol"); // 'nopol' | 'noka' | 'nosin'
    const [visionFile, setVisionFile] = useState(null);
    const [visionPreview, setVisionPreview] = useState(null);
    const [visionLoading, setVisionLoading] = useState(false);
    const [visionError, setVisionError] = useState(null);
    const cameraInputRef = useRef(null);
    const galleryInputRef = useRef(null);

    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();

        const cleanNopol = nopol.trim().toUpperCase();
        if (!cleanNopol) {
            setError("Silakan Masukkan Nopol/Noka/Nosin");
            return;
        }

        setLoading(true);
        setError(null);
        setResult(null);
        setUsage(null);

        try {
            const { data } = await axios.post("/api/cek-logs/check-nopol", {
                message: cleanNopol,
            });
            setResult(data.data);
            setUsage(data.usage); // { coins_spent, balance, expires_at }
        } catch (err) {
            console.error("Error checking nopol:", err);

            if (err.response?.status === 401 || err.response?.status === 403) {
                Cookies.remove("tenant_access_token");
                Cookies.remove("tenant_refresh_token");
                Cookies.remove("device_id");
                window.location.reload();
                return;
            }

            setError(err.response?.data?.message || "Failed to check vehicle number plate");
        } finally {
            setLoading(false);
        }
    };

    const vehicleInfo = result ? getVehicleInfoUnified(result) : {};
    const hasVehicleInfo = Object.keys(vehicleInfo).length > 0;

    const formatResultText = (vehicleInfo, timestamp) => {
        const checkDate = `${formatJakarta(timestamp)} ${TZ_LABEL}`;
        let text = `🚗 VEHICLE CHECK RESULT\n`;
        text += `═══════════════════════\n\n`;

        if (vehicleInfo.nopol) text += `📝 Plat Nomor: ${vehicleInfo.nopol}\n`;
        if (vehicleInfo.jenis) text += `🚙 Jenis: ${vehicleInfo.jenis}\n`;
        if (vehicleInfo.tahun) text += `📅 Tahun: ${vehicleInfo.tahun}\n`;
        if (vehicleInfo.warna) text += `🎨 Warna: ${vehicleInfo.warna}\n`;
        if (vehicleInfo.noka) text += `🔧 Noka: ${vehicleInfo.noka}\n`;
        if (vehicleInfo.nosin) text += `⚙️ Nosin: ${vehicleInfo.nosin}\n`;
        if (vehicleInfo.nama) text += `👤 Owner: ${vehicleInfo.nama}\n`;

        text += `\n⏰ Checked: ${checkDate}\n`;
        text += `\n🔍 Powered by ONE STOP CHECK APPS`;
        return text;
    };

    const handleCopyToClipboard = async () => {
        if (!result || !hasVehicleInfo) return;
        const textToShare = formatResultText(vehicleInfo, result.timestamp);
        try {
            await navigator.clipboard.writeText(textToShare);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            const textArea = document.createElement("textarea");
            textArea.value = textToShare;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand("copy");
            document.body.removeChild(textArea);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleShare = async () => {
        if (!result || !hasVehicleInfo) return;
        const textToShare = formatResultText(vehicleInfo, result.timestamp);
        const nopolTitle = vehicleInfo.nopol || result?.result?.PlatNomor || result?.nopol || "Result";
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Vehicle Check Result - ${nopolTitle}`,
                    text: textToShare,
                });
            } catch (err) {
                if (err.name !== "AbortError") {
                    console.error("Error sharing:", err);
                    handleCopyToClipboard();
                }
            }
        } else {
            handleCopyToClipboard();
        }
    };

    // ====== VISION (upload) ======
    const openVision = () => {
        setShowVision(true);
        setVisionError(null);
    };
    const closeVision = () => {
        setShowVision(false);
        setVisionFile(null);
        setVisionPreview(null);
        setVisionLoading(false);
        setVisionError(null);
    };

    const onPickFile = async (file) => {
        if (!file) return;
        try {
            const normalized = await normalizeImage(file, { maxDim: 1600, quality: 0.9 });
            setVisionFile(normalized);
            const url = URL.createObjectURL(normalized);
            setVisionPreview(url);
        } catch (e) {
            console.error("normalizeImage failed:", e);
            setVisionError("Gagal memproses gambar dari perangkat. Coba pilih gambar lain.");
        }
    };

    const handleVisionSubmit = async () => {
        if (!visionFile) {
            setVisionError("Pilih atau ambil gambar terlebih dahulu.");
            return;
        }
        setVisionLoading(true);
        setVisionError(null);
        setError(null);
        setResult(null);
        setUsage(null);

        try {
            const form = new FormData();
            form.append("image", visionFile);
            const { data } = await axios.post(`/api/cek-logs/vision/check/${visionTarget}`, form, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            setResult(data.data);
            setUsage(data.usage); // <- koin
            closeVision();
        } catch (err) {
            console.error("Error vision check:", err);

            if (err.response?.status === 401 || err.response?.status === 403) {
                Cookies.remove("tenant_access_token");
                Cookies.remove("tenant_refresh_token");
                Cookies.remove("device_id");
                window.location.reload();
                return;
            }

            setVisionError(err.response?.data?.message || "Failed to analyze image");
        } finally {
            setVisionLoading(false);
        }
    };

    // derived untuk kartu koin
    const coinsSpent = usage?.coins_spent ?? null;
    const coinBalance = usage?.balance ?? null;
    const coinExpiresAt = usage?.expires_at ? formatJakarta(usage.expires_at) + " " + TZ_LABEL : "-";

    const balanceBadge =
        coinBalance == null
            ? "bg-zinc-800 text-zinc-300 border border-zinc-700/50"
            : coinBalance <= 3
                ? "bg-red-900/20 text-red-400 border border-red-500/30"
                : coinBalance <= 10
                    ? "bg-yellow-900/20 text-yellow-400 border border-yellow-500/30"
                    : "bg-emerald-900/20 text-emerald-400 border border-emerald-500/30";

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-2">Check Informasi Kendaraan</h2>
                <p className="text-zinc-400">
                    Masukkan Data Nopol/Noka/Nosin atau gunakan kamera untuk scan dari gambar.
                </p>
            </div>

            {/* Coin Usage (baru) */}
            {usage && (
                <div className={`rounded-xl p-4 backdrop-blur-xl ${balanceBadge}`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-zinc-800/40">
                                <Coins className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-white">Status Koin</p>
                                <p className="text-xs opacity-80">
                                    Terpakai{" "}
                                    <span className="font-semibold">
                    {coinsSpent ?? "-"} koin
                  </span>{" "}
                                    • Saldo saat ini{" "}
                                    <span className="font-semibold">
                    {coinBalance ?? "-"} koin
                  </span>
                                </p>
                            </div>
                        </div>
                        <div className="text-right text-xs">
                            <div className="text-zinc-400">Berlaku hingga</div>
                            <div className="font-medium">{coinExpiresAt}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Search Form */}
            <div className="bg-zinc-900/70 backdrop-blur-xl rounded-xl border border-zinc-700/50 p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-2">
                            Plat Nomor Kendaraan
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                                <Car className="h-5 w-5 text-zinc-500" />
                            </div>
                            <input
                                type="text"
                                value={nopol}
                                onChange={(e) => setNopol(e.target.value.toUpperCase())}
                                placeholder="e.g. A1234BC"
                                className="w-full pl-10 pr-28 py-3 bg-zinc-950/70 border border-zinc-700 text-zinc-100 placeholder-zinc-600 rounded-lg outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition"
                                disabled={loading}
                                maxLength={20}
                            />

                            {/* Scan button */}
                            <button
                                type="button"
                                onClick={openVision}
                                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-2 rounded-md bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-xs flex items-center gap-1"
                                title="Scan dari Kamera/Gambar"
                            >
                                <Camera className="h-4 w-4" />
                                Scan
                            </button>
                        </div>
                        <p className="text-xs text-zinc-500 mt-1">
                            Masukkan plat nomor tanpa tanda baca (tanpa spasi) atau gunakan tombol kamera untuk
                            deteksi dari gambar.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="submit"
                            disabled={loading || !nopol.trim()}
                            className="flex-1 py-3 bg-gradient-to-r from-cyan-600 to-indigo-700 hover:from-cyan-500 hover:to-indigo-600 disabled:from-zinc-700 disabled:to-zinc-600 text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    Checking...
                                </>
                            ) : (
                                <>
                                    <Search className="h-5 w-5" />
                                    Check Vehicle
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
                        <div>
                            <h4 className="font-medium text-red-400">Error</h4>
                            <p className="text-sm text-red-300 mt-1">{error}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Results */}
            {result && (
                <div className="space-y-6">
                    {/* Search Info */}
                    <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                            <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                            <div className="flex-1">
                                <h4 className="font-medium text-emerald-400">Search Completed</h4>
                                <div className="flex flex-wrap items-center gap-4 text-sm text-emerald-300 mt-1">
                  <span>
                    Nopol:{" "}
                      {vehicleInfo.nopol ||
                          result?.result?.PlatNomor ||
                          result?.nopol}
                  </span>
                                    <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                                        {formatJakarta(result.timestamp)} {TZ_LABEL}
                  </span>
                                    <span>Response time: {result.responseTime}ms</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Vehicle Information */}
                    {hasVehicleInfo && (
                        <div className="bg-zinc-900/70 backdrop-blur-xl rounded-xl border border-zinc-700/50 overflow-hidden">
                            <div className="px-6 py-4 border-b border-zinc-700/50 flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold text-white">Informasi Kendaraan</h3>
                                    <p className="text-sm text-zinc-400">
                                        Detailed information for{" "}
                                        {vehicleInfo.nopol || result?.result?.PlatNomor || result?.nopol}
                                    </p>
                                </div>

                                {/* Copy and Share buttons */}
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleCopyToClipboard}
                                        className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg transition-colors text-sm"
                                        title="Copy to clipboard"
                                    >
                                        {copied ? (
                                            <>
                                                <Check className="h-4 w-4 text-green-400" />
                                                <span className="text-green-400">Copied!</span>
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="h-4 w-4" />
                                                <span>Copy</span>
                                            </>
                                        )}
                                    </button>

                                    <button
                                        onClick={handleShare}
                                        className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-cyan-600 to-indigo-700 hover:from-cyan-500 hover:to-indigo-600 text-white rounded-lg transition-colors text-sm"
                                        title="Share result"
                                    >
                                        <Share2 className="h-4 w-4" />
                                        <span>Share</span>
                                    </button>
                                </div>
                            </div>

                            <div className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {vehicleInfo.nopol && (
                                        <div className="flex items-center gap-3 p-4 bg-zinc-800/50 rounded-lg">
                                            <div className="h-10 w-10 rounded-lg bg-cyan-600/20 flex items-center justify-center">
                                                <Hash className="h-5 w-5 text-cyan-400" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-zinc-400">Plat Nomor</p>
                                                <p className="font-semibold text-white">{vehicleInfo.nopol}</p>
                                            </div>
                                        </div>
                                    )}

                                    {vehicleInfo.noka && (
                                        <div className="flex items-center gap-3 p-4 bg-zinc-800/50 rounded-lg">
                                            <div className="h-10 w-10 rounded-lg bg-blue-600/20 flex items-center justify-center">
                                                <Settings className="h-5 w-5 text-blue-400" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-zinc-400">Noka</p>
                                                <p className="font-semibold text-white">{vehicleInfo.noka}</p>
                                            </div>
                                        </div>
                                    )}

                                    {vehicleInfo.nosin && (
                                        <div className="flex items-center gap-3 p-4 bg-zinc-800/50 rounded-lg">
                                            <div className="h-10 w-10 rounded-lg bg-purple-600/20 flex items-center justify-center">
                                                <Hash className="h-5 w-5 text-purple-400" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-zinc-400">Nosin</p>
                                                <p className="font-semibold text-white">{vehicleInfo.nosin}</p>
                                            </div>
                                        </div>
                                    )}

                                    {vehicleInfo.jenis && (
                                        <div className="flex items-center gap-3 p-4 bg-zinc-800/50 rounded-lg">
                                            <div className="h-10 w-10 rounded-lg bg-green-600/20 flex items-center justify-center">
                                                <Car className="h-5 w-5 text-green-400" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-zinc-400">Jenis</p>
                                                <p className="font-semibold text-white">{vehicleInfo.jenis}</p>
                                            </div>
                                        </div>
                                    )}

                                    {vehicleInfo.tahun && (
                                        <div className="flex items-center gap-3 p-4 bg-zinc-800/50 rounded-lg">
                                            <div className="h-10 w-10 rounded-lg bg-orange-600/20 flex items-center justify-center">
                                                <Calendar className="h-5 w-5 text-orange-400" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-zinc-400">Tahun</p>
                                                <p className="font-semibold text-white">{vehicleInfo.tahun}</p>
                                            </div>
                                        </div>
                                    )}

                                    {vehicleInfo.warna && (
                                        <div className="flex items-center gap-3 p-4 bg-zinc-800/50 rounded-lg">
                                            <div className="h-10 w-10 rounded-lg bg-pink-600/20 flex items-center justify-center">
                                                <Palette className="h-5 w-5 text-pink-400" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-zinc-400">Warna</p>
                                                <p className="font-semibold text-white">{vehicleInfo.warna}</p>
                                            </div>
                                        </div>
                                    )}

                                    {vehicleInfo.nama && (
                                        <div className="flex items-center gap-3 p-4 bg-zinc-800/50 rounded-lg col-span-full">
                                            <div className="h-10 w-10 rounded-lg bg-indigo-600/20 flex items-center justify-center">
                                                <User className="h-5 w-5 text-indigo-400" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-zinc-400">Pemilik</p>
                                                <p className="font-semibold text-white">{vehicleInfo.nama}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Fallback notice if nothing parsable */}
                    {!hasVehicleInfo && (
                        <div className="bg-amber-900/20 border border-amber-500/30 rounded-xl p-4">
                            <div className="flex items-center gap-3">
                                <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0" />
                                <div>
                                    <h4 className="font-medium text-amber-400">No Data Found</h4>
                                    <p className="text-sm text-amber-300 mt-1">
                                        Vehicle information not available or unrecognized format returned.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ======== VISION MODAL (kamera / upload) ======== */}
            {showVision && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/60"
                        onClick={visionLoading ? undefined : closeVision}
                    />
                    <div className="relative w-full max-w-lg mx-auto bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700">
                            <h3 className="text-white font-semibold text-lg">Scan dari Gambar/Kamera</h3>
                            <button
                                onClick={closeVision}
                                disabled={visionLoading}
                                className="p-2 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-50"
                                title="Close"
                            >
                                <XIcon className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-4 space-y-4">
                            {/* Target selector */}
                            <div className="flex items-center gap-3">
                                <span className="text-sm text-zinc-300">Target:</span>
                                <div className="flex gap-2">
                                    {["nopol", "noka", "nosin"].map((t) => (
                                        <button
                                            key={t}
                                            onClick={() => setVisionTarget(t)}
                                            className={`px-3 py-1 rounded-md text-sm border ${
                                                visionTarget === t
                                                    ? "bg-cyan-600 text-white border-cyan-500"
                                                    : "bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700"
                                            }`}
                                            disabled={visionLoading}
                                        >
                                            {t.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Pickers */}
                            <div className="flex flex-wrap items-center gap-2">
                                <input
                                    ref={cameraInputRef}
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    className="hidden"
                                    onChange={(e) => onPickFile(e.target.files?.[0])}
                                />
                                <input
                                    ref={galleryInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => onPickFile(e.target.files?.[0])}
                                />
                                <button
                                    type="button"
                                    onClick={() => cameraInputRef.current?.click()}
                                    disabled={visionLoading}
                                    className="flex items-center gap-2 px-3 py-2 rounded-md bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-sm"
                                >
                                    <Camera className="h-4 w-4" />
                                    Buka Kamera
                                </button>
                                <button
                                    type="button"
                                    onClick={() => galleryInputRef.current?.click()}
                                    disabled={visionLoading}
                                    className="flex items-center gap-2 px-3 py-2 rounded-md bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-sm"
                                >
                                    <ImageIcon className="h-4 w-4" />
                                    Upload Gambar
                                </button>

                                {visionFile && !visionLoading && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setVisionFile(null);
                                            setVisionPreview(null);
                                        }}
                                        className="ml-auto px-3 py-2 rounded-md bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-sm"
                                    >
                                        Hapus Pilihan
                                    </button>
                                )}
                            </div>

                            {/* Preview */}
                            {visionPreview && (
                                <div className="rounded-lg overflow-hidden border border-zinc-700">
                                    <img
                                        src={visionPreview}
                                        alt="preview"
                                        className="max-h-80 w-full object-contain bg-zinc-950"
                                    />
                                </div>
                            )}

                            {/* Error */}
                            {visionError && (
                                <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3 text-sm text-red-300">
                                    {visionError}
                                </div>
                            )}
                        </div>

                        <div className="px-4 py-3 border-t border-zinc-700 flex items-center justify-end gap-2">
                            <button
                                onClick={closeVision}
                                disabled={visionLoading}
                                className="px-4 py-2 rounded-md bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-sm disabled:opacity-50"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleVisionSubmit}
                                disabled={visionLoading || !visionFile}
                                className="px-4 py-2 rounded-md bg-gradient-to-r from-cyan-600 to-indigo-700 hover:from-cyan-500 hover:to-indigo-600 text-white text-sm flex items-center gap-2 disabled:opacity-50"
                            >
                                {visionLoading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Mengirim...
                                    </>
                                ) : (
                                    <>
                                        <Search className="h-4 w-4" />
                                        Analisa Gambar
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


