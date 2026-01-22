import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import axios from "../../config/axios";
import { Plus, Search, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { btnPrimary, btnGhost, inputBase, Th, formatCurrency } from "../produk/_ui";

const TYPES = [
    { value: "", label: "Semua Tipe" },
    { value: "operational", label: "Operational" },
    { value: "raw_material_purchase", label: "Pembelian Bahan" },
    { value: "product_purchase", label: "Pembelian Produk" },
    { value: "other", label: "Lain-lain" },
];

export default function ExpenseList() {
    const [params, setParams] = useSearchParams();
    const [items, setItems] = useState([]);
    const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
    const [loading, setLoading] = useState(false);

    const q = params.get("q") || ""; // cari supplier_name / keterangan (optional di FE, BE tidak wajib)
    const type = params.get("type") || "";
    const date_from = params.get("date_from") || "";
    const date_to = params.get("date_to") || "";
    const page = parseInt(params.get("page") || "1", 10);
    const limit = parseInt(params.get("limit") || "10", 10);

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const query = { page, limit };
                if (type) query.type = type;
                if (date_from) query.date_from = date_from;
                if (date_to) query.date_to = date_to;

                const { data } = await axios.get("/api/expenses", { params: query });
                const list = data?.expenses ?? data?.data ?? [];
                const p = data?.pagination ?? {};
                setItems(Array.isArray(list) ? list : []);
                setMeta({
                    page: Number(p.page || page),
                    limit: Number(p.limit || limit),
                    total: Number(p.total || list.length || 0),
                    pages: Number(p.pages || Math.max(1, Math.ceil((p.total || 0) / (p.limit || 10)))),
                });
            } finally {
                setLoading(false);
            }
        })();
        // eslint-disable-next-line
    }, [type, date_from, date_to, page, limit]);

    const onSubmit = (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const next = new URLSearchParams(params);
        next.set("type", (fd.get("type") || "").toString());
        next.set("date_from", (fd.get("date_from") || "").toString());
        next.set("date_to", (fd.get("date_to") || "").toString());
        next.set("page", "1");
        setParams(next);
    };

    const totalPages = meta.pages || 1;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">Daftar Biaya</h2>
                <Link to="/expenses/new" className={btnPrimary}>
                    <Plus className="h-4 w-4" /> Tambah Biaya
                </Link>
            </div>

            {/* Filter */}
            <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <select name="type" defaultValue={type} className={inputBase}>
                    {TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                </select>
                <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input type="date" name="date_from" defaultValue={date_from} className={`${inputBase} pl-9`} />
                </div>
                <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input type="date" name="date_to" defaultValue={date_to} className={`${inputBase} pl-9`} />
                </div>
                <div className="flex gap-2">
                    <button className={btnGhost} type="submit">
                        <Search className="h-4 w-4" /> Terapkan
                    </button>
                </div>
            </form>

            {/* Tabel */}
            <div className="overflow-x-auto border border-slate-900/15 rounded-xl">
                <table className="w-full text-sm">
                    <thead>
                    <tr className="bg-slate-50">
                        <Th>Tanggal</Th>
                        <Th>Tipe</Th>
                        <Th>Supplier</Th>
                        <Th>Total</Th>
                        <Th>Status</Th>
                        <Th className="text-right pr-4">Aksi</Th>
                    </tr>
                    </thead>
                    <tbody>
                    {loading ? (
                        <tr><td colSpan={6} className="p-6 text-center">Memuat...</td></tr>
                    ) : items.length === 0 ? (
                        <tr><td colSpan={6} className="p-6 text-center">Tidak ada data</td></tr>
                    ) : (
                        items.map((it) => (
                            <tr key={it.id} className="border-t border-slate-900/10">
                                <td className="p-3">{it.spent_at ? new Date(it.spent_at).toLocaleString("id-ID") : "-"}</td>
                                <td className="p-3">{it.expense_type || "-"}</td>
                                <td className="p-3">{it.supplier_name || "-"}</td>
                                <td className="p-3">{formatCurrency(it.total)}</td>
                                <td className="p-3">{it.payment_status || "-"}</td>
                                <td className="p-3 text-right pr-4">
                                    <Link className={btnGhost} to={`/expenses/${it.id}`}>Detail</Link>
                                    <Link className={btnGhost} to={`/expenses/${it.id}/edit`}>Edit</Link>
                                </td>
                            </tr>
                        ))
                    )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between">
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
