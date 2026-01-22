import { useState, useEffect } from "react";
import axios from "../config/axios";
import {
    Users, Clock, RefreshCw, AlertTriangle, UserCheck, UserX,
    Smartphone, Search, Pencil, Save, X as XIcon,
    Trash2, Coins, CalendarDays
} from "lucide-react";

const TOPUP_PACKAGES = [
    { code: "silver",   label: "Silver · 400 coins",    coins: 400 },
    { code: "gold",     label: "Gold · 1000 coins",     coins: 1000 },
    { code: "platinum", label: "Platinum · 2000 coins", coins: 2000 },
];

// normalisasi nomor untuk wa.me
const toWaNumber = (phone) => {
    if (!phone) return null;
    let s = String(phone).trim();
    const at = s.indexOf("@");
    if (at !== -1) s = s.slice(0, at);
    s = s.replace(/[^\d+]/g, "");
    if (s.startsWith("+")) s = s.slice(1);
    s = s.replace(/\D/g, "");
    if (s.startsWith("0")) s = "62" + s.slice(1);
    else if (s.startsWith("8")) s = "62" + s;
    s = s.replace(/\D/g, "");
    return s || null;
};

// hitung sisa hari menuju coin_expires_at
const getDaysLeftFromExpiry = (expiresAt) => {
    if (!expiresAt) return null;
    const now = new Date();
    const exp = new Date(expiresAt);
    const diffMs = exp.getTime() - now.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
};

export default function UserHandling() {
    const [users, setUsers] = useState([]);
    const [pendingUsers, setPendingUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState({});
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState("pending");
    const [searchTerm, setSearchTerm] = useState("");
    const [openActionMenu, setOpenActionMenu] = useState({});
    const [editMode, setEditMode] = useState({});
    const [updateForm, setUpdateForm] = useState({});
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(100);
    const [serverPageInfo, setServerPageInfo] = useState({ total: 0, pages: 0 });

    // Modal TopUp bebas
    const [topupModal, setTopupModal] = useState(null); // { user, package_code }

    // Modal Aktivasi Pertama (wajib topup)
    const [firstActModal, setFirstActModal] = useState(null);
    // shape: { user, form: { package_code, jenis_aktivasi, duration_days } }

    useEffect(() => {
        if (activeTab === "pending") fetchPendingUsers();
        else fetchUsers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, page, limit]);

    const primeUpdateDefaults = (u) => {
        setUpdateForm((prev) => {
            if (prev[u.id]) return prev;
            return {
                ...prev,
                [u.id]: {
                    name: u.name || "",
                    email: u.email || "",
                },
            };
        });
    };

    const fetchPendingUsers = async () => {
        setLoading(true); setError(null);
        try {
            const { data } = await axios.get("/api/users/pending");
            const list = Array.isArray(data) ? data : data.users || [];
            setPendingUsers(list);
            list.forEach(primeUpdateDefaults);
        } catch (err) {
            console.error("fetchPendingUsers:", err);
            setError(err.response?.data?.message || "Failed to fetch pending users");
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        setLoading(true); setError(null);
        try {
            const { data } = await axios.get("/api/users", { params: { page, limit } });
            const list = Array.isArray(data) ? data : data.users || [];
            setUsers(list);
            const pg = data.pagination || {};
            setServerPageInfo({
                total: pg.total ?? list.length,
                pages: pg.pages ?? 1,
            });
            list.forEach(primeUpdateDefaults);
        } catch (err) {
            console.error("fetchUsers:", err);
            setError(err.response?.data?.message || "Failed to fetch users");
        } finally {
            setLoading(false);
        }
    };

    const handleUserAction = async (userId, action, payload = null) => {
        setActionLoading((prev) => ({ ...prev, [userId]: action }));
        try {
            let endpoint = "", method = "put", body = payload || {};
            switch (action) {
                case "activate":
                    endpoint = `/api/users/${userId}/activate`;
                    // default minimal untuk re-activation (bukan first)
                    if (!body.jenis_aktivasi) body.jenis_aktivasi = "silver";
                    if (!body.duration_days) body.duration_days = 30;
                    break;
                case "deactivate":
                    endpoint = `/api/users/${userId}/deactivate`;
                    body = {};
                    break;
                case "reset-device":
                    endpoint = `/api/users/${userId}/reset-device`;
                    body = {};
                    break;
                case "update":
                    endpoint = `/api/users/${userId}`;
                    method = "put";
                    break;
                case "delete":
                    endpoint = `/api/users/${userId}`;
                    method = "delete";
                    body = undefined;
                    break;
                default:
                    throw new Error("Unknown action");
            }

            if (method === "put") await axios.put(endpoint, body);
            else if (method === "delete") await axios.delete(endpoint);

            if (activeTab === "pending") await fetchPendingUsers();
            else await fetchUsers();

            alert(`User ${action} successful!`);
        } catch (err) {
            console.error(`Error ${action} user:`, err);
            alert(err.response?.data?.message || `Failed to ${action} user`);
        } finally {
            setActionLoading((prev) => ({ ...prev, [userId]: null }));
        }
    };

    // TOPUP handler (owner/manager only → backend validasi)
    const handleTopup = async (userId, package_code) => {
        setActionLoading((prev) => ({ ...prev, [userId]: "topup" }));
        try {
            const { data } = await axios.post("/api/coins/topup", { userId, package_code });
            alert(
                `Topup success: ${package_code.toUpperCase()} (+${data.coins_added} coins). ` +
                `New balance: ${data.balance}.`
            );
            await fetchUsers();
        } catch (err) {
            console.error("topup error:", err);
            alert(err.response?.data?.error || err.response?.data?.message || "Topup failed");
        } finally {
            setActionLoading((prev) => ({ ...prev, [userId]: null }));
            setTopupModal(null);
        }
    };

    // === First Activation flow ===
    const openFirstActivation = (user) => {
        // default pilihan
        setFirstActModal({
            user,
            form: { package_code: "silver", jenis_aktivasi: "silver", duration_days: 30 }
        });
    };

    const confirmFirstActivation = async () => {
        if (!firstActModal) return;
        const { user, form } = firstActModal;
        const { package_code, jenis_aktivasi, duration_days } = form;

        setActionLoading((prev) => ({ ...prev, [user.id]: "first-activate" }));
        try {
            // 1) Topup wajib
            await axios.post("/api/coins/topup", { userId: user.id, package_code });
            // 2) Activate
            await axios.put(`/api/users/${user.id}/activate`, { jenis_aktivasi, duration_days });

            alert("First activation completed (topup + activate).");
            await (activeTab === "pending" ? fetchPendingUsers() : fetchUsers());
        } catch (err) {
            console.error("first activation error:", err);
            alert(err.response?.data?.message || "First activation failed");
        } finally {
            setActionLoading((prev) => ({ ...prev, [user.id]: null }));
            setFirstActModal(null);
        }
    };

    const baseData = activeTab === "pending" ? pendingUsers : users;
    const searchedData = baseData.filter(
        (u) =>
            u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            String(u.phone || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (error) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <AlertTriangle className="h-16 w-16 text-red-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">Error Loading Data</h3>
                    <p className="text-zinc-400 mb-4">{error}</p>
                    <button
                        onClick={() => (activeTab === "pending" ? fetchPendingUsers() : fetchUsers())}
                        className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white">User Management (Coin-Based)</h2>
                    <p className="text-zinc-400">Activate users, top up coins, edit, deactivate, reset device</p>
                </div>
                <button
                    onClick={() => (activeTab === "pending" ? fetchPendingUsers() : fetchUsers())}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                    <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    Refresh
                </button>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 bg-zinc-800/50 rounded-lg p-1">
                <button
                    onClick={() => setActiveTab("pending")}
                    className={`flex-1 flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        activeTab === "pending" ? "bg-cyan-600 text-white" : "text-zinc-400 hover:text-white hover:bg-zinc-700/50"
                    }`}
                >
                    <Clock className="h-4 w-4" />
                    Pending Users
                </button>
                <button
                    onClick={() => setActiveTab("all")}
                    className={`flex-1 flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        activeTab === "all" ? "bg-cyan-600 text-white" : "text-zinc-400 hover:text-white hover:bg-zinc-700/50"
                    }`}
                >
                    <Users className="h-4 w-4" />
                    All Users
                </button>
            </div>

            {/* Search */}
            <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-zinc-400" />
                <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 text-white rounded-lg text-sm focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none"
                />
            </div>

            {/* Table */}
            <div className="bg-zinc-900/50 backdrop-blur-xl rounded-xl border border-zinc-800/70 overflow-hidden">
                {/* Pagination (server-side) */}
                {activeTab !== "pending" && (
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mt-4 px-4">
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-zinc-300">Rows per page</span>
                            <select
                                value={limit}
                                onChange={(e) => { setPage(1); setLimit(parseInt(e.target.value, 10)); }}
                                className="px-2 py-1 bg-zinc-800 border border-zinc-700 text-white rounded-md text-sm"
                            >
                                {[10, 25, 50, 100, 1000].map((n) => (<option key={n} value={n}>{n}</option>))}
                            </select>
                        </div>
                        <div className="flex items-center gap-3">
              <span className="text-sm text-zinc-400">
                Page <span className="text-zinc-200 font-medium">{page}</span> of{" "}
                  <span className="text-zinc-200 font-medium">{serverPageInfo.pages || 1}</span> — Total{" "}
                  <span className="text-zinc-200 font-medium">{serverPageInfo.total ?? 0}</span>
              </span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page <= 1 || loading}
                                    className="px-3 py-1 bg-zinc-800 border border-zinc-700 text-white rounded-lg text-sm disabled:opacity-50 hover:bg-zinc-700/60"
                                >
                                    Prev
                                </button>
                                <button
                                    onClick={() => setPage((p) => (serverPageInfo.pages ? Math.min(serverPageInfo.pages, p + 1) : p + 1))}
                                    disabled={loading || (serverPageInfo.pages ? page >= serverPageInfo.pages : false)}
                                    className="px-3 py-1 bg-zinc-800 border border-zinc-700 text-white rounded-lg text-sm disabled:opacity-50 hover:bg-zinc-700/60"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-zinc-800/50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">User</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Nomor WA</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Coins</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Coin Expires</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Days Left</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Actions</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800">
                        {loading ? (
                            [...Array(5)].map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 bg-zinc-700 rounded-full"></div>
                                            <div className="space-y-1">
                                                <div className="h-4 w-24 bg-zinc-700 rounded"></div>
                                                <div className="h-3 w-32 bg-zinc-700 rounded"></div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4"><div className="h-6 w-28 bg-zinc-700 rounded"></div></td>
                                    <td className="px-6 py-4"><div className="h-6 w-16 bg-zinc-700 rounded-full"></div></td>
                                    <td className="px-6 py-4"><div className="h-4 w-16 bg-zinc-700 rounded"></div></td>
                                    <td className="px-6 py-4"><div className="h-4 w-24 bg-zinc-700 rounded"></div></td>
                                    <td className="px-6 py-4"><div className="h-4 w-16 bg-zinc-700 rounded"></div></td>
                                    <td className="px-6 py-4"><div className="flex gap-2"><div className="h-6 w-16 bg-zinc-700 rounded"></div></div></td>
                                </tr>
                            ))
                        ) : searchedData.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="px-6 py-12 text-center">
                                    <Users className="h-12 w-12 text-zinc-500 mx-auto mb-4" />
                                    <p className="text-zinc-400">No users found</p>
                                </td>
                            </tr>
                        ) : (
                            searchedData.map((user) => {
                                if (!updateForm[user.id]) primeUpdateDefaults(user);
                                const upd = updateForm[user.id] || { name: "", email: "" };
                                const waNum = toWaNumber(user.phone);

                                // coin fields expected from backend user model
                                const balance = user.coin_balance ?? 0;
                                const expiresAt = user.coin_expires_at || null;
                                const daysLeft = getDaysLeftFromExpiry(expiresAt);

                                const isActive = !!user.is_active;
                                const isFirstActivation = !user.activated_at; // null/undefined = belum pernah aktif

                                return (
                                    <tr key={user.id} className="hover:bg-zinc-800/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-gradient-to-r from-cyan-500 to-indigo-600 flex items-center justify-center">
                            <span className="text-xs font-medium text-white">
                              {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || "U"}
                            </span>
                                                </div>
                                                <div className="space-y-1">
                                                    {editMode[user.id] ? (
                                                        <>
                                                            <input
                                                                value={upd.name}
                                                                onChange={(e) =>
                                                                    setUpdateForm((p) => ({ ...p, [user.id]: { ...p[user.id], name: e.target.value } }))
                                                                }
                                                                className="px-2 py-1 bg-zinc-800 border border-zinc-700 text-white rounded-md text-xs w-48"
                                                                placeholder="Name"
                                                            />
                                                            <input
                                                                value={upd.email}
                                                                onChange={(e) =>
                                                                    setUpdateForm((p) => ({ ...p, [user.id]: { ...p[user.id], email: e.target.value } }))
                                                                }
                                                                className="px-2 py-1 bg-zinc-800 border border-zinc-700 text-white rounded-md text-xs w-56"
                                                                placeholder="Email"
                                                            />
                                                        </>
                                                    ) : (
                                                        <>
                                                            <p className="text-sm font-medium text-white">{user.name || "Unnamed User"}</p>
                                                            <p className="text-xs text-zinc-400">{user.email}</p>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </td>

                                        <td className="px-6 py-4">
                                            {waNum ? (
                                                <a
                                                    href={`https://wa.me/${waNum}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-2 px-2 py-1 rounded-md bg-green-900/20 text-green-300 border border-green-500/30 hover:bg-green-900/40"
                                                    title={`Chat ${waNum} on WhatsApp`}
                                                >
                                                    <Smartphone className="h-4 w-4" />
                                                    <span className="font-mono">{waNum}</span>
                                                </a>
                                            ) : (
                                                <span className="text-zinc-400">—</span>
                                            )}
                                        </td>

                                        <td className="px-6 py-4">
                                            {isActive ? (
                                                <span className="px-2 py-1 text-xs rounded-full bg-emerald-900/20 text-emerald-400 border border-emerald-500/30">
                            Active
                          </span>
                                            ) : (
                                                <span className="px-2 py-1 text-xs rounded-full bg-gray-900/20 text-gray-400 border border-gray-500/30">
                            Inactive
                          </span>
                                            )}
                                        </td>

                                        <td className="px-6 py-4">
                                            <div className="inline-flex items-center gap-2 px-2 py-1 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-200">
                                                <Coins className="h-4 w-4" />
                                                <span className="font-semibold">{balance}</span>
                                            </div>
                                        </td>

                                        <td className="px-6 py-4 text-sm text-zinc-300">
                                            {expiresAt ? (
                                                <div className="inline-flex items-center gap-2">
                                                    <CalendarDays className="h-4 w-4 text-zinc-400" />
                                                    {new Date(expiresAt).toLocaleDateString()}
                                                </div>
                                            ) : (
                                                "—"
                                            )}
                                        </td>

                                        <td className="px-6 py-4 text-sm">
                                            {expiresAt == null ? (
                                                <span className="text-zinc-400">—</span>
                                            ) : daysLeft >= 0 ? (
                                                <span className="text-emerald-400">{daysLeft} day{daysLeft === 1 ? "" : "s"} left</span>
                                            ) : (
                                                <span className="text-red-400">expired {Math.abs(daysLeft)} day{Math.abs(daysLeft) === 1 ? "" : "s"} ago</span>
                                            )}
                                        </td>

                                        <td className="px-6 py-4">
                                            <div className="relative">
                                                <button
                                                    onClick={() => setOpenActionMenu((p) => ({ ...p, [user.id]: !p[user.id] }))}
                                                    className="px-3 py-1 rounded-lg text-xs font-medium bg-zinc-800 text-white border border-zinc-700 hover:bg-zinc-700/60"
                                                >
                                                    Actions
                                                </button>

                                                {openActionMenu[user.id] && (
                                                    <div className="absolute z-10 mt-2 w-56 bg-zinc-900 border border-zinc-700 rounded-lg shadow-lg p-2 space-y-1">
                                                        {/* Activate */}
                                                        {!isActive && (
                                                            <button
                                                                onClick={() => {
                                                                    setOpenActionMenu((p) => ({ ...p, [user.id]: false }));
                                                                    if (isFirstActivation) {
                                                                        // First activation needs topup + activate
                                                                        openFirstActivation(user);
                                                                    } else {
                                                                        // Reactivation: langsung aktifkan (tanpa paket)
                                                                        handleUserAction(user.id, "activate", { jenis_aktivasi: "silver", duration_days: 30 });
                                                                    }
                                                                }}
                                                                className="w-full flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium bg-emerald-900/20 text-emerald-400 hover:bg-emerald-900/40"
                                                            >
                                                                <UserCheck className="h-3 w-3" /> Activate
                                                            </button>
                                                        )}

                                                        {/* TOPUP anytime */}
                                                        <button
                                                            onClick={() => {
                                                                setTopupModal({ user, package_code: "silver" });
                                                                setOpenActionMenu((p) => ({ ...p, [user.id]: false }));
                                                            }}
                                                            className="w-full flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium bg-cyan-900/20 text-cyan-300 hover:bg-cyan-900/40"
                                                            disabled={!!actionLoading[user.id]}
                                                        >
                                                            {actionLoading[user.id] === "topup" ? (
                                                                <RefreshCw className="h-3 w-3 animate-spin" />
                                                            ) : (
                                                                <Coins className="h-3 w-3" />
                                                            )}
                                                            Top Up Coins
                                                        </button>

                                                        {/* Deactivate */}
                                                        {isActive && (
                                                            <button
                                                                onClick={() => {
                                                                    setOpenActionMenu((p) => ({ ...p, [user.id]: false }));
                                                                    handleUserAction(user.id, "deactivate");
                                                                }}
                                                                className="w-full flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium bg-red-900/20 text-red-400 hover:bg-red-900/40"
                                                            >
                                                                <UserX className="h-3 w-3" /> Deactivate
                                                            </button>
                                                        )}

                                                        {/* Edit / Delete */}
                                                        {!editMode[user.id] ? (
                                                            <>
                                                                <button
                                                                    onClick={() => {
                                                                        setEditMode((p) => ({ ...p, [user.id]: true }));
                                                                        setOpenActionMenu((p) => ({ ...p, [user.id]: false }));
                                                                    }}
                                                                    className="w-full flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium bg-zinc-800 text-zinc-200 hover:bg-zinc-700/60"
                                                                >
                                                                    <Pencil className="h-3 w-3" /> Edit
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        setOpenActionMenu((p) => ({ ...p, [user.id]: false }));
                                                                        if (confirm("Delete this user? This cannot be undone.")) {
                                                                            handleUserAction(user.id, "delete");
                                                                        }
                                                                    }}
                                                                    className="w-full flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium bg-red-900/20 text-red-400 hover:bg-red-900/40"
                                                                >
                                                                    <Trash2 className="h-3 w-3" /> Delete
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <button
                                                                    onClick={() => {
                                                                        setOpenActionMenu((p) => ({ ...p, [user.id]: false }));
                                                                        const payload = {
                                                                            name: String(updateForm[user.id]?.name || ""),
                                                                            email: String(updateForm[user.id]?.email || ""),
                                                                        };
                                                                        handleUserAction(user.id, "update", payload);
                                                                        setEditMode((p) => ({ ...p, [user.id]: false }));
                                                                    }}
                                                                    className="w-full flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium bg-emerald-900/20 text-emerald-400 hover:bg-emerald-900/40"
                                                                >
                                                                    <Save className="h-3 w-3" /> Save
                                                                </button>
                                                                <button
                                                                    onClick={() => setEditMode((p) => ({ ...p, [user.id]: false }))}
                                                                    className="w-full flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium bg-zinc-800 text-zinc-200 hover:bg-zinc-700/60"
                                                                >
                                                                    <XIcon className="h-3 w-3" /> Cancel
                                                                </button>
                                                            </>
                                                        )}

                                                        {/* Reset Device */}
                                                        <button
                                                            onClick={() => {
                                                                setOpenActionMenu((p) => ({ ...p, [user.id]: false }));
                                                                handleUserAction(user.id, "reset-device");
                                                            }}
                                                            className="w-full flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium bg-orange-900/20 text-orange-400 hover:bg-orange-900/40"
                                                        >
                                                            <Smartphone className="h-3 w-3" /> Reset Device
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* TOPUP MODAL */}
            {topupModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                    <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 w-[420px] space-y-4">
                        <h3 className="text-lg font-semibold text-white">Top Up Coins</h3>
                        <p className="text-sm text-zinc-300">
                            User: <span className="font-medium text-white">{topupModal.user.name || topupModal.user.email}</span>
                        </p>
                        <div className="space-y-2">
                            <label className="text-sm text-zinc-300">Choose package</label>
                            <select
                                value={topupModal.package_code}
                                onChange={(e) => setTopupModal((p) => ({ ...p, package_code: e.target.value }))}
                                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 text-white rounded-md text-sm"
                            >
                                {TOPUP_PACKAGES.map((p) => (
                                    <option key={p.code} value={p.code}>{p.label}</option>
                                ))}
                            </select>
                            <p className="text-[11px] text-zinc-500">
                                Koin akan hangus tiap 30 hari sejak top up terakhir dan otomatis diperpanjang ketika top up lagi (akumulatif).
                            </p>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setTopupModal(null)}
                                className="px-4 py-2 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleTopup(topupModal.user.id, topupModal.package_code)}
                                className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-500"
                            >
                                Confirm Top Up
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* FIRST ACTIVATION MODAL (Topup + Activate) */}
            {firstActModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                    <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 w-[460px] space-y-4">
                        <h3 className="text-lg font-semibold text-white">First Activation</h3>
                        <p className="text-sm text-zinc-300">
                            User: <span className="font-medium text-white">{firstActModal.user.name || firstActModal.user.email}</span>
                        </p>

                        <div className="space-y-3">
                            <div>
                                <label className="text-sm text-zinc-300">Topup package (required)</label>
                                <select
                                    value={firstActModal.form.package_code}
                                    onChange={(e) => setFirstActModal((p) => ({ ...p, form: { ...p.form, package_code: e.target.value } }))}
                                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 text-white rounded-md text-sm"
                                >
                                    {TOPUP_PACKAGES.map((p) => (
                                        <option key={p.code} value={p.code}>{p.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-sm text-zinc-300">Activation type</label>
                                    <select
                                        value={firstActModal.form.jenis_aktivasi}
                                        onChange={(e) => setFirstActModal((p) => ({ ...p, form: { ...p.form, jenis_aktivasi: e.target.value } }))}
                                        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 text-white rounded-md text-sm"
                                    >
                                        {["silver","gold","platinum","unlimited"].map((t) => (
                                            <option key={t} value={t}>{t}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm text-zinc-300">Duration (days)</label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={firstActModal.form.duration_days}
                                        onChange={(e) =>
                                            setFirstActModal((p) => ({
                                                ...p,
                                                form: { ...p.form, duration_days: Math.max(1, parseInt(e.target.value || "1", 10)) }
                                            }))
                                        }
                                        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 text-white rounded-md text-sm"
                                    />
                                </div>
                            </div>

                            <p className="text-[11px] text-zinc-500">
                                Aktivasi pertama wajib topup. Aktivasi berikutnya dapat dilakukan tanpa topup (topup opsional).
                            </p>
                        </div>

                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setFirstActModal(null)}
                                className="px-4 py-2 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmFirstActivation}
                                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500"
                            >
                                Confirm (Topup + Activate)
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}



// import { useState, useEffect } from "react";
// import axios from "../config/axios";
// import {
//     Users,
//     Clock,
//     RefreshCw,
//     AlertTriangle,
//     UserCheck,
//     UserX,
//     UserPlus,
//     Smartphone,
//     Search,
//     Pencil,
//     Save,
//     X as XIcon,
//     Trash2,
//     Filter
// } from "lucide-react";
//
// const ACTIVATION_TYPES = ["silver", "gold", "platinum","unlimited"];
//
// // NEW: helper normalisasi nomor ke format wa.me (hanya digit, pakai 62)
// const toWaNumber = (phone) => {
//     if (!phone) return null;
//     let s = String(phone).trim();
//
//     // potong JID kalau ada
//     const at = s.indexOf("@");
//     if (at !== -1) s = s.slice(0, at);
//
//     // keep digit dan + dulu, buang spasi/pemisah
//     s = s.replace(/[^\d+]/g, "");
//     if (s.startsWith("+")) s = s.slice(1);
//
//     // sekarang hanya digit
//     s = s.replace(/\D/g, "");
//
//     // 0812xxxx -> 62812xxxx ; 8xxxx -> 628xxxx
//     if (s.startsWith("0")) s = "62" + s.slice(1);
//     else if (s.startsWith("8")) s = "62" + s;
//
//     // final guard
//     s = s.replace(/\D/g, "");
//     return s || null;
// };
//
// export default function UserHandling() {
//     const [users, setUsers] = useState([]);
//     const [pendingUsers, setPendingUsers] = useState([]);
//     const [loading, setLoading] = useState(true);
//     const [actionLoading, setActionLoading] = useState({});
//     const [error, setError] = useState(null);
//     const [activeTab, setActiveTab] = useState("pending");
//     const [searchTerm, setSearchTerm] = useState("");
//     const [openActionMenu, setOpenActionMenu] = useState({});
//     const [modalAction, setModalAction] = useState(null);
//
//     // Per-user form state
//     const [activationForm, setActivationForm] = useState({});
//     const [extendForm, setExtendForm] = useState({});
//
//     // NEW: inline update state (edit mode + form)
//     const [editMode, setEditMode] = useState({});
//     const [updateForm, setUpdateForm] = useState({});
//
//     // NEW: filter untuk tab Expired
//     const [expiredFilterDays, setExpiredFilterDays] = useState(30);
//
//     // Pagination (server-side)
//     const [page, setPage] = useState(1);
//     const [limit, setLimit] = useState(100);
//     const [serverPageInfo, setServerPageInfo] = useState({ total: 0, pages: 0 });
//
//     useEffect(() => {
//         if (activeTab === "pending") {
//             fetchPendingUsers();
//         } else {
//             // "all" atau "expired" sama-sama ambil /api/users lalu difilter di client
//             fetchUsers();
//         }
//     }, [activeTab]);
//
//     useEffect(() => {
//         if (activeTab === "pending") {
//             fetchPendingUsers();
//         } else {
//             fetchUsers();
//         }
//     }, [activeTab, page, limit]); // ⬅️ add page, limit
//
//     const primeActivationDefaults = (user) => {
//         setActivationForm((prev) => {
//             if (prev[user.id]) return prev;
//             return {
//                 ...prev,
//                 [user.id]: {
//                     jenis_aktivasi: "silver",
//                     duration_days: 30
//                 }
//             };
//         });
//     };
//
//     const primeExtendDefaults = (user) => {
//         setExtendForm((prev) => {
//             if (prev[user.id]) return prev;
//             return {
//                 ...prev,
//                 [user.id]: {
//                     additional_days: 2,
//                     new_jenis_aktivasi: "silver"
//                 }
//             };
//         });
//     };
//
//     const primeUpdateDefaults = (user) => {
//         setUpdateForm((prev) => {
//             if (prev[user.id]) return prev;
//             return {
//                 ...prev,
//                 [user.id]: {
//                     name: user.name || "",
//                     email: user.email || "",
//                     jenis_aktivasi: user.jenis_aktivasi || "silver"
//                 }
//             };
//         });
//     };
//
//     const fetchPendingUsers = async () => {
//         setLoading(true);
//         setError(null);
//         try {
//             const { data } = await axios.get("/api/users/pending");
//             const list = Array.isArray(data) ? data : data.users || [];
//             setPendingUsers(list);
//
//             list.forEach((u) => {
//                 if (!u.is_active) primeActivationDefaults(u);
//                 primeUpdateDefaults(u);
//             });
//         } catch (err) {
//             console.error("Error fetching pending users:", err);
//             setError(err.response?.data?.message || "Failed to fetch pending users");
//         } finally {
//             setLoading(false);
//         }
//     };
//
//     const fetchUsers = async () => {
//         setLoading(true);
//         setError(null);
//         try {
//             const params = { page, limit };
//
//             // Optional: let backend pre-filter expired to reduce payload
//             if (activeTab === "expired") {
//                 params.activation_status = "expired";
//             }
//
//             const { data } = await axios.get("/api/users", { params });
//             // Expecting { users, pagination: { page, limit, total, pages } }
//             const list = Array.isArray(data) ? data : data.users || [];
//             setUsers(list);
//
//             const pg = data.pagination || {};
//             setServerPageInfo({
//                 total: pg.total ?? list.length,
//                 pages: pg.pages ?? 1,
//             });
//
//             list.forEach((u) => {
//                 const now = new Date();
//                 const expiredAt = u.expired_at ? new Date(u.expired_at) : null;
//                 const isExpired = expiredAt && expiredAt < now;
//
//                 if (!u.is_active) primeActivationDefaults(u);
//                 if (isExpired) primeExtendDefaults(u);
//                 primeUpdateDefaults(u);
//             });
//         } catch (err) {
//             console.error("Error fetching users:", err);
//             setError(err.response?.data?.message || "Failed to fetch users");
//         } finally {
//             setLoading(false);
//         }
//     };
//     function ActionModal({ modalAction, setModalAction, onConfirm }) {
//         if (!modalAction) return null;
//
//         const { type, user, form } = modalAction;
//
//         return (
//             <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
//                 <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 w-96 space-y-4">
//                     <h3 className="text-lg font-semibold text-white">
//                         {type === "activate" ? "Activate User" : "Extend Activation"}
//                     </h3>
//
//                     <div className="space-y-3">
//                         <select
//                             value={form.jenis}
//                             onChange={(e) =>
//                                 setModalAction((p) => ({
//                                     ...p,
//                                     form: { ...p.form, jenis: e.target.value },
//                                 }))
//                             }
//                             className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 text-white rounded-md text-sm"
//                         >
//                             {ACTIVATION_TYPES.map((t) => (
//                                 <option key={t} value={t}>
//                                     {t}
//                                 </option>
//                             ))}
//                         </select>
//
//                         <input
//                             type="number"
//                             min={1}
//                             value={form.days}
//                             onChange={(e) =>
//                                 setModalAction((p) => ({
//                                     ...p,
//                                     form: { ...p.form, days: Math.max(1, parseInt(e.target.value || "1", 10)) },
//                                 }))
//                             }
//                             className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 text-white rounded-md text-sm"
//                             placeholder="Number of days"
//                         />
//                     </div>
//
//                     <div className="flex justify-end gap-2">
//                         <button
//                             onClick={() => setModalAction(null)}
//                             className="px-4 py-2 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600"
//                         >
//                             Cancel
//                         </button>
//                         <button
//                             onClick={() => {
//                                 onConfirm(modalAction);
//                                 setModalAction(null);
//                             }}
//                             className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-500"
//                         >
//                             Confirm
//                         </button>
//                     </div>
//                 </div>
//             </div>
//         );
//     }
//
//
//     const handleUserAction = async (userId, action, payload = null) => {
//         setActionLoading((prev) => ({ ...prev, [userId]: action }));
//         try {
//             let endpoint = "";
//             let method = "put";
//             let body = payload || {};
//
//             switch (action) {
//                 case "activate":
//                     endpoint = `/api/users/${userId}/activate`;
//                     break;
//                 case "deactivate":
//                     endpoint = `/api/users/${userId}/deactivate`;
//                     body = {};
//                     break;
//                 case "extend":
//                     endpoint = `/api/users/${userId}/extend-activation`;
//                     break;
//                 case "reset-device":
//                     endpoint = `/api/users/${userId}/reset-device`;
//                     body = {};
//                     break;
//
//                 // NEW: update user (PUT /:id)
//                 case "update":
//                     endpoint = `/api/users/${userId}`;
//                     method = "put";
//                     break;
//
//                 // NEW: delete user (DELETE /:id)
//                 case "delete":
//                     endpoint = `/api/users/${userId}`;
//                     method = "delete";
//                     body = undefined; // axios.delete tidak perlu body
//                     break;
//
//                 default:
//                     throw new Error("Unknown action");
//             }
//
//             if (method === "put") {
//                 await axios.put(endpoint, body);
//             } else if (method === "delete") {
//                 await axios.delete(endpoint);
//             }
//
//             if (activeTab === "pending") {
//                 await fetchPendingUsers();
//             } else {
//                 await fetchUsers();
//             }
//
//             alert(`User ${action} successful!`);
//         } catch (err) {
//             console.error(`Error ${action} user:`, err);
//             alert(err.response?.data?.message || `Failed to ${action} user`);
//         } finally {
//             setActionLoading((prev) => ({ ...prev, [userId]: null }));
//         }
//     };
//
//     const ActionButton = ({ userId, action, icon: Icon, className, children, payload, danger }) => (
//         <button
//             onClick={() => handleUserAction(userId, action, payload)}
//             disabled={!!actionLoading[userId]}
//             className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${className} ${
//                 danger ? "hover:ring-1 hover:ring-red-500/40" : ""
//             }`}
//         >
//             {actionLoading[userId] === action ? (
//                 <RefreshCw className="h-3 w-3 animate-spin" />
//             ) : (
//                 <Icon className="h-3 w-3" />
//             )}
//             {children}
//         </button>
//     );
//
//     // helper: hitung sisa hari (positif = masih sisa; negatif = sudah lewat)
//     const getDaysLeft = (expired_at) => {
//         if (!expired_at) return null; // Never expire
//         const now = new Date();
//         const exp = new Date(expired_at);
//         const diffMs = exp.getTime() - now.getTime();
//         const days = Math.floor(diffMs / (1000 * 60 * 60 * 24)); // ⬅️ was Math.ceil
//         return days;
//     };
//
//     // filter data by tab + search
//     const baseData = activeTab === "pending" ? pendingUsers : users;
//
//     const searchedData = baseData.filter(
//         (user) =>
//             user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//             user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//             // NEW: izinkan cari berdasarkan phone juga
//             String(user.phone || "").toLowerCase().includes(searchTerm.toLowerCase())
//     );
//
//     const filteredData =
//         activeTab === "expired"
//             ? searchedData.filter((user) => {
//                 const daysLeft = getDaysLeft(user.expired_at);
//                 if (daysLeft === null) return false; // "Never" bukan expired
//                 return daysLeft < 0; // tampilkan semua yang sudah expired
//             })
//             : searchedData;
//
//
//     if (error) {
//         return (
//             <div className="flex items-center justify-center h-96">
//                 <div className="text-center">
//                     <AlertTriangle className="h-16 w-16 text-red-400 mx-auto mb-4" />
//                     <h3 className="text-lg font-semibold text-white mb-2">Error Loading Data</h3>
//                     <p className="text-zinc-400 mb-4">{error}</p>
//                     <button
//                         onClick={() => (activeTab === "pending" ? fetchPendingUsers() : fetchUsers())}
//                         className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors"
//                     >
//                         Try Again
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
//                     <h2 className="text-2xl font-bold text-white">User Management</h2>
//                     <p className="text-zinc-400">Handle user activation, deactivation, update, delete, and device management</p>
//                 </div>
//
//                 <button
//                     onClick={() => (activeTab === "pending" ? fetchPendingUsers() : fetchUsers())}
//                     disabled={loading}
//                     className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors disabled:opacity-50"
//                 >
//                     <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
//                     Refresh
//                 </button>
//             </div>
//
//             {/* Tabs */}
//             <div className="flex space-x-1 bg-zinc-800/50 rounded-lg p-1">
//                 <button
//                     onClick={() => setActiveTab("pending")}
//                     className={`flex-1 flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
//                         activeTab === "pending" ? "bg-cyan-600 text-white" : "text-zinc-400 hover:text-white hover:bg-zinc-700/50"
//                     }`}
//                 >
//                     <Clock className="h-4 w-4" />
//                     Pending Users
//                 </button>
//                 <button
//                     onClick={() => setActiveTab("all")}
//                     className={`flex-1 flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
//                         activeTab === "all" ? "bg-cyan-600 text-white" : "text-zinc-400 hover:text-white hover:bg-zinc-700/50"
//                     }`}
//                 >
//                     <Users className="h-4 w-4" />
//                     All Users
//                 </button>
//                 {/* NEW: Expired Users */}
//                 <button
//                     onClick={() => setActiveTab("expired")}
//                     className={`flex-1 flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
//                         activeTab === "expired" ? "bg-cyan-600 text-white" : "text-zinc-400 hover:text-white hover:bg-zinc-700/50"
//                     }`}
//                 >
//                     <AlertTriangle className="h-4 w-4" />
//                     Expired Users
//                 </button>
//             </div>
//
//             {/* Search + (Expired filter control) */}
//             <div className="flex flex-col md:flex-row md:items-center gap-3">
//                 <div className="flex items-center gap-2 flex-1">
//                     <Search className="h-4 w-4 text-zinc-400" />
//                     <input
//                         type="text"
//                         placeholder="Search users..."
//                         value={searchTerm}
//                         onChange={(e) => setSearchTerm(e.target.value)}
//                         className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 text-white rounded-lg text-sm focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none"
//                     />
//                 </div>
//
//                 {/*{activeTab === "expired" && (*/}
//                 {/*    <div className="flex items-center gap-2">*/}
//                 {/*        <Filter className="h-4 w-4 text-zinc-400" />*/}
//                 {/*        <span className="text-sm text-zinc-300">Expired within last</span>*/}
//                 {/*        <input*/}
//                 {/*            type="number"*/}
//                 {/*            min={0}*/}
//                 {/*            value={expiredFilterDays}*/}
//                 {/*            onChange={(e) => setExpiredFilterDays(Math.max(0, parseInt(e.target.value || "0", 10)))}*/}
//                 {/*            className="w-24 px-2 py-2 bg-zinc-800 border border-zinc-700 text-white rounded-lg text-sm focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none"*/}
//                 {/*        />*/}
//                 {/*        <span className="text-sm text-zinc-300">days</span>*/}
//                 {/*    </div>*/}
//                 {/*)}*/}
//             </div>
//
//             {/* Users Table */}
//             <div className="bg-zinc-900/50 backdrop-blur-xl rounded-xl border border-zinc-800/70 overflow-hidden">
//                 {/* Pagination Controls (server-side) */}
//                 {activeTab !== "pending" && (
//                     <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mt-4">
//                         <div className="flex items-center gap-2">
//                             <span className="text-sm text-zinc-300">Rows per page</span>
//                             <select
//                                 value={limit}
//                                 onChange={(e) => {
//                                     setPage(1); // reset ke page 1 saat ubah limit
//                                     setLimit(parseInt(e.target.value, 10));
//                                 }}
//                                 className="px-2 py-1 bg-zinc-800 border border-zinc-700 text-white rounded-md text-sm"
//                             >
//                                 {[10, 25, 50, 100, 1000].map((n) => (
//                                     <option key={n} value={n}>{n}</option>
//                                 ))}
//                             </select>
//                         </div>
//
//                         <div className="flex items-center gap-3">
//       <span className="text-sm text-zinc-400">
//         Page <span className="text-zinc-200 font-medium">{page}</span> of{" "}
//           <span className="text-zinc-200 font-medium">
//           {serverPageInfo.pages || 1}
//         </span>{" "}
//           — Total{" "}
//           <span className="text-zinc-200 font-medium">
//           {serverPageInfo.total ?? 0}
//         </span>
//       </span>
//
//                             <div className="flex items-center gap-2">
//                                 <button
//                                     onClick={() => setPage((p) => Math.max(1, p - 1))}
//                                     disabled={page <= 1 || loading}
//                                     className="px-3 py-1 bg-zinc-800 border border-zinc-700 text-white rounded-lg text-sm disabled:opacity-50 hover:bg-zinc-700/60"
//                                 >
//                                     Prev
//                                 </button>
//                                 <button
//                                     onClick={() =>
//                                         setPage((p) => (serverPageInfo.pages ? Math.min(serverPageInfo.pages, p + 1) : p + 1))
//                                     }
//                                     disabled={loading || (serverPageInfo.pages ? page >= serverPageInfo.pages : false)}
//                                     className="px-3 py-1 bg-zinc-800 border border-zinc-700 text-white rounded-lg text-sm disabled:opacity-50 hover:bg-zinc-700/60"
//                                 >
//                                     Next
//                                 </button>
//                             </div>
//                         </div>
//                     </div>
//                 )}
//                 <div className="overflow-x-auto">
//                     <table className="w-full">
//                         <thead className="bg-zinc-800/50">
//                         <tr>
//                             <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
//                                 User
//                             </th>
//                             {/* NEW: Nomor WA */}
//                             <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
//                                 Nomor WA
//                             </th>
//                             <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
//                                 Status
//                             </th>
//                             <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
//                                 Activation Type
//                             </th>
//                             <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
//                                 Expires At
//                             </th>
//                             {/* NEW: Days Left */}
//                             <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
//                                 Days Left
//                             </th>
//                             <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
//                                 Actions
//                             </th>
//                         </tr>
//                         </thead>
//                         <tbody className="divide-y divide-zinc-800">
//                         {loading ? (
//                             [...Array(5)].map((_, i) => (
//                                 <tr key={i} className="animate-pulse">
//                                     <td className="px-6 py-4">
//                                         <div className="flex items-center gap-3">
//                                             <div className="h-8 w-8 bg-zinc-700 rounded-full"></div>
//                                             <div className="space-y-1">
//                                                 <div className="h-4 w-24 bg-zinc-700 rounded"></div>
//                                                 <div className="h-3 w-32 bg-zinc-700 rounded"></div>
//                                             </div>
//                                         </div>
//                                     </td>
//                                     {/* skeleton WA */}
//                                     <td className="px-6 py-4">
//                                         <div className="h-6 w-28 bg-zinc-700 rounded"></div>
//                                     </td>
//                                     <td className="px-6 py-4">
//                                         <div className="h-6 w-16 bg-zinc-700 rounded-full"></div>
//                                     </td>
//                                     <td className="px-6 py-4">
//                                         <div className="h-4 w-16 bg-zinc-700 rounded"></div>
//                                     </td>
//                                     <td className="px-6 py-4">
//                                         <div className="h-4 w-24 bg-zinc-700 rounded"></div>
//                                     </td>
//                                     <td className="px-6 py-4">
//                                         <div className="h-4 w-16 bg-zinc-700 rounded"></div>
//                                     </td>
//                                     <td className="px-6 py-4">
//                                         <div className="flex gap-2">
//                                             <div className="h-6 w-16 bg-zinc-700 rounded"></div>
//                                             <div className="h-6 w-16 bg-zinc-700 rounded"></div>
//                                         </div>
//                                     </td>
//                                 </tr>
//                             ))
//                         ) : filteredData.length === 0 ? (
//                             <tr>
//                                 {/* colSpan naik 1 karena tambah kolom WA */}
//                                 <td colSpan="7" className="px-6 py-12 text-center">
//                                     <Users className="h-12 w-12 text-zinc-500 mx-auto mb-4" />
//                                     <p className="text-zinc-400">No users found</p>
//                                 </td>
//                             </tr>
//                         ) : (
//                             filteredData.map((user) => {
//                                 const now = new Date();
//                                 const expiredAt = user.expired_at ? new Date(user.expired_at) : null;
//                                 const isExpired = expiredAt && expiredAt < now;
//                                 const isActive = user.is_active && !isExpired;
//
//                                 // ensure defaults exist
//                                 if (!activationForm[user.id]) primeActivationDefaults(user);
//                                 if (isExpired && !extendForm[user.id]) primeExtendDefaults(user);
//                                 if (!updateForm[user.id]) primeUpdateDefaults(user);
//
//                                 const act = activationForm[user.id] || { jenis_aktivasi: "silver", duration_days: 30 };
//                                 const ext = extendForm[user.id] || { additional_days: 2, new_jenis_aktivasi: "silver" };
//                                 const upd = updateForm[user.id] || { name: "", email: "", jenis_aktivasi: "silver" };
//                                 const daysLeft = getDaysLeft(user.expired_at);
//
//                                 // NEW: nomor WA ter-normalisasi
//                                 const waNum = toWaNumber(user.phone);
//
//                                 return (
//                                     <tr key={user.id} className="hover:bg-zinc-800/30 transition-colors">
//                                         <td className="px-6 py-4">
//                                             <div className="flex items-center gap-3">
//                                                 <div className="h-8 w-8 rounded-full bg-gradient-to-r from-cyan-500 to-indigo-600 flex items-center justify-center">
//                                                     <span className="text-xs font-medium text-white">
//                                                         {user.name?.charAt(0).toUpperCase() ||
//                                                             user.email?.charAt(0).toUpperCase() ||
//                                                             "U"}
//                                                     </span>
//                                                 </div>
//                                                 <div className="space-y-1">
//                                                     {editMode[user.id] ? (
//                                                         <>
//                                                             <input
//                                                                 value={upd.name}
//                                                                 onChange={(e) =>
//                                                                     setUpdateForm((p) => ({
//                                                                         ...p,
//                                                                         [user.id]: { ...p[user.id], name: e.target.value }
//                                                                     }))
//                                                                 }
//                                                                 className="px-2 py-1 bg-zinc-800 border border-zinc-700 text-white rounded-md text-xs w-48"
//                                                                 placeholder="Name"
//                                                             />
//                                                             <input
//                                                                 value={upd.email}
//                                                                 onChange={(e) =>
//                                                                     setUpdateForm((p) => ({
//                                                                         ...p,
//                                                                         [user.id]: { ...p[user.id], email: e.target.value }
//                                                                     }))
//                                                                 }
//                                                                 className="px-2 py-1 bg-zinc-800 border border-zinc-700 text-white rounded-md text-xs w-56"
//                                                                 placeholder="Email"
//                                                             />
//                                                         </>
//                                                     ) : (
//                                                         <>
//                                                             <p className="text-sm font-medium text-white">{user.name || "Unnamed User"}</p>
//                                                             <p className="text-xs text-zinc-400">{user.email}</p>
//                                                         </>
//                                                     )}
//                                                 </div>
//                                             </div>
//                                         </td>
//
//                                         {/* NEW: kolom Nomor WA */}
//                                         <td className="px-6 py-4">
//                                             {waNum ? (
//                                                 <a
//                                                     href={`https://wa.me/${waNum}`}
//                                                     target="_blank"
//                                                     rel="noreferrer"
//                                                     className="inline-flex items-center gap-2 px-2 py-1 rounded-md bg-green-900/20 text-green-300 border border-green-500/30 hover:bg-green-900/40"
//                                                     title={`Chat ${waNum} on WhatsApp`}
//                                                 >
//                                                     <Smartphone className="h-4 w-4" />
//                                                     <span className="font-mono">{waNum}</span>
//                                                 </a>
//                                             ) : (
//                                                 <span className="text-zinc-400">—</span>
//                                             )}
//                                         </td>
//
//                                         <td className="px-6 py-4">
//                                             {!user.is_active ? (
//                                                 <span className="px-2 py-1 text-xs rounded-full bg-gray-900/20 text-gray-400 border border-gray-500/30">
//                                                     Inactive
//                                                 </span>
//                                             ) : isExpired ? (
//                                                 <span className="px-2 py-1 text-xs rounded-full bg-red-900/20 text-red-400 border border-red-500/30">
//                                                     Expired
//                                                 </span>
//                                             ) : isActive ? (
//                                                 <span className="px-2 py-1 text-xs rounded-full bg-emerald-900/20 text-emerald-400 border border-emerald-500/30">
//                                                     Active
//                                                 </span>
//                                             ) : (
//                                                 <span className="px-2 py-1 text-xs rounded-full bg-yellow-900/20 text-yellow-400 border border-yellow-500/30">
//                                                     Pending
//                                                 </span>
//                                             )}
//                                         </td>
//
//                                         <td className="px-6 py-4">
//                                             {editMode[user.id] ? (
//                                                 <select
//                                                     value={upd.jenis_aktivasi}
//                                                     onChange={(e) =>
//                                                         setUpdateForm((p) => ({
//                                                             ...p,
//                                                             [user.id]: { ...p[user.id], jenis_aktivasi: e.target.value }
//                                                         }))
//                                                     }
//                                                     className="px-2 py-1 bg-zinc-800 border border-zinc-700 text-white rounded-md text-xs"
//                                                 >
//                                                     {ACTIVATION_TYPES.map((t) => (
//                                                         <option key={t} value={t}>
//                                                             {t}
//                                                         </option>
//                                                     ))}
//                                                 </select>
//                                             ) : (
//                                                 <span
//                                                     className={`text-sm font-medium ${
//                                                         user.jenis_aktivasi?.toLowerCase() === "gold"
//                                                             ? "text-yellow-400"
//                                                             : user.jenis_aktivasi?.toLowerCase() === "silver"
//                                                                 ? "text-gray-400"
//                                                                 : user.jenis_aktivasi?.toLowerCase() === "platinum"
//                                                                     ? "text-cyan-300"
//                                                                     : user.jenis_aktivasi?.toLowerCase() === "unlimited"
//                                                                         ? "text-emerald-400"
//                                                                         : "text-cyan-400"
//                                                     }`}
//                                                 >
//                                                     {user.jenis_aktivasi || "standard"}
//                                                 </span>
//                                             )}
//                                         </td>
//
//                                         <td className="px-6 py-4 text-sm text-zinc-300">
//                                             {user.expired_at ? new Date(user.expired_at).toLocaleDateString() : "Never"}
//                                         </td>
//
//                                         {/* NEW: Days Left */}
//                                         <td className="px-6 py-4 text-sm">
//                                             {user.jenis_aktivasi?.toLowerCase() === "unlimited" ? (
//                                                 <span className="text-emerald-400 font-medium">∞ Unlimited</span>
//                                             ) : daysLeft === null ? (
//                                                 <span className="text-zinc-400">—</span>
//                                             ) : daysLeft >= 0 ? (
//                                                 <span className="text-emerald-400">{daysLeft} day{daysLeft === 1 ? "" : "s"} left</span>
//                                             ) : (
//                                                 <span className="text-red-400">expired {Math.abs(daysLeft)} day{Math.abs(daysLeft) === 1 ? "" : "s"} ago</span>
//                                             )}
//                                         </td>
//
//                                         <td className="px-6 py-4">
//                                             <div className="relative">
//                                                 <button
//                                                     onClick={() =>
//                                                         setOpenActionMenu((p) => ({ ...p, [user.id]: !p[user.id] }))
//                                                     }
//                                                     className="px-3 py-1 rounded-lg text-xs font-medium bg-zinc-800 text-white border border-zinc-700 hover:bg-zinc-700/60"
//                                                 >
//                                                     Actions
//                                                 </button>
//
//                                                 {openActionMenu[user.id] && (
//                                                     <div className="absolute z-10 mt-2 w-48 bg-zinc-900 border border-zinc-700 rounded-lg shadow-lg p-2 space-y-1">
//                                                         {/* Inactive -> buka modal Activate */}
//                                                         {!user.is_active && (
//                                                             <button
//                                                                 onClick={() =>
//                                                                     setModalAction({
//                                                                         type: "activate",
//                                                                         user,
//                                                                         form: { jenis: act.jenis_aktivasi, days: act.duration_days },
//                                                                     })
//                                                                 }
//                                                                 className="w-full flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium bg-emerald-900/20 text-emerald-400 hover:bg-emerald-900/40"
//                                                             >
//                                                                 <UserCheck className="h-3 w-3" /> Activate
//                                                             </button>
//                                                         )}
//
//                                                         {/* Expired -> buka modal Extend */}
//                                                         {isExpired && (
//                                                             <button
//                                                                 onClick={() =>
//                                                                     setModalAction({
//                                                                         type: "extend",
//                                                                         user,
//                                                                         form: { jenis: ext.new_jenis_aktivasi, days: ext.additional_days },
//                                                                     })
//                                                                 }
//                                                                 className="w-full flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium bg-blue-900/20 text-blue-400 hover:bg-blue-900/40"
//                                                             >
//                                                                 <UserPlus className="h-3 w-3" /> Extend
//                                                             </button>
//                                                         )}
//
//                                                         {/* Active -> langsung Deactivate */}
//                                                         {isActive && (
//                                                             <ActionButton
//                                                                 userId={user.id}
//                                                                 action="deactivate"
//                                                                 icon={UserX}
//                                                                 className="w-full justify-start bg-red-900/20 text-red-400 hover:bg-red-900/40"
//                                                             >
//                                                                 Deactivate
//                                                             </ActionButton>
//                                                         )}
//
//                                                         {/* Edit / Delete */}
//                                                         {!editMode[user.id] ? (
//                                                             <>
//                                                                 <button
//                                                                     onClick={() => {
//                                                                         setEditMode((p) => ({ ...p, [user.id]: true }));
//                                                                         setOpenActionMenu((p) => ({ ...p, [user.id]: false }));
//                                                                     }}
//                                                                     className="w-full flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium bg-zinc-800 text-zinc-200 hover:bg-zinc-700/60"
//                                                                 >
//                                                                     <Pencil className="h-3 w-3" /> Edit
//                                                                 </button>
//                                                                 <ActionButton
//                                                                     userId={user.id}
//                                                                     action="delete"
//                                                                     icon={Trash2}
//                                                                     danger
//                                                                     className="w-full justify-start bg-red-900/20 text-red-400 hover:bg-red-900/40"
//                                                                 >
//                                                                     Delete
//                                                                 </ActionButton>
//                                                             </>
//                                                         ) : (
//                                                             <>
//                                                                 <ActionButton
//                                                                     userId={user.id}
//                                                                     action="update"
//                                                                     icon={Save}
//                                                                     className="w-full justify-start bg-emerald-900/20 text-emerald-400 hover:bg-emerald-900/40"
//                                                                     payload={{
//                                                                         name: String(updateForm[user.id]?.name || ""),
//                                                                         email: String(updateForm[user.id]?.email || ""),
//                                                                         jenis_aktivasi: String(updateForm[user.id]?.jenis_aktivasi || "silver"),
//                                                                     }}
//                                                                 >
//                                                                     Save
//                                                                 </ActionButton>
//                                                                 <button
//                                                                     onClick={() => setEditMode((p) => ({ ...p, [user.id]: false }))}
//                                                                     className="w-full flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium bg-zinc-800 text-zinc-200 hover:bg-zinc-700/60"
//                                                                 >
//                                                                     <XIcon className="h-3 w-3" /> Cancel
//                                                                 </button>
//                                                             </>
//                                                         )}
//
//                                                         {/* Reset Device */}
//                                                         <ActionButton
//                                                             userId={user.id}
//                                                             action="reset-device"
//                                                             icon={Smartphone}
//                                                             className="w-full justify-start bg-orange-900/20 text-orange-400 hover:bg-orange-900/40"
//                                                         >
//                                                             Reset Device
//                                                         </ActionButton>
//                                                     </div>
//                                                 )}
//                                             </div>
//                                         </td>
//                                     </tr>
//                                 );
//                             })
//                         )}
//                         </tbody>
//                     </table>
//                 </div>
//             </div>
//             <ActionModal
//                 modalAction={modalAction}
//                 setModalAction={setModalAction}
//                 onConfirm={({ type, user, form }) => {
//                     if (type === "activate") {
//                         handleUserAction(user.id, "activate", {
//                             jenis_aktivasi: form.jenis,
//                             duration_days: form.days,
//                         });
//                     } else if (type === "extend") {
//                         handleUserAction(user.id, "extend", {
//                             new_jenis_aktivasi: form.jenis,
//                             additional_days: form.days,
//                         });
//                     }
//                 }}
//             />
//         </div>
//     );
// }

