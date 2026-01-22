// ──────────────────────────────────────────────────────────────────────────────
// File: src/pages/produk/ProductSpecialPrices.jsx
// ──────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "../../config/axios";
import { btnPrimary, btnGhost, Th, HeaderBack, formatCurrency, inputBase } from "./_ui";
import { Plus, Trash2 } from "lucide-react";

export default function ProductSpecialPrices() {
    const { id } = useParams();
    const nav = useNavigate();
    const [list, setList] = useState([]);
    const [saving, setSaving] = useState(false);
    const [customers, setCustomers] = useState([]);
    const [form, setForm] = useState({ customer_category_id: "", special_price: "" });

    const normalizeArray = (raw) => {
        if (Array.isArray(raw)) return raw;
        if (!raw) return [];
        return [raw];
    };

    const load = async () => {
        const [{ data: d1 }, { data: d2 }] = await Promise.all([
            axios.get(`/api/products/${id}`),
            axios.get("/api/catalog/customer", { params: { page: 1, limit: 500 } }),
        ]);

        // ✅ produk & special prices
        const product = d1?.product ?? d1?.data ?? d1 ?? {};
        const specials = product?.specialPrices ?? product?.special_prices ?? [];
        setList(normalizeArray(specials));

        // ✅ daftar kategori pelanggan
        const cats =
            d2?.customers ??
            d2?.data ??
            d2?.items ??
            d2?.customerCategories ??
            [];
        setCustomers(normalizeArray(cats));
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const add = async (e) => {
        e.preventDefault();
        if (!form.customer_category_id || !form.special_price) return;
        setSaving(true);
        try {
            await axios.post(`/api/products/${id}/special-prices`, {
                customer_category_id: form.customer_category_id,
                special_price: form.special_price,
            });
            setForm({ customer_category_id: "", special_price: "" });
            await load();
        } finally {
            setSaving(false);
        }
    };

    const del = async (pspId) => {
        if (!window.confirm("Hapus harga khusus ini?")) return;
        await axios.delete(`/api/products/${id}/special-prices/${pspId}`);
        await load();
    };

    return (
        <div className="space-y-4">
            <HeaderBack title="Harga Khusus" onBack={() => nav("/products")} />

            <form onSubmit={add} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <select
                    className={inputBase}
                    value={form.customer_category_id}
                    onChange={(e) =>
                        setForm((f) => ({ ...f, customer_category_id: e.target.value }))
                    }
                >
                    <option value="">Pilih Kategori Pelanggan</option>
                    {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.name}
                        </option>
                    ))}
                </select>
                <input
                    className={inputBase}
                    placeholder="Harga khusus"
                    type="number"
                    min="0"
                    value={form.special_price}
                    onChange={(e) =>
                        setForm((f) => ({ ...f, special_price: e.target.value }))
                    }
                />
                <button className={btnPrimary} disabled={saving}>
                    <Plus className="h-4 w-4" /> Tambah
                </button>
            </form>

            <div className="overflow-x-auto border border-slate-900/15 rounded-xl">
                <table className="w-full text-sm">
                    <thead>
                    <tr className="bg-slate-50">
                        <Th>Kategori Pelanggan</Th>
                        <Th>Harga Khusus</Th>
                        <Th className="text-right pr-4">Aksi</Th>
                    </tr>
                    </thead>
                    <tbody>
                    {(!list || list.length === 0) ? (
                        <tr>
                            <td colSpan={3} className="p-6 text-center">
                                Belum ada data
                            </td>
                        </tr>
                    ) : (
                        list.map((it) => (
                            <tr key={it.id} className="border-t border-slate-900/10">
                                <td className="p-3">
                                    {
                                        it.customerCategory?.name || // sesuai respons kamu
                                        it.customer_category?.name ||
                                        it.customer_category_name ||
                                        it.customer_category_id
                                    }
                                </td>
                                <td className="p-3">{formatCurrency(it.special_price)}</td>
                                <td className="p-3 text-right pr-4">
                                    <button className={btnGhost} onClick={() => del(it.id)}>
                                        <Trash2 className="h-4 w-4" /> Hapus
                                    </button>
                                </td>
                            </tr>
                        ))
                    )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}