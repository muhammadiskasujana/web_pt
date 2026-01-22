// src/pages/finance/payables/PayablesList.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import axios from "../../../config/axios";
import { inputBase, btnGhost, btnPrimary, Th, formatCurrency } from "../../produk/_ui";
import { Search, ChevronLeft, ChevronRight, Eye, CheckSquare, Square, Loader2, X } from "lucide-react";

export default function PayablesList() {
    const [params, setParams] = useSearchParams();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
    const [selected, setSelected] = useState(() => new Set());

    // === Modal state for choosing payment method (single or bulk) ===
    const [settleModal, setSettleModal] = useState({ open: false, mode: null, id: null });
    const [method, setMethod] = useState("transfer");
    const [referenceNo, setReferenceNo] = useState("");

    const page = parseInt(params.get("page") || "1", 10);
    const limit = parseInt(params.get("limit") || "10", 10);
    const status = params.get("status") || "";
    const supplier_name = params.get("supplier_name") || "";

    const totalPages = useMemo(
        () => meta.pages || Math.max(1, Math.ceil((meta.total || 0) / (meta.limit || 10))),
        [meta]
    );

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get("/api/payables", {
                params: { page, limit, status: status || undefined, supplier_name: supplier_name || undefined },
            });
            const list = data?.payables ?? data?.data ?? [];
            setItems(Array.isArray(list) ? list : []);
            setMeta(
                data?.pagination ?? {
                    page,
                    limit,
                    total: list.length,
                    pages: Math.max(1, Math.ceil(list.length / limit)),
                }
            );
            setSelected(new Set());
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); /* eslint-disable-next-line */ }, [page, limit, status, supplier_name]);

    const onSubmit = (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const next = new URLSearchParams(params);
        next.set("supplier_name", (fd.get("supplier_name") || "").toString());
        next.set("status", (fd.get("status") || "").toString());
        next.set("page", "1");
        setParams(next);
    };

    // === Totals for current page ===
    const { sumTotalDue, sumPaid, sumBalance } = useMemo(() => {
        const sums = items.reduce((acc, p) => {
            const totalDue = Number(p.total_due || 0);
            const balance = Number(p.balance || 0);
            const paid = Math.max(0, totalDue - balance);
            acc.sumTotalDue += totalDue;
            acc.sumPaid += paid;
            acc.sumBalance += balance;
            return acc;
        }, { sumTotalDue: 0, sumPaid: 0, sumBalance: 0 });
        return sums;
    }, [items]);

    // === Selection helpers ===
    const toggleOne = (id) => {
        setSelected(prev => {
            const s = new Set(prev);
            if (s.has(id)) s.delete(id); else s.add(id);
            return s;
        });
    };
    const selectableIds = useMemo(() => items.filter(p => (p.status !== 'closed' && Number(p.balance) > 0)).map(p => p.id), [items]);
    const isAllSelected = selectableIds.length > 0 && selectableIds.every(id => selected.has(id));
    const toggleAll = () => {
        setSelected(prev => {
            if (isAllSelected) return new Set();
            const s = new Set(prev);
            selectableIds.forEach(id => s.add(id));
            return s;
        });
    };

    // === Actions ===
    const askMethodForOne = (id) => {
        setMethod("transfer");
        setReferenceNo("");
        setSettleModal({ open: true, mode: 'single', id });
    };
    const askMethodForBulk = () => {
        if (selected.size === 0) return;
        setMethod("transfer");
        setReferenceNo("");
        setSettleModal({ open: true, mode: 'bulk', id: null });
    };

    const doSettle = async () => {
        if (!settleModal.open) return;
        setActionLoading(true);
        try {
            if (settleModal.mode === 'single' && settleModal.id) {
                await axios.post(`/api/payables/${settleModal.id}/settle`, { method, reference_no: referenceNo || null });
            } else if (settleModal.mode === 'bulk') {
                const ids = Array.from(selected);
                await axios.post('/api/payables/bulk/settle', { ids, method, reference_no: referenceNo || null });
            }
            await fetchData();
            setSettleModal({ open: false, mode: null, id: null });
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">Daftar Hutang (Payables)</h2>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={askMethodForBulk}
                        disabled={selected.size === 0 || actionLoading}
                        className={`${btnPrimary} disabled:opacity-50`}
                    >
                        {actionLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Lunaskan Terpilih'}
                    </button>
                </div>
            </div>

            <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                        name="supplier_name"
                        defaultValue={supplier_name}
                        placeholder="Cari supplier"
                        className={`${inputBase} pl-9`}
                    />
                </div>
                <select name="status" defaultValue={status} className={inputBase}>
                    <option value="">Semua Status</option>
                    <option value="open">Open</option>
                    <option value="closed">Closed</option>
                </select>
                <div className="flex gap-2">
                    <button className={btnGhost} type="submit">Terapkan</button>
                </div>
            </form>

            <div className="overflow-x-auto border border-slate-900/15 rounded-xl">
                <table className="w-full text-sm">
                    <thead>
                    <tr className="bg-slate-50">
                        <Th className="w-10">
                            <button type="button" onClick={toggleAll} title={isAllSelected ? 'Batalkan pilih semua' : 'Pilih semua'} className="p-1">
                                {isAllSelected ? <CheckSquare className="h-4 w-4"/> : <Square className="h-4 w-4"/>}
                            </button>
                        </Th>
                        <Th>Tgl Buat</Th>
                        <Th>Supplier</Th>
                        <Th>Total</Th>
                        <Th>Terbayar</Th>
                        <Th>Sisa</Th>
                        <Th>Status</Th>
                        <Th>Jatuh Tempo Berikutnya</Th>
                        <Th className="text-right pr-4">Aksi</Th>
                    </tr>
                    </thead>
                    <tbody>
                    {loading ? (
                        <tr><td colSpan={9} className="p-6 text-center">Memuat…</td></tr>
                    ) : items.length === 0 ? (
                        <tr><td colSpan={9} className="p-6 text-center">Tidak ada data</td></tr>
                    ) : (
                        items.map((p) => {
                            const isClosed = p.status === 'closed' || Number(p.balance) === 0;
                            const isChecked = selected.has(p.id);
                            const total = Number(p.total_due || 0);
                            const paid = Math.max(0, total - Number(p.balance || 0));
                            return (
                                <tr key={p.id} className="border-t border-slate-900/10">
                                    <td className="p-3">
                                        <input type="checkbox" checked={isChecked} disabled={isClosed} onChange={() => toggleOne(p.id)} />
                                    </td>
                                    <td className="p-3">{new Date(p.created_at || p.createdAt).toLocaleString("id-ID")}</td>
                                    <td className="p-3">{p.supplier_name || "-"}</td>
                                    <td className="p-3">{formatCurrency(total)}</td>
                                    <td className="p-3">{formatCurrency(paid)}</td>
                                    <td className="p-3">{formatCurrency(p.balance)}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-0.5 rounded-full text-xs border ${
                                            p.status === "closed"
                                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                : "bg-amber-50 text-amber-700 border-amber-200"
                                        }`}>{p.status}</span>
                                    </td>
                                    <td className="p-3">{p.next_due_at ? new Date(p.next_due_at).toLocaleDateString("id-ID") : "-"}</td>
                                    <td className="p-3 pr-4">
                                        <div className="flex justify-end gap-2">
                                            <Link className={btnGhost} to={`/payables/${p.id}`}><Eye className="h-4 w-4" /> Detail</Link>
                                            <button
                                                className={`${btnPrimary} disabled:opacity-50`}
                                                disabled={isClosed || actionLoading}
                                                onClick={() => askMethodForOne(p.id)}
                                            >
                                                {isClosed ? 'Lunas' : 'Lunaskan'}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })
                    )}
                    </tbody>
                    <tfoot>
                    <tr className="border-t bg-slate-50 font-semibold">
                        <td className="p-3" colSpan={3}>Total (halaman ini)</td>
                        <td className="p-3">{formatCurrency(sumTotalDue)}</td>
                        <td className="p-3">{formatCurrency(sumPaid)}</td>
                        <td className="p-3">{formatCurrency(sumBalance)}</td>
                        <td className="p-3" colSpan={3}></td>
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
                        onClick={() => setParams(prev => {
                            const n = new URLSearchParams(prev); n.set("page", String(Math.max(1, meta.page - 1))); return n;
                        })}
                    ><ChevronLeft className="h-4 w-4" /></button>
                    <button
                        className={btnGhost}
                        onClick={() => setParams(prev => {
                            const n = new URLSearchParams(prev); n.set("page", String(Math.min(totalPages, meta.page + 1))); return n;
                        })}
                    ><ChevronRight className="h-4 w-4" /></button>
                </div>
            </div>

            {/* Settle Method Modal */}
            {settleModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/30" onClick={() => setSettleModal({ open:false, mode:null, id:null })} />
                    <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-4 mx-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-base font-semibold">Pilih Metode Pembayaran</h3>
                            <button onClick={() => setSettleModal({ open:false, mode:null, id:null })} className="p-1"><X className="h-5 w-5"/></button>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <label className="flex items-center gap-2">
                                    <input type="radio" name="method" value="transfer" checked={method==='transfer'} onChange={(e)=>setMethod(e.target.value)} />
                                    <span>Transfer</span>
                                </label>
                                <label className="flex items-center gap-2">
                                    <input type="radio" name="method" value="cash" checked={method==='cash'} onChange={(e)=>setMethod(e.target.value)} />
                                    <span>Cash</span>
                                </label>
                            </div>
                            <div>
                                <label className="block text-sm text-slate-600 mb-1">No. Referensi (opsional)</label>
                                <input className={inputBase} placeholder="No. referensi/nomor transfer/keterangan" value={referenceNo} onChange={(e)=>setReferenceNo(e.target.value)} />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                            <button className={btnGhost} onClick={() => setSettleModal({ open:false, mode:null, id:null })}>Batal</button>
                            <button className={`${btnPrimary} disabled:opacity-50`} disabled={actionLoading} onClick={doSettle}>
                                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Konfirmasi & Lunaskan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
