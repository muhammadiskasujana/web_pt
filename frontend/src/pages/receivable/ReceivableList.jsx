// ──────────────────────────────────────────────────────────────────────────────
// File: src/pages/receivable/ReceivableList.jsx
// ──────────────────────────────────────────────────────────────────────────────
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import axios from "../../config/axios";
import {
    Search, RefreshCcw, ChevronLeft, ChevronRight,
    CheckSquare, Square, Loader2, X
} from "lucide-react";
import { btnPrimary, btnGhost, inputBase, Th, HeaderBack, formatCurrency } from "../produk/_ui";

const statusOptions = [
    { value: "", label: "Semua Status" },
    { value: "open", label: "Open" },
    { value: "closed", label: "Closed" },
];

export default function ReceivableList() {
    const [params, setParams] = useSearchParams();
    const [items, setItems] = useState([]);
    const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [selected, setSelected] = useState(() => new Set());

    // modal settle (full) single/bulk
    const [settleModal, setSettleModal] = useState({ open: false, mode: null, id: null });
    const [method, setMethod] = useState("transfer"); // 'transfer' | 'cash' (backend juga menerima 'tunai' = 'cash')
    const [referenceNo, setReferenceNo] = useState("");

    // modal bulk pay by amount
    const [bulkPayModal, setBulkPayModal] = useState({ open: false });
    const [bulkAmountInput, setBulkAmountInput] = useState("");
    const [bulkMethod, setBulkMethod] = useState("transfer");
    const [bulkReferenceNo, setBulkReferenceNo] = useState("");

    const customer_name = params.get("customer_name") || "";
    const status = params.get("status") || "";
    const page = parseInt(params.get("page") || "1", 10);
    const limit = parseInt(params.get("limit") || "10", 10);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get("/api/receivables", {
                params: { customer_name, status, page, limit },
            });

            const list = data?.receivables ?? data?.items ?? [];
            const p = data?.pagination ?? {};
            setItems(Array.isArray(list) ? list : []);
            setMeta({
                page: Number(p.page || page),
                limit: Number(p.limit || limit),
                total: Number(p.total || list.length || 0),
                pages:
                    Number(p.pages) ||
                    Math.max(1, Math.ceil((Number(p.total || list.length || 0)) / Number(p.limit || limit || 10))),
            });
            // reset selections setiap refresh
            setSelected(new Set());
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [customer_name, status, page, limit]);

    const onSubmit = (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const next = new URLSearchParams(params);
        next.set("customer_name", (fd.get("customer_name") || "").toString());
        next.set("status", (fd.get("status") || "").toString());
        next.set("page", "1");
        setParams(next);
    };

    const totalPages = meta.pages || 1;

    // === Totals (page) ===
    const { sumTotalDue, sumPaid, sumBalance } = useMemo(() => {
        const sums = items.reduce(
            (acc, r) => {
                const totalDue = Number(r.total_due || 0);
                const balance = Number(r.balance || 0);
                const paid = Math.max(0, totalDue - balance);
                acc.sumTotalDue += totalDue;
                acc.sumPaid += paid;
                acc.sumBalance += balance;
                return acc;
            },
            { sumTotalDue: 0, sumPaid: 0, sumBalance: 0 }
        );
        return sums;
    }, [items]);

    // === Selection ===
    const toggleOne = (id) => {
        setSelected((prev) => {
            const s = new Set(prev);
            if (s.has(id)) s.delete(id);
            else s.add(id);
            return s;
        });
    };
    const allSelectableIds = useMemo(
        () => items.filter((r) => r.status !== "closed" && Number(r.balance) > 0).map((r) => r.id),
        [items]
    );
    const isAllSelected = allSelectableIds.length > 0 && allSelectableIds.every((id) => selected.has(id));
    const toggleAll = () => {
        setSelected((prev) => {
            if (isAllSelected) return new Set();
            const s = new Set(prev);
            allSelectableIds.forEach((id) => s.add(id));
            return s;
        });
    };

    // hitung total balance dari yang dipilih
    const { selectedIds, selectedTotalBalance } = useMemo(() => {
        const ids = Array.from(selected);
        const bal = ids.reduce((acc, id) => {
            const r = items.find((x) => x.id === id);
            return acc + Number(r?.balance || 0);
        }, 0);
        return { selectedIds: ids, selectedTotalBalance: bal };
    }, [selected, items]);

    // === Actions ===
    const askMethodForOne = (id) => {
        setMethod("transfer");
        setReferenceNo("");
        setSettleModal({ open: true, mode: "single", id });
    };
    const askMethodForBulkSettle = () => {
        if (selected.size === 0) return;
        setMethod("transfer");
        setReferenceNo("");
        setSettleModal({ open: true, mode: "bulk", id: null });
    };

    const openBulkPayModal = () => {
        if (selected.size === 0) return;
        setBulkMethod("transfer");
        setBulkReferenceNo("");
        setBulkAmountInput("");
        setBulkPayModal({ open: true });
    };

    const doSettle = async () => {
        if (!settleModal.open) return;
        setActionLoading(true);
        try {
            if (settleModal.mode === "single" && settleModal.id) {
                await axios.post(`/api/receivables/${settleModal.id}/settle`, {
                    method: method === "cash" ? "tunai" : method,
                    reference_no: referenceNo || null,
                });
            } else if (settleModal.mode === "bulk") {
                const ids = Array.from(selected);
                await axios.post("/api/receivables/bulk/settle", {
                    ids,
                    method: method === "cash" ? "tunai" : method,
                    reference_no: referenceNo || null,
                });
            }
            await fetchData();
            setSettleModal({ open: false, mode: null, id: null });
        } finally {
            setActionLoading(false);
        }
    };

    const parseMoney = (s) => {
        if (!s) return 0;
        // terima input "40.000", "40,000", "40000"
        const n = Number(String(s).replace(/[^\d]/g, ""));
        return Number.isFinite(n) ? n : 0;
    };

    const doBulkPayAmount = async () => {
        const amount = parseMoney(bulkAmountInput);
        if (!amount || amount <= 0) {
            alert("Masukkan nominal pembayaran yang valid (> 0).");
            return;
        }
        if (selectedIds.length === 0) return;

        // FE guard: jangan sampai melebihi total sisa yang dipilih
        if (amount > selectedTotalBalance) {
            alert(`Nominal terlalu besar. Maksimal ${formatCurrency(selectedTotalBalance)}.`);
            return;
        }

        setActionLoading(true);
        try {
            await axios.post("/api/receivables/bulk/pay-amount", {
                ids: selectedIds,                               // urutan sesuai centang
                amount,                                          // angka murni (tanpa titik/koma)
                method: bulkMethod === "cash" ? "tunai" : bulkMethod,
                reference_no: bulkReferenceNo || null,
            });
            await fetchData();
            setBulkPayModal({ open: false });
        } catch (err) {
            const data = err?.response?.data;
            // Tampilkan batas maksimum dari backend bila tersedia
            if (data?.error === "INVALID_TOTAL_AMOUNT" && Number.isFinite(data?.max_allowed)) {
                alert(`Nominal terlalu besar. Maksimal ${formatCurrency(data.max_allowed)}.`);
            } else {
                alert(data?.error || "Gagal memproses pembayaran.");
            }
        } finally {
            setActionLoading(false);
        }
    };


    return (
        <div className="space-y-4">
            <HeaderBack title="Receivables" />

            <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                        name="customer_name"
                        defaultValue={customer_name}
                        placeholder="Nama pelanggan"
                        className={`${inputBase} pl-9`}
                    />
                </div>
                <select name="status" defaultValue={status} className={inputBase}>
                    {statusOptions.map((s) => (
                        <option key={s.value} value={s.value}>
                            {s.label}
                        </option>
                    ))}
                </select>
                <div className="flex gap-2">
                    <button type="submit" className={btnGhost}>
                        Terapkan
                    </button>
                    <button type="button" onClick={fetchData} className={btnGhost} title="Refresh">
                        <RefreshCcw className="h-4 w-4" />
                    </button>
                </div>
            </form>

            <div className="flex items-center justify-between">
                <div className="text-sm text-slate-600">
                    Pilih: {selected.size} dipilih
                    {selected.size > 0 && (
                        <span className="ml-2 text-slate-500">
              • Total sisa: {formatCurrency(selectedTotalBalance)}
            </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={openBulkPayModal}
                        disabled={selected.size === 0 || actionLoading}
                        className={`${btnPrimary} disabled:opacity-50`}
                        title="Bayar nominal ke banyak tagihan (alokasi dari yang terakhir dicentang)"
                    >
                        {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Bayar Nominal"}
                    </button>

                    <button
                        type="button"
                        onClick={askMethodForBulkSettle}
                        disabled={selected.size === 0 || actionLoading}
                        className={`${btnPrimary} disabled:opacity-50`}
                        title="Lunaskan seluruh tagihan yang dipilih (full settle)"
                    >
                        {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Lunaskan Terpilih"}
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto border border-slate-900/15 rounded-xl">
                <table className="w-full text-sm">
                    <thead>
                    <tr className="bg-slate-50">
                        <Th className="w-10">
                            <button
                                type="button"
                                onClick={toggleAll}
                                title={isAllSelected ? "Batalkan pilih semua" : "Pilih semua"}
                                className="p-1"
                            >
                                {isAllSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                            </button>
                        </Th>
                        <Th>Customer</Th>
                        <Th>Status</Th>
                        <Th>Next Due</Th>
                        <Th>Total Due</Th>
                        <Th>Balance</Th>
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
                        items.map((r) => {
                            const isClosed = r.status === "closed" || Number(r.balance) === 0;
                            const isChecked = selected.has(r.id);
                            return (
                                <tr key={r.id} className="border-t border-slate-900/10">
                                    <td className="p-3">
                                        <input
                                            type="checkbox"
                                            checked={isChecked}
                                            disabled={isClosed}
                                            onChange={() => toggleOne(r.id)}
                                        />
                                    </td>
                                    <td className="p-3 font-medium">{r.customer_name}</td>
                                    <td className="p-3 capitalize">{r.status || "-"}</td>
                                    <td className="p-3">
                                        {r.next_due_at ? new Date(r.next_due_at).toLocaleString("id-ID") : "-"}
                                    </td>
                                    <td className="p-3">{formatCurrency(r.total_due)}</td>
                                    <td className="p-3">{formatCurrency(r.balance)}</td>
                                    <td className="p-3 text-right pr-4 flex justify-end gap-2">
                                        <Link className={btnGhost} to={`/receivables/${r.id}`}>
                                            Detail
                                        </Link>
                                        <button
                                            className={`${btnPrimary} disabled:opacity-50`}
                                            disabled={isClosed || actionLoading}
                                            onClick={() => askMethodForOne(r.id)}
                                        >
                                            {isClosed ? "Lunas" : "Lunaskan"}
                                        </button>
                                    </td>
                                </tr>
                            );
                        })
                    )}
                    </tbody>
                    {/* Totals Row */}
                    <tfoot>
                    <tr className="border-t bg-slate-50 font-semibold">
                        <td className="p-3" colSpan={4}>
                            Total (halaman ini)
                        </td>
                        <td className="p-3">{formatCurrency(sumTotalDue)}</td>
                        <td className="p-3">{formatCurrency(sumBalance)}</td>
                        <td className="p-3 text-right pr-4">
                            <span className="text-slate-600 font-normal mr-2">Dibayar:</span>
                            <span>{formatCurrency(sumPaid)}</span>
                        </td>
                    </tr>
                    </tfoot>
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

            {/* Settle Method Modal (Full) */}
            {settleModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/30"
                        onClick={() => setSettleModal({ open: false, mode: null, id: null })}
                    />
                    <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-4 mx-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-base font-semibold">Pilih Metode Pembayaran (Pelunasan)</h3>
                            <button
                                onClick={() => setSettleModal({ open: false, mode: null, id: null })}
                                className="p-1"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <label className="flex items-center gap-2">
                                    <input
                                        type="radio"
                                        name="method"
                                        value="transfer"
                                        checked={method === "transfer"}
                                        onChange={(e) => setMethod(e.target.value)}
                                    />
                                    <span>Transfer</span>
                                </label>
                                <label className="flex items-center gap-2">
                                    <input
                                        type="radio"
                                        name="method"
                                        value="cash"
                                        checked={method === "cash"}
                                        onChange={(e) => setMethod(e.target.value)}
                                    />
                                    <span>Cash</span>
                                </label>
                            </div>
                            <div>
                                <label className="block text-sm text-slate-600 mb-1">No. Referensi (opsional)</label>
                                <input
                                    className={inputBase}
                                    placeholder="No. referensi/nomor transfer/keterangan"
                                    value={referenceNo}
                                    onChange={(e) => setReferenceNo(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                            <button
                                className={btnGhost}
                                onClick={() => setSettleModal({ open: false, mode: null, id: null })}
                            >
                                Batal
                            </button>
                            <button
                                className={`${btnPrimary} disabled:opacity-50`}
                                disabled={actionLoading}
                                onClick={doSettle}
                            >
                                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Konfirmasi & Lunaskan"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Pay Amount Modal */}
            {bulkPayModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/30" onClick={() => setBulkPayModal({ open: false })} />
                    <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-4 mx-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-base font-semibold">Bayar Nominal (Banyak Tagihan)</h3>
                            <button onClick={() => setBulkPayModal({ open: false })} className="p-1">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div className="text-sm text-slate-600">
                                Dipilih: <b>{selectedIds.length}</b> • Total sisa: <b>{formatCurrency(selectedTotalBalance)}</b>
                                <div className="text-xs text-slate-500 mt-1">
                                    Alokasi dimulai dari <i>yang terakhir dicentang</i> hingga dana habis.
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm text-slate-600 mb-1">Jumlah Bayar</label>
                                <input
                                    className={inputBase}
                                    placeholder="cth: 40.000"
                                    value={bulkAmountInput}
                                    onChange={(e) => setBulkAmountInput(e.target.value)}
                                />
                                <div className="text-xs text-slate-500 mt-1">
                                    Maksimal {formatCurrency(selectedTotalBalance)} (boleh kurang).
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <label className="flex items-center gap-2">
                                    <input
                                        type="radio"
                                        name="bulkMethod"
                                        value="transfer"
                                        checked={bulkMethod === "transfer"}
                                        onChange={(e) => setBulkMethod(e.target.value)}
                                    />
                                    <span>Transfer</span>
                                </label>
                                <label className="flex items-center gap-2">
                                    <input
                                        type="radio"
                                        name="bulkMethod"
                                        value="cash"
                                        checked={bulkMethod === "cash"}
                                        onChange={(e) => setBulkMethod(e.target.value)}
                                    />
                                    <span>Cash</span>
                                </label>
                            </div>

                            <div>
                                <label className="block text-sm text-slate-600 mb-1">No. Referensi (opsional)</label>
                                <input
                                    className={inputBase}
                                    placeholder="No. referensi/nomor transfer/keterangan"
                                    value={bulkReferenceNo}
                                    onChange={(e) => setBulkReferenceNo(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-4">
                            <button className={btnGhost} onClick={() => setBulkPayModal({ open: false })}>
                                Batal
                            </button>
                            <button
                                className={`${btnPrimary} disabled:opacity-50`}
                                disabled={actionLoading || selectedIds.length === 0}
                                onClick={doBulkPayAmount}
                            >
                                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Bayar Sekarang"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
