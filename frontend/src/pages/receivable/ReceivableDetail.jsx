// ──────────────────────────────────────────────────────────────────────────────
// File: src/pages/receivable/ReceivableDetail.jsx
// ──────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "../../config/axios";
import { HeaderBack, Th, btnPrimary, btnGhost, inputBase, formatCurrency } from "../produk/_ui";
import { Save } from "lucide-react";

export default function ReceivableDetail() {
    const { id } = useParams();
    const nav = useNavigate();
    const [rc, setRc] = useState(null);
    const [loading, setLoading] = useState(true);
    const [pay, setPay] = useState({ amount: "", method: "tunai", reference_no: "", paid_at: "" });
    const [saving, setSaving] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get(`/api/receivables/${id}`);
            const obj = data?.receivable ?? data;
            setRc(obj);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

    const submitPay = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = {
                amount: Number(pay.amount || 0),
                method: pay.method || "tunai",
                reference_no: pay.reference_no || null,
                paid_at: pay.paid_at || new Date(),
            };
            await axios.post(`/api/receivables/${id}/payments`, payload);
            setPay({ amount: "", method: "tunai", reference_no: "", paid_at: "" });
            await load();
            alert("Pembayaran dicatat");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div>Memuat...</div>;
    if (!rc) return <div>Tidak ditemukan</div>;

    return (
        <div className="space-y-4">
            <HeaderBack title="Detail Receivable" onBack={() => nav("/receivables")} />

            {/* Meta ringkas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <InfoBox label="Customer" value={rc.customer_name} />
                <InfoBox label="Status" value={rc.status} />
                <InfoBox label="Next Due" value={rc.next_due_at ? new Date(rc.next_due_at).toLocaleString("id-ID") : "-"} />
                <InfoBox label="Total Due" value={formatCurrency(rc.total_due)} />
                <InfoBox label="Balance" value={formatCurrency(rc.balance)} />
                <InfoBox label="Installments" value={String(rc.installments_count ?? 1)} />
            </div>

            {/* Form pembayaran */}
            {rc.status !== "closed" && (
                <form onSubmit={submitPay} className="border border-slate-900/15 rounded-xl p-4 space-y-3">
                    <div className="font-semibold">Catat Pembayaran</div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <input
                            className={inputBase}
                            placeholder="Nominal"
                            type="number"
                            min="0"
                            value={pay.amount}
                            onChange={(e) => setPay((f) => ({ ...f, amount: e.target.value }))}
                            required
                        />
                        <select
                            className={inputBase}
                            value={pay.method}
                            onChange={(e) => setPay((f) => ({ ...f, method: e.target.value }))}
                        >
                            <option value="tunai">Tunai</option>
                            <option value="transfer">Transfer</option>
                            <option value="qris">QRIS</option>
                        </select>
                        <input
                            className={inputBase}
                            placeholder="No. Referensi (opsional)"
                            value={pay.reference_no}
                            onChange={(e) => setPay((f) => ({ ...f, reference_no: e.target.value }))}
                        />
                        <input
                            className={inputBase}
                            type="datetime-local"
                            value={pay.paid_at}
                            onChange={(e) => setPay((f) => ({ ...f, paid_at: e.target.value }))}
                        />
                    </div>
                    <div className="flex gap-2">
                        <button className={btnPrimary} disabled={saving}><Save className="h-4 w-4" /> Simpan Pembayaran</button>
                        <button type="button" className={btnGhost} onClick={load}>Refresh</button>
                    </div>
                </form>
            )}

            {/* Jadwal Angsuran */}
            <section className="space-y-2">
                <div className="font-semibold">Jadwal Angsuran</div>
                <div className="overflow-x-auto border border-slate-900/15 rounded-xl">
                    <table className="w-full text-sm">
                        <thead>
                        <tr className="bg-slate-50">
                            <Th>#</Th>
                            <Th>Jatuh Tempo</Th>
                            <Th>Jumlah</Th>
                            <Th>Terbayar</Th>
                            <Th>Status</Th>
                        </tr>
                        </thead>
                        <tbody>
                        {(rc.schedules ?? []).length === 0 ? (
                            <tr><td colSpan={5} className="p-6 text-center">Tidak ada jadwal</td></tr>
                        ) : (
                            rc.schedules
                                .slice()
                                .sort((a, b) => (a.installment_no ?? 0) - (b.installment_no ?? 0))
                                .map((s) => (
                                    <tr key={s.id} className="border-t border-slate-900/10">
                                        <td className="p-3">{s.installment_no}</td>
                                        <td className="p-3">{s.due_at ? new Date(s.due_at).toLocaleString("id-ID") : "-"}</td>
                                        <td className="p-3">{formatCurrency(s.amount)}</td>
                                        <td className="p-3">{formatCurrency(s.paid_amount)}</td>
                                        <td className="p-3 capitalize">{s.status || "-"}</td>
                                    </tr>
                                ))
                        )}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Histori Pembayaran */}
            <section className="space-y-2">
                <div className="font-semibold">Histori Pembayaran</div>
                <div className="overflow-x-auto border border-slate-900/15 rounded-xl">
                    <table className="w-full text-sm">
                        <thead>
                        <tr className="bg-slate-50">
                            <Th>Tanggal</Th>
                            <Th>Metode</Th>
                            <Th>Referensi</Th>
                            <Th>Jumlah</Th>
                        </tr>
                        </thead>
                        <tbody>
                        {(rc.payments ?? []).length === 0 ? (
                            <tr><td colSpan={4} className="p-6 text-center">Belum ada pembayaran</td></tr>
                        ) : (
                            rc.payments
                                .slice()
                                .sort((a, b) => new Date(b.paid_at) - new Date(a.paid_at))
                                .map((p) => (
                                    <tr key={p.id} className="border-t border-slate-900/10">
                                        <td className="p-3">{p.paid_at ? new Date(p.paid_at).toLocaleString("id-ID") : "-"}</td>
                                        <td className="p-3 capitalize">{p.method || "-"}</td>
                                        <td className="p-3">{p.reference_no || "-"}</td>
                                        <td className="p-3">{formatCurrency(p.amount)}</td>
                                    </tr>
                                ))
                        )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}

function InfoBox({ label, value }) {
    return (
        <div className="border border-slate-900/15 rounded-xl p-3">
            <div className="text-xs uppercase text-slate-500 tracking-widest">{label}</div>
            <div className="font-semibold mt-1">{value}</div>
        </div>
    );
}
