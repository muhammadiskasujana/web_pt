import { useEffect, useMemo, useState } from "react";
import axios from "../../config/axios";
import { inputBase, btnPrimary, btnGhost } from "../produk/_ui";
import { Plus, X } from "lucide-react";

/**
 * mode: "create" | "edit"
 * initial: object untuk prefill (opsional)
 * salesId: string (untuk edit)
 * onSuccess: fn
 */
export default function SalesForm({ mode, initial, salesId, onSuccess }) {
    const isCreate = mode === "create";

    // ====== state dasar form ======
    const [form, setForm] = useState({
        // customer: pilih salah satu dari 3 cara di controller
        customerMode: "existing", // "existing" | "new" | "nameOnly"
        customer_id: "",
        customer_new: { name: "", phone: "", email: "", customer_category_id: "" },
        customer_name: "",

        // metadata SO
        branch_id: "",
        deadline_at: "",

        payment_status: "lunas", // "lunas" | "dp"
        transaction_type: "tunai", // "tunai" | "transfer"
        discount: 0,
        notes: "",

        // kalau DP:
        dp_amount: 0,
        installments_count: 1,
        schedule_type: "auto", // "auto" | (future: manual)

        // item
        items: [], // {product_id, qty, is_area, area_w, area_h, unit_price, area_unit_price}
    });

    // ====== master data ======
    const [products, setProducts] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [categories, setCategories] = useState([]);
    const [branches, setBranches] = useState([]);

    const [saving, setSaving] = useState(false);
    const [loadingMaster, setLoadingMaster] = useState(true);

    useEffect(() => {
        if (initial) setForm((f) => ({ ...f, ...initial }));
    }, [initial]);

    // index map untuk akses cepat
    const productIndex = useMemo(() => {
        const m = new Map();
        (products || []).forEach((p) => m.set(p.id, p));
        return m;
    }, [products]);

    const selectedCustomer = useMemo(
        () => customers.find((c) => c.id === form.customer_id) || null,
        [customers, form.customer_id]
    );

    // ====== load master (produk, customer, kategori customer, cabang) ======
    useEffect(() => {
        (async () => {
            try {
                const [pRes, cRes, catRes, bRes] = await Promise.all([
                    axios.get("/api/products", { params: { page: 1, limit: 500 } }),
                    axios.get("/api/customers", { params: { page: 1, limit: 500 } }),
                    axios.get("/api/catalog/customer", { params: { page: 1, limit: 500 } }),
                    axios.get("/api/branches"),
                ]);

                const prodList =
                    pRes?.data?.products ?? pRes?.data?.data ?? pRes?.data?.items ?? [];
                setProducts(Array.isArray(prodList) ? prodList : []);

                const custList = cRes?.data?.customers ?? [];
                setCustomers(Array.isArray(custList) ? custList : []);

                const catRows =
                    catRes?.data?.items ||
                    catRes?.data?.categories ||
                    catRes?.data?.data?.items ||
                    catRes?.data?.data?.categories ||
                    [];
                const normCats = catRows
                    .map((r) => ({
                        id: r.id ?? r.value ?? r.code ?? r.uuid ?? r._id,
                        name:
                            r.name ?? r.label ?? r.title ?? r.text ?? String(r.code || r.id || ""),
                    }))
                    .filter((x) => x.id && x.name);
                setCategories(normCats);

                const brList = bRes?.data?.branches ?? [];
                setBranches(Array.isArray(brList) ? brList : []);
            } finally {
                setLoadingMaster(false);
            }
        })();
    }, []);

    // ====== helpers ======
    const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));
    const setCustomerNew = (k, v) =>
        setForm((f) => ({ ...f, customer_new: { ...f.customer_new, [k]: v } }));

    const addItem = () =>
        setForm((f) => ({
            ...f,
            items: [
                ...(f.items || []),
                {
                    product_id: "",
                    qty: 1,
                    is_area: false,
                    area_w: 0,
                    area_h: 0,
                    unit_price: "", // kosong = biar BE tentukan
                    area_unit_price: "", // kosong = biar BE tentukan
                },
            ],
        }));

    const removeItem = (idx) =>
        setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

    const setItem = (idx, patch) =>
        setForm((f) => ({
            ...f,
            items: f.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)),
        }));

    // Saat pilih produk, auto set is_area mengikuti produk (tanpa mengubah harga manual user)
    const onPickProduct = (idx, product_id) => {
        const p = productIndex.get(product_id);
        setItem(idx, {
            product_id,
            ...(typeof p?.is_area === "boolean" ? { is_area: !!p.is_area } : {}),
        });
    };

    // ====== ringkasan sementara (perkiraan)
    // - Jika user tidak isi harga, pakai fallback preview dari price_normal produk (sekadar estimasi).
    // - BE tetap akan menghitung ulang dan bisa pakai special price.
    const estimateTotals = useMemo(() => {
        let subtotal = 0;
        for (const it of form.items || []) {
            if (!it.product_id) continue;
            const p = productIndex.get(it.product_id);
            const priceNormal = Number(p?.price_normal || p?.price || p?.base_price || 0);

            if (it.is_area) {
                const qty  = Number(it.qty || 1);
                const area = Number(it.area_w || 0) * Number(it.area_h || 0);
                const unit =
                    Number(it.area_unit_price || 0) > 0
                        ? Number(it.area_unit_price)
                        : priceNormal; // fallback preview
                subtotal += qty * area * unit; // ⬅️ qty ikut dihitung
            } else {
                const qty = Number(it.qty || 0);
                const unit =
                    Number(it.unit_price || 0) > 0 ? Number(it.unit_price) : priceNormal;
                subtotal += qty * unit;
            }

        }
        const discount = Number(form.discount || 0);
        const total = Math.max(0, Math.round(subtotal) - discount);
        const paid =
            form.payment_status === "lunas"
                ? total
                : Math.min(Number(form.dp_amount || 0), total);
        const bal = Math.max(0, total - paid);
        return { subtotal: Math.round(subtotal), total, paid_amount: paid, balance: bal };
    }, [form, productIndex]);

    // ====== submit ======
    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (isCreate) {
                // Siapkan payload sesuai controller
                const payload = {
                    // customer block (pilih salah satu)
                    ...(form.customerMode === "existing" && form.customer_id
                        ? { customer_id: form.customer_id }
                        : form.customerMode === "new" && form.customer_new?.name
                            ? {
                                customer_new: {
                                    name: form.customer_new.name,
                                    phone: form.customer_new.phone || undefined,
                                    email: form.customer_new.email || undefined,
                                    customer_category_id:
                                        form.customer_new.customer_category_id || undefined,
                                },
                            }
                            : form.customerMode === "nameOnly" && form.customer_name
                                ? { customer_name: form.customer_name }
                                : {}),

                    // ⬇️ KUNCI: kirim customer_category_id bila ada (agar BE bisa pakai special price)
                    customer_category_id:
                        form.customerMode === "existing"
                            ? selectedCustomer?.customer_category_id || undefined
                            : form.customerMode === "new"
                                ? form.customer_new?.customer_category_id || undefined
                                : undefined,

                    branch_id: form.branch_id || null,
                    deadline_at: form.deadline_at || null,

                    payment_status: form.payment_status, // "lunas" | "dp"
                    transaction_type: form.transaction_type,
                    discount: Number(form.discount || 0),
                    notes: form.notes || null,

                    // DP options (controller bakal abaikan kalau payment_status = 'lunas')
                    dp_amount: Number(form.dp_amount || 0),
                    installments_count: Math.max(1, Number(form.installments_count || 1)),
                    schedule_type: form.schedule_type || "auto",

                    // items
                    items: (form.items || []).map((it) => ({
                        product_id: it.product_id,
                        is_area: !!it.is_area,

                        // qty dikirim untuk semua mode (area/non-area)
                        qty: Number(it.qty || (it.is_area ? 1 : 0)),

                        // ukuran boleh float
                        area_w: it.is_area ? (it.area_w !== "" && it.area_w != null ? parseFloat(it.area_w) : undefined) : undefined,
                        area_h: it.is_area ? (it.area_h !== "" && it.area_h != null ? parseFloat(it.area_h) : undefined) : undefined,

                        // harga opsional: undefined jika kosong/0 → BE pakai harga efektif
                        unit_price: !it.is_area
                            ? (Number(it.unit_price) > 0 ? Number(it.unit_price) : undefined)
                            : undefined,
                        area_unit_price: it.is_area
                            ? (Number(it.area_unit_price) > 0 ? Number(it.area_unit_price) : undefined)
                            : undefined,
                    }))
                    ,
                };

                // Validasi singkat sebelum kirim
                if (!payload.customer_id && !payload.customer_new && !payload.customer_name) {
                    alert("Pilih/isi pelanggan terlebih dulu.");
                    setSaving(false);
                    return;
                }
                if (!Array.isArray(payload.items) || payload.items.length === 0) {
                    alert("Tambahkan minimal 1 item.");
                    setSaving(false);
                    return;
                }
                // if (form.payment_status === "dp" && Number(payload.dp_amount) <= 0) {
                //     alert("Isi nominal DP (> 0).");
                //     setSaving(false);
                //     return;
                // }

                await axios.post("/api/sales", payload);
            } else {
                // Edit ringan (sesuai controller.update)
                await axios.put(`/api/sales/${salesId}`, {
                    progress_status: form.progress_status || undefined,
                    notes: form.notes ?? undefined,
                });
            }
            onSuccess?.();
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={submit} className="space-y-6">
            {/* ========== Header Info ========== */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* BLOK CUSTOMER */}
                <div className="lg:col-span-2 border border-slate-900/15 rounded-2xl p-4 space-y-3">
                    <div className="font-semibold">Pelanggan</div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <label className="flex items-center gap-2">
                            <input
                                type="radio"
                                name="custmode"
                                checked={form.customerMode === "existing"}
                                onChange={() => setField("customerMode", "existing")}
                            />
                            <span className="text-sm">Pilih Customer</span>
                        </label>
                        <label className="flex items-center gap-2">
                            <input
                                type="radio"
                                name="custmode"
                                checked={form.customerMode === "new"}
                                onChange={() => setField("customerMode", "new")}
                            />
                            <span className="text-sm">Customer Baru</span>
                        </label>
                        <label className="flex items-center gap-2">
                            <input
                                type="radio"
                                name="custmode"
                                checked={form.customerMode === "nameOnly"}
                                onChange={() => setField("customerMode", "nameOnly")}
                            />
                            <span className="text-sm">Nama Saja</span>
                        </label>
                    </div>

                    {form.customerMode === "existing" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <div className="mb-2 text-sm font-medium">Pilih Customer</div>
                                <select
                                    className={inputBase}
                                    value={form.customer_id}
                                    onChange={(e) => setField("customer_id", e.target.value)}
                                    disabled={loadingMaster}
                                >
                                    <option value="">— pilih —</option>
                                    {customers.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name} {c.phone ? `(${c.phone})` : ""}
                                        </option>
                                    ))}
                                </select>
                                {selectedCustomer?.customer_category_id ? (
                                    <div className="mt-2 text-xs text-slate-600">
                                        Kategori: <b>{selectedCustomer.customer_category_id}</b>
                                    </div>
                                ) : (
                                    <div className="mt-2 text-xs text-amber-700">
                                        Kategori customer belum di-set. Jika ada special price per kategori,
                                        pastikan kategori terisi.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {form.customerMode === "new" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <div className="mb-2 text-sm font-medium">Nama*</div>
                                <input
                                    className={inputBase}
                                    value={form.customer_new.name}
                                    onChange={(e) => setCustomerNew("name", e.target.value)}
                                    required={isCreate && form.customerMode === "new"}
                                />
                            </div>
                            <div>
                                <div className="mb-2 text-sm font-medium">Kategori</div>
                                <select
                                    className={inputBase}
                                    value={form.customer_new.customer_category_id || ""}
                                    onChange={(e) =>
                                        setCustomerNew("customer_category_id", e.target.value || "")
                                    }
                                >
                                    <option value="">—</option>
                                    {categories.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <div className="mb-2 text-sm font-medium">Telepon</div>
                                <input
                                    className={inputBase}
                                    value={form.customer_new.phone}
                                    onChange={(e) => setCustomerNew("phone", e.target.value)}
                                />
                            </div>
                            <div>
                                <div className="mb-2 text-sm font-medium">Email</div>
                                <input
                                    type="email"
                                    className={inputBase}
                                    value={form.customer_new.email}
                                    onChange={(e) => setCustomerNew("email", e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {form.customerMode === "nameOnly" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <div className="mb-2 text-sm font-medium">Nama Customer*</div>
                                <input
                                    className={inputBase}
                                    value={form.customer_name}
                                    onChange={(e) => setField("customer_name", e.target.value)}
                                    required={isCreate && form.customerMode === "nameOnly"}
                                    placeholder="Nama pelanggan"
                                />
                            </div>
                            <div className="text-xs text-slate-600 md:pt-8">
                                Mode ini tidak membawa kategori, jadi special price kategori tidak
                                diterapkan.
                            </div>
                        </div>
                    )}
                </div>

                {/* BLOK INFO ORDER */}
                <div className="border border-slate-900/15 rounded-2xl p-4 space-y-3">
                    <div className="font-semibold">Info Order</div>
                    <div className="space-y-3">
                        <div>
                            <div className="mb-2 text-sm font-medium">Cabang</div>
                            <select
                                className={inputBase}
                                value={form.branch_id}
                                onChange={(e) => setField("branch_id", e.target.value)}
                            >
                                <option value="">—</option>
                                {branches.map((b) => (
                                    <option key={b.id} value={b.id}>
                                        {b.code ? `${b.code} — ` : ""}
                                        {b.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <div className="mb-2 text-sm font-medium">Deadline</div>
                            <input
                                type="date"
                                className={inputBase}
                                value={form.deadline_at}
                                onChange={(e) => setField("deadline_at", e.target.value)}
                            />
                        </div>
                        <div>
                            <div className="mb-2 text-sm font-medium">Status Bayar</div>
                            <select
                                className={inputBase}
                                value={form.payment_status}
                                onChange={(e) => setField("payment_status", e.target.value)}
                            >
                                <option value="lunas">Lunas</option>
                                <option value="dp">DP</option>
                            </select>
                        </div>
                        <div>
                            <div className="mb-2 text-sm font-medium">Jenis Transaksi</div>
                            <select
                                className={inputBase}
                                value={form.transaction_type}
                                onChange={(e) => setField("transaction_type", e.target.value)}
                            >
                                <option value="tunai">Tunai</option>
                                <option value="transfer">Transfer</option>
                            </select>
                        </div>
                        <div>
                            <div className="mb-2 text-sm font-medium">Diskon</div>
                            <input
                                type="number"
                                min="0"
                                className={inputBase}
                                value={form.discount}
                                onChange={(e) => setField("discount", e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* ========== Catatan ========== */}
            <label className="block">
                <span className="mb-2 block text-sm font-medium">Catatan</span>
                <textarea
                    className={inputBase}
                    rows={3}
                    value={form.notes}
                    onChange={(e) => setField("notes", e.target.value)}
                    placeholder="Catatan tambahan (opsional)"
                />
            </label>

            {/* ========== Item ========== */}
            {isCreate && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="font-semibold">Item</div>
                        <button type="button" onClick={addItem} className={btnGhost}>
                            <Plus className="h-4 w-4" /> Tambah Item
                        </button>
                    </div>

                    {(form.items || []).length === 0 ? (
                        <div className="text-sm text-slate-600 border border-slate-900/15 rounded-xl p-3 text-center">
                            Belum ada item
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {form.items.map((it, idx) => {
                                const p = productIndex.get(it.product_id);
                                return (
                                    <div
                                        key={idx}
                                        className="grid grid-cols-1 md:grid-cols-7 gap-3 border border-slate-900/10 rounded-2xl p-3"
                                    >
                                        <select
                                            className="md:col-span-2 w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-900/20 outline-none focus:ring-4 focus:ring-sky-600/30 focus:border-sky-600"
                                            value={it.product_id}
                                            onChange={(e) => onPickProduct(idx, e.target.value)}
                                        >
                                            <option value="">Pilih produk...</option>
                                            {products.map((p) => (
                                                <option key={p.id} value={p.id}>
                                                    {p.name}
                                                </option>
                                            ))}
                                        </select>

                                        <label className="flex items-center gap-2 text-sm">
                                            <input
                                                type="checkbox"
                                                checked={!!it.is_area}
                                                onChange={(e) => setItem(idx, { is_area: e.target.checked })}
                                            />
                                            By Area
                                        </label>

                                        {it.is_area ? (
                                            <>
                                                {/* Qty buah untuk area */}
                                                <input
                                                    type="number"
                                                    min="1"
                                                    step="1"
                                                    placeholder="Qty"
                                                    className={inputBase}
                                                    value={it.qty ?? 1}
                                                    onChange={(e) => setItem(idx, { qty: e.target.value })}
                                                />

                                                {/* Panjang & Lebar boleh float */}
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="any"
                                                    placeholder="Panjang"
                                                    className={inputBase}
                                                    value={it.area_w ?? ""}
                                                    onChange={(e) => setItem(idx, { area_w: e.target.value })}
                                                />
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="any"
                                                    placeholder="Lebar"
                                                    className={inputBase}
                                                    value={it.area_h ?? ""}
                                                    onChange={(e) => setItem(idx, { area_h: e.target.value })}
                                                />

                                                {/* Harga per m² juga boleh float */}
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="any"
                                                    placeholder="Harga/m² (opsional)"
                                                    className={inputBase}
                                                    value={it.area_unit_price ?? ""}
                                                    onChange={(e) => setItem(idx, { area_unit_price: e.target.value })}
                                                />
                                            </>
                                        ) : (
                                            <>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    step="1"
                                                    placeholder="Qty"
                                                    className={inputBase}
                                                    value={it.qty || 1}
                                                    onChange={(e) => setItem(idx, { qty: e.target.value })}
                                                />
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="any"
                                                    placeholder="Harga/unit (opsional)"
                                                    className={inputBase}
                                                    value={it.unit_price ?? ""}
                                                    onChange={(e) => setItem(idx, { unit_price: e.target.value })}
                                                />
                                                <div />
                                            </>
                                        )}


                                        <div className="flex justify-end">
                                            <button
                                                type="button"
                                                onClick={() => removeItem(idx)}
                                                className={btnGhost}
                                            >
                                                <X className="h-4 w-4" /> Hapus
                                            </button>
                                        </div>

                                        {p?.unitCategory?.name && (
                                            <div className="md:col-span-7 -mt-2 text-xs text-slate-500">
                                                Satuan: {p.unitCategory.name}
                                                {typeof p.is_area === "boolean" &&
                                                    ` • Default by area: ${p.is_area ? "Ya" : "Tidak"}`}
                                                {p?.price_normal && ` • Harga dasar: ${Number(p.price_normal).toLocaleString("id-ID")}`}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ========== DP & Cicilan (muncul saat payment_status = "dp") ========== */}
            {isCreate && form.payment_status === "dp" && (
                <div className="border border-amber-200 bg-amber-50 rounded-2xl p-4 space-y-3">
                    <div className="font-semibold">Pengaturan DP & Cicilan</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                            <div className="mb-2 text-sm font-medium">Nominal DP</div>
                            <input
                                type="number"
                                min="0"
                                className={inputBase}
                                value={form.dp_amount}
                                onChange={(e) => setField("dp_amount", e.target.value)}
                            />
                        </div>
                        <div>
                            <div className="mb-2 text-sm font-medium">Jumlah Cicilan</div>
                            <input
                                type="number"
                                min="1"
                                className={inputBase}
                                value={form.installments_count}
                                onChange={(e) => setField("installments_count", e.target.value)}
                            />
                        </div>
                        <div>
                            <div className="mb-2 text-sm font-medium">Tipe Jadwal</div>
                            <select
                                className={inputBase}
                                value={form.schedule_type}
                                onChange={(e) => setField("schedule_type", e.target.value)}
                            >
                                <option value="auto">Auto (tiap minggu)</option>
                            </select>
                        </div>
                    </div>
                    <p className="text-xs text-slate-600">
                        Jadwal auto akan membuat cicilan mingguan dengan jumlah yang relatif sama.
                        (Server akan hitung & menyimpan Receivable + Schedules.)
                    </p>
                </div>
            )}

            {/* ========== Ringkasan Cepat ========== */}
            <div className="border border-slate-900/15 rounded-2xl p-4">
                <div className="font-semibold mb-3">Ringkasan</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                        <div className="text-slate-500">Subtotal (perkiraan)</div>
                        <div className="font-semibold">
                            {estimateTotals.subtotal.toLocaleString("id-ID")}
                        </div>
                    </div>
                    <div>
                        <div className="text-slate-500">Diskon</div>
                        <div className="font-semibold">
                            {Number(form.discount || 0).toLocaleString("id-ID")}
                        </div>
                    </div>
                    <div>
                        <div className="text-slate-500">Total (perkiraan)</div>
                        <div className="font-semibold">
                            {estimateTotals.total.toLocaleString("id-ID")}
                        </div>
                    </div>
                    <div>
                        <div className="text-slate-500">
                            {form.payment_status === "lunas" ? "Dibayar" : "DP"}
                        </div>
                        <div className="font-semibold">
                            {estimateTotals.paid_amount.toLocaleString("id-ID")}
                        </div>
                    </div>
                </div>
                <div className="mt-1 text-xs text-slate-500">
                    Angka di atas hanyalah estimasi (server dapat menerapkan special price
                    otomatis berdasarkan kategori pelanggan).
                </div>
            </div>

            {/* ========== Tombol Aksi ========== */}
            <div className="flex gap-2">
                <button className={btnPrimary} disabled={saving}>
                    {isCreate ? "Simpan Sales" : "Simpan Perubahan"}
                </button>
                {!isCreate && (
                    <button className={btnGhost} type="button" onClick={() => onSuccess?.()}>
                        Batal
                    </button>
                )}
            </div>
        </form>
    );
}
