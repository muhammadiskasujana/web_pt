import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "../../config/axios";
import { btnGhost, HeaderBack } from "../produk/_ui";
import { Pencil, Trash2, Printer, FileText, CreditCard } from "lucide-react";

export default function SalesDetail() {
    const { id } = useParams();
    const nav = useNavigate();
    const [so, setSo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [paying, setPaying] = useState(false);
    const [payAmt, setPayAmt] = useState("");

    // NEW: nama pemroses (created_by_user_id -> /api/users/:id)
    const [processorName, setProcessorName] = useState("—");

    const base_url = "https://api.onestopcheck.id";

    // tenant dari hostname
    const hostname = window.location.hostname;
    const parts = hostname.split(".");
    const tenant = parts.length >= 2 ? parts[parts.length - 2] : hostname;

    const load = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get(`/api/sales/${id}`);
            const s = data?.sales_order ?? data?.data ?? data;
            setSo(s);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    // Ambil nama user untuk created_by_user_id
    useEffect(() => {
        let stop = false;
        (async () => {
            if (!so) return;

            // Jika backend sudah kirim created_by_name, pakai itu dulu
            if (so.created_by_name) {
                setProcessorName(so.created_by_name);
                return;
            }

            const uid = so.created_by_user_id;
            if (!uid) {
                setProcessorName("—");
                return;
            }

            try {
                const res = await axios.get(`/api/users/${uid}`);
                const name =
                    res?.data?.user?.name ??
                    res?.data?.name ??
                    res?.data?.data?.name ??
                    "—";
                if (!stop) setProcessorName(name || "—");
            } catch {
                if (!stop) setProcessorName("—");
            }
        })();

        return () => {
            stop = true;
        };
    }, [so]);

    const doDelete = async () => {
        if (!window.confirm("Hapus sales ini? (Jika bukan owner, akan dibuat request delete)")) return;
        await axios.delete(`/api/sales/${id}`);
        nav("/sales");
    };

    const doPay = async (e) => {
        e?.preventDefault?.();
        if (!payAmt || Number(payAmt) <= 0) return;
        setPaying(true);
        try {
            await axios.post(`/api/sales/${id}/payments`, { amount: Number(payAmt), method: "tunai" });
            setPayAmt("");
            await load();
            alert("Pembayaran tercatat");
        } finally {
            setPaying(false);
        }
    };

    if (loading) return <div>Memuat...</div>;
    if (!so) return <div>Tidak ditemukan</div>;

    return (
        <div className="space-y-4">
            <HeaderBack
                title={`Detail Sales • ${so.resi_no}`}
                onBack={() => nav("/sales")}
                extra={
                    <div className="flex gap-2">
                        <a
                            className={btnGhost}
                            href={`${base_url}/api/sales/${id}/print/nota?tenant=${tenant}`}
                            target="_blank"
                            rel="noreferrer"
                        >
                            <FileText className="h-4 w-4" /> Nota
                        </a>
                        {/* FIX: hilangkan '}' yang berlebih di akhir URL */}
                        <a
                            className={btnGhost}
                            href={`${base_url}/api/sales/${id}/print/spk?tenant=${tenant}`}
                            target="_blank"
                            rel="noreferrer"
                        >
                            <Printer className="h-4 w-4" /> SPK
                        </a>
                        <Link className={btnGhost} to={`/sales/${id}/edit`}>
                            <Pencil className="h-4 w-4" /> Edit
                        </Link>
                        <button className={btnGhost} onClick={doDelete}>
                            <Trash2 className="h-4 w-4" /> Hapus
                        </button>
                    </div>
                }
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-3">
                    <Info label="Customer" value={so.customer_name} />
                    <Info label="Tanggal" value={new Date(so.created_at || so.createdAt).toLocaleString("id-ID")} />
                    {/* NEW: Diproses oleh */}
                    <Info label="Diproses oleh" value={processorName} />
                    <Info label="Status Bayar" value={so.payment_status?.toUpperCase()} />
                    <Info label="Progress" value={so.progress_status} />
                    <Info label="Total" value={Number(so.total).toLocaleString("id-ID")} />
                    <Info label="Terbayar" value={Number(so.paid_amount).toLocaleString("id-ID")} />
                    <Info label="Sisa" value={Number(so.balance).toLocaleString("id-ID")} />
                    {so.notes ? <Info label="Catatan" value={so.notes} /> : null}

                    <div className="border border-slate-900/10 rounded-xl overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                            <tr className="bg-slate-50">
                                <th className="text-left px-3 py-2 text-slate-500 text-[11px] uppercase tracking-widest">Item</th>
                                {(() => {
                                    const hasArea = (so.items || []).some((it) => it.is_area);
                                    return (
                                        <th className="text-right px-3 py-2 text-slate-500 text-[11px] uppercase tracking-widest">
                                            Qty/Area
                                        </th>
                                    );
                                })()}
                                <th className="text-right px-3 py-2 text-slate-500 text-[11px] uppercase tracking-widest">Harga</th>
                                <th className="text-right px-3 py-2 text-slate-500 text-[11px] uppercase tracking-widest">Subtotal</th>
                            </tr>
                            </thead>
                            <tbody>
                            {(so.items || []).map((it) => (
                                <tr key={it.id} className="border-t border-slate-900/10">
                                    <td className="p-3">
                                        <div className="font-medium">{it.product_name_snap || "-"}</div>
                                        <div className="text-xs text-slate-500">
                                            {it.sku_snap || ""}
                                            {it.is_area ? ` • ${Number(it.area_w || 0)} x ${Number(it.area_h || 0)}` : ""}
                                        </div>
                                    </td>

                                    {/* Qty: kosong untuk area, angka untuk non-area */}
                                    <td className="p-3 text-right">
                                        {it.is_area
                                            ? `${Number(it.area_w || 0)} x ${Number(it.area_h || 0)}`
                                            : Number(it.qty || 0).toLocaleString("id-ID")}
                                    </td>

                                    {/* Harga: pakai area_unit_price jika area, kalau tidak unit_price */}
                                    <td className="p-3 text-right">
                                        {(it.is_area ? (it.area_unit_price || 0) : (it.unit_price || 0)).toLocaleString("id-ID")}
                                    </td>

                                    <td className="p-3 text-right">{Number(it.subtotal || 0).toLocaleString("id-ID")}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Panel pembayaran cepat */}
                <div className="space-y-3">
                    <div className="border border-slate-900/10 rounded-xl p-4">
                        <div className="font-semibold mb-2">Pembayaran</div>
                        <form onSubmit={doPay} className="space-y-2">
                            <input
                                type="number"
                                min="0"
                                placeholder="Nominal bayar"
                                value={payAmt}
                                onChange={(e) => setPayAmt(e.target.value)}
                                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-900/20 outline-none focus:ring-4 focus:ring-sky-600/30 focus:border-sky-600"
                            />
                            <button className={btnGhost} disabled={paying}>
                                <CreditCard className="h-4 w-4" /> Bayar
                            </button>
                        </form>
                    </div>
                </div>

                <button
                    className={btnGhost}
                    onClick={async () => {
                        const reason = prompt("Alasan revisi:");
                        if (!reason) return;
                        await axios.post(`/api/sales/${id}/revision-requests`, {
                            reason,
                            payload_diff: { progress_status: "in_progress" }, // contoh sederhana
                        });
                        alert("Revision requested");
                    }}
                >
                    Request Revisi
                </button>
            </div>
        </div>
    );
}

function Info({ label, value }) {
    return (
        <div className="flex items-center justify-between border border-slate-900/10 rounded-xl px-4 py-3">
            <div className="text-sm text-slate-600">{label}</div>
            <div className="font-medium max-w-[60%] text-right truncate" title={String(value)}>
                {value}
            </div>
        </div>
    );
}
