import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import axios from "../../config/axios";
import { Search, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { btnPrimary, btnGhost, inputBase, Th } from "../produk/_ui";

export default function CustomersList() {
    const [params, setParams] = useSearchParams();
    const [items, setItems] = useState([]);
    const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState([]);
    const [catLoading, setCatLoading] = useState(false);

    const q = params.get("q") || "";
    const category_id = params.get("category_id") || "";
    const is_active = params.get("is_active") || "";
    const page = parseInt(params.get("page") || "1", 10);
    const limit = parseInt(params.get("limit") || "10", 10);

    const fetchCategories = async () => {
        setCatLoading(true);
        try {
            const { data } = await axios.get("/api/catalog/customer", {
                params: { page: 1, limit: 500 },
            });
            // Tahan banting terhadap berbagai bentuk payload:
            const rows =
                data?.items ||
                data?.categories ||
                data?.data?.items ||
                data?.data?.categories ||
                [];

            const norm = rows
                .map((r) => ({
                    id: r.id ?? r.value ?? r.code ?? r.uuid ?? r._id,
                    name:
                        r.name ??
                        r.label ??
                        r.title ??
                        r.text ??
                        String(r.code || r.id || ""),
                }))
                .filter((x) => x.id && x.name);

            setCategories(norm);
        } catch (e) {
            console.warn("Gagal load kategori customer:", e);
            setCategories([]);
        } finally {
            setCatLoading(false);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get("/api/customers", {
                params: { q, category_id, is_active, page, limit },
            });
            const list = data?.customers ?? [];
            const p = data?.pagination ?? { page, limit, total: list.length, pages: 1 };
            setItems(list);
            setMeta({
                page: Number(p.page) || 1,
                limit: Number(p.limit) || 10,
                total: Number(p.total) || 0,
                pages: Number(p.pages) || 1,
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);
    useEffect(() => {
        fetchData();
        // eslint-disable-next-line
    }, [q, category_id, is_active, page, limit]);

    const onSubmit = (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const next = new URLSearchParams(params);
        next.set("q", (f.get("q") || "").toString());
        next.set("category_id", (f.get("category_id") || "").toString());
        next.set("is_active", (f.get("is_active") || "").toString());
        next.set("page", "1");
        setParams(next);
    };

    const totalPages =
        meta.pages || Math.max(1, Math.ceil((meta.total || 0) / (meta.limit || 10)));

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">Pelanggan</h2>
                <Link className={btnPrimary} to="/customers/new">
                    <Plus className="h-4 w-4" /> Pelanggan Baru
                </Link>
            </div>

            <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                        name="q"
                        defaultValue={q}
                        placeholder="Cari nama/email/telepon"
                        className={`${inputBase} pl-9`}
                    />
                </div>
                <select
                    name="category_id"
                    defaultValue={category_id}
                    className={inputBase}
                    disabled={catLoading}
                >
                    <option value="">{catLoading ? "Memuat..." : "Semua Kategori"}</option>
                    {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.name}
                        </option>
                    ))}
                </select>
                <select name="is_active" defaultValue={is_active} className={inputBase}>
                    <option value="true">Semua Status</option>
                    <option value="true">Aktif</option>
                    <option value="false">Non-aktif</option>
                </select>
                <div className="flex gap-2">
                    <button className={btnGhost} type="submit">
                        Terapkan
                    </button>
                </div>
            </form>

            <div className="overflow-x-auto border border-slate-900/15 rounded-xl">
                <table className="w-full text-sm">
                    <thead>
                    <tr className="bg-slate-50">
                        <Th>Kode</Th>
                        <Th>Nama</Th>
                        <Th>Kontak</Th>
                        <Th>Kategori</Th>
                        <Th>Status</Th>
                        <Th className="text-right pr-4">Aksi</Th>
                    </tr>
                    </thead>
                    <tbody>
                    {loading ? (
                        <tr>
                            <td colSpan={6} className="p-6 text-center">
                                Memuat...
                            </td>
                        </tr>
                    ) : items.length === 0 ? (
                        <tr>
                            <td colSpan={6} className="p-6 text-center">
                                Tidak ada data
                            </td>
                        </tr>
                    ) : (
                        items.map((c) => (
                            <tr key={c.id} className="border-t border-slate-900/10">
                                <td className="p-3">{c.code || "-"}</td>
                                <td className="p-3 font-medium">
                                    <Link className="hover:underline" to={`/customers/${c.id}`}>
                                        {c.name}
                                    </Link>
                                </td>
                                <td className="p-3">{c.phone || c.email || "-"}</td>
                                <td className="p-3">{c.category?.name || "-"}</td>
                                <td className="p-3">
                    <span
                        className={`px-2 py-0.5 rounded-full text-xs border ${
                            c.is_active
                                ? "bg-green-50 text-green-700 border-green-200"
                                : "bg-slate-50 text-slate-600 border-slate-200"
                        }`}
                    >
                      {c.is_active ? "Aktif" : "Non-aktif"}
                    </span>
                                </td>
                                <td className="p-3 text-right pr-4">
                                    <Link className={btnGhost} to={`/customers/${c.id}/edit`}>
                                        Edit
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
                        disabled={meta.page <= 1}
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
                        disabled={meta.page >= totalPages}
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
