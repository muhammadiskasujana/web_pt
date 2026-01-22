import { useEffect, useState } from "react";
import axios from "../../config/axios";
import { btnPrimary, btnGhost, inputBase } from "../produk/_ui";
import { Save } from "lucide-react";

const TYPES = [
    { value: "operational", label: "Operational" },
    { value: "raw_material_purchase", label: "Pembelian Bahan" },
    { value: "product_purchase", label: "Pembelian Produk" },
    { value: "other", label: "Lain-lain" },
];

const PAY_STATUS = [
    { value: "lunas", label: "Lunas" },
    { value: "hutang", label: "Hutang" },
];

const TX_TYPES = [
    { value: "tunai", label: "Tunai" },
    { value: "transfer", label: "Transfer" },
    { value: "qris", label: "QRIS" },
];

export default function ExpenseForm({ initial, mode, expenseId, onCancel, onSuccess }) {
    const isCreate = mode === "create";
    const [form, setForm] = useState({
        expense_type: "operational",
        branch_id: "",
        employee_id: "",
        supplier_name: "",
        product_id: "",
        rm_id: "",
        qty: "",
        unit_cost: "",
        total: "",
        payment_status: "lunas",
        transaction_type: "tunai",
        paid_amount: "",
        spent_at: new Date().toISOString().slice(0, 10),
        description: "",
    });

    const [products, setProducts] = useState([]);
    const [rawMaterials, setRawMaterials] = useState([]);

    useEffect(() => {
        if (initial) setForm((f) => ({ ...f, ...initial }));
    }, [initial]);

    useEffect(() => {
        (async () => {
            try {
                // Optional: siapkan pilihan produk & bahan baku (kalau modelnya ada)
                const [pRes, rmRes] = await Promise.allSettled([
                    axios.get("/api/products", { params: { page: 1, limit: 500 } }),
                    axios.get("/api/raw-materials/items"),
                ]);
                if (pRes.status === "fulfilled") {
                    const list = pRes.value.data?.products ?? pRes.value.data?.data ?? [];
                    setProducts(Array.isArray(list) ? list : []);
                }
                if (rmRes.status === "fulfilled") {
                    const list = Array.isArray(rmRes.value.data?.items) ? rmRes.value.data.items : [];
                    setRawMaterials(list);
                }
            } catch {
                // no-op
            }
        })();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((f) => ({ ...f, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const payload = {
            ...form,
            qty: form.qty ? Number(form.qty) : null,
            unit_cost: form.unit_cost ? Number(form.unit_cost) : null,
            total: form.total ? Number(form.total) : 0,
            paid_amount: form.paid_amount ? Number(form.paid_amount) : 0,
            spent_at: form.spent_at ? new Date(form.spent_at) : new Date(),
        };

        if (isCreate) {
            await axios.post("/api/expenses", payload);
        } else {
            await axios.put(`/api/expenses/${expenseId}`, payload);
        }
        onSuccess?.();
    };

    const showRM = form.expense_type === "raw_material_purchase";
    const showProduct = form.expense_type === "product_purchase";

    return (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
                <label className="block">
                    <span className="mb-2 block text-sm font-medium">Tipe Biaya</span>
                    <select name="expense_type" value={form.expense_type} onChange={handleChange} className={inputBase}>
                        {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="block">
                        <span className="mb-2 block text-sm font-medium">Supplier</span>
                        <input name="supplier_name" value={form.supplier_name || ""} onChange={handleChange} className={inputBase} placeholder="Nama supplier (opsional)" />
                    </label>
                    <label className="block">
                        <span className="mb-2 block text-sm font-medium">Tanggal</span>
                        <input type="date" name="spent_at" value={form.spent_at} onChange={handleChange} className={inputBase} />
                    </label>
                </div>

                {/* Conditional: RM/Produk */}
                {showRM && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <label className="block sm:col-span-2">
                            <span className="mb-2 block text-sm font-medium">Bahan Baku</span>
                            <select name="rm_id" value={form.rm_id || ""} onChange={handleChange} className={inputBase}>
                                <option value="">Pilih...</option>
                                {rawMaterials.map((r) =>  <option key={r.id} value={r.id}>{(r.name || r.code || r.id) + (r.unit ? ` (${r.unit})` : "")}</option>
                                )}
                            </select>
                        </label>
                        <label className="block">
                            <span className="mb-2 block text-sm font-medium">Qty</span>
                            <input type="number" name="qty" min="0" value={form.qty || ""} onChange={handleChange} className={inputBase} placeholder="0" />
                        </label>
                    </div>
                )}

                {showProduct && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <label className="block sm:col-span-2">
                            <span className="mb-2 block text-sm font-medium">Produk</span>
                            <select name="product_id" value={form.product_id || ""} onChange={handleChange} className={inputBase}>
                                <option value="">Pilih...</option>
                                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </label>
                        <label className="block">
                            <span className="mb-2 block text-sm font-medium">Qty</span>
                            <input type="number" name="qty" min="0" value={form.qty || ""} onChange={handleChange} className={inputBase} placeholder="0" />
                        </label>
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <label className="block">
                        <span className="mb-2 block text-sm font-medium">Harga Satuan (opsional)</span>
                        <input type="number" name="unit_cost" min="0" value={form.unit_cost || ""} onChange={handleChange} className={inputBase} placeholder="0" />
                    </label>
                    <label className="block sm:col-span-2">
                        <span className="mb-2 block text-sm font-medium">Total</span>
                        <input type="number" name="total" min="0" value={form.total} onChange={handleChange} className={inputBase} placeholder="0" />
                    </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <label className="block">
                        <span className="mb-2 block text-sm font-medium">Status Bayar</span>
                        <select name="payment_status" value={form.payment_status} onChange={handleChange} className={inputBase}>
                            {PAY_STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                    </label>
                    <label className="block">
                        <span className="mb-2 block text-sm font-medium">Jenis Transaksi</span>
                        <select name="transaction_type" value={form.transaction_type} onChange={handleChange} className={inputBase}>
                            {TX_TYPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                    </label>
                    <label className="block">
                        <span className="mb-2 block text-sm font-medium">Dibayar</span>
                        <input type="number" name="paid_amount" min="0" value={form.paid_amount || ""} onChange={handleChange} className={inputBase} placeholder="0" />
                    </label>
                </div>

                <label className="block">
                    <span className="mb-2 block text-sm font-medium">Keterangan</span>
                    <textarea name="description" value={form.description || ""} onChange={handleChange} className={inputBase} rows={4} placeholder="Catatan singkat..." />
                </label>

                <div className="flex gap-2">
                    <button type="submit" className={btnPrimary}>
                        <Save className="h-4 w-4" /> {isCreate ? "Simpan" : "Update"}
                    </button>
                    {onCancel && (
                        <button type="button" className={btnGhost} onClick={onCancel}>
                            Batal
                        </button>
                    )}
                </div>
            </div>
        </form>
    );
}
