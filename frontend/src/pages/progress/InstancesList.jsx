import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import axios from "../../config/axios";
import { Search, RefreshCcw, UserRound } from "lucide-react";
import { btnGhost, inputBase, Th } from "../produk/_ui";
import { Paginator } from "./ProgressRoutes.jsx";

export default function ProgressInstancesList() {
    const [params, setParams] = useSearchParams();
    const [items, setItems] = useState([]);
    const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
    const [loading, setLoading] = useState(false);

    const q = params.get("q") || "";
    const status = params.get("status") || "";
    const product_id = params.get("product_id") || "";
    const page = parseInt(params.get("page") || "1", 10);
    const limit = parseInt(params.get("limit") || "10", 10);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get("/api/progress/instances", {
                params: { q, status, product_id, page, limit },
            });
            setItems(data?.data || []);
            const m = data?.meta || { page, limit, total: (data?.data || []).length, pages: 1 };
            setMeta({
                page: Number(m.page) || 1,
                limit: Number(m.limit) || 10,
                total: Number(m.total) || 0,
                pages: Number(m.pages) || 1,
            });
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        fetchData();
        // eslint-disable-next-line
    }, [q, status, product_id, page, limit]);

    const onSubmit = (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const next = new URLSearchParams(params);
        next.set("q", (f.get("q") || "").toString());
        next.set("status", (f.get("status") || "").toString());
        next.set("product_id", (f.get("product_id") || "").toString());
        next.set("page", "1");
        setParams(next);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">Progres Pekerjaan</h2>
                <button className={btnGhost} onClick={fetchData}>
                    <RefreshCcw className="h-4 w-4" /> Muat Ulang
                </button>
            </div>

            <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                        name="q"
                        defaultValue={q}
                        placeholder="Cari nama produk / nama instance"
                        className={`${inputBase} pl-9`}
                    />
                </div>
                <select name="status" defaultValue={status} className={inputBase}>
                    <option value="">Semua Status</option>
                    <option value="ongoing">Ongoing</option>
                    <option value="done">Selesai</option>
                    <option value="canceled">Batal</option>
                </select>
                <input
                    name="product_id"
                    defaultValue={product_id}
                    className={inputBase}
                    placeholder="Filter Product ID (opsional)"
                />
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
                        <Th>Produk</Th>
                        <Th>Category</Th>
                        <Th>Progress</Th>
                        <Th>Status</Th>
                        <Th>PIC</Th>
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
                        items.map((it) => (
                            <tr key={it.id} className="border-t border-slate-900/10">
                                <td className="p-3 font-medium">{it.product_name}</td>
                                <td className="p-3">{it.ProgressCategory?.name || "-"}</td>
                                <td className="p-3">
                                    <div className="w-40 bg-slate-100 rounded-full h-2 overflow-hidden">
                                        <div
                                            className="bg-sky-500 h-2"
                                            style={{ width: `${it.percent || 0}%` }}
                                        />
                                    </div>
                                    <div className="text-xs text-slate-600 mt-1">{it.percent || 0}%</div>
                                </td>
                                <td className="p-3">{it.status}</td>
                                <td className="p-3">
                                    {it.pic_user_id ? (
                                        <span className="inline-flex items-center gap-1 text-xs bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full">
                        <UserRound className="h-3 w-3" /> {it.pic_user_id.slice(0, 6)}…
                      </span>
                                    ) : (
                                        "-"
                                    )}
                                </td>
                                <td className="p-3 text-right pr-4">
                                    <Link className={btnGhost} to={`/progress/instances/${it.id}`}>
                                        Detail
                                    </Link>
                                </td>
                            </tr>
                        ))
                    )}
                    </tbody>
                </table>
            </div>

            <Paginator meta={meta} setParams={setParams} />
        </div>
    );
}
