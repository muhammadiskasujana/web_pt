import { useEffect, useMemo, useState } from "react";
import axios from "../config/axios";
import {
    Gift,
    RefreshCcw,
    Share2,
    Copy,
    LinkIcon,
    Users,
    CheckCircle2,
    AlertCircle,
} from "lucide-react";

export default function KodeUndangan() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState(null);

    const fetchReferral = async () => {
        setLoading(true);
        setErr(null);
        try {
            const { data } = await axios.get("/api/users/my-referral");
            setData(data);
        } catch (e) {
            console.error(e);
            setErr(
                e?.response?.data?.error ||
                e?.response?.data?.message ||
                "Gagal memuat data referral"
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReferral();
    }, []);

    const code = data?.referral?.code || "";
    const refBonus = data?.referral?.per_referrer_bonus ?? 0;
    const inviteUrl = useMemo(() => {
        const base = window.location.origin;
        return `${base}/register?ref=${encodeURIComponent(code)}`;
    }, [code]);

    const inviteText = useMemo(() => {
        return (
            `Hai! Coba daftar One Stop Check Apps pakai kode undangan aku: ${code}\n` +
            `Kamu dapat bonus koin saat aktivasi pertama.\n` +
            `Daftar di sini: ${inviteUrl}`
        );
    }, [code, inviteUrl]);

    const handleCopy = async (text, toastMsg = "Disalin!") => {
        try {
            await navigator.clipboard.writeText(text);
            alert(toastMsg);
        } catch {
            // fallback
            const ta = document.createElement("textarea");
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand("copy");
            document.body.removeChild(ta);
            alert(toastMsg);
        }
    };

    const handleShare = async () => {
        try {
            if (navigator.share) {
                await navigator.share({
                    title: "Kode Undangan",
                    text: inviteText,
                    url: inviteUrl,
                });
            } else {
                await handleCopy(inviteText, "Teks undangan disalin");
            }
        } catch {
            // user canceled — no op
        }
    };

    const usedBy = data?.used_by || [];
    const pendingBy = data?.pending_by || [];
    const summary = data?.summary || {
        used_count: 0,
        total_coins_earned: 0,
        pending_count: 0,
        pending_estimated_coins: 0,
    };

    return (
        <div className="min-h-screen bg-[#0b0c10] px-4 py-10">
            <div className="max-w-5xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-start sm:items-center justify-between gap-4">
                    <div>
                        <div className="inline-flex items-center gap-2 text-xs tracking-widest uppercase text-zinc-400">
                            <Gift className="h-4 w-4" />
                            Kode Undangan
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-white mt-1">
                            Program Referral
                        </h1>
                        <p className="text-zinc-400">
                            Bagikan kode undanganmu. Dapatkan koin setiap ada teman yang aktivasi.
                        </p>
                    </div>
                    <button
                        onClick={fetchReferral}
                        disabled={loading}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white hover:bg-zinc-700 disabled:opacity-50"
                    >
                        <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                        Refresh
                    </button>
                </div>

                {/* Error / Loading */}
                {loading ? (
                    <div className="bg-zinc-900/70 border border-zinc-700/50 rounded-xl p-6 text-zinc-300">
                        Memuat…
                    </div>
                ) : err ? (
                    <div className="bg-red-900/20 border border-red-700/40 rounded-xl p-6 text-red-300">
                        {err}
                    </div>
                ) : (
                    <>
                        {/* Kode & Invite box */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 bg-zinc-900/70 border border-zinc-700/50 rounded-xl p-5">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                    <div>
                                        <p className="text-zinc-400 text-sm">Kode Referral Kamu</p>
                                        <div className="mt-1 flex items-center gap-2">
                      <span className="text-2xl font-bold tracking-widest text-white">
                        {code || "—"}
                      </span>
                                            {code && (
                                                <button
                                                    onClick={() => handleCopy(code, "Kode disalin")}
                                                    className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                                                >
                                                    <Copy className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleCopy(inviteText, "Teks undangan disalin")}
                                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white hover:bg-zinc-700"
                                        >
                                            <Copy className="h-4 w-4" />
                                            Salin Undangan
                                        </button>
                                        <button
                                            onClick={handleShare}
                                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 text-white hover:bg-cyan-500"
                                        >
                                            <Share2 className="h-4 w-4" />
                                            Share
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-5">
                                    <p className="text-zinc-400 text-sm mb-2">Link Pendaftaran</p>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 truncate px-3 py-2 rounded-lg bg-zinc-950/60 border border-zinc-700 text-zinc-200">
                                            <span className="truncate inline-block align-middle">{inviteUrl}</span>
                                        </div>
                                        <button
                                            onClick={() => handleCopy(inviteUrl, "Link disalin")}
                                            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                                            title="Copy Link"
                                        >
                                            <LinkIcon className="h-4 w-4" />
                                        </button>
                                    </div>
                                    <p className="text-[11px] text-zinc-500 mt-2">
                                        Link ini akan otomatis mengisi kode referral di halaman register.
                                    </p>
                                </div>
                            </div>

                            {/* Summary cards */}
                            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-1 gap-4">
                                <CardStat
                                    title="Dipakai"
                                    value={summary.used_count}
                                    icon={<Users className="h-5 w-5 text-white" />}
                                />
                                <CardStat
                                    title="Koin Didapat"
                                    value={summary.total_coins_earned}
                                    icon={<CheckCircle2 className="h-5 w-5 text-white" />}
                                />
                                <CardStat
                                    title="Pending"
                                    value={summary.pending_count}
                                    icon={<AlertCircle className="h-5 w-5 text-white" />}
                                />
                                <CardStat
                                    title="Estimasi Pending"
                                    value={summary.pending_estimated_coins}
                                    sub={`~ ${refBonus} / orang`}
                                    icon={<Gift className="h-5 w-5 text-white" />}
                                />
                            </div>
                        </div>

                        {/* Used by */}
                        <div className="bg-zinc-900/70 border border-zinc-700/50 rounded-xl overflow-hidden">
                            <div className="px-5 py-4 border-b border-zinc-700/50 flex items-center justify-between">
                                <h3 className="text-white font-semibold">
                                    Sudah Redeem ({usedBy.length})
                                </h3>
                            </div>
                            {usedBy.length === 0 ? (
                                <div className="p-5 text-sm text-zinc-400">Belum ada yang redeem.</div>
                            ) : (
                                <ul className="divide-y divide-zinc-800">
                                    {usedBy.map((u, i) => (
                                        <li key={i} className="px-5 py-3 text-sm">
                                            <div className="flex items-center justify-between gap-3">
                                                <div>
                                                    <div className="text-white font-medium">
                                                        {u.name || "-"}
                                                    </div>
                                                    <div className="text-zinc-400">{u.email || "-"}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-zinc-300">
                                                        +{u.coins_awarded_to_referrer} coins
                                                    </div>
                                                    {u.redeemed_at && (
                                                        <div className="text-[12px] text-zinc-500">
                                                            {new Date(u.redeemed_at).toLocaleString("id-ID", {
                                                                hour12: false,
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        {/* Pending by */}
                        <div className="bg-zinc-900/70 border border-zinc-700/50 rounded-xl overflow-hidden">
                            <div className="px-5 py-4 border-b border-zinc-700/50 flex items-center justify-between">
                                <h3 className="text-white font-semibold">
                                    Pending (belum dapat bonus) — {pendingBy.length}
                                </h3>
                                <div className="text-sm text-zinc-400">
                                    Estimasi total: {summary.pending_estimated_coins} koin
                                </div>
                            </div>
                            {pendingBy.length === 0 ? (
                                <div className="p-5 text-sm text-zinc-400">
                                    Tidak ada pending saat ini.
                                </div>
                            ) : (
                                <ul className="divide-y divide-zinc-800">
                                    {pendingBy.map((u, i) => (
                                        <li key={i} className="px-5 py-3 text-sm">
                                            <div className="flex items-center justify-between gap-3">
                                                <div>
                                                    <div className="text-white font-medium">
                                                        {u.name || "-"}
                                                    </div>
                                                    <div className="text-zinc-400">{u.email || "-"}</div>
                                                </div>
                                                <div className="text-right text-zinc-300">
                                                    ~{refBonus} coins
                                                    {u.registered_at && (
                                                        <div className="text-[12px] text-zinc-500">
                                                            daftar:{" "}
                                                            {new Date(u.registered_at).toLocaleString("id-ID", {
                                                                hour12: false,
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

function CardStat({ title, value, sub, icon }) {
    return (
        <div className="bg-zinc-900/70 border border-zinc-700/50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-cyan-600 to-indigo-700 flex items-center justify-center">
                    {icon}
                </div>
                <div className="text-right">
                    <p className="text-xs text-zinc-400">{title}</p>
                    <p className="text-xl font-semibold text-white">{value ?? 0}</p>
                    {sub && <p className="text-[11px] text-zinc-500">{sub}</p>}
                </div>
            </div>
        </div>
    );
}
