// ──────────────────────────────────────────────────────────────────────────────
// File: src/pages/reports/Reports.jsx
// ──────────────────────────────────────────────────────────────────────────────
import { useEffect, useMemo, useState } from "react";
import axios from "../../config/axios";
import { inputBase, btnGhost, btnPrimary, formatCurrency } from "../produk/_ui";
import {
    BarChart3,
    RefreshCw,
    Calendar,
    Building2,
} from "lucide-react";
import {
    ResponsiveContainer,
    LineChart,
    Line,
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
} from "recharts";
import dayjs from "dayjs";

export default function Reports() {
    const [dateFrom, setDateFrom] = useState(dayjs().subtract(29, "day").format("YYYY-MM-DD"));
    const [dateTo, setDateTo] = useState(dayjs().format("YYYY-MM-DD"));
    const [branchId, setBranchId] = useState("");
    const [branches, setBranches] = useState([]);

    const [loading, setLoading] = useState(false);

    // ringkasan
    const [salesSummary, setSalesSummary] = useState({ total: 0, paid: 0, dp_count: 0, series: [] });
    const [expensesSummary, setExpensesSummary] = useState({ total: 0 });

    // charts
    const [salesVsExpenses, setSalesVsExpenses] = useState({ labels: [], series: [] });
    const [cashflow, setCashflow] = useState({ labels: [], series: [] });
    const [topProductsChart, setTopProductsChart] = useState({ labels: [], series: [] });

    // table top products
    const [topProducts, setTopProducts] = useState([]);

    // load branches for filter
    useEffect(() => {
        (async () => {
            try {
                const { data } = await axios.get("/api/branches");
                const list = data?.branches ?? data?.data ?? [];
                setBranches(list);
            } catch {}
        })();
    }, []);

    const params = useMemo(
        () => ({
            date_from: dateFrom,
            date_to: dateTo,
            ...(branchId ? { branch_id: branchId } : {}),
        }),
        [dateFrom, dateTo, branchId]
    );

    const load = async () => {
        setLoading(true);
        try {
            const [s, e, tp, svs, cf, tpc] = await Promise.all([
                axios.get("/api/reports/sales/summary", { params }),
                axios.get("/api/reports/expenses/summary", { params }),
                axios.get("/api/reports/top-products", { params: { ...params, limit: 10 } }),
                axios.get("/api/reports/charts/sales-vs-expenses", { params }),
                axios.get("/api/reports/charts/cashflow", { params }),
                axios.get("/api/reports/charts/top-products", { params: { ...params, limit: 10 } }),
            ]);

            setSalesSummary(s.data || {});
            setExpensesSummary(e.data || {});
            setTopProducts(tp.data?.top_products || []);
            setSalesVsExpenses(svs.data || { labels: [], series: [] });
            setCashflow(cf.data || { labels: [], series: [] });
            setTopProductsChart(tpc.data || { labels: [], series: [] });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dateFrom, dateTo, branchId]);

    const svsData = useMemo(() => {
        // gabung label + 2 series jadi array untuk recharts
        const labels = salesVsExpenses.labels || [];
        const s = salesVsExpenses.series || [];
        const map = {};
        labels.forEach((d, i) => {
            map[d] = { date: d };
        });
        s.forEach((ser) => {
            ser.data.forEach((v, idx) => {
                const d = labels[idx];
                map[d][ser.name] = v;
            });
        });
        return Object.values(map);
    }, [salesVsExpenses]);

    const cashflowData = useMemo(() => {
        const labels = cashflow.labels || [];
        const s = cashflow.series || [];
        const map = {};
        labels.forEach((d) => (map[d] = { date: d }));
        s.forEach((ser) => {
            ser.data.forEach((v, idx) => {
                const d = labels[idx];
                map[d][ser.name] = v;
            });
        });
        return Object.values(map);
    }, [cashflow]);

    const topProductsBarData = useMemo(() => {
        const labels = topProductsChart.labels || [];
        const s = topProductsChart.series || [];
        const out = labels.map((label, i) => {
            const row = { name: label };
            s.forEach((ser) => (row[ser.name] = ser.data[i] || 0));
            return row;
        });
        return out;
    }, [topProductsChart]);

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" /> Laporan
                </h2>
                <div className="flex gap-2">
                    <button className={btnGhost} onClick={load} disabled={loading}>
                        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Muat Ulang
                    </button>
                </div>
            </div>

            {/* Filter */}
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    load();
                }}
                className="grid grid-cols-1 md:grid-cols-4 gap-3"
            >
                <label className="block">
                    <span className="mb-1 block text-sm text-slate-600">Dari</span>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className={`${inputBase} pl-9`}
                        />
                    </div>
                </label>
                <label className="block">
                    <span className="mb-1 block text-sm text-slate-600">Sampai</span>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className={`${inputBase} pl-9`}
                        />
                    </div>
                </label>
                <label className="block">
                    <span className="mb-1 block text-sm text-slate-600">Cabang</span>
                    <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <select
                            value={branchId}
                            onChange={(e) => setBranchId(e.target.value)}
                            className={`${inputBase} pl-9`}
                        >
                            <option value="">Semua Cabang</option>
                            {branches.map((b) => (
                                <option key={b.id} value={b.id}>
                                    {b.code ? `${b.code} — ${b.name}` : b.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </label>
                <div className="flex items-end">
                    <button className={btnPrimary} disabled={loading}>
                        Terapkan
                    </button>
                </div>
            </form>

            {/* Ringkasan */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <StatCard title="Total Penjualan" value={formatCurrency(salesSummary.total || 0)} sub="Periode ini" />
                <StatCard title="Total Pengeluaran" value={formatCurrency(expensesSummary.total || 0)} sub="Periode ini" />
                <StatCard title="Transaksi DP" value={`${salesSummary.dp_count ?? 0} nota`} sub="Periode ini" />
            </div>

            {/* Chart: Sales vs Expenses */}
            <Section title="Penjualan vs Pengeluaran (Harian)">
                <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={svsData}>
                            <defs>
                                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4}/>
                                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.4}/>
                                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" fontSize={12} />
                            <YAxis fontSize={12} />
                            <Tooltip />
                            <Legend />
                            <Area type="monotone" dataKey="Penjualan" stroke="#0ea5e9" fill="url(#g1)" />
                            <Area type="monotone" dataKey="Pengeluaran" stroke="#f97316" fill="url(#g2)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </Section>

            {/* Chart: Cashflow */}
            <Section title="Cashflow (Harian)">
                <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={cashflowData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" fontSize={12} />
                            <YAxis fontSize={12} />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="Cash In" stroke="#22c55e" strokeWidth={2} dot={false} />
                            <Line type="monotone" dataKey="Cash Out" stroke="#ef4444" strokeWidth={2} dot={false} />
                            <Line type="monotone" dataKey="Net" stroke="#334155" strokeWidth={2} dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </Section>

            {/* Top Products */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Section title="Top Produk (Grafik)">
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topProductsBarData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" hide />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                {/* Nama seri mengikuti response: Revenue & Qty */}
                                <Bar dataKey="Revenue" fill="#0ea5e9" />
                                <Bar dataKey="Qty" fill="#f59e0b" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Section>

                <Section title="Top Produk (Tabel)">
                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                        <table className="w-full text-sm">
                            <thead>
                            <tr className="bg-slate-50 text-left">
                                <th className="p-3">Produk</th>
                                <th className="p-3">SKU</th>
                                <th className="p-3 text-right">Qty</th>
                                <th className="p-3 text-right">Revenue</th>
                            </tr>
                            </thead>
                            <tbody>
                            {topProducts.length === 0 ? (
                                <tr>
                                    <td className="p-4 text-center text-slate-500" colSpan={4}>
                                        Tidak ada data
                                    </td>
                                </tr>
                            ) : (
                                topProducts.map((r) => (
                                    <tr key={r.product_id} className="border-t border-slate-100">
                                        <td className="p-3">{r.product_name || "-"}</td>
                                        <td className="p-3">{r.sku || "-"}</td>
                                        <td className="p-3 text-right">{r.qty}</td>
                                        <td className="p-3 text-right">{formatCurrency(r.revenue)}</td>
                                    </tr>
                                ))
                            )}
                            </tbody>
                        </table>
                    </div>
                </Section>
            </div>
        </div>
    );
}

function StatCard({ title, value, sub }) {
    return (
        <div className="border border-slate-200 rounded-2xl p-4">
            <div className="text-sm text-slate-500">{title}</div>
            <div className="text-2xl font-bold mt-1">{value}</div>
            {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
        </div>
    );
}

function Section({ title, children }) {
    return (
        <div className="border border-slate-200 rounded-2xl p-4">
            <div className="text-sm font-semibold text-slate-700 mb-3">{title}</div>
            {children}
        </div>
    );
}
