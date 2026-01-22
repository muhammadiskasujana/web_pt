import { useEffect, useState } from "react";
import axios from "../config/axios";
import Cookies from "js-cookie";
import {
    Server,
    Network,
    CheckCircle2,
    AlertTriangle,
    Loader2,
    Shield,
    RefreshCw,
    Info,
} from "lucide-react";

const PROVIDERS = [
    {
        id: "legacy",
        title: "API SAMSAT",
        urlLabel: "Default: http://103.195.188.96/commands/esamsat.php",
        badge: "Stabil",
        desc: "Stabil Langsung SAMSAT",
        icon: Server,
    },
    {
        id: "vscode3",
        title: "TELEGRAM",
        urlLabel: "Default: http://vscode3.huntersmithnusantara.id:6699/send",
        badge: "Cepat",
        desc: "Respon lebih cepat tapi tidak stabil",
        icon: Network,
    },
];

export default function ProviderSettings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [active, setActive] = useState(null);
    const [selected, setSelected] = useState(null);
    const [error, setError] = useState(null);
    const [msg, setMsg] = useState(null);

    const fetchProvider = async (withToast = false) => {
        setLoading(true);
        setError(null);
        if (withToast) setMsg(null);
        try {
            const { data } = await axios.get("/api/cek-logs/provider");
            setActive(data?.provider || "legacy");
            setSelected(data?.provider || "legacy");
        } catch (err) {
            if (err.response?.status === 401 || err.response?.status === 403) {
                Cookies.remove("tenant_access_token");
                Cookies.remove("tenant_refresh_token");
                Cookies.remove("device_id");
                window.location.reload();
                return;
            }
            setError(err.response?.data?.error || "Failed to fetch provider");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProvider();
    }, []);

    const save = async () => {
        if (!selected) return;
        if (selected === active) {
            setMsg("Provider sudah aktif.");
            return;
        }
        setSaving(true);
        setError(null);
        setMsg(null);
        try {
            const { data } = await axios.post("/api/cek-logs/provider", {
                provider: selected,
            });
            setActive(data?.provider || selected);
            setMsg("Provider updated successfully.");
        } catch (err) {
            if (err.response?.status === 401 || err.response?.status === 403) {
                Cookies.remove("tenant_access_token");
                Cookies.remove("tenant_refresh_token");
                Cookies.remove("device_id");
                window.location.reload();
                return;
            }
            setError(err.response?.data?.error || "Failed to update provider");
        } finally {
            setSaving(false);
        }
    };

    const onRefresh = () => fetchProvider(true);

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-2">Pengaturan API Provider</h2>
                <p className="text-zinc-400">
                    Pilih sumber API untuk pemeriksaan kendaraan. Perubahan disimpan persist di server (JSON).
                </p>
            </div>

            {/* Status bar */}
            <div className="bg-zinc-900/70 backdrop-blur-xl rounded-xl border border-zinc-700/50 p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-zinc-800/40">
                            <Shield className="h-5 w-5 text-zinc-300" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-white">Provider Aktif</p>
                            <p className="text-xs text-zinc-400">
                                {loading ? "Loading..." : active ? active.toUpperCase() : "-"}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onRefresh}
                        disabled={loading}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-sm disabled:opacity-50"
                        title="Refresh status"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Alerts */}
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
            {msg && (
                <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                        <div>
                            <h4 className="font-medium text-emerald-400">Success</h4>
                            <p className="text-sm text-emerald-300 mt-1">{msg}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Provider cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PROVIDERS.map((p) => {
                    const Icon = p.icon;
                    const selectedStyle =
                        selected === p.id
                            ? "ring-2 ring-cyan-500/60 border-cyan-600/40"
                            : "border-zinc-700/50";
                    return (
                        <button
                            key={p.id}
                            type="button"
                            onClick={() => setSelected(p.id)}
                            disabled={loading || saving}
                            className={`text-left w-full bg-zinc-900/70 backdrop-blur-xl rounded-xl border ${selectedStyle} p-5 transition outline-none hover:border-cyan-600/40 disabled:opacity-50`}
                        >
                            <div className="flex items-start gap-4">
                                <div className="h-12 w-12 rounded-xl bg-zinc-800/50 flex items-center justify-center">
                                    <Icon className="h-6 w-6 text-zinc-200" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-white font-semibold">{p.title}</h3>
                                        <span className="text-xs px-2 py-1 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700">
                      {p.badge}
                    </span>
                                    </div>
                                    <p className="text-sm text-zinc-400 mt-1">{p.desc}</p>
                                    <p className="text-xs text-zinc-500 mt-2">{p.urlLabel}</p>
                                    <div className="mt-3 flex items-center gap-2 text-xs text-zinc-400">
                                        <Info className="h-4 w-4" />
                                        {p.id === "vscode3" ? (
                                            <span>
                        NOT FOUND bila <code className="bg-zinc-800 px-1 rounded">reply</code> adalah{" "}
                                                <code className="bg-zinc-800 px-1 rounded">"-"</code> atau tidak memuat{" "}
                                                <code className="bg-zinc-800 px-1 rounded">"HASIL CEK NOPOL"</code>.
                      </span>
                                        ) : (
                                            <span>Validasi skema hasil ketat. Error/Invalid tidak memotong koin.</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            {/* Radio marker */}
                            <div className="mt-4 flex items-center justify-end">
                <span
                    className={`inline-flex h-5 w-5 items-center justify-center rounded-full border ${
                        selected === p.id
                            ? "border-cyan-500 bg-cyan-600/30"
                            : "border-zinc-600 bg-zinc-800"
                    }`}
                >
                  {selected === p.id ? (
                      <span className="h-2.5 w-2.5 rounded-full bg-cyan-300" />
                  ) : null}
                </span>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Action bar */}
            <div className="flex items-center justify-end gap-2">
                <button
                    onClick={() => setSelected(active)}
                    disabled={loading || saving}
                    className="px-4 py-2 rounded-md bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-sm disabled:opacity-50"
                >
                    Reset
                </button>
                <button
                    onClick={save}
                    disabled={loading || saving || !selected}
                    className="px-4 py-2 rounded-md bg-gradient-to-r from-cyan-600 to-indigo-700 hover:from-cyan-500 hover:to-indigo-600 text-white text-sm inline-flex items-center gap-2 disabled:opacity-50"
                >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    {saving ? "Saving..." : "Simpan Perubahan"}
                </button>
            </div>

            {/* Footnote */}
            <div className="text-xs text-zinc-500 flex items-center gap-2">
                <Info className="h-4 w-4" />
                Perubahan akan disimpan ke file konfigurasi di server sehingga tetap aktif walaupun aplikasi di-restart.
            </div>
        </div>
    );
}
