import { useEffect, useMemo, useState } from "react";
import axios from "../config/axios";
import Cookies from "js-cookie";
import {
    Calendar, RefreshCw, Search, Users, TrendingUp, BarChart3, AlertCircle,
    CheckCircle2, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Info,
    Clock, Mail, X as XIcon, CalendarDays
} from "lucide-react";

const TZ = "Asia/Jakarta";
const TZ_LABEL = "WIB";

const todayYmdJakarta = (d = new Date()) =>
    new Intl.DateTimeFormat("en-CA", {
        timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
    }).format(d);

const formatDateOnlyJakarta = (input) => {
    if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
    return new Intl.DateTimeFormat("id-ID", {
        timeZone: TZ, year: "numeric", month: "long", day: "numeric",
    }).format(new Date(input));
};

export default function AdminUsage() {
    // filters & query state
    const [date, setDate] = useState(() => todayYmdJakarta());
    const [search, setSearch] = useState("");
    const [includeSample, setIncludeSample] = useState(false);

    // NOTE: API debug masih tampil "usage" sebagai sort key untuk usage_today.
    // Tambahkan opsi "balance" dan "checks" agar relevan dengan schema baru.
    const [sortBy, setSortBy] = useState("usage"); // usage|name|balance|checks
    const [order, setOrder] = useState("DESC"); // ASC|DESC

    // pagination
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);

    // data
    const [rows, setRows] = useState([]);
    const [summary, setSummary] = useState(null);
    const [pagination, setPagination] = useState(null);
    const [debug, setDebug] = useState(null);

    // ui
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState(null);

    // modal
    const [openDetailFor, setOpenDetailFor] = useState(null); // { user, stats, sampleLogs? }

    const fetchAllStats = async () => {
        setLoading(true);
        setErr(null);
        try {
            const params = {
                date,
                timezone: TZ,
                page,
                limit,
                sortBy,
                order,
            };
            if (search?.trim()) params.search = search.trim();
            if (includeSample) params.includeSample = true;

            const { data } = await axios.get("/api/cek-logs/all-stats", { params });

            setRows(data.stats || []);
            setSummary(data.summary || null);
            setPagination(data.pagination || null);
            setDebug(data.debug || null);
        } catch (e) {
            console.error(e);
            if (e.response?.status === 401 || e.response?.status === 403) {
                Cookies.remove("tenant_access_token");
                Cookies.remove("tenant_refresh_token");
                Cookies.remove("device_id");
                window.location.reload();
                return;
            }
            setErr(e.response?.data?.message || "Failed to fetch all-stats");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllStats();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [date, page, limit, sortBy, order, includeSample]);

    // sorting handlers
    const onSort = (key) => {
        if (sortBy === key) {
            setOrder((prev) => (prev === "ASC" ? "DESC" : "ASC"));
        } else {
            setSortBy(key);
            setOrder("DESC");
        }
    };

    // derived
    const pageCount = useMemo(() => (pagination ? pagination.pages : 1), [pagination]);
    const canPrev = page > 1;
    const canNext = pagination ? page < pagination.pages : false;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white">Usage Monitor (All Users)</h2>
                    <p className="text-zinc-400">Pantau penggunaan harian semua user ({TZ_LABEL})</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-zinc-400" />
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => {
                                setPage(1);
                                setDate(e.target.value);
                            }}
                            className="px-3 py-2 bg-zinc-800 border border-zinc-700 text-white rounded-lg text-sm focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none"
                        />
                    </div>
                    <button
                        onClick={fetchAllStats}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-zinc-900/70 backdrop-blur-xl rounded-xl border border-zinc-700/50 p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="col-span-2">
                        <label className="block text-xs text-zinc-400 mb-1">Search (name/email)</label>
                        <div className="relative">
                            <Search className="h-4 w-4 text-zinc-400 absolute left-3 top-2.5" />
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && (setPage(1), fetchAllStats())}
                                placeholder="Cari user…"
                                className="w-full pl-9 pr-3 py-2 bg-zinc-800 border border-zinc-700 text-white rounded-lg text-sm focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs text-zinc-400 mb-1">Sort</label>
                        <div className="flex gap-2">
                            <select
                                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 text-white rounded-lg text-sm focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none"
                                value={sortBy}
                                onChange={(e) => {
                                    setSortBy(e.target.value);
                                    setOrder("DESC");
                                }}
                            >
                                {/* server: 'usage' -> usage_today */}
                                <option value="usage">usage (today)</option>
                                <option value="name">name</option>
                                <option value="balance">balance</option>
                                <option value="checks">checks</option>
                            </select>
                            <button
                                onClick={() => setOrder((o) => (o === "ASC" ? "DESC" : "ASC"))}
                                className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg"
                                title={`Order: ${order}`}
                            >
                                {order === "ASC" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>

                    <div className="flex items-end">
                        <label className="inline-flex items-center gap-2 text-sm text-zinc-3 00">
                            <input
                                type="checkbox"
                                className="accent-cyan-500"
                                checked={includeSample}
                                onChange={(e) => {
                                    setPage(1);
                                    setIncludeSample(e.target.checked);
                                }}
                            />
                            Sertakan sample logs
                        </label>
                    </div>
                </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-zinc-900/70 border border-zinc-700/50 rounded-xl p-5">
                    <div className="flex items-center justify-between">
                        <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-cyan-600 to-indigo-700 flex items-center justify-center">
                            <Users className="h-6 w-6 text-white" />
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-zinc-400">Users (page)</p>
                            <p className="text-2xl font-bold text-white">{summary?.users_on_page ?? 0}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-zinc-900/70 border border-zinc-700/50 rounded-xl p-5">
                    <div className="flex items-center justify-between">
                        <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-emerald-600 to-green-700 flex items-center justify-center">
                            <BarChart3 className="h-6 w-6 text-white" />
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-zinc-400">Total Usage (page)</p>
                            <p className="text-2xl font-bold text-white">{summary?.total_usage_on_page ?? 0}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-zinc-900/70 border border-zinc-700/50 rounded-xl p-5">
                    <div className="flex items-center justify-between">
                        <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-yellow-600 to-amber-700 flex items-center justify-center">
                            <TrendingUp className="h-6 w-6 text-white" />
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-zinc-400">Avg Usage (page)</p>
                            <p className="text-2xl font-bold text-white">{summary?.avg_usage_on_page ?? 0}</p>
                            {summary?.cost_per_check != null && (
                                <p className="text-xs text-zinc-400 mt-1">Cost / check: {summary.cost_per_check}</p>
                            )}
                        </div>
                    </div>
                </div>
                <div className="bg-zinc-900/70 border border-zinc-700/50 rounded-xl p-5">
                    <div className="flex items-center justify-between">
                        <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-purple-600 to-pink-700 flex items-center justify-center">
                            <Clock className="h-6 w-6 text-white" />
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-zinc-400">Tanggal</p>
                            <p className="text-lg font-semibold text-white">
                                {formatDateOnlyJakarta(summary?.date || date)} {TZ_LABEL}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-zinc-900/70 backdrop-blur-xl rounded-xl border border-zinc-700/50 overflow-hidden">
                <div className="px-4 py-3 border-b border-zinc-700/50 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-zinc-300">
                        <Info className="h-4 w-4" />
                        <span className="text-sm">
              Total users (matching filter): {summary?.total_users_matching_filter ?? pagination?.total ?? 0}
            </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-zinc-400">Rows</span>
                        <select
                            className="px-2 py-1 bg-zinc-800 border border-zinc-700 text-white rounded-md text-sm"
                            value={limit}
                            onChange={(e) => {
                                setPage(1);
                                setLimit(parseInt(e.target.value, 10));
                            }}
                        >
                            {[10, 20, 50, 100].map((n) => (
                                <option key={n} value={n}>
                                    {n}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead>
                        <tr className="bg-zinc-800/50 text-zinc-300">
                            <Th label="Name" sortKey="name" onSort={onSort} sortBy={sortBy} order={order} />
                            <Th label="Email" />
                            <Th label="Usage Today" sortKey="usage" onSort={onSort} sortBy={sortBy} order={order} right />
                            <Th label="Coin Balance" sortKey="balance" onSort={onSort} sortBy={sortBy} order={order} right />
                            <Th label="Checks Possible" sortKey="checks" onSort={onSort} sortBy={sortBy} order={order} right />
                            <Th label="Coin Expiry" right />
                            <Th label="Days Left" right />
                            <Th label="Actions" right />
                        </tr>
                        </thead>

                        <tbody>
                        {loading ? (
                            [...Array(6)].map((_, i) => (
                                <tr key={i} className="border-t border-zinc-800">
                                    <td colSpan={8} className="p-4">
                                        <div className="h-6 bg-zinc-800/50 animate-pulse rounded" />
                                    </td>
                                </tr>
                            ))
                        ) : err ? (
                            <tr className="border-t border-zinc-800">
                                <td colSpan={8} className="p-6 text-red-400">
                                    <div className="flex items-center gap-2">
                                        <AlertCircle className="h-5 w-5" />
                                        {err}
                                    </div>
                                </td>
                            </tr>
                        ) : rows.length === 0 ? (
                            <tr className="border-t border-zinc-800">
                                <td colSpan={8} className="p-6 text-zinc-400">No data.</td>
                            </tr>
                        ) : (
                            rows.map((r) => {
                                const u = r?.user || {};
                                const s = r?.stats || {};
                                const coin = s?.coin || {};
                                const isUnlimited = u?.jenis_aktivasi === "unlimited";
                                return (
                                    <tr key={u.id} className="border-t border-zinc-800 hover:bg-zinc-900/40">
                                        <td className="p-3">
                                            <div className="font-medium text-white">{u.name || "-"}</div>
                                            <div className="text-xs text-zinc-400 flex items-center gap-1">
                                                <Mail className="h-3 w-3" /> {u.email || "-"}
                                            </div>
                                        </td>
                                        <td className="p-3 text-zinc-300">{u.email || "-"}</td>
                                        <td className="p-3 text-right text-white">{s.usage_today ?? 0}</td>
                                        <td className="p-3 text-right text-zinc-300">{coin.balance ?? 0}</td>
                                        <td className="p-3 text-right text-zinc-300">
                                            {isUnlimited ? "∞" : (coin.checks_possible ?? 0)}
                                        </td>
                                        <td className="p-3 text-right text-zinc-300">
                                            {coin.expires_at ? new Date(coin.expires_at).toISOString().slice(0, 10) : "—"}
                                        </td>
                                        <td className="p-3 text-right text-zinc-300">
                                            {isUnlimited ? "∞" : (coin.days_left ?? 0)}
                                        </td>
                                        <td className="p-3 text-right">
                                            <button
                                                onClick={() => setOpenDetailFor(r)}
                                                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs transition-colors"
                                            >
                                                Detail
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                        </tbody>
                    </table>
                </div>

                {/* pagination */}
                <div className="px-4 py-3 border-t border-zinc-700/50 flex items-center justify-between">
                    <div className="text-sm text-zinc-400">
                        Page {pagination?.page || page} of {pageCount || 1}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            disabled={!canPrev}
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            className="px-3 py-2 bg-zinc-800 border border-zinc-700 text-white rounded-lg disabled:opacity-50"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                            disabled={!canNext}
                            onClick={() => setPage((p) => p + 1)}
                            className="px-3 py-2 bg-zinc-800 border border-zinc-700 text-white rounded-lg disabled:opacity-50"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Modal: Detail per-user */}
            {openDetailFor && (
                <UserDetailModal
                    data={openDetailFor}
                    onClose={() => setOpenDetailFor(null)}
                    tzLabel={TZ_LABEL}
                    costPerCheck={summary?.cost_per_check}
                />
            )}
        </div>
    );
}

function Th({ label, sortKey, sortBy, order, onSort, right }) {
    const sortable = !!sortKey && !!onSort;
    const isActive = sortBy === sortKey;
    return (
        <th
            className={`px-3 py-2 text-xs font-medium uppercase tracking-wider ${
                right ? "text-right" : "text-left"
            } ${sortable ? "cursor-pointer select-none" : ""}`}
            onClick={sortable ? () => onSort(sortKey) : undefined}
        >
            <div className={`inline-flex items-center gap-1 ${isActive ? "text-white" : "text-zinc-300"}`}>
                <span>{label}</span>
                {sortable && isActive && (order === "ASC" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
            </div>
        </th>
    );
}

function UserDetailModal({ data, onClose, tzLabel, costPerCheck }) {
    const { user, stats, sampleLogs = [] } = data;
    const coin = stats?.coin || {};
    const isUnlimited = user?.jenis_aktivasi === "unlimited";

    return (
        <Modal onClose={onClose} title={`Detail Penggunaan — ${user?.name || "-"}`}>
            <div className="space-y-5">
                {/* Header cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-zinc-900/70 border border-zinc-700/50 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-cyan-600 to-indigo-700 flex items-center justify-center">
                                <Users className="h-5 w-5 text-white" />
                            </div>
                        </div>
                        <div className="text-sm text-zinc-400">
                            <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4" />
                                <span>{user?.email}</span>
                            </div>
                            <div className="mt-1">Jenis aktivasi: <span className="text-white">{user?.jenis_aktivasi || "-"}</span></div>
                        </div>
                    </div>

                    <div className="bg-zinc-900/70 border border-zinc-700/50 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-emerald-600 to-green-700 flex items-center justify-center">
                                <BarChart3 className="h-5 w-5 text-white" />
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-zinc-400">Usage Hari Ini</p>
                                <p className="text-xl font-semibold text-white">{stats?.usage_today ?? 0}</p>
                            </div>
                        </div>
                        <div className="text-xs text-zinc-400">
                            Cost/check: {costPerCheck ?? stats?.cost_per_check ?? "-"}
                        </div>
                    </div>

                    <div className="bg-zinc-900/70 border border-zinc-700/50 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-yellow-600 to-amber-700 flex items-center justify-center">
                                <TrendingUp className="h-5 w-5 text-white" />
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-zinc-400">Checks Possible</p>
                                <p className="text-xl font-semibold text-white">
                                    {isUnlimited ? "∞" : (coin?.checks_possible ?? 0)}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>
                Expiry: {coin?.expires_at
                  ? new Date(coin.expires_at).toISOString().slice(0, 10)
                  : "—"}{" "}
                  {tzLabel}
              </span>
                            {isUnlimited || !coin?.is_expired ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                            ) : (
                                <AlertCircle className="h-4 w-4 text-red-400" />
                            )}
                        </div>
                        {!isUnlimited && (
                            <div className="mt-1 text-xs text-zinc-400">
                                Days left: <span className="text-white">{coin?.days_left ?? 0}</span> — Balance:{" "}
                                <span className="text-white">{coin?.balance ?? 0}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sample Logs (optional) */}
                <div className="bg-zinc-900/70 border border-zinc-700/50 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-zinc-700/50 flex items-center justify-between">
                        <div>
                            <h4 className="text-white font-semibold">Sample Logs</h4>
                            <p className="text-xs text-zinc-400">Menampilkan max 2 log terbaru pada tanggal yang sama.</p>
                        </div>
                    </div>

                    {sampleLogs?.length ? (
                        <ul className="divide-y divide-zinc-800">
                            {sampleLogs.map((l, idx) => (
                                <li key={idx} className="p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <div className="text-sm text-white">{l.message}</div>
                                            <div className="text-xs text-zinc-400 flex items-center gap-1 mt-1">
                                                <Clock className="h-3 w-3" />
                                                <span>
                          {new Intl.DateTimeFormat("id-ID", {
                              timeZone: "Asia/Jakarta",
                              dateStyle: "medium",
                              timeStyle: "medium",
                              hour12: false,
                          }).format(new Date(l.timestamp))}{" "}
                                                    {tzLabel}
                        </span>
                                            </div>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="p-4 text-sm text-zinc-400">
                            Tidak ada sample logs. Aktifkan “Sertakan sample logs” di filter.
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
}

function Modal({ title, children, onClose }) {
    return (
        <div className="fixed inset-0 z-50">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70" onClick={onClose} />

            {/* Wrapper */}
            <div className="absolute inset-0 flex items-center justify-center p-4 md:p-6">
                <div
                    className="relative w-full max-w-3xl bg-zinc-950 border border-zinc-700 rounded-2xl shadow-xl overflow-hidden mx-auto"
                    style={{ maxHeight: "90vh" }}
                >
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-zinc-700/50 flex items-center justify-between sticky top-0 bg-zinc-950/95 backdrop-blur">
                        <h3 className="text-white font-semibold truncate pr-4">{title}</h3>
                        <button onClick={onClose} className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200">
                            <XIcon className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 overflow-y-auto" style={{ maxHeight: "calc(90vh - 64px)" }}>
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
