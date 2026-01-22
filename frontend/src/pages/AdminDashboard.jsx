// import { useState, useEffect } from "react";
// import axios from "../config/axios";
// import {
//     Users,
//     Shield,
//     CheckCircle2,
//     XCircle,
//     Clock,
//     AlertTriangle,
//     RefreshCw,
//     Filter,
//     Search,
//     Eye,
//     Calendar
// } from "lucide-react";
//
// export default function AdminDashboard() {
//     const [users, setUsers] = useState([]);
//     const [loading, setLoading] = useState(true);
//     const [error, setError] = useState(null);
//     const [filter, setFilter] = useState('all');
//     const [searchTerm, setSearchTerm] = useState('');
//     const [page, setPage] = useState(1);
//     const [limit, setLimit] = useState(10);
//     const [serverPageInfo, setServerPageInfo] = useState({ total: 0, pages: 0 });
//
//     useEffect(() => {
//         fetchUsers();
//     }, [filter]);
//
//     const fetchUsers = async () => {
//         setLoading(true);
//         setError(null);
//
//         try {
//             let url = '/api/users';
//             if (filter !== 'all') {
//                 url = `/api/users/activation-status/${filter}`;
//             }
//
//             const { data } = await axios.get(url, { params: { page, limit } });
//             const list = Array.isArray(data) ? data : data.users || [];
//             setUsers(list);
//
//             const pg = data.pagination || {};
//             setServerPageInfo({
//                 total: pg.total ?? list.length,
//                 pages: pg.pages ?? 1,
//             });
//         } catch (err) {
//             console.error("Error fetching users:", err);
//             setError(err.response?.data?.message || "Failed to fetch users");
//         } finally {
//             setLoading(false);
//         }
//     };
//
//     useEffect(() => {
//         fetchUsers();
//     }, [filter, page, limit]);
//
//     const filteredUsers = users.filter(user =>
//         user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//         user.email?.toLowerCase().includes(searchTerm.toLowerCase())
//     );
//
//     const summary = {
//         total: users.length,
//         active: users.filter((u) => {
//             const now = new Date();
//             const exp = u.expired_at ? new Date(u.expired_at) : null;
//             return u.is_active && (!exp || exp > now);
//         }).length,
//         expired: users.filter((u) => {
//             const now = new Date();
//             const exp = u.expired_at ? new Date(u.expired_at) : null;
//             return exp && exp < now;
//         }).length,
//         inactive: users.filter((u) => !u.is_active).length,
//         pending: users.filter((u) => u.is_active && !u.expired_at).length,
//         silver: users.filter((u) => (u.jenis_aktivasi || "").toLowerCase() === "silver").length,
//         gold: users.filter((u) => (u.jenis_aktivasi || "").toLowerCase() === "gold").length,
//         platinum: users.filter((u) => (u.jenis_aktivasi || "").toLowerCase() === "platinum").length,
//         unlimited: users.filter((u) => (u.jenis_aktivasi || "").toLowerCase() === "unlimited").length,
//     };
//
//
//     const getStatusBadge = (user) => {
//         if (!user.is_active) {
//             return <span className="px-2 py-1 text-xs rounded-full bg-gray-900/20 text-gray-400 border border-gray-500/30">Inactive</span>;
//         }
//
//         const now = new Date();
//         const expiredAt = user.expired_at ? new Date(user.expired_at) : null;
//
//         if (expiredAt && expiredAt < now) {
//             return <span className="px-2 py-1 text-xs rounded-full bg-red-900/20 text-red-400 border border-red-500/30">Expired</span>;
//         }
//
//         if (user.is_active && (!expiredAt || expiredAt > now)) {
//             return <span className="px-2 py-1 text-xs rounded-full bg-emerald-900/20 text-emerald-400 border border-emerald-500/30">Active</span>;
//         }
//
//         return <span className="px-2 py-1 text-xs rounded-full bg-yellow-900/20 text-yellow-400 border border-yellow-500/30">Pending</span>;
//     };
//
//     const getActivationTypeColor = (type) => {
//         switch (type?.toLowerCase()) {
//             case 'gold':
//                 return 'text-yellow-400';
//             case 'silver':
//                 return 'text-gray-400';
//             case 'bronze':
//                 return 'text-orange-400';
//             default:
//                 return 'text-cyan-400';
//         }
//     };
//
//     if (error) {
//         return (
//             <div className="flex items-center justify-center h-96">
//                 <div className="text-center">
//                     <AlertTriangle className="h-16 w-16 text-red-400 mx-auto mb-4" />
//                     <h3 className="text-lg font-semibold text-white mb-2">Error Loading Data</h3>
//                     <p className="text-zinc-400 mb-4">{error}</p>
//                     <button
//                         onClick={fetchUsers}
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
//                     <h2 className="text-2xl font-bold text-white">Admin Dashboard</h2>
//                     <p className="text-zinc-400">Monitor user activation status and manage users</p>
//                 </div>
//
//                 <button
//                     onClick={fetchUsers}
//                     disabled={loading}
//                     className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors disabled:opacity-50"
//                 >
//                     <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
//                     Refresh
//                 </button>
//             </div>
//
//             {/* Filters and Search */}
//             <div className="flex flex-col sm:flex-row gap-4">
//                 <div className="flex items-center gap-2">
//                     <Filter className="h-4 w-4 text-zinc-400" />
//                     <select
//                         value={filter}
//                         onChange={(e) => setFilter(e.target.value)}
//                         className="px-3 py-2 bg-zinc-800 border border-zinc-700 text-white rounded-lg text-sm focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none"
//                     >
//                         <option value="all">All Users</option>
//                         <option value="active">Active</option>
//                         <option value="expired">Expired</option>
//                         <option value="pending">Pending</option>
//                     </select>
//                 </div>
//
//                 <div className="flex-1 flex items-center gap-2">
//                     <Search className="h-4 w-4 text-zinc-400" />
//                     <input
//                         type="text"
//                         placeholder="Search users..."
//                         value={searchTerm}
//                         onChange={(e) => setSearchTerm(e.target.value)}
//                         className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 text-white rounded-lg text-sm focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none"
//                     />
//                 </div>
//             </div>
//
//             {/* Pagination Controls */}
//             <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-4">
//                 <div className="flex items-center gap-2">
//                     <span className="text-sm text-zinc-300">Rows per page</span>
//                     <select
//                         value={limit}
//                         onChange={(e) => {
//                             setPage(1); // reset ke page 1 saat ganti limit
//                             setLimit(parseInt(e.target.value, 10));
//                         }}
//                         className="px-2 py-1 bg-zinc-800 border border-zinc-700 text-white rounded-md text-sm"
//                     >
//                         {[10, 25, 50, 100, 1000].map((n) => (
//                             <option key={n} value={n}>{n}</option>
//                         ))}
//                     </select>
//                 </div>
//
//                 <div className="flex items-center gap-3">
//     <span className="text-sm text-zinc-400">
//       Page <span className="text-zinc-200 font-medium">{page}</span> of{" "}
//         <span className="text-zinc-200 font-medium">{serverPageInfo.pages || 1}</span>{" "}
//         — Total{" "}
//         <span className="text-zinc-200 font-medium">{serverPageInfo.total ?? 0}</span>
//     </span>
//
//                     <div className="flex items-center gap-2">
//                         <button
//                             onClick={() => setPage((p) => Math.max(1, p - 1))}
//                             disabled={page <= 1 || loading}
//                             className="px-3 py-1 bg-zinc-800 border border-zinc-700 text-white rounded-lg text-sm disabled:opacity-50 hover:bg-zinc-700/60"
//                         >
//                             Prev
//                         </button>
//                         <button
//                             onClick={() =>
//                                 setPage((p) => (serverPageInfo.pages ? Math.min(serverPageInfo.pages, p + 1) : p + 1))
//                             }
//                             disabled={loading || (serverPageInfo.pages ? page >= serverPageInfo.pages : false)}
//                             className="px-3 py-1 bg-zinc-800 border border-zinc-700 text-white rounded-lg text-sm disabled:opacity-50 hover:bg-zinc-700/60"
//                         >
//                             Next
//                         </button>
//                     </div>
//                 </div>
//             </div>
//
//             {/* Summary Cards */}
//             <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
//                 <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 text-center">
//                     <p className="text-sm text-zinc-400">All Users</p>
//                     <p className="text-xl font-bold text-white">{summary.total}</p>
//                 </div>
//                 <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 text-center">
//                     <p className="text-sm text-zinc-400">Active</p>
//                     <p className="text-xl font-bold text-emerald-400">{summary.active}</p>
//                 </div>
//                 <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 text-center">
//                     <p className="text-sm text-zinc-400">Inactive</p>
//                     <p className="text-xl font-bold text-gray-400">{summary.inactive}</p>
//                 </div>
//                 <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 text-center">
//                     <p className="text-sm text-zinc-400">Pending</p>
//                     <p className="text-xl font-bold text-yellow-400">{summary.pending}</p>
//                 </div>
//                 <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 text-center">
//                     <p className="text-sm text-zinc-400">Expired</p>
//                     <p className="text-xl font-bold text-red-400">{summary.expired}</p>
//                 </div>
//                 <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 text-center">
//                     <p className="text-sm text-zinc-400">Silver</p>
//                     <p className="text-xl font-bold text-gray-400">{summary.silver}</p>
//                 </div>
//                 <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 text-center">
//                     <p className="text-sm text-zinc-400">Gold</p>
//                     <p className="text-xl font-bold text-yellow-400">{summary.gold}</p>
//                 </div>
//                 <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 text-center">
//                     <p className="text-sm text-zinc-400">Platinum</p>
//                     <p className="text-xl font-bold text-cyan-300">{summary.platinum}</p>
//                 </div>
//                 <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 text-center">
//                     <p className="text-sm text-zinc-400">Unlimited</p>
//                     <p className="text-xl font-bold text-emerald-400">{summary.unlimited}</p>
//                 </div>
//             </div>
//             {/* Users Table */}
//             <div className="bg-zinc-900/50 backdrop-blur-xl rounded-xl border border-zinc-800/70 overflow-hidden">
//                 <div className="overflow-x-auto">
//                     <table className="w-full">
//                         <thead className="bg-zinc-800/50">
//                         <tr>
//                             <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
//                                 User
//                             </th>
//                             <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
//                                 Role
//                             </th>
//                             <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
//                                 Status
//                             </th>
//                             <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
//                                 Activation Type
//                             </th>
//                             <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
//                                 Expired At
//                             </th>
//                             <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
//                                 Last Login
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
//                                     <td className="px-6 py-4">
//                                         <div className="h-4 w-16 bg-zinc-700 rounded"></div>
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
//                                         <div className="h-4 w-24 bg-zinc-700 rounded"></div>
//                                     </td>
//                                 </tr>
//                             ))
//                         ) : filteredUsers.length === 0 ? (
//                             <tr>
//                                 <td colSpan="6" className="px-6 py-12 text-center">
//                                     <Users className="h-12 w-12 text-zinc-500 mx-auto mb-4" />
//                                     <p className="text-zinc-400">No users found</p>
//                                 </td>
//                             </tr>
//                         ) : (
//                             filteredUsers.map((user) => (
//                                 <tr key={user.id} className="hover:bg-zinc-800/30 transition-colors">
//                                     <td className="px-6 py-4">
//                                         <div className="flex items-center gap-3">
//                                             <div className="h-8 w-8 rounded-full bg-gradient-to-r from-cyan-500 to-indigo-600 flex items-center justify-center">
//                                                     <span className="text-xs font-medium text-white">
//                                                         {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U'}
//                                                     </span>
//                                             </div>
//                                             <div>
//                                                 <p className="text-sm font-medium text-white">
//                                                     {user.name || 'Unnamed User'}
//                                                 </p>
//                                                 <p className="text-xs text-zinc-400">{user.email}</p>
//                                             </div>
//                                         </div>
//                                     </td>
//                                     <td className="px-6 py-4">
//                                             <span className="px-2 py-1 text-xs rounded-full bg-indigo-900/20 text-indigo-400 border border-indigo-500/30">
//                                                 {user.role || 'user'}
//                                             </span>
//                                     </td>
//                                     <td className="px-6 py-4">
//                                         {getStatusBadge(user)}
//                                     </td>
//                                     <td className="px-6 py-4">
//                                             <span className={`text-sm font-medium ${getActivationTypeColor(user.jenis_aktivasi)}`}>
//                                                 {user.jenis_aktivasi || 'standard'}
//                                             </span>
//                                     </td>
//                                     <td className="px-6 py-4 text-sm text-zinc-300">
//                                         {user.expired_at ? new Date(user.expired_at).toLocaleDateString() : 'Never'}
//                                     </td>
//                                     <td className="px-6 py-4 text-sm text-zinc-300">
//                                         {user.last_login_at ? new Date(user.last_login_at).toLocaleDateString() : 'Never'}
//                                     </td>
//                                 </tr>
//                             ))
//                         )}
//                         </tbody>
//                     </table>
//                 </div>
//             </div>
//         </div>
//     );
// }

import { useState, useEffect, useMemo } from "react";
import axios from "../config/axios";
import {
    Users,
    AlertTriangle,
    RefreshCw,
    Filter,
    Search,
    Coins,
    CalendarDays,
    Clock,
} from "lucide-react";

function getDaysLeft(expiresAt) {
    if (!expiresAt) return null;
    const now = new Date();
    const exp = new Date(expiresAt);
    const diffMs = exp.getTime() - now.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export default function AdminDashboard() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // client-side filters
    const [filter, setFilter] = useState("all"); // all | active | inactive | coins_expired | coins_expiring
    const [searchTerm, setSearchTerm] = useState("");

    // server-side pagination (tetap dipakai, filter dilakukan di client)
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [serverPageInfo, setServerPageInfo] = useState({ total: 0, pages: 0 });

    const fetchUsers = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data } = await axios.get("/api/users", { params: { page, limit } });
            const list = Array.isArray(data) ? data : data.users || [];
            setUsers(list);

            const pg = data.pagination || {};
            setServerPageInfo({
                total: pg.total ?? list.length,
                pages: pg.pages ?? 1,
            });
        } catch (err) {
            console.error("Error fetching users:", err);
            setError(err.response?.data?.message || "Failed to fetch users");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, limit]);

    const filteredUsers = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        return users
            .filter((u) => {
                // search
                if (
                    term &&
                    !(
                        (u.name || "").toLowerCase().includes(term) ||
                        (u.email || "").toLowerCase().includes(term)
                    )
                ) {
                    return false;
                }

                // status/coin filters
                const isActive = !!u.is_active;
                const daysLeft = getDaysLeft(u.coin_expires_at);

                if (filter === "active") return isActive;
                if (filter === "inactive") return !isActive;
                if (filter === "coins_expired") return u.coin_expires_at && daysLeft !== null && daysLeft < 0;
                if (filter === "coins_expiring") return u.coin_expires_at && daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;

                return true; // all
            });
    }, [users, searchTerm, filter]);

    // summary cards (berbasis koin)
    const summary = useMemo(() => {
        const total = users.length;
        const active = users.filter((u) => !!u.is_active).length;
        const inactive = users.filter((u) => !u.is_active).length;

        const coinsExpired = users.filter(
            (u) => u.coin_expires_at && getDaysLeft(u.coin_expires_at) < 0
        ).length;

        const coinsExpSoon = users.filter(
            (u) =>
                u.coin_expires_at &&
                getDaysLeft(u.coin_expires_at) !== null &&
                getDaysLeft(u.coin_expires_at) >= 0 &&
                getDaysLeft(u.coin_expires_at) <= 7
        ).length;

        const totalCoins = users.reduce((acc, u) => acc + (u.coin_balance ?? 0), 0);
        const avgCoins = total ? Math.round(totalCoins / total) : 0;

        return { total, active, inactive, coinsExpired, coinsExpSoon, totalCoins, avgCoins };
    }, [users]);

    const statusBadge = (u) =>
        u.is_active ? (
            <span className="px-2 py-1 text-xs rounded-full bg-emerald-900/20 text-emerald-400 border border-emerald-500/30">
        Active
      </span>
        ) : (
            <span className="px-2 py-1 text-xs rounded-full bg-gray-900/20 text-gray-400 border border-gray-500/30">
        Inactive
      </span>
        );

    if (error) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <AlertTriangle className="h-16 w-16 text-red-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">Error Loading Data</h3>
                    <p className="text-zinc-400 mb-4">{error}</p>
                    <button
                        onClick={fetchUsers}
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
                    <h2 className="text-2xl font-bold text-white">Admin Dashboard (Coins)</h2>
                    <p className="text-zinc-400">Monitor status user & metrik koin</p>
                </div>

                <button
                    onClick={fetchUsers}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                    <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    Refresh
                </button>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-zinc-400" />
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="px-3 py-2 bg-zinc-800 border border-zinc-700 text-white rounded-lg text-sm focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none"
                    >
                        <option value="all">All</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="coins_expired">Coins Expired</option>
                        <option value="coins_expiring">Coins Expiring ≤ 7 days</option>
                    </select>
                </div>

                <div className="flex-1 flex items-center gap-2">
                    <Search className="h-4 w-4 text-zinc-400" />
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 text-white rounded-lg text-sm focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none"
                    />
                </div>
            </div>

            {/* Pagination */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-4">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-zinc-300">Rows per page</span>
                    <select
                        value={limit}
                        onChange={(e) => {
                            setPage(1);
                            setLimit(parseInt(e.target.value, 10));
                        }}
                        className="px-2 py-1 bg-zinc-800 border border-zinc-700 text-white rounded-md text-sm"
                    >
                        {[10, 25, 50, 100, 1000].map((n) => (
                            <option key={n} value={n}>
                                {n}
                            </option>
                        ))}
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
                            onClick={() =>
                                setPage((p) => (serverPageInfo.pages ? Math.min(serverPageInfo.pages, p + 1) : p + 1))
                            }
                            disabled={loading || (serverPageInfo.pages ? page >= serverPageInfo.pages : false)}
                            className="px-3 py-1 bg-zinc-800 border border-zinc-700 text-white rounded-lg text-sm disabled:opacity-50 hover:bg-zinc-700/60"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>

            {/* Summary Cards (coin-based) */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 text-center">
                    <p className="text-sm text-zinc-400">All Users</p>
                    <p className="text-xl font-bold text-white">{summary.total}</p>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 text-center">
                    <p className="text-sm text-zinc-400">Active</p>
                    <p className="text-xl font-bold text-emerald-400">{summary.active}</p>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 text-center">
                    <p className="text-sm text-zinc-400">Inactive</p>
                    <p className="text-xl font-bold text-gray-400">{summary.inactive}</p>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 text-center">
                    <p className="text-sm text-zinc-400">Coins Expired</p>
                    <p className="text-xl font-bold text-red-400">{summary.coinsExpired}</p>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 text-center">
                    <p className="text-sm text-zinc-400">Expiring ≤7d</p>
                    <p className="text-xl font-bold text-yellow-400">{summary.coinsExpSoon}</p>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 text-center">
                    <p className="text-sm text-zinc-400">Total Coins</p>
                    <p className="text-xl font-bold text-cyan-300">{summary.totalCoins}</p>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 text-center">
                    <p className="text-sm text-zinc-400">Avg Coins</p>
                    <p className="text-xl font-bold text-cyan-300">{summary.avgCoins}</p>
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-zinc-900/50 backdrop-blur-xl rounded-xl border border-zinc-800/70 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-zinc-800/50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                                User
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                                Role
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                                Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                                Coins
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                                Coin Expires
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                                Days Left
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                                Last Login
                            </th>
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
                                    <td className="px-6 py-4"><div className="h-4 w-16 bg-zinc-700 rounded"></div></td>
                                    <td className="px-6 py-4"><div className="h-6 w-16 bg-zinc-700 rounded-full"></div></td>
                                    <td className="px-6 py-4"><div className="h-4 w-16 bg-zinc-700 rounded"></div></td>
                                    <td className="px-6 py-4"><div className="h-4 w-24 bg-zinc-700 rounded"></div></td>
                                    <td className="px-6 py-4"><div className="h-4 w-16 bg-zinc-700 rounded"></div></td>
                                    <td className="px-6 py-4"><div className="h-4 w-24 bg-zinc-700 rounded"></div></td>
                                </tr>
                            ))
                        ) : filteredUsers.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="px-6 py-12 text-center">
                                    <Users className="h-12 w-12 text-zinc-500 mx-auto mb-4" />
                                    <p className="text-zinc-400">No users found</p>
                                </td>
                            </tr>
                        ) : (
                            filteredUsers.map((u) => {
                                const daysLeft = getDaysLeft(u.coin_expires_at);
                                const balance = u.coin_balance ?? 0;
                                return (
                                    <tr key={u.id} className="hover:bg-zinc-800/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-gradient-to-r from-cyan-500 to-indigo-600 flex items-center justify-center">
                            <span className="text-xs font-medium text-white">
                              {u.name?.charAt(0).toUpperCase() ||
                                  u.email?.charAt(0).toUpperCase() ||
                                  "U"}
                            </span>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-white">
                                                        {u.name || "Unnamed User"}
                                                    </p>
                                                    <p className="text-xs text-zinc-400">{u.email}</p>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="px-6 py-4">
                        <span className="px-2 py-1 text-xs rounded-full bg-indigo-900/20 text-indigo-400 border border-indigo-500/30">
                          {u.role || "user"}
                        </span>
                                        </td>

                                        <td className="px-6 py-4">
                                            {statusBadge(u)}
                                        </td>

                                        <td className="px-6 py-4">
                                            <div className="inline-flex items-center gap-2 px-2 py-1 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-200">
                                                <Coins className="h-4 w-4" />
                                                <span className="font-semibold">{balance}</span>
                                            </div>
                                        </td>

                                        <td className="px-6 py-4 text-sm text-zinc-300">
                                            {u.coin_expires_at ? (
                                                <div className="inline-flex items-center gap-2">
                                                    <CalendarDays className="h-4 w-4 text-zinc-400" />
                                                    {new Date(u.coin_expires_at).toLocaleDateString()}
                                                </div>
                                            ) : (
                                                "—"
                                            )}
                                        </td>

                                        <td className="px-6 py-4 text-sm">
                                            {u.coin_expires_at == null ? (
                                                <span className="text-zinc-400">—</span>
                                            ) : daysLeft >= 0 ? (
                                                <span className={daysLeft <= 7 ? "text-yellow-400" : "text-emerald-400"}>
                            {daysLeft} day{daysLeft === 1 ? "" : "s"} left
                          </span>
                                            ) : (
                                                <span className="text-red-400">
                            expired {Math.abs(daysLeft)} day{Math.abs(daysLeft) === 1 ? "" : "s"} ago
                          </span>
                                            )}
                                        </td>

                                        <td className="px-6 py-4 text-sm text-zinc-300">
                                            {u.last_login_at ? new Date(u.last_login_at).toLocaleString() : "Never"}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
