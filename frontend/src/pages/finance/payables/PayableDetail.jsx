// src/pages/finance/payables/PayableDetail.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "../../../config/axios";
import { HeaderBack, btnGhost, btnPrimary, Th, inputBase, formatCurrency } from "../../produk/_ui";

export default function PayableDetail() {
    const { id } = useParams();
    const nav = useNavigate();
    const [p, setP] = useState(null);
    const [loading, setLoading] = useState(true);
    const [payOpen, setPayOpen] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get(`/api/payables/${id}`);
            setP(data?.payable ?? data?.data ?? null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [id]);

    if (loading) return <div>Memuat…</div>;
    if (!p) return <div>Tidak ditemukan</div>;

    const paid = Number(p.total_due || 0) - Number(p.balance || 0);

    return (
        <div className="space-y-4">
            <HeaderBack
                title={`Hutang • ${p.supplier_name || "-"}`}
                onBack={() => nav(-1)}
                extra={
                    <div className="flex gap-2">
                        {p.status !== "closed" && (
                            <button className={btnPrimary} onClick={() => setPayOpen(true)}>Bayar</button>
                        )}
                    </div>
                }
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-3">
                    <InfoRow label="Supplier" value={p.supplier_name || "-"} />
                    <InfoRow label="Status" value={p.status || "-"} />
                    <InfoRow label="Total" value={formatCurrency(p.total_due)} />
                    <InfoRow label="Terbayar" value={formatCurrency(paid)} />
                    <InfoRow label="Sisa" value={formatCurrency(p.balance)} />
                    <InfoRow label="Jatuh Tempo Berikutnya" value={p.next_due_at ? new Date(p.next_due_at).toLocaleDateString("id-ID") : "-"} />
                </div>

                <div className="space-y-3">
                    <div className="border border-slate-900/10 rounded-xl overflow-hidden">
                        <div className="px-4 py-2 bg-slate-50 font-semibold">Jadwal Cicilan</div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                <tr className="bg-slate-50"><Th>#</Th><Th>Jatuh Tempo</Th><Th>Tagihan</Th><Th>Dibayar</Th><Th>Status</Th></tr>
                                </thead>
                                <tbody>
                                {(p.schedules || []).length === 0 ? (
                                    <tr><td colSpan={5} className="p-4 text-center text-slate-500">Tidak ada jadwal</td></tr>
                                ) : (p.schedules || []).map((s) => (
                                    <tr key={s.id} className="border-t border-slate-900/10">
                                        <td className="p-3">{s.installment_no}</td>
                                        <td className="p-3">{s.due_at ? new Date(s.due_at).toLocaleDateString("id-ID") : "-"}</td>
                                        <td className="p-3">{formatCurrency(s.amount)}</td>
                                        <td className="p-3">{formatCurrency(s.paid_amount)}</td>
                                        <td className="p-3">{s.status}</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="border border-slate-900/10 rounded-xl overflow-hidden">
                        <div className="px-4 py-2 bg-slate-50 font-semibold">Pembayaran</div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                <tr className="bg-slate-50"><Th>Tanggal</Th><Th>Metode</Th><Th>Ref</Th><Th className="text-right pr-4">Jumlah</Th></tr>
                                </thead>
                                <tbody>
                                {(p.payments || []).length === 0 ? (
                                    <tr><td colSpan={4} className="p-4 text-center text-slate-500">Belum ada pembayaran</td></tr>
                                ) : (p.payments || []).map((pm) => (
                                    <tr key={pm.id} className="border-t border-slate-900/10">
                                        <td className="p-3">{pm.paid_at ? new Date(pm.paid_at).toLocaleString("id-ID") : "-"}</td>
                                        <td className="p-3">{pm.method || "-"}</td>
                                        <td className="p-3">{pm.reference_no || "-"}</td>
                                        <td className="p-3 pr-4 text-right">{formatCurrency(pm.amount)}</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            </div>

            {payOpen && (
                <PayDialog
                    onClose={() => setPayOpen(false)}
                    onSuccess={async () => { setPayOpen(false); await load(); }}
                    payableId={id}
                    maxAmount={p.balance || 0}
                />
            )}
        </div>
    );
}

function InfoRow({ label, value }) {
    return (
        <div className="flex items-center justify-between border border-slate-900/10 rounded-xl px-4 py-3">
            <div className="text-sm text-slate-600">{label}</div>
            <div className="font-medium max-w-[60%] text-right truncate" title={String(value)}>{value}</div>
        </div>
    );
}

function PayDialog({ payableId, onClose, onSuccess, maxAmount }) {
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ amount: "", method: "transfer", reference_no: "", paid_at: new Date().toISOString().slice(0,16) });

    const submit = async (e) => {
        e.preventDefault(); setSaving(true);
        try {
            const payload = {
                amount: Number(form.amount || 0),
                method: form.method || "transfer",
                reference_no: form.reference_no || null,
                paid_at: form.paid_at ? new Date(form.paid_at).toISOString() : new Date().toISOString(),
            };
            await axios.post(`/api/payables/${payableId}/payments`, payload);
            onSuccess?.();
        } finally { setSaving(false); }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl w-full max-w-md border border-slate-200">
                <div className="px-4 py-3 border-b border-slate-200 font-semibold">Bayar Hutang</div>
                <form onSubmit={submit} className="p-4 space-y-3">
                    <div>
                        <label className="text-sm block mb-1">Jumlah (maks {formatCurrency(maxAmount)})</label>
                        <input
                            className={inputBase}
                            type="number"
                            min="1"
                            max={Number(maxAmount || 0)}
                            value={form.amount}
                            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                            required
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-sm block mb-1">Metode</label>
                            <select
                                className={inputBase}
                                value={form.method}
                                onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}
                            >
                                <option value="transfer">Transfer</option>
                                <option value="tunai">Tunai</option>
                                <option value="qris">QRIS</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm block mb-1">Waktu Bayar</label>
                            <input
                                type="datetime-local"
                                className={inputBase}
                                value={form.paid_at}
                                onChange={(e) => setForm((f) => ({ ...f, paid_at: e.target.value }))}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-sm block mb-1">No. Referensi (opsional)</label>
                        <input
                            className={inputBase}
                            value={form.reference_no}
                            onChange={(e) => setForm((f) => ({ ...f, reference_no: e.target.value }))}
                            placeholder="INV/REF/TRANS#"
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" className={btnGhost} onClick={onClose}>Batal</button>
                        <button type="submit" className={btnPrimary} disabled={saving}>Simpan</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
