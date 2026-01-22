import { useEffect, useMemo, useState } from "react";
import axios from "../config/axios";
import Cookies from "js-cookie";
import {
    History,
    Search,
    Loader2,
    Clock,
    Eye,
    ListOrdered,
    Car,
    Hash,
    Settings,
    Calendar,
    Palette,
    User,
    Copy,
    Share2,
    Check,
    ChevronLeft,
    ChevronRight,
    X as XIcon,
    AlertTriangle,
} from "lucide-react";

const TZ = "Asia/Jakarta";
const TZ_LABEL = "WIB";

// === Helpers (consider extract to shared utils) ===
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

function parseOldReplyText(replyText) {
    if (!replyText || typeof replyText !== "string") return {};
    const lines = replyText
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
    const getVal = (prefix) => {
        const row = lines.find((l) => l.toLowerCase().includes(prefix));
        return row ? row.split(":")[1]?.trim().replace(/\*/g, "") : undefined;
    };
    const info = {
        nopol: getVal("nopol"),
        noka: getVal("noka"),
        nosin: getVal("nosin"),
        jenis: getVal("jenis"),
        tahun: getVal("tahun"),
        warna: getVal("warna"),
        nama: getVal("nama"),
    };
    Object.keys(info).forEach((k) => !info[k] && delete info[k]);
    return info;
}

function parseNewStructured(resultObj) {
    if (!resultObj || typeof resultObj !== "object") return {};
    const jenisParts = [
        resultObj.JenisKendaraan,
        resultObj.Merk,
        resultObj.Type,
    ].filter(Boolean);
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
    // Some backends may send top-level fields too
    if (dataContainer && typeof dataContainer === "object") {
        const parsedTop = parseNewStructured(dataContainer);
        if (Object.keys(parsedTop).length > 0) return parsedTop;
    }
    return {};
}

function classNames(...arr) {
    return arr.filter(Boolean).join(" ");
}

export default function RiwayatCek() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [pagination, setPagination] = useState(null);
    const [rawLogs, setRawLogs] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");

    // UI state for modals
    const [openAccessTimesFor, setOpenAccessTimesFor] = useState(null); // nopol string
    const [openDetailFor, setOpenDetailFor] = useState(null); // { nopol, logIndex }
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        let ignore = false;
        async function fetchLogs() {
            setLoading(true);
            setError(null);
            try {
                const { data } = await axios.get("/api/cek-logs/my-logs", {
                    params: { page, limit },
                });
                if (ignore) return;
                setRawLogs(data.logs || []);
                setPagination(data.pagination || null);
            } catch (err) {
                console.error("Failed fetching logs:", err);
                if (err.response?.status === 401 || err.response?.status === 403) {
                    Cookies.remove("tenant_access_token");
                    Cookies.remove("tenant_refresh_token");
                    Cookies.remove("device_id");
                    window.location.reload();
                    return;
                }
                setError(
                    err.response?.data?.message || "Gagal memuat riwayat cek. Coba lagi."
                );
            } finally {
                if (!ignore) setLoading(false);
            }
        }
        fetchLogs();
        return () => {
            ignore = true;
        };
    }, [page, limit]);

    // Group logs by nopol
    const grouped = useMemo(() => {
        const map = new Map();
        for (const log of rawLogs) {
            const key = (log.nopol || "-").toUpperCase();
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(log);
        }
        // Sort each group by timestamp desc
        for (const [, arr] of map) {
            arr.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        }
        return map;
    }, [rawLogs]);

    // Flatten groups into an array for rendering
    const rows = useMemo(() => {
        const list = [];
        for (const [nopol, logs] of grouped) {
            const last = logs[0];
            list.push({
                nopol,
                count: logs.length,
                lastTime: last?.timestamp,
                lastSuccess: !!last?.success,
            });
        }
        const filtered = searchTerm
            ? list.filter((r) => r.nopol.includes(searchTerm.toUpperCase()))
            : list;
        filtered.sort((a, b) => new Date(b.lastTime) - new Date(a.lastTime));
        return filtered;
    }, [grouped, searchTerm]);

    // Helpers for detail modal
    const currentLogsForDetail = useMemo(() => {
        if (!openDetailFor) return [];
        return grouped.get(openDetailFor.nopol) || [];
    }, [openDetailFor, grouped]);

    const selectedLog = useMemo(() => {
        if (!openDetailFor) return null;
        const arr = currentLogsForDetail;
        if (!arr.length) return null;
        const idx = openDetailFor.logIndex ?? 0; // default latest
        return arr[idx];
    }, [currentLogsForDetail, openDetailFor]);

    const vehicleInfo = selectedLog ? getVehicleInfoUnified(selectedLog) : {};
    const hasVehicleInfo = selectedLog && Object.keys(vehicleInfo).length > 0;

    // Copy/share utilities
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
        text += `\n📜 Source: History (no new usage)\n`;
        text += `\n🔍 Powered by ONE STOP CHECK APPS`;
        return text;
    };

    const handleCopyToClipboard = async () => {
        if (!selectedLog || !hasVehicleInfo) return;
        const textToShare = formatResultText(vehicleInfo, selectedLog.timestamp);
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
        if (!selectedLog || !hasVehicleInfo) return;
        const textToShare = formatResultText(vehicleInfo, selectedLog.timestamp);
        const title = `Vehicle Check Result - ${vehicleInfo.nopol || "Result"}`;
        if (navigator.share) {
            try {
                await navigator.share({ title, text: textToShare });
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

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-2 flex items-center justify-center gap-2">
                    <History className="h-6 w-6" /> Riwayat Cek Nopol
                </h2>
                <p className="text-zinc-400">
                    Lihat riwayat pengecekan Anda. Mengakses dari riwayat tidak akan
                    mengurangi usage.
                </p>
            </div>

            {/* Toolbar */}
            <div className="bg-zinc-900/70 backdrop-blur-xl rounded-xl border border-zinc-700/50 p-4 flex flex-col md:flex-row md:items-center gap-3">
                <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                        <Search className="h-5 w-5 text-zinc-500" />
                    </div>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Cari NOPOL..."
                        className="w-full pl-10 pr-4 py-3 bg-zinc-950/70 border border-zinc-700 text-zinc-100 placeholder-zinc-600 rounded-lg outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-sm text-zinc-400">Per halaman</label>
                    <select
                        value={limit}
                        onChange={(e) => {
                            setPage(1);
                            setLimit(Number(e.target.value));
                        }}
                        className="bg-zinc-950/70 border border-zinc-700 text-zinc-100 rounded-lg px-3 py-2"
                    >
                        {[10, 20, 50].map((n) => (
                            <option key={n} value={n}>
                                {n}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Error */}
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

            {/* List */}
            <HScroll minWidth={920}>
                <div className="bg-zinc-900/70 backdrop-blur-xl rounded-xl border border-zinc-700/50">
                    <div className="px-6 py-4 border-b border-zinc-700/50 flex items-center justify-between">
                        <div className="text-white font-semibold">Daftar NOPOL</div>
                        {loading && (
                            <div className="flex items-center gap-2 text-zinc-400 text-sm shrink-0">
                                <Loader2 className="h-4 w-4 animate-spin" /> Loading...
                            </div>
                        )}
                    </div>

                    <div className="divide-y divide-zinc-800">
                        {rows.length === 0 && !loading && (
                            <div className="p-6 text-zinc-400">Tidak ada data.</div>
                        )}
                        {rows.map((r) => (
                            <div
                                key={r.nopol}
                                className="px-6 py-4 flex items-center gap-4 justify-between"
                            >
                                <div className="flex items-center gap-4 min-w-0">
                                    <div className="h-10 w-10 rounded-lg bg-cyan-600/20 flex items-center justify-center shrink-0">
                                        <Car className="h-5 w-5 text-cyan-400" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-white font-semibold truncate">{r.nopol}</div>
                                        <div className="text-xs text-zinc-400 flex items-center gap-2 whitespace-nowrap">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Terakhir: {formatJakarta(r.lastTime)} {TZ_LABEL}
                </span>
                                            <span>•</span>
                                            <span>{r.count}x diakses</span>
                                            {r.lastSuccess ? (
                                                <span className="ml-2 text-emerald-400">(success)</span>
                                            ) : (
                                                <span className="ml-2 text-amber-400">(failed)</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        onClick={() => setOpenAccessTimesFor(r.nopol)}
                                        className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-sm flex items-center gap-2"
                                    >
                                        <ListOrdered className="h-4 w-4" /> Waktu Akses
                                    </button>
                                    <button
                                        onClick={() => setOpenDetailFor({ nopol: r.nopol, logIndex: 0 })}
                                        className="px-3 py-2 bg-gradient-to-r from-cyan-600 to-indigo-700 hover:from-cyan-500 hover:to-indigo-600 text-white rounded-lg text-sm flex items-center gap-2"
                                    >
                                        <Eye className="h-4 w-4" /> Lihat Data
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Pagination */}
                    {pagination && (
                        <div className="px-6 py-4 border-t border-zinc-700/50 flex items-center justify-between text-sm text-zinc-300">
                            <div className="whitespace-nowrap">
                                Halaman {pagination.page} dari {pagination.pages} • Total {pagination.total}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    disabled={page <= 1}
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    className={classNames(
                                        "px-3 py-2 rounded-lg border border-zinc-700 flex items-center gap-1",
                                        page <= 1 ? "opacity-50 cursor-not-allowed" : "hover:bg-zinc-800"
                                    )}
                                >
                                    <ChevronLeft className="h-4 w-4" /> Prev
                                </button>
                                <button
                                    disabled={pagination.pages && page >= pagination.pages}
                                    onClick={() => setPage((p) => p + 1)}
                                    className={classNames(
                                        "px-3 py-2 rounded-lg border border-zinc-700 flex items-center gap-1",
                                        pagination.pages && page >= pagination.pages
                                            ? "opacity-50 cursor-not-allowed"
                                            : "hover:bg-zinc-800"
                                    )}
                                >
                                    Next <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </HScroll>



            {/* Modal: Access Times */}
            {openAccessTimesFor && (
                <Modal onClose={() => setOpenAccessTimesFor(null)} title={`Waktu Akses — ${openAccessTimesFor}`}>
                    <AccessTimesList logs={grouped.get(openAccessTimesFor) || []} />
                </Modal>
            )}

            {/* Modal: Detail (vehicle info) */}
            {openDetailFor && (
                <Modal onClose={() => setOpenDetailFor(null)} title={`Detail Nopol — ${openDetailFor.nopol}`}>
                    {/* Selector for which record */}
                    <div className="mb-4 flex flex-col md:flex-row md:items-center gap-2">
                        <label className="text-sm text-zinc-400">Pilih riwayat:</label>
                        <select
                            className="bg-zinc-950/70 border border-zinc-700 text-zinc-100 rounded-lg px-3 py-2"
                            value={openDetailFor.logIndex ?? 0}
                            onChange={(e) =>
                                setOpenDetailFor((prev) => ({ ...prev, logIndex: Number(e.target.value) }))
                            }
                        >
                            {currentLogsForDetail.map((l, idx) => (
                                <option key={l.id} value={idx}>
                                    #{idx + 1} • {formatJakarta(l.timestamp)} {TZ_LABEL} • {l.success ? "success" : "failed"}
                                </option>
                            ))}
                        </select>
                    </div>

                    {!selectedLog && <div className="text-zinc-400">Data tidak tersedia.</div>}

                    {selectedLog && (
                        <div className="space-y-4">
                            <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-xl p-4">
                                <div className="flex items-center gap-3">
                                    <Check className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                                    <div className="flex-1">
                                        <h4 className="font-medium text-emerald-400">Dari Riwayat</h4>
                                        <div className="flex flex-wrap items-center gap-4 text-sm text-emerald-300 mt-1">
                                            <span>Nopol: {selectedLog.nopol}</span>
                                            <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {formatJakarta(selectedLog.timestamp)} {TZ_LABEL}
                      </span>
                                            <span>Response time: {selectedLog.responseTime}ms</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {hasVehicleInfo ? (
                                <div className="bg-zinc-900/70 backdrop-blur-xl rounded-xl border border-zinc-700/50 overflow-hidden">
                                    <div className="px-6 py-4 border-b border-zinc-700/50 flex items-center justify-between">
                                        <div>
                                            <h3 className="text-lg font-semibold text-white">Informasi Kendaraan</h3>
                                            <p className="text-sm text-zinc-400">
                                                Detailed information for {vehicleInfo.nopol || selectedLog.nopol}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={handleCopyToClipboard}
                                                className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg transition-colors text-sm"
                                                title="Copy to clipboard"
                                            >
                                                <Copy className="h-4 w-4" /> {copied ? "Copied!" : "Copy"}
                                            </button>
                                            <button
                                                onClick={handleShare}
                                                className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-cyan-600 to-indigo-700 hover:from-cyan-500 hover:to-indigo-600 text-white rounded-lg transition-colors text-sm"
                                                title="Share result"
                                            >
                                                <Share2 className="h-4 w-4" /> Share
                                            </button>
                                        </div>
                                    </div>
                                    <div className="p-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {vehicleInfo.nopol && (
                                                <InfoItem icon={<Hash className="h-5 w-5 text-cyan-400" />} title="Plat Nomor" value={vehicleInfo.nopol} bg="bg-cyan-600/20" />
                                            )}
                                            {vehicleInfo.noka && (
                                                <InfoItem icon={<Settings className="h-5 w-5 text-blue-400" />} title="Noka" value={vehicleInfo.noka} bg="bg-blue-600/20" />
                                            )}
                                            {vehicleInfo.nosin && (
                                                <InfoItem icon={<Hash className="h-5 w-5 text-purple-400" />} title="Nosin" value={vehicleInfo.nosin} bg="bg-purple-600/20" />
                                            )}
                                            {vehicleInfo.jenis && (
                                                <InfoItem icon={<Car className="h-5 w-5 text-green-400" />} title="Jenis" value={vehicleInfo.jenis} bg="bg-green-600/20" />
                                            )}
                                            {vehicleInfo.tahun && (
                                                <InfoItem icon={<Calendar className="h-5 w-5 text-orange-400" />} title="Tahun" value={vehicleInfo.tahun} bg="bg-orange-600/20" />
                                            )}
                                            {vehicleInfo.warna && (
                                                <InfoItem icon={<Palette className="h-5 w-5 text-pink-400" />} title="Warna" value={vehicleInfo.warna} bg="bg-pink-600/20" />
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
                            ) : (
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
                </Modal>
            )}
        </div>
    );
}

function InfoItem({ icon, title, value, bg }) {
    return (
        <div className="flex items-center gap-3 p-4 bg-zinc-800/50 rounded-lg">
            <div className={classNames("h-10 w-10 rounded-lg flex items-center justify-center", bg)}>
                {icon}
            </div>
            <div>
                <p className="text-sm text-zinc-400">{title}</p>
                <p className="font-semibold text-white">{value}</p>
            </div>
        </div>
    );
}

function AccessTimesList({ logs }) {
    if (!logs?.length) return <div className="text-zinc-400">Tidak ada data.</div>;
    return (
        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {logs.map((l) => (
                <div
                    key={l.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-zinc-700/50 bg-zinc-900/60"
                >
                    <div className="text-sm text-zinc-300 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-zinc-400" />
                        <span>
              {formatJakarta(l.timestamp)} {TZ_LABEL}
            </span>
                    </div>
                    <div className={classNames(
                        "text-xs px-2 py-1 rounded-md",
                        l.success ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"
                    )}>
                        {l.success ? "success" : "failed"}
                    </div>
                </div>
            ))}
        </div>
    );
}


function Modal({ title, children, onClose }) {
    return (
        <div className="fixed inset-0 z-50">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70" onClick={onClose} />

            {/* Wrapper: give breathing space on phones */}
            <div className="absolute inset-0 flex items-center justify-center p-4 md:p-6">
                <div
                    className="relative w-full max-w-3xl bg-zinc-950 border border-zinc-700 rounded-2xl shadow-xl overflow-hidden mx-auto"
                    style={{ maxHeight: "90vh" }}
                >
                    {/* Header (sticks on top when content scrolls) */}
                    <div className="px-6 py-4 border-b border-zinc-700/50 flex items-center justify-between sticky top-0 bg-zinc-950/95 backdrop-blur">
                        <h3 className="text-white font-semibold truncate pr-4">{title}</h3>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                        >
                            <XIcon className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Scrollable content area */}
                    <div className="p-6 overflow-y-auto" style={{ maxHeight: "calc(90vh - 64px)" }}>
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}

function HScroll({ children, minWidth = 880, className = "" }) {
    const mw = typeof minWidth === "number" ? `${minWidth}px` : minWidth;
    return (
        <div className={`w-full ${className}`}>
            <div className="overflow-x-auto">
                <div
                    className="inline-block min-w-full align-top"
                    style={{ minWidth: mw }}
                >
                    {children}
                </div>
            </div>
        </div>
    );
}

