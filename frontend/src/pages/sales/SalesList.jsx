import { useEffect, useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import axios from "../../config/axios";
import { Search, ChevronLeft, ChevronRight, Plus, Printer, FileText } from "lucide-react";
import { btnPrimary, btnGhost, inputBase, Th } from "../produk/_ui";

export default function SalesList() {
    const [params, setParams] = useSearchParams();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0, pages: 1 });

    // cache: user_id -> name
    const [userNameMap, setUserNameMap] = useState(() => ({}));

    const q = params.get("q") || "";
    const payment_status = params.get("payment_status") || "";
    const progress = params.get("progress") || "";
    const page = parseInt(params.get("page") || "1", 10);
    const limit = parseInt(params.get("limit") || "10", 10);
    const base_url = "https://api.onestopcheck.id";

    const hostname = window.location.hostname;
    const parts = hostname.split(".");
    const tenant = parts.length >= 2 ? parts[parts.length - 2] : hostname;

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get("/api/sales", { params: { q, payment_status, progress, page, limit } });
            const list = data?.sales ?? [];
            const p = data?.pagination ?? {};
            setRows(Array.isArray(list) ? list : []);
            setMeta({
                page: Number(p.page) || page,
                limit: Number(p.limit) || limit,
                total: Number(p.total) || 0,
                pages: Number(p.pages) || 1,
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [q, payment_status, progress, page, limit]);

    // collect unique user IDs that we don't have yet
    const missingUserIds = useMemo(() => {
        const ids = new Set(
            rows
                .map((r) => r.created_by_user_id)
                .filter((v) => !!v && typeof v === "string" && !(v in userNameMap))
        );
        return Array.from(ids);
    }, [rows, userNameMap]);

    // fetch names for missing IDs
    useEffect(() => {
        if (missingUserIds.length === 0) return;

        let cancelled = false;
        (async () => {
            try {
                const results = await Promise.allSettled(
                    missingUserIds.map((id) =>
                        axios
                            .get(`/api/users/${id}`)
                            .then((res) => ({ id, name: res?.data?.user?.name || res?.data?.name || "—" }))
                    )
                );

                if (cancelled) return;
                setUserNameMap((prev) => {
                    const next = { ...prev };
                    for (const r of results) {
                        if (r.status === "fulfilled") {
                            next[r.value.id] = r.value.name;
                        } else {
                            // mark as unknown to avoid refetch loop
                            const idx = missingUserIds[results.indexOf(r)];
                            if (idx) next[idx] = "—";
                        }
                    }
                    return next;
                });
            } catch {
                // noop: map is updated per-result above
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [missingUserIds]);

    const onSubmit = (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const next = new URLSearchParams(params);
        next.set("q", (f.get("q") || "").toString());
        next.set("payment_status", (f.get("payment_status") || "").toString());
        next.set("progress", (f.get("progress") || "").toString());
        next.set("page", "1");
        setParams(next);
    };

    const totalPages = meta.pages || Math.max(1, Math.ceil((meta.total || 0) / (meta.limit || 10)));

    // small helper to display processor name
    const renderProcessor = (row) => {
        // if backend already sends created_by_name, use it as a quick win
        if (row.created_by_name) return row.created_by_name;
        const id = row.created_by_user_id;
        if (!id) return "—";
        return userNameMap[id] || "Memuat…";
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">Daftar Penjualan</h2>
                <Link to="/sales/new" className={btnPrimary}>
                    <Plus className="h-4 w-4" /> Sales Baru
                </Link>
            </div>

            <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input name="q" defaultValue={q} placeholder="Cari resi / customer" className={`${inputBase} pl-9`} />
                </div>
                <select name="payment_status" defaultValue={payment_status} className={inputBase}>
                    <option value="">Semua Status Bayar</option>
                    <option value="lunas">Lunas</option>
                    <option value="dp">DP</option>
                </select>
                <select name="progress" defaultValue={progress} className={inputBase}>
                    <option value="">Semua Progress</option>
                    <option value="registered">Registered</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
                </select>
                <div>
                    <button className={btnGhost} type="submit">
                        Terapkan
                    </button>
                </div>
            </form>

            <div className="overflow-x-auto border border-slate-900/15 rounded-xl">
                <table className="w-full text-sm">
                    <thead>
                    <tr className="bg-slate-50">
                        <Th>Resi</Th>
                        <Th>Tanggal</Th>
                        <Th>Customer</Th>
                        <Th>Diproses oleh</Th>
                        <Th>Status Bayar</Th>
                        <Th>Progress</Th>
                        <Th>Total</Th>
                        <Th className="text-right pr-4">Aksi</Th>
                    </tr>
                    </thead>
                    <tbody>
                    {loading ? (
                        <tr>
                            <td colSpan={8} className="p-6 text-center">
                                Memuat...
                            </td>
                        </tr>
                    ) : rows.length === 0 ? (
                        <tr>
                            <td colSpan={8} className="p-6 text-center">
                                Tidak ada data
                            </td>
                        </tr>
                    ) : (
                        rows.map((s) => (
                            <tr key={s.id} className="border-t border-slate-900/10">
                                <td className="p-3 font-medium">
                                    <Link className="hover:underline" to={`/sales/${s.id}`}>
                                        {s.resi_no}
                                    </Link>
                                </td>
                                <td className="p-3">{new Date(s.created_at || s.createdAt).toLocaleString("id-ID")}</td>
                                <td className="p-3">{s.customer_name}</td>
                                <td className="p-3">{renderProcessor(s)}</td>
                                <td className="p-3 capitalize">{s.payment_status}</td>
                                <td className="p-3 capitalize">{s.progress_status}</td>
                                <td className="p-3">{Number(s.total ?? 0).toLocaleString("id-ID")}</td>
                                <td className="p-3 text-right pr-4 flex justify-end gap-2">
                                    <a
                                        className={btnGhost}
                                        href={`${base_url}/api/sales/${s.id}/print/nota?tenant=${tenant}`}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        <FileText className="h-4 w-4" /> Nota
                                    </a>
                                    <a
                                        className={btnGhost}
                                        href={`${base_url}/api/sales/${s.id}/print/spk?tenant=${tenant}`}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        <Printer className="h-4 w-4" /> SPK
                                    </a>
                                    <Link className={btnGhost} to={`/sales/${s.id}`}>
                                        Detail
                                    </Link>
                                </td>
                            </tr>
                        ))
                    )}
                    </tbody>
                </table>
            </div>

            <div className="flex items-center justify-between mt-3">
                <div className="text-sm text-slate-700/70">
                    Halaman {meta.page} dari {totalPages} • Total {meta.total}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        className={btnGhost}
                        onClick={() =>
                            setParams((prev) => {
                                const n = new URLSearchParams(prev);
                                n.set("page", String(Math.max(1, meta.page - 1)));
                                return n;
                            })
                        }
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                        className={btnGhost}
                        onClick={() =>
                            setParams((prev) => {
                                const n = new URLSearchParams(prev);
                                n.set("page", String(Math.min(totalPages, meta.page + 1)));
                                return n;
                            })
                        }
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
