// ──────────────────────────────────────────────────────────────────────────────
// File: src/pages/produk/ProductList.jsx
// ──────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import axios from "../../config/axios";
import {
    Plus,
    Search,
    ChevronLeft,
    ChevronRight,
    Edit,
    DollarSign,
    Image as ImageIcon,
} from "lucide-react";
import { btnPrimary, btnGhost, inputBase, Th, formatCurrency } from "./_ui";

export default function ProductList() {
    const [params, setParams] = useSearchParams();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
    const [categories, setCategories] = useState([]);

    const q = params.get("q") || "";
    const category_id = params.get("category_id") || "";
    const page = parseInt(params.get("page") || "1", 10);
    const limit = parseInt(params.get("limit") || "10", 10);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get("/api/products", {
                params: { q, category_id, page, limit },
            });

            // Ambil kandidat list dari beberapa kemungkinan kunci
            const listRaw =
                (data && (data.products ?? data.data ?? data.items)) ??
                (Array.isArray(data) ? data : null);

            // ✅ Paksa jadi array agar .map() selalu aman
            const list = Array.isArray(listRaw)
                ? listRaw
                : listRaw
                    ? [listRaw]
                    : [];

            // Ambil pagination aman
            const p = data?.pagination ?? {
                page: Number(data?.page ?? page) || 1,
                limit: Number(data?.limit ?? limit) || 10,
                total: Number(data?.total ?? list.length) || 0,
                pages:
                    Number(data?.pages) ||
                    Math.max(1, Math.ceil((Number(data?.total ?? list.length) || 0) / (Number(data?.limit ?? limit) || 10))),
            };

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

    const fetchCategories = async () => {
        try {
            // ✅ Endpoint kategori produk yang benar
            const { data } = await axios.get("/api/catalog/product", {
                params: { page: 1, limit: 500 },
            });
            const list = data?.data ?? data?.items ?? data?.categories ?? [];
            setCategories(list);
        } catch {
            // noop
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);
    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [q, category_id, page, limit]);

    const onSubmit = (e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        const next = new URLSearchParams(params);
        next.set("q", (form.get("q") || "").toString());
        next.set("category_id", (form.get("category_id") || "").toString());
        next.set("page", "1");
        setParams(next);
    };

    const totalPages = meta.pages || Math.max(1, Math.ceil((meta.total || 0) / (meta.limit || 10)));

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">Daftar Produk</h2>
                <Link className={btnPrimary} to="/products/new">
                    <Plus className="h-4 w-4" /> Produk Baru
                </Link>
            </div>

            <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                        name="q"
                        defaultValue={q}
                        placeholder="Cari nama/SKU"
                        className={`${inputBase} pl-9`}
                    />
                </div>
                <select name="category_id" defaultValue={category_id} className={inputBase}>
                    <option value="">Semua Kategori</option>
                    {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.name}
                        </option>
                    ))}
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
                        <Th>Foto</Th>
                        <Th>Nama</Th>
                        <Th>SKU</Th>
                        <Th>Harga</Th>
                        <Th>Stok</Th>
                        <Th>Tipe</Th>
                        <Th className="text-right pr-4">Aksi</Th>
                    </tr>
                    </thead>
                    <tbody>
                    {loading ? (
                        <tr>
                            <td colSpan={7} className="p-6 text-center">
                                Memuat...
                            </td>
                        </tr>
                    ) : items.length === 0 ? (
                        <tr>
                            <td colSpan={7} className="p-6 text-center">
                                Tidak ada data
                            </td>
                        </tr>
                    ) : (
                        items.map((p) => {
                            const photo = p.first_image_url ?? p.photo_url ?? null;
                            return (
                                <tr key={p.id} className="border-t border-slate-900/10">
                                    <td className="p-3">
                                        {photo ? (
                                            <img
                                                src={photo}
                                                alt="foto"
                                                className="h-10 w-10 rounded-lg object-cover border border-slate-900/10"
                                            />
                                        ) : (
                                            <div className="h-10 w-10 rounded-lg border border-slate-900/15 bg-white flex items-center justify-center text-slate-400">
                                                <ImageIcon className="h-5 w-5" />
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-3 font-medium">
                                        <Link className="hover:underline" to={`/products/${p.id}`}>
                                            {p.name}
                                        </Link>
                                    </td>
                                    <td className="p-3">{p.sku || "-"}</td>
                                    <td className="p-3">{formatCurrency(p.price_normal)}</td>
                                    <td className="p-3">{p.stock}</td>
                                    <td className="p-3">
                                        {p.is_area ? "Area" : p.is_stock ? "Stok" : "—"}
                                    </td>
                                    <td className="p-3 text-right flex justify-end gap-2 pr-4">
                                        <Link className={btnGhost} to={`/products/${p.id}/edit`}>
                                            Edit
                                        </Link>
                                        <Link className={btnGhost} to={`/products/${p.id}/special-prices`}>
                                            Harga Khusus
                                        </Link>
                                    </td>
                                </tr>
                            );
                        })
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
